const fs = require("fs");
const path = require("path");

function walkSync(dir, callback) {
  fs.readdirSync(dir).forEach((f) => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkSync(dirPath, callback) : callback(dirPath);
  });
}

walkSync("src", (filePath) => {
  if (!filePath.endsWith(".tsx")) return;
  let content = fs.readFileSync(filePath, "utf8");
  let original = content;

  content = content.replace(
    /\{l\.expectedCloseDate \|\| ("—"|'—')\}/g,
    "{formatDate(l.expectedCloseDate)}",
  );
  content = content.replace(
    /\{\(lead as any\)\.expectedCloseDate \|\| ("—"|'—')\}/g,
    "{formatDate((lead as any).expectedCloseDate)}",
  );
  content = content.replace(
    /\['Expected Close',\s*\(lead as any\)\.expectedCloseDate \|\| '—'\],/g,
    `['Expected Close', formatDate((lead as any).expectedCloseDate)],`,
  );

  if (content !== original && !content.includes("formatDate")) {
    if (content.includes('import { shortId } from "@/lib/utils"')) {
      content = content.replace("import { shortId }", "import { shortId, formatDate }");
    } else if (content.includes('import { cn } from "@/lib/utils"')) {
      content = content.replace("import { cn }", "import { cn, formatDate }");
    } else if (content.includes('import { cn, shortId } from "@/lib/utils"')) {
      content = content.replace("import { cn, shortId }", "import { cn, shortId, formatDate }");
    } else {
      const importStatement = `import { formatDate } from "@/lib/utils";\n`;
      content = importStatement + content;
    }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log("Updated " + filePath);
  }
});
