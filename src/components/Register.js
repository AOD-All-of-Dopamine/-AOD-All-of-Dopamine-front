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
                    genre: getGenresArray(randomMovie.genres || randomMovie.genre || ["영화"]), // 안전하게 배열로 변환
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
                    genre: getGenresArray(randomGame.genres || randomGame.genre || ["게임"]), // 안전하게 배열로 변환
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
                    genre: getGenresArray(randomWebtoon.genres || randomWebtoon.genre || ["웹툰"]), // 안전하게 배열로 변환
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
                    genre: getGenresArray(randomNovel.genres || randomNovel.genre || ["웹소설"]), // 안전하게 배열로 변환
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
                    genre: getGenresArray(randomOtt.genres || randomOtt.genre || [randomOtt.type || "OTT"]), // 안전하게 배열로 변환
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
                    genre: ["드라마"] // 배열로 설정
                },
                {
                    contentType: "webtoon",
                    contentId: 998,
                    contentTitle: "샘플 웹툰",
                    author: "작가명",
                    thumbnailUrl: "/placeholder-webtoon.jpg",
                    genre: ["액션"] // 배열로 설정
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
            // 1. 기본 폼 검증
            if (!validateForm()) {
                setLoading(false);
                return;
            }

            // 2. 백엔드에서 중복 체크
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
                // 중복된 경우
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

            // 3. 중복이 없으면 다음 단계로 이동
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

            // 1. 기본 회원가입 (중복 체크는 이미 첫 단계에서 완료)
            const response = await register(username, email, password);
            console.log('회원가입 응답:', response);

            // 2. 평가 데이터 저장 (건너뛰기 선택하지 않은 경우)
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
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer',
                            color: currentRating >= star ? '#ffc107' : '#ddd',
                            transition: 'color 0.2s'
                        }}
                    >
                        ⭐
                    </button>
                ))}
                {currentRating > 0 && (
                    <span style={{ marginLeft: '10px', fontSize: '14px', color: '#666' }}>
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

    // 콘텐츠 평가 단계
    return (
        <div className="auth-container">
            <div className="auth-card" style={{ maxWidth: '700px' }}>
                <h2>🎯 콘텐츠 평가하기</h2>
                <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>
                    몇 가지 콘텐츠를 평가해주시면 더 정확한 추천을 받을 수 있어요!<br />
                    (최소 3개 이상 평가하시는 것을 권장합니다)
                </p>

                {message && (
                    <div className={`alert ${successful ? 'alert-success' : 'alert-danger'}`}>
                        {message}
                    </div>
                )}

                <div style={{ marginBottom: '30px' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '20px',
                        padding: '10px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px'
                    }}>
                        <span style={{ fontWeight: 'bold' }}>
                            평가한 콘텐츠: {Object.keys(userRatings).length}/{sampleContents.length}
                        </span>
                        <div style={{ width: '100px', height: '8px', backgroundColor: '#e9ecef', borderRadius: '4px' }}>
                            <div
                                style={{
                                    width: `${(Object.keys(userRatings).length / sampleContents.length) * 100}%`,
                                    height: '100%',
                                    backgroundColor: '#007bff',
                                    borderRadius: '4px',
                                    transition: 'width 0.3s'
                                }}
                            />
                        </div>
                    </div>

                    {dataLoading ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                border: '4px solid #f3f3f3',
                                borderTop: '4px solid #007bff',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite',
                                margin: '0 auto 20px'
                            }}></div>
                            <p style={{ color: '#666' }}>다양한 콘텐츠를 준비하고 있어요...</p>
                            <style jsx>{`
                            @keyframes spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                            }
                        `}</style>
                        </div>
                    ) : sampleContents.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <p style={{ color: '#dc3545' }}>콘텐츠를 불러올 수 없습니다.</p>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={loadSampleContentsAsync}
                            >
                                다시 시도
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '20px' }}>
                            {sampleContents.map((content, index) => (
                                <div
                                    key={`${content.contentType}-${content.contentId}`}
                                    style={{
                                        border: '2px solid #e9ecef',
                                        borderRadius: '12px',
                                        padding: '20px',
                                        backgroundColor: userRatings[`${content.contentType}-${content.contentId}`] ? '#f8f9fa' : 'white',
                                        transition: 'all 0.3s'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                                        <span style={{ fontSize: '24px', marginRight: '10px' }}>
                                            {getContentTypeIcon(content.contentType)}
                                        </span>
                                        <div>
                                            <h4 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>
                                                {content.contentTitle}
                                            </h4>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <span style={{
                                                    fontSize: '12px',
                                                    backgroundColor: '#007bff',
                                                    color: 'white',
                                                    padding: '3px 8px',
                                                    borderRadius: '12px'
                                                }}>
                                                    {getContentTypeLabel(content.contentType)}
                                                </span>
                                                <span style={{ fontSize: '14px', color: '#666' }}>
                                                    {content.author || content.director || content.developer || content.creator}
                                                </span>
                                                {content.genre && content.genre.length > 0 && (
                                                    <span style={{ fontSize: '12px', color: '#28a745' }}>
                                                        {formatGenres(content.genre)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ marginLeft: '34px' }}>
                                        <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                                            이 콘텐츠를 평가해주세요:
                                        </p>
                                        {renderStars(content)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ borderTop: '1px solid #e9ecef', paddingTop: '25px' }}>
                    <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
                        </label>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', justifyContent: 'space-between' }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setStep(1)}
                            style={{ flex: 1 }}
                        >
                            이전
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleFinalRegister}
                            disabled={loading || dataLoading || (!skipRatings && Object.keys(userRatings).length < Math.min(3, sampleContents.length))}
                            style={{ flex: 2 }}
                        >
                            {loading ? (
                                <span className="spinner"></span>
                            ) : (
                                `🎉 가입 완료 ${!skipRatings ? `(${Object.keys(userRatings).length}/5)` : ''}`
                            )}
                        </button>
                    </div>

                    {!skipRatings && sampleContents.length > 0 && Object.keys(userRatings).length < Math.min(3, sampleContents.length) && (
                        <p style={{ fontSize: '12px', color: '#dc3545', textAlign: 'center', marginTop: '10px' }}>
                            최소 {Math.min(3, sampleContents.length)}개 이상의 콘텐츠를 평가해주세요
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Register;