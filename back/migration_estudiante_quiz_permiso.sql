-- Migración: Crear tabla estudiante_quiz_permiso
-- Fecha: 2025-11-11
-- Descripción: Tabla para gestionar permisos individuales de quiz por estudiante
-- Base de datos: MySQL

CREATE TABLE IF NOT EXISTS estudiante_quiz_permiso (
    id INT AUTO_INCREMENT PRIMARY KEY,
    estudiante_username VARCHAR(50) NOT NULL,
    quiz_id INT NOT NULL,
    habilitado BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Constraint de unicidad
    CONSTRAINT unique_estudiante_quiz UNIQUE (estudiante_username, quiz_id),
    
    -- Foreign keys
    CONSTRAINT fk_estudiante_quiz_permiso_username 
        FOREIGN KEY (estudiante_username) REFERENCES estudiante(username) ON DELETE CASCADE,
    CONSTRAINT fk_estudiante_quiz_permiso_quiz 
        FOREIGN KEY (quiz_id) REFERENCES quiz(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índices adicionales para mejorar performance
CREATE INDEX idx_estudiante_quiz_permiso_username ON estudiante_quiz_permiso(estudiante_username);
CREATE INDEX idx_estudiante_quiz_permiso_quiz_id ON estudiante_quiz_permiso(quiz_id);
CREATE INDEX idx_estudiante_quiz_permiso_habilitado ON estudiante_quiz_permiso(habilitado);
