from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from .. import db
from ..models import Skill

api = Blueprint('api', __name__, url_prefix='/api')

@api.route('/dashboard/stats')
def dashboard_stats():
    return jsonify({"users": 10, "skills": 5})

@api.route('/assess-skill', methods=['POST'])
def assess_skill():
    data = request.json
    return jsonify({"success": True, "data": data})

@api.route('/skills', methods=['GET'])
@login_required
def get_skills():
    """Получение всех навыков"""
    skills = Skill.query.all()
    return jsonify([{
        "id": s.id,
        "name": s.name,
        "category": s.category,
        "description": s.description
    } for s in skills])

@api.route('/skills', methods=['POST'])
@login_required
def create_skill():
    """Создание нового навыка"""
    if current_user.role not in ['hr', 'admin']:
        return jsonify({"success": False, "message": "Доступ запрещен"}), 403
    
    data = request.json
    if not data or 'name' not in data or 'category' not in data:
        return jsonify({"success": False, "message": "Не указаны название и категория"}), 400
    
    #проверка существующего навыка
    existing = Skill.query.filter_by(
        name=data['name'].strip(),
        category=data['category'].strip()
    ).first()
    
    if existing:
        return jsonify({"success": False, "message": "Навык уже существует"}), 409
    
    skill = Skill(
        name=data['name'].strip(),
        category=data['category'].strip(),
        description=data.get('description', '').strip()
    )
    
    try:
        db.session.add(skill)
        db.session.commit()
        return jsonify({
            "success": True,
            "message": "Навык создан",
            "skill": {
                "id": skill.id,
                "name": skill.name,
                "category": skill.category,
                "description": skill.description
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Ошибка: {str(e)}"}), 500

@api.route('/skills/<int:skill_id>', methods=['PUT'])
@login_required
def update_skill(skill_id):
    """Обновление навыка"""
    if current_user.role not in ['hr', 'admin']:
        return jsonify({"success": False, "message": "Доступ запрещен"}), 403
    
    skill = Skill.query.get(skill_id)
    if not skill:
        return jsonify({"success": False, "message": "Навык не найден"}), 404
    
    data = request.json
    if 'name' in data:
        skill.name = data['name'].strip()
    if 'category' in data:
        skill.category = data['category'].strip()
    if 'description' in data:
        skill.description = data['description'].strip()
    
    try:
        db.session.commit()
        return jsonify({
            "success": True,
            "message": "Навык обновлен",
            "skill": {
                "id": skill.id,
                "name": skill.name,
                "category": skill.category,
                "description": skill.description
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Ошибка: {str(e)}"}), 500

@api.route('/skills/<int:skill_id>', methods=['DELETE'])
@login_required
def delete_skill(skill_id):
    """Удаление навыка"""
    if current_user.role not in ['hr', 'admin']:
        return jsonify({"success": False, "message": "Доступ запрещен"}), 403
    
    skill = Skill.query.get(skill_id)
    if not skill:
        return jsonify({"success": False, "message": "Навык не найден"}), 404
    
    #проверка на наличие оценок
    if skill.assessments:
        return jsonify({
            "success": False, 
            "message": "Невозможно удалить навык, так как по нему есть оценки"
        }), 409
    
    try:
        db.session.delete(skill)
        db.session.commit()
        return jsonify({"success": True, "message": "Навык удален"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Ошибка: {str(e)}"}), 500

@api.route('/skills/search')
def search_skills():
    query = request.args.get('q', '')
    return jsonify([{"id":1,"name":"Python"} if "Python".lower().startswith(query.lower()) else {}])

@api.route('/hr/stats')
def hr_stats():
    return jsonify({"teams": 2, "members": 10})
