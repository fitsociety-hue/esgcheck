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
        console.log('Fetching data from:', CONFIG.APPS_SCRIPT_URL);
        const response = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getData`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        console.log('Data received:', responseData);

        if (responseData.error) {
            alert('데이터를 불러오는 중 오류가 발생했습니다: ' + JSON.stringify(responseData.error));
            return;
        }

        let data = [];
        // Optimization: Handle compact format (headers + rows)
        if (responseData.headers && responseData.rows) {
            const headers = responseData.headers;
            data = responseData.rows.map(row => {
                let obj = {};
                headers.forEach((h, i) => {
                    obj[h] = row[i];
                });
                return obj;
            });
        } else if (Array.isArray(responseData)) {
            // Backward compatibility for old format
            data = responseData;
        }

        if (!data || data.length === 0) {
            console.warn('No data received from server.');
        }

        processData(data);
    } catch (error) {
        console.error('Error fetching data:', error);
        alert(`데이터를 불러오지 못했습니다.\n\n원인: ${error.message}\n\nGoogle Apps Script 배포 URL을 확인하거나, 잠시 후 다시 시도해주세요.`);
    }
}

function processData(data) {
    renderComprehensive(data);
    renderItemAnalysis(data);
    renderTeamAnalysis(data);
    renderSuggestions(data);
}

// --- 4. Workshop Suggestions ---
// --- 4. Workshop Suggestions ---
function renderSuggestions(data) {
    const container = document.getElementById('suggestions-container');
    if (!container) return;

    // --- 1. Calculate Statistics ---

    // Overall Category Averages
    const catScores = { E: 0, S: 0, G: 0 };
    const catCounts = { E: 0, S: 0, G: 0 };

    // Indicator Scores for finding weaknesses
    const indicatorScores = {};

    // Gap Stats
    const gapStats = {
        E: { total: 0, awareness: 0, action: 0, ideal: 0 },
        S: { total: 0, awareness: 0, action: 0, ideal: 0 },
        G: { total: 0, awareness: 0, action: 0, ideal: 0 }
    };

    data.forEach(row => {
        // A. Category Scores
        const rowScores = calculateRowScores(row);
        ['E', 'S', 'G'].forEach(cat => {
            if (rowScores[cat] > 0) {
                catScores[cat] += rowScores[cat];
                catCounts[cat]++;
            }
        });

        // B. Indicator Analysis & Gap Analysis
        ESG_CATEGORIES.forEach(cat => {
            cat.middleCategories.forEach(mid => {
                mid.indicators.forEach(ind => {
                    const ratingKey = `${ind.id}_rating`;
                    const val = Number(getValue(row, ratingKey));

                    if (!indicatorScores[ind.id]) indicatorScores[ind.id] = { sum: 0, count: 0, title: ind.title, catId: cat.id };

                    if (!isNaN(val) && val > 0) {
                        indicatorScores[ind.id].sum += val;
                        indicatorScores[ind.id].count++;
                    }

                    // Gap Analysis
                    // Checkbox data is stored in columns like "e1_1_content_0", "e1_1_content_1", etc.
                    let gapVal = "";
                    if (ind.contents && ind.contents.length > 0) {
                        ind.contents.forEach((_, idx) => {
                            const contentKey = `${ind.id}_content_${idx}`;
                            const val = getValue(row, contentKey);
                            if (val) gapVal += val + ",";
                        });
                    } else {
                        // Fallback for cases where contents might not be defined in data.js (unlikely but safe)
                        gapVal = getValue(row, ind.id) || "";
                    }

                    // Determine Gap Type
                    let type = 'unknown';
                    if (gapVal.includes('알지 못함')) {
                        type = 'awareness';
                    } else if (gapVal.includes('알고 있음') && !gapVal.includes('하고 있음')) {
                        type = 'action';
                    } else if (gapVal.includes('알고 있음') && gapVal.includes('하고 있음')) {
                        type = 'ideal';
                    }

                    if (type !== 'unknown') {
                        gapStats[cat.id][type]++;
                        gapStats[cat.id].total++;
                    }
                });
            });
        });
    });

    // --- 2. Process Findings ---

    const averages = {
        E: catCounts.E ? (catScores.E / catCounts.E) : 0,
        S: catCounts.S ? (catScores.S / catCounts.S) : 0,
        G: catCounts.G ? (catScores.G / catCounts.G) : 0
    };

    // Find Weakest Indicators
    const weakest = { E: null, S: null, G: null };
    Object.keys(indicatorScores).forEach(id => {
        const item = indicatorScores[id];
        const avg = item.count ? (item.sum / item.count) : 0;
        const cat = item.catId;

        if (!weakest[cat] || avg < weakest[cat].avg) {
            weakest[cat] = { ...item, avg: avg, id: id };
        }
    });

    // Process Gap Percentages
    const gapPercents = {};
    ['E', 'S', 'G'].forEach(id => {
        const total = gapStats[id].total || 1;
        gapPercents[id] = {
            awareness: ((gapStats[id].awareness / total) * 100).toFixed(1),
            action: ((gapStats[id].action / total) * 100).toFixed(1),
            ideal: ((gapStats[id].ideal / total) * 100).toFixed(1)
        };
    });

    // --- 3. Render HTML ---

    let html = `
        <p style="color: #666; margin-bottom: 2rem;">
            현재 <strong>${data.length}명</strong>의 응답 결과를 분석한 실시간 맞춤 제언입니다.
        </p>
        <div class="suggestions-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
    `;

    ['E', 'S', 'G'].forEach(cat => {
        const avg = averages[cat];
        const catName = cat === 'E' ? '환경(Environment)' : cat === 'S' ? '사회(Social)' : '지배구조(Governance)';
        const color = cat === 'E' ? '#4caf50' : cat === 'S' ? '#2196f3' : '#ff9800';

        // Dynamic Title Generation
        const weakItem = weakest[cat];
        const weakTitle = weakItem ? weakItem.title.replace(/\[.*?\]\s*/, '').trim() : "전반적 개선 필요";

        // Suggestion Title Logic
        let mainTitle = "";
        let mainContent = "";

        if (avg < 2.5) {
            mainTitle = `'${weakTitle}' 개선 시급`;
            mainContent = `해당 영역의 평균 점수는 ${avg.toFixed(1)}점으로, 특히 <strong>${weakTitle}</strong> 항목이 가장 취약합니다. 기초 체계 수립에 집중하세요.`;
        } else if (avg < 3.5) {
            mainTitle = `'${weakTitle}' 보완 필요`;
            mainContent = `전반적으로 양호하나 <strong>${weakTitle}</strong> 항목의 보완이 필요합니다. 실천 활동을 점검해보세요.`;
        } else {
            mainTitle = `ESG 경영 고도화 단계`;
            mainContent = `우수한 수준입니다. <strong>${weakTitle}</strong> 항목까지 챙기며 선도적인 모델을 구축하세요.`;
        }

        html += `
            <div class="card" style="border-top: 4px solid ${color};">
                <h4 style="color: ${color}; margin-bottom: 0.5rem;">${catName} <span style="font-size: 0.9em; color: #666;">(평균 ${avg.toFixed(1)}점)</span></h4>
                <h3 style="margin-bottom: 1rem; font-size: 1.3rem;">${mainTitle}</h3>
                <p style="color: #555; line-height: 1.6; min-height: 3em;">${mainContent}</p>
                
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
                        <strong>💡 ${catName} 맞춤 솔루션:</strong><br>
                        ${getGapSuggestion(gapPercents[cat], weakTitle)}
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
                    <li><strong>핵심 과제 도출 (Key Issues):</strong> <span>분석된 취약 항목(위 결과 참조)을 우선 해결 과제로 선정합니다.</span></li>
                    <li><strong>로드맵 작성 (Roadmap):</strong> 단기(1년), 중기(3년), 장기(5년) 실행 계획을 수립합니다.</li>
                    <li><strong>모니터링 및 피드백 (Feedback):</strong> 정기적인 성과 점검 및 개선 활동을 수행합니다.</li>
                </ol>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function getGapSuggestion(percents, weakTitle) {
    const awareness = parseFloat(percents.awareness);
    const action = parseFloat(percents.action);
    const ideal = parseFloat(percents.ideal);

    let strategy = "";

    if (awareness >= action && awareness >= ideal) {
        return `구성원들이 <strong>'${weakTitle}'</strong> 등 관련 활동을 잘 모르고 있습니다. <br>👉 <strong>내부 교육과 홍보를 강화</strong>하여 인지도를 높이는 것이 급선무입니다.`;
    } else if (action >= awareness && action >= ideal) {
        return `구성원들이 알고는 있으나 <strong>'${weakTitle}'</strong> 관련 실천으로 이어지지 못하고 있습니다. <br>👉 <strong>동기 부여와 실천 가능한 환경 조성</strong>이 필요합니다.`;
    } else {
        return `전반적으로 인지와 실천 수준이 양호합니다. <br>👉 <strong>'${weakTitle}'</strong> 분야의 <strong>우수 사례를 발굴하고 포상</strong>하여 문화를 확산하세요.`;
    }
}

// --- Helper: Robust Value Getter ---
function getValue(row, key) {
    if (!row) return undefined;
    if (row[key] !== undefined) return row[key];

    // Case insensitive & Trim check
    const lowerKey = key.toLowerCase().trim();
    const foundKey = Object.keys(row).find(k => k.toLowerCase().trim() === lowerKey);
    if (foundKey) return row[foundKey];

    return undefined;
}

// --- Helper: Calculate Scores per Row ---
function calculateRowScores(row) {
    const scores = { E: 0, S: 0, G: 0 };
    const counts = { E: 0, S: 0, G: 0 };

    ESG_CATEGORIES.forEach(cat => {
        cat.middleCategories.forEach(mid => {
            mid.indicators.forEach(ind => {
                const val = Number(getValue(row, `${ind.id}_rating`));
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

        // Handle keys (case-insensitive check using getValue)
        const name = getValue(row, 'name') || getValue(row, '성명') || '-';
        const dept = getValue(row, 'department') || getValue(row, '부서') || '-';
        const timestamp = getValue(row, 'Timestamp');
        const date = timestamp ? new Date(timestamp).toLocaleDateString() : '-';

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
                    const val = Number(getValue(row, `${ind.id}_rating`));
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
        const dept = getValue(row, 'department') || getValue(row, '부서') || '미지정';
        if (!teams[dept]) {
            teams[dept] = { count: 0, scores: { E: 0, S: 0, G: 0 }, counts: { E: 0, S: 0, G: 0 }, totalSum: 0 };
        }
        teams[dept].count++;

        const rowScores = calculateRowScores(row); // Use helper

        if (rowScores.E > 0) { teams[dept].scores.E += rowScores.E; teams[dept].counts.E++; }
        if (rowScores.S > 0) { teams[dept].scores.S += rowScores.S; teams[dept].counts.S++; }
        if (rowScores.G > 0) { teams[dept].scores.G += rowScores.G; teams[dept].counts.G++; }

        let rowTotal = Number(getValue(row, 'Total Score'));
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
            const indicatorId = `${currentMain.id}_${currentMiddle.indicators.length + 1} `;

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
