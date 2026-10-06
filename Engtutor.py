from tutor import TutorError, get_tutor_response


def main():
    print("\n" + "="*50)
    print(f"✅ English Buddy 연결 성공!")
    print("   대화를 시작하세요. 종료하려면 'exit'를 입력하세요.")
    print("="*50)

    history = []
    while True:
        user_text = input("\nYou: ").strip()

        if user_text.lower() in ['exit', 'quit', '종료']:
            print("\n👋 Bye! 다음에 또 만나요!")
            break

        if not user_text:
            continue

        print("Tutor is thinking... 🤔")
        try:
            result = get_tutor_response(user_text, history)
        except TutorError as e:
            print(f"응답 생성 중 오류: {e}")
            continue

        correction = result["explanation"]
        if not result["is_natural"]:
            correction = f"{result['corrected']}\n   {correction}"

        print("\n" + "-"*40)
        print("Tutor:")
        print(f"1. [Correction]: {correction}")
        print(f"\n2. [Reply]: {result['reply']}")
        print("-"*40)

        history += [{"role": "user", "text": user_text},
                    {"role": "tutor", "text": result["reply"]}]


if __name__ == "__main__":
    main()
