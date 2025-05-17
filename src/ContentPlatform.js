import React, { useState, useEffect } from 'react';
import './App.css';
import api from './api';

const ContentPlatform = ({ activeTab: initialActiveTab = 'movies' }) => {
  const [movies, setMovies] = useState([]);
  const [steamGames, setSteamGames] = useState([]);
  const [webtoons, setWebtoons] = useState([]);
  const [novels, setNovels] = useState([]);
  const [netflixContent, setNetflixContent] = useState([]);
  const [activeTab, setActiveTab] = useState(initialActiveTab);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [contentFilter, setContentFilter] = useState('all'); // 넷플릭스 콘텐츠 필터링을 위한 상태

  // 초기 activeTab prop이 변경될 때 상태 업데이트
  useEffect(() => {
    setActiveTab(initialActiveTab);
  }, [initialActiveTab]);

  useEffect(() => {
    // 모든 데이터 가져오기
    const fetchData = async () => {
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
        
        // 스팀 게임 데이터 로드
        try {
          console.log('게임 데이터 요청 시작');
          const gamesData = await api.getSteamGames();
          console.log('게임 데이터 응답:', gamesData);
          setSteamGames(Array.isArray(gamesData) ? gamesData : []);
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
        
        // 넷플릭스 콘텐츠 데이터 로드
        try {
          console.log('넷플릭스 데이터 요청 시작');
          const netflixData = await api.getNetflixContent();
          console.log('넷플릭스 데이터 응답:', netflixData);
          setNetflixContent(Array.isArray(netflixData) ? netflixData : []);
        } catch (netflixError) {
          console.error('넷플릭스 데이터 오류:', netflixError);
          setError(prevError => 
            (prevError ? prevError + '\n' : '') + '넷플릭스 데이터 로드 오류: ' + netflixError.message
          );
        }
        
        setLoading(false);
      } catch (error) {
        setError(error.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 검색 필터링
  const filteredMovies = movies && movies.length ? movies.filter(movie => 
    movie.title && movie.title.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const filteredGames = steamGames && steamGames.length ? steamGames.filter(game => 
    game.title && game.title.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const filteredWebtoons = webtoons && webtoons.length ? webtoons.filter(webtoon => 
    webtoon.title && webtoon.title.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const filteredNovels = novels && novels.length ? novels.filter(novel => 
    novel.title && novel.title.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const filteredNetflixContent = netflixContent && netflixContent.length ? 
    netflixContent.filter(content => {
      const matchesSearch = content.title && content.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = contentFilter === 'all' || (content.type && content.type.toLowerCase() === contentFilter);
      return matchesSearch && matchesFilter;
    }) : [];

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
        <h1>콘텐츠 통합 플랫폼</h1>
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

      {/* 디버그 정보 */}
      <div className="debug-info" style={{padding: '20px', background: '#f8f9fa', margin: '20px 0', border: '1px solid #ddd', borderRadius: '5px'}}>
        <h3>디버그 정보</h3>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: '20px'}}>
          <div style={{flex: 1, minWidth: '300px'}}>
            <h4>API 상태</h4>
            <ul style={{listStyle: 'none', padding: 0}}>
              <li><strong>로딩 상태:</strong> {loading ? '로딩 중' : '완료'}</li>
              <li><strong>오류:</strong> {error ? error : '없음'}</li>
              <li><strong>영화 데이터:</strong> {movies ? movies.length : 0}개</li>
              <li><strong>게임 데이터:</strong> {steamGames ? steamGames.length : 0}개</li>
              <li><strong>웹툰 데이터:</strong> {webtoons ? webtoons.length : 0}개</li>
              <li><strong>웹소설 데이터:</strong> {novels ? novels.length : 0}개</li>
              <li><strong>넷플릭스 데이터:</strong> {netflixContent ? netflixContent.length : 0}개</li>
              <li><strong>현재 탭:</strong> {activeTab}</li>
            </ul>
            <div style={{display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap'}}>
              <button 
                onClick={() => console.log('Movies:', movies)}
                style={{padding: '5px 10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px'}}
              >
                영화 데이터 로그
              </button>
              <button 
                onClick={() => console.log('Games:', steamGames)}
                style={{padding: '5px 10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px'}}
              >
                게임 데이터 로그
              </button>
              <button 
                onClick={() => console.log('Webtoons:', webtoons)}
                style={{padding: '5px 10px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px'}}
              >
                웹툰 데이터 로그
              </button>
              <button 
                onClick={() => console.log('Novels:', novels)}
                style={{padding: '5px 10px', backgroundColor: '#6f42c1', color: 'white', border: 'none', borderRadius: '4px'}}
              >
                웹소설 데이터 로그
              </button>
              <button 
                onClick={() => console.log('Netflix:', netflixContent)}
                style={{padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px'}}
              >
                넷플릭스 데이터 로그
              </button>
              <button 
                onClick={() => window.location.reload()}
                style={{padding: '5px 10px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px'}}
              >
                새로고침
              </button>
            </div>
          </div>
          
          <div style={{flex: 1, minWidth: '300px'}}>
            <h4>API 요청 정보</h4>
            <p><strong>영화 API URL:</strong> http://localhost:8080/api/movies</p>
            <p><strong>게임 API URL:</strong> http://localhost:8080/api/steam-games</p>
            <p><strong>웹툰 API URL:</strong> http://localhost:8080/api/webtoons</p>
            <p><strong>웹소설 API URL:</strong> http://localhost:8080/api/novels</p>
            <p><strong>넷플릭스 API URL:</strong> http://localhost:8080/api/netflix-content</p>
            <p><strong>조회 시간:</strong> {new Date().toLocaleTimeString()}</p>
            
            <div style={{marginTop: '15px'}}>
              <h4>수동 API 테스트</h4>
              <p>브라우저에서 직접 API 호출:</p>
              <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                <a 
                  href="http://localhost:8080/api/movies" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    padding: '5px 10px',
                    backgroundColor: '#17a2b8',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '4px'
                  }}
                >
                  영화 API 열기
                </a>
                <a 
                  href="http://localhost:8080/api/steam-games" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    padding: '5px 10px',
                    backgroundColor: '#17a2b8',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '4px'
                  }}
                >
                  게임 API 열기
                </a>
                <a 
                  href="http://localhost:8080/api/webtoons" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    padding: '5px 10px',
                    backgroundColor: '#17a2b8',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '4px'
                  }}
                >
                  웹툰 API 열기
                </a>
                <a 
                  href="http://localhost:8080/api/novels" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    padding: '5px 10px',
                    backgroundColor: '#17a2b8',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '4px'
                  }}
                >
                  웹소설 API 열기
                </a>
                <a 
                  href="http://localhost:8080/api/netflix-content" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    padding: '5px 10px',
                    backgroundColor: '#17a2b8',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '4px'
                  }}
                >
                  넷플릭스 API 열기
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="tab-container">
        <button 
          className={`tab-button ${activeTab === 'movies' ? 'active' : ''}`}
          onClick={() => setActiveTab('movies')}
        >
          영화
        </button>
        <button 
          className={`tab-button ${activeTab === 'games' ? 'active' : ''}`}
          onClick={() => setActiveTab('games')}
        >
          스팀 게임
        </button>
        <button 
          className={`tab-button ${activeTab === 'webtoons' ? 'active' : ''}`}
          onClick={() => setActiveTab('webtoons')}
        >
          웹툰
        </button>
        <button 
          className={`tab-button ${activeTab === 'novels' ? 'active' : ''}`}
          onClick={() => setActiveTab('novels')}
        >
          웹소설
        </button>
        <button 
          className={`tab-button ${activeTab === 'netflix' ? 'active' : ''}`}
          onClick={() => setActiveTab('netflix')}
        >
          넷플릭스
        </button>
      </div>

      {/* 넷플릭스 탭 활성화 시 추가 필터링 옵션 */}
      {activeTab === 'netflix' && (
        <div className="netflix-filters" style={{ display: 'flex', justifyContent: 'center', margin: '0 0 20px' }}>
          <select 
            value={contentFilter} 
            onChange={(e) => setContentFilter(e.target.value)}
            style={{ 
              padding: '8px 15px',
              borderRadius: '20px',
              border: '1px solid #ccc',
              backgroundColor: '#fff',
              marginRight: '10px'
            }}
          >
            <option value="all">모든 콘텐츠</option>
            <option value="movie">영화</option>
            <option value="series">시리즈</option>
            <option value="documentary">다큐멘터리</option>
          </select>
        </div>
      )}

      <main className="content-container">
        {/* 콘텐츠가 없을 경우 표시할 메시지 */}
        {!loading && movies.length === 0 && steamGames.length === 0 && webtoons.length === 0 && novels.length === 0 && netflixContent.length === 0 && (
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
            {filteredMovies.length > 0 ? (
              filteredMovies.map(movie => (
                <div key={movie.id} className="movie-card">
                  <div className="thumbnail">
                    {movie.thumbnailUrl || movie.thumbnail_url ? (
                      <img src={movie.thumbnailUrl || movie.thumbnail_url} alt={movie.title} />
                    ) : (
                      <div className="no-image">이미지 없음</div>
                    )}
                  </div>
                  <div className="movie-info">
                    <h3>{movie.title}</h3>
                    <p className="director"><strong>감독:</strong> {movie.director || '정보 없음'}</p>
                    <div className="movie-meta">
                      <span className="rating">평점: {movie.rating ? movie.rating.toFixed(1) : 'N/A'}</span>
                      <span className="age-rating">{movie.ageRating || movie.age_rating || ''}</span>
                    </div>
                    <p className="country">{movie.country || ''}</p>
                    <p className="running-time">{movie.runningTime || movie.running_time ? `${movie.runningTime || movie.running_time}분` : ''}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-results">검색 결과가 없습니다.</div>
            )}
          </div>
        ) : activeTab === 'games' ? (
          <div className="games-grid">
            {filteredGames.length > 0 ? (
              filteredGames.map(game => (
                <div key={game.id} className="game-card">
                  <div className="game-images">
                    {game.headerImage || game.header_image ? (
                      <img src={game.headerImage || game.header_image} alt={game.title} className="header-image" />
                    ) : (
                      <div className="no-image">이미지 없음</div>
                    )}
                  </div>
                  <div className="game-info">
                    <h3>{game.title}</h3>
                    <div className="game-price">
                      {(game.finalPrice !== null || game.final_price !== null) ? (
                        <span className="price">₩{(game.finalPrice || game.final_price || 0).toLocaleString()}</span>
                      ) : (
                        <span className="price">가격 정보 없음</span>
                      )}
                      {((game.initialPrice !== null && game.initialPrice > game.finalPrice) || 
                        (game.initial_price !== null && game.initial_price > game.final_price)) && (
                        <span className="original-price">₩{(game.initialPrice || game.initial_price || 0).toLocaleString()}</span>
                      )}
                    </div>
                    <p className="short-description">{game.shortDescription || game.short_description || '설명 없음'}</p>
                    <div className="game-meta">
                      {(game.requiredAge > 0 || game.required_age > 0) && (
                        <span className="age-rating">{game.requiredAge || game.required_age}세 이상</span>
                      )}
                      {(game.supportedLanguages || game.supported_languages) && (
                        <span className="languages">지원 언어: {(game.supportedLanguages || game.supported_languages).split(',')[0]}</span>
                      )}
                    </div>
                    {(game.website) && (
                      <a href={game.website} target="_blank" rel="noopener noreferrer" className="website-link">
                        웹사이트 방문
                      </a>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-results">검색 결과가 없습니다.</div>
            )}
          </div>
        ) : activeTab === 'webtoons' ? (
          <div className="webtoons-grid">
            {filteredWebtoons.length > 0 ? (
              filteredWebtoons.map(webtoon => (
                <div key={webtoon.id} className="webtoon-card">
                  <div className="thumbnail">
                    {webtoon.thumbnail ? (
                      <img src={webtoon.thumbnail} alt={webtoon.title} />
                    ) : (
                      <div className="no-image">이미지 없음</div>
                    )}
                  </div>
                  <div className="webtoon-info">
                    <h3>{webtoon.title}</h3>
                    <p className="creator"><strong>작가:</strong> {webtoon.creator || '정보 없음'}</p>
                    <div className="webtoon-meta">
                      <span className="summary">{webtoon.summary || '줄거리 정보 없음'}</span>
                    </div>
                    {webtoon.url && (
                      <a href={webtoon.url} target="_blank" rel="noopener noreferrer" className="website-link">
                        웹툰 보기
                      </a>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-results">검색 결과가 없습니다.</div>
            )}
          </div>
        ) : activeTab === 'novels' ? (
          <div className="novels-grid">
            {filteredNovels.length > 0 ? (
              filteredNovels.map(novel => (
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
                      {novel.description || '줄거리 정보가 없습니다.'}
                    </p>
                    {novel.url && (
                      <a href={novel.url} target="_blank" rel="noopener noreferrer" className="website-link" style={{
                        marginTop: '15px',
                        display: 'inline-block'
                      }}>
                        소설 읽기
                      </a>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-results">검색 결과가 없습니다.</div>
            )}
          </div>
        ) : activeTab === 'netflix' ? (
          <div className="netflix-grid">
            {filteredNetflixContent.length > 0 ? (
              filteredNetflixContent.map(content => (
                <div key={content.content_id} className="netflix-card">
                  <div className="thumbnail">
                    {content.thumbnail ? (
                      <img src={content.thumbnail} alt={content.title} />
                    ) : (
                      <div className="no-image">이미지 없음</div>
                    )}
                  </div>
                  <div className="netflix-info">
                    <h3>{content.title}</h3>
                    <div className="netflix-meta">
                      <span className={`type ${content.type}`}>
                        {content.type === 'movie' ? '영화' : 
                         content.type === 'series' ? '시리즈' : 
                         content.type === 'documentary' ? '다큐멘터리' : content.type}
                      </span>
                      <span className="year">{content.release_year || ''}</span>
                    </div>
                    <div className="maturity-rating">
                      <span>시청 등급: {content.maturity_rating || 'N/A'}</span>
                    </div>
                    <p className="description">{content.description || '줄거리 정보 없음'}</p>
                    <div className="creator-info">
                      <span className="creator"><strong>제작:</strong> {content.creator || '정보 없음'}</span>
                    </div>
                    {content.main_url && (
                      <a href={content.main_url} target="_blank" rel="noopener noreferrer" className="website-link netflix">
                        넷플릭스에서 보기
                      </a>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-results">검색 결과가 없습니다.</div>
            )}
          </div>
        ) : null}
      </main>

      <div className="home-container">
        <div className="category-links">
          <div className="category-card" onClick={() => setActiveTab('netflix')} style={{ cursor: 'pointer' }}>
            <h2>넷플릭스 콘텐츠</h2>
            <p>다양한 넷플릭스 컨텐츠를 살펴보세요</p>
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