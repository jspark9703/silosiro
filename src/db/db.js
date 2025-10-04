require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

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
			
			// Read and execute all SQL files from initialize folder
			const initializeDir = path.join(__dirname, 'sql', 'initailize');
			const sqlFiles = fs.readdirSync(initializeDir).filter(file => file.endsWith('.sql'));
			
			for (const sqlFile of sqlFiles) {
				const sqlPath = path.join(initializeDir, sqlFile);
				const sqlContent = fs.readFileSync(sqlPath, 'utf8');
				console.log(`[DB] Executing schema: ${sqlFile}`);
				await client.query(sqlContent);
			}
                
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


