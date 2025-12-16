from flask import Blueprint, render_template, jsonify, request
from flask_login import login_required, current_user
from ..models import *
from .. import db
from sqlalchemy import func, and_

bp = Blueprint('hr', __name__)

@bp.route('/analytics')
@login_required
def hr_analytics():
    """Главная страница HR аналитики"""
    if current_user.role not in ['hr', 'admin']:
        return jsonify({
            'success': False, 
            'message': 'Доступ запрещен. Только HR и администраторы могут просматривать эту страницу.'
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
    

@bp.route("/user-management")
@login_required
def user_managment():
    """Страница управления пользователями"""
    if current_user.role not in ['hr', 'admin']:
        return jsonify({
            'success': False, 
            'message': 'Доступ запрещен. Только HR и администраторы могут просматривать эту страницу.'
        }), 403
    
    try:
        # Получаем все навыки сгруппированные по категориям для datalist
        categories = {}
        all_skills = Skill.query.order_by(Skill.category, Skill.name).all()
        
        for skill in all_skills:
            category = skill.category
            if category not in categories:
                categories[category] = []
            categories[category].append(skill)
        
        return render_template('user_managment.html', categories=categories)
        
    except Exception as e:
        print(f"❌ Ошибка в user_managment: {str(e)}")
        return render_template('user_managment.html', categories={})


@bp.route('/search-by-skills')
@login_required
def search_skills():
    """Поиск сотрудников по навыку"""
    if current_user.role not in ['hr', 'admin', 'manager']:
        return jsonify({'success': False, 'message': 'Доступ запрещен'}), 403
    
    skill_name = request.args.get('skill', '')
    min_score = request.args.get('min_score', 1, type=int)
    
    if not skill_name:
        return jsonify({'success': False, 'message': 'Не указан навык для поиска'}), 400
    
    # Поиск навыка
    skill = Skill.query.filter(Skill.name.ilike(f'%{skill_name}%')).first()
    if not skill:
        return jsonify({'success': False, 'message': 'Навык не найден'}), 404
    
    # Поиск оценок по этому навыку
    assessments = SkillAssessment.query.filter_by(skill_id=skill.id).all()
    
    # Фильтр мин балла
    filtered_assessments = []
    for assessment in assessments:
        final_score = assessment.manager_score or assessment.self_score
        if final_score and final_score >= min_score:
            filtered_assessments.append(assessment)
    
    # Данные всех пользователей
    users_data = []
    for assessment in filtered_assessments:
        user = User.query.get(assessment.user_id)
        if user:
            # Проверка доступа для manager
            if current_user.role == 'manager':
                if current_user.department_id != user.department_id:
                    continue  # Пропускаем сотрудников из других отделов
            
            users_data.append({
                'id': user.id,
                'full_name': user.full_name,
                'login': user.login,
                'role': user.role,
                'position': user.position or '',
                'department': user.department.name if user.department else None,
                'department_id': user.department_id,
                'self_score': assessment.self_score,
                'manager_score': assessment.manager_score,
                'final_score': assessment.manager_score or assessment.self_score,
                'email': user.email,
                'status': user.status
            })
    
    # Сортируем по убыванию финальной оценки
    users_data.sort(key=lambda x: x['final_score'] or 0, reverse=True)
    
    return jsonify({
        'success': True,
        'skill': {
            'id': skill.id,
            'name': skill.name,
            'category': skill.category,
            'description': skill.description
        },
        'minScore': min_score,
        'users': users_data,
        'total_found': len(users_data)
    })


@bp.route('/compare-users')
@login_required
def compare_users():
    """Сравнение навыков двух пользователей"""
    user1_id = request.args.get('user1', type=int)
    user2_id = request.args.get('user2', type=int)
    
    if not user1_id or not user2_id:
        return jsonify({'success': False, 'message': 'Не указаны ID пользователей'}), 400
    
    # Проверка доступа
    if current_user.role == 'employee' and current_user.id not in [user1_id, user2_id]:
        return jsonify({'success': False, 'message': 'Доступ запрещен'}), 403
    
    user1 = User.query.get_or_404(user1_id)
    user2 = User.query.get_or_404(user2_id)
    
    # Проверка доступа для manager
    if current_user.role == 'manager':
        if (current_user.department_id != user1.department_id or 
            current_user.department_id != user2.department_id):
            return jsonify({'success': False, 'message': 'Доступ запрещен'}), 403
    
    # Проверка доступа для hr/admin
    if current_user.role not in ['hr', 'admin'] and current_user.role != 'manager':
        return jsonify({'success': False, 'message': 'Доступ запрещен'}), 403
    
    # Навыки
    skills = Skill.query.all()
    
    comparison_data = []
    for skill in skills:
        # Оценки первого пользователя
        assessment1 = SkillAssessment.query.filter_by(
            user_id=user1_id,
            skill_id=skill.id
        ).first()
        
        # Оценки второго пользователя
        assessment2 = SkillAssessment.query.filter_by(
            user_id=user2_id,
            skill_id=skill.id
        ).first()
        
        user1_score = None
        user2_score = None
        difference = None
        
        if assessment1:
            user1_score = assessment1.manager_score or assessment1.self_score
        
        if assessment2:
            user2_score = assessment2.manager_score or assessment2.self_score
        
        if user1_score is not None and user2_score is not None:
            difference = user2_score - user1_score
        elif user1_score is not None:
            difference = -user1_score
        elif user2_score is not None:
            difference = user2_score
        
        comparison_data.append({
            'skill_id': skill.id,
            'skill_name': skill.name,
            'category': skill.category,
            'user1_score': user1_score,
            'user2_score': user2_score,
            'difference': difference
        })
    
    return jsonify({
        'success': True,
        'user1': {
            'id': user1.id,
            'full_name': user1.full_name,
            'role': user1.role,
            'department': user1.department.name if user1.department else None
        },
        'user2': {
            'id': user2.id,
            'full_name': user2.full_name,
            'role': user2.role,
            'department': user2.department.name if user2.department else None
        },
        'comparison': comparison_data
    })

@bp.route('/api/search-users')
@login_required
def search_users():
    """Поиск пользователей по имени или логину"""
    if current_user.role not in ['hr', 'admin']:
        return jsonify({'success': False, 'message': 'Доступ запрещен'}), 403
    
    query = request.args.get('q', '')
    if not query or len(query) < 2:
        return jsonify({'success': False, 'message': 'Введите минимум 2 символа'}), 400
    
    try:
        # Поиск по имени или логику
        users = User.query.filter(
            db.or_(
                User.full_name.ilike(f'%{query}%'),
                User.login.ilike(f'%{query}%')
            )
        ).limit(10).all()
        
        users_data = []
        for user in users:
            users_data.append({
                'id': user.id,
                'full_name': user.full_name,
                'login': user.login,
                'email': user.email,
                'role': user.role,
                'position': user.position,
                'department': user.department.name if user.department else None,
                'department_id': user.department_id,
                'status': user.status
            })
        
        return jsonify({
            'success': True,
            'users': users_data,
            'total': len(users_data)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/api/departments')
@login_required
def get_departments():
    """Получение списка отделов"""
    if current_user.role not in ['hr', 'admin', 'manager']:
        return jsonify({'success': False, 'message': 'Доступ запрещен'}), 403
    
    try:
        departments = Department.query.order_by(Department.name).all()
        departments_data = [{'id': dept.id, 'name': dept.name} for dept in departments]
        
        return jsonify({
            'success': True,
            'departments': departments_data
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/api/users', methods=['POST'])
@login_required
def create_user():
    """Создание нового пользователя"""
    if current_user.role not in ['hr', 'admin']:
        return jsonify({'success': False, 'message': 'Доступ запрещен'}), 403
    
    data = request.json
    
    # Валидация
    errors = {}
    if not data.get('full_name') or len(data['full_name'].strip()) < 2:
        errors['full_name'] = 'Введите полное имя (минимум 2 символа)'
    
    if not data.get('login') or len(data['login'].strip()) < 3:
        errors['login'] = 'Введите логин (минимум 3 символа)'
    
    if not data.get('role'):
        errors['role'] = 'Выберите роль'
    
    if not data.get('password') and not data.get('user_id'):
        errors['password'] = 'Введите пароль (минимум 6 символов)'
    
    if errors:
        return jsonify({'success': False, 'errors': errors}), 400
    
    try:
        # Проверка уникальности логина
        existing_user = User.query.filter_by(login=data['login'].strip()).first()
        if existing_user:
            return jsonify({'success': False, 'message': 'Пользователь с таким логином уже существует'}), 400
        
        # Создание пользователя
        user = User(
            full_name=data['full_name'].strip(),
            login=data['login'].strip(),
            role=data['role'],
            position=data.get('position', '').strip(),
            email=data.get('email', '').strip(),
            department_id=data.get('department_id') or None,
            status=data.get('status', 'active')
        )
        
        # Установка пароля
        if data.get('password'):
            user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Пользователь успешно создан',
            'user_id': user.id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Ошибка создания пользователя: {str(e)}'}), 500

@bp.route('/api/users/<int:user_id>', methods=['GET', 'PUT', 'DELETE'])
@login_required
def manage_user(user_id):
    """Управление пользователем (получение, обновление, удаление)"""
    if current_user.role not in ['hr', 'admin']:
        return jsonify({'success': False, 'message': 'Доступ запрещен'}), 403
    
    user = User.query.get_or_404(user_id)
    
    if request.method == 'GET':
        # Получение информации о пользователе
        return jsonify({
            'success': True,
            'user': {
                'id': user.id,
                'full_name': user.full_name,
                'login': user.login,
                'email': user.email,
                'role': user.role,
                'position': user.position,
                'department_id': user.department_id,
                'status': user.status,
                'created_at': user.created_at.isoformat() if user.created_at else None
            }
        })
    
    elif request.method == 'PUT':
        # Обновление пользователя
        data = request.json
        
        try:
            # Обновление полей
            if 'full_name' in data:
                user.full_name = data['full_name'].strip()
            
            if 'login' in data and data['login'] != user.login:
                # Проверка уникальности нового логина
                existing = User.query.filter_by(login=data['login'].strip()).first()
                if existing and existing.id != user.id:
                    return jsonify({'success': False, 'message': 'Пользователь с таким логином уже существует'}), 400
                user.login = data['login'].strip()
            
            if 'email' in data:
                user.email = data['email'].strip()
            
            if 'position' in data:
                user.position = data['position'].strip()
            
            if 'role' in data:
                user.role = data['role']
            
            if 'department_id' in data:
                user.department_id = data['department_id'] or None
            
            if 'status' in data:
                user.status = data['status']
            
            # Обновление пароля (если указан)
            if 'password' in data and data['password']:
                user.set_password(data['password'])
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Пользователь обновлен'
            })
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'message': f'Ошибка обновления: {str(e)}'}), 500
    
    elif request.method == 'DELETE':
        # Удаление пользователя
        try:
            # Удаляем все связанные оценки
            SkillAssessment.query.filter_by(user_id=user.id).delete()
            
            db.session.delete(user)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Пользователь удален'
            })
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'message': f'Ошибка удаления: {str(e)}'}), 500