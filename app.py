import os
import threading
import time
from collections import defaultdict, deque

from flask import Flask, jsonify, render_template, request
from werkzeug.middleware.proxy_fix import ProxyFix

from tutor import TutorError, get_tutor_response

MAX_MESSAGE_LEN = 500  # 한 번에 보낼 수 있는 글자 수

# 공개 배포 시 API 사용량 보호 — IP당 1분에 보낼 수 있는 요청 수
RATE_LIMIT = int(os.getenv("RATE_LIMIT_PER_MIN", 15))
_requests = defaultdict(deque)
_lock = threading.Lock()

app = Flask(__name__)
# 호스팅 서비스의 프록시 뒤에서도 실제 접속자 IP를 얻기 위함
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1)


def is_rate_limited(ip):
    now = time.monotonic()
    with _lock:
        recent = _requests[ip]
        while recent and now - recent[0] > 60:
            recent.popleft()
        if len(recent) >= RATE_LIMIT:
            return True
        recent.append(now)
        return False


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
    if len(message) > MAX_MESSAGE_LEN:
        return jsonify(error=f"메시지는 {MAX_MESSAGE_LEN}자 이내로 입력해 주세요."), 400
    if not isinstance(history, list):
        history = []
    if is_rate_limited(request.remote_addr):
        return jsonify(error="요청이 너무 많아요. 잠시 후 다시 시도해 주세요."), 429

    try:
        return jsonify(get_tutor_response(message, history))
    except TutorError as e:
        return jsonify(error=str(e)), 502
    except Exception:
        app.logger.exception("튜터 응답 생성 실패")
        return jsonify(error="응답을 만들지 못했어요. 잠시 후 다시 시도해 주세요."), 500


if __name__ == "__main__":
    app.run(debug=True, port=int(os.getenv("PORT", 5000)))
