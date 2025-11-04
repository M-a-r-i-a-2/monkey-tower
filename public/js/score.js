/**
 * @file Gestiona la puntuación, la puntuación más alta y los récords del juego.
 */

const highScoreDisplay = document.getElementById("highScore")
const recordsPanel = document.getElementById("recordsPanel")
const viewRecordsBtn = document.getElementById("viewRecords")
const closeRecordsBtn = document.getElementById("closeRecords")
const recordsList = document.getElementById("recordsList")
// Score
let score = 0
let highScore = Number.parseInt(localStorage.getItem("highScore")) || 0
highScoreDisplay.textContent = highScore

/**
 * Actualiza la puntuación más alta si la nueva puntuación es mayor.
 * @param {number} newScore La nueva puntuación.
 */
function updateHighScore(newScore) {
  if (newScore > highScore) {
    highScore = newScore
    localStorage.setItem("highScore", highScore)
    highScoreDisplay.textContent = highScore
    saveRecord(newScore)
  }
}

/**
 * Guarda un nuevo récord en el almacenamiento local.
 * @param {number} newScore La nueva puntuación a guardar.
 */
function saveRecord(newScore) {
  const date = new Date().toLocaleDateString("es-MX")
  const records = JSON.parse(localStorage.getItem("records")) || []
  records.push({ score: newScore, date })
  records.sort((a, b) => b.score - a.score)
  localStorage.setItem("records", JSON.stringify(records.slice(0, 5)))
}

/**
 * Muestra los récords en el panel de récords.
 */
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