let productos = [];
let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

// Variable global para guardar el total con descuento
let totalConDescuento = null;
let porcentajeDescuento = null;

document.addEventListener("DOMContentLoaded", async () => {
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
  const catalogo = document.getElementById("catalogo");
  catalogo.innerHTML = "";

  listaProductos.forEach((producto) => {
    const div = document.createElement("div");
    div.className = "producto";
    div.innerHTML = `
      <img src="${producto.imagen}" alt="${
      producto.nombre
    }" onclick="mostrarDetalle('${producto.id}')">
      <h2>${producto.nombre}</h2>
      <p>Precio: $${producto.precio}</p>
      <p>3 cuotas de $${(producto.precio / 3).toFixed(2)}</p>
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
  let producto = productos.find((p) => p.id === id);
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
    const variacion = producto.variaciones.find(
      (v) => v.nombre === variacionSeleccion.nombre
    );
    if (variacion) {
      nombre += ` (${variacion.nombre})`;
      stock = variacion.stock || variacion.Stock;
      idCarrito = `${id}-${variacion.nombre}`;
      if (variacion.precio) precio = variacion.precio;
    }
  }

  let cantidad =
    cantidadManual !== undefined
      ? cantidadManual
      : parseInt(document.getElementById("cantidad-" + id).value);

  if (!producto || cantidad <= 0 || isNaN(cantidad)) {
    alert("Cantidad inválida o producto no encontrado");
    return;
  }

  // Busca por idCarrito (id+variacion)
  const productoExistente = carrito.find((item) => item.id === idCarrito);

  if (productoExistente) {
    if (productoExistente.cantidad + cantidad > stock) {
      alert("No hay suficiente stock disponible");
      return;
    }
    productoExistente.cantidad += cantidad;
    productoExistente.precio = precio;
    productoExistente.subtotal = productoExistente.cantidad * precio;
  } else {
    if (cantidad > stock) {
      alert("No hay suficiente stock disponible");
      return;
    }
    carrito.push({
      id: idCarrito,
      nombre: nombre,
      precio: precio,
      cantidad: cantidad,
      subtotal: precio * cantidad,
    });
  }

  guardarCarrito();
  actualizarCarrito();
  mostrarAlerta();
}

function mostrarDetalle(id) {
  const producto = productos.find((p) => p.id === id);
  if (!producto) return;

  const contenedor = document.getElementById("detalle-producto");

  // Prepara el array de imágenes (principal + extras, sin repetir)
  let imagenes = [];
  if (producto.imagen) imagenes.push(producto.imagen);
  if (producto.imagenes && producto.imagenes.length > 0) {
    producto.imagenes.forEach((src) => {
      if (!imagenes.includes(src)) imagenes.push(src);
    });
  }

  // Estado del carrusel
  let indiceActual = 0;

  // Función para renderizar la imagen y flechas
  function renderCarrusel() {
    let flechaIzq = "";
    let flechaDer = "";
    if (imagenes.length > 1) {
      flechaIzq = `<span id="flecha-izq" style="cursor:pointer;font-size:2em;margin-right:10px;">&#8592;</span>`;
      flechaDer = `<span id="flecha-der" style="cursor:pointer;font-size:2em;margin-left:10px;">&#8594;</span>`;
    }
    return `
      <div style="display:flex;align-items:center;justify-content:center;">
        ${flechaIzq}
        <img id="img-carrusel-modal" src="${imagenes[indiceActual]}" alt="extra" style="max-width:320px;max-height:320px;object-fit:contain;display:block;">
        ${flechaDer}
      </div>
    `;
  }

  // Selector de variantes (igual que antes)
  let variaciones = producto.variaciones || [];
  let variacionInicial = variaciones[0] || null;
  let precioMostrar = variacionInicial
    ? variacionInicial.precio
    : producto.precio;
  let stockMostrar = variacionInicial
    ? variacionInicial.stock || variacionInicial.Stock
    : producto.stock;
  let selectorVariaciones = "";
  if (variaciones.length > 0) {
    selectorVariaciones = `
      <label for="variacion-${producto.id}">Variante:</label>
      <select id="variacion-${
        producto.id
      }" onchange="actualizarStockVariacion('${producto.id}')">
        ${variaciones
          .map((v) => `<option value="${v.nombre}">${v.nombre}</option>`)
          .join("")}
      </select>
    `;
  }

  contenedor.innerHTML = `
    <h2>${producto.nombre}</h2>
    <div class="detalle-flex">
      <div class="carrusel-imagen" id="carrusel-imagen-modal">
        ${renderCarrusel()}
      </div>
      <div class="detalle-controles">
        <p id="precio-detalle-${producto.id}">Precio: $${precioMostrar}</p>
        ${selectorVariaciones}
        <p id="stock-detalle-${producto.id}">Stock: ${stockMostrar}</p>
        <input type="number" id="detalle-cantidad-${
          producto.id
        }" value="1" min="1" max="${stockMostrar}">
        <button onclick="agregarDesdeDetalle('${
          producto.id
        }')">Agregar al carrito</button>
      </div>
    </div>
    <p>${(producto.descripcion || "").replace(/\n/g, "<br>")}</p>
  `;

  document.getElementById("modal-detalle").style.display = "block";

  // Flechas: solo si hay más de una imagen
  if (imagenes.length > 1) {
    document.getElementById("flecha-izq").onclick = () => {
      indiceActual = (indiceActual - 1 + imagenes.length) % imagenes.length;
      document.getElementById("carrusel-imagen-modal").innerHTML =
        renderCarrusel();
      addFlechas(); // vuelve a asignar eventos
    };
    document.getElementById("flecha-der").onclick = () => {
      indiceActual = (indiceActual + 1) % imagenes.length;
      document.getElementById("carrusel-imagen-modal").innerHTML =
        renderCarrusel();
      addFlechas();
    };
  }

  function addFlechas() {
    if (imagenes.length > 1) {
      if (document.getElementById("flecha-izq")) {
        document.getElementById("flecha-izq").onclick = () => {
          indiceActual = (indiceActual - 1 + imagenes.length) % imagenes.length;
          document.getElementById("carrusel-imagen-modal").innerHTML =
            renderCarrusel();
          addFlechas();
        };
      }
      if (document.getElementById("flecha-der")) {
        document.getElementById("flecha-der").onclick = () => {
          indiceActual = (indiceActual + 1) % imagenes.length;
          document.getElementById("carrusel-imagen-modal").innerHTML =
            renderCarrusel();
          addFlechas();
        };
      }
    }
  }
  addFlechas();

  actualizarStockVariacion(producto.id);
}

function actualizarStockVariacion(productoId) {
  const producto = productos.find((p) => p.id === productoId);
  if (!producto || !producto.variaciones) return;

  const select = document.getElementById(`variacion-${productoId}`);
  const nombreSeleccionado = select ? select.value : null;
  const variacion =
    producto.variaciones.find((v) => v.nombre === nombreSeleccionado) ||
    producto.variaciones[0];

  // Actualiza stock y precio
  document.getElementById(`stock-detalle-${productoId}`).innerText = `Stock: ${
    variacion.stock || variacion.Stock || producto.stock
  }`;
  document.getElementById(`detalle-cantidad-${productoId}`).max =
    variacion.stock || variacion.Stock || producto.stock;
  document.getElementById(
    `precio-detalle-${productoId}`
  ).innerText = `Precio: $${variacion.precio || producto.precio}`;

  // Actualiza imagen si corresponde
  if (variacion.imagen) {
    document.getElementById(`img-detalle-carrusel`).src = variacion.imagen;
  } else {
    document.getElementById(`img-detalle-carrusel`).src = producto.imagen;
  }
}

function agregarDesdeDetalle(id) {
  const producto = productos.find((p) => p.id === id);
  if (!producto) return;

  let cantidad = 1;
  let stock = producto.stock;
  let nombreVariacion = null;

  // Si hay variaciones, toma la seleccionada
  if (producto.variaciones && producto.variaciones.length > 0) {
    const select = document.getElementById(`variacion-${producto.id}`);
    nombreVariacion = select ? select.value : null;
    const variacion = producto.variaciones.find(
      (v) => v.nombre === nombreVariacion
    );
    if (variacion) stock = variacion.stock || variacion.Stock || producto.stock;
  }

  const inputCantidad = document.getElementById(
    `detalle-cantidad-${producto.id}`
  );
  if (inputCantidad) {
    cantidad = parseInt(inputCantidad.value);
    if (isNaN(cantidad) || cantidad < 1) cantidad = 1;
    if (cantidad > stock) cantidad = stock;
    inputCantidad.value = 1;
  }

  // Pasa la variación seleccionada por nombre
  agregarAlCarrito(
    id,
    cantidad,
    nombreVariacion ? { nombre: nombreVariacion } : null
  );
  cerrarDetalle();
}

function eliminarDelCarrito(id) {
  carrito = carrito.filter((item) => item.id !== id);
  guardarCarrito();
  actualizarCarrito();
}

function actualizarCarrito() {
  const lista = document.getElementById("lista-carrito");
  lista.innerHTML = "";

  carrito.forEach((item) => {
    const producto = productos.find((p) => p.id === item.id);
    const maxStock = producto ? producto.stock : item.cantidad;

    const li = document.createElement("li");
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

  // Obtenemos el elemento del mensaje para actualizarlo
  const mensajeCupon = document.getElementById("mensaje-cupon");
  const TOPE_DESCUENTO = 20000; // <-- 1. Definimos el tope máximo

  if (typeof porcentajeDescuento === "number" && porcentajeDescuento > 0) {
    // 2. Calculamos el descuento basado en el porcentaje
    const descuentoCalculado = (total * porcentajeDescuento) / 100;

    let descuentoAplicado = descuentoCalculado;
    let mensajeTope = "";

    // 3. Verificamos si el descuento supera el tope
    if (descuentoCalculado > TOPE_DESCUENTO) {
      descuentoAplicado = TOPE_DESCUENTO; // Lo limitamos al tope
      mensajeTope = ` (tope de $${TOPE_DESCUENTO} aplicado)`;
    }

    // 4. Calculamos el total final usando el descuento ya limitado
    totalConDescuento = total - descuentoAplicado;
    document.getElementById(
      "total"
    ).textContent = `Total: $${totalConDescuento.toFixed(2)}`;
    // Mostramos el descuento real aplicado
    document.getElementById(
      "descuento-aplicado"
    ).textContent = `Descuento aplicado: -$${descuentoAplicado.toFixed(2)}`;

    // 5. Actualizamos el mensaje del cupón para reflejar el tope si fue necesario
    if (mensajeCupon) {
      mensajeCupon.textContent = `✅ Se aplicó un ${porcentajeDescuento}% de descuento${mensajeTope}.`;
      mensajeCupon.style.color = "green";
    }
  } else {
    totalConDescuento = null;
    document.getElementById("total").textContent = `Total: $${total}`;
    document.getElementById("descuento-aplicado").textContent = "";
  }

  document.getElementById("contador-carrito").textContent = carrito.length;

  if (carrito.length === 0) {
    document.getElementById("descuento-aplicado").textContent = "";
    // Limpiamos el mensaje si el carrito se vacía
    if (mensajeCupon) mensajeCupon.textContent = "";
    totalConDescuento = null;
    porcentajeDescuento = null;
  }
}

document
  .getElementById("form-datos")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    const datos = {};
    formData.forEach((valor, clave) => (datos[clave] = valor));

    if (carrito.length === 0) {
      alert("Tu carrito está vacío.");
      return;
    }

    // --- CÁLCULO DE TOTAL (Esto queda igual) ---
    const totalSinDescuento = carrito.reduce(
      (acc, item) => acc + item.subtotal,
      0
    );
    let totalFinal = totalSinDescuento;
    let descuentoAplicado = 0;
    const TOPE_DESCUENTO = 20000;

    if (typeof porcentajeDescuento === "number" && porcentajeDescuento > 0) {
      const descuentoCalculado =
        (totalSinDescuento * porcentajeDescuento) / 100;
      descuentoAplicado =
        descuentoCalculado > TOPE_DESCUENTO
          ? TOPE_DESCUENTO
          : descuentoCalculado;
      totalFinal = totalSinDescuento - descuentoAplicado;
    }

    // --- VALIDACIÓN DE MÍNIMOS (¡Aquí llamamos a la nueva función!) ---

    const envioSeleccionado = datos.envio;
    const errorMensaje = validarMinimoCompra(totalFinal, envioSeleccionado);

    // Si la función devolvió un mensaje de error, lo mostramos y detenemos
    if (errorMensaje) {
      alert(errorMensaje);
      return;
    }

    // --- FIN DE VALIDACIÓN ---

    // El resto de la función sigue exactamente igual...
    let mensaje = "¡Hola! Quiero realizar un pedido:\n\n";

    carrito.forEach((item) => {
      mensaje += `- ${item.nombre} x${item.cantidad} ($${item.subtotal})\n`;
    });

    if (descuentoAplicado > 0) {
      mensaje += `\nDescuento aplicado: ${porcentajeDescuento}% (-$${descuentoAplicado.toFixed(
        2
      )})\n`;
    }

    mensaje += `Total: $${totalFinal.toFixed(2)}\n\n`;

    // (El resto del código para armar el mensaje de datos, WhatsApp, etc. sigue igual)
    // ...

    // 🧾 Datos del cliente
    mensaje += "Datos del cliente:\n";
    mensaje += `Cliente: ${datos.nombre || "-"}\n`;
    mensaje += `DNI: ${datos.dni || "-"}\n`;
    mensaje += `Email: ${datos.email || "-"}\n`;
    mensaje += `Teléfono: ${datos.celular || datos.telefono || "-"}\n`;
    mensaje += `Método de envío: ${datos.envio || "-"}\n`;
    mensaje += `¿Quién recibe?: ${datos.recibe || "-"}\n`;
    mensaje += `Método de pago: ${datos.pago || "-"}\n`;
    mensaje += `¿Autoriza publicación?: ${datos.publicidad || "-"}\n`;
    mensaje += `¿Factura C?: ${datos.factura || "-"}\n`; // 🏠 Datos de envío (si aplica)

    if (datos.envio && datos.envio.toLowerCase().includes("correo")) {
      mensaje += "\nDatos de envío:\n";
      mensaje += `Envío por: ${datos.envioPor || "-"}\n`;
      mensaje += `Tipo de envío: ${datos.tipoEnvio || "-"}\n`;
      mensaje += `Dirección: ${datos.calle || "-"} ${datos.numero || ""}\n`;
      if (datos.piso || datos.departamento)
        mensaje += `Piso/Depto: ${datos.piso || ""}${
          datos.departamento ? " / " + datos.departamento : ""
        }\n`;
      if (datos.entreCalles) mensaje += `Entre calles: ${datos.entreCalles}\n`;
      mensaje += `Localidad: ${datos.localidad || "-"}\n`;
      mensaje += `Provincia: ${datos.provincia || "-"}\n`;
      mensaje += `Código Postal: ${datos.codigoPostal || "-"}\n`;
      if (datos.comentarios) mensaje += `Comentarios: ${datos.comentarios}\n`;
    } // ✅ Enviar por WhatsApp

    const telefonoVendedor = "5491126116298";
    const urlWhatsapp = `https://wa.me/${telefonoVendedor}?text=${encodeURIComponent(
      mensaje
    )}`;
    window.open(urlWhatsapp, "_blank"); // 🔄 Limpiar carrito y formulario

    localStorage.removeItem("carrito");
    carrito = [];
    actualizarCarrito();
    if (typeof cargarProductos === "function")
      productos = await cargarProductos();
    if (typeof mostrarProductos === "function") mostrarProductos(productos); // ✅ Confirmación visual

    const contenedor = document.getElementById("form-datos").parentElement;
    let mensajeConfirmacion = document.getElementById("mensaje-confirmacion");
    if (!mensajeConfirmacion) {
      mensajeConfirmacion = document.createElement("p");
      mensajeConfirmacion.id = "mensaje-confirmacion";
      mensajeConfirmacion.style.fontWeight = "bold";
      mensajeConfirmacion.style.color = "#e8499a";
      contenedor.appendChild(mensajeConfirmacion);
    }
    mensajeConfirmacion.textContent =
      "¡Gracias por tu pedido! Muy pronto nos pondremos en contacto.";

    setTimeout(() => {
      mensajeConfirmacion.textContent = "";
    }, 10000);

    this.reset();
  });

function cambiarCantidad(id, cambio) {
  // El ID del carrito es (ID_PRODUCTO_BASE)-(NOMBRE_VARIACIÓN)
  const item = carrito.find((p) => p.id === id);
  if (!item) return; // Extraer el ID base del producto (ej: 'P002' de 'P002-x1 unidad (2 CM)')

  const baseId = id.split("-")[0];
  const producto = productos.find((p) => p.id === baseId);
  if (!producto) return;

  let stock = producto.stock;
  let precio = producto.precio; // --- Lógica de Variación Corregida --- // 1. Si el ID tiene un guión, implica que hay una variación.

  if (
    id.includes("-") &&
    producto.variaciones &&
    producto.variaciones.length > 0
  ) {
    // 2. Extraemos el nombre completo de la variación del ID del carrito.
    const nombreVariacion = id.substring(baseId.length + 1); // 3. Buscamos la variación dentro del array del producto usando la propiedad 'nombre'.

    const variacion = producto.variaciones.find(
      (v) => v.nombre === nombreVariacion
    );

    if (variacion) {
      // 4. Asignamos correctamente el stock y el precio de la variación.
      stock = variacion.Stock || variacion.stock || producto.stock;
      if (variacion.precio) precio = variacion.precio;
    }
  } // --- Fin Lógica de Variación ---
  const nuevaCantidad = item.cantidad + cambio;

  if (nuevaCantidad < 1) return;
  if (nuevaCantidad > stock) {
    alert("No hay suficiente stock disponible");
    return;
  }

  item.cantidad = nuevaCantidad;
  item.precio = precio; // Esto asegura que el precio de la variación se mantenga.
  item.subtotal = precio * nuevaCantidad; // Recalcula subtotal con el precio correcto.

  guardarCarrito();
  actualizarCarrito();
}

function guardarCarrito() {
  localStorage.setItem("carrito", JSON.stringify(carrito));
}

function mostrarAlerta() {
  const alerta = document.getElementById("alerta");
  alerta.style.display = "block";
  setTimeout(() => {
    alerta.style.display = "none";
  }, 1500);
}

function abrirModal() {
  document.getElementById("modal-carrito").style.display = "block";
}

function cerrarModal() {
  document.getElementById("modal-carrito").style.display = "none";
}

function filtrarProductos() {
  const texto = document.getElementById("buscador").value.toLowerCase();
  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(texto)
  );
  mostrarProductos(productosFiltrados);
}

function ordenarProductos() {
  const filtro = document.getElementById("filtro").value;
  let productosOrdenados = [...productos];

  if (filtro === "precio-asc") {
    productosOrdenados.sort((a, b) => a.precio - b.precio);
  } else if (filtro === "precio-desc") {
    productosOrdenados.sort((a, b) => b.precio - a.precio);
  } else if (filtro === "nombre") {
    productosOrdenados.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  mostrarProductos(productosOrdenados);
}

let imagenesCarrusel = [];
let indiceImagenCarrusel = 0;

// AGREGA ESTA FUNCIÓN PARA CERRAR EL MODAL DETALLE
function cerrarDetalle() {
  document.getElementById("modal-detalle").style.display = "none";
}

// Carrusel Banner
document.addEventListener("DOMContentLoaded", () => {
  const slides = document.querySelectorAll(".banner-slide");
  const puntosCont = document.getElementById("banner-puntos");
  let actual = 0;

  // Crear puntos
  slides.forEach((_, i) => {
    const punto = document.createElement("span");
    punto.onclick = () => mostrarSlide(i);
    puntosCont.appendChild(punto);
  });

  function mostrarSlide(idx) {
    slides.forEach((slide, i) => {
      slide.classList.toggle("active", i === idx);
      puntosCont.children[i].classList.toggle("activo", i === idx);
    });
    actual = idx;
  }

  document.getElementById("banner-prev").onclick = () => {
    mostrarSlide((actual - 1 + slides.length) % slides.length);
  };
  document.getElementById("banner-next").onclick = () => {
    mostrarSlide((actual + 1) % slides.length);
  };

  mostrarSlide(0);

  // Auto-avance cada 6 segundos
  setInterval(() => {
    mostrarSlide((actual + 1) % slides.length);
  }, 8000);
});

// Modifica la función aplicarDescuento en cupones.js así:
function aplicarDescuento(porcentaje) {
  porcentajeDescuento = porcentaje;
  actualizarCarrito();
}

document.addEventListener("DOMContentLoaded", function () {
  const envioSelect = document.querySelector('select[name="envio"]');
  const pagoSelect = document.querySelector('select[name="pago"]');

  function actualizarOpcionesPago() {
    // Verifica si ya existe la opción "Efectivo"
    let efectivoOption = Array.from(pagoSelect.options).find(
      (opt) => opt.value === "Efectivo"
    );

    if (
      envioSelect.value === "Punto de retiro" ||
      envioSelect.value === "Evento"
    ) {
      // Si no existe, la agrega
      if (!efectivoOption) {
        const option = document.createElement("option");
        option.value = "Efectivo";
        option.textContent = "Efectivo";
        pagoSelect.appendChild(option);
      }
    } else {
      // Si existe y no corresponde, la elimina
      if (efectivoOption) {
        pagoSelect.removeChild(efectivoOption);
      }
      // Si el usuario tenía seleccionado "Efectivo", lo cambia a la primera opción
      if (pagoSelect.value === "Efectivo") {
        pagoSelect.selectedIndex = 0;
      }
    }
  }

  envioSelect.addEventListener("change", actualizarOpcionesPago);
  // Ejecuta al cargar la página por si hay valores preseleccionados
  actualizarOpcionesPago();
});

// 🔽 Mostrar/ocultar campo "¿Quién recibe?" según método de envío
document.addEventListener("DOMContentLoaded", () => {
  const selectEnvio = document.querySelector('select[name="envio"]');
  const campoRecibe = document
    .querySelector('input[name="recibe"]')
    .closest("div");

  // Función para controlar la visibilidad
  function toggleCampoRecibe() {
    const valor = selectEnvio.value;
    if (valor === "Punto de retiro" || valor === "Evento") {
      campoRecibe.style.display = "block";
      campoRecibe.querySelector("input").required = true;
    } else {
      campoRecibe.style.display = "none";
      campoRecibe.querySelector("input").required = false;
      campoRecibe.querySelector("input").value = ""; // limpia el valor si se oculta
    }
  }

  // Ejecuta al cargar la página
  toggleCampoRecibe();

  // Escucha los cambios
  selectEnvio.addEventListener("change", toggleCampoRecibe);
});

// 🔽 Mostrar/ocultar campos de datos de envío (Lógica FINAL)
document.addEventListener("DOMContentLoaded", () => {
  const selectEnvio = document.querySelector('select[name="envio"]'); // Método principal (Punto de retiro, Envío por correo)
  const bloqueEnvio = document.getElementById("datosEnvio"); // Contiene el h4, select 'envioPor', y camposDireccionBloque
  const selectEnvioPor = document.getElementById("envioPor"); // La empresa de correo (Andreani/Argentino/E-pick)
  const tipoEnvioBloque = document.getElementById("tipoEnvioBloque"); // Contiene el select Sucursal/Domicilio
  const selectTipoEnvio = document.getElementById("tipoEnvio"); // El select Sucursal/Domicilio
  const camposDireccionBloque = document.getElementById(
    "camposDireccionBloque"
  ); // Bloque de: Calle, Numero, Localidad, etc. // Campos obligatorios SIEMPRE que haya que enviar (Sucursal o Domicilio)

  const camposObligatoriosGenerales = [
    "provincia",
    "localidad",
    "codigoPostal",
  ]; // Campos obligatorios SOLO si es "A Domicilio"
  const camposObligatoriosADomicilio = ["calle", "numero"]; // Campos opcionales (Piso, Dpto, Entre Calles)
  const camposOpcionales = ["piso", "departamento", "entreCalles"]; // Campos que NUNCA deben ocultarse en #camposDireccionBloque (ej: Comentarios)
  const camposNoOcultables = ["comentarios"];

  function toggleDatosEnvio() {
    const metodoEnvio = selectEnvio.value;
    const empresaEnvio = selectEnvioPor.value;
    const tipoEnvio = selectTipoEnvio.value; // --- 1. Determinar condiciones ---

    const esEnvioCorreoPrincipal = metodoEnvio === "Envío por correo";
    const empresaSeleccionada = empresaEnvio !== "";
    const requiereTipoEnvioSelect =
      empresaEnvio === "Correo Argentino" || empresaEnvio === "Correo Andreani";
    const esEpickODomicilio =
      empresaEnvio === "E-pick" || tipoEnvio === "A domicilio";

    // Lista de todos los campos que pueden ser ocultados (Calle, Número, Opcionales)
    const camposOcultables = [
      ...camposObligatoriosADomicilio,
      ...camposOpcionales,
    ]; // --- 2. CONTROL DEL BLOQUE DE ENVÍO (#datosEnvio) que contiene el 'Envío por' ---

    // #datosEnvio (Título + Select Envío por) solo aparece si el método principal es "Envío por correo".
    if (esEnvioCorreoPrincipal) {
      bloqueEnvio.style.display = "flex";
      selectEnvioPor.required = true;
    } else {
      bloqueEnvio.style.display = "none";
      selectEnvioPor.required = false;
      selectEnvioPor.value = "";
      selectTipoEnvio.value = "";
    } // --- 3. CONTROL DEL SELECT 'TIPO DE ENVÍO' (A sucursal/A domicilio) --- // Solo se muestra si es Correo Argentino o Andreani y ya se seleccionó una empresa (para evitar un parpadeo)

    if (
      esEnvioCorreoPrincipal &&
      empresaSeleccionada &&
      requiereTipoEnvioSelect
    ) {
      tipoEnvioBloque.style.display = "block";
      selectTipoEnvio.required = true;
    } else {
      tipoEnvioBloque.style.display = "none";
      selectTipoEnvio.required = false;
      selectTipoEnvio.value = "";
    } // --- 4. CONTROL DEL BLOQUE DE DIRECCIÓN DETALLADA (#camposDireccionBloque) ---

    // El bloque de dirección SÓLO debe mostrarse si:
    // a) La empresa es E-pick, OR
    // b) La empresa requiere tipo de envío Y ya se seleccionó una opción válida (Sucursal o Domicilio).
    const mostrarCamposDireccionBloque =
      empresaEnvio === "E-pick" ||
      (requiereTipoEnvioSelect && tipoEnvio !== "");

    if (
      esEnvioCorreoPrincipal &&
      empresaSeleccionada &&
      mostrarCamposDireccionBloque
    ) {
      camposDireccionBloque.style.display = "flex"; // Mostrar el bloque completo de campos

      if (esEpickODomicilio) {
        // A DOMICILIO / E-PICK: Mostrar todos los campos, hacer obligatorios Calle y Número
        // Mostrar campos ocultables (Calle, Número, Opcionales)
        camposOcultables.forEach((id) => {
          const campo = document.getElementById(id);
          if (campo) campo.closest("div").style.display = "block";
        }); // Obligatorios: Generales + A Domicilio

        [
          ...camposObligatoriosGenerales,
          ...camposObligatoriosADomicilio,
        ].forEach((id) => {
          const campo = document.getElementById(id);
          if (campo) campo.required = true;
        });

        // Opcionales (piso/dpto/entreCalles)
        camposOpcionales.forEach((id) => {
          const campo = document.getElementById(id);
          if (campo) campo.required = false;
        });
      } else if (tipoEnvio === "A sucursal") {
        // A SUCURSAL: Ocultar campos de domicilio, hacer obligatorios solo Generales
        // Ocultar campos ocultables y limpiar su valor
        camposOcultables.forEach((id) => {
          const campo = document.getElementById(id);
          if (campo) {
            campo.closest("div").style.display = "none"; // Ocultar el div contenedor
            campo.required = false;
            campo.value = "";
          }
        }); // Obligatorios: Solo Generales (Provincia, Localidad, C.P.)

        camposObligatoriosGenerales.forEach((id) => {
          const campo = document.getElementById(id);
          if (campo) campo.required = true;
        });
      }
    } else {
      // Ocultar el bloque de dirección detallada y limpiar
      camposDireccionBloque.style.display = "none"; // Limpiamos la obligatoriedad y los valores de TODOS los campos de dirección

      [
        ...camposObligatoriosGenerales,
        ...camposObligatoriosADomicilio,
        ...camposOpcionales,
        ...camposNoOcultables,
      ].forEach((id) => {
        const campo = document.getElementById(id);
        if (campo) {
          campo.required = false;
          campo.value = "";
        }
      });
      // Aseguramos que los contenedores que se ocultaron vuelvan a 'block' para la próxima vez que se muestre el bloque
      camposOcultables.forEach((id) => {
        const campo = document.getElementById(id);
        if (campo) campo.closest("div").style.display = "block";
      });
    }
  } // Ejecuta al cargar la página

  toggleDatosEnvio(); // Escucha los cambios

  selectEnvio.addEventListener("change", toggleDatosEnvio);
  selectEnvioPor.addEventListener("change", toggleDatosEnvio);
  selectTipoEnvio.addEventListener("change", toggleDatosEnvio);
});

/**
 * Valida si el total del carrito cumple con los mínimos de compra
 * según el método de envío seleccionado.
 * @param {number} totalFinal - El monto total que el cliente pagará (con descuentos).
 * @param {string} metodoEnvio - El método de envío (ej: "Envío por correo").
 * @returns {string | null} - Devuelve un mensaje de error si no cumple, o null si es válido.
 */
function validarMinimoCompra(totalFinal, metodoEnvio) {
  const MIN_CORREO = 15000;
  const MIN_RETIRO = 4000;

  if (metodoEnvio === "Envío por correo" && totalFinal < MIN_CORREO) {
    return `El mínimo de compra para "Envío por correo" es de $${MIN_CORREO}. Tu total actual es $${totalFinal.toFixed(
      2
    )}.`;
  }

  if (
    (metodoEnvio === "Punto de retiro" || metodoEnvio === "Evento") &&
    totalFinal < MIN_RETIRO
  ) {
    return `El mínimo de compra para "${metodoEnvio}" es de $${MIN_RETIRO}. Tu total actual es $${totalFinal.toFixed(
      2
    )}.`;
  }

  // Si pasa todas las validaciones, no devuelve ningún error
  return null;
}

// 🔽 Mostrar/ocultar campo DNI según si se selecciona "Sí" en "¿Factura C?"
document.addEventListener("DOMContentLoaded", () => {
  const selectFactura = document.querySelector('select[name="factura"]');
  const campoDNI = document.getElementById("campoDNI");
  // Si no existe el campo, salimos silenciosamente
  if (!campoDNI) return;
  const inputDNI = campoDNI.querySelector("input");
  const selectEnvio = document.querySelector('select[name="envio"]');

  // Función para controlar la visibilidad del DNI
  function toggleCampoDNI() {
    const facturaSi = selectFactura && selectFactura.value === "Sí";
    const envioCorreo = selectEnvio && selectEnvio.value === "Envío por correo";

    if (facturaSi || envioCorreo) {
      campoDNI.style.display = "block";
      if (inputDNI) inputDNI.required = true;
    } else {
      campoDNI.style.display = "none";
      if (inputDNI) {
        inputDNI.required = false;
        inputDNI.value = ""; // Limpia el valor si se oculta
      }
    }
  }

  // Ejecuta al cargar la página
  toggleCampoDNI();

  // Escucha los cambios en ambos selects
  if (selectFactura) selectFactura.addEventListener("change", toggleCampoDNI);
  if (selectEnvio) selectEnvio.addEventListener("change", toggleCampoDNI);
});
