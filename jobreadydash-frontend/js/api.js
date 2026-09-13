/**
 * JobReadyDash (SIH26135) — Centralized API Service Layer
 * ---------------------------------------------------------
 * ALL backend communication goes through `window.api`.
 * No HTML page should call fetch() directly.
 *
 * MOCK MODE (APP_CONFIG.USE_MOCK_DATA === true):
 *   Every method returns realistic sample data after a short delay.
 *   Participant CRUD persists to localStorage (see mock-data.js).
 *
 * REAL MODE (USE_MOCK_DATA === false):
 *   Every method calls the Spring Boot backend:
 *     Base URL : APP_CONFIG.API_BASE_URL  (e.g. http://localhost:8080)
 *     Auth     : Authorization: Bearer <JWT_TOKEN>
 *     Format   : JSON in / JSON out
 *
 * BACKEND CONTRACT (Spring Boot must implement):
 *   POST /api/auth/login                  { username, password }            -> { token, role, username }
 *   GET  /api/participants                 -> [ { id, name, email, phone, district, program, status, ... } ]
 *   POST /api/participants                 { name, email, phone, district, program, status } -> created object
 *   PUT  /api/participants/{id}            { ...fields }                   -> updated object
 *   DELETE /api/participants/{id}          -> 200/204 (confirm exact path with backend team)
 *   GET  /api/analytics/placement-rate?district=All -> { total, employed, selfEmployed, unemployed, training, other, placed, rate, districtWise, trend }
 *   GET  /api/analytics/skill-gaps?district=All     -> [ { skill, demand, supply, gap, category } ]
 */

(function (global) {
  'use strict';

  /** Typed error for API failures (carries HTTP status). */
  class ApiError extends Error {
    constructor(message, status, payload) {
      super(message);
      this.name = 'ApiError';
      this.status = status || 0;
      this.payload = payload;
    }
  }

  function authToken() {
    try {
      return localStorage.getItem(global.APP_CONFIG.TOKEN_KEYS.TOKEN);
    } catch (e) { return null; }
  }

  function fillPath(path, params) {
    let out = path;
    Object.keys(params || {}).forEach(k => {
      out = out.replace('{' + k + '}', encodeURIComponent(params[k]));
    });
    return out;
  }

  /**
   * Low-level fetch wrapper: attaches JWT, sends JSON, normalizes errors.
   * Triggers session-expired flow on 401 (handled by auth.js).
   */
  async function request(path, options) {
    const cfg = global.APP_CONFIG;
    const opts = options || {};
    const url = cfg.API_BASE_URL + path;

    const headers = { 'Content-Type': 'application/json' };
    const token = authToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    let res;
    try {
      res = await fetch(url, {
        method: opts.method || 'GET',
        headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined
      });
    } catch (networkErr) {
      throw new ApiError(
        'Cannot reach the server at ' + cfg.API_BASE_URL + '. Is the backend running?',
        0
      );
    }

    if (res.status === 401) {
      // Expired / invalid JWT -> let auth.js redirect to login.
      if (global.Auth && typeof global.Auth.handleSessionExpired === 'function') {
        global.Auth.handleSessionExpired();
      }
      throw new ApiError('Session expired. Please log in again.', 401);
    }

    let data = null;
    const text = await res.text();
    if (text) {
      try { data = JSON.parse(text); } catch (e) { data = text; }
    }

    if (!res.ok) {
      const msg =
        (data && (data.message || data.error)) ||
        ('Request failed with status ' + res.status);
      throw new ApiError(msg, res.status, data);
    }
    return data;
  }

  /* ══════════════ MOCK HANDLERS ══════════════ */

  function fakeJwt(username, role) {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      sub: username, role, iat: Date.now(), mock: true
    }));
    return header + '.' + payload + '.mock-signature';
  }

  const mock = {
    async login(username, password) {
      await global.MockData.mockDelay();
      const u = global.MockData.MOCK_USERS.find(
        x => (x.username === username || x.email === username) && x.password === password
      );
      if (!u) throw new ApiError('Invalid username or password.', 401);
      return { token: fakeJwt(u.username, u.role), role: u.role, username: u.username, name: u.name };
    },

    async getParticipants() {
      await global.MockData.mockDelay();
      return JSON.parse(JSON.stringify(global.MockData.MockStore.all()));
    },

    async createParticipant(payload) {
      await global.MockData.mockDelay();
      const rows = global.MockData.MockStore.all();
      const created = {
        id: global.MockData.MockStore.nextId(rows),
        enrollmentDate: new Date().toISOString().slice(0, 10),
        employer: payload.employer || '',
        salary: payload.salary || '',
        ...payload
      };
      rows.unshift(created);
      global.MockData.MockStore._write(rows);
      return JSON.parse(JSON.stringify(created));
    },

    async updateParticipant(id, payload) {
      await global.MockData.mockDelay();
      const rows = global.MockData.MockStore.all();
      const idx = rows.findIndex(r => String(r.id) === String(id));
      if (idx === -1) throw new ApiError('Participant not found.', 404);
      rows[idx] = { ...rows[idx], ...payload };
      global.MockData.MockStore._write(rows);
      return JSON.parse(JSON.stringify(rows[idx]));
    },

    async deleteParticipant(id) {
      await global.MockData.mockDelay();
      const rows = global.MockData.MockStore.all();
      const idx = rows.findIndex(r => String(r.id) === String(id));
      if (idx === -1) throw new ApiError('Participant not found.', 404);
      rows.splice(idx, 1);
      global.MockData.MockStore._write(rows);
      return { success: true, id };
    },

    async getPlacementRate(params) {
      await global.MockData.mockDelay();
      const district = (params && params.district) || 'All';
      let rows = global.MockData.MockStore.all();
      if (district !== 'All') rows = rows.filter(r => r.district === district);
      const summary = global.MockData.computePlacement(rows);
      return {
        ...summary,
        district,
        districtWise: global.MockData.districtBreakdown(global.MockData.MockStore.all()),
        trend: JSON.parse(JSON.stringify(global.MockData.SEED_TREND))
      };
    },

    async getSkillGaps(params) {
      await global.MockData.mockDelay();
      const district = (params && params.district) || 'All';
      return global.MockData.skillGapsFor(district);
    }
  };

  /* ══════════════ PUBLIC API ══════════════ */

  function useMock() {
    return !!(global.APP_CONFIG && global.APP_CONFIG.USE_MOCK_DATA);
  }

  /**
   * POST /api/auth/login
   * @param {string} username
   * @param {string} password
   * @returns {Promise<{token:string, role:string, username:string}>}
   */
  async function login(username, password) {
    if (useMock()) return mock.login(username, password);
    return request(global.APP_CONFIG.ENDPOINTS.LOGIN, {
      method: 'POST',
      body: { username, password }
    });
  }

  /**
   * GET /api/participants
   * @returns {Promise<Array>} participant list
   */
  async function getParticipants() {
    if (useMock()) return mock.getParticipants();
    return request(global.APP_CONFIG.ENDPOINTS.PARTICIPANTS, { method: 'GET' });
  }

  /**
   * POST /api/participants
   * @param {Object} payload { name, email, phone, district, program, status }
   */
  async function createParticipant(payload) {
    if (useMock()) return mock.createParticipant(payload);
    return request(global.APP_CONFIG.ENDPOINTS.PARTICIPANTS, { method: 'POST', body: payload });
  }

  /**
   * PUT /api/participants/{id}
   */
  async function updateParticipant(id, payload) {
    if (useMock()) return mock.updateParticipant(id, payload);
    return request(fillPath(global.APP_CONFIG.ENDPOINTS.PARTICIPANT_BY_ID, { id }), {
      method: 'PUT', body: payload
    });
  }

  /**
   * DELETE /api/participants/{id}
   * NOTE: The MVP endpoint list did not explicitly specify DELETE.
   * This function is isolated so the path/method can be changed in ONE place
   * (config.js -> ENDPOINTS.PARTICIPANT_BY_ID) once the backend confirms it.
   */
  async function deleteParticipant(id) {
    if (useMock()) return mock.deleteParticipant(id);
    return request(fillPath(global.APP_CONFIG.ENDPOINTS.PARTICIPANT_BY_ID, { id }), {
      method: 'DELETE'
    });
  }

  /**
   * GET /api/analytics/placement-rate?district=All
   */
  async function getPlacementRate(params) {
    if (useMock()) return mock.getPlacementRate(params);
    const d = (params && params.district) || 'All';
    return request(global.APP_CONFIG.ENDPOINTS.PLACEMENT_RATE + '?district=' + encodeURIComponent(d));
  }

  /**
   * GET /api/analytics/skill-gaps?district=All
   */
  async function getSkillGaps(params) {
    if (useMock()) return mock.getSkillGaps(params);
    const d = (params && params.district) || 'All';
    return request(global.APP_CONFIG.ENDPOINTS.SKILL_GAPS + '?district=' + encodeURIComponent(d));
  }

  global.ApiError = ApiError;
  global.api = {
    login, getParticipants, createParticipant,
    updateParticipant, deleteParticipant,
    getPlacementRate, getSkillGaps
  };
})(window);
