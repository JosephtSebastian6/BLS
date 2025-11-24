USE academia; -- cambia esto si tu base de datos tiene otro nombre

ALTER TABLE estudiante_quiz_calificacion
    ADD COLUMN origen_manual TINYINT(1) NULL DEFAULT 0 AFTER aprobada_at,
    ADD COLUMN comentario_profesor TEXT NULL AFTER origen_manual;
