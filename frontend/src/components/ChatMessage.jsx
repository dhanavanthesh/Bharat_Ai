import React from 'react';
import { FaRobot, FaUser } from 'react-icons/fa';
import '../styles/ChatMessage.css';

const ChatMessage = ({ message, darkMode, isLast, typingIndicator }) => {
  const { role, content, language } = message;
  
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  // Enhanced content formatter with better code highlighting
  const formatContent = (text) => {
    if (!text) return '';

    // Split by code block markers
    const parts = text.split('```');
    
    if (parts.length === 1) {
      // No code blocks, return plain text with newlines converted to <br/>
      return <p>{text.split('\n').map((line, i) => (
        <React.Fragment key={i}>
          {line}
          {i < text.split('\n').length - 1 && <br />}
        </React.Fragment>
      ))}</p>;
    }

    return parts.map((part, index) => {
      // Even indices are normal text, odd indices are code blocks
      if (index % 2 === 0) {
        return part ? (
          <p key={index}>
            {part.split('\n').map((line, i) => (
              <React.Fragment key={i}>
                {line}
                {i < part.split('\n').length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        ) : null;
      } else {
        // This is a code block
        // Check if there's a language specified on the first line
        const lines = part.split('\n');
        const language = lines[0].trim();
        const code = lines.slice(1).join('\n');

        return (
          <div key={index} className="code-block-container">
            {language && <div className="code-language">{language}</div>}
            <pre className="code-block">
              <code>{code}</code>
            </pre>
          </div>
        );
      }
    });
  };

  return (
    <div className={`message-container ${role === 'bot' ? 'bot' : 'user'}`}>
      <div className="message-avatar">
        {role === 'bot' ? <FaRobot /> : <FaUser />}
      </div>
      
      <div className="message-content">
        <div className="message-header">
          <span className="message-sender">{role === 'bot' ? 'BHARAT AI' : 'You'}</span>
          {message.timestamp && (
            <span className="message-time">{formatTimestamp(message.timestamp)}</span>
          )}
          {language && role === 'user' && (
            <span className="message-language">{language}</span>
          )}
        </div>
        
        <div className="message-body">
          {isLast && content === '...' ? (
            typingIndicator()
          ) : (
            formatContent(content)
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
