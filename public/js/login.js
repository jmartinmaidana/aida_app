document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); 

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const mensajeError = document.getElementById('mensajeError');
    const btnIngresar = document.querySelector('.btn-ingresar');

    // 1. Ocultamos errores previos
    mensajeError.style.display = 'none'; 
    
    // 2. Guardamos el texto original del botón y activamos el Spinner
    const contenidoOriginal = btnIngresar.innerHTML;
    btnIngresar.innerHTML = '<i class="ph ph-spinner icono-cargando"></i> Verificando...';
    btnIngresar.disabled = true; // Bloqueamos el botón

    try {
        const respuesta = await fetch('/api/v0/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const json = await respuesta.json();

        if (json.estado === 'exito') {
            // Si el login es exitoso, podemos poner un icono de check antes de redirigir
            btnIngresar.innerHTML = '<i class="ph ph-check-circle"></i> ¡Conectado!';
            window.location.href = '/menu'; 
        } else {
            // Si falla, mostramos el error y restauramos el botón a la normalidad
            mensajeError.textContent = json.mensaje;
            mensajeError.style.display = 'block';
            btnIngresar.innerHTML = contenidoOriginal;
            btnIngresar.disabled = false;
        }
    } catch (error) {
        mensajeError.textContent = "Error de conexión con el servidor.";
        mensajeError.style.display = 'block';
        // Restauramos el botón en caso de error de red
        btnIngresar.innerHTML = contenidoOriginal;
        btnIngresar.disabled = false;
    }
});