// src/pages/Home.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <div className="particles"></div>
      
      <main className="landing-main">
        <div className="content">
          <div className="headline">
            <h1>Bharat AI</h1>
          </div>
          <p>Welcome to the next generation of conversational AI! Our chatbot helps you automate customer interactions, provide instant support, and improve satisfaction — all in real time with multilingual capabilities.</p>
          <div className="feature-list">
            <div className="feature-item">
              <span className="feature-icon">🌐</span>
              <span>Multilingual Support</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔊</span>
              <span>Voice Commands</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔒</span>
              <span>Secure Chats</span>
            </div>
          </div>
          <div className="buttons">
            <button className="login-btn" onClick={() => navigate('/login')}>Login</button>
            <button className="signup-btn" onClick={() => navigate('/signup')}>Get Started</button>
          </div>
        </div>
        <div className="bot-image">
          <div className="image-container">
            <img src="/image.png" alt="AI Chatbot Illustration" />
            <div className="image-glow"></div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;