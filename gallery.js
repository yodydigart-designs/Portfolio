/* Gallery-only JS:
   - Movement (fixed camera)
   - Faux depth scaling
   - Paintings as interactive frames (click / Enter near)
   - Playlist dropdown
   - Modal details
*/

(() => {
  // ===== Playlist dropdown =====
  const plBtn = document.getElementById("plBtn");
  const plPanel = document.getElementById("plPanel");
  const togglePlaylist = () => {
    if (!plPanel || !plBtn) return;
    const open = plPanel.classList.toggle("is-open");
    plBtn.setAttribute("aria-expanded", open ? "true" : "false");
    plPanel.setAttribute("aria-hidden", open ? "false" : "true");
  };
  plBtn?.addEventListener("click", togglePlaylist);

  // Close playlist if click outside
  document.addEventListener("click", (e) => {
    if (!plPanel || !plBtn) return;
    const isInside = plPanel.contains(e.target) || plBtn.contains(e.target);
    if (!isInside && plPanel.classList.contains("is-open")) togglePlaylist();
  });

  // ===== Scene elements =====
  const viewport = document.getElementById("viewport");
  const scene = document.getElementById("scene");
  const paintingsWrap = document.getElementById("paintings");
  const charEl = document.getElementById("char");
  const prompt = document.getElementById("prompt");
  const promptTitle = document.getElementById("promptTitle");
  const promptSub = document.getElementById("promptSub");

  const modal = document.getElementById("modal");
  const modalClose = document.getElementById("modalClose");
  const modalImg = document.getElementById("modalImg");
  const modalTitle = document.getElementById("modalTitle");
  const modalDesc = document.getElementById("modalDesc");
  const modalLink = document.getElementById("modalLink");

  if (!viewport || !scene || !paintingsWrap || !charEl) return;

  // ===== Data: paintings (use same covers from Home) =====
  // z: "depth" along corridor (0..1-ish)
  // side: left/right wall
  const paintings = [
    {
      id: "p1",
      title: "Aris Kavalariou",
      desc: "Graphic • Football",
      img: "/assets/Logo-Teliko.png",
      link: "/projects/project-1.html",
      side: "left",
      z: 0.20
    },
    {
      id: "p2",
      title: "Domain Tsantekides",
      desc: "Brand • Winery",
      img: "/assets/domain_tsantekides_logo.png",
      link: "/projects/project-2.html",
      side: "right",
      z: 0.34
    },
    {
      id: "p3",
      title: "Raw Frequencies",
      desc: "Design • Music",
      img: "/assets/vinyl_wholeimg.jpg",
      link: "/projects/project-3.html",
      side: "left",
      z: 0.52
    },
    {
      id: "p4",
      title: "Selected Small Works",
      desc: "Micro • Brand",
      img: "/assets/p2-cover.jpg",
      link: "/projects/project-4.html",
      side: "right",
      z: 0.68
    },
  ];

  // ===== Build paintings DOM =====
  const paintingEls = new Map();

  paintings.forEach((p) => {
    const el = document.createElement("div");
    el.className = "painting";
    el.dataset.id = p.id;

    const img = document.createElement("img");
    img.src = p.img;
    img.alt = p.title;

    el.appendChild(img);
    paintingsWrap.appendChild(el);
    paintingEls.set(p.id, el);

    el.addEventListener("click", () => openModal(p));
  });

  // ===== Controls =====
  const keys = new Set();
  let paused = false;

  window.addEventListener("keydown", (e) => {
    // avoid scrolling with arrows/space
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();

    if (e.key === "Escape") {
      if (modal.classList.contains("is-open")) {
        closeModal();
        return;
      }
      paused = !paused; // pause movement
      return;
    }

    if (e.key === "Enter") {
      const near = getNearestPainting();
      if (near) openModal(near);
      return;
    }

    keys.add(e.key.toLowerCase());
  }, { passive: false });

  window.addEventListener("keyup", (e) => {
    keys.delete(e.key.toLowerCase());
  });

  // ===== Player state =====
  // x: left/right (-1..1), z: forward/back (0..1)
  const player = { x: 0, z: 0.10 };
  let lastT = performance.now();

  // corridor bounds (tweak)
  const bounds = {
    xMin: -0.62,
    xMax:  0.62,
    zMin:  0.06,
    zMax:  0.78
  };

  // ===== Rendering / placement helpers =====
  function lerp(a,b,t){ return a + (b-a)*t; }
  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

  function updateLayout(){
    // scene size
    const rect = scene.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;

    // Convert "world" coords to screen coords (fixed camera illusion)
    // z influences y position & scale (faux perspective)
    // This is intentionally stylized, not physics-accurate.
    function worldToScreen(x, z){
      const depth = z; // 0 near, 1 far
      const scale = lerp(1.18, 0.62, depth);
      const y = lerp(H*0.78, H*0.46, depth);
      const xpx = W*0.5 + x * (W*0.28) * (lerp(1.0, 0.62, depth));
      return { xpx, y, scale };
    }

    // Place character
    const c = worldToScreen(player.x, player.z);
    charEl.style.left = `${c.xpx}px`;
    charEl.style.top = `${c.y}px`;
    charEl.style.transform = `translate(-50%, -50%) scale(${c.scale})`;

    // Place paintings on walls with slight wall rotation + depth scaling
    paintings.forEach((p) => {
      const el = paintingEls.get(p.id);
      if (!el) return;

      const s = worldToScreen(0, p.z);
      const wallOffset = (p.side === "left") ? -1 : 1;

      // paintings slide outward to the wall, and shift slightly with depth
      const px = s.xpx + wallOffset * (W*0.25) * (lerp(1.0, 0.72, p.z));
      const py = lerp(H*0.40, H*0.30, p.z);

      const tilt = (p.side === "left") ? 10 : -10;

      el.style.left = `${px}px`;
      el.style.top = `${py}px`;
      el.style.transform =
        `translate(-50%, -50%) scale(${lerp(1.05, 0.72, p.z)}) rotateY(${tilt}deg) translateZ(${lerp(18, 6, p.z)}px)`;

      // fade a bit in distance
      el.style.opacity = `${lerp(1.0, 0.75, p.z)}`;
    });

    // Prompt near painting
    const near = getNearestPainting();
    if (near) {
      prompt.classList.add("is-show");
      prompt.setAttribute("aria-hidden", "false");
      promptTitle.textContent = near.title;
      promptSub.textContent = "Press Enter";
    } else {
      prompt.classList.remove("is-show");
      prompt.setAttribute("aria-hidden", "true");
    }
  }

  function getNearestPainting(){
    // "distance" based on z and x
    // paintings are on walls; we check z proximity strongly
    let best = null;
    let bestScore = 999;

    paintings.forEach((p) => {
      const dz = Math.abs(player.z - p.z);
      // only interact if close enough in depth
      if (dz > 0.075) return;

      // x target depends on wall
      const targetX = (p.side === "left") ? -0.42 : 0.42;
      const dx = Math.abs(player.x - targetX);

      const score = dz*1.3 + dx*0.9;
      if (score < bestScore) {
        bestScore = score;
        best = p;
      }
    });

    // final threshold
    if (bestScore < 0.24) return best;
    return null;
  }

  // ===== Modal =====
  function openModal(p){
    if (!modal || !modalImg || !modalTitle || !modalDesc || !modalLink) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden","false");
    modalImg.src = p.img;
    modalImg.alt = p.title;
    modalTitle.textContent = p.title;
    modalDesc.textContent = p.desc;
    modalLink.href = p.link;

    // pause movement while modal open
    paused = true;
  }

  function closeModal(){
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden","true");
    paused = false;
  }

  modalClose?.addEventListener("click", closeModal);
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  // ===== Main loop =====
  function tick(t){
    const dt = Math.min(0.033, (t - lastT) / 1000);
    lastT = t;

    // movement
    let vx = 0, vz = 0;

    const up = keys.has("w") || keys.has("arrowup");
    const down = keys.has("s") || keys.has("arrowdown");
    const left = keys.has("a") || keys.has("arrowleft");
    const right = keys.has("d") || keys.has("arrowright");

    if (!paused && !modal.classList.contains("is-open")) {
      if (up) vz -= 1;
      if (down) vz += 1;
      if (left) vx -= 1;
      if (right) vx += 1;

      // speed tuned for feel
      const speedZ = 0.33; // forward/back
      const speedX = 0.44; // left/right

      // normalize
      const len = Math.hypot(vx, vz) || 1;
      vx /= len; vz /= len;

      player.x += vx * speedX * dt;
      player.z += vz * speedZ * dt;

      player.x = clamp(player.x, bounds.xMin, bounds.xMax);
      player.z = clamp(player.z, bounds.zMin, bounds.zMax);

      // walking class
      const moving = (Math.abs(vx) + Math.abs(vz)) > 0.01;
      charEl.classList.toggle("is-walking", moving);
    } else {
      charEl.classList.remove("is-walking");
    }

    updateLayout();
    requestAnimationFrame(tick);
  }

  // Keep layout correct on resize
  window.addEventListener("resize", () => updateLayout());
  updateLayout();
  requestAnimationFrame(tick);

})();
