document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard loaded');
    
    initUserNavigation();
    
    initLogoutModal();
    
    initSearchButton();
    
    initAddUserModal();
    
    loadDashboardStats();
    
    initQuickActions();
});

function initUserNavigation() {
    const userMenuBtn = document.querySelector('.user-menu-btn');
    const userDropdown = document.getElementById('userDropdown');
    
    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const isVisible = userDropdown.style.display === 'block';
            userDropdown.style.display = isVisible ? 'none' : 'block';
        });
        
        document.addEventListener('click', function(e) {
            if (!userDropdown.contains(e.target) && !userMenuBtn.contains(e.target)) {
                userDropdown.style.display = 'none';
            }
        });
    }
}

function initLogoutModal() {
    const logoutConfirmationModal = document.getElementById('logoutConfirmationModal');
    const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
    const cancelLogoutBtn = document.getElementById('cancelLogoutBtn');
    const closeLogoutModal = document.getElementById('closeLogoutModal');
    
    let pendingLogoutLink = null;
    
    function closeLogoutModalWindow() {
        if (logoutConfirmationModal) {
            logoutConfirmationModal.style.display = 'none';
        }
        pendingLogoutLink = null;
    }
    
    // Обработка клика по ссылке "Выход"
    const logoutLinks = document.querySelectorAll('a[href*="logout"]');
    logoutLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            pendingLogoutLink = this;
            
            if (logoutConfirmationModal) {
                logoutConfirmationModal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            }
        });
    });
    
    // Подтверждение выхода
    if (confirmLogoutBtn) {
        confirmLogoutBtn.addEventListener('click', function() {
            if (pendingLogoutLink) {
                window.location.href = pendingLogoutLink.href;
            }
            closeLogoutModalWindow();
            document.body.style.overflow = 'auto';
        });
    }
    
    // Отмена выхода
    if (cancelLogoutBtn) {
        cancelLogoutBtn.addEventListener('click', function() {
            closeLogoutModalWindow();
            document.body.style.overflow = 'auto';
        });
    }
    
    if (closeLogoutModal) {
        closeLogoutModal.addEventListener('click', function() {
            closeLogoutModalWindow();
            document.body.style.overflow = 'auto';
        });
    }
    
    // Закрытие по клику на оверлей
    if (logoutConfirmationModal) {
        logoutConfirmationModal.addEventListener('click', function(e) {
            if (e.target === logoutConfirmationModal) {
                closeLogoutModalWindow();
                document.body.style.overflow = 'auto';
            }
        });
    }
}

function initSearchButton() {
    const searchBtn = document.getElementById('searchEmployeesBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            console.log('Search button clicked');
            
            // Проверяем, есть ли у нас модальное окно поиска
            const searchModal = document.getElementById('searchModal');
            if (searchModal) {
                // Показываем существующее модальное окно
                searchModal.style.display = 'block';
                document.body.style.overflow = 'hidden';
                initSearchForm();
            } else {
                // Если модального окна нет, создаем простое
                createSimpleSearchModal();
            }
        });
    } else {
        console.log('Search button not found, creating fallback');
        // Создаем кнопку поиска, если она не найдена
        createSearchButton();
    }
}

function createSearchButton() {
    const dashboardContent = document.querySelector('.dashboard-content');
    if (!dashboardContent) return;
    
    const searchBtn = document.createElement('button');
    searchBtn.id = 'searchEmployeesBtn';
    searchBtn.className = 'btn btn-primary';
    searchBtn.innerHTML = '<i class="fas fa-search me-2"></i>Найти сотрудников';
    searchBtn.style.margin = '10px';
    
    searchBtn.addEventListener('click', function() {
        alert('Функция поиска сотрудников находится в разработке. Будет доступна в следующем обновлении.');
    });
    
    dashboardContent.prepend(searchBtn);
}

function createSimpleSearchModal() {
    // Создаем простое модальное окно
    const modalHTML = `
        <div id="searchModal" class="modal-adduser" style="display: flex;">
            <div class="modal-adduser-content">
                <div class="modal-adduser-header">
                    <h4>Поиск сотрудников</h4>
                    <button class="modal-adduser-close" onclick="this.closest('.modal-adduser').style.display='none'; document.body.style.overflow='auto'">&times;</button>
                </div>
                <div style="padding: 20px;">
                    <p>Функция поиска сотрудников находится в разработке.</p>
                    <p>В следующем обновлении вы сможете:</p>
                    <ul>
                        <li>Искать сотрудников по навыкам</li>
                        <li>Фильтровать по уровню владения</li>
                        <li>Просматривать профили найденных сотрудников</li>
                    </ul>
                    <div class="modal-adduser-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.modal-adduser').style.display='none'; document.body.style.overflow='auto'">Закрыть</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function initSearchForm() {
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const skill = document.getElementById('searchSkill').value;
            const minScore = document.getElementById('minScore').value;
            
            console.log(`Searching for: ${skill} with min score: ${minScore}`);
            
            if (!skill.trim()) {
                alert('Пожалуйста, введите навык для поиска');
                return;
            }
            
            searchEmployees(skill, minScore);
        });
    }
}

function searchEmployees(skill, minScore) {
    const resultsDiv = document.getElementById('searchResults');
    if (!resultsDiv) return;
    
    resultsDiv.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin fa-2x"></i><p class="mt-2">Поиск...</p></div>';
    
    // Временная заглушка - в реальном приложении здесь будет fetch запрос
    setTimeout(() => {
        resultsDiv.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i>
                <strong>Функция в разработке</strong><br>
                В следующем обновлении вы сможете искать сотрудников с навыком "${skill}" и оценкой от ${minScore}.
            </div>
            <div class="mt-3">
                <h6>Пример результатов поиска:</h6>
                <ul class="list-group">
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        Иван Иванов
                        <span class="badge bg-primary rounded-pill">Отдел разработки</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        Мария Петрова
                        <span class="badge bg-primary rounded-pill">Отдел тестирования</span>
                    </li>
                </ul>
            </div>
        `;
    }, 1500);
}

function initAddUserModal() {
    const modal = document.getElementById('addUserModal');
    const openModalButtons = document.querySelectorAll('.open-add-user-modal');
    const closeModalBtn = document.getElementById('closeadduserModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const submitBtn = document.getElementById('submitBtn');
    
    if (!modal) {
        console.log('Add user modal not found');
        return;
    }
    
    let currentUserRole = '';
    let currentUserDepartmentId = '';
    let currentUserDepartmentName = '';
    
    openModalButtons.forEach(button => {
        button.addEventListener('click', function() {
            currentUserRole = this.getAttribute('data-role') || '';
            currentUserDepartmentId = this.getAttribute('data-department-id') || '';
            currentUserDepartmentName = this.getAttribute('data-department-name') || '';
            
            setupModal();
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        });
    });
    
    function closeModal() {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        resetForm();
    }
    
    function resetForm() {
        const form = document.getElementById('addUserForm');
        if (form) {
            form.reset();
        }
        hideAllErrors();
    }
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    function setupModal() {
        const modalTitle = document.getElementById('modaladduserTitle');
        const formNotice = document.getElementById('formNotice');
        const departmentField = document.getElementById('departmentField');
        const managerDepartmentInfo = document.getElementById('managerDepartmentInfo');
        
        if (!modalTitle || !formNotice) return;
        
        if (currentUserRole === 'hr') {
            modalTitle.textContent = 'Добавить пользователя';
            formNotice.innerHTML = '<strong>HR-менеджер</strong> может добавлять пользователей в любой отдел';
            
            if (departmentField) departmentField.style.display = 'block';
            if (managerDepartmentInfo) managerDepartmentInfo.style.display = 'none';
            
            loadDepartments();
            
        } else if (currentUserRole === 'manager') {
            modalTitle.textContent = 'Добавить сотрудника в отдел';
            formNotice.innerHTML = '<strong>Руководитель</strong> может добавлять сотрудников только в свой отдел';
            
            if (departmentField) departmentField.style.display = 'none';
            if (managerDepartmentInfo) managerDepartmentInfo.style.display = 'block';
            
            const managerDepartmentDisplay = document.getElementById('manager_department_display');
            const managerDepartmentId = document.getElementById('manager_department_id');
            
            if (managerDepartmentDisplay) {
                managerDepartmentDisplay.value = currentUserDepartmentName;
            }
            if (managerDepartmentId) {
                managerDepartmentId.value = currentUserDepartmentId;
            }
        }
        
        hideAllErrors();
    }
    
    async function loadDepartments() {
        try {
            const response = await fetch('/departments');
            if (!response.ok) throw new Error('Network response was not ok');
            
            const result = await response.json();
            const departmentSelect = document.getElementById('department_id');
            
            if (result.success && departmentSelect) {
                departmentSelect.innerHTML = '<option value="">Выберите отдел</option>';
                result.departments.forEach(dept => {
                    const option = document.createElement('option');
                    option.value = dept.id;
                    option.textContent = dept.name;
                    departmentSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading departments:', error);
        }
    }
    
    function hideAllErrors() {
        document.querySelectorAll('.error-message').forEach(error => {
            error.style.display = 'none';
        });
    }
    
    function validateForm() {
        let isValid = true;
        
        hideAllErrors();
        
        const fields = ['full_name', 'login', 'password', 'role'];
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field && !field.value.trim()) {
                showError(fieldId, 'Это поле обязательно для заполнения');
                isValid = false;
            }
        });
        
        const password = document.getElementById('password');
        if (password && password.value && password.value.length < 8) {
            showError('password', 'Пароль должен содержать минимум 8 символов');
            isValid = false;
        }
        
        return isValid;
    }
    
    function showError(fieldId, message) {
        const errorElement = document.getElementById(fieldId + '_error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }
    
    if (submitBtn) {
        submitBtn.addEventListener('click', async function() {
            if (!validateForm()) return;
            
            const formData = {
                full_name: document.getElementById('full_name').value,
                login: document.getElementById('login').value,
                password: document.getElementById('password').value,
                role: document.getElementById('role').value,
                department_id: currentUserRole === 'hr' 
                    ? document.getElementById('department_id').value
                    : document.getElementById('manager_department_id').value
            };
            
            try {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Добавление...';
                
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    if (typeof showToast === 'function') {
                        showToast('Пользователь успешно добавлен!', 'success');
                    } else {
                        alert('Пользователь успешно добавлен!');
                    }
                    closeModal();
                    
                    // Обновляем страницу через 1.5 секунды
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    if (result.message && result.message.toLowerCase().includes('логин') && 
                        result.message.toLowerCase().includes('существует')) {
                        showError('login', 'Пользователь с таким логином уже существует');
                    } else if (result.message) {
                        const formNotice = document.getElementById('formNotice');
                        if (formNotice) {
                            formNotice.innerHTML = `<strong>Ошибка:</strong> ${result.message}`;
                            formNotice.style.borderLeftColor = '#f44336';
                            formNotice.style.backgroundColor = '#ffebee';
                        }
                    }
                }
            } catch (error) {
                console.error('Error:', error);
                if (typeof showToast === 'function') {
                    showToast('Ошибка сети. Пожалуйста, попробуйте позже.', 'error');
                } else {
                    alert('Ошибка сети. Пожалуйста, попробуйте позже.');
                }
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Добавить';
            }
        });
    }
}

function loadDashboardStats() {
    // Загружаем статистику для дашборда
    fetch('/api/dashboard/stats')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            if (data.success) {
                updateStatsDisplay(data.stats);
            }
        })
        .catch(error => {
            console.error('Error loading dashboard stats:', error);
        });
}

function updateStatsDisplay(stats) {
    // Обновляем отображение статистики
    const elements = {
        'totalSkills': document.getElementById('totalSkills'),
        'assessedSkills': document.getElementById('assessedSkills'),
        'averageScore': document.getElementById('averageScore'),
        'teamMembers': document.getElementById('teamMembers')
    };
    
    for (const [key, element] of Object.entries(elements)) {
        if (element && stats[key] !== undefined) {
            element.textContent = stats[key];
        }
    }
}

function initQuickActions() {
    // Кнопки быстрых действий
    const quickActionBtns = document.querySelectorAll('.quick-action-btn');
    quickActionBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.dataset.action;
            handleQuickAction(action);
        });
    });
}

function handleQuickAction(action) {
    switch(action) {
        case 'assess-skills':
            window.location.href = '/profile#skills';
            break;
        case 'view-team':
            window.location.href = '/my-team';
            break;
        case 'hr-analytics':
            window.location.href = '/hr-dashboard';
            break;
        case 'manage-skills':
            window.location.href = '/skills';
            break;
        default:
            console.log('Unknown action:', action);
    }
}

// Глобальная функция для показа уведомлений
window.showToast = function(message, type = 'info') {
    if (typeof window.parent?.showToast === 'function') {
        window.parent.showToast(message, type);
    } else {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
        `;
        
        toast.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; margin-left: 10px;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 3000);
    }
};

document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard loaded');
    
    // Обработчик кнопки "Добавить пользователя"
    const addUserButtons = document.querySelectorAll('.open-add-user-modal');
    addUserButtons.forEach(button => {
        button.addEventListener('click', function() {
            const role = this.dataset.role;
            const departmentId = this.dataset.departmentId;
            const departmentName = this.dataset.departmentName;
            
            // Открываем модальное окно
            openAddUserModal(role, departmentId, departmentName);
        });
    });
    
    // Загрузка статистики для дашборда
    loadDashboardStats();
});

function openAddUserModal(role, departmentId, departmentName) {
    console.log(`Opening modal for role: ${role}, department: ${departmentName}`);
    
    // В реальном приложении здесь открытие модального окна с формой
    // Пока просто показываем уведомление и перенаправляем на страницу регистрации
    if (typeof window.showToast === 'function') {
        window.showToast('Перенаправление на страницу регистрации...', 'info');
    }
    
    // Перенаправляем на страницу регистрации с параметрами
    setTimeout(() => {
        window.location.href = '/user/register';
    }, 1000);
}

function loadDashboardStats() {
    // API для статистики
    fetch('/api/dashboard/stats')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Обновляем статистику на странице
                updateDashboardStats(data.data);
            } else {
                console.error('Error loading stats:', data.message);
            }
        })
        .catch(error => {
            console.error('Error loading dashboard stats:', error);
        });
}

function updateDashboardStats(stats) {
    // Обновляем элементы статистики на странице
    
    if (stats.assessed_skills !== undefined) {
        const element = document.getElementById('assessed-skills-count');
        if (element) element.textContent = stats.assessed_skills;
    }
    
    if (stats.avg_score !== undefined) {
        const element = document.getElementById('avg-score');
        if (element) element.textContent = stats.avg_score.toFixed(1);
    }
    
    if (stats.team_count !== undefined) {
        const element = document.getElementById('team-count');
        if (element) element.textContent = stats.team_count;
    }
    
    if (stats.pending_reviews !== undefined) {
        const element = document.getElementById('pending-reviews');
        if (element) element.textContent = stats.pending_reviews;
    }
    
    if (stats.total_users !== undefined) {
        const element = document.getElementById('total-users');
        if (element) element.textContent = stats.total_users;
    }
    
    if (stats.total_departments !== undefined) {
        const element = document.getElementById('total-departments');
        if (element) element.textContent = stats.total_departments;
    }
    
    if (stats.total_skills !== undefined) {
        const element = document.getElementById('total-skills');
        if (element) element.textContent = stats.total_skills;
    }
}