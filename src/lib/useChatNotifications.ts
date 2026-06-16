// Chat notifications are now created server-side by the `messages_notify_chat`
// trigger on the `messages` table, then delivered to clients via the realtime
// subscription on the `notifications` table (see useSupabaseSync). This file
// is intentionally a no-op to avoid duplicate in-app entries.
export function useChatNotifications() {
  // no-op
}
