const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const authUI = document.getElementById("authUI");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const showRegister = document.getElementById("showRegister");
const showLogin = document.getElementById("showLogin");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  enterBtn.x = canvas.width / 2 - enterBtn.w / 2;
  enterBtn.y = canvas.height / 2 - enterBtn.h / 2;
}
window.addEventListener("resize", resizeCanvas);

let state = "enter";

const enterBtn = {
  x: 0,
  y: 0,
  w: 180,
  h: 64,
  radius: 18,
  morph: 0,
};

const plane = {
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  angle: 0,
  trail: [],
};

let flyStart = 0;
let crashX = 0;
let crashY = 0;

let particles = [];
let parachutes = [];
let formReady = false;

const FORM_W = 300;
const FORM_H = 245;

class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;

    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 8;

    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.size = 1.5 + Math.random() * 2.8;
    this.tx = x;
    this.ty = y;
    this.mode = "explode";
    this.alpha = 1;
    this.wait = Math.random() * 20;
  }

  updateExplode() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.965;
    this.vy *= 0.965;
  }

  updateBuild() {
    if (this.wait > 0) {
      this.wait -= 1;
      return;
    }

    this.x += (this.tx - this.x) * 0.08;
    this.y += (this.ty - this.y) * 0.08;
    this.vx *= 0.9;
    this.vy *= 0.9;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = "#ffd447";
    ctx.shadowBlur = 14;
    ctx.shadowColor = "#ffd447";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class ParachuteGuy {
  constructor(x, y) {
    this.x = x + (Math.random() * 40 - 20);
    this.y = y + (Math.random() * 20 - 10);

    this.vx = (Math.random() * 4 - 2) * 1.2;
    this.vy = -2 - Math.random() * 2.5;

    this.parachuteOpen = false;
    this.openTimer = 16 + Math.random() * 18;

    this.sway = Math.random() * Math.PI * 2;
    this.swaySpeed = 0.04 + Math.random() * 0.03;

    this.bodyColor = ["#ffffff", "#ffd447", "#87ceeb", "#ff8fab"][
      Math.floor(Math.random() * 4)
    ];
    this.dead = false;
  }

  update() {
    if (!this.parachuteOpen) {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += 0.12;
      this.openTimer -= 1;

      if (this.openTimer <= 0) {
        this.parachuteOpen = true;
        this.vy = 1.2 + Math.random() * 0.8;
      }
    } else {
      this.sway += this.swaySpeed;
      this.x += Math.sin(this.sway) * 0.9 + this.vx * 0.15;
      this.y += this.vy;
      this.vy = Math.min(this.vy + 0.015, 1.8);

      if (formReady) {
        this.vy += 0.08;
      }
    }

    if (this.y > canvas.height + 80) {
      this.dead = true;
    }
  }

  draw() {
    ctx.save();

    if (this.parachuteOpen) {
      ctx.beginPath();
      ctx.fillStyle = "#ff5e57";
      ctx.arc(this.x, this.y - 16, 12, Math.PI, 0);
      ctx.fill();

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(this.x - 12, this.y - 16);
      ctx.lineTo(this.x - 4, this.y - 2);
      ctx.moveTo(this.x + 12, this.y - 16);
      ctx.lineTo(this.x + 4, this.y - 2);
      ctx.stroke();
    }

    ctx.fillStyle = this.bodyColor;
    ctx.fillRect(this.x - 3, this.y - 2, 6, 10);

    ctx.beginPath();
    ctx.arc(this.x, this.y - 6, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

function initPlanePath() {
  plane.x = canvas.width / 2;
  plane.y = canvas.height / 2;
  plane.trail = [];

  let angle;
  do {
    angle = Math.random() * Math.PI * 2;
  } while (
    Math.abs(Math.cos(angle)) < 0.35 &&
    Math.abs(Math.sin(angle)) < 0.35
  );

  const speed = 4.5 + Math.random() * 2;
  plane.vx = Math.cos(angle) * speed;
  plane.vy = Math.sin(angle) * speed;
  plane.angle = Math.atan2(plane.vy, plane.vx);
}

function drawBackgroundDots() {
  for (let i = 0; i < 30; i++) {
    const x = (i * 173) % canvas.width;
    const y = (i * 97) % canvas.height;
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.beginPath();
    ctx.arc(x, y, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEnterButton() {
  const morph = enterBtn.morph;

  const w = enterBtn.w - morph * 70;
  const h = enterBtn.h - morph * 28;
  const r = enterBtn.radius + morph * 20;

  ctx.save();
  ctx.fillStyle = "#ffd447";
  ctx.shadowBlur = 20;
  ctx.shadowColor = "#ffd447";

  roundRect(
    ctx,
    enterBtn.x + (enterBtn.w - w) / 2,
    enterBtn.y + (enterBtn.h - h) / 2,
    w,
    h,
    r,
  );
  ctx.fill();

  if (morph < 0.92) {
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#111";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("ENTER", canvas.width / 2, canvas.height / 2);
  }

  ctx.restore();
}

function drawPlane() {
  plane.trail.push({ x: plane.x, y: plane.y, a: 0.22 + Math.random() * 0.2 });
  if (plane.trail.length > 18) plane.trail.shift();

  for (let i = 0; i < plane.trail.length; i++) {
    const t = plane.trail[i];
    ctx.save();
    ctx.globalAlpha = ((i + 1) / plane.trail.length) * t.a;
    ctx.fillStyle = "#ffd447";
    ctx.beginPath();
    ctx.arc(t.x, t.y, 2 + i * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(plane.x, plane.y);
  ctx.rotate(plane.angle);

  ctx.fillStyle = "#ffffff";
  ctx.shadowBlur = 10;
  ctx.shadowColor = "#ffffff";

  ctx.beginPath();
  ctx.moveTo(22, 0);
  ctx.lineTo(-14, -8);
  ctx.lineTo(-8, 0);
  ctx.lineTo(-14, 8);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-4, 0);
  ctx.lineTo(-20, -14);
  ctx.lineTo(-12, -2);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-4, 0);
  ctx.lineTo(-20, 14);
  ctx.lineTo(-12, 2);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-16, -2);
  ctx.lineTo(-26, -10);
  ctx.lineTo(-18, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function createExplosion(x, y, count = 300) {
  particles = [];
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y));
  }
}

function spawnParachutes(x, y) {
  parachutes = [];
  for (let i = 0; i < 7; i++) {
    parachutes.push(new ParachuteGuy(x, y));
  }
}

function assignParticlesToFormTargets(centerX, centerY) {
  const left = clamp(centerX - FORM_W / 2, 20, canvas.width - FORM_W - 20);
  const top = clamp(centerY - FORM_H / 2, 20, canvas.height - FORM_H - 20);

  const targets = [];

  pushRectBorderTargets(targets, left, top, FORM_W, FORM_H, 9);
  pushRectBorderTargets(targets, left + 22, top + 62, FORM_W - 44, 42, 8);
  pushRectBorderTargets(targets, left + 22, top + 118, FORM_W - 44, 42, 8);
  pushRectBorderTargets(targets, left + 22, top + 174, FORM_W - 44, 40, 8);

  while (targets.length < particles.length) {
    const tx = left + Math.random() * FORM_W;
    const ty = top + Math.random() * FORM_H;
    targets.push({ x: tx, y: ty });
  }

  for (let i = 0; i < particles.length; i++) {
    particles[i].tx = targets[i].x;
    particles[i].ty = targets[i].y;
    particles[i].mode = "build";
    particles[i].wait = Math.random() * 16;
  }

  authUI.style.left = `${left}px`;
  authUI.style.top = `${top}px`;
}

function pushRectBorderTargets(arr, x, y, w, h, gap) {
  for (let px = x; px <= x + w; px += gap) {
    arr.push({ x: px, y: y });
    arr.push({ x: px, y: y + h });
  }
  for (let py = y; py <= y + h; py += gap) {
    arr.push({ x: x, y: py });
    arr.push({ x: x + w, y: py });
  }
}

function allParticlesSlowEnough() {
  if (!particles.length) return false;
  return particles.every((p) => Math.abs(p.vx) < 0.35 && Math.abs(p.vy) < 0.35);
}

function allParticlesBuilt() {
  if (!particles.length) return false;
  return particles.every(
    (p) => Math.abs(p.x - p.tx) < 1.5 && Math.abs(p.y - p.ty) < 1.5,
  );
}

function updateParticles() {
  for (const p of particles) {
    if (p.mode === "explode") p.updateExplode();
    if (p.mode === "build") p.updateBuild();
    p.draw();
  }
}

function updateParachutes() {
  for (const para of parachutes) {
    para.update();
    para.draw();
  }
  parachutes = parachutes.filter((p) => !p.dead);
}

function drawShockwave() {
  ctx.save();
  const radius = 22 + Math.sin(Date.now() * 0.03) * 2;
  ctx.strokeStyle = "rgba(255,212,71,0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(crashX, crashY, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function animate(time) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackgroundDots();

  if (state === "enter") {
    drawEnterButton();
  }

  if (state === "morph") {
    enterBtn.morph += 0.06;
    if (enterBtn.morph >= 1) {
      enterBtn.morph = 1;
      initPlanePath();
      flyStart = time;
      state = "plane";
    }
    drawEnterButton();
  }

  if (state === "plane") {
    plane.x += plane.vx;
    plane.y += plane.vy;

    if (plane.x < 30 || plane.x > canvas.width - 30) plane.vx *= -1;
    if (plane.y < 30 || plane.y > canvas.height - 30) plane.vy *= -1;

    plane.angle = Math.atan2(plane.vy, plane.vx);

    drawPlane();

    if (time - flyStart > 2000) {
      crashX = plane.x;
      crashY = plane.y;

      createExplosion(crashX, crashY, 320);
      spawnParachutes(crashX, crashY);

      state = "explode";
    }
  }

  if (state === "explode") {
    updateParticles();
    updateParachutes();
    drawShockwave();

    if (allParticlesSlowEnough()) {
      assignParticlesToFormTargets(crashX, crashY);
      state = "build";
    }
  }

  if (state === "build") {
    updateParticles();
    updateParachutes();

    if (allParticlesBuilt()) {
      if (!formReady) {
        formReady = true;
        authUI.style.display = "block";
      }
      state = "form";
    }
  }

  if (state === "form") {
    updateParachutes();
  }

  requestAnimationFrame(animate);
}

function switchFormWithParticles(showRegisterForm) {
  const currentLeft =
    parseFloat(authUI.style.left) || (canvas.width - FORM_W) / 2;
  const currentTop =
    parseFloat(authUI.style.top) || (canvas.height - FORM_H) / 2;

  const centerX = currentLeft + FORM_W / 2;
  const centerY = currentTop + FORM_H / 2;

  authUI.style.display = "none";
  formReady = false;

  if (showRegisterForm) {
    loginForm.classList.remove("active");
    registerForm.classList.add("active");
  } else {
    registerForm.classList.remove("active");
    loginForm.classList.add("active");
  }

  for (const p of particles) {
    p.mode = "explode";
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 3.5;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.wait = Math.random() * 10;
  }

  crashX = centerX;
  crashY = centerY;

  setTimeout(() => {
    assignParticlesToFormTargets(centerX, centerY);
    state = "build";
  }, 280);
}

canvas.addEventListener("click", (e) => {
  if (state !== "enter") return;

  const x = e.clientX;
  const y = e.clientY;

  if (
    x >= enterBtn.x &&
    x <= enterBtn.x + enterBtn.w &&
    y >= enterBtn.y &&
    y <= enterBtn.y + enterBtn.h
  ) {
    state = "morph";
  }
});

showRegister.addEventListener("click", () => {
  if (state !== "form") return;
  switchFormWithParticles(true);
});

showLogin.addEventListener("click", () => {
  if (state !== "form") return;
  switchFormWithParticles(false);
});

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

resizeCanvas();
animate();

document.querySelector("#registerForm button").onclick = async () => {
  const name = document.querySelector(
    "#registerForm input[placeholder='Name']",
  ).value;
  const email = document.querySelector(
    "#registerForm input[placeholder='Email']",
  ).value;
  const password = document.querySelector(
    "#registerForm input[placeholder='Password']",
  ).value;

  const res = await fetch("/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      name,
      email,
      password,
    }),
  });

  const data = await res.json();

  if (data.success) {
    alert("Account created!");
  } else {
    alert(data.message);
  }
};

document.querySelector("#loginForm button").onclick = async () => {
  const email = document.querySelector(
    "#loginForm input[placeholder='Email']",
  ).value;
  const password = document.querySelector(
    "#loginForm input[placeholder='Password']",
  ).value;

  const res = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (data.success) {
    localStorage.setItem("userId", data.id);
    localStorage.setItem("username", data.name);

    window.location.href = "/home.html";
  } else {
    alert("Invalid login");
  }
};
