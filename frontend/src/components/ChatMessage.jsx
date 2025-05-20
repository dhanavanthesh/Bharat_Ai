import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import '../styles/ChatMessage.css';

// Simplified ChatMessage component without syntax highlighting
const ChatMessage = ({ message, darkMode, isLast, typingIndicator }) => {
  const isUser = message.role === 'user';
  
  // Get the first initial of the user's name, or use a default
  const getUserInitial = () => {
    // Check if message contains user info
    if (message.userName) {
      return message.userName.charAt(0).toUpperCase();
    }
    
    // Try to get the current user from localStorage or session
    try {
      const userString = localStorage.getItem('user');
      if (userString) {
        const user = JSON.parse(userString);
        if (user && user.name) {
          return user.name.charAt(0).toUpperCase();
        }
      }
    } catch (e) {
      console.log('Error getting user from storage', e);
    }
    
    // Default to a person icon representation
    return '👤';
  };
  
  return (
    <div className={`message-container ${isUser ? 'user' : 'bot'}`}>
      <div className="message-avatar">
        {isUser ? (
          <div className="avatar user-avatar">
            <span>{getUserInitial()}</span>
          </div>
        ) : (
          <div className="bot-avatar">
            <img src="/image.png" alt="BHAAI" className="bot-logo" />
          </div>
        )}
      </div>
      
      <div className="message-content">
        <div className="message-bubble">
          {isLast ? (
            <>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
              {typingIndicator && typingIndicator()}
            </>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
