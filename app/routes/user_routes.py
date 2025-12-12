from flask import render_template, request, jsonify, Blueprint
from flask_login import login_required, current_user
from werkzeug.security import generate_password_hash
from .. import db
from ..models import User, Department, Skill, SkillAssessment
from ..forms import RegistrationForm

bp = Blueprint('user', __name__)

@bp.route('/dashboard')
@login_required 
def dashboard():
    """Дашборд в зависимости от роли"""
    department = None
    if current_user.department_id:
        department = Department.query.get(current_user.department_id)
    
    #статистика для дашборда
    stats = {}
    
    if current_user.role == 'employee':
        #для сотрудника оценка навыков
        assessments = SkillAssessment.query.filter_by(user_id=current_user.id).all()
        stats['assessed_skills'] = len(assessments)
        stats['total_skills'] = Skill.query.count()
        
    elif current_user.role == 'manager':
        #для руководства кол-во сотрудников
        team_count = User.query.filter_by(department_id=current_user.department_id).count()
        stats['team_count'] = team_count - 1  # исключая самого руководителя
        
    elif current_user.role == 'hr':
        #для hr общая стата
        stats['total_users'] = User.query.count()
        stats['total_departments'] = Department.query.count()
        stats['total_skills'] = Skill.query.count()
    
    return render_template('dashboard.html', 
                          current_user=current_user, 
                          department=department,
                          stats=stats)

@bp.route('/profile')
@login_required
def profile():
    """Страница профиля с навыками"""
    user = current_user
    
    #все навыки с оценками
    skills_with_assessments = db.session.query(
        Skill,
        SkillAssessment.self_score,
        SkillAssessment.manager_score,
        SkillAssessment.assessed_at
    ).outerjoin(
        SkillAssessment, 
        (SkillAssessment.skill_id == Skill.id) & 
        (SkillAssessment.user_id == user.id)
    ).order_by(Skill.category, Skill.name).all()
    
    #группируем навыки по категориям
    skills_by_category = {}
    for skill, self_score, manager_score, assessed_at in skills_with_assessments:
        if skill.category not in skills_by_category:
            skills_by_category[skill.category] = []
        skills_by_category[skill.category].append({
            'id': skill.id,
            'name': skill.name,
            'description': skill.description,
            'self_score': self_score,
            'manager_score': manager_score,
            'assessed_at': assessed_at,
            'final_score': manager_score or self_score
        })
    
    return render_template('profile.html', 
                          user=user,
                          skills_by_category=skills_by_category)

@bp.route('/my-team')
@login_required
def my_team():
    """Страница команды для руководителя"""
    if current_user.role != 'manager':
        return jsonify({
            'success': False,
            'message': 'Доступ запрещен. Только для руководителей.'
        }), 403
    
    #получение всех сотрудников с данного отдела (кроме самого руководства)
    team_members = User.query.filter(
        User.department_id == current_user.department_id,
        User.id != current_user.id
    ).all()
    
    #для всех сотрудников стата навыков
    members_data = []
    for member in team_members:
        assessments = SkillAssessment.query.filter_by(user_id=member.id).all()
        avg_self_score = None
        avg_manager_score = None
        
        if assessments:
            self_scores = [a.self_score for a in assessments if a.self_score]
            manager_scores = [a.manager_score for a in assessments if a.manager_score]
            
            avg_self_score = sum(self_scores) / len(self_scores) if self_scores else None
            avg_manager_score = sum(manager_scores) / len(manager_scores) if manager_scores else None
        
        members_data.append({
            'id': member.id,
            'full_name': member.full_name,
            'login': member.login,
            'role': member.role,
            'assessments_count': len(assessments),
            'avg_self_score': avg_self_score,
            'avg_manager_score': avg_manager_score
        })
    
    return render_template('my_team.html',
                          current_user=current_user,
                          team_members=members_data)

@bp.route('/api/user/<int:user_id>/skills')
@login_required
def get_user_skills(user_id):
    """API для получения навыков пользователя (для графика)"""
    user = User.query.get_or_404(user_id)
    
    #проверка доступности
    if current_user.role == 'employee' and current_user.id != user_id:
        return jsonify({'success': False, 'message': 'Доступ запрещен'}), 403
    
    if current_user.role == 'manager' and current_user.department_id != user.department_id:
        return jsonify({'success': False, 'message': 'Доступ запрещен'}), 403
    
    skills = db.session.query(
        Skill.name,
        Skill.category,
        SkillAssessment.self_score,
        SkillAssessment.manager_score
    ).outerjoin(
        SkillAssessment, 
        (SkillAssessment.skill_id == Skill.id) & 
        (SkillAssessment.user_id == user_id)
    ).order_by(Skill.category, Skill.name).all()
    
    #график данных
    chart_data = {
        'labels': [skill.name for skill, category, self_score, manager_score in skills],
        'categories': [category for skill, category, self_score, manager_score in skills],
        'self_scores': [self_score or 0 for skill, category, self_score, manager_score in skills],
        'manager_scores': [manager_score or 0 for skill, category, self_score, manager_score in skills],
        'final_scores': [manager_score or self_score or 0 for skill, category, self_score, manager_score in skills]
    }
    
    return jsonify({
        'success': True,
        'user': {
            'id': user.id,
            'full_name': user.full_name,
            'role': user.role
        },
        'chart_data': chart_data
    })
    
@bp.route('/api/dashboard/stats')
@login_required
def get_dashboard_stats():
    """API для получения статистики дашборда"""
    stats = {}
    
    if current_user.role == 'employee':
        assessments = SkillAssessment.query.filter_by(user_id=current_user.id).all()
        stats['assessed_skills'] = len(assessments)
        stats['total_skills'] = Skill.query.count()
        
        if assessments:
            total_score = sum(a.self_score for a in assessments if a.self_score)
            stats['avg_score'] = round(total_score / len(assessments), 1)
        else:
            stats['avg_score'] = 0
            
    elif current_user.role == 'manager':
        team_count = User.query.filter_by(department_id=current_user.department_id).count()
        stats['team_count'] = team_count - 1 if team_count > 0 else 0
        
        pending_reviews = SkillAssessment.query.join(
            User, SkillAssessment.user_id == User.id
        ).filter(
            User.department_id == current_user.department_id,
            User.id != current_user.id,
            SkillAssessment.manager_score.is_(None),
            SkillAssessment.self_score.isnot(None)
        ).count()
        stats['pending_reviews'] = pending_reviews
        
    elif current_user.role == 'hr':
        stats['total_users'] = User.query.count()
        stats['total_departments'] = Department.query.count()
        stats['total_skills'] = Skill.query.count()
    
    return jsonify({
        'success': True,
        'data': stats
    })

@bp.route('/api/assess-skill', methods=['POST'])
@login_required
def assess_skill():
    """API для самооценки навыка"""
    data = request.get_json()
    
    if not data:
        return jsonify({'success': False, 'message': 'Нет данных'}), 400
    
    skill_id = data.get('skill_id')
    score = data.get('score')
    
    if not skill_id or score is None:
        return jsonify({'success': False, 'message': 'Не указаны skill_id или score'}), 400
    
    try:
        score_int = int(score)
        if not (1 <= score_int <= 5):
            return jsonify({'success': False, 'message': 'Оценка должна быть от 1 до 5'}), 400
    except (ValueError, TypeError):
        return jsonify({'success': False, 'message': 'Некорректная оценка'}), 400
    
    #проверка
    skill = Skill.query.get(skill_id)
    if not skill:
        return jsonify({'success': False, 'message': 'Навык не найден'}), 404
    
    #поиск существующей оценки
    assessment = SkillAssessment.query.filter_by(
        user_id=current_user.id,
        skill_id=skill_id
    ).first()
    
    if assessment:
        #обновляем
        assessment.self_score = score_int
    else:
        #создаем новую
        assessment = SkillAssessment(
            user_id=current_user.id,
            skill_id=skill_id,
            self_score=score_int
        )
        db.session.add(assessment)
    
    try:
        db.session.commit()
        return jsonify({
            'success': True,
            'message': 'Оценка сохранена',
            'assessment': {
                'skill_id': skill_id,
                'skill_name': skill.name,
                'self_score': score_int,
                'assessed_at': assessment.assessed_at.isoformat() if assessment.assessed_at else None
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Ошибка при сохранении: {str(e)}'
        }), 500

@bp.route('/register')
@login_required
def register_page():
    """Страница регистрации пользователя"""
    if current_user.role not in ['admin', 'hr', 'manager']:
        return jsonify({
            'success': False,
            'message': 'У вас нет прав на добавление пользователя'
        }), 403
    
    current_user_department_name = None
    if current_user.role == 'manager':
        department = Department.query.get(current_user.department_id)
        if department:
            current_user_department_name = department.name
    
    from ..forms import RegistrationForm
    form = RegistrationForm(current_user=current_user, department_name=current_user_department_name)
    
    return render_template('registry.html', form=form, current_user=current_user, current_user_department_name=current_user_department_name)