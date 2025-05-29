import React, { useState } from 'react';
import api from '../api';

// API 연결 테스트용 컴포넌트 (개발/디버깅용)
const APITestComponent = () => {
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [testUser] = useState('testuser'); // 테스트용 사용자

  const runTest = async (testName, testFunction) => {
    setLoading(true);
    try {
      console.log(`테스트 시작: ${testName}`);
      const result = await testFunction();
      console.log(`테스트 성공: ${testName}`, result);
      setTestResults(prev => ({
        ...prev,
        [testName]: { success: true, data: result }
      }));
    } catch (error) {
      console.error(`테스트 실패: ${testName}`, error);
      setTestResults(prev => ({
        ...prev,
        [testName]: { success: false, error: error.message }
      }));
    }
    setLoading(false);
  };

  const tests = [
    {
      name: 'getContentTypes',
      description: '콘텐츠 타입 목록 조회',
      test: () => api.recommendations.getContentTypes()
    },
    {
      name: 'getGenres', 
      description: '장르 목록 조회',
      test: () => api.recommendations.getGenres()
    },
    {
      name: 'getInitialRecommendations',
      description: '초기 추천 조회',
      test: () => api.recommendations.getInitialRecommendations(testUser)
    },
    {
      name: 'getTraditionalRecommendations',
      description: '전통적 추천 조회', 
      test: () => api.recommendations.getTraditionalRecommendations(testUser)
    },
    {
      name: 'getUserPreferences',
      description: '사용자 선호도 조회',
      test: () => api.recommendations.getUserPreferences(testUser)
    }
  ];

  const runAllTests = async () => {
    setTestResults({});
    for (const test of tests) {
      await runTest(test.name, test.test);
      // 테스트 간 짧은 지연
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      border: '1px solid #ddd', 
      borderRadius: '8px',
      margin: '20px',
      backgroundColor: '#f9f9f9'
    }}>
      <h3>🔧 API 연결 테스트</h3>
      <p>백엔드 API 연결 상태를 확인합니다.</p>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={runAllTests}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '테스트 중...' : '모든 API 테스트 실행'}
        </button>
      </div>

      <div style={{ display: 'grid', gap: '10px' }}>
        {tests.map(test => (
          <div key={test.name} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px',
            backgroundColor: 'white',
            borderRadius: '4px',
            border: '1px solid #eee'
          }}>
            <div>
              <strong>{test.name}</strong>
              <br />
              <small>{test.description}</small>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {testResults[test.name] && (
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  backgroundColor: testResults[test.name].success ? '#d4edda' : '#f8d7da',
                  color: testResults[test.name].success ? '#155724' : '#721c24'
                }}>
                  {testResults[test.name].success ? '✅ 성공' : '❌ 실패'}
                </span>
              )}
              
              <button
                onClick={() => runTest(test.name, test.test)}
                disabled={loading}
                style={{
                  padding: '5px 10px',
                  fontSize: '12px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                테스트
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 테스트 결과 상세 정보 */}
      {Object.keys(testResults).length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h4>📋 테스트 결과 상세</h4>
          <pre style={{
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: '4px',
            fontSize: '12px',
            overflow: 'auto',
            maxHeight: '300px'
          }}>
            {JSON.stringify(testResults, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
        <strong>💡 사용 방법:</strong>
        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
          <li>개별 API를 테스트하려면 각 항목의 "테스트" 버튼을 클릭</li>
          <li>모든 API를 한번에 테스트하려면 "모든 API 테스트 실행" 버튼을 클릭</li>
          <li>실패한 항목이 있으면 브라우저 개발자 도구 콘솔에서 자세한 오류 확인</li>
          <li>백엔드 서버가 실행 중인지 확인 (http://localhost:8080)</li>
        </ul>
      </div>
    </div>
  );
};

export default APITestComponent;