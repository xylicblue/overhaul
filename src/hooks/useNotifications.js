import { useState, useEffect, useCallback } from "react";
import { supabase } from "../creatclient";

/**
 * useNotifications — fetches active notifications, tracks unread count,
 * subscribes to Realtime inserts, and handles per-user dismissal.
 */
export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // ── Fetch all active, non-expired notifications ──────────────────────────
  const fetchNotifications = useCallback(async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("is_active", true)
      .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
      .order("created_at", { ascending: false });

    if (!error && data) setNotifications(data);
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
    fetchNotifications();
    fetchReadIds();

    // ── Realtime subscription — new notifications appear instantly ────────
    const channel = supabase
      .channel("notifications_channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const n = payload.new;
          // Only add if active and not expired
          if (
            n.is_active &&
            (!n.expires_at || new Date(n.expires_at) > new Date())
          ) {
            setNotifications((prev) => [n, ...prev]);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications" },
        (payload) => {
          const updated = payload.new;
          setNotifications((prev) =>
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
          setNotifications((prev) =>
            prev.filter((n) => n.id !== payload.old.id)
          );
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchNotifications, fetchReadIds]);

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

  // ── Mark all as read ─────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    if (!userId) return;
    const unread = notifications.filter((n) => !readIds.has(n.id));
    if (!unread.length) return;
    setReadIds((prev) => new Set([...prev, ...unread.map((n) => n.id)]));
    await supabase.from("notification_reads").upsert(
      unread.map((n) => ({ user_id: userId, notification_id: n.id }))
    );
  }, [userId, notifications, readIds]);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  return { notifications, readIds, unreadCount, loading, markRead, markAllRead };
}
