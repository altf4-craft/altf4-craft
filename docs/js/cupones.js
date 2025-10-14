document.getElementById("aplicar-cupon").addEventListener("click", async () => {
  const inputCodigo = document.getElementById("codigo-cupon").value.trim().toUpperCase();
  const mensaje = document.getElementById("mensaje-cupon");

  try {
    const response = await fetch("./data/cupones.json");
    const cupones = await response.json();

    const cupon = cupones.find(c => c.codigo === inputCodigo);
    const hoy = new Date();

    if (!cupon) {
      mensaje.textContent = "❌ Cupón no válido.";
      mensaje.style.color = "red";
      return;
    }

    const inicio = new Date(cupon.inicio);
    const fin = new Date(cupon.fin);

    if (hoy < inicio || hoy > fin) {
      mensaje.textContent = "⚠️ Este cupón no está activo.";
      mensaje.style.color = "orange";
      return;
    }

    // Si es válido, aplicar el descuento
    aplicarDescuento(cupon.descuento);
    mensaje.textContent = `✅ Se aplicó un ${cupon.descuento}% de descuento`;
    mensaje.style.color = "green";

  } catch (error) {
    console.error("Error al verificar el cupón:", error);
    mensaje.textContent = "Error al validar el cupón.";
    mensaje.style.color = "red";
  }
});
