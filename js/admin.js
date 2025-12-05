// Admin Password (Client-side only - NOT SECURE)
const ADMIN_PASSWORD = "admin";

function checkLogin() {
    const input = document.getElementById('admin-password').value;
    if (input === ADMIN_PASSWORD) {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('admin-content').style.display = 'block';
        fetchData();
    } else {
        alert('비밀번호가 올바르지 않습니다.');
    }
}

async function fetchData() {
    try {
        const response = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getData`);
        const data = await response.json();

        if (data.error) {
            alert('데이터를 불러오는 중 오류가 발생했습니다: ' + JSON.stringify(data.error));
            return;
        }

        processData(data);
    } catch (error) {
        console.error('Error fetching data:', error);
        alert('데이터를 불러오지 못했습니다. Google Apps Script 배포를 확인해주세요.');
    }
}

function processData(data) {
    // 1. Total Participants
    document.getElementById('total-participants').textContent = data.length;

    // 2. Average Score
    const totalScoreSum = data.reduce((sum, row) => sum + (Number(row['Total Score']) || 0), 0);
    const avgScore = data.length ? (totalScoreSum / data.length).toFixed(1) : 0;
    document.getElementById('average-score').textContent = avgScore;

    // 3. Recent Table
    const tableBody = document.getElementById('recent-table-body');
    tableBody.innerHTML = '';
    // Show last 10 entries reversed
    data.slice(-10).reverse().forEach(row => {
        const tr = document.createElement('tr');
        // Format date if possible
        let dateStr = row['Timestamp'];
        try {
            const date = new Date(row['Timestamp']);
            dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        } catch (e) { }

        tr.innerHTML = `
            <td>${dateStr}</td>
            <td>${row['Name'] || '-'}</td>
            <td>${row['Department'] || '-'}</td>
            <td>${row['Total Score'] || 0}</td>
        `;
        tableBody.appendChild(tr);
    });

    // 4. Category Chart
    renderChart(data);
}

function renderChart(data) {
    // Calculate average for each category
    // We need to map question IDs to categories
    const categoryScores = {};
    const categoryCounts = {};

    ESG_CATEGORIES.forEach(cat => {
        categoryScores[cat.title] = 0;
        categoryCounts[cat.title] = 0;
    });

    data.forEach(row => {
        ESG_CATEGORIES.forEach(cat => {
            let catSum = 0;
            let qCount = 0;
            cat.questions.forEach(q => {
                // Check if row has the answer (handling potential key differences)
                if (row[q.id]) {
                    catSum += Number(row[q.id]);
                    qCount++;
                }
            });
            if (qCount > 0) {
                categoryScores[cat.title] += (catSum / qCount);
                categoryCounts[cat.title]++;
            }
        });
    });

    const labels = ESG_CATEGORIES.map(c => c.title);
    const averages = ESG_CATEGORIES.map(c => {
        const count = categoryCounts[c.title];
        return count ? (categoryScores[c.title] / count).toFixed(2) : 0;
    });

    const ctx = document.getElementById('categoryChart').getContext('2d');

    // Destroy existing chart if any
    if (window.myChart) {
        window.myChart.destroy();
    }

    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '분야별 평균 점수 (4점 만점)',
                data: averages,
                backgroundColor: 'rgba(46, 125, 50, 0.6)',
                borderColor: 'rgba(46, 125, 50, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 4
                }
            }
        }
    });
}

function refreshData() {
    fetchData();
}
