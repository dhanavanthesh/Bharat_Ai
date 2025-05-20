import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Home.css';

const Home = () => {
  const navigate = useNavigate();
  
  return (
    <div className="landing-page">
      <div className="particles"></div>
      
      <main className="landing-main">
        {/* Left Side - Logo and LMLM info */}
        <div className="bot-image" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="image-container">
            <div className="image-glow"></div>
            <img src="/image.png" alt="Bharat AI Lotus Logo" />
          </div>
          
          {/* Content moved below the image */}
          <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="text-logo" style={{ textAlign: 'center', marginBottom: '40px' }}>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '5px' }}>
                India's first LMLM
                <br />
                <span style={{ fontSize: '1rem', fontWeight: '400', opacity: '0.9' }}>(Large Multi-Language Model)</span>
              </p>
              <p style={{ fontSize: '1.2rem', fontWeight: '600' }}>World's First Humanized AI Model(H.A.I)</p>
            </div>
          </div>
        </div>
        
        {/* Right Side - Content */}
        <div className="content">
          <div className="headline">
            <div className="title-section">
              <h1>
                <span className="title-upper" style={{ color: 'white', letterSpacing: '0.2em' }}>B H A A I</span><br />
                <span className="title-main" style={{ color: '#ff00cc' }}>Bharat AI</span>
              </h1>
            </div>
            <p className="description">
              Welcome to Bhaai (brother), where technology meets
              empathy. A humanized AI companion designed to
              understand and respond to you with a personal touch.
              With advanced natural language processing (NLP) and a
              dash of personality, Bhaai provides a more relatable
              and engaging experience.
            </p>
            <p className="additional-description">
              Whether you need assistance, information, automation
              or just someone to chat with, Bhaai is always there to
              help just like a brother.
            </p>
          </div>
          
          <div className="feature-list">
            <div className="feature-item" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
              <span className="feature-icon">🌐</span>
              <span>Multilingual Support</span>
            </div>
            <div className="feature-item" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
              <span className="feature-icon">🔊</span>
              <span>Voice Commands</span>
            </div>
            <div className="feature-item" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
              <span className="feature-icon">🔒</span>
              <span>Secure Conversations</span>
            </div>
            <div className="feature-item" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
              <span className="feature-icon">🤖</span>
              <span>Aigentic Modules</span>
            </div>

          </div>
          
          <div className="buttons">
            <button className="login-btn" onClick={() => navigate('/login')} 
                 style={{ border: '2px solid #ff00cc', borderRadius: '50px', padding: '10px 20px' }}>
              Login
            </button>
            <button className="signup-btn" onClick={() => navigate('/signup')}
                 style={{ backgroundColor: '#ff00cc', borderRadius: '50px', padding: '10px 20px' }}>
              Get Started
            </button>
          </div>
        </div>
      </main>
      
      <footer className="landing-footer" style={{ position: 'absolute', bottom: '0', width: '100%', textAlign: 'center', padding: '1rem' }}>
  <p>© 2025, All Rights Reserved. Das Vinci Labs, Das Vinci Corp & Princess Viyona Ventures</p>
</footer>
    </div>
  );
};

export default Home;
