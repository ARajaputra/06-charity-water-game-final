const homeScreen = document.getElementById("home-screen");
const playScreen = document.getElementById("play-screen");
const playArea = document.getElementById("play-area");
const dropsContainer = document.getElementById("drops");
const bucket = document.getElementById("bucket");
const scoreDisplay = document.getElementById("score");
const livesDisplay = document.getElementById("lives");
const levelDisplay = document.getElementById("level");
const pauseMenu = document.getElementById("pause-menu");
const endMenu = document.getElementById("end-menu");
const endTitle = document.getElementById("end-title");
const endScore = document.getElementById("end-score");
const endMilestone = document.getElementById("end-milestone");
const endActions = document.getElementById("end-actions");
const milestoneMessage = document.getElementById("milestone-message");
const gameStartSound = new Audio("img/freesound_community-game-start-6104.mp3");
const gameOverSound = new Audio("img/alphix-game-over-417465.mp3");
const collectSound = new Audio("img/liecio-collect-points-190037.mp3");
const errorSound = new Audio("img/lesiakower-error-mistake-sound-effect-incorrect-answer-437420.mp3");

const maxLevel = 10;
const difficultyModes = {
  easy: { label: "Easy", speedMultiplier: 0.75, lives: 4, pointsPerLevel: 75 },
  med: { label: "Med", speedMultiplier: 1, lives: 3, pointsPerLevel: 100 },
  hard: { label: "Hard", speedMultiplier: 1.25, lives: 2, pointsPerLevel: 200 }
};
const bucketWidth = 72;
const bucketHeight = 76;
const dropSize = 24;
const baseDropSpeedMultiplier = 2;
const dropDensityMultiplier = 3;
const maxDropSpeed = 440;

let score = 0;
let lives = difficultyModes.med.lives;
let level = 1;
let levelStartScore = 0;
let bucketX = 0;
let drops = [];
let mode = "home";
let endlessMode = false;
let spawnTimer = 0;
let damageTimer = 0;
let lastTime = null;
let nextDropId = 0;
let currentMilestoneIndex = 0;
let milestoneTimeout;
let selectedDifficulty = "med";

function getLevelGoal() {
  return difficultyModes[selectedDifficulty].pointsPerLevel;
}

function getMaxScore() {
  return getLevelGoal() * maxLevel;
}

function getMilestones() {
  const maxScore = getMaxScore();
  const pointsPerLevel = getLevelGoal();
  const milestoneScore = (fraction) => Math.ceil((maxScore * fraction) / 10) * 10;
  const milestones = [
    {
      score: getLevelGoal(),
      message: `Level 1 complete! ${getLevelGoal()} points per level!`
    },
    {
      score: milestoneScore(0.25),
      message: `25% complete! ${milestoneScore(0.25)} of ${maxScore} points collected!`
    },
    {
      score: milestoneScore(0.5),
      message: `Halfway there! ${milestoneScore(0.5)} of ${maxScore} points collected!`
    },
    {
      score: milestoneScore(0.75),
      message: `Only ${maxScore - milestoneScore(0.75)} points to go!`
    },
    {
      score: maxScore,
      message: `You did it! All ${maxLevel} levels complete at ${maxScore} points!`
    }
  ];

  let lastCheckpointLevel = maxLevel;
  if (endlessMode) {
    lastCheckpointLevel = Math.ceil(score / pointsPerLevel) + 3;
  }

  for (let completedLevel = 3; completedLevel <= lastCheckpointLevel; completedLevel += 3) {
    milestones.push({
      score: Math.ceil((completedLevel * pointsPerLevel) / 10) * 10,
      message: `Level ${completedLevel} checkpoint!`,
      lifeRewardMessage: `Level ${completedLevel} checkpoint! You regained a life!`,
      restoresLife: true
    });
  }

  milestones.sort((first, second) => first.score - second.score);
  return milestones;
}

function chooseDifficulty(difficulty) {
  selectedDifficulty = difficulty;
  const settings = difficultyModes[selectedDifficulty];
  document.getElementById("difficulty-details").textContent =
    `${settings.label}: ${settings.speedMultiplier}× speed, ${settings.lives} lives, ` +
    `${settings.pointsPerLevel} points per level (${getMaxScore()} to win).`;

  for (const [name, mode] of Object.entries(difficultyModes)) {
    document.getElementById(`${name}-mode`).setAttribute(
      "aria-pressed",
      name === selectedDifficulty
    );
  }
}

function playSound(sound) {
  sound.currentTime = 0;
  const playback = sound.play();
  if (playback) {
    playback.catch((error) => {
      console.error("Could not play game sound:", error);
    });
  }
}

function updateHud() {
  scoreDisplay.textContent = score;
  levelDisplay.textContent = level;
  livesDisplay.textContent = "♥".repeat(lives);
  let livesLabel = "lives";
  if (lives === 1) {
    livesLabel = "life";
  }
  livesDisplay.setAttribute("aria-label", `${lives} ${livesLabel}`);
}

function placeBucket() {
  const maxX = Math.max(0, playArea.clientWidth - bucketWidth);
  bucketX = Math.max(0, Math.min(maxX, bucketX));
  bucket.style.left = `${bucketX - 47}px`;
}

function clearDrops() {
  drops = [];
  dropsContainer.replaceChildren();
}

function showMilestones() {
  const milestones = getMilestones();
  while (
    currentMilestoneIndex < milestones.length &&
    score >= milestones[currentMilestoneIndex].score
  ) {
    const milestone = milestones[currentMilestoneIndex];
    currentMilestoneIndex++;
    let message = milestone.message;
    if (milestone.restoresLife && lives < difficultyModes[selectedDifficulty].lives) {
      lives++;
      message = milestone.lifeRewardMessage;
      updateHud();
    }
    milestoneMessage.textContent = message;
    milestoneMessage.hidden = false;
    clearTimeout(milestoneTimeout);
    milestoneTimeout = setTimeout(() => {
      milestoneMessage.hidden = true;
    }, 2500);
  }
}

function startGame() {
  playSound(gameStartSound);
  homeScreen.hidden = true;
  playScreen.hidden = false;
  endlessMode = false;
  score = 0;
  currentMilestoneIndex = 0;
  clearTimeout(milestoneTimeout);
  milestoneMessage.hidden = true;
  lives = difficultyModes[selectedDifficulty].lives;
  level = 1;
  levelStartScore = 0;
  spawnTimer = 0;
  damageTimer = 0;
  clearDrops();
  bucketX = (playArea.clientWidth - bucketWidth) / 2;
  placeBucket();
  updateHud();
  pauseMenu.hidden = true;
  endMenu.hidden = true;
  mode = "playing";
}

function restartLevel() {
  score = levelStartScore;
  lives = difficultyModes[selectedDifficulty].lives;
  spawnTimer = 0;
  damageTimer = 0;
  clearDrops();
  updateHud();
  endMenu.hidden = true;
  pauseMenu.hidden = true;
  mode = "playing";
}

function pauseGame() {
  if (mode !== "playing") {
    return;
  }
  mode = "paused";
  pauseMenu.hidden = false;
  pauseMenu.querySelector("button").focus();
}

function resumeGame() {
  if (mode !== "paused") {
    return;
  }
  mode = "playing";
  pauseMenu.hidden = true;
  document.getElementById("pause-button").focus();
}

function showEndMenu(won) {
  playSound(gameOverSound);
  pauseMenu.hidden = true;
  endMenu.hidden = false;
  if (won) {
    mode = "won";
    endTitle.textContent = "YOU WIN";
  } else {
    mode = "lost";
    endTitle.textContent = "LEVEL FAILED";
  }
  endScore.textContent = `Score: ${score}`;
  endMilestone.hidden = !won;
  if (won) {
    const milestones = getMilestones();
    endMilestone.textContent = milestones[milestones.length - 1].message;
  }
  endActions.replaceChildren();

  if (won) {
    addMenuButton("ENDLESS MODE", startEndlessMode);
    addMenuButton("RESTART GAME", startGame);
  } else {
    addMenuButton("RESTART LEVEL", restartLevel);
    addMenuButton("RESTART GAME", startGame);
  }
  addMenuButton("EXIT TO MENU", returnHome);
  endActions.querySelector("button").focus();
}

function loseLife() {
  lives--;
  damageTimer = 0.25;
  bucket.classList.add("bucket-hit");
  updateHud();

  if (lives <= 0) {
    showEndMenu(false);
    return true;
  }

  return false;
}

// A little helper intended to just add the menu buttons to the menu programmatically instead of hard-coding every single possible set of button choices.

// Pass the action here so it's easy to send into the callback without having to manually account for what the callback should do.
function addMenuButton(label, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", action);
  endActions.append(button);
}

function returnHome() {
  mode = "home";
  clearDrops();
  endMenu.hidden = true;
  pauseMenu.hidden = true;
  playScreen.hidden = true;
  homeScreen.hidden = false;
  document.getElementById("play-button").focus();
}

function startEndlessMode() {
  const maxScore = getMaxScore();
  endlessMode = true;
  score = maxScore;
  lives = difficultyModes[selectedDifficulty].lives;
  level = maxLevel;
  levelStartScore = maxScore;
  clearDrops();
  spawnTimer = 0;
  updateHud();
  endMenu.hidden = true;
  mode = "playing";
}

// Decent amount of magic numbers here, but the basic idea is pretty simple.
// Create a clean drop 70% of the time, a dirty one 30% of the time, then store it in a JS object representing the droplet and pick where to spawn it and with what speed, then let it drop.
function spawnDrop() {
  const dropElement = document.createElement("span");
  const clean = Math.random() < 0.7;
  const speedMultiplier = difficultyModes[selectedDifficulty].speedMultiplier;
  const maxDropSpeedForDifficulty = maxDropSpeed * speedMultiplier;
  const drop = {
    id: nextDropId++,
    x: Math.random() * Math.max(0, playArea.clientWidth - dropSize),
    y: -dropSize,
    speed: Math.min(
      maxDropSpeedForDifficulty,
      (115 + level * 10 + Math.random() * 45) *
        baseDropSpeedMultiplier *
        speedMultiplier
    ),
    clean,
    element: dropElement
  };

  if (clean) {
    dropElement.className = "drop clean-drop";
  } else {
    dropElement.className = "drop dirty-drop";
  }
  dropElement.style.left = `${drop.x}px`;
  dropElement.setAttribute("aria-hidden", "true");
  dropsContainer.append(dropElement);
  drops.push(drop);
}

// If the drop is clean, add score and go to the next level if you have 100, if it isn't clean, then we drop 10 points and also get rid of a life.
function handleDrop(drop) {
  if (drop.clean) {
    playSound(collectSound);
    const maxScore = getMaxScore();
    const pointsPerLevel = getLevelGoal();
    score += 10;
    showMilestones();
    if (score >= maxScore && !endlessMode) {
      score = maxScore;
      updateHud();
      showEndMenu(true);
      return;
    }

    if (endlessMode) {
      level = Math.floor(score / pointsPerLevel) + 1;
    } else {
      level = Math.min(maxLevel, Math.floor(score / pointsPerLevel) + 1);
    }
    levelStartScore = (level - 1) * pointsPerLevel;
  } else {
    playSound(errorSound);
    const pointsPerLevel = getLevelGoal();
    score = Math.max(0, score - 10);
    if (endlessMode) {
      level = Math.floor(score / pointsPerLevel) + 1;
    } else {
      level = Math.min(maxLevel, Math.floor(score / pointsPerLevel) + 1);
    }
    levelStartScore = (level - 1) * pointsPerLevel;
    loseLife();
    return;
  }

  updateHud();
}

// This code was quite awful for me to get working, lots of asking chatGPT for help alongside reading MDN. The basic idea is still basically the same as the demo version I had earlier.

// While the game is running, in a loop, we update the spawn timer anddamage timers, if we take damage, we show the bucket hit lighting, then send off the hit handling to to the handler function.

// The hard part is the animation, we set the bucket limitation alongside the game window size, then using the functions we mentioned earlier for random drop creation, create a random drop in a random location at the top of the game board, and based on the set rules for speed, drop it. If it touches the bucket, check if it's black or blue, and handle accordingly.

function update(dt) {
  if (mode !== "playing") {
    return;
  }

  spawnTimer += dt;
  damageTimer = Math.max(0, damageTimer - dt);
  if (damageTimer === 0) {
    bucket.classList.remove("bucket-hit");
  }

  const spawnInterval = Math.max(
    0.175,
    (1 - level * 0.04) / dropDensityMultiplier
  );
  if (spawnTimer >= spawnInterval) {
    spawnDrop();
    spawnTimer -= spawnInterval;
  }

  const bucketTop = playArea.clientHeight - bucketHeight - 22;
  for (let i = drops.length - 1; i >= 0; i--) {
    const drop = drops[i];
    drop.y += drop.speed * dt;
    drop.element.style.transform = `translateY(${drop.y}px) rotate(-45deg)`;

    const touchesBucket =
      drop.x + dropSize > bucketX &&
      drop.x < bucketX + bucketWidth &&
      drop.y + dropSize >= bucketTop &&
      drop.y < bucketTop + bucketHeight;

    if (touchesBucket) {
      drop.element.remove();
      drops.splice(i, 1);
      handleDrop(drop);
      if (mode !== "playing") {
        return;
      }
    } else if (drop.y > playArea.clientHeight) {
      drop.element.remove();
      drops.splice(i, 1);
      if (drop.clean) {
        playSound(errorSound);
        if (loseLife()) {
          return;
        }
      }
    }
  }
}

function moveBucket(direction) {
  if (mode !== "playing") {
    return;
  }
  bucketX += direction * 35;
  placeBucket();
}

function moveBucketToPointer(event) {
  if (mode !== "playing") {
    return;
  }
  const bounds = playArea.getBoundingClientRect();
  bucketX = event.clientX - bounds.left - bucketWidth / 2;
  placeBucket();
}

function loop(timestamp) {
  let dt = 0;
  if (lastTime !== null) {
    dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  }
  lastTime = timestamp;
  update(dt);
  requestAnimationFrame(loop);
}

document.getElementById("play-button").addEventListener("click", startGame);
document.getElementById("easy-mode").addEventListener("click", () => chooseDifficulty("easy"));
document.getElementById("med-mode").addEventListener("click", () => chooseDifficulty("med"));
document.getElementById("hard-mode").addEventListener("click", () => chooseDifficulty("hard"));
document.getElementById("pause-button").addEventListener("click", pauseGame);
document.getElementById("left-button").addEventListener("click", () => moveBucket(-1));
document.getElementById("right-button").addEventListener("click", () => moveBucket(1));
document.querySelector('[data-action="resume"]').addEventListener("click", resumeGame);
document.querySelector('[data-action="restart-level"]').addEventListener("click", restartLevel);
document.querySelector('[data-action="restart-game"]').addEventListener("click", startGame);
document.querySelector('[data-action="home"]').addEventListener("click", returnHome);

// Adding a series of event listeners to handle bucket events with the arrow keys and also handle the addition of the menus for the game.
playArea.addEventListener("pointerdown", (event) => {
  if (event.target.closest(".bucket-controls")) {
    return;
  }
  playArea.setPointerCapture(event.pointerId);
  moveBucketToPointer(event);
});
playArea.addEventListener("pointermove", (event) => {
  if (event.buttons > 0) {
    moveBucketToPointer(event);
  }
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" || event.key.toLowerCase() === "p") {
    if (mode === "playing") {
      pauseGame();
    } else if (mode === "paused") {
      resumeGame();
    }
  }
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
    moveBucket(-1);
  }
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
    moveBucket(1);
  }
});
window.addEventListener("resize", placeBucket);

requestAnimationFrame(loop);
