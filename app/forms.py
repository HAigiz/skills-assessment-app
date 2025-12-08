from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField, SelectField, HiddenField
from wtforms.validators import DataRequired, Length, ValidationError

class LoginForm(FlaskForm):
    login = StringField('Логин', validators=[DataRequired(), Length(min=3, max=50)])
    password = PasswordField('Password', validators=[DataRequired(), Length(min=8)])
    submit = SubmitField('Войти')

class RegistrationForm(FlaskForm):
    full_name = StringField('Полное имя', validators=[DataRequired(), Length(min=2, max=150)])
    login = StringField('Логин', validators=[DataRequired(), Length(min=3, max=50)])
    password_hash = PasswordField('Пароль', validators=[DataRequired(), Length(min=8)])
    role = SelectField('Роль', 
                       choices=[
                           ('', ''),
                           ('manager', 'Руководитель'),
                           ('hr', 'HR'),
                           ('employee', 'Сотрудник')
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
            all_choices = [('', '')] + [(str(dept.id), dept.name) for dept in departments]
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
            # Для всех остальных ролей: заполняем SelectField полным списком
            self.department_id.choices = all_choices