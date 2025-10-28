// --- Selectores del DOM (Originales y Nuevos) ---
const playBtn = document.getElementById("play-btn");
const optionsBtn = document.getElementById("options-btn"); 
const exitBtn = document.getElementById("exit-btn");

// Elementos del panel de récords
const recordsPanel = document.getElementById("recordsPanel");
const closeRecords = document.getElementById("closeRecords");
const recordsList = document.getElementById("recordsList");

// ¡NUEVO! Elementos del panel de opciones que añadimos
const optionsPanel = document.getElementById("optionsPanel");
const closeOptions = document.getElementById("closeOptions");
const viewRecordsBtn = document.getElementById("view-records-btn");
const volumeSlider = document.getElementById("volumeSlider");


// --- Lógica de los Botones ---

// 1. Navegar al juego (Tu código, sin cambios)
playBtn.addEventListener("click", () => {
    window.location.href = "game.html";
});


// 2. MODIFICADO: El botón de Opciones AHORA abre el panel de opciones
optionsBtn.addEventListener("click", () => {
    optionsPanel.classList.remove("hidden");
});


// 3. ¡NUEVO! El botón "Récords" (dentro de opciones) es el que carga y muestra las puntuaciones
viewRecordsBtn.addEventListener("click", () => {
    // --- AQUÍ MOVIMOS TU LÓGICA PARA CARGAR RÉCORDS ---
    const records = JSON.parse(localStorage.getItem("records")) || [];
    recordsList.innerHTML = "";

    if (records.length === 0) {
        recordsList.innerHTML = "<li>No hay récords aún</li>";
    } else {
        // Ordenar récords de mayor a menor antes de mostrarlos
        records.sort((a, b) => b.score - a.score);
        
        records.forEach((r, i) => {
            const li = document.createElement("li");
            // Formato mejorado para la fecha
            const date = new Date(r.date).toLocaleDateString("es-MX");
            li.innerHTML = `<span>#${i + 1}</span><span>${r.score} pts</span><span>${date}</span>`;
            recordsList.appendChild(li);
        });
    }

    // Ocultamos el panel de opciones y mostramos el de récords
    optionsPanel.classList.add("hidden");
    recordsPanel.classList.remove("hidden");
});
const bgMusic = new Audio('assets/sounds/music.mp3');
bgMusic.loop = true;
// load saved volume or default
const savedVolume = localStorage.getItem('musicVolume');
bgMusic.volume = savedVolume !== null ? Number(savedVolume) : 0.5;

// try to play music — browsers may block autoplay, so this will often succeed after a user gesture
function tryPlayBgMusic() {
    bgMusic.play().catch(() => {})
    document.removeEventListener('click', tryPlayBgMusic)
    document.removeEventListener('keydown', tryPlayBgMusic)
}
document.addEventListener('click', tryPlayBgMusic)
document.addEventListener('keydown', tryPlayBgMusic)

if (volumeSlider) {
    // initialize slider value
    volumeSlider.value = bgMusic.volume;
    volumeSlider.addEventListener('input', (e) => {
        const v = Number(e.target.value)
        bgMusic.volume = v;
        localStorage.setItem('musicVolume', String(v));
    });
}


// 4. ¡NUEVO! Lógica para cerrar el panel de opciones
closeOptions.addEventListener("click", () => {
    optionsPanel.classList.add("hidden");
});


// 5. Cerrar panel de récords (Tu código, sin cambios)
closeRecords.addEventListener("click", () => {
    recordsPanel.classList.add("hidden");
});


// 6. Salir del juego (Tu código, sin cambios)
exitBtn.addEventListener("click", () => {
    const confirmExit = confirm("¿Seguro que quieres salir del juego?");
    if (confirmExit) {
        window.close(); // Intento de cerrar (funciona solo si fue abierto por script)
        alert("¡Gracias por jugar Monkey Tower! 🐵");
    }
});


// 7. ¡NUEVO! Funcionalidad del slider de volumen (ejemplo)
volumeSlider.addEventListener('input', (event) => {
    const volumeLevel = event.target.value;
    console.log(`Volumen ajustado a: ${volumeLevel}%`);
    // Aquí pondrías la lógica real para cambiar el sonido de tu juego
});