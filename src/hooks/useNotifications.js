// Thin adapter — notification state now lives in useNotificationStore (Zustand).
// Kept for backward compatibility; prefer importing from the store directly.
import { useNotificationStore } from "../stores/useNotificationStore";

export function useNotifications(_userId) {
  const { readIds, loading, markRead, markAllRead, prefs, getNotifications, getUnreadCount } =
    useNotificationStore();

  return {
    notifications:  getNotifications(),
    readIds:        { has: (id) => Boolean(readIds[id]) }, // Set-compatible shim
    unreadCount:    getUnreadCount(),
    loading,
    notifEnabled:   prefs.enabled !== false,
    markRead:       (id) => markRead(id, _userId),
    markAllRead:    () => markAllRead(_userId),
  };
}
