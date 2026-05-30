const fs = require('fs');
const glob = require('glob');

// 1. Fix year in all HTML files
const files = glob.sync('public/**/*.html');
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;
  
  content = content.replace(/© 2025/g, '© 2026');
  
  if (content !== original) {
    fs.writeFileSync(f, content);
    console.log('Updated year in: ' + f);
  }
});

// 2. Fix stats bar in index.html
const indexFile = 'public/index.html';
if (fs.existsSync(indexFile)) {
  let indexContent = fs.readFileSync(indexFile, 'utf8');
  let original = indexContent;
  
  indexContent = indexContent.replace(/<div class="num">2M\+<\/div>/g, '<div class="num">100k+</div>');
  indexContent = indexContent.replace(/<div class="num">500K\+<\/div>/g, '<div class="num">50K+</div>');
  
  if (indexContent !== original) {
    fs.writeFileSync(indexFile, indexContent);
    console.log('Updated stats bar in: ' + indexFile);
  }
}

