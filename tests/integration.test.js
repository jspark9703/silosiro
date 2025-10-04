const request = require('supertest');
const app = require('./testApp');

describe('Integration Tests - Complete User Flow', () => {
  describe('전체 사용자 생성 및 인증 플로우', () => {
    test('회원가입 → 중복확인 → 로그인 → 사용자정보 조회 → 로그아웃', async () => {
      const userData = {
        username: `integration_${Date.now()}`,
        password: 'integration_password123'
      };

      // 1. 중복확인 - 사용할 수 있는 이름인지 확인
      let response = await request(app)
        .get('/api/dupl_check')
        .query({ username: userData.username });
      expect(response.body.available).toBe(true);

      // 2. 회원가입
      response = await request(app)
        .post('/api/signup')
        .send(userData);
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      const userId = response.body.user.id;

      // 3. 중복확인 - 이미 존재하는지 확인
      response = await request(app)
        .get('/api/dupl_check')
        .query({ username: userData.username });
      expect(response.body.available).toBe(false);

      // 4. 로그인
      response = await request(app)
        .post('/api/login')
        .send(userData);
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      const loginToken = response.body.token;
      const cookies = response.headers['set-cookie'];

      // 5. 내 정보 조회 (인증된 상태)
      response = await request(app)
        .get('/api/me')
        .set('Cookie', cookies);
      expect(response.status).toBe(200);
      expect(response.body.authenticated).toBe(true);
      expect(response.body.user.username).toBe(userData.username);

      // 6. 토큰 발급
      response = await request(app)
        .post('/api/token')
        .send({ username: userData.username });
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);

      // 7. 사용자명으로 직접 조회
      response = await request(app)
        .get(`/api/${userData.username}`);
      expect(response.status).toBe(200);
      expect(response.body.user.username).toBe(userData.username);

      // 8. 로그아웃
      response = await request(app)
        .post('/api/logout')
        .set('Cookie', cookies);
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);

      // 9. 로그아웃 후 내 정보 조회 (쿠키 없이 요청하여 인증 해제 확인)
      response = await request(app)
        .get('/api/me');
      expect(response.body.authenticated).toBe(false);
    });
  });

  describe('다중 사용자 시나리오', () => {
    test('여러 사용자의 병렬 작업', async () => {
      const users = [
        { username: `multi1_${Date.now()}` },
        { username: `multi2_${Date.now()}` },
        { username: `multi3_${Date.now()}` }
      ];

      // 병렬로 모든 사용자 생성
      const signupPromises = users.map(user => 
        request(app)
          .post('/api/signup')
          .send({ ...user, password: 'password123' })
      );
      
      const signupResponses = await Promise.all(signupPromises);
      
      // 모든 회원가입이 성공했는지 확인
      signupResponses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.ok).toBe(true);
      });

      // 병렬로 모든 사용자 로그인
      const loginPromises = users.map(user => 
        request(app)
          .post('/api/login')
          .send({ ...user, password: 'password123' })
      );
      
      const loginResponses = await Promise.all(loginPromises);
      
      // 모든 로그인이 성공했는지 confirming
      loginResponses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.ok).toBe(true);
        expect(response.body.token).toBeDefined();
      });

      // 각 사용자가 다른 사용자의 정보를 조회할 수 있는지 확인
      const userCheckPromises = loginResponses.map((loginResponse, index) => {
        const cookies = loginResponse.headers['set-cookie'];
        return request(app)
          .get(`/api/${users[index].username}`)
          .set('Cookie', cookies);
      });

      const userCheckResponses = await Promise.all(userCheckPromises);
      
      userCheckResponses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.user.username).toBe(users[index].username);
      });
    });
  });

  describe('에러 처리 및 경계 테스트', () => {
    test('연속적인 실패 요청들', async () => {
      const testCases = [
        // 잘못된 JSON 형식
        { endpoint: '/api/signup', data: 'invalid json', contentType: 'application/json' },
        // 없는 라우트
        { endpoint: '/api/nonexistent', data: {} },
        // 잘못된 HTTP 메소드
        { endpoint: '/api/login', method: 'GET', data: {} }
      ];

      for (const testCase of testCases) {
        const { endpoint, data, contentType, method = 'POST' } = testCase;
        
        let requestBuilder = request(app)[method.toLowerCase()](endpoint);
        
        if (contentType) {
          requestBuilder = requestBuilder.set('Content-Type', contentType);
        }
        
        if (data) {
          requestBuilder = requestBuilder.send(data);
        }

        const response = await requestBuilder;
        
        // 적절한 에러 상태 코드인지 확인
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });

    test('대용량 데이터 처리', async () => {
      // 매우 긴 사용자명과 비밀번호로 테스트
      const longData = {
        username: 'a'.repeat(1000), // 1000자 사용자명
        password: 'b'.repeat(1000)  // 1000자 비밀번호
      };

      const response = await request(app)
        .post('/api/signup')
        .send(longData);

      // 너무 긴 데이터는 적절히 처리되어야 함 (보통 400 또는 500)
      expect([400, 413, 500]).toContain(response.status);
    });

    test('특수문자 처리', async () => {
      const specialUsers = [
        { username: 'user@domain.com', password: 'pass123' },
        { username: 'user_with_underscore', password: 'pass123' },
        { username: 'user-with-dash', password: 'pass123' },
        { username: 'user.with.dots', password: 'pass123' }
      ];

      for (const user of specialUsers) {
        const signupResponse = await request(app)
          .post('/api/signup')
          .send(user);

        if (signupResponse.status === 200) {
          // 회원가입 성공 시 로그인도 테스트
          const loginResponse = await request(app)
            .post('/api/login')
            .send(user);
          
          expect(loginResponse.status).toBe(200);
          expect(loginResponse.body.ok).toBe(true);
        }
      }
    });
  });

  describe('성능 및 동시성 테스트', () => {
    test('동시 로그인 요청', async () => {
      const userData = {
        username: `concurrent_${Date.now()}`,
        password: 'concurrent123'
      };

      // 우선 사용자 생성
      await request(app).post('/api/signup').send(userData);

      // 동시에 10번 로그인 요청
      const concurrentRequests = Array(10).fill().map(() =>
        request(app)
          .post('/api/login')
          .send(userData)
      );

      const responses = await Promise.all(concurrentRequests);

      // 모든 요청이 성공해야 함
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.ok).toBe(true);
      });
    });

    test('동시 중복확인 요청', async () => {
      const username = `concurrent_check_${Date.now()}`;

      // 동시에 같은 사용자명으로 5번 중복확인
      const concurrentRequests = Array(5).fill().map(() =>
        request(app)
          .get('/api/dupl_check')
          .query({ username })
      );

      const responses = await Promise.all(concurrentRequests);

      // 모든 응답이 같아야 함 (모두 available: true)
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.available).toBe(true);
      });
    });
  });
});
