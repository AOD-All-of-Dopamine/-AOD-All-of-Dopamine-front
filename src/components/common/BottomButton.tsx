/**
 * 하단 고정 액션 바 - 리뷰 작성·온보딩의 모바일 앱형 저장 버튼.
 * 라이트 토큰 재스킨: surface 바 + 상단 라인, primary=accent pill / secondary=surface pill.
 * (구 purple/grey variant 명칭은 다크 팔레트 잔재라 primary/secondary로 교체)
 */
interface BottomButtonProps {
  buttons: {
    text: string;
    onClick: () => void;
    variant?: "primary" | "secondary";
    disabled?: boolean;
  }[];
}

const BottomButton = ({ buttons }: BottomButtonProps) => {
  const getButtonStyle = (variant = "secondary", disabled?: boolean) => {
    if (disabled) return "bg-line text-ink-3 cursor-not-allowed";

    switch (variant) {
      case "primary":
        return "bg-accent-ink text-surface hover:opacity-90 active:scale-[0.98]";
      case "secondary":
      default:
        return "border border-line bg-surface text-ink hover:border-line-strong active:scale-[0.98]";
    }
  };

  return (
    <div className="flex h-[70px] items-center justify-center gap-2 border-t border-line bg-surface/95 px-6 backdrop-blur-md">
      {buttons.map(({ text, onClick, variant, disabled }, idx) => (
        <button
          type="button"
          key={idx}
          onClick={onClick}
          disabled={disabled}
          className={`w-full rounded-full px-4 py-3 text-[15px] font-semibold transition-colors ${getButtonStyle(variant, disabled)}`}
        >
          {text}
        </button>
      ))}
    </div>
  );
};

export default BottomButton;
