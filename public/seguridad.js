// Archivo: public/seguridad.js
(async function verificarSeguridadFrontEnd() {
    try {
        const checkSesion = await fetch('/api/v0/auth/verificar');
        
        // Si el servidor responde con error (400, 401, etc.), redirigimos
        if (!checkSesion.ok) {
            window.location.replace('/app/login'); 
            // Usamos replace() en lugar de href para que el usuario no pueda 
            // usar el botón "Atrás" del navegador para volver a la página protegida.
        }
    } catch (error) {
        console.error("Error crítico de seguridad:", error);
        window.location.replace('/app/login');
    }
})();