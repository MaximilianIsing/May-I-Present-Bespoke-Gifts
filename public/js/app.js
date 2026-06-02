/* ============================================================
   May I Present: Bespoke Gifts — Main App
   ============================================================ */

// ── State ──────────────────────────────────────────────────
const State = {
  user: null,
  submissions: [],
  currentSubmissionId: null,
  socket: null,
  unread: {},           // { submissionId: count }
  answerHistory: [],    // stack of { questionId, answers }
  answers: {},
  currentQuestionId: null,
  totalQuestions: 0,
  answeredCount: 0,
};

// ── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  registerSW();

  const savedUser = localStorage.getItem('mip_user');
  if (savedUser) {
    try {
      State.user = JSON.parse(savedUser);
      await refreshUser();
      showView('home');
      loadHomeSubmissions();
    } catch {
      showView('landing');
    }
  } else {
    showView('landing');
  }

  hideLoader();
  bindEvents();
});

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

function hideLoader() {
  const l = document.getElementById('loading-overlay');
  if (l) { l.classList.add('hidden'); setTimeout(() => l.remove(), 600); }
}

// ── View Manager ───────────────────────────────────────────
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById(`view-${name}`);
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);
  if (name === 'home') {
    renderHomeHeader();
    renderGiftList();
  }
}

// ── Event Bindings ─────────────────────────────────────────
function bindEvents() {
  // Landing
  document.getElementById('hero-cta')?.addEventListener('click', () => showView('signup'));
  document.getElementById('footer-cta')?.addEventListener('click', () => showView('signup'));
  document.querySelectorAll('[data-goto-signup]').forEach(el =>
    el.addEventListener('click', () => showView('signup'))
  );

  // Signup
  document.getElementById('signup-form')?.addEventListener('submit', handleSignup);
  document.querySelectorAll('.contact-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.contact-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const input = document.getElementById('contact-input');
      if (tab.dataset.type === 'phone') {
        input.placeholder = '+1 (555) 000-0000';
        input.type = 'tel';
      } else {
        input.placeholder = 'your@email.com';
        input.type = 'email';
      }
    });
  });
  document.getElementById('signup-back')?.addEventListener('click', () => showView('landing'));

  // Home
  document.getElementById('new-gift-btn')?.addEventListener('click', startQuestionnaire);

  // Questionnaire
  document.getElementById('quiz-back-btn')?.addEventListener('click', quizBack);
  document.getElementById('quiz-exit-btn')?.addEventListener('click', () => {
    saveQuizDraft();
    showView('home');
  });

  // Resume modal
  document.getElementById('resume-yes-btn')?.addEventListener('click', () => {
    document.getElementById('resume-modal').style.display = 'none';
    if (window._pendingDraft) { resumeFromDraft(window._pendingDraft); window._pendingDraft = null; }
  });
  document.getElementById('resume-no-btn')?.addEventListener('click', () => {
    document.getElementById('resume-modal').style.display = 'none';
    window._pendingDraft = null;
    beginFreshQuestionnaire();
  });

  // Search
  document.getElementById('gifts-search')?.addEventListener('input', renderGiftList);
  document.getElementById('quiz-next-btn')?.addEventListener('click', quizNext);

  // Chat
  document.getElementById('chat-back-btn')?.addEventListener('click', () => showView('home'));
  document.getElementById('chat-send-btn')?.addEventListener('click', sendChatMessage);
  document.getElementById('chat-text-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
  });
  document.getElementById('chat-text-input')?.addEventListener('input', onChatTyping);
  document.getElementById('chat-file-btn')?.addEventListener('click', () => {
    document.getElementById('chat-file-input').click();
  });
  document.getElementById('chat-file-input')?.addEventListener('change', handleFileUpload);

  // Nav links
  document.querySelectorAll('[data-view]').forEach(el => {
    el.addEventListener('click', () => showView(el.dataset.view));
  });
}

// ── Auth ───────────────────────────────────────────────────
async function handleSignup(e) {
  e.preventDefault();
  const name    = document.getElementById('name-input').value.trim();
  const contact = document.getElementById('contact-input').value.trim();
  const activeTab = document.querySelector('.contact-tab.active');
  const contactType = activeTab?.dataset.type || 'phone';

  clearErrors();
  let valid = true;

  if (!name) { showError('name-error', 'Please enter your name.'); valid = false; }
  if (!contact) { showError('contact-error', 'Please enter your phone or email.'); valid = false; }
  if (contactType === 'phone' && contact && !/^[\d\s\+\-\(\)]{7,}$/.test(contact)) {
    showError('contact-error', 'Please enter a valid US phone number.'); valid = false;
  }
  if (contactType === 'email' && contact && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
    showError('contact-error', 'Please enter a valid email address.'); valid = false;
  }
  if (!valid) return;

  const btn = document.getElementById('signup-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Getting started…';

  try {
    const res = await fetch('/api/users/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, contact, contactType })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    State.user = data.user;
    localStorage.setItem('mip_user', JSON.stringify(data.user));
    await loadHomeSubmissions();
    showView('home');
    renderHomeHeader();
  } catch (err) {
    showError('contact-error', err.message || 'Something went wrong. Please try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Let\'s Get Started →';
  }
}

async function refreshUser() {
  const res = await fetch(`/api/users/${State.user.id}`);
  if (res.ok) {
    State.user = await res.json();
    localStorage.setItem('mip_user', JSON.stringify(State.user));
  }
}

function clearErrors() {
  document.querySelectorAll('.form-error').forEach(e => e.classList.remove('visible'));
  document.querySelectorAll('.form-input').forEach(e => e.classList.remove('error'));
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.classList.add('visible'); }
}

// ── Home ───────────────────────────────────────────────────
function renderHomeHeader() {
  const el = document.getElementById('welcome-name');
  if (el && State.user) el.textContent = `Hi, ${State.user.name}!`;
  const av = document.getElementById('user-avatar-btn');
  if (av && State.user) av.textContent = State.user.name.charAt(0).toUpperCase();
}

async function loadHomeSubmissions() {
  renderHomeHeader();
  if (!State.user) return;
  try {
    const res = await fetch(`/api/users/${State.user.id}/submissions`);
    State.submissions = await res.json();
    loadUnreadFromStorage();
    renderGiftList();
    updateGlobalUnreadBadge();
    connectSocket();
  } catch {}
}

// ── Unread Persistence ─────────────────────────────────────
function saveUnreadToStorage() {
  if (!State.user) return;
  try { localStorage.setItem(`mip_unread_${State.user.id}`, JSON.stringify(State.unread)); } catch {}
}
function loadUnreadFromStorage() {
  if (!State.user) return;
  try {
    const s = localStorage.getItem(`mip_unread_${State.user.id}`);
    if (s) State.unread = { ...JSON.parse(s), ...State.unread };
  } catch {}
}
function updateGlobalUnreadBadge() {
  const total = Object.values(State.unread).reduce((a, b) => a + b, 0);
  const nb = document.getElementById('notif-badge');
  if (nb) { nb.textContent = total; nb.classList.toggle('visible', total > 0); }
}

const OCCASION_LABELS = {
  birthday: '🎂 Birthday', wedding: '💍 Wedding', sweet16: '🎉 Sweet 16',
  anniversary: '💑 Anniversary', baby_shower: '👶 Baby Shower', graduation: '🎓 Graduation',
  holiday: '🎄 Holiday', valentines: '💝 Valentine\'s Day', mothers_fathers: '💐 Mother\'s / Father\'s Day',
  housewarming: '🏠 Housewarming', retirement: '🌴 Retirement', just_because: '✨ Just Because', other: '🎊 Other'
};

const OCCASION_SVG_ID = {
  birthday:       'icon-cake',
  wedding:        'icon-rings',
  sweet16:        'icon-star',
  anniversary:    'icon-heart',
  baby_shower:    'icon-baby',
  graduation:     'icon-grad',
  holiday:        'icon-snowflake',
  valentines:     'icon-envelope',
  mothers_fathers:'icon-flower',
  housewarming:   'icon-house',
  retirement:     'icon-sunrise',
  just_because:   'icon-sparkle',
  other:          'icon-gift',
};

function occasionSVG(occ) {
  const id = OCCASION_SVG_ID[occ] || 'icon-gift';
  return `<svg class="occasion-icon" aria-hidden="true"><use href="#${id}"/></svg>`;
}

function renderGiftList() {
  const list = document.getElementById('gifts-list');
  if (!list) return;

  if (!State.submissions.length) {
    list.innerHTML = `<div class="gifts-empty">
      <svg class="empty-gift-icon" aria-hidden="true"><use href="#icon-gift"/></svg>
      <p>No gift requests yet.<br>Start one and Michele will help you find something truly special.</p>
    </div>`;
    return;
  }

  const searchEl = document.getElementById('gifts-search');
  const search = (searchEl?.value || '').toLowerCase().trim();

  let subs = State.submissions;
  if (search) {
    subs = subs.filter(s => {
      const occLabel = (OCCASION_LABELS[s.answers?.occasion] || '').replace(/[^\w\s]/g, '');
      const rec = s.answers?.recipient_name || '';
      const stat = statusLabel(s.status || '');
      return [occLabel, rec, stat].join(' ').toLowerCase().includes(search);
    });
  }

  if (!subs.length) {
    list.innerHTML = `<div class="gifts-empty-filter"><p>No requests match "<strong>${escapeHtml(search)}</strong>".</p></div>`;
    return;
  }

  list.innerHTML = subs.map(sub => {
    const occ = sub.answers?.occasion || 'other';
    const label = OCCASION_LABELS[occ] || 'Gift Request';
    const recipientName = sub.answers?.recipient_name || 'Someone special';
    const status = sub.status || 'new';
    const unread = State.unread[sub.id] || 0;
    const date = new Date(sub.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return `<div class="gift-card anim-fade-up ${unread > 0 ? 'has-unread' : ''}" onclick="openChat('${sub.id}')" data-sub-id="${sub.id}">
      <div class="gift-card-icon">${occasionSVG(occ)}</div>
      <div class="gift-card-info">
        <div class="gift-card-for">Gift for ${recipientName}</div>
        <div class="gift-card-occasion">${label} · ${date}</div>
      </div>
      <div class="gift-card-meta">
        <span class="status-badge status-${status}">${statusLabel(status)}</span>
        <span class="gift-card-unread ${unread > 0 ? 'visible' : ''}" id="unread-${sub.id}">${unread}</span>
      </div>
    </div>`;
  }).join('');
}

function statusLabel(s) {
  return { new: 'New', in_progress: 'In Progress', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' }[s] || s;
}

// ── Socket ─────────────────────────────────────────────────
function connectSocket() {
  if (State.socket?.connected) return;
  State.socket = io();

  State.socket.on('new_message', (msg) => {
    if (msg.type === 'system') {
      const sid = getCurrentChatId();
      if (sid) { appendMessage(msg); scrollChatBottom(); }
      return;
    }
    if (msg.sender === 'admin') {
      const sid = getCurrentChatId();
      if (sid) {
        appendMessage(msg);
        scrollChatBottom();
      } else {
        incrementUnread(msg);
        showToast('Michele sent a message', msg.content?.slice(0, 60) + (msg.content?.length > 60 ? '…' : ''));
      }
    }
  });

  State.socket.on('charge_updated', ({ chargeId, status }) => {
    const el = document.getElementById(`charge-${chargeId}`);
    if (!el) return;
    el.innerHTML = status === 'accepted'
      ? `<div class="charge-status-accepted">✅ Payment request accepted!</div>`
      : `<div class="charge-status-declined">✕ Payment request declined.</div>`;
  });

  State.socket.on('typing', ({ name, isAdmin }) => {
    if (isAdmin) {
      const ind = document.getElementById('typing-indicator');
      if (ind) {
        ind.classList.add('visible');
        clearTimeout(window._typingTimer);
        window._typingTimer = setTimeout(() => ind.classList.remove('visible'), 2000);
      }
    }
  });

  State.socket.on('status_updated', ({ status }) => {
    if (State.currentSubmissionId) {
      const sub = State.submissions.find(s => s.id === State.currentSubmissionId);
      if (sub) {
        sub.status = status;
        const el = document.getElementById('chat-status-badge');
        if (el) { el.className = `chat-status-indicator status-badge status-${status}`; el.textContent = statusLabel(status); }
        renderGiftList();
      }
    }
  });
}

function getCurrentChatId() {
  const view = document.getElementById('view-chat');
  return view?.classList.contains('active') ? State.currentSubmissionId : null;
}

function incrementUnread(msg) {
  const sid = msg.submissionId || State.currentSubmissionId;
  if (!sid) return;
  State.unread[sid] = (State.unread[sid] || 0) + 1;
  const badge = document.getElementById(`unread-${sid}`);
  if (badge) { badge.textContent = State.unread[sid]; badge.classList.add('visible'); }
  // Update the gift card visual
  const card = document.querySelector(`.gift-card[data-sub-id="${sid}"]`);
  if (card) card.classList.add('has-unread');
  saveUnreadToStorage();
  updateGlobalUnreadBadge();
}

// ── Quiz Draft (save & resume) ─────────────────────────────
function quizDraftKey() { return `mip_quiz_draft_${State.user?.id}`; }
function saveQuizDraft() {
  if (!State.user || !State.currentQuestionId) return;
  try {
    localStorage.setItem(quizDraftKey(), JSON.stringify({
      answers: State.answers,
      answerHistory: State.answerHistory,
      currentQuestionId: State.currentQuestionId
    }));
  } catch {}
}
function clearQuizDraft() {
  if (State.user) try { localStorage.removeItem(quizDraftKey()); } catch {}
}
function loadQuizDraft() {
  try { const d = localStorage.getItem(quizDraftKey()); return d ? JSON.parse(d) : null; } catch { return null; }
}

// ── Questionnaire ──────────────────────────────────────────
function startQuestionnaire() {
  const draft = loadQuizDraft();
  if (draft && draft.answerHistory?.length > 0) {
    window._pendingDraft = draft;
    document.getElementById('resume-modal').style.display = 'flex';
    return;
  }
  beginFreshQuestionnaire();
}
function beginFreshQuestionnaire() {
  clearQuizDraft();
  State.answers = {};
  State.answerHistory = [];
  State.answeredCount = 0;
  loadQuestion('q_occasion');
  showView('questionnaire');
}
function resumeFromDraft(draft) {
  State.answers = draft.answers;
  State.answerHistory = draft.answerHistory;
  State.answeredCount = draft.answerHistory.length;
  loadQuestion(draft.currentQuestionId);
  showView('questionnaire');
}

function loadQuestion(qId, direction = 'forward') {
  const q = window.QUESTIONS.find(q => q.id === qId);
  if (!q) return;

  State.currentQuestionId = qId;
  updateQuizProgress(q);

  const body = document.getElementById('quiz-body');
  const title = typeof q.question === 'function' ? q.question(State.answers) : q.question;

  let inputHTML = '';

  if (q.type === 'single_choice') {
    const cols = q.options.length > 6 ? '' : q.options.length <= 4 ? ' single-col' : '';
    inputHTML = `<div class="choice-grid${cols}">
      ${q.options.map(opt => `
        <button class="choice-option ${State.answers[q.field] === opt.value ? 'selected' : ''}"
                onclick="selectSingleChoice('${q.field}', '${opt.value}', this)"
                data-value="${opt.value}">
          <span class="choice-check">✓</span>
          <span>${opt.label}</span>
        </button>`).join('')}
    </div>`;
  }

  else if (q.type === 'multi_choice') {
    const saved = State.answers[q.field] || [];
    inputHTML = `<div class="choice-grid">
      ${q.options.map(opt => `
        <button class="choice-option ${saved.includes(opt.value) ? 'selected' : ''}"
                onclick="toggleMultiChoice('${q.field}', '${opt.value}', this)"
                data-value="${opt.value}">
          <span class="choice-check choice-sq">${saved.includes(opt.value) ? '✓' : ''}</span>
          <span>${opt.label}</span>
        </button>`).join('')}
    </div>`;
  }

  else if (q.type === 'text_input') {
    inputHTML = `<input class="quiz-text-input" id="quiz-text-input" type="text"
      placeholder="${q.placeholder || ''}"
      value="${State.answers[q.field] || ''}"
      onkeydown="if(event.key==='Enter') quizNext()"
      autofocus />`;
  }

  else if (q.type === 'text_area') {
    const isOpt = q.optional ? `<span class="optional-label">Optional — skip if you'd prefer</span>` : '';
    inputHTML = `${isOpt}<textarea class="quiz-textarea" id="quiz-textarea"
      placeholder="${q.placeholder || ''}">${State.answers[q.field] || ''}</textarea>`;
  }

  else if (q.type === 'budget_slider') {
    const saved = State.answers[q.field] || { min: 50, max: 200 };
    inputHTML = buildBudgetSlider(saved.min, saved.max);
  }

  else if (q.type === 'date_picker') {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 3);
    const minStr = minDate.toISOString().split('T')[0];
    inputHTML = `<input class="quiz-date-input" id="quiz-date-input" type="date"
      min="${minStr}" value="${State.answers[q.field] || ''}" />`;
  }

  else if (q.type === 'address_form') {
    const saved = State.answers[q.field] || {};
    inputHTML = buildAddressForm(saved);
  }

  const isOptional = q.optional;
  const hasValue = !!State.answers[q.field];
  const nextBtnText = q.type === 'single_choice' ? 'Continue →' : 'Next →';

  body.innerHTML = `<div class="question-wrap anim-${direction === 'forward' ? 'slide-left' : 'slide-right'}">
    <h2 class="question-title">${title}</h2>
    <p class="question-subtitle">${q.subtitle || ''}</p>
    ${inputHTML}
  </div>`;

  // Render next button into the sticky footer (not inside the scrollable body)
  const footer = document.getElementById('quiz-footer');
  if (footer) {
    if (q.type === 'single_choice') {
      footer.style.display = 'none';
      footer.innerHTML = '';
    } else {
      const skipMode = isOptional && !hasValue;
      footer.style.display = 'block';
      footer.innerHTML = `<button class="quiz-next-btn ${skipMode ? 'skip' : ''}" id="quiz-next-btn" onclick="quizNext()">
        ${skipMode ? 'Skip for now' : nextBtnText}
      </button>`;
    }
  }

  if (q.type === 'budget_slider') {
    const bSaved = State.answers[q.field] || { min: 50, max: 200 };
    initBudgetSlider(bSaved.min, bSaved.max);
  }
  if (q.type === 'text_input') setTimeout(() => document.getElementById('quiz-text-input')?.focus(), 100);

  // Update back button
  const backBtn = document.getElementById('quiz-back-btn');
  if (backBtn) backBtn.disabled = State.answerHistory.length === 0;

  // Auto-save progress
  saveQuizDraft();
}

// Occasions that add one extra branch question (their own detail question)
const BRANCHING_OCCASIONS = ['birthday', 'anniversary', 'wedding', 'baby_shower', 'graduation'];

function computeTotalRange(answers) {
  // Short path (non-branching occasion, e.g. just_because): 25 questions
  // Long path (branching occasion, e.g. birthday → milestone): 26 questions
  if (!answers.occasion) return { min: 25, max: 26 };
  const total = BRANCHING_OCCASIONS.includes(answers.occasion) ? 26 : 25;
  return { min: total, max: total };
}

function updateQuizProgress(q) {
  const fill = document.getElementById('quiz-progress-fill');
  const counter = document.getElementById('quiz-counter');
  const section = document.getElementById('quiz-section-label');

  const current = State.answerHistory.length + 1;
  const { min, max } = computeTotalRange(State.answers);
  const totalStr = min === max ? String(min) : `${min}–${max}`;

  if (fill) fill.style.width = `${Math.min((current / max) * 100, 100)}%`;
  if (counter) counter.textContent = `${current} of ${totalStr}`;
  if (section) section.textContent = q.section || '';
}

function selectSingleChoice(field, value, btn) {
  State.answers[field] = value;
  document.querySelectorAll('.choice-option').forEach(b => {
    b.classList.remove('selected');
    b.querySelector('.choice-check').textContent = '✓';
    b.querySelector('.choice-check').style.opacity = '0';
  });
  btn.classList.add('selected');
  btn.querySelector('.choice-check').style.opacity = '1';

  // Auto-advance after brief delay
  setTimeout(() => quizNext(), 300);
}

function toggleMultiChoice(field, value, btn) {
  if (!State.answers[field]) State.answers[field] = [];
  const arr = State.answers[field];
  const idx = arr.indexOf(value);
  if (idx > -1) {
    arr.splice(idx, 1);
    btn.classList.remove('selected');
    btn.querySelector('.choice-check').textContent = '';
  } else {
    arr.push(value);
    btn.classList.add('selected');
    btn.querySelector('.choice-check').textContent = '✓';
  }

  const nextBtn = document.getElementById('quiz-next-btn');
  if (nextBtn) {
    nextBtn.textContent = arr.length ? 'Continue →' : 'Skip for now';
    nextBtn.className = `quiz-next-btn ${arr.length ? '' : 'skip'}`;
  }
}

function quizNext() {
  const q = window.QUESTIONS.find(q => q.id === State.currentQuestionId);
  if (!q) return;

  // Collect value for non-choice types
  if (q.type === 'text_input') {
    const val = document.getElementById('quiz-text-input')?.value.trim();
    if (!val && !q.optional) { document.getElementById('quiz-text-input')?.focus(); return; }
    if (val) State.answers[q.field] = val;
  }
  if (q.type === 'text_area') {
    const val = document.getElementById('quiz-textarea')?.value.trim();
    if (val) State.answers[q.field] = val;
  }
  if (q.type === 'date_picker') {
    const val = document.getElementById('quiz-date-input')?.value;
    if (!val && !q.optional) { document.getElementById('quiz-date-input')?.focus(); return; }
    if (val) State.answers[q.field] = val;
  }
  if (q.type === 'budget_slider') {
    const min = parseInt(document.getElementById('budget-min')?.value || 50);
    const max = parseInt(document.getElementById('budget-max')?.value || 200);
    State.answers[q.field] = { min, max, label: formatBudget(min, max) };
  }
  if (q.type === 'address_form') {
    const addr = collectAddress();
    if (!addr) return;
    State.answers[q.field] = addr;
  }

  // Push history
  State.answerHistory.push({ questionId: q.id, snapshot: JSON.parse(JSON.stringify(State.answers)) });
  State.answeredCount = Math.max(State.answeredCount, State.answerHistory.length);

  const nextId = typeof q.next === 'function' ? q.next(State.answers) : q.next;

  if (!nextId) {
    submitQuestionnaire();
    return;
  }

  loadQuestion(nextId, 'forward');
}

function quizBack() {
  if (!State.answerHistory.length) return;
  const prev = State.answerHistory.pop();
  State.answers = prev.snapshot;
  loadQuestion(prev.questionId, 'backward');
}

function collectAddress() {
  const street1 = document.getElementById('addr-street1')?.value.trim();
  const city    = document.getElementById('addr-city')?.value.trim();
  const state   = document.getElementById('addr-state')?.value;
  const zip     = document.getElementById('addr-zip')?.value.trim();

  if (!street1 || !city || !state || !zip) {
    alert('Please fill in all required address fields.');
    return null;
  }
  if (!/^\d{5}$/.test(zip)) { alert('Please enter a valid 5-digit ZIP code.'); return null; }

  return {
    street1,
    street2: document.getElementById('addr-street2')?.value.trim() || '',
    city, state, zip,
    country: 'US'
  };
}

async function submitQuestionnaire() {
  const body = document.getElementById('quiz-body');
  body.innerHTML = `<div class="quiz-submitting">
    <div class="submitting-spinner"></div>
    <p class="submitting-text">Michele is already thinking about the perfect gift…</p>
  </div>`;

  try {
    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: State.user.id, answers: State.answers })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    clearQuizDraft();
    State.submissions.unshift(data.submission);
    await new Promise(r => setTimeout(r, 1200));
    openChat(data.submission.id);
  } catch (err) {
    body.innerHTML = `<div style="text-align:center;padding:40px"><p style="color:#e05555">Something went wrong. Please try again.</p>
      <button onclick="showView('home')" style="margin-top:20px;padding:12px 28px;background:var(--primary);color:white;border:none;border-radius:99px;cursor:pointer;font-weight:700">Back to Home</button></div>`;
  }
}

// ── Budget Slider ───────────────────────────────────────────
function buildBudgetSlider(minVal, maxVal) {
  return `<div class="budget-container">
    <div class="budget-display">
      <div class="budget-range-text" id="budget-display-text">${formatBudget(minVal, maxVal)}</div>
      <div class="budget-sub">Drag both handles to set your range</div>
    </div>
    <div class="slider-track-wrap" id="slider-track-wrap">
      <div class="slider-track-fill" id="slider-fill"></div>
      <input type="range" class="slider-range" id="budget-min" min="25" max="2000" step="25" value="${minVal}" />
      <input type="range" class="slider-range" id="budget-max" min="25" max="2000" step="25" value="${maxVal}" />
    </div>
    <div class="slider-labels">
      <span>$25</span><span>$200</span><span>$500</span><span>$1,000</span><span>$2,000+</span>
    </div>
  </div>`;
}

function formatBudget(min, max) {
  const fmt = n => n >= 2000 ? '$2,000+' : '$' + n.toLocaleString();
  return `${fmt(min)} – ${fmt(max)}`;
}

function initBudgetSlider(minVal, maxVal) {
  const minInput = document.getElementById('budget-min');
  const maxInput = document.getElementById('budget-max');
  const fill = document.getElementById('slider-fill');
  const display = document.getElementById('budget-display-text');

  function update() {
    let min = parseInt(minInput.value);
    let max = parseInt(maxInput.value);
    if (min > max - 25) {
      if (document.activeElement === minInput) min = max - 25;
      else max = min + 25;
      minInput.value = min;
      maxInput.value = max;
    }
    const pct = v => ((v - 25) / (2000 - 25)) * 100;
    fill.style.left  = pct(min) + '%';
    fill.style.width = (pct(max) - pct(min)) + '%';
    display.textContent = formatBudget(min, max);
  }

  minInput.addEventListener('input', update);
  maxInput.addEventListener('input', update);
  update();
}

// ── Address Form ────────────────────────────────────────────
const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'];

function buildAddressForm(saved) {
  const stateOptions = US_STATES.map(s =>
    `<option value="${s}" ${saved.state === s ? 'selected' : ''}>${s}</option>`
  ).join('');

  return `<div class="address-form-grid">
    <div>
      <label class="addr-label">Street Address *</label>
      <input class="addr-input" id="addr-street1" type="text" placeholder="123 Main Street" value="${saved.street1 || ''}" />
    </div>
    <div>
      <label class="addr-label">Apt / Suite / Unit</label>
      <input class="addr-input" id="addr-street2" type="text" placeholder="Apt 4B (optional)" value="${saved.street2 || ''}" />
    </div>
    <div class="address-form-row">
      <div>
        <label class="addr-label">City *</label>
        <input class="addr-input" id="addr-city" type="text" placeholder="New York" value="${saved.city || ''}" />
      </div>
      <div>
        <label class="addr-label">State *</label>
        <select class="addr-select" id="addr-state">
          <option value="">Select</option>
          ${stateOptions}
        </select>
      </div>
    </div>
    <div style="max-width:200px">
      <label class="addr-label">ZIP Code *</label>
      <input class="addr-input" id="addr-zip" type="text" placeholder="10001" maxlength="5" value="${saved.zip || ''}" />
    </div>
    <p style="font-size:0.8rem;color:var(--text-light);margin-top:8px">🇺🇸 US delivery only</p>
  </div>`;
}

// ── Chat ───────────────────────────────────────────────────
async function openChat(submissionId) {
  State.currentSubmissionId = submissionId;
  State.unread[submissionId] = 0;
  saveUnreadToStorage();
  updateGlobalUnreadBadge();

  const unreadEl = document.getElementById(`unread-${submissionId}`);
  if (unreadEl) { unreadEl.textContent = '0'; unreadEl.classList.remove('visible'); }

  const sub = State.submissions.find(s => s.id === submissionId);
  if (!sub) return;

  renderChatHeader(sub);
  showView('chat');

  // Join socket room
  if (State.socket) State.socket.emit('join_submission', { submissionId, userId: State.user.id });

  // Load messages
  const msgs = document.getElementById('messages-list');
  msgs.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-light)">Loading…</div>';

  try {
    const res = await fetch(`/api/messages/${submissionId}`);
    const messages = await res.json();
    msgs.innerHTML = '';
    messages.forEach(m => appendMessage(m));
    scrollChatBottom();
  } catch {
    msgs.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-light)">Could not load messages.</div>';
  }
}

function renderChatHeader(sub) {
  const occ = sub.answers?.occasion || 'other';
  const recipientName = sub.answers?.recipient_name || 'Someone special';

  const nameEl = document.getElementById('chat-header-name');
  const subEl  = document.getElementById('chat-header-sub');
  const badge  = document.getElementById('chat-status-badge');

  if (nameEl) nameEl.textContent = 'Michele';
  if (subEl)  subEl.textContent  = `Gift for ${recipientName} · ${OCCASION_LABELS[occ] || 'Gift'}`;
  if (badge) {
    badge.className = `chat-status-indicator status-badge status-${sub.status}`;
    badge.textContent = statusLabel(sub.status);
  }
}

function appendMessage(msg) {
  const list = document.getElementById('messages-list');
  if (!list) return;

  const isAdmin = msg.sender === 'admin';
  const side = isAdmin ? 'from-admin' : 'from-user';
  const avatarInitial = isAdmin ? '✦' : (State.user?.name?.charAt(0) || 'Y');
  const time = new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  if (msg.type === 'system') {
    const row = document.createElement('div');
    row.className = 'msg-system-row';
    row.innerHTML = `<span class="msg-system">${escapeHtml(msg.content)}</span>`;
    list.appendChild(row);
    return;
  }

  let content = '';

  if (msg.type === 'text') {
    content = `<div class="msg-bubble">${escapeHtml(msg.content)}</div>`;
  } else if (msg.type === 'file') {
    const isImage = /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(msg.fileName || '');
    if (isImage) {
      content = `<div><img class="msg-img" src="${msg.fileUrl}" alt="${escapeHtml(msg.fileName || 'image')}"
        onclick="window.open('${msg.fileUrl}','_blank')" loading="lazy" /></div>`;
    } else {
      content = `<a class="msg-file-wrap" href="${msg.fileUrl}" target="_blank" download>
        <span style="font-size:1.4rem">📎</span>
        <span style="font-size:0.88rem;font-weight:600">${escapeHtml(msg.fileName || 'File')}</span>
      </a>`;
    }
  } else if (msg.type === 'charge_prompt') {
    content = buildChargeCard(msg);
  }

  const wrap = document.createElement('div');
  wrap.className = `msg-wrap ${side}`;
  wrap.id = `msg-${msg.id}`;
  wrap.innerHTML = `
    <div class="msg-avatar ${isAdmin ? 'admin-avatar' : 'user-avatar'}">${avatarInitial}</div>
    <div>
      ${content}
      <span class="msg-time">${time}</span>
    </div>`;

  list.appendChild(wrap);
}

function buildChargeCard(msg) {
  const status = msg.status || 'pending';
  let actions = '';
  if (status === 'pending') {
    actions = `<div class="charge-actions" id="charge-${msg.chargeId}">
      <button class="charge-accept" onclick="respondCharge('${msg.chargeId}','accepted')">✓ Accept</button>
      <button class="charge-decline" onclick="respondCharge('${msg.chargeId}','declined')">✕ Decline</button>
    </div>`;
  } else if (status === 'accepted') {
    actions = `<div id="charge-${msg.chargeId}"><div class="charge-status-accepted">✅ Payment request accepted!</div></div>`;
  } else {
    actions = `<div id="charge-${msg.chargeId}"><div class="charge-status-declined">✕ Declined</div></div>`;
  }

  return `<div class="charge-card">
    <div class="charge-label">Payment Request</div>
    <div class="charge-amount">$${parseFloat(msg.amount).toFixed(2)}</div>
    <div class="charge-description">${escapeHtml(msg.description || '')}</div>
    ${actions}
    <p style="font-size:0.7rem;color:var(--text-light);margin-top:12px">Secure payment processing coming soon</p>
  </div>`;
}

async function respondCharge(chargeId, response) {
  try {
    await fetch(`/api/charge/${State.currentSubmissionId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chargeId, response, userId: State.user.id })
    });
    const el = document.getElementById(`charge-${chargeId}`);
    if (el) {
      el.innerHTML = response === 'accepted'
        ? `<div class="charge-status-accepted">✅ Payment request accepted!</div>`
        : `<div class="charge-status-declined">✕ Payment request declined.</div>`;
    }
  } catch {}
}

let typingTimeout = null;
function onChatTyping() {
  if (!State.socket || !State.currentSubmissionId) return;
  State.socket.emit('typing', { submissionId: State.currentSubmissionId, name: State.user.name, isAdmin: false });
}

function sendChatMessage() {
  const input = document.getElementById('chat-text-input');
  const text = input?.value.trim();
  if (!text || !State.socket || !State.currentSubmissionId) return;

  State.socket.emit('send_message', {
    submissionId: State.currentSubmissionId,
    content: text,
    senderName: State.user.name,
    isAdmin: false
  });

  appendMessage({
    id: 'tmp_' + Date.now(),
    type: 'text',
    sender: 'user',
    senderName: State.user.name,
    content: text,
    timestamp: new Date().toISOString()
  });
  scrollChatBottom();
  input.value = '';
  input.style.height = 'auto';
}

async function handleFileUpload(e) {
  const file = e.target.files?.[0];
  if (!file || !State.currentSubmissionId) return;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    State.socket.emit('send_file_message', {
      submissionId: State.currentSubmissionId,
      fileUrl: data.url,
      fileName: data.originalName,
      fileType: data.mimetype,
      senderName: State.user.name,
      isAdmin: false
    });

    appendMessage({
      id: 'tmp_' + Date.now(),
      type: 'file',
      sender: 'user',
      senderName: State.user.name,
      fileUrl: data.url,
      fileName: data.originalName,
      fileType: data.mimetype,
      timestamp: new Date().toISOString()
    });
    scrollChatBottom();
  } catch (err) {
    showToast('Upload failed', err.message || 'Could not upload file.');
  }

  e.target.value = '';
}

function scrollChatBottom() {
  const list = document.getElementById('messages-list');
  if (list) list.scrollTop = list.scrollHeight;
}

// ── Toast ──────────────────────────────────────────────────
function showToast(title, body, onClick) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<div class="toast-text">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(body || '')}</span>
    </div>`;

  toast.addEventListener('click', () => {
    if (onClick) onClick();
    toast.remove();
  });

  container.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 5000);
}

// ── Utility ────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Auto-resize chat textarea
document.addEventListener('input', (e) => {
  if (e.target.id === 'chat-text-input') {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
  }
});
