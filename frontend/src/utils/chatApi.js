// src/utils/chatApi.js

// Get the API base URL from environment variables
// const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.bhaai.org.in';
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';

/**
 * Make an API request with proper error handling and timeout
 */
const apiRequest = async (url, options, retries = 1) => {
  let attempts = 0;
  
  const makeRequest = async () => {
    attempts++;
    try {
      // Set timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      options.signal = controller.signal;
      
      const response = await fetch(url, options);
      clearTimeout(timeoutId);
      
      // For non-JSON responses (like audio files)
      if (options.responseType === 'blob' && response.ok) {
        return response;
      }
      
      // Try to parse JSON response
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Error parsing JSON response:', jsonError);
        throw new Error('Invalid response format from server');
      }
      
      if (!response.ok) {
        throw new Error(data.message || data.error || 'API request failed');
      }
      
      return data;
    } catch (error) {
      // Handle timeout with retry logic
      if (error.name === 'AbortError') {
        console.error('Request timed out');
        if (attempts <= retries) {
          console.log(`Retrying... (attempt ${attempts}/${retries})`);
          return makeRequest();
        }
        throw new Error('Request timed out. The server is busy or not responding.');
      }
      
      // Handle network errors with retry logic
      if ((error.message === 'Failed to fetch' || error.message.includes('NetworkError')) && attempts <= retries) {
        console.error(`Network error: ${error.message}`);
        console.log(`Retrying... (attempt ${attempts}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts - 1)));
        return makeRequest();
      }
      
      throw error;
    }
  };
  
  return makeRequest();
};

// API for chat functionality
export const chatApi = {
  // Get all chats for a user
  getChats: async (userId) => {
    try {
      return await apiRequest(`${API_BASE_URL}/api/chats?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Get chats error:', error);
      return { 
        success: false, 
        message: error.message || 'Failed to retrieve chats',
        chats: {} // Return empty chats object to prevent rendering errors
      };
    }
  },
  
  // Create a new chat
  createChat: async (userId, title = 'New Chat') => {
    try {
      const chatId = `chat_${Date.now()}`;
      return await apiRequest(`${API_BASE_URL}/api/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, chatId, title }),
      });
    } catch (error) {
      console.error('Create chat error:', error);
      return { success: false, message: error.message || 'Failed to create new chat' };
    }
  },
  
  // Rename a chat
  renameChat: async (userId, chatId, title) => {
    try {
      return await apiRequest(`${API_BASE_URL}/api/chats/${chatId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, title }),
      });
    } catch (error) {
      console.error('Rename chat error:', error);
      return { success: false, message: error.message || 'Failed to rename chat' };
    }
  },
  
  // Delete a chat
  deleteChat: async (userId, chatId) => {
    try {
      return await apiRequest(`${API_BASE_URL}/api/chats/${chatId}?userId=${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Delete chat error:', error);
      return { success: false, message: error.message || 'Failed to delete chat' };
    }
  },
  
  // Send a message and get a response
  sendMessage: async (userId, chatId, message, model, language) => {
    try {
      return await apiRequest(`${API_BASE_URL}/api/chat`, {
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
      }, 2); // Allow 2 retries for sending messages
    } catch (error) {
      console.error('Send message error:', error);
      return { 
        success: false, 
        message: error.message || 'Failed to send message',
        reply: "I'm sorry, I'm having trouble connecting to the server. Please try again in a moment."
      };
    }
  },
  
  // Speech to text conversion
  speechToText: async (audioBlob, language) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('language', language);
      
      return await apiRequest(`${API_BASE_URL}/api/speech-to-text`, {
        method: 'POST',
        body: formData
      });
    } catch (error) {
      console.error('Speech to text error:', error);
      return { 
        success: false, 
        message: error.message || 'Speech recognition failed',
        text: ""
      };
    }
  },
  
  // Text to speech conversion
  textToSpeech: async (text, language) => {
    try {
      const response = await apiRequest(`${API_BASE_URL}/api/text-to-speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          language
        }),
        responseType: 'blob'
      });
      
      return response;
    } catch (error) {
      console.error('Text to speech error:', error);
      return null;
    }
  },
  
  // Check API health
  checkHealth: async () => {
    try {
      return await apiRequest(`${API_BASE_URL}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Health check error:', error);
      return { 
        status: 'error',
        message: error.message || 'API health check failed' 
      };
    }
  }
};