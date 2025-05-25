import React, { useState, useEffect } from 'react';
import { Star, Heart, Bookmark, MessageSquare, Sparkles, User, Filter } from 'lucide-react';

const RecommendationSystem = () => {
  const [activeTab, setActiveTab] = useState('traditional');
  const [userPreferences, setUserPreferences] = useState(null);
  const [traditionalRecommendations, setTraditionalRecommendations] = useState({});
  const [llmPrompt, setLlmPrompt] = useState('');
  const [llmResponse, setLlmResponse] = useState('');
  const [llmRecommendations, setLlmRecommendations] = useState({});
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState('testuser'); // 실제로는 인증에서 가져와야 함
  const [showPreferenceModal, setShowPreferenceModal] = useState(false);

  // 사용자 선호도 초기값
  const [preferences, setPreferences] = useState({
    preferredGenres: [],
    preferredContentTypes: [],
    ageGroup: 20,
    preferredAgeRating: '전체',
    favoriteDirectors: '',
    favoriteAuthors: '',
    favoriteActors: '',
    likesNewContent: true,
    likesClassicContent: false,
    additionalNotes: ''
  });

  // 장르 옵션들
  const genreOptions = [
    '액션', '드라마', '코미디', '로맨스', '스릴러', '공포', 'SF', '판타지',
    '애니메이션', '다큐멘터리', '뮤지컬', '전쟁', '범죄', '미스터리', '어드벤처',
    '가족', '스포츠', '서부', '느와르', '바이오그래피'
  ];

  const contentTypeOptions = [
    { value: 'movie', label: '영화' },
    { value: 'novel', label: '웹소설' },
    { value: 'webtoon', label: '웹툰' },
    { value: 'ott', label: 'OTT 콘텐츠' },
    { value: 'game', label: '게임' }
  ];

  const ageRatingOptions = ['전체', '12세', '15세', '18세'];

  useEffect(() => {
    loadUserPreferences();
  }, [currentUser]);

  // 사용자 선호도 로드
  const loadUserPreferences = async () => {
    try {
      const response = await fetch(`http://localhost:8080/api/recommendations/preferences/${currentUser}`);
      if (response.ok) {
        const data = await response.json();
        setUserPreferences(data);
        setPreferences(data);
      }
    } catch (error) {
      console.error('선호도 로드 오류:', error);
    }
  };

  // 전통적인 추천 로드
  const loadTraditionalRecommendations = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8080/api/recommendations/traditional/${currentUser}`);
      if (response.ok) {
        const data = await response.json();
        setTraditionalRecommendations(data);
      }
    } catch (error) {
      console.error('전통 추천 로드 오류:', error);
    }
    setLoading(false);
  };

  // LLM 추천 요청
  const handleLLMRecommendation = async () => {
    if (!llmPrompt.trim()) {
      alert('추천 요청 내용을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8080/api/recommendations/llm/${currentUser}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: llmPrompt })
      });

      if (response.ok) {
        const data = await response.json();
        setLlmResponse(data.llmResponse || '');
        setLlmRecommendations(data);
      }
    } catch (error) {
      console.error('LLM 추천 오류:', error);
      setLlmResponse('추천을 생성하는 중 오류가 발생했습니다.');
    }
    setLoading(false);
  };

  // 사용자 선호도 저장
  const savePreferences = async () => {
    try {
      const response = await fetch(`http://localhost:8080/api/recommendations/preferences/${currentUser}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences)
      });

      if (response.ok) {
        const data = await response.json();
        setUserPreferences(data);
        setShowPreferenceModal(false);
        alert('선호도가 저장되었습니다!');
      }
    } catch (error) {
      console.error('선호도 저장 오류:', error);
      alert('선호도 저장 중 오류가 발생했습니다.');
    }
  };

  // 콘텐츠 평가
  const rateContent = async (contentType, contentId, contentTitle, rating) => {
    try {
      const ratingData = {
        contentType,
        contentId,
        contentTitle,
        rating,
        isLiked: rating >= 4,
        isWatched: true
      };

      const response = await fetch(`http://localhost:8080/api/recommendations/ratings/${currentUser}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ratingData)
      });

      if (response.ok) {
        alert('평가가 저장되었습니다!');
      }
    } catch (error) {
      console.error('평가 저장 오류:', error);
    }
  };

  // 위시리스트 추가
  const addToWishlist = async (contentType, contentId, contentTitle) => {
    try {
      const wishlistData = {
        contentType,
        contentId,
        contentTitle,
        isWishlist: true
      };

      const response = await fetch(`http://localhost:8080/api/recommendations/ratings/${currentUser}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(wishlistData)
      });

      if (response.ok) {
        alert('위시리스트에 추가되었습니다!');
      }
    } catch (error) {
      console.error('위시리스트 추가 오류:', error);
    }
  };

  // 콘텐츠 카드 컴포넌트
  const ContentCard = ({ content, contentType }) => {
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);

    const getTitle = (content) => {
      return content.title || content.name || '제목 없음';
    };

    const getImage = (content) => {
      return content.imageUrl || content.thumbnail || content.thumbnailUrl || '/placeholder-image.jpg';
    };

    const handleStarClick = (starRating) => {
      setRating(starRating);
      rateContent(contentType, content.id, getTitle(content), starRating);
    };

    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
        <div className="relative h-48 overflow-hidden">
          <img 
            src={getImage(content)} 
            alt={getTitle(content)}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = '/placeholder-image.jpg';
            }}
          />
          <div className="absolute top-2 right-2">
            <button
              onClick={() => addToWishlist(contentType, content.id, getTitle(content))}
              className="bg-white/80 hover:bg-white p-2 rounded-full transition-colors"
            >
              <Bookmark size={16} className="text-gray-700" />
            </button>
          </div>
        </div>
        
        <div className="p-4">
          <h3 className="font-bold text-lg text-gray-800 mb-2 line-clamp-2">
            {getTitle(content)}
          </h3>
          
          {content.creator && (
            <p className="text-sm text-gray-600 mb-2">작가: {content.creator}</p>
          )}
          
          {content.director && (
            <p className="text-sm text-gray-600 mb-2">감독: {content.director}</p>
          )}
          
          {content.summary && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-3">{content.summary}</p>
          )}
          
          {/* 별점 평가 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={20}
                  className={`cursor-pointer transition-colors ${
                    (hoveredRating || rating) >= star 
                      ? 'text-yellow-400 fill-current' 
                      : 'text-gray-300'
                  }`}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => handleStarClick(star)}
                />
              ))}
            </div>
            
            {content.rating && (
              <div className="text-sm text-gray-500">
                평점: {content.rating.toFixed(1)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-3">
            <Sparkles className="text-purple-600" size={40} />
            개인 맞춤 추천 시스템
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            당신의 취향에 맞는 완벽한 콘텐츠를 찾아드립니다
          </p>
          
          {/* 선호도 설정 버튼 */}
          <button
            onClick={() => setShowPreferenceModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 mx-auto transition-colors"
          >
            <User size={20} />
            선호도 설정
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg p-1 shadow-lg">
            <button
              onClick={() => setActiveTab('traditional')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'traditional'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-purple-600'
              }`}
            >
              <Filter className="inline mr-2" size={16} />
              전통적인 추천
            </button>
            <button
              onClick={() => setActiveTab('llm')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'llm'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-purple-600'
              }`}
            >
              <MessageSquare className="inline mr-2" size={16} />
              AI 추천
            </button>
          </div>
        </div>

        {/* 전통적인 추천 탭 */}
        {activeTab === 'traditional' && (
          <div className="space-y-8">
            <div className="text-center">
              <button
                onClick={loadTraditionalRecommendations}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-medium transition-colors"
              >
                {loading ? '추천 생성 중...' : '맞춤 추천 받기'}
              </button>
            </div>

            {Object.keys(traditionalRecommendations).length > 0 && (
              <div className="space-y-8">
                {Object.entries(traditionalRecommendations).map(([contentType, items]) => (
                  <div key={contentType} className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 capitalize">
                      {contentType === 'movies' ? '영화' :
                       contentType === 'novels' ? '웹소설' :
                       contentType === 'webtoons' ? '웹툰' :
                       contentType === 'ott' ? 'OTT 콘텐츠' :
                       contentType === 'games' ? '게임' : contentType} 추천
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {items.slice(0, 8).map((item, index) => (
                        <ContentCard
                          key={`${contentType}-${index}`}
                          content={item}
                          contentType={contentType.slice(0, -1)} // 복수형을 단수형으로
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI 추천 탭 */}
        {activeTab === 'llm' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                AI에게 추천 요청하기
              </h2>
              <p className="text-gray-600 mb-4">
                원하는 콘텐츠에 대해 자세히 설명해주세요. 
                예: "액션 영화 중에서 최근작으로 추천해주세요", "힐링되는 웹툰이 보고 싶어요"
              </p>
              
              <div className="space-y-4">
                <textarea
                  value={llmPrompt}
                  onChange={(e) => setLlmPrompt(e.target.value)}
                  placeholder="어떤 콘텐츠를 찾고 계신가요? 구체적으로 설명해주세요..."
                  className="w-full h-32 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                
                <button
                  onClick={handleLLMRecommendation}
                  disabled={loading || !llmPrompt.trim()}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-medium transition-colors"
                >
                  {loading ? 'AI가 추천 생성 중...' : 'AI 추천 받기'}
                </button>
              </div>
            </div>

            {llmResponse && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">AI 추천 결과</h3>
                <div className="prose max-w-none">
                  <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                    {llmResponse}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 선호도 설정 모달 */}
        {showPreferenceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">선호도 설정</h2>
                  <button
                    onClick={() => setShowPreferenceModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-6">
                  {/* 선호 콘텐츠 타입 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      선호하는 콘텐츠 유형
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {contentTypeOptions.map((option) => (
                        <label key={option.value} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={preferences.preferredContentTypes.includes(option.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setPreferences({
                                  ...preferences,
                                  preferredContentTypes: [...preferences.preferredContentTypes, option.value]
                                });
                              } else {
                                setPreferences({
                                  ...preferences,
                                  preferredContentTypes: preferences.preferredContentTypes.filter(t => t !== option.value)
                                });
                              }
                            }}
                            className="mr-2"
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 선호 장르 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      선호하는 장르
                    </label>
                    <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                      {genreOptions.map((genre) => (
                        <label key={genre} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={preferences.preferredGenres.includes(genre)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setPreferences({
                                  ...preferences,
                                  preferredGenres: [...preferences.preferredGenres, genre]
                                });
                              } else {
                                setPreferences({
                                  ...preferences,
                                  preferredGenres: preferences.preferredGenres.filter(g => g !== genre)
                                });
                              }
                            }}
                            className="mr-2"
                          />
                          {genre}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 연령대 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      연령대
                    </label>
                    <select
                      value={preferences.ageGroup}
                      onChange={(e) => setPreferences({...preferences, ageGroup: parseInt(e.target.value)})}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                    >
                      <option value={10}>10대</option>
                      <option value={20}>20대</option>
                      <option value={30}>30대</option>
                      <option value={40}>40대</option>
                      <option value={50}>50대 이상</option>
                    </select>
                  </div>

                  {/* 선호 연령 등급 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      선호하는 연령 등급
                    </label>
                    <select
                      value={preferences.preferredAgeRating}
                      onChange={(e) => setPreferences({...preferences, preferredAgeRating: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                    >
                      {ageRatingOptions.map((rating) => (
                        <option key={rating} value={rating}>{rating}</option>
                      ))}
                    </select>
                  </div>

                  {/* 선호 스타일 */}
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={preferences.likesNewContent}
                        onChange={(e) => setPreferences({...preferences, likesNewContent: e.target.checked})}
                        className="mr-2"
                      />
                      최신 콘텐츠 선호
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={preferences.likesClassicContent}
                        onChange={(e) => setPreferences({...preferences, likesClassicContent: e.target.checked})}
                        className="mr-2"
                      />
                      클래식 콘텐츠 선호
                    </label>
                  </div>

                  {/* 추가 정보 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      좋아하는 감독 (쉼표로 구분)
                    </label>
                    <input
                      type="text"
                      value={preferences.favoriteDirectors}
                      onChange={(e) => setPreferences({...preferences, favoriteDirectors: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                      placeholder="예: 봉준호, 크리스토퍼 놀란"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      좋아하는 작가 (쉼표로 구분)
                    </label>
                    <input
                      type="text"
                      value={preferences.favoriteAuthors}
                      onChange={(e) => setPreferences({...preferences, favoriteAuthors: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                      placeholder="예: 이말년, 조석"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      추가 메모
                    </label>
                    <textarea
                      value={preferences.additionalNotes}
                      onChange={(e) => setPreferences({...preferences, additionalNotes: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg h-20"
                      placeholder="기타 선호사항이나 특별한 요청사항을 적어주세요..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4 mt-6">
                  <button
                    onClick={() => setShowPreferenceModal(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    onClick={savePreferences}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    저장
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendationSystem;