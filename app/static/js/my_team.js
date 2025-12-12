document.addEventListener('DOMContentLoaded', function() {
    // Инициализация
    setupEventListeners();
});

let currentMemberId = null;
let currentMemberName = '';
let skillsData = [];
let pendingChanges = {};

function setupEventListeners() {
    // Обработчики для модального окна
    document.querySelector('.close-assessment').addEventListener('click', closeAssessmentModal);
    document.getElementById('saveAssessmentBtn').addEventListener('click', saveAllAssessments);
    
    // Закрытие модального окна при клике на оверлей
    document.getElementById('assessmentModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeAssessmentModal();
        }
    });
}

function openAssessmentModal(memberId, memberName) {
    currentMemberId = memberId;
    currentMemberName = memberName;
    pendingChanges = {};
    
    // Обновляем заголовок
    document.getElementById('assessmentMemberName').textContent = `Оценка навыков: ${memberName}`;
    
    // Показываем модальное окно
    document.getElementById('assessmentModal').classList.add('show');
    
    // Загружаем навыки
    loadMemberSkills(memberId);
}

function closeAssessmentModal() {
    if (Object.keys(pendingChanges).length > 0) {
        if (confirm('У вас есть несохраненные изменения. Закрыть без сохранения?')) {
            document.getElementById('assessmentModal').classList.remove('show');
            currentMemberId = null;
            currentMemberName = '';
            pendingChanges = {};
        }
    } else {
        document.getElementById('assessmentModal').classList.remove('show');
        currentMemberId = null;
        currentMemberName = '';
        pendingChanges = {};
    }
}

function loadMemberSkills(memberId) {
    const loadingDiv = document.getElementById('skillsLoading');
    const skillsContainer = document.getElementById('skillsContainer');
    
    loadingDiv.style.display = 'block';
    skillsContainer.style.display = 'none';
    skillsContainer.innerHTML = '';
    
    fetch(`/api/user/${memberId}/skills`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                skillsData = data.chart_data;
                renderSkillsAssessment(data.chart_data);
                loadingDiv.style.display = 'none';
                skillsContainer.style.display = 'grid';
            } else {
                loadingDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i><p>${data.message || 'Ошибка загрузки'}</p>`;
            }
        })
        .catch(error => {
            console.error('Error loading skills:', error);
            loadingDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i><p>Ошибка загрузки навыков</p>';
        });
}

function renderSkillsAssessment(chartData) {
    const container = document.getElementById('skillsContainer');
    
    // Группируем по категориям
    const categories = {};
    chartData.labels.forEach((label, index) => {
        const category = chartData.categories[index];
        if (!categories[category]) {
            categories[category] = [];
        }
        
        categories[category].push({
            id: index, // Временный ID, в реальном приложении нужен skill_id
            name: label,
            self_score: chartData.self_scores[index],
            manager_score: chartData.manager_scores[index],
            final_score: chartData.final_scores[index]
        });
    });
    
    // Рендерим навыки
    for (const [category, skills] of Object.entries(categories)) {
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'skill-assessment-item';
        categoryHeader.style.gridColumn = '1 / -1';
        categoryHeader.style.background = '#e3f2fd';
        categoryHeader.innerHTML = `<strong>${category}</strong>`;
        container.appendChild(categoryHeader);
        
        skills.forEach(skill => {
            const skillDiv = document.createElement('div');
            skillDiv.className = 'skill-assessment-item';
            skillDiv.dataset.skillId = skill.id;
            
            skillDiv.innerHTML = `
                <div class="skill-name">
                    <span>${skill.name}</span>
                    <span class="category-badge">${category}</span>
                </div>
                <div class="score-section">
                    <span class="score-label">Самооценка:</span>
                    <span class="score-value">${skill.self_score || '-'}</span>
                </div>
                <div class="score-section">
                    <span class="score-label">Ваша оценка:</span>
                    <span class="score-value">${skill.manager_score || '-'}</span>
                </div>
                <div class="score-controls">
                    ${[1, 2, 3, 4, 5].map(score => `
                        <button class="manager-score-btn ${skill.manager_score === score ? 'active' : ''}"
                                data-score="${score}"
                                onclick="setManagerScore(${skill.id}, ${score})">
                            ${score}
                        </button>
                    `).join('')}
                </div>
            `;
            
            container.appendChild(skillDiv);
        });
    }
}

function setManagerScore(skillIndex, score) {
    // Находим элемент навыка
    const skillElements = document.querySelectorAll(`.skill-assessment-item[data-skill-id="${skillIndex}"]`);
    if (skillElements.length === 0) return;
    
    const skillElement = skillElements[0];
    
    // Обновляем визуальное состояние кнопок
    const buttons = skillElement.querySelectorAll('.manager-score-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.score) === score) {
            btn.classList.add('active');
        }
    });
    
    // Обновляем отображение оценки
    const scoreValue = skillElement.querySelector('.score-value:nth-child(2)');
    if (scoreValue) {
        scoreValue.textContent = score;
    }
    
    // Сохраняем изменение
    pendingChanges[skillIndex] = score;
}

function saveAllAssessments() {
    if (Object.keys(pendingChanges).length === 0) {
        showAssessmentToast('Нет изменений для сохранения', 'warning');
        return;
    }
    
    const saveBtn = document.getElementById('saveAssessmentBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';
    
    // В реальном приложении здесь должен быть вызов API
    // fetch(`/api/assess-member/${currentMemberId}`, {...})
    
    // Имитация сохранения
    setTimeout(() => {
        // Очищаем pendingChanges после успешного сохранения
        pendingChanges = {};
        
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
        
        showAssessmentToast('Оценки успешно сохранены!', 'success');
        
        // Закрываем модальное окно через 1.5 секунды
        setTimeout(() => {
            closeAssessmentModal();
            // Обновляем страницу или конкретную карточку сотрудника
            updateMemberCard(currentMemberId);
        }, 1500);
    }, 1000);
}

function updateMemberCard(memberId) {
    // В реальном приложении здесь должен быть вызов для обновления данных карточки
    const memberCard = document.querySelector(`.member-card[data-member-id="${memberId}"]`);
    if (memberCard) {
        // Можно добавить анимацию обновления
        memberCard.style.boxShadow = '0 0 0 3px #4caf50';
        setTimeout(() => {
            memberCard.style.boxShadow = '';
        }, 1000);
    }
}

function showAssessmentToast(message, type = 'success') {
    const toast = document.getElementById('assessmentToast');
    const messageElement = document.getElementById('assessmentToastMessage');
    
    messageElement.textContent = message;
    
    if (type === 'warning') {
        toast.style.background = '#ff9800';
    } else if (type === 'error') {
        toast.style.background = '#f44336';
    } else {
        toast.style.background = '#4caf50';
    }
    
    toast.style.display = 'flex';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}