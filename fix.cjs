const fs = require('fs');
const path = require('path');

function walkSync(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkSync(dirPath, callback) : callback(dirPath);
  });
}

const patterns = [
  /{(\w+)\.expectedCloseDate}/g,
  /{(\w+)\.lastUpdate}/g,
  /{(\w+)\.dueDate}/g,
  /{(\w+)\.date}/g,
  /{(\w+)\.created_at\.slice\(0,\s*10\)}/g,
  /{(\w+)\.updated_at\.slice\(0,\s*10\)}/g
];

walkSync('src', filePath => {
  if (!filePath.endsWith('.tsx')) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  let needsImport = false;
  
  patterns.forEach((regex, i) => {
    content = content.replace(regex, (match, v) => {
      needsImport = true;
      if (i === 4) return `{formatDate(${v}.created_at)}`;
      if (i === 5) return `{formatDate(${v}.updated_at)}`;
      const prop = match.slice(v.length + 2, -1);
      return `{formatDate(${v}.${prop})}`;
    });
  });

  // also replace something like `{a.dueDate} {a.time}` which may have been matched
  // But wait, the first replace `{a.dueDate}` would become `{formatDate(a.dueDate)}`.
  // So it's fine.

  if (needsImport && content !== original && !content.includes('formatDate')) {
    if (content.includes("import { shortId } from \"@/lib/utils\"")) {
        content = content.replace("import { shortId }", "import { shortId, formatDate }");
    } else if (content.includes("import { cn } from \"@/lib/utils\"")) {
        content = content.replace("import { cn }", "import { cn, formatDate }");
    } else if (content.includes("import { cn, shortId } from \"@/lib/utils\"")) {
        content = content.replace("import { cn, shortId }", "import { cn, shortId, formatDate }");
    } else {
        const importStatement = `import { formatDate } from "@/lib/utils";\n`;
        content = importStatement + content;
    }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Updated ' + filePath);
  }
});
