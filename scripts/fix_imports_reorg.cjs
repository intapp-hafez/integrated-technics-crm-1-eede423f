const fs = require('fs');
const path = require('path');

const moveMap = {
  // chat
  'ChatWithContacts': 'chat/ChatWithContacts',
  'EmployeeChat': 'chat/EmployeeChat',
  'RealChat': 'chat/RealChat',
  
  // shared
  'ConfirmDialog': 'shared/ConfirmDialog',
  'CopyIdButton': 'shared/CopyIdButton',
  'GlobalSearch': 'shared/GlobalSearch',
  'LocationPicker': 'shared/LocationPicker',
  'PhoneInput': 'shared/PhoneInput',

  // email
  'EmailJobsInbox': 'email/EmailJobsInbox',
  'SendEmailEditor': 'email/SendEmailEditor',

  // activities
  'ActivityApprovalCard': 'activities/ActivityApprovalCard',
  'ActivityDetailView': 'activities/ActivityDetailView',
  'NewActivityDialog': 'activities/NewActivityDialog',
  'RejectActivityDialog': 'activities/RejectActivityDialog',

  // pipeline
  'PipelineBoard': 'pipeline/PipelineBoard',
  'PipelineFilters': 'pipeline/PipelineFilters',
  'StageTransitionDialog': 'pipeline/StageTransitionDialog',
  'LeadWonCelebration': 'pipeline/LeadWonCelebration',
};

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

function fixImports(dirPath) {
  if (!dirPath.endsWith('.tsx') && !dirPath.endsWith('.ts')) return;
  
  let content = fs.readFileSync(dirPath, 'utf8');
  let changed = false;

  for (const [oldName, newPath] of Object.entries(moveMap)) {
    const regex = new RegExp(`from\\s+['"]@/components/${oldName}['"]`, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, `from "@/components/${newPath}"`);
      changed = true;
    }
    
    // Also match relative imports without @/
    const regexRel = new RegExp(`from\\s+['"](\\.\\./)+components/${oldName}['"]`, 'g');
    if (regexRel.test(content)) {
      content = content.replace(regexRel, (match, prefix) => {
        return `from "${prefix}components/${newPath}"`;
      });
      changed = true;
    }
    
    // Also match relative imports like ./components/ inside the same dir
    const regexLocal = new RegExp(`from\\s+['"]\\.\\/${oldName}['"]`, 'g');
    if (regexLocal.test(content)) {
      // If we're inside components/, a sibling moved to a folder means we have to reference the folder
      content = content.replace(regexLocal, `from "./${newPath}"`);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(dirPath, content, 'utf8');
    console.log(`Updated imports in ${dirPath}`);
  }
}

walkDir(path.join(__dirname, '../src'), fixImports);
console.log('Done!');
