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

// Tab Switching
function switchTab(tabId) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    // Deactivate all tab buttons
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

    // Show selected tab content
    document.getElementById(`tab-${tabId}`).style.display = 'block';
    // Activate selected tab button
    // Find the button that calls this function with this tabId
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => {
        if (btn.getAttribute('onclick').includes(tabId)) {
            btn.classList.add('active');
        }
    });
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
    renderComprehensive(data);
    renderItemAnalysis(data);
    renderTeamAnalysis(data);
}

// --- 1. Comprehensive Results ---
function renderComprehensive(data) {
    // 1. Total Participants
    document.getElementById('total-participants').textContent = data.length;

    // 2. E/S/G Averages
    const scores = { E: 0, S: 0, G: 0 };
    const counts = { E: 0, S: 0, G: 0 };

    // Calculate sums
    data.forEach(row => {
        ESG_CATEGORIES.forEach(cat => {
            const ratingKey = `${cat.id}_rating`;
            const score = Number(row[ratingKey]);
            if (!isNaN(score) && score > 0) {
                scores[cat.id] += score;
                counts[cat.id]++;
            }
        });
    });

    // Calculate averages
    const averages = {
        E: counts.E ? (scores.E / counts.E).toFixed(1) : 0,
        S: counts.S ? (scores.S / counts.S).toFixed(1) : 0,
        G: counts.G ? (scores.G / counts.G).toFixed(1) : 0
    };

    document.getElementById('avg-score-e').textContent = averages.E;
    document.getElementById('avg-score-s').textContent = averages.S;
    document.getElementById('avg-score-g').textContent = averages.G;

    // 3. Radar Chart
    renderRadarChart(averages);

    // 4. Recent Table
    renderRecentTable(data);
}

function renderRadarChart(averages) {
    const ctx = document.getElementById('radarChart').getContext('2d');

    if (window.myChart) {
        window.myChart.destroy();
    }

    window.myChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['환경 (E)', '사회 (S)', '지배구조 (G)'],
            datasets: [{
                label: '종합 역량 진단',
                data: [averages.E, averages.S, averages.G],
                backgroundColor: 'rgba(46, 125, 50, 0.2)',
                borderColor: 'rgba(46, 125, 50, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(46, 125, 50, 1)',
            }]
        },
        options: {
            responsive: true,
            scales: {
                r: {
                    angleLines: {
                        display: true
                    },
                    suggestedMin: 0,
                    suggestedMax: 4,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
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
            dateStr = date.toLocaleDateString();
        } catch (e) { }

        // Calculate individual E/S/G scores for this user
        // Note: The sheet might not have pre-calculated E/S/G columns per user unless we added them.
        // We can calculate them on the fly if needed, but for now let's check if they exist or calculate.
        // The current sheet structure likely has 'Total Score' but maybe not E/S/G split.
        // Let's calculate them for the table.

        const userScores = { E: 0, S: 0, G: 0 };
        const userCounts = { E: 0, S: 0, G: 0 };

        ESG_CATEGORIES.forEach(cat => {
            const ratingKey = `${cat.id}_rating`;
            const score = Number(row[ratingKey]);
            if (!isNaN(score) && score > 0) {
                userScores[cat.id] = score; // This is category average if the sheet stores it as such
                // Wait, the sheet stores "E_rating", "S_rating", "G_rating" which are averages for that category for that user.
                // Based on app.js submitUserInfo:
                // formData[cat.id + '_rating'] = (catScore / cat.middleCategories.length).toFixed(2);
                // So yes, row['E_rating'] is the average score for E.
            }
        });

        tr.innerHTML = `
            <td>${dateStr}</td>
            <td>${row['Department'] || '-'}</td>
            <td>${row['Name'] || '-'}</td>
            <td>${row['E_rating'] || 0}</td>
            <td>${row['S_rating'] || 0}</td>
            <td>${row['G_rating'] || 0}</td>
        `;
        tableBody.appendChild(tr);
    });
}

// --- 2. Item Analysis ---
function renderItemAnalysis(data) {
    const tableBody = document.querySelector('#item-analysis-table tbody');
    tableBody.innerHTML = '';

    const indicatorStats = [];
    const mainMap = { E: '환경', S: '사회', G: '지배구조' };

    ESG_CATEGORIES.forEach(main => {
        main.middleCategories.forEach(middle => {
            middle.indicators.forEach(ind => {
                let sum = 0;
                let count = 0;

                data.forEach(row => {
                    const val = Number(row[ind.id]);
                    if (!isNaN(val) && val > 0) {
                        sum += val;
                        count++;
                    }
                });

                const avg = count ? (sum / count).toFixed(2) : 0;

                // Determine status
                let status = '미흡';
                if (avg >= 3.5) { status = '우수'; }
                else if (avg >= 2.5) { status = '양호'; }
                else if (avg >= 1.5) { status = '보통'; }

                indicatorStats.push({
                    code: ind.title.match(/\[(.*?)\]/)?.[1] || ind.id,
                    main: mainMap[main.id] || main.title,
                    middle: middle.title.replace(/\[.*?\]\s*/, '').trim(),
                    indicator: ind.title.replace(/\[.*?\]\s*/, '').trim(),
                    avg: avg,
                    status: status
                });
            });
        });
    });

    // Sort by average score (ascending as per screenshot "평균 점수순")
    indicatorStats.sort((a, b) => a.avg - b.avg);

    indicatorStats.forEach((stat, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${stat.code}</td>
            <td>${stat.main}</td>
            <td>${stat.middle}</td>
            <td>${stat.indicator}</td>
            <td>${stat.avg}</td>
            <td><span class="badge ${stat.status === '미흡' ? 'badge-danger' : 'badge-success'}">${stat.status}</span></td>
        `;
        tableBody.appendChild(tr);
    });
}

// --- 3. Team Analysis ---
function renderTeamAnalysis(data) {
    // Group data by Department
    const teams = {};

    data.forEach(row => {
        const dept = row['Department'] || '미지정';
        if (!teams[dept]) {
            teams[dept] = {
                count: 0,
                totalScoreSum: 0,
                eSum: 0,
                sSum: 0,
                gSum: 0
            };
        }

        teams[dept].count++;
        teams[dept].totalScoreSum += (Number(row['Total Score']) || 0);
        teams[dept].eSum += (Number(row['E_rating']) || 0);
        teams[dept].sSum += (Number(row['S_rating']) || 0);
        teams[dept].gSum += (Number(row['G_rating']) || 0);
    });

    // Render Table
    const container = document.getElementById('team-analysis-container');
    if (!container) return;

    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>부서명</th>
                    <th>참여 인원</th>
                    <th>평균 총점</th>
                    <th>환경 (E)</th>
                    <th>사회 (S)</th>
                    <th>지배구조 (G)</th>
                </tr>
            </thead>
            <tbody>
    `;

    Object.keys(teams).forEach(dept => {
        const team = teams[dept];
        const avgTotal = (team.totalScoreSum / team.count).toFixed(1);
        const avgE = (team.eSum / team.count).toFixed(1);
        const avgS = (team.sSum / team.count).toFixed(1);
        const avgG = (team.gSum / team.count).toFixed(1);

        html += `
            <tr>
                <td>${dept}</td>
                <td>${team.count}명</td>
                <td>${avgTotal}</td>
                <td>${avgE}</td>
                <td>${avgS}</td>
                <td>${avgG}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function refreshData() {
    fetchData();
}

// --- Data Upload & Processing ---

function toggleUploadMode() {
    const section = document.getElementById('upload-section');
    section.style.display = section.style.display === 'none' ? 'block' : 'none';
}

function processFile() {
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];

    if (!file) {
        alert('파일을 선택해 주세요.');
        return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Parse JSON
        const categories = parseExcelData(jsonData);

        // Display JSON
        const output = document.getElementById('json-output');
        output.value = "const ESG_CATEGORIES = " + JSON.stringify(categories, null, 4) + ";";
        document.getElementById('json-output-container').style.display = 'block';
    };

    reader.readAsArrayBuffer(file);
}

function parseExcelData(rows) {
    // Assumption: Row 0 is header. Data starts from Row 1.
    // Columns: [0] Main(E/S/G), [1] Middle, [2] Indicator, [3] Content

    const categories = [];
    let currentMain = null;
    let currentMiddle = null;
    let currentIndicator = null;

    // Helper to find or create
    const findOrCreate = (array, key, value, factory) => {
        let item = array.find(i => i[key] === value);
        if (!item) {
            item = factory();
            array.push(item);
        }
        return item;
    };

    rows.slice(1).forEach(row => {
        if (!row[0] && !row[1] && !row[2] && !row[3]) return; // Skip empty rows

        const mainTitle = row[0];
        const middleTitle = row[1];
        const indicatorTitle = row[2];
        const content = row[3];

        // 1. Main Category
        if (mainTitle) {
            let id = "E";
            if (mainTitle.includes("사회") || mainTitle.includes("S")) id = "S";
            if (mainTitle.includes("거버넌스") || mainTitle.includes("G")) id = "G";

            currentMain = findOrCreate(categories, 'id', id, () => ({
                id: id,
                title: mainTitle,
                description: "",
                middleCategories: []
            }));
        }

        // 2. Middle Category
        if (middleTitle && currentMain) {
            currentMiddle = findOrCreate(currentMain.middleCategories, 'title', middleTitle, () => ({
                title: middleTitle,
                indicators: []
            }));
        }

        // 3. Indicator
        if (indicatorTitle && currentMiddle) {
            // Generate a simple ID for the indicator
            const indicatorId = `${currentMain.id}_${currentMiddle.indicators.length + 1}`;

            currentIndicator = findOrCreate(currentMiddle.indicators, 'title', indicatorTitle, () => ({
                id: indicatorId,
                title: indicatorTitle,
                contents: []
            }));
        }

        // 4. Content
        if (content && currentIndicator) {
            currentIndicator.contents.push(content);
        }
    });

    return categories;
}

function copyJson() {
    const output = document.getElementById('json-output');
    output.select();
    document.execCommand('copy');
    alert('JSON 코드가 복사되었습니다. js/data.js 파일에 붙여넣으세요.');
}
