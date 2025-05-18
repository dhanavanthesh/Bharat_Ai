// src/pages/Chatbot.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useSpeech } from '../context/SpeechContext';
import { supportedLanguages } from '../config/languages';
import { 
  FaPlus, FaPencilAlt, FaTrash, FaDownload, FaUser, FaMoon, FaSun, 
  FaSignOutAlt, FaRegCommentDots, FaCog, FaChevronDown, FaChevronUp, 
  FaStop, FaBars, FaMicrophoneAlt, FaFileUpload, 
  FaChevronLeft, FaChevronRight, FaPaperPlane,
  FaHome, FaSmile, FaPaperclip
} from 'react-icons/fa';
import EmojiPicker from 'emoji-picker-react';
import { auth } from '../utils/auth';
import { chatApi } from '../utils/chatApi';
import { exportChatToPDF } from '../utils/exportPdf';
import ChatMessage from '../components/ChatMessage';
import '../styles/Chatbot.css';

// Modified resize observer for textarea auto-expand with enhanced reset
const useAutosizeTextArea = (textAreaRef, value) => {
  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = "48px"; // Reset height first
      const scrollHeight = textAreaRef.current.scrollHeight;
      textAreaRef.current.style.height = Math.min(scrollHeight, 150) + "px";
    }
  }, [textAreaRef, value]);
};

// Ensure we use the correct background style that matches Home.jsx
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
  const [darkMode, setDarkMode] = useState(true);
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);
  
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const user = auth.getCurrentUser();
  const [isResponding, setIsResponding] = useState(false);
  const abortController = useRef(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Add auto-resize for textarea
  useAutosizeTextArea(inputRef, input);

  // Ensure dark mode is always applied
  useEffect(() => {
    // Force add dark class and remove light class
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
    // Also apply to body for good measure
    document.body.classList.add("dark");
    document.body.classList.remove("light");
  }, []); // Only run once on mount

  // Allow theme toggle between dark and light mode
  useEffect(() => {
    // Apply theme based on state
    document.documentElement.classList.toggle("dark", darkMode);
    document.documentElement.classList.toggle("light", !darkMode);
    
    // Also apply to body
    document.body.classList.toggle("dark", darkMode);
    document.body.classList.toggle("light", !darkMode);
  }, [darkMode]);

  // Add this function to make sure scrolling works properly after new messages
  const scrollToBottom = useCallback(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  // Update effect to use the new scroll function
  useEffect(() => {
    scrollToBottom();
  }, [chats, scrollToBottom]);

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
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
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

  // Ensure textarea resets properly after sending
  const resetTextareaHeight = () => {
    if (inputRef.current) {
      setTimeout(() => {
        inputRef.current.style.height = "48px";
      }, 10);
    }
  };

  // Fix handling of language selection
  useEffect(() => {
    // Load saved language preference when chat changes
    if (currentChatId) {
      const savedLanguage = localStorage.getItem(`chatLang_${currentChatId}`);
      if (savedLanguage && Object.keys(supportedLanguages).includes(savedLanguage)) {
        setCurrentLanguage(savedLanguage);
      }
    }
  }, [currentChatId, setCurrentLanguage]);

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
    resetTextareaHeight(); // Reset textarea height after sending

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

  const renderLoadingState = () => (
    <div className="loading-container">
      <div className="spinner"></div>
      <p className="loading-text">Preparing your AI assistant...</p>
      <div className="image-container loading-logo">
        <img src="/image.png" alt="Bharat AI Lotus Logo" />
      </div>
    </div>
  );

  const onEmojiClick = (emojiData) => {
    setInput(prevInput => prevInput + emojiData.emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const renderTypingIndicator = () => (
    <div className="typing-animation">
      <div className="typing-dot"></div>
      <div className="typing-dot"></div>
      <div className="typing-dot"></div>
    </div>
  );

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  // Enhanced handler for language changes
  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setCurrentLanguage(newLang);
    
    // Save the preference for this chat
    if (currentChatId) {
      localStorage.setItem(`chatLang_${currentChatId}`, newLang);
    }
    
    toast.info(`Language changed to ${supportedLanguages[newLang]}`);
  };

  // Enhanced theme toggle handler with visual feedback
  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    toast.info(`Switched to ${newMode ? 'Dark' : 'Light'} mode`, {
      position: "bottom-right",
      autoClose: 2000,
      hideProgressBar: true,
      icon: newMode ? '🌙' : '☀️'
    });
  };

  // Enhanced handling for mobile sidebar
  const handleToggleMobileSidebar = (isOpen) => {
    setMobileSidebarOpen(isOpen);
    // Prevent body scrolling when sidebar is open
    document.body.style.overflow = isOpen ? 'hidden' : '';
  };

  return (
    <div className={`chat-container ${darkMode ? 'dark-theme' : 'light-theme'}`}>
      {/* Background with particles animation matching Home.css */}
      <div className="chat-bg"></div>
      <div className="particles"></div>
      
      {initialLoading ? (
        renderLoadingState()
      ) : (
        <>
          {/* Sidebar overlay for mobile */}
          {mobileSidebarOpen && (
            <div 
              className={`sidebar-overlay ${mobileSidebarOpen ? 'active' : ''}`} 
              onClick={() => handleToggleMobileSidebar(false)}
            ></div>
          )}
          
          {/* Enhanced Sidebar with Close Button for Mobile */}
          <aside className={`sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${mobileSidebarOpen ? 'open' : ''}`}>
            {/* Add mobile-specific close button */}
            <button 
              className="mobile-sidebar-close"
              onClick={() => handleToggleMobileSidebar(false)}
              aria-label="Close sidebar"
            >
              <FaChevronLeft />
            </button>
            
            <div className="sidebar-header">
              {!sidebarCollapsed && (
                <div className="sidebar-brand">
                  <div className="sidebar-logo">
                    <img src="/image.png" alt="Bharat AI Logo" />
                  </div>
                  <span className="sidebar-title">Bharat AI</span>
                </div>
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="collapse-btn"
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {sidebarCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
              </button>
            </div>
            
            {/* User Info - More compact profile */}
            <div className={`user-info ${sidebarCollapsed ? 'collapsed' : ''}`} ref={sidebarProfileRef}>
              <div 
                className="avatar"
                onClick={() => sidebarCollapsed && setSidebarProfileOpen(!sidebarProfileOpen)}
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              
              {!sidebarCollapsed && (
                <div className="user-details">
                  <p className="user-name">{user?.name || 'User'}</p>
                  <p className="user-email">{user?.email || ''}</p>
                </div>
              )}
              
              {/* Profile Popup for Collapsed Mode */}
              {sidebarCollapsed && sidebarProfileOpen && (
                <div className="popup-menu profile-popup">
                  <div className="popup-header">
                    <div className="avatar">
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <p className="popup-title">{user?.name || 'User'}</p>
                      <p className="popup-subtitle">{user?.email || ''}</p>
                    </div>
                  </div>
                  <div className="popup-actions">
                    <button onClick={() => navigate('/profile')}>
                      <FaUser /> View Profile
                    </button>
                    <button 
                      className="danger-action"
                      onClick={() => {
                        setSidebarProfileOpen(false);
                        handleLogout();
                      }}
                    >
                      <FaSignOutAlt /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Main Navigation - Simplified and organized */}
            <nav className="sidebar-nav">
              <button 
                className={`nav-item ${window.location.pathname === '/' ? 'active' : ''}`}
                onClick={() => navigate('/')}
              >
                <FaHome className="nav-icon" />
                {!sidebarCollapsed && <span>Home</span>}
              </button>
              
              <button
                onClick={handleNewChat}
                className="nav-item new-chat"
              >
                <FaPlus className="nav-icon" />
                {!sidebarCollapsed && <span>New Chat</span>}
              </button>
              
              <button 
                className={`nav-item ${window.location.pathname === '/summarize' ? 'active' : ''}`}
                onClick={() => navigate('/summarize')}
              >
                <FaFileUpload className="nav-icon" />
                {!sidebarCollapsed && <span>Upload PDF</span>}
              </button>
            </nav>
            
            {/* Chat List Header */}
            {!sidebarCollapsed && (
              <div className="chat-list-header">
                <h3>Recent Chats</h3>
              </div>
            )}
            
            {/* Chat List */}
            <div className="chat-list">
              {Object.keys(chatHistory).length === 0 ? (
                <div className="empty-chat-list">
                  <FaRegCommentDots size={24} style={{ opacity: 0.6, marginBottom: '10px' }} />
                  <p>{!sidebarCollapsed ? "No conversations yet" : ""}</p>
                  {!sidebarCollapsed && <p>Start by creating a new chat</p>}
                </div>
              ) : (
                Object.keys(chatHistory).map((id) => (
                  <div 
                    key={id}
                    onClick={() => handleSelectChat(id)}
                    className={`chat-item ${id === currentChatId ? 'active' : ''}`}
                    title={sidebarCollapsed ? (chatTitles[id] || "Chat") : ""}
                  >
                    {sidebarCollapsed ? (
                      <FaRegCommentDots className="chat-icon" />
                    ) : (
                      <>
                        <FaRegCommentDots className="chat-icon" />
                        {editingTitleId === id ? (
                          <div className="flex-1">
                            <input
                              type="text"
                              value={newTitle}
                              onChange={(e) => setNewTitle(e.target.value)}
                              onBlur={handleTitleChange}
                              onKeyPress={(e) => e.key === "Enter" && handleTitleChange()}
                              autoFocus
                              className="title-input"
                            />
                          </div>
                        ) : (
                          <>
                            <div className="chat-title">
                              {chatTitles[id] || 'New Chat'}
                            </div>
                            <div className="chat-actions">
                              <button
                                onClick={(e) => startEditingTitle(id, e)}
                                className="edit-btn"
                                aria-label="Edit chat title"
                              >
                                <FaPencilAlt />
                              </button>
                              <button
                                onClick={(e) => handleDeleteChat(id, e)}
                                className="delete-btn"
                                aria-label="Delete chat"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
            
            {/* Settings Section */}
            <div className="sidebar-footer">
              {!sidebarCollapsed ? (
                <>
                  <button
                    onClick={() => setSettingsOpen(!settingsOpen)}
                    className="action-btn settings-btn"
                  >
                    <FaCog className="action-icon" /> 
                    <span>Settings</span> 
                    {settingsOpen ? <FaChevronUp className="toggle-icon" /> : <FaChevronDown className="toggle-icon" />}
                  </button>
                  
                  {settingsOpen && (
                    <div className="settings-panel">
                      <div className="settings-section">
                        <label className="settings-label">Language</label>
                        <select
                          value={currentLanguage}
                          onChange={handleLanguageChange}
                          className="settings-select"
                        >
                          {Object.entries(supportedLanguages).map(([code, name]) => (
                            <option key={code} value={code}>{name}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="actions-group">
                        <button
                          onClick={() => navigate('/profile')}
                          className="action-btn profile-btn"
                        >
                          <FaUser className="action-icon" /> Profile
                        </button>
                        
                        <button
                          onClick={toggleTheme}
                          className="action-btn theme-btn"
                        >
                          {darkMode ? <><FaSun className="action-icon" /> Light Mode</> : <><FaMoon className="action-icon" /> Dark Mode</>}
                        </button>
                        
                        <button
                          onClick={handleLogout}
                          className="action-btn logout-btn"
                        >
                          <FaSignOutAlt className="action-icon" /> Logout
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="collapsed-footer" ref={settingsRef}>
                  <button
                    onClick={() => setSettingsOpen(!settingsOpen)}
                    className="collapse-settings-btn"
                    aria-label="Settings"
                  >
                    <FaCog />
                  </button>
                  
                  {/* Popup Menu for Collapsed Mode */}
                  {settingsOpen && (
                    <div className="popup-menu settings-popup">
                      <div className="settings-section">
                        <label className="settings-label">Language</label>
                        <select
                          value={currentLanguage}
                          onChange={handleLanguageChange}
                          className="settings-select"
                        >
                          {Object.entries(supportedLanguages).map(([code, name]) => (
                            <option key={code} value={code}>{name}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="popup-actions">
                        <button onClick={() => navigate('/profile')}>
                          <FaUser /> Profile
                        </button>
                        <button onClick={toggleTheme}>
                          {darkMode ? <><FaSun /> Light Mode</> : <><FaMoon /> Dark Mode</>}
                        </button>
                        <button 
                          className="danger-action"
                          onClick={handleLogout}
                        >
                          <FaSignOutAlt /> Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
          
          {/* Main Chat Area - Improved layout */}
          <main className="chat-area">
            {/* Chat Header - Slimmer and more elegant */}
            <header className="chat-header">
              <div className="chat-header-left">
                <button
                  className="mobile-menu-btn"
                  onClick={() => handleToggleMobileSidebar(true)}
                  aria-label="Open menu"
                >
                  <FaBars />
                </button>
                
                <div className="header-brand">
                  <div className="header-logo">
                    <img src="/image.png" alt="Bharat AI Logo" />
                  </div>
                  <h1 className="chat-name">BHARAT AI</h1>
                </div>
                
                <div className="language-badge">
                  <span>{supportedLanguages[currentLanguage] || 'English'}</span>
                </div>
              </div>
              
              <div className="chat-header-actions">
                <button
                  onClick={() => navigate('/summarize')}
                  className="header-btn"
                  title="Upload PDF"
                >
                  <FaFileUpload />
                  <span className="header-btn-text">Upload</span>
                </button>
                
                <button
                  onClick={handleExportChat}
                  className="header-btn"
                  title="Export chat"
                  disabled={chats.length === 0}
                >
                  <FaDownload />
                  <span className="header-btn-text">Export</span>
                </button>
                
                <div className="profile-dropdown" ref={headerProfileRef}>
                  <button
                    onClick={() => setHeaderProfileOpen(!headerProfileOpen)}
                    className="avatar header-avatar"
                    title={user?.name || 'User'}
                  >
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </button>
                  
                  {headerProfileOpen && (
                    <div className="popup-menu header-profile-popup">
                      <div className="popup-header">
                        <div className="avatar">
                          {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <p className="popup-title">{user?.name || 'User'}</p>
                          <p className="popup-subtitle">{user?.email || ''}</p>
                        </div>
                      </div>
                      <div className="popup-actions">
                        <button onClick={() => { setHeaderProfileOpen(false); navigate('/profile'); }}>
                          <FaUser /> View Profile
                        </button>
                        <button 
                          className="danger-action"
                          onClick={() => { setHeaderProfileOpen(false); handleLogout(); }}
                        >
                          <FaSignOutAlt /> Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </header>
            
            {/* Messages Area - Better spacing and alignment */}
            <div className="messages-container">
              {chats.length === 0 ? (
                <div className="empty-chat">
                  <div className="empty-chat-image">
                    <img src="/image.png" alt="Bharat AI Lotus Logo" className="lotus-logo" />
                  </div>
                  <h3>Welcome to BHARAT AI</h3>
                  <p>India's first LMLM <span>(Large Multi-Language Model)</span></p>
                  <p className="subtitle">World's First Humanized AI Model (H.A.I)</p>
                  
                  <div className="feature-list">
                    <div className="feature-item">
                      <span className="feature-icon">🌐</span>
                      <span>Multilingual Support</span>
                    </div>
                    <div className="feature-item">
                      <span className="feature-icon">🔊</span>
                      <span>Voice Commands</span>
                    </div>
                    <div className="feature-item">
                      <span className="feature-icon">🔒</span>
                      <span>Secure Chats</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="messages-list">
                  {chats.map((msg, idx) => (
                    <ChatMessage 
                      key={idx} 
                      message={msg} 
                      darkMode={darkMode}
                      isLast={idx === chats.length - 1 && msg.role === 'bot' && loading}
                      typingIndicator={renderTypingIndicator}
                    />
                  ))}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>
            
            {/* Chat Input Area - Better organized with auto-expanding textarea */}
            <div className="chat-input-area">
              <div className="input-wrapper">
                <button
                  onClick={async () => {
                    if (isListening) {
                      stopListening();
                    } else {
                      try {
                        const result = await startListening(currentLanguage);
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
                  className={`voice-btn ${isListening ? 'active' : ''}`}
                  disabled={!audioAvailable}
                  title={audioAvailable ? (isListening ? "Stop recording" : "Start voice input") : "Voice input not available"}
                >
                  <FaMicrophoneAlt />
                </button>
                
                {/* Keep only this one attachment button */}
                <button
                  onClick={() => navigate('/summarize')}
                  className="upload-btn"
                  title="Upload PDF"
                >
                  <FaPaperclip />
                </button>
                
                <div className="textarea-container">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder={input.trim() ? "Press Enter to send" : (loading ? "AI is thinking..." : "Type your message here...")}
                    className={`chat-input ${isFocused ? 'focused' : ''}`}
                    disabled={loading && isResponding}
                    rows={1}
                  ></textarea>
                  
                  {/* Remove the attachment-container div that contained the second paperclip icon */}
                  
                  <div className="emoji-container" ref={emojiPickerRef}>
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="emoji-btn"
                      title="Insert emoji"
                    >
                      <FaSmile />
                    </button>
                    
                    {showEmojiPicker && (
                      <div className="emoji-picker-wrapper">
                        <EmojiPicker
                          onEmojiClick={onEmojiClick}
                          theme={darkMode ? "dark" : "light"}
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={isResponding ? stopResponse : handleSend}
                  className={`send-btn ${(!input.trim() && !isResponding) ? 'disabled' : ''}`}
                  disabled={!input.trim() && !isResponding}
                  title={isResponding ? "Stop response" : "Send message"}
                >
                  {isResponding ? <FaStop /> : <FaPaperPlane />}
                </button>
              </div>
              
              {/* Remove the language selector footer completely */}
              {/* No need for any footer here */}
            </div>
          </main>
        </>
      )}
    </div>
  );
};

export default Chatbot;
