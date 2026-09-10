(() => {

"use strict";


/* =========================================================
   BULBULE KA KHEL
   Real Bubble Shooter Engine
   ========================================================= */


/* ---------- DOM ---------- */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const levelText = document.getElementById("levelText");
const scoreText = document.getElementById("scoreText");
const bestText = document.getElementById("bestText");

const nextBubbleEl = document.getElementById("nextBubble");
const messageEl = document.getElementById("message");

const restartBtn = document.getElementById("restartBtn");
const soundBtn = document.getElementById("soundBtn");

const settingsBtn = document.getElementById("settingsBtn");
const settingsPanel = document.getElementById("settingsPanel");

const closeSettingsBtn =
  document.getElementById("closeSettingsBtn");

const resetProgressBtn =
  document.getElementById("resetProgressBtn");


/* ---------- GAME SIZE ---------- */

const W = canvas.width;
const H = canvas.height;

const COLS = 11;

const RADIUS = 20;

const ROW_HEIGHT = 35;

const TOP = 48;

const SHOOTER_Y = H - 70;

const MAX_LEVEL = 50;


/* ---------- COLORS ---------- */

const COLORS = [
  "#e85b58",
  "#efc94c",
  "#5faf70",
  "#4f91d5",
  "#9b72c4",
  "#dc82ad"
];


/* ---------- SAVE ---------- */

const SAVE_KEY = "bulbule-ka-khel-save-v3";


let save = loadSave();


function defaultSave() {

  return {
    level: 1,
    score: 0,
    best: 0,
    sound: true
  };

}


function loadSave() {

  try {

    const raw = localStorage.getItem(SAVE_KEY);

    if (raw) {

      return {
        ...defaultSave(),
        ...JSON.parse(raw)
      };

    }

  } catch (e) {}

  return defaultSave();

}


function saveGame() {

  try {

    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify(save)
    );

  } catch (e) {}

}


/* ---------- GAME STATE ---------- */

let grid = [];

let shooterColor = 0;

let nextColor = 1;

let movingBubble = null;

let particles = [];

let fallingBubbles = [];

let popAnimations = [];

let floatingTexts = [];

let aim = {
  x: W / 2,
  y: 250
};

let gameBusy = false;

let levelComplete = false;

let shotsWithoutPop = 0;

let lastTime = 0;


/* =========================================================
   LEVEL GENERATION
   ========================================================= */

function colorsAvailable() {

  return Math.min(
    6,
    3 + Math.floor((save.level - 1) / 8)
  );

}


function randomColor() {

  return Math.floor(
    Math.random() * colorsAvailable()
  );

}


function createLevel() {

  grid = [];

  const level = save.level;

  const rows = Math.min(
    7 + Math.floor((level - 1) / 7),
    12
  );


  /*
     Later levels become denser.
  */

  const density = Math.min(
    .90,
    .68 + level * .004
  );


  for (let r = 0; r < rows; r++) {

    grid[r] = [];

    for (let q = 0; q < COLS; q++) {

      let occupied = Math.random() < density;


      /*
         Keep lower part slightly open.
      */

      if (r > 3 && Math.random() < .20) {
        occupied = false;
      }


      grid[r][q] =
        occupied
          ? randomColor()
          : -1;

    }

  }


  /*
     Make sure ceiling is connected.
  */

  for (let q = 0; q < COLS; q++) {

    if (grid[0][q] < 0) {

      grid[0][q] = randomColor();

    }

  }


  shooterColor = randomColor();

  nextColor = randomColor();

  movingBubble = null;

  particles = [];

  fallingBubbles = [];

  popAnimations = [];

  floatingTexts = [];

  shotsWithoutPop = 0;

  gameBusy = false;

  levelComplete = false;

  messageEl.textContent =
    "निशाना लगाइए और बुलबुला छोड़िए!";

  updateUI();

  draw();

}


/* =========================================================
   COORDINATES
   ========================================================= */

function cellPosition(q, r) {

  const offset =
    r % 2 === 1
      ? RADIUS
      : 0;


  return {

    x:
      W / 2
      +
      (q - (COLS - 1) / 2)
      * RADIUS
      * 2
      +
      offset,

    y:
      TOP
      +
      r * ROW_HEIGHT

  };

}


/* =========================================================
   GRID NEIGHBOURS
   ========================================================= */

function neighbours(q, r) {

  const odd = r % 2 === 1;


  const dirs = odd

    ? [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
        [1, -1],
        [1, 1]
      ]

    : [
        [-1, 0],
        [1, 0],
        [-1, -1],
        [-1, 1],
        [0, -1],
        [0, 1]
      ];


  return dirs

    .map(([dq, dr]) => [
      q + dq,
      r + dr
    ])

    .filter(([x, y]) =>
      x >= 0 &&
      x < COLS &&
      y >= 0 &&
      y < grid.length
    );

}


/* =========================================================
   MATCH CLUSTER
   ========================================================= */

function findCluster(q, r) {

  const color =
    grid[r]?.[q];

  if (color === undefined || color < 0) {
    return [];
  }


  const result = [];

  const queue = [[q, r]];

  const visited = new Set();

  visited.add(`${q},${r}`);


  while (queue.length) {

    const [cq, cr] =
      queue.shift();

    result.push([cq, cr]);


    for (const [nq, nr] of neighbours(cq, cr)) {

      const key =
        `${nq},${nr}`;


      if (
        !visited.has(key) &&
        grid[nr]?.[nq] === color
      ) {

        visited.add(key);

        queue.push([nq, nr]);

      }

    }

  }


  return result;

}


/* =========================================================
   CEILING CONNECTION
   ========================================================= */

function connectedToCeiling() {

  const connected = new Set();

  const queue = [];


  for (let q = 0; q < COLS; q++) {

    if (grid[0]?.[q] >= 0) {

      connected.add(`${q},0`);

      queue.push([q, 0]);

    }

  }


  while (queue.length) {

    const [q, r] =
      queue.shift();


    for (const [nq, nr] of neighbours(q, r)) {

      const key =
        `${nq},${nr}`;


      if (
        grid[nr]?.[nq] >= 0 &&
        !connected.has(key)
      ) {

        connected.add(key);

        queue.push([nq, nr]);

      }

    }

  }


  return connected;

}


/* =========================================================
   FALLING BUBBLES
   ========================================================= */

function collectDetached() {

  const connected =
    connectedToCeiling();


  const detached = [];


  for (let r = 0; r < grid.length; r++) {

    for (let q = 0; q < COLS; q++) {

      if (
        grid[r][q] >= 0 &&
        !connected.has(`${q},${r}`)
      ) {

        const p =
          cellPosition(q, r);


        detached.push({

          x: p.x,

          y: p.y,

          color: grid[r][q],

          vx:
            (Math.random() - .5)
            * 2,

          vy:
            Math.random() * 1.5
            + 2,

          rotation:
            Math.random() * Math.PI * 2,

          rotationSpeed:
            (Math.random() - .5)
            * .08,

          life: 0,

          delay:
            Math.random() * 100

        });


        grid[r][q] = -1;

      }

    }

  }


  fallingBubbles = detached;

  return detached.length;

}


/* =========================================================
   EMPTY CELL
   ========================================================= */

function findBestEmpty(x, y) {

  let best = null;

  let bestDistance = Infinity;


  for (let r = 0; r < grid.length; r++) {

    for (let q = 0; q < COLS; q++) {

      if (grid[r][q] < 0) {

        const p =
          cellPosition(q, r);


        const distance =
          (p.x - x) ** 2 +
          (p.y - y) ** 2;


        if (distance < bestDistance) {

          bestDistance = distance;

          best = [q, r];

        }

      }

    }

  }


  /*
     If board is full,
     create another row.
  */

  if (!best) {

    grid.unshift(
      new Array(COLS).fill(-1)
    );

    best = [
      Math.floor(COLS / 2),
      0
    ];

  }


  return best;

}


/* =========================================================
   SHOOT
   ========================================================= */

function shoot() {

  if (
    gameBusy ||
    levelComplete
  ) {
    return;
  }


  gameBusy = true;


  const sx = W / 2;

  const sy = SHOOTER_Y;


  let dx =
    aim.x - sx;

  let dy =
    aim.y - sy;


  /*
     Prevent shooting downward.
  */

  if (dy > -40) {
    dy = -40;
  }


  const length =
    Math.hypot(dx, dy) || 1;


  const speed = 720;


  movingBubble = {

    x: sx,

    y: sy,

    vx:
      dx / length * speed,

    vy:
      dy / length * speed,

    color:
      shooterColor

  };


  shooterColor =
    nextColor;


  nextColor =
    randomColor();


  updateUI();

}


/* =========================================================
   UPDATE
   ========================================================= */

function update(dt) {

  updateMovingBubble(dt);

  updateFalling(dt);

  updateParticles(dt);

  updatePopAnimations(dt);

  updateFloatingTexts(dt);

}


/* ---------- MOVING ---------- */

function updateMovingBubble(dt) {

  if (!movingBubble) {
    return;
  }


  movingBubble.x +=
    movingBubble.vx * dt;


  movingBubble.y +=
    movingBubble.vy * dt;


  /*
     Wall bounce
  */

  if (
    movingBubble.x <= RADIUS
  ) {

    movingBubble.x = RADIUS;

    movingBubble.vx =
      Math.abs(movingBubble.vx);

  }


  if (
    movingBubble.x >= W - RADIUS
  ) {

    movingBubble.x =
      W - RADIUS;

    movingBubble.vx =
      -Math.abs(movingBubble.vx);

  }


  /*
     Ceiling collision
  */

  if (
    movingBubble.y <= TOP
  ) {

    attachBubble();

    return;

  }


  /*
     Bubble collision
  */

  for (
    let r = 0;
    r < grid.length;
    r++
  ) {

    for (
      let q = 0;
      q < COLS;
      q++
    ) {

      if (grid[r][q] < 0) {
        continue;
      }


      const p =
        cellPosition(q, r);


      const distance =
        Math.hypot(
          movingBubble.x - p.x,
          movingBubble.y - p.y
        );


      if (
        distance <=
        RADIUS * 1.85
      ) {

        attachBubble();

        return;

      }

    }

  }

}


/* =========================================================
   ATTACH
   ========================================================= */

function attachBubble() {

  if (!movingBubble) {
    return;
  }


  const [q, r] =
    findBestEmpty(
      movingBubble.x,
      movingBubble.y
    );


  const color =
    movingBubble.color;


  grid[r][q] =
    color;


  const p =
    cellPosition(q, r);


  /*
     Small impact effect
  */

  createBurst(
    p.x,
    p.y,
    color,
    8
  );


  movingBubble = null;


  const cluster =
    findCluster(q, r);


  if (cluster.length >= 3) {

    /*
       POP MATCH
    */

    popCluster(cluster);


    shotsWithoutPop = 0;


    const detached =
      collectDetached();


    const points =
      cluster.length * 20
      +
      detached * 40;


    save.score += points;


    if (
      detached > 0
    ) {

      save.score +=
        detached * 20;


      showMessage(
        "अहाँ कमाल कऽ देलियै! 😄"
      );

    }
    else if (
      cluster.length >= 6
    ) {

      showMessage(
        "गजब कऽ देलियै! 🎉"
      );

    }
    else {

      showMessage(
        "अरे वाह! 😄"
      );

    }


  }
  else {

    shotsWithoutPop++;


    save.score += 5;


    if (
      shotsWithoutPop >= 4
    ) {

      showMessage(
        "अगला निशाना सोच-समझकर! 😊"
      );

    }

  }


  save.best =
    Math.max(
      save.best,
      save.score
    );


  /*
     Check win
  */

  if (isBoardEmpty()) {

    finishLevel();

    return;

  }


  /*
     Prevent board getting
     too close to shooter.
  */

  if (lowestBubbleY() > SHOOTER_Y - 100) {

    addPenaltyRow();

  }


  saveGame();

  updateUI();

  gameBusy = false;

}


/* =========================================================
   POP
   ========================================================= */

function popCluster(cluster) {

  for (
    const [q, r] of cluster
  ) {

    const color =
      grid[r][q];


    const p =
      cellPosition(q, r);


    grid[r][q] = -1;


    popAnimations.push({

      x: p.x,

      y: p.y,

      color,

      scale: 1,

      alpha: 1,

      life: 0

    });


    createBurst(
      p.x,
      p.y,
      color,
      12
    );

  }

}


/* =========================================================
   FALLING UPDATE
   ========================================================= */

function updateFalling(dt) {

  for (
    let i = fallingBubbles.length - 1;
    i >= 0;
    i--
  ) {

    const b =
      fallingBubbles[i];


    if (
      b.delay > 0
    ) {

      b.delay -=
        dt * 1000;

      continue;

    }


    b.life += dt;


    b.vy +=
      780 * dt;


    b.x +=
      b.vx * 60 * dt;


    b.y +=
      b.vy * dt;


    b.rotation +=
      b.rotationSpeed;


    if (
      b.y > H + 60
    ) {

      fallingBubbles.splice(
        i,
        1
      );

    }

  }

}


/* =========================================================
   PARTICLES
   ========================================================= */

function createBurst(
  x,
  y,
  color,
  amount
) {

  for (
    let i = 0;
    i < amount;
    i++
  ) {

    const angle =
      Math.random()
      * Math.PI
      * 2;


    const speed =
      40 +
      Math.random() * 150;


    particles.push({

      x,

      y,

      vx:
        Math.cos(angle)
        * speed,

      vy:
        Math.sin(angle)
        * speed,

      color,

      size:
        2 +
        Math.random() * 4,

      life: 0,

      maxLife:
        .35 +
        Math.random() * .45

    });

  }

}


function updateParticles(dt) {

  for (
    let i = particles.length - 1;
    i >= 0;
    i--
  ) {

    const p =
      particles[i];


    p.life += dt;


    p.x +=
      p.vx * dt;


    p.y +=
      p.vy * dt;


    p.vy +=
      240 * dt;


    if (
      p.life >=
      p.maxLife
    ) {

      particles.splice(
        i,
        1
      );

    }

  }

}


/* =========================================================
   POP ANIMATION
   ========================================================= */

function updatePopAnimations(dt) {

  for (
    let i = popAnimations.length - 1;
    i >= 0;
    i--
  ) {

    const p =
      popAnimations[i];


    p.life += dt;


    p.scale +=
      dt * 3.5;


    p.alpha -=
      dt * 2.8;


    if (
      p.alpha <= 0
    ) {

      popAnimations.splice(
        i,
        1
      );

    }

  }

}


/* =========================================================
   FLOATING SCORE
   ========================================================= */

function updateFloatingTexts(dt) {

  for (
    let i = floatingTexts.length - 1;
    i >= 0;
    i--
  ) {

    const t =
      floatingTexts[i];


    t.life += dt;

    t.y -=
      35 * dt;

    t.alpha -=
      1.4 * dt;


    if (
      t.alpha <= 0
    ) {

      floatingTexts.splice(
        i,
        1
      );

    }

  }

}


/* =========================================================
   PENALTY ROW
   ========================================================= */

function addPenaltyRow() {

  const row =
    new Array(COLS)
      .fill(-1);


  for (
    let q = 0;
    q < COLS;
    q++
  ) {

    if (
      Math.random() < .72
    ) {

      row[q] =
        randomColor();

    }

  }


  grid.push(row);


  showMessage(
    "ओह! अब थोड़ा संभलकर निशाना लगाइए 😊"
  );

}


/* =========================================================
   WIN
   ========================================================= */

function finishLevel() {

  levelComplete = true;

  gameBusy = true;


  save.score += 250;


  save.best =
    Math.max(
      save.best,
      save.score
    );


  createCelebration();


  if (
    save.level >= MAX_LEVEL
  ) {

    showMessage(
      "🎉 गजब कऽ देलियै! सभी 50 स्तर पूरे!"
    );

  }
  else {

    showMessage(
      `🌸 स्तर ${save.level} पूरा! बहुत बढ़िया!`
    );

  }


  saveGame();

  updateUI();


  if (
    save.level < MAX_LEVEL
  ) {

    setTimeout(() => {

      save.level++;

      saveGame();

      createLevel();

    }, 1700);

  }

}


/* =========================================================
   CELEBRATION
   ========================================================= */

function createCelebration() {

  for (
    let i = 0;
    i < 70;
    i++
  ) {

    createBurst(
      W / 2,
      H / 2,
      randomColor(),
      1
    );

  }

}


/* =========================================================
   BOARD CHECK
   ========================================================= */

function isBoardEmpty() {

  for (
    const row of grid
  ) {

    for (
      const value of row
    ) {

      if (value >= 0) {
        return false;
      }

    }

  }


  return true;

}


function lowestBubbleY() {

  let lowest = 0;


  for (
    let r = 0;
    r < grid.length;
    r++
  ) {

    for (
      let q = 0;
      q < COLS;
      q++
    ) {

      if (
        grid[r][q] >= 0
      ) {

        lowest =
          Math.max(
            lowest,
            cellPosition(q, r).y
          );

      }

    }

  }


  return lowest;

}


/* =========================================================
   DRAW
   ========================================================= */

function draw() {

  ctx.clearRect(
    0,
    0,
    W,
    H
  );


  drawBackground();

  drawMithilaPattern();

  drawGrid();

  drawFallingBubbles();

  drawPopAnimations();

  drawParticles();

  drawFloatingTexts();

  drawShooter();

}


/* =========================================================
   BACKGROUND
   ========================================================= */

function drawBackground() {

  const gradient =
    ctx.createLinearGradient(
      0,
      0,
      0,
      H
    );


  gradient.addColorStop(
    0,
    "#fffdf9"
  );


  gradient.addColorStop(
    1,
    "#fff4e5"
  );


  ctx.fillStyle =
    gradient;


  ctx.fillRect(
    0,
    0,
    W,
    H
  );


  /*
     Soft decorative circles
  */

  ctx.save();

  ctx.globalAlpha =
    .08;

  ctx.strokeStyle =
    "#7650a8";

  ctx.lineWidth = 2;


  for (
    let y = 90;
    y < H - 100;
    y += 120
  ) {

    ctx.beginPath();

    ctx.arc(
      25,
      y,
      14,
      0,
      Math.PI * 2
    );

    ctx.stroke();


    ctx.beginPath();

    ctx.arc(
      W - 25,
      y + 35,
      14,
      0,
      Math.PI * 2
    );

    ctx.stroke();

  }


  ctx.restore();

}


/* =========================================================
   MITHILA PATTERN
   ========================================================= */

function drawMithilaPattern() {

  ctx.save();

  ctx.globalAlpha =
    .13;

  ctx.strokeStyle =
    "#7650a8";

  ctx.lineWidth = 2;


  /*
     Border
  */

  ctx.strokeRect(
    8,
    8,
    W - 16,
    H - 16
  );


  /*
     Top floral motifs
  */

  for (
    let x = 28;
    x < W - 20;
    x += 52
  ) {

    drawLotus(
      x,
      25,
      7
    );

  }


  /*
     Bottom decorative line
  */

  for (
    let x = 28;
    x < W - 20;
    x += 52
  ) {

    drawLotus(
      x,
      H - 25,
      7
    );

  }


  ctx.restore();

}


function drawLotus(
  x,
  y,
  size
) {

  ctx.beginPath();

  ctx.moveTo(
    x,
    y + size
  );


  ctx.quadraticCurveTo(
    x - size,
    y,
    x,
    y - size
  );


  ctx.quadraticCurveTo(
    x + size,
    y,
    x,
    y + size
  );


  ctx.stroke();

}


/* =========================================================
   GRID DRAW
   ========================================================= */

function drawGrid() {

  for (
    let r = 0;
    r < grid.length;
    r++
  ) {

    for (
      let q = 0;
      q < COLS;
      q++
    ) {

      if (
        grid[r][q] < 0
      ) {
        continue;
      }


      const p =
        cellPosition(q, r);


      drawBubble(
        p.x,
        p.y,
        grid[r][q]
      );

    }

  }

}


/* =========================================================
   BUBBLE DRAW
   ========================================================= */

function drawBubble(
  x,
  y,
  colorIndex,
  scale = 1,
  alpha = 1
) {

  const radius =
    RADIUS * scale;


  ctx.save();

  ctx.globalAlpha =
    alpha;


  /*
     Main bubble
  */

  const gradient =
    ctx.createRadialGradient(
      x - radius * .35,
      y - radius * .45,
      radius * .08,
      x,
      y,
      radius
    );


  gradient.addColorStop(
    0,
    "#ffffff"
  );


  gradient.addColorStop(
    .16,
    COLORS[colorIndex]
  );


  gradient.addColorStop(
    .72,
    COLORS[colorIndex]
  );


  gradient.addColorStop(
    1,
    darken(
      COLORS[colorIndex],
      .20
    )
  );


  ctx.fillStyle =
    gradient;


  ctx.beginPath();

  ctx.arc(
    x,
    y,
    radius,
    0,
    Math.PI * 2
  );

  ctx.fill();


  /*
     Gloss
  */

  ctx.fillStyle =
    "rgba(255,255,255,.42)";


  ctx.beginPath();

  ctx.ellipse(
    x - radius * .30,
    y - radius * .38,
    radius * .30,
    radius * .18,
    -.35,
    0,
    Math.PI * 2
  );

  ctx.fill();


  /*
     Outline
  */

  ctx.strokeStyle =
    "rgba(255,255,255,.65)";

  ctx.lineWidth =
    1.4;


  ctx.beginPath();

  ctx.arc(
    x,
    y,
    radius,
    0,
    Math.PI * 2
  );

  ctx.stroke();


  ctx.restore();

}


/* =========================================================
   FALLING DRAW
   ========================================================= */

function drawFallingBubbles() {

  for (
    const b of fallingBubbles
  ) {

    if (
      b.delay > 0
    ) {
      continue;
    }


    drawBubble(
      b.x,
      b.y,
      b.color,
      1,
      Math.max(
        0,
        1 - b.life * .35
      )
    );

  }

}


/* =========================================================
   POP DRAW
   ========================================================= */

function drawPopAnimations() {

  for (
    const p of popAnimations
  ) {

    drawBubble(
      p.x,
      p.y,
      p.color,
      p.scale,
      p.alpha
    );

  }

}


/* =========================================================
   PARTICLES DRAW
   ========================================================= */

function drawParticles() {

  for (
    const p of particles
  ) {

    const alpha =
      1 -
      p.life /
      p.maxLife;


    ctx.save();

    ctx.globalAlpha =
      Math.max(
        0,
        alpha
      );


    ctx.fillStyle =
      p.color;


    ctx.beginPath();

    ctx.arc(
      p.x,
      p.y,
      p.size,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.restore();

  }

}


/* =========================================================
   FLOATING TEXT
   ========================================================= */

function drawFloatingTexts() {

  for (
    const t of floatingTexts
  ) {

    ctx.save();

    ctx.globalAlpha =
      t.alpha;


    ctx.fillStyle =
      "#7650a8";


    ctx.font =
      "bold 22px system-ui";


    ctx.textAlign =
      "center";


    ctx.fillText(
      t.text,
      t.x,
      t.y
    );


    ctx.restore();

  }

}


/* =========================================================
   SHOOTER
   ========================================================= */

function drawShooter() {

  const sx =
    W / 2;

  const sy =
    SHOOTER_Y;


  /*
     Aim line
  */

  if (
    !movingBubble &&
    !gameBusy &&
    !levelComplete
  ) {

    let dx =
      aim.x - sx;

    let dy =
      aim.y - sy;


    if (
      dy > -40
    ) {

      dy = -40;

    }


    const length =
      Math.hypot(
        dx,
        dy
      ) || 1;


    const ux =
      dx / length;

    const uy =
      dy / length;


    ctx.save();

    ctx.setLineDash([
      8,
      9
    ]);

    ctx.strokeStyle =
      "rgba(80,65,55,.28)";

    ctx.lineWidth = 2;


    ctx.beginPath();

    ctx.moveTo(
      sx,
      sy
    );


    ctx.lineTo(
      sx + ux * 220,
      sy + uy * 220
    );


    ctx.stroke();

    ctx.restore();

  }


  /*
     Shooter base
  */

  ctx.save();

  ctx.fillStyle =
    "#7650a8";


  ctx.beginPath();

  ctx.arc(
    sx,
    sy + 17,
    29,
    0,
    Math.PI * 2
  );

  ctx.fill();


  ctx.restore();


  /*
     Current bubble
  */

  if (
    movingBubble
  ) {

    drawBubble(
      movingBubble.x,
      movingBubble.y,
      movingBubble.color
    );

  }
  else {

    drawBubble(
      sx,
      sy,
      shooterColor
    );

  }

}


/* =========================================================
   AIM INPUT
   ========================================================= */

function setAim(
  clientX,
  clientY
) {

  const rect =
    canvas.getBoundingClientRect();


  aim.x =
    (
      clientX -
      rect.left
    )
    *
    W /
    rect.width;


  aim.y =
    (
      clientY -
      rect.top
    )
    *
    H /
    rect.height;


  if (
    aim.y >
    SHOOTER_Y - 20
  ) {

    aim.y =
      SHOOTER_Y - 20;

  }


  draw();

}


/* =========================================================
   POINTER
   ========================================================= */

canvas.addEventListener(
  "pointermove",
  e => {

    setAim(
      e.clientX,
      e.clientY
    );

  }
);


canvas.addEventListener(
  "pointerdown",
  e => {

    e.preventDefault();


    setAim(
      e.clientX,
      e.clientY
    );


    shoot();

  }
);


/* =========================================================
   UI
   ========================================================= */

function updateUI() {

  levelText.textContent =
    save.level;


  scoreText.textContent =
    save.score;


  bestText.textContent =
    save.best;


  nextBubbleEl.style.background =
    COLORS[nextColor];


  soundBtn.textContent =
    save.sound
      ? "🔊 ध्वनि"
      : "🔇 म्यूट";

}


/* =========================================================
   MESSAGE
   ========================================================= */

function showMessage(text) {

  messageEl.textContent =
    text;

}


/* =========================================================
   SETTINGS
   ========================================================= */

settingsBtn.addEventListener(
  "click",
  () => {

    settingsPanel.classList.remove(
      "hidden"
    );

  }
);


closeSettingsBtn.addEventListener(
  "click",
  () => {

    settingsPanel.classList.add(
      "hidden"
    );

  }
);


resetProgressBtn.addEventListener(
  "click",
  () => {

    const confirmed =
      confirm(
        "क्या आप पूरी गेम प्रगति रीसेट करना चाहते हैं?"
      );


    if (!confirmed) {
      return;
    }


    save =
      defaultSave();


    saveGame();


    settingsPanel.classList.add(
      "hidden"
    );


    createLevel();

  }
);


/* =========================================================
   RESTART
   ========================================================= */

restartBtn.addEventListener(
  "click",
  () => {

    createLevel();

  }
);


/* =========================================================
   SOUND
   ========================================================= */

soundBtn.addEventListener(
  "click",
  () => {

    save.sound =
      !save.sound;


    saveGame();

    updateUI();

  }
);


/* =========================================================
   DARKEN COLOR
   ========================================================= */

function darken(
  hex,
  amount
) {

  const num =
    parseInt(
      hex.replace("#", ""),
      16
    );


  let r =
    (num >> 16) &
    255;


  let g =
    (num >> 8) &
    255;


  let b =
    num &
    255;


  r =
    Math.max(
      0,
      Math.floor(
        r * (1 - amount)
      )
    );


  g =
    Math.max(
      0,
      Math.floor(
        g * (1 - amount)
      )
    );


  b =
    Math.max(
      0,
      Math.floor(
        b * (1 - amount)
      )
    );


  return `rgb(${r},${g},${b})`;

}


/* =========================================================
   GAME LOOP
   ========================================================= */

function gameLoop(timestamp) {

  if (!lastTime) {
    lastTime = timestamp;
  }


  let dt =
    (timestamp - lastTime)
    / 1000;


  dt =
    Math.min(
      dt,
      .033
    );


  lastTime =
    timestamp;


  update(dt);

  draw();


  requestAnimationFrame(
    gameLoop
  );

}


/* =========================================================
   START
   ========================================================= */

createLevel();

requestAnimationFrame(
  gameLoop
);


})();
