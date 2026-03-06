import os
from google import genai
from dotenv import load_dotenv

# 1. 환경 변수 로드
load_dotenv(override=True)

# 2. API 키 확인
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("❌ .env 파일에서 GEMINI_API_KEY를 확인하세요.")
    exit()

# 3. 최신 Google GenAI 클라이언트 설정
client = genai.Client(api_key=api_key)
MODEL_ID = "gemini-2.5-pro" # 사용하는 모델명

def get_tutor_response(user_input):
    """
    구글 최신 방식을 사용하여 영어 교정 및 답변 생성
    """
    system_instruction = (
        "You are a friendly English tutor. Format your response:\n"
        "1. [Correction]: Explain errors in Korean or say 'Great! Your sentence is natural.'\n"
        "2. [Reply]: Continue the conversation in English."
    )

    try:
        # 모델 호출 (generate_content)
        response = client.models.generate_content(
            model=MODEL_ID,
            config={'system_instruction': system_instruction},
            contents=user_input
        )
        return response.text
    except Exception as e:
        return f"응답 생성 중 오류: {e}"

def main():
    print("\n" + "="*50)
    print(f"✅ English Buddy 연결 성공!")
    print("   대화를 시작하세요. 종료하려면 'exit'를 입력하세요.")
    print("="*50)
    
    while True:
        user_text = input("\nYou: ").strip()
        
        if user_text.lower() in ['exit', 'quit', '종료']:
            print("\n👋 Bye! 다음에 또 만나요!")
            break
            
        if not user_text:
            continue

        print("Tutor is thinking... 🤔")
        result = get_tutor_response(user_text)
        
        print("\n" + "-"*40)
        print(f"Tutor:\n{result}")
        print("-"*40)

if __name__ == "__main__":
    main()