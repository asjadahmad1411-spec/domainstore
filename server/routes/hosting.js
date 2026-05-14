const express = require('express');
const fs = require('fs');
const path = require('path');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

const dataPath = path.join(__dirname, '../data/hosting-plans.json');
const read = () => JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const write = (d) => fs.writeFileSync(dataPath, JSON.stringify(d, null, 2));

// GET /api/hosting — public
router.get('/', (req, res) => {
  const plans = read();
  const { category } = req.query;
  res.json(category ? plans.filter(p => p.category === category) : plans);
});

// POST /api/hosting — admin add plan
router.post('/', authMiddleware, (req, res) => {
  const plans = read();
  const plan = { ...req.body };
  if (!plan.id || !plan.name || !plan.price) return res.status(400).json({ error: 'id, name, price required' });
  if (plans.find(p => p.id === plan.id)) return res.status(409).json({ error: 'Plan ID exists' });
  plans.push(plan);
  write(plans);
  res.json(plan);
});

// PUT /api/hosting/:id — admin update plan
router.put('/:id', authMiddleware, (req, res) => {
  const plans = read();
  const idx = plans.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Plan not found' });
  plans[idx] = { ...plans[idx], ...req.body };
  write(plans);
  res.json(plans[idx]);
});

// DELETE /api/hosting/:id — admin delete plan
router.delete('/:id', authMiddleware, (req, res) => {
  const plans = read();
  const filtered = plans.filter(p => p.id !== req.params.id);
  if (filtered.length === plans.length) return res.status(404).json({ error: 'Plan not found' });
  write(filtered);
  res.json({ success: true });
});

module.exports = router;
