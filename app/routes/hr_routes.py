from flask import Blueprint, render_template, jsonify, request
from flask_login import login_required, current_user
from ..models import User, Skill, SkillAssessment, Department
from .. import db
from sqlalchemy import func, and_

bp = Blueprint('hr', __name__)

@bp.route('/analytics')
@login_required
def hr_analytics():
    """Главная страница HR аналитики"""
    #права доступа
    if current_user.role not in ['hr', 'admin']:
        return jsonify({
            'success': False, 
            'message': 'Доступ запрещен. Только HR и администраторы могут просматривать эту страницу.'
        }), 403
    
    try:
        # 1.кол-во юзеров
        total_users = User.query.count()
        
        # 2.средняя оценка
        avg_score_query = db.session.query(
            func.coalesce(
                func.avg(SkillAssessment.manager_score),
                func.avg(SkillAssessment.self_score)
            )
        ).filter(
            SkillAssessment.self_score.isnot(None)
        ).first()
        
        avg_score = 0
        if avg_score_query and avg_score_query[0]:
            avg_score = float(avg_score_query[0])
        
        # 3.общее кол-во навыков
        total_skills = Skill.query.count()
        
        # 4.клол-во оценненых навыков
        assessed_skills = SkillAssessment.query.filter(
            SkillAssessment.self_score.isnot(None)
        ).count()
        
        stats = {
            'total_users': total_users,
            'avg_score': round(avg_score, 1),
            'total_skills': total_skills,
            'assessed_skills': assessed_skills
        }
        
        roles_query = db.session.query(
            User.role,
            func.count(User.id).label('count')
        ).group_by(User.role).all()
        
        roles_stats = []
        for role, count in roles_query:
            roles_stats.append({
                'role': role,
                'count': count
            })
        
        #все отделы с количеством сотрудников и средней оценкой
        dept_query = db.session.query(
            Department.name.label('department_name'),
            Department.id.label('department_id'),
            func.count(User.id).label('user_count'),
            func.coalesce(
                func.avg(SkillAssessment.manager_score),
                func.avg(SkillAssessment.self_score)
            ).label('avg_score')
        ).join(
            User, Department.id == User.department_id, isouter=True
        ).join(
            SkillAssessment, User.id == SkillAssessment.user_id, isouter=True
        ).group_by(
            Department.id, Department.name
        ).order_by(Department.name).all()
        
        departments_stats = []
        for dept in dept_query:
            avg_score_dept = 0
            if dept.avg_score:
                avg_score_dept = float(dept.avg_score)
            
            departments_stats.append({
                'department': dept.department_name or 'Без отдела',
                'count': dept.user_count or 0,
                'avg_score': round(avg_score_dept, 1)
            })
        
        if not departments_stats:
            departments_stats.append({
                'department': 'Без отдела',
                'count': total_users,
                'avg_score': round(avg_score, 1)
            })

        return render_template(
            'hr_analytics.html',
            stats=stats,
            roles_stats=roles_stats,
            departments_stats=departments_stats
        )
        
    except Exception as e:
        print(f"❌ Ошибка в hr_analytics: {str(e)}")
        #возвращаем шаблон с пустыми данными
        return render_template(
            'hr_analytics.html',
            stats={
                'total_users': 0,
                'avg_score': 0,
                'total_skills': 0,
                'assessed_skills': 0
            },
            roles_stats=[],
            departments_stats=[]
        )

@bp.route('/api/hr/stats')
@login_required
def get_hr_stats():
    """API для получения статистики (используется в AJAX запросах)"""
    if current_user.role not in ['hr', 'admin']:
        return jsonify({
            'success': False, 
            'message': 'Доступ запрещен'
        }), 403
    
    try:
        total_users = User.query.count()
        
        avg_score_query = db.session.query(
            func.coalesce(
                func.avg(SkillAssessment.manager_score),
                func.avg(SkillAssessment.self_score)
            )
        ).filter(
            SkillAssessment.self_score.isnot(None)
        ).first()
        
        avg_score = 0
        if avg_score_query and avg_score_query[0]:
            avg_score = float(avg_score_query[0])
        
        total_skills = Skill.query.count()
        assessed_skills = SkillAssessment.query.filter(
            SkillAssessment.self_score.isnot(None)
        ).count()
        
        roles_query = db.session.query(
            User.role,
            func.count(User.id).label('count')
        ).group_by(User.role).all()
        
        roles_data = []
        for role, count in roles_query:
            roles_data.append({
                'role': role,
                'count': count
            })
        
        dept_query = db.session.query(
            Department.name.label('department_name'),
            func.count(User.id).label('user_count'),
            func.coalesce(
                func.avg(SkillAssessment.manager_score),
                func.avg(SkillAssessment.self_score)
            ).label('avg_score')
        ).join(
            User, Department.id == User.department_id, isouter=True
        ).join(
            SkillAssessment, User.id == SkillAssessment.user_id, isouter=True
        ).group_by(
            Department.id, Department.name
        ).order_by(Department.name).all()
        
        departments_data = []
        for dept in dept_query:
            avg_score_dept = 0
            if dept.avg_score:
                avg_score_dept = float(dept.avg_score)
            
            departments_data.append({
                'department': dept.department_name or 'Без отдела',
                'count': dept.user_count or 0,
                'avg_score': round(avg_score_dept, 1)
            })
        
        return jsonify({
            'success': True,
            'stats': {
                'total_users': total_users,
                'avg_score': round(avg_score, 1),
                'total_skills': total_skills,
                'assessed_skills': assessed_skills
            },
            'roles': roles_data,
            'departments': departments_data
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Ошибка при получении статистики: {str(e)}'
        }), 500

@bp.route('/api/hr/export')
@login_required
def export_hr_data():
    """Экспорт данных HR в CSV"""
    if current_user.role not in ['hr', 'admin']:
        return jsonify({
            'success': False, 
            'message': 'Доступ запрещен'
        }), 403
    
    try:
        #можно добавить логику экспорта в CSV пока просто возвращаем сообщение
        return jsonify({
            'success': True,
            'message': 'Экспорт данных будет доступен в следующей версии'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Ошибка при экспорте: {str(e)}'
        }), 500