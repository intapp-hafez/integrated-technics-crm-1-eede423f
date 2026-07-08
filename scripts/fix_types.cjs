const fs = require('fs');

let c = fs.readFileSync('src/lib/store.ts', 'utf-8');

// All const actor = externalActor || ... lines — already inside bodies, fine
// The issue is logHistory({ actor: actor ... }) where actor is string | undefined
// and HistoryEntry.actor is string.
// Fix: replace `actor: actor,` and `actor,` inside logHistory calls with nullish coalesced version
// More targeted: find `actor,` or `actor: actor,` on lines that are inside logHistory({...}) calls
// The simplest fix: where we have const actor = externalActor || ... || "System", it always returns string.
// The issue is that some actions still pass the optional param directly.

// Fix all patterns where actor variable might be undefined being passed to logHistory
// Replace: actor: actor, -> actor: actor ?? "System",
// Replace: actor, (shorthand in object) -> actor: actor ?? "System",

// Actually the cleanest fix is to change all actor logHistory usages to guarantee string
c = c.replace(/(\s+)actor: actor,\n/g, '$1actor: actor ?? "System",\n');
c = c.replace(/(\s+)actor,\n/g, '$1actor: actor ?? "System",\n');

// Also fix full_name_en that doesn't exist on Profile type  
// The Profile type likely only has name, not full_name_en
// Just remove the full_name_en references from inside action bodies (not default params)
c = c.replace(/ \|\| state\.profile\?\.full_name_en/g, '');

fs.writeFileSync('src/lib/store.ts', c);
console.log('Fixed actor type issues');
