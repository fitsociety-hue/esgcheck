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

// Add Enter key support for password input
document.addEventListener('DOMContentLoaded', function () {
    const passwordInput = document.getElementById('admin-password');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                checkLogin();
            }
        });
    }
});

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
    renderSuggestions(data);
}

// --- 4. Workshop Suggestions ---
function renderSuggestions(data) {
    const container = document.getElementById('suggestions-container');
    if (!container) return;

    // Calculate overall averages
    let totalScores = { E: 0, S: 0, G: 0 };
    let totalCounts = 0;

    data.forEach(row => {
        const rowScores = calculateRowScores(row);
        if (rowScores.E > 0) totalScores.E += rowScores.E;
        if (rowScores.S > 0) totalScores.S += rowScores.S;
        if (rowScores.G > 0) totalScores.G += rowScores.G;
        if (rowScores.E > 0 || rowScores.S > 0 || rowScores.G > 0) totalCounts++;
    });

    const averages = {
        E: totalCounts ? (totalScores.E / totalCounts) : 0,
        S: totalCounts ? (totalScores.S / totalCounts) : 0,
        G: totalCounts ? (totalScores.G / totalCounts) : 0
    };

    // Suggestion Logic
    const suggestions = {
        E: [
            { threshold: 2.5, title: "환경 경영 체계 구축 시급", content: "환경 경영 방침을 수립하고, 에너지 사용량 모니터링 시스템을 도입해야 합니다." },
            { threshold: 3.5, title: "친환경 캠페인 확대", content: "임직원이 참여하는 '잔반 줄이기', '플라스틱 프리' 캠페인을 정례화하여 문화를 확산하세요." },
            { threshold: 5.0, title: "환경 리더십 강화", content: "지역사회와 연계한 환경 보호 활동을 주도하고, 탄소 중립 로드맵을 고도화하세요." }
        ],
        S: [
            { threshold: 2.5, title: "기본적인 인권 경영 도입", content: "취업규칙을 점검하고, 고충 처리 채널을 활성화하여 내부 소통을 강화해야 합니다." },
            { threshold: 3.5, title: "지역사회 공헌 프로그램 개발", content: "기관의 특성을 살린 사회공헌 프로그램을 기획하고, 자원봉사 활동을 장려하세요." },
            { threshold: 5.0, title: "이해관계자 소통 고도화", content: "다양한 이해관계자와의 정기적인 간담회를 통해 경영 투명성을 높이고 상생 모델을 구축하세요." }
        ],
        G: [
            { threshold: 2.5, title: "윤리 경영 규정 정비", content: "윤리 헌장을 제정하고, 전 직원 대상 윤리 교육을 의무화해야 합니다." },
            { threshold: 3.5, title: "의사결정 투명성 제고", content: "위원회 운영을 활성화하고, 주요 의사결정 과정을 내부에 투명하게 공개하세요." },
            { threshold: 5.0, title: "ESG 경영 내재화", content: "ESG 성과 지표를 KPI에 반영하고, 지속가능경영보고서를 발간하여 대외 신뢰도를 높이세요." }
        ]
    };

    // --- Gap Analysis Logic ---
    const gapStats = {
        E: { total: 0, awareness: 0, action: 0, ideal: 0 },
        S: { total: 0, awareness: 0, action: 0, ideal: 0 },
        G: { total: 0, awareness: 0, action: 0, ideal: 0 }
    };

    data.forEach(row => {
        ESG_CATEGORIES.forEach(cat => {
            cat.middleCategories.forEach(mid => {
                mid.indicators.forEach(ind => {
                    // Checkbox data is stored in row[ind.id] as a comma-separated string
                    // e.g. "알고 있음, 하고 있음"
                    const val = row[ind.id] || "";

                    // Determine Gap Type
                    let type = 'unknown';
                    if (val.includes('알지 못함')) {
                        type = 'awareness'; // Type A: Awareness Gap
                    } else if (val.includes('알고 있음') && !val.includes('하고 있음')) {
                        type = 'action'; // Type B: Action Gap
                    } else if (val.includes('알고 있음') && val.includes('하고 있음')) {
                        type = 'ideal'; // Type D: Ideal
                    }

                    if (type !== 'unknown') {
                        gapStats[cat.id][type]++;
                        gapStats[cat.id].total++;
                    }
                });
            });
        });
    });

    // Calculate Percentages
    const gapPercents = {};
    ['E', 'S', 'G'].forEach(id => {
        const total = gapStats[id].total || 1; // Avoid division by zero
        gapPercents[id] = {
            awareness: ((gapStats[id].awareness / total) * 100).toFixed(1),
            action: ((gapStats[id].action / total) * 100).toFixed(1),
            ideal: ((gapStats[id].ideal / total) * 100).toFixed(1)
        };
    });

    let html = '<div class="suggestions-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">';

    ['E', 'S', 'G'].forEach(cat => {
        const avg = averages[cat];
        const catName = cat === 'E' ? '환경(Environment)' : cat === 'S' ? '사회(Social)' : '지배구조(Governance)';
        const color = cat === 'E' ? '#4caf50' : cat === 'S' ? '#2196f3' : '#ff9800';

        // Find appropriate suggestion based on score
        let suggestion = suggestions[cat].find(s => avg < s.threshold) || suggestions[cat][suggestions[cat].length - 1];

        html += `
            <div class="card" style="border-top: 4px solid ${color};">
                <h4 style="color: ${color}; margin-bottom: 0.5rem;">${catName} <span style="font-size: 0.9em; color: #666;">(평균 ${avg.toFixed(1)}점)</span></h4>
                <h3 style="margin-bottom: 1rem;">${suggestion.title}</h3>
                <p style="color: #555; line-height: 1.6;">${suggestion.content}</p>
                
                <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px dashed #eee;">
                    <strong style="font-size: 0.9rem; color: #333;">Gap 분석 결과:</strong>
                    <div style="margin-top: 0.5rem; font-size: 0.85rem; color: #555;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span>인식 부족 (Type A):</span> <strong>${gapPercents[cat].awareness}%</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span>실천 부족 (Type B):</span> <strong>${gapPercents[cat].action}%</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>양호 (Ideal):</span> <strong>${gapPercents[cat].ideal}%</strong>
                        </div>
                    </div>
                    
                    <div style="margin-top: 1rem; padding: 0.8rem; background: #f9f9f9; border-radius: 4px; font-size: 0.85rem;">
                        <strong>💡 맞춤 제언:</strong><br>
                        ${getGapSuggestion(gapPercents[cat])}
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';

    // Add Mid-to-Long Term Planning Section
    html += `
        <div style="margin-top: 3rem;">
            <h3 style="margin-bottom: 1.5rem; border-left: 4px solid #333; padding-left: 1rem;">ESG 중장기 발전계획 수립 가이드</h3>
            <div class="card" style="background: #f8f9fa;">
                <ol style="padding-left: 1.5rem; line-height: 1.8; color: #444;">
                    <li><strong>현황 진단 (Current State):</strong> 현재의 ESG 수준을 객관적으로 파악합니다. (본 자가진단 활용)</li>
                    <li><strong>비전 수립 (Visioning):</strong> 기관이 추구하는 ESG 경영의 미래상을 정의합니다.</li>
                    <li><strong>핵심 과제 도출 (Key Issues):</strong> 비전 달성을 위해 해결해야 할 핵심 과제를 선정합니다.</li>
                    <li><strong>로드맵 작성 (Roadmap):</strong> 단기(1년), 중기(3년), 장기(5년) 실행 계획을 수립합니다.</li>
                    <li><strong>모니터링 및 피드백 (Feedback):</strong> 정기적인 성과 점검 및 개선 활동을 수행합니다.</li>
                </ol>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function getGapSuggestion(percents) {
    const awareness = parseFloat(percents.awareness);
    const action = parseFloat(percents.action);
    const ideal = parseFloat(percents.ideal);

    if (awareness >= action && awareness >= ideal) {
        return "직원들이 복지관의 ESG 활동을 잘 모르고 있습니다. <strong>내부 교육과 홍보를 강화</strong>하여 인지도를 높이는 것이 급선무입니다.";
    } else if (action >= awareness && action >= ideal) {
        return "직원들이 알고는 있으나 실천하지 못하고 있습니다. <strong>동기 부여와 실천 가능한 환경 조성</strong>이 필요합니다.";
    } else {
        return "전반적으로 인지와 실천 수준이 양호합니다. <strong>우수 사례를 발굴하고 포상</strong>하여 문화를 확산하세요.";
    }
}

// --- Helper: Calculate Scores per Row ---
function calculateRowScores(row) {
    const scores = { E: 0, S: 0, G: 0 };
    const counts = { E: 0, S: 0, G: 0 };

    ESG_CATEGORIES.forEach(cat => {
        cat.middleCategories.forEach(mid => {
            mid.indicators.forEach(ind => {
                const val = Number(row[`${ind.id}_rating`]);
                if (!isNaN(val) && val > 0) {
                    scores[cat.id] += val;
                    counts[cat.id]++;
                }
            });
        });
    });

    return {
        E: counts.E ? (scores.E / counts.E) : 0,
        S: counts.S ? (scores.S / counts.S) : 0,
        G: counts.G ? (scores.G / counts.G) : 0,
        Total: (counts.E + counts.S + counts.G) ? ((scores.E + scores.S + scores.G) / (counts.E + counts.S + counts.G)) : 0
    };
}

// --- 1. Comprehensive Results ---
function renderComprehensive(data) {
    // 1. Total Participants
    document.getElementById('total-participants').textContent = data.length;

    // Update Last Update Time
    const now = new Date();
    document.getElementById('last-update-time').textContent = now.toLocaleTimeString();

    // 2. E/S/G Averages
    let totalScores = { E: 0, S: 0, G: 0 };
    let totalCounts = 0;

    data.forEach(row => {
        const rowScores = calculateRowScores(row);
        if (rowScores.E > 0) totalScores.E += rowScores.E;
        if (rowScores.S > 0) totalScores.S += rowScores.S;
        if (rowScores.G > 0) totalScores.G += rowScores.G;
        if (rowScores.E > 0 || rowScores.S > 0 || rowScores.G > 0) totalCounts++;
    });

    const averages = {
        E: totalCounts ? (totalScores.E / totalCounts).toFixed(1) : 0,
        S: totalCounts ? (totalScores.S / totalCounts).toFixed(1) : 0,
        G: totalCounts ? (totalScores.G / totalCounts).toFixed(1) : 0
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
    const tbody = document.getElementById('recent-table-body');
    const noDataMsg = document.getElementById('no-data-message');
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        noDataMsg.style.display = 'block';
        return;
    }

    noDataMsg.style.display = 'none';

    // Sort by timestamp desc
    const sortedData = [...data].sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
    const recentData = sortedData.slice(0, 10);

    recentData.forEach(row => {
        const tr = document.createElement('tr');
        const rowScores = calculateRowScores(row); // Use helper

        // Handle keys (case-insensitive check)
        const name = row.name || row.Name || row['성명'] || '-';
        const dept = row.department || row.Department || row['부서'] || '-';
        const date = row.Timestamp ? new Date(row.Timestamp).toLocaleDateString() : '-';

        tr.innerHTML = `
            <td>${date}</td>
            <td>${dept}</td>
            <td>${name}</td>
            <td>${rowScores.E.toFixed(1)}</td>
            <td>${rowScores.S.toFixed(1)}</td>
            <td>${rowScores.G.toFixed(1)}</td>
        `;
        tbody.appendChild(tr);
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
                    const val = Number(row[`${ind.id}_rating`]);
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
    const container = document.getElementById('team-analysis-container');
    container.innerHTML = '';

    const teams = {};

    data.forEach(row => {
        const dept = row.department || row.Department || row['부서'] || '미지정';
        if (!teams[dept]) {
            teams[dept] = { count: 0, scores: { E: 0, S: 0, G: 0 }, counts: { E: 0, S: 0, G: 0 }, totalSum: 0 };
        }
        teams[dept].count++;

        const rowScores = calculateRowScores(row); // Use helper

        if (rowScores.E > 0) { teams[dept].scores.E += rowScores.E; teams[dept].counts.E++; }
        if (rowScores.S > 0) { teams[dept].scores.S += rowScores.S; teams[dept].counts.S++; }
        if (rowScores.G > 0) { teams[dept].scores.G += rowScores.G; teams[dept].counts.G++; }

        let rowTotal = Number(row['Total Score']);
        if (isNaN(rowTotal)) rowTotal = 0;
        teams[dept].totalSum += rowTotal;
    });

    let html = `
        <div class="table-responsive">
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
        const t = teams[dept];
        const avgTotal = (t.totalSum / t.count).toFixed(1);
        const avgE = t.counts.E ? (t.scores.E / t.counts.E).toFixed(1) : 0;
        const avgS = t.counts.S ? (t.scores.S / t.counts.S).toFixed(1) : 0;
        const avgG = t.counts.G ? (t.scores.G / t.counts.G).toFixed(1) : 0;

        html += `
            <tr>
                <td>${dept}</td>
                <td>${t.count}명</td>
                <td>${avgTotal}</td>
                <td>${avgE}</td>
                <td>${avgS}</td>
                <td>${avgG}</td>
            </tr>
        `;
    });

    html += `</tbody></table></div>`;
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

// --- Export Functions ---
function downloadPDF(elementId, filename) {
    const element = document.getElementById(elementId);
    const opt = {
        margin: 10,
        filename: `${filename}_${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
}

function downloadWord(elementId, filename) {
    const element = document.getElementById(elementId);
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
        "xmlns:w='urn:schemas-microsoft-com:office:word' " +
        "xmlns='http://www.w3.org/TR/REC-html40'>" +
        "<head><meta charset='utf-8'><title>Export HTML to Word Document with JavaScript</title></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header + element.innerHTML + footer;

    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = `${filename}_${new Date().toISOString().slice(0, 10)}.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
}
