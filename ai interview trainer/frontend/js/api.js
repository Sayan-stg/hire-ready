/* ═══════════════════════════════════════════════════════════
   HireReady — Core JS (api.js)
   API client, auth, theme, toast, utils
   ═══════════════════════════════════════════════════════════ */

// ─── Config ──────────────────────────────────────────────────────
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? `http://localhost:5000/api`
  : `/api`;

// ─── API Client ──────────────────────────────────────────────────
const api = {
  async request(method, path, body, isForm = false) {
    const token = Auth.getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isForm) headers['Content-Type'] = 'application/json';

    const opts = { method, headers, credentials: 'include' };
    if (body) opts.body = isForm ? body : JSON.stringify(body);

    try {
      const res = await fetch(`${API_BASE}${path}`, opts);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      return data;
    } catch (err) {
      if (err.message === 'Failed to fetch') throw new Error('Cannot connect to server. Make sure the backend is running.');
      throw err;
    }
  },
  get: (path) => api.request('GET', path),
  post: (path, body) => api.request('POST', path, body),
  put:  (path, body) => api.request('PUT', path, body),
  delete: (path) => api.request('DELETE', path),
};

// ─── Auth Manager ─────────────────────────────────────────────────
const Auth = {
  TOKEN_KEY: 'hr_token',
  USER_KEY: 'hr_user',

  getToken() { return localStorage.getItem(this.TOKEN_KEY); },
  getUser() {
    try { return JSON.parse(localStorage.getItem(this.USER_KEY) || 'null'); }
    catch { return null; }
  },
  setSession(token, user) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  },
  isLoggedIn() { return !!this.getToken() && !!this.getUser(); },

  async login(email, password) {
    const data = await api.post('/auth/login', { email, password });
    this.setSession(data.token, data.user);
    return data.user;
  },
  async register(name, email, password, targetRole) {
    const data = await api.post('/auth/register', { name, email, password, targetRole });
    this.setSession(data.token, data.user);
    return data.user;
  },
  async logout() {
    try { await api.post('/auth/logout'); } catch {}
    this.clear();
    window.location.href = '/pages/login.html';
  },
  async refreshUser() {
    try {
      const data = await api.get('/auth/me');
      localStorage.setItem(this.USER_KEY, JSON.stringify(data.user));
      return data.user;
    } catch {
      return this.getUser();
    }
  },
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = '/pages/login.html';
      return false;
    }
    return true;
  },
};

// ─── Theme Manager ────────────────────────────────────────────────
const Theme = {
  KEY: 'hr_theme',
  current() { return localStorage.getItem(this.KEY) || 'dark'; },
  set(theme) {
    localStorage.setItem(this.KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
    this._updateToggleBtn(theme);
  },
  toggle() { this.set(this.current() === 'dark' ? 'light' : 'dark'); },
  init() {
    const saved = this.current();
    document.documentElement.setAttribute('data-theme', saved);
    this._updateToggleBtn(saved);
  },
  _updateToggleBtn(theme) {
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.textContent = theme === 'dark' ? '☀️' : '🌙';
      btn.title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    });
  },
};

// ─── Toast ────────────────────────────────────────────────────────
const Toast = {
  container: null,
  init() {
    if (!document.querySelector('.toast-container')) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    } else {
      this.container = document.querySelector('.toast-container');
    }
  },
  show(msg, type = 'info', duration = 3000) {
    if (!this.container) this.init();
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
    this.container.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
  },
  success: (m) => Toast.show(m, 'success'),
  error:   (m) => Toast.show(m, 'error'),
  info:    (m) => Toast.show(m, 'info'),
};

// ─── Navbar Builder ───────────────────────────────────────────────
function buildNavbar(activePage = '') {
  const user = Auth.getUser();
  const isAuth = !!user;
  const initials = user ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '';

  const pages = [
    { href: '/pages/dashboard.html', label: 'Dashboard', key: 'dashboard' },
    { href: '/pages/interview.html', label: 'Practice', key: 'interview' },
    { href: '/pages/resources.html', label: 'Resources', key: 'resources' },
    { href: '/pages/leaderboard.html', label: 'Leaderboard', key: 'leaderboard' },
  ];

  const navLinks = isAuth ? pages.map(p => `
    <a href="${p.href}" class="${activePage === p.key ? 'active' : ''}">${p.label}</a>
  `).join('') : '';

  const navActions = isAuth ? `
    <div class="user-menu">
      <button class="user-menu-btn" onclick="toggleUserMenu()">
        <div class="user-avatar-sm">${initials}</div>
        <span>${user.name.split(' ')[0]}</span>
        <span style="font-size:0.65rem;color:var(--starlight-silver);">▼</span>
      </button>
      <div class="user-dropdown" id="user-dropdown">
        <a href="/pages/dashboard.html">📊 Dashboard</a>
        <a href="/pages/settings.html">⚙️ Settings</a>
        <div class="divider" style="height:1px;background:var(--border-delicate);margin:4px 0;"></div>
        <button onclick="Auth.logout()">🚪 Log Out</button>
      </div>
    </div>
  ` : `
    <a href="/pages/login.html" class="btn btn-ghost btn-sm">Log In</a>
    <a href="/pages/register.html" class="btn btn-primary btn-sm">Sign Up</a>
  `;

  return `
    <nav class="navbar">
      <div class="nav-inner">
        <a href="/index.html" class="nav-logo">
          <div class="logo-icon-orbital">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10H12V2z"></path>
              <circle cx="12" cy="12" r="4"></circle>
            </svg>
          </div>
          <div class="nav-logo-text">
            <span class="nav-logo-team">SIXTH BIT</span>
            <span class="nav-logo-title">Hire<strong>Ready</strong></span>
          </div>
        </a>
        <div class="nav-links">${navLinks}</div>
        <div class="nav-actions">${navActions}</div>
      </div>
    </nav>
  `;
}

function toggleUserMenu() {
  document.getElementById('user-dropdown')?.classList.toggle('open');
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('.user-menu')) {
    document.getElementById('user-dropdown')?.classList.remove('open');
  }
});

// ─── Sidebar Builder ──────────────────────────────────────────────
function buildSidebar(activePage = '') {
  const user = Auth.getUser();
  if (!user) return '';
  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const items = [
    { href: '/pages/dashboard.html', icon: '📊', label: 'Dashboard', key: 'dashboard' },
    { href: '/pages/interview.html', icon: '🎙️', label: 'Interview', key: 'interview' },
    { href: '/pages/evaluation.html', icon: '📈', label: 'Evaluation', key: 'evaluation' },
    { href: '/pages/resources.html', icon: '📚', label: 'Resources', key: 'resources' },
    { href: '/pages/leaderboard.html', icon: '🏆', label: 'Leaderboard', key: 'leaderboard' },
    { href: '/pages/settings.html', icon: '⚙️', label: 'Settings', key: 'settings' },
  ];

  return `
    <aside class="sidebar" id="sidebar">
      <nav class="sidebar-nav">
        ${items.map(i => `
          <a href="${i.href}" class="${activePage === i.key ? 'active' : ''}">
            <span class="nav-icon">${i.icon}</span>${i.label}
          </a>
        `).join('')}
      </nav>
      <div class="sidebar-footer">
        <div class="user-chip">
          <div class="user-chip-avatar">${initials}</div>
          <div>
            <div class="user-chip-name">${user.name}</div>
            <div class="user-chip-role">${user.targetRole || 'SDE'} Track</div>
          </div>
        </div>
      </div>
    </aside>
  `;
}

// ─── Team Credits Footer Builder ──────────────────────────────────
function buildCreditsFooter() {
  return `
    <footer class="credits-footer">
      <div class="credits-header">
        <div class="credits-title">SYSTEM ARCHITECTS & DEVELOPERS // SIXTH BIT</div>
        <div style="font-family:var(--font-mono);font-size:0.68rem;color:var(--starlight-muted);">PREPARED BY TEAM SIXTH BIT</div>
      </div>
      <div class="credits-grid">
        <div class="credit-item"><span class="credit-num">1.</span> <span class="credit-name">Adeet Singh</span> <span class="credit-id">: 25BAI11451</span></div>
        <div class="credit-item"><span class="credit-num">2.</span> <span class="credit-name">Piya Nimje</span> <span class="credit-id">: 25BAI10213</span></div>
        <div class="credit-item"><span class="credit-num">3.</span> <span class="credit-name">Navya Vyas</span> <span class="credit-id">: 25BAI10566</span></div>
        <div class="credit-item"><span class="credit-num">4.</span> <span class="credit-name">Mohit Pratap Singh</span> <span class="credit-id">: 25BAI10639</span></div>
        <div class="credit-item"><span class="credit-num">5.</span> <span class="credit-name">Sayan Mondal</span> <span class="credit-id">: 25BAI11532</span></div>
        <div class="credit-item"><span class="credit-num">6.</span> <span class="credit-name">Krishna Paliwal</span> <span class="credit-id">: 25BAI11317</span></div>
      </div>
    </footer>
  `;
}


// ─── Utility ──────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtDuration(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
function scoreColor(score) {
  if (score >= 80) return 'green';
  if (score >= 60) return 'yellow';
  return 'red';
}
function setProgressBar(el, pct) {
  if (!el) return;
  const fill = el.querySelector('.progress-fill');
  if (fill) fill.style.width = Math.min(100, pct) + '%';
}

// ─── Init ─────────────────────────────────────────────────────────
Theme.init();
Toast.init();
