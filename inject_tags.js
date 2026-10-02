const fs = require('fs');
const path = require('path');

const settingsPath = path.join(__dirname, 'server/data/settings.json');
let settings = {};
try {
  settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
} catch (e) {
  console.log("No settings.json found.");
  process.exit(0);
}

let headInjection = '';

if (settings.googleAdsTag) {
  headInjection += `\n<!-- Google Tag -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${settings.googleAdsTag}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${settings.googleAdsTag}');
  window.googleAdsTag = '${settings.googleAdsTag}';
  window.googleAdsConversionLabel = '${settings.googleAdsConversionLabel || ''}';
</script>
<!-- End Google Tag -->\n`;
}

if (settings.metaPixelId) {
  headInjection += `\n<!-- Meta Pixel -->
<script>
!function(f,b,e,v,n,t,p){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;p=b.getElementsByTagName(e)[0];p.parentNode.insertBefore(t,p)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${settings.metaPixelId}');
fbq('track', 'PageView');
</script>
<!-- End Meta Pixel -->\n`;
}

const dirs = [
  path.join(__dirname, 'public'),
  path.join(__dirname, 'public/admin'),
  path.join(__dirname, 'public/dashboard')
];

function processDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) continue;
    if (fullPath.endsWith('.html')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Remove old injected tags if they exist
      content = content.replace(/<!-- Google Tag -->[\s\S]*?<!-- End Google Tag -->/g, '');
      content = content.replace(/<!-- Meta Pixel -->[\s\S]*?<!-- End Meta Pixel -->/g, '');
      
      // Insert new tags right before </head>
      if (headInjection) {
        content = content.replace('</head>', `${headInjection}</head>`);
      }
      
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`Updated tags in ${fullPath}`);
    }
  }
}

dirs.forEach(processDir);
console.log("Tag injection complete.");
