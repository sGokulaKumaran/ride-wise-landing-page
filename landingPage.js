/**
 * RIDEWISE LANDING PAGE — SCRIPT & TELEMETRY SIMULATOR
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Live HUD Clock
  const hudClock = document.getElementById('hudClock');
  const updateClock = () => {
    if (!hudClock) return;
    const now = new Date();
    const hrs = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');
    hudClock.textContent = `${hrs}:${mins}:${secs}`;
  };
  setInterval(updateClock, 1000);
  updateClock();

  // 2. Simulated Dynamic Speedometer Telemetry
  const hudSpeed = document.getElementById('hudSpeed');
  let currentSpeed = 54;
  let targetSpeed = 54;

  setInterval(() => {
    // Generate gentle realistic variations between 47 and 58 km/h
    targetSpeed = Math.floor(47 + Math.random() * 11);
  }, 3500);

  setInterval(() => {
    if (!hudSpeed) return;
    if (currentSpeed < targetSpeed) currentSpeed += 1;
    else if (currentSpeed > targetSpeed) currentSpeed -= 1;
    hudSpeed.innerHTML = `${currentSpeed} <small>km/h</small>`;
  }, 400);

  // 3. 3D Interactive Tilt on Cockpit Frame (Desktop Only)
  const cockpit = document.getElementById('heroCockpit');
  if (cockpit && window.innerWidth > 992) {
    const card = cockpit.querySelector('.cockpit-glass');

    cockpit.addEventListener('mousemove', (e) => {
      const rect = cockpit.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -6; // max 6 deg
      const rotateY = ((x - centerX) / centerX) * 6;  // max 6 deg

      card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-2px)`;
    });

    cockpit.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
    });
  }

  // 4. Smooth Anchor Link Scrolling
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#' || !targetId) return;
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    });
  });
});

