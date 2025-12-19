# app/email_service.py
from flask_mail import Message
from flask import current_app
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

import smtplib
smtplib.SMTP.debuglevel = 1  # Включите отладку SMTP

def send_contact_email(name, email, phone, subject, message_text):
    """Отправляет email через Flask-Mail"""
    try:
        from flask_mail import Mail
        from flask import current_app
        
        mail = current_app.extensions.get('mail')
        
        if not mail:
            logger.error("Mail extension not found")
            return False
        
        # Получаем email получателя и отправителя из конфига
        sender_email = current_app.config.get('MAIL_USERNAME', 'khafizov.aygiz.i@bk.ru')
        recipient_email = current_app.config.get('MAIL_USERNAME', 'khafizov.aygiz.i@bk.ru')
        
        if not sender_email:
            logger.error("Не указан отправитель email")
            return False
        
        # Тема письма
        subject_translations = {
            'general': 'Общий вопрос',
            'support': 'Техническая поддержка',
            'cooperation': 'Сотрудничество',
            'feedback': 'Обратная связь'
        }
        subject_text = subject_translations.get(subject, 'Общий вопрос')
        
        # HTML содержимое письма
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Новое сообщение с SkillExam</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 5px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
                .content {{ background: white; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }}
                .info-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
                .info-table td {{ padding: 8px; border-bottom: 1px solid #eee; }}
                .info-table tr:last-child td {{ border-bottom: none; }}
                .message-box {{ background: #f5f5f5; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📨 Новое сообщение с сайта SkillExam</h1>
                </div>
                <div class="content">
                    <h3>Информация об отправителе:</h3>
                    <table class="info-table">
                        <tr>
                            <td><strong>👤 Имя:</strong></td>
                            <td>{name}</td>
                        </tr>
                        <tr>
                            <td><strong>📧 Email:</strong></td>
                            <td><a href="mailto:{email}">{email}</a></td>
                        </tr>
                        <tr>
                            <td><strong>📞 Телефон:</strong></td>
                            <td>{phone if phone else 'Не указан'}</td>
                        </tr>
                        <tr>
                            <td><strong>🏷️ Тема:</strong></td>
                            <td>{subject_text}</td>
                        </tr>
                        <tr>
                            <td><strong>🕐 Дата:</strong></td>
                            <td>{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</td>
                        </tr>
                    </table>
                    
                    <h3>💬 Сообщение:</h3>
                    <div class="message-box">
                        {message_text}
                    </div>
                    
                    <hr>
                    <p style="color: #666; font-size: 12px;">
                        Это сообщение отправлено автоматически с сайта SkillExam.<br>
                        Для ответа используйте email отправителя: <a href="mailto:{email}">{email}</a>
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Текстовое содержимое
        text_content = f"""
        НОВОЕ СООБЩЕНИЕ С САЙТА SKILLEXAM
        
        От: {name}
        Email: {email}
        Телефон: {phone if phone else 'Не указан'}
        Тема: {subject_text}
        Дата: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
        
        Сообщение:
        {message_text}
        
        ---
        Это сообщение отправлено автоматически с сайта SkillExam.
        Для ответа используйте email отправителя: {email}
        """
        
        print(f"DEBUG: Sender email (FROM): {sender_email}")
        print(f"DEBUG: Recipient email (TO): {recipient_email}")
        print(f"DEBUG: Reply to email: {email}")
        
        # Ключевое исправление: используем sender_email как отправителя
        # А в reply_to указываем email пользователя
        msg = Message(
            subject=f'[SkillExam] {subject_text} от {name}',
            sender=sender_email,  # Используем аутентифицированный email
            recipients=[recipient_email],  # Отправляем самому себе
            html=html_content,
            body=text_content,
            reply_to=email  # Для ответа указываем email пользователя
        )
        
        # Отправляем
        mail.send(msg)
        
        logger.info(f"Email успешно отправлен на {recipient_email}")
        return True
        
    except Exception as e:
        logger.error(f"Ошибка отправки email: {type(e).__name__}: {str(e)}")
        return False