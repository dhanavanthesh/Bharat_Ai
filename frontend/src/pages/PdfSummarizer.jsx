import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaArrowLeft, FaFileUpload, FaSpinner, FaPaperPlane, 
  FaStop, FaExclamationTriangle, FaPaperclip, FaFilePdf,
  FaFileExcel, FaFileWord, FaFilePowerpoint, FaFileImage
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
  const abortController = useRef(null);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Ensure dark mode is always applied on component mount
  useEffect(() => {
    // Force add dark class and remove light class
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
    // Also apply to body for good measure
    document.body.classList.add("dark");
    document.body.classList.remove("light");
  }, []); // Only run once on mount

  // Apply theme based on darkMode state whenever it changes
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    document.documentElement.classList.toggle("light", !darkMode);
    
    // Also apply to body
    document.body.classList.toggle("dark", darkMode);
    document.body.classList.toggle("light", !darkMode);
  }, [darkMode]);

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

  const handleSend = async () => {
    if (!input.trim() || isResponding || !fileContentId) return;

    setIsResponding(true);
    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };
    const updatedChats = [...chats, userMessage];
    setChats(updatedChats);
    setInput('');

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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats]);

  return (
    <div className={`pdf-container ${darkMode ? 'dark-theme' : 'light-theme'}`}>
      {/* Background with particles animation matching Chatbot */}
      <div className="chat-bg"></div>
      <div className="particles"></div>

      <main className="pdf-area">
        {/* Header - styled like Chatbot */}
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
              <h1 className="pdf-title">FILE ANALYZER</h1>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="pdf-content">
          {error ? (
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
          ) : (
            <>
              {/* File Upload Section - styled like Chatbot */}
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
                      {fileName || 'Click to Upload (PDF, Excel, Word, PPT, Google Sheets, JPEG, PNG)'}
                    </span>
                    <span className="pdf-upload-hint">
                      Maximum file size: 10MB
                    </span>
                  </label>
                </div>
              </div>

              {/* Summarize Button - styled like Chatbot buttons */}
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
            </>
          )}

          {/* Summary Section - styled like Chatbot messages */}
          {summary && (
            <div className="pdf-summary-container">
              <h2 className="pdf-section-title">
                {fileType && (
                  <span className="file-type-icon">
                    {fileTypeIcons[fileType] || <FaFileUpload />}
                  </span>
                )}
                {fileName} Analysis
              </h2>
              <div className="pdf-summary-content">
                <div className="pdf-message">
                  <div className="pdf-message-avatar">
                    <div className="pdf-bot-avatar">
                      <img src="/image.png" alt="BHAAI" className="pdf-bot-logo" />
                    </div>
                  </div>
                  <div className="pdf-message-content">
                    <div className="pdf-message-bubble">
                      <p className="pdf-summary-text">{summary}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Chat Section - styled like Chatbot */}
          {summary && (
            <div className="pdf-chat-container">
              <h2 className="pdf-section-title">Ask questions about this {fileType ? getFileTypeDisplayName(fileType) : 'file'}</h2>
              <div className="pdf-messages-container">
                {chats.length === 0 ? (
                  <div className="pdf-empty-chat">
                    <p className="pdf-empty-message">No questions asked yet. Type a question below to get started.</p>
                  </div>
                ) : (
                  <div className="pdf-messages-list">
                    {chats.map((msg, idx) => (
                      <div key={idx} className={`pdf-message ${msg.role === 'user' ? 'pdf-user' : ''}`}>
                        <div className="pdf-message-avatar">
                          {msg.role === 'user' ? (
                            <div className="pdf-user-avatar">
                              <span>U</span>
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
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>

              {/* Chat Input Area - styled like Chatbot input */}
              <div className="pdf-input-area">
                <div className="pdf-input-wrapper">
                  <button
                    className="pdf-upload-btn"
                    title="Upload File"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FaPaperclip />
                  </button>
                  
                  <div className="pdf-textarea-container">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder={input.trim() ? "Press Enter to send" : (isResponding ? "AI is thinking..." : `Ask a question about this ${fileType ? getFileTypeDisplayName(fileType) : 'file'}...`)}
                      className="pdf-input"
                      disabled={isResponding}
                      rows={1}
                    ></textarea>
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
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PdfSummarizer;
