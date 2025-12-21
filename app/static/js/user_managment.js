console.log('User management script loaded');

// Глобальная функция для отладки
window.debugUser = function(userId) {
    console.log(`Отладка пользователя ID: ${userId}`);
    fetch(`/hr/api/users/${userId}`)
        .then(r => r.json())
        .then(data => console.log('Данные:', data))
        .catch(e => console.error('Ошибка:', e));
};

// Переменные для управления пользователями
let currentUserToDelete = null;
let debounceTimer;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initializeUserManagement();
});

function searchBySkill() {
    const skillName = document.getElementById('skillSearch').value.trim();
    const minScoreSelect = document.getElementById('minScore');
    const minScore = minScoreSelect ? minScoreSelect.value : 1;
    
    if (!skillName) {
        showNotification('Введите название навыка для поиска', 'error');
        return;
    }
    
    // Очищаем предыдущие результаты
    document.getElementById('skillSearchResults').style.display = 'none';
    document.getElementById('skillResultsContent').innerHTML = '';
    
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
                // Добавляем minScore в данные для отображения
                data.minScore = minScore;
                displaySkillSearchResults(data);
                document.getElementById('skillSearchResults').style.display = 'block';
                
                // Прокрутка к результатам
                document.getElementById('skillSearchResults').scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            } else {
                    showNotification(data.message || 'Ошибка поиска', 'error');
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
    
    // Обновление заголовка - FIX: используем data.minScore или data.skill.min_score
    header.textContent = `Навык: ${data.skill.name}`;
    
    // FIX: правильно получаем минимальный уровень
    const minScore = data.minScore || data.skill?.min_score || 1;
    info.textContent = `${data.skill.category} • Минимальный уровень: ${minScore}+ • Найдено сотрудников: ${data.total_found || data.users?.length || 0}`;
    
    if (!data.users || data.users.length === 0) {
        content.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 3rem; color: #666;">
                <i class="fas fa-search fa-3x mb-3" style="color: #ccc;"></i>
                <h4>Сотрудники не найдены</h4>
                <p>Нет сотрудников с навыком "${data.skill.name}" уровня ${minScore}+</p>
            </div>
        `;
        return;
    }
    
    // Создание карточек сотрудников
    let html = '<div class="employee-cards-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; margin-top: 1rem;">';
    
    data.users.forEach(user => {
        const firstName = user.full_name.split(' ')[0];
        const lastName = user.full_name.split(' ')[1] || '';
        const initials = (firstName[0] + (lastName ? lastName[0] : '')).toUpperCase();
        
        // Получаем финальную оценку
        const finalScore = user.final_score || user.self_score || user.manager_score || 0;
        
        // Определяем цвет для оценки
        let scoreClass = 'score-badge';
        if (finalScore >= 4) {
            scoreClass = 'score-4';
        } else if (finalScore >= 3) {
            scoreClass = 'score-3';
        } else if (finalScore >= 2) {
            scoreClass = 'score-2';
        } else {
            scoreClass = 'score-1';
        }
        
        html += `
            <div class="employee-card" style="background: white; border-radius: 10px; padding: 1.5rem; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div class="employee-card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <div class="employee-info" style="flex: 1;">
                        <div class="employee-name" style="font-size: 1.25rem; font-weight: 600; color: #333;">${user.full_name}</div>
                        <div class="employee-department" style="color: #666; font-size: 0.9rem;">
                            <i class="fas fa-building"></i>
                            ${user.department || user.position || 'Не указано'}
                        </div>
                    </div>
                    <div class="employee-score ${scoreClass}" style="width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem; color: white; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        ${finalScore}
                    </div>
                </div>
                
                <div class="employee-card-content" style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
                    <div class="employee-avatar" style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: bold;">
                        ${initials}
                    </div>
                    <div class="score-details" style="flex: 1;">
                        ${user.self_score ? `<div style="margin-bottom: 0.5rem;"><strong>Самооценка:</strong> <span class="score-badge score-${user.self_score}">${user.self_score}</span></div>` : ''}
                        ${user.manager_score ? `<div style="margin-bottom: 0.5rem;"><strong>Оценка руководителя:</strong> <span class="score-badge score-${user.manager_score}">${user.manager_score}</span></div>` : ''}
                        <div style="margin-bottom: 0.5rem;"><strong>Роль:</strong> ${getRoleDisplayName(user.role)}</div>
                        ${user.position ? `<div><strong>Должность:</strong> ${user.position}</div>` : ''}
                    </div>
                </div>
                
                <div class="employee-card-footer">
                    <button class="btn" onclick="viewUserProfile(${user.id})" style="width: 100%; padding: 0.75rem; background: #f8f9fa; border: 1px solid #ddd; border-radius: 5px; cursor: pointer; color: #333; transition: all 0.3s;">
                        <i class="fas fa-eye"></i> Посмотреть профиль
                    </button>
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
    window.open(`/user/employee/${userId}`, '_blank');
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


function searchUsers(query) {
    if (!query || query.trim().length < 2) {
        hideSearchResults();
        return;
    }

    fetch(`/hr/api/search-users?q=${encodeURIComponent(query.trim())}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                displaySearchResults(data);
            } else {
                hideSearchResults();
                showNotification(data.message || 'Ошибка поиска', 'error');
            }
        })
        .catch(error => {
            console.error('Error searching users:', error);
            showNotification('Ошибка сети. Проверьте подключение.', 'error');
            hideSearchResults();
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
// Исправил, чтобы она возвращала Promise
function loadDepartments() {
    return fetch('/hr/api/departments')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const select = document.getElementById('department_id');
                select.innerHTML = '<option value="">Выберите отдел</option>';
                data.departments.forEach(dept => {
                    select.innerHTML += `<option value="${dept.id}">${dept.name}</option>`;
                });
                return data.departments; // Возвращаем данные для цепочки
            }
            throw new Error(data.message || 'Ошибка загрузки отделов');
        })
        .catch(error => {
            console.error('Error loading departments:', error);
            const select = document.getElementById('department_id');
            select.innerHTML = '<option value="">Ошибка загрузки отделов</option>';
            throw error;
        });
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
    
    console.log(`Редактирование пользователя ID: ${userId}`);
    
    // Показываем загрузку
    const originalText = document.getElementById('submitBtn')?.textContent || '';
    if (document.getElementById('submitBtn')) {
        document.getElementById('submitBtn').disabled = true;
        document.getElementById('submitBtn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка...';
    }
    
    fetch(`/hr/api/users/${userId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Данные пользователя:', data);
            if (data.success) {
                showEditUserModal(data.user);
            } else {
                showNotification(data.message || 'Ошибка загрузки данных пользователя', 'error');
            }
        })
        .catch(error => {
            console.error('Error loading user:', error);
            showNotification('Ошибка загрузки данных пользователя. Проверьте консоль.', 'error');
        })
        .finally(() => {
            // Восстанавливаем кнопку
            if (document.getElementById('submitBtn')) {
                document.getElementById('submitBtn').disabled = false;
                document.getElementById('submitBtn').innerHTML = originalText;
            }
        });
}

function showEditUserModal(user) {
    const modal = document.getElementById('addUserModal');
    const title = document.getElementById('modaladduserTitle');
    const submitBtn = document.getElementById('submitBtn');
    
    console.log('Редактирование пользователя:', user); // Для отладки
    
    // Заполнение формы данными пользователя
    document.getElementById('user_id').value = user.id;
    document.getElementById('full_name').value = user.full_name || '';
    document.getElementById('login').value = user.login || '';
    document.getElementById('password').required = false;
    document.getElementById('role').value = user.role || '';
    
    // Если есть email поле
    if (document.getElementById('email')) {
        document.getElementById('email').value = user.email || '';
    }
    
    // Если есть position поле
    if (document.getElementById('position')) {
        document.getElementById('position').value = user.position || '';
    }
    
    // Если есть status поле  
    if (document.getElementById('status')) {
        document.getElementById('status').value = user.status || 'active';
    }
    
    // Установка отдела - дожидаемся загрузки отделов
    if (user.department_id) {
        // Проверяем, загружены ли отделы
        const deptSelect = document.getElementById('department_id');
        if (deptSelect && deptSelect.options.length > 1) {
            // Отделы уже загружены
            deptSelect.value = user.department_id;
        } else {
            // Загружаем отделы и затем устанавливаем значение
            loadDepartments().then(() => {
                setTimeout(() => {
                    document.getElementById('department_id').value = user.department_id;
                }, 100);
            });
        }
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

function clearSkillSearch() {
    document.getElementById('skillSearch').value = '';
    document.getElementById('minScore').value = 3;
    document.getElementById('skillSearchResults').style.display = 'none';
    document.getElementById('skillResultsContent').innerHTML = '';
    showNotification('Поиск очищен', 'info');
}