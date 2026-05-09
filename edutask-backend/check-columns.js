const { Client } = require('pg');
const env = require('./src/config/env');

async function run() {
    const client = new Client({
        connectionString: env.pg.connectionString,
        ssl: env.pg.ssl ? { rejectUnauthorized: false } : undefined,
    });

    await client.connect();
    try {
        const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND table_schema = 'public'");
        const cols = res.rows.map(r => r.column_name).sort();
        console.log("Profiles Columns:", cols);
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
