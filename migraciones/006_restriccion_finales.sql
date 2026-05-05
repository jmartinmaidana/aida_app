-- Aseguramos la existencia de la restricción UNIQUE en la tabla finales.
-- Modificamos la restricción UNIQUE en la tabla finales para incluir la fecha.
-- Esto permite registrar múltiples intentos de examen final (aplazos y aprobados) 
-- siempre que se rindan en fechas distintas.

ALTER TABLE aida.finales DROP CONSTRAINT IF EXISTS finales_lu_materia_unique;
ALTER TABLE aida.finales ADD CONSTRAINT finales_lu_materia_unique UNIQUE (lu_alumno, materia_id, fecha);
