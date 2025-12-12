from flask import render_template, request, jsonify, redirect, url_for
from werkzeug.security import check_password_hash, generate_password_hash
from flask import Blueprint
from flask_login import login_user, current_user, login_required, logout_user

from .. import db
from ..models import User, Department
from ..forms import LoginForm, RegistrationForm

bp = Blueprint('main', __name__)

@bp.route('/')
def index():
    login_form = LoginForm()
    return render_template('welcome_page.html', form=login_form)

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

@bp.route('/contacts')
def contacts():
    login_form = LoginForm()
    return render_template('contacts.html', form=login_form)

@bp.route('/for_commands')
def commands():
    login_form = LoginForm()
    return render_template('for_commands.html', form=login_form)

@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    if current_user.is_authenticated:
            return redirect(url_for('main.index'))

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

@bp.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('main.index'))