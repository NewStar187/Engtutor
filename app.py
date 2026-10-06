import json
import os

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request
from google import genai

# 1. 환경 변수 로드
load_dotenv(override=True)

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise SystemExit("❌ .env 파일에서 GEMINI_API_KEY를 확인하세요.")

client = genai.Client(api_key=api_key)
MODEL_ID = os.getenv("GEMINI_MODEL", "gemini-2.5-pro")

# 2. 튜터 프롬프트 — 웹 화면에서 교정/답변을 따로 보여주기 위해 JSON으로 응답받음
SYSTEM_INSTRUCTION = (
    "You are a friendly English tutor for Korean learners.\n"
    "For the user's latest message:\n"
    "- is_natural: true if the sentence is grammatically correct and natural.\n"
    "- corrected: the corrected, natural version of the user's sentence "
    "(same as the original if nothing needs to change).\n"
    "- explanation: explain the errors or better expressions in Korean. "
    "If the sentence is already natural, praise it briefly in Korean.\n"
    "- reply: continue the conversation naturally in English, keeping the "
    "earlier context in mind. End with a question to keep the chat going."
)

RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "is_natural": {"type": "BOOLEAN"},
        "corrected": {"type": "STRING"},
        "explanation": {"type": "STRING"},
        "reply": {"type": "STRING"},
    },
    "required": ["is_natural", "corrected", "explanation", "reply"],
}

MAX_HISTORY = 20  # 맥락 유지용으로 보내는 최근 메시지 수

app = Flask(__name__)


def build_contents(history, message):
    """프론트엔드에서 받은 대화 기록을 Gemini contents 형식으로 변환"""
    contents = []
    for turn in history[-MAX_HISTORY:]:
        role = "model" if turn.get("role") == "tutor" else "user"
        text = str(turn.get("text", "")).strip()
        if text:
            contents.append({"role": role, "parts": [{"text": text}]})
    contents.append({"role": "user", "parts": [{"text": message}]})
    return contents


def get_tutor_response(message, history):
    response = client.models.generate_content(
        model=MODEL_ID,
        contents=build_contents(history, message),
        config={
            "system_instruction": SYSTEM_INSTRUCTION,
            "response_mime_type": "application/json",
            "response_schema": RESPONSE_SCHEMA,
        },
    )
    return json.loads(response.text)


@app.get("/")
def index():
    return render_template("index.html")


@app.post("/api/chat")
def chat():
    data = request.get_json(silent=True) or {}
    message = str(data.get("message", "")).strip()
    history = data.get("history") or []

    if not message:
        return jsonify(error="메시지를 입력해 주세요."), 400
    if not isinstance(history, list):
        history = []

    try:
        return jsonify(get_tutor_response(message, history))
    except Exception as e:
        return jsonify(error=f"응답 생성 중 오류: {e}"), 500


if __name__ == "__main__":
    app.run(debug=True, port=int(os.getenv("PORT", 5000)))
