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
        } else {
            results.push(file);
        }
    });
    return results;
}

const apiDir = path.resolve(__dirname, 'src', 'app', 'api');
const files = walk(apiDir).filter(f => f.endsWith('route.ts') && f.includes('[id]'));

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('params: { id: string }') || content.includes('params: {id: string}')) {
        console.log(file);
    }
});
