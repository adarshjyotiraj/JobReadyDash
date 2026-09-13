/**
 * JobReadyDash (SIH26135) — Authentication + Shared UI helpers
 * --------------------------------------------------------------
 * Central place for: session (JWT), role guards, toasts, sidebar,
 * logout flow, session-expiry handling, HTML escaping.
 *
 * SECURITY NOTES (MVP):
 *  - JWT is stored in localStorage for demo simplicity.
 *  - Passwords are never stored. Session is cleared on logout/expiry.
 *  - NEVER trust frontend role checks for security — the Spring Boot
 *    backend must enforce authorization on every endpoint.
 *  - All API-derived strings rendered into the DOM go through
 *    UI.escapeHtml() to prevent XSS.
 */

(function (global) {
  'use strict';

  /* ── UI helpers ─────────────────────────────────────────────── */
  const UI = {
    /**
     * Escape a string for safe insertion into HTML.
     * @param {any} value
     * @returns {string}
     */
    escapeHtml(value) {
      if (value === null || value === undefined) return '';
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    /**
     * Show a Bootstrap toast notification (never use alert()).
     * @param {string} message
     * @param {'success'|'error'|'info'|'warning'} type
     */
    toast(message, type) {
      type = type || 'info';
      const container = document.getElementById('toastContainer');
      if (!container) { console.log('[toast:' + type + ']', message); return; }

      const icons = {
        success: 'bi-check-circle-fill text-success',
        error: 'bi-exclamation-octagon-fill text-danger',
        warning: 'bi-exclamation-triangle-fill text-warning',
        info: 'bi-info-circle-fill text-primary'
      };
      const titles = { success: 'Success', error: 'Error', warning: 'Warning', info: 'Notice' };

      const el = document.createElement('div');
      el.className = 'toast align-items-center border-0 shadow-sm';
      el.setAttribute('role', 'alert');
      el.setAttribute('aria-live', 'assertive');
      el.innerHTML =
        '<div class="d-flex">' +
          '<div class="toast-body d-flex gap-2 align-items-start">' +
            '<i class="bi ' + (icons[type] || icons.info) + ' fs-5"></i>' +
            '<div><strong class="d-block small">' + titles[type] + '</strong>' +
            '<span class="small">' + UI.escapeHtml(message) + '</span></div>' +
          '</div>' +
          '<button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>' +
        '</div>';

      container.appendChild(el);
      const toast = new bootstrap.Toast(el, { autohide: true, delay: type === 'error' ? 6000 : 4000 });
      toast.show();
      el.addEventListener('hidden.bs.toast', () => el.remove());
    },

    /** Format a number with Indian digit grouping. */
    formatNumber(n) {
      return Number(n || 0).toLocaleString('en-IN');
    },

    /** Format ISO date (YYYY-MM-DD) -> 12 Jun 2025 */
    formatDate(iso) {
      if (!iso) return '—';
      const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
      if (isNaN(d)) return iso;
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  };

  /* ── Auth / session ─────────────────────────────────────────── */
  const Auth = {
    keys() { return global.APP_CONFIG.TOKEN_KEYS; },

    getToken() {
      try { return localStorage.getItem(this.keys().TOKEN); } catch (e) { return null; }
    },
    getRole() {
      try { return localStorage.getItem(this.keys().ROLE); } catch (e) { return null; }
    },
    getUsername() {
      try { return localStorage.getItem(this.keys().USERNAME); } catch (e) { return null; }
    },
    getDisplayName() {
      try { return localStorage.getItem('jrd_display_name') || this.getUsername(); }
      catch (e) { return this.getUsername(); }
    },

    isAuthenticated() {
      return !!this.getToken();
    },

    roleLabel(role) {
      return (global.APP_CONFIG.ROLE_LABELS && global.APP_CONFIG.ROLE_LABELS[role]) || role || 'User';
    },

    /** ADMIN + DATA_ENTRY can add/edit participants. */
    canManageParticipants() {
      const r = this.getRole();
      return r === 'ADMIN' || r === 'DATA_ENTRY';
    },
    /** Only ADMIN can delete (DATA_ENTRY manages data, destructive = admin). */
    canDeleteParticipants() {
      return this.getRole() === 'ADMIN';
    },
    canViewAnalytics() {
      const r = this.getRole();
      return r === 'ADMIN' || r === 'ANALYST';
    },

    saveSession(payload) {
      try {
        localStorage.setItem(this.keys().TOKEN, payload.token);
        localStorage.setItem(this.keys().ROLE, payload.role);
        localStorage.setItem(this.keys().USERNAME, payload.username);
        if (payload.name) localStorage.setItem('jrd_display_name', payload.name);
      } catch (e) {}
    },

    clearSession() {
      try {
        localStorage.removeItem(this.keys().TOKEN);
        localStorage.removeItem(this.keys().ROLE);
        localStorage.removeItem(this.keys().USERNAME);
        localStorage.removeItem('jrd_display_name');
      } catch (e) {}
    },

    /** Guard for protected pages. Redirects to login when unauthenticated. */
    requireAuth() {
      if (!this.isAuthenticated()) {
        window.location.href = 'index.html';
        return false;
      }
      return true;
    },

    /** Hide/disable UI elements the current role must not use. */
    applyRoleGuards() {
      const role = this.getRole();
      const canManage = this.canManageParticipants();
      const canDelete = this.canDeleteParticipants();
      const canAnalytics = this.canViewAnalytics();

      document.querySelectorAll('[data-require-manage]').forEach(el => {
        if (!canManage) el.style.display = 'none';
      });
      document.querySelectorAll('[data-require-delete]').forEach(el => {
        if (!canDelete) el.style.display = 'none';
      });
      document.querySelectorAll('[data-require-analytics]').forEach(el => {
        if (!canAnalytics) el.style.display = 'none';
      });
      document.querySelectorAll('[data-nav="analytics"]').forEach(el => {
        if (!canAnalytics) el.style.display = 'none';
      });
      // DATA_ENTRY keeps Dashboard + Participants; ANALYST keeps Dashboard + Analytics (+read-only Participants)
      document.querySelectorAll('[data-nav="participants"]').forEach(el => {
        el.style.display = ''; // visible to all roles (actions are guarded separately)
      });

      document.body.setAttribute('data-role', role || 'GUEST');
    },

    /** Fill user chips / profile labels in navbar + sidebar. */
    updateUserUI() {
      const name = this.getDisplayName() || 'User';
      const role = this.getRole();
      const label = this.roleLabel(role);
      const initials = name.trim().split(/[\s._-]+/).map(s => s[0]).join('').slice(0, 2).toUpperCase();

      document.querySelectorAll('[data-user-name]').forEach(el => { el.textContent = name; });
      document.querySelectorAll('[data-user-role]').forEach(el => { el.textContent = label; });
      document.querySelectorAll('[data-user-initials]').forEach(el => { el.textContent = initials; });
    },

    /** Ask for confirmation, then log out. */
    requestLogout() {
      const modalEl = document.getElementById('logoutModal');
      if (modalEl && global.bootstrap) {
        new bootstrap.Modal(modalEl).show();
      } else {
        this.logout();
      }
    },

    logout() {
      this.clearSession();
      window.location.href = 'index.html?logged_out=1';
    },

    /** Called on HTTP 401 anywhere in the app. */
    handleSessionExpired() {
      this.clearSession();
      if (!window.location.pathname.endsWith('index.html') && !window.location.pathname.endsWith('/')) {
        window.location.href = 'index.html?expired=1';
      }
    },

    /* ── Sidebar / topbar wiring (shared by all protected pages) ── */
    initShell(activePage) {
      // Active nav highlight
      document.querySelectorAll('.sidebar-link').forEach(a => {
        if (a.getAttribute('data-page') === activePage) a.classList.add('active');
        else a.classList.remove('active');
      });

      // Mobile sidebar toggle
      const sidebar = document.getElementById('sidebar');
      const overlay = document.getElementById('sidebarOverlay');
      const openSidebar = () => {
        if (sidebar) sidebar.classList.add('open');
        if (overlay) overlay.classList.add('show');
        document.body.classList.add('sidebar-open');
      };
      const closeSidebar = () => {
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('show');
        document.body.classList.remove('sidebar-open');
      };
      document.querySelectorAll('[data-sidebar-toggle]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (sidebar && sidebar.classList.contains('open')) closeSidebar();
          else openSidebar();
        });
      });
      if (overlay) overlay.addEventListener('click', closeSidebar);
      document.querySelectorAll('.sidebar-link').forEach(a => {
        a.addEventListener('click', () => { if (window.innerWidth < 992) closeSidebar(); });
      });

      // Logout buttons
      document.querySelectorAll('[data-action="logout"]').forEach(btn => {
        btn.addEventListener('click', e => { e.preventDefault(); Auth.requestLogout(); });
      });
      const confirmBtn = document.getElementById('confirmLogoutBtn');
      if (confirmBtn) confirmBtn.addEventListener('click', () => Auth.logout());

      // Demo mode badge
      const demoBadge = document.getElementById('demoModeBadge');
      if (demoBadge) {
        if (global.APP_CONFIG.USE_MOCK_DATA) demoBadge.style.display = '';
        else demoBadge.style.display = 'none';
      }
    },

    /** One-line bootstrap for every protected page. */
    initProtectedPage(activePage) {
      if (!this.requireAuth()) return false;
      this.updateUserUI();
      this.applyRoleGuards();
      this.initShell(activePage);
      return true;
    }
  };

  global.UI = UI;
  global.Auth = Auth;
})(window);
