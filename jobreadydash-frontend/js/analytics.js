/**
 * JobReadyDash (SIH26135) — Analytics page logic
 * ------------------------------------------------
 * Placement summary, employment distribution, district-wise
 * comparison, monthly trend and Top-5 skill gaps with a
 * district filter.
 *
 * Backend (via window.api):
 *   GET /api/analytics/placement-rate?district=...
 *   GET /api/analytics/skill-gaps?district=...
 */

(function () {
  'use strict';

  let distChart = null;
  let trendChart = null;
  let gapChart = null;

  const state = { district: 'All' };

  document.addEventListener('DOMContentLoaded', () => {
    if (!window.Auth.initProtectedPage('analytics')) return;
    // DATA_ENTRY has no analytics access (UI guard; backend enforces too)
    if (window.Auth.getRole() === 'DATA_ENTRY') {
      window.location.href = 'dashboard.html';
      return;
    }
    setupChartDefaults();
    buildDistrictFilter();
    bindEvents();
    loadAnalytics();
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

  function buildDistrictFilter() {
    const sel = document.getElementById('districtSelect');
    if (!sel) return;
    window.MockData.MOCK_DISTRICTS.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d; opt.textContent = d;
      sel.appendChild(opt);
    });
  }

  function bindEvents() {
    const sel = document.getElementById('districtSelect');
    if (sel) sel.addEventListener('change', () => {
      state.district = sel.value;
      loadAnalytics();
    });
    const retry = document.getElementById('analyticsRetry');
    if (retry) retry.addEventListener('click', loadAnalytics);
    const printBtn = document.getElementById('printReportBtn');
    if (printBtn) printBtn.addEventListener('click', () => window.print());
    const resetBtn = document.getElementById('resetDistrictBtn');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      state.district = 'All';
      if (sel) sel.value = 'All';
      loadAnalytics();
    });
  }

  /* ── Loader ─────────────────────────────────────────────────── */
  async function loadAnalytics() {
    setLoading(true);
    hideError();
    const label = document.getElementById('scopeLabel');
    if (label) label.textContent = state.district === 'All' ? 'All Districts' : state.district;

    try {
      const [placement, gaps] = await Promise.all([
        window.api.getPlacementRate({ district: state.district }),
        window.api.getSkillGaps({ district: state.district })
      ]);
      renderSummary(placement);
      renderDistribution(placement);
      renderDistrictChart(placement.districtWise || []);
      renderTrendChart(placement.trend || []);
      renderGapChart(gaps.slice(0, 5));
      renderGapTable(gaps.slice(0, 5));
    } catch (err) {
      console.error(err);
      showError(err.message || 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  }

  function setLoading(loading) {
    document.querySelectorAll('[data-skeleton]').forEach(el => {
      el.classList.toggle('skeleton', loading);
    });
    const spinner = document.getElementById('analyticsSpinner');
    if (spinner) spinner.style.display = loading ? '' : 'none';
  }

  function showError(msg) {
    const box = document.getElementById('analyticsError');
    if (!box) return;
    box.style.display = '';
    document.getElementById('analyticsErrorMsg').textContent = msg;
    window.UI.toast(msg, 'error');
  }
  function hideError() {
    const box = document.getElementById('analyticsError');
    if (box) box.style.display = 'none';
  }

  /* ── Summary tiles ──────────────────────────────────────────── */
  function renderSummary(p) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('aRate', (p.rate || 0) + '%');
    set('aTotal', window.UI.formatNumber(p.total));
    set('aPlaced', window.UI.formatNumber(p.placed));
    set('aUnemployed', window.UI.formatNumber(p.unemployed));
    set('aSelf', window.UI.formatNumber(p.selfEmployed));
    set('aTraining', window.UI.formatNumber(p.training));

    const bar = document.getElementById('aRateBar');
    if (bar) {
      bar.style.width = (p.rate || 0) + '%';
      bar.className = 'progress-bar ' + ((p.rate || 0) >= 70 ? 'bg-success' : (p.rate || 0) >= 50 ? 'bg-warning' : 'bg-danger');
    }
    const verdict = document.getElementById('aVerdict');
    if (verdict) {
      const r = p.rate || 0;
      verdict.textContent = r >= 70 ? 'Above target (≥70%)' : r >= 50 ? 'Near target — needs attention' : 'Below target — intervention needed';
      verdict.className = 'badge ' + (r >= 70 ? 'bg-success' : r >= 50 ? 'bg-warning text-dark' : 'bg-danger');
    }
  }

  /* ── Employment distribution (progress breakdown) ───────────── */
  function renderDistribution(p) {
    const wrap = document.getElementById('distBreakdown');
    if (!wrap) return;
    const total = p.total || 1;
    const rows = [
      ['Employed', p.employed, '#15803d'],
      ['Self-Employed', p.selfEmployed, '#0f3b63'],
      ['Unemployed', p.unemployed, '#b91c1c'],
      ['Further Training', p.training, '#b45309'],
      ['Other', p.other, '#64748b']
    ];
    wrap.innerHTML = rows.map(([label, val, color]) => {
      const pct = ((val || 0) / total * 100).toFixed(1);
      return '<div class="mb-3">' +
        '<div class="d-flex justify-content-between align-items-center mb-1">' +
          '<span class="small fw-semibold"><span class="legend-dot me-1" style="background:' + color + '"></span>' +
          window.UI.escapeHtml(label) + '</span>' +
          '<span class="small"><strong>' + window.UI.formatNumber(val) + '</strong> <span class="text-muted">(' + pct + '%)</span></span>' +
        '</div>' +
        '<div class="progress" style="height:8px"><div class="progress-bar" style="width:' + pct + '%;background:' + color + '"></div></div>' +
      '</div>';
    }).join('');
  }

  /* ── District comparison chart ──────────────────────────────── */
  function renderDistrictChart(districtWise) {
    const canvas = document.getElementById('districtChart');
    if (!canvas || !window.Chart) return;
    if (distChart) distChart.destroy();
    const c = window.APP_CONFIG.CHART_COLORS;
    const top = districtWise.slice(0, 8);
    distChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: top.map(d => d.district),
        datasets: [
          { label: 'Placed', data: top.map(d => d.placed), backgroundColor: c.success, borderRadius: 5, barPercentage: 0.6, categoryPercentage: 0.6 },
          { label: 'Not placed', data: top.map(d => d.total - d.placed), backgroundColor: '#e2e8f0', borderRadius: 5, barPercentage: 0.6, categoryPercentage: 0.6 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { font: { size: 11, weight: '600' } } },
          y: { stacked: true, beginAtZero: true, grid: { color: '#eef2f7' }, ticks: { precision: 0 } }
        }
      }
    });
  }

  /* ── Monthly trend chart ────────────────────────────────────── */
  function renderTrendChart(trend) {
    const canvas = document.getElementById('trendChart');
    if (!canvas || !window.Chart) return;
    if (trendChart) trendChart.destroy();
    const c = window.APP_CONFIG.CHART_COLORS;
    trendChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: trend.map(t => t.month),
        datasets: [
          {
            label: 'Placed',
            data: trend.map(t => t.placed),
            borderColor: c.success, backgroundColor: 'rgba(21,128,61,0.10)',
            fill: true, tension: 0.35, borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: c.success
          },
          {
            label: 'Enrolled',
            data: trend.map(t => t.enrolled),
            borderColor: c.primary, borderDash: [6, 4],
            fill: false, tension: 0.35, borderWidth: 2, pointRadius: 3, pointBackgroundColor: c.primary
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#eef2f7' }, ticks: { precision: 0 } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  /* ── Skill gap chart + table ────────────────────────────────── */
  function renderGapChart(top5) {
    const canvas = document.getElementById('gapChart');
    if (!canvas || !window.Chart) return;
    if (gapChart) gapChart.destroy();
    const c = window.APP_CONFIG.CHART_COLORS;
    gapChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: top5.map(s => s.skill),
        datasets: [
          { label: 'Demand (%)', data: top5.map(s => s.demand), backgroundColor: c.primary, borderRadius: 5, barPercentage: 0.55, categoryPercentage: 0.62 },
          { label: 'Supply (%)', data: top5.map(s => s.supply), backgroundColor: '#c9d8ea', borderRadius: 5, barPercentage: 0.55, categoryPercentage: 0.62 }
        ]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          x: { max: 100, grid: { color: '#eef2f7' }, ticks: { callback: v => v + '%' } },
          y: { grid: { display: false }, ticks: { font: { size: 11, weight: '600' }, color: '#334155' } }
        }
      }
    });
  }

  function renderGapTable(top5) {
    const tbody = document.getElementById('gapTableBody');
    if (!tbody) return;
    tbody.innerHTML = top5.map((s, i) => {
      const priority = s.gap >= 35 ? ['Critical', 'bg-danger'] : s.gap >= 25 ? ['High', 'bg-warning text-dark'] : ['Medium', 'bg-info'];
      const medal = i === 0 ? ' 🥇' : i === 1 ? ' 🥈' : i === 2 ? ' 🥉' : '';
      return '<tr>' +
        '<td><strong>#' + (i + 1) + '</strong><span class="text-muted small">' + medal + '</span></td>' +
        '<td><strong>' + window.UI.escapeHtml(s.skill) + '</strong><div class="text-muted small">' + window.UI.escapeHtml(s.category || '') + '</div></td>' +
        '<td class="text-center">' + s.demand + '%</td>' +
        '<td class="text-center">' + s.supply + '%</td>' +
        '<td style="min-width:140px"><div class="progress" style="height:8px"><div class="progress-bar bg-danger" style="width:' + s.gap + '%"></div></div><small class="text-muted">' + s.gap + ' pts gap</small></td>' +
        '<td><span class="badge ' + priority[1] + '">' + priority[0] + '</span></td>' +
      '</tr>';
    }).join('');
  }
})();
