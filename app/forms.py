from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField, SelectField, HiddenField, TextAreaField, IntegerField
from wtforms.validators import DataRequired, Length, ValidationError, NumberRange, Optional

class LoginForm(FlaskForm):
    login = StringField('Логин', validators=[DataRequired(), Length(min=3, max=50)])
    password = PasswordField('Пароль', validators=[DataRequired(), Length(min=8)])
    submit = SubmitField('Войти')

class RegistrationForm(FlaskForm):
    full_name = StringField('Полное имя', validators=[DataRequired(), Length(min=2, max=150)])
    login = StringField('Логин', validators=[DataRequired(), Length(min=3, max=50)])
    password = PasswordField('Пароль', validators=[DataRequired(), Length(min=8)])
    role = SelectField('Роль', 
                       choices=[
                           ('', 'Выберите роль'),
                           ('employee', 'Сотрудник'),
                           ('manager', 'Руководитель'),
                           ('hr', 'HR')
                       ],
                        validators=[DataRequired(message="Пожалуйста, выберите роль")])
    
    department_id = SelectField('Отдел', 
                                choices=[],
                                validators=[DataRequired(message="Пожалуйста, выберите отдел")])
    
    submit = SubmitField('Зарегистрировать')

    def __init__(self, current_user=None, department_name=None, *args, **kwargs):
        super(RegistrationForm, self).__init__(*args, **kwargs)
        try:
            from .models import Department
            departments = Department.query.all()
            all_choices = [('', 'Выберите отдел')] + [(str(dept.id), dept.name) for dept in departments]
        except Exception:
            all_choices = [('', 'Ошибка загрузки отделов')]

        if current_user and current_user.role == 'manager':
            manager_dept_id = str(current_user.department_id)
            
            department = Department.query.get(current_user.department_id)
            department_name = department.name if department else 'Неизвестный отдел'
            
            self.department_id.choices = [(manager_dept_id, department_name)]
            
            self.department_id.default = manager_dept_id
            
            def validate_department_id(form, field):
                if field.data != str(current_user.department_id):
                    raise ValidationError('Руководитель может регистрировать пользователей только в свой отдел.')
            
            self.department_id.validators.append(validate_department_id)
            
        else:
            self.department_id.choices = all_choices

class SkillAssessmentForm(FlaskForm):
    skill_id = HiddenField('ID навыка', validators=[DataRequired()])
    self_score = IntegerField('Самооценка', 
                             validators=[Optional(), 
                                        NumberRange(min=1, max=5, message='Оценка должна быть от 1 до 5')])
    manager_score = IntegerField('Оценка руководителя',
                                validators=[Optional(),
                                           NumberRange(min=1, max=5, message='Оценка должна быть от 1 до 5')])
    notes = TextAreaField('Комментарий', validators=[Length(max=500)])
    submit = SubmitField('Сохранить оценку')

class SkillForm(FlaskForm):
    name = StringField('Название навыка', validators=[DataRequired(), Length(min=2, max=100)])
    category = StringField('Категория', validators=[DataRequired(), Length(min=2, max=100)])
    description = TextAreaField('Описание', validators=[Length(max=500)])
    submit = SubmitField('Сохранить навык')

class SearchForm(FlaskForm):
    skill = StringField('Навык', validators=[DataRequired(), Length(min=2, max=100)])
    min_score = SelectField('Минимальный уровень',
                           choices=[
                               (1, '1 - Начальный'),
                               (2, '2 - Базовый'),
                               (3, '3 - Средний'),
                               (4, '4 - Продвинутый'),
                               (5, '5 - Эксперт')
                           ],
                           default=3,
                           coerce=int)
    submit = SubmitField('Найти')

class ComparisonForm(FlaskForm):
    user1_id = SelectField('Первый сотрудник', 
                          choices=[('', 'Выберите сотрудника')],
                          validators=[DataRequired()])
    user2_id = SelectField('Второй сотрудник',
                          choices=[('', 'Выберите сотрудника')],
                          validators=[DataRequired()])
    submit = SubmitField('Сравнить')