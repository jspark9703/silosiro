require('dotenv').config();
const express = require('express');
const { signToken, getJwtSecret } = require('../src/jwt');
const User = require('../src/db/entity/user');
const { setCookie } = require('../src/utils/cookie');
const router = express.Router();


function createTokenRouter(jwtSecret) {
	router.post('/token', async (req, res) => {
		const { username } = req.body || {};
		if (!username) {
			return res.status(400).json({ ok: false, error: 'username required' });
		}
	try {
		const user = await User.findByUsername(username);
		if (!user) {
			return res.status(404).json({ ok: false, error: 'user not found' });
		}
		const secret = getJwtSecret(jwtSecret);
		const token = signToken({ userId: user.id, username: user.username }, secret, { expiresIn: '1d' });
		setCookie(res, 'token', token, { httpOnly: true, sameSite: 'Lax', path: '/' });
		return res.json({ ok: true, token, username: user.username });
	} catch (e) {
		console.error('DB error in POST /token:', e);
		return res.status(500).json({ ok: false, error: 'token issue failed' });
	}
	});

	
	return router;
}

module.exports = { createTokenRouter };

