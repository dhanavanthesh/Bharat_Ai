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
  or: '🇮🇳 Odia',
  es: '🇪🇸 Spanish',
  fr: '🇫🇷 French',
  de: '🇩🇪 German',
  zh: '🇨🇳 Chinese',
  ar: '🇸🇦 Arabic',
  ru: '🇷🇺 Russian',
  pt: '🇵🇹 Portuguese',
  ja: '🇯🇵 Japanese'
};

export const getLanguageName = (code) => {
  return supportedLanguages[code] || code;
};