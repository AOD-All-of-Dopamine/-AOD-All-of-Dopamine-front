import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ContentCard from './ContentCard';
import PreferenceModal from './PreferenceModal';
import RatingComponent from './RatingComponent';
import AIChat from './AIChat';
import UserDashboard from './UserDashboard';
import api from '../../api';
import './RecommendationPage.css';

const RecommendationPage = () => {
  const { user, currentUser, isAuthenticated } = useAuth();

  // user 또는 currentUser 중 존재하는 것 사용
  const activeUser = user || currentUser;

  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [contentTypes, setContentTypes] = useState(['MOVIE', 'WEBTOON', 'NOVEL', 'GAME', 'OTT']);
  const [genres, setGenres] = useState(['액션', '로맨스', '코미디', '드라마', '스릴러', '판타지', '공포', 'SF']);
  const [userPreferences, setUserPreferences] = useState(null);
  const [userRatings, setUserRatings] = useState([]);
  const [error, setError] = useState('');
  const [initialLoadCompleted, setInitialLoadCompleted] = useState(false);

  useEffect(() => {
    if (activeUser && activeUser.username && !initialLoadCompleted) {
      loadInitialData();
      setInitialLoadCompleted(true);
    }
  }, [activeUser, initialLoadCompleted]);

  const loadInitialData = async () => {
    console.log('초기 데이터 로드 시작:', activeUser);
    setLoading(true);
    setError('');

    try {
      // 기본 데이터 로드 (실패해도 계속 진행)
      await loadBasicData();

      // 사용자 데이터 로드 시도 (실패해도 계속 진행)
      await loadUserData();

      // 맞춤 추천 로드 (traditional 방식만 사용)
      await loadRecommendations();
    } catch (error) {
      console.error('초기 데이터 로드 실패:', error);
      // 에러가 있어도 기본 추천은 시도
      await generateFallbackRecommendations();
    } finally {
      setLoading(false);
    }
  };

  const loadBasicData = async () => {
    try {
      // API가 있으면 시도, 없으면 기본값 사용
      if (api.recommendations) {
        const [loadedContentTypes, loadedGenres] = await Promise.allSettled([
          api.recommendations.getContentTypes().catch(() => contentTypes),
          api.recommendations.getGenres().catch(() => genres)
        ]);

        if (loadedContentTypes.status === 'fulfilled' && Array.isArray(loadedContentTypes.value)) {
          setContentTypes(loadedContentTypes.value);
        }

        if (loadedGenres.status === 'fulfilled' && Array.isArray(loadedGenres.value)) {
          setGenres(loadedGenres.value);
        }
      }
    } catch (error) {
      console.warn('기본 데이터 로드 실패, 기본값 사용:', error);
    }
  };

  const loadUserData = async () => {
    if (!activeUser || !activeUser.username) {
      console.warn('사용자 정보가 없어 사용자 데이터를 로드할 수 없습니다.');
      return;
    }

    try {
      // 추천 시스템 API가 있는 경우에만 시도
      if (api.recommendations && api.recommendations.getUserPreferences) {
        const preferences = await api.recommendations.getUserPreferences(activeUser.username).catch(() => null);
        if (preferences) {
          setUserPreferences(preferences);
        }
      }

      if (api.recommendations && api.recommendations.getUserRatings) {
        const ratings = await api.recommendations.getUserRatings(activeUser.username).catch(() => []);
        if (Array.isArray(ratings)) {
          setUserRatings(ratings);
        }
      }
    } catch (error) {
      console.warn('사용자 데이터 로드 실패:', error);
    }
  };

  const loadRecommendations = async () => {
    if (!activeUser || !activeUser.username) {
      console.error('사용자 정보가 없습니다:', { activeUser });
      setRecommendations([]);
      setError('로그인이 필요합니다.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let data = [];
      console.log(`맞춤 추천 로드 시작, 사용자: ${activeUser.username}`);

      // 전통적 추천 시도
      if (api.recommendations && api.recommendations.getTraditionalRecommendations) {
        try {
          data = await api.recommendations.getTraditionalRecommendations(activeUser.username);
          console.log('백엔드 맞춤 추천 성공:', data);
        } catch (error) {
          console.warn('백엔드 맞춤 추천 실패, 사용자 기반 추천 생성:', error);
          data = await generateUserBasedRecommendations();
        }
      } else {
        console.log('맞춤 추천 API 없음, 사용자 기반 추천 생성');
        data = await generateUserBasedRecommendations();
      }

      console.log('맞춤 추천 로드 완료:', data);

      // 데이터 처리 및 정규화
      const normalizedData = normalizeRecommendationData(data);
      console.log('정규화된 추천 데이터:', normalizedData);

      setRecommendations(normalizedData);

      // 추천이 비어있을 때 처리
      if (normalizedData.length === 0) {
        console.log('맞춤 추천이 비어있음, 인기 콘텐츠 생성 시도');
        const fallbackData = await generatePopularContent();
        setRecommendations(fallbackData);
        setError('맞춤 추천을 위해 더 많은 콘텐츠를 평가해주세요. 현재는 인기 콘텐츠를 보여드립니다.');
      }

    } catch (error) {
      console.error('맞춤 추천 로드 실패:', error);

      // 최후의 수단: 인기 콘텐츠 생성
      try {
        const fallbackData = await generatePopularContent();
        setRecommendations(fallbackData);
        setError('추천 시스템에 일시적인 문제가 있어 인기 콘텐츠를 보여드립니다.');
      } catch (fallbackError) {
        console.error('폴백 추천도 실패:', fallbackError);
        setError('추천을 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
        setRecommendations([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // 사용자 기반 추천 생성 (평가 데이터 활용)
  const generateUserBasedRecommendations = async () => {
    console.log('사용자 기반 추천 생성 시작...');

    // 최신 평가 데이터를 API에서 직접 가져오기
    let currentUserRatings = userRatings;

    // 최신 평가 데이터 로드 시도
    if (api.recommendations && api.recommendations.getUserRatings) {
      try {
        console.log('최신 사용자 평가 데이터 로드 중...');
        const latestRatings = await api.recommendations.getUserRatings(activeUser.username);
        if (Array.isArray(latestRatings) && latestRatings.length > 0) {
          currentUserRatings = latestRatings;
          console.log('최신 평가 데이터 로드 완료:', currentUserRatings.length, '개');
        }
      } catch (error) {
        console.warn('최신 평가 데이터 로드 실패, 기존 데이터 사용:', error);
      }
    }

    if (currentUserRatings.length === 0) {
      console.log('평가 데이터가 없어 기본 추천 생성');
      return await generateFallbackRecommendations();
    }

    try {
      console.log('평가 데이터 분석 시작:', currentUserRatings.length, '개 평가');

      // 사용자가 좋아한 콘텐츠 타입과 장르 분석
      const likedContentTypes = {};
      const likedGenres = {};
      const dislikedContentTypes = {};

      currentUserRatings.forEach(rating => {
        console.log('평가 분석:', rating);

        // 4점 이상 좋아함
        if (rating.rating >= 4) {
          likedContentTypes[rating.contentType] = (likedContentTypes[rating.contentType] || 0) + 1;
          if (rating.genres && Array.isArray(rating.genres)) {
            rating.genres.forEach(genre => {
              likedGenres[genre] = (likedGenres[genre] || 0) + 1;
            });
          }
        }
        // 2점 이하 싫어함
        else if (rating.rating <= 2) {
          dislikedContentTypes[rating.contentType] = (dislikedContentTypes[rating.contentType] || 0) + 1;
        }
      });

      console.log('선호 분석 결과:', {
        likedContentTypes,
        likedGenres,
        dislikedContentTypes
      });

      // 선호하는 콘텐츠 타입 기반으로 추천 생성
      const baseRecommendations = await generateFallbackRecommendations();
      console.log('기본 추천 생성 완료:', baseRecommendations.length, '개');

      // 사용자 선호도에 따라 점수 부여하고 정렬
      const scoredRecommendations = baseRecommendations.map(item => {
        let score = Math.random() * 0.1; // 기본 랜덤 점수

        // 콘텐츠 타입 점수
        if (likedContentTypes[item.contentType]) {
          score += likedContentTypes[item.contentType] * 3;
        }

        // 싫어하는 콘텐츠 타입 감점
        if (dislikedContentTypes[item.contentType]) {
          score -= dislikedContentTypes[item.contentType] * 2;
        }

        // 장르 점수 - 안전하게 처리
        const itemGenres = item.genres || item.genre || [];
        const genresArray = Array.isArray(itemGenres) ? itemGenres :
          typeof itemGenres === 'string' ? itemGenres.split(',').map(g => g.trim()) : [];

        genresArray.forEach(genre => {
          if (likedGenres[genre]) {
            score += likedGenres[genre] * 1.5;
          }
        });

        return { ...item, score, userScore: score };
      });

      // 점수순으로 정렬하고 상위 15개 선택
      const sortedRecommendations = scoredRecommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, 15);

      console.log('사용자 기반 추천 생성 완료:', sortedRecommendations.length, '개');
      console.log('상위 3개 추천:', sortedRecommendations.slice(0, 3).map(item => ({
        title: item.title,
        contentType: item.contentType,
        score: item.score.toFixed(2)
      })));

      return sortedRecommendations;

    } catch (error) {
      console.error('사용자 기반 추천 생성 실패:', error);
      return await generateFallbackRecommendations();
    }
  };

  // 폴백 추천 생성 (API 없을 때 사용)
  const generateFallbackRecommendations = async () => {
    try {
      console.log('폴백 추천 생성 시작...');

      // 기존 콘텐츠 API에서 데이터 가져오기
      const [movies, games, webtoons, novels, netflixContent] = await Promise.allSettled([
        api.getMovies(),
        api.getSteamGames(),
        api.getWebtoons(),
        api.getNovels(),
        api.getNetflixContent()
      ]);

      const recommendations = [];

      // 각 카테고리에서 랜덤하게 2-3개씩 선택
      if (movies.status === 'fulfilled' && movies.value && movies.value.length > 0) {
        const selectedMovies = getRandomItems(movies.value, 3);
        selectedMovies.forEach(movie => {
          recommendations.push(normalizeContentItem({
            ...movie,
            contentType: 'MOVIE'
          }));
        });
      }

      if (webtoons.status === 'fulfilled' && webtoons.value && webtoons.value.length > 0) {
        const selectedWebtoons = getRandomItems(webtoons.value, 2);
        selectedWebtoons.forEach(webtoon => {
          recommendations.push(normalizeContentItem({
            ...webtoon,
            contentType: 'WEBTOON'
          }));
        });
      }

      if (novels.status === 'fulfilled' && novels.value && novels.value.length > 0) {
        const selectedNovels = getRandomItems(novels.value, 2);
        selectedNovels.forEach(novel => {
          recommendations.push(normalizeContentItem({
            ...novel,
            contentType: 'NOVEL'
          }));
        });
      }

      if (games.status === 'fulfilled' && games.value && games.value.length > 0) {
        const selectedGames = getRandomItems(games.value, 2);
        selectedGames.forEach(game => {
          recommendations.push(normalizeContentItem({
            ...game,
            contentType: 'GAME'
          }));
        });
      }

      if (netflixContent.status === 'fulfilled' && netflixContent.value && netflixContent.value.length > 0) {
        const selectedOtt = getRandomItems(netflixContent.value, 2);
        selectedOtt.forEach(ott => {
          recommendations.push(normalizeContentItem({
            ...ott,
            contentType: 'OTT',
            id: ott.content_id || ott.id
          }));
        });
      }

      console.log('폴백 추천 생성 완료:', recommendations);
      return recommendations;

    } catch (error) {
      console.error('폴백 추천 생성 실패:', error);
      return [];
    }
  };

  // 인기 콘텐츠 생성
  const generatePopularContent = async () => {
    try {
      const recommendations = await generateFallbackRecommendations();

      // 인기도 기준으로 정렬 (평점, 최신순 등)
      const sortedByPopularity = recommendations.sort((a, b) => {
        const scoreA = (a.rating || 0) + (new Date(a.releaseDate || 0).getFullYear() - 2000) * 0.1;
        const scoreB = (b.rating || 0) + (new Date(b.releaseDate || 0).getFullYear() - 2000) * 0.1;
        return scoreB - scoreA;
      });

      return sortedByPopularity.slice(0, 15);
    } catch (error) {
      console.error('인기 콘텐츠 생성 실패:', error);
      return [];
    }
  };

  // 랜덤 아이템 선택 헬퍼
  const getRandomItems = (array, count) => {
    if (!Array.isArray(array) || array.length === 0) return [];

    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, array.length));
  };

  // 백엔드 응답 데이터를 정규화하는 함수
  const normalizeRecommendationData = (data) => {
    console.log('정규화 시작 - 원본 데이터:', data);

    if (!data) return [];

    // 이미 배열인 경우
    if (Array.isArray(data)) {
      return data.map(item => normalizeContentItem(item)).filter(Boolean);
    }

    // 백엔드 응답 구조: {recommendations: {movies: [...], games: [...]}, message: "...", hasPreferences: false}
    let itemsToProcess = data;

    // 백엔드 응답에서 recommendations 추출
    if (data.recommendations && typeof data.recommendations === 'object') {
      console.log('백엔드 응답에서 recommendations 추출:', data.recommendations);
      itemsToProcess = data.recommendations;
    }

    // 객체인 경우 (백엔드에서 카테고리별로 그룹화된 데이터)
    if (typeof itemsToProcess === 'object') {
      const allItems = [];

      // 모든 카테고리의 아이템들을 하나의 배열로 합침
      Object.entries(itemsToProcess).forEach(([category, categoryItems]) => {
        console.log(`${category} 카테고리 처리:`, categoryItems);

        if (Array.isArray(categoryItems)) {
          categoryItems.forEach(item => {
            const normalizedItem = normalizeContentItem({
              ...item,
              category: category, // 카테고리 정보 추가
              contentType: mapCategoryToContentType(category) // 카테고리를 contentType으로 매핑
            });
            if (normalizedItem) {
              allItems.push(normalizedItem);
            }
          });
        }
      });

      console.log('정규화 완료:', allItems.length, '개 아이템');
      return allItems;
    }

    return [];
  };

  // 카테고리명을 contentType으로 매핑하는 헬퍼 함수
  const mapCategoryToContentType = (category) => {
    const mapping = {
      'movies': 'MOVIE',
      'games': 'GAME',
      'webtoons': 'WEBTOON',
      'novels': 'NOVEL',
      'ott': 'OTT'
    };
    return mapping[category] || category.toUpperCase();
  };

  // 개별 콘텐츠 아이템 정규화
  const normalizeContentItem = (item) => {
    if (!item) return null;

    // 장르 데이터를 안전하게 배열로 변환
    const getGenresArray = (content) => {
      const genreData = content.genres || content.genre;

      if (!genreData) return [];
      if (Array.isArray(genreData)) return genreData;
      if (typeof genreData === 'string') {
        return genreData.split(',').map(g => g.trim()).filter(g => g.length > 0);
      }
      return [];
    };

    // genres 또는 genre 필드에서 장르 데이터 추출
    const genreData = item.genres || item.genre;
    const normalizedGenres = getGenresArray(genreData);

    return {
      id: item.id || item.contentId || item.content_id || Math.random().toString(36),
      title: item.title || item.name || item.contentTitle || '제목 없음',
      contentType: item.contentType || item.type || 'UNKNOWN',
      creator: item.creator || item.author || item.director || item.developer,
      summary: item.summary || item.description || item.plot || item.shortDescription || item.short_description,
      imageUrl: item.imageUrl || item.thumbnail || item.thumbnailUrl || item.headerImage || item.header_image || item.image_url,
      rating: item.rating || item.score,
      genres: normalizedGenres, // 항상 배열로 저장
      genre: normalizedGenres,   // 호환성을 위해 양쪽 다 설정
      releaseDate: item.releaseDate || item.publishDate || item.release_year,
      ...item // 원본 데이터도 보존
    };
  };

  const handleRating = async (contentType, contentId, rating, ratingType = 'STAR', providedTitle = null) => {
    if (!activeUser || !activeUser.username) {
      setError('로그인이 필요합니다.');
      return;
    }

    try {
      // 제목 우선순위: providedTitle > 추천 목록에서 검색 > 기본값
      let contentTitle = providedTitle;

      if (!contentTitle) {
        // 추천 목록에서 해당 콘텐츠 찾기
        const content = recommendations.find(item =>
          item.id === contentId ||
          item.contentId === contentId ||
          item.content_id === contentId
        );

        contentTitle = content ? (content.title || content.name || content.contentTitle || '제목 없음') : '제목 없음';
      }

      console.log('콘텐츠 평가 시작:', {
        contentType,
        contentId,
        contentTitle,
        rating,
        ratingType
      });

      // 추천 시스템 API가 있으면 사용
      if (api.recommendations && api.recommendations.rateContent) {
        await api.recommendations.rateContent(activeUser.username, {
          contentType,
          contentId,
          contentTitle,
          rating,
          ratingType
        });

        // 사용자 데이터 다시 로드
        await loadUserData();

        // 평가된 아이템을 추천 목록에서 제거 (부드럽게)
        setTimeout(() => {
          setRecommendations(prev => prev.filter(item =>
            !(item.id === contentId || item.contentId === contentId || item.content_id === contentId)
          ));
        }, 100); // ContentCard의 애니메이션이 완료된 후

      } else {
        // 로컬에서 평가 데이터 관리
        const newRating = {
          contentType,
          contentId,
          contentTitle,
          rating,
          ratingType,
          timestamp: new Date().toISOString()
        };

        setUserRatings(prev => {
          const filtered = prev.filter(r => !(r.contentType === contentType && r.contentId === contentId));
          return [...filtered, newRating];
        });

        // 평가된 아이템을 추천 목록에서 제거
        setTimeout(() => {
          setRecommendations(prev => prev.filter(item =>
            !(item.id === contentId || item.contentId === contentId || item.content_id === contentId)
          ));
        }, 100);
      }

      console.log('평가 완료');

    } catch (error) {
      console.error('평가 실패:', error);
      setError('평가 저장에 실패했습니다.');
    }
  };

  const handlePreferenceUpdate = async (newPreferences) => {
    if (!activeUser || !activeUser.username) {
      setError('로그인이 필요합니다.');
      return;
    }

    try {
      console.log('선호도 업데이트 시작:', newPreferences);

      if (api.recommendations && api.recommendations.setUserPreferences) {
        await api.recommendations.setUserPreferences(activeUser.username, newPreferences);
      }

      setUserPreferences(newPreferences);
      setShowPreferences(false);

      // 선호도 업데이트 후 추천 다시 로드
      await loadRecommendations();

      console.log('선호도 업데이트 완료');
    } catch (error) {
      console.error('선호도 업데이트 실패:', error);
      setError('선호도 저장에 실패했습니다.');
    }
  };

  // AI 추천 처리
  const handleAIRecommendation = async (prompt) => {
    if (!activeUser || !activeUser.username) {
      setError('로그인이 필요합니다.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let data = [];

      // LLM 추천 시도
      if (api.recommendations && api.recommendations.getLLMRecommendations) {
        try {
          data = await api.recommendations.getLLMRecommendations(
            activeUser.username,
            prompt || '재미있는 콘텐츠 추천해주세요'
          );
        } catch (error) {
          console.warn('LLM 추천 실패:', error);
          setError('AI 추천 서비스를 이용할 수 없습니다.');
          return;
        }
      } else {
        setError('AI 추천 기능이 준비 중입니다.');
        return;
      }

      // 데이터 처리 및 정규화
      const normalizedData = normalizeRecommendationData(data);
      setRecommendations(normalizedData);

      if (normalizedData.length === 0) {
        setError('AI 추천을 생성할 수 없습니다.');
      }

    } catch (error) {
      console.error('AI 추천 실패:', error);
      setError('AI 추천 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 로그인되지 않은 경우
  if (!isAuthenticated || !activeUser) {
    return (
      <div className="recommendation-page">
        <div className="login-prompt">
          <h2>🎯 개인화된 추천을 받아보세요!</h2>
          <p>로그인하시면 맞춤형 콘텐츠 추천을 받을 수 있습니다.</p>
          <a href="/login" className="btn btn-primary">로그인하기</a>
        </div>
      </div>
    );
  }

  return (
    <div className="recommendation-page">
      {/* 헤더 */}
      <div className="recommendation-header">
        <div className="user-info">
          <h1>🎯 {activeUser.username || '사용자'}님을 위한 맞춤 추천</h1>
          <p>당신의 취향에 맞는 최고의 콘텐츠를 찾아드려요</p>
          {userRatings.length > 0 && (
            <small style={{ opacity: 0.8 }}>
              평가한 콘텐츠: {userRatings.length}개 | 추천 품질: {userRatings.length >= 5 ? '매우 높음' : userRatings.length >= 3 ? '높음' : '보통'}
            </small>
          )}
        </div>

        <div className="header-actions">
          <button
            className="btn btn-outline"
            onClick={() => setShowAIChat(true)}
          >
            🤖 AI 추천 채팅
          </button>
          <button
            className="btn btn-outline"
            onClick={() => setShowDashboard(true)}
          >
            📊 내 활동
          </button>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* 추천 콘텐츠 */}
      <div className="recommendation-content">
        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>맞춤 추천을 준비중입니다...</p>
          </div>
        ) : (
          <div className="content-grid">
            {Array.isArray(recommendations) && recommendations.length > 0 ? (
              recommendations.map((content, index) => (
                <ContentCard
                  key={`${content.contentType || 'content'}-${content.id || index}-${index}`}
                  content={content}
                  onRate={handleRating}
                />
              ))
            ) : (
              <div className="no-recommendations">
                <h3>😅 맞춤 추천을 준비중입니다</h3>
                <div>
                  <p>더 정확한 맞춤 추천을 위해 다음 중 하나를 해보세요:</p>
                  <ul style={{ textAlign: 'left', margin: '10px 0' }}>
                    <li>더 많은 콘텐츠에 별점 주기 (현재: {userRatings.length}개)</li>
                    <li>선호도 설정하기</li>
                    <li>AI 채팅으로 원하는 콘텐츠 설명하기</li>
                  </ul>
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      if (userRatings.length === 0) {
                        window.location.href = '/contents';
                      } else {
                        setShowPreferences(true);
                      }
                    }}
                  >
                    {userRatings.length === 0 ? '콘텐츠 평가하러 가기' : '선호도 설정하기'}
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={() => setShowAIChat(true)}
                  >
                    🤖 AI 추천 채팅
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 모달들 */}
      {showPreferences && (
        <PreferenceModal
          user={activeUser}
          currentPreferences={userPreferences}
          contentTypes={contentTypes}
          genres={genres}
          onSave={handlePreferenceUpdate}
          onClose={() => setShowPreferences(false)}
        />
      )}

      {showAIChat && (
        <AIChat
          user={activeUser}
          onRecommendation={(recommendations) => {
            if (Array.isArray(recommendations)) {
              setRecommendations(recommendations);
            } else if (typeof recommendations === 'string') {
              // AI 채팅에서 텍스트 프롬프트가 온 경우
              handleAIRecommendation(recommendations);
            }
            setShowAIChat(false);
          }}
          onClose={() => setShowAIChat(false)}
        />
      )}

      {showDashboard && (
        <UserDashboard
          user={activeUser}
          onClose={() => setShowDashboard(false)}
        />
      )}
    </div>
  );
};

export default RecommendationPage;