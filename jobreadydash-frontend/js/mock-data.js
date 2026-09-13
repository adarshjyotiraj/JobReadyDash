/**
 * JobReadyDash (SIH26135) — Mock / Sample Data
 * ------------------------------------------------
 * Used ONLY when APP_CONFIG.USE_MOCK_DATA === true.
 * Mirrors the exact JSON shapes the Spring Boot backend must return,
 * so switching to the real API requires zero UI changes.
 *
 * Mock participant CRUD is persisted to localStorage so that
 * Add / Edit / Delete survives page refresh during demos.
 * Key: jrd_mock_participants_v1  (Reset via MockStore.reset())
 */

(function (global) {
  'use strict';

  const STORAGE_KEY = 'jrd_mock_participants_v1';

  /* ── Mock users (demo logins — NOT real credentials) ──────────
     Backend must implement: POST /api/auth/login
     Request : { "username": "...", "password": "..." }
     Response: { "token": "JWT", "role": "ADMIN|DATA_ENTRY|ANALYST", "username": "..." }
  */
  const MOCK_USERS = [
    { username: 'admin',    email: 'admin@jobready.gov.in',    password: 'admin123',   role: 'ADMIN',      name: 'A. Sharma' },
    { username: 'dataentry', email: 'dataentry@jobready.gov.in', password: 'data123',  role: 'DATA_ENTRY', name: 'R. Verma' },
    { username: 'analyst',  email: 'analyst@jobready.gov.in',  password: 'analyst123', role: 'ANALYST',    name: 'K. Iyer' }
  ];

  const MOCK_DISTRICTS = [
    'Jaipur', 'Lucknow', 'Patna', 'Bhopal', 'Pune', 'Ranchi', 'Surat', 'Coimbatore'
  ];

  const MOCK_PROGRAMS = [
    'Web Development',
    'Data Analytics',
    'Electrician Training',
    'Healthcare Assistant',
    'Retail & Sales',
    'Tailoring & Apparel',
    'Solar PV Technician',
    'Hospitality Management'
  ];

  const STATUS_META = {
    'Employed':                 { badge: 'bg-success',      icon: 'bi-briefcase-fill' },
    'Self-Employed':            { badge: 'bg-primary',      icon: 'bi-shop' },
    'Unemployed':               { badge: 'bg-danger',       icon: 'bi-person-x' },
    'Pursuing Further Training':{ badge: 'bg-warning text-dark', icon: 'bi-mortarboard' },
    'Other':                    { badge: 'bg-secondary',    icon: 'bi-three-dots' }
  };

  /* ── Seed participants (28 realistic records) ───────────────── */
  const SEED_PARTICIPANTS = [
    { id: 'JRD-1001', name: 'Aarav Sharma',      email: 'aarav.sharma@example.in',   phone: '+91 98290 11223', district: 'Jaipur',     program: 'Web Development',      status: 'Employed',                  enrollmentDate: '2025-06-12', employer: 'TechServe Solutions', salary: '₹22,000/mo' },
    { id: 'JRD-1002', name: 'Priya Verma',       email: 'priya.verma@example.in',    phone: '+91 94150 22334', district: 'Lucknow',    program: 'Data Analytics',       status: 'Employed',                  enrollmentDate: '2025-05-20', employer: 'Analytix Labs', salary: '₹26,500/mo' },
    { id: 'JRD-1003', name: 'Rahul Kumar',       email: 'rahul.kumar@example.in',    phone: '+91 97090 33445', district: 'Patna',      program: 'Electrician Training', status: 'Self-Employed',             enrollmentDate: '2025-04-08', employer: 'Self — RK Electricals', salary: '₹18,000/mo' },
    { id: 'JRD-1004', name: 'Sneha Patel',       email: 'sneha.patel@example.in',    phone: '+91 98980 44556', district: 'Surat',      program: 'Tailoring & Apparel',  status: 'Self-Employed',             enrollmentDate: '2025-07-01', employer: 'Self — Sneha Boutique', salary: '₹15,000/mo' },
    { id: 'JRD-1005', name: 'Amit Singh',        email: 'amit.singh@example.in',     phone: '+91 94250 55667', district: 'Bhopal',     program: 'Solar PV Technician',  status: 'Employed',                  enrollmentDate: '2025-03-15', employer: 'SunGrid Energy', salary: '₹20,000/mo' },
    { id: 'JRD-1006', name: 'Kavya Reddy',       email: 'kavya.reddy@example.in',    phone: '+91 98490 66778', district: 'Coimbatore', program: 'Healthcare Assistant', status: 'Employed',                  enrollmentDate: '2025-06-25', employer: 'CityCare Hospital', salary: '₹19,500/mo' },
    { id: 'JRD-1007', name: 'Mohammed Faizan',   email: 'm.faizan@example.in',       phone: '+91 98390 77889', district: 'Lucknow',    program: 'Retail & Sales',       status: 'Employed',                  enrollmentDate: '2025-05-02', employer: 'Reliance Retail', salary: '₹17,800/mo' },
    { id: 'JRD-1008', name: 'Anjali Gupta',      email: 'anjali.gupta@example.in',   phone: '+91 98260 88990', district: 'Bhopal',     program: 'Web Development',      status: 'Unemployed',                enrollmentDate: '2025-08-10', employer: '', salary: '' },
    { id: 'JRD-1009', name: 'Vikram Meena',      email: 'vikram.meena@example.in',   phone: '+91 94140 99001', district: 'Jaipur',     program: 'Electrician Training', status: 'Employed',                  enrollmentDate: '2025-02-18', employer: 'Raj Power Utilities', salary: '₹21,000/mo' },
    { id: 'JRD-1010', name: 'Neha Joshi',        email: 'neha.joshi@example.in',     phone: '+91 98270 10112', district: 'Pune',       program: 'Data Analytics',       status: 'Pursuing Further Training', enrollmentDate: '2025-07-22', employer: '', salary: '' },
    { id: 'JRD-1011', name: 'Suresh Yadav',      email: 'suresh.yadav@example.in',   phone: '+91 97920 21223', district: 'Patna',      program: 'Hospitality Management', status: 'Employed',                enrollmentDate: '2025-04-30', employer: 'Hotel Maurya Grand', salary: '₹18,500/mo' },
    { id: 'JRD-1012', name: 'Pooja Kumari',      email: 'pooja.kumari@example.in',   phone: '+91 94310 32334', district: 'Ranchi',     program: 'Healthcare Assistant', status: 'Unemployed',                enrollmentDate: '2025-08-05', employer: '', salary: '' },
    { id: 'JRD-1013', name: 'Arjun Nair',        email: 'arjun.nair@example.in',     phone: '+91 98470 43445', district: 'Coimbatore', program: 'Web Development',      status: 'Employed',                  enrollmentDate: '2025-03-28', employer: 'Zoho Partner Studio', salary: '₹28,000/mo' },
    { id: 'JRD-1014', name: 'Divya Menon',       email: 'divya.menon@example.in',    phone: '+91 98950 54556', district: 'Coimbatore', program: 'Retail & Sales',       status: 'Employed',                  enrollmentDate: '2025-06-05', employer: 'DMart Retail', salary: '₹17,200/mo' },
    { id: 'JRD-1015', name: 'Karan Singh',       email: 'karan.singh@example.in',    phone: '+91 98110 65667', district: 'Jaipur',     program: 'Solar PV Technician',  status: 'Self-Employed',             enrollmentDate: '2025-05-14', employer: 'Self — Karan Solar Works', salary: '₹24,000/mo' },
    { id: 'JRD-1016', name: 'Ritu Agarwal',      email: 'ritu.agarwal@example.in',   phone: '+91 98290 76778', district: 'Lucknow',    program: 'Tailoring & Apparel',  status: 'Employed',                  enrollmentDate: '2025-02-25', employer: 'FabIndia Supply Unit', salary: '₹16,500/mo' },
    { id: 'JRD-1017', name: 'Manoj Tiwari',      email: 'manoj.tiwari@example.in',   phone: '+91 94150 87889', district: 'Bhopal',     program: 'Electrician Training', status: 'Unemployed',                enrollmentDate: '2025-08-18', employer: '', salary: '' },
    { id: 'JRD-1018', name: 'Shalini Das',       email: 'shalini.das@example.in',    phone: '+91 94350 98990', district: 'Ranchi',     program: 'Data Analytics',       status: 'Employed',                  enrollmentDate: '2025-04-12', employer: 'TCS BPS Analytics', salary: '₹25,000/mo' },
    { id: 'JRD-1019', name: 'Rohit Chauhan',     email: 'rohit.chauhan@example.in',  phone: '+91 98930 10021', district: 'Pune',       program: 'Hospitality Management', status: 'Employed',                enrollmentDate: '2025-03-03', employer: 'Sayaji Hotels', salary: '₹19,000/mo' },
    { id: 'JRD-1020', name: 'Ishita Rao',        email: 'ishita.rao@example.in',     phone: '+91 98220 21132', district: 'Pune',       program: 'Web Development',      status: 'Pursuing Further Training', enrollmentDate: '2025-07-30', employer: '', salary: '' },
    { id: 'JRD-1021', name: 'Deepak Pal',        email: 'deepak.pal@example.in',     phone: '+91 94120 32243', district: 'Lucknow',    program: 'Solar PV Technician',  status: 'Employed',                  enrollmentDate: '2025-05-27', employer: 'Loom Solar Partners', salary: '₹20,800/mo' },
    { id: 'JRD-1022', name: 'Sunita Devi',       email: 'sunita.devi@example.in',    phone: '+91 97080 43354', district: 'Patna',      program: 'Tailoring & Apparel',  status: 'Self-Employed',             enrollmentDate: '2025-06-18', employer: 'Self — Sunita Stitching', salary: '₹12,500/mo' },
    { id: 'JRD-1023', name: 'Harsh Vardhan',     email: 'harsh.vardhan@example.in',  phone: '+91 98280 54465', district: 'Jaipur',     program: 'Retail & Sales',       status: 'Unemployed',                enrollmentDate: '2025-08-22', employer: '', salary: '' },
    { id: 'JRD-1024', name: 'Lakshmi Narayanan', email: 'lakshmi.n@example.in',      phone: '+91 98420 65576', district: 'Coimbatore', program: 'Healthcare Assistant', status: 'Employed',                  enrollmentDate: '2025-04-20', employer: 'KMCH Hospitals', salary: '₹21,500/mo' },
    { id: 'JRD-1025', name: 'Imran Khan',        email: 'imran.khan@example.in',     phone: '+91 98910 76687', district: 'Bhopal',     program: 'Web Development',      status: 'Employed',                  enrollmentDate: '2025-03-10', employer: 'Freelance / Upwork', salary: '₹30,000/mo' },
    { id: 'JRD-1026', name: 'Gita Mahato',       email: 'gita.mahato@example.in',    phone: '+91 94370 87798', district: 'Ranchi',     program: 'Retail & Sales',       status: 'Pursuing Further Training', enrollmentDate: '2025-07-14', employer: '', salary: '' },
    { id: 'JRD-1027', name: 'Nilesh Patil',      email: 'nilesh.patil@example.in',   phone: '+91 98230 98909', district: 'Surat',      program: 'Electrician Training', status: 'Other',                     enrollmentDate: '2025-05-08', employer: '', salary: '' },
    { id: 'JRD-1028', name: 'Farah Sheikh',      email: 'farah.sheikh@example.in',   phone: '+91 98980 10010', district: 'Surat',      program: 'Data Analytics',       status: 'Self-Employed',             enrollmentDate: '2025-06-30', employer: 'Self — Data Freelancer', salary: '₹27,000/mo' }
  ];

  /* ── Skill gaps (top skills, demand vs supply %) ──────────────
     Backend: GET /api/analytics/skill-gaps?district=All
     Response: [{ "skill": "...", "demand": 82, "supply": 41, "gap": 41, "category": "..." }]
  */
  const SEED_SKILL_GAPS = [
    { skill: 'Data Analytics & Excel',       demand: 82, supply: 41, gap: 41, category: 'Digital' },
    { skill: 'Industrial Welding',            demand: 76, supply: 38, gap: 38, category: 'Technical Trade' },
    { skill: 'EV Repair & Maintenance',       demand: 71, supply: 34, gap: 37, category: 'Technical Trade' },
    { skill: 'Digital Literacy',              demand: 88, supply: 55, gap: 33, category: 'Foundational' },
    { skill: 'Spoken English & Communication',demand: 79, supply: 48, gap: 31, category: 'Soft Skills' },
    { skill: 'Solar PV Installation',         demand: 68, supply: 42, gap: 26, category: 'Green Jobs' },
    { skill: 'Healthcare Assistance',         demand: 64, supply: 44, gap: 20, category: 'Healthcare' },
    { skill: 'Retail & Customer Service',     demand: 58, supply: 45, gap: 13, category: 'Services' }
  ];

  /* Monthly placement trend (last 6 months) */
  const SEED_TREND = [
    { month: 'Apr 2026', placed: 42, enrolled: 68 },
    { month: 'May 2026', placed: 51, enrolled: 74 },
    { month: 'Jun 2026', placed: 47, enrolled: 71 },
    { month: 'Jul 2026', placed: 58, enrolled: 80 },
    { month: 'Aug 2026', placed: 63, enrolled: 85 },
    { month: 'Sep 2026', placed: 55, enrolled: 77 }
  ];

  /* ── Persistent mock store (CRUD survives refresh) ──────────── */
  const MockStore = {
    _read() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length) return parsed;
        }
      } catch (e) { /* corrupted storage -> reseed */ }
      return JSON.parse(JSON.stringify(SEED_PARTICIPANTS));
    },
    _write(rows) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(rows)); } catch (e) {}
    },
    all() {
      return this._read();
    },
    reset() {
      localStorage.removeItem(STORAGE_KEY);
      return this._read();
    },
    nextId(rows) {
      let max = 1000;
      rows.forEach(r => {
        const n = parseInt(String(r.id).replace(/\D/g, ''), 10);
        if (!isNaN(n) && n > max) max = n;
      });
      return 'JRD-' + (max + 1);
    }
  };

  function computePlacement(rows) {
    const total = rows.length;
    const employed = rows.filter(r => r.status === 'Employed').length;
    const selfEmployed = rows.filter(r => r.status === 'Self-Employed').length;
    const unemployed = rows.filter(r => r.status === 'Unemployed').length;
    const training = rows.filter(r => r.status === 'Pursuing Further Training').length;
    const other = rows.filter(r => r.status === 'Other').length;
    const placed = employed + selfEmployed;
    const rate = total ? +(placed / total * 100).toFixed(1) : 0;
    return { total, employed, selfEmployed, unemployed, training, other, placed, rate };
  }

  function districtBreakdown(rows) {
    const map = {};
    rows.forEach(r => {
      if (!map[r.district]) map[r.district] = { district: r.district, total: 0, placed: 0 };
      map[r.district].total += 1;
      if (r.status === 'Employed' || r.status === 'Self-Employed') map[r.district].placed += 1;
    });
    return Object.values(map)
      .map(d => ({ ...d, rate: d.total ? +(d.placed / d.total * 100).toFixed(1) : 0 }))
      .sort((a, b) => b.rate - a.rate);
  }

  /** Deterministic per-district variation so filters feel real. */
  function skillGapsFor(district) {
    if (!district || district === 'All') return JSON.parse(JSON.stringify(SEED_SKILL_GAPS));
    let hash = 0;
    for (let i = 0; i < district.length; i++) hash = (hash * 31 + district.charCodeAt(i)) % 97;
    const shift = (hash % 9) - 4; // -4..+4
    return SEED_SKILL_GAPS.map(s => {
      const supply = Math.min(95, Math.max(5, s.supply + shift));
      return { ...s, supply, gap: Math.max(0, s.demand - supply) };
    }).sort((a, b) => b.gap - a.gap);
  }

  function mockDelay() {
    const ms = (global.APP_CONFIG && global.APP_CONFIG.MOCK_LATENCY_MS) || 500;
    return new Promise(res => setTimeout(res, ms));
  }

  global.MockData = {
    MOCK_USERS, MOCK_DISTRICTS, MOCK_PROGRAMS, STATUS_META,
    SEED_TREND, SEED_SKILL_GAPS,
    MockStore, computePlacement, districtBreakdown, skillGapsFor, mockDelay
  };
})(window);
