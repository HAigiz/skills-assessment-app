from flask import Flask
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager

db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()

def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://NV:NVCASE2@postgres:5432/RTK_DB'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = 'NJNJ43232ojfds./*rewr--+78f4sd'
    
    db.init_app(app)
    migrate.init_app(app, db)

    login_manager.init_app(app) 
    login_manager.login_view = 'main.login'
    
    from .models import User
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    from .routes import bp as main_bp
    app.register_blueprint(main_bp)
    
    with app.app_context():
        from . import models

    return app
