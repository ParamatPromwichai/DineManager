from flask import Flask, request, jsonify
from flask_cors import CORS
from chatbot import get_response

app = Flask(__name__)
CORS(app)

@app.route("/chat", methods=["POST"])
def chat():
    data = request.json
    msg = data.get("message", "")
    user_id = data.get("user_id", 0)  # 🔥 default กันพัง

    reply = get_response(msg, user_id)

    return jsonify({"reply": reply})

if __name__ == "__main__":
    app.run(port=5001, debug=True)