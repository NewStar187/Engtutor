# AI English Buddy: Claude 기반 실시간 영어 교정 튜터

> **사용자의 영어 문장을 분석하여 문법을 교정하고, 학습한 내용을 바탕으로 자연스러운 회화를 이어가는 지능형 학습 도우미.**

---

## 프로젝트 소개 (Project Overview)
이 프로젝트는 **Anthropic Claude API**를 활용하여 독학 영어 학습자를 위해 개발되었습니다. 
단순한 챗봇을 넘어, 사용자가 입력한 문장의 오류를 한국어로 설명해주는 **[Correction]** 기능과 실전 회화 감각을 익힐 수 있는 **[Reply]** 기능을 결합한 학습 환경을 제공합니다.


---

## 핵심 기능 (Key Features)
- **실시간 문법 및 표현 교정:** 입력된 문장의 문법적 오류나 부자연스러운 표현을 탐지하여 한국어 해설을 제공합니다.
- **맥락 유지형 대화 생성:** 사용자의 입력을 바탕으로 튜터가 적절한 답변을 영어로 생성하여 지속적인 회화 연습을 유도합니다.

---

## 🛠 기술 스택 (Tech Stack)
- **Language:** Python 3.10+
- **AI Engine:** Anthropic Claude API (`claude-sonnet-5-5`)
- **Libraries:**
  - `anthropic`: Claude 공식 Python SDK
  - `python-dotenv`: 환경 변수 보안 관리
  - `flask`: 웹 UI 서버
- **Frontend:** HTML / CSS / Vanilla JS (빌드 도구 없음)

---

## 실행 방법 (Getting Started)

```bash
pip install -r requirements.txt
```

> 🔑 **API 키:** 처음 실행하면 키를 붙여넣으라고 물어보고, 프로젝트 폴더에 `.env` 파일을 자동으로 만들어 줍니다.
> 키를 바꾸려면 `.env` 파일을 수정하거나 지우고 다시 실행하세요. (`.env`는 보안상 GitHub에 올라가지 않으며, 점(.)으로 시작해서 탐색기에서 숨김 파일로 보일 수 있습니다.)

**웹 버전 (추천)**

```bash
python app.py
```

브라우저에서 http://localhost:5000 을 열면 됩니다.

- 교정 카드: 원문(취소선) → 고친 문장, 한국어 해설을 한눈에 확인
- 튜터 답장 🔊 버튼으로 영어 발음 듣기 (브라우저 TTS)
- 🎤 음성 입력 (Chrome 등 Web Speech API 지원 브라우저)
- 이전 대화 맥락을 기억하며 대화를 이어가고, 새로고침해도 대화가 유지됨
- 세션 통계(보낸 문장 수, 자연스러운 문장 비율), 다크 모드·모바일 지원

**터미널 버전**

```bash
python Engtutor.py
```
 
---

## Example

==================================================
✅ English Buddy 연결 성공!
   대화를 시작하세요. 종료하려면 'exit'를 입력하세요.
==================================================

You: Hi! how are you?
Tutor is thinking... 🤔

----------------------------------------
Tutor:
1. [Correction]: 거의 완벽해요! 문장의 첫 글자는 대문자로 시작하는 습관을 들이면 더 좋아요. 'how'를 'How'로 바꿔주세요. (It's almost perfect! It's even better if you get into the habit of starting a sentence with a capital letter. Please change 'how' to 'How'.)

2. [Reply]: I'm doing great, thanks for asking! It's nice to meet you. How about you? How's your day going?
----------------------------------------

You: exit

👋 Bye! 다음에 또 만나요!

---

## 🌐 웹에 배포해서 링크로 공유하기 (Render)

1. https://render.com 에 GitHub 계정으로 가입합니다.
2. **New → Blueprint** 를 선택하고 이 저장소를 연결합니다. (`render.yaml` 설정이 자동으로 적용됩니다)
3. `ANTHROPIC_API_KEY` 입력란에 API 키를 넣고 배포합니다.
4. 몇 분 뒤 `https://english-buddy-xxxx.onrender.com` 같은 주소가 생기고, 이 링크를 공유하면 누구나 사용할 수 있습니다.

> ⚠️ 모든 사용자의 요청이 **내 API 키로 과금**됩니다. 남용을 막기 위해 IP당 1분 15회(`RATE_LIMIT_PER_MIN`), 메시지 500자 제한이 걸려 있습니다. [Anthropic Console](https://console.anthropic.com)에서 월 사용 한도(spend limit)도 꼭 설정하세요.
>
> 무료 플랜은 15분간 접속이 없으면 서버가 잠들어서, 다음 첫 접속은 30초~1분 정도 걸릴 수 있습니다.
