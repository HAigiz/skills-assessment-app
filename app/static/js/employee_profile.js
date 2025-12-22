// employee_profile.js - исправленная версия

let skillsRadarChart = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('=== Employee Profile Initialization ===');
    console.log('EMPLOYEE_ID:', EMPLOYEE_ID);
    console.log('MANAGER_CHART_URL:', MANAGER_CHART_URL);
    console.log('USER_ROLE:', USER_ROLE || 'not defined');
    
    // Инициализация в зависимости от роли
    if (USER_ROLE !== 'hr') {
        initializeManagerRating();
    } else {
        initializeHRView();
    }
    
    initializeRadarChart();
    loadChartData();
});

function initializeManagerRating() {
    console.log('Initializing manager rating...');
    
    // Обработчики для кнопок оценки руководителя
    document.querySelectorAll('.score-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const skillItem = this.closest('.skill-item');
            const skillId = skillItem.dataset.skillId;
            const score = parseInt(this.dataset.score);
            
            // Проверяем, есть ли самооценка у сотрудника
            const selfScoreBadge = skillItem.querySelector('.score-self');
            if (!selfScoreBadge || !selfScoreBadge.textContent.trim()) {
                showErrorToast('Сотруднику необходимо сначала оценить этот навык!');
                return;
            }
            
            // Удаляем активный класс у всех кнопок этого навыка
            this.closest('.skill-rating').querySelectorAll('.score-btn').forEach(b => {
                b.classList.remove('active');
            });
            
            // Добавляем активный класс текущей кнопке
            this.classList.add('active');
            
            // Обновляем текст уровня знания
            updateSkillLevelText(skillItem, score, true);
            
            // Сохраняем оценку руководителя
            rateEmployeeSkill(skillId, score);
        });
    });
}

function initializeHRView() {
    console.log('Initializing HR view (read-only mode)');
    
    // Для HR скрываем кнопки оценки
    document.querySelectorAll('.score-btn').forEach(btn => {
        btn.style.display = 'none';
    });
    
    // Меняем заголовки оценок
    document.querySelectorAll('.score-manager').forEach(badge => {
        if (badge.title === 'Ваша оценка') {
            badge.title = 'Оценка руководителя';
        }
    });
}

function updateSkillLevelText(skillItem, score, isManager = true) {
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
        
        // Добавляем пометку, чья это оценка
        if (USER_ROLE === 'hr') {
            if (isManager) {
                levelText += ' (оценка руководителя)';
            } else {
                levelText += ' (самооценка сотрудника)';
            }
        } else {
            if (isManager) {
                levelText += ' (ваша оценка)';
            } else {
                levelText += ' (самооценка)';
            }
        }
        
        skillLevelElement.textContent = levelText;
    }
}

function rateEmployeeSkill(skillId, score) {
    // Если пользователь HR, не позволяем оценивать
    if (USER_ROLE === 'hr') {
        showErrorToast('HR не может оценивать сотрудников. Только просмотр.');
        return;
    }
    
    console.log(`Rating employee ${EMPLOYEE_ID} skill ${skillId} with manager score ${score}`);
    
    fetch(MANAGER_ASSESS_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            employee_id: EMPLOYEE_ID,
            skill_id: skillId,
            manager_score: score
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
            // Обновляем бейдж оценки руководителя
            const skillItem = document.querySelector(`.skill-item[data-skill-id="${skillId}"]`);
            const managerScoreBadge = skillItem.querySelector('.score-manager');
            
            if (managerScoreBadge) {
                managerScoreBadge.textContent = score;
                managerScoreBadge.title = USER_ROLE === 'hr' ? 'Оценка руководителя' : 'Ваша оценка';
            } else {
                // Создаем новый бейдж, если его нет
                const skillRatingDiv = skillItem.querySelector('.skill-rating');
                const newBadge = document.createElement('div');
                newBadge.className = 'score-badge score-manager';
                newBadge.title = USER_ROLE === 'hr' ? 'Оценка руководителя' : 'Ваша оценка';
                newBadge.textContent = score;
                
                // Вставляем перед кнопками
                const scoreButtons = skillItem.querySelector('.score-buttons');
                skillRatingDiv.insertBefore(newBadge, scoreButtons);
            }
            
            // Обновляем текст уровня знания
            updateSkillLevelText(skillItem, score, true);
            
            // Показываем уведомление
            showSuccessToast('Ваша оценка сохранена!');
            
            // Обновляем график
            setTimeout(() => {
                loadChartData();
            }, 500);
            
        } else {
            // Находим элемент навыка
            const skillItem = document.querySelector(`.skill-item[data-skill-id="${skillId}"]`);
            
            // Сбрасываем активную кнопку при ошибке
            const activeBtn = skillItem.querySelector('.score-btn.active');
            if (activeBtn) {
                activeBtn.classList.remove('active');
            }
            
            // Возвращаем предыдущую оценку руководителя и текст уровня
            const managerScoreBadge = skillItem.querySelector('.score-manager');
            if (managerScoreBadge && managerScoreBadge.textContent) {
                const previousScore = parseInt(managerScoreBadge.textContent);
                skillItem.querySelectorAll('.score-btn').forEach(btn => {
                    if (parseInt(btn.dataset.score) === previousScore) {
                        btn.classList.add('active');
                    }
                });
                updateSkillLevelText(skillItem, previousScore, true);
            } else {
                // Если не было оценки руководителя, показываем самооценку
                const selfScoreBadge = skillItem.querySelector('.score-self');
                if (selfScoreBadge && selfScoreBadge.textContent) {
                    const selfScore = parseInt(selfScoreBadge.textContent);
                    updateSkillLevelText(skillItem, selfScore, false);
                } else {
                    updateSkillLevelText(skillItem, 0, false);
                }
            }
            
            throw new Error(data.message || 'Неизвестная ошибка');
        }
    })
    .catch(error => {
        console.error('Error rating employee skill:', error);
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
            labels: ['Данные загружаются...'],
            datasets: [{
                label: 'Загрузка данных',
                data: [0],
                backgroundColor: 'rgba(200, 200, 200, 0.2)',
                borderColor: 'rgba(200, 200, 200, 0.8)',
                borderWidth: 1
            }]
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
                    display: true,
                    position: 'top'
                }
            }
        }
    });
}

function loadChartData() {
    console.log('Loading chart data from API...');
    
    // Показываем загрузку
    document.getElementById('chartLoading').style.display = 'block';
    document.getElementById('chartContainer').style.display = 'none';
    document.getElementById('noDataMessage').style.display = 'none';
    
    // Загружаем данные через API
    fetch(MANAGER_CHART_URL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Chart data received from API:', data);
            
            if (data.success && data.chart_data) {
                // Фильтруем только те навыки, у которых есть хотя бы одна оценка
                const filteredData = filterChartData(data.chart_data);
                
                if (filteredData.hasData) {
                    updateChartWithFilteredData(filteredData);
                } else {
                    console.log('No assessment data available');
                    showNoDataMessage();
                }
            } else {
                console.warn('No chart data available from API');
                showNoDataMessage();
            }
        })
        .catch(error => {
            console.error('Error loading chart data from API:', error);
            showNoDataMessage();
        });
}

function filterChartData(chartData) {
    const labels = [];
    const selfScores = [];
    const managerScores = [];
    
    // Проверяем каждый навык
    for (let i = 0; i < chartData.labels.length; i++) {
        const selfScore = chartData.self_scores[i];
        const managerScore = chartData.manager_scores[i];
        
        // Включаем навык, если есть хотя бы одна оценка (> 0)
        if ((selfScore && selfScore > 0) || (managerScore && managerScore > 0)) {
            labels.push(truncateLabel(chartData.labels[i]));
            selfScores.push(selfScore || 0);
            managerScores.push(managerScore || 0);
        }
    }
    
    return {
        labels: labels,
        selfScores: selfScores,
        managerScores: managerScores,
        hasData: labels.length > 0
    };
}

function truncateLabel(label) {
    // Обрезаем длинные названия для лучшего отображения
    if (label.length > 20) {
        return label.substring(0, 17) + '...';
    }
    return label;
}

function updateChartWithFilteredData(filteredData) {
    console.log('Updating chart with filtered data:', {
        skillsCount: filteredData.labels.length,
        labels: filteredData.labels
    });
    
    const datasets = [];
    
    // Добавляем самооценку, если есть данные
    const hasSelfData = filteredData.selfScores.some(score => score > 0);
    if (hasSelfData) {
        datasets.push({
            label: 'Самооценка сотрудника',
            data: filteredData.selfScores,
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
    
    // Добавляем оценку руководителя, если есть данные
    const hasManagerData = filteredData.managerScores.some(score => score > 0);
    if (hasManagerData) {
        const managerLabel = USER_ROLE === 'hr' 
            ? 'Оценка руководителя' 
            : 'Ваша оценка';
        
        datasets.push({
            label: managerLabel,
            data: filteredData.managerScores,
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
    
    // Проверяем, есть ли данные для отображения
    if (datasets.length === 0) {
        showNoDataMessage();
        return;
    }
    
    try {
        // Уничтожаем предыдущий график
        if (skillsRadarChart) {
            skillsRadarChart.destroy();
        }
        
        const chartCanvas = document.getElementById('skillsRadarChart');
        const ctx = chartCanvas.getContext('2d');
        
        // Рассчитываем размер шрифта в зависимости от количества навыков
        const pointLabelsSize = Math.max(10, Math.min(12, 300 / filteredData.labels.length));
        
        skillsRadarChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: filteredData.labels,
                datasets: datasets
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
                            font: {
                                size: 11
                            }
                        },
                        pointLabels: {
                            font: {
                                size: pointLabelsSize
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
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
        
        // Показываем график
        document.getElementById('chartLoading').style.display = 'none';
        document.getElementById('chartContainer').style.display = 'block';
        document.getElementById('noDataMessage').style.display = 'none';
        
        console.log('Chart updated successfully');
        
    } catch (error) {
        console.error('Error creating chart:', error);
        showNoDataMessage();
    }
}

function showNoDataMessage() {
    console.log('No data for chart, showing message');
    
    document.getElementById('chartLoading').style.display = 'none';
    document.getElementById('chartContainer').style.display = 'none';
    document.getElementById('noDataMessage').style.display = 'block';
}

function showSuccessToast(message) {
    const toast = document.getElementById('successToast');
    const messageElement = document.getElementById('toastMessage');
    
    messageElement.textContent = message;
    toast.style.display = 'flex';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

function showErrorToast(message) {
    const toast = document.getElementById('errorToast');
    const messageElement = document.getElementById('errorToastMessage');
    
    messageElement.textContent = message;
    toast.style.display = 'flex';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Вспомогательная функция для отладки (можно удалить в продакшене)
window.testChartAPI = function() {
    console.log('Testing chart API...');
    fetch(MANAGER_CHART_URL)
        .then(r => r.json())
        .then(data => {
            console.log('API Response:', data);
            if (data.success && data.chart_data) {
                console.log('Skills from API:', data.chart_data.labels);
                console.log('Total skills:', data.chart_data.labels.length);
                console.log('Self scores:', data.chart_data.self_scores);
                console.log('Manager scores:', data.chart_data.manager_scores);
            }
        })
        .catch(e => console.error('API Error:', e));
};

// Проверяем наличие Chart.js при загрузке
if (typeof Chart === 'undefined') {
    console.error('Chart.js is not loaded!');
    document.addEventListener('DOMContentLoaded', function() {
        document.getElementById('chartLoading').innerHTML = 
            '<div class="alert alert-danger">Ошибка: Chart.js не загружен. Проверьте подключение библиотеки.</div>';
    });
}