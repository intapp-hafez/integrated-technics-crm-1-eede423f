const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/routes/**/*.tsx');
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf-8');
  if (content.includes('hafez Rahim') || content.includes('Hafez Rahim')) {
    content = content.replace(/["']hafez Rahim["']/gi, '""');
    fs.writeFileSync(f, content);
    console.log('Updated ' + f);
  }
});
