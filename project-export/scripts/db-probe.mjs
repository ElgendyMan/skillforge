import mysql from "mysql2/promise";
const pool = mysql.createPool(process.env.DATABASE_URL);
const started = Date.now();
const [rows] = await pool.query("SELECT 1 AS ok");
console.log({ rows, elapsedMs: Date.now() - started });
await pool.end();
