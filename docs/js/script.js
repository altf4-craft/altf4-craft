let productos = [];
let carrito = JSON.parse(localStorage.getItem('carrito')) || [];

document.addEventListener('DOMContentLoaded', async () => {
  productos = await cargarProductos(); // ahora sí asigna correctamente
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
      <input type="number" id="cantidad-${producto.id}" value="1" min="1" max="${producto.stock}">
      <button onclick="agregarAlCarrito('${producto.id}')">Agregar</button>
    `;

    if (producto.stock <= 0) {
      div.querySelector("button").disabled = true;
      div.querySelector("input").disabled = true;
      div.querySelector("button").textContent = "Sin stock";
    }

    catalogo.appendChild(div);
  });
}


function agregarAlCarrito(id) {
  const producto = productos.find(p => p.id === id);
  const cantidad = parseInt(document.getElementById('cantidad-' + id).value);

  if (!producto || cantidad <= 0 || isNaN(cantidad)) {
    alert("Cantidad inválida o producto no encontrado");
    return;
  }

  const productoExistente = carrito.find(item => item.id === id);

  if (productoExistente) {
    productoExistente.cantidad += cantidad;
    productoExistente.subtotal += producto.precio * cantidad;
  } else {
    carrito.push({
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad: cantidad,
      subtotal: producto.precio * cantidad
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
  const producto = productos.find(p => p.id === id);
  const item = carrito.find(p => p.id === id);

  if (!producto || !item) return;

  const nuevaCantidad = item.cantidad + cambio;

  if (nuevaCantidad < 1) return;
  if (nuevaCantidad > producto.stock) {
    alert('No hay suficiente stock disponible');
    return;
  }

  item.cantidad = nuevaCantidad;
  item.subtotal = item.precio * nuevaCantidad;

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

  const imagenesExtra = producto.imagenes?.map(src => `<img src="${src}" alt="extra">`).join('') || '';

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
    <img id="img-detalle-${producto.id}" src="${producto.imagen}" alt="${producto.nombre}">
    <p>Precio: $${producto.precio}</p>
    ${selectorVariaciones}
    <p id="stock-detalle-${producto.id}">Stock: ${producto.stock}</p>
    <p>${producto.descripcion || ''}</p>
    <div>${imagenesExtra}</div>
    <input type="number" id="detalle-cantidad-${producto.id}" value="1" min="1" max="${producto.stock}">
    <button onclick="agregarDesdeDetalle('${producto.id}')">Agregar al carrito</button>
  `;

  document.getElementById('modal-detalle').style.display = 'block';

  if (producto.variaciones) {
    actualizarStockVariacion(producto.id);
  }
}

async function agregarDesdeDetalle(id) {
  const producto = productos.find(p => p.id === id);
  if (!producto) return;

  const cantidad = parseInt(document.getElementById(`detalle-cantidad-${id}`).value);
  if (cantidad <= 0 || isNaN(cantidad)) return;

  let variacionSeleccionada = null;
  let nombreFinal = producto.nombre;
  let variacionId = null;

  if (producto.variaciones) {
    variacionId = document.getElementById(`variacion-${id}`).value;
    variacionSeleccionada = producto.variaciones.find(v => v.id === variacionId);
    if (!variacionSeleccionada || cantidad > variacionSeleccionada.stock) {
      alert("No hay suficiente stock para esa variación.");
      return;
    }
    nombreFinal += ` (${variacionSeleccionada.nombre})`;
  } else if (cantidad > producto.stock) {
    alert("No hay suficiente stock.");
    return;
  }

  // Descontar stock en el backend
  try {
    await fetch('http://localhost:3000/api/restar-stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: producto.id,
        variacionId: variacionId,
        cantidad: cantidad
      })
    });
  } catch (err) {
    alert("Error al actualizar stock");
    return;
  }

  const itemId = variacionId ? `${id}-${variacionId}` : id;
  const existente = carrito.find(item => item.id === itemId);

  if (existente) {
    existente.cantidad += cantidad;
    existente.subtotal += producto.precio * cantidad;
  } else {
    carrito.push({
      id: itemId,
      nombre: nombreFinal,
      precio: producto.precio,
      cantidad: cantidad,
      subtotal: producto.precio * cantidad
    });
  }

  guardarCarrito();
  actualizarCarrito();
  mostrarAlerta();
  cerrarDetalle();

  // Actualizar los datos del producto en memoria
  await obtenerProductos();
}

function cerrarDetalle() {
  document.getElementById('modal-detalle').style.display = 'none';
}

function actualizarStockVariacion(productoId) {
  const producto = productos.find(p => p.id === productoId);
  const select = document.getElementById(`variacion-${productoId}`);
  const variacionId = select.value;
  const variacion = producto.variaciones.find(v => v.id === variacionId);

  document.getElementById(`stock-detalle-${productoId}`).innerText = `Stock: ${variacion.stock}`;
  document.getElementById(`detalle-cantidad-${productoId}`).max = variacion.stock;
  document.getElementById(`img-detalle-${productoId}`).src = variacion.imagen || producto.imagen;
}

async function obtenerProductos() {
  const res = await fetch('http://localhost:3000/productos.json');
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
