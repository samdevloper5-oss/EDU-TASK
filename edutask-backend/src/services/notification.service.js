const { withSerializableTransaction } = require("../utils/transaction");
const notificationRepo = require("../repositories/notification.repo");
const { buildPagination } = require("../utils/pagination");

let notifier = null;

function registerRealtimeNotifier(fn) {
  notifier = typeof fn === "function" ? fn : null;
}

async function createNotification(data) {
  return withSerializableTransaction(
    async (client) => createNotificationInTransaction(client, data),
    { operation: "notification_create" }
  );
}

async function createNotificationInTransaction(client, data) {
  const notification = await notificationRepo.createNotification(client, data);
  if (notifier) {
    notifier(notification.user_id, notification);
  }
  return notification;
}

async function listNotifications(userId, { page, limit }) {
  const offset = (page - 1) * limit;
  return withSerializableTransaction(async (client) => {
    const rows = await notificationRepo.listNotificationsByUserId(client, userId, {
      limit,
      offset,
    });
    const total = rows.length > 0 ? Number(rows[0].total_count || 0) : 0;
    return {
      items: rows.map((row) => {
        const { total_count, ...rest } = row;
        return rest;
      }),
      pagination: buildPagination(page, limit, total),
    };
  }, { operation: "notification_list" });
}

async function markNotificationsRead(userId) {
  return withSerializableTransaction(async (client) => {
    const updated = await notificationRepo.markAllReadByUserId(client, userId);
    return { updated_count: updated };
  }, { operation: "notification_mark_read" });
}

async function getUnreadCount(userId) {
  return withSerializableTransaction(async (client) => {
    const unread = await notificationRepo.countUnreadByUserId(client, userId);
    return { unread_count: unread };
  }, { operation: "notification_unread_count" });
}

module.exports = {
  registerRealtimeNotifier,
  createNotification,
  createNotificationInTransaction,
  listNotifications,
  markNotificationsRead,
  getUnreadCount,
};
