import unittest
from app import create_app, db
from app.models import User, Department, Skill, SkillAssessment
from werkzeug.security import generate_password_hash
from flask_login import login_user

class SkillsTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.app.config['WTF_CSRF_ENABLED'] = False
        self.client = self.app.test_client()
        
        with self.app.app_context():
            db.create_all()
            
            #тестовые данные
            dept = Department(name='Test Department')
            db.session.add(dept)
            db.session.commit()
            
            user = User(
                login='employee1',
                password_hash=generate_password_hash('password123'),
                role='employee',
                full_name='Employee One',
                department_id=dept.id
            )
            db.session.add(user)
            
            manager = User(
                login='manager1',
                password_hash=generate_password_hash('password123'),
                role='manager',
                full_name='Manager One',
                department_id=dept.id
            )
            db.session.add(manager)
            
            skill = Skill(
                name='Python',
                category='Programming Languages',
                description='Python programming language'
            )
            db.session.add(skill)
            
            db.session.commit()
            
            #ID использования в тестах
            self.user_id = user.id
            self.manager_id = manager.id
            self.skill_id = skill.id
            self.dept_id = dept.id
    
    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()
    
    def test_assess_skill(self):
        with self.app.app_context():
            #логиним пользователя
            user = User.query.get(self.user_id)
            
            with self.client.session_transaction() as sess:
                #сюда надо логику сессии Flask-Login
                pass
            
            response = self.client.post('/api/assess-skill', json={
                'skill_id': self.skill_id,
                'score': 4
            })
            
            #проверка создания оценки
            assessment = SkillAssessment.query.filter_by(
                user_id=self.user_id,
                skill_id=self.skill_id
            ).first()
            
            self.assertIsNotNone(assessment)
            self.assertEqual(assessment.self_score, 4)
    
    def test_get_user_skills(self):
        #создание оценки
        with self.app.app_context():
            assessment = SkillAssessment(
                user_id=self.user_id,
                skill_id=self.skill_id,
                self_score=4
            )
            db.session.add(assessment)
            db.session.commit()
        
        response = self.client.get(f'/api/user/{self.user_id}/skills')
        self.assertEqual(response.status_code, 200)
        
        data = response.get_json()
        self.assertTrue(data['success'])
        self.assertIn('chart_data', data)

if __name__ == '__main__':
    unittest.main()