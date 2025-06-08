import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import api from './api';
import { Star, Heart, Bookmark, ChevronDown, Search, Filter } from 'lucide-react';

const ContentPlatform = ({ activeTab: initialActiveTab = 'movies' }) => {
  // 기존 상태 유지
  const [movies, setMovies] = useState([]);
  const [games, setGames] = useState([]);
  const [webtoons, setWebtoons] = useState([]);
  const [novels, setNovels] = useState([]);
  const [ottContent, setOttContent] = useState([]);
  const [activeTab, setActiveTab] = useState(initialActiveTab);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [contentFilter, setContentFilter] = useState('all');

  // 새로운 페이징 상태 (기본값을 true로 설정 - 성능 모드 기본 활성화)
  const [usePagination, setUsePagination] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortBy, setSortBy] = useState('rating');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedRating, setSelectedRating] = useState('all'); // 평점 필터 추가
  const itemsPerPage = 20;

  // 사용자 정보 가져오기
  const currentUser = api.auth?.getCurrentUser?.();
  const isAuthenticated = api.auth?.isAuthenticated?.() || false;

  // 초기 activeTab prop이 변경될 때 상태 업데이트
  useEffect(() => {
    if (initialActiveTab === 'netflix') {
      setActiveTab('ott');
    } else {
      setActiveTab(initialActiveTab);
    }
  }, [initialActiveTab]);

  // 기존 데이터 로딩 함수 (원본 유지)
  const fetchOriginalData = async () => {
    try {
      setLoading(true);
      console.log('데이터 요청 시작...');

      // 영화 데이터 로드
      try {
        console.log('영화 데이터 요청 시작');
        const moviesData = await api.getMovies();
        console.log('영화 데이터 응답:', moviesData);
        setMovies(Array.isArray(moviesData) ? moviesData : []);
      } catch (movieError) {
        console.error('영화 데이터 오류:', movieError);
        setError('영화 데이터 로드 오류: ' + movieError.message);
      }

      // 게임 데이터 로드
      try {
        console.log('게임 데이터 요청 시작');
        const gamesData = await api.getGames();
        console.log('게임 데이터 응답:', gamesData);
        setGames(Array.isArray(gamesData) ? gamesData : []);
      } catch (gameError) {
        console.error('게임 데이터 오류:', gameError);
        setError(prevError =>
          (prevError ? prevError + '\n' : '') + '게임 데이터 로드 오류: ' + gameError.message
        );
      }

      // 웹툰 데이터 로드
      try {
        console.log('웹툰 데이터 요청 시작');
        const webtoonsData = await api.getWebtoons();
        console.log('웹툰 데이터 응답:', webtoonsData);
        setWebtoons(Array.isArray(webtoonsData) ? webtoonsData : []);
      } catch (webtoonError) {
        console.error('웹툰 데이터 오류:', webtoonError);
        setError(prevError =>
          (prevError ? prevError + '\n' : '') + '웹툰 데이터 로드 오류: ' + webtoonError.message
        );
      }

      // 웹소설 데이터 로드
      try {
        console.log('웹소설 데이터 요청 시작');
        const novelsData = await api.getNovels();
        console.log('웹소설 데이터 응답:', novelsData);
        setNovels(Array.isArray(novelsData) ? novelsData : []);
      } catch (novelError) {
        console.error('웹소설 데이터 오류:', novelError);
        setError(prevError =>
          (prevError ? prevError + '\n' : '') + '웹소설 데이터 로드 오류: ' + novelError.message
        );
      }

      // OTT 콘텐츠 데이터 로드
      try {
        console.log('OTT 콘텐츠 데이터 요청 시작');
        const ottData = await api.getOttContent();
        console.log('OTT 콘텐츠 데이터 응답:', ottData);
        setOttContent(Array.isArray(ottData) ? ottData : []);
      } catch (ottError) {
        console.error('OTT 콘텐츠 데이터 오류:', ottError);
        setError(prevError =>
          (prevError ? prevError + '\n' : '') + 'OTT 콘텐츠 데이터 로드 오류: ' + ottError.message
        );
      }

    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 페이징 API 호출 함수 (수정됨)
  const fetchPaginatedData = async (tab, page = 1, reset = false) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        sort: sortBy,
        order: sortOrder,
        ...(selectedGenre !== 'all' && { genre: selectedGenre }),
        ...(selectedRating !== 'all' && { rating: selectedRating }), // 평점 필터 추가
        ...(searchTerm && { search: searchTerm })
      });

      const endpoints = {
        movies: 'movies',
        games: 'games',
        webtoons: 'webtoons',
        novels: 'novels',
        ott: 'ott-content'
      };

      const endpoint = endpoints[tab] || 'movies';
      const response = await fetch(`http://localhost:8080/api/${endpoint}/paginated?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('페이징 데이터 응답:', data);

      if (reset) {
        switch (tab) {
          case 'movies': setMovies(data.items || []); break;
          case 'games': setGames(data.items || []); break;
          case 'webtoons': setWebtoons(data.items || []); break;
          case 'novels': setNovels(data.items || []); break;
          case 'ott': setOttContent(data.items || []); break;
        }
      } else {
        switch (tab) {
          case 'movies': setMovies(prev => [...prev, ...(data.items || [])]); break;
          case 'games': setGames(prev => [...prev, ...(data.items || [])]); break;
          case 'webtoons': setWebtoons(prev => [...prev, ...(data.items || [])]); break;
          case 'novels': setNovels(prev => [...prev, ...(data.items || [])]); break;
          case 'ott': setOttContent(prev => [...prev, ...(data.items || [])]); break;
        }
      }

      setTotalCount(data.total || 0);
      setHasMore(data.hasNext || false);
      setCurrentPage(page);

      return data;
    } catch (error) {
      console.warn('페이징 API 실패:', error);
      throw error;
    }
  };

  // 데이터 로딩 (항상 페이징 모드 사용)
  const loadData = async (reset = false) => {
    if (loading && !reset) return;

    try {
      setLoading(reset);
      const page = reset ? 1 : currentPage + 1;
      await fetchPaginatedData(activeTab, page, reset);
    } catch (error) {
      console.warn('페이징 API 실패, 기본 API로 폴백');
      await fetchOriginalData();
    } finally {
      setLoading(false);
    }
  };

  // 초기 데이터 로드 (성능 모드가 기본이므로 페이징 방식으로 로드)
  useEffect(() => {
    loadData(true);
  }, []);

  // 탭 변경 시 페이징 데이터 새로 로드
  useEffect(() => {
    if (activeTab === 'games') {
      setSelectedGenre('all');
    }
    loadData(true);
  }, [activeTab]);

  // 검색/필터 변경 시 디바운싱
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedGenre, selectedRating, sortBy, sortOrder]);

  // 더보기 로드
  const loadMore = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      await fetchPaginatedData(activeTab, currentPage + 1, false);
    } catch (error) {
      console.error('더보기 로딩 오류:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  // 무한 스크롤
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 1000 && hasMore && !loadingMore) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadingMore, hasMore]);

  // 평가 컴포넌트 (기존과 동일)
  const RatingComponent = ({ contentType, contentId, contentTitle }) => {
    const [userRating, setUserRating] = useState(null);
    const [averageRating, setAverageRating] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [isWishlist, setIsWishlist] = useState(false);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [loading, setLoading] = useState(false);

    const loadUserRating = useCallback(async () => {
      if (!isAuthenticated || !currentUser || !contentId) return;

      try {
        const rating = await api.recommendations.getUserContentRating(currentUser.username, contentType, contentId);
        if (rating) {
          setUserRating(rating.rating);
          setIsLiked(rating.isLiked || false);
          setIsWishlist(rating.isWishlist || false);
        }
      } catch (error) {
        console.log('사용자 평가 없음');
      }
    }, [contentType, contentId]);

    const loadAverageRating = useCallback(async () => {
      if (!contentId) return;

      try {
        const result = await api.recommendations.getContentAverageRating(contentType, contentId);
        setAverageRating(result.averageRating || 0);
      } catch (error) {
        console.error('평균 평점 로드 오류:', error);
      }
    }, [contentType, contentId]);

    useEffect(() => {
      if (contentId) {
        loadAverageRating();
        if (isAuthenticated && currentUser) {
          loadUserRating();
        }
      }
    }, [contentId, loadAverageRating, loadUserRating]);

    const handleRating = async (rating) => {
      if (!isAuthenticated || !currentUser || loading) {
        alert('로그인이 필요합니다.');
        return;
      }

      setLoading(true);
      try {
        await api.recommendations.rateContent(currentUser.username, {
          contentType,
          contentId,
          contentTitle,
          rating,
          isLiked: rating >= 4,
          isWatched: true
        });

        setUserRating(rating);
        setIsLiked(rating >= 4);
        await loadAverageRating();
      } catch (error) {
        console.error('평가 저장 오류:', error);
        alert('평가 저장 중 오류가 발생했습니다.');
      }
      setLoading(false);
    };

    const handleWishlist = async () => {
      if (!isAuthenticated || !currentUser || loading) {
        alert('로그인이 필요합니다.');
        return;
      }

      setLoading(true);
      try {
        await api.recommendations.rateContent(currentUser.username, {
          contentType,
          contentId,
          contentTitle,
          isWishlist: !isWishlist
        });

        setIsWishlist(!isWishlist);
      } catch (error) {
        console.error('위시리스트 저장 오류:', error);
        alert('위시리스트 저장 중 오류가 발생했습니다.');
      }
      setLoading(false);
    };

    if (!isAuthenticated) {
      return (
        <div className="rating-component" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '10px',
          fontSize: '14px',
          color: '#666'
        }}>
          <span>평점: {averageRating.toFixed(1)}</span>
          <a href="/login" style={{ color: '#007bff', textDecoration: 'none' }}>
            로그인하여 평가하세요
          </a>
        </div>
      );
    }

    return (
      <div className="rating-component" style={{ marginTop: '10px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
          fontSize: '14px'
        }}>
          <span style={{ color: '#666' }}>평균: {averageRating.toFixed(1)}</span>
          <button
            onClick={handleWishlist}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              color: isWishlist ? '#007bff' : '#ccc',
              transition: 'color 0.2s'
            }}
            title={isWishlist ? '위시리스트에서 제거' : '위시리스트에 추가'}
          >
            <Bookmark size={16} fill={isWishlist ? 'currentColor' : 'none'} />
          </button>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={16}
                style={{
                  cursor: 'pointer',
                  color: (hoveredRating || userRating) >= star ? '#ffc107' : '#e9ecef',
                  fill: (hoveredRating || userRating) >= star ? '#ffc107' : 'none',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => handleRating(star)}
              />
            ))}
          </div>

          {isLiked && (
            <Heart
              size={16}
              style={{ color: '#dc3545', fill: '#dc3545' }}
              title="좋아하는 콘텐츠"
            />
          )}
        </div>

        {userRating && (
          <div style={{
            fontSize: '12px',
            color: '#666',
            marginTop: '4px'
          }}>
            내 평점: {userRating}점
          </div>
        )}
      </div>
    );
  };

  // 현재 탭의 데이터 가져오기 (필터링 제거)
  const getCurrentTabData = () => {
    switch (activeTab) {
      case 'movies': return movies;
      case 'games': return games;
      case 'webtoons': return webtoons;
      case 'novels': return novels;
      case 'ott': return ottContent;
      default: return [];
    }
  };

  // OTT 콘텐츠 필터링 (클라이언트 사이드에서만 contentFilter 적용)
  const filteredOttContent = activeTab === 'ott' ?
    ottContent.filter(content => {
      const matchesFilter = contentFilter === 'all' ||
        (content.type && (
          content.type.toLowerCase() === contentFilter ||
          (contentFilter === 'series' && content.type === 'TV Show') ||
          (contentFilter === 'movie' && content.type === 'Movie')
        ));
      return matchesFilter;
    }) : ottContent;

  // 로딩 중 UI
  if (loading) return (
    <div className="loading">
      <div className="loading-spinner"></div>
      <p>데이터를 불러오는 중입니다...</p>
    </div>
  );

  // 에러 발생 시 UI  
  if (error) return (
    <div className="error">
      <h2>에러가 발생했습니다</h2>
      <p>{error}</p>
      <p>서버가 실행 중인지 확인하고, CORS 설정이 제대로 되어 있는지 확인해주세요.</p>
      <button onClick={() => window.location.reload()}>다시 시도</button>
    </div>
  );

  return (
    <div className="content-platform">
      <header className="App-header">
        <div className="search-container">
          <input
            type="text"
            placeholder="검색어를 입력하세요..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

      </header>

      {/* 고급 필터 (항상 표시) */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '15px',
        margin: '20px 0',
        flexWrap: 'wrap',
        backgroundColor: '#f8f9fa',
        padding: '15px',
        borderRadius: '8px'
      }}>
        <select
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [sort, order] = e.target.value.split('-');
            setSortBy(sort);
            setSortOrder(order);
          }}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid #ccc',
            backgroundColor: '#fff'
          }}
        >
          <option value="rating-desc">평점 높은순</option>
          <option value="rating-asc">평점 낮은순</option>
          {(activeTab === 'webtoons') && (
            <>
              <option value="latest-desc">최신순</option>
              <option value="latest-asc">오래된순</option>
            </>
          )}
          <option value="title-asc">제목 A-Z</option>
          <option value="title-desc">제목 Z-A</option>
          {activeTab === 'games' && (
            <>
              <option value="price-asc">가격 낮은순</option>
              <option value="price-desc">가격 높은순</option>
            </>
          )}
        </select>

        {activeTab !== 'games' && (
          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #ccc',
              backgroundColor: '#fff'
            }}
          >
            <option value="all">전체 장르</option>
            {activeTab === 'webtoons' ? (
              // 웹툰 전용 장르
              <>
                <option value="#액션">액션</option>
                <option value="#무협/사극">무협/사극</option>
                <option value="#로맨스">로맨스</option>
                <option value="#드라마">드라마</option>
                <option value="#스릴러">스릴러/미스터리</option>
                <option value="#일상">일상/힐링</option>
                <option value="#판타지">판타지</option>
                <option value="#청춘">학원/청춘</option>
              </>
            ) : activeTab === 'ott' ? (
              // OTT 전용 장르 (실제 DB 값)
              <>
                <option value="코미디 시리즈,">코미디</option>
                <option value="액션 & 어드벤처 시리즈,">액션 & 어드벤처</option>
                <option value="스릴러 시리즈,">스릴러</option>
                <option value="범죄 시리즈,">범죄</option>
                <option value="미스터리 시리즈,">미스터리</option>
                <option value="로맨틱한 드라마,">로맨스</option>
                <option value="애니 시리즈,">애니메이션</option>
                <option value="한국 드라마">한국 드라마</option>
                <option value="리얼리티 시리즈">리얼리티 예능</option>
              </>
            ) : (
              // 영화, OTT용 장르
              <>
                <option value="액션">액션</option>
                <option value="드라마">드라마</option>
                <option value="코미디">코미디</option>
                <option value="로맨스">로맨스</option>
                <option value="스릴러">스릴러</option>
                <option value="판타지">판타지</option>
                <option value="다큐멘터리">다큐멘터리</option>
                <option value="범죄">범죄</option>
                <option value="호러">호러</option>
                <option value="애니메이션">애니메이션</option>
              </>
            )}
          </select>
        )}

      </div>

      <main className="content-container">
        {/* 콘텐츠가 없을 경우 표시할 메시지 */}
        {!loading && getCurrentTabData().length === 0 && (
          <div className="no-content-message" style={{ textAlign: 'center', padding: '50px' }}>
            <h2>데이터가 없습니다</h2>
            <p>서버에서 데이터를 가져오지 못했습니다. 다음을 확인해보세요:</p>
            <ul style={{ listStyle: 'inside', textAlign: 'left', maxWidth: '500px', margin: '0 auto' }}>
              <li>백엔드 서버가 실행 중인지 확인</li>
              <li>API 경로가 올바른지 확인</li>
              <li>데이터베이스에 데이터가 있는지 확인</li>
              <li>브라우저 콘솔에서 오류 메시지 확인</li>
            </ul>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              새로고침
            </button>
          </div>
        )}

        {activeTab === 'movies' ? (
          <div className="movies-grid">
            {movies.length > 0 ? (
              movies.map(movie => (
                <div key={movie.id} className="movie-card">
                  <div className="thumbnail">
                    {movie.image_url ? (
                      <img src={movie.image_url} alt={movie.title} />
                    ) : (
                      <div className="no-image">이미지 없음</div>
                    )}
                  </div>
                  <div className="movie-info">
                    <h3>{movie.title}</h3>
                    <p className="director"><strong>감독:</strong> {movie.director || '정보 없음'}</p>
                    <div className="movie-meta">
                      <span className="rating">평점: {movie.rating ? movie.rating.toFixed(1) : 'N/A'}</span>
                      <span className="age-rating">{movie.age_rating || ''}</span>
                    </div>
                    <p className="country">{movie.country || ''}</p>
                    <p className="running-time">{movie.running_time ? `${movie.running_time}분` : ''}</p>
                    <p className="actors"><strong>출연:</strong> {movie.actors || '정보 없음'}</p>
                    <p className="genres"><strong>장르:</strong> {movie.genres || '정보 없음'}</p>

                    <RatingComponent
                      contentType="movie"
                      contentId={movie.id}
                      contentTitle={movie.title}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="no-results">검색 결과가 없습니다.</div>
            )}
          </div>
        ) : activeTab === 'games' ? (
          <div className="games-grid">
            {games.length > 0 ? (
              games.map(game => (
                <div key={game.id} className="game-card">
                  <div className="game-images">
                    {game.image_url ? (
                      <img src={game.image_url} alt={game.title} className="header-image" />
                    ) : (
                      <div className="no-image">이미지 없음</div>
                    )}
                  </div>
                  <div className="game-info">
                    <h3>{game.title}</h3>
                    <div className="game-price">
                      {game.final_price !== null ? (
                        <span className="price">₩{(game.final_price || 0).toLocaleString()}</span>
                      ) : (
                        <span className="price">가격 정보 없음</span>
                      )}
                      {(game.initial_price !== null && game.initial_price > game.final_price) && (
                        <span className="original-price">₩{(game.initial_price || 0).toLocaleString()}</span>
                      )}
                    </div>
                    <p className="short-description">{game.summary || '설명 없음'}</p>
                    <div className="game-meta">
                      {game.required_age > 0 && (
                        <span className="age-rating">{game.required_age}세 이상</span>
                      )}
                      <span className="platform">플랫폼: {game.platform || 'PC'}</span>
                    </div>
                    <p className="publishers"><strong>퍼블리셔:</strong> {game.publishers || '정보 없음'}</p>
                    <p className="developers"><strong>개발사:</strong> {game.developers || '정보 없음'}</p>

                    <RatingComponent
                      contentType="game"
                      contentId={game.id}
                      contentTitle={game.title}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="no-results">검색 결과가 없습니다.</div>
            )}
          </div>
        ) : activeTab === 'webtoons' ? (
          <div className="webtoons-grid">
            {webtoons.length > 0 ? (
              webtoons.map(webtoon => (
                <div key={webtoon.id} className="webtoon-card">
                  <div className="thumbnail">
                    {webtoon.image_url ? (
                      <img src={webtoon.image_url} alt={webtoon.title} />
                    ) : (
                      <div className="no-image">이미지 없음</div>
                    )}
                  </div>
                  <div className="webtoon-info">
                    <h3>{webtoon.title}</h3>
                    <p className="creators"><strong>작가:</strong> {webtoon.authors || '정보 없음'}</p>
                    {webtoon.publish_date && (
                      <p className="publish-date">
                        <strong>연재시작:</strong> {
                          webtoon.publish_date.replace(/^(\d{2})\.(\d{2})\.(\d{2})$/, (match, year, month, day) => {
                            const fullYear = parseInt(year) < 50 ? `20${year}` : `19${year}`;
                            return `${fullYear}. ${parseInt(month)}. ${parseInt(day)}.`;
                          })
                        }
                      </p>
                    )}
                    <div className="webtoon-meta">
                      <span className="summary">{webtoon.summary || '줄거리 정보 없음'}</span>
                    </div>
                    <p className="genres"><strong>장르:</strong> {webtoon.genres || '정보 없음'}</p>
                    <p className="platform">플랫폼: {webtoon.platform || '정보 없음'}</p>

                    <RatingComponent
                      contentType="webtoon"
                      contentId={webtoon.id}
                      contentTitle={webtoon.title}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="no-results">검색 결과가 없습니다.</div>
            )}
          </div>
        ) : activeTab === 'novels' ? (
          <div className="novels-grid">
            {novels.length > 0 ? (
              novels.map(novel => (
                <div key={novel.id} className="novel-card">
                  <div className="thumbnail">
                    {novel.image_url ? (
                      <img src={novel.image_url} alt={novel.title} />
                    ) : (
                      <div className="no-image">이미지 없음</div>
                    )}
                  </div>
                  <div className="novel-info">
                    <h3>{novel.title}</h3>
                    <p className="authors"><strong>작가:</strong> {novel.authors || '정보 없음'}</p>
                    <div className="novel-meta">
                      <span className="age-rating">{novel.age_rating || '연령 제한 없음'}</span>
                      <span className="publisher">{novel.publisher || '출판사 정보 없음'}</span>
                    </div>
                    <div className="status-badge" style={{
                      display: 'inline-block',
                      padding: '3px 8px',
                      backgroundColor: novel.status === '연재중' ? '#4CAF50' : '#FF9800',
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '12px',
                      marginTop: '10px'
                    }}>
                      {novel.status || '상태 정보 없음'}
                    </div>
                    <p className="description" style={{ marginTop: '15px' }}>
                      {novel.summary || '줄거리 정보가 없습니다.'}
                    </p>
                    <p className="genres"><strong>장르:</strong> {novel.genres || '정보 없음'}</p>

                    <RatingComponent
                      contentType="novel"
                      contentId={novel.id}
                      contentTitle={novel.title}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="no-results">검색 결과가 없습니다.</div>
            )}
          </div>
        ) : activeTab === 'ott' ? (
          <div className="movies-grid">
            {filteredOttContent.length > 0 ? (
              filteredOttContent.map((content, index) => (
                <div key={content.id || index} className="movie-card">
                  <div className="thumbnail">
                    {content.image_url || content.thumbnail ? (
                      <img src={content.image_url || content.thumbnail} alt={content.title} />
                    ) : (
                      <div className="no-image">이미지 없음</div>
                    )}
                  </div>
                  <div className="movie-info">
                    <h3>{content.title}</h3>
                    <div className="movie-meta">
                      <span className={`type ${content.type || ''}`}>
                        {content.type === 'Movie' ? '영화' :
                          content.type === 'TV Show' ? 'TV 쇼' :
                            content.type === 'documentary' ? '다큐멘터리' :
                              content.type || '정보 없음'}
                      </span>
                      <span className="year">{content.release_year || ''}</span>
                    </div>
                    <div className="movie-meta">
                      <span>시청 등급: {content.maturity_rating || 'N/A'}</span>
                    </div>
                    <p className="description">{content.description || '줄거리 정보 없음'}</p>
                    <div className="creator-info">
                      <span className="creator"><strong>제작:</strong> {content.creator || '정보 없음'}</span>
                    </div>
                    <p className="actors"><strong>출연:</strong> {content.actors || '정보 없음'}</p>
                    <p className="genres"><strong>장르:</strong> {content.genres || '정보 없음'}</p>

                    <RatingComponent
                      contentType="ott"
                      contentId={content.id}
                      contentTitle={content.title}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="no-results">
                {ottContent.length === 0 ? 'OTT 콘텐츠 데이터가 없습니다.' : '검색 결과가 없습니다.'}
                <div style={{ fontSize: '12px', marginTop: '10px', color: '#666' }}>
                  전체 OTT 콘텐츠 수: {ottContent.length}, 필터링된 콘텐츠 수: {filteredOttContent.length}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* 무한 스크롤 로딩 표시 */}
        {loadingMore && (
          <div style={{
            textAlign: 'center',
            padding: '20px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div className="loading-spinner" style={{ width: '20px', height: '20px' }}></div>
            <span>더 많은 콘텐츠를 불러오는 중...</span>
          </div>
        )}

        {/* 더 이상 데이터가 없을 때 */}
        {!hasMore && getCurrentTabData().length > 0 && (
          <div style={{
            textAlign: 'center',
            padding: '20px',
            color: '#666',
            fontSize: '14px'
          }}>
            모든 콘텐츠를 확인했습니다
          </div>
        )}

        {/* 수동 더보기 버튼 */}
        {hasMore && !loadingMore && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <button
              onClick={loadMore}
              style={{
                padding: '12px 24px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
            >
              더보기
            </button>
          </div>
        )}
      </main>

      <div className="home-container">
        <div className="category-links">
          <div className="category-card" onClick={() => setActiveTab('ott')} style={{ cursor: 'pointer' }}>
            <h2>OTT 콘텐츠</h2>
            <p>다양한 OTT 콘텐츠를 살펴보세요</p>
          </div>
          <div className="category-card" onClick={() => setActiveTab('webtoons')} style={{ cursor: 'pointer' }}>
            <h2>웹툰</h2>
            <p>인기 웹툰 모음</p>
          </div>
          <div className="category-card" onClick={() => setActiveTab('novels')} style={{ cursor: 'pointer' }}>
            <h2>웹소설</h2>
            <p>인기 웹소설 모음</p>
          </div>
          <div className="category-card" onClick={() => setActiveTab('movies')} style={{ cursor: 'pointer' }}>
            <h2>영화</h2>
            <p>최신 영화 정보</p>
          </div>
          <div className="category-card" onClick={() => setActiveTab('games')} style={{ cursor: 'pointer' }}>
            <h2>게임</h2>
            <p>인기 게임 정보</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentPlatform;