import Database from 'better-sqlite3';
import path from 'path';

// Database path
const dbPath = path.resolve(process.cwd(), '..', 'local_database.sqlite');
const db = new Database(dbPath);

try {
    // Update Miran Builders (Admin 2) logo
    const result = db.prepare(`
        UPDATE company_profile 
        SET logo_url = ?,
            sidebar_logo_url = ?
        WHERE id = ?
    `).run(
        '/uploads/miran_builders_logo.jpg',
        '/uploads/miran_builders_logo.jpg',
        'company-two'
    );

    console.log('✅ Logo updated successfully for Miran Builders!');
    console.log('Changes:', result.changes);

    // Verify the update
    const company = db.prepare('SELECT * FROM company_profile WHERE id = ?').get('company-two');
    console.log('\n📋 Updated Company Profile:');
    console.log('Company:', company.name);
    console.log('Logo URL:', company.logo_url);
    console.log('Sidebar Logo URL:', company.sidebar_logo_url);

} catch (error) {
    console.error('❌ Error updating logo:', error);
} finally {
    db.close();
}
