const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

const customersPath = path.join(__dirname, '../data/customers.json');
const promosPath    = path.join(__dirname, '../data/promos.json');
const ordersPath    = path.join(__dirname, '../data/orders.json');
const settingsPath  = path.join(__dirname, '../data/settings.json');

const readJSON  = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJSON = (p, d) => fs.writeFileSync(p, JSON.stringify(d, null, 2));

// ── Stats ─────────────────────────────────────────────────────────────────
router.get('/stats', authMiddleware, (req, res) => {
  const orders    = readJSON(ordersPath);
  const customers = readJSON(customersPath);
  const revenue   = orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + (o.total || 0), 0);
  res.json({
    totalRevenue:    revenue,
    totalOrders:     orders.length,
    pendingOrders:   orders.filter(o => o.status === 'Pending').length,
    activeOrders:    orders.filter(o => o.status === 'Active').length,
    cancelledOrders: orders.filter(o => o.status === 'Cancelled').length,
    utrPending:      orders.filter(o => o.status === 'UTR Pending').length,
    totalCustomers:  customers.length,
    domainsSold:     orders.filter(o => o.items?.some(i => i.type === 'domain')).length,
    hostingActive:   orders.filter(o => o.status === 'Active' && o.items?.some(i => i.type === 'hosting')).length,
    recentOrders:    orders.slice(-5).reverse()
  });
});

// ── Customers ─────────────────────────────────────────────────────────────
router.get('/customers', authMiddleware, (req, res) => res.json(readJSON(customersPath)));
router.delete('/customers/:id', authMiddleware, (req, res) => {
  const list = readJSON(customersPath).filter(c => c.id !== req.params.id);
  writeJSON(customersPath, list);
  res.json({ success: true });
});

// ── Promos ────────────────────────────────────────────────────────────────
router.get('/promos', authMiddleware, (req, res) => res.json(readJSON(promosPath)));

router.get('/promos/public', (req, res) => {
  // Public: only return active promos (no full details, just enough for display)
  const promos = readJSON(promosPath).filter(p => p.active);
  res.json(promos.map(p => ({
    code: p.code, type: p.type, value: p.value, expiry: p.expiry
  })));
});

router.post('/promos', authMiddleware, (req, res) => {
  const promos = readJSON(promosPath);
  const { code, type, value, expiry, active } = req.body;
  if (!code || !type || value === undefined) return res.status(400).json({ error: 'code, type, value required' });
  if (promos.find(p => p.code === code.toUpperCase())) return res.status(409).json({ error: 'Promo code exists' });
  const promo = { id: uuidv4(), code: code.toUpperCase(), type, value: Number(value), expiry: expiry || null, active: active !== false, createdAt: new Date().toISOString() };
  promos.push(promo);
  writeJSON(promosPath, promos);
  res.json(promo);
});

router.patch('/promos/:id', authMiddleware, (req, res) => {
  const promos = readJSON(promosPath);
  const idx = promos.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  promos[idx] = { ...promos[idx], ...req.body };
  writeJSON(promosPath, promos);
  res.json(promos[idx]);
});

router.delete('/promos/:id', authMiddleware, (req, res) => {
  const promos = readJSON(promosPath).filter(p => p.id !== req.params.id);
  writeJSON(promosPath, promos);
  res.json({ success: true });
});

// ── Promo Validate (public) ────────────────────────────────────────────────
router.post('/promos/validate', (req, res) => {
  const { code, total } = req.body;
  const promos = readJSON(promosPath);
  const promo  = promos.find(p => p.code === (code || '').toUpperCase() && p.active);
  if (!promo) return res.status(404).json({ valid: false, error: 'Invalid promo code' });
  if (promo.expiry && new Date(promo.expiry) < new Date()) return res.status(400).json({ valid: false, error: 'Promo expired' });
  const discount = promo.type === 'percent' ? Math.round((total || 0) * promo.value / 100) : promo.value;
  res.json({ valid: true, discount, type: promo.type, value: promo.value });
});

// ── Settings (public read for UPI) ────────────────────────────────────────
router.get('/settings', (req, res) => {
  const s = readJSON(settingsPath);
  // Public: strip nothing, frontend needs UPI info
  res.json(s);
});

router.put('/settings', authMiddleware, (req, res) => {
  const current = readJSON(settingsPath);
  const updated = { ...current, ...req.body };
  writeJSON(settingsPath, updated);
  res.json(updated);
});

// ── UTR Verification ──────────────────────────────────────────────────────
// GET all orders awaiting UTR verification
router.get('/utr-pending', authMiddleware, (req, res) => {
  const orders = readJSON(ordersPath);
  res.json(orders.filter(o => o.status === 'UTR Pending' || (o.utr && o.status === 'Pending')));
});

// POST verify a UTR → mark order as Active
router.post('/utr-verify/:orderId', authMiddleware, (req, res) => {
  const orders = readJSON(ordersPath);
  const order = orders.find(o => o.id === req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  order.status = 'Active';
  order.utrVerified = true;
  order.verifiedAt = new Date().toISOString();
  order.verifiedBy = 'admin';
  writeJSON(ordersPath, orders);
  res.json({ success: true, order });
});

// POST reject a UTR
router.post('/utr-reject/:orderId', authMiddleware, (req, res) => {
  const orders = readJSON(ordersPath);
  const order = orders.find(o => o.id === req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  order.status = 'Cancelled';
  order.utrRejected = true;
  order.rejectedAt = new Date().toISOString();
  order.rejectedReason = req.body.reason || 'UTR verification failed';
  writeJSON(ordersPath, orders);
  res.json({ success: true });
});

// POST auto-validate UTR format + mark pending
router.post('/utr-submit', (req, res) => {
  const { orderId, utr } = req.body;
  if (!orderId || !utr) return res.status(400).json({ error: 'orderId and utr required' });

  // Validate UTR format: 12 alphanumeric characters
  const utrClean = (utr || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{12,22}$/.test(utrClean)) {
    return res.status(400).json({ error: 'Invalid UTR format. UTR should be 12-22 alphanumeric characters.' });
  }

  const orders = readJSON(ordersPath);
  // Check duplicate UTR
  if (orders.find(o => o.utr === utrClean && o.id !== orderId)) {
    return res.status(409).json({ error: 'This UTR is already used for another order.' });
  }

  const order = orders.find(o => o.id === orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  order.utr = utrClean;
  order.status = 'UTR Pending';
  order.utrSubmittedAt = new Date().toISOString();
  writeJSON(ordersPath, orders);
  res.json({ success: true, message: 'UTR submitted. Your order will be activated within 30 minutes after verification.' });
});

module.exports = router;
