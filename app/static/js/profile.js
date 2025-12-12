document.addEventListener('DOMContentLoaded', function() {
    console.log('Profile page loaded');
    
    // Инициализация звездных рейтингов
    initializeStarRatings();
    
    // Инициализация графика навыков
    initializeSkillsChart();
    
    // Загрузка данных профиля
    loadProfileData();
});

function initializeStarRatings() {
    console.log('Initializing star ratings...');
    
    // Обработка кликов по звездам
    document.querySelectorAll('.star-rating').forEach(rating => {
        const stars = rating.querySelectorAll('.star');
        const skillId = rating.dataset.skillId;
        
        stars.forEach(star => {
            // Удаляем старые обработчики
            star.removeEventListener('click', handleStarClick);
            star.removeEventListener('mouseover', handleStarHover);
            star.removeEventListener('mouseout', handleStarOut);
            
            // Добавляем новые обработчики
            star.addEventListener('click', function(e) {
                e.stopPropagation();
                const score = parseInt(this.dataset.value);
                console.log(`Rating skill ${skillId} with score ${score}`);
                rateSkill(skillId, score);
            });
            
            star.addEventListener('mouseover', function() {
                const hoverScore = parseInt(this.dataset.value);
                highlightStars(rating, hoverScore);
            });
            
            star.addEventListener('mouseout', function() {
                const currentScore = getCurrentScore(skillId);
                highlightStars(rating, currentScore);
            });
        });
        
        // Восстанавливаем текущую оценку
        const currentScore = getCurrentScore(skillId);
        highlightStars(rating, currentScore);
    });
}

function handleStarClick(e) {
    e.stopPropagation();
    const star = e.target;
    const rating = star.closest('.star-rating');
    const skillId = rating.dataset.skillId;
    const score = parseInt(star.dataset.value);
    
    console.log(`Rating skill ${skillId} with score ${score}`);
    rateSkill(skillId, score);
}

function handleStarHover(e) {
    const star = e.target;
    const rating = star.closest('.star-rating');
    const hoverScore = parseInt(star.dataset.value);
    highlightStars(rating, hoverScore);
}

function handleStarOut(e) {
    const star = e.target;
    const rating = star.closest('.star-rating');
    const skillId = rating.dataset.skillId;
    const currentScore = getCurrentScore(skillId);
    highlightStars(rating, currentScore);
}

function getCurrentScore(skillId) {
    // Пытаемся получить текущую оценку из data-атрибута
    const rating = document.querySelector(`.star-rating[data-skill-id="${skillId}"]`);
    if (!rating) return 0;
    
    // Проверяем data-current-score
    if (rating.dataset.currentScore) {
        return parseInt(rating.dataset.currentScore);
    }
    
    // Ищем активную звезду
    const activeStar = rating.querySelector('.star.active');
    return activeStar ? parseInt(activeStar.dataset.value) : 0;
}

function highlightStars(rating, score) {
    const stars = rating.querySelectorAll('.star');
    stars.forEach(star => {
        const starValue = parseInt(star.dataset.value);
        star.classList.remove('active', 'hover');
        
        if (starValue <= score) {
            star.classList.add('active');
        }
    });
}

function rateSkill(skillId, score) {
    console.log(`Sending rating for skill ${skillId}: ${score}`);
    
    // Визуальная обратная связь
    const rating = document.querySelector(`.star-rating[data-skill-id="${skillId}"]`);
    if (rating) {
        highlightStars(rating, score);
    }
    
    // Отправка на сервер
    fetch('/api/assess-skill', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            skill_id: parseInt(skillId),
            score: score
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Response from server:', data);
        
        if (data.success) {
            showToast('Оценка успешно сохранена!', 'success');
            
            // Сохраняем текущую оценку в data-атрибут
            if (rating) {
                rating.dataset.currentScore = score;
            }
            
            // Обновляем отображение оценки
            updateScoreDisplay(skillId, score);
            
            // Обновляем график через 500мс
            setTimeout(() => {
                if (window.skillsChart) {
                    window.skillsChart.destroy();
                }
                initializeSkillsChart();
            }, 500);
        } else {
            showToast(data.message || 'Ошибка при сохранении', 'error');
            // Восстанавливаем предыдущую оценку
            const prevScore = data.previous_score || getCurrentScore(skillId);
            if (rating) {
                highlightStars(rating, prevScore);
                rating.dataset.currentScore = prevScore;
            }
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('Ошибка сети. Пожалуйста, попробуйте позже.', 'error');
        // Восстанавливаем предыдущую оценку
        const prevScore = getCurrentScore(skillId);
        if (rating) {
            highlightStars(rating, prevScore);
        }
    });
}

function updateScoreDisplay(skillId, score) {
    const scoreElement = document.querySelector(`.score-display[data-skill-id="${skillId}"]`);
    if (scoreElement) {
        scoreElement.textContent = score;
        scoreElement.className = `score-display score-${getScoreClass(score)}`;
    }
}

function getScoreClass(score) {
    if (score >= 4) return 'excellent';
    if (score >= 3) return 'good';
    if (score >= 2) return 'average';
    return 'poor';
}

function initializeSkillsChart() {
    console.log('Initializing skills chart...');
    
    const chartCanvas = document.getElementById('skillsChart');
    if (!chartCanvas) {
        console.log('Skills chart canvas not found');
        return;
    }
    
    const ctx = chartCanvas.getContext('2d');
    const skillsData = JSON.parse(chartCanvas.dataset.skills || '[]');
    
    console.log('Skills data for chart:', skillsData);
    
    if (skillsData.length === 0) {
        console.log('No skills data available');
        const loadingElement = document.getElementById('chartLoading');
        const noDataElement = document.getElementById('noDataMessage');
        
        if (loadingElement) loadingElement.style.display = 'none';
        if (noDataElement) noDataElement.style.display = 'block';
        return;
    }
    
    // Подготавливаем данные для графика
    const labels = skillsData.map(skill => skill.name);
    const selfScores = skillsData.map(skill => skill.self_score || 0);
    const finalScores = skillsData.map(skill => skill.final_score || skill.self_score || 0);
    
    // Уничтожаем предыдущий график, если он существует
    if (window.skillsChart) {
        window.skillsChart.destroy();
    }
    
    window.skillsChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Моя оценка',
                    data: selfScores,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 2,
                    pointRadius: 4
                },
                {
                    label: 'Итоговая оценка',
                    data: finalScores,
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    pointBackgroundColor: 'rgba(255, 99, 132, 1)',
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
                        callback: function(value) {
                            if (value === 0) return '0';
                            if (value === 1) return '1\nНачальный';
                            if (value === 2) return '2\nБазовый';
                            if (value === 3) return '3\nСредний';
                            if (value === 4) return '4\nПродвинутый';
                            if (value === 5) return '5\nЭксперт';
                            return value;
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
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
    const loadingElement = document.getElementById('chartLoading');
    const noDataElement = document.getElementById('noDataMessage');
    
    if (loadingElement) loadingElement.style.display = 'none';
    if (noDataElement) noDataElement.style.display = 'none';
    chartCanvas.style.display = 'block';
}

function loadProfileData() {
    // Загружаем дополнительные данные профиля если нужно
    console.log('Loading profile data...');
}

function showToast(message, type = 'info') {
    // Проверяем, есть ли уже тост с таким сообщением
    const existingToasts = document.querySelectorAll('.toast');
    for (const toast of existingToasts) {
        if (toast.textContent.includes(message)) {
            return; // Не показываем дубликат
        }
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        justify-content: space-between;
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    
    toast.innerHTML = `
        <div style="display: flex; align-items: center;">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} me-2"></i>
            <span>${message}</span>
        </div>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; margin-left: 10px;">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 3000);
}

// Добавляем CSS анимацию
const style = document.createElement('style');
style.textContent = `
@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

/* Стили для звездных рейтингов */
.star-rating {
    display: inline-flex;
    gap: 2px;
}

.star {
    cursor: pointer;
    color: #ddd;
    font-size: 1.5rem;
    transition: color 0.2s;
}

.star:hover,
.star.hover {
    color: #ffc107;
}

.star.active {
    color: #ffc107;
}

/* Стили для отображения оценок */
.score-display {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-weight: bold;
    font-size: 0.9rem;
}

.score-excellent {
    background-color: #d4edda;
    color: #155724;
}

.score-good {
    background-color: #d1ecf1;
    color: #0c5460;
}

.score-average {
    background-color: #fff3cd;
    color: #856404;
}

.score-poor {
    background-color: #f8d7da;
    color: #721c24;
}
`;
document.head.appendChild(style);