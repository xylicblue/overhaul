import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { supabase } from "../creatclient";

const DEFAULT_PREFS = { enabled: true, types: ["info", "announcement", "warning"] };

// readIds stored as plain object { [id]: true } for O(1) lookup + JSON serialisation
const hasRead = (readIds, id) => Boolean(readIds[id]);

export const useNotificationStore = create(
  subscribeWithSelector((set, get) => ({
    allNotifications: [],
    readIds: {},
    prefs: DEFAULT_PREFS,
    loading: true,
    _channels: [],

    // ── Derived helpers ──────────────────────────────────────────────────────
    // Call these in components: const notifications = useNotificationStore(s => s.getNotifications())
    getNotifications: () => {
      const { allNotifications, prefs, readIds } = get();
      if (prefs.enabled === false) return [];
      return allNotifications.filter(
        (n) => !prefs.types || prefs.types.includes(n.type)
      );
    },

    getUnreadCount: () => {
      const { readIds } = get();
      return get().getNotifications().filter((n) => !hasRead(readIds, n.id)).length;
    },

    isRead: (id) => hasRead(get().readIds, id),

    // ── Actions ──────────────────────────────────────────────────────────────
    markRead: async (notificationId, userId) => {
      if (!userId || hasRead(get().readIds, notificationId)) return;
      // Optimistic local update.
      set((s) => ({ readIds: { ...s.readIds, [notificationId]: true } }));
      const { error } = await supabase
        .from("notification_reads")
        .upsert({ user_id: userId, notification_id: notificationId });
      if (error) {
        // The DB refused the write. Roll back the local state so the badge
        // stays truthful across reloads. Common reasons: session missing
        // aal2 for the RLS write policy, account is frozen, network drop.
        console.warn("[notifications] markRead failed, rolling back:", error);
        set((s) => {
          const next = { ...s.readIds };
          delete next[notificationId];
          return { readIds: next };
        });
      }
    },

    markAllRead: async (userId) => {
      if (!userId) return;
      const unread = get()
        .getNotifications()
        .filter((n) => !hasRead(get().readIds, n.id));
      if (!unread.length) return;
      const patch = {};
      unread.forEach((n) => { patch[n.id] = true; });
      // Optimistic local update.
      set((s) => ({ readIds: { ...s.readIds, ...patch } }));
      const { error } = await supabase
        .from("notification_reads")
        .upsert(unread.map((n) => ({ user_id: userId, notification_id: n.id })));
      if (error) {
        console.warn("[notifications] markAllRead failed, rolling back:", error);
        set((s) => {
          const next = { ...s.readIds };
          for (const n of unread) delete next[n.id];
          return { readIds: next };
        });
      }
    },

    // ── Initialise: fetch data + open ONE shared realtime subscription ────────
    initialize: async (userId) => {
      if (!userId) return;

      // Fetch preferences
      const { data: profileData } = await supabase
        .from("profiles")
        .select("broadcast_notification_prefs")
        .eq("id", userId)
        .single();
      if (profileData?.broadcast_notification_prefs) {
        set({ prefs: profileData.broadcast_notification_prefs });
      }

      // Fetch notifications
      const { data: notifData, error: notifError } = await supabase
        .from("notifications")
        .select("*")
        .eq("is_active", true)
        .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
        .order("created_at", { ascending: false });
      if (!notifError && notifData) {
        set({ allNotifications: notifData });
      }

      // Fetch read IDs
      const { data: readsData, error: readsError } = await supabase
        .from("notification_reads")
        .select("notification_id")
        .eq("user_id", userId);
      if (!readsError && readsData) {
        const readIds = {};
        readsData.forEach((r) => { readIds[r.notification_id] = true; });
        set({ readIds });
      }

      set({ loading: false });

      // ── Single shared realtime subscription for notifications ────────────
      const notifChannel = supabase
        .channel("notifications_channel_shared")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications" },
          (payload) => {
            const n = payload.new;
            if (n.is_active && (!n.expires_at || new Date(n.expires_at) > new Date())) {
              set((s) => ({ allNotifications: [n, ...s.allNotifications] }));
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "notifications" },
          (payload) => {
            const updated = payload.new;
            set((s) => ({
              allNotifications: updated.is_active
                ? s.allNotifications.map((n) => (n.id === updated.id ? updated : n))
                : s.allNotifications.filter((n) => n.id !== updated.id),
            }));
          }
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "notifications" },
          (payload) => {
            set((s) => ({
              allNotifications: s.allNotifications.filter((n) => n.id !== payload.old.id),
            }));
          }
        )
        .subscribe();

      // ── Realtime subscription for user preference changes ────────────────
      const profileChannel = supabase
        .channel("profile_prefs_channel_shared")
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
          (payload) => {
            if (payload.new?.broadcast_notification_prefs) {
              set({ prefs: payload.new.broadcast_notification_prefs });
            }
          }
        )
        .subscribe();

      set({ _channels: [notifChannel, profileChannel] });
    },

    // ── Teardown: remove subscriptions on logout / unmount ───────────────────
    teardown: () => {
      get()._channels.forEach((c) => supabase.removeChannel(c));
      set({ _channels: [], allNotifications: [], readIds: {}, loading: true, prefs: DEFAULT_PREFS });
    },
  }))
);
