let productos = [];
let carrito = JSON.parse(localStorage.getItem('carrito')) || [];

// Variable global para guardar el total con descuento
let totalConDescuento = null;
let porcentajeDescuento = null;

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
function agregarAlCarrito(id, cantidadManual, variacionSeleccion = null) {
  let producto = productos.find(p => p.id === id);
  let nombre = producto.nombre;
  let precio = producto.precio;
  let stock = producto.stock;
  let idCarrito = id;

  // Si hay variación, ajusta los datos
  if (
    variacionSeleccion &&
    producto.variaciones &&
    producto.variaciones.length > 0
  ) {
    const variacion = producto.variaciones.find(v =>
      v.nombre === variacionSeleccion.nombre
    );
    if (variacion) {
      nombre += ` (${variacion.nombre})`;
      stock = variacion.stock || variacion.Stock;
      idCarrito = `${id}-${variacion.nombre}`;
      if (variacion.precio) precio = variacion.precio;
    }
  }

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
    productoExistente.precio = precio;
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

  if (typeof porcentajeDescuento === 'number' && porcentajeDescuento > 0) {
    const descuento = (total * porcentajeDescuento) / 100;
    totalConDescuento = total - descuento;
    document.getElementById('total').textContent = `Total: $${totalConDescuento.toFixed(2)}`;
    document.getElementById('descuento-aplicado').textContent = `Descuento aplicado: -$${descuento.toFixed(2)}`;
  } else {
    totalConDescuento = null;
    document.getElementById('total').textContent = `Total: $${total}`;
    document.getElementById('descuento-aplicado').textContent = '';
  }

  document.getElementById('contador-carrito').textContent = carrito.length;

  if (carrito.length === 0) {
    document.getElementById('descuento-aplicado').textContent = '';
    document.getElementById('mensaje-cupon').textContent = '';
    totalConDescuento = null;
    porcentajeDescuento = null;
  }
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

  const totalSinDescuento = carrito.reduce((acc, item) => acc + item.subtotal, 0);
  let total = totalSinDescuento;

  if (typeof porcentajeDescuento === 'number' && porcentajeDescuento > 0) {
    const descuento = (totalSinDescuento * porcentajeDescuento) / 100;
    total = totalSinDescuento - descuento;
    mensaje += `\nDescuento aplicado: ${porcentajeDescuento}% (-$${descuento.toFixed(2)})\n`;
  }

  mensaje += `Total: $${total.toFixed(2)}\n\n`;

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
  // Soporta ids con variacion: "P002-rosa" o "P002-Albedo-Mixto"
  let baseId = id;
  let variacion1 = null;
  let variacion2 = null;

  // Extrae variaciones del id del carrito
  const partes = id.split('-');
  baseId = partes[0];
  if (partes.length === 3) {
    variacion1 = partes[1];
    variacion2 = partes[2];
  } else if (partes.length === 2) {
    variacion1 = partes[1];
  }

  const producto = productos.find(p => p.id === baseId);
  const item = carrito.find(p => p.id === id);

  if (!producto || !item) return;

  let stock = producto.stock;
  let precio = producto.precio;
  if (producto.variaciones && producto.variaciones.length > 0 && variacion1) {
    const variacion = producto.variaciones.find(v =>
      v.variacion1 === variacion1 && (variacion2 ? v.variacion2 === variacion2 : true)
    );
    if (variacion) {
      stock = variacion.Stock || variacion.stock || producto.stock;
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
  let variaciones = producto.variaciones || [];
  let variacionInicial = variaciones[0] || null;
  let precioMostrar = variacionInicial ? variacionInicial.precio : producto.precio;
  let stockMostrar = variacionInicial ? (variacionInicial.stock || variacionInicial.Stock) : producto.stock;

  // Selector de variantes por nombre
  let selectorVariaciones = '';
  if (variaciones.length > 0) {
    selectorVariaciones = `
      <label for="variacion-${producto.id}">Variante:</label>
      <select id="variacion-${producto.id}" onchange="actualizarStockVariacion('${producto.id}')">
        ${variaciones.map(v => `<option value="${v.nombre}">${v.nombre}</option>`).join('')}
      </select>
    `;
  }

  contenedor.innerHTML = `
    <h2>${producto.nombre}</h2>
    <div class="detalle-flex">
      <div class="carrusel-imagen">
        <img id="img-detalle-carrusel" src="${producto.imagen}" alt="${producto.nombre}">
      </div>
      <div class="detalle-controles">
        <p id="precio-detalle-${producto.id}">Precio: $${precioMostrar}</p>
        ${selectorVariaciones}
        <p id="stock-detalle-${producto.id}">Stock: ${stockMostrar}</p>
        <input type="number" id="detalle-cantidad-${producto.id}" value="1" min="1" max="${stockMostrar}">
        <button onclick="agregarDesdeDetalle('${producto.id}')">Agregar al carrito</button>
      </div>
    </div>
    <p>${(producto.descripcion || '').replace(/\n/g, '<br>')}</p>
  `;

  document.getElementById('modal-detalle').style.display = 'block';

  actualizarStockVariacion(producto.id);
}

function actualizarStockVariacion(productoId) {
  const producto = productos.find(p => p.id === productoId);
  if (!producto || !producto.variaciones) return;

  const select = document.getElementById(`variacion-${productoId}`);
  const nombreSeleccionado = select ? select.value : null;
  const variacion = producto.variaciones.find(v => v.nombre === nombreSeleccionado) || producto.variaciones[0];

  // Actualiza stock y precio
  document.getElementById(`stock-detalle-${productoId}`).innerText = `Stock: ${variacion.stock || variacion.Stock || producto.stock}`;
  document.getElementById(`detalle-cantidad-${productoId}`).max = variacion.stock || variacion.Stock || producto.stock;
  document.getElementById(`precio-detalle-${productoId}`).innerText = `Precio: $${variacion.precio || producto.precio}`;

  // Actualiza imagen si corresponde
  if (variacion.imagen) {
    document.getElementById(`img-detalle-carrusel`).src = variacion.imagen;
  } else {
    document.getElementById(`img-detalle-carrusel`).src = producto.imagen;
  }
}

function agregarDesdeDetalle(id) {
  const producto = productos.find(p => p.id === id);
  if (!producto) return;

  let cantidad = 1;
  let stock = producto.stock;
  let nombreVariacion = null;

  // Si hay variaciones, toma la seleccionada
  if (producto.variaciones && producto.variaciones.length > 0) {
    const select = document.getElementById(`variacion-${producto.id}`);
    nombreVariacion = select ? select.value : null;
    const variacion = producto.variaciones.find(v => v.nombre === nombreVariacion);
    if (variacion) stock = variacion.stock || variacion.Stock || producto.stock;
  }

  const inputCantidad = document.getElementById(`detalle-cantidad-${producto.id}`);
  if (inputCantidad) {
    cantidad = parseInt(inputCantidad.value);
    if (isNaN(cantidad) || cantidad < 1) cantidad = 1;
    if (cantidad > stock) cantidad = stock;
    inputCantidad.value = 1;
  }

  // Pasa la variación seleccionada por nombre
  agregarAlCarrito(id, cantidad, nombreVariacion ? { nombre: nombreVariacion } : null);
  cerrarDetalle();
}

// Modifica agregarAlCarrito para aceptar la variación por nombre
function agregarAlCarrito(id, cantidadManual, variacionSeleccion = null) {
  let producto = productos.find(p => p.id === id);
  let nombre = producto.nombre;
  let precio = producto.precio;
  let stock = producto.stock;
  let idCarrito = id;

  // Si hay variación, ajusta los datos
  if (
    variacionSeleccion &&
    producto.variaciones &&
    producto.variaciones.length > 0
  ) {
    const variacion = producto.variaciones.find(v =>
      v.nombre === variacionSeleccion.nombre
    );
    if (variacion) {
      nombre += ` (${variacion.nombre})`;
      stock = variacion.stock || variacion.Stock;
      idCarrito = `${id}-${variacion.nombre}`;
      if (variacion.precio) precio = variacion.precio;
    }
  }

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
    productoExistente.precio = precio;
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

  if (typeof porcentajeDescuento === 'number' && porcentajeDescuento > 0) {
    const descuento = (total * porcentajeDescuento) / 100;
    totalConDescuento = total - descuento;
    document.getElementById('total').textContent = `Total: $${totalConDescuento.toFixed(2)}`;
    document.getElementById('descuento-aplicado').textContent = `Descuento aplicado: -$${descuento.toFixed(2)}`;
  } else {
    totalConDescuento = null;
    document.getElementById('total').textContent = `Total: $${total}`;
    document.getElementById('descuento-aplicado').textContent = '';
  }

  document.getElementById('contador-carrito').textContent = carrito.length;

  if (carrito.length === 0) {
    document.getElementById('descuento-aplicado').textContent = '';
    document.getElementById('mensaje-cupon').textContent = '';
    totalConDescuento = null;
    porcentajeDescuento = null;
  }
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

  const totalSinDescuento = carrito.reduce((acc, item) => acc + item.subtotal, 0);
  let total = totalSinDescuento;

  if (typeof porcentajeDescuento === 'number' && porcentajeDescuento > 0) {
    const descuento = (totalSinDescuento * porcentajeDescuento) / 100;
    total = totalSinDescuento - descuento;
    mensaje += `\nDescuento aplicado: ${porcentajeDescuento}% (-$${descuento.toFixed(2)})\n`;
  }

  mensaje += `Total: $${total.toFixed(2)}\n\n`;

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
  // Soporta ids con variacion: "P002-rosa" o "P002-Albedo-Mixto"
  let baseId = id;
  let variacion1 = null;
  let variacion2 = null;

  // Extrae variaciones del id del carrito
  const partes = id.split('-');
  baseId = partes[0];
  if (partes.length === 3) {
    variacion1 = partes[1];
    variacion2 = partes[2];
  } else if (partes.length === 2) {
    variacion1 = partes[1];
  }

  const producto = productos.find(p => p.id === baseId);
  const item = carrito.find(p => p.id === id);

  if (!producto || !item) return;

  let stock = producto.stock;
  let precio = producto.precio;
  if (producto.variaciones && producto.variaciones.length > 0 && variacion1) {
    const variacion = producto.variaciones.find(v =>
      v.variacion1 === variacion1 && (variacion2 ? v.variacion2 === variacion2 : true)
    );
    if (variacion) {
      stock = variacion.Stock || variacion.stock || producto.stock;
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

let imagenesCarrusel = [];
let indiceImagenCarrusel = 0;

// AGREGA ESTA FUNCIÓN PARA CERRAR EL MODAL DETALLE
function cerrarDetalle() {
  document.getElementById('modal-detalle').style.display = 'none';
}

// Carrusel Banner
document.addEventListener('DOMContentLoaded', () => {
  const slides = document.querySelectorAll('.banner-slide');
  const puntosCont = document.getElementById('banner-puntos');
  let actual = 0;

  // Crear puntos
  slides.forEach((_, i) => {
    const punto = document.createElement('span');
    punto.onclick = () => mostrarSlide(i);
    puntosCont.appendChild(punto);
  });

  function mostrarSlide(idx) {
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === idx);
      puntosCont.children[i].classList.toggle('activo', i === idx);
    });
    actual = idx;
  }

  document.getElementById('banner-prev').onclick = () => {
    mostrarSlide((actual - 1 + slides.length) % slides.length);
  };
  document.getElementById('banner-next').onclick = () => {
    mostrarSlide((actual + 1) % slides.length);
  };

  mostrarSlide(0);

  // Auto-avance cada 6 segundos
  setInterval(() => {
    mostrarSlide((actual + 1) % slides.length);
  }, 6000);
});

// Modifica la función aplicarDescuento en cupones.js así:
function aplicarDescuento(porcentaje) {
  porcentajeDescuento = porcentaje;
  actualizarCarrito();
}

