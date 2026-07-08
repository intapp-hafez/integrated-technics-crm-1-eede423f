const fs = require('fs');

let c = fs.readFileSync('src/lib/store.ts', 'utf-8');

// The remaining errors are from patterns like:
//   actor: actor ?? "System",    <- actor is still string|undefined because ?? doesn't cast
// We need to use non-null assertion or a proper fallback that TS recognizes as string.

// Strategy: Replace every `actor: actor ?? "System"` pattern (including cast variants)
// with `actor: String(actor ?? "System")` — this guarantees string type.

// Also replace patterns like `actor: (actor ?? "System") as string` that didn't work
c = c.replace(/actor: \(actor \?\? "System"\) as string,/g, 'actor: String(actor ?? "System"),');
c = c.replace(/actor: actor \?\? "System",/g, 'actor: String(actor ?? "System"),');

// Fix const declarations that still produce string|undefined:
// const actor = (externalActor ?? state.profile?.name ?? "System") as string;
// The issue is profile?.name is string|undefined, so ?? "System" should always give string.
// The `as string` cast should work but let's also add String() wrapping in the logHistory calls

// More targeted: find all logHistory calls with `actor: actor` or `actor: resolvedActor`
// where actor might be undefined
c = c.replace(/actor: actor,(\s)/g, 'actor: String(actor ?? "System"),$1');
c = c.replace(/actor: resolvedActor,(\s)/g, 'actor: String(resolvedActor),\n');
c = c.replace(/actor: resolvedAuthor,(\s)/g, 'actor: String(resolvedAuthor),$1');
c = c.replace(/author: resolvedAuthor,(\s)/g, 'author: String(resolvedAuthor),$1');

// Fix specific patterns where name could be undefined in object literals
// e.g., name: actor, or author: author,
c = c.replace(/author: author,(\s)/g, 'author: String(author ?? "System"),$1');

// Also fix the `const actor = ...` declarations to guarantee string
// Replace: const actor = (externalActor ?? state.profile?.name ?? "System") as string;
// with: const actor: string = externalActor ?? state.profile?.name ?? "System";
c = c.replace(
  /const actor = \(externalActor \?\? state\.profile\?\.name \?\? "System"\) as string;/g,
  'const actor: string = externalActor ?? state.profile?.name ?? "System";'
);
c = c.replace(
  /const resolvedActor = \(actor \?\? state\.profile\?\.name \?\? "System"\) as string;/g,
  'const resolvedActor: string = actor ?? state.profile?.name ?? "System";'
);
c = c.replace(
  /const author = \(externalAuthor \?\? state\.profile\?\.name \?\? "System"\) as string;/g,
  'const author: string = externalAuthor ?? state.profile?.name ?? "System";'
);
c = c.replace(
  /const resolvedAuthor = \(author \?\? state\.profile\?\.name \?\? "System"\) as string;/g,
  'const resolvedAuthor: string = author ?? state.profile?.name ?? "System";'
);

// Any remaining actor: actor,  -> use String() cast
c = c.replace(/(\s+)actor: actor,\n/g, '$1actor: String(actor ?? "System"),\n');

fs.writeFileSync('src/lib/store.ts', c);
console.log('Done.');
