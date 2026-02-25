(() => {
  const status = document.getElementById("status");
  const viewport = document.getElementById("viewport");
  const scene = document.getElementById("scene");
  const paintingsWrap = document.getElementById("paintings");
  const charEl = document.getElementById("char");

  const plBtn = document.getElementById("plBtn");
  const plPanel = document.getElementById("plPanel");

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

  // Mark JS loaded (so you immediately know it runs)
  if (status) status.textContent = "JS: ready (click viewport, then WASD)";

  // Focus viewport on click (some browsers need this for consistent key control)
  viewport.addEventListener("pointerdown", () => viewport.focus());

  // Playlist dropdown
  function togglePlaylist(){
    if (!plPanel || !plBtn) return;
    const open = plPanel.classList.toggle("is-open");
    plBtn.setAttribute("aria-expanded", open ? "true" : "false");
    plPanel.setAttribute("aria-hidden", open ? "false" : "true");
  }
  plBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    togglePlaylist();
  });

  document.addEventListener("click", (e) => {
    if (!plPanel || !plBtn) return;
    const isInside = plPanel.contains(e.target) || plBtn.contains(e.target);
    if (!isInside && plPanel.classList.contains("is-open")) togglePlaylist();
  });

  // Data (your actual covers from assets)
  const paintings = [
    { id:"p1", title:"Aris Kavalariou", desc:"Graphic • Football", img:"/assets/Logo-Teliko.png", link:"/projects/project-1.html", side:"left",  z: 0.22 },
    { id:"p2", title:"Domain Tsantekides", desc:"Brand • Winery", img:"/assets/domain_tsantekides_logo.png", link:"/projects/project-2.html", side:"right", z: 0.30 },
    { id:"p3", title:"Raw Frequencies", desc:"Design • Music", img:"/assets/vinyl_wholeimg.jpg", link:"/projects/project-3.html", side:"left",  z: 0.46 },
    { id:"p4", title:"Selected Small Works", desc:"Micro • Brand", img:"/assets/p2-cover.jpg", link:"/projects/project-4.html", side:"right", z: 0.58 },
  ];

  // Build painting elements
  const paintingEls = new Map();
  paintings.forEach((p) => {
    const el = document.createElement("div");
    el.className = "painting";
    el.dataset.id = p.id;

    const im = document.createElement("img");
    im.src = p.img;
    im.alt = p.title;

    el.appendChild(im);
    paintingsWrap.appendChild(el);
    paintingEls.set(p.id, el);

    el.addEventListener("click", () => openModal(p));
  });

  // Controls
  const keys = new Set();
  let paused = false;

  window.addEventListener("keydown", (e) => {
    // prevent arrows from scrolling
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();

    const k = e.key.toLowerCase();

    if (k === "escape") {
      if (modal.classList.contains("is-open")) {
        closeModal();
      } else {
        paused = !paused;
      }
      return;
    }

    if (k === "enter") {
      const near = getNearestPainting();
      if (near) openModal(near);
      return;
    }

    keys.add(k);
  }, { passive: false });

  window.addEventListener("keyup", (e) => {
    keys.delete(e.key.toLowerCase());
  });

  // Player state (we move camera forward/back + strafe)
  const player = { x: 0, camZ: 0.00 }; // camZ grows as you walk forward
  const bounds = { xMin: -0.62, xMax: 0.62, zMin: -0.02, zMax: 0.34 }; // small corridor length for now

  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
  function lerp(a,b,t){ return a + (b-a)*t; }

  // Modal
  function openModal(p){
    if (!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden","false");
    modalImg.src = p.img;
    modalImg.alt = p.title;
    modalTitle.textContent = p.title;
    modalDesc.textContent = p.desc;
    modalLink.href = p.link;
    paused = true;
  }
  function closeModal(){
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden","true");
    paused = false;
  }
  modalClose?.addEventListener("click", closeModal);
  modal?.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  // “World to screen” with RELATIVE depth (this is the big fix)
  function updateLayout(){
    const rect = scene.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;

    // Character stays near center-bottom; only strafe affects x a bit
    const charBaseX = W * 0.5 + player.x * (W * 0.12);
    const charBaseY = H * 0.72;

    charEl.style.left = `${charBaseX}px`;
    charEl.style.top = `${charBaseY}px`;
    charEl.style.transform = `translate(-50%, -50%) scale(1)`;

    // Place paintings relative to camera
    paintings.forEach((p) => {
      const el = paintingEls.get(p.id);
      if (!el) return;

      // relative depth: when camZ increases, things move “towards you”
      const rel = p.z - player.camZ;

      // cull if too far away
      if (rel < 0.06 || rel > 0.70) {
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
        return;
      }

      el.style.opacity = "1";
      el.style.pointerEvents = "auto";

      // depth mapped 0..1 (near -> 0, far -> 1)
      const depth = clamp((rel - 0.06) / (0.70 - 0.06), 0, 1);

      // scale: near bigger, far smaller
      const scale = lerp(1.05, 0.62, depth);

      // vertical: far higher, near lower
      const y = lerp(H * 0.52, H * 0.34, depth);

      // wall x target
      const wallX = (p.side === "left") ? (W * 0.26) : (W * 0.74);

      // parallax based on strafe + depth
      const parallax = player.x * (W * 0.08) * (1 - depth);

      const x = wallX + parallax;

      // slight “angle” for wall feel
      const tilt = (p.side === "left") ? 10 : -10;

      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.transform = `translate(-50%, -50%) scale(${scale}) rotateY(${tilt}deg)`;

      // subtle fade with depth
      el.style.filter = `brightness(${lerp(1.05, 0.85, depth)})`;
    });

    // Prompt (near painting)
    const near = getNearestPainting();
    if (near) {
      prompt.classList.add("is-show");
      prompt.setAttribute("aria-hidden","false");
      promptTitle.textContent = near.title;
      promptSub.textContent = "Press Enter";
    } else {
      prompt.classList.remove("is-show");
      prompt.setAttribute("aria-hidden","true");
    }
  }

  function getNearestPainting(){
    // find closest by rel depth + target wall x
    const rect = scene.getBoundingClientRect();
    const W = rect.width;

    let best = null;
    let bestScore = 999;

    paintings.forEach((p) => {
      const rel = p.z - player.camZ;
      if (rel < 0.08 || rel > 0.30) return; // only when fairly close

      const targetX = (p.side === "left") ? -0.35 : 0.35;
      const dx = Math.abs(player.x - targetX);
      const dz = Math.abs(rel - 0.14);

      const score = dz * 1.2 + dx * 0.9;
      if (score < bestScore) { bestScore = score; best = p; }
    });

    if (bestScore < 0.30) return best;
    return null;
  }

  // Loop
  let lastT = performance.now();

  function tick(t){
    const dt = Math.min(0.033, (t - lastT) / 1000);
    lastT = t;

    let vx = 0;
    let vz = 0;

    const up = keys.has("w") || keys.has("arrowup");
    const down = keys.has("s") || keys.has("arrowdown");
    const left = keys.has("a") || keys.has("arrowleft");
    const right = keys.has("d") || keys.has("arrowright");

    if (!paused && !modal.classList.contains("is-open")) {
      if (up) vz += 1;
      if (down) vz -= 1;
      if (left) vx -= 1;
      if (right) vx += 1;

      // speeds
      const speedZ = 0.22; // forward/back for camera
      const speedX = 0.55; // strafe

      player.camZ += vz * speedZ * dt;
      player.x += vx * speedX * dt;

      player.camZ = clamp(player.camZ, bounds.zMin, bounds.zMax);
      player.x = clamp(player.x, bounds.xMin, bounds.xMax);

      const moving = Math.abs(vx) + Math.abs(vz) > 0.01;
      charEl.classList.toggle("is-walking", moving);

      if (status) status.textContent = `x:${player.x.toFixed(2)} z:${player.camZ.toFixed(2)} (WASD OK)`;
    } else {
      charEl.classList.remove("is-walking");
    }

    updateLayout();
    requestAnimationFrame(tick);
  }

  window.addEventListener("resize", updateLayout);
  updateLayout();
  requestAnimationFrame(tick);
})();
