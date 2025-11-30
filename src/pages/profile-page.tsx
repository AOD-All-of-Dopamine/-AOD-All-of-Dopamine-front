import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  useMyReviews,
  useMyBookmarks,
  useMyLikes,
} from "../hooks/useInteractions";
import Header from "../components/common/Header";

function ProfilePage() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  // 내 데이터 조회 (첫 페이지만, 카운트를 위해)
  const { data: reviewsData } = useMyReviews(0, 1);
  const { data: bookmarksData } = useMyBookmarks(0, 1);
  const { data: likesData } = useMyLikes(0, 1);

  // 로그인하지 않은 경우
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#242424] flex flex-col">
        <Header
          leftIcon="back"
          onLeftClick={() => navigate(-1)}
          bgColor="#242424"
        />
        <div className="flex-1 flex items-center justify-center px-5">
          <div className="text-center max-w-2xl">
            <h2 className="font-[PretendardVariable] font-semibold text-[20px] mb-1 text-white">
              로그인이 필요합니다
            </h2>
            <p className="font-[PretendardVariable] font-light text-gray-400 mb-3">
              프로필을 보려면 로그인해주세요.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 bg-gradient-to-br from-indigo-500 to-purple-600 font-[PretendardVariable] font-semibold text-white text-lg rounded-md hover:-translate-y-1 transition-transform"
            >
              로그인 하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    if (confirm("로그아웃하시겠습니까?")) {
      logout();
      navigate("/login");
    }
  };

  const menuItems = [
    {
      id: "reviews",
      icon: "📝",
      label: "작성한 리뷰",
      count: reviewsData?.totalElements || 0,
    },
    {
      id: "bookmarks",
      icon: "🔖",
      label: "북마크한 작품",
      count: bookmarksData?.totalElements || 0,
    },
    {
      id: "likes",
      icon: "👍",
      label: "좋아요 표시한 작품",
      count: likesData?.totalElements || 0,
    },
  ];

  return (
    <div className="px-5 max-w-2xl mx-auto pb-10">
      {/* 프로필 섹션 */}
      <div className="flex items-center gap-5 p-6 bg-gray-800 rounded-xl mb-8">
        <div className="w-20 h-20 rounded-full bg-indigo-400 flex items-center justify-center text-4xl flex-shrink-0">
          👤
        </div>
        <div className="flex-1">
          <div className="text-2xl font-bold text-white mb-1">
            {user?.username || "사용자"}
          </div>
          <div className="text-gray-400 text-sm">
            @{user?.username || "user"}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-md hover:bg-red-700 transition-colors"
        >
          로그아웃
        </button>
      </div>

      {/* 메뉴 리스트 */}
      <div className="flex flex-col gap-3">
        {menuItems.map((item) => (
          <div
            key={item.id}
            onClick={() => navigate(`/profile/${item.id}`)}
            className="flex items-center justify-between p-4 bg-gray-800 rounded-lg cursor-pointer transition-transform hover:bg-gray-700 hover:translate-x-1"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{item.icon}</span>
              <span className="text-white font-medium">{item.label}</span>
            </div>
            <span className="text-gray-400 text-lg">
              {item.count > 0 ? `${item.count} →` : "→"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProfilePage;
