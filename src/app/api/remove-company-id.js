const fs = require('fs');
const path = require('path');
function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            results.push(file);
        }
    });
    return results;
}
const files = walk('c:/Users/HP/Desktop/Software/frontend/src/app/api');
let count = 0;
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const target = "if (!companyId) return NextResponse.json({ error: 'Company ID required' }, { status: 400 });";

    // Use regex to catch all whitespace variations just in case
    const regex = /if\s*\(!companyId\)\s*return\s*NextResponse\.json\(\{\s*error:\s*'Company ID required'\s*\}\s*,\s*\{\s*status:\s*400\s*\}\);/g;

    if (regex.test(content)) {
        content = content.replace(regex, `// if (!companyId) return NextResponse.json({ error: 'Company ID required' }, { status: 400 });\n        if (!companyId) companyId = 'default-company';`);
        fs.writeFileSync(file, content, 'utf8');
        count++;
    }
});
console.log('Modified', count, 'files.');
