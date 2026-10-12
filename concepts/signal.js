/* KRO Signal — a procedural foil sculpture, with no image or WebGL dependency. */
(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const mix = (a, b, t) => a + (b - a) * t;
  const lerp3 = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
  const colors = {
    gold: [229, 191, 110],
    pearl: [248, 230, 186],
    pink: [235, 149, 183],
    dusk: [143, 80, 104]
  };
  const mounted = new WeakMap();
  const scenes = new Set();
  let activeKey = 'kino';
  let globallyPaused = false;

  function seeded(seed) {
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  // All three forms share a sampled surface, so changing a world physically
  // reshapes the same piece of foil rather than swapping decorative images.
  function surface(key, t, u, time) {
    const a = t * TAU;
    const breath = Math.sin(time * 0.46) * 0.052;
    let x, y, z, twist, width;
    if (key === 'echo') {
      // A folded figure-eight: the visible centre is a small, deep sound well.
      x = Math.sin(a) * 1.24;
      y = Math.sin(a * 2) * 0.43 + Math.cos(a) * 0.12;
      z = Math.cos(a) * 0.7 + Math.sin(a * 3) * 0.11;
      twist = a * 1.5 + 0.6;
      width = 0.29 + Math.sin(a * 2 + 0.6) * 0.07;
    } else if (key === 'tanakh') {
      // An open, ascending page fan. Two crests meet in a luminous fold.
      x = Math.sin(a) * 1.16;
      y = -Math.abs(Math.sin(a)) * 0.55 + Math.cos(a * 2) * 0.14;
      z = Math.cos(a) * 0.58 + Math.sin(a * 2) * 0.24;
      twist = a * 1.4 + Math.sin(a) * 0.65;
      width = 0.38 + Math.cos(a * 2) * 0.09;
    } else {
      // Cinema: a wide, unspooling loop, with a raised curl and a folded tail.
      x = Math.sin(a) * 1.29 + Math.sin(a * 2) * 0.12;
      y = Math.cos(a) * 0.49 + Math.sin(a * 3) * 0.085;
      z = Math.sin(a * 2 + 0.3) * 0.51;
      twist = a * 1.2 + 0.42;
      width = 0.32 + Math.sin(a + 0.7) * 0.065;
    }
    // Travelling bends make the foil feel suspended in a slow current. The
    // loop keeps its silhouette; the motion is in its folds and reflected light.
    const flow = Math.sin(a * 3 - time * 0.57);
    const ripple = Math.sin(a * 5 + time * 0.72 + u * 2.4);
    twist += Math.sin(a * 2 - time * 0.39) * 0.16;
    width *= 1 + Math.sin(a * 3 + time * 0.52) * 0.055;
    x += flow * 0.038 + Math.sin(time * 0.31) * Math.cos(a) * 0.023;
    y += flow * 0.055;
    z += Math.cos(a * 2 + time * 0.43) * 0.078;
    const ruffle = ripple * 0.031;
    const breadth = u * width;
    x += Math.cos(twist) * breadth + ruffle * u;
    y += Math.sin(twist) * breadth + breath * Math.sin(a);
    z += Math.cos(twist + 0.9) * breadth * 1.15;
    // A shallow crease makes the sheet catch light like woven metallic foil.
    z += Math.cos(u * Math.PI) * 0.035 + Math.sin(a * 3 + u * 7 - time * 0.5) * 0.022;
    return [x, y, z];
  }

  function rgb(c, a = 1) {
    return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
  }

  function mount(canvas) {
    if (!(canvas instanceof HTMLCanvasElement)) return null;
    if (mounted.has(canvas)) return mounted.get(canvas).publicAPI;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return null;

    const parent = canvas.parentElement || canvas;
    const foreground = parent.querySelector('.signal-foreground');
    const frontCtx = foreground instanceof HTMLCanvasElement ? foreground.getContext('2d') : null;

    const random = seeded(81419);
    const stars = Array.from({ length: 66 }, () => ({
      x: random(), y: random(), r: 0.25 + random() * 0.85,
      phase: random() * TAU, strength: 0.15 + random() * 0.5
    }));
    const motes = Array.from({ length: 155 }, () => ({
      t: random(), u: random() * 2 - 1, offset: random(),
      r: 0.25 + random() * 1.15, phase: random() * TAU
    }));
    let width = 1, height = 1, dpr = 1, frame = 0, previous = 0;
    let clock = 0, visible = true, destroyed = false;
    let pointer = { x: 0, y: 0, active: false };
    let easedPointer = { x: 0, y: 0 };
    let rotation = { x: 0, y: 0 };
    let fromKey = activeKey, toKey = activeKey, morph = 1;
    let timeOfMorph = 0;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

    function sampled(t, u, at) {
      const end = surface(toKey, t, u, at);
      if (morph >= 1 || fromKey === toKey) return end;
      const eased = morph * morph * (3 - 2 * morph);
      return lerp3(surface(fromKey, t, u, at), end, eased);
    }

    function project(p) {
      const ambient = clock;
      const yaw = -0.17 + easedPointer.x * 0.34 + Math.sin(ambient * 0.23) * 0.058;
      const roll = -0.145 + easedPointer.y * 0.065 + Math.sin(ambient * 0.19) * 0.018;
      const pitch = easedPointer.y * 0.12;
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      const cr = Math.cos(roll), sr = Math.sin(roll);
      const x = p[0] * cy + p[2] * sy;
      const yawZ = -p[0] * sy + p[2] * cy;
      const y = p[1] * Math.cos(pitch) - yawZ * Math.sin(pitch);
      const z = p[1] * Math.sin(pitch) + yawZ * Math.cos(pitch);
      const scale = Math.min(width / 3.24, height / 2.37);
      const perspective = 3.55 / (3.55 - z * 0.45);
      return {
        x: width * (width < 560 ? 0.55 : 0.59) + (x * cr - y * sr) * scale * perspective,
        y: height * (width < 560 ? 0.67 : 0.64) + (x * sr + y * cr) * scale * perspective,
        z,
        scale: perspective
      };
    }

    function background(at) {
      ctx.fillStyle = '#08090d';
      ctx.fillRect(0, 0, width, height);
      const glowX = width * 0.6, glowY = height * 0.65;
      const radius = Math.max(width * 0.56, height * 0.6);
      const glow = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, radius);
      glow.addColorStop(0, 'rgba(89,58,36,0.14)');
      glow.addColorStop(0.45, 'rgba(69,36,52,0.095)');
      glow.addColorStop(1, 'rgba(8,9,13,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
      for (const star of stars) {
        const alpha = star.strength * (0.55 + Math.sin(at * 0.43 + star.phase) * 0.25);
        ctx.fillStyle = rgb(star.phase > Math.PI ? colors.pink : colors.pearl, alpha);
        ctx.beginPath();
        ctx.arc(star.x * width + Math.sin(at * 0.09 + star.phase) * 4, star.y * height + Math.cos(at * 0.12 + star.phase) * 5, star.r, 0, TAU);
        ctx.fill();
      }
      // Very quiet, broken orbital arcs read as an observatory, never a chart.
      ctx.save();
      ctx.translate(glowX, glowY);
      ctx.rotate(-0.25);
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = 'rgba(208,177,120,0.11)';
      ctx.beginPath();
      ctx.ellipse(0, 0, width * 0.34, height * 0.3, 0, -0.1, 0.52);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, width * 0.34, height * 0.3, 0, 2.7, 3.1);
      ctx.stroke();
      ctx.restore();
    }

    function sculpture(at) {
      const steps = width < 600 ? 78 : 108;
      const bands = width < 600 ? 18 : 24;
      const rows = [];
      for (let i = 0; i <= steps; i++) {
        const row = [];
        for (let j = 0; j <= bands; j++) row.push(project(sampled(i / steps, j / bands * 2 - 1, at)));
        rows.push(row);
      }
      const quads = [];
      for (let i = 0; i < steps; i++) {
        for (let j = 0; j < bands; j++) {
          const points = [rows[i][j], rows[i + 1][j], rows[i + 1][j + 1], rows[i][j + 1]];
          quads.push({ i, j, points, depth: points.reduce((n, p) => n + p.z, 0) / 4 });
        }
      }
      quads.sort((a, b) => a.depth - b.depth);
      ctx.lineJoin = 'round';
      if (frontCtx) frontCtx.lineJoin = 'round';
      for (const { i, j, points, depth } of quads) {
        const a = i / steps * TAU;
        const u = j / bands;
        const foil = Math.pow(Math.max(0, Math.cos(a * 1.3 + u * 2.8 - 0.7 - at * 0.24)), 7);
        const glint = Math.pow(Math.max(0, Math.sin(a * 3.1 - at * 0.67 + u * 0.8)), 12) * 0.12;
        const edge = Math.pow(Math.abs(u * 2 - 1), 3);
        const light = clamp(0.26 + (depth + 0.6) * 0.2 + foil * 0.63 + edge * 0.1 + glint, 0.22, 1.12);
        const pinkness = clamp(0.5 + Math.sin(a + 0.4) * 0.66 + Math.cos(u * 4) * 0.1, 0, 1);
        const metal = lerp3(colors.gold, colors.pink, pinkness);
        const tint = metal.map((c, index) => mix(c * light, colors.pearl[index], foil * 0.17));
        const path = new Path2D();
        path.moveTo(points[0].x, points[0].y);
        for (let k = 1; k < 4; k++) path.lineTo(points[k].x, points[k].y);
        path.closePath();
        ctx.fillStyle = rgb(tint, 0.82);
        ctx.fill(path);
        // Fine longitudinal channels turn the surface into hundreds of foil threads.
        ctx.strokeStyle = rgb(tint.map(c => Math.min(255, c * 1.36)), (j % 3 === 0 ? 0.72 : 0.26));
        ctx.lineWidth = j % 3 === 0 ? 0.55 : 0.3;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.stroke();
        if (frontCtx && depth > 0.3) {
          const frontAlpha = clamp((depth - 0.3) / 0.17, 0, 1) * 0.78;
          frontCtx.fillStyle = rgb(tint, frontAlpha);
          frontCtx.fill(path);
          frontCtx.strokeStyle = rgb(tint.map(c => Math.min(255, c * 1.36)), frontAlpha * (j % 3 === 0 ? 0.65 : 0.2));
          frontCtx.lineWidth = j % 3 === 0 ? 0.55 : 0.3;
          frontCtx.beginPath();
          frontCtx.moveTo(points[0].x, points[0].y);
          frontCtx.lineTo(points[1].x, points[1].y);
          frontCtx.stroke();
        }
      }
      // Sparse drifting grains break the perfect sheet into a physical light field.
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (const mote of motes) {
        const drift = at * 0.014 + mote.offset;
        const t = (mote.t + drift) % 1;
        const p = sampled(t, mote.u, at);
        const lift = 0.038 + Math.sin(at * 0.51 + mote.phase) * 0.055;
        p[1] += Math.sin(at * 0.32 + mote.phase) * 0.021;
        p[2] += lift;
        const q = project(p);
        const sparkle = 0.22 + Math.pow(Math.max(0, Math.sin(at * 0.76 + mote.phase)), 5) * 0.7;
        ctx.fillStyle = rgb(mote.u > 0.3 ? colors.pink : colors.pearl, sparkle);
        ctx.beginPath();
        ctx.arc(q.x, q.y, mote.r * q.scale, 0, TAU);
        ctx.fill();
        if (frontCtx && q.z > 0.34) {
          frontCtx.fillStyle = rgb(mote.u > 0.3 ? colors.pink : colors.pearl, sparkle * 0.82);
          frontCtx.beginPath();
          frontCtx.arc(q.x, q.y, mote.r * q.scale, 0, TAU);
          frontCtx.fill();
        }
      }
      // Small illuminated control points with hairline halos, not interface labels.
      for (const [t, u] of [[0.06, 1.07], [0.31, -1.04], [0.62, 1.04], [0.82, -1.08]]) {
        const q = project(sampled(t, u, at));
        ctx.strokeStyle = 'rgba(240,198,135,0.4)';
        ctx.lineWidth = 0.65;
        ctx.beginPath();
        ctx.arc(q.x, q.y, 4.6, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,224,177,0.88)';
        ctx.fillRect(q.x - 0.7, q.y - 0.7, 1.4, 1.4);
      }
      ctx.restore();
    }

    function clearScreenOpening() {
      if (!frontCtx) return;
      const device = parent.querySelector('.signal-device-rotator');
      if (!device) return;
      const screen = device.querySelector('.signal-device-screen, .device-screen img, img');
      const deviceRect = device.getBoundingClientRect();
      const screenRect = screen?.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      const hasScreen = screenRect && screenRect.width > 0 && screenRect.height > 0;
      const rect = hasScreen ? screenRect : deviceRect;
      if (!rect.width || !rect.height) return;
      const protectedWidth = rect.width * (hasScreen ? 0.82 : 0.6);
      const protectedHeight = rect.height * (hasScreen ? 0.89 : 0.78);
      const x = rect.left - canvasRect.left + (rect.width - protectedWidth) / 2;
      const y = rect.top - canvasRect.top + (rect.height - protectedHeight) / 2;
      // The front surface grazes the bezel, with a feathered aperture over the
      // real app screen. There is no opaque strip through app text or controls.
      frontCtx.save();
      frontCtx.globalCompositeOperation = 'destination-out';
      frontCtx.fillStyle = 'rgba(0,0,0,1)';
      frontCtx.shadowColor = 'rgba(0,0,0,1)';
      frontCtx.shadowBlur = Math.min(26, rect.width * 0.085) * dpr;
      frontCtx.beginPath();
      frontCtx.roundRect(x, y, protectedWidth, protectedHeight, Math.min(22, rect.width * 0.075));
      frontCtx.fill();
      // Labels and reset controls remain readable even when the near foil
      // sweeps through their position beneath the floating device.
      frontCtx.shadowBlur = 8 * dpr;
      for (const label of parent.querySelectorAll('.signal-device-category, .signal-device-tools')) {
        const bounds = label.getBoundingClientRect();
        if (!bounds.width || !bounds.height) continue;
        frontCtx.fillRect(bounds.left - canvasRect.left - 5, bounds.top - canvasRect.top - 4, bounds.width + 10, bounds.height + 8);
      }
      frontCtx.restore();
    }

    function draw(at = clock) {
      if (destroyed || width < 2 || height < 2) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (frontCtx) {
        frontCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        frontCtx.clearRect(0, 0, width, height);
      }
      background(at);
      sculpture(at);
      clearScreenOpening();
      // Shade the top for typography and the outside edges for depth.
      const shade = ctx.createLinearGradient(0, 0, 0, height);
      shade.addColorStop(0, 'rgba(8,9,13,0.5)');
      shade.addColorStop(0.3, 'rgba(8,9,13,0.07)');
      shade.addColorStop(0.78, 'rgba(8,9,13,0)');
      shade.addColorStop(1, 'rgba(8,9,13,0.24)');
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, width, height);
    }

    function shouldAnimate() {
      return !destroyed && visible && !document.hidden && !globallyPaused && !reducedMotion.matches;
    }

    function tick(timestamp) {
      frame = 0;
      if (!shouldAnimate()) { previous = 0; return; }
      const delta = previous ? Math.min((timestamp - previous) / 1000, 0.05) : 0;
      previous = timestamp;
      clock += delta;
      if (morph < 1) {
        timeOfMorph += delta;
        morph = Math.min(1, timeOfMorph / 1.25);
      }
      easedPointer.x = mix(easedPointer.x, pointer.x * 0.48 + rotation.x * 0.78, 0.045);
      easedPointer.y = mix(easedPointer.y, pointer.y * 0.48 + rotation.y * 0.78, 0.045);
      draw();
      frame = requestAnimationFrame(tick);
    }

    function syncAnimation() {
      if (shouldAnimate()) {
        if (!frame) frame = requestAnimationFrame(tick);
      } else {
        cancelAnimationFrame(frame);
        frame = 0;
        previous = 0;
        if (reducedMotion.matches || globallyPaused) { morph = 1; fromKey = toKey; }
        draw();
      }
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      const nextWidth = Math.round(width * dpr), nextHeight = Math.round(height * dpr);
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }
      if (foreground && (foreground.width !== nextWidth || foreground.height !== nextHeight)) {
        foreground.width = nextWidth;
        foreground.height = nextHeight;
      }
      draw();
      syncAnimation();
    }

    function move(event) {
      const rect = canvas.getBoundingClientRect();
      pointer.x = clamp((event.clientX - rect.left) / Math.max(rect.width, 1) * 2 - 1, -1, 1);
      pointer.y = clamp((event.clientY - rect.top) / Math.max(rect.height, 1) * 2 - 1, -1, 1);
      pointer.active = true;
    }
    function leave() { pointer.x = 0; pointer.y = 0; pointer.active = false; }
    function preferenceChanged() { syncAnimation(); }
    function visibilityChanged() { syncAnimation(); }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const intersectionObserver = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      syncAnimation();
    }, { threshold: 0.01 });
    intersectionObserver.observe(canvas);
    parent.addEventListener('pointermove', move, { passive: true });
    parent.addEventListener('pointerleave', leave, { passive: true });
    document.addEventListener('visibilitychange', visibilityChanged);
    reducedMotion.addEventListener('change', preferenceChanged);

    const scene = {
      setApp(key) {
        if (key === toKey) return;
        fromKey = toKey;
        toKey = key;
        timeOfMorph = 0;
        morph = reducedMotion.matches || globallyPaused ? 1 : 0;
        draw();
        syncAnimation();
      },
      setRotation(value) {
        rotation.x = clamp(Number(value?.x) || 0, -1, 1);
        rotation.y = clamp(Number(value?.y) || 0, -1, 1);
        if (!shouldAnimate()) {
          easedPointer.x = pointer.x * 0.48 + rotation.x * 0.78;
          easedPointer.y = pointer.y * 0.48 + rotation.y * 0.78;
          draw();
        }
      },
      syncAnimation,
      publicAPI: {
        render: () => draw(),
        getAnchor() {
          const rect = canvas.getBoundingClientRect();
          const stage = parent.getBoundingClientRect();
          return {
            x: rect.left - stage.left + width * (width < 560 ? 0.55 : 0.59),
            y: rect.top - stage.top + height * (width < 560 ? 0.67 : 0.64)
          };
        },
        setRotation: value => scene.setRotation(value),
        destroy() {
          if (destroyed) return;
          destroyed = true;
          cancelAnimationFrame(frame);
          resizeObserver.disconnect();
          intersectionObserver.disconnect();
          parent.removeEventListener('pointermove', move);
          parent.removeEventListener('pointerleave', leave);
          document.removeEventListener('visibilitychange', visibilityChanged);
          reducedMotion.removeEventListener('change', preferenceChanged);
          mounted.delete(canvas);
          scenes.delete(scene);
        }
      }
    };
    mounted.set(canvas, scene);
    scenes.add(scene);
    resize();
    return scene.publicAPI;
  }

  window.KROSignal = {
    mount,
    setApp(key) {
      activeKey = ['kino', 'tanakh', 'echo'].includes(key) ? key : 'kino';
      for (const scene of scenes) scene.setApp(activeKey);
    },
    setPaused(value) {
      globallyPaused = Boolean(value);
      for (const scene of scenes) scene.syncAnimation();
    },
    setRotation(value) {
      for (const scene of scenes) scene.setRotation(value);
    }
  };
})();
