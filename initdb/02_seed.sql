INSERT INTO departments (name) VALUES
('Backend'),
('Frontend'),
('HR'),
('DevOps');

INSERT INTO users (login, password_hash, role, full_name, department_id)
VALUES
('Kulikov', 'scrypt:32768:8:1$FIYq3w0idFEMMhm7$a87a886178f3fa07da94285a8ae878dc35831623dcd7947102e97ccdb10171620d37b1f17be7f59b1963db272cd6c07a32160d04a5d3d87ba2b6d6c8334e5b89', 'employee', 'Куликов Кирилл', 1),
('Hafizov', 'scrypt:32768:8:1$FIYq3w0idFEMMhm7$a87a886178f3fa07da94285a8ae878dc35831623dcd7947102e97ccdb10171620d37b1f17be7f59b1963db272cd6c07a32160d04a5d3d87ba2b6d6c8334e5b89', 'employee', 'Хафизов Айгиз', 2),
('Vorotnikov', 'scrypt:32768:8:1$FIYq3w0idFEMMhm7$a87a886178f3fa07da94285a8ae878dc35831623dcd7947102e97ccdb10171620d37b1f17be7f59b1963db272cd6c07a32160d04a5d3d87ba2b6d6c8334e5b89', 'manager',  'Воротников Никита', 1),
('Kuchmasova', 'scrypt:32768:8:1$FIYq3w0idFEMMhm7$a87a886178f3fa07da94285a8ae878dc35831623dcd7947102e97ccdb10171620d37b1f17be7f59b1963db272cd6c07a32160d04a5d3d87ba2b6d6c8334e5b89', 'hr', 'Кучмасова Софья', 3);

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
