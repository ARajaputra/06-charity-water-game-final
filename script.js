const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("score");
const livesDisplay = document.getElementById("lives");
const message = document.getElementById("message");
const resetButton = document.getElementById("reset");
const canImage = new Image();

const W = canvas.width;
const H = canvas.height;

canImage.addEventListener("error", () => {
  console.error("Could not load the can paddle image at img/can.png.");
});
canImage.src = "img/can.png";

const bucket = {
  x: 220,
  y: 440,
  width: 60,
  height: 40
};

let score = 0;
let lives = 3;
let droplets = [];
let playing = true;
let spawnTimer = 0;
let damageFlash = 0;
let lastTime = null;

function updateHUD() {
  scoreDisplay.textContent = score;
  livesDisplay.textContent = lives;
}

function resetGame() {
  score = 0;
  lives = 3;
  droplets = [];
  playing = true;
  spawnTimer = 0;
  damageFlash = 0;
  bucket.x = (W - bucket.width) / 2;
  message.textContent = "";
  message.className = "";
  updateHUD();
}

function spawnDroplet() {
  droplets.push({
    x: 20 + Math.random() * (W - 40),
    y: -20,
    radius: 12,
    speed: 140 + Math.random() * 70,
    clean: Math.random() < 0.7
  });
}

function update(dt) {
  if (!playing) return;

  damageFlash = Math.max(0, damageFlash - dt);
  spawnTimer += dt;

  if (spawnTimer >= 0.8) {
    spawnDroplet();
    spawnTimer -= 0.8;
  }

  for (let i = droplets.length - 1; i >= 0; i--) {
    const drop = droplets[i];
    drop.y += drop.speed * dt;

    const hit =
      drop.x + drop.radius > bucket.x &&
      drop.x - drop.radius < bucket.x + bucket.width &&
      drop.y + drop.radius > bucket.y &&
      drop.y - drop.radius < bucket.y + bucket.height;

    if (hit) {
      if (drop.clean) {
        score += 10;
      } else {
        score = Math.max(0, score - 10);
        lives--;
        damageFlash = 0.2;
      }

      droplets.splice(i, 1);
      updateHUD();

      if (lives <= 0) {
        playing = false;
        message.textContent = "Game over";
        message.className = "lose";
      } else if (score >= 100) {
        playing = false;
        message.textContent = "You win";
        message.className = "win";
      }

      if (!playing) {
        break;
      }

    } else if (drop.y - drop.radius > H) {
      droplets.splice(i, 1);
    }
  }
}

function render() {
  ctx.clearRect(0, 0, W, H);

  const canX = bucket.x - 10;
  const canY = bucket.y - 20;

  if (canImage.complete && canImage.naturalWidth > 0) {
    ctx.drawImage(canImage, canX, canY, 80, 80);

    if (damageFlash > 0) {
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = "rgba(245, 64, 44, 0.6)";
      ctx.fillRect(canX, canY, 80, 80);
      ctx.globalCompositeOperation = "source-over";
    }
  }

  // Draw droplets
  for (const drop of droplets) {
    if (drop.clean) {
      ctx.fillStyle = "#2E9DF7";
    } else {
      ctx.fillStyle = "#222222";
    }

    ctx.beginPath();
    ctx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function loop(timestamp) {
  let dt = 0;

  if (lastTime !== null) {
    dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  }

  lastTime = timestamp;

  update(dt);
  render();
  requestAnimationFrame(loop);
}

function moveBucket(event) {
  if (!playing) return;

  const rect = canvas.getBoundingClientRect();

  const pointerX =
    (event.clientX - rect.left - canvas.clientLeft)
    * W / canvas.clientWidth;

  bucket.x = Math.max(
    0,
    Math.min(W - bucket.width, pointerX - bucket.width / 2)
  );
}

canvas.addEventListener("pointerdown", (event) => {
  canvas.setPointerCapture(event.pointerId);
  moveBucket(event);
});

canvas.addEventListener("pointermove", moveBucket);

resetButton.addEventListener("click", resetGame);

resetGame();
requestAnimationFrame(loop);