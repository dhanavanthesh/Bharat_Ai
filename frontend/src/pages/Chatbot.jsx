import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useSpeech } from '../context/SpeechContext';
import { supportedLanguages } from '../config/languages';
import { FaPlus, FaPencilAlt, FaTrash, FaDownload, FaUser, FaMoon, FaSun } from 'react-icons/fa';
import { auth } from '../utils/auth';
import { exportChatToPDF } from '../utils/exportPdf';
import ChatMessage from '../components/ChatMessage';
import { createChat, saveMessage, loadChats, renameChat, deleteChat } from '../db';

const Chatbot = () => {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const {
    isListening,
    currentLanguage,
    setCurrentLanguage,
    startListening,
    stopListening,
    speakText
  } = useSpeech();
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [audioAvailable, setAudioAvailable] = useState(false);
  
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats]);

  useEffect(() => {
    setAudioAvailable(!!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia);
  }, []);

  useEffect(() => {
    const loadInitialChats = async () => {
      const result = await loadChats();
      
      if (result && Object.keys(result.chatHistory).length > 0) {
        setChatHistory(result.chatHistory || {});
        setChatTitles(result.chatTitles || {});
        
        const firstChatId = Object.keys(result.chatHistory)[0];
        setCurrentChatId(firstChatId);
        setChats(result.chatHistory[firstChatId] || []);
      } else {
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

    // Store chat language preference
    localStorage.setItem(`chatLang_${currentChatId}`, currentLanguage);

    setLoading(true);
    const userMessage = { 
      role: "user", 
      content: input,
      language: currentLanguage 
    };
    const updatedChat = [...chats, userMessage];
    setChats(updatedChat);
    setInput("");

    const placeholder = { role: "bot", content: "..." };
    const newChats = [...updatedChat, placeholder];
    setChats(newChats);

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
                body: JSON.stringify({ 
                  message: input,
                  model,
                  language: currentLanguage
                }),
      });
      
      if (!res.ok) {
        throw new Error(`Error: ${res.status}`);
      }
      
      const data = await res.json();
      
      let i = 0;
      const responseLength = data.reply.length;
      const chunkSize = Math.max(1, Math.floor(responseLength / 20));
      
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
          
          setChatHistory(prev => ({ ...prev, [currentChatId]: finalChats }));
          saveMessage(currentChatId, finalChats);
          setLoading(false);
        }
      }, 50);
    } catch (err) {
      console.error("Error:", err);
      toast.error("Failed to fetch response!");
      setChats(updatedChat);
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
        {/* Collapsible Sidebar */}
        <div className={`bg-gray-200 dark:bg-gray-800 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-300 dark:border-gray-700 flex items-center justify-between">
            {!sidebarCollapsed && (
              <button
                onClick={handleNewChat}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center justify-center flex-1 mr-2"
              >
                <FaPlus className="mr-2" /> New Chat
              </button>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded hover:bg-gray-300 dark:hover:bg-gray-700"
            >
              {sidebarCollapsed ? '→' : '←'}
            </button>
          </div>
          
          {/* Chat List with Timestamps */}
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
                Language
              </label>
              <select
                value={currentLanguage}
                onChange={(e) => setCurrentLanguage(e.target.value)}
                className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-4"
              >
                {Object.entries(supportedLanguages).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
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
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold dark:text-white">
                {chatTitles[currentChatId] || 'New Chat'}
              </h2>
              <div className="text-sm px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center gap-1">
                {supportedLanguages[currentLanguage] || currentLanguage}
              </div>
            </div>
            
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
              <div className="flex items-center gap-2 flex-1">
                <button
                  onClick={async () => {
                    if (isListening) {
                      stopListening();
                    } else {
                      try {
          const result = await startListening(currentLanguage);
          if (result) {
            setInput(result.text);
            // Update language if different from current
            if (result.language && result.language !== currentLanguage) {
              setCurrentLanguage(result.language);
            }
          }
                      } catch (error) {
                        alert(error.message);
                      }
                    }
                  }}
                  className={`p-2 rounded-full ${
                    isListening 
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'
                  }`}
                  disabled={!audioAvailable}
                  title={audioAvailable ? "Voice input" : "Voice input not available"}
                >
                  🎤
                </button>
                
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
                  onClick={() => speakText(input)}
                  className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                  disabled={!input.trim()}
                  title={`Speak in ${currentLanguage.toUpperCase()}`}
                >
                  🔊
                </button>
                <select
                  value={currentLanguage}
                  onChange={(e) => setCurrentLanguage(e.target.value)}
                  className="p-2 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {Object.entries(supportedLanguages).map(([code, name]) => (
                    <option key={code} value={code}>{name}</option>
                  ))}
                </select>
              </div>
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
