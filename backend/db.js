const { Pool } = require('pg');

// It MUST read from the environment variable.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

module.exports = pool;