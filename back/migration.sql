-- Agregar columna matricula_activa a la tabla estudiante
ALTER TABLE estudiante ADD COLUMN matricula_activa BOOLEAN DEFAULT TRUE;

-- Crear tabla de unidades
CREATE TABLE IF NOT EXISTS unidad (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),
    orden INT DEFAULT 0
);

-- Crear tabla intermedia estudiante-unidad
CREATE TABLE IF NOT EXISTS estudiante_unidad (
    estudiante_id INT,
    unidad_id INT,
    habilitada BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (estudiante_id, unidad_id),
    FOREIGN KEY (estudiante_id) REFERENCES estudiante(identificador) ON DELETE CASCADE,
    FOREIGN KEY (unidad_id) REFERENCES unidad(id) ON DELETE CASCADE
);

-- Crear tabla intermedia profesor_estudiante
CREATE TABLE IF NOT EXISTS profesor_estudiante (
    profesor_id INT,
    estudiante_id INT,
    fecha_asignacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (profesor_id, estudiante_id),
    FOREIGN KEY (profesor_id) REFERENCES estudiante(identificador) ON DELETE CASCADE,
    FOREIGN KEY (estudiante_id) REFERENCES estudiante(identificador) ON DELETE CASCADE
);

-- Las unidades se sincronizarán automáticamente desde el frontend
-- No insertar unidades por defecto aquí
