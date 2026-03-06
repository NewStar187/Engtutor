# AI English Buddy: Gemini 기반 실시간 영어 교정 튜터

> **사용자의 영어 문장을 분석하여 문법을 교정하고, 학습한 내용을 바탕으로 자연스러운 회화를 이어가는 지능형 학습 도우미.**

---

## 프로젝트 소개 (Project Overview)
이 프로젝트는 **Google Gemini API**를 활용하여 독학 영어 학습자를 위해 개발되었습니다. 
단순한 챗봇을 넘어, 사용자가 입력한 문장의 오류를 한국어로 설명해주는 **[Correction]** 기능과 실전 회화 감각을 익힐 수 있는 **[Reply]** 기능을 결합한 학습 환경을 제공합니다.


---

## 핵심 기능 (Key Features)
- **실시간 문법 및 표현 교정:** 입력된 문장의 문법적 오류나 부자연스러운 표현을 탐지하여 한국어 해설을 제공합니다.
- **맥락 유지형 대화 생성:** 사용자의 입력을 바탕으로 튜터가 적절한 답변을 영어로 생성하여 지속적인 회화 연습을 유도합니다.

---

## 🛠 기술 스택 (Tech Stack)
- **Language:** Python 3.10+
- **AI Engine:** Google Gemini API (`gemini-2.5-pro`)
- **Libraries:** - `google-genai`: 최신 Google 생성형 AI SDK
  - `python-dotenv`: 환경 변수 보안 관리
 
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

## 🚀 시작하기 (Getting Started)

### 1. 필수 라이브러리 설치
```bash
pip install google-genai python-dotenv
