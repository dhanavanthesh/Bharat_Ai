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

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__, static_folder='../frontend/build', static_url_path='')
CORS(app)

# Initialize Groq client
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Initialize Pygame mixer
pygame.mixer.init()

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
microphone = sr.Microphone()

# Model mapping
MODEL_MAPPING = {
    "LLaMA3-versatile": "llama-3.3-70b-versatile",
    "LLaMA3": "llama3-70b-8192",
    "LLaMA2": "llama2-70b-4096"
}

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
        "mr": "माफ करा, मला एक समस्या आली. कृपया पुन्हा प्रयत्न करा.",
        "bn": "দুঃখিত, আমি একটি সমস্যার সম্মুখীন হয়েছি। অনুগ্রহ করে আবার চেষ্টা করুন।",
        "gu": "માફ કરશો, મને એક સમસ્યા આવી. કૃપા કરીને ફરી પ્રયાસ કરો.",
        "pa": "ਮਾਫ਼ ਕਰਨਾ, ਮੈਨੂੰ ਇੱਕ ਸਮੱਸਿਆ ਆਈ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",
        "or": "କ୍ଷମା କରିବେ, ମୁଁ ଏକ ସମସ୍ୟାର ସମ୍ମୁଖୀନ ହୋଇଛି। ଦୟାକରି ପୁନର୍ବାର ଚେଷ୍ଟା କରନ୍ତୁ।"
    }
    return messages.get(language, messages["en"])

# Languages supported for speech recognition (using Google's language codes)
SPEECH_LANGUAGES = [
    "en-US",  # English (United States)
    "hi-IN",  # Hindi (India)
    "kn-IN",  # Kannada (India)
    "ta-IN",  # Tamil (India)
    "te-IN",  # Telugu (India)
    "mr-IN",  # Marathi (India)
    "bn-IN",  # Bengali (India)
    "gu-IN",  # Gujarati (India)
    "pa-IN",  # Punjabi (India)
    "or-IN"   # Odia (India)
]

def process_audio(audio_data, language="en-US"):
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
TTS_LANGUAGES = [
    "en", "hi", "kn", "ta", "te",
    "mr", "bn", "gu", "pa", "or"
]

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

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_message = data.get("message", "")
    model_name = data.get("model", "LLaMA3")
    language = data.get("language", "")
    
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
        return jsonify({"reply": response})
    except Exception as e:
        print("Groq error:", e)
        return jsonify({"reply": get_error_message(language)}), 500

@app.route("/api/speech-to-text", methods=["POST"])
def speech_to_text():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
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
            if preferred_lang:
                # Map preferred language to Google's language code
                lang_map = {
                    "en": "en-US",
                    "hi": "hi-IN",
                    "kn": "kn-IN",
                    "ta": "ta-IN",
                    "te": "te-IN",
                    "mr": "mr-IN",
                    "bn": "bn-IN",
                    "gu": "gu-IN",
                    "pa": "pa-IN",
                    "or": "or-IN"
                }
                google_lang = lang_map.get(preferred_lang)
                
                if google_lang and google_lang in SPEECH_LANGUAGES:
                    try:
                        text = recognizer.recognize_google(audio_data, language=google_lang)
                        if text:
                            print(f"Detected language: {preferred_lang}, text: {text}")
                            return jsonify({
                                "text": text,
                                "language": preferred_lang  # Return the simple code
                            })
                    except Exception as e:
                        print(f"Recognition failed for preferred language {preferred_lang}: {str(e)}")
            
            # Fallback to trying all supported languages
            detected_text = None
            detected_lang = "en"  # default fallback
            
            # Try Kannada first if not already tried
            if preferred_lang != "kn" and "kn-IN" in SPEECH_LANGUAGES:
                try:
                    text = recognizer.recognize_google(audio_data, language="kn-IN")
                    if text:
                        detected_text = text
                        detected_lang = "kn"  # Return simple code
                        print(f"Detected language: kn, text: {text}")
                except:
                    pass
            
            if not detected_text:
                # Try all supported languages with their Google codes
                lang_pairs = [
                    ("en", "en-US"),
                    ("hi", "hi-IN"),
                    ("kn", "kn-IN"),
                    ("ta", "ta-IN"),
                    ("te", "te-IN"),
                    ("mr", "mr-IN"),
                    ("bn", "bn-IN"),
                    ("gu", "gu-IN"),
                    ("pa", "pa-IN"),
                    ("or", "or-IN")
                ]
                
                for simple_lang, google_lang in lang_pairs:
                    if google_lang == "kn-IN":  # Already tried
                        continue
                    try:
                        text = recognizer.recognize_google(audio_data, language=google_lang)
                        if text:
                            detected_text = text
                            detected_lang = simple_lang  # Return simple code
                            print(f"Detected language: {simple_lang}, text: {text}")
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

# Mock authentication APIs
@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")
    
    if email and password:
        return jsonify({
            "success": True,
            "user": {
                "id": "user123",
                "email": email,
                "name": email.split('@')[0]
            }
        })
    return jsonify({"success": False, "message": "Invalid credentials"}), 401

@app.route("/api/signup", methods=["POST"])
def signup():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")
    
    if email and password and '@' in email:
        return jsonify({
            "success": True,
            "user": {
                "id": "user123",
                "email": email,
                "name": email.split('@')[0]
            }
        })
    return jsonify({"success": False, "message": "Invalid signup data"}), 400

if __name__ == "__main__":
    app.run(debug=True, port=5000)