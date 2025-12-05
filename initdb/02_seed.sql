INSERT INTO departments (name) VALUES
('back'),
('front'),
('HR'),
('DevOps');

INSERT INTO users (login, password_hash, role, full_name, department_id)
VALUES
('Kulikov', 'hash1', 'employee', 'Куликов Кирилл', 1),
('Hafizov', 'hash2', 'employee', 'Хафизов Айгиз', 2),
('Vorotnikov', 'hash3', 'manager',  'Воротников Никита', 1),
('Kuchmasova', 'hash4', 'hr', 'Кучмасова Софья', 3);

UPDATE departments SET manager_id = 3 WHERE id = 1;

INSERT INTO skills (name, category, description)
VALUES
('Python', 'Programming Languages', 'Backend development'),
('FastAPI', 'Frameworks', 'Python REST framework'),
('SQL', 'Databases', 'Structured Query Language'),
('HTML', 'Frontend', 'Markup language'),
('CSS', 'Frontend', 'Styles'),
('Communication', 'Soft Skills', 'Interaction with team');

INSERT INTO skill_assessments (user_id, skill_id, self_score, manager_score)
VALUES
(1, 1, 4, 4),
(1, 2, 3, 4),
(1, 3, 5, 5),
(2, 4, 4, NULL),
(2, 5, 3, NULL),
(2, 6, 5, NULL);
