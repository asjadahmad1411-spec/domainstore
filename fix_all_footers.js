const fs = require('fs');
const glob = require('glob');

const files = glob.sync('public/**/*.html'); // catch subdirs as well like dashboard/ or admin/

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  
  // Find the exact block we want to replace
  // The block starts with <div class="footer-col">\s*<h4>Company</h4>
  // and ends with </div> before </div>\s*<div class="footer-bottom">
  
  const regex = /<div class="footer-col">\s*<h4>Company<\/h4>[\s\S]*?(?=<\/div>\s*<\/div>\s*<div class="footer-bottom">)/;
  
  const newCompanyCol = `<div class="footer-col">
      <h4>Company</h4>
      <a href="/about.html">About Us</a>
      <a href="/contact.html">Contact Us</a>
      <a href="/privacy.html">Privacy Policy</a>
      <a href="/terms.html">Terms of Service</a>
      <a href="/refund.html">Refund Policy</a>
    `;
    
  let updated = content.replace(regex, newCompanyCol);
  
  if (content !== updated) {
    fs.writeFileSync(f, updated);
    console.log('Fixed footer in: ' + f);
  }
});
