/* Direct-manipulation light and water. Authored photographs remain the background.
   Normalized coordinates survive resize; at most 9 stars / 12 waves / 72 trail points.
   No persistent visitor data, idle animation, network calls or flashing loops. */
(() => {
  window.ManorMagicSurface = function ({
    canvas,
    image,
    kind,
    reduced,
    onChange,
  }) {
    const ctx = canvas.getContext("2d"),
      stars = [],
      waves = [],
      trail = [];
    let rune = false;
    let awake = false,
      disposed = false,
      raf = 0,
      last = 0,
      pointer = null,
      lastMove = 0;
    let width = 0,
      height = 0,
      start = null;
    const origin = { x: 0.498, y: 0.572 };
    const now = () => performance.now();
    const bounded = (list, value, max) => {
      list.push(value);
      if (list.length > max) list.shift();
    };
    function fit() {
      const box = canvas.getBoundingClientRect();
      width = Math.max(1, box.width);
      height = Math.max(1, box.height);
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw(now());
    }
    function glow(x, y, radius, strength = 1) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
      g.addColorStop(0, `rgba(255,249,211,${strength})`);
      g.addColorStop(0.13, `rgba(255,221,120,${strength * 0.88})`);
      g.addColorStop(0.4, `rgba(247,160,45,${strength * 0.32})`);
      g.addColorStop(1, "rgba(241,135,30,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    function star(p, size) {
      const x = p.x * width,
        y = p.y * height;
      glow(x, y, size * 4, 0.95);
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i * Math.PI) / 8 - Math.PI / 2,
          r = i % 2 ? size * 0.16 : size * (i % 4 ? 0.58 : 1);
        const px = x + Math.cos(a) * r,
          py = y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = "#fff5c7";
      ctx.fill();
    }
    function draw(t) {
      if (disposed) return;
      ctx.clearRect(0, 0, width, height);
      if (kind === "seal" && awake) {
        // Engraving is luminous immediately, and stays lit after movement stops.
        glow(origin.x * width, origin.y * height, width * 0.13, 0.6);
        star(origin, width * 0.032);
        ctx.strokeStyle = "rgba(255,225,141,.8)";
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(origin.x * width, origin.y * height);
        for (const p of stars) ctx.lineTo(p.x * width, p.y * height);
        ctx.stroke();
        stars.forEach((p) => star(p, Math.max(5, width * 0.01)));
        if (!reduced()) {
          for (const p of trail) {
            const age = (t - p.t) / 1500;
            if (age < 1)
              glow(
                p.x * width,
                p.y * height,
                Math.max(8, width * 0.024),
                (1 - age) * 0.65,
              );
          }
        }
      }
      if (kind === "pool") {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(width, 0);
        ctx.lineTo(width, height * 0.74);
        ctx.quadraticCurveTo(width * 0.5, height * 0.98, 0, height * 0.74);
        ctx.closePath();
        ctx.clip();
        if (rune) {
          ctx.save();
          ctx.translate(width * 0.5, height * 0.54);
          ctx.scale(1, 0.58);
          ctx.strokeStyle = "rgba(180,231,205,.8)";
          ctx.lineWidth = 1.5;
          ctx.shadowColor = "#b3e9cf";
          ctx.shadowBlur = 12;
          ctx.beginPath();
          for (let i = 0; i < 16; i++) {
            const a = (i * Math.PI) / 8 - Math.PI / 2,
              r = width * (i % 2 ? 0.03 : 0.11);
            if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
            else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
        }
        for (const wave of waves) {
          const age = reduced() ? 0.9 : (t - wave.t) / 1000;
          if (age > 4) continue;
          const r = Math.max(12, width * (0.025 + age * 0.075));
          const x = wave.x * width,
            y = wave.y * height;
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(x, y, r, r * 0.55, 0, 0, Math.PI * 2);
          ctx.clip();
          // Refract the actual reflection, not a second opacity copy of the photograph.
          if (!reduced() && image.naturalWidth) {
            for (let dy = -r * 0.55; dy < r * 0.55; dy += 4) {
              const top = Math.max(0, y + dy),
                h = Math.min(4, height - top);
              if (h <= 0 || top >= height) continue;
              const shift =
                Math.sin(dy * 0.07 - age * 7) * 7 * Math.max(0, 1 - age / 4);
              ctx.drawImage(
                image,
                0,
                (top / height) * image.naturalHeight,
                image.naturalWidth,
                (h / height) * image.naturalHeight,
                shift,
                top,
                width,
                h,
              );
            }
          }
          ctx.restore();
          const alpha = reduced() ? 0.65 : Math.max(0, 1 - age / 4);
          for (let i = 0; i < 3; i++) {
            const radius = Math.max(3, r - i * width * 0.018);
            ctx.beginPath();
            ctx.ellipse(x, y, radius, radius * 0.55, 0, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(210,240,225,${alpha * (0.8 - i * 0.18)})`;
            ctx.lineWidth = i === 0 ? 2 : 1;
            ctx.stroke();
          }
        }
        // A little impossible light stays where the visitor touched the reflection.
        if (stars.length >= 3) {
          ctx.beginPath();
          stars.forEach((p, i) =>
            i
              ? ctx.lineTo(p.x * width, p.y * height)
              : ctx.moveTo(p.x * width, p.y * height),
          );
          ctx.strokeStyle = "rgba(245,231,175,.45)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        stars.forEach((p) => star(p, Math.max(4, width * 0.006)));
        ctx.restore();
      }
    }
    function frame(t) {
      raf = 0;
      draw(t);
      if (!disposed && !document.hidden && !reduced() && t - last < 4200)
        raf = requestAnimationFrame(frame);
    }
    function wake() {
      last = now();
      draw(last);
      if (!raf && !reduced() && !document.hidden)
        raf = requestAnimationFrame(frame);
    }
    function add(p) {
      if (disposed) return;
      if (kind === "seal" && !awake) {
        awake = true;
        onChange("awake");
      } else {
        bounded(stars, p, 9);
        if (kind === "pool") bounded(waves, { ...p, t: now() }, 12);
        onChange(stars.length >= 3 ? "constellation" : "drawing");
      }
      wake();
    }
    function point(e) {
      const box = canvas.getBoundingClientRect();
      return {
        x: Math.max(0.03, Math.min(0.97, (e.clientX - box.left) / box.width)),
        y: Math.max(0.04, Math.min(0.86, (e.clientY - box.top) / box.height)),
      };
    }
    function inside(p) {
      if (kind === "pool")
        return p.y < 0.74 + 0.12 * (1 - Math.pow((p.x - 0.5) * 2, 2));
      const paper = [
        [0.085, 0.41],
        [0.645, 0.265],
        [0.855, 0.705],
        [0.2, 0.88],
      ];
      let hit = false;
      for (let i = 0, j = paper.length - 1; i < paper.length; j = i++) {
        const a = paper[i],
          b = paper[j];
        if (
          a[1] > p.y !== b[1] > p.y &&
          p.x < ((b[0] - a[0]) * (p.y - a[1])) / (b[1] - a[1]) + a[0]
        )
          hit = !hit;
      }
      return hit;
    }
    function down(e) {
      if (e.button !== 0 || pointer !== null || disposed) return;
      const p = point(e);
      if (!inside(p)) return;
      if (
        kind === "seal" &&
        !awake &&
        Math.hypot((p.x - origin.x) * width, (p.y - origin.y) * height) >
          width * 0.085
      )
        return;
      if (
        kind === "pool" &&
        (e.clientY - canvas.getBoundingClientRect().top) / height > 0.86
      )
        return;
      pointer = e.pointerId;
      start = p;
      canvas.setPointerCapture(pointer);
      add(p);
    }
    function move(e) {
      if (e.pointerId !== pointer || disposed) return;
      const p = point(e),
        t = now();
      if (!inside(p)) return;
      if (kind === "seal") bounded(trail, { ...p, t }, 72);
      else if (t - lastMove > 140) {
        bounded(waves, { ...p, t }, 12);
        lastMove = t;
      }
      wake();
    }
    function up(e) {
      if (e.pointerId !== pointer) return;
      pointer = null;
      if (canvas.hasPointerCapture(e.pointerId))
        canvas.releasePointerCapture(e.pointerId);
      if (e.type !== "pointercancel") {
        const p = point(e);
        if (
          kind === "seal" &&
          inside(p) &&
          start &&
          Math.hypot(p.x - start.x, p.y - start.y) > 0.025
        )
          add(p);
      }
    }
    function pause() {
      cancelAnimationFrame(raf);
      raf = 0;
      if (!document.hidden) draw(now());
    }
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    document.addEventListener("visibilitychange", pause);
    const resize = new ResizeObserver(fit);
    resize.observe(canvas);
    fit();
    return {
      reveal(animate = true) {
        if (disposed || kind !== "pool") return;
        rune = true;
        if (animate) bounded(waves, { x: 0.5, y: 0.54, t: now() }, 12);
        if (animate) wake();
        else draw(now());
      },
      activate() {
        const positions = [
          { x: 0.34, y: 0.42 },
          { x: 0.62, y: 0.32 },
          { x: 0.69, y: 0.65 },
          { x: 0.37, y: 0.7 },
        ];
        add(positions[stars.length % positions.length]);
      },
      reset() {
        awake = false;
        if (pointer !== null && canvas.hasPointerCapture(pointer))
          canvas.releasePointerCapture(pointer);
        pointer = null;
        start = null;
        stars.length = waves.length = trail.length = 0;
        pause();
        draw(now());
      },
      preferenceChanged: pause,
      dispose() {
        disposed = true;
        pause();
        resize.disconnect();
        if (pointer !== null && canvas.hasPointerCapture(pointer))
          canvas.releasePointerCapture(pointer);
        pointer = null;
        canvas.removeEventListener("pointerdown", down);
        canvas.removeEventListener("pointermove", move);
        canvas.removeEventListener("pointerup", up);
        canvas.removeEventListener("pointercancel", up);
        document.removeEventListener("visibilitychange", pause);
        ctx.clearRect(0, 0, width, height);
      },
    };
  };
})();
