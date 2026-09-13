let employmentChartInstance = null;
let skillChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    auth.requireAuth();
    auth.setupRoleUI();

    // Sidebar Toggle
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    if (sidebarCollapse) {
        sidebarCollapse.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active');
        });
    }

    document.getElementById('btn-apply-filter').addEventListener('click', loadAnalyticsData);

    // Initial load
    await loadAnalyticsData();
});

async function loadAnalyticsData() {
    const districtFilter = document.getElementById('district-filter').value;
    const btnFilter = document.getElementById('btn-apply-filter');
    
    btnFilter.disabled = true;
    btnFilter.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Loading...';

    try {
        // In a real app, you would pass the districtFilter query param to the API
        // e.g., api.getPlacementRate(districtFilter)
        
        let placementData = await api.getPlacementRate();
        let skillGapsData = await api.getSkillGaps();
        
        // Mock data logic to simulate filtering effects
        if (CONFIG.USE_MOCK_DATA && districtFilter !== 'ALL') {
            // Randomly fluctuate data to show filter works in demo mode
            const factor = (districtFilter.charCodeAt(districtFilter.length-1) % 5 + 5) / 10; // factor between 0.5 - 0.9
            placementData = {
                total: Math.floor(placementData.total * factor),
                employed: Math.floor(placementData.employed * factor),
                selfEmployed: Math.floor(placementData.selfEmployed * factor),
                unemployed: Math.floor(placementData.unemployed * factor),
                training: Math.floor(placementData.training * factor)
            };
            
            skillGapsData = skillGapsData.map(item => ({
                skill: item.skill,
                gapScore: Math.floor(item.gapScore * factor)
            }));
        }
        
        updateUI(placementData, skillGapsData);
        
    } catch (error) {
        console.error("Failed to load analytics:", error);
        ui.showToast("Failed to load analytics data.", "danger");
    } finally {
        btnFilter.disabled = false;
        btnFilter.innerHTML = 'Apply';
    }
}

function updateUI(placementData, skillGapsData) {
    // Update Rate Text
    const total = placementData.total;
    const employedTotal = placementData.employed + placementData.selfEmployed;
    const rate = total > 0 ? ((employedTotal / total) * 100).toFixed(1) : 0;
    document.getElementById('stat-placement-rate').textContent = `${rate}%`;

    // Render Charts
    renderEmploymentChart(placementData);
    
    // Sort and limit skill gaps
    const sortedSkills = skillGapsData.sort((a, b) => b.gapScore - a.gapScore).slice(0, 5);
    renderSkillGapChart(sortedSkills);
    renderSkillGapTable(sortedSkills);
}

function renderEmploymentChart(data) {
    const ctx = document.getElementById('employmentBarChart').getContext('2d');
    
    if (employmentChartInstance) {
        employmentChartInstance.destroy();
    }
    
    employmentChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Employed', 'Self-Employed', 'Pursuing Training', 'Unemployed'],
            datasets: [{
                label: 'Number of Participants',
                data: [data.employed, data.selfEmployed, data.training, data.unemployed],
                backgroundColor: [
                    '#2e7d32', // Success
                    '#00bcd4', // Accent
                    '#f57f17', // Warning
                    '#c62828'  // Danger
                ],
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function renderSkillGapChart(sortedData) {
    const ctx = document.getElementById('detailedSkillGapChart').getContext('2d');
    
    if (skillChartInstance) {
        skillChartInstance.destroy();
    }
    
    const labels = sortedData.map(item => item.skill);
    const scores = sortedData.map(item => item.gapScore);

    skillChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Skill Gap (Severity)',
                data: scores,
                backgroundColor: 'rgba(25, 118, 210, 0.2)',
                borderColor: '#1976d2',
                pointBackgroundColor: '#1976d2',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#1976d2',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: {
                        display: true
                    },
                    suggestedMin: 0,
                    suggestedMax: 100
                }
            }
        }
    });
}

function renderSkillGapTable(sortedData) {
    const tbody = document.getElementById('skill-gap-table-body');
    tbody.innerHTML = '';
    
    sortedData.forEach(item => {
        let priority = "Low";
        let badgeClass = "bg-success";
        
        if (item.gapScore > 80) {
            priority = "Critical";
            badgeClass = "bg-danger";
        } else if (item.gapScore > 60) {
            priority = "High";
            badgeClass = "bg-warning text-dark";
        } else if (item.gapScore > 40) {
            priority = "Medium";
            badgeClass = "bg-info text-dark";
        }
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="fw-semibold">${item.skill}</td>
            <td>
                <div class="d-flex align-items-center">
                    <span class="me-2">${item.gapScore}/100</span>
                    <div class="progress flex-grow-1" style="height: 6px;">
                        <div class="progress-bar ${badgeClass}" role="progressbar" style="width: ${item.gapScore}%" aria-valuenow="${item.gapScore}" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                </div>
            </td>
            <td><span class="badge ${badgeClass}">${priority}</span></td>
        `;
        tbody.appendChild(tr);
    });
}
