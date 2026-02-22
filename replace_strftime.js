const fs = require('fs');
let content = fs.readFileSync('c:/Users/HP/Desktop/Software/frontend/src/app/api/hr-attendance/route.ts', 'utf8');
content = content.replace(/query \+= ` AND strftime\('%Y-%m', date\) = \?`;\s+params\.push\(month\);/g, "query += ` AND date LIKE ?`;\n            params.push(month + '%');");
fs.writeFileSync('c:/Users/HP/Desktop/Software/frontend/src/app/api/hr-attendance/route.ts', content);
console.log('done');
