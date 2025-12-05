from flask import Flask
from flask_migrate import Migrate

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

migrate = Migrate()

def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://NV:NVCASE2@postgres:5432/RTK_DB'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = True
    
    db.init_app(app)
    migrate.init_app(app, db)

    with app.app_context():
        from . import models

    return app
