(() => {
  "use strict";

  function start() {
    const host = document.querySelector(".starfield-renderer");
    if (!host || host.querySelector("canvas")) return;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;
    host.appendChild(canvas);

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const tau = Math.PI * 2;
    const clamp = value => Math.max(0, Math.min(1, value));
    const between = (min, max) => min + (max - min) * Math.random();
    const ease = value => value < 0.5 ? 4 * value ** 3 : 1 - 4 * (1 - value) ** 3;
    let width = 1;
    let height = 1;
    let scale = 1;
    let elapsed = motion.matches ? 3 : 0;
    let previousTime;
    let frameId = 0;
    let spin = 0;
    let meteor;
    let nextMeteor = between(3.32, 3.78);

    // Cache the glows so each visible star costs one draw per frame.
    function makeSprite(color, angle, diamond) {
      const sprite = document.createElement("canvas");
      sprite.width = sprite.height = 40;
      const paint = sprite.getContext("2d");
      const pixels = paint.createImageData(40, 40);
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      for (let y = 0; y < 40; y++) {
        for (let x = 0; x < 40; x++) {
          const dx = (x - 19.5) / 20;
          const dy = (y - 19.5) / 20;
          const u = Math.abs(dx * cosine - dy * sine);
          const v = Math.abs(dx * sine + dy * cosine);
          const radius = diamond ? (u ** 0.62 + v ** 0.62) ** (1 / 0.62) : Math.hypot(u, v);
          if (radius > 1) continue;
          const index = 4 * (y * 40 + x);
          const core = Math.exp(-12 * radius * radius);
          for (let channel = 0; channel < 3; channel++) {
            pixels.data[index + channel] = color[channel] + (255 - color[channel]) * core;
          }
          pixels.data[index + 3] = 255 / (1 + Math.exp(8 * (radius - 0.5)));
        }
      }
      paint.putImageData(pixels, 0, 0);
      return sprite;
    }

    const palettes = [[241, 241, 249], [140, 179, 255], [255, 184, 115]];
    const sprites = palettes.map(color => makeSprite(color, 0, false));
    const diamonds = palettes.map(color =>
      Array.from({ length: 8 }, (_, index) => makeSprite(color, index * Math.PI / 16, true))
    );
    const stars = Array.from({ length: 5000 }, () => {
      const radius = between(350, 400);
      const latitude = between(-1, 1);
      const azimuth = between(0, tau);
      const ring = radius * Math.sqrt(1 - latitude ** 2);
      const bright = Math.random() < 0.06;
      const diamond = bright && Math.random() < 0.2;
      const color = bright ? (Math.random() < 0.6 ? 1 : 2) : 0;
      return {
        x: ring * Math.cos(azimuth),
        y: ring * Math.sin(azimuth),
        z: radius * latitude,
        size: bright ? between(1.69, 3.9) * (diamond ? 1.55 : 1) : between(0.325, 1.3),
        brightness: bright ? between(0.75, 1) : between(0.12, 0.45),
        speed: bright ? between(1.2, 2.8) : between(0.18, 0.55),
        phase: between(0, tau),
        sprite: diamond ? diamonds[color][Math.floor(Math.random() * 8)] : sprites[color]
      };
    });

    function drawMeteor() {
      if (motion.matches) return;
      if (elapsed >= nextMeteor) {
        const angle = between(0, tau);
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        const offset = between(-0.16, 0.16) * Math.min(width, height);
        const centerX = width / 2 - dy * offset;
        const centerY = height / 2 + dx * offset;
        const startDistance = Math.min(
          (dx > 0 ? centerX + 18 : width - centerX + 18) / Math.abs(dx),
          (dy > 0 ? centerY + 18 : height - centerY + 18) / Math.abs(dy)
        );
        meteor = {
          start: elapsed, x: centerX - dx * startDistance, y: centerY - dy * startDistance,
          dx, dy, speed: Math.hypot(width, height) * between(0.22, 0.34), length: between(130, 190)
        };
        nextMeteor = elapsed + between(4.5, 7);
      }
      if (!meteor) return;

      const age = elapsed - meteor.start;
      const travel = age * meteor.speed;
      const x = meteor.x + meteor.dx * travel;
      const y = meteor.y + meteor.dy * travel;
      const tailX = x - meteor.dx * meteor.length;
      const tailY = y - meteor.dy * meteor.length;
      context.globalAlpha = clamp(age * 10);
      const trail = context.createLinearGradient(x, y, tailX, tailY);
      trail.addColorStop(0, "rgba(238,245,255,0.94)");
      trail.addColorStop(0.14, "rgba(203,225,255,0.72)");
      trail.addColorStop(1, "rgba(163,201,255,0)");
      context.fillStyle = trail;
      context.beginPath();
      context.moveTo(x - 1.8 * meteor.dy, y + 1.8 * meteor.dx);
      context.lineTo(tailX, tailY);
      context.lineTo(x + 1.8 * meteor.dy, y - 1.8 * meteor.dx);
      context.fill();
      if (travel > Math.hypot(width, height) + meteor.length + 36) meteor = undefined;
    }

    function draw() {
      const launch = clamp((elapsed - 0.12) / 2);
      const spread = ease(launch);
      const radius = 0.025 + 0.975 * spread;
      const cameraZ = 1800 - 1600 * spread;
      const focalLength = height * Math.sqrt(3) / 2;
      const pitch = Math.min(Math.PI / 3, elapsed * 0.002 + spin * 0.024);
      const yaw = elapsed * 0.005 + spin * 0.082;
      const roll = spin * 0.05;
      const cosX = Math.cos(pitch), sinX = Math.sin(pitch);
      const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
      const cosZ = Math.cos(roll), sinZ = Math.sin(roll);
      const brightness = (1 - (1 - launch) ** 3) * clamp((spread - 0.03) / 0.69);

      context.globalAlpha = 1;
      context.fillStyle = "#020205";
      context.fillRect(0, 0, width, height);
      for (const star of stars) {
        const rx = star.x * cosZ - star.y * sinZ;
        const ry = star.x * sinZ + star.y * cosZ;
        const rz = star.z * cosY - rx * sinY;
        const depth = cameraZ - radius * (ry * sinX + rz * cosX);
        if (depth < 1) continue;
        const projection = radius * focalLength / depth;
        const x = width / 2 + (rx * cosY + star.z * sinY) * projection;
        const y = height / 2 - (ry * cosX - rz * sinX) * projection;
        if (x < -48 || x > width + 48 || y < -48 || y > height + 48) continue;
        const twinkle = 0.75 + 0.25 * Math.sin(elapsed * star.speed + star.phase);
        const size = Math.min(64, Math.max(1 / scale,
          star.size * height * 1.4 / depth * twinkle * (0.22 + 0.78 * spread)
        ));
        context.globalAlpha = clamp(star.brightness * twinkle * 2 * brightness);
        context.drawImage(star.sprite, x - size / 2, y - size / 2, size, size);
      }
      drawMeteor();
      context.globalAlpha = 1;
    }

    function animate(now) {
      const delta = previousTime === undefined ? 0 : Math.min((now - previousTime) / 1000, 0.05);
      previousTime = now;
      elapsed += delta;
      const spinProgress = ease(clamp((elapsed - 0.12) / 2.7));
      spin += 6.8 * Math.sin(Math.PI * spinProgress) * delta;
      draw();
      frameId = window.requestAnimationFrame(animate);
    }

    function updatePlayback() {
      window.cancelAnimationFrame(frameId);
      previousTime = undefined;
      if (motion.matches) elapsed = Math.max(elapsed, 3);
      if (document.hidden) return;
      draw();
      if (!motion.matches) frameId = window.requestAnimationFrame(animate);
    }

    function resize() {
      width = Math.max(1, host.clientWidth);
      height = Math.max(1, host.clientHeight);
      scale = Math.min(1.5, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      context.setTransform(scale, 0, 0, scale, 0, 0);
      updatePlayback();
    }

    document.addEventListener("visibilitychange", updatePlayback);
    motion.addEventListener("change", updatePlayback);
    new ResizeObserver(resize).observe(host);
    resize();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
