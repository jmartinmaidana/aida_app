-- =========================================================================
-- 0. LIMPIEZA TOTAL (El "Refresh")
-- Destruye las tablas existentes y sus relaciones para empezar desde cero
-- =========================================================================
DROP TABLE IF EXISTS aida.cursadas CASCADE;
DROP TABLE IF EXISTS aida.plan_estudio CASCADE;
DROP TABLE IF EXISTS aida.alumnos CASCADE;
DROP TABLE IF EXISTS aida.materias CASCADE;
DROP TABLE IF EXISTS aida.carreras CASCADE;

-- =========================================================================
-- 1. CREACIÓN DE TABLAS CATÁLOGO (Sin dependencias)
-- =========================================================================
CREATE TABLE aida.carreras (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE
);

CREATE TABLE aida.materias (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE
);

-- =========================================================================
-- 2. CREACIÓN DE LA TABLA ALUMNOS
-- =========================================================================
CREATE TABLE aida.alumnos (
    lu TEXT PRIMARY KEY,
    nombres TEXT NOT NULL,
    apellido TEXT NOT NULL,
    titulo TEXT,
    titulo_en_tramite DATE,
    egreso DATE,
    carrera_id INTEGER,
    
    CONSTRAINT fk_alumno_carrera FOREIGN KEY (carrera_id) REFERENCES aida.carreras(id)
);

-- =========================================================================
-- 3. CREACIÓN DE TABLAS TRANSACCIONALES E INTERMEDIAS
-- =========================================================================
CREATE TABLE aida.plan_estudio (
    carrera_id INTEGER NOT NULL,
    materia_id INTEGER NOT NULL,
    
    PRIMARY KEY (carrera_id, materia_id),
    CONSTRAINT fk_carrera FOREIGN KEY (carrera_id) REFERENCES aida.carreras(id) ON DELETE CASCADE,
    CONSTRAINT fk_materia FOREIGN KEY (materia_id) REFERENCES aida.materias(id) ON DELETE CASCADE
);

CREATE TABLE aida.cursadas (
    id SERIAL PRIMARY KEY,
    lu_alumno TEXT NOT NULL,
    materia_id INTEGER NOT NULL,
    anio INTEGER NOT NULL,
    cuatrimestre INTEGER NOT NULL,
    aprobada BOOLEAN DEFAULT FALSE,
    
    CONSTRAINT fk_alumno FOREIGN KEY (lu_alumno) REFERENCES aida.alumnos(lu) ON DELETE CASCADE,
    CONSTRAINT fk_materia FOREIGN KEY (materia_id) REFERENCES aida.materias(id) ON DELETE CASCADE,
    UNIQUE (lu_alumno, materia_id, anio, cuatrimestre)
);

-- =========================================================================
-- 4. PERMISOS DE SEGURIDAD 
-- =========================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE aida.carreras TO aida_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE aida.materias TO aida_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE aida.alumnos TO aida_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE aida.plan_estudio TO aida_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE aida.cursadas TO aida_admin;

GRANT USAGE, SELECT ON SEQUENCE aida.carreras_id_seq TO aida_admin;
GRANT USAGE, SELECT ON SEQUENCE aida.materias_id_seq TO aida_admin;
GRANT USAGE, SELECT ON SEQUENCE aida.cursadas_id_seq TO aida_admin;

-- =========================================================================
-- 5. CARGA DE DATOS BASE (Estado Limpio)
-- =========================================================================
INSERT INTO aida.carreras (nombre) VALUES ('Tecnicatura Web'), ('Ingeniería en Software');
INSERT INTO aida.materias (nombre) VALUES ('Programación Inicial'), ('Bases de Datos'), ('Arquitectura de Sistemas');

INSERT INTO aida.plan_estudio (carrera_id, materia_id) 
VALUES 
( (SELECT id FROM aida.carreras WHERE nombre = 'Tecnicatura Web'), (SELECT id FROM aida.materias WHERE nombre = 'Programación Inicial') ),
( (SELECT id FROM aida.carreras WHERE nombre = 'Tecnicatura Web'), (SELECT id FROM aida.materias WHERE nombre = 'Bases de Datos') ),
( (SELECT id FROM aida.carreras WHERE nombre = 'Ingeniería en Software'), (SELECT id FROM aida.materias WHERE nombre = 'Programación Inicial') ),
( (SELECT id FROM aida.carreras WHERE nombre = 'Ingeniería en Software'), (SELECT id FROM aida.materias WHERE nombre = 'Bases de Datos') ),
( (SELECT id FROM aida.carreras WHERE nombre = 'Ingeniería en Software'), (SELECT id FROM aida.materias WHERE nombre = 'Arquitectura de Sistemas') );

-- Inscribimos a Ana y Luis asegurando que sus fechas comiencen nulas
INSERT INTO aida.alumnos (lu, nombres, apellido, titulo, egreso, titulo_en_tramite, carrera_id) 
VALUES 
('901/24', 'Ana', 'Gómez', 'Técnico Web', NULL, NULL, (SELECT id FROM aida.carreras WHERE nombre = 'Tecnicatura Web')),
('902/24', 'Luis', 'Pérez', 'Ingeniero en Software', NULL, NULL, (SELECT id FROM aida.carreras WHERE nombre = 'Ingeniería en Software'));