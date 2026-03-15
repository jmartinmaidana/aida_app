import { cargarNovedades, generarCertifadosPorFecha, generarCertificadoPorLU, conectarBD, desconectarBD } from './aida.js';

// Renombramos "parametro" a "operacion" como sugiere el documento
export interface Operacion {
    tipo: string;
    parametro: string;
}

export async function ejecutarOperaciones(operaciones: Operacion[]) {
    try {
        await conectarBD();
        console.log("POLAR: Iniciando procesamiento de lote de certificados...");

        for (const op of operaciones) {
            if (op.tipo === 'archivo') {
                // Asumimos que el archivo CSV a cargar también se depositará en la carpeta de entrada
                await cargarNovedades(`./local-intercambio/entrada/${op.parametro}`);
            } else if (op.tipo === 'lu') {
                await generarCertificadoPorLU(op.parametro);
            } else if (op.tipo === 'fecha') {
                // Adaptación para soportar fechas ISO (YYYY-MM-DD) o humanas (DD/MM/YYYY)
                let fechaCorregida = op.parametro;
                if (fechaCorregida.includes('-')) {
                     const partes = fechaCorregida.split('-');
                     // Convertimos de YYYY-MM-DD a DD/MM/YYYY para nuestra función textoAFecha
                     fechaCorregida = `${partes[2]}/${partes[1]}/${partes[0]}`;
                }
                await generarCertifadosPorFecha(fechaCorregida);
            } else {
                console.error(`POLAR Error: Tipo de operación desconocida '${op.tipo}'`);
            }
        }
        console.log("POLAR: Lote de operaciones procesado exitosamente.");
    } catch (err: any) {
        console.error('POLAR Error crítico en la orquestación:', err.message);
    } finally {
        await desconectarBD();
    }
}