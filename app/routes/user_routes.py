from flask import render_template, request, jsonify, Blueprint, redirect, flash, url_for
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

        if assessments:
            total_score = sum(a.self_score for a in assessments if a.self_score is not None)
            stats['avg_score'] = round(total_score / len(assessments), 1)
        else:
            stats['avg_score'] = 0
        
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

@bp.route('/employee/<int:user_id>')
@login_required
def view_employee_profile(user_id):
    """Просмотр профиля сотрудника руководителем или HR"""
    # Разрешаем доступ руководителям и HR/администраторам
    if current_user.role not in ['manager', 'hr', 'admin']:
        flash('Доступ запрещен. Только для руководителей и HR.', 'error')
        return redirect(url_for('user.dashboard'))
    
    # Получаем сотрудника
    employee = User.query.get_or_404(user_id)
    
    # Для руководителей проверяем, что сотрудник из их отдела
    if current_user.role == 'manager':
        if employee.department_id != current_user.department_id:
            flash('Вы можете просматривать только сотрудников своего отдела', 'error')
            return redirect(url_for('user.my_team'))
    
    # Для HR - доступ ко всем сотрудникам без ограничений
    # (HR и admin могут смотреть всех)
    
    # Получаем навыки с оценками
    skills_with_assessments = db.session.query(
        Skill,
        SkillAssessment.self_score,
        SkillAssessment.manager_score,
        SkillAssessment.assessed_at
    ).outerjoin(
        SkillAssessment, 
        (SkillAssessment.skill_id == Skill.id) & 
        (SkillAssessment.user_id == user_id)
    ).order_by(Skill.category, Skill.name).all()
    
    # Группируем навыки по категориям
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
            'assessed_at': assessed_at
        })
    
    # Статистика
    assessments = SkillAssessment.query.filter_by(user_id=user_id).all()
    total_assessed_skills = len(assessments)
    
    # Средние оценки
    self_scores = [a.self_score for a in assessments if a.self_score]
    manager_scores = [a.manager_score for a in assessments if a.manager_score]
    
    average_self_score = round(sum(self_scores) / len(self_scores), 1) if self_scores else None
    average_manager_score = round(sum(manager_scores) / len(manager_scores), 1) if manager_scores else None
    
    return render_template('employee_profile.html',
                          user=employee,
                          skills_by_category=skills_by_category,
                          total_assessed_skills=total_assessed_skills,
                          average_self_score=average_self_score,
                          average_manager_score=average_manager_score,
                          current_user=current_user)

@bp.route('/api/employee/<int:user_id>/skills-data')
@login_required
def get_employee_skills_data(user_id):
    """API для получения данных навыков сотрудника для графика"""
    # Разрешаем руководителям и HR
    if current_user.role not in ['manager', 'hr', 'admin']:
        return jsonify({'success': False, 'message': 'Доступ запрещен'}), 403
    
    employee = User.query.get_or_404(user_id)
    
    # Проверяем права доступа
    if current_user.role == 'manager':
        if employee.department_id != current_user.department_id:
            return jsonify({'success': False, 'message': 'Доступ запрещен'}), 403
    
    # Получаем ВСЕ навыки с оценками (даже без оценок)
    results = db.session.query(
        Skill,
        SkillAssessment.self_score,
        SkillAssessment.manager_score
    ).outerjoin(
        SkillAssessment, 
        (SkillAssessment.skill_id == Skill.id) & 
        (SkillAssessment.user_id == user_id)
    ).order_by(Skill.category, Skill.name).all()
    
    # Создаем данные для графика
    labels = []
    self_scores = []
    manager_scores = []
    
    for skill, self_score, manager_score in results:
        labels.append(skill.name)
        self_scores.append(self_score or 0)  # 0 если нет оценки
        manager_scores.append(manager_score or 0)  # 0 если нет оценки
    
    chart_data = {
        'labels': labels,
        'self_scores': self_scores,
        'manager_scores': manager_scores,
        'total_skills': len(labels)
    }
    
    return jsonify({
        'success': True,
        'chart_data': chart_data
    })

@bp.route('/api/assess-employee-skill', methods=['POST'])
@login_required
def assess_employee_skill():
    """API для оценки навыков сотрудника руководителем или HR"""
    # Разрешаем руководителям и HR/администраторам
    if current_user.role not in ['manager', 'hr', 'admin']:
        return jsonify({'success': False, 'message': 'Доступ запрещен'}), 403
    
    data = request.get_json()
    
    if not data:
        return jsonify({'success': False, 'message': 'Нет данных'}), 400
    
    employee_id = data.get('employee_id')
    skill_id = data.get('skill_id')
    manager_score = data.get('manager_score')
    
    if not all([employee_id, skill_id, manager_score is not None]):
        return jsonify({'success': False, 'message': 'Не указаны все параметры'}), 400
    
    # Проверяем сотрудника
    employee = User.query.get(employee_id)
    if not employee:
        return jsonify({'success': False, 'message': 'Сотрудник не найден'}), 404
    
    # Проверяем права доступа
    if current_user.role == 'manager':
        # Руководитель может оценивать только своих сотрудников
        if employee.department_id != current_user.department_id:
            return jsonify({'success': False, 'message': 'Доступ запрещен'}), 403
    
    # HR и администраторы могут оценивать всех сотрудников без ограничений
    
    try:
        score_int = int(manager_score)
        if not (1 <= score_int <= 5):
            return jsonify({'success': False, 'message': 'Оценка должна быть от 1 до 5'}), 400
    except (ValueError, TypeError):
        return jsonify({'success': False, 'message': 'Некорректная оценка'}), 400
    
    # Проверяем существование навыка
    skill = Skill.query.get(skill_id)
    if not skill:
        return jsonify({'success': False, 'message': 'Навык не найден'}), 404
    
    # Ищем существующую оценку
    assessment = SkillAssessment.query.filter_by(
        user_id=employee_id,
        skill_id=skill_id
    ).first()
    
    if assessment:
        # Обновляем оценку руководителя
        assessment.manager_score = score_int
        assessment.manager_assessed_at = db.func.now()
    else:
        # Создаем новую запись с оценкой руководителя
        assessment = SkillAssessment(
            user_id=employee_id,
            skill_id=skill_id,
            manager_score=score_int,
            manager_assessed_at=db.func.now()
        )
        db.session.add(assessment)
    
    try:
        db.session.commit()
        
        # Добавляем запись в историю изменений
        from ..models import AssessmentHistory
        history = AssessmentHistory(
            assessment_id=assessment.id,
            field_changed='manager_score',
            old_value=None,  # Нет старого значения для новой оценки
            new_value=score_int,
            changed_by=current_user.id,
            notes=f'Оценка поставлена {"руководителем" if current_user.role == "manager" else "HR специалистом"}'
        )
        db.session.add(history)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Оценка сохранена',
            'assessment': {
                'skill_id': skill_id,
                'skill_name': skill.name,
                'manager_score': score_int
            }
        })
    except Exception as e:
        db.session.rollback()
        print(f"❌ Ошибка при сохранении оценки: {str(e)}")  # Для отладки
        return jsonify({
            'success': False,
            'message': f'Ошибка при сохранении: {str(e)}'
        }), 500

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
