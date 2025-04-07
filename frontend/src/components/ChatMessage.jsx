// src/components/ChatMessage.jsx
import React from 'react';
import { FaMicrophone, FaCircleNotch, FaExclamationCircle } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { useSpeech } from '../context/SpeechContext';

const ChatMessage = ({ message, darkMode }) => {
  const { role, content, language = 'en' } = message;
  const { speakText, isSpeaking, isProcessing, error } = useSpeech();
  const isUser = role === 'user';
  
  const speakMessage = () => {
    speakText(content, language);
  };

  const getLanguageFlag = () => {
    const flags = {
      en: '🇺🇸',
      hi: '🇮🇳',
      kn: '🇮🇳',
      ta: '🇮🇳',
      te: '🇮🇳',
      mr: '🇮🇳',
      bn: '🇮🇳',
      gu: '🇮🇳',
      pa: '🇮🇳',
      or: '🇮🇳'
    };
    return flags[language] || '🌐';
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
          <div className="flex items-center gap-2">
            <span className="font-semibold">{isUser ? 'You' : 'AI'}</span>
            <span className="text-xs opacity-75">{getLanguageFlag()} {language.toUpperCase()}</span>
          </div>
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
            title={isSpeaking ? "Speaking..." : "Speak this message"}
          >
            {error ? (
              <FaExclamationCircle size={18} className="text-red-500" />
            ) : isProcessing ? (
              <FaCircleNotch size={18} className="animate-spin" />
            ) : (
              <FaMicrophone size={18} />
            )}
          </button>
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
