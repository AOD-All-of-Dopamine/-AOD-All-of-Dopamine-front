import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMyBookmarks } from "../hooks/useInteractions";
import { DOMAIN_LABEL_MAP } from "../constants/domain";
import Header from "../components/common/Header";
import SearchBar from "../components/SearchBar";

export default function MyBookmarksPage() {
  const navigate = useNavigate();
  const [page] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const { data, isLoading } = useMyBookmarks(page, 1000);
  const filteredWorks = data?.content.filter((work: any) =>
    work.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

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
      <SearchBar onSearch={handleSearch} offsetTop={50} />

      <div className="w-full max-w-2xl mx-auto px-5 mt-32 mb-8">
        {data && data.content.length > 0 ? (
          <>
            <div className="grid grid-cols-3 gap-5">
              {filteredWorks.map((work: any) => (
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
                    <h3 className="font-[PretendardVariable] text-sm font-semibold text-white line-clamp-2 truncate">
                      {work.title}
                    </h3>
                    <div className="font-[PretendardVariable] text-gray-400 text-xs">
                      {DOMAIN_LABEL_MAP[work.domain] || work.domain}
                      {work.releaseDate &&
                        ` • ${new Date(work.releaseDate).getFullYear()}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
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
