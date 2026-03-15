// Definimos nuestro Tipo Abstracto de Datos (TAD)
// Hacia afuera, será un tipo "Fecha", aunque internamente usemos Date
export type Fecha = Date;

/**
 * 1. Convierte de ISO-string (yyyy-mm-dd) a Fecha
 * Ideal para procesar datos que vienen del CSV o de la base de datos.
 */
export function isoAFecha(isoString: string): Fecha {
    // Dividimos el texto "2025-08-27" en un arreglo: ["2025", "08", "27"]
    const partes = isoString.split('-');
    
    const anio = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10);
    const dia = parseInt(partes[2], 10);
    
    // El constructor local de Date evita problemas de Timezone.
    // Importante: restamos 1 al mes porque en JS Enero es 0 y Diciembre es 11.
    // Los últimos ceros fuerzan la hora a las 00:00:00.000 de la hora local.
    return new Date(anio, mes - 1, dia, 0, 0, 0, 0);
}

/**
 * 2. Convierte de texto humano (d/m/y) a Fecha
 * Ideal para procesar lo que el usuario ingresa en la consola (ej: 20/09/2025 o 20/9/25).
 */
export function textoAFecha(texto: string): Fecha {
    // Dividimos el texto "20/09/2025" usando la barra como separador
    const partes = texto.split('/');
    
    const dia = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10);
    let anio = parseInt(partes[2], 10);
    
    // Pequeña regla de negocio extra: 
    // Si el usuario escribe "25" en lugar de "2025", lo corregimos.
    if (anio < 100) {
        anio += 2000;
    }
    
    // Al igual que antes, el mes requiere restar 1, y forzamos la hora a las 00:00:00 local
    return new Date(anio, mes - 1, dia, 0, 0, 0, 0);
}

/**
 * 3. Convierte de Fecha a texto humano (dd/mm/yyyy)
 * Ideal para mostrar información en pantalla o en el HTML del certificado.
 */
export function fechaATexto(fecha: Fecha): string {
    // getDate() devuelve el día del mes (1-31)
    const dia = fecha.getDate().toString().padStart(2, '0');
    // getMonth() devuelve de 0 a 11, por lo que DEBEMOS sumarle 1 para mostrar el mes real
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const anio = fecha.getFullYear().toString();
    
    return `${dia}/${mes}/${anio}`;
}

/**
 * 4. Convierte de Fecha a ISO-string local (yyyy-mm-dd)
 * Ideal para enviar la fecha a PostgreSQL de forma segura.
 */
export function fechaAIsoString(fecha: Fecha): string {
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const anio = fecha.getFullYear().toString();
    
    return `${anio}-${mes}-${dia}`;
}