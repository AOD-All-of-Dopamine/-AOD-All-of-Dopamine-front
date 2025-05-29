import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../Auth.css';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [successful, setSuccessful] = useState(false);

    const navigate = useNavigate();
    const { login } = useAuth();

    const validateForm = () => {
        if (!username || !password) {
            setMessage('아이디와 비밀번호를 입력해주세요.');
            return false;
        }
        return true;
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setMessage('');
        setSuccessful(false);
        setLoading(true);

        if (validateForm()) {
            try {
                const response = await login(username, password);
                
                // 새로운 AuthContext 방식 (success 객체 반환)
                if (response && typeof response === 'object' && response.success === false) {
                    setMessage(response.message || '로그인에 실패했습니다.');
                    setSuccessful(false);
                } else if (response && (response.token || response.success === true)) {
                    // 로그인 성공
                    setMessage('로그인이 완료되었습니다.');
                    setSuccessful(true);
                    setTimeout(() => {
                        navigate('/');
                    }, 1000);
                } else {
                    // 기존 방식 (에러 없이 성공)
                    setMessage('로그인이 완료되었습니다.');
                    setSuccessful(true);
                    setTimeout(() => {
                        navigate('/');
                    }, 1000);
                }
            } catch (error) {
                console.error('로그인 오류:', error);
                
                // 에러 메시지 안전하게 추출
                let errorMessage = '로그인 중 오류가 발생했습니다.';
                
                if (error && typeof error === 'string') {
                    errorMessage = error;
                } else if (error && error.message) {
                    errorMessage = error.message;
                } else if (error && error.response && error.response.data) {
                    // axios 에러 응답 처리
                    if (typeof error.response.data === 'string') {
                        errorMessage = error.response.data;
                    } else if (error.response.data.message) {
                        errorMessage = error.response.data.message;
                    } else {
                        errorMessage = JSON.stringify(error.response.data);
                    }
                } else if (error && typeof error === 'object') {
                    errorMessage = error.toString();
                }
                
                setMessage(errorMessage);
                setSuccessful(false);
            }
        }
        setLoading(false);
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>로그인</h2>

                {message && (
                    <div className={`alert ${successful ? 'alert-success' : 'alert-danger'}`}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleLogin}>
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
                        <button
                            type="submit"
                            className="btn btn-primary btn-block"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="spinner"></span>
                            ) : (
                                "로그인"
                            )}
                        </button>
                    </div>

                    <div className="form-group text-center">
                        계정이 없으신가요?
                        <Link to="/register" className="auth-link">회원가입</Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;