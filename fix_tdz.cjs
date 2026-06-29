const fs = require('fs');

let c = fs.readFileSync('src/lib/store.ts', 'utf-8');

// Fix all action function default params that reference state (temporal dead zone)
// Pattern: actor = state.profile?.name || state.profile?.full_name_en || "System"
// Replace with: actor?: string
c = c.replace(
  /,?\s*actor = state\.profile\?\.name \|\| state\.profile\?\.full_name_en \|\| "System"\)/g,
  ', actor?: string)'
);
c = c.replace(
  /,?\s*author = state\.profile\?\.name \|\| state\.profile\?\.full_name_en \|\| "System"\)/g,
  ', author?: string)'
);

// Also fix the seedHistory references (not inside functions, so also problematic)
// Replace state.profile?.name || state.profile?.full_name_en || "System" in seedHistory with just "System"
c = c.replace(
  /actor: state\.profile\?\.name \|\| state\.profile\?\.full_name_en \|\| "System",/g,
  'actor: "System",'
);

fs.writeFileSync('src/lib/store.ts', c);
console.log('Fixed temporal dead zone in store.ts');

// Verify no more bare state.profile references outside functions
const remaining = (c.match(/actor = state\.profile/g) || []).length;
const remaining2 = (c.match(/author = state\.profile/g) || []).length;
console.log(`Remaining bare default param issues: ${remaining + remaining2}`);
