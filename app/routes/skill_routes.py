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
    
    #проверка оценок по навыку
    assessments_count = SkillAssessment.query.filter_by(skill_id=skill_id).count()
    if assessments_count > 0:
        return jsonify({
            'success': False, 
            'message': f'Невозможно удалить навык: есть {assessments_count} оценок по нему'
        }), 409
    
    db.session.delete(skill)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Навык удален'
    })

@bp.route('/api/compare-users')
@login_required
def compare_users():
    """Сравнение навыков двух пользователей"""
    user1_id = request.args.get('user1', type=int)
    user2_id = request.args.get('user2', type=int)
    
    if not user1_id or not user2_id:
        return jsonify({'success': False, 'message': 'Не указаны ID пользователей'}), 400
    
    #доступ
    if current_user.role == 'employee' and current_user.id not in [user1_id, user2_id]:
        return jsonify({'success': False, 'message': 'Доступ запрещен'}), 403
    
    user1 = User.query.get_or_404(user1_id)
    user2 = User.query.get_or_404(user2_id)
    
    if current_user.role == 'manager':
        if (current_user.department_id != user1.department_id or 
            current_user.department_id != user2.department_id):
            return jsonify({'success': False, 'message': 'Доступ запрещен'}), 403
    
    #навыки
    skills = Skill.query.all()
    
    comparison_data = []
    for skill in skills:
        #оценки первого
        assessment1 = SkillAssessment.query.filter_by(
            user_id=user1_id,
            skill_id=skill.id
        ).first()
        
        #оценки второго
        assessment2 = SkillAssessment.query.filter_by(
            user_id=user2_id,
            skill_id=skill.id
        ).first()
        
        comparison_data.append({
            'skill_id': skill.id,
            'skill_name': skill.name,
            'category': skill.category,
            'user1_score': assessment1.manager_score or assessment1.self_score if assessment1 else None,
            'user2_score': assessment2.manager_score or assessment2.self_score if assessment2 else None,
            'difference': (assessment2.manager_score or assessment2.self_score or 0) - 
                         (assessment1.manager_score or assessment1.self_score or 0) 
                         if assessment1 or assessment2 else None
        })
    
    return jsonify({
        'success': True,
        'user1': {
            'id': user1.id,
            'full_name': user1.full_name,
            'role': user1.role
        },
        'user2': {
            'id': user2.id,
            'full_name': user2.full_name,
            'role': user2.role
        },
        'comparison': comparison_data
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

@bp.route('/api/skills/search')
@login_required
def search_skills():
    """Поиск сотрудников по навыку"""
    skill_name = request.args.get('skill', '')
    min_score = request.args.get('min_score', 1, type=int)
    
    if not skill_name:
        return jsonify({'success': False, 'message': 'Не указан навык для поиска'}), 400
    
    #поиск навыка
    skill = Skill.query.filter(Skill.name.ilike(f'%{skill_name}%')).first()
    if not skill:
        return jsonify({'success': False, 'message': 'Навык не найден'}), 404
    
    #поиск оценок по этому навыку
    assessments = SkillAssessment.query.filter_by(skill_id=skill.id).all()
    
    #фильтр мин балла
    filtered_assessments = []
    for assessment in assessments:
        final_score = assessment.manager_score or assessment.self_score
        if final_score and final_score >= min_score:
            filtered_assessments.append(assessment)
    
    #данные всех юзеров
    users_data = []
    for assessment in filtered_assessments:
        user = User.query.get(assessment.user_id)
        if user:
            users_data.append({
                'id': user.id,
                'full_name': user.full_name,
                'login': user.login,
                'role': user.role,
                'department': user.department.name if user.department else None,
                'self_score': assessment.self_score,
                'manager_score': assessment.manager_score,
                'final_score': assessment.manager_score or assessment.self_score
            })
    
    return jsonify({
        'success': True,
        'skill': {
            'id': skill.id,
            'name': skill.name,
            'category': skill.category
        },
        'users': users_data,
        'total_found': len(users_data)
    })