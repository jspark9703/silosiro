const { getJwtSecret, verifyToken } = require('./jwt');

function createRequireAuth(users, jwtSecret) {
    return async function requireAuth(req, res, next) {
		const token = req.cookies && req.cookies.token;
		const secret = getJwtSecret(jwtSecret);
		if (!token) {
			return res.status(401).json({ ok: false, error: 'Unauthorized' });
		}
		try {
            const payload = verifyToken(token, secret);
            if (!payload || !payload.username) {
				return res.status(401).json({ ok: false, error: 'Unauthorized' });
			}
			next();
		} catch (err) {
			return res.status(401).json({ ok: false, error: 'Unauthorized' });
		}
	};
}

module.exports = { createRequireAuth };
