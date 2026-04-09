const canvas = document.getElementById('canvas-juego');
const ctx = canvas.getContext('2d');

// ── ESTADO DEL JUEGO ──────────────────────────────────────────
let vida, puntos, nivel, gameLoop, objetos, agente1, agente2;
let principesaCayendo = false;
let principesa = null;
let frameCount = 0;

// ── CONFIGURACIÓN DE OBJETOS ──────────────────────────────────
const OBJETOS_MALOS_PEQUENOS = ['👠','🥿','🍶','🏺','🍽️','🥛'];
const OBJETOS_MALOS_GRANDES  = ['🎹','🛏️','🚽'];
const OBJETOS_BUENOS         = ['🍎','🍕','💧','🍗','🍊','🥤'];

// ── AGENTES ───────────────────────────────────────────────────
function crearAgentes() {
  agente1 = { x: 180, y: 420, w: 50, h: 60, velocidad: 0,
               emoji: '🕵️', mover: false, dir: 0 };
  agente2 = { x: 570, y: 420, w: 50, h: 60, velocidad: 0,
               emoji: '🕵️‍♀️', mover: false, dir: 0 };
}

// ── CONTROLES ─────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'a' || e.key === 'A') { agente1.dir = -1; agente1.mover = true; }
  if (e.key === 'd' || e.key === 'D') { agente1.dir =  1; agente1.mover = true; }
  if (e.key === 'ArrowLeft')  { agente2.dir = -1; agente2.mover = true; }
  if (e.key === 'ArrowRight') { agente2.dir =  1; agente2.mover = true; }
});
document.addEventListener('keyup', e => {
  if (e.key === 'a' || e.key === 'A' || e.key === 'd' || e.key === 'D')
    agente1.mover = false;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight')
    agente2.mover = false;
});

// ── INICIAR ───────────────────────────────────────────────────
function iniciar() {
  vida = 100; puntos = 0; nivel = 1;
  objetos = []; frameCount = 0;
  principesaCayendo = false; principesa = null;
  crearAgentes();
  actualizarHUD();
  if (gameLoop) cancelAnimationFrame(gameLoop);
  loop();
}

// ── LOOP PRINCIPAL ────────────────────────────────────────────
function loop() {
  frameCount++;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  dibujarFondo();
  moverAgentes();
  dibujarAgentes();

  // Generar objetos
  if (!principesaCayendo) {
    // Cada ~90 frames cae algo
    if (frameCount % 90 === 0) generarObjeto();
    // Cada 10 niveles hay más objetos
    if (frameCount % Math.max(30, 90 - nivel * 5) === 0 && nivel > 3)
      generarObjeto();
    // Princesa cae en momento aleatorio (entre frame 400 y 800)
    if (frameCount > 400 && Math.random() < 0.001) spawnPrincesa();
  }

  moverYDibujarObjetos();
  if (principesaCayendo) moverPrincesa();

  if (vida <= 0) return gameOver(false);

  gameLoop = requestAnimationFrame(loop);
}

// ── FONDO ─────────────────────────────────────────────────────
function dibujarFondo() {
  // Cielo
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#87CEEB');
  grad.addColorStop(0.6, '#98D8C8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Castillo (simple)
  ctx.fillStyle = '#8B7355';
  ctx.fillRect(320, 150, 160, 200);
  // Torres
  ctx.fillRect(290, 120, 50, 160);
  ctx.fillRect(460, 120, 50, 160);
  // Almenas
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(293 + i * 15, 110, 10, 20);
    ctx.fillRect(463 + i * 15, 110, 10, 20);
  }
  // Puerta
  ctx.fillStyle = '#4a3728';
  ctx.fillRect(375, 280, 50, 70);
  ctx.beginPath();
  ctx.arc(400, 280, 25, Math.PI, 0);
  ctx.fill();
  // Ventanas
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(340, 200, 25, 25);
  ctx.fillRect(435, 200, 25, 25);

  // Suelo
  ctx.fillStyle = '#5D8A3C';
  ctx.fillRect(0, 460, canvas.width, 40);
  // Pasto detalle
  ctx.fillStyle = '#4a7a2e';
  for (let i = 0; i < canvas.width; i += 20) {
    ctx.fillRect(i, 458, 10, 5);
  }

  // Nubes
  dibujarNube(100, 60);
  dibujarNube(600, 40);
  dibujarNube(380, 30);
}

function dibujarNube(x, y) {
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(x, y, 30, 0, Math.PI * 2);
  ctx.arc(x + 30, y - 10, 25, 0, Math.PI * 2);
  ctx.arc(x + 60, y, 30, 0, Math.PI * 2);
  ctx.fill();
}

// ── AGENTES ───────────────────────────────────────────────────
function moverAgentes() {
  const speed = 4;
  if (agente1.mover) agente1.x = Math.max(0, Math.min(canvas.width - agente1.w, agente1.x + agente1.dir * speed));
  if (agente2.mover) agente2.x = Math.max(0, Math.min(canvas.width - agente2.w, agente2.x + agente2.dir * speed));
}

function dibujarAgentes() {
  ctx.font = '45px serif';
  ctx.textAlign = 'center';
  ctx.fillText(agente1.emoji, agente1.x + agente1.w / 2, agente1.y + agente1.h);
  ctx.fillText(agente2.emoji, agente2.x + agente2.w / 2, agente2.y + agente2.h);
}

// ── OBJETOS ───────────────────────────────────────────────────
function generarObjeto() {
  const rand = Math.random();
  let tipo, emoji, danio, grande, bueno;

  if (rand < 0.15) {
    // Objeto grande malo
    emoji = OBJETOS_MALOS_GRANDES[Math.floor(Math.random() * OBJETOS_MALOS_GRANDES.length)];
    tipo = 'grande'; danio = 100; grande = true; bueno = false;
  } else if (rand < 0.35) {
    // Objeto bueno
    emoji = OBJETOS_BUENOS[Math.floor(Math.random() * OBJETOS_BUENOS.length)];
    tipo = 'bueno'; danio = -15; grande = false; bueno = true;
  } else {
    // Objeto pequeño malo
    emoji = OBJETOS_MALOS_PEQUENOS[Math.floor(Math.random() * OBJETOS_MALOS_PEQUENOS.length)];
    tipo = 'pequeño'; danio = 20; grande = false; bueno = false;
  }

  objetos.push({
    x: Math.random() * (canvas.width - 60) + 10,
    y: -50,
    w: grande ? 70 : 45,
    h: grande ? 70 : 45,
    velocidad: grande ? 3 : 2 + nivel * 0.3,
    emoji, tipo, danio, grande, bueno,
    activo: true
  });
}

function moverYDibujarObjetos() {
  ctx.font = '40px serif';
  ctx.textAlign = 'center';

  objetos = objetos.filter(o => o.activo && o.y < canvas.height + 60);

  for (let o of objetos) {
    o.y += o.velocidad;
    ctx.font = (o.grande ? '60px' : '40px') + ' serif';
    ctx.fillText(o.emoji, o.x, o.y);

    // Colisión con agente 1
    if (colisiona(o, agente1)) {
      aplicarEfecto(o);
      o.activo = false;
    }
    // Colisión con agente 2
    if (o.activo && colisiona(o, agente2)) {
      aplicarEfecto(o);
      o.activo = false;
    }
  }
}

function colisiona(obj, agente) {
  return (
    obj.x < agente.x + agente.w &&
    obj.x + obj.w > agente.x &&
    obj.y < agente.y + agente.h &&
    obj.y + obj.h > agente.y
  );
}

function aplicarEfecto(o) {
  if (o.grande) {
    vida = 0; // Pierde inmediatamente
  } else if (o.bueno) {
    puntos += 50;
    vida = Math.min(100, vida + 15);
  } else {
    vida -= o.danio;
    puntos = Math.max(0, puntos - 10);
  }
  actualizarHUD();
}

// ── PRINCESA ──────────────────────────────────────────────────
function spawnPrincesa() {
  principesaCayendo = true;
  principesa = {
    x: Math.random() * (canvas.width - 80) + 20,
    y: -60, w: 60, h: 70,
    velocidad: 2.5, atrapada: false
  };
  // Aviso visual
  mostrarAviso('👸 ¡LA PRINCESA CAE DEL CIELO!', '#FFD700');
}

function moverPrincesa() {
  if (!principesa || principesa.atrapada) return;

  principesa.y += principesa.velocidad;
  ctx.font = '55px serif';
  ctx.textAlign = 'center';
  ctx.fillText('👸', principesa.x + principesa.w / 2, principesa.y + principesa.h);

  // ¿La atraparon?
  if (colisiona(principesa, agente1) || colisiona(principesa, agente2)) {
    principesa.atrapada = true;
    principesaCayendo = false;
    puntos += 200 * nivel;
    actualizarHUD();
    mostrarAviso('🎉 ¡PRINCESA ATRAPADA! Siguiente nivel...', '#00FF88');
    setTimeout(siguienteNivel, 2000);
    return;
  }

  // ¿Tocó el suelo?
  if (principesa.y > canvas.height) {
    principesaCayendo = false;
    gameOver(false, 'La princesa cayó al suelo 💔');
  }
}

// ── NIVEL ─────────────────────────────────────────────────────
function siguienteNivel() {
  nivel++;
  objetos = [];
  frameCount = 0;
  principesaCayendo = false;
  principesa = null;
  actualizarHUD();
  mostrarAviso(`🏆 ¡NIVEL ${nivel}!`, '#FFD700');
}

// ── HUD ───────────────────────────────────────────────────────
function actualizarHUD() {
  document.getElementById('vida-display').textContent = Math.max(0, Math.round(vida));
  document.getElementById('puntos-display').textContent = puntos;
  document.getElementById('nivel-display').textContent = nivel;

  // Color de vida
  const vidaEl = document.getElementById('vida-display');
  vidaEl.style.color = vida > 60 ? '#00FF88' : vida > 30 ? '#FFD700' : '#FF4444';
}

// ── AVISOS ────────────────────────────────────────────────────
function mostrarAviso(texto, color) {
  const aviso = document.createElement('div');
  aviso.style.cssText = `
    position:fixed; top:40%; left:50%; transform:translate(-50%,-50%);
    background:rgba(0,0,0,0.85); color:${color}; padding:20px 35px;
    border-radius:15px; font-size:1.5rem; font-weight:bold;
    z-index:100; text-align:center; border:2px solid ${color};
  `;
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
    gano ? '🏆 ¡GANASTE!' : `💀 Game Over — ${motivo || 'Sin vida'}`;

  // Guardar récord en localStorage
  const record = localStorage.getItem('record') || 0;
  if (puntos > record) localStorage.setItem('record', puntos);
}