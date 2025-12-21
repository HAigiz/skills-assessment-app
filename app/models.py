from . import db
from flask_login import UserMixin
from datetime import datetime
from sqlalchemy import event
from sqlalchemy.orm.attributes import get_history

class Department(db.Model):
    __tablename__ = 'departments'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    manager_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    manager = db.relationship('User', foreign_keys=[manager_id], backref='managed_department')
    users = db.relationship('User', backref='department', foreign_keys='User.department_id')

    def __repr__(self):
        return f'<Department {self.id}: {self.name}>'

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    login = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.Text, nullable=False)
    role = db.Column(db.String(20), nullable=False)
    full_name = db.Column(db.String(150), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    position = db.Column(db.String(100), nullable=True)
    
    skill_assessments = db.relationship('SkillAssessment', backref='user', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<User {self.id}: {self.login}>'
    
    def set_password(self, password):
        from werkzeug.security import generate_password_hash
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        from werkzeug.security import check_password_hash
        return check_password_hash(self.password_hash, password)

class Skill(db.Model):
    __tablename__ = 'skills'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    assessments = db.relationship('SkillAssessment', backref='skill', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Skill {self.id}: {self.name}>'

class SkillAssessment(db.Model):
    __tablename__ = 'skill_assessments'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    skill_id = db.Column(db.Integer, db.ForeignKey('skills.id', ondelete='CASCADE'), nullable=False)
    self_score = db.Column(db.Integer)
    manager_score = db.Column(db.Integer)
    assessed_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        db.CheckConstraint('self_score BETWEEN 1 AND 5', name='check_self_score'),
        db.CheckConstraint('manager_score BETWEEN 1 AND 5', name='check_manager_score'),
        db.UniqueConstraint('user_id', 'skill_id', name='unique_user_skill'),
    )
    
    history = db.relationship('AssessmentHistory', backref='assessment', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<SkillAssessment {self.id}: User {self.user_id}, Skill {self.skill_id}>'

class AssessmentHistory(db.Model):
    __tablename__ = 'assessment_history'
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('skill_assessments.id', ondelete='CASCADE'), nullable=False)
    field_changed = db.Column(db.String(50), nullable=False)  # 'self_score' или 'manager_score'
    old_value = db.Column(db.Integer)
    new_value = db.Column(db.Integer)
    changed_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'))
    changed_at = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.Column(db.Text)

    def __repr__(self):
        return f'<AssessmentHistory {self.id}: {self.field_changed} from {self.old_value} to {self.new_value}>'

@event.listens_for(SkillAssessment, 'after_update')
def receive_after_update(mapper, connection, target):
    from app import db
    self_score_history = get_history(target, 'self_score')
    manager_score_history = get_history(target, 'manager_score')
    if self_score_history.has_changes():
        history = AssessmentHistory(
            assessment_id=target.id,
            field_changed='self_score',
            old_value=self_score_history.deleted[0] if self_score_history.deleted else None,
            new_value=self_score_history.added[0] if self_score_history.added else None,
            changed_by=None,  #нужно получить ID текущего пользователя
            notes='Изменение самооценки'
        )
        db.session.add(history)
    if manager_score_history.has_changes():
        history = AssessmentHistory(
            assessment_id=target.id,
            field_changed='manager_score',
            old_value=manager_score_history.deleted[0] if manager_score_history.deleted else None,
            new_value=manager_score_history.added[0] if manager_score_history.added else None,
            changed_by=None,  #нужно получить ID текущего пользователя
            notes='Изменение оценки руководителя'
        )
        db.session.add(history)