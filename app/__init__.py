# app/__init__.py
from flask import Flask, render_template
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
import os
from dotenv import load_dotenv
from flask_mail import Mail

load_dotenv()

db = SQLAlchemy()
migrate = Migrate()
mail = Mail()
login_manager = LoginManager()

def create_app():
    app = Flask(__name__, template_folder='./templates', static_folder='./static')
    
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
    
    app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
    app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
    app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
    app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
    app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER', os.getenv('MAIL_USERNAME'))

    db.init_app(app)
    mail.init_app(app)
    login_manager.init_app(app)
    migrate.init_app(app, db)

    login_manager.login_view = 'auth.login'
    
    from .models import User
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    #импорт и регистрация blueprint'ов
    from .routes.auth_routes import bp as auth_bp
    from .routes.user_routes import bp as user_bp
    from .routes.skill_routes import bp as skill_bp
    from .routes.hr_routes import bp as hr_bp
    from .routes.main_routes import bp as main_bp
    from .routes.api_routes import api as api_bp
    
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(user_bp, url_prefix='/user')
    app.register_blueprint(skill_bp, url_prefix='/skill')
    app.register_blueprint(hr_bp, url_prefix='/hr')
    app.register_blueprint(main_bp, url_prefix='/')
    app.register_blueprint(api_bp)
    
    # обработка ошибок
    @app.errorhandler(404)
    def not_found_error(error):
        return render_template('404.html'), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return render_template('500.html'), 500
    
    with app.app_context():
        db.create_all()

    return app
    