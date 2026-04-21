/**
 * Cliente HTTP centralizado para evitar repetir la configuración de Fetch
 */
export const api = {
    async peticion(endpoint: string, opciones: RequestInit = {}) {
        const config = {
            ...opciones,
            headers: {
                'Content-Type': 'application/json',
                ...opciones.headers,
            },
        };

        const respuesta = await fetch(endpoint, config);
        const datos = await respuesta.json().catch(() => null); // Por si el server no devuelve JSON

        if (!respuesta.ok) {
            // Lanzamos un error que contiene el mensaje del backend
            const detallesError = datos?.detalles ? datos.detalles.map((err: any) => err.message).join(' | ') : '';
            const mensajeError = detallesError || datos?.mensaje || 'Error en la petición al servidor';
            throw new Error(mensajeError);
        }

        return datos;
    },

    get(endpoint: string) {
        return this.peticion(endpoint, { method: 'GET' });
    },
    post(endpoint: string, body: any) {
        return this.peticion(endpoint, { method: 'POST', body: JSON.stringify(body) });
    },
    put(endpoint: string, body: any) {
        return this.peticion(endpoint, { method: 'PUT', body: JSON.stringify(body) });
    },
    delete(endpoint: string) {
        return this.peticion(endpoint, { method: 'DELETE' });
    },
    patch(endpoint: string, body: any) {
        return this.peticion(endpoint, { method: 'PATCH', body: JSON.stringify(body) });
    }
};
