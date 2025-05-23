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
const ChatMessage = memo(({ 
  message, 
  darkMode, 
  isLast, 
  typingIndicator, 
  isHistoryMessage = false, 
  enableAnimation = true // Add enableAnimation prop with default true
}) => {
  const messageRef = useRef(null);
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [userName, setUserName] = useState('');
  
  // Animation states
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [animationStarted, setAnimationStarted] = useState(false);  // New state to track animation start
  const typeAnimationRef = useRef(null);
  
  // Effect for loading user info - including profile image
  useEffect(() => {
    if (message.role === 'user') {
      const user = auth.getCurrentUser();
      if (user?.id) {
        setProfileImageUrl(profileApi.getProfileImageUrl(user.id));
        
        // Update user name and initial logic
        if (user.name && user.name.trim()) {
          setUserName(user.name);
        } else if (user.email && user.email.trim()) {
          // Use email name part (before @) or full email
          const emailName = user.email.split('@')[0] || user.email;
          setUserName(emailName);
        } else {
          setUserName('You');
        }
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
    // Only animate new bot messages with content if:
    // 1. Not a history message
    // 2. Animations are enabled globally
    // 3. Message is from bot and has content
    // 4. Message is not in "thinking" state
    const shouldAnimate = 
      message.role === 'bot' && 
      message.content && 
      !message.thinking && 
      !isHistoryMessage && 
      enableAnimation;
    
    if (shouldAnimate) {
      // Reset animation states when starting a new message
      setDisplayedText('');
      setIsTyping(true);
      
      // Set animation started flag to false initially
      setAnimationStarted(false);
      
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
      
      // Wait for proper render cycle before starting animation
      typeAnimationRef.current = setTimeout(() => {
        setAnimationStarted(true); // Mark animation as started
        
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
          }
        };
        
        // Start the typing animation immediately after render cycle
        typeCharacter();
      }, 50); // Short delay for render cycle to complete
      
      // Cleanup function
      return () => {
        if (typeAnimationRef.current) {
          clearTimeout(typeAnimationRef.current);
        }
      };
    } else if (message.content) {
      // For user messages or history messages, show full content immediately
      setDisplayedText(message.content);
      setIsTyping(false);  // Ensure isTyping is false for non-animating messages
      setAnimationStarted(true); // Mark as started for history messages
    }
  }, [message.content, message.role, message.thinking, isHistoryMessage, enableAnimation]);

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
    
    // If animation hasn't started yet, show nothing for bot messages (prevents flash)
    if (message.role === 'bot' && !isHistoryMessage && enableAnimation && !animationStarted) {
      return null;
    }
    
    // If still typing and animations are enabled, render the partial text; otherwise render the full message
    const textToRender = (message.role === 'bot' && isTyping && enableAnimation) 
      ? displayedText 
      : message.content;
    
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
  }, [message.content, message.role, isTyping, displayedText, isHistoryMessage, animationStarted, enableAnimation]);

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
              {/* Only show cursor when actively typing, not history, and animations enabled */}
              {message.role === 'bot' && isTyping && !isHistoryMessage && enableAnimation && animationStarted && (
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
