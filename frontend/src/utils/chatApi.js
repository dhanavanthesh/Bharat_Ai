// src/utils/chatApi.js

// API for chat functionality
export const chatApi = {
  // Get all chats for a user
  getChats: async (userId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/chats?userId=${userId}`);
      return await response.json();
    } catch (error) {
      console.error('Get chats error:', error);
      return { success: false, message: 'Network error' };
    }
  },
  
  // Create a new chat
  createChat: async (userId, title = 'New Chat') => {
    try {
      const chatId = `chat_${Date.now()}`;
      const response = await fetch('http://localhost:5000/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, chatId, title }),
      });
      
      return await response.json();
    } catch (error) {
      console.error('Create chat error:', error);
      return { success: false, message: 'Network error' };
    }
  },
  
  // Rename a chat
  renameChat: async (userId, chatId, title) => {
    try {
      const response = await fetch(`http://localhost:5000/api/chats/${chatId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, title }),
      });
      
      return await response.json();
    } catch (error) {
      console.error('Rename chat error:', error);
      return { success: false, message: 'Network error' };
    }
  },
  
  // Delete a chat
  deleteChat: async (userId, chatId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/chats/${chatId}?userId=${userId}`, {
        method: 'DELETE',
      });
      
      return await response.json();
    } catch (error) {
      console.error('Delete chat error:', error);
      return { success: false, message: 'Network error' };
    }
  },
  
  // Send a message and get a response
  sendMessage: async (userId, chatId, message, model, language) => {
    try {
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          chatId,
          message,
          model,
          language
        }),
      });
      
      return await response.json();
    } catch (error) {
      console.error('Send message error:', error);
      return { success: false, message: 'Network error' };
    }
  },
  
  // Speech to text conversion
  speechToText: async (audioBlob, language) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('language', language);
      
      const response = await fetch('http://localhost:5000/api/speech-to-text', {
        method: 'POST',
        body: formData
      });
      
      return await response.json();
    } catch (error) {
      console.error('Speech to text error:', error);
      return { success: false, message: 'Network error' };
    }
  },
  
  // Text to speech conversion
  textToSpeech: async (text, language) => {
    try {
      const response = await fetch('http://localhost:5000/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          language
        }),
      });
      
      return response;
    } catch (error) {
      console.error('Text to speech error:', error); 
      return null;
    }
  }
};