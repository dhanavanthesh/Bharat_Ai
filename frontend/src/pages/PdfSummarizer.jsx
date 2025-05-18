import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaArrowLeft, FaFileUpload, FaSpinner, FaPaperPlane, 
  FaStop, FaExclamationTriangle, FaPaperclip, FaFilePdf,
  FaFileExcel, FaFileWord, FaFilePowerpoint, FaFileImage,
  FaCommentDots, FaInfoCircle, FaChevronDown, FaChevronUp,
  FaRegLightbulb, FaEye, FaTimes, FaListAlt,
  FaFileAlt, FaQuestionCircle
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../config/constants';
import '../styles/PdfSummarizer.css';

// File type icons mapping
const fileTypeIcons = {
  'application/pdf': <FaFilePdf />,
  'application/vnd.ms-excel': <FaFileExcel />,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': <FaFileExcel />,
  'text/csv': <FaFileExcel />,
  'application/msword': <FaFileWord />,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': <FaFileWord />,
  'application/vnd.ms-powerpoint': <FaFilePowerpoint />,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': <FaFilePowerpoint />,
  'image/png': <FaFileImage />,
  'image/jpeg': <FaFileImage />
};

// Get file type display name
const getFileTypeDisplayName = (contentType) => {
  const typeMap = {
    'application/pdf': 'PDF',
    'application/vnd.ms-excel': 'Excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
    'text/csv': 'CSV',
    'application/msword': 'Word',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
    'application/vnd.ms-powerpoint': 'PowerPoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
    'image/png': 'PNG Image',
    'image/jpeg': 'JPEG Image'
  };
  
  return typeMap[contentType] || 'Document';
};

const PdfSummarizer = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [fileContentId, setFileContentId] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [input, setInput] = useState('');
  const [chats, setChats] = useState([]);
  const [isResponding, setIsResponding] = useState(false);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(true); // Default to dark mode
  const [activeTab, setActiveTab] = useState('upload');
  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [sidebarOverlayVisible, setSidebarOverlayVisible] = useState(false);
  const [inputProgress, setInputProgress] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [touchStartY, setTouchStartY] = useState(0);
  const [initialScrollDone, setInitialScrollDone] = useState(false);
  const [currentTab, setCurrentTab] = useState('upload');
  
  const abortController = useRef(null);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  
  // Get user info for avatar
  const getUserInfo = () => {
    try {
      const userString = localStorage.getItem('user');
      if (userString) {
        return JSON.parse(userString);
      }
    } catch (e) {
      console.error('Error getting user data', e);
    }
    return { name: 'User' };
  };
  
  const user = getUserInfo();
  const userInitial = user?.name?.charAt(0)?.toUpperCase() || 'U';
  
  // Auto-resize textarea as content grows
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "48px";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
    
    // Set progress indicator based on input length
    if (input.trim().length > 0) {
      const maxLength = 2000; // Approximate max length
      const progress = Math.min(100, (input.length / maxLength) * 100);
      setInputProgress(progress);
    } else {
      setInputProgress(0);
    }
  }, [input]);
  
  // Ensure dark mode is always applied on component mount
  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
    document.body.classList.add("dark");
    document.body.classList.remove("light");
  }, []);

  // Apply theme based on darkMode state whenever it changes
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    document.documentElement.classList.toggle("light", !darkMode);
    document.body.classList.toggle("dark", darkMode);
    document.body.classList.toggle("light", !darkMode);
  }, [darkMode]);

  // Auto switch to chat tab when summary is received
  useEffect(() => {
    if (summary && fileContentId && activeTab === 'upload') {
      setActiveTab('chat');
      // When switching to chat after summary, make sure sidebar is visible
      setTimeout(() => toggleSidebar(true), 100);
    }
  }, [summary, fileContentId]);

  // Improved scroll handling for chat messages
  useEffect(() => {
    if (chats.length > 0 && messagesContainerRef.current) {
      const scrollContainer = messagesContainerRef.current;
      
      // Always scroll to bottom when a new message is added
      setTimeout(() => {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [chats.length]);

  // Special handling for empty chat state - position it properly
  useEffect(() => {
    if (chats.length === 0 && activeTab === 'chat' && fileContentId && !initialScrollDone) {
      if (messagesContainerRef.current) {
        // Reset scroll position to top for empty chat state
        messagesContainerRef.current.scrollTop = 0;
        setInitialScrollDone(true);
      }
    }
  }, [chats.length, activeTab, fileContentId, initialScrollDone]);

  // Handle sidebar and overlay visibility together
  const toggleSidebar = (visible) => {
    setSidebarVisible(visible);
    setSidebarOverlayVisible(visible);
    
    // Prevent body scrolling when sidebar is open on mobile
    if (visible && window.innerWidth < 768) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  };

  // Add window resize listener with better mobile handling
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      // Auto-hide sidebar on small screens
      if (window.innerWidth < 768 && sidebarVisible) {
        toggleSidebar(false);
      } else if (window.innerWidth >= 768) {
        // Ensure body scroll is enabled on larger screens
        document.body.style.overflow = '';
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.body.style.overflow = '';
    };
  }, [sidebarVisible]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Check file size (10 MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      toast.error(`File size exceeds 10MB limit. Your file is ${(selectedFile.size / (1024 * 1024)).toFixed(2)}MB`);
      return;
    }

    // Check file type
    const acceptedTypes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/png',
      'image/jpeg'
    ];

    if (!acceptedTypes.includes(selectedFile.type)) {
      toast.error('Unsupported file type. Please upload PDF, Excel, Word, PowerPoint, or image files.');
      return;
    }
    
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setFileType(selectedFile.type);
    setSummary('');
    setFileContentId('');
    setChats([]);
    setError('');
    
    // Return to upload tab when a new file is selected
    setActiveTab('upload');
  };

  const summarizeFile = async (file) => {
    if (!file) {
      throw new Error('Please select a valid file');
    }

    const formData = new FormData();
    formData.append('pdf', file);  // Keep 'pdf' as the field name for backward compatibility

    try {
      toast.info(`Uploading and processing ${getFileTypeDisplayName(file.type)}...`, { 
        autoClose: false,
        toastId: 'file-upload'
      });
      
      const response = await fetch(`${API_BASE_URL}/api/summarize-pdf`, {
        method: 'POST',
        body: formData,
      });

      toast.dismiss('file-upload');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to process file (HTTP ${response.status})`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error summarizing file:', error);
      throw error;
    }
  };

  const askFileQuestion = async (fileContentId, question) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ask-pdf-question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Keep pdfContentId as the field name for backward compatibility
        body: JSON.stringify({ pdfContentId: fileContentId, question }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get answer');
      }

      return await response.json();
    } catch (error) {
      console.error('Error asking file question:', error);
      throw error;
    }
  };

  const handleSummarize = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const result = await summarizeFile(file);
      
      if (result.success) {
        setSummary(result.summary);
        setFileContentId(result.fileContentId || result.pdfContentId || '');
        toast.success(`${getFileTypeDisplayName(fileType)} analyzed successfully!`);
        setChats([]);
        setSummaryExpanded(true);
        
        // Switch to chat tab automatically
        setTimeout(() => setActiveTab('chat'), 500);
      } else {
        throw new Error(result.message || 'Failed to analyze file');
      }
    } catch (error) {
      console.error('Error analyzing file:', error);
      setError(error.message || 'Failed to analyze file. Please try another file.');
      toast.error(error.message || 'Failed to analyze file. Please try again.');
      setSummary('');
      setFileContentId('');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced chat sending with proper text resetting
  const handleSend = async () => {
    if (!input.trim() || isResponding || !fileContentId) return;

    setIsResponding(true);
    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };
    const updatedChats = [...chats, userMessage];
    setChats(updatedChats);
    setInput('');
    setInputProgress(0);
    
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "48px";
    }

    // Show loading placeholder with typing animation
    const placeholder = { role: 'bot', content: '...', timestamp: new Date().toISOString() };
    setChats([...updatedChats, placeholder]);

    try {
      abortController.current = new AbortController();
      const response = await askFileQuestion(fileContentId, input);

      if (response.success && response.answer) {
        let i = 0;
        const responseLength = response.answer.length;
        const chunkSize = Math.max(1, Math.floor(responseLength / 20));

        const interval = setInterval(() => {
          if (i <= responseLength) {
            const streamingContent = response.answer.slice(0, i);
            setChats((prevChats) =>
              prevChats.map((msg, idx) =>
                idx === prevChats.length - 1 ? { ...msg, content: streamingContent } : msg
              )
            );
            i += chunkSize;
          } else {
            clearInterval(interval);
            const finalChats = [...updatedChats, {
              role: 'bot',
              content: response.answer,
              timestamp: new Date().toISOString(),
            }];
            setChats(finalChats);
            setIsResponding(false);
            abortController.current = null;
          }
        }, 50);
      } else {
        toast.error(response.message || 'Failed to get response');
        setChats([
          ...updatedChats, 
          {
            role: 'bot',
            content: 'Sorry, I was unable to answer your question. Please try again.',
            timestamp: new Date().toISOString()
          }
        ]);
        setIsResponding(false);
      }
    } catch (err) {
      console.error('Error:', err);
      setChats([
        ...updatedChats, 
        {
          role: 'bot',
          content: 'Sorry, I encountered an error. Please try asking a different question.',
          timestamp: new Date().toISOString()
        }
      ]);
      setIsResponding(false);
    }
  };

  const handleRetry = () => {
    setError('');
    fileInputRef.current?.click();
  };

  // Handle touch gestures for sidebar on mobile
  const handleTouchStart = (e) => {
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    const currentY = e.touches[0].clientY;
    const diff = touchStartY - currentY;
    
    // Prevent default to avoid page scrolling when swiping sidebar
    if (Math.abs(diff) > 10) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = (e) => {
    // Implementation for swipe gestures if needed
  };

  // Improved tab navigation with clear UI separation
  useEffect(() => {
    if (activeTab === 'chat') {
      setCurrentTab('chat');
    } else {
      setCurrentTab('upload');
    }
  }, [activeTab]);

  // Handle tab switching with clearer separation of concerns
  const switchTab = (tab) => {
    setActiveTab(tab);
    
    // Reset scroll position when switching to chat tab
    if (tab === 'chat' && messagesContainerRef.current) {
      setTimeout(() => {
        messagesContainerRef.current.scrollTop = 0;
      }, 100);
    }
  };

  // Enhanced render function with better UI organization
  const renderTabContent = () => {
    if (error) {
      return (
        <div className="pdf-error">
          <div className="pdf-error-header">
            <FaExclamationTriangle className="pdf-error-icon" />
            <h2 className="pdf-error-title">Error Processing File</h2>
          </div>
          <p className="pdf-error-message">{error}</p>
          <button 
            onClick={handleRetry}
            className="pdf-error-retry-btn"
          >
            Try Another File
          </button>
        </div>
      );
    }
    
    // Enhanced upload tab with clearer separation
    if (activeTab === 'upload') {
      return (
        <div className="pdf-upload-tab">
          <div className="pdf-upload-container">
            <div className="pdf-upload-area">
              <input
                type="file"
                accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="pdf-hidden-input"
                id="pdf-upload"
                ref={fileInputRef}
              />
              <label
                htmlFor="pdf-upload"
                className="pdf-upload-label"
              >
                <FaFileUpload className="pdf-upload-icon" />
                <span className="pdf-upload-text">
                  {fileName || 'Click to Upload Document'}
                </span>
                <span className="pdf-upload-hint">
                  PDF, Excel, Word, PowerPoint, JPEG, PNG (Max 10MB)
                </span>
              </label>
            </div>
            
            {file && (
              <div className="pdf-file-info">
                <div className="pdf-file-icon">
                  {fileTypeIcons[fileType] || <FaFileUpload />}
                </div>
                <div className="pdf-file-details">
                  <div className="pdf-file-name">{fileName}</div>
                  <div className="pdf-file-type">{getFileTypeDisplayName(fileType)}</div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleSummarize}
            disabled={!file || loading}
            className={`pdf-summarize-btn ${(!file || loading) ? 'pdf-disabled' : ''}`}
          >
            {loading ? (
              <>
                <FaSpinner className="pdf-spinner-icon" />
                <span>Analyzing...</span>
              </>
            ) : (
              `Analyze ${fileType ? getFileTypeDisplayName(fileType) : 'File'}`
            )}
          </button>
          
          {!file && (
            <div className="pdf-help-text">
              <FaRegLightbulb className="pdf-help-icon" />
              <p>Upload a document to get started. The AI will analyze your document and allow you to ask questions about it.</p>
            </div>
          )}
        </div>
      );
    }
    
    // More clearly separated chat tab content
    return (
      <div className={`pdf-chat-layout ${sidebarVisible ? 'with-sidebar' : 'no-sidebar'}`}>
        {/* Sidebar overlay for mobile */}
        {sidebarOverlayVisible && (
          <div 
            className={`pdf-sidebar-overlay ${sidebarVisible ? 'active' : ''}`}
            onClick={() => toggleSidebar(false)}
          />
        )}
        
        {/* Enhanced mobile-friendly toggle with text label */}
        {!sidebarVisible && (
          <button 
            className="pdf-mobile-toggle" 
            onClick={() => toggleSidebar(true)}
          >
            <FaFileAlt className="pdf-mobile-toggle-icon" />
            <span>View Summary</span>
          </button>
        )}
        
        {/* Summary Sidebar */}
        <aside 
          className={`pdf-summary-sidebar ${sidebarVisible ? 'visible' : 'hidden'}`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="pdf-sidebar-header">
            <h3>
              <div className="pdf-file-icon-small">
                {fileTypeIcons[fileType] || <FaFileUpload />}
              </div>
              <span>Document Summary</span>
            </h3>
            
            <button 
              className="pdf-sidebar-close"
              onClick={() => toggleSidebar(false)}
              title="Hide summary"
            >
              <FaTimes />
            </button>
          </div>
          
          <div className="pdf-sidebar-content">
            <div className="pdf-summary-wrapper">
              <div className="pdf-summary-avatar">
                <img src="/image.png" alt="BHAAI" className="pdf-bot-logo" />
              </div>
              <div className="pdf-summary-text-container">
                <p className="pdf-summary-text">{summary || "No summary available"}</p>
              </div>
            </div>
            
            {/* Document info section - improved layout */}
            <div className="pdf-document-info">
              <h4 className="pdf-info-heading">
                <FaListAlt className="pdf-info-icon" />
                <span>Document Information</span>
              </h4>
              <div className="pdf-info-item">
                <strong>File:</strong> {fileName || "Unknown"}
              </div>
              <div className="pdf-info-item">
                <strong>Type:</strong> {fileType ? getFileTypeDisplayName(fileType) : "Document"}
              </div>
            </div>
          </div>
          
          <div className="pdf-sidebar-footer">
            <div className="pdf-file-badge">
              <div className="pdf-file-icon-badge">
                {fileTypeIcons[fileType] || <FaFileUpload />}
              </div>
              <span>{fileName || "Document"}</span>
            </div>
          </div>
        </aside>
        
        {/* Main Chat Area */}
        <div className="pdf-chat-main">
          <div className="pdf-chat-header">
            <h2>
              <FaCommentDots className="pdf-chat-icon" />
              <span>Ask questions about this document</span>
            </h2>
          </div>
          
          <div className="pdf-messages-container" ref={messagesContainerRef}>
            {chats.length === 0 ? (
              <div className="pdf-empty-chat">
                <div className="pdf-empty-chat-logo">
                  <img src="/image.png" alt="Bharat AI Logo" className="pdf-empty-logo" />
                </div>
                
                <h3 className="pdf-empty-title">Document Q&A Assistant</h3>
                <p className="pdf-empty-subtitle">
                  I've analyzed <strong>{fileName || 'your document'}</strong>. Please ask any questions about the content.
                </p>
                
                <div className="pdf-example-questions">
                  <p>Try asking:</p>
                  <ul>
                    <li onClick={() => {
                      setInput("What is the main topic of this document?");
                      inputRef.current?.focus();
                    }}>
                      What is the main topic of this document?
                    </li>
                    <li onClick={() => {
                      setInput("Summarize the key points in bullet points");
                      inputRef.current?.focus();
                    }}>
                      Summarize the key points in bullet points
                    </li>
                    <li onClick={() => {
                      setInput("What are the conclusions presented in this document?");
                      inputRef.current?.focus();
                    }}>
                      What are the conclusions presented in this document?
                    </li>
                    <li onClick={() => {
                      setInput("Extract important dates and events mentioned");
                      inputRef.current?.focus();
                    }}>
                      Extract important dates and events mentioned
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="pdf-messages-list">
                {chats.map((msg, idx) => (
                  <div key={idx} className={`pdf-message ${msg.role === 'user' ? 'pdf-user' : ''}`}>
                    <div className="pdf-message-avatar">
                      {msg.role === 'user' ? (
                        <div className="pdf-user-avatar">
                          <span>{userInitial}</span>
                        </div>
                      ) : (
                        <div className="pdf-bot-avatar">
                          <img src="/image.png" alt="BHAAI" className="pdf-bot-logo" />
                        </div>
                      )}
                    </div>
                    <div className="pdf-message-content">
                      <div className="pdf-message-bubble">
                        <p className="pdf-message-text">{msg.content}</p>
                        {idx === chats.length - 1 && msg.role === 'bot' && msg.content === '...' && (
                          <div className="pdf-typing-animation">
                            <div className="pdf-typing-dot"></div>
                            <div className="pdf-typing-dot"></div>
                            <div className="pdf-typing-dot"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} className="pdf-scroll-anchor"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`pdf-container ${darkMode ? 'dark-theme' : 'light-theme'}`}>
      {/* Background with particles animation */}
      <div className="chat-bg"></div>
      <div className="particles"></div>

      {/* Main layout */}
      <div className="pdf-layout">
        {/* Header */}
        <header className="pdf-header">
          <div className="pdf-header-left">
            <button
              className="pdf-back-btn"
              onClick={() => navigate('/chat')}
              aria-label="Back to chat"
            >
              <FaArrowLeft />
            </button>
            
            <div className="pdf-brand">
              <div className="pdf-logo">
                <img src="/image.png" alt="Bharat AI Logo" />
              </div>
              <h1 className="pdf-title">
                {fileContentId ? 'DOCUMENT ASSISTANT' : 'FILE ANALYZER'}
              </h1>
            </div>
          </div>
          
          {fileName && (
            <div className="pdf-current-file">
              <div className="pdf-file-icon-header">
                {fileTypeIcons[fileType] || <FaFileUpload />}
              </div>
              <span className="pdf-file-name-header">{fileName}</span>
            </div>
          )}
        </header>

        {/* Enhanced tab navigation with better visual cues */}
        {fileContentId && (
          <div className="pdf-tabs">
            <button 
              className={`pdf-tab ${currentTab === 'upload' ? 'active' : ''}`}
              onClick={() => switchTab('upload')}
            >
              <FaFileUpload className="tab-icon" />
              <span className="tab-label">Upload Document</span>
            </button>
            <button 
              className={`pdf-tab ${currentTab === 'chat' ? 'active' : ''}`}
              onClick={() => switchTab('chat')}
            >
              <FaQuestionCircle className="tab-icon" />
              <span className="tab-label">Ask Questions</span>
            </button>
          </div>
        )}

        {/* Main content area with complete separation between tabs */}
        <main className="pdf-content">
          {renderTabContent()}
        </main>

        {/* Fixed input area */}
        {activeTab === 'chat' && fileContentId && (
          <div className="pdf-input-area">
            <div className="pdf-input-wrapper">
              <button
                className="pdf-upload-btn"
                title="Upload new file"
                onClick={() => fileInputRef.current?.click()}
              >
                <FaPaperclip />
              </button>
              
              <div className="pdf-textarea-container">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder={input.trim() ? "Press Enter to send" : (isResponding ? "AI is thinking..." : `Ask about this document...`)}
                  className={`pdf-input ${isFocused ? 'focused' : ''}`}
                  disabled={isResponding}
                  rows={1}
                ></textarea>
                
                {/* Visual input progress indicator */}
                {inputProgress > 0 && <div className="pdf-input-progress" style={{ width: `${inputProgress}%` }}></div>}
              </div>
              
              <button
                onClick={isResponding ? () => abortController.current?.abort() : handleSend}
                disabled={!input.trim() || !fileContentId}
                className={`pdf-send-btn ${(!input.trim() || !fileContentId) ? 'pdf-disabled' : ''}`}
                title={isResponding ? "Stop response" : "Send message"}
              >
                {isResponding ? <FaStop /> : <FaPaperPlane />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfSummarizer;
