from .__init__ import db

class Department(db.Model):
    __tablename__ = 'departments'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    manager_id = db.Column(db.Integer, db.ForeignKey('users.id'))

    manager = db.relationship('User', foreign_keys=[manager_id], backref='managed_department')
    users = db.relationship('User', backref='department', foreign_keys='User.department_id')

    def __repr__(self):
        return '<Department id {}, name {} and manager id {}>'.format(self.id, self.name, self.manager_id)

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    login = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.Text, nullable=False)
    role = db.Column(db.String(20), nullable=False)
    full_name = db.Column(db.String(150), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'))
    
    skill_assessments = db.relationship('SkillAssessment', backref='user', cascade='all, delete-orphan')

    def __repr__(self):
        return '<User id {}, login {} and department id {}>'.format(self.id, self.login, self.department_id)
    
class Skill(db.Model):
    __tablename__ = 'skills'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    
    assessments = db.relationship('SkillAssessment', backref='skill', cascade='all, delete-orphan')

class SkillAssessment(db.Model):
    __tablename__ = 'skill_assessments'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    skill_id = db.Column(db.Integer, db.ForeignKey('skills.id', ondelete='CASCADE'), nullable=False)
    self_score = db.Column(db.Integer)
    manager_score = db.Column(db.Integer)
    assessed_at = db.Column(db.DateTime, server_default=db.func.now())
    
    __table_args__ = (
        db.CheckConstraint('self_score BETWEEN 1 AND 5', name='check_self_score'),
        db.CheckConstraint('manager_score BETWEEN 1 AND 5', name='check_manager_score'),
        db.UniqueConstraint('user_id', 'skill_id', name='unique_user_skill'),
    )
    
    history = db.relationship('AssessmentHistory', backref='assessment', cascade='all, delete-orphan')

class AssessmentHistory(db.Model):
    __tablename__ = 'assessment_history'
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('skill_assessments.id', ondelete='CASCADE'), nullable=False)
    old_score = db.Column(db.Integer)
    new_score = db.Column(db.Integer)
    changed_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'))
    changed_at = db.Column(db.DateTime, server_default=db.func.now())
