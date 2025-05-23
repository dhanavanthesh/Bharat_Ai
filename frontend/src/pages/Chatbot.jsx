// src/pages/Chatbot.jsx
// eslint-disable-next-line no-unused-vars
import React, { useState, useCallback, useEffect, useRef, useLayoutEffect } from 'react';
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
import { profileApi } from '../utils/profileApi';
import { exportChatToPDF } from '../utils/exportPdf';
import ChatMessage from '../components/ChatMessage';
import '../styles/Chatbot.css';

// REMOVE: Completely remove the empty auto-resize hook
// eslint-disable-next-line no-unused-vars
const useDebounce = (callback, delay) => {
  const timeoutRef = useRef(null);
  
  return useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
};

// Ensure we use the correct background style that matches Home.jsx
const Chatbot = () => {
  const navigate = useNavigate();
  // Keep input state for component's awareness, but don't sync during typing
  // eslint-disable-next-line no-unused-vars
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
  const [user, setUser] = useState(auth.getCurrentUser());
  // Add profileImageUrl state
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [isResponding, setIsResponding] = useState(false);
  const abortController = useRef(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [isFocused, setIsFocused] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [userScrolled, setUserScrolled] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const lastScrollPosition = useRef(0);

  // Remove: No longer need this hook since we'll rely on CSS for auto-sizing
  // useAutosizeTextArea(inputRef);

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

  // Remove unused state
  // eslint-disable-next-line no-unused-vars
  const [smoothScrollInProgress, setSmoothScrollInProgress] = useState(false);
  const messageListRef = useRef(null);
  
  // FIXED: Keep the original scrolling functionality 
  const scrollToBottom = useCallback((force = false) => {
    if (!chatEndRef.current) return;
    
    chatEndRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'end'
    });
  }, []);

  // eslint-disable-next-line no-unused-vars
  const handleScroll = useCallback((e) => {
    // Simple scroll handler that doesn't prevent scrolling up
  }, []);
  
  // Reset scroll handling to simpler approach
  useEffect(() => {
    // Force scroll to bottom when switching chats
    setTimeout(() => scrollToBottom(true), 100);
  }, [currentChatId, scrollToBottom]);

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

  // Update handleSelectChat to properly mark messages as history
  const handleSelectChat = (id) => {
    setCurrentChatId(id);
    
    // Ensure all messages from chat history are marked as history when loaded
    const selectedChatMessages = chatHistory[id] || [];
    const messagesWithHistoryFlag = selectedChatMessages.map(msg => ({
      ...msg,
      isHistory: true
    }));
    
    setChats(messagesWithHistoryFlag);
  };

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
            // Mark ALL messages from chat history as history messages
            const historyMessages = (chat.messages || []).map(msg => ({
              ...msg,
              isHistory: true // Always mark loaded messages as history
            }));
            
            chatHistoryMap[chatId] = historyMessages;
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

  // Update the renderTypingIndicator function to look more like ChatGPT
  const renderTypingIndicator = () => (
    <div className="typing-animation" key="typing-animation">
      <div className="typing-dot"></div>
      <div className="typing-dot"></div>
      <div className="typing-dot"></div>
    </div>
  );

  // Modify handleSend to ensure only new messages have animations
  const handleSend = async () => {
    // Get input value directly from DOM instead of React state
    const userMessageText = inputRef.current?.value.trim() || "";
    
    if (!userMessageText || (loading && !isResponding)) return;
    
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
      content: userMessageText,
      language: currentLanguage,
      timestamp: new Date().toISOString(),
      isHistory: false // Explicitly mark as NOT history
    };
    
    // Update the chat immediately with user message
    const updatedChat = [...chats, userMessage];
    setChats(updatedChat);
    
    // Clear input directly in the DOM - which is faster and prevents re-renders
    if (inputRef.current) {
      inputRef.current.value = "";
      // Reset height to default
      inputRef.current.style.height = "auto"; 
      // Keep focus on the textarea
      inputRef.current.focus();
    }
    
    // Also update React state for other component usage
    setInput("");
    
    // Force scroll to bottom after sending user message
    setTimeout(scrollToBottom, 20);

    // Add placeholder for bot response with "thinking" state
    const placeholder = { 
      role: "bot", 
      content: "", 
      language: currentLanguage,
      thinking: true,
      isHistory: false // Explicitly mark as NOT history
    };
    const newChats = [...updatedChat, placeholder];
    setChats(newChats);
    
    // Auto-title for new empty chats
    if (chatTitles[currentChatId] === 'New Chat' && chats.length === 0) {
      const words = userMessageText.split(" ");
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
        userMessageText,
        model,
        currentLanguage,
        abortController.current.signal
      );
      
      if (response.reply) {
        // Add final bot response with explicit isHistory=false
        const finalChats = updatedChat.concat({
          role: "bot",
          content: response.reply,
          language: currentLanguage,
          timestamp: new Date().toISOString(),
          isHistory: false // Explicitly mark as NOT history
        });
        
        setChats(finalChats);
        
        // When updating chat history, make sure to keep the isHistory flags
        setChatHistory(prev => ({ 
          ...prev, 
          [currentChatId]: finalChats
        }));
        setLoading(false);
        setIsResponding(false);
        abortController.current = null;
        
        // Allow the typing animation to display properly by scrolling after a short delay
        setTimeout(scrollToBottom, 100);
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

  // Optimize emoji handling for better text input performance
  const onEmojiClick = useCallback((emojiData) => {
    if (!inputRef.current) return;
    
    // Get current cursor position
    const start = inputRef.current.selectionStart;
    const end = inputRef.current.selectionEnd;
    
    // Get current value directly from DOM
    const currentValue = inputRef.current.value;
    
    // Insert emoji at cursor position
    const newText = 
      currentValue.substring(0, start) + 
      emojiData.emoji + 
      currentValue.substring(end);
    
    // Update textarea value directly (faster than state updates)
    inputRef.current.value = newText;
    
    // Close picker immediately for better performance
    setShowEmojiPicker(false);
    
    // Focus and place cursor after emoji
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.selectionStart = start + emojiData.emoji.length;
        inputRef.current.selectionEnd = start + emojiData.emoji.length;
      }
    }, 10);
    
    // Update state only when needed (not during typing)
    syncInputState();
  }, []); // No dependencies needed since we access DOM directly

  // Replace handleInputChange with a function that only updates state on blur for non-typing actions
  const syncInputState = () => {
    if (inputRef.current) {
      setInput(inputRef.current.value);
    }
  };

  // Fix 2: Define handleLanguageChange function
  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setCurrentLanguage(newLang);
    
    // Save the preference for this chat
    if (currentChatId) {
      localStorage.setItem(`chatLang_${currentChatId}`, newLang);
    }
    
    toast.info(`Language changed to ${supportedLanguages[newLang]}`);
  };

  // Fix 3: Define toggleTheme function
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

  // Fix 4: Define handleToggleMobileSidebar function
  const handleToggleMobileSidebar = (isOpen) => {
    setMobileSidebarOpen(isOpen);
    // Prevent body scrolling when sidebar is open
    document.body.style.overflow = isOpen ? 'hidden' : '';
  };

  // Add a function to refresh user data
  const refreshUserData = useCallback(async () => {
    const freshUserData = await auth.refreshCurrentUser();
    if (freshUserData) {
      setUser(freshUserData);
    }
  }, []);

  // Add effect to refresh user data on component mount and focus
  useEffect(() => {
    refreshUserData();
    
    // Also refresh when window regains focus (user might have updated profile in another tab)
    const handleFocus = () => refreshUserData();
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshUserData]);

  // Update the profile image fetching logic
  useEffect(() => {
    // Load profile image if user exists
    if (user?.id) {
      const imageUrl = profileApi.getProfileImageUrl(user.id);
      setProfileImageUrl(imageUrl);
    }
  }, [user]); // Depend on user object so it refreshes when user data changes

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
                   <button 
                className={`nav-item ${window.location.pathname === '/' ? 'active' : ''}`}
                onClick={() => navigate('/')}
              >
                <FaHome className="nav-icon" />
                {!sidebarCollapsed && <span>Home</span>}
              </button>
                  </div>
                  {/* <span className="sidebar-title">Bharat AI</span> */}
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
            
            {/* User Info - More compact profile - UPDATED */}
            <div className={`user-info ${sidebarCollapsed ? 'collapsed' : ''}`} ref={sidebarProfileRef}>
              <div 
                className="avatar"
                onClick={() => sidebarCollapsed && setSidebarProfileOpen(!sidebarProfileOpen)}
              >
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt="Profile" className="profile-image" />
                ) : (
                  <span className="avatar-letter">{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</span>
                )}
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
                      {profileImageUrl ? (
                        <img src={profileImageUrl} alt="Profile" className="profile-image" />
                      ) : (
                        <span className="avatar-letter">{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</span>
                      )}
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
                {!sidebarCollapsed && <span>Upload Document</span>}
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
                
                {/* <div className="language-badge">
                  <span>{supportedLanguages[currentLanguage] || 'English'}</span>
                </div> */}
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
                    {profileImageUrl ? (
                      <img src={profileImageUrl} alt="Profile" className="profile-image" />
                    ) : (
                      <span className="avatar-letter">{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</span>
                    )}
                  </button>
                  
                  {headerProfileOpen && (
                    <div className="popup-menu header-profile-popup">
                      <div className="popup-header">
                        <div className="avatar">
                          {profileImageUrl ? (
                            <img src={profileImageUrl} alt="Profile" className="profile-image" />
                          ) : (
                            <span className="avatar-letter">{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</span>
                          )}
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
                  <h3>Welcome to BHARAT AI (BHAAI)</h3>
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
                      <span>Secure Conversations</span>
                    </div>
                    <div className="feature-item">
                      <span className="feature-icon">🤖</span>
                      <span>Aigentic Modules</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div 
                  className="messages-list" 
                  ref={messageListRef}
                >
                  {/* Remove the onScroll handler to fix scrolling issues */}
                  {chats.map((msg, idx) => (
                    <ChatMessage 
                      key={idx} 
                      message={msg} 
                      darkMode={darkMode}
                      isLast={idx === chats.length - 1 && msg.role === 'bot' && loading}
                      typingIndicator={renderTypingIndicator}
                      isHistoryMessage={msg.isHistory} // Pass through the isHistory flag
                      enableAnimation={true} // Pass animation control flag
                    />
                  ))}
                  <div ref={chatEndRef} className="scroll-anchor" />
                </div>
              )}
            </div>
            
            {/* Chat Input Area - Refactored for uncontrolled textarea */}
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
                          // Update textarea DOM directly for better performance
                          if (inputRef.current) {
                            inputRef.current.value = result.text;
                            syncInputState(); // Update React state to match DOM
                          }
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
                
                <button
                  onClick={() => navigate('/summarize')}
                  className="upload-btn"
                  title="Upload Document"
                >
                  <FaPaperclip />
                </button>
                
                <div className="textarea-container">
                  <textarea
                    ref={inputRef}
                    onBlur={syncInputState}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={isResponding ? "AI is thinking..." : "Type your message here..."}
                    className="chat-input"
                    disabled={isResponding}
                    rows={1}
                    spellCheck="false"
                    autoComplete="off"
                    autoCorrect="off"
                    data-gramm="false"
                  />
                  
                  <div className="emoji-container" ref={emojiPickerRef}>
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="emoji-btn"
                      title="Insert emoji"
                      disabled={isResponding} // Disable emoji button when AI is responding
                    >
                      <FaSmile />
                    </button>
                    
                    {showEmojiPicker && (
                      <div className="emoji-picker-wrapper">
                        <EmojiPicker
                          onEmojiClick={onEmojiClick}
                          theme={darkMode ? "dark" : "light"}
                          width={window.innerWidth <= 768 ? "280px" : "350px"}
                          height="350px"
                          lazyLoadEmojis={true}
                          searchDisabled={true}
                          previewConfig={{ showPreview: false }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={isResponding ? stopResponse : handleSend}
                  className={`send-btn ${(!inputRef.current?.value.trim() && !isResponding) ? 'disabled' : ''}`}
                  disabled={!inputRef.current?.value.trim() && !isResponding}
                  title={isResponding ? "Stop response" : "Send message"}
                >
                  {isResponding ? <FaStop /> : <FaPaperPlane />}
                </button>
              </div>
            </div>
          </main>
        </>
      )}
    </div>
  );
};

export default Chatbot;
