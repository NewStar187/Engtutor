import json
import os

import anthropic
from dotenv import load_dotenv

# 1. 환경 변수 로드
load_dotenv(override=True)

if not os.getenv("ANTHROPIC_API_KEY"):
    raise SystemExit("❌ .env 파일에서 ANTHROPIC_API_KEY를 확인하세요.")

client = anthropic.Anthropic()
MODEL_ID = os.getenv("CLAUDE_MODEL", "claude-sonnet-5-5")

# 2. 튜터 프롬프트 — 교정/답변을 따로 보여주기 위해 JSON으로 응답받음
SYSTEM_PROMPT = (
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
    "type": "object",
    "properties": {
        "is_natural": {"type": "boolean"},
        "corrected": {"type": "string"},
        "explanation": {"type": "string"},
        "reply": {"type": "string"},
    },
    "required": ["is_natural", "corrected", "explanation", "reply"],
    "additionalProperties": False,
}

MAX_HISTORY = 20  # 맥락 유지용으로 보내는 최근 메시지 수


class TutorError(Exception):
    """사용자에게 그대로 보여줄 수 있는 오류"""


def build_messages(history, message):
    """대화 기록({role: user|tutor, text})을 Claude messages 형식으로 변환"""
    messages = []
    for turn in history[-MAX_HISTORY:]:
        role = "assistant" if turn.get("role") == "tutor" else "user"
        text = str(turn.get("text", "")).strip()
        if not text:
            continue
        if not messages and role == "assistant":
            continue  # 첫 메시지는 user여야 함
        messages.append({"role": role, "content": text})
    messages.append({"role": "user", "content": message})
    return messages


def get_tutor_response(message, history=()):
    try:
        response = client.beta.messages.create(
            model=MODEL_ID,
            max_tokens=4000,
            system=SYSTEM_PROMPT,
            messages=build_messages(list(history), message),
            output_config={
                "effort": "low",  # 짧은 대화형 응답이라 빠른 응답 우선
                "format": {"type": "json_schema", "schema": RESPONSE_SCHEMA},
            },
            # 안전 필터로 거절될 경우 서버에서 다른 모델로 자동 재시도
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        )
    except anthropic.AuthenticationError:
        raise TutorError("API 키가 올바르지 않아요. ANTHROPIC_API_KEY를 확인하세요.")
    except anthropic.RateLimitError:
        raise TutorError("요청이 너무 많아요. 잠시 후 다시 시도해 주세요.")
    except anthropic.APIStatusError as e:
        raise TutorError(f"Claude API 오류 ({e.status_code}). 잠시 후 다시 시도해 주세요.")
    except anthropic.APIConnectionError:
        raise TutorError("Claude 서버에 연결하지 못했어요.")

    if response.stop_reason == "refusal":
        raise TutorError("이 문장에는 답변할 수 없어요. 다른 문장으로 시도해 주세요.")
    if response.stop_reason == "max_tokens":
        raise TutorError("답변이 너무 길어져서 끊겼어요. 다시 시도해 주세요.")

    text = next(b.text for b in response.content if b.type == "text")
    return json.loads(text)
