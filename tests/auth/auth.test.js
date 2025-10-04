const request = require('supertest');
const app = require('./testApp');

describe('Authentication APIs', () => {
  let testUserId;
  
  beforeEach(async () => {
    // 테스트 전 정리 (필요시)
  });

  describe('POST /api/signup', () => {
    test('유효한 사용자 정보로 회원가입', async () => {
      const userData = {
        username: `testuser_${Date.now()}`,
        password: 'testpassword123'
      };

      const response = await request(app)
        .post('/api/signup')
        .send(userData)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.user).toHaveProperty('username', userData.username);
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).not.toHaveProperty('password');
      
      testUserId = response.body.user.id;
    });

    test('중복 사용자명으로 회원가입 시도', async () => {
      const userData = {
        username: 'duplicate_user',
        password: 'testpassword123'
      };

      // 첫 번째 회원가입
      await request(app)
        .post('/api/signup')
        .send(userData);

      // 중복 회원가입 시도
      const response = await request(app)
        .post('/api/signup')
        .send(userData)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(409);
      expect(response.body.ok).toBe(false);
      expect(response.body.error).toBe('username already exists');
    });

    test('필수 필드 누락 시 회원가입 실패', async () => {
      const invalidData = [
        { username: 'testuser' }, // 비밀번호 누락
        { password: 'password123' }, // 사용자명 누락
        {} // 모든 필드 누락
      ];

      for (const data of invalidData) {
        const response = await request(app)
          .post('/api/signup')
          .send(data)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(400);
        expect(response.body.ok).toBe(false);
        expect(response.body.error).toBe('username and password required');
      }
    });
  });

  describe('POST /api/login', () => {
    test('유효한 사용자 정보로 로그인', async () => {
      const userData = {
        username: `loginuser_${Date.now()}`,
        password: 'loginpassword123'
      };

      // 먼저 회원가입
      await request(app)
        .post('/api/signup')
        .send(userData)
        .expect(200);

      // 로그인 시도
      const response = await request(app)
        .post('/api/login')
        .send(userData)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.username).toBe(userData.username);
      expect(response.body.token).toBeDefined();
      expect(response.headers['set-cookie']).toBeDefined();
    });

    test('잘못된 비밀번호로 로그인 시도', async () => {
      const userData = {
        username: `wrongpassuser_${Date.now()}`,
        password: 'correctpassword123'
      };

      // 먼저 회원가입
      await request(app)
        .post('/api/signup')
        .send(userData)
        .expect(200);

      // 잘못된 비밀번호로 로그인 시도
      const response = await request(app)
        .post('/api/login')
        .send({
          username: userData.username,
          password: 'wrongpassword'
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error).toBe('invalid credentials');
    });

    test('존재하지 않는 사용자로 로그인 시도', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          username: 'nonexistentuser',
          password: 'password123'
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error).toBe('invalid credentials');
    });

    test('필수 필드 누락 시 로그인 실패', async () => {
      const invalidData = [
        { username: 'testuser' }, // 비밀번호 누락
        { password: 'password123' }, // 사용자명 누락
        {} // 모든 필드 누락
      ];

      for (const data of invalidData) {
        const response = await request(app)
          .post('/api/login')
          .send(data)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(400);
        expect(response.body.ok).toBe(false);
        expect(response.body.error).toBe('username and password required');
      }
    });
  });

  describe('POST /api/logout', () => {
    test('인증된 사용자의 로그아웃', async () => {
      // 먼저 로그인하여 토큰 받기
      const userData = {
        username: `logoutuser_${Date.now()}`,
        password: 'logoutpassword123'
      };

      // 회원가입
      await request(app)
        .post('/api/signup')
        .send(userData)
        .expect(200);

      // 로그인
      const loginResponse = await request(app)
        .post('/api/login')
        .send(userData)
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];

      // 로그아웃
      const response = await request(app)
        .post('/api/logout')
        .set('Cookie', cookies)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    });

    test('인증되지 않은 사용자의 로그아웃 시도', async () => {
      const response = await request(app)
        .post('/api/logout')
        .expect('Content-Type', /json/);

      // 인증 미들웨어에서 차단될 것으로 예상
      expect(response.status).toBe(401);
    });
  });
});
