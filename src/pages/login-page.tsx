import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

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
      navigate("/"); // 로그인 성공 시 홈으로
    } catch (err: any) {
      setError(err.message || "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--blackbackground-primary)] flex flex-col">
      {/* 헤더 */}
      <header className="h-[60px] flex items-center px-4">
        <button onClick={() => navigate(-1)} className="w-6 h-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="flex-1 text-center text-[18px] font-semibold text-white mr-6">로그인</h1>
      </header>

      {/* 본문 */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* 오류 메시지 */}
          {error && (
            <div className="mb-4 bg-[#FF545520] border border-[#FF5455] rounded-lg p-3 text-[14px] text-[#FF5455]">
              {error}
            </div>
          )}

          {/* 폼 */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-semibold text-white">
                아이디
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="아이디를 입력하세요"
                required
                className="px-4 py-3 rounded-lg bg-[var(--greygrey-800background-hover)] text-white text-[14px] placeholder-[var(--greygrey-400icon)] focus:outline-none focus:ring-2 focus:ring-[#855BFF] border border-[var(--greygrey-700)]"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-semibold text-white">
                비밀번호
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="8자 이상 비밀번호를 입력하세요"
                required
                className="px-4 py-3 rounded-lg bg-[var(--greygrey-800background-hover)] text-white text-[14px] placeholder-[var(--greygrey-400icon)] focus:outline-none focus:ring-2 focus:ring-[#855BFF] border border-[var(--greygrey-700)]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 py-3 bg-[#855BFF] text-white rounded-lg text-[16px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          {/* 회원가입 링크 */}
          <div className="mt-6 text-[14px] text-white text-center">
            <span>아직 계정이 없으신가요? </span>
            <Link
              to="/signup"
              className="text-[#855BFF] font-semibold"
            >
              회원가입
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
