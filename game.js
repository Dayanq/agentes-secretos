const canvas = document.getElementById('canvas-juego');
const ctx = canvas.getContext('2d');

// ── CANVAS FULLSCREEN ─────────────────────────────────────────
function ajustarCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
ajustarCanvas();
window.addEventListener('resize', ajustarCanvas);

// ── ESTADO DEL JUEGO ──────────────────────────────────────────
let puntos, nivel, gameLoop, objetos, agente1, agente2;
let principesaCayendo = false;
let principesa = null;
let frameCount = 0;
let modoJuego = 'solo'; // 'solo' o 'multi'

// ── CONFIGURACIÓN DE OBJETOS ──────────────────────────────────
const OBJETOS_MALOS_PEQUENOS = ['🔥'];
const OBJETOS_MALOS_GRANDES  = ['💣'];
const OBJETOS_BUENOS         = ['🗺️','🔍','🔫','🗡️','🪓','🛡️'];

// ── VIDEO DE FONDO ────────────────────────────────────────────
const videoFondo = document.createElement('video');
videoFondo.src = 'background.mp4';
videoFondo.loop = true;
videoFondo.muted = true;
videoFondo.playsInline = true;
videoFondo.playbackRate = 0.15;
videoFondo.play();

// ── IMÁGENES DE PERSONAJES ────────────────────────────────────
const imgAgente1 = new Image();
imgAgente1.src = 'agente1.png'; // ← nombre de tu archivo

const imgAgente2 = new Image();
imgAgente2.src = 'agente2.png'; // ← nombre de tu archivo

const imgPrincesa = new Image();
imgPrincesa.src = 'princesa.png'; // ← nombre de tu archivo

let pausado = false;

function pausarJuego() {
  if (pausado) return;
  pausado = true;
  cancelAnimationFrame(gameLoop);
  document.getElementById('btn-pausa').style.display = 'none';
  document.getElementById('btn-reanudar').style.display = 'inline-block';
  // Overlay de pausa
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('⏸ PAUSA', canvas.width / 2, canvas.height / 2);
}

function reanudarJuego() {
  if (!pausado) return;
  pausado = false;
  document.getElementById('btn-pausa').style.display = 'inline-block';
  document.getElementById('btn-reanudar').style.display = 'none';
  loop();
}

function reiniciarDesdeJuego() {
  cancelAnimationFrame(gameLoop);
  pausado = false;
  document.getElementById('btn-pausa').style.display = 'inline-block';
  document.getElementById('btn-reanudar').style.display = 'none';
  document.getElementById('pantalla-juego').style.display = 'none';
  document.getElementById('pantalla-modo').style.display = 'flex';
}
function seleccionarModo(modo) {
  modoJuego = modo;
  const nombreJugador = document.getElementById('nombre-jugador').value.trim();

  if (modo === 'solo') {
    // En modo solo: el nombre del login es el agente 1, agente 2 no existe
    document.getElementById('pantalla-modo').style.display = 'none';
    iniciar(nombreJugador, null);
  } else {
    // En modo multi: pedir nombres de ambos agentes
    document.getElementById('pantalla-modo').style.display = 'none';
    document.getElementById('nombre-agente1').value = nombreJugador;
    document.getElementById('pantalla-nombres').style.display = 'flex';
  }
}

function confirmarNombres() {
  const n1 = document.getElementById('nombre-agente1').value.trim();
  const n2 = document.getElementById('nombre-agente2').value.trim();
  if (!n1 || !n2) {
    document.getElementById('error-nombres').style.display = 'block';
    return;
  }
  document.getElementById('pantalla-nombres').style.display = 'none';
  iniciar(n1, n2);
}

// ── AGENTES ───────────────────────────────────────────────────
function crearAgentes(nombre1, nombre2) {
  const sueloY = canvas.height - 40; // donde empieza el suelo
  const y = sueloY - 100;            // agente encima del suelo
  agente1 = {
    x: 80, y, w: 80, h: 100,
    mover: false, dir: 0,
    vida: 100, vivo: true,
    nombre: nombre1
  };

  if (modoJuego === 'multi') {
    agente2 = {
      x: canvas.width - 160, y, w: 80, h: 100,
      mover: false, dir: 0,
      vida: 100, vivo: true,
      nombre: nombre2
    };
  } else {
    agente2 = null;
  }
}

// ── CONTROLES ─────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (agente1 && agente1.vivo) {
    if (e.key === 'a' || e.key === 'A') { agente1.dir = -1; agente1.mover = true; }
    if (e.key === 'd' || e.key === 'D') { agente1.dir =  1; agente1.mover = true; }
  }
  if (agente2 && agente2.vivo) {
    if (e.key === 'ArrowLeft')  { agente2.dir = -1; agente2.mover = true; }
    if (e.key === 'ArrowRight') { agente2.dir =  1; agente2.mover = true; }
  }
});
document.addEventListener('keyup', e => {
  if (e.key === 'a' || e.key === 'A' || e.key === 'd' || e.key === 'D')
    if (agente1) agente1.mover = false;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight')
    if (agente2) agente2.mover = false;
});

// ── INICIAR ───────────────────────────────────────────────────
function iniciar(nombre1, nombre2) {
  puntos = 0; nivel = 1;
  objetos = []; frameCount = 0;
  pausado = false;
  principesaCayendo = false; principesa = null;
  crearAgentes(nombre1, nombre2);
  actualizarHUD();

  // Mostrar/ocultar HUD del agente 2 según modo
  const hudA2 = document.getElementById('hud-agente2');
  if (hudA2) hudA2.style.display = modoJuego === 'multi' ? '' : 'none';

  document.getElementById('pantalla-juego').style.display = 'flex';

  if (gameLoop) cancelAnimationFrame(gameLoop);
  loop();
}

// ── TIEMPO DE PRINCESA POR NIVEL ──────────────────────────────
function frameMinPrincesa() {
  return 500 + (nivel - 1) * 120;
}

// ── LOOP PRINCIPAL ────────────────────────────────────────────
function loop() {
  frameCount++;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  dibujarFondo();
  moverAgentes();
  dibujarAgentes();

  if (!principesaCayendo) {
    const intervaloBase = Math.max(18, 90 - nivel * 10);
    if (frameCount % intervaloBase === 0) generarObjeto();
    if (nivel >= 2 && frameCount % intervaloBase === Math.floor(intervaloBase / 2)) generarObjeto();
    if (nivel >= 3 && frameCount % intervaloBase === Math.floor(intervaloBase / 3)) generarObjeto();
    if (nivel >= 4 && frameCount % Math.max(12, intervaloBase - 5) === 0) generarObjeto();
    if (nivel >= 5 && frameCount % 22 === 0) generarObjetoTipo('pequeño');
    if (nivel >= 6 && frameCount % 80 === 0) generarObjetoTipo('grande');
    if (nivel >= 7 && frameCount % 15 === 0) generarObjetoTipo('pequeño');
    if (frameCount > frameMinPrincesa() && Math.random() < 0.0012) spawnPrincesa();
  }

  moverYDibujarObjetos();
  if (principesaCayendo) moverPrincesa();

  // ── Condición de fin según modo ───────────────────────────
  if (modoJuego === 'solo') {
    if (!agente1.vivo) return gameOver(false);
  } else {
    if (!agente1.vivo && !agente2.vivo) return gameOver(false);
  }

  gameLoop = requestAnimationFrame(loop);
}

// ── FONDO ─────────────────────────────────────────────────────
function dibujarFondo() {
  ctx.drawImage(videoFondo, 0, 0, canvas.width, canvas.height);

  // Degradado oscuro en la parte baja
  const grad = ctx.createLinearGradient(0, canvas.height - 150, 0, canvas.height);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, canvas.height - 150, canvas.width, 150);

  dibujarSuelo();
}

// ── SUELO EMPEDRADO ───────────────────────────────────────────
function dibujarSuelo() {
  const alturaFranja = 40;
  const sueloY = canvas.height - alturaFranja; // pegado al borde inferior
  const W = canvas.width;

  // Base de piedra oscura
  const gradSuelo = ctx.createLinearGradient(0, sueloY, 0, sueloY + alturaFranja);
  gradSuelo.addColorStop(0, 'rgba(50,38,28,0.95)');
  gradSuelo.addColorStop(1, 'rgba(30,22,14,1)');
  ctx.fillStyle = gradSuelo;
  ctx.fillRect(0, sueloY, W, alturaFranja);

  // Línea de borde superior iluminada
  ctx.strokeStyle = 'rgba(180,140,80,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, sueloY); ctx.lineTo(W, sueloY); ctx.stroke();

  // Adoquines en una sola fila
  const anchoAdoquin = 72;
  for (let x = 0; x < W + anchoAdoquin; x += anchoAdoquin) {
    const variacion = ((x * 3) % 30) - 15;
    const r = Math.min(255, 80 + variacion);
    const g = Math.min(255, 62 + variacion);
    const b = Math.min(255, 44 + variacion);
    ctx.fillStyle = `rgba(${r},${g},${b},0.9)`;
    ctx.fillRect(x + 2, sueloY + 2, anchoAdoquin - 4, alturaFranja - 4);
    ctx.strokeStyle = 'rgba(20,14,8,0.7)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 2, sueloY + 2, anchoAdoquin - 4, alturaFranja - 4);
    ctx.strokeStyle = 'rgba(200,160,90,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 3, sueloY + 3);
    ctx.lineTo(x + anchoAdoquin - 3, sueloY + 3);
    ctx.stroke();
  }
}

// ── AGENTES ───────────────────────────────────────────────────
function moverAgentes() {
  const speed = 4;
  if (agente1 && agente1.vivo && agente1.mover)
    agente1.x = Math.max(0, Math.min(canvas.width - agente1.w, agente1.x + agente1.dir * speed));
  if (agente2 && agente2.vivo && agente2.mover)
    agente2.x = Math.max(0, Math.min(canvas.width - agente2.w, agente2.x + agente2.dir * speed));
}

function dibujarAgentes() {
  if (agente1 && agente1.vivo) {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.drawImage(imgAgente1, agente1.x, agente1.y, agente1.w, agente1.h);
    ctx.restore();
    dibujarBarraVida(agente1);
  }

  if (agente2 && agente2.vivo) {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.drawImage(imgAgente2, agente2.x, agente2.y, agente2.w, agente2.h);
    ctx.restore();
    dibujarBarraVida(agente2);
  }
}

function dibujarBarraVida(agente) {
  const bw = 44, bh = 6, bx = agente.x - 2, by = agente.y - 12;
  const pct = Math.max(0, agente.vida) / 100;
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = pct > 0.6 ? '#00FF88' : pct > 0.3 ? '#FFD700' : '#FF4444';
  ctx.fillRect(bx, by, bw * pct, bh);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(bx, by, bw, bh);
}

// ── OBJETOS ───────────────────────────────────────────────────
function generarObjeto() {
  const rand = Math.random();
  const probBomba = Math.min(0.30, 0.15 + nivel * 0.02);
  const probBueno = Math.max(0.10, 0.35 - nivel * 0.03);
  let tipo, emoji, danio, grande, bueno;

  if (rand < probBomba) {
    emoji = OBJETOS_MALOS_GRANDES[Math.floor(Math.random() * OBJETOS_MALOS_GRANDES.length)];
    tipo = 'grande'; danio = 100; grande = true; bueno = false;
  } else if (rand < probBomba + probBueno) {
    emoji = OBJETOS_BUENOS[Math.floor(Math.random() * OBJETOS_BUENOS.length)];
    tipo = 'bueno'; danio = -15; grande = false; bueno = true;
  } else {
    emoji = OBJETOS_MALOS_PEQUENOS[Math.floor(Math.random() * OBJETOS_MALOS_PEQUENOS.length)];
    tipo = 'pequeño'; danio = 20; grande = false; bueno = false;
  }

  objetos.push({
    x: Math.random() * (canvas.width - 60) + 10, y: -80,
    w: grande ? 75 : 50, h: grande ? 75 : 50,
    velocidad: (grande ? 3 : 2) + nivel * (grande ? 0.4 : 0.5),
    emoji, tipo, danio, grande, bueno, activo: true
  });
}

function generarObjetoTipo(tipo) {
  const grande = tipo === 'grande';
  objetos.push({
    x: Math.random() * (canvas.width - 60) + 10, y: -80,
    w: grande ? 75 : 50, h: grande ? 75 : 50,
    velocidad: (grande ? 3 : 2) + nivel * 0.5,
    emoji: grande ? OBJETOS_MALOS_GRANDES[0] : OBJETOS_MALOS_PEQUENOS[0],
    tipo, danio: grande ? 100 : 20, grande, bueno: false, activo: true
  });
}

function moverYDibujarObjetos() {
  objetos = objetos.filter(o => o.activo && o.y < canvas.height + 60);
  for (let o of objetos) {
    o.y += o.velocidad;
    ctx.font = (o.grande ? '80px' : '55px') + ' serif';
    ctx.textAlign = 'center';
    ctx.fillText(o.emoji, o.x + o.w / 2, o.y + o.h / 2);
    if (agente1 && agente1.vivo && colisiona(o, agente1)) { aplicarEfecto(o, agente1); o.activo = false; continue; }
    if (o.activo && agente2 && agente2.vivo && colisiona(o, agente2)) { aplicarEfecto(o, agente2); o.activo = false; }
  }
}

function colisiona(obj, agente) {
  return obj.x < agente.x + agente.w && obj.x + obj.w > agente.x &&
         obj.y < agente.y + agente.h && obj.y + obj.h > agente.y;
}

function aplicarEfecto(o, agente) {
  if (o.grande) {
    agente.vida = 0; agente.vivo = false;
    mostrarAviso(`💀 ${agente.nombre} eliminado!`, '#FF4444');
  } else if (o.bueno) {
    puntos += 50;
    agente.vida = Math.min(100, agente.vida + 15);
  } else {
    agente.vida -= o.danio;
    puntos = Math.max(0, puntos - 10);
    if (agente.vida <= 0) {
      agente.vida = 0; agente.vivo = false;
      mostrarAviso(`💀 ${agente.nombre} eliminado!`, '#FF4444');
    }
  }
  actualizarHUD();
}

// ── PRINCESA ──────────────────────────────────────────────────
function spawnPrincesa() {
  principesaCayendo = true;
  principesa = { x: Math.random() * (canvas.width - 80) + 20, y: -100, w: 80, h: 100, velocidad: 2.5, atrapada: false };
  mostrarAviso('👸 ¡LA PRINCESA CAE DEL CIELO!', '#FFD700');
}

function moverPrincesa() {
  if (!principesa || principesa.atrapada) return;
  principesa.y += principesa.velocidad;
  ctx.drawImage(imgPrincesa, principesa.x, principesa.y, principesa.w, principesa.h);

  const atrapadaPor =
    (agente1 && agente1.vivo && colisiona(principesa, agente1)) ||
    (agente2 && agente2.vivo && colisiona(principesa, agente2));

  if (atrapadaPor) {
    principesa.atrapada = true; principesaCayendo = false;
    puntos += 200 * nivel;
    actualizarHUD();
    mostrarAviso('🎉 ¡PRINCESA ATRAPADA! Siguiente nivel...', '#00FF88');
    setTimeout(siguienteNivel, 2000);
    return;
  }
  if (principesa.y > canvas.height) {
    principesaCayendo = false;
    gameOver(false, 'La princesa cayó al suelo 💔');
  }
}

// ── NIVEL ─────────────────────────────────────────────────────
function siguienteNivel() {
  nivel++; objetos = []; frameCount = 0;
  principesaCayendo = false; principesa = null;
  actualizarHUD();
  mostrarAviso(`🏆 ¡NIVEL ${nivel}! — La princesa tardará más...`, '#FFD700');
}

// ── HUD ───────────────────────────────────────────────────────
function actualizarHUD() {
  document.getElementById('puntos-display').textContent = puntos;
  document.getElementById('nivel-display').textContent = nivel;

  // Nombre y vida agente 1
  const n1El = document.getElementById('nombre-a1-display');
  if (n1El && agente1) n1El.textContent = agente1.nombre;
  const v1El = document.getElementById('vida-a1-display');
  const v1 = agente1 ? Math.max(0, Math.round(agente1.vida)) : 0;
  if (v1El) {
    v1El.textContent = agente1?.vivo ? v1 + '%' : '💀';
    v1El.style.color = agente1?.vivo ? (v1 > 60 ? '#00FF88' : v1 > 30 ? '#FFD700' : '#FF4444') : '#888';
  }

  // Nombre y vida agente 2 (solo modo multi)
  if (modoJuego === 'multi' && agente2) {
    const n2El = document.getElementById('nombre-a2-display');
    if (n2El) n2El.textContent = agente2.nombre;
    const v2El = document.getElementById('vida-a2-display');
    const v2 = Math.max(0, Math.round(agente2.vida));
    if (v2El) {
      v2El.textContent = agente2.vivo ? v2 + '%' : '💀';
      v2El.style.color = agente2.vivo ? (v2 > 60 ? '#00FF88' : v2 > 30 ? '#FFD700' : '#FF4444') : '#888';
    }
  }
}

// ── AVISOS ────────────────────────────────────────────────────
function mostrarAviso(texto, color) {
  const aviso = document.createElement('div');
  aviso.style.cssText = `position:fixed;top:40%;left:50%;transform:translate(-50%,-50%);
    background:rgba(0,0,0,0.85);color:${color};padding:20px 35px;border-radius:15px;
    font-size:1.5rem;font-weight:bold;z-index:100;text-align:center;border:2px solid ${color};`;
  aviso.textContent = texto;
  document.body.appendChild(aviso);
  setTimeout(() => aviso.remove(), 2000);
}

// ── GAME OVER ─────────────────────────────────────────────────
function gameOver(gano, motivo) {
  cancelAnimationFrame(gameLoop);
  document.getElementById('pantalla-juego').style.display = 'none';
  document.getElementById('pantalla-gameover').style.display = 'flex';
  document.getElementById('puntos-finales').textContent = puntos;
  document.getElementById('mensaje-gameover').textContent =
    gano ? '🏆 ¡GANASTE!' : `💀 Game Over — ${motivo || 'Agentes eliminados'}`;
  const record = localStorage.getItem('record') || 0;
  if (puntos > record) localStorage.setItem('record', puntos);
}