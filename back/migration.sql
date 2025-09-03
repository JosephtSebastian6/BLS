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

-- Tabla de eventos de actividad del estudiante (tracking de tiempo)
CREATE TABLE IF NOT EXISTS actividad_estudiante (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    unidad_id INT NOT NULL,
    tipo_evento VARCHAR(20) NOT NULL, -- start | heartbeat | end
    duracion_min INT NULL,
    metadata_json JSON NULL,
    creado_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (unidad_id) REFERENCES unidad(id) ON DELETE CASCADE,
    FOREIGN KEY (username) REFERENCES estudiante(username) ON DELETE CASCADE
);

-- Tabla agregada de progreso por unidad (lectura rápida)
CREATE TABLE IF NOT EXISTS estudiante_progreso_unidad (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    unidad_id INT NOT NULL,
    porcentaje_completado INT DEFAULT 0,
    score INT DEFAULT 0,
    tiempo_dedicado_min INT DEFAULT 0,
    ultima_actividad_at DATETIME NULL,
    UNIQUE KEY uq_est_prog (username, unidad_id),
    FOREIGN KEY (unidad_id) REFERENCES unidad(id) ON DELETE CASCADE,
    FOREIGN KEY (username) REFERENCES estudiante(username) ON DELETE CASCADE
);
