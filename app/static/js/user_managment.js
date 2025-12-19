// Переменные для управления пользователями
let currentUserToDelete = null;
let debounceTimer;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initializeUserManagement();
});

function searchBySkill() {
    const skillName = document.getElementById('skillSearch').value.trim();
    const minScore = document.getElementById('minScore').value;
    
    if (!skillName) {
        showNotification('Введите название навыка для поиска', 'error');
        return;
    }
    
    const searchBtn = document.querySelector('button[onclick="searchBySkill()"]');
    const originalText = searchBtn.innerHTML;
    searchBtn.disabled = true;
    searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Поиск...';

    const params = new URLSearchParams({
        skill: skillName,
        min_score: minScore
    });
    
    fetch(`/hr/search-by-skills?${params}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            searchBtn.disabled = false;
            searchBtn.innerHTML = '<i class="fas fa-search me-2"></i>Найти сотрудников';
            
            if (data.success) {
                displaySkillSearchResults(data);
                document.getElementById('skillSearchResults').style.display = 'block';
                
                // Прокрутка к результатам
                document.getElementById('skillSearchResults').scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            } else {
                showNotification(data.message || 'Ошибка поиска', 'error');
                document.getElementById('skillSearchResults').style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            searchBtn.disabled = false;
            searchBtn.innerHTML = '<i class="fas fa-search me-2"></i>Найти сотрудников';
            showNotification('Ошибка сети. Проверьте подключение.', 'error');
        });
}

function displaySkillSearchResults(data) {
    const container = document.getElementById('skillSearchResults');
    const header = document.getElementById('searchSkillName');
    const info = document.getElementById('searchSkillInfo');
    const content = document.getElementById('skillResultsContent');
    
    // Обновление заголовка
    header.textContent = `Навык: ${data.skill.name}`;
    info.textContent = `${data.skill.category} • Минимальный уровень: ${data.minScore}+ • Найдено сотрудников: ${data.total_found}`;
    
    if (!data.users || data.users.length === 0) {
        content.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 3rem; color: #666;">
                <i class="fas fa-search fa-3x mb-3" style="color: #ccc;"></i>
                <h4>Сотрудники не найдены</h4>
                <p>Нет сотрудников с навыком "${data.skill.name}" уровня ${data.minScore}+</p>
            </div>
        `;
        return;
    }
    
    // Создание карточек сотрудников
    let html = '<div class="employee-cards-container">';
    
    data.users.forEach(user => {
        const firstName = user.full_name.split(' ')[0];
        const lastName = user.full_name.split(' ')[1] || '';
        const initials = (firstName[0] + (lastName ? lastName[0] : '')).toUpperCase();
        
        // Получаем финальную оценку
        const finalScore = user.final_score || user.self_score || user.manager_score || 0;
        
        html += `
            <div class="employee-card">
                <div class="employee-card-header">
                    <div class="employee-info">
                        <div class="employee-name">${user.full_name}</div>
                        <div class="employee-department">
                            <i class="fas fa-building"></i>
                            ${user.department || 'Без отдела'}
                        </div>
                    </div>
                    <div class="employee-score score-${finalScore}">
                        ${finalScore}
                    </div>
                </div>
                
                <div class="employee-card-content">
                    <div class="employee-avatar">
                        ${initials}
                    </div>
                    <div class="score-details" style="flex: 1;">
                        ${user.self_score ? `<div><strong>Самооценка:</strong> ${user.self_score}</div>` : ''}
                        ${user.manager_score ? `<div><strong>Оценка руководителя:</strong> ${user.manager_score}</div>` : ''}
                        <div><strong>Роль:</strong> ${getRoleDisplayName(user.role)}</div>
                        ${user.position ? `<div><strong>Должность:</strong> ${user.position}</div>` : ''}
                    </div>
                </div>
                
                <div class="employee-card-footer">
                    <div class="view-profile-btn" onclick="viewUserProfile(${user.id})">
                        <i class="fas fa-eye"></i> Посмотреть профиль
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    content.innerHTML = html;
}

function getRoleDisplayName(role) {
    const roles = {
        'employee': 'Сотрудник',
        'manager': 'Руководитель',
        'hr': 'HR',
        'admin': 'Администратор'
    };
    return roles[role] || role;
}

function viewUserProfile(userId) {
    // Открываем профиль пользователя
    window.open(`/profile?user_id=${userId}`, '_blank');
    // Или если нужно в текущей вкладке:
    // window.location.href = `/profile?user_id=${userId}`;
}

function showNotification(message, type = 'success') {
    if (typeof showSkillToast === 'function') {
        showSkillToast(message, type);
    } else {
        // Простая реализация уведомлений
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" style="background:none;border:none;color:white;font-size:20px;cursor:pointer;margin-left:10px;">&times;</button>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#4caf50'};
            color: white;
            border-radius: 5px;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: space-between;
            min-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 3000);
    }
}

function initializeUserManagement() {
    // Загружаем список отделов для модального окна
    loadDepartments();
    
    // Настройка обработчиков событий для модального окна
    setupModalEventListeners();
    
    // Инициализация события поиска
    const searchInput = document.getElementById('userSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                searchUsers(e.target.value);
            }, 300);
        });
        
        // Закрытие результатов поиска при клике вне поля
        document.addEventListener('click', function(e) {
            const results = document.getElementById('userSearchResults');
            if (results && !searchInput.contains(e.target) && !results.contains(e.target)) {
                results.style.display = 'none';
            }
        });
    }
}

function setupModalEventListeners() {
    // Закрытие модального окна
    const closeBtn = document.getElementById('closeadduserModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const modal = document.getElementById('addUserModal');
    
    if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
    if (cancelBtn) cancelBtn.addEventListener('click', () => modal.style.display = 'none');
    
    // Закрытие при клике вне модального окна
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
        const deleteModal = document.getElementById('deleteUserModal');
        if (e.target === deleteModal) {
            deleteModal.style.display = 'none';
        }
    });
    
    // Отправка формы
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', saveUser);
    }
    
    // Изменение роли
    const roleSelect = document.getElementById('role');
    if (roleSelect) {
        roleSelect.addEventListener('change', function() {
            // Логика для отображения разных полей в зависимости от роли
        });
    }
}

// Поиск пользователей
function searchUsers(query) {
    if (!query || query.trim().length < 2) {
        hideSearchResults();
        return;
    }
    
    fetch(`/hr/api/search-users?q=${encodeURIComponent(query.trim())}`)
        .then(response => response.json())
        .then(data => {
            displaySearchResults(data);
        })
        .catch(error => {
            console.error('Error searching users:', error);
        });
}

function displaySearchResults(data) {
    const resultsContainer = document.getElementById('userSearchResults');
    
    if (!data.success || data.users.length === 0) {
        resultsContainer.innerHTML = `
            <div class="search-result-item">
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <span>Совпадений не найдено</span>
                </div>
            </div>
        `;
        resultsContainer.style.display = 'block';
        return;
    }
    
    let html = '';
    data.users.forEach(user => {
        // Определяем иконку для роли
        let roleIcon = 'fas fa-user';
        let roleClass = 'role-employee';
        if (user.role === 'manager') {
            roleIcon = 'fas fa-user-tie';
            roleClass = 'role-manager';
        } else if (user.role === 'hr') {
            roleIcon = 'fas fa-users';
            roleClass = 'role-hr';
        } else if (user.role === 'admin') {
            roleIcon = 'fas fa-user-shield';
            roleClass = 'role-admin';
        }
        
        html += `
            <div class="search-result-item" data-user-id="${user.id}">
                <div class="user-info" onclick="viewUserProfile(${user.id})">
                    <div class="user-avatar">
                        <div class="avatar-circle ${roleClass}">
                            <i class="${roleIcon}"></i>
                        </div>
                    </div>
                    <div class="user-details">
                        <div class="user-name">${user.full_name}</div>
                        <div class="user-meta">
                            <span class="user-role">${getRoleDisplayName(user.role)}</span>
                            ${user.position ? `<span class="user-position">• ${user.position}</span>` : ''}
                            ${user.department ? `<span class="user-department">• ${user.department}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="user-actions">
                    <button class="btn-action edit-btn" onclick="editUser(${user.id}, event)">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action delete-btn" onclick="confirmDeleteUser(${user.id}, '${user.full_name}', event)">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    resultsContainer.innerHTML = html;
    resultsContainer.style.display = 'block';
}

function hideSearchResults() {
    const resultsContainer = document.getElementById('userSearchResults');
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
    }
}

// Загрузка отделов для select
function loadDepartments() {
    fetch('/hr/api/departments')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const select = document.getElementById('department_id');
                select.innerHTML = '<option value="">Выберите отдел</option>';
                data.departments.forEach(dept => {
                    select.innerHTML += `<option value="${dept.id}">${dept.name}</option>`;
                });
            }
        })
        .catch(error => console.error('Error loading departments:', error));
}

// Отображение модального окна для добавления пользователя
function showAddUserModal() {
    const modal = document.getElementById('addUserModal');
    const title = document.getElementById('modaladduserTitle');
    const form = document.getElementById('addUserForm');
    const submitBtn = document.getElementById('submitBtn');
    
    // Сброс формы
    form.reset();
    document.getElementById('user_id').value = '';
    document.getElementById('password').required = true;
    
    // Установка заголовка и текста кнопки
    title.textContent = 'Добавить пользователя';
    submitBtn.textContent = 'Добавить';
    submitBtn.className = 'btn btn-primary';
    
    // Показать модальное окно
    modal.style.display = 'block';
    
    // Фокус на первом поле
    setTimeout(() => {
        document.getElementById('full_name').focus();
    }, 100);
}

// Редактирование пользователя
function editUser(userId, event) {
    if (event) event.stopPropagation();
    
    fetch(`/hr/api/users/${userId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showEditUserModal(data.user);
            } else {
                showNotification(data.message, 'error');
            }
        })
        .catch(error => {
            console.error('Error loading user:', error);
            showNotification('Ошибка загрузки данных пользователя', 'error');
        });
}

function showEditUserModal(user) {
    const modal = document.getElementById('addUserModal');
    const title = document.getElementById('modaladduserTitle');
    const form = document.getElementById('addUserForm');
    const submitBtn = document.getElementById('submitBtn');
    
    // Заполнение формы данными пользователя
    document.getElementById('user_id').value = user.id;
    document.getElementById('full_name').value = user.full_name || '';
    document.getElementById('login').value = user.login || '';
    document.getElementById('password').required = false;
    document.getElementById('email').value = user.email || '';
    document.getElementById('position').value = user.position || '';
    document.getElementById('role').value = user.role || '';
    document.getElementById('status').value = user.status || 'active';
    
    if (user.department_id) {
        // Нужно дождаться загрузки отделов
        setTimeout(() => {
            document.getElementById('department_id').value = user.department_id;
        }, 100);
    }
    
    // Установка заголовка и текста кнопки
    title.textContent = 'Редактировать пользователя';
    submitBtn.textContent = 'Сохранить изменения';
    submitBtn.className = 'btn btn-primary';
    
    // Показать модальное окно
    modal.style.display = 'block';
    
    // Фокус на первом поле
    setTimeout(() => {
        document.getElementById('full_name').focus();
    }, 100);
}

// Сохранение пользователя
function saveUser() {
    const form = document.getElementById('addUserForm');
    const formData = new FormData(form);
    const userId = document.getElementById('user_id').value;
    
    // Валидация
    if (!validateUserForm(formData)) {
        return;
    }
    
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';
    
    const url = userId ? `/hr/api/users/${userId}` : '/hr/api/users';
    const method = userId ? 'PUT' : 'POST';
    
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(Object.fromEntries(formData))
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification(userId ? 'Пользователь обновлен' : 'Пользователь добавлен', 'success');
            closeAddUserModal();
            // Обновить список пользователей или выполнить другие действия
            if (window.refreshUserList) {
                window.refreshUserList();
            }
            // Очистить поле поиска
            document.getElementById('userSearch').value = '';
            hideSearchResults();
        } else {
            showNotification(data.message || 'Ошибка сохранения', 'error');
            // Показать ошибки валидации
            if (data.errors) {
                Object.keys(data.errors).forEach(field => {
                    const errorElement = document.getElementById(`${field}_error`);
                    if (errorElement) {
                        errorElement.textContent = data.errors[field];
                    }
                });
            }
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Ошибка сети', 'error');
    })
    .finally(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    });
}

function validateUserForm(formData) {
    let isValid = true;
    
    // Очистка предыдущих ошибок
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
    
    const fullName = formData.get('full_name');
    const login = formData.get('login');
    const role = formData.get('role');
    
    if (!fullName || fullName.trim().length < 2) {
        document.getElementById('full_name_error').textContent = 'Введите полное имя (минимум 2 символа)';
        isValid = false;
    }
    
    if (!login || login.trim().length < 3) {
        document.getElementById('login_error').textContent = 'Введите логин (минимум 3 символа)';
        isValid = false;
    }
    
    if (!role) {
        document.getElementById('role_error').textContent = 'Выберите роль';
        isValid = false;
    }
    
    // Если это новый пользователь, проверяем пароль
    if (!formData.get('user_id') && (!formData.get('password') || formData.get('password').length < 6)) {
        document.getElementById('password_error').textContent = 'Пароль должен содержать минимум 6 символов';
        isValid = false;
    }
    
    return isValid;
}

function closeAddUserModal() {
    document.getElementById('addUserModal').style.display = 'none';
    document.getElementById('addUserForm').reset();
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
}

// Удаление пользователя
function confirmDeleteUser(userId, userName, event) {
    if (event) event.stopPropagation();
    
    currentUserToDelete = userId;
    const modal = document.getElementById('deleteUserModal');
    const message = document.getElementById('deleteUserMessage');
    
    message.textContent = `Вы уверены, что хотите удалить пользователя "${userName}"?`;
    modal.style.display = 'block';
}

function closeDeleteUserModal() {
    document.getElementById('deleteUserModal').style.display = 'none';
    currentUserToDelete = null;
}

function deleteUser() {
    if (!currentUserToDelete) return;
    
    const deleteBtn = document.getElementById('confirmDeleteUserBtn');
    const originalText = deleteBtn.innerHTML;
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Удаление...';
    
    fetch(`/hr/api/users/${currentUserToDelete}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Пользователь удален', 'success');
            closeDeleteUserModal();
            // Обновить интерфейс
            hideSearchResults();
            document.getElementById('userSearch').value = '';
        } else {
            showNotification(data.message || 'Ошибка удаления', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Ошибка сети', 'error');
    })
    .finally(() => {
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = originalText;
    });
}

// Просмотр профиля пользователя
function viewUserProfile(userId) {
    // Открываем профиль в новой вкладке (аналогично вашей кнопке)
    window.open(`/user/view-employee-profile/${userId}`, '_blank');
    
    // Или если нужно в текущей вкладке:
    // window.location.href = `/user/view-employee-profile/${userId}`;
}

// Вспомогательные функции
function getRoleDisplayName(role) {
    const roles = {
        'employee': 'Сотрудник',
        'manager': 'Руководитель',
        'hr': 'HR',
        'admin': 'Администратор'
    };
    return roles[role] || role;
}

function showNotification(message, type = 'success') {
    // Используйте вашу существующую функцию showSkillToast или создайте новую
    if (typeof showSkillToast === 'function') {
        showSkillToast(message, type);
    } else {
        // Простая реализация, если нет существующей функции
        alert(message);
    }
}

// Назначение обработчика для кнопки удаления
document.getElementById('confirmDeleteUserBtn')?.addEventListener('click', deleteUser);