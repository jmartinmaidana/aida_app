-- 1. Tabla para aperturas de materias (oferta académica que administran los ADMIN)
-- 1. Nueva tabla maestra para los Periodos Lectivos (Cuatrimestres)
CREATE TABLE IF NOT EXISTS aida.periodos_lectivos (
    id SERIAL PRIMARY KEY,
    anio INTEGER NOT NULL,
    cuatrimestre INTEGER NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'PLANIFICACION' 
        CHECK (estado IN ('PLANIFICACION', 'INSCRIPCIONES_ABIERTAS', 'CURSANDO', 'CERRADO')),
    UNIQUE (anio, cuatrimestre)
);

-- 2. Tabla para ofertas de materias (vinculada al Periodo Lectivo)
CREATE TABLE IF NOT EXISTS aida.materias_por_periodo (
    id SERIAL PRIMARY KEY,
    materia_id INTEGER NOT NULL REFERENCES aida.materias(id) ON DELETE CASCADE,
    periodo_id INTEGER NOT NULL REFERENCES aida.periodos_lectivos(id) ON DELETE CASCADE,
    UNIQUE(materia_id, periodo_id)
);

-- 3. Modificamos cursadas (Para la cursada en sí: CURSANDO, APROBADA, DESAPROBADA)
ALTER TABLE aida.cursadas ADD COLUMN IF NOT EXISTS estado VARCHAR(30) DEFAULT 'CURSANDO';

-- La nota de cursada puede ser nula (al inscribirse o si solo es conceptual)
ALTER TABLE aida.cursadas ALTER COLUMN nota DROP NOT NULL;

-- Migramos datos viejos
UPDATE aida.cursadas SET estado = 'APROBADA' WHERE aprobada = true;
UPDATE aida.cursadas SET estado = 'DESAPROBADA' WHERE aprobada = false AND estado = 'CURSANDO';

-- 3. NUEVA TABLA: Finales (Para registrar los exámenes finales con su fecha y nota real)
CREATE TABLE IF NOT EXISTS aida.finales (
    id SERIAL PRIMARY KEY,
    lu_alumno TEXT NOT NULL REFERENCES aida.alumnos(lu) ON DELETE CASCADE,
    materia_id INTEGER NOT NULL REFERENCES aida.materias(id) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    nota INTEGER NOT NULL CHECK (nota >= 1 AND nota <= 10),
    aprobado BOOLEAN NOT NULL
);
