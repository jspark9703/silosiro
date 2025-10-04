const { pool } = require('../db');
const bcrypt = require('bcryptjs');

// user 객체 정의
class User {
    constructor(id, username, passwordHash = null, createdAt = null) {
        this.initialized = false;
        this.id = id;
        this.username = username;
        this.passwordHash = passwordHash;
        this.createdAt = createdAt;
    }
    async initialize() {
        await this.ensureSchema();
        this.initialized = true;
    }
    // 인스턴스 메서드들
    getPublicInfo() {
        if (!this.initialized) {
            throw new Error('User not initialized');
        }
        return {
            id: this.id,
            username: this.username,
            createdAt: this.createdAt
        };
    }

    // 정적 메서드들 - 데이터베이스와의 상호작용
static async ensureSchema() {
	await pool.query(`
		CREATE TABLE IF NOT EXISTS users (
			id SERIAL PRIMARY KEY,
			username VARCHAR(64) UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);
	`);
}

    async validatePassword(password) {
        if (!this.passwordHash) return false;
        return await bcrypt.compare(password, this.passwordHash);
    }

    // 정적 메서드들 - 데이터베이스와의 상호작용
    static async findByUsername(username) {
        const { rows } = await pool.query(
            'SELECT id, username, password_hash, created_at FROM users WHERE username = $1', 
            [username]
        );
        if (!rows[0]) return null;
        return new User(
            rows[0].id, 
            rows[0].username, 
            rows[0].password_hash, 
            rows[0].created_at
        );
    }

    static async findById(id) {
        const { rows } = await pool.query(
            'SELECT id, username, password_hash, created_at FROM users WHERE id = $1', 
            [id]
        );
        if (!rows[0]) return null;
        return new User(
            rows[0].id, 
            rows[0].username, 
            rows[0].password_hash, 
            rows[0].created_at
        );
    }

    static async create(username, password) {
        // 사용자명 중복 체크
        const existing = await this.findByUsername(username);
        if (existing) {
            const err = new Error('username already exists');
            err.code = 'USER_EXISTS';
            throw err;
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const { rows } = await pool.query(
            'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at',
            [username, passwordHash]
        );
        
        return new User(
            rows[0].id, 
            rows[0].username, 
            passwordHash, 
            rows[0].created_at
        );
    }

    static async validateUserPassword(username, password) {
        const user = await this.findByUsername(username);
        if (!user) return null;
        
        const isValid = await user.validatePassword(password);
        return isValid ? user : null;
    }

    static async getAllUsers() {
        const { rows } = await pool.query(
            'SELECT id, username, created_at FROM users ORDER BY created_at DESC'
        );
        return rows.map(row => new User(row.id, row.username, null, row.created_at));
    }

    static async deleteById(id) {
        const { rowCount } = await pool.query(
            'DELETE FROM users WHERE id = $1', 
            [id]
        );
        return rowCount > 0;
    }

    static async updatePassword(id, newPassword) {
        const passwordHash = await bcrypt.hash(newPassword, 10);
        const { rowCount } = await pool.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [passwordHash, id]
        );
        return rowCount > 0;
    }
}

module.exports = User;