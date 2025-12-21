from flask import render_template, request, jsonify, Blueprint, send_file
from flask_login import login_required, current_user
from .. import db
from ..models import Skill, User, SkillAssessment, AssessmentHistory, Department
from datetime import datetime
import csv
import io

bp = Blueprint('skill', __name__)

@bp.route('/skills')
@login_required
def skill_management():
    """Управление справочником навыков (для HR)"""
    if current_user.role not in ['hr', 'admin']:
        return jsonify({
            'success': False,
            'message': 'Доступ запрещен. Только для HR и администраторов.'
        }), 403
    
    skills = Skill.query.order_by(Skill.category, Skill.name).all()
    
    #навыки по категориям
    categories = {}
    for skill in skills:
        if skill.category not in categories:
            categories[skill.category] = []
        categories[skill.category].append(skill)
    
    return render_template('skill_management.html',
                          current_user=current_user,
                          categories=categories)

@bp.route('/api/skills', methods=['GET'])
@login_required
def get_skills():
    """API для получения всех навыков"""
    skills = Skill.query.order_by(Skill.category, Skill.name).all()
    
    skills_list = [{
        'id': skill.id,
        'name': skill.name,
        'category': skill.category,
        'description': skill.description,
        'assessments_count': SkillAssessment.query.filter_by(skill_id=skill.id).count()
    } for skill in skills]
    
    return jsonify({
        'success': True,
        'skills': skills_list,
        'total': len(skills_list)
    })

@bp.route('/api/skills', methods=['POST'])
@login_required
def create_skill():
    """API для создания нового навыка"""
    if current_user.role not in ['hr', 'admin']:
        return jsonify({'success': False, 'message': 'Доступ запрещен'}), 403
    
    data = request.get_json()
    
    if not data or 'name' not in data or 'category' not in data:
        return jsonify({'success': False, 'message': 'Не указаны название и категория'}), 400
    
    #проверка данного навыка
    existing_skill = Skill.query.filter_by(
        name=data['name'],
        category=data['category']
    ).first()
    
    if existing_skill:
        return jsonify({'success': False, 'message': 'Такой навык уже существует'}), 409
    
    skill = Skill(
        name=data['name'],
        category=data['category'],
        description=data.get('description', '')
    )
    
    db.session.add(skill)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Навык успешно создан',
        'skill': {
            'id': skill.id,
            'name': skill.name,
            'category': skill.category,
            'description': skill.description
        }
    })

@bp.route('/api/skills/<int:skill_id>', methods=['PUT'])
@login_required
def update_skill(skill_id):
    """API для обновления навыка"""
    if current_user.role not in ['hr', 'admin']:
        return jsonify({'success': False, 'message': 'Доступ запрещен'}), 403
    
    skill = Skill.query.get_or_404(skill_id)
    data = request.get_json()
    
    if 'name' in data:
        skill.name = data['name']
    if 'category' in data:
        skill.category = data['category']
    if 'description' in data:
        skill.description = data['description']
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Навык обновлен',
        'skill': {
            'id': skill.id,
            'name': skill.name,
            'category': skill.category,
            'description': skill.description
        }
    })

@bp.route('/api/skills/<int:skill_id>', methods=['DELETE'])
@login_required
def delete_skill(skill_id):
    """API для удаления навыка"""
    if current_user.role not in ['hr', 'admin']:
        return jsonify({'success': False, 'message': 'Доступ запрещен'}), 403
    
    skill = Skill.query.get_or_404(skill_id)
    
    db.session.delete(skill)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Навык удален'
    })

@bp.route('/export/csv')
@login_required
def export_csv():
    """Экспорт данных в CSV"""
    if current_user.role not in ['hr', 'admin']:
        return jsonify({'success': False, 'message': 'Доступ запрещен'}), 403
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(['ID', 'ФИО', 'Логин', 'Роль', 'Отдел', 'Навык', 'Категория', 
                     'Самооценка', 'Оценка руководителя', 'Дата оценки'])
    
    #все оценки которые даны
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
     .join(SkillAssessment, User.id == SkillAssessment.user_id, isouter=True)\
     .join(Skill, SkillAssessment.skill_id == Skill.id, isouter=True)\
     .filter(SkillAssessment.id.isnot(None))\
     .order_by(User.full_name, Skill.category, Skill.name)\
     .all()
    
    for row in assessments:
        writer.writerow([
            row.id,
            row.full_name,
            row.login,
            row.role,
            row.department_name,
            row.skill_name,
            row.category,
            row.self_score,
            row.manager_score,
            row.assessed_at.strftime('%Y-%m-%d %H:%M:%S') if row.assessed_at else ''
        ])
    
    #файл вернулся
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f'skill_assessments_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
    )

@bp.route('/api/assessments', methods=['POST'])
@login_required
def create_assessment():
    data = request.json

    assessment = SkillAssessment.query.filter_by(
        user_id=data['user_id'],
        skill_id=data['skill_id']
    ).first()

    if assessment:
        assessment.self_score = data.get('self_score')
        assessment.manager_score = data.get('manager_score')
    else:
        assessment = SkillAssessment(
            user_id=data['user_id'],
            skill_id=data['skill_id'],
            self_score=data.get('self_score'),
            manager_score=data.get('manager_score')
        )
        db.session.add(assessment)

    db.session.commit()
    return jsonify({'success': True})
