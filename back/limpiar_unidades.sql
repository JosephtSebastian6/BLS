-- Script para limpiar las unidades por defecto y permitir sincronización desde frontend
DELETE FROM estudiante_unidad;
DELETE FROM unidad;

-- Reiniciar el auto_increment
ALTER TABLE unidad AUTO_INCREMENT = 1;
