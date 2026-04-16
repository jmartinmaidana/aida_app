let planesLocales = [];
let columnaOrdenMaterias = 'id';
let ordenMateriasAscendente = true;

document.addEventListener('DOMContentLoaded', () => {
    cargarPlanesDeEstudio();
});

async function cargarPlanesDeEstudio() {
    const contenedor = document.getElementById('contenedor-planes');
    try {
        const respuesta = await fetch('/api/v0/planes-estudio');
        if (!respuesta.ok) {
            throw new Error('No se pudo obtener la información de los planes de estudio.');
        }
        const planes = await respuesta.json();
        planesLocales = planes.datos;
        renderizarPlanes();

    } catch (error) {
        contenedor.innerHTML = `<div class="mensaje error">${error.message}</div>`;
    }
}

function ordenarMaterias(columna) {
    if (columnaOrdenMaterias === columna) {
        ordenMateriasAscendente = !ordenMateriasAscendente;
    } else {
        columnaOrdenMaterias = columna;
        ordenMateriasAscendente = true;
    }

    planesLocales.forEach(carrera => {
        if (carrera.materias && carrera.materias.length > 0) {
            carrera.materias.sort((a, b) => {
                let valorA = a[columna];
                let valorB = b[columna];

                if (typeof valorA === 'string') valorA = valorA.toLowerCase();
                if (typeof valorB === 'string') valorB = valorB.toLowerCase();

                if (valorA < valorB) return ordenMateriasAscendente ? -1 : 1;
                if (valorA > valorB) return ordenMateriasAscendente ? 1 : -1;
                return 0;
            });
        }
    });

    renderizarPlanes();
}

function renderizarPlanes() {
    const contenedor = document.getElementById('contenedor-planes');
    contenedor.innerHTML = ''; // Limpiamos el mensaje de "Cargando..."

    if (!planesLocales || planesLocales.length === 0) {
        contenedor.innerHTML = `<div class="mensaje">No hay planes de estudio para mostrar.</div>`;
        return;
    }

    planesLocales.forEach(carrera => {
        const divCarrera = document.createElement('div');
        divCarrera.className = 'tarjeta-plan';

        let materiasHtml = '<tr><td colspan="2" style="text-align: center; color: #64748b; padding: 20px;">Esta carrera no tiene materias asignadas.</td></tr>';

        if (carrera.materias && carrera.materias.length > 0) {
            materiasHtml = carrera.materias.map(materia => `
                <tr>
                    <td>${materia.id}</td>
                    <td><strong>${materia.nombre}</strong></td>
                </tr>
            `).join('');
        }

        divCarrera.innerHTML = `
            <h2 class="titulo-carrera">${carrera.nombre}</h2>
            <p class="subtitulo-carrera">Título a otorgar: ${carrera.titulo_otorgado}</p>
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th style="width: 20%; cursor: pointer;" onclick="ordenarMaterias('id')">ID Materia <i class="ph ph-arrows-down-up" style="font-size: 0.8rem;"></i></th>
                            <th style="cursor: pointer;" onclick="ordenarMaterias('nombre')">Nombre de la Materia <i class="ph ph-arrows-down-up" style="font-size: 0.8rem;"></i></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${materiasHtml}
                    </tbody>
                </table>
            </div>
        `;
        contenedor.appendChild(divCarrera);
    });
}