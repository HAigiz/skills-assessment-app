/**
 * Модуль для работы с графиками Chart.js.
 * Содержит функции для создания и управления различными типами графиков.
 */

// Конфигурация по умолчанию для всех графиков
const defaultChartConfig = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'bottom',
            labels: {
                font: {
                    family: 'Roboto, sans-serif',
                    size: 12
                },
                padding: 20,
                usePointStyle: true
            }
        },
        tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleFont: {
                family: 'Roboto, sans-serif',
                size: 13,
                weight: 'bold'
            },
            bodyFont: {
                family: 'Roboto, sans-serif',
                size: 12
            },
            padding: 12,
            cornerRadius: 6,
            displayColors: true,
            callbacks: {
                labelColor: function(context) {
                    return {
                        borderColor: context.dataset.borderColor,
                        backgroundColor: context.dataset.backgroundColor,
                        borderWidth: 2,
                        borderRadius: 2
                    };
                }
            }
        }
    }
};

// Цветовая палитра для графиков
const chartColors = {
    primary: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'],
    sequential: ['#e3f2fd', '#bbdefb', '#90caf9', '#64b5f6', '#42a5f5', '#2196f3', '#1e88e5', '#1976d2'],
    categorical: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'],
    success: ['#e8f5e9', '#c8e6c9', '#a5d6a7', '#81c784', '#66bb6a', '#4caf50', '#43a047', '#388e3c'],
    warning: ['#fff3e0', '#ffe0b2', '#ffcc80', '#ffb74d', '#ffa726', '#ff9800', '#f57c00', '#ef6c00'],
    danger: ['#ffebee', '#ffcdd2', '#ef9a9a', '#e57373', '#ef5350', '#f44336', '#e53935', '#d32f2f']
};

/**
 * Создает радарную диаграмму навыков.
 * @param {string} canvasId - ID canvas элемента
 * @param {Object} data - Данные для графика
 * @param {Object} options - Дополнительные опции
 * @returns {Chart} Экземпляр графика
 */
function createSkillsRadarChart(canvasId, data, options = {}) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    const defaultData = {
        labels: data.labels || [],
        datasets: [
            {
                label: 'Самооценка',
                data: data.self_scores || [],
                backgroundColor: 'rgba(102, 126, 234, 0.2)',
                borderColor: 'rgba(102, 126, 234, 0.8)',
                pointBackgroundColor: 'rgba(102, 126, 234, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            },
            {
                label: 'Оценка руководителя',
                data: data.manager_scores || [],
                backgroundColor: 'rgba(118, 75, 162, 0.2)',
                borderColor: 'rgba(118, 75, 162, 0.8)',
                pointBackgroundColor: 'rgba(118, 75, 162, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(118, 75, 162, 1)',
                borderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }
        ]
    };
    
    const defaultOptions = {
        ...defaultChartConfig,
        scales: {
            r: {
                beginAtZero: true,
                max: 5,
                min: 0,
                ticks: {
                    stepSize: 1,
                    font: {
                        family: 'Roboto, sans-serif',
                        size: 11
                    },
                    callback: function(value) {
                        if (value === 0) return '0';
                        if (value === 1) return '1\nНачальный';
                        if (value === 2) return '2\nБазовый';
                        if (value === 3) return '3\nСредний';
                        if (value === 4) return '4\nПродвинутый';
                        if (value === 5) return '5\nЭксперт';
                        return value;
                    }
                },
                pointLabels: {
                    font: {
                        family: 'Roboto, sans-serif',
                        size: 12,
                        weight: '500'
                    },
                    color: '#333'
                },
                angleLines: {
                    color: 'rgba(0, 0, 0, 0.1)',
                    lineWidth: 1
                },
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)',
                    circular: true
                }
            }
        },
        plugins: {
            ...defaultChartConfig.plugins,
            tooltip: {
                ...defaultChartConfig.plugins.tooltip,
                callbacks: {
                    label: function(context) {
                        const score = context.raw;
                        let level = '';
                        if (score <= 1) level = 'Начальный';
                        else if (score <= 2) level = 'Базовый';
                        else if (score <= 3) level = 'Средний';
                        else if (score <= 4) level = 'Продвинутый';
                        else level = 'Эксперт';
                        
                        return `${context.dataset.label}: ${score} (${level})`;
                    }
                }
            }
        }
    };
    
    return new Chart(ctx, {
        type: 'radar',
        data: defaultData,
        options: { ...defaultOptions, ...options }
    });
}

/**
 * Создает круговую диаграмму (doughnut).
 * @param {string} canvasId - ID canvas элемента
 * @param {Object} data - Данные для графика
 * @param {Object} options - Дополнительные опции
 * @returns {Chart} Экземпляр графика
 */
function createDoughnutChart(canvasId, data, options = {}) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    const defaultData = {
        labels: data.labels || [],
        datasets: [{
            data: data.values || [],
            backgroundColor: data.colors || chartColors.categorical,
            borderColor: '#fff',
            borderWidth: 2,
            hoverOffset: 15
        }]
    };
    
    const defaultOptions = {
        ...defaultChartConfig,
        cutout: '60%',
        plugins: {
            ...defaultChartConfig.plugins,
            tooltip: {
                ...defaultChartConfig.plugins.tooltip,
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
    };
    
    return new Chart(ctx, {
        type: 'doughnut',
        data: defaultData,
        options: { ...defaultOptions, ...options }
    });
}

/**
 * Создает столбчатую диаграмму (bar chart).
 * @param {string} canvasId - ID canvas элемента
 * @param {Object} data - Данные для графика
 * @param {Object} options - Дополнительные опции
 * @returns {Chart} Экземпляр графика
 */
function createBarChart(canvasId, data, options = {}) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    const defaultData = {
        labels: data.labels || [],
        datasets: data.datasets || [{
            label: data.label || 'Данные',
            data: data.values || [],
            backgroundColor: chartColors.primary[0],
            borderColor: chartColors.primary[0],
            borderWidth: 1
        }]
    };
    
    const defaultOptions = {
        ...defaultChartConfig,
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                },
                ticks: {
                    font: {
                        family: 'Roboto, sans-serif',
                        size: 11
                    }
                }
            },
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    font: {
                        family: 'Roboto, sans-serif',
                        size: 11
                    }
                }
            }
        }
    };
    
    return new Chart(ctx, {
        type: 'bar',
        data: defaultData,
        options: { ...defaultOptions, ...options }
    });
}

/**
 * Создает линейный график (line chart).
 * @param {string} canvasId - ID canvas элемента
 * @param {Object} data - Данные для графика
 * @param {Object} options - Дополнительные опции
 * @returns {Chart} Экземпляр графика
 */
function createLineChart(canvasId, data, options = {}) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    const defaultData = {
        labels: data.labels || [],
        datasets: data.datasets || [{
            label: data.label || 'Данные',
            data: data.values || [],
            borderColor: chartColors.primary[0],
            backgroundColor: chartColors.primary[0] + '20',
            borderWidth: 2,
            fill: true,
            tension: 0.4
        }]
    };
    
    const defaultOptions = {
        ...defaultChartConfig,
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                },
                ticks: {
                    font: {
                        family: 'Roboto, sans-serif',
                        size: 11
                    }
                }
            },
            x: {
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                },
                ticks: {
                    font: {
                        family: 'Roboto, sans-serif',
                        size: 11
                    }
                }
            }
        },
        elements: {
            point: {
                radius: 4,
                hoverRadius: 6
            }
        }
    };
    
    return new Chart(ctx, {
        type: 'line',
        data: defaultData,
        options: { ...defaultOptions, ...options }
    });
}

/**
 * Создает график сравнения двух пользователей.
 * @param {string} canvasId - ID canvas элемента
 * @param {Object} data - Данные для сравнения
 * @param {Object} options - Дополнительные опции
 * @returns {Chart} Экземпляр графика
 */
function createComparisonChart(canvasId, data, options = {}) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    const defaultData = {
        labels: data.labels || [],
        datasets: [
            {
                label: data.user1?.full_name || 'Пользователь 1',
                data: data.user1_scores || [],
                backgroundColor: 'rgba(102, 126, 234, 0.2)',
                borderColor: 'rgba(102, 126, 234, 0.8)',
                borderWidth: 2,
                fill: true
            },
            {
                label: data.user2?.full_name || 'Пользователь 2',
                data: data.user2_scores || [],
                backgroundColor: 'rgba(118, 75, 162, 0.2)',
                borderColor: 'rgba(118, 75, 162, 0.8)',
                borderWidth: 2,
                fill: true
            }
        ]
    };
    
    const defaultOptions = {
        ...defaultChartConfig,
        scales: {
            r: {
                beginAtZero: true,
                max: 5,
                min: 0,
                ticks: {
                    stepSize: 1,
                    callback: function(value) {
                        return value;
                    }
                }
            }
        }
    };
    
    return new Chart(ctx, {
        type: 'radar',
        data: defaultData,
        options: { ...defaultOptions, ...options }
    });
}

/**
 * Создает график распределения оценок.
 * @param {string} canvasId - ID canvas элемента
 * @param {Array} distribution - Распределение оценок
 * @param {Object} options - Дополнительные опции
 * @returns {Chart} Экземпляр графика
 */
function createScoreDistributionChart(canvasId, distribution, options = {}) {
    const scores = [1, 2, 3, 4, 5];
    const counts = scores.map(score => {
        const item = distribution.find(d => d.score === score);
        return item ? item.count : 0;
    });
    
    const colors = scores.map(score => {
        if (score === 1) return chartColors.danger[5];
        if (score === 2) return chartColors.warning[5];
        if (score === 3) return '#FFCE56';
        if (score === 4) return chartColors.success[5];
        return '#4BC0C0';
    });
    
    const data = {
        labels: scores.map(s => `Уровень ${s}`),
        datasets: [{
            label: 'Количество оценок',
            data: counts,
            backgroundColor: colors,
            borderColor: colors.map(c => c.replace('0.8', '1')),
            borderWidth: 1
        }]
    };
    
    return createBarChart(canvasId, data, {
        ...options,
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Количество оценок'
                }
            },
            x: {
                title: {
                    display: true,
                    text: 'Уровень навыка'
                }
            }
        }
    });
}

/**
 * Обновляет данные в существующем графике.
 * @param {Chart} chart - Экземпляр графика для обновления
 * @param {Object} newData - Новые данные
 */
function updateChartData(chart, newData) {
    if (newData.labels) {
        chart.data.labels = newData.labels;
    }
    
    if (newData.datasets) {
        chart.data.datasets = newData.datasets;
    } else if (newData.values) {
        chart.data.datasets[0].data = newData.values;
    }
    
    chart.update();
}

/**
 * Уничтожает график и освобождает ресурсы.
 * @param {Chart} chart - Экземпляр графика для уничтожения
 */
function destroyChart(chart) {
    if (chart) {
        chart.destroy();
    }
}

/**
 * Экспортирует график как изображение.
 * @param {Chart} chart - Экземпляр графика
 * @param {string} filename - Имя файла для сохранения
 * @param {string} format - Формат изображения (png, jpeg, webp)
 */
function exportChartAsImage(chart, filename = 'chart', format = 'png') {
    const link = document.createElement('a');
    link.download = `${filename}.${format}`;
    link.href = chart.toBase64Image(`image/${format}`, 1);
    link.click();
}

/**
 * Показывает анимацию загрузки для графика.
 * @param {string} containerId - ID контейнера графика
 */
function showChartLoading(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chart-loading';
    loadingDiv.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
        <span>Загрузка данных графика...</span>
    `;
    
    container.appendChild(loadingDiv);
}

/**
 * Скрывает анимацию загрузки графика.
 * @param {string} containerId - ID контейнера графика
 */
function hideChartLoading(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const loadingDiv = container.querySelector('.chart-loading');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

/**
 * Показывает сообщение об отсутствии данных.
 * @param {string} containerId - ID контейнера графика
 * @param {string} message - Сообщение для отображения
 */
function showNoDataMessage(containerId, message = 'Нет данных для отображения') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chart-empty';
    messageDiv.innerHTML = `
        <i class="fas fa-chart-line"></i>
        <p>${message}</p>
    `;
    
    container.appendChild(messageDiv);
}

window.ChartUtils = {
    createSkillsRadarChart,
    createDoughnutChart,
    createBarChart,
    createLineChart,
    createComparisonChart,
    createScoreDistributionChart,
    updateChartData,
    destroyChart,
    exportChartAsImage,
    showChartLoading,
    hideChartLoading,
    showNoDataMessage,
    chartColors,
    defaultChartConfig
};