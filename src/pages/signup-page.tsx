import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

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
    <div className="min-h-screen flex flex-col bg-[var(--blackbackground-primary)]">
      {/* 헤더 */}
      <header className="h-[60px] flex items-center px-4">
        <button onClick={() => navigate(-1)} className="w-6 h-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="flex-1 text-center text-[18px] font-semibold text-white mr-6">회원가입</h1>
      </header>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {error && (
            <div className="mb-4 bg-[#FF545520] border border-[#FF5455] rounded-lg p-3 text-[14px] text-[#FF5455]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* 아이디 + 중복확인 */}
            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-semibold text-white">
                아이디
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="아이디를 입력하세요"
                  className="flex-1 px-4 py-3 rounded-lg bg-[var(--greygrey-800background-hover)] text-white text-[14px] placeholder-[var(--greygrey-400icon)] focus:outline-none focus:ring-2 focus:ring-[#855BFF] border border-[var(--greygrey-700)]"
                  required
                />
                <button
                  type="button"
                  onClick={handleUsernameCheck}
                  className={`px-4 py-3 rounded-lg text-[14px] font-semibold transition-colors ${
                    usernameChecked 
                      ? "bg-[var(--greygrey-700)] text-[var(--greygrey-300text-secondary)]" 
                      : "bg-[#855BFF] text-white"
                  }`}
                >
                  {usernameChecked ? "확인완료" : "중복확인"}
                </button>
              </div>
            </div>

            {/* 이메일 */}
            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-semibold text-white">
                이메일
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="example@gmail.com"
                className="px-4 py-3 rounded-lg bg-[var(--greygrey-800background-hover)] text-white text-[14px] placeholder-[var(--greygrey-400icon)] focus:outline-none focus:ring-2 focus:ring-[#855BFF] border border-[var(--greygrey-700)]"
                required
              />
            </div>

            {/* 비밀번호 */}
            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-semibold text-white">
                비밀번호
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="비밀번호를 입력하세요"
                className="px-4 py-3 rounded-lg bg-[var(--greygrey-800background-hover)] text-white text-[14px] placeholder-[var(--greygrey-400icon)] focus:outline-none focus:ring-2 focus:ring-[#855BFF] border border-[var(--greygrey-700)]"
                required
              />
            </div>

            {/* 비밀번호 확인 */}
            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-semibold text-white">
                비밀번호 확인
              </label>
              <input
                type="password"
                name="passwordConfirm"
                value={formData.passwordConfirm}
                onChange={handleChange}
                placeholder="비밀번호를 다시 입력하세요"
                className="px-4 py-3 rounded-lg bg-[var(--greygrey-800background-hover)] text-white text-[14px] placeholder-[var(--greygrey-400icon)] focus:outline-none focus:ring-2 focus:ring-[#855BFF] border border-[var(--greygrey-700)]"
                required
              />
            </div>

            {/* 회원가입 버튼 */}
            <button
              type="submit"
              disabled={!isFormComplete || loading}
              className={`mt-4 py-3 rounded-lg text-[16px] font-semibold text-white transition-opacity ${
                isFormComplete
                  ? "bg-[#855BFF] hover:opacity-90"
                  : "bg-[var(--greygrey-700)] cursor-not-allowed"
              }`}
            >
              {loading ? "가입 중..." : "회원가입"}
            </button>
          </form>

          {/* 로그인 링크 */}
          <div className="mt-6 text-[14px] text-white text-center">
            <span>이미 계정이 있으신가요? </span>
            <Link
              to="/login"
              className="text-[#855BFF] font-semibold"
            >
              로그인
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
