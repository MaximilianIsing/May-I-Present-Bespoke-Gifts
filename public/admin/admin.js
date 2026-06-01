/* ============================================================
   May I Present — Admin Dashboard
   ============================================================ */

let adminToken = null;
let socket = null;
let allSubmissions = [];
let activeSubmissionId = null;
let unreadMap = {};

// ── Login ──────────────────────────────────────────────────
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pw = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';

  try {
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Wrong password');

    adminToken = data.token;
    sessionStorage.setItem('mip_admin_token', adminToken);
    startAdminApp();
  } catch (err) {
    errEl.textContent = err.message || 'Login failed';
  }
});

// Auto-restore session
window.addEventListener('DOMContentLoaded', () => {
  const saved = sessionStorage.getItem('mip_admin_token');
  if (saved) { adminToken = saved; startAdminApp(); }

  document.getElementById('dashboard-date').textContent =
    new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
});

function startAdminApp() {
  document.getElementById('admin-login').style.display = 'none';
  document.getElementById('admin-app').style.display = 'flex';
  connectAdminSocket();
  loadDashboard();
  loadSubmissions();
}

function adminSignOut() {
  sessionStorage.removeItem('mip_admin_token');
  adminToken = null;
  document.getElementById('admin-login').style.display = 'flex';
  document.getElementById('admin-app').style.display = 'none';
}

// ── Socket ─────────────────────────────────────────────────
function connectAdminSocket() {
  socket = io();
  socket.emit('join_admin', { token: adminToken });

  socket.on('new_submission', (sub) => {
    allSubmissions.unshift(sub);
    renderSubmissionsList();
    renderRecentList();
    loadStats();
    showAdminToast('New gift request', `From ${sub.userName} — ${occasionLabel(sub.answers?.occasion)}`);
    bumpNewBadge();
  });

  socket.on('user_message', ({ submissionId, message }) => {
    // If this drawer is open on that submission's chat tab
    if (activeSubmissionId === submissionId && isChatTabActive()) {
      appendAdminMessage(message);
      scrollAdminChat();
    } else {
      unreadMap[submissionId] = (unreadMap[submissionId] || 0) + 1;
      renderSubmissionsList();
      showAdminToast('New message', message.content?.slice(0, 60) || 'File received');
    }
    // Update the sub's last activity in our local cache
    const sub = allSubmissions.find(s => s.id === submissionId);
    if (sub) sub.lastMessage = message;
  });

  socket.on('charge_response', ({ submissionId, response }) => {
    const sub = allSubmissions.find(s => s.id === submissionId);
    if (sub && sub.charge) {
      sub.charge.status = response;
      if (activeSubmissionId === submissionId) refreshChargeDisplay();
    }
    showAdminToast(
      response === 'accepted' ? 'Payment accepted' : 'Payment declined',
      `Client responded to your payment request`
    );
  });

  socket.on('typing', ({ name, isAdmin }) => {
    if (!isAdmin && activeSubmissionId && isChatTabActive()) {
      const ind = document.getElementById('admin-typing-indicator');
      if (ind) {
        ind.classList.add('visible');
        clearTimeout(window._adminTypingTimer);
        window._adminTypingTimer = setTimeout(() => ind.classList.remove('visible'), 2500);
      }
    }
  });
}

// ── Dashboard ──────────────────────────────────────────────
async function loadDashboard() {
  await loadStats();
  await loadSubmissions();
  renderRecentList();
}

async function loadStats() {
  try {
    const res = await fetch('/api/admin/stats', { headers: { 'x-admin-token': adminToken } });
    const data = await res.json();
    document.getElementById('stat-total').textContent     = data.total;
    document.getElementById('stat-new').textContent       = data.statusNew;
    document.getElementById('stat-active').textContent    = data.statusActive;
    document.getElementById('stat-completed').textContent = data.statusCompleted + data.statusConfirmed;
    document.getElementById('stat-revenue').textContent   = '$' + parseFloat(data.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

    const badge = document.getElementById('new-badge');
    if (data.statusNew > 0) {
      badge.textContent = data.statusNew;
      badge.style.display = 'inline';
    } else {
      badge.style.display = 'none';
    }
  } catch {}
}

function renderRecentList() {
  const el = document.getElementById('recent-list');
  if (!el) return;
  const recent = allSubmissions.slice(0, 6);
  if (!recent.length) { el.innerHTML = '<div class="empty-state">No gift requests yet.</div>'; return; }
  el.innerHTML = recent.map(sub => buildSubRow(sub)).join('');
}

// ── Submissions ────────────────────────────────────────────
async function loadSubmissions() {
  try {
    const res = await fetch('/api/admin/submissions', { headers: { 'x-admin-token': adminToken } });
    allSubmissions = await res.json();
    renderSubmissionsList();
  } catch {}
}

function filterSubmissions() {
  renderSubmissionsList();
}

function renderSubmissionsList() {
  const el = document.getElementById('submissions-list');
  if (!el) return;

  const statusFilter = document.getElementById('status-filter')?.value || '';
  const search = (document.getElementById('search-input')?.value || '').toLowerCase();

  let filtered = allSubmissions.filter(s => {
    if (statusFilter && s.status !== statusFilter) return false;
    if (search) {
      const hay = [s.userName, s.answers?.recipient_name, occasionLabel(s.answers?.occasion)].join(' ').toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  if (!filtered.length) { el.innerHTML = '<div class="empty-state">No matching requests.</div>'; return; }
  el.innerHTML = filtered.map(sub => buildSubRow(sub)).join('');
}

function buildSubRow(sub) {
  const unread = unreadMap[sub.id] || 0;
  const initial = (sub.userName || '?').charAt(0).toUpperCase();
  const recipient = sub.answers?.recipient_name || 'Someone special';
  const occ = occasionLabel(sub.answers?.occasion);
  const budget = sub.answers?.budget?.label || '—';
  const date = timeAgo(sub.createdAt);

  return `<div class="sub-row ${unread > 0 ? 'has-unread' : ''}" onclick="openDrawer('${sub.id}')">
    <div class="sub-row-avatar">${initial}</div>
    <div class="sub-row-info">
      <div class="sub-row-name">${esc(sub.userName)} — Gift for ${esc(recipient)}</div>
      <div class="sub-row-detail">${occ} · ${esc(sub.userContact)} · Budget: ${budget}</div>
    </div>
    <div class="sub-row-meta">
      <span class="status-badge status-${sub.status}">${statusLabel(sub.status)}</span>
      <span class="sub-row-date">${date}</span>
      ${unread > 0 ? `<span class="unread-dot"></span>` : ''}
    </div>
  </div>`;
}

// ── Drawer ─────────────────────────────────────────────────
async function openDrawer(submissionId) {
  activeSubmissionId = submissionId;
  unreadMap[submissionId] = 0;
  renderSubmissionsList();

  const sub = allSubmissions.find(s => s.id === submissionId);
  if (!sub) return;

  // Header
  const recipient = sub.answers?.recipient_name || 'Someone special';
  document.getElementById('drawer-title').textContent = `Gift for ${recipient}`;
  document.getElementById('drawer-sub').textContent =
    `${sub.userName} · ${occasionLabel(sub.answers?.occasion)} · ${timeAgo(sub.createdAt)}`;

  // Info tab
  renderDrawerSummary(sub);
  renderStatusButtons(sub);
  document.getElementById('admin-notes').value = sub.adminNotes || '';

  // Answers tab
  renderDrawerAnswers(sub);

  // Open drawer
  document.getElementById('detail-drawer').classList.add('open');
  document.getElementById('drawer-backdrop').classList.add('visible');

  // Switch to info by default
  switchDrawerTab('info');

  // Join socket room
  if (socket) socket.emit('admin_join_submission', { submissionId });
}

function closeDrawer() {
  document.getElementById('detail-drawer').classList.remove('open');
  document.getElementById('drawer-backdrop').classList.remove('visible');
  activeSubmissionId = null;
  document.getElementById('charge-panel').style.display = 'none';
}

function switchDrawerTab(tab) {
  ['info', 'answers', 'chat'].forEach(t => {
    document.getElementById(`dtab-${t}`).classList.toggle('active', t === tab);
    const panel = document.getElementById(`dtab-${t}-panel`);
    if (panel) panel.style.display = t === tab ? (t === 'chat' ? 'flex' : 'block') : 'none';
  });

  if (tab === 'chat') {
    loadAdminChat(activeSubmissionId);
    unreadMap[activeSubmissionId] = 0;
    document.getElementById('chat-unread-dot').style.display = 'none';
    renderSubmissionsList();
  }
}

function isChatTabActive() {
  return document.getElementById('dtab-chat')?.classList.contains('active');
}

// ── Summary ────────────────────────────────────────────────
function renderDrawerSummary(sub) {
  const a = sub.answers || {};
  const addr = a.delivery_address;

  const cells = [
    ['Name', sub.userName],
    ['Contact', `${sub.userContactType === 'phone' ? '📱' : '✉️'} ${sub.userContact}`],
    ['Occasion', occasionLabel(a.occasion)],
    ['Recipient', a.recipient_name || '—'],
    ['Recipient Age', a.recipient_age || '—'],
    ['Budget', a.budget?.label || '—'],
    ['Deadline', a.deadline ? new Date(a.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'],
    ['Submitted', new Date(sub.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })],
  ];

  let html = `<div class="summary-grid">
    ${cells.map(([l, v]) => `<div class="summary-cell">
      <div class="summary-cell-label">${l}</div>
      <div class="summary-cell-value">${esc(String(v || '—'))}</div>
    </div>`).join('')}
  </div>`;

  if (addr) {
    html += `<div class="info-section">
      <label class="info-label">Delivery Address</label>
      <div class="summary-cell">
        <div class="summary-cell-value">
          ${esc(addr.street1)}${addr.street2 ? ', ' + esc(addr.street2) : ''}<br />
          ${esc(addr.city)}, ${esc(addr.state)} ${esc(addr.zip)}, US
        </div>
      </div>
    </div>`;
  }

  if (sub.charge) {
    const c = sub.charge;
    const cls = { pending: 'cs-pending', accepted: 'cs-accepted', declined: 'cs-declined' }[c.status] || 'cs-pending';
    html += `<div class="info-section">
      <label class="info-label">Payment Request</label>
      <div class="a-charge-card" style="margin-top:0">
        <div class="a-charge-lbl">💳 Payment Request</div>
        <div class="a-charge-amt">$${parseFloat(c.amount).toFixed(2)}</div>
        <div class="a-charge-desc">${esc(c.description || '')}</div>
        <span class="a-charge-status ${cls}" id="drawer-charge-status">${c.status.charAt(0).toUpperCase() + c.status.slice(1)}</span>
      </div>
    </div>`;
  }

  document.getElementById('drawer-summary-content').innerHTML = html;
}

function renderStatusButtons(sub) {
  const statuses = ['new', 'in_progress', 'confirmed', 'completed', 'cancelled'];
  document.getElementById('status-buttons').innerHTML = statuses.map(s =>
    `<button class="status-action-btn ${sub.status === s ? 'current' : ''}"
      onclick="updateStatus('${sub.id}','${s}')">${statusLabel(s)}</button>`
  ).join('');
}

async function updateStatus(submissionId, status) {
  try {
    const res = await fetch(`/api/admin/submissions/${submissionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
      body: JSON.stringify({ status })
    });
    const updated = await res.json();
    const idx = allSubmissions.findIndex(s => s.id === submissionId);
    if (idx > -1) allSubmissions[idx] = updated;
    renderStatusButtons(updated);
    renderSubmissionsList();
    renderDrawerSummary(updated);
    loadStats();
  } catch {}
}

async function saveNotes() {
  const notes = document.getElementById('admin-notes').value;
  try {
    await fetch(`/api/admin/submissions/${activeSubmissionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
      body: JSON.stringify({ adminNotes: notes })
    });
    showAdminToast('Notes saved', '');
  } catch {}
}

function refreshChargeDisplay() {
  const sub = allSubmissions.find(s => s.id === activeSubmissionId);
  if (!sub) return;
  const el = document.getElementById('drawer-charge-status');
  if (el && sub.charge) {
    const cls = { pending: 'cs-pending', accepted: 'cs-accepted', declined: 'cs-declined' }[sub.charge.status] || 'cs-pending';
    el.className = `a-charge-status ${cls}`;
    el.textContent = sub.charge.status.charAt(0).toUpperCase() + sub.charge.status.slice(1);
  }
}

// ── Answers ────────────────────────────────────────────────
function renderDrawerAnswers(sub) {
  const a = sub.answers || {};

  const sections = [
    {
      title: '🎉 The Occasion',
      items: [
        ['Occasion', occasionLabel(a.occasion)],
        ['Birthday Milestone', a.birthday_milestone],
        ['Anniversary Years', a.anniversary_years],
        ['Graduation Type', a.grad_type],
        ['Baby Gift For', a.baby_gift_for],
        ['Wedding For', a.wedding_for],
      ]
    },
    {
      title: '👤 About the Recipient',
      items: [
        ['Name', a.recipient_name],
        ['Relationship', a.recipient_relation],
        ['Gender', a.recipient_gender],
        ['Age Range', a.recipient_age],
        ['How Well Known', a.how_well_known],
      ]
    },
    {
      title: '🌟 Personality & Lifestyle',
      items: [
        ['Personality Traits', formatArray(a.personality)],
        ['Hobbies / Interests', formatArray(a.hobbies)],
        ['Free Time', a.free_time],
        ['Aesthetic / Style', formatArray(a.aesthetic)],
      ]
    },
    {
      title: '🎁 Gift Preferences',
      items: [
        ['Sentimental vs Practical', a.sentimental_vs_practical],
        ['Experience vs Physical', a.experience_vs_physical],
        ['Price Sensitivity', a.price_sensitivity],
        ['Past Gifts / Hits & Misses', a.past_gifts],
        ['Wish List / Mentioned Wants', a.wish_list],
        ['Restrictions', formatArray(a.restrictions)],
        ['Restriction Details', a.restrictions_details],
      ]
    },
    {
      title: '💰 Budget & Logistics',
      items: [
        ['Budget', a.budget?.label ? `<span class="budget-tag">💰 ${a.budget.label}</span>` : null],
        ['Deadline', a.deadline ? new Date(a.deadline).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : null],
        ['Gift Wrapping', a.gift_wrapping],
        ['Delivery Address', a.delivery_address ?
          `${a.delivery_address.street1}${a.delivery_address.street2 ? ', ' + a.delivery_address.street2 : ''}, ${a.delivery_address.city}, ${a.delivery_address.state} ${a.delivery_address.zip}` : null],
      ]
    },
    {
      title: '✨ Final Touches',
      items: [
        ['One Word', a.one_word_description],
        ['Dream Gift', a.dream_gift],
        ['Love Language', a.love_language],
        ['Additional Notes', a.additional_notes],
      ]
    },
  ];

  const html = sections.map(sec => {
    const items = sec.items.filter(([, v]) => v);
    if (!items.length) return '';
    return `<div class="answer-section">
      <div class="answer-section-title">${sec.title}</div>
      ${items.map(([q, v]) => `<div class="answer-item">
        <div class="answer-question">${q}</div>
        <div class="answer-value">${v}</div>
      </div>`).join('')}
    </div>`;
  }).join('');

  document.getElementById('drawer-answers-content').innerHTML = html || '<div class="empty-state">No answers recorded.</div>';
}

// ── Admin Chat ─────────────────────────────────────────────
async function loadAdminChat(submissionId) {
  const msgs = document.getElementById('admin-messages');
  msgs.innerHTML = '<div style="padding:20px;text-align:center;color:#A08070">Loading…</div>';

  try {
    const res = await fetch(`/api/messages/${submissionId}`);
    const messages = await res.json();
    msgs.innerHTML = '';
    messages.forEach(m => appendAdminMessage(m));
    scrollAdminChat();
  } catch {
    msgs.innerHTML = '<div style="padding:20px;text-align:center;color:#A08070">Could not load messages.</div>';
  }
}

function appendAdminMessage(msg) {
  const list = document.getElementById('admin-messages');
  if (!list) return;

  const isAdmin = msg.sender === 'admin';
  const side = isAdmin ? 'from-admin' : 'from-user';
  const time = new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  let content = '';
  if (msg.type === 'text') {
    content = `<div class="amsg-bubble">${esc(msg.content)}</div>`;
  } else if (msg.type === 'file') {
    const isImage = /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(msg.fileName || '');
    if (isImage) {
      content = `<img class="amsg-img" src="${msg.fileUrl}" alt="image"
        onclick="window.open('${msg.fileUrl}','_blank')" loading="lazy" />`;
    } else {
      content = `<a class="amsg-file" href="${msg.fileUrl}" target="_blank">
        <span>📎</span><span>${esc(msg.fileName || 'File')}</span>
      </a>`;
    }
  } else if (msg.type === 'charge_prompt') {
    const cls = { pending: 'cs-pending', accepted: 'cs-accepted', declined: 'cs-declined' }[msg.status] || 'cs-pending';
    content = `<div class="a-charge-card">
      <div class="a-charge-lbl">💳 Payment Request</div>
      <div class="a-charge-amt">$${parseFloat(msg.amount).toFixed(2)}</div>
      <div class="a-charge-desc">${esc(msg.description || '')}</div>
      <span class="a-charge-status ${cls}" id="acm-${msg.chargeId}">${msg.status.charAt(0).toUpperCase() + msg.status.slice(1)}</span>
    </div>`;
  }

  const wrap = document.createElement('div');
  wrap.className = `amsg-wrap ${side}`;
  wrap.innerHTML = `<div class="amsg-avatar ${isAdmin ? 'admin-av' : 'user-av'}">${isAdmin ? '✦' : (msg.senderName?.charAt(0) || '?')}</div>
    <div>${content}<span class="amsg-time">${time}</span></div>`;

  list.appendChild(wrap);
}

function scrollAdminChat() {
  const el = document.getElementById('admin-messages');
  if (el) el.scrollTop = el.scrollHeight;
}

function adminSendMessage() {
  const input = document.getElementById('admin-chat-input');
  const text = input?.value.trim();
  if (!text || !socket || !activeSubmissionId) return;

  socket.emit('send_message', {
    submissionId: activeSubmissionId,
    content: text,
    isAdmin: true
  });

  appendAdminMessage({
    id: 'tmp_' + Date.now(),
    type: 'text',
    sender: 'admin',
    senderName: 'Michele',
    content: text,
    timestamp: new Date().toISOString()
  });
  scrollAdminChat();
  input.value = '';
  input.style.height = 'auto';
}

function adminTyping() {
  if (!socket || !activeSubmissionId) return;
  socket.emit('typing', { submissionId: activeSubmissionId, name: 'Michele', isAdmin: true });
}

async function adminUploadFile(e) {
  const file = e.target.files?.[0];
  if (!file || !activeSubmissionId) return;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'x-admin-token': adminToken },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    socket.emit('send_file_message', {
      submissionId: activeSubmissionId,
      fileUrl: data.url,
      fileName: data.originalName,
      fileType: data.mimetype,
      isAdmin: true
    });

    appendAdminMessage({
      id: 'tmp_' + Date.now(),
      type: 'file',
      sender: 'admin',
      senderName: 'Michele',
      fileUrl: data.url,
      fileName: data.originalName,
      fileType: data.mimetype,
      timestamp: new Date().toISOString()
    });
    scrollAdminChat();
  } catch (err) {
    showAdminToast('Upload failed', err.message || 'Please try again.');
  }
  e.target.value = '';
}

// ── Charge Prompt ──────────────────────────────────────────
function toggleChargePanelUI() {
  const p = document.getElementById('charge-panel');
  p.style.display = p.style.display === 'none' ? 'block' : 'none';
}

async function sendChargePrompt() {
  const amount = document.getElementById('charge-amount').value;
  const description = document.getElementById('charge-description').value.trim();

  if (!amount || parseFloat(amount) <= 0) { alert('Please enter a valid amount.'); return; }
  if (!description) { alert('Please enter a description.'); return; }

  try {
    const res = await fetch('/api/admin/charge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
      body: JSON.stringify({ submissionId: activeSubmissionId, amount, description })
    });
    if (!res.ok) throw new Error('Failed');

    document.getElementById('charge-amount').value = '';
    document.getElementById('charge-description').value = '';
    document.getElementById('charge-panel').style.display = 'none';

    // Refresh drawer summary
    const sub = allSubmissions.find(s => s.id === activeSubmissionId);
    if (sub) {
      sub.charge = { amount, description, status: 'pending' };
      renderDrawerSummary(sub);
    }

    showAdminToast('Payment request sent', `$${parseFloat(amount).toFixed(2)} — ${description}`);
  } catch {
    alert('Could not send charge prompt. Please try again.');
  }
}

// ── Panels ─────────────────────────────────────────────────
function showPanel(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`panel-${name}`).classList.add('active');
  document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`nav-${name}`)?.classList.add('active');
  if (name === 'submissions') renderSubmissionsList();
  if (name === 'dashboard') loadDashboard();
  closeSidebarMobile();
}

// ── Mobile Sidebar ──────────────────────────────────────────
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  const isOpen = sidebar.classList.toggle('open');
  backdrop.classList.toggle('visible', isOpen);
}
function closeSidebarMobile() {
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-backdrop')?.classList.remove('visible');
  }
}

// ── Print Summary ───────────────────────────────────────────
function printSummary() {
  const sub = allSubmissions.find(s => s.id === activeSubmissionId);
  if (!sub) return;
  const a = sub.answers || {};

  function row(label, value) {
    if (!value) return '';
    return `<div class="row"><div class="lbl">${label}</div><div class="val">${esc(String(value))}</div></div>`;
  }
  function section(title, rows) {
    const content = rows.join('');
    if (!content) return '';
    return `<h2>${title}</h2>${content}`;
  }
  const fmt = arr => arr && arr.length ? arr.map(v => v.replace(/_/g,' ')).map(v => v.charAt(0).toUpperCase() + v.slice(1)).join(', ') : null;
  const deadline = a.deadline ? new Date(a.deadline).toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' }) : null;
  const addr = a.delivery_address ? `${a.delivery_address.street1}${a.delivery_address.street2 ? ', '+a.delivery_address.street2 : ''}, ${a.delivery_address.city}, ${a.delivery_address.state} ${a.delivery_address.zip}` : null;

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<title>Gift Summary — ${esc(sub.userName)}</title>
<style>
  body{font-family:Georgia,serif;padding:48px;color:#2D1B14;max-width:640px;margin:0 auto}
  h1{font-size:1.9rem;color:#8B4F3C;margin-bottom:4px}
  .meta{font-size:.85rem;color:#A08070;margin-bottom:36px;border-bottom:2px solid #E8D5B0;padding-bottom:16px}
  h2{font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#B87461;border-bottom:2px solid #E8D5B0;padding-bottom:6px;margin:28px 0 14px}
  .row{display:flex;gap:16px;margin-bottom:10px}
  .lbl{width:180px;font-size:.76rem;font-weight:700;color:#A08070;text-transform:uppercase;letter-spacing:.04em;flex-shrink:0;padding-top:2px}
  .val{font-size:.9rem;line-height:1.5}
  .footer{margin-top:48px;font-size:.75rem;color:#A08070;text-align:center;border-top:1px solid #EFE3D5;padding-top:16px}
  @media print{body{padding:24px}}
</style></head><body>
<h1>Gift for ${esc(a.recipient_name || 'Someone Special')}</h1>
<div class="meta">
  Client: <strong>${esc(sub.userName)}</strong> &nbsp;·&nbsp; ${esc(sub.userContact)}<br/>
  Submitted: ${new Date(sub.createdAt).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}
  &nbsp;·&nbsp; Status: <strong>${statusLabel(sub.status)}</strong>
</div>
${section('The Occasion',[row('Occasion',occasionLabel(a.occasion)),row('Birthday Milestone',a.birthday_milestone),row('Anniversary Years',a.anniversary_years),row('Graduation Type',a.grad_type),row('Baby Gift For',a.baby_gift_for),row('Wedding For',a.wedding_for)])}
${section('About the Recipient',[row('Name',a.recipient_name),row('Relationship',a.recipient_relation),row('Gender',a.recipient_gender),row('Age Range',a.recipient_age),row('How Well Known',a.how_well_known)])}
${section('Personality & Lifestyle',[row('Personality Traits',fmt(a.personality)),row('Hobbies / Interests',fmt(a.hobbies)),row('Free Time',a.free_time),row('Aesthetic / Style',fmt(a.aesthetic))])}
${section('Gift Preferences',[row('Sentimental vs Practical',a.sentimental_vs_practical),row('Experience vs Physical',a.experience_vs_physical),row('Price Sensitivity',a.price_sensitivity),row('Past Gifts',a.past_gifts),row('Wish List',a.wish_list),row('Restrictions',fmt(a.restrictions)),row('Restriction Details',a.restrictions_details)])}
${section('Budget & Logistics',[row('Budget',a.budget?.label),row('Deadline',deadline),row('Gift Wrapping',a.gift_wrapping),row('Delivery Address',addr)])}
${section('Final Touches',[row('One Word',a.one_word_description),row('Dream Gift',a.dream_gift),row('Love Language',a.love_language),row('Additional Notes',a.additional_notes)])}
${sub.adminNotes ? `<h2>Admin Notes</h2><p style="font-size:.9rem;line-height:1.6">${esc(sub.adminNotes)}</p>` : ''}
<div class="footer">May I Present: Bespoke Gifts &middot; micheleplaceholder@gmail.com &middot; Printed ${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</div>
<script>setTimeout(function(){window.print();},400);<\/script>
</body></html>`;

  const win = window.open('', '_blank', 'width=720,height=900');
  if (win) { win.document.write(html); win.document.close(); }
}

function bumpNewBadge() {
  loadStats();
}

// ── Helpers ────────────────────────────────────────────────
const OCCASION_MAP = {
  birthday: 'Birthday', wedding: 'Wedding / Engagement', sweet16: 'Sweet 16',
  anniversary: 'Anniversary', baby_shower: 'Baby Shower / New Baby', graduation: 'Graduation',
  holiday: 'Holiday / Christmas', valentines: "Valentine's Day",
  mothers_fathers: "Mother's / Father's Day", housewarming: 'Housewarming',
  retirement: 'Retirement', just_because: 'Just Because', other: 'Other'
};

function occasionLabel(v) { return OCCASION_MAP[v] || v || '—'; }

function statusLabel(s) {
  return { new: 'New', in_progress: 'In Progress', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' }[s] || s;
}

function formatArray(arr) {
  if (!arr || !arr.length) return null;
  return arr.map(v => v.replace(/_/g, ' ')).map(v => v.charAt(0).toUpperCase() + v.slice(1)).join(', ');
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function esc(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Admin toast
function showAdminToast(title, body) {
  let container = document.getElementById('admin-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'admin-toast-container';
    container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.style.cssText = `background:white;border-radius:12px;padding:14px 18px;
    box-shadow:0 8px 32px rgba(100,50,30,.18);display:flex;align-items:center;gap:12px;
    pointer-events:all;cursor:pointer;animation:fadeUp .4s ease both;max-width:300px;
    border-left:4px solid #B87461;`;
  toast.innerHTML = `<div>
    <strong style="display:block;font-size:.88rem;margin-bottom:2px">${title}</strong>
    <span style="font-size:.8rem;color:#A08070">${body}</span>
  </div>`;
  toast.onclick = () => toast.remove();
  container.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 5000);
}

// Auto-resize admin textarea
document.addEventListener('input', (e) => {
  if (e.target.id === 'admin-chat-input') {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px';
  }
});
