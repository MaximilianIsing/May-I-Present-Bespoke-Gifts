const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Load admin password
const ADMIN_PASSWORD = fs.readFileSync(path.join(__dirname, 'adminpass.txt'), 'utf8').trim();
const ADMIN_TOKEN = 'mip_admin_' + Buffer.from(ADMIN_PASSWORD).toString('base64');

// Ensure data directories exist
const DATA_DIR = path.join(__dirname, 'data');
const SUBMISSIONS_DIR = path.join(DATA_DIR, 'submissions');
const MESSAGES_DIR = path.join(DATA_DIR, 'messages');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

[DATA_DIR, SUBMISSIONS_DIR, MESSAGES_DIR, UPLOADS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ---- Helpers ----
function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } catch { return {}; }
}
function saveUsers(u) { fs.writeFileSync(USERS_FILE, JSON.stringify(u, null, 2)); }

function loadSubmission(id) {
  const f = path.join(SUBMISSIONS_DIR, `${id}.json`);
  if (!fs.existsSync(f)) return null;
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; }
}
function saveSubmission(s) {
  fs.writeFileSync(path.join(SUBMISSIONS_DIR, `${s.id}.json`), JSON.stringify(s, null, 2));
}
function getAllSubmissions() {
  if (!fs.existsSync(SUBMISSIONS_DIR)) return [];
  return fs.readdirSync(SUBMISSIONS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => { try { return JSON.parse(fs.readFileSync(path.join(SUBMISSIONS_DIR, f), 'utf8')); } catch { return null; } })
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function loadMessages(sid) {
  const f = path.join(MESSAGES_DIR, `${sid}.json`);
  if (!fs.existsSync(f)) return [];
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return []; }
}
function saveMessages(sid, msgs) {
  fs.writeFileSync(path.join(MESSAGES_DIR, `${sid}.json`), JSON.stringify(msgs, null, 2));
}

// ---- Multer ----
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(jpg|jpeg|png|gif|webp|pdf|doc|docx|heic|heif)$/i.test(file.originalname);
    cb(null, ok);
  }
});

// ---- Middleware ----
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/media', express.static(path.join(__dirname, 'media')));

// ---- Admin auth middleware ----
function adminAuth(req, res, next) {
  const t = req.headers['x-admin-token'];
  if (t === ADMIN_TOKEN) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// ====================
//   USER ENDPOINTS
// ====================

app.post('/api/users/signup', (req, res) => {
  const { name, contact, contactType } = req.body;
  if (!name || !contact) return res.status(400).json({ error: 'Name and contact required' });
  const users = loadUsers();
  const existing = Object.values(users).find(u => u.contact === contact.trim());
  if (existing) return res.json({ user: existing, isNew: false });

  const user = {
    id: uuidv4(),
    name: name.trim(),
    contact: contact.trim(),
    contactType: contactType || 'phone',
    createdAt: new Date().toISOString(),
    submissions: []
  };
  users[user.id] = user;
  saveUsers(users);
  res.json({ user, isNew: true });
});

app.get('/api/users/:userId', (req, res) => {
  const users = loadUsers();
  const user = users[req.params.userId];
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

app.get('/api/users/:userId/submissions', (req, res) => {
  const users = loadUsers();
  const user = users[req.params.userId];
  if (!user) return res.status(404).json({ error: 'Not found' });
  const subs = (user.submissions || []).map(id => loadSubmission(id)).filter(Boolean);
  res.json(subs);
});

// ====================
//  SUBMISSION ENDPOINTS
// ====================

app.post('/api/submissions', (req, res) => {
  const { userId, answers } = req.body;
  if (!userId || !answers) return res.status(400).json({ error: 'Missing data' });
  const users = loadUsers();
  const user = users[userId];
  if (!user) return res.status(404).json({ error: 'User not found' });

  const sub = {
    id: uuidv4(),
    userId,
    userName: user.name,
    userContact: user.contact,
    userContactType: user.contactType,
    answers,
    status: 'new',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    charge: null,
    adminNotes: ''
  };
  saveSubmission(sub);

  // Auto-send a welcome message from Michele
  const welcomeMsg = {
    id: uuidv4(),
    type: 'text',
    sender: 'admin',
    senderName: 'Michele',
    content: `Hi ${user.name}! 👋 I just received your gift request and I'm so excited to help find something truly special. I'll review everything you shared and reach out shortly to chat more. Talk soon! 💛`,
    timestamp: new Date().toISOString()
  };
  saveMessages(sub.id, [welcomeMsg]);

  if (!user.submissions) user.submissions = [];
  user.submissions.push(sub.id);
  users[userId] = user;
  saveUsers(users);

  io.to('admin_room').emit('new_submission', sub);
  res.json({ submission: sub });
});

app.get('/api/submissions/:id', (req, res) => {
  const sub = loadSubmission(req.params.id);
  if (!sub) return res.status(404).json({ error: 'Not found' });
  res.json(sub);
});

// ====================
//  MESSAGE ENDPOINTS
// ====================

app.get('/api/messages/:submissionId', (req, res) => {
  res.json(loadMessages(req.params.submissionId));
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({
    filename: req.file.filename,
    originalName: req.file.originalname,
    url: `/uploads/${req.file.filename}`,
    mimetype: req.file.mimetype,
    size: req.file.size
  });
});

// User responds to charge prompt
app.post('/api/charge/:submissionId/respond', (req, res) => {
  const { chargeId, response, userId } = req.body;
  const sub = loadSubmission(req.params.submissionId);
  if (!sub) return res.status(404).json({ error: 'Not found' });
  if (sub.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

  if (sub.charge && sub.charge.id === chargeId) {
    sub.charge.status = response;
    if (response === 'accepted') sub.status = 'confirmed';
    sub.updatedAt = new Date().toISOString();
    saveSubmission(sub);

    const msgs = loadMessages(req.params.submissionId);
    const cm = msgs.find(m => m.type === 'charge_prompt' && m.chargeId === chargeId);
    if (cm) { cm.status = response; saveMessages(req.params.submissionId, msgs); }

    io.to('admin_room').emit('charge_response', { submissionId: req.params.submissionId, response });
    io.to(`sub_${req.params.submissionId}`).emit('charge_updated', { chargeId, status: response });
  }
  res.json({ success: true });
});

// ====================
//  ADMIN ENDPOINTS
// ====================

app.post('/api/admin/auth', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, token: ADMIN_TOKEN });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

app.get('/api/admin/submissions', adminAuth, (req, res) => {
  res.json(getAllSubmissions());
});

app.patch('/api/admin/submissions/:id', adminAuth, (req, res) => {
  const sub = loadSubmission(req.params.id);
  if (!sub) return res.status(404).json({ error: 'Not found' });
  const { status, adminNotes } = req.body;
  if (status && status !== sub.status) {
    sub.status = status;
    const STATUS_LABELS = { new: 'New', in_progress: 'In Progress', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' };
    const systemMsg = {
      id: uuidv4(),
      type: 'system',
      sender: 'system',
      content: `Status updated to "${STATUS_LABELS[status] || status}"`,
      timestamp: new Date().toISOString()
    };
    const msgs = loadMessages(req.params.id);
    msgs.push(systemMsg);
    saveMessages(req.params.id, msgs);
    io.to(`sub_${sub.id}`).emit('new_message', systemMsg);
    io.to(`sub_${sub.id}`).emit('status_updated', { status: sub.status });
  }
  if (adminNotes !== undefined) sub.adminNotes = adminNotes;
  sub.updatedAt = new Date().toISOString();
  saveSubmission(sub);
  res.json(sub);
});

app.post('/api/admin/charge', adminAuth, (req, res) => {
  const { submissionId, amount, description } = req.body;
  const sub = loadSubmission(submissionId);
  if (!sub) return res.status(404).json({ error: 'Not found' });

  const chargeId = uuidv4();
  sub.charge = { id: chargeId, amount, description, status: 'pending', createdAt: new Date().toISOString() };
  sub.updatedAt = new Date().toISOString();
  saveSubmission(sub);

  const msg = {
    id: uuidv4(),
    type: 'charge_prompt',
    sender: 'admin',
    senderName: 'Michele',
    chargeId,
    amount,
    description,
    status: 'pending',
    timestamp: new Date().toISOString()
  };
  const msgs = loadMessages(submissionId);
  msgs.push(msg);
  saveMessages(submissionId, msgs);

  io.to(`sub_${submissionId}`).emit('new_message', msg);
  res.json({ success: true, charge: sub.charge });
});

app.get('/api/admin/stats', adminAuth, (req, res) => {
  const subs = getAllSubmissions();
  const totalRevenue = subs
    .filter(s => s.charge && s.charge.status === 'accepted')
    .reduce((sum, s) => sum + parseFloat(s.charge.amount || 0), 0);
  res.json({
    total: subs.length,
    statusNew: subs.filter(s => s.status === 'new').length,
    statusActive: subs.filter(s => s.status === 'in_progress').length,
    statusCompleted: subs.filter(s => s.status === 'completed').length,
    statusConfirmed: subs.filter(s => s.status === 'confirmed').length,
    totalRevenue: totalRevenue.toFixed(2),
    recent: subs.slice(0, 5)
  });
});

// ====================
//   SOCKET.IO
// ====================

io.on('connection', (socket) => {
  socket.on('join_admin', ({ token }) => {
    if (token === ADMIN_TOKEN) {
      socket.join('admin_room');
      socket.data.isAdmin = true;
    }
  });

  socket.on('join_submission', ({ submissionId }) => {
    socket.join(`sub_${submissionId}`);
    socket.data.submissionId = submissionId;
  });

  socket.on('admin_join_submission', ({ submissionId }) => {
    if (socket.data.isAdmin) socket.join(`sub_${submissionId}`);
  });

  socket.on('send_message', ({ submissionId, content, senderName, isAdmin }) => {
    const msg = {
      id: uuidv4(),
      type: 'text',
      sender: isAdmin ? 'admin' : 'user',
      senderName: isAdmin ? 'Michele' : senderName,
      content,
      timestamp: new Date().toISOString()
    };
    const msgs = loadMessages(submissionId);
    msgs.push(msg);
    saveMessages(submissionId, msgs);
    io.to(`sub_${submissionId}`).emit('new_message', msg);
    if (!isAdmin) io.to('admin_room').emit('user_message', { submissionId, message: msg });
  });

  socket.on('send_file_message', ({ submissionId, fileUrl, fileName, fileType, senderName, isAdmin }) => {
    const msg = {
      id: uuidv4(),
      type: 'file',
      sender: isAdmin ? 'admin' : 'user',
      senderName: isAdmin ? 'Michele' : senderName,
      fileUrl,
      fileName,
      fileType,
      timestamp: new Date().toISOString()
    };
    const msgs = loadMessages(submissionId);
    msgs.push(msg);
    saveMessages(submissionId, msgs);
    io.to(`sub_${submissionId}`).emit('new_message', msg);
    if (!isAdmin) io.to('admin_room').emit('user_message', { submissionId, message: msg });
  });

  socket.on('typing', ({ submissionId, name, isAdmin }) => {
    socket.to(`sub_${submissionId}`).emit('typing', { name, isAdmin });
  });
});

// Serve admin SPA
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`May I Present running on :${PORT}`));
