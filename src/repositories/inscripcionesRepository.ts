import { pool } from '../database.js';
import { CursadasRepository } from './cursadaRepository.js';

export class InscripcionesRepository {
    
    // 1. ADMIN: Inscribe una materia a un Período Lectivo
    static async inscribirMateriaAPeriodo(materiaId: string, anio: string, cuatrimestre: string) {
        // Nos aseguramos de que el periodo exista (o lo creamos en PLANIFICACION)
        const queryPeriodo = `
            INSERT INTO aida.periodos_lectivos (anio, cuatrimestre, estado)
            VALUES ($1, $2, 'PLANIFICACION')
            ON CONFLICT (anio, cuatrimestre) DO UPDATE SET anio = EXCLUDED.anio
            RETURNING id;
        `;
        const resPeriodo = await pool.query(queryPeriodo, [anio, cuatrimestre]);
        const periodoId = resPeriodo.rows[0].id;

        const query = `
            INSERT INTO aida.materias_por_periodo (materia_id, periodo_id)
            VALUES ($1, $2)
            ON CONFLICT (materia_id, periodo_id) DO UPDATE SET materia_id = EXCLUDED.materia_id
            RETURNING *;
        `;
        const res = await pool.query(query, [materiaId, periodoId]);
        return res.rows[0];
    }

    // 1.8 ADMIN: Elimina una materia de un periodo
    static async eliminarMateriaDePeriodo(idMpp: string) {
        const query = `DELETE FROM aida.materias_por_periodo WHERE id = $1 RETURNING *;`;
        const res = await pool.query(query, [idMpp]);
        if (res.rows.length === 0) throw new Error("Registro no encontrado.");
        return res.rows[0];
    }

    // 1.5 ADMIN: Crea un Periodo Lectivo vacío
    static async crearPeriodo(anio: string, cuatrimestre: string, fechas: any = {}) {
        const query = `
            INSERT INTO aida.periodos_lectivos (anio, cuatrimestre, estado, fecha_inicio, fecha_fin, fecha_inicio_inscripcion, fecha_fin_inscripcion)
            VALUES ($1, $2, 'PLANIFICACION', $3, $4, $5, $6)
            ON CONFLICT (anio, cuatrimestre) DO UPDATE SET 
                fecha_inicio = EXCLUDED.fecha_inicio,
                fecha_fin = EXCLUDED.fecha_fin,
                fecha_inicio_inscripcion = EXCLUDED.fecha_inicio_inscripcion,
                fecha_fin_inscripcion = EXCLUDED.fecha_fin_inscripcion
            RETURNING *;
        `;
        const res = await pool.query(query, [
            anio, cuatrimestre, 
            fechas.fecha_inicio || null, 
            fechas.fecha_fin || null, 
            fechas.fecha_inicio_inscripcion || null, 
            fechas.fecha_fin_inscripcion || null
        ]);
        return res.rows[0];
    }

    // 2. ADMIN: Abre las inscripciones ("Interruptor Maestro")
    static async abrirInscripciones(anio: string, cuatrimestre: string) {
        const query = `UPDATE aida.periodos_lectivos SET estado = 'INSCRIPCIONES_ABIERTAS' WHERE anio = $1 AND cuatrimestre = $2 RETURNING *;`;
        const res = await pool.query(query, [anio, cuatrimestre]);
        return res.rows;
    }

    // 3. ADMIN: Cierra las inscripciones y comienza la cursada
    static async cerrarInscripciones(anio: string, cuatrimestre: string) {
        const query = `UPDATE aida.periodos_lectivos SET estado = 'CURSANDO' WHERE anio = $1 AND cuatrimestre = $2 RETURNING *;`;
        const res = await pool.query(query, [anio, cuatrimestre]);
        return res.rows;
    }

    // 4. ADMIN: Obtiene toda la oferta (cruzando la información con el periodo)
    static async obtenerMateriasPorPeriodoAdmin() {
        const query = `
            SELECT mpp.id, mpp.materia_id, m.nombre as materia, pl.anio, pl.cuatrimestre, pl.estado as estado_periodo,
                   pl.fecha_inicio, pl.fecha_fin, pl.fecha_inicio_inscripcion, pl.fecha_fin_inscripcion,
                   (SELECT COUNT(*) FROM aida.cursadas c WHERE c.materia_id = mpp.materia_id AND c.anio = pl.anio AND c.cuatrimestre = pl.cuatrimestre AND c.estado = 'CURSANDO') as inscritos
            FROM aida.periodos_lectivos pl
            LEFT JOIN aida.materias_por_periodo mpp ON mpp.periodo_id = pl.id
            LEFT JOIN aida.materias m ON mpp.materia_id = m.id
            ORDER BY pl.anio DESC, pl.cuatrimestre DESC, m.nombre ASC;
        `;
        const res = await pool.query(query);
        return res.rows;
    }

    // 5. ALUMNO: Obtiene solo la oferta si el periodo está en INSCRIPCIONES_ABIERTAS
    static async obtenerMateriasPorPeriodoAlumno(lu: string) {
        const queryMaterias = `
            SELECT mpp.id, mpp.materia_id, m.nombre as materia, pl.anio, pl.cuatrimestre,
                   pl.fecha_inicio, pl.fecha_fin, pl.fecha_inicio_inscripcion, pl.fecha_fin_inscripcion,
                   EXISTS (
                       SELECT 1 FROM aida.cursadas c 
                       WHERE c.lu_alumno = $1 
                         AND c.materia_id = mpp.materia_id 
                         AND c.anio = pl.anio 
                         AND c.cuatrimestre = pl.cuatrimestre
                   ) as inscripto
            FROM aida.materias_por_periodo mpp
            JOIN aida.materias m ON mpp.materia_id = m.id
            JOIN aida.periodos_lectivos pl ON mpp.periodo_id = pl.id
            JOIN aida.plan_estudio pe ON pe.materia_id = m.id
            JOIN aida.alumnos a ON a.carrera_id = pe.carrera_id
            WHERE pl.estado = 'INSCRIPCIONES_ABIERTAS' AND a.lu = $1
            ORDER BY pl.anio DESC, pl.cuatrimestre DESC, m.nombre ASC;
        `;
        const res = await pool.query(queryMaterias, [lu]);
        return res.rows;
    }

    // 6. ALUMNO: Inscribirse a una materia abierta
    static async inscribirAlumno(lu: string, materiaId: string, anio: string, cuatrimestre: string) {
        // 1. Ejecutamos todas las validaciones de negocio en un método separado
        await this.verificarCondicionesInscripcion(lu, materiaId, anio, cuatrimestre);

        // 2. Si todas las validaciones pasan, inscribimos al alumno
        const query = `
            INSERT INTO aida.cursadas (lu_alumno, materia_id, anio, cuatrimestre, nota, aprobada, estado)
            VALUES ($1, $2, $3, $4, NULL, false, 'CURSANDO')
            RETURNING *;
        `;
        const res = await pool.query(query, [lu, materiaId, anio, cuatrimestre]);
        return res.rows[0];
    }
    
    /**
     * Método privado que encapsula todas las reglas de negocio para validar una inscripción.
     * Arroja un error si no se cumple alguna condición.
     */
    private static async verificarCondicionesInscripcion(lu: string, materiaId: string, anio: string, cuatrimestre: string) {
        // 1. Verificamos que la materia esté en un periodo con inscripciones abiertas
        const queryAbierta = `
            SELECT pl.estado FROM aida.materias_por_periodo mpp 
            JOIN aida.periodos_lectivos pl ON mpp.periodo_id = pl.id
            WHERE mpp.materia_id = $1 AND pl.anio = $2 AND pl.cuatrimestre = $3;
        `;
        const resAbierta = await pool.query(queryAbierta, [materiaId, anio, cuatrimestre]);
        
        if (resAbierta.rows.length === 0) throw new Error("La materia no se encuentra ofertada para este ciclo.");
        if (resAbierta.rows[0].estado !== 'INSCRIPCIONES_ABIERTAS') throw new Error("Las inscripciones para esta materia se encuentran cerradas.");

        // 2. Verificamos que la materia pertenezca a la carrera del alumno
        const queryPlan = `
            SELECT 1 FROM aida.alumnos a
            JOIN aida.plan_estudio pe ON a.carrera_id = pe.carrera_id
            WHERE a.lu = $1 AND pe.materia_id = $2;
        `;
        const resPlan = await pool.query(queryPlan, [lu, materiaId]);
        if (resPlan.rows.length === 0) throw new Error("La materia no pertenece a tu plan de estudios.");

        // 3. Verificamos que el alumno no haya APROBADO ya esta materia (chequea la tabla de finales)
        const yaAprobada = await CursadasRepository.verificarMateriaAprobada(lu, materiaId);
        if (yaAprobada) {
            throw new Error("Ya tienes aprobada esta materia.");
        }

        // 4. Verificamos que no esté CURSANDO la materia actualmente ni tenga la cursada APROBADA
        const queryCursando = `SELECT estado FROM aida.cursadas WHERE lu_alumno = $1 AND materia_id = $2 AND estado IN ('CURSANDO', 'APROBADA') LIMIT 1;`;
        const resCursando = await pool.query(queryCursando, [lu, materiaId]);
        
        if (resCursando.rows.length > 0) {
            if (resCursando.rows[0].estado === 'CURSANDO') {
                throw new Error("Ya te encuentras cursando esta materia. No puedes inscribirte nuevamente.");
            } else {
                throw new Error("Ya tienes la cursada de esta materia aprobada. Solo debes rendir el final.");
            }
        }
    }
    
    // 7. ADMIN: Actualizar la condición de cursada. Si promociona, se envía notaPromocion.
    static async actualizarEstadoCursada(cursadaId: number, estado: string, notaPromocion: number | null = null) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const aprobada = estado === 'APROBADA';
            // La cursada ya no guarda nota, solo refleja el estado de regularidad (APROBADA = Regular)
            const updateCursadaQuery = `UPDATE aida.cursadas SET estado = $1, aprobada = $2 WHERE id = $3 RETURNING *;`;
            const res = await client.query(updateCursadaQuery, [estado, aprobada, cursadaId]);
            
            if (res.rows.length === 0) {
                throw new Error("No se encontró la cursada para actualizar.");
            }

            // PROMOCIÓN: Si la cursada está APROBADA y el docente envía una nota, automáticamente le cargamos el examen final
            if (aprobada && notaPromocion !== null) {
                const { lu_alumno, materia_id } = res.rows[0];
                // Usamos ON CONFLICT para evitar duplicados si ya existiera un final (ej. por un recuperatorio)
                const insertFinalQuery = `
                    INSERT INTO aida.finales (lu_alumno, materia_id, nota, aprobado, fecha) 
                    VALUES ($1, $2, $3, true, CURRENT_DATE)
                    ON CONFLICT (lu_alumno, materia_id, fecha) DO UPDATE SET nota = EXCLUDED.nota, aprobado = true;
                `;
                await client.query(insertFinalQuery, [lu_alumno, materia_id, notaPromocion]);
            }

            await client.query('COMMIT');
            return res.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}
