import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import '../Auth.css';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const navigate = useNavigate();

    // 이미 로그인되어 있는지 확인
    // useEffect(() => {
    //     const token = localStorage.getItem('token');
    //     if (token) {
    //       navigate('/');
    //     }
    //   }, [navigate]);    

    const handleLogin = async (e) => {
        e.preventDefault();
        setMessage('');
        setLoading(true);

        if (!username || !password) {
            setMessage('아이디와 비밀번호를 입력해주세요.');
            setLoading(false);
            return;
        }

        try {
            await api.auth.login(username, password);
            navigate('/');
        } catch (error) {
            const resMessage =
                (error.response && error.response.data) ||
                error.message ||
                error.toString();

            setMessage(resMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>로그인</h2>

                {message && (
                    <div className="alert alert-danger">
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