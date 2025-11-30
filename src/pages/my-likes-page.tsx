import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMyLikes } from "../hooks/useInteractions";

export default function MyLikesPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const { data, isLoading } = useMyLikes(page, 20);

  if (isLoading) {
    return (
      <div className="p-5 max-w-[1200px] mx-auto text-white">로딩 중...</div>
    );
  }

  return (
    <div className="p-5 max-w-[1200px] mx-auto">
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-6 pb-4 border-b-2 border-[#333]">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-transparent text-gray-400 border border-gray-600 rounded-md text-sm hover:border-gray-500 hover:text-gray-300 transition"
        >
          ← 뒤로
        </button>
        <h1 className="text-2xl font-bold text-white m-0">
          좋아요 표시한 작품
        </h1>
      </div>

      {/* CONTENT */}
      {data && data.content.length > 0 ? (
        <>
          {/* GRID */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-5">
            {data.content.map((work: any) => (
              <div
                key={work.id}
                className="cursor-pointer transition-transform hover:-translate-y-1"
                onClick={() => navigate(`/work/${work.id}`)}
              >
                <div className="w-full aspect-[2/3] bg-[#333] rounded-lg overflow-hidden mb-2">
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
                  <h3 className="text-sm font-semibold text-white line-clamp-2 m-0">
                    {work.title}
                  </h3>
                  {work.domain && (
                    <div className="text-xs text-gray-400">{work.domain}</div>
                  )}
                  {work.score && (
                    <div className="text-xs text-yellow-400">
                      ⭐ {work.score.toFixed(1)}
                    </div>
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
                className="px-4 py-2 bg-[#646cff] text-white rounded-md text-sm font-semibold disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed hover:bg-[#535bf2] transition"
              >
                이전
              </button>

              <span className="text-gray-300 text-sm font-semibold">
                {page + 1} / {data.totalPages}
              </span>

              <button
                disabled={page >= data.totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 bg-[#646cff] text-white rounded-md text-sm font-semibold disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed hover:bg-[#535bf2] transition"
              >
                다음
              </button>
            </div>
          )}
        </>
      ) : (
        /* EMPTY STATE */
        <div className="text-center py-16 px-5">
          <p className="text-gray-400 text-lg mb-5">
            아직 좋아요 표시한 작품이 없습니다.
          </p>
          <button
            onClick={() => navigate("/explore")}
            className="px-6 py-3 bg-gradient-to-r from-indigo-400 to-purple-600 text-white rounded-lg text-lg font-semibold transition hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(102,126,234,0.4)]"
          >
            작품 둘러보기
          </button>
        </div>
      )}
    </div>
  );
}
