import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import '../Auth.css';

const Register = () => {
    // 기존 상태들
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [successful, setSuccessful] = useState(false);

    // 추천 시스템 관련 새로운 상태들
    const [step, setStep] = useState(1);
    const [showPreferences, setShowPreferences] = useState(false);
    const [preferences, setPreferences] = useState({
        preferredGenres: [],
        preferredContentTypes: [],
        ageRange: '',
        preferredLanguage: 'Korean',
        preferredRating: '',
        mood: []
    });
    const [contentTypes, setContentTypes] = useState([]);
    const [genres, setGenres] = useState([]);
    const [skipPreferences, setSkipPreferences] = useState(false);
    const [dataLoading, setDataLoading] = useState(false);

    const navigate = useNavigate();
    const { register } = useAuth(); // signup 대신 register 사용

    useEffect(() => {
        // 컴포넌트 마운트 시에는 데이터를 로드하지 않음
        // 선호도 설정 단계에서만 로드
    }, []);

    const loadInitialData = async () => {
        if (contentTypes.length > 0 && genres.length > 0) {
            return; // 이미 로드됨
        }

        setDataLoading(true);
        try {
            // API 메서드가 존재하는 경우에만 호출
            let loadedContentTypes = [];
            let loadedGenres = [];

            if (api.recommendations && api.recommendations.getContentTypes) {
                try {
                    loadedContentTypes = await api.recommendations.getContentTypes();
                } catch (error) {
                    console.warn('콘텐츠 타입 로드 실패:', error);
                    // 기본값 설정
                    loadedContentTypes = ['MOVIE', 'WEBTOON', 'NOVEL', 'GAME', 'OTT'];
                }
            } else {
                // API 메서드가 없으면 기본값 사용
                loadedContentTypes = ['MOVIE', 'WEBTOON', 'NOVEL', 'GAME', 'OTT'];
            }

            if (api.recommendations && api.recommendations.getGenres) {
                try {
                    loadedGenres = await api.recommendations.getGenres();
                } catch (error) {
                    console.warn('장르 로드 실패:', error);
                    // 기본값 설정
                    loadedGenres = [
                        '액션', '로맨스', '코미디', '드라마', '스릴러', '판타지',
                        '공포', '미스터리', 'SF', '다큐멘터리', '애니메이션', '범죄'
                    ];
                }
            } else {
                // API 메서드가 없으면 기본값 사용
                loadedGenres = [
                    '액션', '로맨스', '코미디', '드라마', '스릴러', '판타지',
                    '공포', '미스터리', 'SF', '다큐멘터리', '애니메이션', '범죄'
                ];
            }

            setContentTypes(Array.isArray(loadedContentTypes) ? loadedContentTypes : []);
            setGenres(Array.isArray(loadedGenres) ? loadedGenres : []);
        } catch (error) {
            console.error('초기 데이터 로드 실패:', error);
            // 에러 시 기본값 설정
            setContentTypes(['MOVIE', 'WEBTOON', 'NOVEL', 'GAME', 'OTT']);
            setGenres(['액션', '로맨스', '코미디', '드라마', '스릴러', '판타지']);
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

        // 간단한 이메일 형식 검증
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

        if (validateForm()) {
            // 데이터 로드 후 선호도 설정 단계로 이동
            await loadInitialData();
            setShowPreferences(true);
            setStep(2);
            setLoading(false);
        } else {
            setLoading(false);
        }
    };

    // 최종 회원가입 (기존 API 사용 + 선호도 별도 설정)
    const handleFinalRegister = async () => {
        setLoading(true);
        setMessage('');

        try {
            console.log('회원가입 시작:', { username, email, skipPreferences });
            
            // 1. 기본 회원가입 먼저 진행
            const response = await register(username, email, password);
            console.log('회원가입 응답:', response);

            // 2. 회원가입 성공 시 선호도 설정 (선택사항)
            if (!skipPreferences && preferences && Object.keys(preferences).length > 0) {
                try {
                    console.log('선호도 설정 시작:', preferences);
                    await api.recommendations.setUserPreferences(username, preferences);
                    console.log('선호도 설정 완료');
                } catch (prefError) {
                    console.warn('선호도 설정 실패 (회원가입은 성공):', prefError);
                    // 선호도 설정 실패는 회원가입 실패로 처리하지 않음
                }
            }

            setMessage('회원가입이 완료되었습니다. 로그인해주세요.');
            setSuccessful(true);
            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (error) {
            console.error('회원가입 오류:', error);
            
            // 에러 메시지 추출
            let errorMessage = '회원가입 중 오류가 발생했습니다.';
            
            if (error && error.message) {
                errorMessage = error.message;
            } else if (error && error.response && error.response.data) {
                if (typeof error.response.data === 'string') {
                    errorMessage = error.response.data;
                } else if (error.response.data.message) {
                    errorMessage = error.response.data.message;
                }
            }
            
            setMessage(errorMessage);
            setSuccessful(false);
        } finally {
            setLoading(false);
        }
    };

    // 선호도 관련 핸들러들
    const handleGenreToggle = (genre) => {
        setPreferences(prev => ({
            ...prev,
            preferredGenres: prev.preferredGenres.includes(genre)
                ? prev.preferredGenres.filter(g => g !== genre)
                : [...prev.preferredGenres, genre]
        }));
    };

    const handleContentTypeToggle = (type) => {
        setPreferences(prev => ({
            ...prev,
            preferredContentTypes: prev.preferredContentTypes.includes(type)
                ? prev.preferredContentTypes.filter(t => t !== type)
                : [...prev.preferredContentTypes, type]
        }));
    };

    const handleMoodToggle = (moodItem) => {
        setPreferences(prev => ({
            ...prev,
            mood: prev.mood.includes(moodItem)
                ? prev.mood.filter(m => m !== moodItem)
                : [...prev.mood, moodItem]
        }));
    };

    const contentTypeOptions = [
        { value: 'MOVIE', label: '영화', icon: '🎬' },
        { value: 'WEBTOON', label: '웹툰', icon: '📚' },
        { value: 'NOVEL', label: '웹소설', icon: '📖' },
        { value: 'GAME', label: '게임', icon: '🎮' },
        { value: 'OTT', label: 'OTT', icon: '📺' }
    ];

    const ageRangeOptions = [
        { value: '10s', label: '10대' },
        { value: '20s', label: '20대' },
        { value: '30s', label: '30대' },
        { value: '40s', label: '40대' },
        { value: '50s+', label: '50대 이상' }
    ];

    const moodOptions = [
        '재미있는', '감동적인', '스릴있는', '무서운', '로맨틱한',
        '웃긴', '진지한', '판타지적인', '현실적인', '교육적인'
    ];

    if (!showPreferences) {
        // 기존 회원가입 폼
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
                                {loading ? (
                                    <span className="spinner"></span>
                                ) : (
                                    "다음 단계로"
                                )}
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

    // 선호도 설정 단계
    return (
        <div className="auth-container">
            <div className="auth-card preferences-card">
                <h2>🎯 취향 설정</h2>
                <p className="preferences-subtitle">맞춤형 추천을 위해 선호도를 설정해주세요 (선택사항)</p>

                {message && (
                    <div className={`alert ${successful ? 'alert-success' : 'alert-danger'}`}>
                        {message}
                    </div>
                )}

                {dataLoading ? (
                    <div className="loading-section">
                        <div className="spinner"></div>
                        <p>선호도 옵션을 불러오는 중...</p>
                    </div>
                ) : (
                    <div className="preferences-content">
                        {/* 콘텐츠 타입 선호도 */}
                        <div className="preference-section">
                            <h4>📱 관심있는 콘텐츠</h4>
                            <div className="preferences-grid">
                                {contentTypeOptions.map(option => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        className={`preference-option ${preferences.preferredContentTypes.includes(option.value) ? 'selected' : ''}`}
                                        onClick={() => handleContentTypeToggle(option.value)}
                                    >
                                        <span className="option-icon">{option.icon}</span>
                                        <span>{option.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 장르 선호도 */}
                        <div className="preference-section">
                            <h4>🎭 좋아하는 장르</h4>
                            <div className="preferences-tags">
                                {Array.isArray(genres) && genres.length > 0 ? (
                                    genres.slice(0, 12).map(genre => (
                                        <button
                                            key={genre}
                                            type="button"
                                            className={`preference-tag ${preferences.preferredGenres.includes(genre) ? 'selected' : ''}`}
                                            onClick={() => handleGenreToggle(genre)}
                                        >
                                            {genre}
                                        </button>
                                    ))
                                ) : (
                                    <p className="no-genres">장르 정보를 불러올 수 없습니다.</p>
                                )}
                            </div>
                        </div>

                        {/* 연령대 */}
                        <div className="preference-section">
                            <h4>👤 연령대</h4>
                            <div className="radio-options">
                                {ageRangeOptions.map(option => (
                                    <label key={option.value} className="radio-option">
                                        <input
                                            type="radio"
                                            name="ageRange"
                                            value={option.value}
                                            checked={preferences.ageRange === option.value}
                                            onChange={(e) => setPreferences(prev => ({
                                                ...prev,
                                                ageRange: e.target.value
                                            }))}
                                        />
                                        <span>{option.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* 선호 분위기 */}
                        <div className="preference-section">
                            <h4>🌈 선호하는 분위기</h4>
                            <div className="preferences-tags">
                                {moodOptions.map(mood => (
                                    <button
                                        key={mood}
                                        type="button"
                                        className={`preference-tag ${preferences.mood.includes(mood) ? 'selected' : ''}`}
                                        onClick={() => handleMoodToggle(mood)}
                                    >
                                        {mood}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="preferences-actions">
                    <div className="skip-option">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={skipPreferences}
                                onChange={(e) => setSkipPreferences(e.target.checked)}
                            />
                            <span>나중에 설정하기</span>
                        </label>
                    </div>

                    <div className="action-buttons">
                        <button 
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setShowPreferences(false)}
                        >
                            이전
                        </button>
                        <button 
                            type="button"
                            className="btn btn-primary"
                            onClick={handleFinalRegister}
                            disabled={loading || dataLoading}
                        >
                            {loading ? (
                                <span className="spinner"></span>
                            ) : (
                                "🎉 가입 완료"
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;