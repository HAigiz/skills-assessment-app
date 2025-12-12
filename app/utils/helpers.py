import json
from datetime import datetime, date
from decimal import Decimal
from flask import jsonify

class JSONEncoder(json.JSONEncoder):
    """Кастомный JSON encoder для обработки специальных типов"""
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, date):
            return obj.isoformat()
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)

def make_response(success=True, data=None, message=None, status_code=200):
    """Стандартизированный формат ответа API"""
    response = {
        'success': success,
        'timestamp': datetime.now().isoformat()
    }
    
    if data is not None:
        response['data'] = data
    
    if message:
        response['message'] = message
    
    return jsonify(response), status_code

def validate_required_fields(data, required_fields):
    """Проверка обязательных полей"""
    missing_fields = []
    for field in required_fields:
        if field not in data or data[field] is None or str(data[field]).strip() == '':
            missing_fields.append(field)
    
    if missing_fields:
        return False, f"Отсутствуют обязательные поля: {', '.join(missing_fields)}"
    
    return True, None

def format_score(score):
    """Форматирование оценки"""
    if score is None:
        return None
    
    try:
        score_float = float(score)
        if 1 <= score_float <= 5:
            return round(score_float, 1)
    except (ValueError, TypeError):
        pass
    
    return None

def calculate_average_scores(scores):
    """Расчет средней оценки из списка"""
    if not scores:
        return None
    
    valid_scores = [s for s in scores if s is not None and 1 <= s <= 5]
    if not valid_scores:
        return None
    
    return sum(valid_scores) / len(valid_scores)