import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "@phosphor-icons/react";
import { useAuth } from "../contexts/AuthContext";

/**
 * /signup - 목업 없음. 기존 구조(중앙 정렬 폼 + 중복확인 버튼) 유지 + 토큰 재스킨.
 * - 구 Header 제거 -> 상단 뒤로가기(work-detail 관례) + 중앙 폼.
 * - body overflow 잠금 이펙트 제거 - 셸 스크롤에 맡긴다.
 * - 중복확인은 기존 로직 그대로(로컬 검증 + alert 예시) - 플로우 재설계는 스코프 외.
 */

const inputClass =
  "w-full rounded-input border border-line bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-3 transition-colors focus:border-line-strong";

const labelClass = "text-sm font-semibold text-ink";

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [usernameChecked, setUsernameChecked] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
    setUsernameChecked(false); // 입력 변경 시 중복확인 초기화
  };

  const handleUsernameCheck = () => {
    // 여기에 실제 중복검사 API 연결 가능
    if (formData.username.trim() === "") {
      setError("아이디를 입력해주세요.");
      return;
    }
    setUsernameChecked(true);
    setError("");
    alert("사용 가능한 아이디입니다."); // 예시
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!usernameChecked) {
      setError("아이디 중복확인을 해주세요.");
      return;
    }

    if (formData.password !== formData.passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (formData.password.length < 4) {
      setError("비밀번호는 최소 4자 이상이어야 합니다.");
      return;
    }

    setLoading(true);

    try {
      await signup(formData.username, formData.email, formData.password);
      alert("회원가입이 완료되었습니다. 로그인해주세요.");
      navigate("/login");
    } catch (err: any) {
      setError(err.message || "회원가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const isFormComplete =
    formData.username &&
    formData.email &&
    formData.password &&
    formData.passwordConfirm;

  return (
    <div className="mx-auto max-w-[1200px] px-6 pb-20 pt-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="-ml-2.5 inline-flex items-center gap-1.5 rounded-input px-2.5 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink"
      >
        <ArrowLeft size={16} />
        뒤로 가기
      </button>

      <div className="mx-auto mt-10 w-full max-w-[400px] rounded-panel border border-line bg-surface px-7 py-8 shadow-card">
        <h1 className="text-[22px] font-extrabold tracking-[-0.02em] text-ink">
          회원가입
        </h1>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-input border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-sm text-danger"
          >
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          {/* 아이디 + 중복확인 */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="signup-username" className={labelClass}>
              아이디 *
            </label>
            <div className="flex gap-2">
              <input
                id="signup-username"
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="아이디를 입력하세요"
                autoComplete="username"
                required
                className={`flex-1 ${inputClass}`}
              />
              <button
                type="button"
                onClick={handleUsernameCheck}
                className="shrink-0 rounded-input border border-line bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:border-line-strong active:scale-[0.98]"
              >
                중복확인
              </button>
            </div>
          </div>

          {/* 이메일 */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="signup-email" className={labelClass}>
              이메일 *
            </label>
            <input
              id="signup-email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="example@gmail.com"
              autoComplete="email"
              required
              className={inputClass}
            />
          </div>

          {/* 비밀번호 */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="signup-password" className={labelClass}>
              비밀번호 *
            </label>
            <input
              id="signup-password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="비밀번호를 입력하세요"
              autoComplete="new-password"
              required
              className={inputClass}
            />
          </div>

          {/* 비밀번호 확인 */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="signup-password-confirm" className={labelClass}>
              비밀번호 확인 *
            </label>
            <input
              id="signup-password-confirm"
              type="password"
              name="passwordConfirm"
              value={formData.passwordConfirm}
              onChange={handleChange}
              placeholder="비밀번호를 다시 입력하세요"
              autoComplete="new-password"
              required
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={!isFormComplete || loading}
            className="mt-2 rounded-full bg-accent-ink py-3 text-[15px] font-semibold text-surface transition-colors hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "가입 중..." : "회원가입"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-2">
          이미 계정이 있으신가요?{" "}
          <Link
            to="/login"
            className="font-semibold text-accent-ink hover:underline"
          >
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
