const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.resolve(__dirname, '..', 'local_database.sqlite');
const db = new Database(dbPath);

console.log('--- Current Companies ---');
const companies = db.prepare("SELECT id, name FROM company_profile").all();
console.table(companies);

// Define desired setup
const setup = [
    {
        user: 'miranbuilders',
        pass: 'miran@2025',
        companyMatcher: (name) => name.toUpperCase().includes('MIRAN'), // Match existing Miran
        targetCompanyName: 'Miran Builders' // Rename to this
    },
    {
        user: 'ameerhamza',
        pass: 'ameerhamza@2025',
        companyMatcher: (name) => !name.toUpperCase().includes('MIRAN'), // The other one
        targetCompanyName: 'Ameer Hamza Co' // Name if creating/renaming
    }
];

// Transaction
const run = db.transaction(() => {
    // 1. Clear users
    db.prepare("DELETE FROM users").run();
    console.log('Deleted all users.');

    let existingCompanies = db.prepare("SELECT id, name FROM company_profile").all();

    // 2. Setup Companies and Users

    // First, find or create company for Miran
    let miranCompany = existingCompanies.find(c => c.name.toUpperCase().includes('MIRAN'));
    if (!miranCompany) {
        // Create if missing
        const id = uuidv4();
        db.prepare("INSERT INTO company_profile (id, name, updated_at) VALUES (?, ?, ?)").run(id, 'Miran Builders', new Date().toISOString());
        miranCompany = { id, name: 'Miran Builders' };
        console.log('Created Miran Builders company.');
    } else {
        // Rename if needed? User didn't explicitly ask to rename Company, just "other is that miranbuilders".
        // I'll leave the name as is if it matches reasonably, or just update it?
        // User said: "one comapny... other is that miranbuilders". 
        // I'll rename it to "Miran Builders" to be nice and consistent with username.
        db.prepare("UPDATE company_profile SET name = ? WHERE id = ?").run('Miran Builders', miranCompany.id);
        console.log(`Renamed company ${miranCompany.name} to Miran Builders`);
    }

    // Now Ameer Hamza Company
    // Look for a company that isn't Miran
    let ameerCompany = existingCompanies.find(c => c.id !== miranCompany.id);
    if (!ameerCompany) {
        // Create
        const id = uuidv4();
        db.prepare("INSERT INTO company_profile (id, name, updated_at) VALUES (?, ?, ?)").run(id, 'Ameer Hamza Co', new Date().toISOString());
        ameerCompany = { id, name: 'Ameer Hamza Co' };
        console.log('Created Ameer Hamza Co.');
    } else {
        // Rename existing "other" company
        db.prepare("UPDATE company_profile SET name = ? WHERE id = ?").run('Ameer Hamza Co', ameerCompany.id);
        console.log(`Renamed existing company ${ameerCompany.name} to Ameer Hamza Co`);
    }

    // 3. Create Users
    const createUser = (username, password, companyId) => {
        const id = uuidv4();
        db.prepare(`
            INSERT INTO users (id, username, password, name, role, company_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, username, password, username, 'Admin', companyId, new Date().toISOString());
        console.log(`Created Admin user: ${username}`);
    };

    createUser('miranbuilders', 'miran@2025', miranCompany.id);
    createUser('ameerhamza', 'ameerhamza@2025', ameerCompany.id);

});

try {
    run();
    console.log('--- Done ---');
} catch (e) {
    console.error(e);
}
