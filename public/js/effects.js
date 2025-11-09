/**
 * @file Gestiona los efectos visuales, como las partículas.
 */

const particleContainer = document.getElementById('particle-container');

/**
 * Crea partículas de colocación de bloques en una posición específica.
 * @param {number} x La coordenada x donde se deben crear las partículas.
 * @param {number} y La coordenada y donde se deben crear las partículas.
 */
function createBlockPlacementParticles(x, y) {
  if (!particleContainer) return;

  const particleCount = 10;
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.style.position = 'absolute';
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.width = `${Math.random() * 10 + 5}px`;
    particle.style.height = particle.style.width;
    particle.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
    particle.style.borderRadius = '50%';
    particle.style.transition = 'transform 0.5s ease-out, opacity 0.5s ease-out';

    particleContainer.appendChild(particle);

    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 50 + 20;
    const transformX = Math.cos(angle) * distance;
    const transformY = Math.sin(angle) * distance;

    setTimeout(() => {
      particle.style.transform = `translate(${transformX}px, ${transformY}px) scale(0.5)`;
      particle.style.opacity = '0';
    }, 10);

    setTimeout(() => {
      particle.remove();
    }, 510);
  }
}
