const { Engine, Render, Runner, Bodies, Composite, Events, World, Constraint, Body } = Matter;

const canvas = document.getElementById("gameCanvas");
const monkey = document.getElementById("monkey");

const scoreDisplay = document.getElementById("score");
const highScoreDisplay = document.getElementById("highScore");
const gameOverScreen = document.getElementById("gameOver");
const finalScore = document.getElementById("finalScore");
const retryBtn = document.getElementById("retryBtn");
const menuBtn = document.getElementById("menuBtn");
const recordsPanel = document.getElementById("recordsPanel");
const viewRecordsBtn = document.getElementById("viewRecords");
const closeRecordsBtn = document.getElementById("closeRecords");
const recordsList = document.getElementById("recordsList");

const width = canvas.width;
const height = canvas.height;

// Fondos por fase
const backgrounds = [
  "assets/images/background/jungle_day.png",
  "assets/images/background/jungle_evening.png",
  "assets/images/background/jungle_night.png"
];

// Motor y render
const engine = Engine.create();
const world = engine.world;
world.gravity.y = 1;

const render = Render.create({
  canvas,
  engine,
  options: {
    width,
    height,
    wireframes: false,
    background: backgrounds[0]
  }
});
Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

// Suelo
const ground = Bodies.rectangle(width / 2, height - 10, width, 20, {
  isStatic: true,
  render: { fillStyle: "#6b4f3b" }
});
World.add(world, ground);

// --- Puntaje ---
let score = 0;
let highScore = parseInt(localStorage.getItem("highScore")) || 0;
highScoreDisplay.textContent = highScore;

function updateHighScore(newScore) {
  if(newScore > highScore){
    highScore = newScore;
    localStorage.setItem("highScore", highScore);
    highScoreDisplay.textContent = highScore;
    saveRecord(newScore);
  }
}

function saveRecord(newScore){
  const date = new Date().toLocaleDateString("es-MX");
  const records = JSON.parse(localStorage.getItem("records")) || [];
  records.push({ score: newScore, date });
  records.sort((a,b) => b.score - a.score);
  localStorage.setItem("records", JSON.stringify(records.slice(0,5)));
}

function showRecords() {
  const records = JSON.parse(localStorage.getItem("records")) || [];
  recordsList.innerHTML = "";
  if(records.length === 0){
    recordsList.innerHTML = "<li>No hay récords aún</li>";
  } else {
    records.forEach((r,i) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>#${i+1}</span><span>${r.score} pts</span><span>${r.date}</span>`;
      recordsList.appendChild(li);
    });
  }
  recordsPanel.classList.remove("hidden");
}
viewRecordsBtn.addEventListener("click", showRecords);
closeRecordsBtn.addEventListener("click", () => recordsPanel.classList.add("hidden"));

// --- Juego ---
let blocks = [];
let currentBlock;
let gameOver = false;

// --- CAMBIO 1: La función de movimiento y el anclaje móvil se eliminan ---

// Crear bloque colgante
function createHangingBlock(){
  // La cuerda se acorta con la puntuación para aumentar la velocidad del péndulo
  const ropeLength = Math.max(120 - score * 2.5, 60);
  const startX = width / 2 + 100; // Inicia a un lado para que comience a balancearse
  
  const block = Bodies.rectangle(startX, ropeLength + 50, 20, 20, {
    restitution: 0,
    render: { fillStyle: "#73F84BFF" },
    label: 'block'
  });
  
  const rope = Constraint.create({
    // El punto de anclaje ahora es fijo en el centro
    pointA: { x: width / 2, y: 50 },
    bodyB: block,
    length: ropeLength,
    stiffness: 1
  });

  block.rope = rope;
  World.add(world, [block, rope]);
  return block;
}

// Spawn bloque
function spawnBlock(){
  currentBlock = createHangingBlock();
  blocks.push(currentBlock);
}

// Soltar bloque
function dropBlock(){
  if(gameOver || !currentBlock || !currentBlock.rope) return;
  
  monkeyHappy();

  World.remove(world, currentBlock.rope);
  currentBlock.rope = null;

  // --- CAMBIO 2: Se elimina la anulación de velocidad para una caída natural ---
  
  setTimeout(() => {
    if (gameOver) return;
    score++;
    scoreDisplay.textContent = score;
    updateHighScore(score);
    updateBackground();
    spawnBlock();
    moveMonkeyToBlock(); // Mueve el mono al nuevo bloque
  }, 500);
}

// Mueve el mono a la posición del bloque
function moveMonkeyToBlock() {
    // Calcula la nueva posición del mono basada en el bloque actual
    const blockHeight = 20; // Altura del bloque
    const newBottom = currentBlock.position.y - blockHeight/2; // Posición del nuevo bloque
  
    // Aplica la nueva posición al mono
    monkey.style.bottom = `${newBottom}px`;
}

// Mono feliz/triste
function monkeyHappy(){
  monkey.src = "assets/images/characters/monkey_happy.png";
  monkey.classList.add("monkey-happy");
  setTimeout(()=>{
    monkey.src = "assets/images/characters/monkey_idle.png";
    monkey.classList.remove("monkey-happy");
  },800);
}

function monkeySad(){
  monkey.src = "assets/images/characters/monkey_sad.png";
  monkey.classList.add("monkey-sad");
}

// Background dinámico
function updateBackground(){
  if(score<5) render.options.background = backgrounds[0];
  else if(score<10) render.options.background = backgrounds[1];
  else render.options.background = backgrounds[2];
}

// Fin del juego
function endGame(){
  if(gameOver) return;
  gameOver = true;
  monkeySad();
  monkey.classList.add("monkey-falling"); // Añade la clase para la animación de caída
  finalScore.textContent = score;
  gameOverScreen.classList.remove("hidden");
}

// Detectar colisiones
Events.on(engine, 'collisionStart', (event) => {
  if (gameOver) return;
  const pairs = event.pairs;
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    const { bodyA, bodyB } = pair;
    const isBlockOnGround = 
      (blocks.includes(bodyA) && bodyB === ground) || 
      (blocks.includes(bodyB) && bodyA === ground);

    if (isBlockOnGround && score > 0) {
      endGame();
      break; 
    }
  }
});

// --- CAMBIO 3: Controles vuelven a ser solo para soltar el bloque ---
document.addEventListener("keydown", e => {
  if (e.code === "Space") {
    dropBlock();
  }
});

canvas.addEventListener("click", dropBlock);
retryBtn.addEventListener("click", ()=>window.location.reload());
menuBtn.addEventListener("click", ()=>window.location.href="index.html");


// Iniciar primer bloque
spawnBlock();