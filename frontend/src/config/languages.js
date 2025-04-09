// src/config/languages.js
export const supportedLanguages = {
    en: '🇺🇸 English',
    hi: '🇮🇳 Hindi', 
    kn: '🇮🇳 Kannada',
    ta: '🇮🇳 Tamil',
    te: '🇮🇳 Telugu',
    mr: '🇮🇳 Marathi',
    bn: '🇮🇳 Bengali',
    gu: '🇮🇳 Gujarati',
    pa: '🇮🇳 Punjabi',
    or: '🇮🇳 Odia'
  };
  
  export const getLanguageName = (code) => {
    return supportedLanguages[code] || code;
  };