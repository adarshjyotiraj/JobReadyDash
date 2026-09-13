# JobReadyDash (SIH26135) — Frontend

Government-grade employment outcome tracking dashboard for skilling programs.
**Smart India Hackathon 2026 · MVP demo build.**

> Frontend only. No backend / database / Docker / framework code here.
> Built with **HTML5 + CSS3 + Vanilla JS + Bootstrap 5 + Chart.js**.
> Runs by opening the files or with any basic static server.

---

## 1. Folder structure

```
jobreadydash-frontend/
│
├── index.html            # PAGE 1 — Login (JWT + mock demo logins)
├── dashboard.html        # PAGE 2 — KPIs + 2 Chart.js visualizations
├── participants.html     # PAGE 3 — Table, search/sort/filter/pagination, Add/Edit/View/Delete
├── analytics.html        # PAGE 4 — Placement summary, distribution, trends, skill gaps, district filter
│
├── css/
│   ├── style.css         # Global design system (cards, tables, forms, login, toasts, skeletons)
│   ├── dashboard.css     # App shell: sidebar, topbar, main layout
│   └── responsive.css    # Tablet / mobile / print rules
│
├── js/
│   ├── config.js         # ★ API_BASE_URL, USE_MOCK_DATA, endpoints, roles — CHANGE BACKEND URL HERE
│   ├── mock-data.js      # ★ Sample participants, placement, skill gaps, districts (offline demo)
│   ├── api.js            # ★ Central API service layer — ONLY file that talks to the backend
│   ├── auth.js           # Session (JWT), role guards, toasts, sidebar, logout, XSS-safe helpers
│   ├── dashboard.js      # Dashboard KPIs + charts + recent/district widgets
│   ├── participants.js   # Participant CRUD UI + validation + CSV export
│   └── analytics.js      # Analytics filters + charts + Top-5 table
│
├── assets/
│   └── images/
│       └── logo.svg
│
└── README.md             # This file
```

---

## 2. How to run locally

### Option A — Just open it (simplest, fine for demo)
1. Unzip / clone this folder.
2. Double-click **`index.html`** → it opens in your browser.
3. Sign in with a demo account (see below).

> Opening via `file://` works because everything is CDN + relative paths.
> For the most reliable behavior (and to preview like a deployed site), use Option B.

### Option B — Basic local server (recommended)
Any static server works. Pick one:

```bash
# Python (pre-installed on most systems)
cd jobreadydash-frontend
python -m http.server 5500
# then open http://localhost:5500/index.html
```

```bash
# VS Code: install "Live Server" extension → right-click index.html → "Open with Live Server"
```

```bash
# Node (only as a static server — the project itself uses NO Node/React/build step)
npx serve jobreadydash-frontend
```

No build, no `npm install`, no compilation needed.

---

## 3. Mock mode (demo without backend)

The app ships in **demo mode** so the full flow works with zero backend:

- `js/config.js` → `USE_MOCK_DATA: true` (default)
- All API calls are intercepted in `js/api.js` and answered from `js/mock-data.js` after ~550ms simulated latency.
- Participant **Add / Edit / Delete persists to `localStorage`** (`jrd_mock_participants_v1`) so changes survive refresh during your demo.
- To reset demo data: open DevTools console → `MockData.MockStore.reset()` → refresh.

### Demo logins (mock users — not real credentials)

| Role | Username | Password | Access |
|------|----------|----------|--------|
| Admin | `admin` | `admin123` | Dashboard + Participants (add/edit/delete) + Analytics |
| Data Entry | `dataentry` | `data123` | Dashboard + Participants (add/edit, no delete) |
| Analyst / Viewer | `analyst` | `analyst123` | Dashboard + Analytics + Participants (read-only) |

You can also use the emails: `admin@jobready.gov.in`, `dataentry@jobready.gov.in`, `analyst@jobready.gov.in` with the same passwords.

> Tip: on the login page, click the **Admin / Data Entry / Analyst** quick-fill buttons, then Sign in.

---

## 4. Backend integration (for the Spring Boot developer)

### 4.1 — Where to connect (only 2 steps)

**Step 1 — Point the frontend at your server.**
Open `js/config.js` and set:

```js
API_BASE_URL: "http://localhost:8080",  // ← your Spring Boot host:port
USE_MOCK_DATA: false,                   // ← switch OFF mock mode
```

That's it. Every API call in the app flows through `js/api.js` and uses `API_BASE_URL` automatically. No HTML file contains hard-coded URLs.

**Step 2 — Implement the 6 endpoints below** (path, method, request & response shapes must match).

### 4.2 — Auth header (frontend already sends this)

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

- JWT is obtained from `POST /api/auth/login` and stored in `localStorage` (`jrd_token`).
- Cleared automatically on logout and on HTTP `401` (session-expired redirect to login).
- **CORS:** enable the frontend origin in Spring Boot (e.g. `http://localhost:5500` + `http://localhost:8080`), otherwise browsers will block requests.

### 4.3 — API contracts (backend MUST follow these)

#### `POST /api/auth/login` — Login
Request:
```json
{ "username": "admin", "password": "admin123" }
```
Response `200`:
```json
{ "token": "JWT_TOKEN", "role": "ADMIN", "username": "admin" }
```
- `role` must be exactly one of: `"ADMIN"`, `"DATA_ENTRY"`, `"ANALYST"`.
- Invalid credentials → `401` with `{ "message": "Invalid username or password." }`.

#### `GET /api/participants` — List participants
Response `200` (array):
```json
[
  {
    "id": "JRD-1001",
    "name": "Aarav Sharma",
    "email": "aarav.sharma@example.in",
    "phone": "+91 98290 11223",
    "district": "Jaipur",
    "program": "Web Development",
    "status": "Employed",
    "enrollmentDate": "2025-06-12",
    "employer": "TechServe Solutions",
    "salary": "₹22,000/mo"
  }
]
```
- `status` must be one of: `"Employed"`, `"Self-Employed"`, `"Unemployed"`, `"Pursuing Further Training"`, `"Other"`.

#### `POST /api/participants` — Create participant
Request:
```json
{ "name": "...", "email": "...", "phone": "...", "district": "Jaipur", "program": "Web Development", "status": "Unemployed" }
```
Response `200/201`: the created object (with server-generated `id`).

#### `PUT /api/participants/{id}` — Update participant
Request: same fields as create (partial or full).
Response `200`: the updated object. Unknown id → `404`.

#### `DELETE /api/participants/{id}` — Delete participant
> The MVP endpoint list did not explicitly specify DELETE. The frontend isolates it in **one place** so it can be adjusted without touching any page:
> `js/config.js` → `ENDPOINTS.PARTICIPANT_BY_ID` + `js/api.js` → `api.deleteParticipant()`.
> Confirm the final path/method with the backend team (recommended: `DELETE /api/participants/{id}` → `200 { "success": true }` or `204`).

#### `GET /api/analytics/placement-rate?district=All` — Placement summary
Response `200`:
```json
{
  "total": 28, "employed": 14, "selfEmployed": 5,
  "unemployed": 5, "training": 3, "other": 1,
  "placed": 19, "rate": 67.9, "district": "All",
  "districtWise": [
    { "district": "Jaipur", "total": 4, "placed": 3, "rate": 75.0 }
  ],
  "trend": [
    { "month": "Apr 2026", "placed": 42, "enrolled": 68 }
  ]
}
```
- When `?district=Jaipur` is passed, top-level totals should reflect **that district only** (frontend already sends the query param).

#### `GET /api/analytics/skill-gaps?district=All` — Skill gaps
Response `200` (array, sorted by `gap` desc):
```json
[
  { "skill": "Data Analytics & Excel", "demand": 82, "supply": 41, "gap": 41, "category": "Digital" }
]
```

### 4.4 — Backend checklist (Spring Security + JWT)
- [ ] `POST /api/auth/login` returns `{ token, role, username }`; roles exactly `ADMIN` / `DATA_ENTRY` / `ANALYST`.
- [ ] JWT validated on every `/api/**` request; expired/invalid → `401` (frontend auto-redirects to login).
- [ ] Authorization enforced server-side (never trust the frontend's hiding of buttons):
  - `ANALYST`: read-only (`GET` only).
  - `DATA_ENTRY`: `GET` + `POST` + `PUT` on participants (delete = admin-only recommended).
  - `ADMIN`: full access.
- [ ] CORS allows the frontend origin; `Authorization` header exposed.
- [ ] Validation errors → `400` with `{ "message": "..." }` (frontend surfaces `message` in a toast).

---

## 5. Role-based UI (frontend guards — UX only, backend is the real security)

| Capability | ADMIN | DATA_ENTRY | ANALYST |
|------------|:-----:|:----------:|:-------:|
| Dashboard (KPIs + charts) | ✅ | ✅ | ✅ |
| Participants — view/search/filter | ✅ | ✅ | ✅ |
| Participants — add / edit | ✅ | ✅ | ❌ (hidden) |
| Participants — delete | ✅ | ❌ (hidden) | ❌ (hidden) |
| Analytics page | ✅ | ❌ (nav hidden, route guarded) | ✅ |

Implemented in `js/auth.js` → `Auth.applyRoleGuards()` via `data-require-manage`, `data-require-delete`, `data-require-analytics` attributes.

---

## 6. Testing checklist (demo rehearsal)

Login:
- [ ] Empty form → inline validation messages appear.
- [ ] Wrong password → red "Invalid username or password" alert (no `alert()` popup).
- [ ] Show/hide password toggle works.
- [ ] Each demo role logs in → lands on `dashboard.html`; JWT + role in `localStorage`.
- [ ] Refresh on dashboard → stays signed in; direct open of `dashboard.html` without login → redirects to `index.html`.

Dashboard:
- [ ] 4 KPI cards animate and show numbers (Total, Placement %, Employed, Unemployed).
- [ ] Doughnut "Placement Overview" + center % + side legend render.
- [ ] Horizontal "Top 5 Skill Gaps" (demand vs supply) renders.
- [ ] Recent participants + district performance load; Refresh button re-loads; Retry appears on simulated failure.

Participants:
- [ ] Search filters live (try `JRD-1001`, `patna`, `unemployed`).
- [ ] Status / district / program filters + clear-filters work; result count updates.
- [ ] Column sort toggles asc/desc (click Name, District…).
- [ ] Pagination prev/next/pages + rows-per-page work.
- [ ] Add → validation blocks bad email/phone → success toast → row appears.
- [ ] View → detail modal; Edit → pre-filled → save → toast.
- [ ] Delete (admin only) → confirmation modal → toast → row removed.
- [ ] Export CSV downloads filtered rows.
- [ ] Analyst login → Add/Edit/Delete buttons hidden (read-only).
- [ ] Resize to mobile → sidebar collapses (hamburger), table scrolls horizontally, KPIs stack.

Analytics:
- [ ] District dropdown (All + 8 districts) reloads all cards/charts/table.
- [ ] Placement summary %, verdict badge, tiles, distribution bars, district chart, trend line, gap chart + Top-5 table all render.
- [ ] Print report opens print view (nav hidden).
- [ ] Data Entry login → analytics nav hidden; direct URL redirects to dashboard.

Logout / session:
- [ ] Logout → confirmation modal → lands on login with "signed out" notice; storage cleared.
- [ ] (Real-backend mode) expired token → `401` → auto-redirect with "session expired" notice.

---

## 7. Tech & conventions

- **Stack:** HTML5 · CSS3 · Vanilla JS · Bootstrap 5.3 · Chart.js 4 · Bootstrap Icons. No Tailwind, no framework, no build step.
- **No `fetch()` outside `js/api.js`.** Pages call `api.login()`, `api.getParticipants()`, `api.createParticipant()`, `api.updateParticipant()`, `api.deleteParticipant()`, `api.getPlacementRate()`, `api.getSkillGaps()`.
- **No `innerHTML` with raw API strings** — everything passes through `UI.escapeHtml()`.
- **No `alert()`** — all feedback via Bootstrap toasts, inline validation, modals, empty/error states.
- **Config in one place** — backend URL, mock toggle, endpoints, roles, storage keys all live in `js/config.js`.

Good luck with the SIH 2026 demo! 🚀
