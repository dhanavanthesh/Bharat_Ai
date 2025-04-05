// src/db.js
import { openDB } from 'idb';

const DB_NAME = 'chatbot-db';
const DB_VERSION = 1;
const CHAT_STORE = 'chats';

// Initialize the database
export const db = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(CHAT_STORE)) {
      db.createObjectStore(CHAT_STORE, { keyPath: 'id' });
    }
  },
});

// Create a new chat
export const createChat = async (id, title = '') => {
  const db = await openDB(DB_NAME, DB_VERSION);
  await db.put(CHAT_STORE, { id, title, messages: [] });
  return id;
};

// Save a message to a chat
export const saveMessage = async (chatId, messages) => {
  const db = await openDB(DB_NAME, DB_VERSION);
  const chat = await db.get(CHAT_STORE, chatId);
  if (chat) {
    chat.messages = messages;
    await db.put(CHAT_STORE, chat);
  } else {
    await db.put(CHAT_STORE, { id: chatId, messages, title: '' });
  }
};

// Rename a chat
export const renameChat = async (chatId, newTitle) => {
  const db = await openDB(DB_NAME, DB_VERSION);
  const chat = await db.get(CHAT_STORE, chatId);
  if (chat) {
    chat.title = newTitle;
    await db.put(CHAT_STORE, chat);
  }
};

// Delete a chat
export const deleteChat = async (chatId) => {
  const db = await openDB(DB_NAME, DB_VERSION);
  await db.delete(CHAT_STORE, chatId);
};

// Load a specific chat
export const loadChat = async (chatId) => {
  const db = await openDB(DB_NAME, DB_VERSION);
  return await db.get(CHAT_STORE, chatId);
};

// Load all chats
export const loadChats = async () => {
  const db = await openDB(DB_NAME, DB_VERSION);
  const chats = await db.getAll(CHAT_STORE);
  
  // Convert to the format expected by the App component
  const chatHistory = {};
  const chatTitles = {};
  
  chats.forEach(chat => {
    chatHistory[chat.id] = chat.messages;
    chatTitles[chat.id] = chat.title;
  });
  
  return { chatHistory, chatTitles };
};