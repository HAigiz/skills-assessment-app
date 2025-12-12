import csv
import io
from datetime import datetime
from flask import send_file
from .. import db
from ..models import User, Department, Skill, SkillAssessment

def export_assessments_to_csv():
    """Экспорт всех оценок в CSV"""
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';', quoting=csv.QUOTE_MINIMAL)

    writer.writerow(['ID', 'ФИО', 'Логин', 'Роль', 'Отдел', 'Навык', 'Категория', 
                     'Самооценка', 'Оценка руководителя', 'Дата оценки'])
    
    #все оценки
    assessments = db.session.query(
        User.id,
        User.full_name,
        User.login,
        User.role,
        Department.name.label('department_name'),
        Skill.name.label('skill_name'),
        Skill.category,
        SkillAssessment.self_score,
        SkillAssessment.manager_score,
        SkillAssessment.assessed_at
    ).join(Department, User.department_id == Department.id, isouter=True)\
     .join(SkillAssessment, User.id == SkillAssessment.user_id)\
     .join(Skill, SkillAssessment.skill_id == Skill.id)\
     .order_by(User.full_name, Skill.category, Skill.name)\
     .all()
    
    for row in assessments:
        writer.writerow([
            row.id,
            row.full_name or '',
            row.login or '',
            row.role or '',
            row.department_name or '',
            row.skill_name or '',
            row.category or '',
            row.self_score or '',
            row.manager_score or '',
            row.assessed_at.strftime('%Y-%m-%d %H:%M:%S') if row.assessed_at else ''
        ])
    
    output.seek(0)
    return output

def export_users_to_csv():
    """Экспорт всех пользователей в CSV"""
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';', quoting=csv.QUOTE_MINIMAL)
    
    writer.writerow(['ID', 'ФИО', 'Логин', 'Роль', 'Отдел', 'Дата регистрации'])
    
    users = db.session.query(
        User.id,
        User.full_name,
        User.login,
        User.role,
        Department.name.label('department_name'),
        User.created_at  #добавить это поле в модель
    ).join(Department, User.department_id == Department.id, isouter=True)\
     .order_by(User.full_name)\
     .all()
    
    for row in users:
        writer.writerow([
            row.id,
            row.full_name or '',
            row.login or '',
            row.role or '',
            row.department_name or '',
            row.created_at.strftime('%Y-%m-%d %H:%M:%S') if hasattr(row, 'created_at') and row.created_at else ''
        ])
    
    output.seek(0)
    return output

def export_skills_to_csv():
    """Экспорт справочника навыков в CSV"""
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';', quoting=csv.QUOTE_MINIMAL)
    
    writer.writerow(['ID', 'Название', 'Категория', 'Описание', 'Количество оценок'])
    
    skills = db.session.query(
        Skill.id,
        Skill.name,
        Skill.category,
        Skill.description,
        db.func.count(SkillAssessment.id).label('assessment_count')
    ).outerjoin(SkillAssessment, SkillAssessment.skill_id == Skill.id)\
     .group_by(Skill.id)\
     .order_by(Skill.category, Skill.name)\
     .all()
    
    for row in skills:
        writer.writerow([
            row.id,
            row.name or '',
            row.category or '',
            row.description or '',
            row.assessment_count or 0
        ])
    
    output.seek(0)
    return output

def create_csv_response(csv_data, filename_prefix):
    """Создание HTTP-ответа с CSV файлом"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"{filename_prefix}_{timestamp}.csv"
    
    return send_file(
        io.BytesIO(csv_data.getvalue().encode('utf-8-sig')),
        mimetype='text/csv; charset=utf-8-sig',
        as_attachment=True,
        download_name=filename
    )