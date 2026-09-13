/**
 * JobReadyDash (SIH26135) — Central Configuration
 * ------------------------------------------------
 * SINGLE SOURCE OF TRUTH for backend integration.
 *
 * BACKEND DEVELOPER (Spring Boot):
 *  - Change API_BASE_URL below to point at the Spring Boot server.
 *  - Keep endpoint paths in ENDPOINTS in sync with your controllers.
 *  - Frontend sends:  Authorization: Bearer <JWT>
 *  - Frontend expects JSON everywhere (Content-Type: application/json).
 *
 * FRONTEND DEVELOPER:
 *  - Set USE_MOCK_DATA = true  -> run demo without backend (default).
 *  - Set USE_MOCK_DATA = false -> use the real Spring Boot backend.
 *
 * No other file should hard-code URLs. Import via window.APP_CONFIG.
 */

(function (global) {
  'use strict';

  const APP_CONFIG = {
    APP_NAME: 'JobReadyDash',
    APP_TAGLINE: 'Employment Outcome Tracking for Skilling Programs',
    VERSION: '1.0.0-mvp',
    SIH_ID: 'SIH26135',
    SIH_YEAR: '2026',

    // ── Backend connection ─────────────────────────────────────
    // Local Spring Boot default. Change once here when deploying.
    // Examples:
    //   Local:  "http://localhost:8080"
    //   Server: "https://api.jobreadydash.gov.in"
    API_BASE_URL: 'http://localhost:8080',

    // ── Demo / Mock mode ───────────────────────────────────────
    // true  = UI works fully offline with sample data (hackathon demo).
    // false = UI calls the real backend via fetch().
    USE_MOCK_DATA: true,

    // Simulated network latency (ms) for mock responses so that
    // loading / skeleton states are visible during demos.
    MOCK_LATENCY_MS: 550,

    // ── API contract (do not change paths without backend sync) ─
    ENDPOINTS: {
      LOGIN: '/api/auth/login',                    // POST   { username, password } -> { token, role, username }
      PARTICIPANTS: '/api/participants',           // GET (list) | POST (create)
      PARTICIPANT_BY_ID: '/api/participants/{id}', // GET | PUT | DELETE (DELETE to be confirmed with backend)
      PLACEMENT_RATE: '/api/analytics/placement-rate', // GET ?district=All
      SKILL_GAPS: '/api/analytics/skill-gaps'          // GET ?district=All
    },

    // ── Session storage keys ───────────────────────────────────
    TOKEN_KEYS: {
      TOKEN: 'jrd_token',
      ROLE: 'jrd_role',
      USERNAME: 'jrd_username'
    },

    // ── Roles (must match backend `role` claim) ────────────────
    ROLES: {
      ADMIN: 'ADMIN',
      DATA_ENTRY: 'DATA_ENTRY',
      ANALYST: 'ANALYST'
    },

    ROLE_LABELS: {
      ADMIN: 'Administrator',
      DATA_ENTRY: 'Data Entry Operator',
      ANALYST: 'Analyst / Viewer'
    },

    // ── UI defaults ────────────────────────────────────────────
    PAGINATION: {
      DEFAULT_PAGE_SIZE: 8,
      PAGE_SIZE_OPTIONS: [8, 12, 20]
    },

    EMPLOYMENT_STATUSES: [
      'Employed',
      'Self-Employed',
      'Unemployed',
      'Pursuing Further Training',
      'Other'
    ],

    // Professional, color-blind-friendly chart palette
    CHART_COLORS: {
      primary: '#0F3B63',
      primaryLight: '#2F6FAD',
      accent: '#B45309',
      success: '#15803D',
      teal: '#0E7490',
      violet: '#6D28D9',
      slate: '#64748B',
      danger: '#B91C1C',
      palette: ['#0F3B63', '#15803D', '#B45309', '#0E7490', '#6D28D9', '#64748B', '#1D4ED8', '#9A3412']
    }
  };

  // Freeze top-level to prevent accidental mutation.
  Object.freeze(APP_CONFIG);
  Object.freeze(APP_CONFIG.ENDPOINTS);
  Object.freeze(APP_CONFIG.TOKEN_KEYS);
  Object.freeze(APP_CONFIG.ROLES);

  global.APP_CONFIG = APP_CONFIG;
})(window);
