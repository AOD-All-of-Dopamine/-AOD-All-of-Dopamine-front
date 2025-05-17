import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import '../Auth.css';

const Register = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [successful, setSuccessful] = useState(false);

    const navigate = useNavigate();

    // // 이미 로그인되어 있는지 확인
    // useEffect(() => {
    //     const token = localStorage.getItem('token');
    //     if (token) {
    //       navigate('/');
    //     }
    //   }, [navigate]);     


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

    const handleRegister = async (e) => {
        e.preventDefault();
        setMessage('');
        setSuccessful(false);
        setLoading(true);

        if (validateForm()) {
            try {
                await api.auth.register(username, email, password);
                setMessage('회원가입이 완료되었습니다. 로그인해주세요.');
                setSuccessful(true);
                setTimeout(() => {
                    navigate('/login');
                }, 2000);
            } catch (error) {
                const resMessage =
                    (error.response && error.response.data) ||
                    error.message ||
                    error.toString();

                setMessage(resMessage);
                setSuccessful(false);
            } finally {
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>회원가입</h2>

                {message && (
                    <div className={`alert ${successful ? 'alert-success' : 'alert-danger'}`}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleRegister}>
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
                                "가입하기"
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
};

export default Register;