const express = require('express');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const router = express.Router();

const usersPath  = path.join(__dirname, '../data/users.json');
const ordersPath = path.join(__dirname, '../data/orders.json');

const readUsers  = () => JSON.parse(fs.readFileSync(usersPath, 'utf8'));
const writeUsers = (d) => fs.writeFileSync(usersPath, JSON.stringify(d, null, 2));
const readOrders = () => JSON.parse(fs.readFileSync(ordersPath, 'utf8'));
const writeOrders= (d) => fs.writeFileSync(ordersPath, JSON.stringify(d, null, 2));

const JWT_SECRET = process.env.JWT_SECRET || 'domainstore_secret_2025';

function hashPwd(pwd) {
  let h = 0;
  for (let i = 0; i < pwd.length; i++) { h = ((h << 5) - h) + pwd.charCodeAt(i); h |= 0; }
  return 'h_' + Math.abs(h).toString(36) + '_' + pwd.length;
}

// Middleware
function userAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Login required' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch (e) { res.status(401).json({ error: 'Session expired. Please login again.' }); }
}

// ── GET /api/user/dashboard ──────────────────────────────────
router.get('/dashboard', userAuth, (req, res) => {
  const user   = readUsers().find(u => u.id === req.userId);
  const orders = readOrders().filter(o => o.customer?.email === req.userEmail);
  const domains  = orders.flatMap(o => (o.items || []).filter(i => i.type === 'domain').map(i => ({
    ...i, orderId: o.id, status: o.status, orderDate: o.createdAt,
    nameservers: o.nameservers || ['ns1.domainstore.in', 'ns2.domainstore.in'],
    autoRenew: o.autoRenew !== false, locked: o.locked !== false, privacy: o.privacy || false
  })));
  const hosting  = orders.flatMap(o => (o.items || []).filter(i => i.type === 'hosting').map(i => ({
    ...i, orderId: o.id, status: o.status, orderDate: o.createdAt,
    serverIp: '103.21.' + (Math.abs(o.id.charCodeAt(4)) % 255) + '.' + (Math.abs(o.id.charCodeAt(5)) % 255),
    cpanelUser: (req.userEmail.split('@')[0] || 'user').slice(0, 8).replace(/[^a-z0-9]/g, ''),
    tempUrl: `http://103.21.x.x/${(req.userEmail.split('@')[0] || 'user')}`,
    emailAccounts: o.emailAccounts || []
  })));
  const { password: _, ...safeUser } = user || {};
  res.json({
    user: safeUser,
    stats: {
      totalDomains:  domains.length,
      activeDomains: domains.filter(d => d.status === 'Active').length,
      totalHosting:  hosting.length,
      activeHosting: hosting.filter(h => h.status === 'Active').length,
      totalOrders:   orders.length,
      totalSpent:    orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + (o.total || 0), 0)
    },
    recentOrders: orders.slice(-5).reverse()
  });
});

// ── GET /api/user/domains ────────────────────────────────────
router.get('/domains', userAuth, (req, res) => {
  const orders = readOrders().filter(o => o.customer?.email === req.userEmail);
  const domains = orders.flatMap(o => (o.items || []).filter(i => i.type === 'domain').map(i => ({
    ...i,
    orderId:     o.id,
    status:      o.status,
    orderDate:   o.createdAt,
    expiry:      new Date(new Date(o.createdAt).setFullYear(new Date(o.createdAt).getFullYear() + 1)).toISOString(),
    nameservers: o.nameservers || ['ns1.domainstore.in', 'ns2.domainstore.in'],
    autoRenew:   o.autoRenew !== false,
    locked:      o.locked !== false,
    privacy:     o.privacy || false
  })));
  res.json(domains);
});

// ── PATCH /api/user/domains/:orderId/nameservers ─────────────
router.patch('/domains/:orderId/nameservers', userAuth, (req, res) => {
  const { nameservers } = req.body;
  if (!nameservers || !Array.isArray(nameservers) || nameservers.length < 2)
    return res.status(400).json({ error: 'At least 2 nameservers required' });
  const orders = readOrders();
  const order  = orders.find(o => o.id === req.params.orderId && o.customer?.email === req.userEmail);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  order.nameservers = nameservers.filter(n => n.trim()).slice(0, 4);
  order.updatedAt   = new Date().toISOString();
  writeOrders(orders);
  res.json({ success: true, nameservers: order.nameservers });
});

// ── PATCH /api/user/domains/:orderId/settings ────────────────
router.patch('/domains/:orderId/settings', userAuth, (req, res) => {
  const { autoRenew, locked, privacy } = req.body;
  const orders = readOrders();
  const order  = orders.find(o => o.id === req.params.orderId && o.customer?.email === req.userEmail);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (autoRenew !== undefined) order.autoRenew = autoRenew;
  if (locked    !== undefined) order.locked    = locked;
  if (privacy   !== undefined) order.privacy   = privacy;
  order.updatedAt = new Date().toISOString();
  writeOrders(orders);
  res.json({ success: true });
});

// ── GET /api/user/hosting ─────────────────────────────────────
router.get('/hosting', userAuth, (req, res) => {
  const orders  = readOrders().filter(o => o.customer?.email === req.userEmail);
  const cpUser  = (req.userEmail.split('@')[0] || 'user').slice(0, 8).replace(/[^a-z0-9]/g, '');
  const hosting = orders.flatMap(o => (o.items || []).filter(i => i.type === 'hosting').map(i => {
    const seed = Math.abs(o.id.charCodeAt(4) || 100);
    return {
      ...i,
      orderId:       o.id,
      status:        o.status,
      orderDate:     o.createdAt,
      expiry:        new Date(new Date(o.createdAt).setFullYear(new Date(o.createdAt).getFullYear() + 1)).toISOString(),
      serverIp:      `103.21.${seed % 255}.${(seed * 7) % 255}`,
      cpanelUser,
      cpanelUrl:     `https://cpanel.domainstore.in:2083`,
      ftpHost:       `ftp.domainstore.in`,
      nameservers:   ['ns1.domainstore.in', 'ns2.domainstore.in'],
      diskUsed:      o.diskUsed || '0 MB',
      diskLimit:     i.name?.includes('Business') ? '50 GB' : i.name?.includes('Pro') ? '30 GB' : '10 GB',
      bandwidth:     'Unmetered',
      emailAccounts: o.emailAccounts || [],
      databases:     o.databases || []
    };
  }));
  res.json(hosting);
});

// ── POST /api/user/hosting/:orderId/email ─────────────────────
router.post('/hosting/:orderId/email', userAuth, (req, res) => {
  const { emailUser, password, quota } = req.body;
  if (!emailUser || !password) return res.status(400).json({ error: 'emailUser and password required' });
  const orders = readOrders();
  const order  = orders.find(o => o.id === req.params.orderId && o.customer?.email === req.userEmail);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (!order.emailAccounts) order.emailAccounts = [];
  const domain = (order.items || []).find(i => i.type === 'domain')?.name || 'domainstore.in';
  order.emailAccounts.push({ id: Date.now().toString(), emailUser, email: `${emailUser}@${domain}`, quota: quota || '1GB', createdAt: new Date().toISOString() });
  writeOrders(orders);
  res.json({ success: true, emailAccounts: order.emailAccounts });
});

// ── DELETE /api/user/hosting/:orderId/email/:emailId ──────────
router.delete('/hosting/:orderId/email/:emailId', userAuth, (req, res) => {
  const orders = readOrders();
  const order  = orders.find(o => o.id === req.params.orderId && o.customer?.email === req.userEmail);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  order.emailAccounts = (order.emailAccounts || []).filter(e => e.id !== req.params.emailId);
  writeOrders(orders);
  res.json({ success: true });
});

// ── GET /api/user/orders ──────────────────────────────────────
router.get('/orders', userAuth, (req, res) => {
  const orders = readOrders().filter(o => o.customer?.email === req.userEmail);
  res.json(orders.reverse());
});

// ── PATCH /api/user/profile ───────────────────────────────────
router.patch('/profile', userAuth, (req, res) => {
  const { name, phone, profile } = req.body;
  const users = readUsers();
  const user  = users.find(u => u.id === req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (name)    user.name    = name;
  if (phone)   user.phone   = phone;
  if (profile) user.profile = { ...user.profile, ...profile };
  writeUsers(users);
  const { password: _, ...safe } = user;
  res.json({ success: true, user: safe });
});

// ── PATCH /api/user/password ──────────────────────────────────
router.patch('/password', userAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'currentPassword and newPassword required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
  const users = readUsers();
  const user  = users.find(u => u.id === req.userId);
  if (!user || user.password !== hashPwd(currentPassword))
    return res.status(401).json({ error: 'Current password is incorrect' });
  user.password = hashPwd(newPassword);
  writeUsers(users);
  res.json({ success: true });
});

module.exports = router;
