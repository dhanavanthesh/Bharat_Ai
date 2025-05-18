export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

export const DEFAULT_MODEL = 'LLaMA3';
export const DEFAULT_LANGUAGE = 'en';

export const AVAILABLE_MODELS = [
  { id: 'LLaMA3', name: 'LLaMA3' },
  { id: 'LLaMA3-versatile', name: 'LLaMA3 Versatile' },
  { id: 'LLaMA2', name: 'LLaMA2' }
];

export const AVAILABLE_LANGUAGES = [
  { id: 'en', name: 'English' },
  { id: 'hi', name: 'Hindi' },
  { id: 'kn', name: 'Kannada' },
  { id: 'ta', name: 'Tamil' },
  { id: 'te', name: 'Telugu' },
  { id: 'sa', name: 'Sanskrit' }
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
