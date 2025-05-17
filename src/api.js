import axios from 'axios';

// 백엔드 API 호출을 위한 서비스 모듈
const api = {
  // 영화 데이터 가져오기
  getMovies: async () => {
    try {
      console.log('영화 API 호출 중...');
      const response = await axios.get('http://localhost:8080/api/movies');
      console.log('영화 API 응답:', response);
      
      if (response.status === 200) {
        return response.data;
      } else {
        console.warn('API 응답이 성공이지만 상태 코드가 200이 아닙니다:', response.status);
        return [];
      }
    } catch (error) {
      console.error('영화 데이터를 가져오는 중 오류 발생:', error);
      if (error.response) {
        // 서버에서 응답이 왔지만 에러 상태 코드 (4xx, 5xx)
        console.error('서버 응답 오류:', error.response.status, error.response.data);
      } else if (error.request) {
        // 요청은 보냈지만 응답이 없음
        console.error('응답 없음:', error.request);
      } else {
        // 요청을 만드는 중에 오류 발생
        console.error('요청 설정 오류:', error.message);
      }
      throw error;
    }
  },
  
  // 스팀 게임 데이터 가져오기
  getSteamGames: async () => {
    try {
      console.log('게임 API 호출 중...');
      const response = await axios.get('http://localhost:8080/api/steam-games');
      console.log('게임 API 응답:', response);
      
      if (response.status === 200) {
        return response.data;
      } else {
        console.warn('API 응답이 성공이지만 상태 코드가 200이 아닙니다:', response.status);
        return [];
      }
    } catch (error) {
      console.error('게임 데이터를 가져오는 중 오류 발생:', error);
      if (error.response) {
        // 서버에서 응답이 왔지만 에러 상태 코드 (4xx, 5xx)
        console.error('서버 응답 오류:', error.response.status, error.response.data);
      } else if (error.request) {
        // 요청은 보냈지만 응답이 없음
        console.error('응답 없음:', error.request);
      } else {
        // 요청을 만드는 중에 오류 발생
        console.error('요청 설정 오류:', error.message);
      }
      throw error;
    }
  }
};

// movies와 steam_game 테이블 조회를 위한 백엔드 서버 예시 (Express.js)
/*
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const app = express();

// PostgreSQL 연결 설정
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'aodDB',
  password: '당신의_비밀번호',
  port: 5432,
});

app.use(cors());
app.use(express.json());

// 영화 데이터 API 엔드포인트
app.get('/api/movies', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM movies');
    res.json(result.rows);
  } catch (error) {
    console.error('영화 데이터 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 스팀 게임 데이터 API 엔드포인트
app.get('/api/steam-games', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM steam_game');
    res.json(result.rows);
  } catch (error) {
    console.error('게임 데이터 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 서버 시작
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});
*/

export default api;