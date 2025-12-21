// Глобальные переменные
let comparisonChart = null;
let debounceTimers = {};
let selectedDepartment = '';
let selectedEmployees = { employee1: null, employee2: null };
let currentUserToDelete = null;

// Глобальная функция для отладки
window.debugUser = function(userId) {
    console.log(`Отладка пользователя ID: ${userId}`);
    fetch(`/hr/api/users/${userId}`)
        .then(r => r.json())
        .then(data => console.log('Данные:', data))
        .catch(e => console.error('Ошибка:', e));
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initializeUserManagement();
    initializeComparisonPage();
    
    // Закрытие результатов поиска при клике вне
    document.addEventListener('click', function(e) {
        const searchInputs = ['employee1', 'employee2'];
        searchInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            const results = document.getElementById(`${inputId}Results`);
            if (input && results && !input.contains(e.target) && !results.contains(e.target)) {
                results.style.display = 'none';
            }
        });
    });
    
    // Обработчик изменения отдела
    document.getElementById('department').addEventListener('change', function() {
        selectedDepartment = this.value;
        // Очищаем выбранных сотрудников при смене отдела
        clearSelectedEmployees();
    });

    // Обработчик поиска в таблице пользователей
    const searchInput = document.getElementById('userSearchTable');
    if (searchInput) {
        let searchTimer;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                filterUsersTable();
            }, 300);
        });
    }
    
    // Загружаем всех пользователей
    loadAllUsers();
    
    // Обновляем список пользователей после сохранения
    window.refreshUserList = function() {
        loadAllUsers();
    };
});

// Функции управления пользователями
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
    
    // Назначение обработчика для кнопки удаления
    document.getElementById('confirmDeleteUserBtn')?.addEventListener('click', deleteUser);
}

function loadDepartments() {
    return fetch('/hr/api/departments')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const select = document.getElementById('department_id');
                if (select) {
                    select.innerHTML = '<option value="">Выберите отдел</option>';
                    data.departments.forEach(dept => {
                        select.innerHTML += `<option value="${dept.id}">${dept.name}</option>`;
                    });
                }
                return data.departments;
            }
            throw new Error(data.message || 'Ошибка загрузки отделов');
        })
        .catch(error => {
            console.error('Error loading departments:', error);
            const select = document.getElementById('department_id');
            if (select) {
                select.innerHTML = '<option value="">Ошибка загрузки отделов</option>';
            }
            throw error;
        });
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
    if (!resultsContainer) return;
    
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
    
    console.log('Редактирование пользователя:', user);
    
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
            const userSearchInput = document.getElementById('userSearch');
            if (userSearchInput) {
                userSearchInput.value = '';
            }
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
            const userSearchInput = document.getElementById('userSearch');
            if (userSearchInput) {
                userSearchInput.value = '';
            }
            // Обновить список пользователей
            if (window.refreshUserList) {
                window.refreshUserList();
            }
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

// Поиск по навыкам
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

function clearSkillSearch() {
    document.getElementById('skillSearch').value = '';
    document.getElementById('minScore').value = 3;
    document.getElementById('skillSearchResults').style.display = 'none';
    document.getElementById('skillResultsContent').innerHTML = '';
    showNotification('Поиск очищен', 'info');
}

// Функции сравнения сотрудников
function initializeComparisonPage() {
    console.log('Страница сравнения сотрудников инициализирована');
}

function searchEmployee(employeeNum, query) {
    console.log(`Поиск сотрудника ${employeeNum}: "${query}"`);
    if (!query || query.trim().length < 2) {
        hideSearchResults(employeeNum);
        return;
    }
    
    clearTimeout(debounceTimers[employeeNum]);
    debounceTimers[employeeNum] = setTimeout(() => {
        performEmployeeSearch(employeeNum, query.trim());
    }, 300);
}

function performEmployeeSearch(employeeNum, query) {
    console.log(`🔍 Поиск сотрудника ${employeeNum}: "${query}"`);
    
    const resultsContainer = document.getElementById(`employee${employeeNum}Results`);
    
    if (!query || query.trim().length < 2) {
        resultsContainer.style.display = 'none';
        return;
    }

    const department = document.getElementById('department').value;
    console.log(`Отдел: "${department}"`);
    
    // Показываем индикатор загрузки
    resultsContainer.innerHTML = `
        <div style="padding: 10px; text-align: center; color: #666;">
            <i class="fas fa-spinner fa-spin"></i> Поиск...
        </div>
    `;
    resultsContainer.style.display = 'block';

    // Тестовый запрос - проверяем доступность endpoint
    fetch(`/hr/api/search-users?q=${encodeURIComponent(query.trim())}`)
        .then(response => {
            console.log(`Response status: ${response.status}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Данные с сервера:', data);
            
            if (data.success && data.users && data.users.length > 0) {
                // Показываем реальные результаты
                let html = '';
                data.users.forEach(user => {
                    const initials = getInitials(user.full_name);
                    html += `
                        <div onclick="selectEmployee(${employeeNum}, ${user.id}, '${user.full_name.replace(/'/g, "\\'")}')"
                             style="padding: 10px; border-bottom: 1px solid #eee; cursor: pointer; display: flex; align-items: center; gap: 10px;">
                            <div style="width: 40px; height: 40px; border-radius: 50%; background: #667eea; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                                ${initials}
                            </div>
                            <div style="flex: 1;">
                                <div style="font-weight: 500;">${user.full_name}</div>
                                <div style="font-size: 0.85rem; color: #666;">
                                    ${user.role} • ${user.department || 'Без отдела'}
                                </div>
                            </div>
                        </div>
                    `;
                });
                resultsContainer.innerHTML = html;
            } else {
                resultsContainer.innerHTML = `
                    <div style="padding: 10px; text-align: center; color: #666;">
                        <i class="fas fa-search"></i>
                        <span>${data.message || 'Сотрудники не найдены'}</span>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('❌ Ошибка запроса:', error);
            resultsContainer.innerHTML = `
                <div style="padding: 10px; text-align: center; color: #d32f2f;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Ошибка: ${error.message}</span>
                </div>
            `;
        });
}

function hideSearchResults(employeeNum) {
    const resultsContainer = document.getElementById(`employee${employeeNum}Results`);
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
    }
}

function selectEmployee(employeeNum, userId, userName, userRole) {
    // Скрываем результаты поиска
    hideSearchResults(employeeNum);
    
    // Обновляем поле ввода
    const inputField = document.getElementById(`employee${employeeNum}`);
    const hiddenField = document.getElementById(`employee${employeeNum}Id`);
    
    inputField.value = userName;
    hiddenField.value = userId;
    
    // Сохраняем выбранного сотрудника
    selectedEmployees[`employee${employeeNum}`] = {
        id: userId,
        name: userName,
        role: userRole
    };
    
    // Обновляем карточку сотрудника
    updateEmployeeCard(employeeNum, userName, userId);
    
    // Очищаем поле другого сотрудника, если выбрали того же сотрудника
    const otherEmployeeNum = employeeNum === 1 ? 2 : 1;
    const otherInputField = document.getElementById(`employee${otherEmployeeNum}`);
    const otherHiddenField = document.getElementById(`employee${otherEmployeeNum}Id`);
    
    if (otherHiddenField.value == userId) {
        otherInputField.value = '';
        otherHiddenField.value = '';
        selectedEmployees[`employee${otherEmployeeNum}`] = null;
        updateEmployeeCard(otherEmployeeNum, 'Не выбран', null);
    }
}

function updateEmployeeCard(employeeNum, userName, userId) {
    const avatarElement = document.getElementById(`employee${employeeNum}Avatar`);
    const nameElement = document.getElementById(`employee${employeeNum}Name`);
    const infoElement = document.getElementById(`employee${employeeNum}Info`);
    
    if (userId) {
        const initials = getInitials(userName);
        avatarElement.textContent = initials;
        nameElement.textContent = userName;
        
        // Получаем дополнительную информацию о сотруднике
        fetch(`/hr/api/users/${userId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const role = getRoleDisplayName(data.user.role);
                    const position = data.user.position || '';
                    const department = data.user.department || '';
                    
                    let infoText = role;
                    if (position) infoText += ` • ${position}`;
                    if (department) infoText += ` • ${department}`;
                    
                    infoElement.textContent = infoText;
                }
            })
            .catch(error => {
                console.error('Error loading user details:', error);
                infoElement.textContent = 'Информация загружается...';
            });
    } else {
        avatarElement.textContent = '?';
        nameElement.textContent = 'Не выбран';
        infoElement.textContent = 'Выберите сотрудника';
    }
}

function clearSelectedEmployees() {
    // Очищаем поля ввода
    ['employee1', 'employee2'].forEach(id => {
        const input = document.getElementById(id);
        const hidden = document.getElementById(`${id}Id`);
        if (input) input.value = '';
        if (hidden) hidden.value = '';
        
        const results = document.getElementById(`${id}Results`);
        if (results) results.style.display = 'none';
    });
    
    // Сбрасываем выбранных сотрудников
    selectedEmployees.employee1 = null;
    selectedEmployees.employee2 = null;
    
    // Обновляем карточки
    updateEmployeeCard(1, 'Не выбран', null);
    updateEmployeeCard(2, 'Не выбран', null);
    
    // Скрываем результаты сравнения
    document.getElementById('comparisonResults').style.display = 'none';
}

function compareEmployees() {
    const employee1Id = document.getElementById('employee1Id').value;
    const employee2Id = document.getElementById('employee2Id').value;
    const department = document.getElementById('department').value;
    
    // Валидация
    if (!department) {
        showNotification('Выберите отдел', 'error');
        return;
    }
    
    if (!employee1Id || !employee2Id) {
        showNotification('Выберите обоих сотрудников для сравнения', 'error');
        return;
    }
    
    if (employee1Id === employee2Id) {
        showNotification('Выберите разных сотрудников для сравнения', 'error');
        return;
    }
    
    // Показываем кнопку загрузки
    const compareBtn = document.getElementById('compareBtn');
    const originalText = compareBtn.innerHTML;
    compareBtn.disabled = true;
    compareBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Сравнение...';
    
    // Показываем результаты
    document.getElementById('comparisonResults').style.display = 'block';
    
    // Показываем загрузку таблицы
    document.getElementById('comparisonLoading').style.display = 'block';
    document.getElementById('skillsTable').style.display = 'none';
    document.getElementById('noComparisonData').style.display = 'none';
    document.getElementById('chartSection').style.display = 'none';
    
    // Обновляем заголовки таблицы
    document.getElementById('employee1Header').textContent = selectedEmployees.employee1 ? selectedEmployees.employee1.name : 'Сотрудник 1';
    document.getElementById('employee2Header').textContent = selectedEmployees.employee2 ? selectedEmployees.employee2.name : 'Сотрудник 2';
    
    // Загружаем данные сравнения
    fetch(`/hr/compare-users?user1=${employee1Id}&user2=${employee2Id}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            compareBtn.disabled = false;
            compareBtn.innerHTML = originalText;
            
            if (data.success) {
                displayComparisonData(data);
            } else {
                showNotification(data.message || 'Ошибка при сравнении сотрудников', 'error');
                document.getElementById('comparisonLoading').style.display = 'none';
                document.getElementById('noComparisonData').style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Error comparing employees:', error);
            compareBtn.disabled = false;
            compareBtn.innerHTML = originalText;
            showNotification('Ошибка сети. Проверьте подключение.', 'error');
            document.getElementById('comparisonLoading').style.display = 'none';
        });
}

function displayComparisonData(data) {
    const tableBody = document.getElementById('skillsTableBody');
    
    // Очищаем таблицу
    tableBody.innerHTML = '';
    
    if (!data.comparison || data.comparison.length === 0) {
        document.getElementById('comparisonLoading').style.display = 'none';
        document.getElementById('noComparisonData').style.display = 'block';
        return;
    }
    
    // Сортируем навыки по категории и названию
    const sortedComparison = [...data.comparison].sort((a, b) => {
        if (a.category !== b.category) {
            return a.category.localeCompare(b.category);
        }
        return a.skill_name.localeCompare(b.skill_name);
    });
    
    let currentCategory = '';
    let rowCount = 0;
    
    sortedComparison.forEach(skill => {
        // Добавляем заголовок категории, если она изменилась
        if (skill.category !== currentCategory) {
            currentCategory = skill.category;
            tableBody.innerHTML += `
                <tr style="background: #f8f9fa;">
                    <td colspan="4" style="font-weight: 600; color: #333; padding: 0.75rem 1rem;">
                        ${skill.category}
                    </td>
                </tr>
            `;
        }
        
        const user1Score = skill.user1_score !== null ? skill.user1_score : '—';
        const user2Score = skill.user2_score !== null ? skill.user2_score : '—';
        const difference = skill.difference;
        
        let differenceHtml = '—';
        let differenceClass = 'difference-zero';
        
        if (difference !== null) {
            if (difference > 0) {
                differenceHtml = `<span class="difference-positive">+${difference}</span>`;
                differenceClass = 'difference-positive';
            } else if (difference < 0) {
                differenceHtml = `<span class="difference-negative">${difference}</span>`;
                differenceClass = 'difference-negative';
            } else {
                differenceHtml = '<span class="difference-zero">0</span>';
                differenceClass = 'difference-zero';
            }
        }
        
        tableBody.innerHTML += `
            <tr>
                <td>
                    <div class="skill-name">${skill.skill_name}</div>
                </td>
                <td class="score-cell">
                    ${user1Score !== '—' ? `<span class="score-badge score-${user1Score}">${user1Score}</span>` : '<span class="no-data">—</span>'}
                </td>
                <td class="score-cell">
                    ${user2Score !== '—' ? `<span class="score-badge score-${user2Score}">${user2Score}</span>` : '<span class="no-data">—</span>'}
                </td>
                <td class="difference-cell ${differenceClass}">
                    ${differenceHtml}
                </td>
            </tr>
        `;
        
        rowCount++;
    });
    
    // Показываем таблицу
    document.getElementById('comparisonLoading').style.display = 'none';
    document.getElementById('skillsTable').style.display = 'table';
    
    // Создаем график, если есть данные
    createComparisonChart(sortedComparison, data);
}

function createComparisonChart(skillsData, comparisonData) {
    // Фильтруем навыки, у которых есть оценки у обоих сотрудников
    const chartSkills = skillsData.filter(skill => 
        skill.user1_score !== null && skill.user2_score !== null
    );
    
    if (chartSkills.length < 3) {
        // Слишком мало данных для графика
        document.getElementById('chartSection').style.display = 'none';
        return;
    }
    
    // Показываем секцию с графиком
    document.getElementById('chartSection').style.display = 'block';
    
    const chartCanvas = document.getElementById('comparisonChart');
    if (!chartCanvas) return;
    
    // Уничтожаем предыдущий график
    if (comparisonChart) {
        comparisonChart.destroy();
    }
    
    const ctx = chartCanvas.getContext('2d');
    
    // Подготавливаем данные
    const labels = chartSkills.map(skill => skill.skill_name);
    const employee1Scores = chartSkills.map(skill => skill.user1_score);
    const employee2Scores = chartSkills.map(skill => skill.user2_score);
    
    comparisonChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: comparisonData.user1.full_name,
                    data: employee1Scores,
                    backgroundColor: 'rgba(102, 126, 234, 0.2)',
                    borderColor: 'rgba(102, 126, 234, 0.8)',
                    pointBackgroundColor: 'rgba(102, 126, 234, 1)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 2,
                    pointRadius: 4
                },
                {
                    label: comparisonData.user2.full_name,
                    data: employee2Scores,
                    backgroundColor: 'rgba(118, 75, 162, 0.2)',
                    borderColor: 'rgba(118, 75, 162, 0.8)',
                    pointBackgroundColor: 'rgba(118, 75, 162, 1)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(118, 75, 162, 1)',
                    borderWidth: 2,
                    pointRadius: 4
                }
            ]
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
                        },
                        color: '#333'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    angleLines: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            size: 12
                        },
                        padding: 20
                    }
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

// Функция для фильтрации таблицы пользователей
function filterUsersTable() {
    const searchInput = document.getElementById('userSearchTable');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    const tableRows = document.querySelectorAll('#usersTableBody tr');
    
    if (searchTerm.length < 2) {
        // Если поисковый запрос менее 2 символов, показываем всех пользователей
        tableRows.forEach(row => {
            row.style.display = '';
        });
        // Удаляем строку с информацией о результатах поиска
        const existingInfoRow = document.querySelector('.search-results-info');
        if (existingInfoRow) {
            existingInfoRow.remove();
        }
        return;
    }
    
    tableRows.forEach(row => {
        // Пропускаем строку загрузки или пустые строки
        if (row.cells.length < 8) return;
        
        const fullName = row.cells[1].textContent.toLowerCase();
        const login = row.cells[2].textContent.toLowerCase();
        const position = row.cells[4].textContent.toLowerCase();
        const department = row.cells[5].textContent.toLowerCase();
        const role = row.cells[3].querySelector('.badge')?.textContent.toLowerCase() || '';
        
        // Проверяем соответствие поисковому запросу
        const matches = fullName.includes(searchTerm) || 
                       login.includes(searchTerm) || 
                       position.includes(searchTerm) ||
                       department.includes(searchTerm) ||
                       role.includes(searchTerm);
        
        row.style.display = matches ? '' : 'none';
    });
    
    // Показываем количество найденных результатов
    const visibleRows = Array.from(tableRows).filter(row => 
        row.style.display !== 'none' && row.cells.length >= 8
    ).length;
    
    const totalRows = Array.from(tableRows).filter(row => 
        row.cells.length >= 8
    ).length;
    
    // Добавляем или обновляем строку с результатами поиска
    updateSearchResultsInfo(visibleRows, totalRows);
}

// Функция для обновления информации о результатах поиска
function updateSearchResultsInfo(visible, total) {
    const tableBody = document.getElementById('usersTableBody');
    const existingInfoRow = tableBody.querySelector('.search-results-info');
    
    if (visible === total) {
        if (existingInfoRow) {
            existingInfoRow.remove();
        }
        return;
    }
    
    const infoHtml = `
        <tr class="search-results-info" style="background-color: #e8f4fd; font-weight: 600;">
            <td colspan="8" style="padding: 1rem; text-align: center; color: #1976d2;">
                <i class="fas fa-search me-2"></i>
                Найдено пользователей: ${visible} из ${total}
            </td>
        </tr>
    `;
    
    if (existingInfoRow) {
        existingInfoRow.outerHTML = infoHtml;
    } else {
        // Вставляем строку в начало таблицы
        const firstRow = tableBody.querySelector('tr');
        if (firstRow && firstRow.cells.length >= 8) {
            tableBody.insertAdjacentHTML('beforeend', infoHtml);
        }
    }
}

// Загрузка всех пользователей
function loadAllUsers() {
    const tableBody = document.getElementById('usersTableBody');
    
    fetch('/hr/api/all-users')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderUsersTable(data.users);
            } else {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; padding: 2rem; color: #d32f2f;">
                            <i class="fas fa-exclamation-triangle"></i>
                            ${data.message || 'Ошибка загрузки пользователей'}
                        </td>
                    </tr>
                `;
            }
        })
        .catch(error => {
            console.error('Ошибка загрузки пользователей:', error);
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 2rem; color: #d32f2f;">
                        <i class="fas fa-exclamation-triangle"></i>
                        Ошибка сети. Проверьте подключение.
                    </td>
                </tr>
            `;
        });
}

// Отображение пользователей в таблице
function renderUsersTable(users) {
    const tableBody = document.getElementById('usersTableBody');
    
    if (!users || users.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem;">
                    <i class="fas fa-users" style="font-size: 2rem; color: #ccc; margin-bottom: 1rem;"></i>
                    <div>Пользователи не найдены</div>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    
    users.forEach(user => {
        const createdAt = user.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : '—';
        const departmentName = user.department || 'Не указан';
        const position = user.position || 'Не указана';
        
        html += `
            <tr class="user-row" data-user-id="${user.id}">
                <td>${user.id}</td>
                <td><strong class="user-name">${user.full_name}</strong></td>
                <td class="user-login">${user.login}</td>
                <td>
                    <span class="badge user-role" style="background: ${getRoleColor(user.role)}; color: white; padding: 0.25rem 0.5rem; border-radius: 3px;">
                        ${getRoleDisplayName(user.role)}
                    </span>
                </td>
                <td class="user-position">${position}</td>
                <td class="user-department">${departmentName}</td>
                <td>${createdAt}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-edit" onclick="editUser(${user.id})" title="Редактировать">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-view" onclick="viewUserProfile(${user.id})" title="Просмотреть профиль">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-delete" onclick="confirmDeleteUser(${user.id}, '${user.full_name.replace(/'/g, "\\'")}')" title="Удалить">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
    
    // После рендеринга таблицы, если есть поисковый запрос - применить фильтр
    const searchInput = document.getElementById('userSearchTable');
    if (searchInput && searchInput.value.trim().length >= 2) {
        filterUsersTable();
    }
}

// Вспомогательные функции
function getInitials(name) {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
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

function getRoleColor(role) {
    const colors = {
        'admin': '#dc3545',
        'hr': '#17a2b8',
        'manager': '#28a745',
        'employee': '#6c757d'
    };
    return colors[role] || '#6c757d';
}

// Просмотр профиля пользователя
function viewUserProfile(userId) {
    // Открываем профиль в новой вкладке
    window.open(`/user/employee/${userId}`, '_blank');
}

function showNotification(message, type = 'success') {
    // Используем существующую функцию или создаем простую реализацию
    if (typeof window.showSkillToast === 'function') {
        window.showSkillToast(message, type);
    } else {
        const toastId = type === 'error' ? 'errorToast' : 'successToast';
        const toast = document.getElementById(toastId);
        const messageElement = type === 'error' ? 
            document.getElementById('errorToastMessage') : 
            document.getElementById('toastMessage');
        
        if (toast && messageElement) {
            messageElement.textContent = message;
            toast.style.display = 'flex';
            
            // Автоматически скрываем через 3 секунды
            setTimeout(() => {
                toast.style.display = 'none';
            }, 3000);
        } else {
            alert(message);
        }
    }
}