import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMyLikes } from "../hooks/useInteractions";

export default function MyLikesPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const { data, isLoading } = useMyLikes(page, 20);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--blackbackground-primary)] flex items-center justify-center text-[var(--greygrey-300text-secondary)]">
        로딩 중...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--blackbackground-primary)] pb-20">
      {/* 헤더 */}
      <header className="h-[60px] flex items-center px-4">
        <button onClick={() => navigate(-1)} className="w-6 h-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="flex-1 text-center text-[18px] font-semibold text-white mr-6">
          좋아요 표시한 작품
        </h1>
      </header>

      {/* 컨텐츠 */}
      <div className="px-4">
        {data && data.content.length > 0 ? (
          <>
            {/* 그리드 */}
            <div className="grid grid-cols-3 gap-2">
              {data.content.map((work: any) => (
                <div
                  key={work.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/work/${work.id}`)}
                >
                  <div className="w-full aspect-[105/147] bg-[var(--greygrey-900background-secondary)] rounded overflow-hidden mb-1">
                    {work.thumbnail ? (
                      <img
                        src={work.thumbnail}
                        alt={work.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">
                        🎬
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-[14px] font-semibold text-white line-clamp-1">
                      {work.title}
                    </h3>
                    {work.domain && (
                      <div className="text-[12px] text-[var(--greygrey-200text-primary)]">{work.domain}</div>
                    )}
                    {work.score && (
                      <div className="flex items-center gap-0.5">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M7 1L8.854 4.604L13 5.182L10 8.012L10.708 12L7 10.104L3.292 12L4 8.012L1 5.182L5.146 4.604L7 1Z" fill="#855BFF"/>
                        </svg>
                        <span className="text-[12px] text-[#855BFF]">{work.score.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 페이지네이션 */}
            {data.totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-6 pt-4 border-t border-[var(--greygrey-700)]">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-4 py-2 bg-[#855BFF] text-white rounded text-[14px] font-semibold disabled:bg-[var(--greygrey-700)] disabled:text-[var(--greygrey-400icon)] disabled:cursor-not-allowed"
                >
                  이전
                </button>

                <span className="text-[14px] text-white">
                  {page + 1} / {data.totalPages}
                </span>

                <button
                  disabled={page >= data.totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-4 py-2 bg-[#855BFF] text-white rounded text-[14px] font-semibold disabled:bg-[var(--greygrey-700)] disabled:text-[var(--greygrey-400icon)] disabled:cursor-not-allowed"
                >
                  다음
                </button>
              </div>
            )}
          </>
        ) : (
          /* 빈 상태 */
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-[16px] text-white mb-4">
              아직 좋아요 표시한 작품이 없습니다.
            </p>
            <button
              onClick={() => navigate("/explore")}
              className="px-4 py-2 bg-[#855BFF] text-white rounded text-[14px]"
            >
              작품 둘러보기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
