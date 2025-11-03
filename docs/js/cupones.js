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

    // Parsear las fechas como días completos en hora de Argentina (ART = UTC-3)
    function parseArgDateStart(dateStr) {
      const [y, m, d] = dateStr.split('-').map(Number);
      // 00:00 ART corresponde a 03:00 UTC -> usamos Date.UTC(year,month-1,day,03:00)
      return new Date(Date.UTC(y, m - 1, d, 3, 0, 0));
    }
    function parseArgDateEnd(dateStr) {
      const [y, m, d] = dateStr.split('-').map(Number);
      // fin del día ART = un ms antes del 00:00 ART del día siguiente
      return new Date(Date.UTC(y, m - 1, d + 1, 3, 0, 0) - 1);
    }

    const inicio = parseArgDateStart(cupon.inicio);
    const fin = parseArgDateEnd(cupon.fin);

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
