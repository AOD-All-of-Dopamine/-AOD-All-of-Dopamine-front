import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ApiTester() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const testApi = async () => {
      try {
        setLoading(true);
        // API 주소를 테스트하려는 엔드포인트로 변경하세요
        const response = await axios.get('http://localhost:8080/api/common/movies');
        console.log('API 응답:', response);
        setData(response.data);
        setLoading(false);
      } catch (err) {
        console.error('API 오류:', err);
        setError(err.message || '알 수 없는 오류가 발생했습니다.');
        setLoading(false);
      }
    };

    testApi();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>API 테스트</h1>
      <h2>http://localhost:8080/api/common/movies</h2>
      
      {loading && <p>로딩 중...</p>}
      {error && (
        <div style={{ color: 'red' }}>
          <p>오류 발생: {error}</p>
          <p>브라우저 콘솔에서 더 자세한 오류 정보를 확인하세요.</p>
        </div>
      )}
      
      {data && (
        <div>
          <h3>데이터 성공적으로 받음!</h3>
          <p>데이터 타입: {Array.isArray(data) ? '배열' : typeof data}</p>
          <p>데이터 길이: {Array.isArray(data) ? data.length : '해당 없음'}</p>
          <pre style={{ 
            background: '#f0f0f0', 
            padding: '10px', 
            overflow: 'auto', 
            maxHeight: '400px',
            border: '1px solid #ccc' 
          }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default ApiTester;