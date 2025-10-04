require('dotenv').config();
const jwt = require('jsonwebtoken');

function getJwtSecret(overrideSecret) {
	return overrideSecret || process.env.JWT_SECRET ;
}

function signToken(payload, overrideSecret, options = { expiresIn: '1d' }) {
	const secret = getJwtSecret(overrideSecret);
	return jwt.sign(payload, secret, options);
}

function verifyToken(token, overrideSecret) {
	const secret = getJwtSecret(overrideSecret);
	return jwt.verify(token, secret);
}

module.exports = { getJwtSecret, signToken, verifyToken };


