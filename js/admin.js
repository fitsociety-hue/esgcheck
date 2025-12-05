// Admin Password
const ADMIN_PASSWORD = "0741";

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
    renderRecentTable(data);

    // 4. Category Chart (Overall)
    renderCategoryChart(data);

    // 5. Team Analysis
    renderTeamAnalysis(data);
}

function renderRecentTable(data) {
    const tableBody = document.getElementById('recent-table-body');
    tableBody.innerHTML = '';
    // Show last 10 entries reversed
    data.slice(-10).reverse().forEach(row => {
        const tr = document.createElement('tr');
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
}

function renderCategoryChart(data) {
    // Calculate average for each category
    // New structure: answers are keyed by "category_id_rating" (e.g., "env_management_rating")

    const categoryScores = {};
    const categoryCounts = {};

    ESG_CATEGORIES.forEach(cat => {
        categoryScores[cat.title] = 0;
        categoryCounts[cat.title] = 0;
    });

    data.forEach(row => {
        ESG_CATEGORIES.forEach(cat => {
            const ratingKey = `${cat.id}_rating`;
            const score = Number(row[ratingKey]);

            if (!isNaN(score) && score > 0) {
                categoryScores[cat.title] += score;
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

    if (window.myChart) {
        window.myChart.destroy();
    }

    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '전체 평균 점수 (4점 만점)',
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

function renderTeamAnalysis(data) {
    // Group data by Department
    const teams = {};

    data.forEach(row => {
        const dept = row['Department'] || '미지정';
        if (!teams[dept]) {
            teams[dept] = {
                count: 0,
                totalScoreSum: 0,
                categorySums: {}
            };
            ESG_CATEGORIES.forEach(cat => {
                teams[dept].categorySums[cat.id] = 0;
            });
        }

        teams[dept].count++;
        teams[dept].totalScoreSum += (Number(row['Total Score']) || 0);

        ESG_CATEGORIES.forEach(cat => {
            const ratingKey = `${cat.id}_rating`;
            const score = Number(row[ratingKey]) || 0;
            teams[dept].categorySums[cat.id] += score;
        });
    });

    // Render Table
    const container = document.getElementById('team-analysis-container');
    if (!container) return; // Guard clause if element doesn't exist yet

    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>부서명</th>
                    <th>참여 인원</th>
                    <th>평균 총점</th>
                    ${ESG_CATEGORIES.map(c => `<th>${c.title.split(' ')[1]}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
    `;

    Object.keys(teams).forEach(dept => {
        const team = teams[dept];
        const avgTotal = (team.totalScoreSum / team.count).toFixed(1);

        html += `
            <tr>
                <td>${dept}</td>
                <td>${team.count}명</td>
                <td>${avgTotal}</td>
                ${ESG_CATEGORIES.map(cat => {
            const avg = (team.categorySums[cat.id] / team.count).toFixed(1);
            return `<td>${avg}</td>`;
        }).join('')}
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function refreshData() {
    fetchData();
}

