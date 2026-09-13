document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    auth.requireAuth();
    auth.setupRoleUI();

    // Sidebar Toggle for Mobile
    const sidebar = document.getElementById('sidebar');
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    if (sidebarCollapse) {
        sidebarCollapse.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    // Load Dashboard Data
    await loadDashboardData();
});

async function loadDashboardData() {
    try {
        // In a real scenario, you might fetch all these concurrently
        const placementData = await api.getPlacementRate();
        const skillGapsData = await api.getSkillGaps();
        const participants = await api.getParticipants(); // to get total if needed, or backend returns it
        
        // Update KPIs
        const total = placementData.total;
        const employed = placementData.employed + placementData.selfEmployed;
        const unemployed = placementData.unemployed;
        const placementRate = total > 0 ? ((employed / total) * 100).toFixed(1) : 0;

        document.getElementById('kpi-total').textContent = total;
        document.getElementById('kpi-rate').textContent = placementRate + '%';
        document.getElementById('kpi-employed').textContent = employed;
        document.getElementById('kpi-unemployed').textContent = unemployed;

        // Render Charts
        renderPlacementChart(placementData);
        renderSkillGapChart(skillGapsData);
        
    } catch (error) {
        console.error("Failed to load dashboard data:", error);
        ui.showToast("Failed to load dashboard data. Please try again.", "danger");
    }
}

function renderPlacementChart(data) {
    const ctx = document.getElementById('placementChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Employed', 'Self-Employed', 'Pursuing Training', 'Unemployed'],
            datasets: [{
                data: [data.employed, data.selfEmployed, data.training, data.unemployed],
                backgroundColor: [
                    '#2e7d32', // Success
                    '#00bcd4', // Accent
                    '#f57f17', // Warning
                    '#c62828'  // Danger
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                }
            },
            cutout: '65%'
        }
    });
}

function renderSkillGapChart(data) {
    const ctx = document.getElementById('skillGapChart').getContext('2d');
    
    // Sort by highest gap score and take top 5 (API should handle this, but enforcing here)
    const sortedData = data.sort((a, b) => b.gapScore - a.gapScore).slice(0, 5);
    
    const labels = sortedData.map(item => item.skill);
    const scores = sortedData.map(item => item.gapScore);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Skill Gap Severity',
                data: scores,
                backgroundColor: '#1976d2',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y', // horizontal bar chart
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}
