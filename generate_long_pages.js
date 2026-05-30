const fs = require('fs');

const base = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>{{TITLE}} — EnrootHost</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌐</text></svg>"/>
<link rel="stylesheet" href="/css/main.css"/>
<link rel="stylesheet" href="/css/responsive.css"/>
<style>
  .legal-content h3 { margin-top: 30px; font-size: 1.5rem; color: var(--text); }
  .legal-content p { margin-bottom: 16px; font-size: 1.05rem; color: var(--text-muted); line-height: 1.8; }
  .legal-content ul { margin-left: 20px; margin-bottom: 20px; color: var(--text-muted); line-height: 1.8; }
  .legal-content li { margin-bottom: 8px; }
</style>
</head>
<body>
<nav class="navbar" id="navbar">
  <a href="/" class="nav-logo" style="display:flex; align-items:center; gap:6px; text-decoration:none;"><span style="font-size:1.4rem;">🌱</span><span style="font-weight:900; background:linear-gradient(135deg, #10b981, #3b82f6); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">Enroot</span><span style="font-weight:700; color:inherit;">Host</span></a>
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

<section style="padding:120px 20px 60px; max-width:900px; margin:0 auto; line-height:1.6;">
  <h1 style="font-size:3rem; margin-bottom:20px; font-weight:800;">{{TITLE}}</h1>
  <div style="color:var(--text-muted); margin-bottom:40px; border-bottom: 1px solid var(--border); padding-bottom: 20px;">Effective Date: January 1, 2025</div>
  <div class="legal-content">
    {{CONTENT}}
  </div>
</section>

<footer>
  <div class="footer-grid">
    <div class="footer-brand">
      <div style="font-size:1.5rem;font-weight:900; display:flex; align-items:center; gap:6px;"><span style="font-size:1.4rem;">🌱</span><span style="font-weight:900; background:linear-gradient(135deg, #10b981, #3b82f6); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">Enroot</span><span style="font-weight:700; color:inherit;">Host</span></div>
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
  <div class="footer-bottom">© 2025 EnrootHost. All rights reserved. 🇮🇳 Made in India</div>
</footer>
<script src="/js/main.js"></script>
</body>
</html>`;

const pages = [
  { 
    file: 'public/about.html', 
    title: 'About EnrootHost', 
    content: `
      <p>Welcome to EnrootHost, India’s rapidly growing and highly trusted domain registrar and web hosting platform. Founded with a vision to make the digital world accessible for everyone, we have continuously evolved to offer state-of-the-art services tailored to individuals, startups, and massive enterprises.</p>
      <h3>Our Mission</h3>
      <p>Our core mission is simple: to empower creators, developers, and entrepreneurs to establish a strong, reliable, and blazing-fast online presence. We believe that securing a domain and setting up hosting should not be a complex or exorbitant process. Therefore, we provide cutting-edge technology, intuitive interfaces, and unparalleled pricing.</p>
      <h3>Our Infrastructure</h3>
      <p>At EnrootHost, we do not compromise on quality. Our servers are strategically located across top-tier global and Indian data centers, ensuring ultra-low latency and 99.99% uptime. We utilize advanced NVMe SSD storage, LiteSpeed Web Servers, and robust DDoS protection to guarantee that your websites remain fast and secure around the clock.</p>
      <h3>Why Choose Us?</h3>
      <ul>
        <li><strong>Affordability:</strong> We offer industry-leading prices for .com, .in, and hundreds of other TLDs without hidden renewal fees.</li>
        <li><strong>Reliability:</strong> Backed by a 99.99% uptime Service Level Agreement (SLA).</li>
        <li><strong>Customer Centricity:</strong> Our expert support team operates 24x7x365. Whether it is 3 AM or 3 PM, we are here to assist you via email and ticketing systems.</li>
        <li><strong>Security:</strong> Free SSL certificates, regular malware scans, and automated backups are included in our premium plans to keep your data safe.</li>
      </ul>
      <p>We are not just a service provider; we are your growth partners in the digital era. Start your journey today with EnrootHost and experience the difference of premium hosting at affordable prices.</p>
    ` 
  },
  { 
    file: 'public/contact.html', 
    title: 'Contact Us', 
    content: `
      <p>At EnrootHost, our customers are our top priority. We understand that technical issues can arise at any hour, which is why our dedicated support engineers are available around the clock to provide immediate and effective resolutions.</p>
      <h3>Get In Touch</h3>
      <p>If you have any sales inquiries, technical issues, or billing questions, please do not hesitate to reach out to us using any of the communication channels below:</p>
      <ul>
        <li><strong>Customer Support Email:</strong> support@enroothost.com</li>
        <li><strong>Sales & Partnerships:</strong> sales@enroothost.com</li>
        <li><strong>Phone Support:</strong> +91 98765 43210 (Available 10:00 AM - 6:00 PM IST, Mon-Sat)</li>
      </ul>
      <h3>Corporate Office</h3>
      <p>EnrootHost Technologies Pvt. Ltd.<br/>
      Tech Park, Sector 62,<br/>
      Noida, Uttar Pradesh 201309,<br/>
      India</p>
      <h3>Support Tickets</h3>
      <p>If you are an existing customer, the fastest way to get help is by logging into your EnrootHost Dashboard and creating a Support Ticket. Our average ticket response time is under 15 minutes.</p>
      <p>We look forward to hearing from you and assisting you with your online ventures!</p>
    ` 
  },
  { 
    file: 'public/privacy.html', 
    title: 'Privacy Policy', 
    content: `
      <p>This Privacy Policy outlines how EnrootHost ("we", "our", or "us") collects, uses, protects, and discloses your personal information when you use our website and services. Your privacy is critically important to us, and we are fully committed to safeguarding your personal data in compliance with applicable data protection laws, including the Information Technology Act, 2000 (India).</p>
      <h3>1. Information We Collect</h3>
      <p>We collect several different types of information for various purposes to provide and improve our service to you:</p>
      <ul>
        <li><strong>Personal Data:</strong> While using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you, including but not limited to your Email address, First name and last name, Phone number, and Address.</li>
        <li><strong>Payment Data:</strong> To process your orders securely, we collect payment information. Note that we do not store full credit card numbers on our servers; all transactions are processed through secure payment gateways (like Razorpay/UPI).</li>
        <li><strong>Usage Data:</strong> We may also collect information on how the Service is accessed and used. This may include information such as your computer's Internet Protocol (IP) address, browser type, browser version, the pages of our Service that you visit, the time and date of your visit, and the time spent on those pages.</li>
      </ul>
      <h3>2. How We Use Your Information</h3>
      <p>EnrootHost uses the collected data for various purposes:</p>
      <ul>
        <li>To provide and maintain our Service.</li>
        <li>To notify you about changes to our Service or your account (e.g., domain expiry notices).</li>
        <li>To provide customer support and handle technical issues.</li>
        <li>To gather analysis or valuable information so that we can improve our Service.</li>
        <li>To detect, prevent, and address technical or security issues.</li>
      </ul>
      <h3>3. Cookies and Tracking Technologies</h3>
      <p>We use cookies and similar tracking technologies to track the activity on our Service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. We also utilize third-party tracking tools such as Google Analytics and Meta Pixel to deliver targeted advertising and assess campaign performance.</p>
      <h3>4. Data Security</h3>
      <p>The security of your data is important to us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While we strive to use commercially acceptable means (like AES-256 encryption and SSL) to protect your Personal Data, we cannot guarantee its absolute security.</p>
      <h3>5. Contact Us</h3>
      <p>If you have any questions about this Privacy Policy, please contact us at privacy@enroothost.com.</p>
    ` 
  },
  { 
    file: 'public/terms.html', 
    title: 'Terms of Service', 
    content: `
      <p>Welcome to EnrootHost! These Terms of Service ("Terms") govern your access to and use of our website, domains, hosting services, and other products. By accessing or using the Service, you agree to be bound by these Terms.</p>
      <h3>1. Account Registration and Security</h3>
      <p>To use certain features of the Service, you must register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete. You are responsible for safeguarding your password and for all activities that occur under your account.</p>
      <h3>2. Acceptable Use Policy (AUP)</h3>
      <p>You agree not to use the Service in any way that is unlawful, or harms EnrootHost, its service providers, its suppliers, or any other user. Specifically, you must NOT use our hosting services for:</p>
      <ul>
        <li>Sending unsolicited bulk email (SPAM).</li>
        <li>Hosting, distributing, or linking to malware, phishing sites, or viruses.</li>
        <li>Hosting adult content, child exploitation material, or copyright-infringing material.</li>
        <li>Running cryptocurrency miners, botnets, or abusive network scanners.</li>
      </ul>
      <p>Violation of the Acceptable Use Policy will result in immediate suspension or permanent termination of your account without any refund.</p>
      <h3>3. Domain Name Registration</h3>
      <p>Domain name registrations are subject to the rules and policies of the respective governing registry (e.g., ICANN for .com, NIXI for .in). By registering a domain, you agree to comply with these rules. EnrootHost acts as a reseller/registrar, and the ultimate ownership of the domain rests with you, provided that all renewal fees are paid on time.</p>
      <h3>4. Payments and Billing</h3>
      <p>All services are billed on a prepaid basis. It is your responsibility to ensure that your payment information is up to date and that all invoices are paid on or before the due date. Failure to pay may result in the suspension or termination of your services. Late fees may apply for overdue invoices.</p>
      <h3>5. Limitation of Liability</h3>
      <p>In no event shall EnrootHost, its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service.</p>
    ` 
  },
  { 
    file: 'public/refund.html', 
    title: 'Refund & Cancellation Policy', 
    content: `
      <p>At EnrootHost, we strive to ensure that our customers are completely satisfied with their purchases. However, we understand that situations may arise where you need a refund or wish to cancel your service. This policy dictates the terms under which refunds and cancellations are processed.</p>
      <h3>1. Web Hosting Services (30-Day Money-Back Guarantee)</h3>
      <p>We stand behind the quality of our Web Hosting (Shared, WordPress, and VPS). If you are not completely satisfied with our hosting services, you may request a cancellation and full refund within the first <strong>30 days</strong> of your initial purchase.</p>
      <ul>
        <li>The 30-day money-back guarantee applies only to new, first-time hosting purchases.</li>
        <li>Renewals, upgrades, and standalone dedicated servers are <strong>NOT</strong> eligible for the 30-day refund.</li>
        <li>To request a refund, you must open a support ticket within the 30-day window.</li>
      </ul>
      <h3>2. Domain Name Registrations and Transfers</h3>
      <p>Due to the nature of domain name registration systems (ICANN and specific TLD registries), domain name registrations, renewals, and transfers are <strong>strictly non-refundable</strong>.</p>
      <p>Once a domain name is registered, it becomes your property for the duration of the registration term. We cannot "cancel" a domain registration and get the money back from the registry. Therefore, please ensure that you have spelled the domain name correctly before completing the payment.</p>
      <h3>3. Add-on Services</h3>
      <p>Services such as SSL Certificates, Dedicated IPs, Automated Backups, and Website Security tools are generally non-refundable unless specifically stated otherwise during the checkout process. Once these services are provisioned, the sale is considered final.</p>
      <h3>4. Cancellation Process</h3>
      <p>You can cancel your services at any time via your EnrootHost Client Dashboard. To avoid future automatic charges, please submit your cancellation request at least 3 days before your next billing cycle. If you cancel a service outside of the 30-day money-back window, the service will remain active until the end of the paid billing cycle, after which it will be terminated.</p>
      <h3>5. Payment Gateway Processing Time</h3>
      <p>Once a refund is approved by our billing team, it will be credited back to your original method of payment (e.g., Credit Card, UPI, Netbanking). Please allow 5 to 7 business days for the amount to reflect in your bank account, depending on your bank's processing times.</p>
    ` 
  }
];

pages.forEach(p => {
  fs.writeFileSync(p.file, base.replace(/{{TITLE}}/g, p.title).replace('{{CONTENT}}', p.content));
});

console.log('Long legal pages generated successfully!');
