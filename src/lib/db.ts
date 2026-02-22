import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20, // adjust if needed
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

function convertSqliteToPg(sql: string) {
  let paramIndex = 1;
  // Replace all ? with $1, $2, etc., which is Postgres's parameter syntax.
  let pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);

  // Convert SQLite specific functions to Postgres
  pgSql = pgSql.replace(/datetime\('now'\)/ig, 'NOW()');
  pgSql = pgSql.replace(/date\('now'\)/ig, 'CURRENT_DATE');
  pgSql = pgSql.replace(/datetime\('now',\s*'localtime'\)/ig, 'NOW()');

  return pgSql;
}

export const db = {
  prepare: (sql: string) => {
    return {
      all: async (...args: any[]) => {
        try {
          const pgSql = convertSqliteToPg(sql);
          const safeArgs = args.map(arg => arg === undefined ? null : arg);
          const result = await pool.query(pgSql, safeArgs);
          return result.rows;
        } catch (error) {
          console.error('DB query error [all]:', error, 'SQL:', sql);
          throw error;
        }
      },
      get: async (...args: any[]) => {
        try {
          const pgSql = convertSqliteToPg(sql);
          const safeArgs = args.map(arg => arg === undefined ? null : arg);
          const result = await pool.query(pgSql, safeArgs);
          return result.rows[0];
        } catch (error) {
          console.error('DB query error [get]:', error, 'SQL:', sql);
          throw error;
        }
      },
      run: async (...args: any[]) => {
        try {
          const pgSql = convertSqliteToPg(sql);
          const safeArgs = args.map(arg => arg === undefined ? null : arg);
          const result = await pool.query(pgSql, safeArgs);
          return {
            changes: result.rowCount,
            lastInsertRowid: undefined // Ignored in Postgres via this wrapper, UUIDs are used mostly anyway
          };
        } catch (error) {
          console.error('DB query error [run]:', error, 'SQL:', sql);
          throw error;
        }
      }
    };
  },
  exec: async (sql: string) => {
    try {
      await pool.query(sql);
    } catch (error) {
      console.error('DB exec error:', error, 'SQL:', sql);
      throw error;
    }
  }
};

export async function initDatabase() {
  console.log('Database initialized from Supabase.');
}
