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
from datetime import datetime, timedelta
import logging
from logging.handlers import RotatingFileHandler
import pymongo
from bson.objectid import ObjectId
import ssl

# Configure logging to console only (removing file logging)
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Create console handler only (removing file handler)
stream_handler = logging.StreamHandler()

# Create formatter and add it to handler - fix the typo here
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
stream_handler.setFormatter(formatter)

# Add handler to the logger
logger.addHandler(stream_handler)

# load_dotenv('/etc/bharatai.env')
load_dotenv('.env')

# Function to create directory with proper permissions for VPS
def create_directory_with_permissions(dir_path):
    """Create directory if it doesn't exist and set proper permissions for VPS"""
    if not os.path.exists(dir_path):
        os.makedirs(dir_path, exist_ok=True)
        try:
            # Set directory permissions to 755 for VPS environments
            os.chmod(dir_path, 0o755)
            logger.info(f"Created directory with proper permissions: {dir_path}")
        except Exception as e:
            logger.warning(f"Could not set permissions for {dir_path}: {str(e)}")

# Create required directories with proper permissions
create_directory_with_permissions("static")
create_directory_with_permissions("temp")
create_directory_with_permissions("pdf_files")
create_directory_with_permissions("audio_files")

def get_database():
    """
    Initialize and return MongoDB connection
    """
    # Get MongoDB URI from environment variables
    mongo_url = os.getenv('MONGO_URL') or os.getenv('MONGO_URI')
    
    if not mongo_url:
        logger.error("MongoDB URI not found in environment variables")
        return None
    
    try:
        # Set MongoDB connection options
        # Updated to use newer PyMongo SSL options
        mongo_options = {
            'tls': True,
            'tlsAllowInvalidCertificates': True,
            'retryWrites': False,
            'connectTimeoutMS': 5000,
            'socketTimeoutMS': 30000
        }
        
        # Create a MongoDB client with the options
        client = pymongo.MongoClient(mongo_url, **mongo_options)
        # Test the connection
        client.admin.command('ping')
        logger.info("Successfully connected to MongoDB")
        
        # Initialize collections if they don't exist
        db = client.get_database("chatbotDB")
        if "users" not in db.list_collection_names():
            db.create_collection("users")
            db.users.create_index([("email", pymongo.ASCENDING)], unique=True)
            logger.info("Created users collection")
            
        if "verifications" not in db.list_collection_names():
            db.create_collection("verifications")
            db.verifications.create_index([("email", pymongo.ASCENDING)])
            db.verifications.create_index([("code", pymongo.ASCENDING)])
            logger.info("Created verifications collection")
            
        if "chats" not in db.list_collection_names():
            db.create_collection("chats")
            db.chats.create_index([("user_id", pymongo.ASCENDING)])
            db.chats.create_index([("updated_at", pymongo.DESCENDING)])
            logger.info("Created chats collection")
            
        return db
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {str(e)}")
        return None
    
# Get database connection
db = get_database()
if db is None:  # Fixed comparison to check if db is None
    logger.critical("Could not connect to MongoDB. Application will not function correctly.")

# Initialize the Flask app
app = Flask(__name__)

# Configure CORS
CORS(app, resources={r"/api/*": {"origins": "*", "supports_credentials": True}})

# Initialize Groq client
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

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
    logger.warning("PyAudio not found. Speech recognition features will be disabled.")
    microphone = None
    speech_recognition_available = False

# Model mapping
MODEL_MAPPING = {
    "LLaMA3-versatile": "llama-3.3-70b-versatile",
    "LLaMA3": "llama3-70b-8192",
    "LLaMA2": "llama2-70b-4096"
}

# Helper Functions
def generate_verification_code():
    """Generate a 6-digit verification code"""
    return ''.join(random.choices(string.digits, k=6))

def send_verification_email(email, code):
    """Send verification email with OTP code"""
    sender_email = os.getenv("EMAIL_SENDER", "noreply@chatbotapp.com")
    sender_password = os.getenv("EMAIL_PASSWORD", "")

    logger.info(f"Sending verification code {code} to {email}")

    try:
        message = MIMEMultipart()
        message["From"] = sender_email
        message["To"] = email
        message["Subject"] = "Email Verification - Bharat AI"

        body = f"""
        <html>
        <body>
            <h2>Verify Your Email Address</h2>
            <p>Thank you for registering with Bharat AI. Use the verification code below to complete your registration:</p>
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
            logger.info(f"Email sent successfully to {email}")
            return True
        else:
            # Simulate successful sending for development
            logger.warning("Email service not configured. Would have sent:")
            logger.warning(f"To: {email}")
            logger.warning(f"Code: {code}")
            return True
    except Exception as e:
        logger.error(f"Email sending error: {str(e)}")
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
        logger.error(f"Error with Groq API: {str(e)}")
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
        logger.warning(f"Language {language} not supported for speech recognition")
        return None

    try:
        text = recognizer.recognize_google(audio_data, language=language)
        logger.info(f"Recognized speech: {text}")
        return text
    except Exception as e:
        logger.error(f"Error in speech recognition: {str(e)}")
        return None

# Languages supported for text-to-speech
TTS_LANGUAGES = ["en", "hi", "kn", "ta", "te"]

def text_to_speech(text, lang="en"):
    """Convert text to speech and return audio file path"""
    if lang not in TTS_LANGUAGES:
        logger.warning(f"Language {lang} not supported for text-to-speech")
        return None

    try:
        tts = gTTS(text=text, lang=lang)
        create_directory_with_permissions("audio_files")
        filename = os.path.join("audio_files", f"response_{random.randint(1000, 9999)}.mp3")
        tts.save(filename)
        return filename
    except Exception as e:
        logger.error(f"Error in speech synthesis: {str(e)}")
        return None

from langdetect import detect

# Create directories needed by the application
# Replace the existing directory creation with the new function
create_directory_with_permissions("static")
create_directory_with_permissions("temp")
create_directory_with_permissions("pdf_files")
create_directory_with_permissions("audio_files")

# Define PDF extraction functions at the module level (not inside a try/except block)
def extract_text_with_pdfminer(pdf_path):
    """Extract text from PDF using pdfminer"""
    try:
        from pdfminer.high_level import extract_text
        return extract_text(pdf_path)
    except ImportError:
        logger.warning("pdfminer.six not installed")
        return None

def extract_text_with_pdftotext(pdf_path):
    """Extract text from PDF using pdftotext command line tool"""
    try:
        import subprocess
        result = subprocess.run(["pdftotext", pdf_path, "-"], capture_output=True, text=True)
        if result.returncode == 0:
            return result.stdout
        else:
            logger.warning(f"pdftotext command failed: {result.stderr}")
            return None
    except (subprocess.SubprocessError, FileNotFoundError):
        logger.warning("pdftotext command not available")
        return None

def extract_text_with_pypdf2(pdf_path):
    """Extract text from PDF using PyPDF2"""
    try:
        import PyPDF2
        text = ""
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            for page in reader.pages:
                text += page.extract_text() + "\n"
        return text
    except ImportError:
        logger.warning("PyPDF2 not installed")
        return None
    except Exception as e:
        logger.warning(f"PyPDF2 extraction error: {str(e)}")
        return None

# Attempt to correctly import and configure PyMuPDF
pdf_support = False

# Try PyMuPDF first
try:
    import PyMuPDF
    fitz = PyMuPDF
    def extract_text_with_pymupdf(pdf_path):
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text
    logger.info("Successfully imported PyMuPDF directly")
    pdf_support = True
except ImportError:
    try:
        import fitz
        def extract_text_with_pymupdf(pdf_path):
            doc = fitz.open(pdf_path)
            text = ""
            for page in doc:
                text += page.get_text()
            doc.close()
            return text
        logger.info("Successfully imported fitz module")
        pdf_support = True
    except (ImportError, AttributeError):
        logger.warning("PyMuPDF/fitz not available")
        extract_text_with_pymupdf = lambda path: None

# Set up the main extraction function that will try all available methods
def extract_text_from_pdf(pdf_path):
    """Extract text from PDF using all available methods"""
    # Try each method in order
    extractors = [
        ("PyMuPDF", extract_text_with_pymupdf),
        ("pdfminer", extract_text_with_pdfminer),
        ("PyPDF2", extract_text_with_pypdf2),
        ("pdftotext", extract_text_with_pdftotext),
    ]
    
    for name, extractor in extractors:
        try:
            logger.info(f"Trying PDF extraction with {name}")
            text = extractor(pdf_path)
            if text and text.strip():
                logger.info(f"Successfully extracted text with {name}")
                return text
        except Exception as e:
            logger.warning(f"{name} extraction failed: {str(e)}")
    
    # If we get here, all methods failed
    logger.error("All PDF extraction methods failed")
    return "Could not extract text from the PDF. The file may be encrypted, scanned, or damaged."

# API Routes
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

@app.route("/api/health")
def health_check():
    """Health check endpoint for the API"""
    if db is None:  # Fixed comparison
        return jsonify({
            'status': 'error',
            'message': 'Database connection is not available',
            'timestamp': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
        }), 500
        
    try:
        # Try to ping the database
        db.command('ping')
        return jsonify({
            'status': 'healthy',
            'database': 'connected',
            'timestamp': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'),
            'environment': {
                'variables': {
                    var: bool(os.getenv(var)) for var in [
                        'GROQ_API_KEY',
                        'EMAIL_SENDER',
                        'EMAIL_PASSWORD',
                        'MONGO_URL',
                        'MONGO_URI'
                    ]
                }
            }
        })
    except Exception as e:
        logger.error(f"MongoDB health check failed: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Database connection error',
            'error': str(e),
            'timestamp': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
        }), 500

@app.route("/api/chat", methods=["POST"])
def chat():
    """Send a message to the AI and get a response"""
    if db is None:  # Fixed comparison
        return jsonify({"error": "Database connection is not available"}), 500
        
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
        except Exception as e:
            logger.warning(f"Language detection failed: {str(e)}")
            language = 'en'

    model = MODEL_MAPPING.get(model_name, MODEL_MAPPING["LLaMA3"])

    try:
        response = get_groq_response(user_message, language, model)

        # Save message to chat history if user is authenticated and valid chat ID provided
        if user_id and chat_id:
            try:
                # Add user message
                user_msg = {
                    "role": "user",
                    "content": user_message,
                    "language": language,
                    "timestamp": datetime.now()
                }
                
                # Add bot response
                bot_msg = {
                    "role": "bot",
                    "content": response,
                    "language": language,
                    "timestamp": datetime.now()
                }
                
                # Check if chat exists
                chat = db.chats.find_one({"_id": chat_id, "user_id": user_id})
                
                if chat:
                    # Update existing chat with new messages
                    db.chats.update_one(
                        {"_id": chat_id, "user_id": user_id},
                        {
                            "$push": {"messages": {"$each": [user_msg, bot_msg]}},
                            "$set": {"updated_at": datetime.now()}
                        }
                    )
                else:
                    # Create new chat with initial messages
                    # Auto-generate title from the first message
                    words = user_message.split()
                    auto_title = " ".join(words[:3]) + ("..." if len(words) > 3 else "")
                    title = auto_title.capitalize()
                    
                    db.chats.insert_one({
                        "_id": chat_id,
                        "user_id": user_id,
                        "title": title,
                        "messages": [user_msg, bot_msg],
                        "created_at": datetime.now(),
                        "updated_at": datetime.now()
                    })
                
                logger.info(f"Saved chat messages for user {user_id}, chat {chat_id}")
            except Exception as db_error:
                logger.error(f"Error saving chat messages: {str(db_error)}")
                # Continue to return response even if DB operation fails
        
        return jsonify({"reply": response})
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        return jsonify({"reply": get_error_message(language)}), 500

@app.route("/api/signup", methods=["POST"])
def signup():
    """Direct signup without email verification"""
    if db is None:  # Fixed comparison
        return jsonify({"error": "Database connection is not available"}), 500
        
    data = request.get_json()
    email = data.get("email", "").lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"success": False, "message": "Missing required fields"}), 400

    if '@' not in email:
        return jsonify({"success": False, "message": "Invalid email format"}), 400

    try:
        # Check if user already exists
        existing_user = db.users.find_one({"email": email})
        if existing_user:
            return jsonify({"success": False, "message": "Email already registered"}), 400
        
        # Create new user
        full_name = email.split('@')[0]  # Use email username as name
        user = {
            "name": full_name,
            "email": email,
            "password": password,  # In production, this should be hashed
            "created_at": datetime.now()
        }
        
        result = db.users.insert_one(user)
        user_id = str(result.inserted_id)
        
        logger.info(f"User created with ID: {user_id}, email: {email}")
        
        return jsonify({
            "success": True,
            "user": {
                "id": user_id,
                "name": full_name,
                "email": email
            }
        })
    except Exception as e:
        logger.error(f"Signup error: {str(e)}")
        return jsonify({"success": False, "message": f"An error occurred during signup: {str(e)}"}), 500

@app.route("/api/register", methods=["POST"])
def register():
    """Register with email verification"""
    if db is None:  # Fixed comparison
        return jsonify({"error": "Database connection is not available"}), 500
        
    data = request.get_json()
    email = data.get("email", "").lower()
    full_name = data.get("fullName", "")
    password = data.get("password", "")

    logger.info(f"Registration attempt for {email} with name: {full_name}")

    if not email or not password:
        return jsonify({"success": False, "message": "Missing required fields"}), 400

    if '@' not in email:
        return jsonify({"success": False, "message": "Invalid email format"}), 400

    try:
        # Check if user already exists
        existing_user = db.users.find_one({"email": email})
        if existing_user:
            return jsonify({"success": False, "message": "Email already registered"}), 400
        
        # Use the email username as fullName if not provided
        if not full_name:
            full_name = email.split('@')[0]
        
        # Generate verification code
        code = generate_verification_code()
        expires_at = datetime.now() + timedelta(minutes=10)
        
        # Delete any existing OTPs for this email first
        db.verifications.delete_many({"email": email})
        
        # Store verification code in the database
        verification = {
            "email": email,
            "code": code,
            "full_name": full_name,
            "password": password,
            "created_at": datetime.now(),
            "expires_at": expires_at
        }
        
        db.verifications.insert_one(verification)
        
        logger.info(f"Verification code for {email}: {code}")
        
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
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        return jsonify({"success": False, "message": f"An error occurred during registration: {str(e)}"}), 500

@app.route("/api/verify", methods=["POST"])
def verify():
    """Verify email with the provided code"""
    if db is None:  # Fixed comparison
        return jsonify({"error": "Database connection is not available"}), 500
        
    data = request.get_json()
    email = data.get("email", "").lower()
    code = data.get("code", "")

    logger.info(f"Verification attempt for {email} with code {code}")

    if not email or not code:
        return jsonify({"success": False, "message": "Missing required fields"}), 400

    try:
        # Find the verification code
        verification = db.verifications.find_one({
            "email": email,
            "code": code,
            "expires_at": {"$gt": datetime.now()}  # Check if not expired
        })
        
        if not verification:
            expired_verification = db.verifications.find_one({
                "email": email,
                "code": code
            })
            
            if expired_verification:
                return jsonify({"success": False, "message": "Verification code has expired"}), 400
            else:
                return jsonify({"success": False, "message": "Invalid verification code"}), 400
        
        # Check if user already exists
        existing_user = db.users.find_one({"email": email})
        
        if existing_user:
            user_id = str(existing_user["_id"])
            name = existing_user["name"]
        else:
            # Create new user
            user = {
                "name": verification["full_name"],
                "email": email,
                "password": verification["password"],  # In production, this should be hashed
                "created_at": datetime.now()
            }
            
            result = db.users.insert_one(user)
            user_id = str(result.inserted_id)
            name = verification["full_name"]
        
        # Delete the verification
        db.verifications.delete_one({"_id": verification["_id"]})
        
        logger.info(f"Email verified successfully for {email}")
        
        return jsonify({
            "success": True,
            "message": "Email verified successfully",
            "user": {
                "id": user_id,
                "name": name,
                "email": email
            }
        })
    except Exception as e:
        logger.error(f"Verification error: {str(e)}")
        return jsonify({"success": False, "message": f"An error occurred during verification: {str(e)}"}), 500

@app.route("/api/login", methods=["POST"])
def login():
    """Login with email and password"""
    if db is None:  # Fixed comparison
        return jsonify({"error": "Database connection is not available"}), 500
        
    data = request.get_json()
    email = data.get("email", "").lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"success": False, "message": "Missing required fields"}), 400

    try:
        # Find user by email
        user = db.users.find_one({"email": email})
        
        if not user:
            return jsonify({"success": False, "message": "Email not registered"}), 401
        
        # Check password (in production, you should use a proper password hash comparison)
        if user["password"] != password:
            return jsonify({"success": False, "message": "Incorrect password"}), 401
        
        logger.info(f"User logged in: {email}")
        
        return jsonify({
            "success": True,
            "message": "Login successful",
            "user": {
                "id": str(user["_id"]),
                "name": user.get("name", email.split('@')[0]),
                "email": user["email"]
            }
        })
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({"success": False, "message": f"An error occurred during login: {str(e)}"}), 500

@app.route("/api/send-verification", methods=["POST"])
def send_verification():
    """Send verification code to email"""
    if db is None:  # Fixed comparison
        return jsonify({"error": "Database connection is not available"}), 500
        
    data = request.get_json()
    email = data.get("email", "").lower()

    if not email:
        return jsonify({"success": False, "message": "Email is required"}), 400

    try:
        # Check if user exists
        user = db.users.find_one({"email": email})
        
        if not user:
            return jsonify({"success": False, "message": "Email not registered"}), 404
        
        # Generate verification code
        code = generate_verification_code()
        expires_at = datetime.now() + timedelta(minutes=10)
        
        # Delete any existing verifications for this email
        db.verifications.delete_many({"email": email})
        
        # Store verification code
        verification = {
            "email": email,
            "code": code,
            "created_at": datetime.now(),
            "expires_at": expires_at
        }
        
        db.verifications.insert_one(verification)
        
        logger.info(f"Verification code sent to {email}: {code}")
        
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
    except Exception as e:
        logger.error(f"Send verification error: {str(e)}")
        return jsonify({"success": False, "message": f"An error occurred while sending verification: {str(e)}"}), 500

@app.route("/api/chats", methods=["GET"])
def get_chats():
    """Get all chats for a user"""
    if db is None:  # Fixed comparison
        return jsonify({"error": "Database connection is not available"}), 500
        
    user_id = request.args.get("userId", "")

    if not user_id:
        return jsonify({"success": False, "message": "User ID is required"}), 400

    try:
        # Find all chats for the user
        chats_cursor = db.chats.find({"user_id": user_id}).sort("updated_at", -1)
        
        # Convert to the format expected by the frontend
        formatted_chats = {}
        for chat in chats_cursor:
            formatted_messages = []
            for msg in chat.get("messages", []):
                formatted_messages.append({
                    "role": msg["role"],
                    "content": msg["content"],
                    "language": msg.get("language", "en"),
                    "timestamp": msg["timestamp"].isoformat() if isinstance(msg["timestamp"], datetime) else msg["timestamp"]
                })
            
            formatted_chats[chat["_id"]] = {
                "title": chat["title"],
                "messages": formatted_messages
            }
        
        logger.info(f"Retrieved {len(formatted_chats)} chats for user {user_id}")
        
        return jsonify({
            "success": True,
            "chats": formatted_chats
        })
    except Exception as e:
        logger.error(f"Get chats error: {str(e)}")
        return jsonify({"success": False, "message": f"An error occurred while retrieving chats: {str(e)}"}), 500

@app.route("/api/chats", methods=["POST"])
def create_chat():
    """Create a new chat"""
    if db is None:  # Fixed comparison
        return jsonify({"error": "Database connection is not available"}), 500
        
    data = request.get_json()
    user_id = data.get("userId", "")
    chat_id = data.get("chatId", f"chat_{datetime.now().timestamp()}")
    title = data.get("title", "New Chat")

    if not user_id:
        return jsonify({"success": False, "message": "User ID is required"}), 400

    try:
        # Check if chat ID already exists
        existing_chat = db.chats.find_one({"_id": chat_id})
        if existing_chat:
            # Generate a new unique chat ID
            chat_id = f"chat_{datetime.now().timestamp()}_{random.randint(1000, 9999)}"
        
        # Create new chat
        chat = {
            "_id": chat_id,
            "user_id": user_id,
            "title": title,
            "messages": [],
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        
        db.chats.insert_one(chat)
        
        logger.info(f"Created new chat {chat_id} for user {user_id}")
        
        return jsonify({
            "success": True,
            "chatId": chat_id,
            "chat": {
                "title": title,
                "messages": []
            }
        })
    except Exception as e:
        logger.error(f"Create chat error: {str(e)}")
        return jsonify({"success": False, "message": f"An error occurred while creating chat: {str(e)}"}), 500

@app.route("/api/chats/<chat_id>", methods=["PUT"])
def update_chat(chat_id):
    """Update a chat's title"""
    if db is None:  # Fixed comparison
        return jsonify({"error": "Database connection is not available"}), 500
        
    data = request.get_json()
    user_id = data.get("userId", "")
    title = data.get("title", "")

    if not user_id:
        return jsonify({"success": False, "message": "User ID is required"}), 400

    try:
        # Find the chat
        chat = db.chats.find_one({"_id": chat_id, "user_id": user_id})
        
        if not chat:
            return jsonify({"success": False, "message": "Chat not found"}), 404
        
        # Update the title if provided
        if title:
            db.chats.update_one(
                {"_id": chat_id, "user_id": user_id},
                {"$set": {"title": title, "updated_at": datetime.now()}}
            )
            
            logger.info(f"Updated title of chat {chat_id} to '{title}'")
        
        # Get the updated chat
        updated_chat = db.chats.find_one({"_id": chat_id, "user_id": user_id})
        
        # Format messages for response
        formatted_messages = []
        for msg in updated_chat.get("messages", []):
            formatted_messages.append({
                "role": msg["role"],
                "content": msg["content"],
                "language": msg.get("language", "en"),
                "timestamp": msg["timestamp"].isoformat() if isinstance(msg["timestamp"], datetime) else msg["timestamp"]
            })
        
        return jsonify({
            "success": True,
            "chat": {
                "title": updated_chat["title"],
                "messages": formatted_messages
            }
        })
    except Exception as e:
        logger.error(f"Update chat error: {str(e)}")
        return jsonify({"success": False, "message": f"An error occurred while updating chat: {str(e)}"}), 500

@app.route("/api/chats/<chat_id>", methods=["DELETE"])
def delete_chat(chat_id):
    """Delete a chat"""
    if db is None:  # Fixed comparison
        return jsonify({"error": "Database connection is not available"}), 500
        
    user_id = request.args.get("userId", "")

    if not user_id:
        return jsonify({"success": False, "message": "User ID is required"}), 400

    try:
        # Find and delete the chat
        result = db.chats.delete_one({"_id": chat_id, "user_id": user_id})
        
        if result.deleted_count == 0:
            return jsonify({"success": False, "message": "Chat not found"}), 404
        
        logger.info(f"Deleted chat {chat_id} for user {user_id}")
        
        return jsonify({
            "success": True,
            "message": "Chat deleted successfully"
        })
    except Exception as e:
        logger.error(f"Delete chat error: {str(e)}")
        return jsonify({"success": False, "message": f"An error occurred while deleting chat: {str(e)}"}), 500

@app.route("/api/speech-to-text", methods=["POST"])
def speech_to_text():
    """Convert speech to text"""
    if not speech_recognition_available:
        return jsonify({"error": "Speech recognition is not available on the server"}), 503

    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
        
    audio_file = request.files['audio']
    if not audio_file.filename:
        return jsonify({"error": "Empty audio file"}), 400
        
    preferred_lang = request.form.get('language', '').lower()

    logger.info(f"Received audio file: {audio_file.filename}, size: {audio_file.content_length} bytes")

    try:
        # Create temp directory if it doesn't exist with proper permissions
        create_directory_with_permissions("temp")
        
        # Save the audio file temporarily with a unique name
        temp_filename = f"temp_audio_{datetime.now().timestamp()}_{random.randint(1000, 9999)}.wav"
        temp_path = os.path.join("temp", temp_filename)
        audio_file.save(temp_path)
        
        logger.info(f"Saved audio file to: {temp_path}")

        with sr.AudioFile(temp_path) as source:
            logger.info("Attempting to recognize speech...")
            audio_data = recognizer.record(source)

            # If preferred language is specified, try that first
            if preferred_lang and preferred_lang in SPEECH_LANGUAGES:
                try:
                    text = recognizer.recognize_google(audio_data, language=preferred_lang)
                    if text:
                        logger.info(f"Detected language: {preferred_lang}, text: {text}")
                        return jsonify({
                            "text": text,
                            "language": preferred_lang
                        })
                except Exception as e:
                    logger.warning(f"Recognition failed for preferred language {preferred_lang}: {str(e)}")

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
                        logger.info(f"Detected language: kn, text: {text}")
                except Exception as e:
                    logger.warning(f"Recognition failed for Kannada: {str(e)}")

            if not detected_text:
                for lang in SPEECH_LANGUAGES:
                    if lang == "kn":  # Already tried
                        continue
                    try:
                        text = recognizer.recognize_google(audio_data, language=lang)
                        if text:
                            detected_text = text
                            detected_lang = lang
                            logger.info(f"Detected language: {lang}, text: {text}")
                            break
                    except Exception as e:
                        logger.warning(f"Recognition failed for language {lang}: {str(e)}")

            if detected_text:
                return jsonify({
                    "text": detected_text,
                    "language": detected_lang
                })

            logger.warning("Could not recognize speech in any supported language")
            return jsonify({"error": "Could not recognize speech"}), 400
    except Exception as e:
        logger.error(f"Speech recognition error: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        # Clean up temp file
        try:
            if os.path.exists(temp_path):
                os.remove(temp_path)
                logger.info(f"Removed temporary file: {temp_path}")
        except Exception as cleanup_error:
            logger.warning(f"Failed to remove temporary file: {str(cleanup_error)}")

@app.route("/api/text-to-speech", methods=["POST"])
def text_to_speech_endpoint():
    """Convert text to speech"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON data"}), 400
            
        text = data.get("text", "")
        language = data.get("language", "en")
    
        if not text:
            return jsonify({"error": "No text provided"}), 400
    
        # Limit text length for performance reasons
        if len(text) > 5000:
            text = text[:5000]
            logger.warning(f"Text truncated to 5000 characters")
    
        # Check if language is supported
        if language not in TTS_LANGUAGES:
            logger.warning(f"Language {language} not supported, falling back to English")
            language = "en"
    
        logger.info(f"Converting text to speech in {language}. Text length: {len(text)} characters")
        
        audio_path = text_to_speech(text, language)
        if audio_path:
            logger.info(f"Successfully generated speech, sending file: {audio_path}")
            return send_from_directory(os.path.dirname(audio_path), os.path.basename(audio_path))
        
        logger.error("Failed to generate speech audio")
        return jsonify({"error": "Could not generate speech"}), 500
    except Exception as e:
        logger.error(f"Text-to-speech error: {str(e)}")
        return jsonify({"error": f"An error occurred during speech synthesis: {str(e)}"}), 500

@app.route("/api/summarize-pdf", methods=["POST"])
def summarize_pdf():
    """Endpoint to summarize uploaded PDF file and store content"""
    if db is None:
        return jsonify({"success": False, "message": "Database connection is not available"}), 500

    # PDF functionality is always available now with our fallbacks
    # so we don't check pdf_support anymore

    if 'pdf' not in request.files:
        return jsonify({"success": False, "message": "No PDF file provided"}), 400

    pdf_file = request.files['pdf']

    if pdf_file.filename == '':
        return jsonify({"success": False, "message": "Empty PDF file"}), 400

    try:
        # Create temp directory if it doesn't exist with proper permissions
        create_directory_with_permissions("temp")
        
        # Save the PDF to a temporary file
        temp_pdf_name = f"temp_pdf_{datetime.now().timestamp()}_{random.randint(1000, 9999)}.pdf"
        temp_pdf_path = os.path.join("temp", temp_pdf_name)
        pdf_file.save(temp_pdf_path)
        
        logger.info(f"Saved temporary PDF file to {temp_pdf_path}")
        
        # Extract text from PDF using our multi-method function
        try:
            full_text = extract_text_from_pdf(temp_pdf_path)
            if not full_text or not full_text.strip():
                return jsonify({"success": False, "message": "Could not extract any text from the PDF. The file might be empty, encrypted, or contains only images."}), 400
                
            logger.info(f"Extracted {len(full_text)} characters from PDF")
        except Exception as pdf_error:
            logger.error(f"Error extracting text from PDF: {str(pdf_error)}")
            return jsonify({"success": False, "message": f"Failed to extract text from PDF: {str(pdf_error)}"}), 500
        finally:
            # Clean up temporary file
            try:
                if os.path.exists(temp_pdf_path):
                    os.remove(temp_pdf_path)
                    logger.info(f"Removed temporary file: {temp_pdf_path}")
            except Exception as cleanup_error:
                logger.warning(f"Failed to remove temporary file: {str(cleanup_error)}")

        # Initialize pdf_contents collection if it doesn't exist
        if "pdf_contents" not in db.list_collection_names():
            db.create_collection("pdf_contents")
            logger.info("Created pdf_contents collection")
        
        # Store extracted text in MongoDB collection 'pdf_contents'
        # Limit text length to avoid MongoDB document size limits
        max_text_length = 500000  # MongoDB documents have a 16MB limit
        truncated_text = full_text[:max_text_length] if len(full_text) > max_text_length else full_text
        
        pdf_content_doc = {
            "content": truncated_text,
            "uploaded_at": datetime.utcnow()
        }
        result = db.pdf_contents.insert_one(pdf_content_doc)
        pdf_content_id = str(result.inserted_id)

        # Use Groq API to summarize the extracted text
        # Limit prompt size to avoid token limits
        max_prompt_size = 4000
        text_to_summarize = truncated_text[:max_prompt_size] if len(truncated_text) > max_prompt_size else truncated_text
        
        try:
            prompt = f"Summarize the following text in a clear and concise way:\n\n{text_to_summarize}"
            
            summary = groq_client.chat.completions.create(
                model="llama3-8b-8192",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.5,
                max_tokens=512,
                top_p=1,
                frequency_penalty=0,
                presence_penalty=0,
                stop=None,
            ).choices[0].message.content
            
            logger.info(f"Generated summary of length {len(summary)}")
        except Exception as api_error:
            logger.error(f"Error calling Groq API: {str(api_error)}")
            summary = "Failed to generate summary. You can still ask questions about the document below."

        return jsonify({
            "success": True, 
            "summary": summary, 
            "pdfContentId": pdf_content_id
        })

    except Exception as e:
        logger.error(f"Error summarizing PDF: {str(e)}")
        return jsonify({
            "success": False, 
            "message": f"Failed to process PDF: {str(e)}"
        }), 500

@app.route("/api/ask-pdf-question", methods=["POST"])
def ask_pdf_question():
    """Endpoint to ask questions based on uploaded PDF content"""
    if db is None:
        return jsonify({"success": False, "message": "Database connection is not available"}), 500

    data = request.get_json()
    pdf_content_id = data.get("pdfContentId", "")
    question = data.get("question", "")

    if not pdf_content_id or not question:
        return jsonify({"success": False, "message": "Missing pdfContentId or question"}), 400

    try:
        # Retrieve PDF content from MongoDB
        try:
            pdf_doc = db.pdf_contents.find_one({"_id": ObjectId(pdf_content_id)})
        except Exception as db_error:
            logger.error(f"Error retrieving PDF content: {str(db_error)}")
            return jsonify({"success": False, "message": "Invalid PDF content ID"}), 400

        if not pdf_doc:
            return jsonify({"success": False, "message": "PDF content not found"}), 404

        pdf_text = pdf_doc.get("content", "")

        if not pdf_text.strip():
            return jsonify({"success": False, "message": "Stored PDF content is empty"}), 400

        # Use Groq API to answer the question based on PDF content
        # Limit context size to avoid token limits
        max_context_size = 4000
        truncated_text = pdf_text[:max_context_size] if len(pdf_text) > max_context_size else pdf_text
        
        try:
            prompt = f"Based on the following document text, answer the question. If the answer cannot be found in the text, say so clearly:\n\nDocument:\n{truncated_text}\n\nQuestion:\n{question}"

            answer = groq_client.chat.completions.create(
                model="llama3-8b-8192",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.5,
                max_tokens=512,
                top_p=1,
                frequency_penalty=0,
                presence_penalty=0,
                stop=None,
            ).choices[0].message.content
        except Exception as api_error:
            logger.error(f"Error calling Groq API: {str(api_error)}")
            answer = "I'm sorry, I encountered an error processing your question. Please try again later."

        return jsonify({"success": True, "answer": answer})

    except Exception as e:
        logger.error(f"Error answering PDF question: {str(e)}")
        return jsonify({"success": False, "message": f"Failed to answer question: {str(e)}"}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({"error": "Method not allowed"}), 405

@app.errorhandler(500)
def internal_server_error(error):
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({"error": f"Internal server error: {str(error)}"}), 500

if __name__ == "__main__":
    # Define the port for the server
    port = int(os.environ.get("PORT", 5000))
    
    if db is None:
        logger.critical("MongoDB connection failed. Application may not function correctly.")
        
    try:
        from waitress import serve
        logger.info(f"Starting server with Waitress at {datetime.now().isoformat()} on port {port}")
        serve(app, host="0.0.0.0", port=port)
    except ImportError:
        logger.warning("Waitress not found, using Flask development server instead")
        app.run(host="0.0.0.0", port=port, debug=False)
    except Exception as e:
        logger.critical(f"Failed to start server: {str(e)}")
        print(f"Fatal error: {str(e)}")
