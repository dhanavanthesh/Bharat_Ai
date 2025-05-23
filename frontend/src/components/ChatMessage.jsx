import React, { useRef, useEffect, useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { toast } from 'react-toastify';
import '../styles/ChatMessage.css';
import { auth } from '../utils/auth';
import { profileApi } from '../utils/profileApi';

// Using memo to prevent unnecessary re-renders
const ChatMessage = memo(({ message, darkMode, isLast, typingIndicator }) => {
  const messageRef = useRef(null);
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [userName, setUserName] = useState(''); 
  
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

  // Efficient language detection
  const getCodeLanguage = (codeString) => {
    const firstLine = codeString.trim().split('\n')[0].trim();
    if (firstLine.includes('```')) {
      const lang = firstLine.replace('```', '').trim().toLowerCase();
      if (lang) return lang;
    }
    return 'javascript';
  };

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
              {message.content}
            </ReactMarkdown>
          ) : (
            // Show "AI is thinking" when message has the thinking flag, otherwise show the normal typing indicator
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
