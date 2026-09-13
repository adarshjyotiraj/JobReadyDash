/**
 * JobReadyDash (SIH26135) — Dashboard page logic
 * ------------------------------------------------
 * Loads: KPI cards, Placement Overview chart, Skill Gap chart,
 * recent participants, district performance.
 *
 * Data sources (via window.api — mock or real, decided in config.js):
 *   api.getPlacementRate()  -> GET /api/analytics/placement-rate
 *   api.getSkillGaps()      -> GET /api/analytics/skill-gaps
 *   api.getParticipants()   -> GET /api/participants
 */

(function () {
  'use strict';

  let placementChart = null;
  let skillChart = null;

  document.addEventListener('DOMContentLoaded', () => {
    if (!window.Auth.initProtectedPage('dashboard')) return;
    setupChartDefaults();
    bindEvents();
    loadDashboard();
  });

  function setupChartDefaults() {
    if (!window.Chart) return;
    Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = '#64748b';
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.boxWidth = 8;
    Chart.defaults.plugins.legend.labels.boxHeight = 8;
    Chart.defaults.plugins.legend.labels.padding = 16;
  }

  function bindEvents() {
    const retry = document.getElementById('retryBtn');
    if (retry) retry.addEventListener('click', loadDashboard);
    const refresh = document.getElementById('refreshDashboardBtn');
    if (refresh) refresh.addEventListener('click', () => { loadDashboard(); });
    const search = document.getElementById('topbarSearch');
    if (search) {
      search.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          window.location.href = 'participants.html?q=' + encodeURIComponent(search.value.trim());
        }
      });
    }
  }

  /* ── Main loader ────────────────────────────────────────────── */
  async function loadDashboard() {
    setLoading(true);
    hideError();
    try {
      const [placement, gaps, participants] = await Promise.all([
        window.api.getPlacementRate({ district: 'All' }),
        window.api.getSkillGaps({ district: 'All' }),
        window.api.getParticipants()
      ]);
      renderKPIs(placement, participants);
      renderPlacementChart(placement);
      renderSkillChart(gaps.slice(0, 5));
      renderRecent(participants.slice(0, 5));
      renderDistricts(placement.districtWise || []);
      document.getElementById('lastUpdated').textContent =
        'Last updated ' + new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch (err) {
      console.error(err);
      showError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }

  function setLoading(isLoading) {
    document.querySelectorAll('[data-skeleton]').forEach(el => {
      el.classList.toggle('skeleton', isLoading);
    });
    ['kpiRow', 'placementChartBox', 'skillChartBox', 'recentWrap', 'districtWrap'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.opacity = isLoading ? '0.55' : '1';
    });
    const spinner = document.getElementById('dashboardSpinner');
    if (spinner) spinner.style.display = isLoading ? '' : 'none';
  }

  function showError(msg) {
    const box = document.getElementById('dashboardError');
    if (!box) return;
    box.style.display = '';
    const txt = document.getElementById('dashboardErrorMsg');
    if (txt) txt.textContent = msg;
    window.UI.toast(msg, 'error');
  }
  function hideError() {
    const box = document.getElementById('dashboardError');
    if (box) box.style.display = 'none';
  }

  /* ── KPIs ───────────────────────────────────────────────────── */
  function animateValue(el, target, suffix) {
    suffix = suffix || '';
    const duration = 700;
    const start = performance.now();
    const from = 0;
    function frame(now) {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = from + (target - from) * eased;
      el.textContent = (target % 1 !== 0 ? val.toFixed(1) : Math.round(val).toLocaleString('en-IN')) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function renderKPIs(placement, participants) {
    const programs = new Set((participants || []).map(p => p.program)).size;
    animateValue(document.getElementById('kpiTotal'), placement.total || 0);
    animateValue(document.getElementById('kpiRate'), placement.rate || 0, '%');
    animateValue(document.getElementById('kpiEmployed'), (placement.employed || 0) + (placement.selfEmployed || 0));
    animateValue(document.getElementById('kpiUnemployed'), placement.unemployed || 0);

    const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    set('kpiTotalSub', programs + ' training programs');
    set('kpiRateSub', (placement.placed || 0) + ' of ' + (placement.total || 0) + ' placed');
    set('kpiEmployedSub', (placement.employed || 0) + ' employed · ' + (placement.selfEmployed || 0) + ' self-employed');
    set('kpiUnemployedSub', (placement.training || 0) + ' in further training');
  }

  /* ── Chart 1: Placement / Employment Overview (doughnut) ────── */
  function renderPlacementChart(placement) {
    const canvas = document.getElementById('placementChart');
    if (!canvas || !window.Chart) return;
    if (placementChart) placementChart.destroy();

    const c = window.APP_CONFIG.CHART_COLORS;
    const data = [
      placement.employed || 0,
      placement.selfEmployed || 0,
      placement.unemployed || 0,
      placement.training || 0,
      placement.other || 0
    ];
    placementChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Employed', 'Self-Employed', 'Unemployed', 'Further Training', 'Other'],
        datasets: [{
          data,
          backgroundColor: [c.success, c.primary, c.danger, c.accent, c.slate],
          borderColor: '#ffffff',
          borderWidth: 3,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '64%',
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: ctx => ' ' + ctx.label + ': ' + ctx.parsed + ' (' +
                (placement.total ? (ctx.parsed / placement.total * 100).toFixed(1) : 0) + '%)'
            }
          }
        }
      }
    });

    const center = document.getElementById('placementCenter');
    if (center) {
      center.innerHTML =
        '<div style="font-size:1.7rem;font-weight:800;color:#0b2c4a">' +
        window.UI.escapeHtml(String(placement.rate || 0)) + '%</div>' +
        '<div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b">Placement rate</div>';
    }

    // Side legend totals
    const legend = document.getElementById('placementLegend');
    if (legend) {
      const rows = [
        ['Employed', placement.employed, c.success],
        ['Self-Employed', placement.selfEmployed, c.primary],
        ['Unemployed', placement.unemployed, c.danger],
        ['Further Training', placement.training, c.accent],
        ['Other', placement.other, c.slate]
      ];
      legend.innerHTML = rows.map(([label, val, color]) =>
        '<div class="d-flex align-items-center justify-content-between py-1">' +
          '<span class="d-flex align-items-center gap-2 small"><span class="legend-dot" style="background:' + color + '"></span>' +
          window.UI.escapeHtml(label) + '</span>' +
          '<strong>' + window.UI.formatNumber(val) + '</strong>' +
        '</div>'
      ).join('');
    }
  }

  /* ── Chart 2: Skill Gap Analysis (horizontal grouped bar) ───── */
  function renderSkillChart(top5) {
    const canvas = document.getElementById('skillChart');
    if (!canvas || !window.Chart) return;
    if (skillChart) skillChart.destroy();

    const c = window.APP_CONFIG.CHART_COLORS;
    skillChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: top5.map(s => s.skill),
        datasets: [
          {
            label: 'Industry demand (%)',
            data: top5.map(s => s.demand),
            backgroundColor: c.primary,
            borderRadius: 5,
            barPercentage: 0.55,
            categoryPercentage: 0.62
          },
          {
            label: 'Trained supply (%)',
            data: top5.map(s => s.supply),
            backgroundColor: '#c9d8ea',
            borderRadius: 5,
            barPercentage: 0.55,
            categoryPercentage: 0.62
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              afterBody: items => {
                const i = items[0].dataIndex;
                return 'Gap: ' + top5[i].gap + ' pts';
              }
            }
          }
        },
        scales: {
          x: { max: 100, grid: { color: '#eef2f7' }, ticks: { callback: v => v + '%' } },
          y: { grid: { display: false }, ticks: { font: { size: 11, weight: '600' }, color: '#334155' } }
        }
      }
    });
  }

  /* ── Recent participants ────────────────────────────────────── */
  function statusBadge(status) {
    const meta = (window.MockData && window.MockData.STATUS_META[status]) || { badge: 'bg-secondary' };
    return '<span class="badge status-badge ' + meta.badge + '">' +
      window.UI.escapeHtml(status) + '</span>';
  }

  function renderRecent(rows) {
    const tbody = document.getElementById('recentBody');
    if (!tbody) return;
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No participants yet.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(p => {
      const initials = p.name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
      return '<tr>' +
        '<td><div class="d-flex align-items-center gap-2"><span class="table-avatar">' +
        window.UI.escapeHtml(initials) + '</span><strong>' + window.UI.escapeHtml(p.name) + '</strong></div></td>' +
        '<td class="text-muted">' + window.UI.escapeHtml(p.district) + '</td>' +
        '<td class="text-muted">' + window.UI.escapeHtml(p.program) + '</td>' +
        '<td>' + statusBadge(p.status) + '</td>' +
        '<td class="text-end"><a href="participants.html?q=' + encodeURIComponent(p.id) + '" class="btn btn-sm btn-outline-primary">View</a></td>' +
      '</tr>';
    }).join('');
  }

  /* ── District performance ───────────────────────────────────── */
  function renderDistricts(list) {
    const wrap = document.getElementById('districtList');
    if (!wrap) return;
    if (!list.length) {
      wrap.innerHTML = '<p class="text-muted small mb-0">No district data available.</p>';
      return;
    }
    wrap.innerHTML = list.slice(0, 6).map(d => {
      const color = d.rate >= 70 ? '#15803d' : d.rate >= 50 ? '#b45309' : '#b91c1c';
      return '<div class="district-row">' +
        '<div style="min-width:110px"><strong class="small">' + window.UI.escapeHtml(d.district) + '</strong>' +
        '<div class="text-muted" style="font-size:0.72rem">' + d.placed + '/' + d.total + ' placed</div></div>' +
        '<div class="progress flex-grow-1" style="height:8px"><div class="progress-bar" style="width:' + d.rate + '%;background:' + color + '"></div></div>' +
        '<strong class="small" style="min-width:48px;text-align:right">' + d.rate + '%</strong>' +
      '</div>';
    }).join('');
  }
})();
