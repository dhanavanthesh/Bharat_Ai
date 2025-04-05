import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Make sure this element exists in your HTML
const container = document.getElementById('root');

// Check if the container exists before trying to render
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("Container element with id 'root' not found!");
}