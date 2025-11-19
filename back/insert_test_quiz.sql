-- Script para insertar una evaluación de prueba
USE academia;

-- Insertar un quiz de prueba (ajusta el unidad_id según tu base de datos)
INSERT INTO quiz (unidad_id, titulo, descripcion, preguntas, created_at) VALUES 
(1, 'Evaluación de Prueba - Inglés Básico', 'Evaluación de prueba para verificar el sistema de respuestas', 
'{
  "preguntas": [
    {
      "enunciado": "¿Cuál es la traducción correcta de \"Hello\" en español?",
      "tipo": "opcion_multiple",
      "opciones": [
        {"texto": "Adiós"},
        {"texto": "Hola"},
        {"texto": "Gracias"},
        {"texto": "Por favor"}
      ],
      "respuesta_correcta": 1
    },
    {
      "enunciado": "La palabra \"Cat\" significa gato en español.",
      "tipo": "vf",
      "respuesta_correcta": true
    },
    {
      "enunciado": "Escribe la traducción de \"Book\" en español:",
      "tipo": "respuesta_corta",
      "respuesta_correcta": "libro"
    }
  ]
}', 
NOW());

-- Obtener el ID del quiz recién creado
SET @quiz_id = LAST_INSERT_ID();

-- Crear una asignación para que esté disponible (ajusta unidad_id)
INSERT INTO quiz_asignacion (quiz_id, unidad_id, start_at, end_at, created_at) VALUES 
(@quiz_id, 1, NOW() - INTERVAL 1 DAY, NOW() + INTERVAL 7 DAY, NOW());

-- Verificar que se creó correctamente
SELECT q.id, q.titulo, q.descripcion, qa.start_at, qa.end_at 
FROM quiz q 
LEFT JOIN quiz_asignacion qa ON q.id = qa.quiz_id 
WHERE q.id = @quiz_id;

-- Mostrar el JSON de preguntas de forma legible
SELECT id, titulo, JSON_PRETTY(preguntas) as preguntas_formateadas 
FROM quiz 
WHERE id = @quiz_id;
