from flask import render_template, request, redirect, url_for, jsonify, flash, current_app
from ..forms import LoginForm, RegistrationForm
from werkzeug.security import check_password_hash, generate_password_hash
from flask import Blueprint
from flask_login import login_user, current_user, login_required, logout_user
from datetime import datetime

from flask_mail import Message
import os

from . import db
from ..models import *

bp = Blueprint('main', __name__)

@bp.route('/')
def index():
    login_form = LoginForm()
    return render_template('welcome_page.html', form=login_form)

@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    if current_user.is_authenticated:
            return redirect(url_for('main.dashboard'))

    if not data:
        return jsonify({
            'success': False,
            'message': 'Пустое тело запроса.'
        }), 400

    login_input = data.get('login')
    password_input = data.get('password')

    if not login_input or not password_input:
        return jsonify({
            'success': False,
            'message': 'Необходимо ввести логин и пароль.'
        }), 400

    user = User.query.filter(User.login.ilike(login_input)).first()

    if user and check_password_hash(user.password_hash, password_input):
        login_user(user, remember=True)
        return jsonify({
            'success': True,
            'redirect_url': url_for('user.dashboard')
        }), 200 
    else:
        return jsonify({
            'success': False,
            'message': 'Неверный логин или пароль. Попробуйте ещё раз.'
        }), 401

@bp.route('/register', methods=['GET', 'POST'])
@login_required
def register():
    if current_user.role not in ['admin', 'hr', 'manager']:
        return jsonify({
            'success': False,
            'message': 'У вас нет прав на добавление пользователя'
        }), 403

    if request.method == 'POST' and request.is_json:
        data = request.get_json()
        
        if current_user.role == 'manager':
            if str(data.get('department_id')) != str(current_user.department_id):
                return jsonify({
                    'success': False,
                    'message': 'Вы можете добавлять сотрудников только в свой отдел'
                }), 403
        
        if User.query.filter(User.login.ilike(data.get('login'))).first():
            return jsonify({
                'success': False,
                'message': 'Пользователь с таким логином уже существует.'
            }), 409
        
        hashed_password = generate_password_hash(data.get('password'))
        
        new_user = User(
            login=data.get('login'),
            password_hash=hashed_password,
            role=data.get('role'),
            full_name=data.get('full_name'),
            department_id=data.get('department_id')
        )
        
        try:
            db.session.add(new_user)
            db.session.commit()
            return jsonify({
                'success': True, 
                'message': 'Пользователь успешно добавлен.'
            }), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({
                'success': False, 
                'message': f'Ошибка базы данных: {str(e)}'
            }), 500
    
    current_user_department_name = None
    if current_user.role == 'manager':
        department = Department.query.get(current_user.department_id)
        if department:
            current_user_department_name = department.name
    
    form = RegistrationForm(current_user=current_user, department_name=current_user_department_name)
    
    return render_template('registry.html', form=form, current_user=current_user, current_user_department_name=current_user_department_name)

@bp.route('/departments')
@login_required
def get_departments():
    try:
        departments = Department.query.order_by(Department.name).all()
        departments_list = [{'id': dept.id, 'name': dept.name} for dept in departments]
        
        return jsonify({
            'success': True,
            'departments': departments_list
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Ошибка при получении отделов: {str(e)}'
        }), 500

@bp.route('/dashboard')
@login_required 
def dashboard():
    department = None
    if current_user.role == 'manager':
        department = Department.query.get(current_user.department_id)
    
    return render_template('dashboard.html', current_user=current_user, department=department)

@bp.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('main.index'))

@bp.route('/for_commands')
def commands():
    login_form = LoginForm()
    return render_template('for_commands.html', form=login_form)

@bp.route('/contacts', methods=['GET', 'POST'])
def contacts():
    login_form = LoginForm()

    if request.method == 'POST':
        # Получаем данные из формы
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip()
        phone = request.form.get('phone', '').strip()
        subject = request.form.get('subject', 'general')
        message = request.form.get('message', '').strip()
        
        # Валидация
        errors = []
        if not name or len(name) < 2:
            errors.append("Имя должно содержать не менее 2 символов")
        if not email or '@' not in email:
            errors.append("Введите корректный email")
        if not message or len(message) < 10:
            errors.append("Сообщение должно содержать не менее 10 символов")
        
        if errors:
            for error in errors:
                flash(f'❌ {error}', 'error')
            return redirect(url_for('main.contacts'))
        
        try:
            # Отправляем email
            success = send_contact_email(name, email, phone, subject, message)
            
            if success:
                flash('✅ Сообщение успешно отправлено! Мы свяжемся с вами в ближайшее время.', 'success')
            else:
                flash('❌ Ошибка при отправке сообщения. Пожалуйста, попробуйте позже.', 'error')
                
        except Exception as e:
            print(f"[ERROR] Ошибка отправки: {e}")
            flash('❌ Произошла ошибка при отправке сообщения.', 'error')
        
        return redirect(url_for('main.contacts'))

    return render_template('contacts.html', form=login_form)

def send_contact_email(name, email, phone, subject, message):
    """Отправляет email через Flask-Mail"""
    try:
        from flask_mail import Mail
        mail = Mail(current_app)
        
        # Получаем email получателя из .env
        to_email = os.getenv('MAIL_TO', current_app.config.get('MAIL_USERNAME'))
        
        # Тема письма
        subject_translations = {
            'general': 'Общий вопрос',
            'support': 'Техническая поддержка',
            'cooperation': 'Сотрудничество',
            'feedback': 'Обратная связь',
            'bug': 'Сообщить об ошибке',
            'suggestion': 'Предложение по улучшению'
        }
        subject_text = subject_translations.get(subject, 'Общий вопрос')
        
        # HTML содержимое письма
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Новое сообщение с SkillExam</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
                .content {{ background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }}
                .info-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
                .info-table td {{ padding: 8px; border-bottom: 1px solid #eee; }}
                .info-table tr:last-child td {{ border-bottom: none; }}
                .message-box {{ background: white; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; white-space: pre-line; }}
                .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📨 Новое сообщение с сайта SkillExam</h1>
                </div>
                <div class="content">
                    <h3>Информация об отправителе:</h3>
                    <table class="info-table">
                        <tr>
                            <td><strong>👤 Имя:</strong></td>
                            <td>{name}</td>
                        </tr>
                        <tr>
                            <td><strong>📧 Email:</strong></td>
                            <td><a href="mailto:{email}">{email}</a></td>
                        </tr>
                        <tr>
                            <td><strong>📞 Телефон:</strong></td>
                            <td>{phone if phone else 'Не указан'}</td>
                        </tr>
                        <tr>
                            <td><strong>🏷️ Тема:</strong></td>
                            <td>{subject_text}</td>
                        </tr>
                        <tr>
                            <td><strong>🕐 Дата:</strong></td>
                            <td>{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</td>
                        </tr>
                    </table>
                    
                    <h3>💬 Сообщение:</h3>
                    <div class="message-box">
                        {message}
                    </div>
                </div>
                <div class="footer">
                    <p>Это сообщение отправлено автоматически с сайта SkillExam.<br>
                    Не отвечайте на это письмо. Чтобы ответить пользователю, используйте email выше.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Текстовое содержимое (для почтовых клиентов без HTML)
        text_content = f"""
        НОВОЕ СООБЩЕНИЕ С САЙТА SKILLEXAM
        
        От: {name}
        Email: {email}
        Телефон: {phone if phone else 'Не указан'}
        Тема: {subject_text}
        Дата: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
        
        Сообщение:
        {message}
        
        ---
        Это сообщение отправлено автоматически.
        """
        
        # Создаем сообщение
        msg = Message(
            subject=f'[SkillExam] {subject_text} от {name}',
            recipients=[to_email],
            html=html_content,
            body=text_content,
            reply_to=email  # Указываем email пользователя для ответа
        )
        
        # Отправляем
        mail.send(msg)
        
        print(f"[SUCCESS] Email отправлен на {to_email}")
        return True
        
    except Exception as e:
        print(f"[ERROR] Ошибка отправки email: {type(e).__name__}: {e}")
        return False

@bp.route('/profile')
@login_required
def profile():
    return render_template('profile.html')

@bp.route('/about')
def about():
    login_form = LoginForm()
    return render_template('about.html', form=login_form)

@bp.route('/confidential')
def confidential():
    login_form = LoginForm()
    return render_template('confidential.html', form=login_form)

@bp.route('/terms')
def terms():
    login_form = LoginForm()
    return render_template('terms.html', form=login_form)

@bp.route('/features')
def features():
    login_form = LoginForm()
    return render_template('features.html', form=login_form)

@bp.route('/privacy')
def privacy():
    return redirect(url_for('main.confidential'))

