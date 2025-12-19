from flask import render_template, request, redirect, url_for, jsonify, flash, current_app
from ..forms import LoginForm, RegistrationForm
from werkzeug.security import check_password_hash, generate_password_hash
from flask import Blueprint
from flask_login import login_user, current_user, login_required, logout_user
from datetime import datetime

import logging
logging.basicConfig(level=logging.DEBUG)

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
            from .email_service import send_contact_email
            
            success = send_contact_email(name, email, phone, subject, message)
            
            if success:
                flash('✅ Сообщение успешно отправлено! Мы свяжемся с вами в ближайшее время.', 'success')
            else:
                flash('❌ Ошибка при отправке сообщения. Пожалуйста, попробуйте позже или свяжитесь с нами по телефону.', 'error')
                
        except Exception as e:
            print(f"[ERROR] Ошибка отправки: {e}")
            flash(f'❌ Произошла ошибка при отправке сообщения: {str(e)}', 'error')
        
        return redirect(url_for('main.contacts'))
    
    return render_template('contacts.html', form=login_form)

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

