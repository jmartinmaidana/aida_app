import { Pool } from 'pg'; // Cambiamos Client por Pool
import { AlumnoRepository } from './repositories/AlumnosRepository.js';

import dotenv from 'dotenv';
dotenv.config(); // Lectura del .env

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20, // Número máximo de conexiones simultáneas en el pool
    idleTimeoutMillis: 30000, // Cierra las conexiones inactivas después de 30 segundos
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