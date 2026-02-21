import Database from 'better-sqlite3';
import path from 'path';

// Database path
const dbPath = path.resolve(process.cwd(), '..', 'local_database.sqlite');
const db = new Database(dbPath);

try {
    // Update Miran Builders (Admin 2) with left logo
    const result = db.prepare(`
        UPDATE company_profile 
        SET sidebar_logo_url = ?
        WHERE id = ?
    `).run(
        '/uploads/miran_logo_left.png',
        'company-two'
    );

    console.log('✅ Left logo updated successfully for Miran Builders!');
    console.log('Changes:', result.changes);

    // Verify the update
    const company = db.prepare('SELECT * FROM company_profile WHERE id = ?').get('company-two') as any;
    console.log('\n📋 Updated Company Profile:');
    console.log('Company:', company.name);
    console.log('Logo URL (watermark):', company.logo_url);
    console.log('Sidebar Logo URL (left corner):', company.sidebar_logo_url);

} catch (error) {
    console.error('❌ Error updating logo:', error);
} finally {
    db.close();
}
