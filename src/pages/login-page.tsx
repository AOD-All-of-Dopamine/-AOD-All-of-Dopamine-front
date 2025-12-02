import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Header from "../components/common/Header";

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
      navigate("/profile"); // 로그인 성공 시 홈으로
    } catch (err: any) {
      setError(err.message || "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#242424] flex flex-col">
      {/* 헤더 */}
      <Header
        title="로그인"
        leftIcon="back"
        onLeftClick={() => navigate(-1)}
        bgColor="#242424"
      />

      {/* 본문 */}
      <div className="flex-1 flex items-center justify-center px-5">
        <div className="w-full max-w-md rounded-2xl">
          {/* 오류 메시지 */}
          {error && (
            <div className="mb-4 bg-red-100 text-red-700 border border-red-200 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          {/* 폼 */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="font-[PretendardVariable] font-semibold text-gray-200 font-medium">
                아이디
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="아이디를 입력하세요"
                required
                className="px-4 py-2 rounded-lg bg-[#302F31] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#855BFF] focus:border-transparent border border-[#403F43] border-[1.5px]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-[PretendardVariable] font-semibold text-gray-200 font-medium">
                비밀번호
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="8자 이상 비밀번호를 입력하세요"
                required
                className="px-4 py-2 rounded-lg bg-[#302F31] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#855BFF] focus:border-transparent border border-[#403F43] border-[1.5px]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="font-[PretendardVariable] font-semibold mt-4 py-3 bg-gradient-to-r from-[#855BFF] to-[#9CDDFE] text-white rounded-lg font-semibold text-base transition-transform duration-200 hover:-translate-y-1 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          {/* 회원가입 링크 */}
          <div className="mt-6 text-sm text-white text-center">
            <span>아직 계정이 없으신가요? </span>
            <Link
              to="/signup"
              className="text-[#855BFF] font-semibold hover:underline"
            >
              회원가입
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
