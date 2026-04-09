function iniciarJuego() {
  const nombre = document.getElementById('nombre-jugador').value.trim();
  const captcha = grecaptcha.getResponse();

  if (!nombre || !captcha) {
    document.getElementById('error-login').style.display = 'block';
    return;
  }

  // Guardar nombre
  localStorage.setItem('jugador', nombre);
  document.getElementById('nombre-display').textContent = nombre;

  // Cambiar pantallas
  document.getElementById('pantalla-login').style.display = 'none';
  document.getElementById('pantalla-juego').style.display = 'flex';

  // Iniciar el juego
  iniciar();
}

function reiniciarJuego() {
  document.getElementById('pantalla-gameover').style.display = 'none';
  document.getElementById('pantalla-juego').style.display = 'flex';
  iniciar();
}