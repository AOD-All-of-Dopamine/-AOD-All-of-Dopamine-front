import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ApiTester() {
  const [selectedApi, setSelectedApi] = useState('movies');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const apiEndpoints = {
    movies: 'http://localhost:8080/api/movies',
    steamGames: 'http://localhost:8080/api/steam-games',
    webtoons: 'http://localhost:8080/api/webtoons',
    novels: 'http://localhost:8080/api/novels',
    netflixContent: 'http://localhost:8080/api/netflix-content'
  };

  const apiNames = {
    movies: '영화',
    steamGames: '스팀 게임',
    webtoons: '웹툰',
    novels: '웹소설',
    netflixContent: '넷플릭스 콘텐츠'
  };

  useEffect(() => {
    // API 선택이 변경될 때마다 데이터 초기화
    setData(null);
    setError(null);
  }, [selectedApi]);

  const testApi = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(apiEndpoints[selectedApi]);
      console.log('API 응답:', response);
      setData(response.data);
      setLoading(false);
    } catch (err) {
      console.error('API 오류:', err);
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>API 테스트</h1>
      
      <div style={{ 
        marginBottom: '20px', 
        padding: '15px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <h2>테스트할 API 선택</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
          {Object.keys(apiEndpoints).map(api => (
            <button 
              key={api}
              onClick={() => setSelectedApi(api)}
              style={{
                padding: '8px 15px',
                backgroundColor: selectedApi === api ? '#032541' : '#e0e0e0',
                color: selectedApi === api ? 'white' : 'black',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                fontWeight: selectedApi === api ? 'bold' : 'normal',
                transition: 'all 0.3s ease'
              }}
            >
              {apiNames[api]}
            </button>
          ))}
        </div>
        
        <div>
          <h3>선택한 API: {apiNames[selectedApi]}</h3>
          <p><strong>엔드포인트:</strong> {apiEndpoints[selectedApi]}</p>
          <button 
            onClick={testApi}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? '요청 중...' : 'API 테스트'}
          </button>
        </div>
      </div>
      
      {loading && <div style={{ textAlign: 'center', padding: '20px' }}>
        <div className="loading-spinner" style={{
          display: 'inline-block',
          width: '40px',
          height: '40px',
          border: '4px solid rgba(0, 0, 0, 0.1)',
          borderRadius: '50%',
          borderTop: '4px solid #007bff',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p>로딩 중...</p>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>}
      
      {error && (
        <div style={{ 
          color: 'white', 
          backgroundColor: '#dc3545',
          padding: '15px',
          borderRadius: '5px',
          marginBottom: '20px' 
        }}>
          <h3>오류 발생:</h3>
          <p>{error}</p>
          <p>브라우저 콘솔에서 더 자세한 오류 정보를 확인하세요.</p>
          <p><strong>가능한 원인:</strong></p>
          <ul>
            <li>백엔드 서버가 실행 중이지 않음</li>
            <li>API 엔드포인트가 잘못됨</li>
            <li>CORS 설정 문제</li>
            <li>데이터베이스 연결 오류</li>
          </ul>
        </div>
      )}
      
      {data && (
        <div>
          <h2>응답 데이터</h2>
          <div style={{ marginBottom: '10px' }}>
            <p><strong>데이터 타입:</strong> {Array.isArray(data) ? '배열' : typeof data}</p>
            <p><strong>데이터 길이:</strong> {Array.isArray(data) ? data.length : '해당 없음'}</p>
          </div>
          
          {Array.isArray(data) && data.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h3>데이터 미리보기 (첫 번째 항목)</h3>
              <div style={{
                background: '#f0f0f0',
                padding: '10px',
                overflow: 'auto',
                maxHeight: '200px',
                border: '1px solid #ccc',
                borderRadius: '5px'
              }}>
                <pre>{JSON.stringify(data[0], null, 2)}</pre>
              </div>
            </div>
          )}
          
          <div>
            <h3>전체 응답 데이터</h3>
            <div style={{
              background: '#f0f0f0',
              padding: '10px',
              overflow: 'auto',
              maxHeight: '500px',
              border: '1px solid #ccc',
              borderRadius: '5px'
            }}>
              <pre>{JSON.stringify(data, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
      
      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #ddd' }}>
        <h2>API 엔드포인트 목록</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>API 이름</th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>엔드포인트</th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>설명</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>영화</td>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>/api/movies</td>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>모든 영화 데이터를 가져옵니다.</td>
            </tr>
            <tr>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>스팀 게임</td>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>/api/steam-games</td>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>모든 스팀 게임 데이터를 가져옵니다.</td>
            </tr>
            <tr>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>웹툰</td>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>/api/webtoons</td>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>모든 웹툰 데이터를 가져옵니다.</td>
            </tr>
            <tr>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>웹툰 (장르별)</td>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>/api/webtoons/genre/{'{genreId}'}</td>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>특정 장르의 웹툰 데이터를 가져옵니다.</td>
            </tr>
            <tr>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>웹소설</td>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>/api/novels</td>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>모든 웹소설 데이터를 가져옵니다.</td>
            </tr>
            <tr>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>웹소설 (장르별)</td>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>/api/novels/genre/{'{genreId}'}</td>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>특정 장르의 웹소설 데이터를 가져옵니다.</td>
            </tr>
            <tr>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>넷플릭스 콘텐츠</td>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>/api/netflix-content</td>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>모든 넷플릭스 콘텐츠 데이터를 가져옵니다.</td>
            </tr>
            <tr>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>넷플릭스 (타입별)</td>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>/api/netflix-content/type/{'{type}'}</td>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>특정 타입(영화, 시리즈 등)의 넷플릭스 콘텐츠를 가져옵니다.</td>
            </tr>
            <tr>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>넷플릭스 (장르별)</td>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>/api/netflix-content/genre/{'{genreId}'}</td>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>특정 장르의 넷플릭스 콘텐츠를 가져옵니다.</td>
            </tr>
            <tr>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>넷플릭스 (연도별)</td>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>/api/netflix-content/year/{'{year}'}</td>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>특정 연도 출시 넷플릭스 콘텐츠를 가져옵니다.</td>
            </tr>
            <tr>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>넷플릭스 (검색)</td>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>/api/netflix-content/search?keyword={'{keyword}'}</td>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>키워드로 넷플릭스 콘텐츠를 검색합니다.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ApiTester;