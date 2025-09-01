-- Crear tabla intermedia profesor_estudiante
CREATE TABLE IF NOT EXISTS profesor_estudiante (
    profesor_id INT,
    estudiante_id INT,
    fecha_asignacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (profesor_id, estudiante_id),
    FOREIGN KEY (profesor_id) REFERENCES estudiante(identificador) ON DELETE CASCADE,
    FOREIGN KEY (estudiante_id) REFERENCES estudiante(identificador) ON DELETE CASCADE
);
