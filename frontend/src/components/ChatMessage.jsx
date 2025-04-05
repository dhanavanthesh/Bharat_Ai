// src/components/ChatMessage.jsx
import React from 'react';
import { FaVolumeUp } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

const ChatMessage = ({ message, darkMode }) => {
  const { role, content } = message;
  const isUser = role === 'user';
  
  const speakMessage = () => {
    const utterance = new SpeechSynthesisUtterance(content);
    window.speechSynthesis.speak(utterance);
  };
  
  return (
    <div className={`flex items-start gap-2 mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`rounded-xl px-4 py-2 max-w-2xl ${
          isUser 
            ? 'bg-blue-500 text-white' 
            : `bg-gray-200 ${darkMode ? 'dark:bg-gray-700 dark:text-white' : ''}`
        }`}
      >
        <div className="flex justify-between items-start mb-1">
          <span className="font-semibold">{isUser ? 'You' : 'AI'}</span>
          {!isUser && (
            <button 
              onClick={speakMessage}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
            >
              <FaVolumeUp size={16} />
            </button>
          )}
        </div>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default ChatMessage;