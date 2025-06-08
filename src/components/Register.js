import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import '../Auth.css';

const getGenresArray = (genreData) => {
    if (!genreData) return [];
    if (Array.isArray(genreData)) return genreData;
    if (typeof genreData === 'string') {
        return genreData.split(',').map(g => g.trim()).filter(g => g.length > 0);
    }
    return [];
};

const formatGenres = (genreData) => {
    const genres = getGenresArray(genreData);
    return genres.length > 0 ? genres.join(', ') : '';
};

const Register = () => {
    // 기존 상태들
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [successful, setSuccessful] = useState(false);

    // 새로운 회원가입 단계별 상태
    const [step, setStep] = useState(1);
    const [sampleContents, setSampleContents] = useState([]);
    const [userRatings, setUserRatings] = useState({});
    const [dataLoading, setDataLoading] = useState(false);
    const [skipRatings, setSkipRatings] = useState(false);

    const navigate = useNavigate();
    const { register } = useAuth();

    // DB에서 랜덤 샘플 콘텐츠 가져오기
    const loadSampleContents = async () => {
        try {
            console.log('샘플 콘텐츠 로딩 시작...');

            // 각 콘텐츠 타입별로 데이터 가져오기
            const [movies, games, webtoons, novels, netflixContent] = await Promise.allSettled([
                api.getMovies(),
                api.getSteamGames(),
                api.getWebtoons(),
                api.getNovels(),
                api.getNetflixContent()
            ]);

            const sampleList = [];

            // 영화에서 1개 랜덤 선택
            if (movies.status === 'fulfilled' && movies.value && movies.value.length > 0) {
                const randomMovie = movies.value[Math.floor(Math.random() * Math.min(movies.value.length, 20))];
                sampleList.push({
                    contentType: "movie",
                    contentId: randomMovie.id,
                    contentTitle: randomMovie.title,
                    director: randomMovie.director,
                    thumbnailUrl: randomMovie.thumbnailUrl || randomMovie.thumbnail_url,
                    genre: getGenresArray(randomMovie.genres || randomMovie.genre || ["영화"]),
                    originalData: randomMovie
                });
            }

            // 게임에서 1개 랜덤 선택
            if (games.status === 'fulfilled' && games.value && games.value.length > 0) {
                const randomGame = games.value[Math.floor(Math.random() * Math.min(games.value.length, 20))];
                sampleList.push({
                    contentType: "game",
                    contentId: randomGame.id,
                    contentTitle: randomGame.title,
                    developer: randomGame.developer,
                    thumbnailUrl: randomGame.headerImage || randomGame.header_image,
                    genre: getGenresArray(randomGame.genres || randomGame.genre || ["게임"]),
                    originalData: randomGame
                });
            }

            // 웹툰에서 1개 랜덤 선택
            if (webtoons.status === 'fulfilled' && webtoons.value && webtoons.value.length > 0) {
                const randomWebtoon = webtoons.value[Math.floor(Math.random() * Math.min(webtoons.value.length, 20))];
                sampleList.push({
                    contentType: "webtoon",
                    contentId: randomWebtoon.id,
                    contentTitle: randomWebtoon.title,
                    author: randomWebtoon.creator || randomWebtoon.author,
                    thumbnailUrl: randomWebtoon.thumbnail,
                    genre: getGenresArray(randomWebtoon.genres || randomWebtoon.genre || ["웹툰"]),
                    originalData: randomWebtoon
                });
            }

            // 웹소설에서 1개 랜덤 선택
            if (novels.status === 'fulfilled' && novels.value && novels.value.length > 0) {
                const randomNovel = novels.value[Math.floor(Math.random() * Math.min(novels.value.length, 20))];
                sampleList.push({
                    contentType: "novel",
                    contentId: randomNovel.id,
                    contentTitle: randomNovel.title,
                    author: randomNovel.author,
                    thumbnailUrl: randomNovel.image_url,
                    genre: getGenresArray(randomNovel.genres || randomNovel.genre || ["웹소설"]),
                    originalData: randomNovel
                });
            }

            // OTT에서 1개 랜덤 선택
            if (netflixContent.status === 'fulfilled' && netflixContent.value && netflixContent.value.length > 0) {
                const randomOtt = netflixContent.value[Math.floor(Math.random() * Math.min(netflixContent.value.length, 20))];
                sampleList.push({
                    contentType: "ott",
                    contentId: randomOtt.content_id || randomOtt.id,
                    contentTitle: randomOtt.title,
                    creator: randomOtt.creator,
                    thumbnailUrl: randomOtt.thumbnail,
                    genre: getGenresArray(randomOtt.genres || randomOtt.genre || [randomOtt.type || "OTT"]),
                    originalData: randomOtt
                });
            }

            console.log('로드된 샘플 콘텐츠:', sampleList);
            return sampleList;

        } catch (error) {
            console.error('샘플 콘텐츠 로드 실패:', error);

            // 폴백: 기본 샘플 데이터
            return [
                {
                    contentType: "movie",
                    contentId: 999,
                    contentTitle: "샘플 영화",
                    director: "감독명",
                    thumbnailUrl: "/placeholder-movie.jpg",
                    genre: ["드라마"]
                },
                {
                    contentType: "webtoon",
                    contentId: 998,
                    contentTitle: "샘플 웹툰",
                    author: "작가명",
                    thumbnailUrl: "/placeholder-webtoon.jpg",
                    genre: ["액션"]
                }
            ];
        }
    };

    useEffect(() => {
        if (step === 2) {
            loadSampleContentsAsync();
        }
    }, [step]);

    const loadSampleContentsAsync = async () => {
        setDataLoading(true);
        try {
            const contents = await loadSampleContents();
            setSampleContents(contents);
        } catch (error) {
            console.error('샘플 콘텐츠 로드 실패:', error);
            setMessage('콘텐츠를 불러오는 중 오류가 발생했습니다.');
        } finally {
            setDataLoading(false);
        }
    };

    const validateForm = () => {
        if (!username || !email || !password || !confirmPassword) {
            setMessage('모든 필드를 입력해주세요.');
            return false;
        }

        if (password !== confirmPassword) {
            setMessage('비밀번호가 일치하지 않습니다.');
            return false;
        }

        const emailRegex = /\S+@\S+\.\S+/;
        if (!emailRegex.test(email)) {
            setMessage('유효한 이메일 주소를 입력해주세요.');
            return false;
        }

        return true;
    };

    const handleBasicRegister = async (e) => {
        e.preventDefault();
        setMessage('');
        setSuccessful(false);
        setLoading(true);

        try {
            if (!validateForm()) {
                setLoading(false);
                return;
            }

            console.log('중복 체크 시작:', { username, email });

            const duplicateCheckResponse = await fetch('/api/auth/check-duplicate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    email: email
                })
            });

            const duplicateData = await duplicateCheckResponse.json();
            console.log('중복 체크 응답:', duplicateData);

            if (!duplicateCheckResponse.ok) {
                if (duplicateData.usernameExists && duplicateData.emailExists) {
                    setMessage('이미 사용 중인 아이디와 이메일입니다.');
                } else if (duplicateData.usernameExists) {
                    setMessage('이미 사용 중인 아이디입니다.');
                } else if (duplicateData.emailExists) {
                    setMessage('이미 사용 중인 이메일입니다.');
                } else {
                    setMessage(duplicateData.message || '회원가입 중 오류가 발생했습니다.');
                }
                setLoading(false);
                return;
            }

            console.log('중복 체크 통과, 다음 단계로 이동');
            setStep(2);

        } catch (error) {
            console.error('중복 체크 오류:', error);
            setMessage('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
        } finally {
            setLoading(false);
        }
    };

    const handleRating = (contentItem, rating) => {
        setUserRatings(prev => ({
            ...prev,
            [`${contentItem.contentType}-${contentItem.contentId}`]: {
                ...contentItem,
                rating,
                isLiked: rating >= 4,
                isWatched: true,
                isWishlist: false,
                review: rating >= 4 ? "좋아요!" : rating >= 3 ? "괜찮아요" : "별로예요"
            }
        }));
    };

    const handleFinalRegister = async () => {
        setLoading(true);
        setMessage('');

        try {
            console.log('회원가입 시작:', { username, email });

            const response = await register(username, email, password);
            console.log('회원가입 응답:', response);

            if (!skipRatings && Object.keys(userRatings).length > 0) {
                console.log('평가 데이터 저장 시작:', userRatings);

                const ratingPromises = Object.values(userRatings).map(async (ratingData) => {
                    try {
                        await api.recommendations.rateContent(username, {
                            username,
                            contentType: ratingData.contentType,
                            contentId: ratingData.contentId,
                            contentTitle: ratingData.contentTitle,
                            rating: ratingData.rating,
                            isLiked: ratingData.isLiked,
                            isWatched: ratingData.isWatched,
                            isWishlist: ratingData.isWishlist,
                            review: ratingData.review
                        });
                        console.log(`평가 저장 완료: ${ratingData.contentTitle}`);
                    } catch (error) {
                        console.warn(`평가 저장 실패: ${ratingData.contentTitle}`, error);
                    }
                });

                await Promise.allSettled(ratingPromises);
                console.log('모든 평가 데이터 저장 완료');
            }

            setMessage('회원가입이 완료되었습니다! 이제 개인화된 추천을 받을 수 있습니다.');
            setSuccessful(true);
            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (error) {
            console.error('회원가입 오류:', error);

            let errorMessage = '회원가입 중 오류가 발생했습니다.';
            if (error && error.message) {
                errorMessage = error.message;
            }

            setMessage(errorMessage);
            setSuccessful(false);
        } finally {
            setLoading(false);
        }
    };

    const getContentTypeIcon = (type) => {
        const icons = {
            'movie': '🎬',
            'webtoon': '📚',
            'novel': '📖',
            'game': '🎮',
            'ott': '📺'
        };
        return icons[type] || '🎯';
    };

    const getContentTypeLabel = (type) => {
        const labels = {
            'movie': '영화',
            'webtoon': '웹툰',
            'novel': '웹소설',
            'game': '게임',
            'ott': 'OTT'
        };
        return labels[type] || type;
    };

    const renderStars = (contentItem) => {
        const currentRating = userRatings[`${contentItem.contentType}-${contentItem.contentId}`]?.rating || 0;

        return (
            <div className="rating-stars">
                {[1, 2, 3, 4, 5].map(star => (
                    <button
                        key={star}
                        type="button"
                        className={`star-btn ${currentRating >= star ? 'active' : ''}`}
                        onClick={() => handleRating(contentItem, star)}
                    >
                        ⭐
                    </button>
                ))}
                {currentRating > 0 && (
                    <span className="rating-text">
                        {currentRating}/5
                    </span>
                )}
            </div>
        );
    };

    if (step === 1) {
        // 기본 회원가입 폼
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <h2>회원가입</h2>

                    {message && (
                        <div className={`alert ${successful ? 'alert-success' : 'alert-danger'}`}>
                            {message}
                        </div>
                    )}

                    <form onSubmit={handleBasicRegister}>
                        <div className="form-group">
                            <label htmlFor="username">아이디</label>
                            <input
                                type="text"
                                className="form-control"
                                id="username"
                                name="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">이메일</label>
                            <input
                                type="email"
                                className="form-control"
                                id="email"
                                name="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">비밀번호</label>
                            <input
                                type="password"
                                className="form-control"
                                id="password"
                                name="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword">비밀번호 확인</label>
                            <input
                                type="password"
                                className="form-control"
                                id="confirmPassword"
                                name="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <button
                                type="submit"
                                className="btn btn-primary btn-block"
                                disabled={loading}
                            >
                                다음 단계로
                            </button>
                        </div>

                        <div className="form-group text-center">
                            이미 계정이 있으신가요?
                            <Link to="/login" className="auth-link">로그인</Link>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    // 콘텐츠 평가 단계 - 모던 디자인 적용
    return (
        <div className="auth-container">
            <div className="preferences-card">
                <h2>콘텐츠 평가하기</h2>
                <p className="preferences-subtitle">
                    몇 가지 콘텐츠를 평가해주시면 더 정확한 추천을 받을 수 있어요!<br />
                    (최소 3개 이상 평가하시는 것을 권장합니다)
                </p>

                {message && (
                    <div className={`alert ${successful ? 'alert-success' : 'alert-danger'}`}>
                        {message}
                    </div>
                )}

                <div className="preferences-content">
                    {/* 진행률 표시 */}
                    <div className="progress-section">
                        <div className="progress-header">
                            <span className="progress-label">
                                평가한 콘텐츠: {Object.keys(userRatings).length}/{sampleContents.length}
                            </span>
                            <span className="progress-percentage">
                                {sampleContents.length > 0 ? Math.round((Object.keys(userRatings).length / sampleContents.length) * 100) : 0}%
                            </span>
                        </div>
                        <div className="progress-bar">
                            <div 
                                className="progress-fill"
                                style={{
                                    width: `${sampleContents.length > 0 ? (Object.keys(userRatings).length / sampleContents.length) * 100 : 0}%`
                                }}
                            />
                        </div>
                    </div>

                    {/* 콘텐츠 목록 */}
                    {dataLoading ? (
                        <div className="loading-section">
                            <div className="loading-spinner"></div>
                            <p>다양한 콘텐츠를 준비하고 있어요...</p>
                        </div>
                    ) : sampleContents.length === 0 ? (
                        <div className="loading-section">
                            <p style={{ color: '#fc8181' }}>콘텐츠를 불러올 수 없습니다.</p>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={loadSampleContentsAsync}
                            >
                                다시 시도
                            </button>
                        </div>
                    ) : (
                        <div className="content-rating-grid">
                            {sampleContents.map((content, index) => {
                                const isRated = userRatings[`${content.contentType}-${content.contentId}`];
                                
                                return (
                                    <div
                                        key={`${content.contentType}-${content.contentId}`}
                                        className={`content-rating-card ${isRated ? 'rated' : ''}`}
                                    >
                                        <div className="content-header">
                                            <div className="content-icon">
                                                {getContentTypeIcon(content.contentType)}
                                            </div>
                                            <div className="content-info">
                                                <h4 className="content-title">
                                                    {content.contentTitle}
                                                </h4>
                                                <div className="content-meta">
                                                    <span className="content-type-badge">
                                                        {getContentTypeLabel(content.contentType)}
                                                    </span>
                                                    <span className="content-creator">
                                                        {content.author || content.director || content.developer || content.creator}
                                                    </span>
                                                    {content.genre && content.genre.length > 0 && (
                                                        <span className="content-genre">
                                                            {formatGenres(content.genre)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rating-section">
                                            <p className="rating-prompt">이 콘텐츠를 평가해주세요:</p>
                                            {renderStars(content)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 액션 버튼들 */}
                <div className="preferences-actions">
                    <div className="action-buttons">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setStep(1)}
                        >
                            ← 이전
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleFinalRegister}
                            disabled={loading || dataLoading || (!skipRatings && Object.keys(userRatings).length < Math.min(3, sampleContents.length))}
                        >
                            {loading ? (
                                <span className="spinner"></span>
                            ) : (
                                `🎉 가입 완료 ${!skipRatings ? `(${Object.keys(userRatings).length}/5)` : ''}`
                            )}
                        </button>
                    </div>

                    {!skipRatings && sampleContents.length > 0 && Object.keys(userRatings).length < Math.min(3, sampleContents.length) && (
                        <p className="rating-requirement">
                            최소 {Math.min(3, sampleContents.length)}개 이상의 콘텐츠를 평가해주세요
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Register;