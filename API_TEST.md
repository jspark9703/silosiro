# API 테스트 가이드

이 프로젝트에서는 Jest와 Supertest를 사용하여 API 엔드포인트들을 종합적으로 테스트합니다.

## 테스트 환경 구성

### 설치된 패키지
- **Jest**: JavaScript 테스트 프레임워크
- **Supertest**: HTTP 어설션 라이브러리 (API 테스트용)

### 테스트 스크립트
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

## 테스트 구조

### 테스트 파일들
- `tests/auth.test.js` - 인증 관련 API 테스트
- `tests/user.test.js` - 사용자 관련 API 테스트
- `tests/token.test.js` - 토큰 관련 API 테스트
- `tests/integration.test.js` - 통합 시나리오 테스트
- `tests/testApp.js` - 테스트용 Express 앱 설정
- `tests/setup.js` - 테스트 환경 설정

## 테스트 대상 API 엔드포인트

### 인증 API (`/api/*`)
1. **POST /api/signup**
   - 유효한 사용자 등록
   - 중복 사용자명 처리
   - 필수 필드 검증

2. **POST /api/login**
   - 유효한 로그인
   - 잘못된 비밀번호 처리
   - 존재하지 않는 사용자 처리
   - 필수 필드 검증

3. **POST /api/logout**
   - 인증된 사용자 로그아웃
   - 인증되지 않은 사용자 처리

### 사용자 API (`/api/*`)
1. **GET /api/dupl_check**
   - 사용 가능한 사용자명 확인
   - 이미 존재하는 사용자명 확인
   - 빈 사용자명 처리

2. **GET /api/me**
   - 인증된 사용자 정보 조회
   - 인증되지 않은 사용자 처리
   - 잘못된/만료된 토큰 처리

3. **GET /api/:username**
   - 특정 사용자 정보 조회
   - 존재하지 않는 사용자 처리
   - 경로 충돌 방지

### 토큰 API (`/api/*`)
1. **POST /api/token**
   - 사용자 토큰 발급
   - 존재하지 않는 사용자 처리
   - 토큰 구조 및 보안 검증

## 통합 플로우 테스트

### 전체 사용자 플로우
1. 중복확인 → 회원가입 → 로그인 → 사용자정보 조회 → 로그아웃
1. 에러 처리 및 경계값 테스트
1. 성능 및 동시성 테스트

## 테스트 실행

### 기본 테스트 실행
```bash
npm test
```

### 감시 모드로 실행 (파일 변경 시 자동 재실행)
```bash
npm run test:watch
```

### 커버리지 보고서 생성
```bash
npm run test:coverage
```

## 테스트 결과 예시

```
Test Suites: 4 passed, 4 total
Tests:       37 passed, 37 total
Snapshots:   0 total
Time:        5.051 s
Ran all test suites.
```

## 테스트 커버리지

테스트는 다음 영역들을 포괄합니다:
- ✅ 성공적인 API 응답
- ✅ 에러 처리 및 예외 상황
- ✅ 입력 검증 및 보안
- ✅ 사용자 인증 및 권한
- ✅ 토큰 발급 및 검증
- ✅ 통합 플로우
- ✅ 동시성 및 성능 테스트

## 테스트 환경 설정

### 환경 변수
- `NODE_ENV=test`: 테스트 모드 설정
- `JWT_SECRET`: JWT 시크릿 키 (테스트용)

### 데이터베이스
- 테스트 실행 시 PostgreSQL 연결이 필요합니다
- 각 테스트는 실제 데이터베이스를 사용합니다

## 주요 테스트 패턴

### 기본 구조
```javascript
describe('API 엔드포인트', () => {
  test('성공 시나리오', async () => {
    const response = await request(app)
      .post('/api/endpoint')
      .send(data);
    
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });
  
  test('에러 시나리오', async () => {
    const response = await request(app)
      .post('/api/endpoint')
      .send(invalidData);
    
    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
  });
});
```

