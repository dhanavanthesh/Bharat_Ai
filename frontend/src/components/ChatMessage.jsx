import React, { useRef, useEffect, useState, memo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { toast } from 'react-toastify';
import '../styles/ChatMessage.css';
import { auth } from '../utils/auth';
import { profileApi } from '../utils/profileApi';

// Using memo to prevent unnecessary re-renders
const ChatMessage = memo(({ message, darkMode, isLast, typingIndicator, isHistoryMessage = false }) => {
  const messageRef = useRef(null);
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [userName, setUserName] = useState('');
  
  // Animation states
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingComplete, setTypingComplete] = useState(false);
  const typeAnimationRef = useRef(null);
  
  // Effect for loading user info - including profile image
  useEffect(() => {
    if (message.role === 'user') {
      const user = auth.getCurrentUser();
      if (user?.id) {
        setProfileImageUrl(profileApi.getProfileImageUrl(user.id));
        // Always use the name, not email
        setUserName(user.name || 'You');
      }
    }
  }, [message.role]);

  // Add highlight effect for new messages
  useEffect(() => {
    if (!messageRef.current) return;
    messageRef.current.classList.add('new-message');
    
    const timer = setTimeout(() => {
      if (messageRef.current) {
        messageRef.current.classList.remove('new-message');
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  // Updated effect to handle typing animation for bot messages with history check
  useEffect(() => {
    // Only animate new bot messages with content, skip animation for history messages
    if (message.role === 'bot' && message.content && !message.thinking && !isHistoryMessage) {
      // Reset animation states when starting a new message
      setDisplayedText('');
      setIsTyping(true);
      setTypingComplete(false);
      
      // Calculate typing speed based on content length
      const content = message.content;
      const contentLength = content.length;
      
      // Dynamic typing speed: faster for longer messages
      // Base speed between 15-30ms for short messages
      // For longer messages, reduce the delay
      const baseDelay = Math.max(5, Math.min(30, 
        30 - (contentLength / 1000) * 15
      ));
      
      let index = 0;
      
      // Clear any existing animation
      if (typeAnimationRef.current) {
        clearTimeout(typeAnimationRef.current);
      }
      
      // Function to simulate typing animation
      const typeCharacter = () => {
        if (index < contentLength) {
          // Add next character to displayed text
          setDisplayedText(prev => prev + content.charAt(index));
          
          // Increment index
          index++;
          
          // Random variation in typing speed for more natural effect
          const randomVariation = Math.random() * 10 - 5; // -5 to +5 ms
          const nextDelay = baseDelay + randomVariation;
          
          // Slight pause after sentence-ending punctuation
          const lastChar = content.charAt(index - 1);
          if (['.', '!', '?', '\n'].includes(lastChar)) {
            // Add extra delay after punctuation (20-50ms)
            const punctuationPause = lastChar === '\n' ? 50 : 20; 
            typeAnimationRef.current = setTimeout(typeCharacter, nextDelay + punctuationPause);
          } else {
            typeAnimationRef.current = setTimeout(typeCharacter, nextDelay);
          }
        } else {
          // Animation complete
          setIsTyping(false);
          setTypingComplete(true);
        }
      };
      
      // Start typing animation with a small initial delay
      typeAnimationRef.current = setTimeout(typeCharacter, 300);
      
      // Cleanup function
      return () => {
        if (typeAnimationRef.current) {
          clearTimeout(typeAnimationRef.current);
        }
      };
    } else if (message.content) {
      // For user messages or history messages, show full content immediately
      setDisplayedText(message.content);
      setTypingComplete(true);
      setIsTyping(false);  // Ensure isTyping is false for non-animating messages
    }
  }, [message.content, message.role, message.thinking, isHistoryMessage]);

  // Efficient language detection
  const getCodeLanguage = (codeString) => {
    const firstLine = codeString.trim().split('\n')[0].trim();
    if (firstLine.includes('```')) {
      const lang = firstLine.replace('```', '').trim().toLowerCase();
      if (lang) return lang;
    }
    return 'javascript';
  };
  
  // Memoized markdown renderer for better performance
  const renderMarkdown = useCallback(() => {
    if (!message.content) return null;
    
    // If still typing, render the partial text; otherwise render the full message
    const textToRender = (message.role === 'bot' && isTyping) ? displayedText : message.content;
    
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({node, inline, className, children, ...props}) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');
            
            if (!inline && codeString.length > 0) {
              const language = match ? match[1] : getCodeLanguage(codeString);
              
              return (
                <div className="code-block-container">
                  <div className="code-block-header">
                    <span className="code-language">{language}</span>
                    <button 
                      className="copy-button"
                      onClick={() => {
                        navigator.clipboard.writeText(codeString);
                        toast.success("Code copied to clipboard!");
                      }}
                    >
                      Copy
                    </button>
                  </div>
                  <SyntaxHighlighter
                    language={language}
                    style={oneDark}
                    showLineNumbers={codeString.split('\n').length > 1}
                    wrapLines={true}
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
              );
            }
            
            return <code className={className} {...props}>{children}</code>;
          },
          table({node, ...props}) {
            return (
              <div className="table-container">
                <table {...props} />
              </div>
            );
          }
        }}
        skipHtml={false}
      >
        {textToRender}
      </ReactMarkdown>
    );
  }, [message.content, message.role, isTyping, displayedText]);

  return (
    <div 
      ref={messageRef}
      className={`message-container ${message.role === 'user' ? 'user-message' : 'bot-message'}`}
    >
      <div className="message-avatar">
        {message.role === 'user' ? (
          profileImageUrl ? (
            <img src={profileImageUrl} alt="User" className="user-avatar-img" loading="lazy" />
          ) : (
            <div className="user-avatar-placeholder">
              {userName ? userName.charAt(0).toUpperCase() : 'U'}
            </div>
          )
        ) : (
          <div className="bot-avatar">
            <img src="/image.png" alt="BHAAI" className="bot-avatar-img" loading="lazy" />
          </div>
        )}
      </div>
      
      <div className="message-content">
        <div className="message-header">
          <span className="message-sender">
            {message.role === 'user' ? userName : 'BHAAI'}
          </span>
          {message.timestamp && (
            <span className="message-time">
              {new Date(message.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit'
              })}
            </span>
          )}
        </div>
        
        <div className={`message-body ${darkMode ? 'dark-mode' : 'light-mode'}`}>
          {message.content ? (
            <div className="animated-text-container">
              {renderMarkdown()}
              {/* Only show cursor when actively typing (not for completed messages or history) */}
              {message.role === 'bot' && isTyping && !isHistoryMessage && (
                <span className="typing-cursor"></span>
              )}
            </div>
          ) : (
            // Improved bot typing indicator that matches ChatGPT style
            message.thinking ? (
              <div className="ai-thinking">
                <span>AI is thinking</span>
                {typingIndicator()}
              </div>
            ) : (isLast && message.role === 'bot' && typingIndicator())
          )}
        </div>
      </div>
    </div>
  );
});

export default ChatMessage;
