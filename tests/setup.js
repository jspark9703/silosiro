// 테스트 환경 설정
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';

// Jest timeout 설정
jest.setTimeout(10000);

// Jest 설정
jest.resetModules();

// 글로벌 테스트 헬퍼 함수들
global.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

