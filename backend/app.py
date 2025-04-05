import os
import requests
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS

load_dotenv()

app = Flask(__name__)
CORS(app)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama3-70b-8192"

@app.route("/")
def home():
    return "Groq AI backend working!"

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_message = data.get("message", "")

    try:
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": MODEL,
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

if __name__ == "__main__":
    app.run(debug=True)
