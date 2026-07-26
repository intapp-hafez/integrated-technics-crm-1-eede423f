const fs = require('fs');
const path = require('path');

function walkSync(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkSync(dirPath, callback) : callback(dirPath);
  });
}

walkSync('src', filePath => {
  if (!filePath.endsWith('.tsx')) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  if (content.includes('formatDate(') && !content.includes('import { formatDate }') && !content.includes(', formatDate }')) {
    if (content.includes("import { shortId } from \"@/lib/utils\"")) {
        content = content.replace("import { shortId } from \"@/lib/utils\"", "import { shortId, formatDate } from \"@/lib/utils\"");
    } else if (content.includes("import { cn } from \"@/lib/utils\"")) {
        content = content.replace("import { cn } from \"@/lib/utils\"", "import { cn, formatDate } from \"@/lib/utils\"");
    } else if (content.includes("import { cn, shortId } from \"@/lib/utils\"")) {
        content = content.replace("import { cn, shortId } from \"@/lib/utils\"", "import { cn, shortId, formatDate } from \"@/lib/utils\"");
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
