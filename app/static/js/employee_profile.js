let skillsRadarChart = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Employee profile page loaded');
    initializeManagerRating();
    initializeRadarChart();
    
    // Загружаем данные для графика
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
        if (isManager) {
            levelText += ' (ваша оценка)';
        } else {
            const selfScoreBadge = skillItem.querySelector('.score-self');
            if (selfScoreBadge && selfScoreBadge.textContent) {
                levelText += ' (самооценка)';
            }
        }
        
        skillLevelElement.textContent = levelText;
    }
}

function rateEmployeeSkill(skillId, score) {
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
            } else {
                // Создаем новый бейдж, если его нет
                const skillRatingDiv = skillItem.querySelector('.skill-rating');
                const newBadge = document.createElement('div');
                newBadge.className = 'score-badge score-manager';
                newBadge.title = 'Ваша оценка';
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
            updateChartFromDOM();
            
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
                // Возвращаем предыдущий текст уровня
                updateSkillLevelText(skillItem, previousScore, true);
            } else {
                // Если не было оценки руководителя, показываем самооценку или "Не оценено"
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
    
    // Создаем пустой график
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
}

function loadChartData() {
    console.log('Loading chart data...');
    
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
            console.log('Chart data received:', data);
            if (data.success && data.chart_data) {
                updateChart(data.chart_data.labels, 
                          data.chart_data.self_scores, 
                          data.chart_data.manager_scores);
            } else {
                console.warn('No chart data available');
                showNoDataMessage();
            }
        })
        .catch(error => {
            console.error('Error loading chart data:', error);
            showNoDataMessage();
        });
}

function updateChartFromDOM() {
    console.log('Updating chart from DOM...');
    
    const skills = [];
    const selfScores = [];
    const managerScores = [];
    
    document.querySelectorAll('.skill-item').forEach(skillItem => {
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
    console.log('Updating chart with data:', { 
        skillsCount: skills.length,
        skills: skills,
        selfScores: selfScores,
        managerScores: managerScores 
    });
    
    const chartCanvas = document.getElementById('skillsRadarChart');
    if (!chartCanvas) {
        console.error('Chart canvas not found');
        return;
    }
    
    // Проверяем, есть ли данные для отображения
    const hasSelfData = selfScores && selfScores.some(score => score > 0);
    const hasManagerData = managerScores && managerScores.some(score => score > 0);
    
    console.log('Data check:', { hasSelfData, hasManagerData });
    
    if ((!hasSelfData && !hasManagerData) || !skills || skills.length === 0) {
        console.log('No valid data for chart');
        showNoDataMessage();
        return;
    }
    
    const datasets = [];
    
    if (hasSelfData) {
        datasets.push({
            label: 'Самооценка сотрудника',
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
            label: 'Ваша оценка',
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
    
    try {
        // Уничтожаем предыдущий график, если он существует
        if (skillsRadarChart) {
            skillsRadarChart.destroy();
        }
        
        const ctx = chartCanvas.getContext('2d');
        skillsRadarChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: skills,
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