document.addEventListener('DOMContentLoaded', function() {
    // Функция для показа уведомлений (из первого блока)
    function initializeToast() {
        // ========== Глобальная функция для уведомлений ==========
        window.showToast = function(message, type = 'info') {
            // Удаляем старые тосты
            const oldToasts = document.querySelectorAll('.custom-toast');
            oldToasts.forEach(toast => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            });
            
            const toast = document.createElement('div');
            toast.className = `custom-toast toast-${type}`;
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                display: flex;
                align-items: center;
                justify-content: space-between;
                z-index: 9999;
                animation: slideIn 0.3s ease;
                max-width: 400px;
                word-break: break-word;
            `;
            
            const icon = type === 'success' ? 'check-circle' : 
                        type === 'error' ? 'exclamation-circle' : 
                        type === 'warning' ? 'exclamation-triangle' : 'info-circle';
            
            toast.innerHTML = `
                <div style="display: flex; align-items: center; flex-grow: 1;">
                    <i class="fas fa-${icon} me-2" style="flex-shrink: 0;"></i>
                    <span style="flex-grow: 1;">${message}</span>
                </div>
                <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; margin-left: 10px; flex-shrink: 0;">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            document.body.appendChild(toast);
            
            // Автоматическое удаление через 5 секунд
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 5000);
            
            // Добавляем стили для анимации
            if (!document.getElementById('toast-styles')) {
                const style = document.createElement('style');
                style.id = 'toast-styles';
                style.textContent = `
                    @keyframes slideIn {
                        from {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }
                    @keyframes slideOut {
                        from {
                            transform: translateX(0);
                            opacity: 1;
                        }
                        to {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                    }
                `;
                document.head.appendChild(style);
            }
        };
    }

    // Инициализация тостов
    initializeToast();

    // Управление пользовательским меню
    const userMenuBtn = document.querySelector('.user-menu-btn');
    const userDropdown = document.getElementById('userDropdown');
    
    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            userDropdown.classList.toggle('show');
        });
        
        document.addEventListener('click', function(e) {
            if (!userDropdown.contains(e.target) && !userMenuBtn.contains(e.target)) {
                userDropdown.classList.remove('show');
            }
        });
    }
    
    // Модал подтверждения выхода
    const logoutConfirmationModal = document.getElementById('logoutConfirmationModal');
    const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
    const cancelLogoutBtn = document.getElementById('cancelLogoutBtn');
    const closeLogoutModal = document.getElementById('closeLogoutModal');
    
    let pendingLogoutLink = null;
    
    function closeLogoutModalWindow() {
        if (logoutConfirmationModal) {
            logoutConfirmationModal.style.display = 'none';
            logoutConfirmationModal.classList.remove('show');
            document.body.style.overflow = 'auto';
        }
        pendingLogoutLink = null;
    }
    
    // Обработка клика по ссылке "Выход"
    const logoutLinks = document.querySelectorAll('.dropdown-item.logout, a[href*="logout"]');
    logoutLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            pendingLogoutLink = this;
            
            if (logoutConfirmationModal) {
                logoutConfirmationModal.style.display = 'flex';
                logoutConfirmationModal.classList.add('show');
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
        });
    }
    
    // Отмена выхода
    if (cancelLogoutBtn) {
        cancelLogoutBtn.addEventListener('click', closeLogoutModalWindow);
    }
    
    if (closeLogoutModal) {
        closeLogoutModal.addEventListener('click', closeLogoutModalWindow);
    }
    
    // Закрытие по клику на оверлей
    if (logoutConfirmationModal) {
        logoutConfirmationModal.addEventListener('click', function(e) {
            if (e.target === logoutConfirmationModal) {
                closeLogoutModalWindow();
            }
        });
    }
    
    // Модал регистрации/авторизации
    const registrationModal = document.getElementById('registrationModal');
    const openModalBtns = document.querySelectorAll('.open-modal-btn');
    
    if (registrationModal) {
        const closeBtn = registrationModal.querySelector('.close');
        
        openModalBtns.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                registrationModal.style.display = 'block';
                registrationModal.classList.add('show');
                document.body.style.overflow = 'hidden';
            });
        });
        
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                registrationModal.style.display = 'none';
                registrationModal.classList.remove('show');
                document.body.style.overflow = 'auto';
            });
        }
        
        // Закрытие при клике вне модального окна
        registrationModal.addEventListener('click', function(e) {
            if (e.target === registrationModal) {
                registrationModal.style.display = 'none';
                registrationModal.classList.remove('show');
                document.body.style.overflow = 'auto';
            }
        });
        
        // Обработка ошибок входа
        const loginForm = document.getElementById('log-form');
        if (loginForm) {
            loginForm.addEventListener('submit', function(e) {
                const errorMessage = document.getElementById('login-error-message');
                if (errorMessage) {
                    errorMessage.style.display = 'none';
                }
            });
            
            // Показываем ошибку, если есть в URL
            if (window.location.search.includes('error=login')) {
                const errorMessage = document.getElementById('login-error-message');
                if (errorMessage) {
                    errorMessage.style.display = 'block';
                }
            }
        }
    }
    
    // Модал добавления пользователя
    const modal = document.getElementById('addUserModal');
    const openModalButtons = document.querySelectorAll('.open-add-user-modal');
    const closeModalBtn = document.getElementById('closeadduserModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const submitBtn = document.getElementById('submitBtn');
    const modalTitle = document.getElementById('modaladduserTitle');
    const formNotice = document.getElementById('formNotice');
    const roleSelect = document.getElementById('role');
    const departmentField = document.getElementById('departmentField');
    const managerDepartmentInfo = document.getElementById('managerDepartmentInfo');
    const managerDepartmentDisplay = document.getElementById('manager_department_display');
    const managerDepartmentId = document.getElementById('manager_department_id');
    const departmentSelect = document.getElementById('department_id');
    
    let currentUserRole = '';
    let currentUserDepartmentId = '';
    let currentUserDepartmentName = '';
    let formDataCache = {};
    
    if (modal) {
        openModalButtons.forEach(button => {
            button.addEventListener('click', function() {
                currentUserRole = this.getAttribute('data-role');
                currentUserDepartmentId = this.getAttribute('data-department-id');
                currentUserDepartmentName = this.getAttribute('data-department-name');
                
                setupModal();
                restoreFormData();
                modal.style.display = 'block';
                modal.classList.add('show');
                document.body.style.overflow = 'hidden';
            });
        });
        
        function saveFormData() {
            formDataCache = {
                full_name: document.getElementById('full_name')?.value || '',
                login: document.getElementById('login')?.value || '',
                role: document.getElementById('role')?.value || '',
                department_id: currentUserRole === 'hr' 
                    ? document.getElementById('department_id')?.value || ''
                    : document.getElementById('manager_department_id')?.value || ''
            };
        }
        
        function restoreFormData() {
            if (formDataCache.full_name && document.getElementById('full_name')) {
                document.getElementById('full_name').value = formDataCache.full_name;
            }
            if (formDataCache.login && document.getElementById('login')) {
                document.getElementById('login').value = formDataCache.login;
            }
            if (formDataCache.role && document.getElementById('role')) {
                document.getElementById('role').value = formDataCache.role;
            }
            if (currentUserRole === 'hr' && formDataCache.department_id && document.getElementById('department_id')) {
                document.getElementById('department_id').value = formDataCache.department_id;
            }
        }
        
        function closeAddUserModal() {
            saveFormData();
            modal.style.display = 'none';
            modal.classList.remove('show');
            document.body.style.overflow = 'auto';
            hideAllErrors();
        }
        
        function resetForm() {
            const addUserForm = document.getElementById('addUserForm');
            if (addUserForm) {
                addUserForm.reset();
            }
            hideAllErrors();
            formDataCache = {};
        }
        
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', function() {
                closeAddUserModal();
            });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                closeAddUserModal();
                resetForm();
            });
        }
        
        modal.addEventListener('pointerdown', function(e) {
            if (e.target === modal) {
                modal._clickedOnOverlay = true;
            } else {
                modal._clickedOnOverlay = false;
            }
        });
        
        modal.addEventListener('pointerup', function(e) {
            if (modal._clickedOnOverlay && e.target === modal) {
                closeAddUserModal();
            }
            modal._clickedOnOverlay = false;
        });
        
        function setupModal() {
            if (currentUserRole === 'hr') {
                modalTitle.textContent = 'Добавить пользователя';
                formNotice.innerHTML = '<strong>HR-менеджер</strong> может добавлять пользователей в любой отдел';
                
                departmentField.style.display = 'block';
                managerDepartmentInfo.style.display = 'none';
                
                loadDepartments();
                
            } else if (currentUserRole === 'manager') {
                modalTitle.textContent = 'Добавить сотрудника в отдел';
                formNotice.innerHTML = '<strong>Руководитель</strong> может добавлять сотрудников только в свой отдел';
                
                departmentField.style.display = 'none';
                managerDepartmentInfo.style.display = 'block';
                
                managerDepartmentDisplay.value = currentUserDepartmentName;
                managerDepartmentId.value = currentUserDepartmentId;
            }
            
            hideAllErrors();
        }
        
        async function loadDepartments() {
            try {
                const response = await fetch('/departments');
                const result = await response.json();
                
                if (result.success) {
                    departmentSelect.innerHTML = '<option value="">Выберите отдел</option>';
                    result.departments.forEach(dept => {
                        const option = document.createElement('option');
                        option.value = dept.id;
                        option.textContent = dept.name;
                        departmentSelect.appendChild(option);
                    });
                    
                    if (formDataCache.department_id) {
                        departmentSelect.value = formDataCache.department_id;
                    }
                } else {
                    console.error('Ошибка загрузки отделов:', result.message);
                    formNotice.innerHTML = '<strong>Ошибка:</strong> Не удалось загрузить список отделов';
                    formNotice.style.borderLeftColor = '#f44336';
                    formNotice.style.backgroundColor = '#ffebee';
                }
            } catch (error) {
                console.error('Ошибка сети:', error);
                useFallbackDepartments();
            }
        }
        
        function useFallbackDepartments() {
            // Функция-заглушка для загрузки отделов
            formNotice.innerHTML = '<strong>Внимание:</strong> Невозможно загрузить отделы. Проверьте подключение к сети.';
            formNotice.style.borderLeftColor = '#f59e0b';
            formNotice.style.backgroundColor = '#fffbeb';
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
            
            let departmentId = '';
            if (currentUserRole === 'hr') {
                const deptField = document.getElementById('department_id');
                departmentId = deptField ? deptField.value : '';
            } else if (currentUserRole === 'manager') {
                const deptField = document.getElementById('manager_department_id');
                departmentId = deptField ? deptField.value : '';
            }
            
            if (!departmentId) {
                showError('department_id', 'Выберите отдел');
                isValid = false;
            }
            
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
                        // Используем новую функцию showToast вместо alert
                        window.showToast('Пользователь успешно добавлен!', 'success');
                        resetForm();
                        closeAddUserModal();
                    } else {
                        if (result.errors) {
                            Object.keys(result.errors).forEach(field => {
                                showError(field, result.errors[field]);
                            });
                        }
                        if (result.message && result.message.toLowerCase().includes('логин') && 
                        result.message.toLowerCase().includes('существует')) {
                            showError('login', 'Пользователь с таким логином уже существует');
                        } else if (result.message) {
                            formNotice.innerHTML = `<strong>Ошибка:</strong> ${result.message}`;
                            formNotice.style.borderLeftColor = '#f44336';
                            formNotice.style.backgroundColor = '#ffebee';
                        }
                    }
                } catch (error) {
                    window.showToast('Ошибка сети. Пожалуйста, попробуйте позже.', 'error');
                    console.error('Error:', error);
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Добавить';
                }
            });
        }
        
        const addUserForm = document.getElementById('addUserForm');
        if (addUserForm) {
            addUserForm.addEventListener('input', function(e) {
                if (e.target.type !== 'password') {
                    saveFormData();
                }
            });
            
            addUserForm.addEventListener('change', function(e) {
                saveFormData();
            });
        }
    }
    
    // Закрытие модальных окон при нажатии ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            // Закрытие регистрационного модала
            if (registrationModal && registrationModal.style.display === 'block') {
                registrationModal.style.display = 'none';
                registrationModal.classList.remove('show');
                document.body.style.overflow = 'auto';
            }
            
            // Закрытие модала выхода
            if (logoutConfirmationModal && logoutConfirmationModal.style.display === 'flex') {
                closeLogoutModalWindow();
            }
            
            // Закрытие модала добавления пользователя
            if (modal && modal.style.display === 'block') {
                modal.style.display = 'none';
                modal.classList.remove('show');
                document.body.style.overflow = 'auto';
            }
        }
    });
    
    console.log('Base template loaded');
});