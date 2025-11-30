import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Header from "../components/common/Header";

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
    <div className="min-h-screen flex flex-col bg-[#242424]">
      <Header
        title="회원가입"
        leftIcon="back"
        onLeftClick={() => navigate(-1)}
        bgColor="#242424"
      />

      <div className="flex-1 flex items-center justify-center px-5">
        <div className="w-full max-w-md rounded-2xl">
          {error && (
            <div className="mb-4 bg-red-100 text-red-700 border border-red-200 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* 아이디 + 중복확인 */}
            <div className="flex flex-col gap-1">
              <label className="font-[PretendardVariable] font-semibold text-gray-200 font-medium">
                아이디
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="아이디를 입력하세요"
                  className="px-4 py-2 rounded-lg bg-[#302F31] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#855BFF] focus:border-transparent border border-[#403F43] border-[1.5px]"
                  required
                />
                <button
                  type="button"
                  onClick={handleUsernameCheck}
                  className="px-4 py-2 bg-[#855BFF] text-white rounded-lg text-sm font-semibold hover:bg-[#9CDDFE] transition-colors"
                >
                  중복확인
                </button>
              </div>
            </div>

            {/* 이메일 */}
            <div className="flex flex-col gap-1">
              <label className="font-[PretendardVariable] font-semibold text-gray-200 font-medium">
                이메일
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="example@gmail.com"
                className="px-4 py-2 rounded-lg bg-[#302F31] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#855BFF] focus:border-transparent border border-[#403F43] border-[1.5px]"
                required
              />
            </div>

            {/* 비밀번호 */}
            <div className="flex flex-col gap-1">
              <label className="font-[PretendardVariable] font-semibold text-gray-200 font-medium">
                비밀번호
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="비밀번호를 입력하세요"
                className="px-4 py-2 rounded-lg bg-[#302F31] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#855BFF] focus:border-transparent border border-[#403F43] border-[1.5px]"
                required
              />
            </div>

            {/* 비밀번호 확인 */}
            <div className="flex flex-col gap-1">
              <label className="font-[PretendardVariable] font-semibold text-gray-200 font-medium">
                비밀번호 확인
              </label>
              <input
                type="password"
                name="passwordConfirm"
                value={formData.passwordConfirm}
                onChange={handleChange}
                placeholder="비밀번호를 다시 입력하세요"
                className="px-4 py-2 rounded-lg bg-[#302F31] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#855BFF] focus:border-transparent border border-[#403F43] border-[1.5px]"
                required
              />
            </div>

            {/* 회원가입 버튼 */}
            <button
              type="submit"
              disabled={!isFormComplete || loading}
              className={`mt-4 py-3 rounded-lg font-semibold text-base text-white transition-transform duration-200 ${
                isFormComplete
                  ? "bg-gradient-to-r from-[#855BFF] to-[#9CDDFE] hover:-translate-y-1"
                  : "bg-gray-600 cursor-not-allowed"
              }`}
            >
              {loading ? "가입 중..." : "회원가입"}
            </button>
          </form>

          {/* 로그인 링크 */}
          <div className="mt-6 text-sm text-gray-400 text-center">
            <span>이미 계정이 있으신가요? </span>
            <Link
              to="/login"
              className="text-[#855BFF] font-semibold hover:underline"
            >
              로그인
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
