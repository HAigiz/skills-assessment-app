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
    const url = skillId ? `/skill/api/skills/${skillId}` : '/skill/api/skills';
    
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
    .then(response => {
        console.log('URL:', url);
        console.log('Метод:', method);
        console.log('Статус:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Ответ:', data);
        if (data.success) {
            showSkillToast(skillId ? 'Навык обновлен' : 'Навык добавлен');
            closeSkillModal();
            setTimeout(() => location.reload(), 1000);
        } else {
            showSkillToast(data.message || 'Ошибка сохранения', 'error');
        }
    })
    .catch(error => {
        console.error('Ошибка:', error);
        showSkillToast('Ошибка сети: ' + error.message, 'error');
    })
    .finally(() => {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    });
}

function closeSkillModal() {
    document.getElementById('skillModal').classList.remove('show');
}

function confirmDeleteSkill(skillId, skillName) {
    skillToDelete = skillId;
    
    // Простое сообщение без информации о количестве оценок
    const message = 'Все оценки по этому навыку также будут удалены. Это действие нельзя отменить.';
    
    document.getElementById('deleteSkillName').textContent = `Удалить навык "${skillName}"?`;
    document.getElementById('deleteMessage').textContent = message;
    document.getElementById('deleteModal').classList.add('show');
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('show');
    skillToDelete = null;
}

function deleteSkill() {
    if (!skillToDelete) return;
    
    const url = `/skill/api/skills/${skillToDelete}`;
    console.log('DELETE запрос на:', url);

    const deleteBtn = document.getElementById('confirmDeleteBtn');
    const originalText = deleteBtn.innerHTML;
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Удаление...';
    
    fetch(url, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'same-origin'
    })
    .then(response => {
        console.log('Статус DELETE:', response.status);
        console.log('URL запроса:', response.url);

        if (response.status === 409) {
            // Конфликт - есть оценки
            return response.json().then(data => {
                throw new Error(data.message || 'Невозможно удалить навык с оценками');
            });
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showSkillToast('Навык удален');
            closeDeleteModal();

            reloadSkillsSection();
            
            const skillCard = document.querySelector(`.skill-card[data-skill-id="${skillToDelete}"]`);
            
            if (skillCard) {
                skillCard.style.opacity = '0.5';
                setTimeout(() => {
                    skillCard.remove();
                    
                    // Если в категории не осталось навыков, обновляем страницу
                    const categoryItem = skillCard.closest('.category-item');
                    if (categoryItem) {
                        const skillsList = categoryItem.querySelector('.skills-list');
                        if (skillsList && skillsList.children.length === 0) {
                            setTimeout(() => location.reload(), 500);
                        }
                    }
                }, 300);
            }
        } else {
            showSkillToast(data.message || 'Ошибка удаления', 'error');
        }
    })
    .catch(error => {
        console.error('Ошибка DELETE:', error);
        showSkillToast('Ошибка сети: ' + error.message, 'error');
    })
    .finally(() => {
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = originalText;
        skillToDelete = null;
    });
}

function reloadSkillsSection() {
    const skillsSection = document.querySelector('.skills-management');
    const loadingHTML = `
        <div style="text-align: center; padding: 2rem;">
            <i class="fas fa-spinner fa-spin fa-2x"></i>
            <p>Обновление списка навыков...</p>
        </div>
    `;
    
    skillsSection.innerHTML = loadingHTML;
    
    // Загружаем обновленные данные с сервера
    fetch('/skill/skills')
        .then(response => response.text())
        .then(html => {
            // Парсим только нужную часть HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const newContent = doc.querySelector('.skills-management').innerHTML;
            
            // Заменяем содержимое
            skillsSection.innerHTML = newContent;
            
            // Инициализируем скрипты заново
            setupEventListeners();
        })
        .catch(error => {
            console.error('Error reloading skills:', error);
            skillsSection.innerHTML = '<div class="error">Ошибка загрузки навыков</div>';
        });
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