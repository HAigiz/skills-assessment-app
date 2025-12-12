document.addEventListener('DOMContentLoaded', function() {
    // Инициализация
    setupEventListeners();
});

let currentSkillId = null;
let skillToDelete = null;

function setupEventListeners() {
    // Обработчики для модальных окон
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.skill-modal');
            modal.classList.remove('show');
        });
    });
    
    // Закрытие модальных окон при клике на оверлей
    document.querySelectorAll('.skill-modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('show');
            }
        });
    });
    
    // Обработка нажатия Enter в форме добавления навыка
    document.getElementById('skillName')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveSkill();
        }
    });
    
    document.getElementById('skillCategory')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveSkill();
        }
    });
}

function showAddSkillModal() {
    currentSkillId = null;
    document.getElementById('modalSkillTitle').textContent = 'Добавить навык';
    document.getElementById('skillForm').reset();
    document.getElementById('skillId').value = '';
    document.getElementById('skillModal').classList.add('show');
    
    // Фокус на первом поле
    setTimeout(() => {
        document.getElementById('skillName').focus();
    }, 100);
}

function editSkill(skillId) {
    currentSkillId = skillId;
    
    // В реальном приложении здесь загрузка данных навыка с сервера
    // fetch(`/api/skills/${skillId}`)...
    
    // Пример данных (временное решение)
    const skillCard = document.querySelector(`.skill-card[data-skill-id="${skillId}"]`);
    if (skillCard) {
        const skillName = skillCard.querySelector('.skill-name').textContent;
        const skillDescription = skillCard.querySelector('.skill-description')?.textContent || '';
        const category = skillCard.closest('.category-item').querySelector('.category-name').textContent;
        
        document.getElementById('modalSkillTitle').textContent = 'Редактировать навык';
        document.getElementById('skillName').value = skillName;
        document.getElementById('skillCategory').value = category;
        document.getElementById('skillDescription').value = skillDescription;
        document.getElementById('skillId').value = skillId;
        
        document.getElementById('skillModal').classList.add('show');
        
        setTimeout(() => {
            document.getElementById('skillName').focus();
        }, 100);
    }
}

function editCategory(categoryName) {
    const newName = prompt('Введите новое название категории:', categoryName);
    if (newName && newName.trim() !== '' && newName !== categoryName) {
        // В реальном приложении здесь вызов API для обновления категории
        fetch(`/api/categories/${encodeURIComponent(categoryName)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: newName.trim() })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showSkillToast('Категория обновлена');
                // Перезагрузка страницы для отображения изменений
                setTimeout(() => location.reload(), 1000);
            } else {
                showSkillToast(data.message || 'Ошибка обновления', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showSkillToast('Ошибка сети', 'error');
        });
    }
}

function saveSkill() {
    const skillName = document.getElementById('skillName').value.trim();
    const skillCategory = document.getElementById('skillCategory').value.trim();
    const skillDescription = document.getElementById('skillDescription').value.trim();
    const skillId = document.getElementById('skillId').value;
    
    if (!skillName || !skillCategory) {
        showSkillToast('Заполните название и категорию', 'error');
        return;
    }
    
    const saveBtn = document.getElementById('saveSkillBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';
    
    const method = skillId ? 'PUT' : 'POST';
    const url = skillId ? `/api/skills/${skillId}` : '/api/skills';
    
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: skillName,
            category: skillCategory,
            description: skillDescription
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSkillToast(skillId ? 'Навык обновлен' : 'Навык добавлен');
            closeSkillModal();
            // Перезагрузка страницы для отображения изменений
            setTimeout(() => location.reload(), 1000);
        } else {
            showSkillToast(data.message || 'Ошибка сохранения', 'error');
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showSkillToast('Ошибка сети', 'error');
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    });
}

function closeSkillModal() {
    document.getElementById('skillModal').classList.remove('show');
}

function confirmDeleteSkill(skillId, skillName) {
    skillToDelete = skillId;
    document.getElementById('deleteSkillName').textContent = `Удалить навык "${skillName}"?`;
    document.getElementById('deleteMessage').textContent = 'Все оценки по этому навыку также будут удалены. Это действие нельзя отменить.';
    document.getElementById('deleteModal').classList.add('show');
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('show');
    skillToDelete = null;
}

function deleteSkill() {
    if (!skillToDelete) return;
    
    const deleteBtn = document.getElementById('confirmDeleteBtn');
    const originalText = deleteBtn.innerHTML;
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Удаление...';
    
    fetch(`/api/skills/${skillToDelete}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSkillToast('Навык удален');
            closeDeleteModal();
            // Удаляем карточку навыка из DOM
            const skillCard = document.querySelector(`.skill-card[data-skill-id="${skillToDelete}"]`);
            if (skillCard) {
                skillCard.style.opacity = '0.5';
                setTimeout(() => {
                    skillCard.remove();
                    // Если в категории не осталось навыков, скрываем категорию
                    const categoryItem = skillCard.closest('.category-item');
                    const skillsList = categoryItem.querySelector('.skills-list');
                    if (skillsList.children.length === 0) {
                        categoryItem.remove();
                    }
                }, 300);
            }
        } else {
            showSkillToast(data.message || 'Ошибка удаления', 'error');
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = originalText;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showSkillToast('Ошибка сети', 'error');
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = originalText;
    });
}

function searchBySkill() {
    const skillName = document.getElementById('skillSearch').value.trim();
    const minScore = document.getElementById('minScore').value;
    
    if (!skillName) {
        showSkillToast('Введите название навыка для поиска', 'error');
        return;
    }
    
    fetch(`/api/skills/search?skill=${encodeURIComponent(skillName)}&min_score=${minScore}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displaySearchResults(data);
                document.getElementById('searchResults').style.display = 'block';
            } else {
                showSkillToast(data.message || 'Ошибка поиска', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showSkillToast('Ошибка сети', 'error');
        });
}

function displaySearchResults(data) {
    const resultsContainer = document.getElementById('resultsContainer');
    
    if (data.users.length === 0) {
        resultsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>Сотрудники не найдены</h3>
                <p>Нет сотрудников с навыком "${data.skill.name}" уровня ${data.min_score}+</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div style="margin-bottom: 1rem;">
            <h4>Навык: <strong>${data.skill.name}</strong> (${data.skill.category})</h4>
            <p>Минимальный уровень: ${data.min_score}+</p>
            <p>Найдено сотрудников: ${data.total_found}</p>
        </div>
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Сотрудник</th>
                        <th>Отдел</th>
                        <th>Роль</th>
                        <th>Самооценка</th>
                        <th>Оценка рук.</th>
                        <th>Общая</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    data.users.forEach(user => {
        html += `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="width: 30px; height: 30px; border-radius: 50%; background: #667eea; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                            ${user.full_name.charAt(0)}
                        </div>
                        ${user.full_name}
                    </div>
                </td>
                <td>${user.department || '-'}</td>
                <td>
                    <span class="department-badge">${user.role}</span>
                </td>
                <td>
                    ${user.self_score ? `<span class="score-badge-hr score-${user.self_score}">${user.self_score}</span>` : '-'}
                </td>
                <td>
                    ${user.manager_score ? `<span class="score-badge-hr score-${user.manager_score}">${user.manager_score}</span>` : '-'}
                </td>
                <td>
                    ${user.final_score ? `<span class="score-badge-hr score-${user.final_score}">${user.final_score}</span>` : '-'}
                </td>
                <td>
                    <a href="/profile?user_id=${user.id}" class="btn-view" style="padding: 0.3rem 0.6rem; font-size: 0.85rem;">
                        <i class="fas fa-eye"></i>
                    </a>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    resultsContainer.innerHTML = html;
}

function showSkillToast(message, type = 'success') {
    const toast = document.getElementById('skillToast');
    const messageElement = document.getElementById('skillToastMessage');
    
    messageElement.textContent = message;
    
    if (type === 'error') {
        toast.style.background = '#f44336';
    } else if (type === 'warning') {
        toast.style.background = '#ff9800';
    } else {
        toast.style.background = '#4caf50';
    }
    
    toast.style.display = 'flex';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}