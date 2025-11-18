/**
 * @file Contiene la lógica principal del juego, el motor de físicas y el renderizado.
 */

// Import Matter.js library
const Matter = window.Matter
const { Engine, Render, Runner, Bodies, Composite, Events, World, Constraint, Body } = Matter

const width = canvas.width
const height = canvas.height

// --- NIVELES ---
const urlParams = new URLSearchParams(window.location.search);
const level = parseInt(urlParams.get('level')) || 1;

// Engine and render
const engine = Engine.create()
const world = engine.world
world.gravity.y = 1

console.log('Canvas dimensions:', width, height);
console.log('Canvas context:', canvas.getContext('2d'));

const render = Render.create({
  canvas,
  engine,
  options: {
    width,
    height,
    wireframes: false,
    background: 'transparent',
    showDebug: false,
    hasBounds: false
  },
})

console.log('Render created:', render);
Render.run(render);

const ropeTexture = new Image();
ropeTexture.src = 'assets/images/ui/cuerda.png';

// Array para trackear rocas activas
let activeRocks = [];

// Debug extensivo para rocas
Events.on(engine, 'afterUpdate', function() {
  const allBodies = Composite.allBodies(world);
  activeRocks = allBodies.filter(body => body.label === 'rock' || body.label === 'test_rock');
  
  if (activeRocks.length > 0) {
    console.log('=== ROCKS DEBUG ===');
    console.log('Active rocks count:', activeRocks.length);
    activeRocks.forEach((rock, index) => {
      console.log(`Rock ${index}:`, {
        id: rock.id,
        label: rock.label,
        position: { x: Math.round(rock.position.x), y: Math.round(rock.position.y) },
        velocity: { x: Math.round(rock.velocity.x * 100)/100, y: Math.round(rock.velocity.y * 100)/100 },
        bounds: rock.bounds
      });
    });
    console.log('==================');
  }
});

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
let isWobbling = false
let swingDirection = 1
let swingSpeed = 0.008
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

  const rope = Constraint.create({
    pointA: { x: width / 2, y: 10 },
    bodyB: block,
    length: ropeLength,
    stiffness: 1,
    render: { visible: false },
  });

  rope.originalLength = ropeLength;
  block.rope = rope;

  const startAngle = 0.5;
  block.swingAngle = startAngle;

  const offsetX = Math.sin(startAngle) * ropeLength;
  const offsetY = Math.cos(startAngle) * ropeLength;
  Body.setPosition(block, {
    x: rope.pointA.x + offsetX,
    y: rope.pointA.y + offsetY,
  });

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

  if (currentBlock.shouldSpinWhileSwing) {
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

    if (currentBlock && currentBlock.rope) {
      Body.translate(currentBlock, { x: 0, y: step })
      currentBlock.rope.pointA.y = 10
    }

    // Mover rocas activas también
    activeRocks.forEach(rock => {
      Body.translate(rock, { x: 0, y: step });
    });

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

  setTimeout(() => {
    monkey.classList.remove("monkey-climbing")
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

  if (!towerFalling && placedBlocks.length > 1) {
    for (const block of placedBlocks) {
      if (block.position.y > (ground.position.y - 10) || Math.abs(block.angle) > 0.9) {
        makeTowerFall()
        break
      }
    }
  }
})

Events.on(engine, 'collisionStart', function(event) {
  const pairs = event.pairs;

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    const bodyA = pair.bodyA;
    const bodyB = pair.bodyB;

    const isRockA = bodyA.label === 'rock';
    const isRockB = bodyB.label === 'rock';
    
    const isPlacedBlockA = bodyA.label === 'block' && placedBlocks.some(b => b.id === bodyA.id);
    const isPlacedBlockB = bodyB.label === 'block' && placedBlocks.some(b => b.id === bodyB.id);

    if ((isRockA && isPlacedBlockB) || (isRockB && isPlacedBlockA)) {
      wobbleTower();
      
      const rockBody = isRockA ? bodyA : bodyB;
      setTimeout(() => {
        if (World.get(engine.world, rockBody.id)) {
            World.remove(world, rockBody);
        }
      }, 200);
    }
  }
});

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

  if (distance < 50) {
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
  }, 5000);
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
 * Comprueba si la colocación de un bloque es válida.
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
 * Hace que la torre se tambalee.
 */
function wobbleTower() {
  if (towerFalling || isWobbling || placedBlocks.length < 2) return;
  isWobbling = true;

  placedBlocks.forEach((block, index) => {
    Body.setStatic(block, false);
    const wobbleForce = 0.0005 + index * 0.00005;
    const direction = Math.random() > 0.5 ? 1 : -1;
    Body.applyForce(block, block.position, {
      x: wobbleForce * direction,
      y: -0.0005, // A little push up to counteract gravity
    });
  });

  setTimeout(() => {
    placedBlocks.forEach((block) => {
      if (!towerFalling) {
        Body.setVelocity(block, { x: 0, y: 0 });
        Body.setAngularVelocity(block, 0);
        Body.setStatic(block, true);
      }
    });
    isWobbling = false;
  }, 500);
}

/**
 * Anima la caída de la cámara.
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
    
    // Mover rocas también
    activeRocks.forEach(rock => {
      Body.translate(rock, { x: 0, y: -step });
    });
    
    if (currentBlock && currentBlock.rope) {
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
  const delay = Math.random() * 10000 + 10000;
  setTimeout(() => {
    spawnPowerUp();
    scheduleNextPowerUp();
  }, delay);
}

/**
 * Lanza un objeto a la torre. (Nivel 2 y 3)
 */
function throwObjectAtTower() {
    if (gameOver || towerFalling || placedBlocks.length < 3) return;

    const side = Math.random() > 0.5 ? 'left' : 'right';
    const startX = side === 'left' ? -30 : width + 30;
    const startY = Math.random() * (height - 250) + 150;

    const rock = Bodies.rectangle(startX, startY, 35, 35, {
        restitution: 0.3,
        friction: 0.7,
        density: 1.5,
        render: {
            sprite: {
                texture: 'assets/images/blocks/block1.png',
                xScale: 0.4,
                yScale: 0.4
            }
        },
        label: "rock",
        chamfer: { radius: 8 }
    });

    World.add(world, rock);

    // Apuntar a un bloque aleatorio en la mitad superior de la torre
    const upperBlocks = placedBlocks.slice(Math.floor(placedBlocks.length / 2));
    const targetBlock = upperBlocks[Math.floor(Math.random() * upperBlocks.length)];
    
    if (!targetBlock) return;

    const targetX = targetBlock.position.x;
    const targetY = targetBlock.position.y;

    const distanceX = targetX - startX;
    const distanceY = targetY - startY;
    
    const angle = Math.atan2(distanceY, distanceX);
    
    // Velocidad directa en lugar de fuerza
    const speed = 7 + Math.random() * 3; // Velocidad entre 7 y 10
    const velocity = {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed * 0.1 // Reducir la componente vertical para una trayectoria más plana
    };

    // Aplicar velocidad y rotación
    Body.setVelocity(rock, velocity);
    Body.setAngularVelocity(rock, (Math.random() - 0.5) * 0.3);

    // Eliminar la roca después de un tiempo para que no se acumulen
    setTimeout(() => {
        if (World.get(engine.world, rock.id)) {
            World.remove(world, rock);
        }
    }, 10000);
}

/**
 * Programa el lanzamiento de objetos para niveles 2 y 3.
 */
function scheduleObjectThrows() {
    if (level < 2 || gameOver) return;
    console.log('⏰ Scheduling object throws for level', level);

    const baseDelay = 3000; // 3 segundos entre lanzamientos
    const delay = baseDelay;
    
    console.log('⏱️ Next throw in', delay / 1000, 'seconds');

    setTimeout(() => {
        if (!gameOver && !towerFalling) {
            throwObjectAtTower();
            scheduleObjectThrows();
        }
    }, delay);
}

// Iniciar lanzamientos de objetos para nivel 2+
setTimeout(() => {
    if (level >= 2) {
        scheduleObjectThrows();
    }
}, 1500);
// EVENT LISTENERS AL FINAL
document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    dropBlock()
  }
})

canvas.addEventListener("click", dropBlock)

// INICIALIZACIÓN
initializeMonkey()
spawnBlock()
scheduleNextPowerUp()
console.log('🎮 Level:', level, 'Score:', score, 'Placed blocks:', placedBlocks.length)
if (level >= 2) {
    console.log('🚀 Scheduling object throws for level >= 2')
} else {
    console.log('❌ Not scheduling throws, level < 2')
}