require('dotenv').config();
const { Pool } = require('pg');

const sslOption = process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined;

const poolConfig = {
	host: process.env.PGHOST,
	port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
	database: process.env.PGDATABASE,
	user: process.env.PGUSER,
	password: process.env.PGPASSWORD,
	ssl: sslOption,
};


const pool = new Pool(poolConfig);

// Log DB connectivity status
(async () => {
    
    
	try {
		const client = await pool.connect();
		try {
			await client.query('SELECT 1');
			console.log(`[DB] Connected: host=${poolConfig.host || 'via-URL'} db=${poolConfig.database || '(in-URL)'} ssl=${!!poolConfig.ssl}`);
            await client.query  (`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(64) UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `);
                
		} finally {
            console.log('[DB] Schema initialized');
			client.release();
		}
	} catch (err) {
		console.error('[DB] Connection failed:', err && err.message ? err.message : err);
	}
})();

pool.on('error', (err) => {
	console.error('[DB] Pool error:', err && err.message ? err.message : err);
});



module.exports = { pool };


