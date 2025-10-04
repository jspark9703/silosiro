const request = require('supertest');
const app = require('./testApp');

describe('Token APIs', () => {
  let testUser;
  let testUserToken;

  beforeAll(async () => {
    // 테스트용 사용자 생성
    const userData = {
      username: `tokenuser_${Date.now()}`,
      password: 'tokenpassword123'
    };

    // 사용자 생성 및 로그인
    await request(app).post('/api/signup').send(userData);
    const login = await request(app).post('/api/login').send(userData);
    testUser = { ...userData, token: login.body.token };
    testUserToken = login.headers['set-cookie'];
  });

  describe('POST /api/token', () => {
    test('존재하는 사용자에 대한 토큰 발급', async () => {
      const tokenData = {
        username: testUser.username
      };

      const response = await request(app)
        .post('/api/token')
        .send(tokenData)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.username).toBe(testUser.username);
      expect(response.body.token).toBeDefined();
      expect(typeof response.body.token).toBe('string');
      expect(response.headers['set-cookie']).toBeDefined();
    });

    test('존재하지 않는 사용자에 대한 토큰 발급 시도', async () => {
      const tokenData = {
        username: 'nonexistenttokenuser'
      };

      const response = await request(app)
        .post('/api/token')
        .send(tokenData)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(404);
      expect(response.body.ok).toBe(false);
      expect(response.body.error).toBe('user not found');
    });

    test('사용자명 누락 시 토큰 발급 실패', async () => {
      const invalidData = [
        { username: '' }, // 빈 사용자명
        { password: 'password' }, // 잘못된 필드
        {} // 모든 필드 누락
      ];

      for (const data of invalidData) {
        const response = await request(app)
          .post('/api/token')
          .send(data)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(400);
        expect(response.body.ok).toBe(false);
        expect(response.body.error).toBe('username required');
      }
    });

    test('토큰 프로퍼티 확인', async () => {
      const tokenData = {
        username: testUser.username
      };

      const response = await request(app)
        .post('/api/token')
        .send(tokenData)
        .expect('Content-Type', /json/);

      expect(response.body.ok).toBe(true);
      expect(response.body.token).toBeDefined();
      
      // JWT 토큰 구조 확인 (header.payload.signature)
      const tokenParts = response.body.token.split('.');
      expect(tokenParts.length).toBe(3);
      
      // 각 부분이 base64로 인코딩된 JSON인지 확인
      const [header, payload] = tokenParts;
      expect(() => JSON.parse(Buffer.from(header, 'base64'))).not.toThrow();
      expect(() => JSON.parse(Buffer.from(payload, 'base64'))).not.toThrow();
    });

    test('발급된 토큰으로 인증 확인', async () => {
      const tokenData = {
        username: testUser.username
      };

      // 토큰 발급
      const tokenResponse = await request(app)
        .post('/api/token')
        .send(tokenData)
        .expect('Content-Type', /json/);

      expect(tokenResponse.body.ok).toBe(true);
      const newToken = tokenResponse.headers['set-cookie'];

      // 발급된 토큰으로 /me 엔드포인트 테스트
      const meResponse = await request(app)
        .get('/api/me')
        .set('Cookie', newToken)
        .expect('Content-Type', /json/);

      expect(meResponse.body.ok).toBe(true);
      expect(meResponse.body.authenticated).toBe(true);
      expect(meResponse.body.user.username).toBe(testUser.username);
    });

    test('여러 번 토큰 발급 요청', async () => {
      const tokenData = {
        username: testUser.username
      };

      // 3번 연속으로 토큰 발급 요청
      const promises = Array(3).fill().map(() => 
        request(app)
          .post('/api/token')
          .send(tokenData)
      );

      const responses = await Promise.all(promises);

      // 모든 요청이 성공해야 함
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.ok).toBe(true);
        expect(response.body.username).toBe(testUser.username);
        expect(response.body.token).toBeDefined();
      });
    });

    test('데이터베이스 연결 실패 시나리오 테스트', async () => {
      // 이 테스트는 실제 DB 연결 실패를 시뮬레이션하기 어려우므로
      // 에러 응답 형식을 확인하는 수준으로만 검증
      const response = await request(app)
        .post('/api/token')
        .send({ username: 'db_error_test_user' })
        .expect('Content-Type', /json/);

      // DB 에러 시 적절한 응답이 오는지 확인
      expect([404, 500]).toContain(response.status);
      expect(response.body.ok).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('토큰 검증 및 보안', () => {
    test('발급된 토큰의 만료 시간 확인', async () => {
      const tokenData = {
        username: testUser.username
      };

      const response = await request(app)
        .post('/api/token')
        .send(tokenData);

      expect(response.body.ok).toBe(true);
      expect(response.body.token).toBeDefined();

      const tokenParts = response.body.token.split('.');
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64'));
      
      // 토큰에 exp (만료시간) 필드가 있는지 확인
      expect(payload.exp).toBeDefined();
      expect(typeof payload.exp).toBe('number');
      
      // 현재 시간보다 미래여야 함
      expect(payload.exp).toBeGreaterThan(Date.now() / 1000);
    });

    test('발급된 토큰의 사용자 정보 확인', async () => {
      const tokenData = {
        username: testUser.username
      };

      const response = await request(app)
        .post('/api/token')
        .send(tokenData);

      expect(response.body.ok).toBe(true);
      expect(response.body.token).toBeDefined();

      const tokenParts = response.body.token.split('.');
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64'));
      
      // 토큰에 올바른 사용자 정보가 포함되어 있는지 확인
      expect(payload.username).toBe(testUser.username);
      expect(payload.userId).toBeDefined();
      expect(typeof payload.userId).toBe('number');
    });
  });
});
