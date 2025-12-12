from flask import Blueprint, jsonify, request

api = Blueprint('api', __name__, url_prefix='/api')

@api.route('/dashboard/stats')
def dashboard_stats():
    return jsonify({"users": 10, "skills": 5})

@api.route('/assess-skill', methods=['POST'])
def assess_skill():
    data = request.json
    return jsonify({"success": True, "data": data})

@api.route('/skills')
def get_skills():
    return jsonify([{"id":1,"name":"Python"},{"id":2,"name":"SQL"}])

@api.route('/skills/search')
def search_skills():
    query = request.args.get('q', '')
    return jsonify([{"id":1,"name":"Python"} if "Python".lower().startswith(query.lower()) else {}])

@api.route('/hr/stats')
def hr_stats():
    return jsonify({"teams": 2, "members": 10})
