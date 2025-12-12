from flask import render_template, request, redirect, url_for, jsonify, Blueprint
from flask_login import login_user, logout_user, current_user, login_required
from werkzeug.security import check_password_hash
from .. import db
from ..models import User
from ..forms import LoginForm

bp = Blueprint('auth', __name__)

@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    if current_user.is_authenticated:
        return jsonify({
            'success': False,
            'message': 'Вы уже авторизованы.'
        }), 400

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
            'redirect_url': url_for('user.dashboard'),
            'user': {
                'id': user.id,
                'full_name': user.full_name,
                'role': user.role
            }
        }), 200 
    else:
        return jsonify({
            'success': False,
            'message': 'Неверный логин или пароль. Попробуйте ещё раз.'
        }), 401

@bp.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('main.index'))