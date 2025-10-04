// 테스트용 Express 앱 설정
require('dotenv').config();
const express = require('express');
const path = require('path');

// Express 앱만 생성하고 서버는 시작하지 않음
const app = express();

// 쿠키 파싱 미들웨어 (직접 구현)
function parseCookies(req, res, next) {
	const cookieHeader = req.headers.cookie;
	req.cookies = {};
	if (cookieHeader) {
		const cookies = cookieHeader.split(';');
		cookies.forEach(cookie => {
			const [name, ...rest] = cookie.trim().split('=');
			const value = rest.join('=');
			req.cookies[name] = decodeURIComponent(value);
		});
	}
	next();
}

// Test-specific configuration
const users = {}; // 테스트용 메모리 저장소
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(parseCookies);

// Serve static files (테스트에서는 필요 없을 수 있음)
app.use(express.static(path.join(__dirname, '../public')));

// Routes import
const { verifyToken, getJwtSecret, signToken } = require('../src/jwt');
const { createRequireAuth } = require('../src/middleware');
const { createAuthRouter } = require('../routes/auth');
const { createUserRouter } = require('../routes/user');
const { createTokenRouter } = require('../routes/token');

// Auth middleware
const requireAuth = createRequireAuth(users, JWT_SECRET);

// Routers
app.use('/api', createAuthRouter(users, JWT_SECRET, requireAuth));
app.use('/api', createUserRouter(users, (req) => {
	const token = req.cookies && req.cookies.token;
	if (!token) return null;
	try {
		return verifyToken(token, JWT_SECRET);
	} catch (e) {
		return null;
	}
}));
app.use('/api', createTokenRouter(JWT_SECRET));

// Protected file route for index.html (테스트에서는 간소화)
app.get(['/', '/home'], async (req, res) => {
    const token = req.cookies && req.cookies.token;
    let payload = null;
    if (token) {
        try {
            payload = verifyToken(token, JWT_SECRET);
        } catch (e) {
            payload = null;
        }
    }
    if (!payload || !payload.username) {
        return res.status(401).json({ ok: false, error: 'not authenticated' });
    }
    
    const User = require('../src/db/entity/user');
    try {
        const user = await User.findByUsername(payload.username);
        if (!user) {
            return res.status(401).json({ ok: false, error: 'user not found' });
        }
        return res.json({ ok: true, user: user.getPublicInfo() });
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'database error' });
    }
});

// 에러 핸들링 미들웨어 추가
app.use((err, req, res, next) => {
    console.error('Test App Error:', err);
    res.status(500).json({ ok: false, error: 'Internal server error' });
});

// 404 핸들러
app.use((req, res) => {
    res.status(404).json({ ok: false, error: 'Route not found' });
});

module.exports = app;
