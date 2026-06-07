const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/pages/**/*.{tsx,ts}');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  // Simple regex to replace bg-white with something dark, only for specific card classes
  content = content.replace(/className="([^"]*)bg-white([^"]*)"/g, (match, p1, p2) => {
     if (p1.includes('w-') && p1.includes('h-') && !p1.includes('p-')) {
         return match; // probably an icon container
     }
     return `className="${p1}bg-slate-900/60 backdrop-blur-3xl border-white/5 text-white${p2}"`;
  });
  
  content = content.replace(/text-slate-900/g, 'text-white');
  content = content.replace(/text-gray-900/g, 'text-white');
  
  fs.writeFileSync(file, content);
});
console.log('Update complete');
