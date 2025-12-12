from flask import Blueprint, render_template, jsonify, request
from flask_login import login_required, current_user

from .. import db
from ..models import User, Department
from ..forms import LoginForm, RegistrationForm
from werkzeug.security import generate_password_hash

from .auth_routes import bp as auth_bp
from .user_routes import bp as user_bp
from .skill_routes import bp as skill_bp
from .hr_routes import bp as hr_bp
from .main_routes import bp as main_bp

bp = Blueprint('main', __name__)

@bp.route('/')
def index():
    login_form = LoginForm()
    return render_template('welcome_page.html', form=login_form)

@bp.route('/for_commands')
def commands():
    login_form = LoginForm()
    return render_template('for_commands.html', form=login_form)

@bp.route('/contacts')
def contacts():
    login_form = LoginForm()
    return render_template('contacts.html', form=login_form)

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
    
    # GET запрос или не-JSON запрос
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