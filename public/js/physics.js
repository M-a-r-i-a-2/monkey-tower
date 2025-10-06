// Alias de Matter.js
const { Engine, Render, Runner, Bodies, Composite, Events, World } = Matter;

const canvas = document.getElementById("gameCanvas");
const scoreDisplay = document.getElementById("score");
const gameOverScreen = document.getElementById("gameOver");
const finalScore = document.getElementById("finalScore");
const retryBtn = document.getElementById("retryBtn");
const menuBtn = document.getElementById("menuBtn");

const width = canvas.width;
const height = canvas.height;

// Crear motor de físicas
const engine = Engine.create();
const world = engine.world;
world.gravity.y = 1; // Gravedad

// Renderizador
const render = Render.create({
  canvas,
  engine,
  options: {
    width,
    height,
    wireframes: false,
    background: "#3d7540"
  }
});

Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

// Crear piso
const ground = Bodies.rectangle(width / 2, height - 10, width, 20, {
  isStatic: true,
  render: { fillStyle: "#6b4f3b" }
});
World.add(world, ground);

let score = 0;
let currentBlock;
let blockSpeed = 3;
let direction = 1;
let gameOver = false;

// Crear bloque nuevo
function createBlock(y = 100) {
  const block = Bodies.rectangle(50, y, 80, 20, {
    restitution: 0,
    render: { fillStyle: "#f8d24b" }
  });
  World.add(world, block);
  return block;
}

currentBlock = createBlock();

// Mover bloque lateralmente
Events.on(engine, "beforeUpdate", () => {
  if (gameOver) return;

  // Movimiento horizontal manual
  Matter.Body.translate(currentBlock, { x: direction * blockSpeed, y: 0 });

  // Cambiar dirección al llegar a los bordes
  if (currentBlock.position.x > width - 40 || currentBlock.position.x < 40) {
    direction *= -1;
  }
});

// Soltar bloque (activar gravedad)
function dropBlock() {
  if (gameOver) return;
  // Quitar evento de movimiento
  Events.off(engine, "beforeUpdate");
  setTimeout(() => {
    checkAlignment();
  }, 800);
}

// Verificar si el bloque cayó correctamente
function checkAlignment() {
  const lastY = height - 30 - score * 20;
  const yPos = currentBlock.position.y;
  if (yPos > lastY + 30) {
    endGame();
  } else {
    score++;
    scoreDisplay.textContent = score;
    currentBlock = createBlock(80);
    direction = 1;
    Events.on(engine, "beforeUpdate", () => {
      Matter.Body.translate(currentBlock, { x: direction * blockSpeed, y: 0 });
      if (currentBlock.position.x > width - 40 || currentBlock.position.x < 40) {
        direction *= -1;
      }
    });
  }
}

// Mostrar pantalla de fin
function endGame() {
  gameOver = true;
  finalScore.textContent = score;
  gameOverScreen.classList.remove("hidden");
}

// Controles
document.addEventListener("keydown", (e) => {
  if (e.code === "Space") dropBlock();
});
canvas.addEventListener("click", dropBlock);

// Botones del Game Over
retryBtn.addEventListener("click", () => {
  window.location.reload();
});
menuBtn.addEventListener("click", () => {
  window.location.href = "index.html";
});
