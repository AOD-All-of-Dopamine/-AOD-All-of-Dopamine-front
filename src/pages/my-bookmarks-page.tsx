import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMyBookmarks } from "../hooks/useInteractions";
import Header from "../components/common/Header";

export default function MyBookmarksPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const { data, isLoading } = useMyBookmarks(page, 20);

  if (isLoading) {
    return <div className="p-5 max-w-[1200px] mx-auto">로딩 중...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="내가 북마크한 작품"
        leftIcon="back"
        onLeftClick={() => navigate(-1)}
        bgColor="#242424"
      />

      <div className="w-full max-w-2xl mx-auto px-5">
        {/* HAS DATA */}
        {data && data.content.length > 0 ? (
          <>
            {/* GRID */}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-5">
              {data.content.map((work: any) => (
                <div
                  key={work.id}
                  onClick={() => navigate(`/work/${work.id}`)}
                  className="cursor-pointer transition-transform duration-200 hover:-translate-y-1"
                >
                  <div className="w-full aspect-[2/3] rounded-lg overflow-hidden bg-[#333] mb-2">
                    {work.thumbnail ? (
                      <img
                        src={work.thumbnail}
                        alt={work.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl">
                        🎬
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-semibold text-white line-clamp-2">
                      {work.title}
                    </h3>
                    {work.domain && (
                      <div className="text-xs text-gray-400">{work.domain}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* PAGINATION */}
            {data.totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8 pt-6 border-t border-[#333]">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-4 py-2 bg-[#646cff] text-white rounded-md text-sm font-semibold transition-all disabled:bg-[#444] disabled:text-gray-500 disabled:cursor-not-allowed hover:bg-[#535bf2] disabled:hover:bg-[#444]"
                >
                  이전
                </button>

                <span className="text-gray-300 text-sm font-semibold">
                  {page + 1} / {data.totalPages}
                </span>

                <button
                  disabled={page >= data.totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-4 py-2 bg-[#646cff] text-white rounded-md text-sm font-semibold transition-all disabled:bg-[#444] disabled:text-gray-500 disabled:cursor-not-allowed hover:bg-[#535bf2] disabled:hover:bg-[#444]"
                >
                  다음
                </button>
              </div>
            )}
          </>
        ) : (
          /* EMPTY STATE */
          <div className="text-center py-[60px] px-5">
            <p className="text-gray-400 text-base mb-5">
              아직 북마크한 작품이 없습니다.
            </p>

            <button
              onClick={() => navigate("/explore")}
              className="px-6 py-3 bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white rounded-lg text-lg font-semibold transition-all hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(102,126,234,0.4)]"
            >
              작품 둘러보기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
