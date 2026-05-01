-- 1. Añadimos el rol a los usuarios existentes (serán ADMIN por defecto)
ALTER TABLE aida.usuarios 
ADD COLUMN IF NOT EXISTS rol VARCHAR(20) NOT NULL DEFAULT 'ADMIN';

-- 2. Añadimos la relación con el alumno (Un ADMIN tendrá esto en NULL)
ALTER TABLE aida.usuarios 
ADD COLUMN IF NOT EXISTS lu_alumno TEXT UNIQUE REFERENCES aida.alumnos(lu) ON DELETE CASCADE;

-- 3. Hacemos que el password pueda ser nulo (porque el alumno se crea sin contraseña al inicio)
ALTER TABLE aida.usuarios 
ALTER COLUMN password_hash DROP NOT NULL;

-- 4. Tabla para guardar los "Tokens Mágicos" temporales que viajan por correo
CREATE TABLE IF NOT EXISTS aida.tokens_activacion (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES aida.usuarios(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    fecha_expiracion TIMESTAMP NOT NULL
);