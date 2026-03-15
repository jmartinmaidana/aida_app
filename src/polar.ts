import { watch } from 'fs/promises';
import { readFile } from 'fs/promises';
import { ejecutarOperaciones, Operacion } from './orquestador.js';

async function iniciarPolar() {
    const carpetaEntrada = './local-intercambio/entrada';
    console.log(`POLAR: Servidor iniciado. Observando la carpeta ${carpetaEntrada}...`);

    try {
        const observador = watch(carpetaEntrada);

        for await (const evento of observador) {
            // Reaccionamos cuando se crea o modifica el archivo esperado
            if (evento.filename === 'generacion_certificados.csv' && evento.eventType === 'change') {
                console.log(`\nPOLAR: Detectado nuevo archivo de lotes. Procesando...`);
                
                try {
                    // Esperamos un instante minúsculo para asegurar que el sistema operativo terminó de copiar el archivo
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    const contenidoCsv = await readFile(`${carpetaEntrada}/${evento.filename}`, { encoding: 'utf8' });
                    // Limpiamos líneas vacías
                    const lineas = contenidoCsv.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                    
                    // Controlamos que los nombres de las columnas sean los pedidos
                    if (lineas[0] !== 'tipo,parametro') {
                        console.error("POLAR Error: El archivo CSV no tiene el encabezado correcto 'tipo,parametro'.");
                        continue; // Saltamos este procesamiento
                    }

                    // Parseamos las filas saltando el encabezado (i = 1)
                    const operaciones: Operacion[] = [];
                    for (let i = 1; i < lineas.length; i++) {
                        const [tipo, parametro] = lineas[i].split(',');
                        if (tipo && parametro) {
                            operaciones.push({ tipo, parametro });
                        }
                    }

                    // Enviamos el lote al orquestador
                    await ejecutarOperaciones(operaciones);

                } catch (readError: any) {
                    console.error(`POLAR Error leyendo el archivo CSV: ${readError.message}`);
                }
            }
        }
    } catch (err: any) {
        console.error(`POLAR Error fatal: ${err.message}. Verifique que la carpeta de entrada exista.`);
    }
}

// Ejecutamos el servidor
iniciarPolar();