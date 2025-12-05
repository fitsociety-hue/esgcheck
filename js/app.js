// State
let currentCategoryIndex = 0;
let answers = {}; // Stores ratings (e.g., "e1_1": 4)
let checks = {}; // Stores checkbox values (e.g., "e1_1": ["know", "doing"])
let userInfo = {};

// DOM Elements
const pages = {
    landing: document.getElementById('landing-page'),
    userInfo: document.getElementById('user-info-page'),
    diagnosis: document.getElementById('diagnosis-page'),
    completion: document.getElementById('completion-page')
};

const progressBar = document.getElementById('progress-bar');
const categoryTitle = document.getElementById('category-title');
const categoryDesc = document.getElementById('category-desc');
const questionsContainer = document.getElementById('questions-container');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const loadingOverlay = document.getElementById('loading-overlay');

// Navigation
function showPage(pageId) {
    Object.values(pages).forEach(page => page.classList.remove('active'));
    pages[pageId].classList.add('active');
    window.scrollTo(0, 0);
}

function startDiagnosis() {
    showPage('userInfo');
}

function submitUserInfo(event) {
    event.preventDefault();
    const name = document.getElementById('userName').value;
    const department = document.getElementById('department').value;

    if (!department) {
        alert('소속 부서를 입력해 주세요.');
        return;
    }

    userInfo = { name, department };
    currentCategoryIndex = 0;
    renderCategory();
    showPage('diagnosis');
}

// Diagnosis Logic
function renderCategory() {
    const category = ESG_CATEGORIES[currentCategoryIndex];

    // Update Header
    categoryTitle.textContent = category.title;
    categoryDesc.textContent = category.description;

    // Update Progress Bar
    const progress = ((currentCategoryIndex) / ESG_CATEGORIES.length) * 100;
    progressBar.style.width = `${progress}%`;

    // Render Content
    questionsContainer.innerHTML = '';

    // Create Main Card
    const card = document.createElement('div');
    card.className = 'question-card';

    // 1. Diagnosis Contents (List of items with checklists)
    let contentsHtml = '<div class="contents-section">';
    contentsHtml += '<p class="section-label">진단 내용 (각 항목별 해당사항 체크)</p>';

    category.contents.forEach((content, index) => {
        const contentId = `${category.id}_content_${index}`;
        const existingChecks = checks[contentId] || [];

        contentsHtml += `
            <div class="content-item" style="margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid #eee;">
                <div class="question-text" style="margin-bottom: 0.8rem;">${content}</div>
                <div class="check-options">
                    ${renderCheckOptions(contentId, existingChecks)}
                </div>
            </div>
        `;
    });
    contentsHtml += '</div>';

    // 2. Rating Section (One per Category)
    const ratingId = `${category.id}_rating`;
    const existingRating = answers[ratingId];

    let ratingHtml = `
        <div class="rating-section" style="margin-top: 2rem; padding-top: 1rem; border-top: 2px solid #eee;">
            <p class="section-label" style="font-size: 1.1rem; color: #2E7D32;">진단 지표 평가 (필수)</p>
            <div class="rating-options">
                ${renderRatingOption(ratingId, '우수', 4, existingRating)}
                ${renderRatingOption(ratingId, '양호', 3, existingRating)}
                ${renderRatingOption(ratingId, '보통', 2, existingRating)}
                ${renderRatingOption(ratingId, '미흡', 1, existingRating)}
            </div>
        </div>
    `;

    card.innerHTML = contentsHtml + ratingHtml;
    questionsContainer.appendChild(card);

    // Update Buttons
    btnPrev.style.display = currentCategoryIndex === 0 ? 'none' : 'block';
    btnNext.textContent = currentCategoryIndex === ESG_CATEGORIES.length - 1 ? '제출하기' : '다음';
}

function renderCheckOptions(questionId, existingChecks) {
    return CHECK_OPTIONS.map(opt => {
        const isChecked = existingChecks.includes(opt.value) ? 'checked' : '';
        const isSelected = existingChecks.includes(opt.value) ? 'selected' : '';
        return `
            <label class="check-option ${isSelected}" onclick="toggleCheck('${questionId}', '${opt.value}', this)">
                <input type="checkbox" name="${questionId}_check" value="${opt.value}" ${isChecked}>
                <span>${opt.label}</span>
            </label>
        `;
    }).join('');
}

function toggleCheck(questionId, value, element) {
    if (!checks[questionId]) checks[questionId] = [];

    const checkbox = element.querySelector('input[type="checkbox"]');

    if (checks[questionId].includes(value)) {
        checks[questionId] = checks[questionId].filter(v => v !== value);
        checkbox.checked = false;
        element.classList.remove('selected');
    } else {
        checks[questionId].push(value);
        checkbox.checked = true;
        element.classList.add('selected');
    }
}

function renderRatingOption(questionId, label, value, existingAnswer) {
    const isSelected = existingAnswer === value ? 'selected' : '';
    const isChecked = existingAnswer === value ? 'checked' : '';

    return `
        <label class="rating-option ${isSelected}" onclick="selectRating('${questionId}', ${value}, this)">
            <input type="radio" name="${questionId}" value="${value}" ${isChecked}>
            <span>${label}</span>
        </label>
    `;
}

function selectRating(questionId, value, element) {
    answers[questionId] = value;

    // Visual update
    const parent = element.parentElement;
    const options = parent.querySelectorAll('.rating-option');
    options.forEach(opt => opt.classList.remove('selected'));
    element.classList.add('selected');

    // Check radio button
    const radio = element.querySelector('input[type="radio"]');
    radio.checked = true;
}

function prevCategory() {
    if (currentCategoryIndex > 0) {
        currentCategoryIndex--;
        renderCategory();
    }
}

function nextCategory() {
    // Validation
    const category = ESG_CATEGORIES[currentCategoryIndex];
    const ratingId = `${category.id}_rating`;

    if (!answers[ratingId]) {
        alert('진단 지표 평가를 선택해 주세요.');
        return;
    }

    if (currentCategoryIndex < ESG_CATEGORIES.length - 1) {
        currentCategoryIndex++;
        renderCategory();
    } else {
        submitDiagnosis();
    }
}

async function submitDiagnosis() {
    if (!confirm('진단을 제출하시겠습니까?')) return;

    // Show loading state
    loadingOverlay.classList.add('active');

    // Calculate Total Score
    // Only count rating fields (ending in _rating)
    const ratingKeys = Object.keys(answers).filter(k => k.endsWith('_rating'));
    const totalScore = ratingKeys.reduce((sum, key) => sum + answers[key], 0);

    // Prepare payload
    const formattedChecks = {};
    Object.keys(checks).forEach(key => {
        formattedChecks[key] = checks[key].map(v => {
            const opt = CHECK_OPTIONS.find(o => o.value === v);
            return opt ? opt.label : v;
        }).join(', ');
    });

    const payload = {
        ...userInfo,
        ...answers,
        ...formattedChecks,
        'Total Score': totalScore
    };

    try {
        // Check if URL is configured
        if (CONFIG.APPS_SCRIPT_URL.includes("REPLACE")) {
            console.warn("Google Apps Script URL not configured. Simulating success.");
            await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
            await fetch(CONFIG.APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });
        }

        showPage('completion');
    } catch (error) {
        console.error('Error:', error);
        alert('제출 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
        loadingOverlay.classList.remove('active');
    }
}

