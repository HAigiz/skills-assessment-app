var modal = document.getElementById("registrationModal");
var openModalBtns = document.querySelectorAll(".open-modal-btn");
var closeBtn = document.querySelector(".close");

function openModal(event) {
    event.preventDefault(); 
    document.getElementById('login-form').classList.add('active');
    modal.style.display = "flex";
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
        closeModal();
    }
    modal._clickedOnOverlay = false;
});

function closeModal() {
    modal.style.display = "none";
}

openModalBtns.forEach(button => {
    button.addEventListener('click', openModal);
});

closeBtn.addEventListener('click', closeModal);

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('log-form');
    const loginErrorMessage = document.getElementById('login-error-message');

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            loginErrorMessage.style.display = 'none';
            
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            
            try {
                const response = await fetch(this.action, { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                    window.location.href = result.redirect_url || '/dashboard'; 
                } else {
                    loginErrorMessage.style.display = 'flex'; 
                    
                    let errorMessageText = 'Произошла ошибка при входе. Повторите попытку.';
                    if (result.message) {
                        errorMessageText = result.message;
                    } else if (result.errors) {
                        errorMessageText = 'Проверьте введенные данные.';
                    }
                    loginErrorMessage.querySelector('span:last-child').innerHTML = `<strong>${errorMessageText}</strong>`;
                }
            } catch (error) {
                console.error('Ошибка:', error);
                loginErrorMessage.querySelector('span:last-child').innerHTML = '<strong>Ошибка сети. Пожалуйста, попробуйте позже.</strong>';
                loginErrorMessage.style.display = 'flex';
            }
        });
        
        const loginInput = document.getElementById('login-username');
        const passwordInput = document.getElementById('login-password');
        
        loginInput.addEventListener('input', function() {
            this.style.borderColor = '#e0e1e6';
            loginErrorMessage.style.display = 'none';
        });
        
        passwordInput.addEventListener('input', function() {
            this.style.borderColor = '#e0e1e6';
            loginErrorMessage.style.display = 'none';
        });

        document.getElementById('login-form').classList.add('active');
    }
});