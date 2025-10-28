// Import Matter.js library
const Matter = window.Matter
const { Engine, Render, Runner, Bodies, Composite, Events, World, Constraint, Body } = Matter
const canvas = document.getElementById("gameCanvas")
const monkey = document.getElementById("monkey")
const scoreDisplay = document.getElementById("score")
const highScoreDisplay = document.getElementById("highScore")
const gameOverScreen = document.getElementById("gameOver")
const finalScore = document.getElementById("finalScore")
const retryBtn = document.getElementById("retryBtn")
const menuBtn = document.getElementById("menuBtn")
const recordsPanel = document.getElementById("recordsPanel")
const viewRecordsBtn = document.getElementById("viewRecords")
const closeRecordsBtn = document.getElementById("closeRecords")
const recordsList = document.getElementById("recordsList")

const width = canvas.width
const height = canvas.height

// Backgrounds
const backgrounds = ["#4a7c59", "#6b5b4f", "#2c3e50"]

// Engine and render
const engine = Engine.create()
const world = engine.world
world.gravity.y = 1

const render = Render.create({
  canvas,
  engine,
  options: {
    width,
    height,
    wireframes: false,
    background: backgrounds[0],
  },
})
Render.run(render)
const runner = Runner.create()
Runner.run(runner, engine)

// Ground
const ground = Bodies.rectangle(width / 2, height - 10, width, 20, {
  isStatic: true,
  render: { fillStyle: "#6b4f3b" },
  friction: 1.0,
})
World.add(world, ground)

// Score
let score = 0
let highScore = Number.parseInt(localStorage.getItem("highScore")) || 0
highScoreDisplay.textContent = highScore

function updateHighScore(newScore) {
  if (newScore > highScore) {
    highScore = newScore
    localStorage.setItem("highScore", highScore)
    highScoreDisplay.textContent = highScore
    saveRecord(newScore)
  }
}

function saveRecord(newScore) {
  const date = new Date().toLocaleDateString("es-MX")
  const records = JSON.parse(localStorage.getItem("records")) || []
  records.push({ score: newScore, date })
  records.sort((a, b) => b.score - a.score)
  localStorage.setItem("records", JSON.stringify(records.slice(0, 5)))
}

function showRecords() {
  const records = JSON.parse(localStorage.getItem("records")) || []
  recordsList.innerHTML = ""
  if (records.length === 0) {
    recordsList.innerHTML = "<li>No hay récords aún</li>"
  } else {
    records.forEach((r, i) => {
      const li = document.createElement("li")
      li.innerHTML = `<span>#${i + 1}</span><span>${r.score} pts</span><span>${r.date}</span>`
      recordsList.appendChild(li)
    })
  }
  recordsPanel.classList.remove("hidden")
}
viewRecordsBtn.addEventListener("click", showRecords)
closeRecordsBtn.addEventListener("click", () => recordsPanel.classList.add("hidden"))

// Game
const blocks = []
let currentBlock
let gameOver = false
const placedBlocks = []
let towerFalling = false
let swingDirection = 1
const swingSpeed = 0.008

let groundOffset = 0 // Track how much we've moved the ground down
const moveThreshold = 150 // Move ground when tower gets this close to top
let cameraFollowEnabled = false // Start following only after 6 placed blocks
let worldMoveInProgress = false
let ropeVisualOffset = 0 // Persistent visual offset for the rope anchor (so it stays raised)
const ropeRaiseFactor = 1 // Factor for how much the rope anchor raise translates into extra rope length (lower = shorter rope)

// Create hanging block
function createHangingBlock() {
  const ropeLength = Math.max(120 - score * 2.5, 60);
  const startX = width / 2 + 100;

  // Lista de texturas disponibles
  const blockTextures = [
    "assets/images/blocks/block1.png",
    "assets/images/blocks/block2.png",
    "assets/images/blocks/block3.png",
  ];

  // Selecciona una textura al azar
  const randomTexture = blockTextures[Math.floor(Math.random() * blockTextures.length)];

  const block = Bodies.rectangle(startX, ropeLength + 50 + groundOffset, 50, 50, {
    restitution: 0,
    friction: 1,
    frictionStatic: 1.5,
    density: 0.5,
    render: {
      fillStyle: "#73F84B",
      sprite: {
        texture: randomTexture,
        xScale: 0.5,
        yScale: 0.5,
      },
    },
    label: "block",
  });

  const rope = Constraint.create({
    pointA: { x: width / 2, y: 50 + groundOffset - ropeVisualOffset },
    bodyB: block,
    // Use the original rope length so the rope stays recortada (short) as at start
    length: ropeLength,
    stiffness: 1,
    render: { strokeStyle: "#8B4513", lineWidth: 2 },
  });
  // store original length for future reference
  rope.originalLength = ropeLength;

  block.rope = rope;
  block.swingAngle = 0.5;
  World.add(world, [block, rope]);
  return block;
}


// Animate rope swing
function animateRopeSwing() {
  if (!currentBlock || !currentBlock.rope || gameOver) return

  const speedMultiplier = 1 + Math.floor(score / 10) * 0.3
  const currentSpeed = swingSpeed * speedMultiplier

  currentBlock.swingAngle += swingDirection * currentSpeed

  if (currentBlock.swingAngle >= 0.8) {
    swingDirection = -1
  } else if (currentBlock.swingAngle <= -0.8) {
    swingDirection = 1
  }

  const ropeLength = currentBlock.rope.length
  const anchorX = currentBlock.rope.pointA.x
  const anchorY = currentBlock.rope.pointA.y

  const newX = anchorX + Math.sin(currentBlock.swingAngle) * ropeLength
  const newY = anchorY + Math.cos(currentBlock.swingAngle) * ropeLength

  Body.setPosition(currentBlock, { x: newX, y: newY })
  Body.setVelocity(currentBlock, { x: 0, y: 0 })
}

function checkAndMoveWorld() {
  if (placedBlocks.length === 0) return
  if (!cameraFollowEnabled) return

  // Find highest block
  const highestBlock = placedBlocks.reduce((highest, block) => {
    return block.position.y < highest.position.y ? block : highest
  }, placedBlocks[0])

  // If tower is getting too close to top, move everything down
  if (highestBlock.position.y < moveThreshold) {
    performWorldMove(200)
  }
}

// Move the physical world down and the DOM monkey up by moveAmount
function performWorldMove(moveAmount, duration = 400) {
  // If already moving the world, ignore new requests
  if (worldMoveInProgress) return
  worldMoveInProgress = true

  const frameMs = 16
  const steps = Math.max(1, Math.ceil(duration / frameMs))
  const perStep = moveAmount / steps
  let moved = 0

  const intervalId = setInterval(() => {
    const remaining = moveAmount - moved
    const step = Math.min(perStep, remaining)

    // Update offsets and translate bodies by small step
    groundOffset += step

    // Move ground
    Body.translate(ground, { x: 0, y: step })

    // Move all placed blocks
    placedBlocks.forEach((block) => {
      Body.translate(block, { x: 0, y: step })
    })

    // Move current swinging block and its rope anchor
    if (currentBlock && currentBlock.rope) {
      // Increase persistent visual offset so the anchor stays raised permanently
  const delta = step * ropeRaiseFactor
  ropeVisualOffset += delta
      const anchorY = 50 + groundOffset - ropeVisualOffset
      currentBlock.rope.pointA.y = anchorY
      Body.translate(currentBlock, { x: 0, y: step })
    }

    // Also move the monkey DOM element up so the camera appears to follow
    try {
      const computed = window.getComputedStyle(monkey)
      const currentBottom = parseInt(computed.bottom, 10) || 0
      monkey.style.bottom = `${currentBottom + step}px`
    } catch (err) {
      // ignore if monkey element isn't available or style can't be read
    }

    moved += step
    if (moved >= moveAmount - 0.001) {
      clearInterval(intervalId)
      worldMoveInProgress = false
    }
  }, frameMs)
}

function spawnBlock() {
  currentBlock = createHangingBlock()
  blocks.push(currentBlock)
}

function moveMonkeyToCurrentBlock() {
  if (!currentBlock) return

  const blockHeight = 20
  const monkeyHeight = 50

  const blockY = currentBlock.position.y
  const blockX = currentBlock.position.x

  const newBottom = height - blockY - blockHeight / 2 + monkeyHeight / 2
  const newLeft = blockX

  monkey.style.transition = "bottom 0.5s ease-in-out, left 0.5s ease-in-out"
  monkey.style.bottom = `${newBottom}px`
  monkey.style.left = `${newLeft}px`

  setTimeout(() => {
    monkey.style.transform = "translateX(-50%) scale(1.1)"
    setTimeout(() => {
      monkey.style.transform = "translateX(-50%) scale(1)"
    }, 100)
  }, 250)
}

Events.on(engine, "beforeUpdate", () => {
  animateRopeSwing()
  checkAndMoveWorld()
})

function makeTowerFall() {
  if (towerFalling) return
  towerFalling = true

  placedBlocks.forEach((block, index) => {
    Body.setStatic(block, false)

    const wobbleForce = 0.002 + index * 0.0003
    const direction = Math.random() > 0.5 ? 1 : -1

    Body.applyForce(block, block.position, {
      x: wobbleForce * direction,
      y: 0,
    })

    Body.setAngularVelocity(block, (Math.random() - 0.5) * 0.1)
  })

  endGame()
}

function checkBlockPlacement(block) {
  if (placedBlocks.length === 0) return true

  const lastBlock = placedBlocks[placedBlocks.length - 1]
  const blockWidth = block.bounds.max.x - block.bounds.min.x

  const overlap =
    Math.min(block.bounds.max.x, lastBlock.bounds.max.x) - Math.max(block.bounds.min.x, lastBlock.bounds.min.x)

  const verticalDistance = Math.abs(block.position.y - lastBlock.position.y)

  const isValidPlacement = overlap >= blockWidth * 0.4 && verticalDistance < 60

  return isValidPlacement
}

function dropBlock() {
  if (gameOver || !currentBlock || !currentBlock.rope || towerFalling) return

  monkeyHappy()

  World.remove(world, currentBlock.rope)
  currentBlock.rope = null

  Body.setVelocity(currentBlock, { x: 0, y: currentBlock.velocity.y })

  setTimeout(() => {
    if (gameOver || towerFalling) return

    if (placedBlocks.length === 0) {
      Body.setStatic(currentBlock, true)
      placedBlocks.push(currentBlock)
      moveMonkeyToCurrentBlock()

      score++
      scoreDisplay.textContent = score
      updateHighScore(score)
      updateBackground()
      spawnBlock()
      return
    }

    const hitGround = currentBlock.position.y >= height - 50

    if (hitGround) {
      makeTowerFall()
      return
    }

    const isValidPlacement = checkBlockPlacement(currentBlock)

    if (!isValidPlacement) {
      makeTowerFall()
      return
    }

    Body.setStatic(currentBlock, true)
    placedBlocks.push(currentBlock)
    // Enable camera follow once we've reached at least 6 blocks
    if (placedBlocks.length >= 6) {
      cameraFollowEnabled = true
    }

    // Every time we've placed another set of 6 blocks, trigger a camera/world move
    if (placedBlocks.length % 6 === 0) {
      performWorldMove(200)
    }
    moveMonkeyToCurrentBlock()

    score++
    scoreDisplay.textContent = score
    updateHighScore(score)
    updateBackground()

    spawnBlock()
  }, 600) // Increased from 500ms to 600ms
}

function monkeyHappy() {
  monkey.classList.add("monkey-happy")
  setTimeout(() => {
    monkey.classList.remove("monkey-happy")
  }, 500)
}

function monkeySad() {
  monkey.classList.add("monkey-sad")
}

function updateBackground() {
  if (score < 5) render.options.background = backgrounds[0]
  else if (score < 10) render.options.background = backgrounds[1]
  else render.options.background = backgrounds[2]
}

function endGame() {
  if (gameOver) return
  gameOver = true
  monkeySad()
  monkey.classList.add("monkey-falling")

  monkey.style.transition = "bottom 1.5s ease-in"
  monkey.style.bottom = "20px"

  finalScore.textContent = score
  gameOverScreen.classList.remove("hidden")
}

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    dropBlock()
  }
})

canvas.addEventListener("click", dropBlock)
retryBtn.addEventListener("click", () => window.location.reload())
menuBtn.addEventListener("click", () => alert("Menu not implemented"))

function initializeMonkey() {
  monkey.style.position = "absolute"
  monkey.style.bottom = "20px"
  monkey.style.left = "50%"
  monkey.style.transform = "translateX(-50%)"
  monkey.style.height = "50px"
  monkey.style.transition = "bottom 0.5s ease-in-out, left 0.5s ease-in-out"
  monkey.style.zIndex = "100"
}

initializeMonkey()
spawnBlock()
