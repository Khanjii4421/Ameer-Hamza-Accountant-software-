const Database = require('better-sqlite3');
const path = require('path');

try {
    const dbPath = path.resolve(__dirname, '..', 'local_database.sqlite');
    console.log('Opening DB at:', dbPath);
    const db = new Database(dbPath, { verbose: console.log });

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Tables:', tables.map(t => t.name));

    if (tables.find(t => t.name === 'users')) {
        const columns = db.prepare("PRAGMA table_info(users)").all();
        console.log('Users Columns:', columns.map(c => `${c.name} (${c.type})`));
    }

    const usersOld = tables.find(t => t.name === 'users_old_role_mig');
    if (usersOld) {
        console.log('CRITICAL: users_old_role_mig exists!');
    } else {
        console.log('users_old_role_mig does NOT exist.');
    }

} catch (err) {
    console.error('Error details:', err);
}
