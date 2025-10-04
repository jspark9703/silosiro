require('dotenv').config();
const express = require('express');
const path = require('path');
const { verifyToken, getJwtSecret, signToken } = require('./src/jwt');
const { createRequireAuth } = require('./src/middleware');
const { createAuthRouter } = require('./routes/auth');
const { createUserRouter } = require('./routes/user');

const app = express();
const PORT = 3000;


const JWT_SECRET = process.env.JWT_SECRET ;

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

// (Deprecated) custom cookie/JWT helpers removed in favor of jsonwebtoken

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(parseCookies);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));


// Routers
const requireAuth = createRequireAuth(users, JWT_SECRET);
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

// Token routes
const { createTokenRouter } = require('./routes/token');
app.use('/api', createTokenRouter(JWT_SECRET));

// Protected file route for index.html
app.get(['/', '/home'], async (req, res, next) => {
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
        return res.redirect('/login.html');
    }
    const User = require('./src/db/entity/user');
    try {
        const user = await User.findByUsername(payload.username);
        if (!user) {
            return res.redirect('/login.html');
        }
    } catch (e) {
        return res.redirect('/login.html');
    }
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});
