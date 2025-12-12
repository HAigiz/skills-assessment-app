document.addEventListener('DOMContentLoaded', function() {
    // Загружаем статистику
    loadHRStats();
    
    // Инициализируем графики
    initializeCharts();
    
    // Настраиваем обработчики событий
    setupEventListeners();
});

let rolesChart = null;
let departmentsChart = null;

function loadHRStats() {
    fetch('/api/hr/stats')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateStatsDisplay(data.stats);
                updateChartsData(data.stats);
            }
        })
        .catch(error => {
            console.error('Error loading HR stats:', error);
        });
}

function updateStatsDisplay(stats) {
    // Обновляем счетчик недавних оценок
    const recentElement = document.getElementById('recentAssessmentsCount');
    if (recentElement && stats.recent_assessments_count !== undefined) {
        recentElement.textContent = stats.recent_assessments_count;
    }
    
    // Обновляем среднюю оценку
    const avgScoreElement = document.querySelector('.stat-info-hr h3:nth-child(3)');
    if (avgScoreElement && stats.avg_score) {
        avgScoreElement.textContent = stats.avg_score.toFixed(1);
    }
}

function initializeCharts() {
    // Инициализируем график распределения по ролям
    const rolesCtx = document.getElementById('rolesChart').getContext('2d');
    
    // Получаем данные из шаблона (передаются через сервер)
    const rolesData = JSON.parse(document.getElementById('rolesChart').dataset.roles || '[]');
    const departmentsData = JSON.parse(document.getElementById('departmentsChart').dataset.departments || '[]');
    
    if (rolesData.length > 0) {
        createRolesChart(rolesCtx, rolesData);
    }
    
    if (departmentsData.length > 0) {
        const deptCtx = document.getElementById('departmentsChart').getContext('2d');
        createDepartmentsChart(deptCtx, departmentsData);
    }
}

function createRolesChart(ctx, rolesData) {
    const labels = rolesData.map(item => {
        const roleNames = {
            'employee': 'Сотрудник',
            'manager': 'Руководитель',
            'hr': 'HR',
            'admin': 'Администратор'
        };
        return roleNames[item.role] || item.role;
    });
    
    const data = rolesData.map(item => item.count);
    const backgroundColors = [
        'rgba(102, 126, 234, 0.8)',
        'rgba(118, 75, 162, 0.8)',
        'rgba(79, 172, 254, 0.8)',
        'rgba(67, 233, 123, 0.8)'
    ];
    
    rolesChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(color => color.replace('0.8', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function createDepartmentsChart(ctx, departmentsData) {
    const labels = departmentsData.map(item => item.name);
    const data = departmentsData.map(item => item.avg_score || 0);
    
    // Создаем градиентные цвета
    const backgroundColors = labels.map((_, index) => {
        const hue = 200 + (index * 30);
        return `hsla(${hue}, 70%, 60%, 0.8)`;
    });
    
    departmentsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Средняя оценка',
                data: data,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(color => color.replace('0.8', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 5,
                    title: {
                        display: true,
                        text: 'Средняя оценка'
                    },
                    ticks: {
                        callback: function(value) {
                            if (value === 0) return '0';
                            if (value === 1) return '1';
                            if (value === 2) return '2';
                            if (value === 3) return '3';
                            if (value === 4) return '4';
                            if (value === 5) return '5';
                            return value;
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Отделы'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw || 0;
                            let level = '';
                            if (value <= 1) level = 'Начальный';
                            else if (value <= 2) level = 'Базовый';
                            else if (value <= 3) level = 'Средний';
                            else if (value <= 4) level = 'Продвинутый';
                            else level = 'Эксперт';
                            
                            return `Средняя оценка: ${value.toFixed(1)} (${level})`;
                        }
                    }
                }
            }
        }
    });
}

function updateChartsData(stats) {
    // Обновляем график распределения оценок
    if (stats.score_distribution && stats.score_distribution.length > 0) {
        updateScoreDistributionChart(stats.score_distribution);
    }
}

function updateScoreDistributionChart(distribution) {
    // Можно добавить дополнительный график распределения оценок
    // Для простоты пока пропускаем
}

function setupEventListeners() {
    // Обработчики для кнопок экспорта
    document.querySelectorAll('.export-btn').forEach(btn => {
        if (btn.onclick) return; // Если уже есть обработчик
        
        if (btn.classList.contains('csv')) {
            // Кнопка CSV уже имеет ссылку
        } else if (btn.textContent.includes('пользователей')) {
            btn.onclick = exportUsersList;
        } else if (btn.textContent.includes('навыков')) {
            btn.onclick = exportSkillsList;
        }
    });
}

function exportUsersList() {
    showLoadingOverlay();
    
    // В реальном приложении здесь вызов API для экспорта пользователей
    fetch('/export/users/csv')
        .then(response => {
            if (response.ok) {
                return response.blob();
            }
            throw new Error('Ошибка экспорта');
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            hideLoadingOverlay();
        })
        .catch(error => {
            console.error('Export error:', error);
            alert('Ошибка при экспорте данных');
            hideLoadingOverlay();
        });
}

function exportSkillsList() {
    showLoadingOverlay();
    
    // В реальном приложении здесь вызов API для экспорта навыков
    fetch('/export/skills/csv')
        .then(response => {
            if (response.ok) {
                return response.blob();
            }
            throw new Error('Ошибка экспорта');
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `skills_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            hideLoadingOverlay();
        })
        .catch(error => {
            console.error('Export error:', error);
            alert('Ошибка при экспорте данных');
            hideLoadingOverlay();
        });
}

function showLoadingOverlay() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoadingOverlay() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

// Автоматическое обновление статистики каждые 5 минут
setInterval(loadHRStats, 5 * 60 * 1000);