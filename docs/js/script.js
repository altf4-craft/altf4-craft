let productos = [];
let carrito = JSON.parse(localStorage.getItem('carrito')) || [];

document.addEventListener('DOMContentLoaded', async () => {
  productos = await cargarProductos();
  mostrarProductos(productos);
  actualizarCarrito();
});

async function cargarProductos() {
  try {
    const respuesta = await fetch("./data/productos.json");
    const data = await respuesta.json();
    return data; // 👈 devolvemos los productos
  } catch (error) {
    console.error("Error cargando productos:", error);
    return []; // devolvemos array vacío si falla
  }
}

function mostrarProductos(listaProductos) {
  const catalogo = document.getElementById('catalogo');
  catalogo.innerHTML = '';

  listaProductos.forEach(producto => {
    const div = document.createElement('div');
    div.className = 'producto';
    div.innerHTML = `
      <img src="${producto.imagen}" alt="${producto.nombre}" onclick="mostrarDetalle('${producto.id}')">
      <h2>${producto.nombre}</h2>
      <p>Precio: $${producto.precio}</p>
      <p>3 cuotas de $${(producto.precio/3).toFixed(2)}</p>
      <button onclick="mostrarDetalle('${producto.id}')">Ver más</button>
    `;

    // Si no hay stock, deshabilitar el botón
    if (producto.stock <= 0) {
      div.querySelector("button").disabled = true;
      div.querySelector("button").textContent = "Sin stock";
    }

    catalogo.appendChild(div);
  });
}

// Cambia la función agregarAlCarrito para aceptar cantidadManual
function agregarAlCarrito(id, cantidadManual, variacionId = null) {
  let producto = productos.find(p => p.id === id);
  let nombre = producto.nombre;
  let precio = producto.precio;
  let stock = producto.stock;
  let idCarrito = id;

  // Si hay variación, ajusta los datos
  if (variacionId && producto.variaciones && producto.variaciones.length > 0) {
    const variacion = producto.variaciones.find(v => v.id === variacionId);
    if (variacion) {
      nombre += ` (${variacion.nombre})`;
      stock = variacion.stock;
      idCarrito = `${id}-${variacionId}`;
      // Usa el precio de la variación si existe
      if (variacion.precio) precio = variacion.precio;
    }
  }

  // Si viene cantidadManual úsala, si no, toma la del input del catálogo
  let cantidad = cantidadManual !== undefined
    ? cantidadManual
    : parseInt(document.getElementById('cantidad-' + id).value);

  if (!producto || cantidad <= 0 || isNaN(cantidad)) {
    alert("Cantidad inválida o producto no encontrado");
    return;
  }

  // Busca por idCarrito (id+variacion)
  const productoExistente = carrito.find(item => item.id === idCarrito);

  if (productoExistente) {
    if (productoExistente.cantidad + cantidad > stock) {
      alert('No hay suficiente stock disponible');
      return;
    }
    productoExistente.cantidad += cantidad;
    productoExistente.precio = precio; // Actualiza el precio por si cambió
    productoExistente.subtotal = productoExistente.cantidad * precio;
  } else {
    if (cantidad > stock) {
      alert('No hay suficiente stock disponible');
      return;
    }
    carrito.push({
      id: idCarrito,
      nombre: nombre,
      precio: precio,
      cantidad: cantidad,
      subtotal: precio * cantidad
    });
  }

  guardarCarrito();
  actualizarCarrito();
  mostrarAlerta();
}

function eliminarDelCarrito(id) {
  carrito = carrito.filter(item => item.id !== id);
  guardarCarrito();
  actualizarCarrito();
}

function actualizarCarrito() {
  const lista = document.getElementById('lista-carrito');
  lista.innerHTML = '';

carrito.forEach(item => {
  const producto = productos.find(p => p.id === item.id);
  const maxStock = producto ? producto.stock : item.cantidad;

  const li = document.createElement('li');
  li.innerHTML = `
    ${item.nombre} - $${item.precio} x 
    <button onclick="cambiarCantidad('${item.id}', -1)">-</button>
    <span id="cantidad-${item.id}">${item.cantidad}</span>
    <button onclick="cambiarCantidad('${item.id}', 1)">+</button>
    = $${item.subtotal}
    <button onclick="eliminarDelCarrito('${item.id}')">Eliminar</button>
  `;
  lista.appendChild(li);
  });


  const total = carrito.reduce((acc, item) => acc + item.subtotal, 0);
  document.getElementById('total').textContent = `Total: $${total}`;
  document.getElementById('contador-carrito').textContent = carrito.length;
}

document.getElementById('form-datos').addEventListener('submit', async function (e) {
  e.preventDefault();

  const formData = new FormData(this);
  const datos = {};
  formData.forEach((valor, clave) => datos[clave] = valor);

  if (carrito.length === 0) {
    alert("Tu carrito está vacío.");
    return;
  }

  let mensaje = `¡Hola! Quiero realizar un pedido:\n\n`;
  carrito.forEach(item => {
    mensaje += `- ${item.nombre} x${item.cantidad} ($${item.subtotal})\n`;
  });

  const total = carrito.reduce((acc, item) => acc + item.subtotal, 0);
  mensaje += `\nTotal: $${total}\n\n`;

  mensaje += `Datos del cliente:\n`;
  mensaje += `Nombre: ${datos.nombre}\n`;
  mensaje += `DNI: ${datos.dni}\n`;
  mensaje += `Email: ${datos.email}\n`;
  mensaje += `Celular: ${datos.celular}\n`;
  mensaje += `Método de envío: ${datos.envio}\n`;
  mensaje += `Recibe: ${datos.recibe}\n`;
  mensaje += `Método de pago: ${datos.pago}\n`;
  mensaje += `¿Autoriza publicación?: ${datos.publicidad}\n`;
  mensaje += `¿Factura C?: ${datos.factura}\n`;

  // 📲 Abrir WhatsApp
  const telefonoVendedor = '5491126116298';
  const urlWhatsapp = `https://wa.me/${telefonoVendedor}?text=${encodeURIComponent(mensaje)}`;
  window.open(urlWhatsapp, '_blank');

  // 🔄 Resetear carrito y productos
  localStorage.removeItem('carrito');  // limpiar localStorage
  carrito = [];                        // limpiar array en memoria
  actualizarCarrito();                 // refrescar vista

  // 🔄 Recargar productos si corresponde
  if (typeof cargarProductos === 'function') productos = await cargarProductos();
  if (typeof mostrarProductos === 'function') mostrarProductos(productos);

  // ✅ Mostrar mensaje de agradecimiento
  const contenedor = document.getElementById('form-datos').parentElement;
  let mensajeConfirmacion = document.getElementById("mensaje-confirmacion");

  if (!mensajeConfirmacion) {
    mensajeConfirmacion = document.createElement('p');
    mensajeConfirmacion.id = "mensaje-confirmacion";
    mensajeConfirmacion.style.fontWeight = 'bold';
    mensajeConfirmacion.style.color = '#e8499a';
    contenedor.appendChild(mensajeConfirmacion);
  }

  mensajeConfirmacion.textContent = '¡Gracias por tu pedido! Muy pronto nos pondremos en contacto.';

  // 🕒 Ocultarlo después de 10 segundos
  setTimeout(() => {
    mensajeConfirmacion.textContent = '';
  }, 10000);

  // Resetear el formulario de cliente
  this.reset();
});

function cambiarCantidad(id, cambio) {
  // Soporta ids con variación: "P002-rosa"
  let baseId = id;
  let variacionId = null;
  if (id.includes('-')) {
    [baseId, variacionId] = id.split('-');
  }

  const producto = productos.find(p => p.id === baseId);
  const item = carrito.find(p => p.id === id);

  if (!producto || !item) return;

  let stock = producto.stock;
  let precio = producto.precio;
  if (variacionId && producto.variaciones && producto.variaciones.length > 0) {
    const variacion = producto.variaciones.find(v => v.id === variacionId);
    if (variacion) {
      stock = variacion.stock;
      if (variacion.precio) precio = variacion.precio;
    }
  }

  const nuevaCantidad = item.cantidad + cambio;

  if (nuevaCantidad < 1) return;
  if (nuevaCantidad > stock) {
    alert('No hay suficiente stock disponible');
    return;
  }

  item.cantidad = nuevaCantidad;
  item.precio = precio; // Asegura que el precio sea el correcto para la variante
  item.subtotal = precio * nuevaCantidad;

  guardarCarrito();
  actualizarCarrito();
}


function guardarCarrito() {
  localStorage.setItem('carrito', JSON.stringify(carrito));
}

function mostrarAlerta() {
  const alerta = document.getElementById('alerta');
  alerta.style.display = 'block';
  setTimeout(() => {
    alerta.style.display = 'none';
  }, 1500);
}

function abrirModal() {
  document.getElementById('modal-carrito').style.display = 'block';
}

function cerrarModal() {
  document.getElementById('modal-carrito').style.display = 'none';
}

function filtrarProductos() {
  const texto = document.getElementById('buscador').value.toLowerCase();
  const productosFiltrados = productos.filter(p => p.nombre.toLowerCase().includes(texto));
  mostrarProductos(productosFiltrados);
}

function ordenarProductos() {
  const filtro = document.getElementById('filtro').value;
  let productosOrdenados = [...productos];

  if (filtro === 'precio-asc') {
    productosOrdenados.sort((a, b) => a.precio - b.precio);
  } else if (filtro === 'precio-desc') {
    productosOrdenados.sort((a, b) => b.precio - a.precio);
  } else if (filtro === 'nombre') {
    productosOrdenados.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  mostrarProductos(productosOrdenados);
}

function mostrarDetalle(id) {
  const producto = productos.find(p => p.id === id);
  if (!producto) return;

  const contenedor = document.getElementById('detalle-producto');

  // Si hay variaciones, usar la primera como seleccionada por defecto
  let imagenPrincipal = producto.imagen;
  let imagenesExtra = '';
  let variacionInicial = null;
  let precioMostrar = producto.precio;

  if (producto.variaciones && producto.variaciones.length > 0) {
    variacionInicial = producto.variaciones[0];
    imagenPrincipal = variacionInicial.imagen || producto.imagen;
    imagenesExtra = variacionInicial.imagenes?.map(src => `<img src="${src}" alt="extra">`).join('') || '';
    precioMostrar = variacionInicial.precio || producto.precio;
  } else {
    imagenesExtra = producto.imagenes?.map(src => `<img src="${src}" alt="extra">`).join('') || '';
  }

  const selectorVariaciones = producto.variaciones
    ? `
      <label for="variacion-${producto.id}">Variación:</label>
      <select id="variacion-${producto.id}" onchange="actualizarStockVariacion('${producto.id}')">
        ${producto.variaciones.map(v => `<option value="${v.id}">${v.nombre}</option>`).join('')}
      </select>
    `
    : '';

  contenedor.innerHTML = `
    <h2>${producto.nombre}</h2>
    <img id="img-detalle-${producto.id}" src="${imagenPrincipal}" alt="${producto.nombre}">
    <p id="precio-detalle-${producto.id}">Precio: $${precioMostrar}</p>
    ${selectorVariaciones}
    <p id="stock-detalle-${producto.id}">Stock: ${variacionInicial ? variacionInicial.stock : producto.stock}</p>
    <p>${producto.descripcion || ''}</p>
    <div id="imagenes-extra-detalle">${imagenesExtra}</div>
    <input type="number" id="detalle-cantidad-${producto.id}" value="1" min="1" max="${variacionInicial ? variacionInicial.stock : producto.stock}">
    <button onclick="agregarDesdeDetalle('${producto.id}')">Agregar al carrito</button>
  `;

  document.getElementById('modal-detalle').style.display = 'block';

  if (producto.variaciones) {
    actualizarStockVariacion(producto.id);
  }
}

// Modifica también actualizarStockVariacion para actualizar las imágenes extra:
function actualizarStockVariacion(productoId) {
  const producto = productos.find(p => p.id === productoId);
  const select = document.getElementById(`variacion-${productoId}`);
  const variacionId = select.value;
  const variacion = producto.variaciones.find(v => v.id === variacionId);

  document.getElementById(`stock-detalle-${productoId}`).innerText = `Stock: ${variacion.stock}`;
  document.getElementById(`detalle-cantidad-${productoId}`).max = variacion.stock;
  document.getElementById(`img-detalle-${productoId}`).src = variacion.imagen || producto.imagen;

  // Actualiza el precio mostrado
  document.getElementById(`precio-detalle-${productoId}`).innerText = `Precio: $${variacion.precio || producto.precio}`;

  // Actualizar imágenes extra si existen en la variación
  const imagenesExtra = variacion.imagenes?.map(src => `<img src="${src}" alt="extra">`).join('') || '';
  document.getElementById('imagenes-extra-detalle').innerHTML = imagenesExtra;
}

async function obtenerProductos() {
  const res = await fetch('./data/productos.json');
  productos = await res.json();
}

// Ocultar el formulario y mostrar un mensaje de confirmación
document.getElementById('form-datos').reset();
document.getElementById('form-datos').style.display = true;

const contenedor = document.getElementById('form-datos').parentElement;
/*const mensajeConfirmacion = document.createElement('p');
mensajeConfirmacion.textContent = '¡Gracias por tu pedido! Muy pronto nos pondremos en contacto.';
mensajeConfirmacion.style.fontWeight = 'bold';
mensajeConfirmacion.style.color = '#e8499a';
contenedor.appendChild(mensajeConfirmacion);*/

// AGREGA ESTA FUNCIÓN PARA CERRAR EL MODAL DETALLE
function cerrarDetalle() {
  document.getElementById('modal-detalle').style.display = 'none';
}

// AGREGA ESTA FUNCIÓN PARA AGREGAR DESDE EL DETALLE
function agregarDesdeDetalle(id) {
  const producto = productos.find(p => p.id === id);
  if (!producto) return;

  let cantidad = 1;
  let stock = producto.stock;
  let variacionId = null;

  // Si hay variaciones, toma la seleccionada
  if (producto.variaciones && producto.variaciones.length > 0) {
    const select = document.getElementById(`variacion-${producto.id}`);
    if (select) {
      variacionId = select.value;
      const variacion = producto.variaciones.find(v => v.id === variacionId);
      if (variacion) stock = variacion.stock;
    }
  }

  const inputCantidad = document.getElementById(`detalle-cantidad-${producto.id}`);
  if (inputCantidad) {
    cantidad = parseInt(inputCantidad.value);
    if (isNaN(cantidad) || cantidad < 1) cantidad = 1;
    if (cantidad > stock) cantidad = stock;
    // Resetea el input a 1 después de agregar
    inputCantidad.value = 1;
  }

  agregarAlCarrito(id, cantidad, variacionId);
  cerrarDetalle();
}
