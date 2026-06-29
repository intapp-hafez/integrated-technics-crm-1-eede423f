const fs = require('fs');

let c = fs.readFileSync('src/lib/store.ts', 'utf-8');
c = c.replace(/actor = "hafez Rahim"/g, 'actor = state.profile?.name || state.profile?.full_name_en || "System"');
c = c.replace(/author = "hafez Rahim"/g, 'author = state.profile?.name || state.profile?.full_name_en || "System"');
c = c.replace(/actor: "hafez Rahim"/g, 'actor: state.profile?.name || state.profile?.full_name_en || "System"');
c = c.replace(/name: "hafez Rahim"/g, 'name: state.profile?.name || state.profile?.full_name_en || "System"');
c = c.replace(/author: "hafez Rahim"/g, 'author: state.profile?.name || state.profile?.full_name_en || "System"');

fs.writeFileSync('src/lib/store.ts', c);
console.log('Fixed store.ts actor names');
