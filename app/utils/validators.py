"""
Модуль валидаторов для проверки данных.
Содержит функции для валидации паролей, email, телефонов и т.д.
"""

import re
from typing import Tuple, Optional
from datetime import datetime

def validate_password_strength(password: str) -> Tuple[bool, str]:
    """
    Проверяет сложность пароля.
    
    Пароль должен содержать:
    - Минимум 8 символов
    - Хотя бы одну заглавную букву
    - Хотя бы одну строчную букву
    - Хотя бы одну цифру
    
    Args:
        password (str): Пароль для проверки
        
    Returns:
        Tuple[bool, str]: (валиден, сообщение об ошибке)
    """
    if len(password) < 8:
        return False, "Пароль должен содержать минимум 8 символов"
    
    if not re.search(r'[A-ZА-Я]', password):
        return False, "Пароль должен содержать хотя бы одну заглавную букву"
    
    if not re.search(r'[a-zа-я]', password):
        return False, "Пароль должен содержать хотя бы одну строчную букву"
    
    if not re.search(r'\d', password):
        return False, "Пароль должен содержать хотя бы одну цифру"
    
    #проверка на спец символы
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        #предупреждение, а не ошибка
        return True, "Рекомендуется добавить специальные символы для усиления пароля"
    
    return True, "Пароль соответствует требованиям безопасности"

def validate_email_format(email: str) -> Tuple[bool, str]:
    """
    Проверяет формат email адреса.
    
    Args:
        email (str): Email для проверки
        
    Returns:
        Tuple[bool, str]: (валиден, сообщение об ошибке)
    """
    if not email:
        return False, "Email не может быть пустым"
    
    #паттерн для проверки email
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    
    if not re.match(pattern, email):
        return False, "Некорректный формат email"
    
    return True, "Email корректный"

def validate_phone_number(phone: str) -> Tuple[bool, str]:
    """
    Проверяет формат номера телефона.
    Поддерживает российские номера в различных форматах.
    
    Args:
        phone (str): Номер телефона для проверки
        
    Returns:
        Tuple[bool, str]: (валиден, сообщение об ошибке)
    """
    if not phone:
        return True, ""  #телефон не обязателен
    
    #убираем все нецифровые символы
    digits = re.sub(r'\D', '', phone)
    
    #проверяем российские номера
    if len(digits) == 11 and digits.startswith('7'):
        return True, "Номер телефона корректный"
    elif len(digits) == 10 and digits.startswith('9'):
        return True, "Номер телефона корректный"
    elif len(digits) == 12 and digits.startswith('375'):  # Беларусь
        return True, "Номер телефона корректный"
    elif len(digits) == 12 and digits.startswith('380'):  # Украина
        return True, "Номер телефона корректный"
    
    return False, "Некорректный формат номера телефона. Используйте российский формат: +7 XXX XXX-XX-XX"

def validate_score_range(score: int, score_type: str = "self") -> Tuple[bool, str]:
    """
    Проверяет, что оценка находится в допустимом диапазоне (1-5).
    
    Args:
        score (int): Оценка для проверки
        score_type (str): Тип оценки ("self" или "manager")
        
    Returns:
        Tuple[bool, str]: (валиден, сообщение об ошибке)
    """
    if score is None:
        return True, ""  #оценка может не указана
    
    try:
        score_int = int(score)
        if 1 <= score_int <= 5:
            return True, "Оценка корректна"
        else:
            return False, "Оценка должна быть в диапазоне от 1 до 5"
    except (ValueError, TypeError):
        return False, "Оценка должна быть числом"

def validate_role(role: str) -> Tuple[bool, str]:
    """
    Проверяет, что роль является допустимой.
    
    Args:
        role (str): Роль для проверки
        
    Returns:
        Tuple[bool, str]: (валиден, сообщение об ошибке)
    """
    valid_roles = ['employee', 'manager', 'hr', 'admin']
    
    if role in valid_roles:
        return True, "Роль корректна"
    else:
        return False, f"Недопустимая роль. Допустимые значения: {', '.join(valid_roles)}"

def validate_date_format(date_str: str, date_format: str = "%Y-%m-%d") -> Tuple[bool, str, Optional[datetime]]:
    """
    Проверяет формат даты.
    
    Args:
        date_str (str): Строка с датой
        date_format (str): Ожидаемый формат даты
        
    Returns:
        Tuple[bool, str, Optional[datetime]]: (валиден, сообщение об ошибке, объект datetime)
    """
    if not date_str:
        return True, "", None
    
    try:
        date_obj = datetime.strptime(date_str, date_format)
        return True, "Дата корректна", date_obj
    except ValueError:
        return False, f"Некорректный формат даты. Используйте формат: {date_format}", None

def validate_login_format(login: str) -> Tuple[bool, str]:
    """
    Проверяет формат логина.
    
    Args:
        login (str): Логин для проверки
        
    Returns:
        Tuple[bool, str]: (валиден, сообщение об ошибке)
    """
    if not login:
        return False, "Логин не может быть пустым"
    
    if len(login) < 3:
        return False, "Логин должен содержать минимум 3 символа"
    
    if len(login) > 50:
        return False, "Логин не может быть длиннее 50 символов"
    
    #проверяем допустимые символы (латиница, кириллица, цифры, дефис, подчеркивание)
    if not re.match(r'^[a-zA-Zа-яА-Я0-9_-]+$', login):
        return False, "Логин может содержать только буквы, цифры, дефисы и подчеркивания"
    
    #логин не должен начинаться с цифры
    if login[0].isdigit():
        return False, "Логин не должен начинаться с цифры"
    
    return True, "Логин корректный"

def validate_full_name(full_name: str) -> Tuple[bool, str]:
    """
    Проверяет формат полного имени.
    
    Args:
        full_name (str): Полное имя для проверки
        
    Returns:
        Tuple[bool, str]: (валиден, сообщение об ошибке)
    """
    if not full_name:
        return False, "Полное имя не может быть пустым"
    
    if len(full_name) < 2:
        return False, "Полное имя должно содержать минимум 2 символа"
    
    if len(full_name) > 150:
        return False, "Полное имя не может быть длиннее 150 символов"
    
    #имя содержит хотя бы одну букву
    if not any(c.isalpha() for c in full_name):
        return False, "Полное имя должно содержать хотя бы одну букву"
    
    #имя не должно состоять только из цифр и спец символов
    if re.match(r'^[0-9\W_]+$', full_name):
        return False, "Полное имя должно содержать буквы"
    
    return True, "Полное имя корректное"

def validate_department_name(name: str) -> Tuple[bool, str]:
    """
    Проверяет название отдела.
    
    Args:
        name (str): Название отдела
        
    Returns:
        Tuple[bool, str]: (валиден, сообщение об ошибке)
    """
    if not name:
        return False, "Название отдела не может быть пустым"
    
    if len(name) < 2:
        return False, "Название отдела должно содержать минимум 2 символа"
    
    if len(name) > 100:
        return False, "Название отдела не может быть длиннее 100 символов"
    
    return True, "Название отдела корректное"

def validate_skill_data(name: str, category: str, description: str = "") -> Tuple[bool, str]:
    """
    Проверяет данные навыка.
    
    Args:
        name (str): Название навыка
        category (str): Категория навыка
        description (str): Описание навыка
        
    Returns:
        Tuple[bool, str]: (валиден, сообщение об ошибке)
    """
    if not name:
        return False, "Название навыка не может быть пустым"
    
    if len(name) < 2:
        return False, "Название навыка должно содержать минимум 2 символа"
    
    if len(name) > 100:
        return False, "Название навыка не может быть длиннее 100 символов"
    
    if not category:
        return False, "Категория навыка не может быть пустой"
    
    if len(category) < 2:
        return False, "Категория навыка должна содержать минимум 2 символа"
    
    if len(category) > 100:
        return False, "Категория навыка не может быть длиннее 100 символов"
    
    if description and len(description) > 500:
        return False, "Описание навыка не может быть длиннее 500 символов"
    
    return True, "Данные навыка корректны"

#функция для комплексной валидации данных всех юзеров
def validate_user_data(login: str, password: str, full_name: str, 
                      role: str, email: str = None, phone: str = None) -> Tuple[bool, dict]:
    """
    Комплексная валидация данных пользователя.
    
    Args:
        login (str): Логин пользователя
        password (str): Пароль пользователя
        full_name (str): Полное имя пользователя
        role (str): Роль пользователя
        email (str, optional): Email пользователя
        phone (str, optional): Телефон пользователя
        
    Returns:
        Tuple[bool, dict]: (валидны ли все данные, словарь с ошибками)
    """
    errors = {}
    
    #валидация логина
    login_valid, login_msg = validate_login_format(login)
    if not login_valid:
        errors['login'] = login_msg
    
    #валидация пароля
    password_valid, password_msg = validate_password_strength(password)
    if not password_valid:
        errors['password'] = password_msg
    
    #валидация полного имени
    name_valid, name_msg = validate_full_name(full_name)
    if not name_valid:
        errors['full_name'] = name_msg
    
    #валидация ролей
    role_valid, role_msg = validate_role(role)
    if not role_valid:
        errors['role'] = role_msg
    
    #валидация email (если указан)
    if email:
        email_valid, email_msg = validate_email_format(email)
        if not email_valid:
            errors['email'] = email_msg
    
    #валидация телефона (если указан)
    if phone:
        phone_valid, phone_msg = validate_phone_number(phone)
        if not phone_valid:
            errors['phone'] = phone_msg
    
    return len(errors) == 0, errors