import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
import requests
import speech_recognition as sr
from gtts import gTTS
import pygame
import time
from groq import Groq
import random
import string
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import json
from datetime import datetime

# Load environment variables
load_dotenv()

# Initialize Flask app
# Initialize Flask app
app = Flask(__name__, static_folder='../frontend/build', static_url_path='')
CORS(app)

# Initialize Groq client
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Initialize Pygame mixer
#pygame.mixer.init()

# Supported languages
LANGUAGES = {
    "english": "en",
    "hindi": "hi",
    "kannada": "kn",
    "tamil": "ta",
    "telugu": "te",
    "sanskrit": "sa"
}

# Initialize speech recognition
recognizer = sr.Recognizer()
# Try to initialize speech recognition components
try:
    microphone = sr.Microphone()
    speech_recognition_available = True
except (ImportError, AttributeError):
    print("PyAudio not found. Speech recognition features will be disabled.")
    microphone = None
    speech_recognition_available = False
    
# Model mapping
MODEL_MAPPING = {
    "LLaMA3-versatile": "llama-3.3-70b-versatile",
    "LLaMA3-versatile": "llama-3.3-70b-versatile",
    "LLaMA3": "llama3-70b-8192",
    "LLaMA2": "llama2-70b-4096"
}

# In-memory storage for pending verifications and users
# In a production app, this would be a database
VERIFICATION_CODES = {}  # email -> {code, full_name, password}
USERS = {}  # email -> {id, name, email, password}
CHAT_HISTORY = {}  # user_id -> {chat_id -> {title, messages}}

# Create data directory if it doesn't exist
os.makedirs('data', exist_ok=True)

# Try to load existing users from file
try:
    with open('data/users.json', 'r') as f:
        USERS = json.load(f)
except:
    USERS = {}

# Try to load existing chat history from file
try:
    with open('data/chat_history.json', 'r') as f:
        CHAT_HISTORY = json.load(f)
except:
    CHAT_HISTORY = {}

def save_data():
    """Save user and chat data to disk"""
    with open('data/users.json', 'w') as f:
        json.dump(USERS, f)
    with open('data/chat_history.json', 'w') as f:
        json.dump(CHAT_HISTORY, f)

def generate_verification_code():
    """Generate a 6-digit verification code"""
    return ''.join(random.choices(string.digits, k=6))

def send_verification_email(email, code):
    """Send verification email with OTP code"""
    sender_email = os.getenv("EMAIL_SENDER", "noreply@chatbotapp.com")
    sender_password = os.getenv("EMAIL_PASSWORD", "")
    
    # For demonstration purposes, just print the code
    # In a real app, you would use a proper email service
    print(f"Sending verification code {code} to {email}")
    
    try:
        message = MIMEMultipart()
        message["From"] = sender_email
        message["To"] = email
        message["Subject"] = "Email Verification - AI Chatbot"
        
        body = f"""
        <html>
        <body>
            <h2>Verify Your Email Address</h2>
            <p>Thank you for registering with AI Chatbot. Use the verification code below to complete your registration:</p>
            <h1 style="color: #3b82f6;">{code}</h1>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this verification, please ignore this email.</p>
        </body>
        </html>
        """
        
        message.attach(MIMEText(body, "html"))
        
        if sender_password:
            with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
                server.login(sender_email, sender_password)
                server.sendmail(sender_email, email, message.as_string())
            return True
        else:
            # Simulate successful sending for development
            print("Email service not configured. Would have sent:")
            print(f"To: {email}")
            print(f"Code: {code}")
            return True
    except Exception as e:
        print(f"Email sending error: {str(e)}")
        return False

def get_groq_response(prompt, language="en", model="llama3-70b-8192"):
    """Get response from Groq API"""
    try:
        completion = groq_client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            max_tokens=1024,
            top_p=1,
            frequency_penalty=0,
            presence_penalty=0,
            stop=None,
        )
        return completion.choices[0].message.content
    except Exception as e:
        print(f"Error with Groq API: {str(e)}")
        return get_error_message(language)

def get_error_message(language):
    """Return error message in appropriate language"""
    messages = {
        "en": "Sorry, I encountered an error. Please try again.",
        "hi": "क्षमा करें, मुझे एक समस्या हुई। कृपया पुनः प्रयास करें।",
        "kn": "ಕ್ಷಮಿಸಿ, ನಾನು ಸಮಸ್ಯೆಯನ್ನು ಎದುರಿಸಿದ್ದೇನೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
        "ta": "மன்னிக்கவும், நான் ஒரு சிக்கலை எதிர்கொண்டேன். தயவு செய்து மீண்டும் முயற்சிக்கவும்.",
        "te": "క్షమించండి, నేను ఒక సమస్యను ఎదుర్కొన్నాను. దయచేసి మళ్లీ ప్రయత్నించండి.",
        "sa": "क्षम्यताम्, अहं समस्याम् अनुभवम्। कृपया पुनः प्रयत्नं कुरुत।"
    }
    return messages.get(language, messages["en"])

# Languages supported for speech recognition
SPEECH_LANGUAGES = ["en", "hi", "kn", "ta", "te"]

def process_audio(audio_data, language="en"):
    """Process audio data and return text"""
    if language not in SPEECH_LANGUAGES:
        print(f"Language {language} not supported for speech recognition")
        return None
        
    try:
        text = recognizer.recognize_google(audio_data, language=language)
        print(f"Recognized speech: {text}")
        return text
    except Exception as e:
        print(f"Error in speech recognition: {str(e)}")
        return None

# Languages supported for text-to-speech
TTS_LANGUAGES = ["en", "hi", "kn", "ta", "te"]

def text_to_speech(text, lang="en"):
    """Convert text to speech and return audio file path"""
    if lang not in TTS_LANGUAGES:
        print(f"Language {lang} not supported for text-to-speech")
        return None
        
    try:
        tts = gTTS(text=text, lang=lang)
        os.makedirs("audio_files", exist_ok=True)
        filename = os.path.join("audio_files", "response.mp3")
        tts.save(filename)
        return filename
    except Exception as e:
        print(f"Error in speech synthesis: {str(e)}")
        return None

# Serve the React app
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

@app.route("/api/health")
def health():
    return jsonify({"status": "Groq AI backend working!"})

from langdetect import detect

from langdetect import detect

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_message = data.get("message", "")
    model_name = data.get("model", "LLaMA3")
    language = data.get("language", "")
    chat_id = data.get("chatId", "")
    user_id = data.get("userId", "")
    
    # Auto-detect language if not specified
    if not language and user_message:
        try:
            detected_lang = detect(user_message)
            # Map detected language to our supported codes
            language = {
                'en': 'en',
                'hi': 'hi',
                'kn': 'kn',
                'ta': 'ta',
                'te': 'te',
                'sa': 'sa'
            }.get(detected_lang, 'en')
        except:
            language = 'en'
    
    model = MODEL_MAPPING.get(model_name, MODEL_MAPPING["LLaMA3"])
    
    
    try:
        response = get_groq_response(user_message, language, model)
        
        # Save message to chat history if user is authenticated
        if user_id and chat_id:
            user_chats = CHAT_HISTORY.get(user_id, {})
            chat = user_chats.get(chat_id, {"title": "New Chat", "messages": []})
            
            # Add user message
            chat["messages"].append({
                "role": "user", 
                "content": user_message,
                "language": language,
                "timestamp": datetime.now().isoformat()
            })
            
            # Add bot response
            chat["messages"].append({
                "role": "bot", 
                "content": response,
                "language": language,
                "timestamp": datetime.now().isoformat()
            })
            
            # Auto-generate title if it's a new chat with default title
            if chat["title"] == "New Chat" and len(chat["messages"]) <= 2:
                words = user_message.split()
                auto_title = " ".join(words[:3]) + ("..." if len(words) > 3 else "")
                chat["title"] = auto_title.capitalize()
            
            user_chats[chat_id] = chat
            CHAT_HISTORY[user_id] = user_chats
            save_data()
        
        return jsonify({"reply": response})
    except Exception as e:
        print("Groq error:", e)
        return jsonify({"reply": get_error_message(language)}), 500

@app.route("/api/signup", methods=["POST"])
def signup():
    data = request.get_json()
    email = data.get("email", "").lower()
    password = data.get("password", "")
    
    if not email or not password:
        return jsonify({"success": False, "message": "Missing required fields"}), 400
    
    if '@' not in email:
        return jsonify({"success": False, "message": "Invalid email format"}), 400
    
    # Allow re-registration for simplicity in development
    # In production, you would check if the email already exists
    
    # Create user account
    user_id = f"user_{len(USERS) + 1}"
    full_name = email.split('@')[0]  # Use email username as name
    
    USERS[email] = {
        "id": user_id,
        "name": full_name,
        "email": email,
        "password": password
    }
    
    # Initialize empty chat history for the user
    CHAT_HISTORY[user_id] = {}
    
    # Save data to disk
    save_data()
    
    return jsonify({
        "success": True,
        "user": {
            "id": user_id,
            "name": full_name,
            "email": email
        }
    })

@app.route("/api/speech-to-text", methods=["POST"])
def speech_to_text():
    if not speech_recognition_available:
        return jsonify({"error": "Speech recognition is not available on the server"}), 503
            
    audio_file = request.files['audio']
    preferred_lang = request.form.get('language', '').lower()
    
    print(f"Received audio file: {audio_file.filename}, size: {audio_file.content_length} bytes")
    
    try:
        # Save the audio file temporarily
        temp_path = os.path.join("temp_audio.wav")
        audio_file.save(temp_path)
        print(f"Saved audio file to: {temp_path}")
        
        with sr.AudioFile(temp_path) as source:
            print("Attempting to recognize speech...")
            audio_data = recognizer.record(source)
            
            # If preferred language is specified, try that first
            if preferred_lang and preferred_lang in SPEECH_LANGUAGES:
                try:
                    text = recognizer.recognize_google(audio_data, language=preferred_lang)
                    if text:
                        print(f"Detected language: {preferred_lang}, text: {text}")
                        return jsonify({
                            "text": text,
                            "language": preferred_lang
                        })
                except Exception as e:
                    print(f"Recognition failed for preferred language {preferred_lang}: {str(e)}")
            
            # Fallback to trying all supported languages
            detected_text = None
            detected_lang = "en"  # default fallback
            
            # Try Kannada first if not already tried
            if preferred_lang != "kn" and "kn" in SPEECH_LANGUAGES:
                try:
                    text = recognizer.recognize_google(audio_data, language="kn")
                    if text:
                        detected_text = text
                        detected_lang = "kn"
                        print(f"Detected language: kn, text: {text}")
                except:
                    pass
            
            if not detected_text:
                for lang in SPEECH_LANGUAGES:
                    if lang == "kn":  # Already tried
                        continue
                    try:
                        text = recognizer.recognize_google(audio_data, language=lang)
                        if text:
                            detected_text = text
                            detected_lang = lang
                            print(f"Detected language: {lang}, text: {text}")
                            break
                    except:
                        continue
            
            if detected_text:
                return jsonify({
                    "text": detected_text,
                    "language": detected_lang
                })
            
            print("Could not recognize speech in any supported language")
            return jsonify({"error": "Could not recognize speech"}), 400
    except Exception as e:
        print(f"Speech recognition error: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.route("/api/text-to-speech", methods=["POST"])
def text_to_speech_endpoint():
    data = request.get_json()
    text = data.get("text", "")
    language = data.get("language", "en")
    
    if not text:
        return jsonify({"error": "No text provided"}), 400
    
    try:
        audio_path = text_to_speech(text, language)
        if audio_path:
            return send_from_directory(os.path.dirname(audio_path), os.path.basename(audio_path))
        return jsonify({"error": "Could not generate speech"}), 500
    except Exception as e:
        print(f"Text-to-speech error: {str(e)}")
        return jsonify({"error": str(e)}), 500

# User authentication and chat history APIs

@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()
    email = data.get("email", "").lower()
    full_name = data.get("fullName", "")
    password = data.get("password", "")
    
    print(f"Registration attempt for {email} with name: {full_name}")
    
    if not email or not password:
        return jsonify({"success": False, "message": "Missing required fields"}), 400
    
    if '@' not in email:
        return jsonify({"success": False, "message": "Invalid email format"}), 400
    
    if email in USERS:
        return jsonify({"success": False, "message": "Email already registered"}), 400
    
    # Use the email username as fullName if not provided
    if not full_name:
        full_name = email.split('@')[0]
    
    # Generate verification code
    code = generate_verification_code()
    VERIFICATION_CODES[email] = {
        "code": code,
        "full_name": full_name,
        "password": password,
        "timestamp": datetime.now().isoformat()
    }
    
    print(f"Verification code for {email}: {code}")
    print(f"Verification data: {VERIFICATION_CODES[email]}")
    
    # Send verification email
    if send_verification_email(email, code):
        return jsonify({
            "success": True,
            "message": "Verification code sent to your email"
        })
    else:
        return jsonify({
            "success": False,
            "message": "Failed to send verification email"
        }), 500
        
        
        
@app.route("/api/verify", methods=["POST"])
def verify():
    data = request.get_json()
    email = data.get("email", "").lower()
    code = data.get("code", "")
    
    print(f"Verification attempt for {email} with code {code}")
    
    if not email or not code:
        return jsonify({"success": False, "message": "Missing required fields"}), 400
    
    if email not in VERIFICATION_CODES:
        return jsonify({"success": False, "message": "No verification pending for this email"}), 400
    
    verification = VERIFICATION_CODES[email]
    print(f"Verification data: {verification}")
    
    if verification["code"] != code:
        return jsonify({"success": False, "message": "Invalid verification code"}), 400
    
    # Fallback approach - create a user if they don't exist
    user = None
    if email in USERS:
        user = USERS[email]
        user_id = user["id"]
    else:
        # Create a simple user account with defaults
        user_id = f"user_{len(USERS) + 1}"
        full_name = verification.get("full_name", email.split("@")[0])
        password = verification.get("password", "default_password")
        
        USERS[email] = {
            "id": user_id,
            "name": full_name,
            "email": email,
            "password": password
        }
        user = USERS[email]
        
        # Initialize empty chat history for the user
        CHAT_HISTORY[user_id] = {}
    
    # Remove verification code
    del VERIFICATION_CODES[email]
    
    # Save data to disk
    save_data()
    
    return jsonify({
        "success": True,
        "message": "Email verified successfully",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"]
        }
    })

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email", "").lower()
    password = data.get("password", "")
    
    if not email or not password:
        return jsonify({"success": False, "message": "Missing required fields"}), 400
    
    if email not in USERS:
        return jsonify({"success": False, "message": "Email not registered"}), 401
    
    user = USERS[email]
    
    if user["password"] != password:
        return jsonify({"success": False, "message": "Incorrect password"}), 401
    
    return jsonify({
        "success": True,
        "message": "Login successful",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"]
        }
    })

@app.route("/api/send-verification", methods=["POST"])
def send_verification():
    data = request.get_json()
    email = data.get("email", "").lower()
    
    if not email:
        return jsonify({"success": False, "message": "Email is required"}), 400
    
    if email not in USERS:
        return jsonify({"success": False, "message": "Email not registered"}), 404
    
    # Generate verification code
    code = generate_verification_code()
    VERIFICATION_CODES[email] = {
        "code": code,
        "timestamp": datetime.now().isoformat()
    }
    
    # Send verification email
    if send_verification_email(email, code):
        return jsonify({
            "success": True,
            "message": "Verification code sent to your email"
        })
    else:
        return jsonify({
            "success": False,
            "message": "Failed to send verification email"
        }), 500

@app.route("/api/chats", methods=["GET"])
def get_chats():
    user_id = request.args.get("userId", "")
    
    if not user_id:
        return jsonify({"success": False, "message": "User ID is required"}), 400
    
    if user_id not in CHAT_HISTORY:
        return jsonify({"success": True, "chats": {}})
    
    return jsonify({
        "success": True,
        "chats": CHAT_HISTORY[user_id]
    })

@app.route("/api/chats", methods=["POST"])
def create_chat():
    data = request.get_json()
    user_id = data.get("userId", "")
    chat_id = data.get("chatId", f"chat_{datetime.now().timestamp()}")
    title = data.get("title", "New Chat")
    
    if not user_id:
        return jsonify({"success": False, "message": "User ID is required"}), 400
    
    if user_id not in CHAT_HISTORY:
        CHAT_HISTORY[user_id] = {}
    
    CHAT_HISTORY[user_id][chat_id] = {
        "title": title,
        "messages": []
    }
    
    save_data()
    
    return jsonify({
        "success": True,
        "chatId": chat_id,
        "chat": CHAT_HISTORY[user_id][chat_id]
    })

@app.route("/api/chats/<chat_id>", methods=["PUT"])
def update_chat(chat_id):
    data = request.get_json()
    user_id = data.get("userId", "")
    title = data.get("title", "")
    
    if not user_id:
        return jsonify({"success": False, "message": "User ID is required"}), 400
    
    if user_id not in CHAT_HISTORY or chat_id not in CHAT_HISTORY[user_id]:
        return jsonify({"success": False, "message": "Chat not found"}), 404
    
    if title:
        CHAT_HISTORY[user_id][chat_id]["title"] = title
    
    save_data()
    
    return jsonify({
        "success": True,
        "chat": CHAT_HISTORY[user_id][chat_id]
    })

@app.route("/api/chats/<chat_id>", methods=["DELETE"])
def delete_chat(chat_id):
    user_id = request.args.get("userId", "")
    
    if not user_id:
        return jsonify({"success": False, "message": "User ID is required"}), 400
    
    if user_id not in CHAT_HISTORY or chat_id not in CHAT_HISTORY[user_id]:
        return jsonify({"success": False, "message": "Chat not found"}), 404
    
    del CHAT_HISTORY[user_id][chat_id]
    save_data()
    
    return jsonify({
        "success": True,
        "message": "Chat deleted successfully"
    })

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
