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

    if (content.includes("const companyId = request.headers.get('X-Company-ID');")) {
        content = content.replace(/const companyId = request\.headers\.get\('X-Company-ID'\);/g, "let companyId = request.headers.get('X-Company-ID');");
        fs.writeFileSync(file, content, 'utf8');
        count++;
    }
});
console.log('Modified const to let in', count, 'files.');
