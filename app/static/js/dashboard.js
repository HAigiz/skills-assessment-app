document.addEventListener('DOMContentLoaded', function() {
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
    
    // --- Находим общие элементы модала выхода ---
    const logoutConfirmationModal = document.getElementById('logoutConfirmationModal'); // Используем новый ID
    const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
    const cancelLogoutBtn = document.getElementById('cancelLogoutBtn');
    const closeLogoutModal = document.getElementById('closeLogoutModal');

    let pendingLogoutLink = null; // Для сохранения ссылки на "Выход"

    // --- Новая/Обновленная функция для закрытия модала выхода ---
    // Используем ту же логику, что и для closeModal, но для другого модала
    function closeLogoutModalWindow() {
        if (logoutConfirmationModal) {
            logoutConfirmationModal.classList.remove('show');
            document.body.style.overflow = 'auto'; 
        }
        pendingLogoutLink = null;
    }


    // --- 1. Обработка клика по ссылке "Выход" ---
    const logoutLinks = document.querySelectorAll('a[href*="logout"]');
    logoutLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            pendingLogoutLink = this; // Сохраняем ссылку, которую нужно активировать

            // Используем класс 'show', который уже стилизован в CSS
            if (logoutConfirmationModal) {
                logoutConfirmationModal.classList.add('show');
                document.body.style.overflow = 'hidden';
            }
        });
    });


    // --- 2. Обработка кнопок внутри модала выхода ---

    // Подтверждение
    if (confirmLogoutBtn) {
        confirmLogoutBtn.addEventListener('click', function() {
            if (pendingLogoutLink) {
                // Переходим по сохраненной ссылке
                window.location.href = pendingLogoutLink.href;
            }
            closeLogoutModalWindow();
        });
    }

    // Отмена или закрытие
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

    openModalButtons.forEach(button => {
        button.addEventListener('click', function() {
            currentUserRole = this.getAttribute('data-role');
            currentUserDepartmentId = this.getAttribute('data-department-id');
            currentUserDepartmentName = this.getAttribute('data-department-name');
            
            setupModal();
            restoreFormData(); 
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        });
    });

    function saveFormData() {
        formDataCache = {
            full_name: document.getElementById('full_name').value,
            login: document.getElementById('login').value,
            role: document.getElementById('role').value,
            department_id: currentUserRole === 'hr' 
                ? document.getElementById('department_id').value
                : document.getElementById('manager_department_id').value
        };
    }

    function restoreFormData() {
        if (formDataCache.full_name) {
            document.getElementById('full_name').value = formDataCache.full_name;
        }
        if (formDataCache.login) {
            document.getElementById('login').value = formDataCache.login;
        }
        if (formDataCache.role) {
            document.getElementById('role').value = formDataCache.role;
        }
        if (currentUserRole === 'hr' && formDataCache.department_id) {
            document.getElementById('department_id').value = formDataCache.department_id;
        }
    }

    function closeModal() {
        saveFormData(); 
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
        hideAllErrors();
    }

    function resetForm() {
        document.getElementById('addUserForm').reset();
        hideAllErrors();
        formDataCache = {}; 
    }

    closeModalBtn.addEventListener('click', function() {
        closeModal();
    });

    cancelBtn.addEventListener('click', function() {
        closeModal();
        resetForm();
    });

    modal.addEventListener('pointerdown', function(e) {
        if (e.target === modal) {
            modal._clickedOnOverlay = true;
        } else {
            modal._clickedOnOverlay = false;
        }
    });

    modal.addEventListener('pointerup', function(e) {
        if (modal._clickedOnOverlay && e.target === modal) {
            closeModal();
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
            if (!field.value.trim()) {
                showError(fieldId, 'Это поле обязательно для заполнения');
                isValid = false;
            }
        });
        
        let departmentId = '';
        if (currentUserRole === 'hr') {
            departmentId = document.getElementById('department_id').value;
        } else if (currentUserRole === 'manager') {
            departmentId = document.getElementById('manager_department_id').value;
        }
        
        if (!departmentId) {
            showError('department_id', 'Выберите отдел');
            isValid = false;
        }
        
        const password = document.getElementById('password').value;
        if (password && password.length < 8) {
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
                alert('Пользователь успешно добавлен!');    // тоже добавить шторку
                resetForm(); 
                closeModal();
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
            alert('Ошибка сети. Пожалуйста, попробуйте позже.');
            console.error('Error:', error);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Добавить';
        }
    });

    document.getElementById('addUserForm').addEventListener('input', function(e) {
        if (e.target.type !== 'password') { 
            saveFormData();
        }
    });

    document.getElementById('addUserForm').addEventListener('change', function(e) {
        saveFormData();
    });
});