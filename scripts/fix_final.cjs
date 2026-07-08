const fs = require('fs');

let c = fs.readFileSync('src/lib/store.ts', 'utf-8');

// The core problem: optional actor/author params are assigned to HistoryEntry.actor which is `string`.
// Solution: in every action body, resolve optional param to a guaranteed string.

// Pattern 1: moveLead - the `actor` variable is optional (actor?: string)
// There's no const resolution yet in moveLead, so add it after the if(from && from !== to) line
c = c.replace(
  `if (from && from !== to) {\n      const label`,
  `if (from && from !== to) {\n      const resolvedActor: string = actor ?? state.profile?.name ?? "System";\n      const label`
);
// Then fix the logHistory call in moveLead to use resolvedActor
c = c.replace(
  `        module: "pipeline",\n        actor,\n        target: company || leadId,`,
  `        module: "pipeline",\n        actor: resolvedActor,\n        target: company || leadId,`
);

// Pattern 2: addNote - author is optional
c = c.replace(
  `  addNote(leadId: string, text: string, author?: string) {\n    const note: Note = { id: id("N"), leadId, ts: now(), author, text };`,
  `  addNote(leadId: string, text: string, author?: string) {\n    const resolvedAuthor: string = author ?? state.profile?.name ?? "System";\n    const note: Note = { id: id("N"), leadId, ts: now(), author: resolvedAuthor, text };`
);
c = c.replace(
  `      actor: author,\n      target: company,\n      action: "Added note",`,
  `      actor: resolvedAuthor,\n      target: company,\n      action: "Added note",`
);

// Pattern 3: Generic fix — replace all remaining `actor: actor,` (shorthand/explicit) that aren't yet resolved
// These appear in places that already have `const actor: string = ...` so actor IS string already.
// But if the TS error still triggers, it means the const wasn't typed correctly.
// Let's add explicit `: string` type annotation to all `const actor =` declarations
c = c.replace(/const actor = externalActor \?\? state\.profile\?\.name \?\? "System";/g,
  'const actor: string = externalActor ?? state.profile?.name ?? "System";');
c = c.replace(/const actor = \(externalActor \?\? state\.profile\?\.name \?\? "System"\) as string;/g,
  'const actor: string = externalActor ?? state.profile?.name ?? "System";');

c = c.replace(/const resolvedActor = actor \?\? state\.profile\?\.name \?\? "System";/g,
  'const resolvedActor: string = actor ?? state.profile?.name ?? "System";');
c = c.replace(/const resolvedActor = \(actor \?\? state\.profile\?\.name \?\? "System"\) as string;/g,
  'const resolvedActor: string = actor ?? state.profile?.name ?? "System";');

c = c.replace(/const author = externalAuthor \?\? state\.profile\?\.name \?\? "System";/g,
  'const author: string = externalAuthor ?? state.profile?.name ?? "System";');
c = c.replace(/const resolvedAuthor = author \?\? state\.profile\?\.name \?\? "System";/g,
  'const resolvedAuthor: string = author ?? state.profile?.name ?? "System";');
c = c.replace(/const resolvedAuthor = \(author \?\? state\.profile\?\.name \?\? "System"\) as string;/g,
  'const resolvedAuthor: string = author ?? state.profile?.name ?? "System";');

// Any remaining `actor: actor ?? "System"` patterns in logHistory
c = c.replace(/actor: actor \?\? "System",/g, 'actor: String(actor ?? "System"),');
c = c.replace(/actor: String\(actor \?\? "System"\),/g, 'actor: (actor ?? "System") as string,');

// Fix `author: author,` in addAttachment logHistory 
c = c.replace(/actor: String\(resolvedAuthor\),/g, 'actor: resolvedAuthor,');
c = c.replace(/actor: String\(actor \?\? "System"\),/g, 'actor: (actor ?? state.profile?.name ?? "System") as string,');
c = c.replace(/actor: String\(resolvedActor\),/g, 'actor: resolvedActor,');

fs.writeFileSync('src/lib/store.ts', c);
console.log('Done. Checking for remaining issues...');

// Quick sanity check
const remaining = (c.match(/actor: actor[,\s]/g) || []).length;
const remaining2 = (c.match(/actor: author[,\s]/g) || []).length;
console.log(`Remaining bare actor: actor = ${remaining}, actor: author = ${remaining2}`);
