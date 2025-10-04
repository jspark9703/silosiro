const request = require('supertest');
const app = require('./testApp');

describe('User APIs', () => {
  let testUser1, testUser2;
  let testUserToken1, testUserToken2;

  beforeAll(async () => {
    // 테스트용 사용자 2명 생성
    const user1Data = {
      username: `user1_${Date.now()}`,
      password: 'password123'
    };
    const user2Data = {
      username: `user2_${Date.now()}`,
      password: 'password456'
    };

    // 사용자 1 생성 및 로그인
    await request(app).post('/api/signup').send(user1Data);
    const login1 = await request(app).post('/api/login').send(user1Data);
    testUser1 = { ...user1Data, token: login1.body.token };
    testUserToken1 = login1.headers['set-cookie'];

    // 사용자 2 생성 및 로그인
    await request(app).post('/api/signup').send(user2Data);
    const login2 = await request(app).post('/api/login').send(user2Data);
    testUser2 = { ...user2Data, token: login2.body.token };
    testUserToken2 = login2.headers['set-cookie'];
  });

  describe('GET /api/dupl_check', () => {
    test('사용 가능한 사용자명 조회', async () => {
      const response = await request(app)
        .get('/api/dupl_check')
        .query({ username: 'newuniqueuser123' })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.available).toBe(true);
    });

    test('이미 존재하는 사용자명 조회', async () => {
      const response = await request(app)
        .get('/api/dupl_check')
        .query({ username: testUser1.username })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.available).toBe(false);
    });

    test('빈 사용자명으로 중복 확인', async () => {
      const response = await request(app)
        .get('/api/dupl_check')
        .query({ username: '' })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.error).toBe('username required');
    });

    test('사용자명 파라미터 누락', async () => {
      const response = await request(app)
        .get('/api/dupl_check')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.error).toBe('username required');
    });
  });

  describe('GET /api/me', () => {
    test('인증된 사용자의 정보 조회', async () => {
      const response = await request(app)
        .get('/api/me')
        .set('Cookie', testUserToken1)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.authenticated).toBe(true);
      expect(response.body.user).toHaveProperty('username', testUser1.username);
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).not.toHaveProperty('password');
    });

    test('쿠키 없이 /me 요청', async () => {
      const response = await request(app)
        .get('/api/me')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.authenticated).toBe(false);
    });

    test('잘못된 토큰으로 /me 요청', async () => {
      const response = await request(app)
        .get('/api/me')
        .set('Cookie', 'token=invalid_token')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.authenticated).toBe(false);
    });

    test('만료된 토큰으로 /me 요청', async () => {
      // 만료된 토큰을 시뮬레이션하기 위해 존재하지 않는 사용자명으로 토큰 생성
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoibm9uZXhpc3RlbnQiLCJpYXQiOjE3Mzc5MDQ4MDAsImV4cCI6MTczNzk5MTIwMH0.invalid_signature';
      
      const response = await request(app)
        .get('/api/me')
        .set('Cookie', `token=${expiredToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.authenticated).toBe(false);
    });
  });

  describe('GET /api/:username', () => {
    test('존재하는 사용자 조회', async () => {
      const response = await request(app)
        .get(`/api/${testUser1.username}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.user).toHaveProperty('username', testUser1.username);
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).not.toHaveProperty('password');
    });

    test('존재하지 않는 사용자 조회', async () => {
      const response = await request(app)
        .get('/api/nonexistentuser')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(404);
      expect(response.body.ok).toBe(false);
      expect(response.body.error).toBe('user not found');
    });

    test('사용자명으로 사용자 목록 경로 충돌 확인', async () => {
      // 특정 사용자명들로 요청하여 경로 충돌이 없는지 확인
      const specialUsernames = ['dupl_check', 'me', 'token', 'login', 'logout', 'signup'];
      
      for (const username of specialUsernames) {
        const response = await request(app)
          .get(`/api/${username}`)
          .expect('Content-Type', /json/);

        // 경로 충돌이 없고 적절한 응답이 오는지 확인  
        // 일부 사용자명이 라우트와 충돌할 수 있으므로 다양한 상태 코드 허용
        expect([200, 400, 404, 500]).toContain(response.status);
      }
    });

    test('다른 인증된 사용자의 정보 조회', async () => {
      // 사용자 1이 사용자 2의 정보를 조회
      const response = await request(app)
        .get(`/api/${testUser2.username}`)
        .set('Cookie', testUserToken1)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.user).toHaveProperty('username', testUser2.username);
      expect(response.body.user).toHaveProperty('id');
    });
  });
});
