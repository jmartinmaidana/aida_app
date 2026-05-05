-- Agregamos las columnas de fechas a la tabla de periodos lectivos
ALTER TABLE aida.periodos_lectivos 
    ADD COLUMN IF NOT EXISTS fecha_inicio DATE,
    ADD COLUMN IF NOT EXISTS fecha_fin DATE,
    ADD COLUMN IF NOT EXISTS fecha_inicio_inscripcion DATE,
    ADD COLUMN IF NOT EXISTS fecha_fin_inscripcion DATE;