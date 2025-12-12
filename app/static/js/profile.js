document.addEventListener('DOMContentLoaded', function() {
    console.log('Profile page loaded');
    
    // Инициализация графика навыков (предполагает, что данные уже встроены в HTML-элемент)
    // В реальной жизни, возможно, лучше загружать данные для Chart.js отдельным API-запросом
    // Но для простоты оставим как есть, просто вызовем инициализацию
    initializeSkillsChart();
});

// --- API И ВЗАИМОДЕЙСТВИЕ С СЕРВЕРОМ ---

/**
 * Отправляет оценку навыка на сервер
 * @param {number} skillId - ID оцениваемого навыка
 * @param {number} score - Оценка (1-5)
 */
function rateSkill(skillId, score) {
    console.log(`Sending rating for skill ${skillId}: ${score}`);
    
    // 1. Обновляем визуальное состояние кнопок сразу (оптимистичное обновление)
    updateButtonVisuals(skillId, score);

    // 2. Отправка на сервер
    fetch(SKILL_RATE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            skill_id: skillId,
            score: score
        })
    })
    .then(response => {
        if (!response.ok) {
            // Если HTTP-статус не 200, пытаемся прочитать сообщение об ошибке
            return response.json().then(errorData => {
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Response from server:', data);
        
        if (data.success) {
            showToast('Оценка успешно сохранена!', 'success');
            
            // Обновляем значок с оценкой
            updateScoreBadge(skillId, data.new_score);
            
            // Обновляем график
            setTimeout(() => {
                // Уничтожаем старый график, если он есть
                if (window.skillsChart) {
                    window.skillsChart.destroy();
                }
                initializeSkillsChart();
            }, 300);
        } else {
            showToast(data.message || 'Ошибка при сохранении', 'error');
            // ОТКАТ: Если была ошибка, восстанавливаем предыдущую визуализацию
            const previousScore = data.previous_score || findCurrentScoreInDOM(skillId);
            updateButtonVisuals(skillId, previousScore);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast(`Ошибка сети: ${error.message || 'Пожалуйста, попробуйте позже.'}`, 'error');
        // В случае сетевой ошибки, откатываем визуализацию (ищем текущую оценку)
        const previousScore = findCurrentScoreInDOM(skillId);
        updateButtonVisuals(skillId, previousScore);
    });
}

// --- ФУНКЦИИ ОБНОВЛЕНИЯ DOM ---

/**
 * Обновляет значок самооценки для навыка.
 * @param {number} skillId - ID навыка.
 * @param {number} score - Новая оценка (1-5).
 */
function updateScoreBadge(skillId, score) {
    const item = document.querySelector(`.skill-item[data-skill-id="${skillId}"]`);
    if (!item) return;

    let badge = item.querySelector('.score-badge.score-self');
    
    if (score > 0) {
        if (!badge) {
            // Если значка нет, создаем его
            badge = document.createElement('div');
            badge.className = 'score-badge score-self';
            badge.title = 'Самооценка';
            const ratingContainer = item.querySelector('.skill-rating');
            if (ratingContainer) {
                // Вставляем значок перед блоком кнопок, чтобы сохранить порядок: [Самооценка] [Оценка менеджера] [Кнопки]
                const scoreButtons = item.querySelector('.score-buttons');
                ratingContainer.insertBefore(badge, scoreButtons);
            }
        }
        badge.textContent = score;
    } else if (badge) {
        // Если оценка 0, удаляем значок
        badge.remove();
    }
}

/**
 * Обновляет классы 'active' для кнопок оценки.
 * @param {number} skillId - ID навыка.
 * @param {number} score - Активная оценка.
 */
function updateButtonVisuals(skillId, score) {
    const item = document.querySelector(`.skill-item[data-skill-id="${skillId}"]`);
    if (!item) return;

    item.querySelectorAll('.score-btn').forEach(button => {
        const buttonScore = parseInt(button.dataset.score);
        button.classList.remove('active');
        if (buttonScore === score) {
            button.classList.add('active');
        }
    });
}

/**
 * Находит текущую оценку из DOM.
 * @param {number} skillId - ID навыка.
 * @returns {number} - Текущая оценка или 0.
 */
function findCurrentScoreInDOM(skillId) {
    const activeBtn = document.querySelector(`.skill-item[data-skill-id="${skillId}"] .score-btn.active`);
    return activeBtn ? parseInt(activeBtn.dataset.score) : 0;
}

// --- LOGIC FOR CHART.JS (Оставлено как в вашем коде, но с поправками) ---

let skillsChart = null;

function initializeSkillsChart() {
    console.log('Initializing skills chart...');
    
    // Вместо чтения из data-атрибутов, которые не обновляются динамически,
    // в реальном приложении вы должны сделать API-вызов для получения актуальных данных:
    // fetch('/api/user_skill_data').then(res => res.json()).then(skillsData => { ... })
    
    // Для этого примера, давайте предположим, что мы можем получить текущие оценки из DOM:
    const skillsData = getSkillsDataFromDOM();
    
    const chartCanvas = document.getElementById('skillsRadarChart');
    const loadingElement = document.getElementById('chartLoading');
    const chartContainer = document.getElementById('chartContainer');
    const noDataElement = document.getElementById('noDataMessage');
    
    if (!chartCanvas) return; // Убедиться, что canvas существует
    
    // Скрываем все и показываем загрузку, пока не определились
    loadingElement.style.display = 'block';
    chartContainer.style.display = 'none';
    noDataElement.style.display = 'none';

    if (skillsData.length === 0) {
        loadingElement.style.display = 'none';
        noDataElement.style.display = 'block';
        return;
    }
    
    // Подготовка данных
    const labels = skillsData.map(skill => skill.name);
    const selfScores = skillsData.map(skill => skill.self_score || 0);
    const managerScores = skillsData.map(skill => skill.manager_score || 0);
    
    const ctx = chartCanvas.getContext('2d');
    
    // Уничтожаем предыдущий график, если он существует
    if (window.skillsChartInstance) {
        window.skillsChartInstance.destroy();
    }
    
    window.skillsChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Самооценка',
                    data: selfScores,
                    // Используем цвета из CSS: #667eea (Self)
                    backgroundColor: 'rgba(102, 126, 234, 0.2)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    pointBackgroundColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 2,
                    pointRadius: 4
                },
                {
                    label: 'Оценка руководителя',
                    data: managerScores,
                    // Используем цвета из CSS: #764ba2 (Manager)
                    backgroundColor: 'rgba(118, 75, 162, 0.2)',
                    borderColor: 'rgba(118, 75, 162, 1)',
                    pointBackgroundColor: 'rgba(118, 75, 162, 1)',
                    borderWidth: 2,
                    pointRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 5,
                    min: 0,
                    ticks: {
                        stepSize: 1,
                        backdropColor: 'transparent',
                        callback: function(value) {
                             if (value === 0) return '';
                             if (value === 1) return 'Начальный';
                             if (value === 2) return 'Базовый';
                             if (value === 3) return 'Средний';
                             if (value === 4) return 'Продвинутый';
                             if (value === 5) return 'Эксперт';
                             return value;
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false // Скрываем легенду Chart.js, используем кастомную HTML-легенду
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const datasetLabel = context.dataset.label;
                            const value = context.raw;
                            let level = '';
                            
                            if (value <= 1) level = 'Начальный';
                            else if (value <= 2) level = 'Базовый';
                            else if (value <= 3) level = 'Средний';
                            else if (value <= 4) level = 'Продвинутый';
                            else level = 'Эксперт';
                            
                            return `${datasetLabel}: ${value} (${level})`;
                        }
                    }
                }
            }
        }
    });
    
    // Скрываем индикатор загрузки и показываем график
    loadingElement.style.display = 'none';
    chartContainer.style.display = 'block';
}

/**
 * Извлекает данные о навыках и их оценках из DOM для графика.
 * @returns {Array} - Список объектов навыков с оценками.
 */
function getSkillsDataFromDOM() {
    const skillsData = [];
    document.querySelectorAll('.skill-item').forEach(item => {
        const skillName = item.querySelector('.skill-name').textContent.trim();
        const selfBadge = item.querySelector('.score-badge.score-self');
        const managerBadge = item.querySelector('.score-badge.score-manager');
        
        const selfScore = selfBadge ? parseInt(selfBadge.textContent.trim()) : 0;
        const managerScore = managerBadge ? parseInt(managerBadge.textContent.trim()) : 0;

        skillsData.push({
            name: skillName,
            self_score: selfScore,
            manager_score: managerScore,
        });
    });
    return skillsData;
}


// --- TOAST NOTIFICATION (Оставлено как в вашем коде) ---

function showToast(message, type = 'info') {
    // Проверяем, есть ли уже тост с таким сообщением
    const existingToasts = document.querySelectorAll('.toast');
    for (const toast of existingToasts) {
        if (toast.textContent.includes(message)) {
            return; // Не показываем дубликат
        }
    }
    
    const toast = document.createElement('div');
    // Используем уже определенный в стилях класс, но с поправкой на цвет
    const bgColor = type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#3b82f6';
    const iconClass = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';

    toast.className = `toast ${type === 'error' ? 'error' : ''}`;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 5px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 1rem;
        animation: slideIn 0.3s ease;
    `;
    
    toast.innerHTML = `
        <i class="fas fa-${iconClass}"></i>
        <span id="toastMessage">${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 3000);
}