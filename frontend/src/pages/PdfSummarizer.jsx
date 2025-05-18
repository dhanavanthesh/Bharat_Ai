import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaArrowLeft, FaFileUpload, FaSpinner, FaPaperPlane, 
  FaStop, FaExclamationTriangle, FaPaperclip 
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../config/constants';
import '../styles/PdfSummarizer.css';

const PdfSummarizer = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [pdfContentId, setPdfContentId] = useState('');
  const [fileName, setFileName] = useState('');
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
    if (selectedFile && selectedFile.type === 'application/pdf') {
      const maxSize = 10 * 1024 * 1024; // 10 MB limit
      if (selectedFile.size > maxSize) {
        toast.error(`File size exceeds 10MB limit. Your file is ${(selectedFile.size / (1024 * 1024)).toFixed(2)}MB`);
        return;
      }
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setSummary('');
      setPdfContentId('');
      setChats([]);
      setError('');
    } else if (selectedFile) {
      toast.error('Please select a valid PDF file');
    }
  };

  const summarizePdf = async (file) => {
    if (!file || file.type !== 'application/pdf') {
      throw new Error('Please select a valid PDF file');
    }

    const formData = new FormData();
    formData.append('pdf', file);

    try {
      toast.info('Uploading and processing PDF...', { 
        autoClose: false,
        toastId: 'pdf-upload'
      });
      
      const response = await fetch(`${API_BASE_URL}/api/summarize-pdf`, {
        method: 'POST',
        body: formData,
      });

      toast.dismiss('pdf-upload');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to process PDF (HTTP ${response.status})`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error summarizing PDF:', error);
      throw error;
    }
  };

  const askPdfQuestion = async (pdfContentId, question) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ask-pdf-question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pdfContentId, question }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get answer');
      }

      return await response.json();
    } catch (error) {
      console.error('Error asking PDF question:', error);
      throw error;
    }
  };

  const handleSummarize = async () => {
    if (!file) {
      toast.error('Please select a PDF file first');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const result = await summarizePdf(file);
      
      if (result.success) {
        setSummary(result.summary);
        setPdfContentId(result.pdfContentId || '');
        toast.success('PDF summarized successfully!');
        setChats([]);
      } else {
        throw new Error(result.message || 'Failed to summarize PDF');
      }
    } catch (error) {
      console.error('Error summarizing PDF:', error);
      setError(error.message || 'Failed to summarize PDF. Please try another file.');
      toast.error(error.message || 'Failed to summarize PDF. Please try again.');
      setSummary('');
      setPdfContentId('');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isResponding || !pdfContentId) return;

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
      const response = await askPdfQuestion(pdfContentId, input);

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
              <h1 className="pdf-title">PDF ANALYZER</h1>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="pdf-content">
          {error ? (
            <div className="pdf-error">
              <div className="pdf-error-header">
                <FaExclamationTriangle className="pdf-error-icon" />
                <h2 className="pdf-error-title">Error Processing PDF</h2>
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
                    accept=".pdf"
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
                      {fileName || 'Click to upload PDF'}
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
                    <span>Summarizing...</span>
                  </>
                ) : (
                  'Summarize PDF'
                )}
              </button>
            </>
          )}

          {/* Summary Section - styled like Chatbot messages */}
          {summary && (
            <div className="pdf-summary-container">
              <h2 className="pdf-section-title">Summary</h2>
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
              <h2 className="pdf-section-title">Ask questions about the PDF</h2>
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
                    title="Upload PDF"
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
                      placeholder={input.trim() ? "Press Enter to send" : (isResponding ? "AI is thinking..." : "Ask a question about the PDF...")}
                      className="pdf-input"
                      disabled={isResponding}
                      rows={1}
                    ></textarea>
                  </div>
                  
                  <button
                    onClick={isResponding ? () => abortController.current?.abort() : handleSend}
                    disabled={!input.trim() || !pdfContentId}
                    className={`pdf-send-btn ${(!input.trim() || !pdfContentId) ? 'pdf-disabled' : ''}`}
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
