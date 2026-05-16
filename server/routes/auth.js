const express = require('express');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const usersPath = path.join(__dirname, '../data/users.json');

const readUsers  = () => JSON.parse(fs.readFileSync(usersPath, 'utf8'));
const writeUsers = (d) => fs.writeFileSync(usersPath, JSON.stringify(d, null, 2));

const JWT_SECRET = process.env.JWT_SECRET || 'domainstore_secret_2025';

function hashPwd(pwd) {
  let h = 0;
  for (let i = 0; i < pwd.length; i++) { h = ((h << 5) - h) + pwd.charCodeAt(i); h |= 0; }
  return 'h_' + Math.abs(h).toString(36) + '_' + pwd.length;
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const users = readUsers();
  if (users.find(u => u.email === email.toLowerCase()))
    return res.status(409).json({ error: 'Email already registered. Please login.' });
  const user = {
    id: uuidv4(), name, email: email.toLowerCase(), phone: phone || '',
    password: hashPwd(password), createdAt: new Date().toISOString(),
    profile: { company: '', address: '', city: '', state: '', pincode: '', country: 'India' }
  };
  users.push(user); writeUsers(users);
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  const { password: _, ...safe } = user;
  res.json({ success: true, token, user: safe });
});

// POST /api/auth/check-email — public, just checks if email exists
router.post('/check-email', (req, res) => {
  const { email } = req.body;
  if (!email) return res.json({ exists: false });
  const exists = readUsers().some(u => u.email === email.toLowerCase());
  res.json({ exists });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const user = readUsers().find(u => u.email === email.toLowerCase());
  if (!user || user.password !== hashPwd(password))
    return res.status(401).json({ error: 'Invalid email or password' });
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  const { password: _, ...safe } = user;
  res.json({ success: true, token, user: safe });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const { userId } = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const user = readUsers().find(u => u.id === userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password: _, ...safe } = user;
    res.json(safe);
  } catch (e) { res.status(401).json({ error: 'Invalid token' }); }
});

module.exports = router;
