require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/domains', require('./routes/domains'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/hosting', require('./routes/hosting'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/user', require('./routes/user'));

// Catch-all for HTML pages
app.get('*', (req, res) => {
  const filePath = require('path').join(__dirname, '../public', req.path);
  if (require('fs').existsSync(filePath) && require('fs').statSync(filePath).isFile()) {
    return res.sendFile(filePath);
  }
  res.sendFile(require('path').join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 DomainStore running at http://localhost:${PORT}`);
  console.log(`📊 Admin Panel: http://localhost:${PORT}/admin/`);
  console.log(`🔑 Admin Login: admin / admin123\n`);
});
