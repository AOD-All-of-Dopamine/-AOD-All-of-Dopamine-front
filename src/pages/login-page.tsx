import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "@phosphor-icons/react";
import { useAuth } from "../contexts/AuthContext";

/**
 * /login - 목업 없음. 기존 구조(중앙 정렬 폼) 유지 + 토큰 재스킨.
 * - 구 Header(모바일 앱바) 제거 -> 상단 뒤로가기(work-detail 관례) + 중앙 폼.
 * - body overflow 잠금 이펙트 제거 - 셸(SiteHeader/Footer) 스크롤에 맡긴다.
 * - 에러 문구는 시맨틱 danger 토큰 1종 사용.
 */

const inputClass =
  "w-full rounded-input border border-line bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-3 transition-colors focus:border-line-strong";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(formData.username, formData.password);
      navigate("/profile");
    } catch (err: any) {
      setError(err.message || "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

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
          로그인
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
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="login-username"
              className="text-sm font-semibold text-ink"
            >
              아이디
            </label>
            <input
              id="login-username"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="아이디를 입력하세요"
              autoComplete="username"
              required
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="login-password"
              className="text-sm font-semibold text-ink"
            >
              비밀번호
            </label>
            <input
              id="login-password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="8자 이상 비밀번호를 입력하세요"
              autoComplete="current-password"
              required
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-full bg-accent-ink py-3 text-[15px] font-semibold text-surface transition-colors hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-2">
          아직 계정이 없으신가요?{" "}
          <Link
            to="/signup"
            className="font-semibold text-accent-ink hover:underline"
          >
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
