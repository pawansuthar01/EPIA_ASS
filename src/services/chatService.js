const { randomUUID } = require('node:crypto');
const conversations = require('../repositories/conversationRepository');
const { generateText, getProvider } = require('./aiService');

async function sendMessage(message, conversationId) {
  const all = conversations.getAll();
  let conversation = conversationId ? all.find((item) => item.id === conversationId) : null;
  if (conversationId && !conversation) return { statusCode: 404, message: 'Conversation not found. Start a new chat without a conversationId.' };
  if (!conversation) {
    conversation = { id: randomUUID(), messages: [], createdAt: new Date().toISOString() };
    all.push(conversation);
  }

  const userMessage = { role: 'user', content: message.trim() };
  const reply = await generateText([
    { role: 'system', content: 'You are a concise clinic administration assistant. Use earlier messages in this conversation for context. Do not diagnose or give personal medical advice; direct clinical questions to a qualified clinician. Do not claim to contact patients or send messages.' },
    ...conversation.messages,
    userMessage,
  ], 500);
  conversation.messages.push(userMessage, { role: 'assistant', content: reply });
  conversation.updatedAt = new Date().toISOString();
  conversations.saveAll(all);
  return {
    statusCode: 200,
    message: 'AI replied and saved this conversation for the next turn.',
    data: { conversationId: conversation.id, reply, aiProvider: getProvider(), messageCount: conversation.messages.length },
  };
}

module.exports = { sendMessage };
