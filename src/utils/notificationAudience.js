export function isNotificationForUser(notification, userId) {
  if (!notification || !userId) return false;
  return notification.recipient_id == null || notification.recipient_id === userId;
}
