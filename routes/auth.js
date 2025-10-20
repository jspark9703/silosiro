require('dotenv').config();
const express = require('express');
const { getJwtSecret, signToken } = require('../src/jwt');
const User = require('../src/db/entity/user');
const { setCookie } = require('../src/utils/cookie');
const router = express.Router();

// 쿠키 삭제 함수
function clearCookie(res, name, options = {}) {
	let cookieStr = `${name}=; Max-Age=0`;
	if (options.path) cookieStr += `; Path=${options.path}`;
	res.appendHeader = res.appendHeader || function(header, value) {
		const prev = this.getHeader(header);
		if (prev) {
			this.setHeader(header, Array.isArray(prev) ? prev.concat(value) : [prev, value]);
		} else {
			this.setHeader(header, value);
		}
	};
	res.appendHeader('Set-Cookie', cookieStr);
}

function createAuthRouter(users, jwtSecret, requireAuth) {
	// POST /signup
	router.post('/signup', async (req, res) => {
		const { username, password } = req.body;
		if (!username || !password) {
			return res.status(400).json({ ok: false, error: 'username and password required' });
		}
		try {
			const user = await User.create(username, password);
			// 회원가입 후 자동 로그인 처리
			const secret = getJwtSecret(jwtSecret);
			const token = signToken({ userId: user.id, username: user.username }, secret, { expiresIn: '1d' });
			setCookie(res, 'token', token, { httpOnly: true, sameSite: 'Lax', path: '/' });
			return res.json({ ok: true, username: user.username, token });
		} catch (err) {
			if (err && (err.code === 'USER_EXISTS' || /duplicate key/.test(String(err.message)))) {
				return res.status(409).json({ ok: false, error: 'username already exists' });
			}
			return res.status(500).json({ ok: false, error: err.message });
		}
	});

	// POST /login
	router.post('/login', async (req, res) => {
		const { username, password } = req.body;
		if (!username || !password) {
			return res.status(400).json({ ok: false, error: 'username and password required' });
		}
		try {
			const user = await User.validateUserPassword(username, password);
			if (!user) {
				return res.status(401).json({ ok: false, error: 'invalid credentials' });
			}
			const secret = getJwtSecret(jwtSecret);
			const token = signToken({ userId: user.id, username: user.username }, secret, { expiresIn: '1d' });
			setCookie(res, 'token', token, { httpOnly: true, sameSite: 'Lax', path: '/' });
			return res.json({ ok: true, username: user.username, token });
		} catch (err) {
			return res.status(500).json({ ok: false, error: err.message });
		}
	});

	// POST /logout
	router.post('/logout', requireAuth, (req, res) => {
		clearCookie(res, 'token', { path: '/' });
		return res.json({ ok: true });
	});

	return router;
}

module.exports = { createAuthRouter };
