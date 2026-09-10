/* ============================================================
   बुलबुले का खेल
   GAME ENGINE — V3
   Premium Mithila Bubble Shooter
   ============================================================ */

(() => {
  "use strict";

  /* ==========================================================
     DOM
     ========================================================== */

  const $ = (id) => document.getElementById(id);

  const homeScreen = $("homeScreen");
  const levelsScreen = $("levelsScreen");
  const gameScreen = $("gameScreen");

  const startBtn = $("startBtn");
  const homeLevelsBtn = $("homeLevelsBtn");
  const backHomeBtn = $("backHomeBtn");
  const gameBackBtn = $("gameBackBtn");

  const pauseBtn = $("pauseBtn");
  const resumeBtn = $("resumeBtn");
  const pauseRestartBtn = $("pauseRestartBtn");

  const soundBtn = $("soundBtn");

  const gameOverOverlay = $("gameOverOverlay");
  const gameOverRetryBtn = $("gameOverRetryBtn");
  const gameOverLevelsBtn = $("gameOverLevelsBtn");

  const levelCompleteOverlay = $("levelCompleteOverlay");
  const nextLevelBtn = $("nextLevelBtn");
  const completeLevelsBtn = $("completeLevelsBtn");

  const scoreValue = $("scoreValue");
  const levelNumber = $("levelNumber");

  const pressureDots = $("pressureDots");
  const pressureMessage = $("pressureMessage");

  const nextBubblePreview = $("nextBubblePreview");
  const nextBubbleSmall = $("nextBubbleSmall");

  const currentBubbleElement = $("currentBubble");

  const gameMessage = $("gameMessage");

  const pauseOverlay = $("pauseOverlay");

  const levelsGrid = $("levelsGrid");

  const canvas = $("gameCanvas");
  const ctx = canvas.getContext("2d");

  const dangerWarning = $("dangerWarning");
  const aimHint = $("aimHint");


  /* ==========================================================
     CANVAS
     ========================================================== */

  const W = 480;
  const H = 760;

  canvas.width = W;
  canvas.height = H;


  /* ==========================================================
     GAME CONSTANTS
     ========================================================== */

  const COLS = 11;

  const RADIUS = 20;

  const DIAMETER = RADIUS * 2;

  const ROW_HEIGHT = 35;

  const TOP_Y = 48;

  const SHOOTER_X = W / 2;

  const SHOOTER_Y = 690;

  const DANGER_Y = 590;

  const MAX_ROWS = 18;

  const MISS_LIMIT = 3;

  const COLORS = [
    "red",
    "yellow",
    "green",
    "blue",
    "purple",
    "pink"
  ];

  const COLOR_HEX = {
    red: {
      main: "#d95267",
      light: "#ffaaaa",
      dark: "#92243a"
    },

    yellow: {
      main: "#dfc653",
      light: "#fff2aa",
      dark: "#a18221"
    },

    green: {
      main: "#5caf79",
      light: "#bcebcf",
      dark: "#286145"
    },

    blue: {
      main: "#5991d1",
      light: "#b9dcff",
      dark: "#28548b"
    },

    purple: {
      main: "#9169c5",
      light: "#e0c8ff",
      dark: "#553185"
    },

    pink: {
      main: "#d8799b",
      light: "#ffd0df",
      dark: "#873c5d"
    }
  };


  /* ==========================================================
     GAME STATE
     ========================================================== */

  let currentLevel = 1;

  let score = 0;

  let bestScore = 0;

  let grid = [];

  let currentColor = null;

  let nextColor = null;

  let missedShots = 0;

  let isPaused = false;

  let gameOver = false;

  let levelComplete = false;

  let busy = false;

  let shooting = false;

  let lastTime = 0;

  let animationFrame = null;

  let particles = [];

  let fallingBubbles = [];

  let flyingBubble = null;

  let aimAngle = -Math.PI / 2;

  let audioContext = null;

  let soundEnabled = true;

  let descentAnimation = null;

  let screenShake = 0;

  let messageTimer = null;

  let saveData = loadSave();


  /* ==========================================================
     SAVE DATA
     ========================================================== */

  function loadSave() {

    const fallback = {
      currentLevel: 1,
      unlocked: 1,
      completed: [],
      bestScores: {},
      score: 0,
      sound: true
    };

    try {

      const raw = localStorage.getItem(
        "bulbuleKaKhelSave"
      );

      if (!raw) {
        return fallback;
      }

      const old = JSON.parse(raw);

      return {
        currentLevel:
          Number(old.currentLevel || old.level || 1),

        unlocked:
          Number(
            old.unlocked ||
            old.level ||
            old.currentLevel ||
            1
          ),

        completed:
          Array.isArray(old.completed)
            ? old.completed
            : [],

        bestScores:
          old.bestScores || {},

        score:
          Number(old.score || 0),

        sound:
          old.sound !== false
      };

    } catch (error) {

      return fallback;
    }
  }


  function saveGame() {

    try {

      localStorage.setItem(
        "bulbuleKaKhelSave",
        JSON.stringify(saveData)
      );

    } catch (error) {
      // Local storage may be disabled.
    }
  }


  /* ==========================================================
     LEVEL CONFIGURATION
     ========================================================== */

  function getLevelConfig(level) {

    const difficulty = Math.min(
      5,
      Math.floor((level - 1) / 10)
    );

    let rows = 6;

    if (level >= 11) rows = 7;
    if (level >= 21) rows = 8;
    if (level >= 31) rows = 9;
    if (level >= 41) rows = 10;

    let colors = 3;

    if (level >= 6) colors = 4;
    if (level >= 16) colors = 5;
    if (level >= 31) colors = 6;

    /*
      Average pressure remains 3 misses.

      Higher levels don't reduce the number of available
      shots. Instead, layouts become more strategic.
    */

    return {
      rows,
      colors,
      difficulty
    };
  }


  /* ==========================================================
     LEVEL GENERATION
     ========================================================== */

  function createLevel(level) {

    const config = getLevelConfig(level);

    grid = [];

    for (let r = 0; r < config.rows; r++) {

      const row = [];

      for (let q = 0; q < COLS; q++) {

        /*
          Keep some holes in later levels to create
          interesting shooting opportunities.
        */

        let filled = true;

        if (level >= 6 && r > 1) {

          const holeChance =
            Math.min(
              0.18,
              (level - 5) * 0.004
            );

          if (Math.random() < holeChance) {
            filled = false;
          }
        }

        if (!filled) {

          row.push(null);

          continue;
        }

        const available =
          COLORS.slice(0, config.colors);

        row.push(
          randomColor(available)
        );
      }

      grid.push(row);
    }


    /*
      Make the starting board fair.

      Avoid creating huge accidental matches
      before the player shoots.
    */

    removeInitialMatches();

    missedShots = 0;

    flyingBubble = null;

    fallingBubbles = [];

    particles = [];

    descentAnimation = null;

    gameOver = false;

    levelComplete = false;

    busy = false;

    shooting = false;

    screenShake = 0;

    currentColor =
      randomColor(
        COLORS.slice(0, config.colors)
      );

    nextColor =
      randomColor(
        COLORS.slice(0, config.colors)
      );

    updateUI();

    hideOverlay(gameOverOverlay);
    hideOverlay(levelCompleteOverlay);
    hideOverlay(pauseOverlay);

    showAimHint();

    showMessage(
      "बुलबुले मिलाइए"
    );
  }


  function removeInitialMatches() {

    for (let attempt = 0; attempt < 30; attempt++) {

      let changed = false;

      for (let r = 0; r < grid.length; r++) {

        for (let q = 0; q < COLS; q++) {

          const bubble = grid[r][q];

          if (!bubble) continue;

          const cluster =
            findCluster(q, r, bubble);

          if (cluster.length >= 3) {

            grid[r][q] =
              randomColor(
                COLORS.slice(
                  0,
                  getLevelConfig(currentLevel).colors
                )
              );

            changed = true;
          }
        }
      }

      if (!changed) break;
    }
  }


  /* ==========================================================
     RANDOM HELPERS
     ========================================================== */

  function randomColor(colors = COLORS) {

    return colors[
      Math.floor(
        Math.random() * colors.length
      )
    ];
  }


  function clamp(value, min, max) {

    return Math.max(
      min,
      Math.min(max, value)
    );
  }


  function lerp(a, b, t) {

    return a + (b - a) * t;
  }


  /* ==========================================================
     GRID GEOMETRY
     ========================================================== */

  function getX(q, r) {

    const offset =
      r % 2 === 1
        ? RADIUS
        : 0;

    return (
      RADIUS +
      q * DIAMETER +
      offset
    );
  }


  function getY(r) {

    return TOP_Y +
      r * ROW_HEIGHT;
  }


  function getPosition(q, r) {

    return {
      x: getX(q, r),
      y: getY(r)
    };
  }


  function getNeighbors(q, r) {

    const odd = r % 2 === 1;

    if (odd) {

      return [
        [q - 1, r],
        [q + 1, r],

        [q, r - 1],
        [q + 1, r - 1],

        [q, r + 1],
        [q + 1, r + 1]
      ];

    }

    return [
      [q - 1, r],
      [q + 1, r],

      [q - 1, r - 1],
      [q, r - 1],

      [q - 1, r + 1],
      [q, r + 1]
    ];
  }


  function isInside(q, r) {

    return (
      q >= 0 &&
      q < COLS &&
      r >= 0 &&
      r < MAX_ROWS
    );
  }


  /* ==========================================================
     CLUSTER SEARCH
     ========================================================== */

  function findCluster(startQ, startR, color) {

    if (
      !grid[startR] ||
      !grid[startR][startQ]
    ) {
      return [];
    }

    const visited = new Set();

    const queue = [
      [startQ, startR]
    ];

    const result = [];

    while (queue.length) {

      const [q, r] =
        queue.shift();

      const key = `${q},${r}`;

      if (visited.has(key)) {
        continue;
      }

      visited.add(key);

      if (
        !grid[r] ||
        !grid[r][q]
      ) {
        continue;
      }

      if (
        grid[r][q] !== color
      ) {
        continue;
      }

      result.push([q, r]);

      const neighbors =
        getNeighbors(q, r);

      for (const [nq, nr] of neighbors) {

        if (
          isInside(nq, nr) &&
          grid[nr] &&
          grid[nr][nq] &&
          grid[nr][nq] === color
        ) {
          queue.push([nq, nr]);
        }
      }
    }

    return result;
  }


  /* ==========================================================
     CEILING CONNECTIVITY
     ========================================================== */

  function findConnectedToCeiling() {

    const connected = new Set();

    const queue = [];

    for (let q = 0; q < COLS; q++) {

      if (
        grid[0] &&
        grid[0][q]
      ) {

        queue.push([
          q,
          0
        ]);
      }
    }


    while (queue.length) {

      const [q, r] =
        queue.shift();

      const key = `${q},${r}`;

      if (connected.has(key)) {
        continue;
      }

      if (
        !grid[r] ||
        !grid[r][q]
      ) {
        continue;
      }

      connected.add(key);

      for (
        const [nq, nr]
        of getNeighbors(q, r)
      ) {

        if (
          isInside(nq, nr) &&
          grid[nr] &&
          grid[nr][nq] &&
          !connected.has(
            `${nq},${nr}`
          )
        ) {

          queue.push([
            nq,
            nr
          ]);
        }
      }
    }

    return connected;
  }


  /* ==========================================================
     SHOOTING
     ========================================================== */

  function shoot() {

    if (
      busy ||
      shooting ||
      isPaused ||
      gameOver ||
      levelComplete ||
      descentAnimation
    ) {
      return;
    }

    initAudio();

    hideAimHint();

    shooting = true;

    const startX = SHOOTER_X;

    const startY = SHOOTER_Y - 30;

    const speed = 12;

    const dx =
      Math.cos(aimAngle) * speed;

    const dy =
      Math.sin(aimAngle) * speed;

    flyingBubble = {
      x: startX,
      y: startY,
      vx: dx,
      vy: dy,
      color: currentColor,
      radius: RADIUS
    };

    currentColor = nextColor;

    const config =
      getLevelConfig(currentLevel);

    nextColor =
      randomColor(
        COLORS.slice(0, config.colors)
      );

    updateNextBubble();

    tone(
      430,
      0.055,
      "sine",
      0.025
    );

    gameMessage.textContent =
      "बुलबुला चला...";
  }


  function updateFlyingBubble() {

    if (!flyingBubble) {
      return;
    }

    flyingBubble.x +=
      flyingBubble.vx;

    flyingBubble.y +=
      flyingBubble.vy;


    /*
      Wall bounce
    */

    if (
      flyingBubble.x <= RADIUS
    ) {

      flyingBubble.x = RADIUS;

      flyingBubble.vx =
        Math.abs(
          flyingBubble.vx
        );
    }

    if (
      flyingBubble.x >= W - RADIUS
    ) {

      flyingBubble.x =
        W - RADIUS;

      flyingBubble.vx =
        -Math.abs(
          flyingBubble.vx
        );
    }


    /*
      Ceiling collision
    */

    if (
      flyingBubble.y <=
      TOP_Y - RADIUS
    ) {

      attachFlyingBubble();

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

        if (!grid[r][q]) {
          continue;
        }

        const p =
          getPosition(q, r);

        const distance =
          Math.hypot(
            flyingBubble.x - p.x,
            flyingBubble.y - p.y
          );

        if (
          distance <=
          RADIUS * 2 - 2
        ) {

          attachFlyingBubble();

          return;
        }
      }
    }
  }


  /* ==========================================================
     ATTACH SHOT
     ========================================================== */

  function attachFlyingBubble() {

    if (!flyingBubble) {
      return;
    }

    const bubble =
      flyingBubble;

    flyingBubble = null;

    const cell =
      findBestEmptyCell(
        bubble.x,
        bubble.y
      );

    if (!cell) {

      shooting = false;

      return;
    }

    while (
      grid.length <= cell.r
    ) {

      grid.push(
        new Array(COLS).fill(null)
      );
    }

    grid[cell.r][cell.q] =
      bubble.color;


    /*
      Check for a match.
    */

    const cluster =
      findCluster(
        cell.q,
        cell.r,
        bubble.color
      );


    if (cluster.length >= 3) {

      handleMatch(
        cluster,
        cell
      );

    } else {

      handleMiss();
    }
  }


  /* ==========================================================
     BEST EMPTY CELL
     ========================================================== */

  function findBestEmptyCell(x, y) {

    let best = null;

    let bestDistance =
      Infinity;


    /*
      Search normal cells.
    */

    for (
      let r = 0;
      r < MAX_ROWS;
      r++
    ) {

      if (!grid[r]) {
        grid[r] =
          new Array(COLS).fill(null);
      }

      for (
        let q = 0;
        q < COLS;
        q++
      ) {

        if (grid[r][q]) {
          continue;
        }

        const p =
          getPosition(q, r);

        /*
          Only accept cells close enough
          to the incoming bubble.
        */

        const distance =
          Math.hypot(
            x - p.x,
            y - p.y
          );

        if (
          distance <
          RADIUS * 2.45
        ) {

          /*
            Prefer cells nearer to the
            actual shot position.
          */

          if (
            distance <
            bestDistance
          ) {

            bestDistance =
              distance;

            best = {
              q,
              r
            };
          }
        }
      }
    }


    /*
      If no adjacent cell is found,
      choose the nearest valid empty cell
      slightly above the collision point.
    */

    if (!best) {

      for (
        let r = 0;
        r < MAX_ROWS;
        r++
      ) {

        if (!grid[r]) {
          grid[r] =
            new Array(COLS).fill(null);
        }

        for (
          let q = 0;
          q < COLS;
          q++
        ) {

          if (grid[r][q]) {
            continue;
          }

          const p =
            getPosition(q, r);

          if (
            p.y >
            SHOOTER_Y - 180
          ) {
            continue;
          }

          const distance =
            Math.hypot(
              x - p.x,
              y - p.y
            );

          if (
            distance <
            bestDistance
          ) {

            bestDistance =
              distance;

            best = {
              q,
              r
            };
          }
        }
      }
    }

    return best;
  }


  /* ==========================================================
     MATCH HANDLING
     ========================================================== */

  function handleMatch(cluster, cell) {

    busy = true;

    missedShots = 0;

    updatePressureUI();

    const size =
      cluster.length;


    /*
      Score
    */

    const matchScore =
      size * 20;

    score += matchScore;


    /*
      Pop all matched bubbles.
    */

    for (
      const [q, r]
      of cluster
    ) {

      const p =
        getPosition(q, r);

      createPopParticles(
        p.x,
        p.y,
        grid[r][q]
      );

      grid[r][q] = null;
    }


    tone(
      620,
      0.09,
      "sine",
      0.035
    );


    /*
      Detached bubbles
    */

    const connected =
      findConnectedToCeiling();

    const detached = [];

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

        if (!grid[r][q]) {
          continue;
        }

        const key =
          `${q},${r}`;

        if (
          !connected.has(key)
        ) {

          detached.push({
            q,
            r,
            color:
              grid[r][q]
          });

          grid[r][q] = null;
        }
      }
    }


    if (detached.length) {

      const bonus =
        detached.length * 30;

      score += bonus;

      createFallingBubbles(
        detached
      );

      tone(
        270,
        0.12,
        "triangle",
        0.035
      );

      showMessage(
        detached.length >= 6
          ? "गजब कऽ देलियै! ✨"
          : detached.length >= 3
            ? "अहाँ कमाल कऽ देलियै!"
            : "बहुत नीक!"
      );

    } else {

      showMessage(
        size >= 6
          ? "गजब कऽ देलियै! ✨"
          : size >= 4
            ? "बहुत नीक!"
            : "अरे वाह! 😄"
      );
    }


    updateUI();


    /*
      Let pop/fall animation breathe.
    */

    setTimeout(() => {

      cleanupEmptyRows();

      if (
        checkLevelComplete()
      ) {

        finishLevel();

        return;
      }

      busy = false;

      shooting = false;

      showAimHint();

    }, detached.length ? 620 : 420);
  }


  /* ==========================================================
     MISSED SHOT / CEILING PRESSURE
     ========================================================== */

  function handleMiss() {

    missedShots++;

    updatePressureUI();


    /*
      EXACT PRESSURE RULE:
      3 consecutive misses = ceiling down.
    */

    if (
      missedShots >= MISS_LIMIT
    ) {

      missedShots = 0;

      updatePressureUI();

      showMessage(
        "बुलबुले थोड़ा नीचे आ रहे हैं..."
      );

      descendCeiling();

      return;
    }


    if (missedShots === 2) {

      showMessage(
        "ध्यान से... अगला निशाना सोचकर लगाइए।"
      );

    } else {

      showMessage(
        "कोई बात नहीं, अगला निशाना बेहतर होगा।"
      );
    }


    busy = false;

    shooting = false;

    showAimHint();
  }


  /* ==========================================================
     CEILING DESCENT
     ========================================================== */

  function descendCeiling() {

    if (
      descentAnimation ||
      gameOver ||
      levelComplete
    ) {
      return;
    }

    busy = true;

    shooting = false;

    hideAimHint();

    tone(
      190,
      0.16,
      "sawtooth",
      0.028
    );

    screenShake = 4;


    /*
      Add a fresh row at the top.

      Existing rows move down one row.
    */

    const config =
      getLevelConfig(currentLevel);

    const newRow =
      new Array(COLS).fill(null);


    for (
      let q = 0;
      q < COLS;
      q++
    ) {

      /*
        Keep the new ceiling reasonably open.
      */

      const fillChance =
        currentLevel <= 10
          ? 0.64
          : 0.70;

      if (
        Math.random() <
        fillChance
      ) {

        newRow[q] =
          randomColor(
            COLORS.slice(
              0,
              config.colors
            )
          );
      }
    }


    /*
      Make sure at least several bubbles
      exist in the new row.
    */

    if (
      newRow.filter(Boolean).length < 5
    ) {

      for (let i = 0; i < 5; i++) {

        const q =
          Math.floor(
            Math.random() * COLS
          );

        newRow[q] =
          randomColor(
            COLORS.slice(
              0,
              config.colors
            )
          );
      }
    }


    grid.unshift(newRow);


    /*
      Prevent unlimited invisible rows.
    */

    if (
      grid.length > MAX_ROWS
    ) {

      grid.pop();
    }


    descentAnimation = {
      start: performance.now(),
      duration: 520
    };


    /*
      Warning if board is approaching danger.
    */

    setDangerVisuals();


    setTimeout(() => {

      descentAnimation = null;

      screenShake = 0;

      setDangerVisuals();


      if (
        checkDanger()
      ) {

        triggerGameOver();

        return;
      }


      busy = false;

      shooting = false;

      showAimHint();

    }, 550);
  }


  /* ==========================================================
     DANGER CHECK
     ========================================================== */

  function checkDanger() {

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

        if (!grid[r][q]) {
          continue;
        }

        const p =
          getPosition(q, r);

        if (
          p.y + RADIUS >=
          DANGER_Y
        ) {

          return true;
        }
      }
    }

    return false;
  }


  function setDangerVisuals() {

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

        if (grid[r][q]) {

          lowest =
            Math.max(
              lowest,
              getY(r) + RADIUS
            );
        }
      }
    }


    const distance =
      DANGER_Y - lowest;


    if (
      distance < 85
    ) {

      dangerWarning.classList.add(
        "danger"
      );

      dangerWarning.classList.remove(
        "active"
      );

      pressureMessage.classList.add(
        "danger"
      );

      pressureMessage.classList.remove(
        "warning"
      );

    } else if (
      distance < 150
    ) {

      dangerWarning.classList.add(
        "active"
      );

      dangerWarning.classList.remove(
        "danger"
      );

      pressureMessage.classList.add(
        "warning"
      );

      pressureMessage.classList.remove(
        "danger"
      );

    } else {

      dangerWarning.classList.remove(
        "active",
        "danger"
      );

      pressureMessage.classList.remove(
        "warning",
        "danger"
      );
    }
  }


  /* ==========================================================
     CLEAN EMPTY ROWS
     ========================================================== */

  function cleanupEmptyRows() {

    /*
      Don't remove the first row.

      Only remove empty rows below it.
    */

    while (
      grid.length > 1 &&
      grid[grid.length - 1].every(
        (value) => value === null
      )
    ) {

      grid.pop();
    }
  }


  /* ==========================================================
     FALLING BUBBLES
     ========================================================== */

  function createFallingBubbles(detached) {

    detached.forEach(
      ({ q, r, color }, index) => {

        const p =
          getPosition(q, r);

        fallingBubbles.push({
          x: p.x,
          y: p.y,

          vx:
            (Math.random() - 0.5) *
            1.5,

          vy:
            1.5 +
            Math.random() * 1.8,

          rotation:
            Math.random() *
            Math.PI,

          rotationSpeed:
            (Math.random() - 0.5) *
            0.08,

          color,

          radius: RADIUS,

          delay:
            index * 24,

          age: 0,

          life:
            750 +
            Math.random() * 350
        });
      }
    );
  }


  function updateFallingBubbles(delta) {

    for (
      let i = fallingBubbles.length - 1;
      i >= 0;
      i--
    ) {

      const b =
        fallingBubbles[i];

      b.age += delta;

      if (
        b.age < b.delay
      ) {
        continue;
      }

      b.x += b.vx;

      b.y += b.vy;

      b.vy += 0.055;

      b.rotation +=
        b.rotationSpeed;

      if (
        b.age >
        b.delay + b.life
      ) {

        fallingBubbles.splice(
          i,
          1
        );
      }
    }
  }


  /* ==========================================================
     POP PARTICLES
     ========================================================== */

  function createPopParticles(
    x,
    y,
    color
  ) {

    for (
      let i = 0;
      i < 12;
      i++
    ) {

      const angle =
        Math.random() *
        Math.PI *
        2;

      const speed =
        1 +
        Math.random() * 3;

      particles.push({
        x,
        y,

        vx:
          Math.cos(angle) *
          speed,

        vy:
          Math.sin(angle) *
          speed,

        size:
          1.5 +
          Math.random() * 2.5,

        color,

        life: 450 +
          Math.random() * 250,

        age: 0
      });
    }
  }


  function updateParticles(delta) {

    for (
      let i = particles.length - 1;
      i >= 0;
      i--
    ) {

      const p =
        particles[i];

      p.age += delta;

      p.x += p.vx;

      p.y += p.vy;

      p.vx *= 0.98;

      p.vy *= 0.98;

      if (
        p.age >= p.life
      ) {

        particles.splice(
          i,
          1
        );
      }
    }
  }


  /* ==========================================================
     DRAWING
     ========================================================== */

  function draw() {

    ctx.save();


    /*
      Screen shake
    */

    if (screenShake > 0) {

      ctx.translate(
        (Math.random() - 0.5) *
          screenShake,
        (Math.random() - 0.5) *
          screenShake
      );
    }


    drawBoardBackground();

    drawMithilaDecor();

    drawDangerLine();

    drawGrid();

    drawFlyingBubble();

    drawFallingBubbles();

    drawParticles();

    drawAimGuide();

    drawShooterGlow();


    ctx.restore();
  }


  /* ==========================================================
     BOARD BACKGROUND
     ========================================================== */

  function drawBoardBackground() {

    const gradient =
      ctx.createLinearGradient(
        0,
        0,
        0,
        H
      );

    gradient.addColorStop(
      0,
      "#142e55"
    );

    gradient.addColorStop(
      0.5,
      "#102448"
    );

    gradient.addColorStop(
      1,
      "#0a1831"
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
      Soft central glow.
    */

    const glow =
      ctx.createRadialGradient(
        W / 2,
        180,
        30,
        W / 2,
        180,
        350
      );

    glow.addColorStop(
      0,
      "rgba(88, 137, 198, 0.13)"
    );

    glow.addColorStop(
      1,
      "rgba(88, 137, 198, 0)"
    );

    ctx.fillStyle =
      glow;

    ctx.fillRect(
      0,
      0,
      W,
      H
    );
  }


  /* ==========================================================
     MITHILA DECOR
     ========================================================== */

  function drawMithilaDecor() {

    ctx.save();

    ctx.globalAlpha = 0.075;

    ctx.strokeStyle =
      "#d8b878";

    ctx.lineWidth = 1;


    /*
      Top mandala
    */

    const cx = W / 2;
    const cy = 28;

    ctx.beginPath();

    ctx.arc(
      cx,
      cy,
      68,
      0,
      Math.PI * 2
    );

    ctx.stroke();


    ctx.beginPath();

    ctx.arc(
      cx,
      cy,
      48,
      0,
      Math.PI * 2
    );

    ctx.stroke();


    for (
      let i = 0;
      i < 12;
      i++
    ) {

      const a =
        (Math.PI * 2 * i) /
        12;

      const x1 =
        cx +
        Math.cos(a) * 48;

      const y1 =
        cy +
        Math.sin(a) * 48;

      const x2 =
        cx +
        Math.cos(a) * 68;

      const y2 =
        cy +
        Math.sin(a) * 68;

      ctx.beginPath();

      ctx.moveTo(
        x1,
        y1
      );

      ctx.lineTo(
        x2,
        y2
      );

      ctx.stroke();
    }


    /*
      Small floral motifs at sides.
    */

    drawFloralMotif(
      28,
      245,
      0.9
    );

    drawFloralMotif(
      W - 28,
      245,
      -0.9
    );

    drawFloralMotif(
      26,
      450,
      0.75
    );

    drawFloralMotif(
      W - 26,
      450,
      -0.75
    );


    ctx.restore();
  }


  function drawFloralMotif(
    x,
    y,
    direction
  ) {

    ctx.save();

    ctx.translate(
      x,
      y
    );

    ctx.rotate(
      direction
    );

    ctx.beginPath();

    ctx.moveTo(
      0,
      20
    );

    ctx.quadraticCurveTo(
      -8,
      0,
      0,
      -20
    );

    ctx.stroke();

    for (
      let i = 0;
      i < 5;
      i++
    ) {

      const a =
        (Math.PI * 2 * i) /
        5;

      ctx.beginPath();

      ctx.ellipse(
        Math.cos(a) * 10,
        Math.sin(a) * 10,
        5,
        11,
        a,
        0,
        Math.PI * 2
      );

      ctx.stroke();
    }

    ctx.restore();
  }


  /* ==========================================================
     DANGER LINE
     ========================================================== */

  function drawDangerLine() {

    const danger =
      DANGER_Y;

    const distance =
      getLowestBubbleDistance();


    if (
      distance < 150
    ) {

      const alpha =
        clamp(
          (150 - distance) /
            150,
          0.12,
          0.55
        );

      ctx.save();

      ctx.strokeStyle =
        distance < 85
          ? `rgba(233,137,137,${alpha})`
          : `rgba(216,184,120,${alpha})`;

      ctx.lineWidth = 1;

      ctx.setLineDash([
        5,
        7
      ]);

      ctx.beginPath();

      ctx.moveTo(
        25,
        danger
      );

      ctx.lineTo(
        W - 25,
        danger
      );

      ctx.stroke();

      ctx.restore();
    }
  }


  function getLowestBubbleDistance() {

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
          grid[r][q]
        ) {

          lowest =
            Math.max(
              lowest,
              getY(r) + RADIUS
            );
        }
      }
    }

    return DANGER_Y - lowest;
  }


  /* ==========================================================
     GRID DRAWING WITH DESCENT ANIMATION
     ========================================================== */

  function drawGrid() {

    const progress =
      descentAnimation
        ? clamp(
            (
              performance.now() -
              descentAnimation.start
            ) /
              descentAnimation.duration,
            0,
            1
          )
        : 1;


    const eased =
      1 -
      Math.pow(
        1 - progress,
        3
      );


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

        const color =
          grid[r][q];

        if (!color) {
          continue;
        }

        let p;


        if (
          descentAnimation
        ) {

          const from =
            getPosition(
              q,
              r - 1
            );

          const to =
            getPosition(
              q,
              r
            );

          p = {
            x:
              lerp(
                from.x,
                to.x,
                eased
              ),

            y:
              lerp(
                from.y,
                to.y,
                eased
              )
          };

        } else {

          p =
            getPosition(
              q,
              r
            );
        }


        drawBubble(
          p.x,
          p.y,
          color,
          RADIUS
        );
      }
    }
  }


  /* ==========================================================
     BUBBLE DRAW
     ========================================================== */

  function drawBubble(
    x,
    y,
    color,
    radius,
    alpha = 1
  ) {

    const c =
      COLOR_HEX[color] ||
      COLOR_HEX.blue;


    ctx.save();

    ctx.globalAlpha =
      alpha;


    /*
      Outer shadow
    */

    ctx.beginPath();

    ctx.arc(
      x + 1.5,
      y + 3,
      radius,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      "rgba(0,0,0,0.25)";

    ctx.fill();


    /*
      Main gradient
    */

    const gradient =
      ctx.createRadialGradient(
        x - radius * 0.32,
        y - radius * 0.36,
        radius * 0.08,
        x,
        y,
        radius
      );

    gradient.addColorStop(
      0,
      c.light
    );

    gradient.addColorStop(
      0.38,
      c.main
    );

    gradient.addColorStop(
      1,
      c.dark
    );


    ctx.beginPath();

    ctx.arc(
      x,
      y,
      radius,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      gradient;

    ctx.fill();


    /*
      Soft rim
    */

    ctx.beginPath();

    ctx.arc(
      x,
      y,
      radius - 0.8,
      0,
      Math.PI * 2
    );

    ctx.strokeStyle =
      "rgba(255,255,255,0.13)";

    ctx.lineWidth = 1;

    ctx.stroke();


    /*
      Gloss highlight
    */

    ctx.beginPath();

    ctx.ellipse(
      x - radius * 0.32,
      y - radius * 0.38,
      radius * 0.27,
      radius * 0.16,
      -0.45,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      "rgba(255,255,255,0.52)";

    ctx.fill();


    /*
      Tiny secondary reflection
    */

    ctx.beginPath();

    ctx.arc(
      x + radius * 0.3,
      y + radius * 0.25,
      radius * 0.07,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      "rgba(255,255,255,0.18)";

    ctx.fill();


    ctx.restore();
  }


  /* ==========================================================
     FLYING BUBBLE
     ========================================================== */

  function drawFlyingBubble() {

    if (!flyingBubble) {
      return;
    }

    drawBubble(
      flyingBubble.x,
      flyingBubble.y,
      flyingBubble.color,
      RADIUS
    );
  }


  /* ==========================================================
     FALLING BUBBLES DRAW
     ========================================================== */

  function drawFallingBubbles() {

    for (
      const b
      of fallingBubbles
    ) {

      if (
        b.age < b.delay
      ) {
        continue;
      }

      ctx.save();

      ctx.translate(
        b.x,
        b.y
      );

      ctx.rotate(
        b.rotation
      );

      drawBubble(
        0,
        0,
        b.color,
        b.radius
      );

      ctx.restore();
    }
  }


  /* ==========================================================
     PARTICLES DRAW
     ========================================================== */

  function drawParticles() {

    for (
      const p
      of particles
    ) {

      const alpha =
        1 -
        p.age /
          p.life;

      ctx.save();

      ctx.globalAlpha =
        clamp(
          alpha,
          0,
          1
        );

      ctx.fillStyle =
        COLOR_HEX[
          p.color
        ]?.light ||
        "#ffffff";

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


  /* ==========================================================
     AIM GUIDE
     ========================================================== */

  function drawAimGuide() {

    if (
      busy ||
      shooting ||
      gameOver ||
      levelComplete ||
      isPaused
    ) {
      return;
    }


    const startX =
      SHOOTER_X;

    const startY =
      SHOOTER_Y - 30;


    let x = startX;

    let y = startY;

    let vx =
      Math.cos(aimAngle);

    let vy =
      Math.sin(aimAngle);


    const length = 250;

    ctx.save();

    ctx.globalAlpha = 0.38;

    ctx.strokeStyle =
      "#b9d6f7";

    ctx.lineWidth = 2;

    ctx.setLineDash([
      5,
      8
    ]);

    ctx.beginPath();

    ctx.moveTo(
      x,
      y
    );


    for (
      let i = 0;
      i < 34;
      i++
    ) {

      x +=
        vx * 7;

      y +=
        vy * 7;


      if (
        x <= RADIUS ||
        x >= W - RADIUS
      ) {

        vx *= -1;
      }


      ctx.lineTo(
        x,
        y
      );


      if (
        Math.hypot(
          x - startX,
          y - startY
        ) > length
      ) {
        break;
      }
    }

    ctx.stroke();

    ctx.restore();
  }


  /* ==========================================================
     SHOOTER GLOW
     ========================================================== */

  function drawShooterGlow() {

    const gradient =
      ctx.createRadialGradient(
        SHOOTER_X,
        SHOOTER_Y - 30,
        4,
        SHOOTER_X,
        SHOOTER_Y - 30,
        65
      );

    gradient.addColorStop(
      0,
      "rgba(130,175,225,0.11)"
    );

    gradient.addColorStop(
      1,
      "rgba(130,175,225,0)"
    );

    ctx.fillStyle =
      gradient;

    ctx.beginPath();

    ctx.arc(
      SHOOTER_X,
      SHOOTER_Y - 30,
      65,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }


  /* ==========================================================
     AIM INPUT
     ========================================================== */

  function updateAim(clientX, clientY) {

    const rect =
      canvas.getBoundingClientRect();

    const x =
      (
        clientX -
        rect.left
      ) *
      (W / rect.width);

    const y =
      (
        clientY -
        rect.top
      ) *
      (H / rect.height);


    let dx =
      x - SHOOTER_X;

    let dy =
      y - (
        SHOOTER_Y - 30
      );


    /*
      Don't allow the shooter to aim
      below itself.
    */

    if (
      dy > -30
    ) {
      dy = -30;
    }


    /*
      Prevent almost-horizontal shots.
    */

    const angle =
      Math.atan2(
        dy,
        dx
      );

    const minAngle =
      -Math.PI + 0.22;

    const maxAngle =
      -0.22;


    aimAngle =
      clamp(
        angle,
        minAngle,
        maxAngle
      );
  }


  canvas.addEventListener(
    "pointermove",
    (event) => {

      if (
        isPaused ||
        gameOver ||
        levelComplete
      ) {
        return;
      }

      updateAim(
        event.clientX,
        event.clientY
      );
    }
  );


  canvas.addEventListener(
    "pointerdown",
    (event) => {

      if (
        isPaused ||
        gameOver ||
        levelComplete
      ) {
        return;
      }

      initAudio();

      updateAim(
        event.clientX,
        event.clientY
      );

      shoot();
    }
  );


  /* ==========================================================
     UI
     ========================================================== */

  function updateUI() {

    scoreValue.textContent =
      score.toLocaleString(
        "hi-IN"
      );

    levelNumber.textContent =
      currentLevel;

    updatePressureUI();

    updateNextBubble();

    updateCurrentBubble();

    setDangerVisuals();
  }


  function updateCurrentBubble() {

    if (!currentBubbleElement) {
      return;
    }

    const c =
      COLOR_HEX[
        currentColor
      ] || COLOR_HEX.blue;


    currentBubbleElement.style.background =
      `radial-gradient(
        circle at 30% 25%,
        ${c.light},
        ${c.main} 48%,
        ${c.dark}
      )`;
  }


  function updateNextBubble() {

    if (!nextColor) {
      return;
    }

    const c =
      COLOR_HEX[
        nextColor
      ] || COLOR_HEX.blue;


    const background =
      `radial-gradient(
        circle at 30% 25%,
        ${c.light},
        ${c.main} 48%,
        ${c.dark}
      )`;


    nextBubblePreview.style.background =
      background;

    nextBubbleSmall.style.background =
      background;
  }


  function updatePressureUI() {

    const dots =
      pressureDots.querySelectorAll(
        ".pressure-dot"
      );


    dots.forEach(
      (dot, index) => {

        dot.classList.remove(
          "active",
          "warning"
        );

        if (
          index <
          missedShots
        ) {

          dot.classList.add(
            missedShots >= 2
              ? "warning"
              : "active"
          );
        }
      }
    );


    if (
      missedShots === 0
    ) {

      pressureMessage.textContent =
        "ध्यान से निशाना लगाइए";

    } else if (
      missedShots === 1
    ) {

      pressureMessage.textContent =
        "एक निशाना चूक गया";

    } else {

      pressureMessage.textContent =
        "अगले चूके निशाने पर छत नीचे आएगी";
    }
  }


  function showMessage(
    message,
    duration = 1600
  ) {

    clearTimeout(
      messageTimer
    );

    gameMessage.textContent =
      message;

    messageTimer =
      setTimeout(() => {

        if (
          !gameOver &&
          !levelComplete
        ) {

          gameMessage.textContent =
            "बुलबुले मिलाइए";
        }

      }, duration);
  }


  function showAimHint() {

    if (
      aimHint
    ) {

      aimHint.classList.remove(
        "hidden"
      );
    }
  }


  function hideAimHint() {

    if (
      aimHint
    ) {

      aimHint.classList.add(
        "hidden"
      );
    }
  }


  /* ==========================================================
     LEVEL COMPLETE
     ========================================================== */

  function checkLevelComplete() {

    let count = 0;

    for (
      const row
      of grid
    ) {

      for (
        const bubble
        of row
      ) {

        if (bubble) {
          count++;
        }
      }
    }

    return count === 0;
  }


  function finishLevel() {

    levelComplete = true;

    busy = true;

    shooting = false;


    /*
      Save completed level.
    */

    if (
      !saveData.completed.includes(
        currentLevel
      )
    ) {

      saveData.completed.push(
        currentLevel
      );
    }


    /*
      Unlock next level.
    */

    saveData.unlocked =
      Math.max(
        saveData.unlocked,
        Math.min(
          50,
          currentLevel + 1
        )
      );


    /*
      Save best score.
    */

    const previousBest =
      Number(
        saveData.bestScores[
          currentLevel
        ] || 0
      );

    if (
      score >
      previousBest
    ) {

      saveData.bestScores[
        currentLevel
      ] = score;
    }


    saveData.score =
      score;

    saveData.currentLevel =
      currentLevel;

    saveGame();


    tone(
      760,
      0.16,
      "sine",
      0.04
    );


    setTimeout(() => {

      $("levelCompleteScore")
        .textContent =
          score.toLocaleString(
            "hi-IN"
          );

      showOverlay(
        levelCompleteOverlay
      );

    }, 500);
  }


  /* ==========================================================
     GAME OVER
     ========================================================== */

  function triggerGameOver() {

    if (gameOver) {
      return;
    }

    gameOver = true;

    busy = true;

    shooting = false;

    hideAimHint();

    screenShake = 5;

    tone(
      120,
      0.22,
      "triangle",
      0.04
    );


    setTimeout(() => {

      $("gameOverScore")
        .textContent =
          score.toLocaleString(
            "hi-IN"
          );

      showOverlay(
        gameOverOverlay
      );

    }, 250);
  }


  /* ==========================================================
     RESTART
     ========================================================== */

  function restartCurrentLevel() {

    hideOverlay(
      gameOverOverlay
    );

    hideOverlay(
      levelCompleteOverlay
    );

    hideOverlay(
      pauseOverlay
    );

    isPaused = false;

    createLevel(
      currentLevel
    );
  }


  /* ==========================================================
     PAUSE
     ========================================================== */

  function pauseGame() {

    if (
      gameOver ||
      levelComplete
    ) {
      return;
    }

    isPaused = true;

    showOverlay(
      pauseOverlay
    );
  }


  function resumeGame() {

    isPaused = false;

    hideOverlay(
      pauseOverlay
    );
  }


  /* ==========================================================
     OVERLAY HELPERS
     ========================================================== */

  function showOverlay(
    element
  ) {

    element.classList.remove(
      "hidden"
    );
  }


  function hideOverlay(
    element
  ) {

    element.classList.add(
      "hidden"
    );
  }


  /* ==========================================================
     NAVIGATION
     ========================================================== */

  function showScreen(
    screen
  ) {

    homeScreen.classList.remove(
      "active"
    );

    levelsScreen.classList.remove(
      "active"
    );

    gameScreen.classList.remove(
      "active"
    );

    screen.classList.add(
      "active"
    );
  }


  function openHome() {

    showScreen(
      homeScreen
    );

    isPaused = false;
  }


  function openLevels() {

    buildLevels();

    showScreen(
      levelsScreen
    );

    isPaused = false;
  }


  function openGame(
    level
  ) {

    currentLevel =
      clamp(
        Number(level) || 1,
        1,
        50
      );

    saveData.currentLevel =
      currentLevel;

    saveGame();

    /*
      Score remains cumulative during
      the current play session.
    */

    score =
      Number(
        saveData.score || 0
      );

    createLevel(
      currentLevel
    );

    showScreen(
      gameScreen
    );

    requestAnimationFrame(
      () => {

        resizeCanvasForDisplay();
      }
    );
  }


  /* ==========================================================
     LEVEL SELECT
     ========================================================== */

  function buildLevels() {

    levelsGrid.innerHTML = "";


    for (
      let i = 1;
      i <= 50;
      i++
    ) {

      const button =
        document.createElement(
          "button"
        );

      button.type =
        "button";

      button.className =
        "level-btn";


      const unlocked =
        i <=
        saveData.unlocked;

      const completed =
        saveData.completed.includes(
          i
        );


      if (!unlocked) {

        button.classList.add(
          "locked"
        );

        button.disabled =
          true;

        button.innerHTML =
          `${i}<br><small>🔒</small>`;

      } else {

        button.textContent =
          i;

        button.addEventListener(
          "click",
          () => {

            initAudio();

            openGame(i);
          }
        );
      }


      if (
        i ===
        saveData.currentLevel
      ) {

        button.classList.add(
          "current"
        );
      }


      if (completed) {

        button.classList.add(
          "completed"
        );
      }


      levelsGrid.appendChild(
        button
      );
    }
  }


  /* ==========================================================
     SOUND
     ========================================================== */

  function initAudio() {

    if (
      !soundEnabled
    ) {
      return;
    }

    try {

      if (!audioContext) {

        audioContext =
          new (
            window.AudioContext ||
            window.webkitAudioContext
          )();
      }

      if (
        audioContext.state ===
        "suspended"
      ) {

        audioContext.resume();
      }

    } catch (error) {
      // Audio unavailable.
    }
  }


  function tone(
    frequency,
    duration,
    type = "sine",
    volume = 0.03
  ) {

    if (
      !soundEnabled
    ) {
      return;
    }

    try {

      initAudio();

      if (!audioContext) {
        return;
      }

      const oscillator =
        audioContext.createOscillator();

      const gain =
        audioContext.createGain();


      oscillator.type =
        type;

      oscillator.frequency.value =
        frequency;


      gain.gain.setValueAtTime(
        0.0001,
        audioContext.currentTime
      );

      gain.gain.exponentialRampToValueAtTime(
        volume,
        audioContext.currentTime + 0.015
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        audioContext.currentTime +
          duration
      );


      oscillator.connect(
        gain
      );

      gain.connect(
        audioContext.destination
      );


      oscillator.start();

      oscillator.stop(
        audioContext.currentTime +
          duration +
          0.02
      );

    } catch (error) {
      // Ignore audio errors.
    }
  }


  function updateSoundButton() {

    soundBtn.textContent =
      soundEnabled
        ? "🔊"
        : "🔇";

    soundBtn.setAttribute(
      "aria-label",
      soundEnabled
        ? "ध्वनि बंद करें"
        : "ध्वनि चालू करें"
    );
  }


  /* ==========================================================
     CANVAS RESIZE
     ========================================================== */

  function resizeCanvasForDisplay() {

    /*
      CSS handles visual sizing.

      Keeping the internal canvas at 480x760
      preserves gameplay geometry.
    */

    if (
      canvas.width !== W
    ) {
      canvas.width = W;
    }

    if (
      canvas.height !== H
    ) {
      canvas.height = H;
    }
  }


  window.addEventListener(
    "resize",
    resizeCanvasForDisplay
  );


  /* ==========================================================
     GAME LOOP
     ========================================================== */

  function gameLoop(
    timestamp
  ) {

    const delta =
      Math.min(
        40,
        timestamp -
          (lastTime || timestamp)
      );

    lastTime =
      timestamp;


    if (
      !isPaused
    ) {

      if (
        flyingBubble
      ) {

        updateFlyingBubble();
      }

      updateParticles(
        delta
      );

      updateFallingBubbles(
        delta
      );


      if (
        screenShake > 0
      ) {

        screenShake *=
          0.91;

        if (
          screenShake < 0.2
        ) {

          screenShake = 0;
        }
      }
    }


    draw();


    animationFrame =
      requestAnimationFrame(
        gameLoop
      );
  }


  /* ==========================================================
     BUTTON EVENTS
     ========================================================== */

  startBtn.addEventListener(
    "click",
    () => {

      initAudio();

      openGame(
        saveData.currentLevel ||
        1
      );
    }
  );


  homeLevelsBtn.addEventListener(
    "click",
    () => {

      initAudio();

      openLevels();
    }
  );


  backHomeBtn.addEventListener(
    "click",
    () => {

      openHome();
    }
  );


  gameBackBtn.addEventListener(
    "click",
    () => {

      if (
        !gameOver &&
        !levelComplete
      ) {

        saveData.score =
          score;

        saveData.currentLevel =
          currentLevel;

        saveGame();
      }

      openLevels();
    }
  );


  pauseBtn.addEventListener(
    "click",
    () => {

      pauseGame();
    }
  );


  resumeBtn.addEventListener(
    "click",
    () => {

      resumeGame();
    }
  );


  pauseRestartBtn.addEventListener(
    "click",
    () => {

      restartCurrentLevel();
    }
  );


  soundBtn.addEventListener(
    "click",
    () => {

      soundEnabled =
        !soundEnabled;

      saveData.sound =
        soundEnabled;

      saveGame();

      updateSoundButton();

      if (
        soundEnabled
      ) {

        initAudio();

        tone(
          560,
          0.08,
          "sine",
          0.025
        );
      }
    }
  );


  gameOverRetryBtn.addEventListener(
    "click",
    () => {

      restartCurrentLevel();
    }
  );


  gameOverLevelsBtn.addEventListener(
    "click",
    () => {

      hideOverlay(
        gameOverOverlay
      );

      openLevels();
    }
  );


  nextLevelBtn.addEventListener(
    "click",
    () => {

      hideOverlay(
        levelCompleteOverlay
      );

      if (
        currentLevel < 50
      ) {

        openGame(
          currentLevel + 1
        );

      } else {

        openLevels();
      }
    }
  );


  completeLevelsBtn.addEventListener(
    "click",
    () => {

      hideOverlay(
        levelCompleteOverlay
      );

      openLevels();
    }
  );


  /* ==========================================================
     KEYBOARD SUPPORT
     ========================================================== */

  window.addEventListener(
    "keydown",
    (event) => {

      if (
        !gameScreen.classList.contains(
          "active"
        )
      ) {
        return;
      }


      if (
        event.key ===
        "Escape"
      ) {

        if (
          isPaused
        ) {

          resumeGame();

        } else {

          pauseGame();
        }
      }


      if (
        event.key ===
        " "
      ) {

        event.preventDefault();

        shoot();
      }


      if (
        event.key ===
        "ArrowLeft"
      ) {

        aimAngle -=
          0.06;

        aimAngle =
          clamp(
            aimAngle,
            -Math.PI + 0.22,
            -0.22
          );
      }


      if (
        event.key ===
        "ArrowRight"
      ) {

        aimAngle +=
          0.06;

        aimAngle =
          clamp(
            aimAngle,
            -Math.PI + 0.22,
            -0.22
          );
      }
    }
  );


  /* ==========================================================
     INITIALIZATION
     ========================================================== */

  soundEnabled =
    saveData.sound !== false;

  updateSoundButton();

  score =
    Number(
      saveData.score || 0
    );

  currentLevel =
    clamp(
      Number(
        saveData.currentLevel ||
        1
      ),
      1,
      50
    );

  /*
    Generate level only when game opens.
  */

  buildLevels();

  showScreen(
    homeScreen
  );

  resizeCanvasForDisplay();

  animationFrame =
    requestAnimationFrame(
      gameLoop
    );

})();
