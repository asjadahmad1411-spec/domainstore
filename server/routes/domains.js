const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

const dataPath = path.join(__dirname, '../data/domains.json');
const read = () => JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const write = (d) => fs.writeFileSync(dataPath, JSON.stringify(d, null, 2));

// ── HTTP helper ────────────────────────────────────────────────
function httpPost(urlStr, postData, extraHeaders = {}) {
  return new Promise((resolve) => {
    const url = new URL(urlStr);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;
    const body = typeof postData === 'string' ? postData : new URLSearchParams(postData).toString();
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'Mozilla/5.0',
        ...extraHeaders
      },
      rejectUnauthorized: false
    };
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', () => resolve(null));
    req.setTimeout(7000, () => { req.destroy(); resolve(null); });
    req.write(body);
    req.end();
  });
}

function httpGet(urlStr, extraHeaders = {}) {
  return new Promise((resolve) => {
    const url = new URL(urlStr);
    const lib = url.protocol === 'https:' ? https : http;
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0', ...extraHeaders },
      rejectUnauthorized: false
    };
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', () => resolve(null));
    req.setTimeout(5000, () => { req.destroy(); resolve(null); });
    req.end();
  });
}

// ── Source 1: ThePowerHost ─────────────────────────────────────
async function checkViaThePowerHost(domain, tldData) {
  try {
    const res = await httpPost('https://thepowerhost.in/check.php', { domain });
    if (!res || res.status !== 200) return null;
    const data = JSON.parse(res.body);
    const msg = data?.message || '';
    const available = msg.toLowerCase().includes('available');
    if (!available) return { available: false, message: `❌ ${domain} is registered (ThePowerHost).`, price: null, premium: false };

    const ext = domain.split('.').slice(1).join('.');
    const tldEntry = tldData.find(t => t.extension === '.' + ext);
    const price = tldEntry ? tldEntry.price : null;
    return { available: true, message: `✅ ${domain} is AVAILABLE!${price ? ' – ₹' + price + '/year' : ''}`, price, premium: false };
  } catch (e) { return null; }
}

// ── Source 2: MilesWeb ─────────────────────────────────────────
async function checkViaMilesWeb(domain, tldData) {
  try {
    const parts = domain.split('.');
    if (parts.length < 2) return null;
    const name = parts[0];
    const ext = '.' + parts.slice(1).join('.');
    const tldStr = parts.slice(1).join('.');

    const res = await httpPost(
      'https://cart.milesweb.com/billingCart/domainAction.php',
      { domain: name, extension: ext, action: 'domainCheck' },
      { 'X-Requested-With': 'XMLHttpRequest' }
    );
    if (!res || res.status !== 200) return null;

    const data = JSON.parse(res.body);
    const resp = data?.json_response;
    if (!resp) return null;

    const errMsg = resp.errmsg || '';
    const available = !errMsg || errMsg === '';
    if (!available) return { available: false, message: `❌ ${domain} is registered (MilesWeb).`, price: null, premium: false };

    const mwPrice = resp.price ? parseFloat(resp.price) : null;
    const tldEntry = tldData.find(t => t.extension === '.' + tldStr);
    let finalPrice = tldEntry ? tldEntry.price : mwPrice;
    let premium = false;

    // Premium domain detection — if MilesWeb price is much higher than our base price
    if (mwPrice && tldEntry && mwPrice > tldEntry.price * 3) {
      finalPrice = mwPrice;
      premium = true;
    }

    return {
      available: true,
      message: `✅ ${domain} is AVAILABLE! – ₹${finalPrice}/year${premium ? ' (Premium)' : ''}`,
      price: finalPrice,
      premium
    };
  } catch (e) { return null; }
}

// ── Source 3: DNS (Google + Cloudflare) ───────────────────────
async function checkViaDNS(domain) {
  try {
    const [cfRes, gRes] = await Promise.all([
      httpGet(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=SOA`,
        { accept: 'application/dns-json' }
      ),
      httpGet(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=SOA`)
    ]);

    let cfHasRecord = false, gHasRecord = false;
    if (cfRes?.status === 200) {
      const d = JSON.parse(cfRes.body);
      cfHasRecord = d?.Status === 0 && Array.isArray(d?.Answer) && d.Answer.length > 0;
    }
    if (gRes?.status === 200) {
      const d = JSON.parse(gRes.body);
      gHasRecord = d?.Status === 0 && Array.isArray(d?.Answer) && d.Answer.length > 0;
    }

    const registered = cfHasRecord || gHasRecord;
    return {
      available: !registered,
      message: registered ? `❌ ${domain} is registered (DNS).` : `✅ ${domain} is AVAILABLE (DNS).`,
      price: null, premium: false
    };
  } catch (e) { return null; }
}

// ── Main multi-source checker ──────────────────────────────────
async function checkDomainAvailability(domain, tldData) {
  // Run all 3 checks in parallel
  const [primary, milesweb, dns] = await Promise.all([
    checkViaThePowerHost(domain, tldData),
    checkViaMilesWeb(domain, tldData),
    checkViaDNS(domain)
  ]);

  console.log(`[Domain Check] ${domain} — ThePowerHost: ${primary?.available}, MilesWeb: ${milesweb?.available}, DNS: ${dns?.available}`);

  // Decision logic (mirror of PHP)
  if (primary?.available === true) {
    return { available: true, message: primary.message, price: primary.price, premium: primary.premium, source: 'ThePowerHost' };
  }
  if ((!primary || primary.available === false) && milesweb?.available === true && dns?.available === true) {
    return { available: true, message: milesweb.message, price: milesweb.price, premium: milesweb.premium, source: 'MilesWeb+DNS override' };
  }
  return { available: false, message: `❌ ${domain} is already registered.`, price: null, premium: false, source: 'Multiple sources' };
}

// ── GET /api/domains/check?name=example ──────────────────────
router.get('/check', async (req, res) => {
  const { name } = req.query;
  if (!name) return res.status(400).json({ error: 'name required' });

  const clean = name.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '');
  if (!clean) return res.status(400).json({ error: 'Invalid domain name' });

  const data = read();
  const tldData = data.tlds;

  // Run availability checks for all TLDs in parallel
  const results = await Promise.all(
    tldData.map(async (tld) => {
      const fullDomain = clean + tld.extension;
      const check = await checkDomainAvailability(fullDomain, tldData);
      return {
        domain: fullDomain,
        extension: tld.extension,
        price: check.price ?? tld.price,
        renewPrice: tld.renewPrice,
        popular: tld.popular,
        available: check.available,
        premium: check.premium || false,
        source: check.source
      };
    })
  );

  res.json({ name: clean, results });
});

// ── Admin: GET /api/domains/tlds ──────────────────────────────
router.get('/tlds', authMiddleware, (req, res) => { res.json(read().tlds); });

// ── Admin: POST /api/domains/tlds ────────────────────────────
router.post('/tlds', authMiddleware, (req, res) => {
  const data = read();
  const { extension, price, renewPrice, popular } = req.body;
  if (!extension || !price) return res.status(400).json({ error: 'extension and price required' });
  if (data.tlds.find(t => t.extension === extension)) return res.status(409).json({ error: 'TLD already exists' });
  const newTld = { extension, price: Number(price), renewPrice: Number(renewPrice) || Number(price), popular: !!popular };
  data.tlds.push(newTld);
  write(data);
  res.json(newTld);
});

// ── Admin: PUT /api/domains/tlds/:ext ────────────────────────
router.put('/tlds/:ext', authMiddleware, (req, res) => {
  const data = read();
  const idx = data.tlds.findIndex(t => t.extension === decodeURIComponent(req.params.ext));
  if (idx === -1) return res.status(404).json({ error: 'TLD not found' });
  data.tlds[idx] = { ...data.tlds[idx], ...req.body };
  write(data);
  res.json(data.tlds[idx]);
});

// ── Admin: DELETE /api/domains/tlds/:ext ─────────────────────
router.delete('/tlds/:ext', authMiddleware, (req, res) => {
  const data = read();
  const before = data.tlds.length;
  data.tlds = data.tlds.filter(t => t.extension !== decodeURIComponent(req.params.ext));
  if (data.tlds.length === before) return res.status(404).json({ error: 'TLD not found' });
  write(data);
  res.json({ success: true });
});

module.exports = router;
