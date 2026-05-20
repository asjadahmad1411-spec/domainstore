const fs = require('fs');
const glob = require('glob');

const files = glob.sync('public/*.html');

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let updated = content
    .replace(/<a href="#">About Us<\/a>/g, '<a href="/about.html">About Us</a>')
    .replace(/<a href="#">Contact Us<\/a>/g, '<a href="/contact.html">Contact Us</a>')
    .replace(/<a href="#">Privacy Policy<\/a>/g, '<a href="/privacy.html">Privacy Policy</a>')
    .replace(/<a href="#">Terms of Service<\/a>/g, '<a href="/terms.html">Terms of Service</a>')
    .replace(/<a href="#">Refund Policy<\/a>/g, '<a href="/refund.html">Refund Policy</a>')
    .replace(/<a href="#">Blog<\/a>/g, '') // Remove empty blog link
    .replace(/<a href="#">Careers<\/a>/g, '<a href="/contact.html">Contact Us</a>'); // Replace careers with contact us
  
  if (content !== updated) {
    fs.writeFileSync(f, updated);
    console.log('Updated ' + f);
  }
});
