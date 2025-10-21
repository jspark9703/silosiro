require('dotenv').config();
const express = require('express');
const path = require('path');
const { verifyToken } = require('./src/jwt');
const { createRequireAuth } = require('./src/middleware');
const { createAuthRouter } = require('./routes/auth');
const { createUserRouter } = require('./routes/user');

const app = express();


const JWT_SECRET = process.env.JWT_SECRET ;



// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(parseCookies);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));


const User = require('./src/db/entity/user');
const users = {
    async findByUsername(username) {
        return await User.findByUsername(username);
    },
    async create(username, password) {
        return await User.create(username, password);
    },
    async validateUserPassword(username, password) {
        return await User.validateUserPassword(username, password);
    },
    async getAll() {
        return await User.getAllUsers();
    },
    async deleteById(id) {
        return await User.deleteById(id);
    }
};

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
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Protected chat route
app.get('/chat', async (req, res, next) => {
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
    return res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

module.exports = {app};