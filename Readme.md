# Chatbot Application



A modern web-based chatbot application with AI capabilities powered by GROQ API. This project combines a Flask backend with a React frontend to create a feature-rich chat experience.

## Features

1. **Authentication System**
   * Login and signup pages
   * Protected routes that require authentication
   * User profile management

2. **Chat Interface**
   * Support for multiple chat conversations
   * Ability to create, rename, and delete chats
   * Markdown rendering for code and formatted text
   * Dark mode toggle

3. **AI Integration**
   * Integration with GROQ API for LLaMA 2 and LLaMA 3 models
   * Streaming response effect for better user experience
   * Model selection option

4. **Data Persistence**
   * Chat history saved using IndexedDB
   * Chat titles and messages preserved between sessions
   * Export functionality to save conversations as PDF

## Installation Guide

### Prerequisites
- Python 3.8+
- Node.js 14+
- npm or yarn
- GROQ API key ([Get it here](https://groq.com))

### Backend Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/chatbot.git
   cd chatbot/backend
   ```

2. Create and activate a virtual environment:
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # Mac/Linux
   python -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install flask flask-cors python-dotenv requests werkzeug==2.2.3
   ```

4. Create a `.env` file in the backend directory:
   ```
   GROQ_API_KEY=your_groq_api_key_here
   ```

5. Run the backend server:
   ```bash
   python app.py
   ```
   The server will start on http://localhost:5000

### Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Start the development server:
   ```bash
   npm start
   # or
   yarn start
   ```
   The frontend will be available at http://localhost:3000

## Usage

1. Open your browser and go to http://localhost:3000
2. Sign up with any email and password (this is a demo authentication system)
3. Create a new chat and start chatting with the AI
4. You can toggle between LLaMA 2 and LLaMA 3 models
5. Use the dark mode toggle for different themes
6. Your chat history will persist between sessions

## Troubleshooting

### Common Issues

1. **Flask/Werkzeug version mismatch**:
   ```bash
   pip uninstall flask werkzeug
   pip install flask==2.2.3 werkzeug==2.2.3
   ```

2. **React 18 createRoot error**:
   Make sure your index.js is using the new createRoot API:
   ```javascript
   import { createRoot } from 'react-dom/client';
   const root = createRoot(document.getElementById('root'));
   root.render(<App />);
   ```

3. **CORS Issues**:
   Ensure that Flask-CORS is properly installed and configured in the backend.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
