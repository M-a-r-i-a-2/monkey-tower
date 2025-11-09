/**
 * @file Contiene la lógica principal del juego, el motor de físicas y el renderizado.
 */

// Import Matter.js library
const Matter = window.Matter
const { Engine, Render, Runner, Bodies, Composite, Events, World, Constraint, Body } = Matter

const width = canvas.width
const height = canvas.height


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
    background: 'transparent',
  },
})
Render.run(render)

const ropeTexture = new Image();
ropeTexture.src = 'assets/images/ui/cuerda.png'; // New image

Events.on(render, 'afterRender', () => {
  if (currentBlock && currentBlock.rope && ropeTexture.complete && ropeTexture.naturalHeight !== 0) {
    const context = canvas.getContext('2d');
    const pointA = currentBlock.rope.pointA;
    const pointB = currentBlock.position;

    const distance = Math.sqrt(Math.pow(pointB.x - pointA.x, 2) + Math.pow(pointB.y - pointA.y, 2));
    const angle = Math.atan2(pointB.y - pointA.y, pointB.x - pointA.x);

    context.save();
    context.translate(pointA.x, pointA.y);
    context.rotate(angle - Math.PI / 2);
    
    const textureHeight = ropeTexture.height * 0.5;
    const ropeWidth = ropeTexture.width * 1.5;
    const numSegments = Math.floor(distance / textureHeight);
    
    for (let i = 0; i < numSegments; i++) {
        context.drawImage(ropeTexture, -ropeWidth / 2, i * textureHeight, ropeWidth, textureHeight);
    }

    const remainder = distance - (numSegments * textureHeight);
    if (remainder > 0) {
        context.drawImage(
            ropeTexture,
            -ropeWidth / 2, numSegments * textureHeight,
            ropeWidth, remainder
        );
    }

    context.restore();
  }
});

const runner = Runner.create()
Runner.run(runner, engine)

// Ground
const ground = Bodies.rectangle(width / 2, height - 10, width, 20, {
  isStatic: true,
  render: { fillStyle: "#6b4f3b" },
  friction: 1.0,
})
World.add(world, ground)

// Game
const blocks = []
let currentBlock
let gameOver = false
const placedBlocks = []
let towerFalling = false
let swingDirection = 1
const swingSpeed = 0.008
let cameraMoveAmount = 250;

// Power-up
let powerUpActive = false;
let originalSwingSpeed = swingSpeed;
const powerUpElement = document.getElementById('powerUp');
const vignette = document.getElementById('vignette');
const powerUpSfx = new Audio('assets/sounds/powerup.mp3');

let groundOffset = 0
const moveThreshold = 150
let cameraFollowEnabled = false
let worldMoveInProgress = false
let ropeVisualOffset = 0
const ropeRaiseFactor = 1

/**
 * Crea un nuevo bloque que cuelga de una cuerda.
 * @returns {Matter.Body} El cuerpo del bloque creado.
 */
function createHangingBlock() {
  const ropeLength = 120;
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
    pointA: { x: width / 2, y: 10 },
    bodyB: block,
    length: ropeLength,
    stiffness: 1,
    render: { visible: false },
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
  block.shouldSpinWhileSwing = placedBlocks.length >= 15;

  World.add(world, [block, rope]);
  return block;
}

/**
 * Anima el balanceo del bloque actual.
 */
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

/**
 * Comprueba si el mundo del juego necesita moverse hacia arriba.
 */
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

/**
 * Mueve el mundo del juego hacia arriba.
 * @param {number} moveAmount La cantidad a mover.
 * @param {number} [duration=400] La duración de la animación.
 */
function performWorldMove(moveAmount, duration = 400) {
  if (worldMoveInProgress) return
  worldMoveInProgress = true

  monkey.style.transition = 'none';



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
            currentBlock.rope.pointA.y = 10    }

    if (performWorldMove._snapActive && performWorldMove._snapAnchor) {
        const anchor = performWorldMove._snapAnchor;
        const blockHeight = 25;
        const monkeyHeight = 50;
        const contactPadding = -10;
        const newBottom = height - anchor.position.y - blockHeight / 2 + monkeyHeight / 2 + contactPadding;
        monkey.style.bottom = `${newBottom}px`;
        monkey.style.left = `${anchor.position.x}px`;
    }

    moved += step
    if (moved >= moveAmount - 0.001) {
      clearInterval(intervalId)
      worldMoveInProgress = false
      performWorldMove._snapActive = false
      performWorldMove._snapAnchor = null
      performWorldMove._snapOffset = 0
      monkey.style.transition = "bottom 0.5s ease-in-out, left 0.5s ease-in-out";

    }
  }, frameMs)
}

/**
 * Crea un nuevo bloque.
 */
function spawnBlock() {
  currentBlock = createHangingBlock()
  blocks.push(currentBlock)
}

/**
 * Mueve el mono al bloque actual.
 */
function moveMonkeyToCurrentBlock() {
  if (!currentBlock) return

  const blockHeight = 25
  const monkeyHeight = 50
  const contactPadding = -10
  const horizontalNudge = 0

  const blockY = currentBlock.position.y
  const blockX = currentBlock.position.x

  const newBottom = height - blockY - blockHeight / 2 + monkeyHeight / 2 + contactPadding
    const newLeft = blockX + horizontalNudge
  
    monkey.classList.add("monkey-climbing");
    monkey.style.transition = "bottom 0.5s ease-in-out, left 0.5s ease-in-out"
  monkey.style.bottom = `${newBottom}px`
  monkey.style.left = `${newLeft}px`

  // La transición dura 500ms, así que quitamos la clase de animación justo después
  setTimeout(() => {
    monkey.classList.remove("monkey-climbing")
    // Pequeño "salto" al llegar
    monkey.style.transform = "translateX(-50%) scale(1.05)"
    setTimeout(() => {
      monkey.style.transform = "translateX(-50%) scale(1)"
    }, 120)
  }, 500)
}

Events.on(engine, "beforeUpdate", () => {
  animateRopeSwing()
  checkAndMoveWorld()
  checkPowerUpCollision()
})

/**
 * Comprueba la colisión entre el bloque actual y el power-up.
 */
function checkPowerUpCollision() {
  if (!powerUpActive || !currentBlock) return;

  const blockPos = currentBlock.position;
  const powerUpPos = {
    x: parseFloat(powerUpElement.style.left),
    y: parseFloat(powerUpElement.style.top),
  };

  const distance = Math.sqrt(
    Math.pow(blockPos.x - powerUpPos.x, 2) + Math.pow(blockPos.y - powerUpPos.y, 2)
  );

  if (distance < 50) { // 50 es un umbral de colisión
    activatePowerUp();
  }
}

/**
 * Activa el power-up de ralentización.
 */
function activatePowerUp() {
  powerUpElement.classList.add('hidden');
  powerUpActive = false;

  vignette.classList.remove('hidden');

  const sfxVolume = localStorage.getItem('sfxVolume');
  powerUpSfx.volume = sfxVolume !== null ? Number(sfxVolume) : 0.5;
  powerUpSfx.play().catch(() => {});

  const slowSpeed = originalSwingSpeed / 2;
  swingSpeed = slowSpeed;

  setTimeout(() => {
    swingSpeed = originalSwingSpeed;
    vignette.classList.add('hidden');
  }, 5000); // 5 segundos de efecto
}

/**
 * Anima la caída de la cámara.
 * @param {number} [moveAmount=300] La cantidad a mover.
 * @param {number} [duration=700] La duración de la animación.
 * @param {function} [callback] Una función de devolución de llamada para ejecutar después de la animación.
 */
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
      currentBlock.rope.pointA.y = 10
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

/**
 * Hace que la torre se caiga.
 */
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

/**
 * Comprueba si la colocación de un bloque es válida.
 * @param {Matter.Body} block El bloque a comprobar.
 * @returns {boolean} Si la colocación es válida.
 */
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

/**
 * Suelta el bloque actual.
 */
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
      createBlockPlacementParticles(currentBlock.position.x, currentBlock.position.y)
      moveMonkeyToCurrentBlock()

      score++
      scoreDisplay.textContent = score
      updateHighScore(score)
      checkRecordWarning(score, highScore)
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
    createBlockPlacementParticles(currentBlock.position.x, currentBlock.position.y)
    
    if (placedBlocks.length >= 6) {
      cameraFollowEnabled = true
    }

    if (placedBlocks.length > 0 && placedBlocks.length % 6 === 0) {
      const anchor = placedBlocks[placedBlocks.length - 1]
      try {
        const computed = window.getComputedStyle(monkey)
        const currentBottom = parseInt(computed.bottom, 10) || 0
        const blockHeight = 25
        const monkeyHeight = 50
        const contactPadding = -10
        const baseBottom = height - anchor.position.y - blockHeight / 2 + monkeyHeight / 2 + contactPadding
        performWorldMove._snapActive = true
        performWorldMove._snapAnchor = anchor
        performWorldMove._snapOffset = currentBottom - baseBottom
      } catch (e) {
        performWorldMove._snapActive = false
        performWorldMove._snapAnchor = null
        performWorldMove._snapOffset = 0
      }
      performWorldMove(cameraMoveAmount)
      cameraMoveAmount += 20;
    }
    moveMonkeyToCurrentBlock()

    score++
    scoreDisplay.textContent = score
    updateHighScore(score)
    checkRecordWarning(score, highScore)
    updateBackground()

    spawnBlock()
  }, 600)
}

/**
 * Actualiza el fondo del juego en función de la puntuación.
 */
function updateBackground() {
  canvas.classList.remove("bg-evening", "bg-night")
  canvas.classList.add("bg-day")
}

/**
 * Muestra el power-up en una posición aleatoria.
 */
function spawnPowerUp() {
  if (powerUpActive || gameOver) return;

  const x = Math.random() * (width - 100) + 50;
  const y = Math.random() * (height / 2) + 50;

  powerUpElement.style.left = `${x}px`;
  powerUpElement.style.top = `${y}px`;
  powerUpElement.classList.remove('hidden');

  powerUpActive = true;
}

/**
 * Programa la aparición del siguiente power-up.
 */
function scheduleNextPowerUp() {
  const delay = Math.random() * 10000 + 10000; // Entre 10 y 20 segundos
  setTimeout(() => {
    spawnPowerUp();
    scheduleNextPowerUp();
  }, delay);
}



document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    dropBlock()
  }
})

canvas.addEventListener("click", dropBlock)

initializeMonkey()
spawnBlock()
scheduleNextPowerUp()