const fs = require('fs');

let c = fs.readFileSync('src/lib/store.ts', 'utf-8');

// Fix all: const actor = externalActor || state.profile?.name || "System";
// to guarantee string (profile.name may be undefined)
c = c.replace(
  /const actor = externalActor \|\| state\.profile\?\.name \|\| "System";/g,
  'const actor = (externalActor ?? state.profile?.name ?? "System") as string;'
);
c = c.replace(
  /const resolvedActor = actor \|\| state\.profile\?\.name \|\| "System";/g,
  'const resolvedActor = (actor ?? state.profile?.name ?? "System") as string;'
);
c = c.replace(
  /const author = externalAuthor \|\| state\.profile\?\.name \|\| "System";/g,
  'const author = (externalAuthor ?? state.profile?.name ?? "System") as string;'
);
c = c.replace(
  /const resolvedAuthor = author \|\| state\.profile\?\.name \|\| "System";/g,
  'const resolvedAuthor = (author ?? state.profile?.name ?? "System") as string;'
);

// Also fix any remaining actor: actor ?? "System", that might still have type issue
// by adding `as string`
c = c.replace(/actor: actor \?\? "System",/g, 'actor: (actor ?? "System") as string,');
c = c.replace(/actor: actor \?\? state\.profile\?\.name \?\? "System",/g, 'actor: (actor ?? state.profile?.name ?? "System") as string,');

fs.writeFileSync('src/lib/store.ts', c);
console.log('Fixed string type issues in store.ts');
