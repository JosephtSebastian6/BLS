-- Script SQL para crear la tabla estudiante_quiz_respuesta
-- Ejecutar este script en tu base de datos MySQL

USE academia;

CREATE TABLE IF NOT EXISTS estudiante_quiz_respuesta (
    id INT AUTO_INCREMENT PRIMARY KEY,
    estudiante_username VARCHAR(50) NOT NULL,
    quiz_id INT NOT NULL,
    unidad_id INT NOT NULL,
    respuestas JSON NOT NULL,
    score INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Claves foráneas
    FOREIGN KEY (estudiante_username) REFERENCES estudiante(username) ON DELETE CASCADE,
    FOREIGN KEY (quiz_id) REFERENCES quiz(id) ON DELETE CASCADE,
    FOREIGN KEY (unidad_id) REFERENCES unidad(id) ON DELETE CASCADE,
    
    -- Índices para mejor rendimiento
    INDEX idx_estudiante_quiz (estudiante_username, quiz_id),
    INDEX idx_quiz_id (quiz_id),
    INDEX idx_unidad_id (unidad_id),
    
    -- Restricción única para evitar respuestas duplicadas
    UNIQUE KEY unique_estudiante_quiz (estudiante_username, quiz_id)
);

-- Verificar que la tabla se creó correctamente
DESCRIBE estudiante_quiz_respuesta;

-- Mostrar las tablas existentes para confirmar
SHOW TABLES LIKE '%quiz%';
