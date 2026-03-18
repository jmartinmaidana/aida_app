import { Pool } from 'pg'; // Cambiamos Client por Pool

import dotenv from 'dotenv';
dotenv.config(); // Lectura del .env
// En src/database.ts (dentro de la inicialización de Pool)
const entornoTest = process.env.NODE_ENV === 'test';
const urlConexion = entornoTest ? process.env.TEST_DB_URL : process.env.DATABASE_URL;

export const pool = new Pool({
    connectionString: urlConexion,
});

export interface Alumno {
    lu: string;
    nombres: string;
    apellido: string;
    titulo: string | null;
    titulo_en_tramite: string | null;
    egreso: string | null;
    carrera_id?: number | null; 
}


export async function conectarBD() {
    const clientePrueba = await pool.connect();
    clientePrueba.release(); // Libera la conexión para que vuelva al pool
}

export async function desconectarBD() {
    await pool.end();
}