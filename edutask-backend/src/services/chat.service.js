const { withSerializableTransaction } = require("../utils/transaction");
const chatRepo = require("../repositories/chat_realtime.repo");
const taskRepo = require("../repositories/task.repo");
const notificationService = require("./notification.service");
const { buildPagination } = require("../utils/pagination");
const { ApiError } = require("../utils/http");

function assertCanAccessTaskConversation(task, userId) {
  if (!task) {
    throw new ApiError(404, "task_not_found", "Task not found.");
  }
  if (task.poster_id !== userId && task.selected_executor_id !== userId) {
    throw new ApiError(403, "forbidden", "Only assigned executor and task owner can chat.");
  }
}

async function ensureConversationForTaskInTransaction(client, taskId) {
  const task = await taskRepo.getTaskById(client, taskId);
  if (!task) {
    throw new ApiError(404, "task_not_found", "Task not found.");
  }
  if (!task.selected_executor_id) {
    throw new ApiError(
      409,
      "conversation_not_ready",
      "Conversation can only be created after executor selection."
    );
  }

  const existing = await chatRepo.getConversationByTaskId(client, taskId, true);
  if (existing) {
    return existing;
  }

  return chatRepo.createConversation(client, {
    task_id: taskId,
    participant_one_id: task.poster_id,
    participant_two_id: task.selected_executor_id,
  });
}

async function ensureConversationForTask(taskId) {
  return withSerializableTransaction(
    async (client) => ensureConversationForTaskInTransaction(client, taskId),
    { operation: "chat_ensure_conversation" }
  );
}

async function listConversations(user, { page, limit }) {
  return withSerializableTransaction(async (client) => {
    const offset = (page - 1) * limit;
    const rows = await chatRepo.listConversationsByUserId(client, user.id, { limit, offset });
    const total = rows.length > 0 ? Number(rows[0].total_count || 0) : 0;
    return {
      items: rows.map((row) => {
        const { total_count, ...rest } = row;
        return rest;
      }),
      pagination: buildPagination(page, limit, total),
    };
  }, { operation: "chat_list_conversations" });
}

function scanMessageForPolicyViolations(content) {
  const lowercase = content.toLowerCase();
  const violations = [];

  const forbiddenKeywords = [
    "bkash", "nagad", "rocket", "upay", "whatsapp", "telegram", "facebook", "number",
    "payment", "outside", "pay me", "send money", "personal", "contact",
    "017", "018", "019", "016", "015", "013", "014" // Common BD phone prefixes
  ];

  for (const word of forbiddenKeywords) {
    if (lowercase.includes(word)) {
      violations.push(`potential_off_platform_payment: ${word}`);
    }
  }

  // Regex for phone numbers (generic)
  const phoneRegex = /(?:\+?88)?01[3-9]\d{8}/g;
  if (phoneRegex.test(content)) {
    violations.push("phone_number_detected");
  }

  // Email regex
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  if (emailRegex.test(content)) {
    violations.push("email_address_detected");
  }

  return violations;
}

async function listMessages(user, conversationId, { page, limit }) {
  return withSerializableTransaction(async (client) => {
    const conversation = await chatRepo.getConversationById(client, conversationId);
    if (!conversation) {
      throw new ApiError(404, "conversation_not_found", "Conversation not found.");
    }
    if (
      conversation.participant_one_id !== user.id &&
      conversation.participant_two_id !== user.id
    ) {
      throw new ApiError(403, "forbidden", "You are not a participant of this conversation.");
    }

    const offset = (page - 1) * limit;
    const rows = await chatRepo.listMessagesByConversationId(client, conversationId, {
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
  }, { operation: "chat_list_messages" });
}

async function sendMessage(user, conversationId, content) {
  if (!content || String(content).trim().length === 0) {
    throw new ApiError(400, "validation_error", "content is required.");
  }

  return withSerializableTransaction(async (client) => {
    const conversation = await chatRepo.getConversationById(client, conversationId);
    if (!conversation) {
      throw new ApiError(404, "conversation_not_found", "Conversation not found.");
    }
    if (
      conversation.participant_one_id !== user.id &&
      conversation.participant_two_id !== user.id
    ) {
      throw new ApiError(403, "forbidden", "You are not a participant of this conversation.");
    }

    const contentToPost = String(content).trim();
    const violations = scanMessageForPolicyViolations(contentToPost);

    const message = await chatRepo.createMessage(client, {
      conversation_id: conversationId,
      sender_id: user.id,
      content: contentToPost,
      metadata: violations.length > 0 ? { policy_violations: violations } : null,
    });

    if (violations.length > 0) {
      await auditService.logEvent(client, {
        user_id: user.id,
        action: "policy_violation_flagged",
        entity_type: "chat_message",
        entity_id: message.id,
        new_values: { violations, content_preview: contentToPost.slice(0, 50) },
      });
    }

    const recipientId =
      conversation.participant_one_id === user.id
        ? conversation.participant_two_id
        : conversation.participant_one_id;

    await notificationService.createNotification({
      user_id: recipientId,
      type: "MESSAGE",
      title: "New message",
      message: "You received a new chat message.",
      reference_id: conversation.task_id,
      metadata: {
        conversation_id: conversation.id,
        message_id: message.id,
      },
    });

    return message;
  }, { operation: "chat_send_message" });
}

async function markConversationRead(user, conversationId) {
  return withSerializableTransaction(async (client) => {
    const conversation = await chatRepo.getConversationById(client, conversationId);
    if (!conversation) {
      throw new ApiError(404, "conversation_not_found", "Conversation not found.");
    }
    if (
      conversation.participant_one_id !== user.id &&
      conversation.participant_two_id !== user.id
    ) {
      throw new ApiError(403, "forbidden", "You are not a participant of this conversation.");
    }
    const updated = await chatRepo.markMessagesRead(client, conversationId, user.id);
    return { updated_count: updated };
  }, { operation: "chat_mark_read" });
}

async function getUnreadCount(user) {
  return withSerializableTransaction(async (client) => {
    const unreadCount = await chatRepo.countUnreadByUserId(client, user.id);
    return { unread_count: unreadCount };
  }, { operation: "chat_unread_count" });
}

module.exports = {
  assertCanAccessTaskConversation,
  ensureConversationForTask,
  ensureConversationForTaskInTransaction,
  listConversations,
  listMessages,
  sendMessage,
  markConversationRead,
  getUnreadCount,
};
