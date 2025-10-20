const express = require('express');
const User = require('../src/db/entity/user');
const router = express.Router();

function createUserRouter(users, verifyAuthPayload) {
    // GET /dupl_check?username=foo
    router.get('/dupl_check', async (req, res) => {
        const username = (req.query.username || '').trim();
        if (!username) {
            return res.status(400).json({ ok: false, error: 'username required' });
        }
        try {
            const user = await User.findByUsername(username);
            return res.json({ ok: true, available: !user });
        } catch (e) {
            return res.status(500).json({ ok: false, error: 'check failed' });
        }
    });
	// GET /me
	router.get('/me', async (req, res) => {
		const payload = verifyAuthPayload(req);
		if (!payload || !payload.username) {
			return res.json({ ok: true, authenticated: false });
		}
		const user = payload.username;
		if (!user) {
			return res.json({ ok: true, authenticated: false });
		}
		return res.json({ ok: true, authenticated: true, user: user });
	});

	// GET /:username (basic user info)
	router.get('/:username', async (req, res) => {
		const { username } = req.params;
		const user = await User.findByUsername(username);
		if (!user) {
			return res.status(404).json({ ok: false, error: 'user not found' });
		}
		return res.json({ ok: true, user: user.getPublicInfo() });
	});

	return router;
}

module.exports = { createUserRouter };


