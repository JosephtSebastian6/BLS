USE academia; -- cambia esto si tu base de datos tiene otro nombre

ALTER TABLE estudiante_quiz_calificacion
    ADD COLUMN aprobada TINYINT(1) NULL DEFAULT 0 AFTER score,
    ADD COLUMN aprobada_por VARCHAR(50) NULL AFTER aprobada,
    ADD COLUMN aprobada_at DATETIME NULL AFTER aprobada_por;
