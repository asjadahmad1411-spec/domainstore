const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

const ordersPath    = path.join(__dirname, '../data/orders.json');
const customersPath = path.join(__dirname, '../data/customers.json');
const promosPath    = path.join(__dirname, '../data/promos.json');

const readOrders    = () => JSON.parse(fs.readFileSync(ordersPath, 'utf8'));
const writeOrders   = (d) => fs.writeFileSync(ordersPath, JSON.stringify(d, null, 2));
const readCustomers = () => JSON.parse(fs.readFileSync(customersPath, 'utf8'));
const writeCustomers= (d) => fs.writeFileSync(customersPath, JSON.stringify(d, null, 2));
const readPromos    = () => JSON.parse(fs.readFileSync(promosPath, 'utf8'));

// ── POST /api/orders — place order (public) ───────────────────
router.post('/', (req, res) => {
  const { customer, items, promoCode, paymentMethod, codFee } = req.body;
  if (!customer || !items || !items.length)
    return res.status(400).json({ error: 'customer and items required' });

  // Calculate discount from promo
  let discount = 0;
  if (promoCode) {
    const promo = readPromos().find(p => p.code === promoCode.toUpperCase() && p.active);
    if (promo && (!promo.expiry || new Date(promo.expiry) > new Date())) {
      const subtotal = items.reduce((s, i) => s + (Number(i.price) || 0), 0);
      discount = promo.type === 'percent'
        ? Math.round(subtotal * promo.value / 100)
        : promo.value;
    }
  }

  const subtotal  = items.reduce((s, i) => s + (Number(i.price) || 0), 0);
  const extraFee  = Number(codFee) || 0;
  const total     = Math.max(subtotal - discount, 0) + extraFee;

  // Status based on payment method
  const statusMap = { upi_manual: 'UTR Pending', cod: 'Pending' };
  const status    = statusMap[paymentMethod] || 'Pending';

  const order = {
    id:            'ORD-' + uuidv4().slice(0, 8).toUpperCase(),
    customer,
    items,
    promoCode:     promoCode || null,
    discount,
    codFee:        extraFee,
    total,
    paymentMethod: paymentMethod || 'card',
    status,
    createdAt:     new Date().toISOString()
  };

  const orders = readOrders();
  orders.push(order);
  writeOrders(orders);

  // Upsert customer
  const customers = readCustomers();
  const existing  = customers.find(c => c.email === customer.email);
  if (existing) {
    existing.orders     = (existing.orders || 0) + 1;
    existing.totalSpent = (existing.totalSpent || 0) + total;
    existing.lastOrder  = order.createdAt;
  } else {
    customers.push({
      id:         uuidv4(),
      name:       customer.name,
      email:      customer.email,
      phone:      customer.phone || '',
      orders:     1,
      totalSpent: total,
      joinedAt:   order.createdAt,
      lastOrder:  order.createdAt
    });
  }
  writeCustomers(customers);

  res.json({ success: true, orderId: order.id, total });
});

// ── GET /api/orders/status/:id — PUBLIC (for live polling) ───
// Returns only status field — no auth needed, no sensitive data
router.get('/status/:id', (req, res) => {
  const order = readOrders().find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json({ orderId: order.id, status: order.status, updatedAt: order.updatedAt || order.createdAt });
});

// ── GET /api/orders — admin list ─────────────────────────────
router.get('/', authMiddleware, (req, res) => {
  const orders = readOrders();
  const { status } = req.query;
  res.json(status ? orders.filter(o => o.status === status) : orders);
});

// ── GET /api/orders/:id ──────────────────────────────────────
router.get('/:id', authMiddleware, (req, res) => {
  const order = readOrders().find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

// ── PATCH /api/orders/:id/status ─────────────────────────────
router.patch('/:id/status', authMiddleware, (req, res) => {
  const orders = readOrders();
  const order  = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  order.status    = req.body.status;
  order.updatedAt = new Date().toISOString();
  writeOrders(orders);
  res.json(order);
});

// ── DELETE /api/orders/:id ───────────────────────────────────
router.delete('/:id', authMiddleware, (req, res) => {
  const orders   = readOrders();
  const filtered = orders.filter(o => o.id !== req.params.id);
  if (filtered.length === orders.length) return res.status(404).json({ error: 'Order not found' });
  writeOrders(filtered);
  res.json({ success: true });
});

module.exports = router;
