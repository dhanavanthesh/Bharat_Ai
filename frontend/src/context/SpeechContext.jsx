import React, { createContext, useContext, useState } from 'react';
import { supportedLanguages } from '../config/languages';

const SpeechContext = createContext();

export const SpeechProvider = ({ children }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const startListening = (lang = currentLanguage) => {
    setIsListening(true);
    setIsProcessing(true);
    setError(null);
    
    if (!supportedLanguages[lang]) {
      setError(`Language ${lang} is not supported`);
      setIsProcessing(false);
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      try {
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = lang;
        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          resolve({ text: transcript, language: lang });
        };
        recognition.onerror = (event) => {
          setError(event.error);
          resolve(null);
        };
        recognition.start();
      } catch (err) {
        setError('Speech recognition not supported');
        resolve(null);
      } finally {
        setIsProcessing(false);
      }
    });
  };

  const stopListening = () => {
    setIsListening(false);
  };

  const speakText = (text, lang = currentLanguage) => {
    if (!text) return false;
    
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (err) {
      setError('Text-to-speech not supported');
      return false;
    }
  };

  return (
    <SpeechContext.Provider
      value={{
        isListening,
        isSpeaking,
        isProcessing,
        error,
        currentLanguage,
        setCurrentLanguage,
        supportedLanguages,
        startListening,
        stopListening,
        speakText
      }}
    >
      {children}
    </SpeechContext.Provider>
  );
};

export const useSpeech = () => {
  const context = useContext(SpeechContext);
  if (!context) {
    throw new Error('useSpeech must be used within a SpeechProvider');
  }
  return context;
};