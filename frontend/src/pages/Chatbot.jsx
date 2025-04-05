// src/pages/Chatbot.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaPlus,
  FaPencilAlt,
  FaTrash,
  FaDownload,
  FaUser,
  FaMoon,
  FaSun
} from 'react-icons/fa';
import { auth } from '../utils/auth';
import { exportChatToPDF } from '../utils/exportPdf';
import ChatMessage from '../components/ChatMessage';
import { 
  createChat, 
  saveMessage, 
  loadChats, 
  renameChat, 
  deleteChat 
} from '../db';

const Chatbot = () => {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [chatHistory, setChatHistory] = useState({});
  const [model, setModel] = useState("LLaMA3");
  const [darkMode, setDarkMode] = useState(
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const [editingTitleId, setEditingTitleId] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [chatTitles, setChatTitles] = useState({});
  const [loading, setLoading] = useState(false);
  
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Dark mode effect
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // Auto-scroll effect
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats]);

  // Initialize with a default chat if none exists
  useEffect(() => {
    const loadInitialChats = async () => {
      const result = await loadChats();
      
      if (result && Object.keys(result.chatHistory).length > 0) {
        setChatHistory(result.chatHistory || {});
        setChatTitles(result.chatTitles || {});
        
        // Set the current chat to the first one
        const firstChatId = Object.keys(result.chatHistory)[0];
        setCurrentChatId(firstChatId);
        setChats(result.chatHistory[firstChatId] || []);
      } else {
        // Create a default chat if none exists
        const defaultId = `chat-${Date.now()}`;
        await createChat(defaultId, 'New Chat');
        setChatTitles({ [defaultId]: 'New Chat' });
        setChatHistory({ [defaultId]: [] });
        setCurrentChatId(defaultId);
      }
    };
    
    loadInitialChats();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    setLoading(true);
    const userMessage = { role: "user", content: input };
    const updatedChat = [...chats, userMessage];
    setChats(updatedChat);
    setInput("");

    // Add a placeholder for the bot response
    const placeholder = { role: "bot", content: "..." };
    const newChats = [...updatedChat, placeholder];
    setChats(newChats);

    // Auto-generate chat title if none exists
    if (!chatTitles[currentChatId] || chatTitles[currentChatId] === 'New Chat') {
      const words = input.trim().split(" ");
      const autoTitle = words.slice(0, 3).join(" ") + (words.length > 3 ? "..." : "");
      const formattedTitle = autoTitle.charAt(0).toUpperCase() + autoTitle.slice(1);
      setChatTitles(prev => ({ ...prev, [currentChatId]: formattedTitle }));
      await renameChat(currentChatId, formattedTitle);
    }

    try {
      const res = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, model }),
      });
      
      if (!res.ok) {
        throw new Error(`Error: ${res.status}`);
      }
      
      const data = await res.json();
      
      // Streaming effect for bot response
      let i = 0;
      const responseLength = data.reply.length;
      const chunkSize = Math.max(1, Math.floor(responseLength / 20)); // Divide into ~20 chunks
      
      const interval = setInterval(() => {
        if (i <= responseLength) {
          const streamingContent = data.reply.slice(0, i);
          setChats(chats => 
            chats.map((msg, idx) =>
              idx === chats.length - 1 ? { ...msg, content: streamingContent } : msg
            )
          );
          i += chunkSize;
        } else {
          clearInterval(interval);
          const finalChats = updatedChat.concat({ role: "bot", content: data.reply });
          setChats(finalChats);
          
          // Save to chat history
          setChatHistory(prev => ({ ...prev, [currentChatId]: finalChats }));
          saveMessage(currentChatId, finalChats);
          setLoading(false);
        }
      }, 50);
    } catch (err) {
      console.error("Error:", err);
      toast.error("Failed to fetch response!");
      setChats(updatedChat); // Remove the placeholder
      setLoading(false);
    }
  };

  const handleNewChat = async () => {
    const newId = `chat-${Date.now()}`;
    await createChat(newId, 'New Chat');
    setCurrentChatId(newId);
    setChats([]);
    setChatTitles(prev => ({
      ...prev,
      [newId]: 'New Chat',
    }));
    setChatHistory(prev => ({
      ...prev,
      [newId]: [],
    }));
    
    // Focus the input field
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleSelectChat = (id) => {
    setCurrentChatId(id);
    setChats(chatHistory[id] || []);
  };

  const handleDeleteChat = async (id, e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this chat?")) {
      await deleteChat(id);
      
      const { [id]: _, ...restHistory } = chatHistory;
      const { [id]: __, ...restTitles } = chatTitles;
      
      setChatHistory(restHistory);
      setChatTitles(restTitles);
      
      if (currentChatId === id) {
        if (Object.keys(restHistory).length > 0) {
          const newChatId = Object.keys(restHistory)[0];
          setCurrentChatId(newChatId);
          setChats(restHistory[newChatId] || []);
        } else {
          // Create a new chat if there are no chats left
          handleNewChat();
        }
      }
    }
  };

  const startEditingTitle = (id, e) => {
    e.stopPropagation();
    setEditingTitleId(id);
    setNewTitle(chatTitles[id] || '');
  };

  const handleTitleChange = async () => {
    if (editingTitleId && newTitle.trim()) {
      await renameChat(editingTitleId, newTitle);
      setChatTitles(prev => ({ ...prev, [editingTitleId]: newTitle }));
      setEditingTitleId(null);
    }
  };

  const handleExportChat = () => {
    if (chats.length > 0) {
      exportChatToPDF(chats, chatTitles[currentChatId] || 'Chat Export');
      toast.success('Chat exported successfully!');
    } else {
      toast.info('Nothing to export');
    }
  };

  const handleLogout = () => {
    auth.logout();
    navigate('/login');
  };

  return (
    <div className={`flex flex-col h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="flex flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900">
        {/* Sidebar */}
        <div className="w-64 bg-gray-200 dark:bg-gray-800 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-300 dark:border-gray-700">
            <button
              onClick={handleNewChat}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full flex items-center justify-center"
            >
              <FaPlus className="mr-2" /> New Chat
            </button>
          </div>
          
          {/* Chat List */}
          <div className="flex-1 overflow-y-auto p-2">
            {Object.keys(chatHistory).length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 mt-4">
                No chats yet. Start a new one!
              </div>
            ) : (
              Object.keys(chatHistory).map((id) => (
                <div 
                  key={id}
                  onClick={() => handleSelectChat(id)}
                  className={`flex items-center mb-2 p-2 rounded cursor-pointer ${
                    id === currentChatId 
                    ? 'bg-blue-100 dark:bg-blue-900'
                    : 'hover:bg-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {editingTitleId === id ? (
                    <div className="flex-1 flex">
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onBlur={handleTitleChange}
                        onKeyPress={(e) => e.key === "Enter" && handleTitleChange()}
                        autoFocus
                        className="flex-1 px-2 py-1 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 truncate dark:text-white">
                        {chatTitles[id] || id}
                      </div>
                      <button
                        onClick={(e) => startEditingTitle(id, e)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ml-2"
                      >
                        <FaPencilAlt size={14} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteChat(id, e)}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        <FaTrash size={14} />
                      </button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
          
          {/* Sidebar Footer */}
          <div className="p-4 border-t border-gray-300 dark:border-gray-700">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option>LLaMA3</option>
                <option>LLaMA2</option>
              </select>
            </div>
            
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center justify-center bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                <FaUser className="mr-2" /> Profile
              </button>
              
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="flex items-center justify-center bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                {darkMode ? (
                  <>
                    <FaSun className="mr-2" /> Light Mode
                  </>
                ) : (
                  <>
                    <FaMoon className="mr-2" /> Dark Mode
                  </>
                )}
              </button>
              
              <button
                onClick={handleLogout}
                className="flex items-center justify-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
        
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="bg-white dark:bg-gray-800 p-4 shadow flex justify-between items-center">
            <h2 className="text-lg font-semibold dark:text-white">
              {chatTitles[currentChatId] || 'New Chat'}
            </h2>
            
            <button
              onClick={handleExportChat}
              className="flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400"
              disabled={chats.length === 0}
            >
              <FaDownload className="mr-1" /> Export
            </button>
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
            {chats.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <h3 className="text-xl font-semibold mb-2">Welcome to AI Chat</h3>
                  <p>Start a conversation by typing a message below.</p>
                </div>
              </div>
            ) : (
              chats.map((msg, idx) => (
                <ChatMessage key={idx} message={msg} darkMode={darkMode} />
              ))
            )}
            <div ref={chatEndRef} />
          </div>
          
          {/* Input Area */}
          <div className="bg-white dark:bg-gray-800 p-4 border-t dark:border-gray-700">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type your message..."
                className="flex-1 p-2 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={loading}
              />
              <button
                onClick={handleSend}
                className={`bg-blue-600 text-white px-4 py-2 rounded ${
                  loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
                }`}
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;