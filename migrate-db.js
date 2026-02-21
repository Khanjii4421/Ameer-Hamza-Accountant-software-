const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Chain calls: db.prepare(...).all(), .get(), .run()
    content = content.replace(/(?<!await\s+)(\b\w*db\w*\.prepare\s*\([\s\S]*?\)\.(?:all|get|run)\s*\()/g, 'await $1');
    content = content.replace(/(?<!await\s+)(\b\w*stmt\w*\.(?:all|get|run)\s*\()/g, 'await $1');
    content = content.replace(/(?<!await\s+)(db\.exec\s*\()/g, 'await $1');

    // Chained statements with properties: db.prepare(...).get(...) as X
    // The previous regex already captures the function call start (.get()...)
    // It will produce await db.prepare(...).get(
    // which is syntactically correct: await db.prepare(...).get()

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

function traverse(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            traverse(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            replaceInFile(fullPath);
        }
    }
}

traverse(path.join(__dirname, 'src'));
console.log('Migration string replacements complete.');
