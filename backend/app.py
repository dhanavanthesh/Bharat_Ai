import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
import requests

load_dotenv()

app = Flask(__name__, static_folder='../frontend/build', static_url_path='')
CORS(app)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL_MAPPING = {
    "LLaMA3": "llama3-70b-8192",
    "LLaMA2": "llama2-70b-4096"
}

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

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_message = data.get("message", "")
    model_name = data.get("model", "LLaMA3")
    
    # Map front-end model name to actual API model name
    model = MODEL_MAPPING.get(model_name, MODEL_MAPPING["LLaMA3"])

    try:
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": user_message}
            ],
            "temperature": 0.7
        }

        response = requests.post(GROQ_API_URL, headers=headers, json=payload)
        result = response.json()

        ai_reply = result["choices"][0]["message"]["content"]
        return jsonify({"reply": ai_reply})

    except Exception as e:
        print("Groq error:", e)
        return jsonify({"reply": "Sorry, something went wrong."})

# Mock authentication APIs for demo purposes
# In a real app, you would implement proper auth with tokens
@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")
    
    # Just for demo - in reality would verify credentials
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
    
    # Just for demo - would create user in DB
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