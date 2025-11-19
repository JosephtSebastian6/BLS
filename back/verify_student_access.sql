-- Script para verificar acceso de estudiante a evaluaciones
USE academia;

-- Verificar estudiantes existentes
SELECT username, identificador FROM estudiante LIMIT 5;

-- Verificar unidades disponibles
SELECT id, nombre FROM unidad LIMIT 5;

-- Verificar relación estudiante-unidad (ajusta los IDs según tu base de datos)
SELECT * FROM estudiante_unidad LIMIT 5;

-- Verificar quizzes existentes
SELECT id, titulo, unidad_id FROM quiz ORDER BY created_at DESC LIMIT 5;

-- Verificar asignaciones de quiz
SELECT qa.*, q.titulo 
FROM quiz_asignacion qa 
JOIN quiz q ON qa.quiz_id = q.id 
ORDER BY qa.created_at DESC LIMIT 5;

-- Verificar permisos de quiz por estudiante
SELECT * FROM estudiante_quiz_permiso LIMIT 5;

-- Si no hay permisos, crear uno para el estudiante de prueba
-- (Descomenta y ajusta según tu estudiante)
-- INSERT INTO estudiante_quiz_permiso (estudiante_username, quiz_id, habilitado) 
-- VALUES ('tu_estudiante_username', 1, true);
