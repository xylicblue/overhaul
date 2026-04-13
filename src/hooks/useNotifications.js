import { useState, useEffect, useCallback } from "react";
import { supabase } from "../creatclient";

const DEFAULT_PREFS = { enabled: true, types: ["info", "announcement", "warning"] };

/**
 * useNotifications — unified hook that merges:
 *   1. Admin broadcast notifications (global `notifications` table)
 *   2. Per-user trader notifications (`trader_notifications` table, keyed by wallet address)
 *
 * Both streams are subscribed via Supabase Realtime and displayed together,
 * sorted newest-first. Admin notifications use the existing `notification_reads`
 * table; trader notifications track status via their own `status` column.
 */
export function useNotifications(userId, walletAddress) {
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [traderNotifications, setTraderNotifications] = useState([]);
  const [readIds, setReadIds]   = useState(new Set());
  const [loading, setLoading]   = useState(true);
  const [prefs, setPrefs]       = useState(DEFAULT_PREFS);

  // ── Normalize wallet address ──────────────────────────────────────
  const wallet = walletAddress?.toLowerCase() || null;

  // ── Fetch preferences from profiles ──────────────────────────────
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

  // ── Fetch admin broadcast notifications ───────────────────────────
  const fetchAdminNotifications = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("is_active", true)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .or(`recipient_id.is.null,recipient_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setAdminNotifications(data.map(n => ({ ...n, _source: "admin" })));
    }
    // Always unblock the UI after admin fetch, regardless of wallet
    setLoading(false);
  }, [userId]);

  // ── Fetch trader notifications for this wallet ────────────────────
  const fetchTraderNotifications = useCallback(async () => {
    if (!wallet) return; // admin notifications still shown; loading cleared in fetchAdminNotifications
    const { data, error } = await supabase
      .from("trader_notifications")
      .select("*")
      .eq("user_id", wallet)
      .neq("status", "dismissed")
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setTraderNotifications(data.map(n => ({ ...n, _source: "trader" })));
    }
  }, [wallet]);

  // ── Fetch which admin notifications have been read ────────────────
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

  // ── Setup + Realtime subscriptions ───────────────────────────────
  useEffect(() => {
    fetchPrefs();
    fetchAdminNotifications();
    fetchReadIds();
    fetchTraderNotifications();

    // ── Admin notifications Realtime ──────────────────────────────
    const adminChannel = supabase
      .channel("admin_notifications_channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const n = payload.new;
          const isGlobal   = !n.recipient_id;
          const isPersonal = n.recipient_id === userId;
          if ((isGlobal || isPersonal) && n.is_active && (!n.expires_at || new Date(n.expires_at) > new Date())) {
            setAdminNotifications((prev) => [{ ...n, _source: "admin" }, ...prev]);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications" },
        (payload) => {
          const updated = payload.new;
          setAdminNotifications((prev) =>
            updated.is_active
              ? prev.map((n) => (n.id === updated.id ? { ...updated, _source: "admin" } : n))
              : prev.filter((n) => n.id !== updated.id)
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "notifications" },
        (payload) => {
          setAdminNotifications((prev) => prev.filter((n) => n.id !== payload.old.id));
        }
      )
      .subscribe();

    // ── Trader notifications Realtime ─────────────────────────────
    const traderChannel = wallet
      ? supabase
          .channel("trader_notifications_channel")
          .on(
            "postgres_changes",
            {
              event:  "INSERT",
              schema: "public",
              table:  "trader_notifications",
              filter: `user_id=eq.${wallet}`,
            },
            (payload) => {
              const n = payload.new;
              if (n.status !== "dismissed" && (!n.expires_at || new Date(n.expires_at) > new Date())) {
                setTraderNotifications((prev) => [{ ...n, _source: "trader" }, ...prev]);
              }
            }
          )
          .on(
            "postgres_changes",
            {
              event:  "UPDATE",
              schema: "public",
              table:  "trader_notifications",
              filter: `user_id=eq.${wallet}`,
            },
            (payload) => {
              const updated = payload.new;
              setTraderNotifications((prev) =>
                updated.status === "dismissed"
                  ? prev.filter((n) => n.id !== updated.id)
                  : prev.map((n) => (n.id === updated.id ? { ...updated, _source: "trader" } : n))
              );
            }
          )
          .subscribe()
      : null;

    // ── Profile preferences Realtime ──────────────────────────────
    const profileChannel = userId
      ? supabase
          .channel("profile_prefs_channel")
          .on(
            "postgres_changes",
            {
              event:  "UPDATE",
              schema: "public",
              table:  "profiles",
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
      supabase.removeChannel(adminChannel);
      if (traderChannel)  supabase.removeChannel(traderChannel);
      if (profileChannel) supabase.removeChannel(profileChannel);
    };
  }, [fetchPrefs, fetchAdminNotifications, fetchReadIds, fetchTraderNotifications, userId, wallet]);

  // ── Merge and sort both streams ───────────────────────────────────
  // Admin: apply type preferences filter.
  // Trader: always show unless globally disabled.
  const filteredAdmin = prefs.enabled === false
    ? []
    : adminNotifications.filter((n) =>
        !prefs.types || prefs.types.includes(n.type)
      );

  const filteredTrader = prefs.enabled === false
    ? []
    : traderNotifications;

  // Merge and sort by created_at descending
  const notifications = [...filteredAdmin, ...filteredTrader].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  // ── Unread count ──────────────────────────────────────────────────
  // Admin: unread = not in readIds set
  // Trader: unread = status === "unread"
  const unreadCount = notifications.filter((n) =>
    n._source === "admin"
      ? !readIds.has(n.id)
      : n.status === "unread"
  ).length;

  // ── Mark admin notification as read ──────────────────────────────
  const markRead = useCallback(
    async (notificationId, source = "admin") => {
      if (!userId) return;

      if (source === "trader") {
        // Update status column in trader_notifications
        setTraderNotifications((prev) =>
          prev.map((n) => n.id === notificationId ? { ...n, status: "read" } : n)
        );
        await supabase
          .from("trader_notifications")
          .update({ status: "read" })
          .eq("id", notificationId)
          .eq("user_id", wallet);
      } else {
        // Admin: insert into notification_reads
        if (readIds.has(notificationId)) return;
        setReadIds((prev) => new Set([...prev, notificationId]));
        await supabase
          .from("notification_reads")
          .upsert({ user_id: userId, notification_id: notificationId });
      }
    },
    [userId, wallet, readIds]
  );

  // ── Mark all as read ──────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    if (!userId) return;

    // Admin unread
    const unreadAdmin = filteredAdmin.filter((n) => !readIds.has(n.id));
    if (unreadAdmin.length > 0) {
      setReadIds((prev) => new Set([...prev, ...unreadAdmin.map((n) => n.id)]));
      await supabase.from("notification_reads").upsert(
        unreadAdmin.map((n) => ({ user_id: userId, notification_id: n.id }))
      );
    }

    // Trader unread
    const unreadTrader = filteredTrader.filter((n) => n.status === "unread");
    if (unreadTrader.length > 0 && wallet) {
      setTraderNotifications((prev) =>
        prev.map((n) => n.status === "unread" ? { ...n, status: "read" } : n)
      );
      await supabase
        .from("trader_notifications")
        .update({ status: "read" })
        .eq("user_id", wallet)
        .eq("status", "unread");
    }
  }, [userId, wallet, filteredAdmin, filteredTrader, readIds]);

  // ── Dismiss a trader notification ─────────────────────────────────
  const dismiss = useCallback(
    async (notificationId) => {
      if (!wallet) return;
      setTraderNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      await supabase
        .from("trader_notifications")
        .update({ status: "dismissed" })
        .eq("id", notificationId)
        .eq("user_id", wallet);
    },
    [wallet]
  );

  const notifEnabled = prefs.enabled !== false;

  return {
    notifications,
    readIds,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    dismiss,
    notifEnabled,
  };
}
