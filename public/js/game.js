// Import Matter.js library
// Música de fondo (se inicia tras la primera interacción del usuario)
const bgMusic = new Audio('assets/sounds/music.mp3');
bgMusic.loop = true;
const savedVolume = localStorage.getItem('musicVolume');
bgMusic.volume = savedVolume !== null ? Number(savedVolume) : 0.5;

// Sonido de fallo (torre caída)
const failSfx = new Audio('assets/sounds/falled.mp3');
failSfx.preload = 'auto';
failSfx.volume = savedVolume !== null ? Number(savedVolume) : 0.5;

function playBgMusicOnFirstInteraction() {
  bgMusic.play().catch(() => {})
  document.removeEventListener('click', playBgMusicOnFirstInteraction)
  document.removeEventListener('keydown', playBgMusicOnFirstInteraction)
}
document.addEventListener('click', playBgMusicOnFirstInteraction)
document.addEventListener('keydown', playBgMusicOnFirstInteraction)
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
const volumeSlider = document.getElementById("volumeSlider")
const recordsPanel = document.getElementById("recordsPanel")
const viewRecordsBtn = document.getElementById("viewRecords")
const closeRecordsBtn = document.getElementById("closeRecords")
const recordsList = document.getElementById("recordsList")
const settingsBtn = document.getElementById('settingsBtn')
const inGameSettings = document.getElementById('inGameSettings')
const igVolumeSlider = document.getElementById('igVolumeSlider')
const sfxVolumeSlider = document.getElementById('sfxVolumeSlider')
const igCloseSettings = document.getElementById('igCloseSettings')
const igMenuBtn = document.getElementById('igMenuBtn')
const igQuitBtn = document.getElementById('igQuitBtn')

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

let groundOffset = 0
const moveThreshold = 150
let cameraFollowEnabled = false
let worldMoveInProgress = false
let ropeVisualOffset = 0
const ropeRaiseFactor = 1

// Create hanging block
function createHangingBlock() {
  const ropeLength = Math.max(120 - score * 2.5, 60);
  const startX = width / 2 + 100;

  const blockTextures = [
    "assets/images/blocks/block1.png",
    "assets/images/blocks/block2.png",
    "assets/images/blocks/block3.png",
  ];
  const randomTexture = blockTextures[Math.floor(Math.random() * blockTextures.length)];

  const block = Bodies.rectangle(startX, ropeLength + 50 + groundOffset, 50, 50, {
    restitution: 0,
    friction: 1,
    frictionStatic: 1.5,
    density: 0.5,
    render: {
      sprite: { texture: randomTexture, xScale: 0.5, yScale: 0.5 },
    },
    label: "block",
  });

  // Mantener el ancla SIEMPRE fija en la parte superior de la pantalla (y = 50)
  const rope = Constraint.create({
    pointA: { x: width / 2, y: 50 },
    bodyB: block,
    length: ropeLength,
    stiffness: 1,
    render: { visible: true },
  });

  rope.originalLength = ropeLength;
  block.rope = rope;

  // Ángulo inicial hacia la derecha
  const startAngle = 0.5; // radianes
  block.swingAngle = startAngle;

  // Sincroniza la posición del bloque con ese ángulo respecto al ancla fija
  const offsetX = Math.sin(startAngle) * ropeLength;
  const offsetY = Math.cos(startAngle) * ropeLength;
  Body.setPosition(block, {
    x: rope.pointA.x + offsetX,
    y: rope.pointA.y + offsetY,
  });

  // Si a partir de 21 cajas colocadas, los próximos bloques deben girar mientras se balancean
  block.shouldSpinWhileSwing = placedBlocks.length >= 21;

  World.add(world, [block, rope]);
  return block;
}


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

  // A partir de 21 cajas colocadas, el bloque en la cuerda rota mientras se balancea
  if (currentBlock.shouldSpinWhileSwing) {
    // velocidad angular suave dependiente del sentido del balanceo
    Body.setAngularVelocity(currentBlock, 0.08 * swingDirection)
  } else {
    Body.setAngularVelocity(currentBlock, 0)
  }
}

function checkAndMoveWorld() {
  if (placedBlocks.length === 0) return
  if (!cameraFollowEnabled) return

  const highestBlock = placedBlocks.reduce((highest, block) => {
    return block.position.y < highest.position.y ? block : highest
  }, placedBlocks[0])

  if (highestBlock.position.y < moveThreshold) {
    performWorldMove(200)
  }
}

function performWorldMove(moveAmount, duration = 400) {
  if (worldMoveInProgress) return
  worldMoveInProgress = true

  const frameMs = 16
  const steps = Math.max(1, Math.ceil(duration / frameMs))
  const perStep = moveAmount / steps
  let moved = 0

  const intervalId = setInterval(() => {
    const remaining = moveAmount - moved
    const step = Math.min(perStep, remaining)

    groundOffset += step

    Body.translate(ground, { x: 0, y: step })

    placedBlocks.forEach((block) => {
      Body.translate(block, { x: 0, y: step })
    })

    // Mantener el ancla de la cuerda fija en y=50; solo trasladar el bloque visualmente con el mundo
    if (currentBlock && currentBlock.rope) {
      Body.translate(currentBlock, { x: 0, y: step })
      // punto A permanece en (x, 50)
      currentBlock.rope.pointA.x = width / 2
      currentBlock.rope.pointA.y = 50
    }

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
      performWorldMove._snapActive = false
      performWorldMove._snapAnchor = null
      performWorldMove._snapOffset = 0
    }
  }, frameMs)
}

function spawnBlock() {
  currentBlock = createHangingBlock()
  blocks.push(currentBlock)
}

function moveMonkeyToCurrentBlock() {
  if (!currentBlock) return

  const blockHeight = 0
  const monkeyHeight = 50
  const contactPadding = -16
  const horizontalNudge = 0

  const blockY = currentBlock.position.y
  const blockX = currentBlock.position.x

  const newBottom = height - blockY - blockHeight / 2 + monkeyHeight / 2 + contactPadding
  const newLeft = blockX + horizontalNudge

  monkey.classList.add("monkey-climbing")

  monkey.style.transition = "bottom 0.5s ease-in-out, left 0.5s ease-in-out"
  monkey.style.bottom = `${newBottom}px`
  monkey.style.left = `${newLeft}px`

  setTimeout(() => {
    monkey.style.transform = "translateX(-50%) scale(1.05)"
    setTimeout(() => {
      monkey.style.transform = "translateX(-50%) scale(1)"
      monkey.classList.remove("monkey-climbing")
    }, 120)
  }, 220)
}

Events.on(engine, "beforeUpdate", () => {
  animateRopeSwing()
  checkAndMoveWorld()
})

function animateCameraFall(moveAmount = 300, duration = 700, callback) {
  if (worldMoveInProgress) return
  worldMoveInProgress = true
  const frameMs = 16
  const steps = Math.max(1, Math.ceil(duration / frameMs))
  const perStep = moveAmount / steps
  let moved = 0

  const intervalId = setInterval(() => {
    const remaining = moveAmount - moved
    const step = Math.min(perStep, remaining)
    groundOffset -= step

    placedBlocks.forEach((block) => {
      Body.translate(block, { x: 0, y: -step })
    })
    if (currentBlock && currentBlock.rope) {
      // Mantener ancla fija
      currentBlock.rope.pointA.x = width / 2
      currentBlock.rope.pointA.y = 50
      Body.translate(currentBlock, { x: 0, y: -step })
    }
    try {
      if (!animateCameraFall._startMonkeyBottomCaptured) {
        const computed = window.getComputedStyle(monkey)
        animateCameraFall._startMonkeyBottom = parseInt(computed.bottom, 10) || 0
        animateCameraFall._movedAccum = 0
        animateCameraFall._startMonkeyBottomCaptured = true
      }
      animateCameraFall._movedAccum += step
      monkey.style.bottom = `${animateCameraFall._startMonkeyBottom - animateCameraFall._movedAccum}px`
    } catch (err) {}
    moved += step
    if (moved >= moveAmount - 0.001) {
      clearInterval(intervalId)
      worldMoveInProgress = false
      animateCameraFall._startMonkeyBottomCaptured = false
      if (callback) callback()
    }
  }, frameMs)
}

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
  
  try {
    failSfx.currentTime = 0
    failSfx.play().catch(() => {})
  } catch (e) {}

  const lowestBlock = placedBlocks.reduce((lowest, block) => {
    return block.position.y > lowest.position.y ? block : lowest
  }, placedBlocks[0])
  const distanceToGround = ground.position.y - lowestBlock.position.y
  const moveAmount = Math.max(0, distanceToGround - 40)
  animateCameraFall(Math.max(moveAmount, 100), 700, endGame)
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
    
    if (placedBlocks.length >= 6) {
      cameraFollowEnabled = true
    }

    if (placedBlocks.length % 6 === 0) {
      const anchor = placedBlocks[placedBlocks.length - 1]
      try {
        const computed = window.getComputedStyle(monkey)
        const currentBottom = parseInt(computed.bottom, 10) || 0
        const blockHeight = 0
        const monkeyHeight = 50
        const contactPadding = -16
        const baseBottom = height - anchor.position.y - blockHeight / 2 + monkeyHeight / 2 + contactPadding
        performWorldMove._snapActive = true
        performWorldMove._snapAnchor = anchor
        performWorldMove._snapOffset = currentBottom - baseBottom
      } catch (e) {
        performWorldMove._snapActive = false
        performWorldMove._snapAnchor = null
        performWorldMove._snapOffset = 0
      }
      performWorldMove(200)
    }
    moveMonkeyToCurrentBlock()

    score++
    scoreDisplay.textContent = score
    updateHighScore(score)
    updateBackground()

    spawnBlock()
  }, 600)
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
menuBtn.addEventListener("click", () => {
  window.location.href = 'index.html'
})

if (volumeSlider) {
  volumeSlider.addEventListener('input', (e) => {
    bgMusic.volume = Number(e.target.value);
  });
}

if (settingsBtn && inGameSettings) {
  settingsBtn.addEventListener('click', () => {
    inGameSettings.classList.toggle('hidden')
  })
}

if (igCloseSettings) {
  igCloseSettings.addEventListener('click', () => {
    inGameSettings.classList.add('hidden')
  })
}

if (igVolumeSlider) {
  const saved = localStorage.getItem('musicVolume')
  igVolumeSlider.value = saved !== null ? saved : bgMusic.volume
  igVolumeSlider.addEventListener('input', (e) => {
    const v = Number(e.target.value)
    bgMusic.volume = v
    localStorage.setItem('musicVolume', String(v))
  })
}
if (sfxVolumeSlider) {
  const savedSfx = localStorage.getItem('sfxVolume')
  sfxVolumeSlider.value = savedSfx !== null ? savedSfx : failSfx.volume
  sfxVolumeSlider.addEventListener('input', (e) => {
    const v = Number(e.target.value)
    failSfx.volume = v
    localStorage.setItem('sfxVolume', String(v))
  })
}

if (igMenuBtn) {
  igMenuBtn.addEventListener('click', () => {
    endGame()
    setTimeout(() => { window.location.href = 'index.html' }, 1200)
  })
}

if (igQuitBtn) {
  igQuitBtn.addEventListener('click', () => {
    endGame()
  })
}

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