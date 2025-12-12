import os
import sys

#корневая директория проекта в sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

#импортируем все тестовые модули для удобного импорта
from tests.test_auth import AuthTestCase
from tests.test_skills import SkillsTestCase
# надо добавить потом другие тестовые классы по мере их создания

__all__ = [
    'AuthTestCase',
    'SkillsTestCase',
    #надо еще имена
]

#конфиг тестовой среды
TEST_CONFIG = {
    'TESTING': True,
    'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
    'WTF_CSRF_ENABLED': False,
    'SECRET_KEY': 'test-secret-key',
    'SQLALCHEMY_TRACK_MODIFICATIONS': False
}

#утилита для тестов
def create_test_app():
    """Создает тестовое приложение Flask."""
    from app import create_app
    app = create_app()
    app.config.update(TEST_CONFIG)
    return app

def setup_test_db(app):
    """Настраивает тестовую базу данных."""
    from app import db
    with app.app_context():
        db.create_all()
    return db

def teardown_test_db(app, db):
    """Очищает тестовую базу данных."""
    with app.app_context():
        db.session.remove()
        db.drop_all()

        