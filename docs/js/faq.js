document.addEventListener('DOMContentLoaded', () => {
    // Ya no necesitamos el placeholder, solo llamamos a la función de carga de datos
    cargarYMostrarFAQs(); 
});

/**
 * Carga los datos JSON y muestra las preguntas en el contenedor.
 */
async function cargarYMostrarFAQs() {
    const contenedor = document.getElementById('faq-contenedor');
    if (!contenedor) return; 

    try {
        // 1. Carga los datos JSON (faq.json)
        const jsonResponse = await fetch('data/faq.json');
        if (!jsonResponse.ok) throw new Error('No se pudo cargar data/faq.json');
        const faqData = await jsonResponse.json();

        // 2. Muestra las preguntas en el contenedor
        mostrarFaq(faqData, contenedor);

    } catch (error) {
        console.error('Error al cargar las FAQs:', error);
        contenedor.innerHTML = '<p style="color:red;">Error al cargar las preguntas frecuentes.</p>';
    }
}

/**
 * Renderiza el listado de preguntas.
 * @param {Array} preguntas - El array de objetos de pregunta/respuesta.
 * @param {HTMLElement} contenedor - El elemento DOM donde renderizar.
 */
function mostrarFaq(preguntas, contenedor) {
    contenedor.innerHTML = ''; // Limpia el mensaje "Cargando..."

    preguntas.forEach(faq => {
        const item = document.createElement('details'); 
        item.className = 'faq-item';
        
        item.innerHTML = `
            <summary class="faq-pregunta">${faq.pregunta}</summary>
            <div class="faq-respuesta">
                <p>${faq.respuesta.replace(/\n/g, '<br>')}</p>
            </div>
        `;
        
        contenedor.appendChild(item);
    });
}