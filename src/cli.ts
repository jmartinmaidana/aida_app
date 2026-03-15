import {generarCertifadosPorFecha,cargarNovedades,generarCertificadoAlumnoPrueba,generarCertificadoPorLU, conectarBD, desconectarBD} from './aida.js'


// Definimos la estructura de datos para los parámetros
interface ParametroParseado {
    parametro: string;
    argumentos: string[];
    funcion: Function;
}

// Función encargada de leer la línea de comandos
function procesarParametros(args: string[]): ParametroParseado[] {
    const parametrosPermitidos = ['archivo', 'fecha', 'lu', 'prueba-primero'];
    const funcionesAsociadas: Record<string, Function> = 
    {'archivo': cargarNovedades, 'fecha': generarCertifadosPorFecha, 'lu': generarCertificadoPorLU, 'prueba-primero': generarCertificadoAlumnoPrueba};

    const resultado: ParametroParseado[] = [];
    
    // Iteramos desde el índice 2, ya que los índices 0 y 1 son 'node' y 'cli.js'
    for (let i = 2; i < args.length; i++) {
        const arg = args[i];
        
        if (arg.startsWith('--')) {
            const nombreParametro = arg.slice(2);
            
            if (!parametrosPermitidos.includes(nombreParametro)) {
                console.error(`Error: Parámetro no reconocido '${arg}'`);
                continue;
            }
            
        
            if (nombreParametro === 'prueba-primero') {
                resultado.push({ parametro: nombreParametro, argumentos: [], funcion: generarCertificadoAlumnoPrueba});
            } else {
                // Tomamos el siguiente valor en la consola como el argumento de este parámetro
                if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
                    resultado.push({ parametro: nombreParametro, argumentos: [args[i + 1]], funcion: funcionesAsociadas[nombreParametro]});
                    i++; // Saltamos el valor que acabamos de leer para no procesarlo dos veces
                } else {
                    console.error(`Error: Falta el valor para el parámetro '${arg}'`);
                }
            }
        }
    }
    return resultado;
}


// Función orquestadora principal
async function principal() {

    // Leemos los argumentos que vienen desde la consola
    const parametrosRecibidos = procesarParametros(process.argv);
    if (parametrosRecibidos.length == 0)
    {
        console.error("Se requiere indicar un modo de carga")
        return;
    }
    
    // Mostramos el resultado en pantalla
    console.log("Por procesar", parametrosRecibidos);
    try {
        await conectarBD();
        
        console.log("Iniciando proceso principal...");
        for(let i = 0; i < parametrosRecibidos.length; i++)
        {
            await parametrosRecibidos[i].funcion(parametrosRecibidos[i].argumentos[0]);
        }
        console.log("Proceso principal finalizado.");

    } catch (err: any) {
        console.error('Error crítico de ejecución:', err.message);
    } finally {
        await desconectarBD();
    }
}

// Ejecución del programa
principal();