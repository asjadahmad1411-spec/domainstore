const fs = require('fs');
const glob = require('glob');

const dirsToSearch = ['public/**/*', 'server/**/*', 'src-js/**/*', 'package.json'];
let files = [];
dirsToSearch.forEach(pattern => {
  if (pattern === 'package.json') files.push(pattern);
  else files = files.concat(glob.sync(pattern, { nodir: true }));
});

// filter out images, zips etc
files = files.filter(f => !f.match(/\.(png|jpg|jpeg|gif|svg|zip)$/));

files.forEach(f => {
  try {
    let content = fs.readFileSync(f, 'utf8');
    let original = content;

    // Replace domains and emails first
    content = content.replace(/domainstore\.in/g, 'enroothost.com');
    content = content.replace(/domainstore@upi/g, 'enroothost@upi');
    content = content.replace(/support@domainstore\.in/gi, 'support@enroothost.com');

    // Replace the exact nav-logo across HTML files before global string replacements
    // The current nav logo is: <a href="/" class="nav-logo">🌐 DomainStore</a>
    // We will change it to: <a href="/" class="nav-logo" style="display:flex; align-items:center; gap:6px;"><span style="font-size:1.4rem;">🌱</span><span style="font-weight:900; background:linear-gradient(135deg, #10b981, #3b82f6); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">Enroot</span><span style="font-weight:700; color:inherit;">Host</span></a>
    const newLogo = `<a href="/" class="nav-logo" style="display:flex; align-items:center; gap:6px; text-decoration:none;"><span style="font-size:1.4rem;">🌱</span><span style="font-weight:900; background:linear-gradient(135deg, #10b981, #3b82f6); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">Enroot</span><span style="font-weight:700; color:inherit;">Host</span></a>`;
    
    // Replace standard nav logo
    content = content.replace(/<a href="\/" class="nav-logo">🌐 DomainStore<\/a>/g, newLogo);
    
    // Preloader logo
    const newPreloader = `<div class="preloader-logo" style="display:flex; justify-content:center; align-items:center; gap:6px;"><span style="font-size:1.6rem;">🌱</span><span style="font-weight:900; background:linear-gradient(135deg, #10b981, #3b82f6); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">Enroot</span><span style="font-weight:700; color:inherit;">Host</span></div>`;
    content = content.replace(/<div class="preloader-logo">🌐 DomainStore<\/div>/g, newPreloader);
    
    // Sidebar logo in Admin
    const newSidebarLogo = `<div class="sidebar-logo" style="display:flex; flex-direction:column; align-items:flex-start;"><div class="logo-text" style="display:flex; align-items:center; gap:6px;"><span style="font-size:1.4rem;">🌱</span><span style="font-weight:900; background:linear-gradient(135deg, #10b981, #3b82f6); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">Enroot</span><span style="font-weight:700; color:inherit;">Host</span></div><div class="logo-sub">Admin Panel</div></div>`;
    content = content.replace(/<div class="sidebar-logo"><div class="logo-text">🌐 DomainStore<\/div><div class="logo-sub">Admin Panel<\/div><\/div>/g, newSidebarLogo);
    
    // Sidebar logo in Dashboard
    const newDashLogo = `<div class="sidebar-logo" style="display:flex; flex-direction:column; align-items:flex-start;"><div class="logo-text" style="display:flex; align-items:center; gap:6px;"><span style="font-size:1.4rem;">🌱</span><span style="font-weight:900; background:linear-gradient(135deg, #10b981, #3b82f6); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">Enroot</span><span style="font-weight:700; color:inherit;">Host</span></div><div class="logo-sub">Client Portal</div></div>`;
    content = content.replace(/<div class="sidebar-logo"><div class="logo-text">🌐 DomainStore<\/div><div class="logo-sub">Client Portal<\/div><\/div>/g, newDashLogo);

    // Footer brand text
    const newFooterBrand = `<div style="font-size:1.5rem;font-weight:900; display:flex; align-items:center; gap:6px;"><span style="font-size:1.4rem;">🌱</span><span style="font-weight:900; background:linear-gradient(135deg, #10b981, #3b82f6); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">Enroot</span><span style="font-weight:700; color:inherit;">Host</span></div>`;
    content = content.replace(/<div style="font-size:1\.5rem;font-weight:900;background:linear-gradient\(135deg,#8b5cf6,#00d4ff\);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">🌐 DomainStore<\/div>/g, newFooterBrand);

    // Replace the name generally
    content = content.replace(/DomainStore/g, 'EnrootHost');
    content = content.replace(/domainstore/g, 'enroothost');
    
    if (content !== original) {
      fs.writeFileSync(f, content);
      console.log('Updated: ' + f);
    }
  } catch (e) {
    console.error('Error in ' + f + ' : ' + e.message);
  }
});
