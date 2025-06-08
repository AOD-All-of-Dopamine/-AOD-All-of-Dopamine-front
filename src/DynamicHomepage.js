import React, { useState, useEffect } from 'react';
import { Star, Heart, Bookmark, Play, ArrowRight, Film, Gamepad2, BookOpen, Tv } from 'lucide-react';

const DynamicHomepage = () => {
  const [allContent, setAllContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalContentCount, setTotalContentCount] = useState(0);

  // API 호출 함수들 (기존 ContentPlatform에서 가져옴)
  const fetchAllContent = async () => {
    try {
      setLoading(true);
      console.log('모든 콘텐츠 데이터 요청 시작...');

      // 통계 API를 먼저 호출해서 전체 개수 가져오기
      try {
        const statsResponse = await fetch('http://localhost:8080/admin/statistics/overview');
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          console.log('통계 데이터:', statsData);
          
          // 전체 콘텐츠 수 계산
          const total = (statsData.movies || 0) + (statsData.games || 0) + 
                       (statsData.webtoons || 0) + (statsData.novels || 0) + 
                       (statsData.ottContent || 0);
          setTotalContentCount(total);
        }
      } catch (statsError) {
        console.warn('통계 API 오류, 기본값 사용:', statsError);
        setTotalContentCount(3536); // 기본값으로 설정
      }

      const contentPromises = [
        // 영화 데이터
        fetch('http://localhost:8080/api/movies').then(res => res.json()).then(data => 
          Array.isArray(data) ? data.slice(0, 20).map(item => ({...item, type: 'movie'})) : []
        ).catch(() => []),
        
        // 게임 데이터
        fetch('http://localhost:8080/api/games').then(res => res.json()).then(data => 
          Array.isArray(data) ? data.slice(0, 20).map(item => ({...item, type: 'game'})) : []
        ).catch(() => []),
        
        // 웹툰 데이터
        fetch('http://localhost:8080/api/webtoons').then(res => res.json()).then(data => 
          Array.isArray(data) ? data.slice(0, 20).map(item => ({...item, type: 'webtoon'})) : []
        ).catch(() => []),
        
        // 웹소설 데이터
        fetch('http://localhost:8080/api/novels').then(res => res.json()).then(data => 
          Array.isArray(data) ? data.slice(0, 20).map(item => ({...item, type: 'novel'})) : []
        ).catch(() => []),
        
        // OTT 콘텐츠 데이터
        fetch('http://localhost:8080/api/ott-content').then(res => res.json()).then(data => 
          Array.isArray(data) ? data.slice(0, 20).map(item => ({...item, type: 'ott'})) : []
        ).catch(() => [])
      ];

      const results = await Promise.all(contentPromises);
      const combinedContent = results.flat();
      
      // 콘텐츠를 섞어서 3줄로 나누기
      const shuffled = [...combinedContent].sort(() => Math.random() - 0.5);
      setAllContent(shuffled);
      
    } catch (error) {
      console.error('데이터 로딩 오류:', error);
      setError('콘텐츠를 불러오는 중 오류가 발생했습니다.');
      setTotalContentCount(3536); // 오류 시에도 기본값 설정
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllContent();
  }, []);

  // 타입별 아이콘 가져오기
  const getTypeIcon = (type) => {
    switch(type) {
      case 'movie': return <Film size={16} />;
      case 'game': return <Gamepad2 size={16} />;
      case 'webtoon': return <BookOpen size={16} />;
      case 'novel': return <BookOpen size={16} />;
      case 'ott': return <Tv size={16} />;
      default: return <Play size={16} />;
    }
  };

  // 타입별 한글 이름
  const getTypeName = (type) => {
    switch(type) {
      case 'movie': return '영화';
      case 'game': return '게임';
      case 'webtoon': return '웹툰';
      case 'novel': return '웹소설';
      case 'ott': return 'OTT';
      default: return '콘텐츠';
    }
  };

  // 3줄로 콘텐츠 나누기
  const divideIntoRows = (content) => {
    const rowSize = Math.ceil(content.length / 3);
    return [
      content.slice(0, rowSize),
      content.slice(rowSize, rowSize * 2),
      content.slice(rowSize * 2)
    ];
  };

  const rows = divideIntoRows(allContent);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p>다양한 콘텐츠를 불러오는 중...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '50px',
        color: '#dc3545'
      }}>
        <h3>{error}</h3>
        <p>서버가 실행 중인지 확인해주세요.</p>
        <button
          onClick={fetchAllContent}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      overflow: 'hidden',
      backgroundColor: '#1a202c',
      paddingBottom: '60px'
    }}>
      {/* 헤더 섹션 */}
      <div style={{
        textAlign: 'center',
        marginBottom: '40px',
        padding: '60px 20px 20px'
      }}>
        <h2 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          color: '#e2e8f0',
          marginBottom: '10px'
        }}>
          다양한 콘텐츠를 자세히 살펴보세요
        </h2>
        <p style={{
          fontSize: '1.2rem',
          color: '#a0aec0',
          marginBottom: '20px'
        }}>
          영화, 게임, 웹툰, 웹소설, OTT 콘텐츠까지 - 총 {totalContentCount.toLocaleString()}개의 큐레이션된 콘텐츠
        </p>
      </div>

      {/* 3줄 스크롤링 콘텐츠 */}
      <div style={{ position: 'relative', marginBottom: '60px' }}>
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            style={{
              display: 'flex',
              gap: '20px',
              marginBottom: '20px',
              animation: `scrollRow${rowIndex} ${30 + rowIndex * 5}s linear infinite`,
              willChange: 'transform'
            }}
          >
            {/* 원본 콘텐츠 + 복제본으로 무한 스크롤 */}
            {row.concat(row).concat(row).map((content, index) => (
              <div
                key={`${content.id}-${index}`}
                style={{
                  minWidth: '280px',
                  height: '180px',
                  backgroundColor: 'rgba(45, 55, 72, 0.95)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  display: 'flex',
                  cursor: 'pointer',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
                }}
              >
                {/* 이미지 섹션 */}
                <div style={{
                  width: '120px',
                  height: '100%',
                  overflow: 'hidden',
                  position: 'relative',
                  backgroundColor: '#374151'
                }}>
                  {content.image_url ? (
                    <img
                      src={content.image_url}
                      alt={content.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: 'center'
                      }}
                      onError={(e) => {
                        // 이미지 로딩 실패 시 placeholder로 교체
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                      onLoad={(e) => {
                        // 이미지 로딩 성공 시 placeholder 숨김
                        if (e.target.nextSibling) {
                          e.target.nextSibling.style.display = 'none';
                        }
                      }}
                    />
                  ) : null}
                  
                  {/* Fallback placeholder - 이미지 없거나 로딩 실패 시 */}
                  <div style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#374151',
                    display: content.image_url ? 'none' : 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9ca3af',
                    flexDirection: 'column',
                    fontSize: '12px'
                  }}>
                    {getTypeIcon(content.type)}
                    <span style={{ marginTop: '4px', fontSize: '10px' }}>
                      {getTypeName(content.type)}
                    </span>
                  </div>
                  
                  {/* 타입 배지 */}
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    backgroundColor: content.type === 'movie' ? '#ef4444' :
                                    content.type === 'game' ? '#8b5cf6' :
                                    content.type === 'webtoon' ? '#f59e0b' :
                                    content.type === 'novel' ? '#10b981' : '#3b82f6',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                  }}>
                    {getTypeIcon(content.type)}
                    {getTypeName(content.type)}
                  </div>
                </div>

                {/* 정보 섹션 */}
                <div style={{
                  flex: 1,
                  padding: '15px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <h4 style={{
                      margin: '0 0 8px 0',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: '#e2e8f0',
                      lineHeight: '1.2',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {content.title}
                    </h4>
                    
                    {/* 타입별 추가 정보 */}
                    <p style={{
                      margin: '0 0 8px 0',
                      fontSize: '12px',
                      color: '#a0aec0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {content.type === 'movie' && (content.director || content.actors)}
                      {content.type === 'game' && (content.developers || content.publishers)}
                      {content.type === 'webtoon' && content.authors}
                      {content.type === 'novel' && content.authors}
                      {content.type === 'ott' && content.creator}
                    </p>
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    {/* 평점 */}
                    {content.rating && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <Star size={14} style={{ color: '#fbbf24', fill: '#fbbf24' }} />
                        <span style={{
                          fontSize: '14px',
                          fontWeight: 'bold',
                          color: '#e5e7eb'
                        }}>
                          {typeof content.rating === 'number' ? content.rating.toFixed(1) : content.rating}
                        </span>
                      </div>
                    )}

                    {/* 가격 (게임의 경우) */}
                    {content.type === 'game' && content.final_price !== null && (
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#10b981'
                      }}>
                        ₩{(content.final_price || 0).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* CSS 애니메이션 */}
      <style>{`
        @keyframes scrollRow0 {
          0% { transform: translateX(0); }
          100% { transform: translateX(-66.66%); }
        }
        @keyframes scrollRow1 {
          0% { transform: translateX(-66.66%); }
          100% { transform: translateX(0); }
        }
        @keyframes scrollRow2 {
          0% { transform: translateX(0); }
          100% { transform: translateX(-66.66%); }
        }
      `}</style>

      {/* 하단 카테고리 링크 */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
        marginTop: '40px',
        padding: '0 20px',
        flexWrap: 'wrap'
      }}>
        {[
        //   { type: 'movie', name: '영화 전체보기', icon: <Film size={20} />, color: '#ef4444' },
        //   { type: 'game', name: '게임 전체보기', icon: <Gamepad2 size={20} />, color: '#8b5cf6' },
        //   { type: 'webtoon', name: '웹툰 전체보기', icon: <BookOpen size={20} />, color: '#f59e0b' },
        //   { type: 'novel', name: '웹소설 전체보기', icon: <BookOpen size={20} />, color: '#10b981' },
        //   { type: 'ott', name: 'OTT 전체보기', icon: <Tv size={20} />, color: '#3b82f6' }
        ].map((category) => (
          <button
            key={category.type}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 24px',
              backgroundColor: 'rgba(45, 55, 72, 0.8)',
              border: `2px solid ${category.color}`,
              borderRadius: '25px',
              color: category.color,
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontSize: '14px',
              backdropFilter: 'blur(10px)'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = category.color;
              e.target.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'rgba(45, 55, 72, 0.8)';
              e.target.style.color = category.color;
            }}
          >
            {category.icon}
            {category.name}
            <ArrowRight size={16} />
          </button>
        ))}
      </div>

      <div style={{
        textAlign: 'center',
        padding: '80px 20px 40px',
        marginTop: '60px'
      }}>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '30px',
          padding: '0 20px'
        }}>
          {[
            { 
              icon: '⭐', 
              title: '스마트 평점 시스템', 
              desc: '별점과 좋아요로 취향을 기록하고\n개인 맞춤 추천을 받아보세요',
              features: ['1-5점 별점 평가', '좋아요/위시리스트', '평가 기반 학습']
            },
            { 
              icon: '🎯', 
              title: 'ML 기반 추천 엔진', 
              desc: '머신러닝 알고리즘이 분석한\n당신만을 위한 콘텐츠 추천',
              features: ['협업 필터링', '콘텐츠 기반 필터링', '하이브리드 추천']
            },
            { 
              icon: '🤖', 
              title: 'LLM 맞춤 추천', 
              desc: '대화형 AI가 상황과 기분에 맞는\n완벽한 콘텐츠를 제안합니다',
              features: ['자연어 대화', '상황별 추천', '실시간 상담']
            },
            { 
              icon: '📊', 
              title: '취향 분석 대시보드', 
              desc: '내 취향을 시각화하고\n콘텐츠 소비 패턴을 분석해보세요',
              features: ['취향 통계', '시청 기록', '추천 정확도']
            }
          ].map((item, index) => (
            <div key={index} style={{
              backgroundColor: 'rgba(45, 55, 72, 0.8)',
              padding: '40px 30px',
              borderRadius: '20px',
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-10px)';
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.3)';
              e.currentTarget.style.borderColor = 'rgba(66, 153, 225, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
            >
              {/* 배경 그라디언트 효과 */}
              <div style={{
                position: 'absolute',
                top: '0',
                left: '0',
                right: '0',
                height: '3px',
                background: `linear-gradient(90deg, 
                  ${index === 0 ? '#fbbf24, #f59e0b' : 
                    index === 1 ? '#3b82f6, #1d4ed8' : 
                    index === 2 ? '#10b981, #059669' : '#8b5cf6, #7c3aed'})`,
                opacity: 0.8
              }} />
              
              <div style={{ fontSize: '4rem', marginBottom: '20px' }}>{item.icon}</div>
              <h4 style={{ 
                color: '#e2e8f0', 
                margin: '0 0 15px', 
                fontSize: '1.4rem',
                fontWeight: '700'
              }}>
                {item.title}
              </h4>
              <p style={{ 
                color: '#a0aec0', 
                margin: '0 0 25px', 
                fontSize: '1rem',
                lineHeight: '1.6',
                whiteSpace: 'pre-line'
              }}>
                {item.desc}
              </p>
              
              {/* 기능 리스트 */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                alignItems: 'center'
              }}>
                {item.features.map((feature, idx) => (
                  <div key={idx} style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    padding: '6px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#cbd5e0',
                    fontWeight: '500'
                  }}>
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DynamicHomepage;