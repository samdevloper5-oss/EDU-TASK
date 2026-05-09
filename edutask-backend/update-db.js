const fs = require('fs');
const { Client } = require('pg');
const env = require('./src/config/env');

async function run() {
    const sql = fs.readFileSync('update.sql', 'utf8');
    const client = new Client({
        connectionString: env.pg.connectionString,
        ssl: env.pg.ssl ? { rejectUnauthorized: false } : undefined,
    });

    await client.connect();
    try {
        await client.query(sql);
        console.log("DB update successful");
    } catch (e) {
        console.error("DB update failed:", e);
    } finally {
        await client.end();
    }
}

run();
