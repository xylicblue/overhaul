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
      set((s) => ({ readIds: { ...s.readIds, [notificationId]: true } }));
      await supabase
        .from("notification_reads")
        .upsert({ user_id: userId, notification_id: notificationId });
    },

    markAllRead: async (userId) => {
      if (!userId) return;
      const unread = get()
        .getNotifications()
        .filter((n) => !hasRead(get().readIds, n.id));
      if (!unread.length) return;
      const patch = {};
      unread.forEach((n) => { patch[n.id] = true; });
      set((s) => ({ readIds: { ...s.readIds, ...patch } }));
      await supabase
        .from("notification_reads")
        .upsert(unread.map((n) => ({ user_id: userId, notification_id: n.id })));
    },

    // ── Initialise: fetch data + open ONE shared realtime subscription ────────
    initialize: async (userId) => {
      if (!userId) return;

      // Fetch preferences
      const { data: profileData } = await supabase
        .from("profiles")
        .select("notification_preferences")
        .eq("id", userId)
        .single();
      if (profileData?.notification_preferences) {
        set({ prefs: profileData.notification_preferences });
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
            if (payload.new?.notification_preferences) {
              set({ prefs: payload.new.notification_preferences });
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
