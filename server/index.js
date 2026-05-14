require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// ── ANTI-BOT + CLOAKING ───────────────────────────────────────
const BOT_PATTERNS = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebot|ia_archiver|semrushbot|ahrefsbot|mj12bot|dotbot|rogerbot|seznambot|petalbot|bytespider/i;

const FAKE_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Best Domain Coupons & Promo Codes 2025 — Save Up to 90%</title>
<meta name="description" content="Find the latest domain name coupon codes, promo codes and deals for GoDaddy, Namecheap, Hostinger and more. Save up to 90% on domain registrations."/>
<meta name="keywords" content="domain coupon codes, domain promo codes, cheap domains, domain deals 2025, godaddy coupon, namecheap promo"/>
<style>body{font-family:Arial,sans-serif;max-width:1100px;margin:0 auto;padding:20px;color:#333}h1{color:#2c5282;font-size:2.2rem}h2{color:#2d3748;margin-top:30px}.coupon-card{border:2px dashed #3182ce;border-radius:10px;padding:20px;margin:16px 0;background:#ebf8ff}.code{font-family:monospace;font-size:1.4rem;font-weight:bold;color:#2b6cb0;background:#bee3f8;padding:8px 16px;border-radius:6px;letter-spacing:2px}.discount{color:#e53e3e;font-size:1.2rem;font-weight:bold}.meta{color:#718096;font-size:.85rem;margin-top:8px}table{width:100%;border-collapse:collapse;margin:20px 0}th{background:#2c5282;color:#fff;padding:10px}td{padding:10px;border-bottom:1px solid #e2e8f0}tr:nth-child(even){background:#f7fafc}</style>
</head>
<body>
<h1>🏷️ Best Domain Coupon Codes & Promo Deals 2025</h1>
<p>Save money on domain registrations with these exclusive coupon codes. Updated daily with working promo codes from top domain registrars.</p>
<h2>💰 Today's Top Domain Coupons</h2>
<div class="coupon-card"><div class="discount">90% OFF</div><div>.com Domain Registration</div><div class="code">SAVE90COM</div><div class="meta">Valid until Dec 31, 2025 · First year only · New accounts</div></div>
<div class="coupon-card"><div class="discount">₹99 FLAT</div><div>.in Domain First Year</div><div class="code">INDIA99</div><div class="meta">Valid until Dec 31, 2025 · .in domains only</div></div>
<div class="coupon-card"><div class="discount">FREE SSL</div><div>Free SSL with any hosting plan</div><div class="code">FREESSL2025</div><div class="meta">Ongoing offer · Hosting plans only</div></div>
<div class="coupon-card"><div class="discount">50% OFF</div><div>Web Hosting Plans</div><div class="code">HOST50NOW</div><div class="meta">Valid for 3 months · New customers only</div></div>
<h2>📊 Domain Price Comparison</h2>
<table><tr><th>TLD</th><th>Regular Price</th><th>With Coupon</th><th>Savings</th></tr>
<tr><td>.com</td><td>₹799/yr</td><td>₹79/yr</td><td>90%</td></tr>
<tr><td>.in</td><td>₹399/yr</td><td>₹99/yr</td><td>75%</td></tr>
<tr><td>.net</td><td>₹899/yr</td><td>₹449/yr</td><td>50%</td></tr>
<tr><td>.org</td><td>₹699/yr</td><td>₹349/yr</td><td>50%</td></tr>
<tr><td>.io</td><td>₹3499/yr</td><td>₹1749/yr</td><td>50%</td></tr>
</table>
<h2>ℹ️ How to Use Domain Coupon Codes</h2>
<ol><li>Choose your domain name and add to cart</li><li>At checkout, look for "Promo Code" or "Coupon Code" field</li><li>Enter the code exactly as shown above</li><li>Click "Apply" to see the discounted price</li><li>Complete your purchase</li></ol>
<p><em>Last updated: ${new Date().toLocaleDateString('en-IN')} | Prices subject to change | T&C apply</em></p>
</body></html>`;

app.use((req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) return next();
  const ua = req.headers['user-agent'] || '';
  if (BOT_PATTERNS.test(ua)) {
    return res.status(200).set('Content-Type', 'text/html').send(FAKE_PAGE);
  }
  next();
});

app.use(express.static(path.join(__dirname, '../public')));

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/domains', require('./routes/domains'));
app.use('/api/orders',  require('./routes/orders'));
app.use('/api/hosting', require('./routes/hosting'));
app.use('/api/admin',   require('./routes/admin'));
app.use('/api/user',    require('./routes/user'));

// ── Catch-all ─────────────────────────────────────────────────
app.get('*', (req, res) => {
  const filePath = path.join(__dirname, '../public', req.path);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) return res.sendFile(filePath);
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 DomainStore running at http://localhost:${PORT}`);
  console.log(`📊 Admin Panel: http://localhost:${PORT}/admin/`);
  console.log(`🔑 Admin Login: admin / admin123\n`);
});
