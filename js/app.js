// State
let currentCategoryIndex = 0;
let answers = {};
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
        alert('소속 부서를 선택해 주세요.');
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

    // Render Questions
    questionsContainer.innerHTML = '';
    category.questions.forEach(q => {
        const card = document.createElement('div');
        card.className = 'question-card';

        const existingAnswer = answers[q.id];

        card.innerHTML = `
            <div class="question-text">${q.text}</div>
            <div class="rating-options">
                ${renderRatingOption(q.id, '우수', 4, existingAnswer)}
                ${renderRatingOption(q.id, '양호', 3, existingAnswer)}
                ${renderRatingOption(q.id, '보통', 2, existingAnswer)}
                ${renderRatingOption(q.id, '미흡', 1, existingAnswer)}
            </div>
        `;
        questionsContainer.appendChild(card);
    });

    // Update Buttons
    btnPrev.style.display = currentCategoryIndex === 0 ? 'none' : 'block';
    btnNext.textContent = currentCategoryIndex === ESG_CATEGORIES.length - 1 ? '제출하기' : '다음';
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
    const currentQuestions = ESG_CATEGORIES[currentCategoryIndex].questions;
    const unanswered = currentQuestions.filter(q => !answers[q.id]);

    if (unanswered.length > 0) {
        alert('모든 문항에 답변해 주세요.');
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

    // Calculate Total Score (Optional)
    const totalScore = Object.values(answers).reduce((a, b) => a + b, 0);

    const payload = {
        ...userInfo,
        ...answers,
        'Total Score': totalScore
    };

    try {
        // Check if URL is configured
        if (CONFIG.APPS_SCRIPT_URL.includes("REPLACE")) {
            console.warn("Google Apps Script URL not configured. Simulating success.");
            // Simulate delay
            await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
            await fetch(CONFIG.APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors', // Important for Google Apps Script
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
