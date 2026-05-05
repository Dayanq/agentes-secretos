function iniciarJuego() {
  const nombre = document.getElementById('nombre-jugador').value.trim();
  const captcha = grecaptcha.getResponse();

  if (!nombre || !captcha) {
    document.getElementById('error-login').style.display = 'block';
    return;
  }

  // Guardar nombre
  localStorage.setItem('jugador', nombre);

  // Mostrar saludo en pantalla de modo
  document.getElementById('saludo-modo').textContent = `Hola, ${nombre} 👋 ¿Cómo quieres jugar?`;

  // Cambiar a pantalla de modo (no al juego directo)
  document.getElementById('pantalla-login').style.display = 'none';
  document.getElementById('pantalla-modo').style.display = 'flex';
}

function reiniciarJuego() {
  document.getElementById('pantalla-gameover').style.display = 'none';
  document.getElementById('pantalla-modo').style.display = 'flex';
}