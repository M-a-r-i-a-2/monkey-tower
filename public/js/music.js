/**
 * @file Gestiona la música y los efectos de sonido del juego.
 */

// Música de fondo (se inicia tras la primera interacción del usuario)
const bgMusic = new Audio('assets/sounds/music.mp3');
bgMusic.loop = true;
const savedVolume = localStorage.getItem('musicVolume');
bgMusic.volume = savedVolume !== null ? Number(savedVolume) : 0.5;

// Sonido de fallo (torre caída)
const failSfx = new Audio('assets/sounds/falled.mp3');
failSfx.preload = 'auto';
failSfx.volume = savedVolume !== null ? Number(savedVolume) : 0.5;

/**
 * Reproduce la música de fondo en la primera interacción del usuario.
 */
function playBgMusicOnFirstInteraction() {
  bgMusic.play().catch(() => {})
  document.removeEventListener('click', playBgMusicOnFirstInteraction)
  document.removeEventListener('keydown', playBgMusicOnFirstInteraction)
}
document.addEventListener('click', playBgMusicOnFirstInteraction)
document.addEventListener('keydown', playBgMusicOnFirstInteraction)

if (volumeSlider) {
  volumeSlider.addEventListener('input', (e) => {
    bgMusic.volume = Number(e.target.value);
  });
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