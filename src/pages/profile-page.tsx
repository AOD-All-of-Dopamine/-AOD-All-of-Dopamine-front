import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  useMyReviews,
  useMyBookmarks,
  useMyLikes,
} from "../hooks/useInteractions";

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
      <div className="min-h-screen bg-[var(--blackbackground-primary)] flex flex-col">
        {/* 헤더 */}
        <div className="h-[60px] flex items-center justify-center relative">
          <h1 className="text-[18px] font-semibold text-white">마이페이지</h1>
        </div>
        
        {/* 로그인 유도 */}
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="w-[120px] h-[120px] rounded-full bg-[var(--greygrey-800background-hover)] flex items-center justify-center mb-6 relative
            before:content-[''] before:absolute before:inset-0 before:rounded-full before:p-[2px] before:bg-gradient-to-b before:from-[#855BFF] before:to-[#445FD1] before:[-webkit-mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:[-webkit-mask-composite:xor] before:[mask-composite:exclude]">
            <svg width="48" height="52" viewBox="0 0 30 32" fill="none">
              <path d="M15 16C19.4183 16 23 12.4183 23 8C23 3.58172 19.4183 0 15 0C10.5817 0 7 3.58172 7 8C7 12.4183 10.5817 16 15 16Z" fill="white"/>
              <path d="M15 18C6.71573 18 0 24.7157 0 33H30C30 24.7157 23.2843 18 15 18Z" fill="white"/>
            </svg>
          </div>
          
          <h2 className="text-[18px] font-semibold text-white mb-2">
            로그인이 필요합니다
          </h2>
          <p className="text-[14px] text-[var(--greygrey-300text-secondary)] mb-6 text-center">
            로그인하고 좋아하는 작품을<br/>저장하고 리뷰를 작성해보세요
          </p>
          
          <button
            onClick={() => navigate("/login")}
            className="px-6 py-3 bg-[#855BFF] text-white text-[14px] font-medium rounded-lg"
          >
            로그인 하기
          </button>
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

  const reviewCount = reviewsData?.totalElements || 0;
  const likeCount = likesData?.totalElements || 0;
  const bookmarkCount = bookmarksData?.totalElements || 0;

  return (
    <div className="min-h-screen bg-[var(--blackbackground-primary)] pb-20">
      {/* 헤더 */}
      <div className="h-[60px] flex items-center justify-center relative px-4">
        <h1 className="text-[18px] font-semibold text-white">마이페이지</h1>
        <button 
          onClick={handleLogout}
          className="absolute right-4 w-6 h-6"
          aria-label="로그아웃"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 17L21 12L16 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21 12H9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* 유저 프로필 */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-[var(--greygrey-800background-hover)] flex items-center justify-center relative
              before:content-[''] before:absolute before:inset-0 before:rounded-full before:p-[1px] before:bg-gradient-to-b before:from-[#855BFF] before:to-[#445FD1] before:[-webkit-mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:[-webkit-mask-composite:xor] before:[mask-composite:exclude]">
              <svg width="24" height="26" viewBox="0 0 30 32" fill="none">
                <path d="M15 16C19.4183 16 23 12.4183 23 8C23 3.58172 19.4183 0 15 0C10.5817 0 7 3.58172 7 8C7 12.4183 10.5817 16 15 16Z" fill="white"/>
                <path d="M15 18C6.71573 18 0 24.7157 0 33H30C30 24.7157 23.2843 18 15 18Z" fill="white"/>
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[16px] font-semibold text-white">
                {user?.username || "사용자"}
              </span>
              <span className="text-[14px] text-white">
                @{user?.username || "user"}
              </span>
            </div>
          </div>
          <button className="w-6 h-6">
            <svg width="6" height="16" viewBox="0 0 6 16" fill="none">
              <circle cx="3" cy="2" r="2" fill="white"/>
              <circle cx="3" cy="8" r="2" fill="white"/>
              <circle cx="3" cy="14" r="2" fill="white"/>
            </svg>
          </button>
        </div>

        {/* 통계 카드 */}
        <div className="mt-6 bg-[var(--greygrey-900background-secondary)] rounded-lg py-4">
          <div className="flex items-center">
            <div className="flex-1 flex flex-col items-center border-r border-[var(--greygrey-700)]">
              <span className="text-[18px] font-semibold text-white">{reviewCount}</span>
              <span className="text-[14px] text-[var(--greygrey-200text-primary)]">리뷰 작성</span>
            </div>
            <div className="flex-1 flex flex-col items-center border-r border-[var(--greygrey-700)]">
              <span className="text-[18px] font-semibold text-white">{likeCount}</span>
              <span className="text-[14px] text-[var(--greygrey-200text-primary)]">좋아요</span>
            </div>
            <div className="flex-1 flex flex-col items-center">
              <span className="text-[18px] font-semibold text-white">{bookmarkCount}</span>
              <span className="text-[14px] text-[var(--greygrey-200text-primary)]">북마크</span>
            </div>
          </div>
        </div>

        {/* 좋아요 섹션 */}
        <div className="mt-8 pb-4 border-b border-[var(--greygrey-700)]">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <span className="text-[16px] font-semibold text-white">좋아요</span>
              <span className="text-[16px] font-semibold text-white">{likeCount}</span>
            </div>
            <button 
              onClick={() => navigate('/profile/likes')}
              className="flex items-center text-[14px] text-[var(--greygrey-300text-secondary)]"
            >
              전체보기
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="ml-0.5">
                <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <p className="text-[14px] text-[var(--greygrey-200text-primary)] mb-4">좋았던 작품을 찜해보세요</p>
          
          {likeCount > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {/* 좋아요한 작품 카드들이 여기 표시됨 */}
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center">
              <p className="text-[16px] text-white mb-3">아직 등록한 작품이 없어요</p>
              <button 
                onClick={() => navigate('/explore')}
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
            <span className="text-[16px] font-semibold text-white">보고 싶은 작품</span>
            <span className="text-[16px] font-semibold text-white">{bookmarkCount}</span>
          </div>
          <p className="text-[14px] text-[var(--greygrey-200text-primary)] mb-4">나중에 볼 작품을 등록해요</p>
          
          {bookmarkCount > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {/* 북마크한 작품 카드들이 여기 표시됨 */}
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center">
              <p className="text-[16px] text-white mb-3">아직 등록한 작품이 없어요</p>
              <button 
                onClick={() => navigate('/explore')}
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
