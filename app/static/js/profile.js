let skillsRadarChart = null;
let chartData = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Profile page loaded');
    initializeSkillRating();
    initializeRadarChart();
    
    // Загружаем начальные данные для графика
    loadChartData();
});

function initializeSkillRating() {
    console.log('Initializing skill rating...');
    
    // Обработчики для кнопок оценки
    document.querySelectorAll('.score-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const skillItem = this.closest('.skill-item');
            const skillId = skillItem.dataset.skillId;
            const score = parseInt(this.dataset.score);
            
            // Удаляем активный класс у всех кнопок этого навыка
            this.closest('.skill-rating').querySelectorAll('.score-btn').forEach(b => {
                b.classList.remove('active');
            });
            
            // Добавляем активный класс текущей кнопке
            this.classList.add('active');
            
            // Обновляем текст уровня знания сразу (клиентская часть)
            updateSkillLevelText(skillItem, score);
            
            // Сохраняем оценку
            rateSkill(skillId, score);
        });
    });
}

function updateSkillLevelText(skillItem, score) {
    const skillLevelElement = skillItem.querySelector('.skill-level');
    if (skillLevelElement) {
        let levelText = '';
        switch(score) {
            case 1:
                levelText = 'Начальный уровень';
                break;
            case 2:
                levelText = 'Базовый уровень';
                break;
            case 3:
                levelText = 'Средний уровень';
                break;
            case 4:
                levelText = 'Продвинутый уровень';
                break;
            case 5:
                levelText = 'Эксперт';
                break;
            default:
                levelText = 'Не оценено';
        }
        skillLevelElement.textContent = levelText;
    }
}

function rateSkill(skillId, score) {
    console.log(`Rating skill ${skillId} with score ${score}`);
    
    fetch(SKILL_RATE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            skill_id: skillId,
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
        if (data.success) {
            // Обновляем бейдж самооценки
            const skillItem = document.querySelector(`.skill-item[data-skill-id="${skillId}"]`);
            const selfScoreBadge = skillItem.querySelector('.score-self');
            
            if (selfScoreBadge) {
                selfScoreBadge.textContent = score;
            } else {
                // Создаем новый бейдж, если его нет
                const skillRatingDiv = skillItem.querySelector('.skill-rating');
                const newBadge = document.createElement('div');
                newBadge.className = 'score-badge score-self';
                newBadge.title = 'Самооценка';
                newBadge.textContent = score;
                
                // Вставляем перед кнопками
                const scoreButtons = skillItem.querySelector('.score-buttons');
                skillRatingDiv.insertBefore(newBadge, scoreButtons);
            }
            
            // Обновляем текст уровня знания (на всякий случай)
            updateSkillLevelText(skillItem, score);
            
            // Показываем уведомление
            showSuccessToast('Оценка сохранена!');
            
            // Обновляем данные графика
            updateChartData(skillId, score);
            
        } else {
            // Находим элемент навыка
            const skillItem = document.querySelector(`.skill-item[data-skill-id="${skillId}"]`);
            
            // Сбрасываем активную кнопку при ошибке
            const activeBtn = skillItem.querySelector('.score-btn.active');
            if (activeBtn) {
                activeBtn.classList.remove('active');
            }
            
            // Возвращаем предыдущую оценку и текст уровня
            const selfScoreBadge = skillItem.querySelector('.score-self');
            if (selfScoreBadge && selfScoreBadge.textContent) {
                const previousScore = parseInt(selfScoreBadge.textContent);
                skillItem.querySelectorAll('.score-btn').forEach(btn => {
                    if (parseInt(btn.dataset.score) === previousScore) {
                        btn.classList.add('active');
                    }
                });
                // Возвращаем предыдущий текст уровня
                updateSkillLevelText(skillItem, previousScore);
            } else {
                // Если не было предыдущей оценки, устанавливаем "Не оценено"
                updateSkillLevelText(skillItem, 0);
            }
            
            throw new Error(data.error || 'Неизвестная ошибка');
        }
    })
    .catch(error => {
        console.error('Error rating skill:', error);
        showErrorToast('Ошибка при сохранении оценки. Попробуйте снова.');
    });
}

function initializeRadarChart() {
    console.log('Initializing radar chart...');
    
    const chartCanvas = document.getElementById('skillsRadarChart');
    if (!chartCanvas) {
        console.error('Chart canvas not found');
        return;
    }
    
    const ctx = chartCanvas.getContext('2d');
    
    // Уничтожаем предыдущий график, если он существует
    if (skillsRadarChart) {
        skillsRadarChart.destroy();
    }
    
    // Создаем пустой график с заглушкой
    skillsRadarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 5,
                    ticks: {
                        stepSize: 1,
                        backdropColor: 'transparent'
                    },
                    pointLabels: {
                        font: {
                            size: 11
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw}`;
                        }
                    }
                }
            }
        }
    });
}

function loadChartData() {
    console.log('Loading chart data...');
    
    // Показываем загрузку
    document.getElementById('chartLoading').style.display = 'block';
    document.getElementById('chartContainer').style.display = 'none';
    document.getElementById('noDataMessage').style.display = 'none';
    
    // Имитируем загрузку данных (в реальности здесь будет AJAX запрос)
    setTimeout(() => {
        updateChartFromDOM();
    }, 500);
}

function updateChartFromDOM() {
    console.log('Updating chart from DOM...');
    
    // Собираем данные из DOM
    const skills = [];
    const selfScores = [];
    const managerScores = [];
    
    document.querySelectorAll('.skill-item').forEach(skillItem => {
        const skillId = skillItem.dataset.skillId;
        const skillName = skillItem.querySelector('.skill-name').textContent;
        
        // Получаем самооценку
        const selfScoreBadge = skillItem.querySelector('.score-self');
        const selfScore = selfScoreBadge ? parseInt(selfScoreBadge.textContent) : 0;
        
        // Получаем оценку руководителя
        const managerScoreBadge = skillItem.querySelector('.score-manager');
        const managerScore = managerScoreBadge ? parseInt(managerScoreBadge.textContent) : 0;
        
        if (selfScore > 0 || managerScore > 0) {
            skills.push(skillName);
            selfScores.push(selfScore);
            managerScores.push(managerScore);
        }
    });
    
    if (skills.length > 0) {
        updateChart(skills, selfScores, managerScores);
    } else {
        showNoDataMessage();
    }
}

function updateChart(skills, selfScores, managerScores) {
    console.log('Updating chart with data:', { skills, selfScores, managerScores });
    
    const chartCanvas = document.getElementById('skillsRadarChart');
    if (!chartCanvas) {
        console.error('Chart canvas not found');
        return;
    }
    
    // Проверяем, есть ли данные для отображения
    const hasSelfData = selfScores.some(score => score > 0);
    const hasManagerData = managerScores.some(score => score > 0);
    
    if (!hasSelfData && !hasManagerData) {
        showNoDataMessage();
        return;
    }
    
    const datasets = [];
    
    if (hasSelfData) {
        datasets.push({
            label: 'Самооценка',
            data: selfScores,
            backgroundColor: 'rgba(102, 126, 234, 0.2)',
            borderColor: 'rgba(102, 126, 234, 0.8)',
            pointBackgroundColor: 'rgba(102, 126, 234, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(102, 126, 234, 1)',
            borderWidth: 2,
            pointRadius: 4
        });
    }
    
    if (hasManagerData) {
        datasets.push({
            label: 'Оценка руководителя',
            data: managerScores,
            backgroundColor: 'rgba(118, 75, 162, 0.2)',
            borderColor: 'rgba(118, 75, 162, 0.8)',
            pointBackgroundColor: 'rgba(118, 75, 162, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(118, 75, 162, 1)',
            borderWidth: 2,
            pointRadius: 4
        });
    }
    
    // Обновляем график
    skillsRadarChart.data.labels = skills;
    skillsRadarChart.data.datasets = datasets;
    skillsRadarChart.update();
    
    // Показываем график
    document.getElementById('chartLoading').style.display = 'none';
    document.getElementById('chartContainer').style.display = 'block';
    document.getElementById('noDataMessage').style.display = 'none';
}

function updateChartData(skillId, newScore) {
    console.log(`Updating chart data for skill ${skillId} with score ${newScore}`);
    
    // Находим элемент навыка
    const skillItem = document.querySelector(`.skill-item[data-skill-id="${skillId}"]`);
    if (!skillItem) {
        console.error(`Skill item ${skillId} not found`);
        return;
    }
    
    const skillName = skillItem.querySelector('.skill-name').textContent;
    
    // Обновляем данные графика из DOM
    updateChartFromDOM();
}

function showNoDataMessage() {
    console.log('No data for chart, showing message');
    
    document.getElementById('chartLoading').style.display = 'none';
    document.getElementById('chartContainer').style.display = 'none';
    document.getElementById('noDataMessage').style.display = 'block';
}

function showSuccessToast(message) {
    // Используем глобальную функцию из base.html
    if (typeof window.showToast === 'function') {
        window.showToast(message, 'success');
    } else {
        // Fallback если функция не определена
        console.log('Success:', message);
        alert(message);
    }
}

function showErrorToast(message) {
    // Используем глобальную функцию из base.html
    if (typeof window.showToast === 'function') {
        window.showToast(message, 'error');
    } else {
        // Fallback если функция не определена
        console.error('Error:', message);
        alert('Ошибка: ' + message);
    }
}