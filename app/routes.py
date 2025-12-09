from flask import render_template, request, redirect, url_for, jsonify, flash
from .forms import LoginForm, RegistrationForm
from werkzeug.security import check_password_hash, generate_password_hash
from flask import Blueprint
from flask_login import login_user, current_user, login_required, logout_user
import json

from . import db
from .models import User, Department

bp = Blueprint('main', __name__)

@bp.route('/')
def index():
    login_form = LoginForm()
    return render_template('welcome_page.html', form=login_form)

@bp.route('/login', methods=['GET', 'POST'])
def login():
    form = LoginForm()

    if current_user.is_authenticated:
            return redirect(url_for('main.dashboard'))

    if form.validate_on_submit():
        login_input = form.login.data
        
        user = User.query.filter(User.login.ilike(login_input)).first()

        if user and check_password_hash(user.password_hash, form.password.data):
            login_user(user, remember=True)
            return redirect(url_for('main.dashboard'))
        else:
            return jsonify({
                'success': False,
                'message': 'Неверный логин или пароль.'
            }), 401
    
    error_messages = {}
    for field, errors in form.errors.items():
        error_messages[field] = errors[0]
        
    return jsonify({
        'success': False,
        'message': 'Пожалуйста, заполните все поля.',
        'errors': error_messages
    }), 400

@bp.route('/register', methods=['GET', 'POST'])
@login_required
def register():
    if current_user.role not in ['admin', 'hr', 'manager']:
        return jsonify({
            'success': False,
            'message': 'У вас нет прав для добавления пользователей'
        }), 403

    if request.is_json:
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
    
    if form.validate_on_submit():
        new_login = form.login.data
        raw_password = form.password_hash.data

        if User.query.filter(User.login.ilike(new_login)).first():
            return jsonify({
                'success': False,
                'message': 'Пользователь с таким логином уже существует.'
            }), 409

        hashed_password = generate_password_hash(raw_password)

        new_user = User(
            login=new_login,
            password_hash=hashed_password,
            role=form.role.data,
            full_name=form.full_name.data,
            department_id=form.department_id.data
        )
        
        db.session.add(new_user)
        try:
            db.session.commit()
            return jsonify({'success': True, 'message': 'Регистрация прошла успешно.'}), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'message': f'Ошибка базы данных: {e}'}), 500
    
    if request.method == 'POST':
        error_messages = {field: errors[0] for field, errors in form.errors.items()}
        return jsonify({
            'success': False,
            'message': 'Некорректные данные формы.',
            'errors': error_messages
        }), 400
    
    return render_template('registry.html', form=form, current_user=current_user, current_user_department_name=current_user_department_name)

@bp.route('/departments')
@login_required
def get_departments():
    if current_user.role not in ['admin', 'hr']:
        return jsonify({'success': False, 'message': 'Доступ запрещен'}), 403
    
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