// src/pages/Chatbot.jsx
import React, { useState,useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useSpeech } from '../context/SpeechContext';
import { supportedLanguages } from '../config/languages';
import { FaPlus, FaPencilAlt, FaTrash, FaDownload, FaUser, FaMoon, FaSun, FaSignOutAlt, FaRegCommentDots, FaCog, FaChevronDown, FaChevronUp, FaArrowUp, FaStop, FaBars, FaMicrophoneAlt } from 'react-icons/fa';
import { auth } from '../utils/auth';
import { chatApi } from '../utils/chatApi';
import { exportChatToPDF } from '../utils/exportPdf';
import ChatMessage from '../components/ChatMessage';

const Chatbot = () => {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const {
    isListening,
    currentLanguage,
    setCurrentLanguage,
    startListening,
    stopListening
  } = useSpeech();
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [chatHistory, setChatHistory] = useState({});
  const [model] = useState("LLaMA3");
  const [darkMode, setDarkMode] = useState(
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const [editingTitleId, setEditingTitleId] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [chatTitles, setChatTitles] = useState({});
  const [loading, setLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [audioAvailable, setAudioAvailable] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);
  const headerProfileRef = useRef(null);
  const [sidebarProfileOpen, setSidebarProfileOpen] = useState(false);
  const sidebarProfileRef = useRef(null);
  const settingsRef = useRef(null);
  
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const user = auth.getCurrentUser();
  const [isResponding, setIsResponding] = useState(false);
  const abortController = useRef(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats]);

  useEffect(() => {
    setAudioAvailable(!!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setSettingsOpen(false);
      }
      if (headerProfileRef.current && !headerProfileRef.current.contains(event.target)) {
        setHeaderProfileOpen(false);
      }
      if (sidebarProfileRef.current && !sidebarProfileRef.current.contains(event.target)) {
        setSidebarProfileOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleNewChat = useCallback(async () => {
    if (!user || !user.id) {
      toast.error('You need to log in first');
      navigate('/login');
      return;
    }
    
    try {
      const result = await chatApi.createChat(user.id);
      
      if (result.success) {
        const newChatId = result.chatId;
        setCurrentChatId(newChatId);
        setChats([]);
        setChatTitles(prev => ({
          ...prev,
          [newChatId]: 'New Chat',
        }));
        setChatHistory(prev => ({
          ...prev,
          [newChatId]: [],
        }));
        
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      } else {
        toast.error('Failed to create new chat');
      }
    } catch (error) {
      console.error('Error creating new chat:', error);
      toast.error('Failed to create new chat');
    }
  }, [user, navigate]);

  useEffect(() => {
    const loadChats = async () => {
      if (!user || !user.id) {
        setInitialLoading(false);
        return;
      }
      
      try {
        const result = await chatApi.getChats(user.id);
        
        if (result.success) {
          const userChats = result.chats || {};
          
          // Convert chat data structure
          const chatHistoryMap = {};
          const chatTitlesMap = {};
          
          Object.entries(userChats).forEach(([chatId, chat]) => {
            chatHistoryMap[chatId] = chat.messages || [];
            chatTitlesMap[chatId] = chat.title || 'New Chat';
          });
          
          setChatHistory(chatHistoryMap);
          setChatTitles(chatTitlesMap);
          
          // Set current chat if we have any
          if (Object.keys(chatHistoryMap).length > 0) {
            const firstChatId = Object.keys(chatHistoryMap)[0];
            setCurrentChatId(firstChatId);
            setChats(chatHistoryMap[firstChatId] || []);
          } else {
            await handleNewChat();
          }
        } else {
          toast.error('Failed to load chats');
          await handleNewChat();
        }
      } catch (error) {
        console.error('Error loading chats:', error);
        toast.error('Failed to load chats');
        await handleNewChat();
      } finally {
        setInitialLoading(false);
      }
    };
    
    loadChats();
  }, [handleNewChat, user]);  // Add handleNewChat and user to dependency array to fix ESLint warning

  const stopResponse = () => {
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
      setLoading(false);
      setIsResponding(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || (loading && !isResponding)) return;
    
    // If currently responding, stop the response
    if (isResponding) {
      stopResponse();
      return;
    }
    
    if (!user || !user.id) {
      toast.error('You need to log in first');
      navigate('/login');
      return;
    }

    // Store chat language preference
    localStorage.setItem(`chatLang_${currentChatId}`, currentLanguage);

    setLoading(true);
    setIsResponding(true);
    const userMessage = { 
      role: "user", 
      content: input,
      language: currentLanguage,
      timestamp: new Date().toISOString()
    };
    const updatedChat = [...chats, userMessage];
    setChats(updatedChat);
    setInput("");

    const placeholder = { role: "bot", content: "...", language: currentLanguage };
    const newChats = [...updatedChat, placeholder];
    setChats(newChats);

    // Auto-title for new empty chats
    if (chatTitles[currentChatId] === 'New Chat' && chats.length === 0) {
      const words = input.trim().split(" ");
      const autoTitle = words.slice(0, 3).join(" ") + (words.length > 3 ? "..." : "");
      const formattedTitle = autoTitle.charAt(0).toUpperCase() + autoTitle.slice(1);
      setChatTitles(prev => ({ ...prev, [currentChatId]: formattedTitle }));
      
      try {
        await chatApi.renameChat(user.id, currentChatId, formattedTitle);
      } catch (error) {
        console.error('Error renaming chat:', error);
      }
    }

    try {
      // Create new AbortController for this request
      abortController.current = new AbortController();

      const response = await chatApi.sendMessage(
        user.id,
        currentChatId,
        input,
        model,
        currentLanguage,
        abortController.current.signal
      );
      
      if (response.reply) {
        let i = 0;
        const responseLength = response.reply.length;
        const chunkSize = Math.max(1, Math.floor(responseLength / 20));
        
        const interval = setInterval(() => {
          if (i <= responseLength) {
            const streamingContent = response.reply.slice(0, i);
            setChats(chats => 
              chats.map((msg, idx) =>
                idx === chats.length - 1 ? { ...msg, content: streamingContent } : msg
              )
            );
            i += chunkSize;
          } else {
            clearInterval(interval);
            const finalChats = updatedChat.concat({
              role: "bot",
              content: response.reply,
              language: currentLanguage,
              timestamp: new Date().toISOString()
            });
            setChats(finalChats);
            setChatHistory(prev => ({ ...prev, [currentChatId]: finalChats }));
            setLoading(false);
            setIsResponding(false);
            abortController.current = null;
          }
        }, 50);
      } else {
        toast.error('Failed to get response');
        setChats(updatedChat);
        setLoading(false);
        setIsResponding(false);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        toast.info('Response stopped');
        setChats(updatedChat);
      } else {
        console.error("Error:", err);
        toast.error("Failed to fetch response!");
        setChats(updatedChat);
      }
      setLoading(false);
      setIsResponding(false);
      abortController.current = null;
    }
  };

  const handleSelectChat = (id) => {
    setCurrentChatId(id);
    setChats(chatHistory[id] || []);
  };

  const handleDeleteChat = async (id, e) => {
    e.stopPropagation();
    
    if (!user || !user.id) {
      toast.error('You need to log in first');
      navigate('/login');
      return;
    }
    
    if (window.confirm("Are you sure you want to delete this chat?")) {
      try {
        const result = await chatApi.deleteChat(user.id, id);
        
        if (result.success) {
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
              await handleNewChat();
            }
          }
          
          toast.success('Chat deleted successfully');
        } else {
          toast.error('Failed to delete chat');
        }
      } catch (error) {
        console.error('Error deleting chat:', error);
        toast.error('Failed to delete chat');
      }
    }
  };

  const startEditingTitle = (id, e) => {
    e.stopPropagation();
    setEditingTitleId(id);
    setNewTitle(chatTitles[id] || '');
  };

  const handleTitleChange = async () => {
    if (!user || !user.id) {
      toast.error('You need to log in first');
      navigate('/login');
      return;
    }
    
    if (editingTitleId && newTitle.trim()) {
      try {
        const result = await chatApi.renameChat(user.id, editingTitleId, newTitle);
        
        if (result.success) {
          setChatTitles(prev => ({ ...prev, [editingTitleId]: newTitle }));
          setEditingTitleId(null);
        } else {
          toast.error('Failed to rename chat');
        }
      } catch (error) {
        console.error('Error renaming chat:', error);
        toast.error('Failed to rename chat');
      }
    }
  };

  const handleExportChat = () => {
    if (chats.length === 0) {
      toast.info('Nothing to export - start a conversation first!');
      return;
    }
    
    try {
      const success = exportChatToPDF(chats, chatTitles[currentChatId] || 'Chat Export');
      if (success) {
        toast.success('Chat exported successfully!');
      } else {
        toast.error('Failed to export chat. Please try again.');
      }
    } catch (error) {
      console.error('Error during export:', error);
      toast.error('Failed to export chat. Please try again.');
    }
  };

  const handleLogout = () => {
    auth.logout();
    navigate('/login');
  };

  if (initialLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-300">Loading chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="flex flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900">
        {/* Collapsible Sidebar */}
        <div
          className={`
            bg-gray-200 dark:bg-gray-800 flex flex-col transition-all duration-300
            ${sidebarCollapsed ? 'w-0 md:w-9' : 'w-64'}
            md:relative md:z-10 md:h-full
            fixed top-0 left-0 h-full z-50
            transition-transform duration-300
            ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            w-4/5 max-w-xs
            md:translate-x-0 md:w-64 md:max-w-none
            ${window.innerWidth > 768 ? '' : 'md:hidden'}
          `}
          style={window.innerWidth > 768 ? {} : {}}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-300 dark:border-gray-700 flex items-center justify-between">
            {!sidebarCollapsed && (
              <button
                onClick={handleNewChat}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center justify-center flex-1 mr-2"
              >
                <FaPlus className="mr-2" /> <span className="hidden md:inline">New Chat</span>
              </button>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded hover:bg-gray-300 dark:hover:bg-gray-700 hidden md:inline-flex"
            >
              {sidebarCollapsed ? '→' : '←'}
            </button>
          </div>
          
          {/* User Info */}
          {!sidebarCollapsed ? (
            <div className="p-4 border-b border-gray-300 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="truncate">
                  <p className="font-medium text-gray-800 dark:text-white truncate">{user?.name || 'User'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email || ''}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-2 border-b border-gray-300 dark:border-gray-700 flex justify-center relative" ref={sidebarProfileRef}>
              <button
                onClick={() => setSidebarProfileOpen(!sidebarProfileOpen)}
                className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white hover:bg-blue-600 transition-colors duration-200"
                title={user?.name || 'User'}
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </button>

              {/* Profile Popup for Collapsed Mode */}
              {sidebarProfileOpen && (
                <div className="absolute top-12 left-16 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 min-w-[220px] border border-gray-200 dark:border-gray-700 transform transition-all duration-200 ease-in-out z-50">
                  <div className="space-y-3">
                    {/* Profile Header */}
                    <div className="flex items-center space-x-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-lg">
                        {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {user?.name || 'User'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {user?.email || ''}
                        </p>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-2">
                      <button
                        onClick={() => navigate('/profile')}
                        className="w-full flex items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 text-gray-700 dark:text-gray-300"
                      >
                        <FaUser className="mr-2" />
                        View Profile
                      </button>

                      <button
                        onClick={() => {
                          setSidebarProfileOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors duration-200"
                      >
                        <FaSignOutAlt className="mr-2" />
                        Sign Out
                      </button>
                    </div>

                    {/* Account Status */}
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Signed in as {user?.email}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Chat List */}
          <div className="flex-1 overflow-y-auto p-2">
            {Object.keys(chatHistory).length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 mt-4">
                {!sidebarCollapsed ? 'No chats yet. Start a new one!' : '...'}
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
                  } ${sidebarCollapsed ? 'justify-center' : ''}`}
                  title={sidebarCollapsed ? (chatTitles[id] || id) : undefined}
                >
                  {sidebarCollapsed ? (
                    <div className="w-8 h-8 rounded-full bg-blue-500 bg-opacity-20 dark:bg-opacity-40 flex items-center justify-center">
                      <FaRegCommentDots className="text-blue-500 dark:text-blue-300" />
                    </div>
                  ) : (
                    <>
                      <FaRegCommentDots className="mr-2 text-blue-500 dark:text-blue-300" />
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
                    </>
                  )}
                </div>
              ))
            )}
          </div>
          
          {/* Settings Section */}
          <div className="border-t border-gray-300 dark:border-gray-700">
            {!sidebarCollapsed ? (
              <div className="p-4">
                <button
                  onClick={() => setSettingsOpen(!settingsOpen)}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  <div className="flex items-center">
                    <FaCog className="mr-2" />
                    <span>Settings</span>
                  </div>
                  {settingsOpen ? <FaChevronUp /> : <FaChevronDown />}
                </button>
                
                {settingsOpen && (
                  <div className="mt-2 space-y-2">
                    <div className="p-2 rounded-lg bg-gray-300 dark:bg-gray-700">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Language
                      </label>
                      <select
                        value={currentLanguage}
                        onChange={(e) => setCurrentLanguage(e.target.value)}
                        className="w-full p-2 rounded border-none bg-gray-200 dark:bg-gray-600 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        {Object.entries(supportedLanguages).map(([code, name]) => (
                          <option key={code} value={code}>{name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <button
                      onClick={() => navigate('/profile')}
                      className="w-full flex items-center p-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      <FaUser className="mr-2" />
                      Profile
                    </button>
                    
                    <button
                      onClick={() => setDarkMode(!darkMode)}
                      className="w-full flex items-center p-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      {darkMode ? (
                        <>
                          <FaSun className="mr-2" />
                          Light Mode
                        </>
                      ) : (
                        <>
                          <FaMoon className="mr-2" />
                          Dark Mode
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors duration-200"
                    >
                      <FaSignOutAlt className="mr-2" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-2 flex flex-col items-center space-y-4" ref={settingsRef}>
                <button
                  onClick={() => setSettingsOpen(!settingsOpen)}
                  className="p-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
                  title="Settings"
                >
                  <FaCog className={`transform transition-transform duration-200 ${settingsOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Popup Menu for Collapsed Mode */}
                {settingsOpen && (
                  <div className="absolute bottom-16 left-16 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 min-w-[200px] border border-gray-200 dark:border-gray-700 transform transition-all duration-200 ease-in-out z-50">
                    <div className="space-y-2">
                      <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Language
                        </label>
                        <select
                          value={currentLanguage}
                          onChange={(e) => setCurrentLanguage(e.target.value)}
                          className="w-full p-2 rounded border-none bg-gray-200 dark:bg-gray-600 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                        >
                          {Object.entries(supportedLanguages).map(([code, name]) => (
                            <option key={code} value={code}>{name}</option>
                          ))}
                        </select>
                      </div>
                      
                      <button
                        onClick={() => navigate('/profile')}
                        className="w-full flex items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                      >
                        <FaUser className="mr-2" />
                        Profile
                      </button>
                      
                      <button
                        onClick={() => setDarkMode(!darkMode)}
                        className="w-full flex items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                      >
                        {darkMode ? (
                          <>
                            <FaSun className="mr-2" />
                            Light Mode
                          </>
                        ) : (
                          <>
                            <FaMoon className="mr-2" />
                            Dark Mode
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors duration-200"
                      >
                        <FaSignOutAlt className="mr-2" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col w-full md:w-auto">
          {/* Chat Header */}
          <div className="animated-gradient-header p-4 shadow flex justify-between items-center">
            {/* Mobile menu button */}
            <button
              className="md:hidden mr-2 text-purple-700 hover:text-purple-900 focus:outline-none"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open sidebar"
              style={{ fontSize: 24 }}
            >
              <FaBars />
            </button>
            <div className="w-20 hidden md:block"></div> {/* Spacer for desktop */}
            <h1 className="text-2xl font-bold text-purple-500 dark:text-purple-400 flex-1 text-center">
              BHARAT AI
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportChat}
                className={`flex items-center justify-end text-blue-600 hover:text-blue-800 dark:text-blue-400 px-3 py-1 rounded transition-colors duration-200 ${
                  chats.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50 dark:hover:bg-blue-900'
                }`}
                disabled={chats.length === 0}
                title={chats.length === 0 ? 'Start a conversation to enable export' : 'Export chat as PDF'}
              >
                <FaDownload className="mr-1" />
                <span className="hidden md:inline">Export</span>
              </button>
              {/* User Info Dropdown */}
              <div className="relative" ref={headerProfileRef}>
                <button
                  onClick={() => setHeaderProfileOpen(!headerProfileOpen)}
                  className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white hover:bg-blue-600 transition-colors duration-200 ml-2 focus:outline-none"
                  title={user?.name || 'User'}
                >
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </button>
                {headerProfileOpen && (
                  <div className="absolute right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 min-w-[220px] border border-gray-200 dark:border-gray-700 z-50">
                    <div className="space-y-3">
                      {/* Profile Header */}
                      <div className="flex items-center space-x-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-lg">
                          {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {user?.name || 'User'}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {user?.email || ''}
                          </p>
                        </div>
                      </div>
                      {/* Quick Actions */}
                      <div className="space-y-2">
                        <button
                          onClick={() => { setHeaderProfileOpen(false); navigate('/profile'); }}
                          className="w-full flex items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 text-gray-700 dark:text-gray-300"
                        >
                          <FaUser className="mr-2" />
                          View Profile
                        </button>
                        <button
                          onClick={() => { setHeaderProfileOpen(false); handleLogout(); }}
                          className="w-full flex items-center p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors duration-200"
                        >
                          <FaSignOutAlt className="mr-2" />
                          Sign Out
                        </button>
                      </div>
                      {/* Account Status */}
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Signed in as {user?.email}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-2 md:p-4 bg-gray-50 dark:bg-gray-900">
            {chats.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md mx-auto">
                  <div className="text-blue-500 dark:text-blue-400 mb-4">
                    <FaRegCommentDots size={48} className="mx-auto" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-semibold mb-4 dark:text-white">Welcome to BHARATH AI(BHAAI)!</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">Start a conversation by typing a message below. You can:</p>
                  <ul className="text-left text-gray-600 dark:text-gray-300 space-y-2 mb-6">
                    <li className="flex items-center">
                      <FaPlus className="mr-2 text-green-500" /> Start new conversations
                    </li>
                    <li className="flex items-center">
                      <FaDownload className="mr-2 text-blue-500" /> Export your chats
                    </li>
                    <li className="flex items-center">
                      <FaMoon className="mr-2 text-purple-500" /> Toggle dark mode
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {chats.map((msg, idx) => (
                  <ChatMessage key={idx} message={msg} darkMode={darkMode} />
                ))}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          
          {/* Input Area - Mobile responsive */}
          <div className="bg-white dark:bg-gray-800 p-2 md:p-4 border-t dark:border-gray-700">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row gap-2">
                <div 
                  className="flex items-center gap-2 flex-1 bg-gray-50 dark:bg-gray-700 p-2 rounded-lg 
                    transition-all duration-300 ease-in-out transform 
                    hover:scale-[1.02] hover:shadow-lg
                    focus-within:scale-[1.02] focus-within:shadow-lg
                    group focus-within:ring-2 focus-within:ring-blue-500 
                    focus-within:bg-white dark:focus-within:bg-gray-600
                    hover:bg-white dark:hover:bg-gray-600"
                >
                  <button
                    onClick={async () => {
                      if (isListening) {
                        stopListening();
                      } else {
                        try {
                          const result = await startListening(currentLanguage);
                          console.log('Speech result:', result);
                          if (result) {
                            setInput(result.text);
                            if (result.language && result.language !== currentLanguage) {
                              setCurrentLanguage(result.language);
                            }
                          }
                        } catch (error) {
                          toast.error('Error with voice input: ' + error.message);
                        }
                      }
                    }}
                    className={`p-2 rounded-full transition-all duration-200 transform 
                      hover:scale-110 active:scale-95 
                      ${isListening 
                        ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                        : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500'
                      }`}
                    disabled={!audioAvailable}
                    title={audioAvailable ? (isListening ? "Stop recording" : "Start voice input") : "Voice input not available"}
                  >
                    <FaMicrophoneAlt />
                  </button>
                  
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={input.trim() ? "Press ↵ to send" : (loading ? "AI is thinking..." : "Type your message...")}
                    rows={1}
                    style={{ resize: "none", overflow: "auto" }}
                    className="flex-1 p-2 bg-transparent border-none outline-none \
                      dark:text-white text-sm md:text-base \
                      placeholder-gray-500 dark:placeholder-gray-400 \
                      transition-all duration-300 ease-in-out \
                      focus:placeholder-blue-500 dark:focus:placeholder-blue-400\
                      group-hover:placeholder-blue-500 dark:group-hover:placeholder-blue-400"
                    disabled={loading}
                  />
                
                  
                  <button
                    onClick={isResponding ? stopResponse : handleSend}
                    className={`p-3 rounded-full transition-all duration-300 transform hover:scale-110 active:scale-95 ${
                      isResponding 
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : loading 
                          ? 'bg-red-500 hover:bg-red-600'
                          : input.trim()
                            ? 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg'
                            : 'bg-gray-300 cursor-not-allowed'
                    }`}
                    disabled={!input.trim() && !isResponding}
                    title={isResponding ? "Stop response" : "Send message"}
                  >
                    {isResponding ? (
                      <FaStop className="w-5 h-5 text-white" />
                    ) : loading ? (
                      <FaStop className="w-5 h-5 text-white" />
                    ) : (
                      <FaArrowUp className={`w-5 h-5 ${input.trim() ? 'text-white' : 'text-gray-500'}`} />
                    )}
                  </button>
                </div>
                
                
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Overlay for mobile */}
      {mobileSidebarOpen && window.innerWidth <= 768 && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}
    </div>
  );
};

export default Chatbot;
