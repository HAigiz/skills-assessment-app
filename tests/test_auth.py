import unittest
from app import create_app, db
from app.models import User, Department
from werkzeug.security import generate_password_hash

class AuthTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.client = self.app.test_client()
        
        with self.app.app_context():
            db.create_all()
            
            #тестовые данные
            dept = Department(name='Test Department')
            db.session.add(dept)
            db.session.commit()
            
            user = User(
                login='testuser',
                password_hash=generate_password_hash('testpassword123'),
                role='employee',
                full_name='Test User',
                department_id=dept.id
            )
            db.session.add(user)
            db.session.commit()
    
    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()
    
    def test_login_success(self):
        response = self.client.post('/login', json={
            'login': 'testuser',
            'password': 'testpassword123'
        })
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data['success'])
    
    def test_login_wrong_password(self):
        response = self.client.post('/login', json={
            'login': 'testuser',
            'password': 'wrongpassword'
        })
        self.assertEqual(response.status_code, 401)
        data = response.get_json()
        self.assertFalse(data['success'])
    
    def test_login_missing_fields(self):
        response = self.client.post('/login', json={
            'login': 'testuser'
        })
        self.assertEqual(response.status_code, 400)

if __name__ == '__main__':
    unittest.main()