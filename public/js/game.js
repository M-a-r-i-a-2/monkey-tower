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
  const date = new Date().toLocaleDateString();
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
let blockSpeed = 2;
let direction = 1;
let gameOver = false;

// Crear bloque colgante
function createHangingBlock(x=width/2, y=50){
  const block = Bodies.rectangle(x, y + 100, 80, 20, {
    restitution: 0,
    render: { fillStyle: "#f8d24b" }
  });
  const rope = Constraint.create({
    pointA: {x: x, y: y},
    bodyB: block,
    length: 100,
    stiffness: 0.9
  });
  block.rope = rope;
  World.add(world, [block, rope]);
  return block;
}

// Spawn bloque
function spawnBlock(){
  currentBlock = createHangingBlock();
  blocks.push(currentBlock);
  direction = 1;
  Events.on(engine, "beforeUpdate", lateralMove);
}

// Movimiento lateral mientras cuelga
function lateralMove(){
  if(gameOver || !currentBlock) return;
  if(currentBlock.rope){
    Body.translate(currentBlock, {x: direction*blockSpeed, y:0});
    if(currentBlock.position.x > width-40 || currentBlock.position.x < 40)
      direction *= -1;
  }
}

// Soltar bloque
function dropBlock(){
  if(gameOver || !currentBlock) return;
  monkeyHappy();

  if(currentBlock.rope){
    World.remove(world, currentBlock.rope);
    currentBlock.rope = null;
  }

  Events.off(engine, "beforeUpdate", lateralMove);

  setTimeout(checkAlignment, 500);
}

// Validar caída
function checkAlignment(){
  const lastBlock = blocks[blocks.length-1];

  // Primer bloque nunca termina el juego
  const isFirstBlock = blocks.length === 1;

  // Revisar si el bloque cae fuera de límites
  if(!isFirstBlock && (lastBlock.position.y > height-50 || lastBlock.position.x < 40 || lastBlock.position.x > width-40)){
    endGame();
  } else {
    score++;
    scoreDisplay.textContent = score;
    updateHighScore(score);
    updateBackground();
    spawnBlock();
  }
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
  gameOver = true;
  monkeySad();
  finalScore.textContent = score;
  gameOverScreen.classList.remove("hidden");
}

// Controles
document.addEventListener("keydown", e => { if(e.code==="Space") dropBlock(); });
canvas.addEventListener("click", dropBlock);
retryBtn.addEventListener("click", ()=>window.location.reload());
menuBtn.addEventListener("click", ()=>window.location.href="index.html");

// Iniciar primer bloque
spawnBlock();
