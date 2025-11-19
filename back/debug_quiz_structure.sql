-- Script para debuggear la estructura del quiz
USE academia;

-- Verificar el quiz que estás intentando ver (ID 5 según los logs)
SELECT 
    id,
    titulo,
    descripcion,
    JSON_PRETTY(preguntas) as preguntas_formateadas,
    created_at
FROM quiz 
WHERE id = 5;

-- Verificar si el quiz tiene asignación
SELECT 
    qa.*,
    q.titulo
FROM quiz_asignacion qa
JOIN quiz q ON qa.quiz_id = q.id
WHERE qa.quiz_id = 5;

-- Verificar permisos del estudiante 'sebastian' para este quiz
SELECT * FROM estudiante_quiz_permiso 
WHERE estudiante_username = 'sebastian' AND quiz_id = 5;

-- Verificar si el estudiante tiene acceso a la unidad
SELECT 
    eu.*,
    q.unidad_id as quiz_unidad_id
FROM quiz q
LEFT JOIN estudiante_unidad eu ON q.unidad_id = eu.unidad_id
WHERE q.id = 5 AND eu.estudiante_id = (
    SELECT identificador FROM estudiante WHERE username = 'sebastian'
);
