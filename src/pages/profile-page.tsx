import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  useMyReviews,
  useMyBookmarks,
  useMyLikes,
} from "../hooks/useInteractions";
import Header from "../components/common/Header";
import whiteCat from "../assets/white-cat.png";

function ProfilePage() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  // 내 데이터 조회 (첫 페이지만, 카운트를 위해)
  const { data: reviewsData } = useMyReviews(0, 1);
  const { data: bookmarksData } = useMyBookmarks(0, 1);
  const { data: likesData } = useMyLikes(0, 1);

  const reviewCount = reviewsData?.totalElements || 0;
  const likeCount = likesData?.totalElements || 0;
  const bookmarkCount = bookmarksData?.totalElements || 0;

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

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="마이페이지"
        rightIcon="exit"
        onRightClick={handleLogout}
        bgColor="#242424"
      />
      <div className="w-full max-w-2xl mx-auto px-5">
        {/* 프로필 섹션 */}
        <div className="mt-[60px]">
          <div
            className="flex items-center justify-between rounded-xl cursor-pointer"
            onClick={() => navigate("/profile/info")}
          >
            <div className="flex items-center gap-4">
              {/* 프로필 이미지 */}
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#855BFF] to-[#445FD1] p-[2px]">
                  <div className="w-full h-full rounded-full bg-[#302F31] overflow-hidden flex items-center justify-center">
                    <img
                      src={whiteCat}
                      alt="profile"
                      className="w-9 h-9 object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* 닉네임 */}
              <div>
                <div className="text-2xl font-bold text-white">
                  {user?.username}
                </div>
                <div className="text-gray-400 text-sm">@{user?.username}</div>
              </div>
            </div>

            {/* > 아이콘 */}
            <div className="text-gray-400 text-2xl">›</div>
          </div>
        </div>

        {/* 메뉴 리스트 */}
        <div className="mt-8">
          <div className="grid grid-cols-3 text-center bg-[#2E2E2E] rounded-xl py-4">
            {[
              {
                id: "reviews",
                label: "리뷰 작성",
                value: reviewCount,
              },
              { id: "likes", label: "좋아요", value: likeCount },
              {
                id: "bookmarks",
                label: "북마크",
                value: bookmarkCount,
              },
            ].map((item, idx) => (
              <div
                key={item.id}
                className={`flex flex-col cursor-pointer ${
                  idx !== 2 ? "border-r border-[#444444]" : ""
                }`}
                onClick={() => navigate(`/profile/${item.id}`)}
              >
                <span className="text-xl font-bold text-white">
                  {item.value}
                </span>
                <span className="text-gray-400 text-sm mt-1">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 좋아요 섹션 */}
        <div className="w-full max-w-2xl mx-auto mt-8 pb-4 border-b border-[var(--greygrey-700)]">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <span className="text-[16px] font-semibold text-white">
                좋아요
              </span>
              <span className="text-[16px] font-semibold text-white">
                {likeCount}
              </span>
            </div>
            <button
              onClick={() => navigate("/profile/likes")}
              className="flex items-center text-[14px] text-[var(--greygrey-300text-secondary)]"
            >
              전체보기
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="ml-0.5"
              >
                <path
                  d="M6 4L10 8L6 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          <p className="text-[14px] text-[var(--greygrey-200text-primary)] mb-4">
            좋았던 작품을 찜해보세요
          </p>

          {likeCount > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {/* 좋아요한 작품 카드들이 여기 표시됨 */}
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center">
              <p className="text-[16px] text-white mb-3">
                아직 등록한 작품이 없어요
              </p>
              <button
                onClick={() => navigate("/explore")}
                className="px-3 py-2 bg-[#855BFF] text-white text-[14px] rounded"
              >
                등록하러 가기
              </button>
            </div>
          )}
        </div>

        {/* 보고 싶은 작품 섹션 */}
        <div className="mt-4">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[16px] font-semibold text-white">
              보고 싶은 작품
            </span>
            <span className="text-[16px] font-semibold text-white">
              {bookmarkCount}
            </span>
          </div>
          <p className="text-[14px] text-[var(--greygrey-200text-primary)] mb-4">
            나중에 볼 작품을 등록해요
          </p>

          {bookmarkCount > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {/* 북마크한 작품 카드들이 여기 표시됨 */}
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center">
              <p className="text-[16px] text-white mb-3">
                아직 등록한 작품이 없어요
              </p>
              <button
                onClick={() => navigate("/explore")}
                className="px-3 py-2 bg-[#855BFF] text-white text-[14px] rounded"
              >
                등록하러 가기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
