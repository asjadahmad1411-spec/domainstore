const fs = require('fs');

const base = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>{{TITLE}} — DomainStore</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌐</text></svg>"/>
<link rel="stylesheet" href="/css/main.css"/>
<link rel="stylesheet" href="/css/responsive.css"/>
</head>
<body>
<nav class="navbar" id="navbar">
  <a href="/" class="nav-logo">🌐 DomainStore</a>
  <ul class="nav-links" id="navLinks">
    <li><a href="/">Home</a></li>
    <li><a href="/domains">Domains</a></li>
    <li><a href="/hosting">Hosting</a></li>
    <li><a href="/offers">🎁 Offers</a></li>
  </ul>
  <div class="nav-actions">
    <a href="/login" id="navAuthBtn" class="btn btn-outline btn-sm">👤 Login</a>
    <button class="cart-btn" onclick="location.href='/cart'" id="cartBtn">🛒 <span class="cart-label">Cart</span> <span class="cart-count" id="cartCount">0</span></button>
  </div>
</nav>

<section style="padding:120px 20px 60px; max-width:800px; margin:0 auto; line-height:1.6;">
  <h1 style="font-size:2.5rem; margin-bottom:20px;">{{TITLE}}</h1>
  <div style="color:var(--text-muted); margin-bottom:40px;">Last updated: Today</div>
  <div style="font-size:1.1rem; color:var(--text);">
    {{CONTENT}}
  </div>
</section>

<footer>
  <div class="footer-grid">
    <div class="footer-brand">
      <div style="font-size:1.5rem;font-weight:900;background:linear-gradient(135deg,#8b5cf6,#00d4ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">🌐 DomainStore</div>
      <p>India's trusted domain registrar and web hosting provider.</p>
    </div>
    <div class="footer-col">
      <h4>Company</h4>
      <a href="/about.html">About Us</a>
      <a href="/contact.html">Contact Us</a>
      <a href="/privacy.html">Privacy Policy</a>
      <a href="/terms.html">Terms of Service</a>
      <a href="/refund.html">Refund Policy</a>
    </div>
  </div>
  <div class="footer-bottom">© 2025 DomainStore. All rights reserved. 🇮🇳 Made in India</div>
</footer>
<script src="/js/main.js"></script>
</body>
</html>`;

const pages = [
  { file: 'public/about.html', title: 'About Us', content: '<p>DomainStore is India’s leading domain registrar and web hosting company, founded with the mission to empower small businesses and individuals to get online easily and affordably.</p><p>We provide world-class services including domain registration, VPS, and Shared Hosting with 99.9% uptime guarantees.</p>' },
  { file: 'public/contact.html', title: 'Contact Us', content: '<p>We are here to help! If you have any questions, please reach out to us.</p><ul><li><strong>Email:</strong> support@domainstore.in</li><li><strong>Phone:</strong> +91 98765 43210</li><li><strong>Address:</strong> Tech Park, Sector 62, Noida, UP, India</li></ul><p>Our support team is available 24/7.</p>' },
  { file: 'public/privacy.html', title: 'Privacy Policy', content: '<p>At DomainStore, we respect your privacy and are committed to protecting it. This Privacy Policy explains how we collect, use, and safeguard your information.</p><h3>1. Information Collection</h3><p>We collect personal information such as name, email, and payment details when you create an account or make a purchase.</p><h3>2. Use of Information</h3><p>Your information is used strictly to process orders, provide customer support, and improve our services. We do not sell your personal information to third parties.</p><h3>3. Tracking</h3><p>We use cookies and third-party tracking tools (such as Google and Meta Ads) to analyze traffic and provide relevant advertisements.</p>' },
  { file: 'public/terms.html', title: 'Terms of Service', content: '<p>By using DomainStore, you agree to these Terms of Service.</p><h3>1. Account Security</h3><p>You are responsible for maintaining the security of your account and password.</p><h3>2. Acceptable Use</h3><p>You may not use our hosting services for any illegal activities, spamming, or distributing malware. Violations will result in immediate account termination.</p><h3>3. Service Availability</h3><p>While we strive for 99.9% uptime, we do not guarantee uninterrupted service and are not liable for data loss or business interruptions.</p>' },
  { file: 'public/refund.html', title: 'Refund & Cancellation Policy', content: '<p>We want you to be completely satisfied with our services.</p><h3>1. Web Hosting</h3><p>We offer a 30-day money-back guarantee on all shared hosting plans. If you are not satisfied, you can request a full refund within the first 30 days.</p><h3>2. Domain Names</h3><p>Domain name registrations are non-refundable once the domain is registered with the registry.</p><h3>3. Cancellations</h3><p>You can cancel your services at any time from your account dashboard to prevent future renewals.</p>' }
];

pages.forEach(p => {
  fs.writeFileSync(p.file, base.replace(/{{TITLE}}/g, p.title).replace('{{CONTENT}}', p.content));
});

console.log('Pages generated!');
