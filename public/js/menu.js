// --- Selectores del DOM (Originales y Nuevos) ---
const playBtn = document.getElementById("play-btn");
const optionsBtn = document.getElementById("options-btn");
const exitBtn = document.getElementById("exit-btn");

// Elementos del panel de récords
const recordsPanel = document.getElementById("recordsPanel");
const closeRecords = document.getElementById("closeRecords");
const recordsList = document.getElementById("recordsList");

// Elementos del panel de opciones
const optionsPanel = document.getElementById("optionsPanel");
const closeOptions = document.getElementById("closeOptions");
const viewRecordsBtn = document.getElementById("view-records-btn");
const volumeSlider = document.getElementById("volumeSlider");

// Elementos del panel de selección de nivel
const levelSelectionPanel = document.getElementById("level-selection-panel");
const closeLevelSelectionBtn = document.getElementById("close-level-selection");
const levelButtons = document.querySelectorAll(".level-btn");


// --- Lógica de los Botones ---

// 1. El botón "JUGAR" ahora abre el panel de selección de nivel
playBtn.addEventListener("click", () => {
    levelSelectionPanel.classList.remove("hidden");
});

// 2. El botón de Opciones abre el panel de opciones
optionsBtn.addEventListener("click", () => {
    optionsPanel.classList.remove("hidden");
});

function showRecords() {
    const records = JSON.parse(localStorage.getItem("records")) || [];
    recordsList.innerHTML = "";

    if (records.length === 0) {
        recordsList.innerHTML = "<li>No hay récords aún</li>";
    } else {
        records.sort((a, b) => b.score - a.score);
        records.forEach((r, i) => {
            const li = document.createElement("li");
            li.innerHTML = `<span>#${i + 1}</span><span>${r.score} pts</span><span>${r.date}</span>`;
            recordsList.appendChild(li);
        });
    }

    optionsPanel.classList.add("hidden");
    recordsPanel.classList.remove("hidden");
}

// 3. El botón "Récords" (dentro de opciones) carga y muestra las puntuaciones
viewRecordsBtn.addEventListener("click", showRecords);

// Lógica para el nuevo botón de reiniciar récords
const resetRecordsBtn = document.getElementById("resetRecords");
resetRecordsBtn.addEventListener("click", () => {
    if (confirm("¿Estás seguro de que quieres borrar todos los récords? Esta acción no se puede deshacer.")) {
        localStorage.removeItem("records");
        localStorage.removeItem("highScore");
        showRecords();
    }
});

// 4. Lógica para cerrar el panel de selección de nivel
closeLevelSelectionBtn.addEventListener("click", () => {
    levelSelectionPanel.classList.add("hidden");
});

// 5. Lógica para los botones de nivel
levelButtons.forEach(button => {
    button.addEventListener("click", () => {
        const level = button.dataset.level;
        window.location.href = `game.html?level=${level}`;
    });
});

// 6. Lógica para cerrar el panel de opciones
closeOptions.addEventListener("click", () => {
    optionsPanel.classList.add("hidden");
});

// 7. Cerrar panel de récords
closeRecords.addEventListener("click", () => {
    recordsPanel.classList.add("hidden");
});

// 8. Salir del juego
exitBtn.addEventListener("click", () => {
    const confirmExit = confirm("¿Seguro que quieres salir del juego?");
    if (confirmExit) {
        window.close();
        alert("¡Gracias por jugar Monkey Tower! 🐵");
    }
});


// --- Música y Sonido ---
const bgMusic = new Audio('assets/sounds/music.mp3');
bgMusic.loop = true;
const savedVolume = localStorage.getItem('musicVolume');
bgMusic.volume = savedVolume !== null ? Number(savedVolume) : 0.5;

function tryPlayBgMusic() {
    bgMusic.play().catch(() => {});
    document.removeEventListener('click', tryPlayBgMusic);
    document.removeEventListener('keydown', tryPlayBgMusic);
}
document.addEventListener('click', tryPlayBgMusic);
document.addEventListener('keydown', tryPlayBgMusic);

if (volumeSlider) {
    volumeSlider.value = bgMusic.volume;
    volumeSlider.addEventListener('input', (e) => {
        const v = Number(e.target.value);
        bgMusic.volume = v;
        localStorage.setItem('musicVolume', String(v));
    });
}
