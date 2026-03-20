import { useState, useEffect, useCallback } from "react";
import { supabase } from "../creatclient";

const DEFAULT_PREFS = { enabled: true, types: ["info", "announcement", "warning"] };

/**
 * useNotifications — fetches active notifications, tracks unread count,
 * subscribes to Realtime inserts, and handles per-user dismissal.
 * Fetches its own notification_preferences from the profiles table so it
 * always reflects the latest saved settings (no stale prop).
 */
export function useNotifications(userId) {
  const [allNotifications, setAllNotifications] = useState([]);
  const [readIds, setReadIds]   = useState(new Set());
  const [loading, setLoading]   = useState(true);
  const [prefs, setPrefs]       = useState(DEFAULT_PREFS);

  // ── Fetch preferences from profiles ──────────────────────────────────────
  const fetchPrefs = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("profiles")
      .select("notification_preferences")
      .eq("id", userId)
      .single();
    if (data?.notification_preferences) {
      setPrefs(data.notification_preferences);
    }
  }, [userId]);

  // ── Fetch all active, non-expired notifications ──────────────────────────
  const fetchNotifications = useCallback(async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("is_active", true)
      .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
      .order("created_at", { ascending: false });

    if (!error && data) setAllNotifications(data);
    setLoading(false);
  }, []);

  // ── Fetch which notifications this user has already read ─────────────────
  const fetchReadIds = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("notification_reads")
      .select("notification_id")
      .eq("user_id", userId);

    if (!error && data) {
      setReadIds(new Set(data.map((r) => r.notification_id)));
    }
  }, [userId]);

  useEffect(() => {
    fetchPrefs();
    fetchNotifications();
    fetchReadIds();

    // ── Realtime: notification changes ────────────────────────────────────
    const notifChannel = supabase
      .channel("notifications_channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const n = payload.new;
          if (n.is_active && (!n.expires_at || new Date(n.expires_at) > new Date())) {
            setAllNotifications((prev) => [n, ...prev]);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications" },
        (payload) => {
          const updated = payload.new;
          setAllNotifications((prev) =>
            updated.is_active
              ? prev.map((n) => (n.id === updated.id ? updated : n))
              : prev.filter((n) => n.id !== updated.id)
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "notifications" },
        (payload) => {
          setAllNotifications((prev) => prev.filter((n) => n.id !== payload.old.id));
        }
      )
      .subscribe();

    // ── Realtime: profile preference changes ──────────────────────────────
    // Re-fetch prefs whenever the user's own profile row is updated
    const profileChannel = userId
      ? supabase
          .channel("profile_prefs_channel")
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "profiles",
              filter: `id=eq.${userId}`,
            },
            (payload) => {
              if (payload.new?.notification_preferences) {
                setPrefs(payload.new.notification_preferences);
              }
            }
          )
          .subscribe()
      : null;

    return () => {
      supabase.removeChannel(notifChannel);
      if (profileChannel) supabase.removeChannel(profileChannel);
    };
  }, [fetchPrefs, fetchNotifications, fetchReadIds, userId]);

  // Apply prefs filter
  const notifications = prefs.enabled === false
    ? []
    : allNotifications.filter((n) =>
        !prefs.types || prefs.types.includes(n.type)
      );

  // ── Mark a single notification as read ───────────────────────────────────
  const markRead = useCallback(
    async (notificationId) => {
      if (!userId || readIds.has(notificationId)) return;
      setReadIds((prev) => new Set([...prev, notificationId]));
      await supabase
        .from("notification_reads")
        .upsert({ user_id: userId, notification_id: notificationId });
    },
    [userId, readIds]
  );

  // ── Mark all visible (filtered) as read ──────────────────────────────────
  const markAllRead = useCallback(async () => {
    if (!userId) return;
    const unread = notifications.filter((n) => !readIds.has(n.id));
    if (!unread.length) return;
    setReadIds((prev) => new Set([...prev, ...unread.map((n) => n.id)]));
    await supabase.from("notification_reads").upsert(
      unread.map((n) => ({ user_id: userId, notification_id: n.id }))
    );
  }, [userId, notifications, readIds]);

  const unreadCount  = notifications.filter((n) => !readIds.has(n.id)).length;
  const notifEnabled = prefs.enabled !== false;

  return { notifications, readIds, unreadCount, loading, markRead, markAllRead, notifEnabled };
}
