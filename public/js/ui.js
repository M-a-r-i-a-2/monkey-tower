/**
 * @file Gestiona la interfaz de usuario, incluyendo los elementos del DOM y los eventos.
 */

const canvas = document.getElementById("gameCanvas")
const monkey = document.getElementById("monkey")
const scoreDisplay = document.getElementById("score")
const gameOverScreen = document.getElementById("gameOver")
const finalScore = document.getElementById("finalScore")
const retryBtn = document.getElementById("retryBtn")
const menuBtn = document.getElementById("menuBtn")
const volumeSlider = document.getElementById("volumeSlider")
const settingsBtn = document.getElementById('settingsBtn')
const inGameSettings = document.getElementById('inGameSettings')
const igVolumeSlider = document.getElementById('igVolumeSlider')
const sfxVolumeSlider = document.getElementById('sfxVolumeSlider')
const igCloseSettings = document.getElementById('igCloseSettings')
const igMenuBtn = document.getElementById('igMenuBtn')
const igQuitBtn = document.getElementById('igQuitBtn')
const recordWarning = document.getElementById('recordWarning')
const powerUp = document.getElementById('powerUp')

retryBtn.addEventListener("click", () => window.location.reload())
menuBtn.addEventListener("click", () => {
  window.location.href = 'index.html'
})

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

/**
 * Termina el juego y muestra la pantalla de fin de juego.
 */
function endGame() {
  if (gameOver) return
  gameOver = true
  monkey.classList.add("monkey-falling")

  monkey.style.transition = "bottom 1.5s ease-in"
  monkey.style.bottom = "20px"

  finalScore.textContent = score
  gameOverScreen.classList.remove("hidden")
}

/**
 * Activa la animación de mono feliz.
 */
function monkeyHappy() {
  monkey.classList.add("monkey-happy")
  setTimeout(() => {
    monkey.classList.remove("monkey-happy")
  }, 500)
}

/**
 * Activa la animación de mono triste.
 */
function monkeySad() {
  monkey.classList.add("monkey-sad")
}

/**
 * Inicializa la posición y el estilo del mono.
 */
function initializeMonkey() {
  monkey.style.position = "absolute"
  monkey.style.bottom = "20px"
  monkey.style.left = "50%"
  monkey.style.transform = "translateX(-50%)"
  monkey.style.height = "50px"
  monkey.style.transition = "bottom 0.5s ease-in-out, left 0.5s ease-in-out"
  monkey.style.zIndex = "100"
}

/**
 * Muestra u oculta una advertencia si el jugador está cerca de su récord.
 * @param {number} score La puntuación actual.
 * @param {number} highScore El récord actual.
 */
function checkRecordWarning(score, highScore) {
  if (!recordWarning) return;

  const proximity = 3; // a cuántos puntos de distancia para mostrar el mensaje
  if (highScore > 0 && score >= highScore - proximity && score < highScore) {
    recordWarning.classList.remove('hidden');
  } else {
    recordWarning.classList.add('hidden');
  }
}