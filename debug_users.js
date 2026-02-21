const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'local_database.sqlite');
const db = new Database(dbPath);

console.log('CHECKING LEDGER INTEGRITY:');

// Query ledger entries and join with client to check if company_ids match
const crossCompanyClients = db.prepare(`
    SELECT 
        l.id as ledger_id, 
        l.company_id as ledger_company, 
        c.id as client_id, 
        c.company_id as client_company,
        c.name as client_name
    FROM ledger_entries l
    JOIN clients c ON l.client_id = c.id
    WHERE l.company_id != c.company_id
`).all();

if (crossCompanyClients.length > 0) {
    console.log('VIOLATION FOUND: Ledger entries referencing clients from different companies:');
    console.table(crossCompanyClients);
} else {
    console.log('OK: No cross-company client references in Ledger.');
}

// Check Projects
const crossCompanyProjects = db.prepare(`
    SELECT 
        l.id as ledger_id, 
        l.company_id as ledger_company, 
        p.id as project_id, 
        p.company_id as project_company,
        p.title
    FROM ledger_entries l
    JOIN projects p ON l.project_id = p.id
    WHERE l.company_id != p.company_id
`).all();

if (crossCompanyProjects.length > 0) {
    console.log('VIOLATION FOUND: Ledger entries referencing projects from different companies:');
    console.table(crossCompanyProjects);
} else {
    console.log('OK: No cross-company project references in Ledger.');
}


db.close();
