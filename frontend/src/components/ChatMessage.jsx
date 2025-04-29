// src/components/ChatMessage.jsx
import React, { useState } from 'react';
import { FaVolumeUp, FaCircleNotch, FaExclamationCircle, FaCopy, FaCheck } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { useSpeech } from '../context/SpeechContext';

const ChatMessage = ({ message, darkMode }) => {
  const { role, content, language = 'en' } = message;
  const { speakText, isSpeaking, isProcessing, error } = useSpeech();
  const isUser = role === 'user';
  const [isCopied, setIsCopied] = useState(false);
  
  const speakMessage = () => {
    speakText(content, language);
  };

  const copyMessage = () => {
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    // Reset the copied state after 2 seconds
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
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
        <div className="flex justify-end items-start mb-1">
          <div className="flex items-center gap-2">
            <button
              onClick={copyMessage}
              className={`p-1 rounded-full transition-all duration-200 flex items-center gap-1 ${
                isUser 
                  ? 'text-blue-200 hover:text-blue-100 focus:text-blue-100' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100 focus:text-gray-700 dark:focus:text-gray-100'
              }`}
              title={isCopied ? "Copied!" : "Copy message"}
            >
              {isCopied ? (
                <>
                  <FaCheck size={16} className="text-green-500" />
                  <span className="text-xs">Copied!</span>
                </>
              ) : (
                <FaCopy size={16} />
              )}
            </button>
            <button 
              onClick={speakMessage}
              disabled={isProcessing}
              aria-label={isSpeaking ? "Stop speaking" : "Speak message"}
              className={`p-1 rounded-full transition-all duration-200 ${
                isUser 
                  ? 'text-blue-200 hover:text-blue-100 focus:text-blue-100' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100 focus:text-gray-700 dark:focus:text-gray-100'
              } ${
                isSpeaking ? 'animate-pulse text-red-500 dark:text-red-400' : ''
              }`}
              title={isSpeaking ? "Speaking..." : "Speak message"}
            >
              {error ? (
                <FaExclamationCircle size={18} className="text-red-500" />
              ) : isProcessing ? (
                <FaCircleNotch size={18} className="animate-spin" />
              ) : (
                <FaVolumeUp size={18} />
              )}
            </button>
          </div>
        </div>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          className={language !== 'en' ? 'font-sans' : ''}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default ChatMessage;
