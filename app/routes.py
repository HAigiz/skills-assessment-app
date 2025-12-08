from flask import render_template, request, redirect, url_for, jsonify, flash
from .forms import LoginForm, RegistrationForm
from werkzeug.security import check_password_hash, generate_password_hash
from flask import Blueprint
from flask_login import login_user, current_user, login_required, logout_user

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
        flash('У вас нет прав для добавления пользователей', 'error')
        return redirect(url_for('main.dashboard'))

    current_user_department_name = None

    if current_user.role == 'manager':
            department = Department.query.get(current_user.department_id)
            if department:
                current_user_department_name = department.name
    
    form = RegistrationForm(current_user=current_user, department_name=current_user_department_name)

    if request.method == 'GET':
        form.process()

    if form.validate_on_submit():
        new_login = form.login.data
        raw_password = form.password_hash.data

        if User.query.filter(User.login.ilike(new_login)).first():
            return jsonify({
                'success': False,
                'message': 'Пользователь с таким логином уже существует.'
            }), 409

        # Хэширование пароля
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
            return jsonify({'success': True, 'message': 'Регистрация прошла успешно.'}), 201 # 201 Created
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

@bp.route('/dashboard')
@login_required 
def dashboard():
    return render_template('dashboard.html')

@bp.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('main.index'))