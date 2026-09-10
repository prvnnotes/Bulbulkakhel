/* ============================================================
   BULBULE KA KHEL
   PREMIUM MITHILA BUBBLE SHOOTER
   COMPLETE GAME ENGINE
   ============================================================ */

(() => {

  "use strict";

  /* ==========================================================
     DOM
  ========================================================== */

  const $ = id => document.getElementById(id);

  const homeScreen = $("homeScreen");
  const levelsScreen = $("levelsScreen");
  const gameScreen = $("gameScreen");

  const startBtn = $("startBtn");
  const homeLevelsBtn = $("homeLevelsBtn");
  const backHomeBtn = $("backHomeBtn");
  const gameBackBtn = $("gameBackBtn");

  const soundBtn = $("soundBtn");
  const settingsBtn = $("settingsBtn");

  const settingsPanel = $("settingsPanel");
  const resetProgressBtn = $("resetProgressBtn");
  const closeSettingsBtn = $("closeSettingsBtn");

  const resultPanel = $("resultPanel");
  const resultIcon = $("resultIcon");
  const resultTitle = $("resultTitle");
  const resultText = $("resultText");
  const resultScore = $("resultScore");
  const resultPrimaryBtn = $("resultPrimaryBtn");
  const resultSecondaryBtn = $("resultSecondaryBtn");

  const levelsGrid = $("levelsGrid");

  const canvas = $("gameCanvas");
  const ctx = canvas.getContext("2d");

  const levelNumber = $("levelNumber");
  const scoreText = $("scoreText");
  const bestText = $("bestText");

  const pressureDots = $("pressureDots");

  const currentBubble = $("currentBubble");
  const nextBubble = $("nextBubble");

  const message = $("message");


  /* ==========================================================
     CANVAS
  ========================================================== */

  const W = 480;
  const H = 760;

  canvas.width = W;
  canvas.height = H;


  /* ==========================================================
     GAME SETTINGS
  ========================================================== */

  const COLS = 11;

  const RADIUS = 20;
  const DIAMETER = 40;

  const ROW_HEIGHT = 35;

  const TOP_Y = 48;

  const SHOOTER_X = W / 2;
  const SHOOTER_Y = 690;

  const DANGER_Y = 590;

  const MAX_LEVEL = 50;

  const MISS_LIMIT = 3;

  const MAX_SPECIALS_PER_LEVEL = 2;


  /* ==========================================================
     NORMAL BUBBLE COLORS
  ========================================================== */

  const COLORS = [

    {
      name: "red",
      main: "#dc5267",
      light: "#ffb6bd",
      dark: "#86283d",
      pattern: "lotus"
    },

    {
      name: "yellow",
      main: "#ddc34e",
      light: "#fff2a7",
      dark: "#94751c",
      pattern: "sun"
    },

    {
      name: "green",
      main: "#59aa76",
      light: "#c2efd0",
      dark: "#275e43",
      pattern: "leaf"
    },

    {
      name: "blue",
      main: "#5791d0",
      light: "#c5e1ff",
      dark: "#28588f",
      pattern: "wave"
    },

    {
      name: "purple",
      main: "#9569c3",
      light: "#e0c8ff",
      dark: "#553080",
      pattern: "peacock"
    },

    {
      name: "pink",
      main: "#d57698",
      light: "#ffd4e1",
      dark: "#873d5b",
      pattern: "flower"
    }

  ];


  /* ==========================================================
     SPECIAL BUBBLES
  ========================================================== */

  const SPECIAL = {

    laser: {
      name: "laser",
      icon: "⚡"
    },

    bomb: {
      name: "bomb",
      icon: "💣"
    },

    rainbow: {
      name: "rainbow",
      icon: "🌈"
    },

    sun: {
      name: "sun",
      icon: "☀"
    }

  };


  /* ==========================================================
     SAVE
  ========================================================== */

  const SAVE_KEY =
    "bulbuleKaKhelSave";


  let save = loadSave();


  function loadSave() {

    const fallback = {

      currentLevel: 1,

      unlocked: 1,

      completed: [],

      bestScores: {},

      score: 0,

      best: 0,

      sound: true

    };


    try {

      const raw =
        localStorage.getItem(SAVE_KEY);


      if (!raw)
        return fallback;


      const data =
        JSON.parse(raw);


      return {

        ...fallback,

        ...data,

        currentLevel:
          Number(data.currentLevel || 1),

        unlocked:
          Math.max(
            1,
            Number(data.unlocked || 1)
          ),

        completed:
          Array.isArray(data.completed)
            ? data.completed
            : [],

        bestScores:
          data.bestScores || {},

        score:
          Number(data.score || 0),

        best:
          Number(data.best || 0),

        sound:
          data.sound !== false

      };

    } catch {

      return fallback;

    }

  }


  function saveGame() {

    try {

      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify(save)
      );

    } catch {}

  }


  /* ==========================================================
     GAME STATE
  ========================================================== */

  let grid = [];

  let currentColor = 0;
  let nextColor = 1;

  let score = 0;

  let missedShots = 0;

  let busy = false;

  let paused = false;

  let gameEnded = false;

  let levelWon = false;

  let movingBubble = null;

  let fallingBubbles = [];

  let particles = [];

  let popEffects = [];

  let rings = [];

  let specialBursts = [];

  let aimX = W / 2;
  let aimY = 280;

  let lastTime = 0;

  let audioContext = null;

  let launcherRecoil = 0;

  let launcherBounce = 0;

  let shake = 0;

  let ceilingAnimation = null;

  let specialCount = 0;

  let currentSpecial = null;
  let nextSpecial = null;


  /* ==========================================================
     LEVEL CONFIG
  ========================================================== */

  function levelConfig() {

    const level =
      save.currentLevel;


    let rows = 6;

    if (level >= 11) rows = 7;
    if (level >= 21) rows = 8;
    if (level >= 31) rows = 9;
    if (level >= 41) rows = 10;


    let colors = 3;

    if (level >= 7) colors = 4;
    if (level >= 17) colors = 5;
    if (level >= 31) colors = 6;


    return {
      rows,
      colors
    };

  }


  function randomColor() {

    const count =
      levelConfig().colors;


    return Math.floor(
      Math.random() * count
    );

  }


  /* ==========================================================
     SPECIAL GENERATION
  ========================================================== */

  function chooseSpecial() {

    const level =
      save.currentLevel;


    /*
      Specials start appearing from level 4.
      Maximum two per level.
    */

    if (level < 4)
      return null;


    if (
      specialCount >=
      MAX_SPECIALS_PER_LEVEL
    )
      return null;


    /*
      Roughly 5% chance when a bubble
      is generated.
    */

    if (
      Math.random() > 0.055
    )
      return null;


    specialCount++;


    const roll =
      Math.random();


    if (roll < 0.38)
      return "laser";


    if (roll < 0.70)
      return "bomb";


    if (roll < 0.92)
      return "rainbow";


    return "sun";

  }


  function makeBubble() {

    const special =
      chooseSpecial();


    return {

      color:
        randomColor(),

      special

    };

  }


  /* ==========================================================
     LEVEL CREATION
  ========================================================== */

  function createLevel() {

    const config =
      levelConfig();


    grid = [];

    specialCount = 0;


    for (
      let r = 0;
      r < config.rows;
      r++
    ) {

      const row = [];


      for (
        let q = 0;
        q < COLS;
        q++
      ) {

        let empty = false;


        if (
          r > 1 &&
          levelConfig().colors >= 4
        ) {

          const chance =
            Math.min(
              0.12,
              (save.currentLevel - 5)
              * 0.003
            );


          if (
            Math.random() <
            chance
          ) {

            empty = true;

          }

        }


        if (empty) {

          row.push(null);

        } else {

          row.push(
            makeBubble()
          );

        }

      }


      grid.push(row);

    }


    /*
      Keep first row populated.
    */

    for (
      let q = 0;
      q < COLS;
      q++
    ) {

      if (!grid[0][q]) {

        grid[0][q] =
          makeBubble();

      }

    }


    removeStartingMatches();


    currentColor =
      randomColor();


    nextColor =
      randomColor();


    currentSpecial = null;
    nextSpecial = null;


    score = 0;

    missedShots = 0;

    busy = false;

    paused = false;

    gameEnded = false;

    levelWon = false;

    movingBubble = null;

    fallingBubbles = [];

    particles = [];

    popEffects = [];

    rings = [];

    specialBursts = [];

    ceilingAnimation = null;

    launcherRecoil = 0;

    launcherBounce = 0;

    shake = 0;


    updateUI();


    showMessage(
      "निशाना लगाइए और बुलबुला छोड़िए"
    );

  }


  /* ==========================================================
     REMOVE STARTING MATCHES
  ========================================================== */

  function removeStartingMatches() {

    for (
      let attempt = 0;
      attempt < 15;
      attempt++
    ) {

      let changed = false;


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

          const bubble =
            grid[r][q];


          if (!bubble)
            continue;


          /*
            Specials do not count as
            normal matching colours.
          */

          if (bubble.special)
            continue;


          const group =
            findCluster(
              q,
              r,
              bubble.color
            );


          if (
            group.length >= 3
          ) {

            const cell =
              group[
                Math.floor(
                  Math.random() *
                  group.length
                )
              ];


            grid[cell[1]][cell[0]] =
              {
                color:
                  randomColor(),

                special: null
              };


            changed = true;

          }

        }

      }


      if (!changed)
        break;

    }

  }


  /* ==========================================================
     GRID GEOMETRY
  ========================================================== */

  function getX(q, r) {

    const offset =
      r % 2
        ? RADIUS
        : 0;


    return (
      RADIUS +
      q * DIAMETER +
      offset
    );

  }


  function getY(r) {

    return (
      TOP_Y +
      r * ROW_HEIGHT
    );

  }


  function getPosition(q, r) {

    return {

      x:
        getX(q, r),

      y:
        getY(r)

    };

  }


  function inside(q, r) {

    return (
      q >= 0 &&
      q < COLS &&
      r >= 0 &&
      r < grid.length
    );

  }


  function getNeighbors(q, r) {

    const odd =
      r % 2 === 1;


    const directions =
      odd

        ? [

            [-1, 0],
            [1, 0],

            [0, -1],
            [1, -1],

            [0, 1],
            [1, 1]

          ]

        : [

            [-1, 0],
            [1, 0],

            [-1, -1],
            [0, -1],

            [-1, 1],
            [0, 1]

          ];


    return directions

      .filter(
        ([dq, dr]) =>
          inside(
            q + dq,
            r + dr
          )
      )

      .map(
        ([dq, dr]) => [
          q + dq,
          r + dr
        ]
      );

  }


  /* ==========================================================
     FIND MATCHING CLUSTER
  ========================================================== */

  function findCluster(
    startQ,
    startR,
    color
  ) {

    if (
      !inside(
        startQ,
        startR
      )
    ) {

      return [];

    }


    const start =
      grid[startR][startQ];


    if (
      !start ||
      start.special ||
      start.color !== color
    ) {

      return [];

    }


    const result = [];

    const visited = new Set();

    const stack = [
      [startQ, startR]
    ];


    while (stack.length) {

      const [
        q,
        r
      ] =
        stack.pop();


      const key =
        `${q},${r}`;


      if (
        visited.has(key)
      )
        continue;


      visited.add(key);


      const bubble =
        grid[r]?.[q];


      if (
        !bubble ||
        bubble.special ||
        bubble.color !== color
      )
        continue;


      result.push([
        q,
        r
      ]);


      for (
        const [
          nq,
          nr
        ]
        of getNeighbors(q, r)
      ) {

        stack.push([
          nq,
          nr
        ]);

      }

    }


    return result;

  }


  /* ==========================================================
     CEILING CONNECTION
  ========================================================== */

  function connectedToCeiling() {

    const connected =
      new Set();


    const stack = [];


    for (
      let q = 0;
      q < COLS;
      q++
    ) {

      if (
        grid[0]?.[q]
      ) {

        const key =
          `${q},0`;


        connected.add(key);


        stack.push([
          q,
          0
        ]);

      }

    }


    while (stack.length) {

      const [
        q,
        r
      ] =
        stack.pop();


      for (
        const [
          nq,
          nr
        ]
        of getNeighbors(q, r)
      ) {

        if (
          !grid[nr]?.[nq]
        )
          continue;


        const key =
          `${nq},${nr}`;


        if (
          !connected.has(key)
        ) {

          connected.add(key);


          stack.push([
            nq,
            nr
          ]);

        }

      }

    }


    return connected;

  }


  /* ==========================================================
     DROP DETACHED BUBBLES
  ========================================================== */

  function dropDetached() {

    const connected =
      connectedToCeiling();


    let count = 0;


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

        const bubble =
          grid[r][q];


        if (!bubble)
          continue;


        const key =
          `${q},${r}`;


        if (
          connected.has(key)
        )
          continue;


        const p =
          getPosition(q, r);


        fallingBubbles.push({

          x:
            p.x,

          y:
            p.y,

          color:
            bubble.color,

          special:
            bubble.special,

          vx:
            (Math.random() - .5)
            * 130,

          vy:
            -80 -
            Math.random() * 100,

          rotation:
            Math.random() *
            Math.PI * 2,

          spin:
            (Math.random() - .5)
            * 6,

          scale:
            .92 +
            Math.random() * .10,

          life: 0,

          delay:
            Math.random() * .12,

          bounced: false

        });


        grid[r][q] =
          null;


        count++;

      }

    }


    if (count > 0) {

      shake =
        Math.min(
          8,
          shake +
          count * .3
        );


      showMessage(
        `${count} बुलबुले नीचे गिरे! ✨`
      );


      playSound(
        180,
        .18,
        "triangle",
        .035
      );

    }


    return count;

  }


  /* ==========================================================
     FIND ATTACHMENT CELL
  ========================================================== */

  function findAttachment(x, y) {

    let best = null;

    let bestDistance =
      Infinity;


    /*
      First find the closest empty
      grid position.
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

        if (
          grid[r][q]
        )
          continue;


        const p =
          getPosition(q, r);


        const d =
          Math.hypot(
            p.x - x,
            p.y - y
          );


        if (
          d < bestDistance
        ) {

          bestDistance = d;

          best = [
            q,
            r
          ];

        }

      }

    }


    /*
      If bubble reaches the lower part
      and no empty position is found,
      create a new row.
    */

    if (!best) {

      grid.push(
        new Array(COLS)
          .fill(null)
      );


      best = [

        Math.floor(
          COLS / 2
        ),

        grid.length - 1

      ];

    }


    return best;

  }


  /* ==========================================================
     SHOOT
  ========================================================== */

  function shoot() {

    if (
      busy ||
      paused ||
      gameEnded ||
      levelWon ||
      ceilingAnimation
    )
      return;


    initAudio();


    busy = true;


    launcherRecoil = 1;
    launcherBounce = 1;


    let dx =
      aimX -
      SHOOTER_X;


    let dy =
      aimY -
      SHOOTER_Y;


    if (
      dy > -55
    ) {

      dy = -55;

    }


    const distance =
      Math.hypot(
        dx,
        dy
      ) || 1;


    const speed = 760;


    movingBubble = {

      x:
        SHOOTER_X,

      y:
        SHOOTER_Y - 3,

      vx:
        dx / distance *
        speed,

      vy:
        dy / distance *
        speed,

      color:
        currentColor,

      special:
        currentSpecial,

      scale:
        .82,

      trail: []

    };


    /*
      Next bubble becomes current.
    */

    currentColor =
      nextColor;


    currentSpecial =
      nextSpecial;


    /*
      New next bubble.
    */

    nextColor =
      randomColor();


    /*
      Special bubbles are rare.
      Maximum 2 per level.
    */

    if (
      specialCount <
      MAX_SPECIALS_PER_LEVEL
    ) {

      nextSpecial =
        chooseSpecial();

    } else {

      nextSpecial =
        null;

    }


    updateUI();


    playSound(
      330,
      .06,
      "sine",
      .025
    );

  }


  /* ==========================================================
     ATTACH MOVING BUBBLE
  ========================================================== */

  function attachMovingBubble() {

    if (!movingBubble)
      return;


    const b =
      movingBubble;


    const [
      q,
      r
    ] =
      findAttachment(
        b.x,
        b.y
      );


    const bubble = {

      color:
        b.color,

      special:
        b.special || null

    };


    grid[r][q] =
      bubble;


    const p =
      getPosition(q, r);


    movingBubble =
      null;


    /*
      Special bubble gets immediate activation.
    */

    if (
      bubble.special
    ) {

      activateSpecial(
        q,
        r,
        bubble.special
      );


      return;

    }


    rings.push({

      x:
        p.x,

      y:
        p.y,

      life: 0,

      max: .32,

      color:
        bubble.color

    });


    createParticles(
      p.x,
      p.y,
      bubble.color,
      8
    );


    const group =
      findCluster(
        q,
        r,
        bubble.color
      );


    if (
      group.length >= 3
    ) {

      handleMatch(
        group
      );

    } else {

      missedShots++;


      if (
        missedShots >=
        MISS_LIMIT
      ) {

        missedShots = 0;

        descendCeiling();

      } else {

        showMessage(

          missedShots === 1

            ? "अच्छा निशाना! रंग मिलाइए"

            : "बस एक मौका और… छत संभालिए!"

        );

      }


      busy = false;

    }


    updateUI();


    if (
      isBoardEmpty()
    ) {

      completeLevel();

    }

  }


  /* ==========================================================
     NORMAL MATCH
  ========================================================== */

  function handleMatch(group) {

    missedShots = 0;


    const color =
      grid[
        group[0][1]
      ][
        group[0][0]
      ].color;


    for (
      const [
        q,
        r
      ]
      of group
    ) {

      const bubble =
        grid[r][q];


      if (!bubble)
        continue;


      const p =
        getPosition(q, r);


      grid[r][q] =
        null;


      popEffects.push({

        x:
          p.x,

        y:
          p.y,

        color:
          bubble.color,

        special:
          null,

        life: 0,

        max: .38,

        delay:
          Math.random() * .07

      });


      createParticles(
        p.x,
        p.y,
        bubble.color,
        12
      );

    }


    score +=
      group.length *
      20;


    playSound(
      480 +
      group.length * 28,
      .13,
      "sine",
      .045
    );


    shake =
      Math.min(
        8,
        2 +
        group.length * .4
      );


    if (
      group.length >= 6
    ) {

      showMessage(
        "वाह! शानदार कॉम्बो! ✨"
      );

    }
    else if (
      group.length >= 4
    ) {

      showMessage(
        "बहुत बढ़िया! 🎉"
      );

    }
    else {

      showMessage(
        "मिल गया! 😄"
      );

    }


    setTimeout(
      () => {

        if (
          gameEnded ||
          levelWon
        )
          return;


        const dropped =
          dropDetached();


        if (dropped) {

          score +=
            dropped *
            45;

        }


        updateUI();

        saveGame();


        if (
          isBoardEmpty()
        ) {

          completeLevel();

        } else {

          busy = false;

        }

      },

      170

    );

  }


  /* ==========================================================
     SPECIAL ACTIVATION
  ========================================================== */

  function activateSpecial(
    q,
    r,
    type
  ) {

    const p =
      getPosition(q, r);


    /*
      Remove special bubble first.
    */

    grid[r][q] =
      null;


    specialBursts.push({

      x:
        p.x,

      y:
        p.y,

      type,

      life: 0,

      max:
        type === "bomb"
          ? .75
          : .65

    });


    shake =
      type === "bomb"
        ? 12
        : 7;


    missedShots = 0;


    if (type === "laser") {

      activateLaser(
        q,
        r
      );

    }


    else if (type === "bomb") {

      activateBomb(
        q,
        r
      );

    }


    else if (type === "rainbow") {

      activateRainbow(
        q,
        r
      );

    }


    else if (type === "sun") {

      activateSun(
        q,
        r
      );

    }


    updateUI();

  }


  /* ==========================================================
     LASER
  ========================================================== */

  function activateLaser(
    q,
    r
  ) {

    showMessage(
      "⚡ लेज़र बबल!"
    );


    playSound(
      700,
      .12,
      "square",
      .04
    );


    const p =
      getPosition(q, r);


    /*
      Pick the longest straight-ish
      direction based on board.
    */

    const direction =
      Math.random() < .5
        ? "vertical"
        : "horizontal";


    let removed = 0;


    if (
      direction ===
      "horizontal"
    ) {

      for (
        let x = 0;
        x < COLS;
        x++
      ) {

        if (
          grid[r]?.[x]
        ) {

          popGridBubble(
            x,
            r
          );

          removed++;

        }

      }

    }


    else {

      for (
        let y = 0;
        y < grid.length;
        y++
      ) {

        if (
          grid[y]?.[q]
        ) {

          popGridBubble(
            q,
            y
          );

          removed++;

        }

      }

    }


    createLaserBeam(
      p.x,
      p.y,
      direction
    );


    score +=
      removed * 30;


    setTimeout(
      finishSpecial,
      380
    );

  }


  /* ==========================================================
     BOMB
  ========================================================== */

  function activateBomb(
    q,
    r
  ) {

    showMessage(
      "💣 धमाका!"
    );


    playSound(
      100,
      .35,
      "sawtooth",
      .055
    );


    let removed = 0;


    for (
      let rr = 0;
      rr < grid.length;
      rr++
    ) {

      for (
        let qq = 0;
        qq < COLS;
        qq++
      ) {

        const bubble =
          grid[rr][qq];


        if (!bubble)
          continue;


        const p =
          getPosition(
            qq,
            rr
          );


        const center =
          getPosition(
            q,
            r
          );


        const d =
          Math.hypot(
            p.x - center.x,
            p.y - center.y
          );


        if (
          d <= 95
        ) {

          popGridBubble(
            qq,
            rr
          );

          removed++;

        }

      }

    }


    score +=
      removed * 35;


    createExplosion(
      getX(q, r),
      getY(r)
    );


    setTimeout(
      finishSpecial,
      500
    );

  }


  /* ==========================================================
     RAINBOW
  ========================================================== */

  function activateRainbow(
    q,
    r
  ) {

    showMessage(
      "🌈 इंद्रधनुष बबल!"
    );


    playSound(
      620,
      .25,
      "triangle",
      .045
    );


    /*
      Find the colour with the
      largest presence.
    */

    const counts =
      new Array(
        levelConfig().colors
      ).fill(0);


    for (
      const row of grid
    ) {

      for (
        const bubble of row
      ) {

        if (
          bubble &&
          !bubble.special
        ) {

          counts[
            bubble.color
          ]++;

        }

      }

    }


    let target =
      0;


    for (
      let i = 1;
      i < counts.length;
      i++
    ) {

      if (
        counts[i] >
        counts[target]
      ) {

        target = i;

      }

    }


    let removed = 0;


    for (
      let rr = 0;
      rr < grid.length;
      rr++
    ) {

      for (
        let qq = 0;
        qq < COLS;
        qq++
      ) {

        const bubble =
          grid[rr][qq];


        if (
          bubble &&
          !bubble.special &&
          bubble.color === target
        ) {

          popGridBubble(
            qq,
            rr
          );

          removed++;

        }

      }

    }


    createRainbowBurst(
      getX(q, r),
      getY(r)
    );


    score +=
      removed * 40;


    setTimeout(
      finishSpecial,
      500
    );

  }


  /* ==========================================================
     SUN
  ========================================================== */

  function activateSun(
    q,
    r
  ) {

    showMessage(
      "☀️ सूर्य बबल — रंग साफ!"
    );


    playSound(
      820,
      .28,
      "triangle",
      .055
    );


    /*
      Choose the colour with the
      largest number of bubbles.
    */

    const counts =
      new Array(
        levelConfig().colors
      ).fill(0);


    for (
      const row of grid
    ) {

      for (
        const bubble of row
      ) {

        if (
          bubble &&
          !bubble.special
        ) {

          counts[
            bubble.color
          ]++;

        }

      }

    }


    let target = 0;


    for (
      let i = 1;
      i < counts.length;
      i++
    ) {

      if (
        counts[i] >
        counts[target]
      ) {

        target = i;

      }

    }


    let removed = 0;


    for (
      let rr = 0;
      rr < grid.length;
      rr++
    ) {

      for (
        let qq = 0;
        qq < COLS;
        qq++
      ) {

        const bubble =
          grid[rr][qq];


        if (
          bubble &&
          !bubble.special &&
          bubble.color === target
        ) {

          popGridBubble(
            qq,
            rr
          );

          removed++;

        }

      }

    }


    createSunBurst(
      getX(q, r),
      getY(r)
    );


    score +=
      removed * 55;


    setTimeout(
      finishSpecial,
      600
    );

  }


  /* ==========================================================
     POP GRID BUBBLE
  ========================================================== */

  function popGridBubble(
    q,
    r
  ) {

    const bubble =
      grid[r]?.[q];


    if (!bubble)
      return;


    const p =
      getPosition(q, r);


    grid[r][q] =
      null;


    popEffects.push({

      x:
        p.x,

      y:
        p.y,

      color:
        bubble.color,

      special:
        bubble.special,

      life: 0,

      max:
        .35 +

        Math.random()*.15,

      delay:
        Math.random()*.08

    });


    createParticles(
      p.x,
      p.y,
      bubble.color,
      10
    );

  }


  /* ==========================================================
     SPECIAL FINISH
  ========================================================== */

  function finishSpecial() {

    const dropped =
      dropDetached();


    if (dropped) {

      score +=
        dropped * 50;

    }


    save.best =
      Math.max(
        save.best,
        score
      );


    updateUI();

    saveGame();


    if (
      isBoardEmpty()
    ) {

      completeLevel();

    }
    else {

      busy = false;

    }

  }


  /* ==========================================================
     LASER EFFECT
  ========================================================== */

  function createLaserBeam(
    x,
    y,
    direction
  ) {

    specialBursts.push({

      x,
      y,

      type:
        "laser-beam",

      direction,

      life: 0,

      max: .42

    });

  }


  /* ==========================================================
     EXPLOSION
  ========================================================== */

  function createExplosion(
    x,
    y
  ) {

    for (
      let i = 0;
      i < 50;
      i++
    ) {

      const angle =
        Math.random() *
        Math.PI * 2;


      const speed =
        80 +
        Math.random() *
        300;


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
          2 +
          Math.random() * 4,

        color:
          Math.floor(
            Math.random() *
            COLORS.length
          ),

        life: 0,

        max:
          .35 +
          Math.random() * .5,

        gravity:
          120

      });

    }


    rings.push({

      x,
      y,

      life: 0,

      max: .55,

      color: 1

    });

  }


  /* ==========================================================
     RAINBOW EFFECT
  ========================================================== */

  function createRainbowBurst(
    x,
    y
  ) {

    for (
      let i = 0;
      i < 55;
      i++
    ) {

      const angle =
        Math.random() *
        Math.PI * 2;


      const speed =
        60 +
        Math.random() *
        260;


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
          2 +
          Math.random() * 4,

        color:
          i % COLORS.length,

        life: 0,

        max:
          .4 +
          Math.random() * .45,

        gravity:
          90

      });

    }


    rings.push({

      x,
      y,

      life: 0,

      max: .65,

      color: 3

    });

  }


  /* ==========================================================
     SUN EFFECT
  ========================================================== */

  function createSunBurst(
    x,
    y
  ) {

    for (
      let i = 0;
      i < 65;
      i++
    ) {

      const angle =
        Math.random() *
        Math.PI * 2;


      const speed =
        90 +
        Math.random() *
        310;


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
          2 +
          Math.random() * 4,

        color:
          1,

        life: 0,

        max:
          .5 +
          Math.random() * .5,

        gravity:
          50

      });

    }


    rings.push({

      x,
      y,

      life: 0,

      max: .75,

      color: 1

    });

  }


  /* ==========================================================
     CEILING DESCENT
  ========================================================== */

  function descendCeiling() {

    busy = true;


    const newRow =
      new Array(COLS)
        .fill(null);


    for (
      let q = 0;
      q < COLS;
      q++
    ) {

      if (
        Math.random() < .84
      ) {

        newRow[q] =
          makeBubble();

      }

    }


    if (
      newRow.every(
        value => !value
      )
    ) {

      newRow[
        Math.floor(
          COLS / 2
        )
      ] =
        makeBubble();

    }


    grid.unshift(
      newRow
    );


    ceilingAnimation = {

      progress: 0,

      duration: .72

    };


    createParticles(
      W / 2,
      TOP_Y,
      3,
      22
    );


    playSound(
      120,
      .20,
      "sawtooth",
      .025
    );


    showMessage(
      "⚠️ छत एक पंक्ति नीचे आ गई!"
    );


    updateUI();

  }


  /* ==========================================================
     COMPLETE LEVEL
  ========================================================== */

  function completeLevel() {

    if (
      levelWon ||
      gameEnded
    )
      return;


    levelWon = true;

    busy = true;


    score += 250;


    const oldBest =
      save.bestScores[
        save.currentLevel
      ] || 0;


    save.bestScores[
      save.currentLevel
    ] =
      Math.max(
        oldBest,
        score
      );


    save.best =
      Math.max(
        save.best,
        score
      );


    if (
      !save.completed.includes(
        save.currentLevel
      )
    ) {

      save.completed.push(
        save.currentLevel
      );

    }


    save.unlocked =
      Math.min(
        MAX_LEVEL,
        Math.max(
          save.unlocked,
          save.currentLevel + 1
        )
      );


    save.score =
      score;


    saveGame();


    for (
      let i = 0;
      i < 5;
      i++
    ) {

      setTimeout(
        () => {

          createSunBurst(

            60 +
            Math.random() *
            360,

            160 +
            Math.random() *
            300

          );

        },

        i * 90

      );

    }


    playSound(
      720,
      .18,
      "triangle",
      .05
    );


    setTimeout(
      () =>
        showResult(true),
      700
    );

  }


  /* ==========================================================
     GAME OVER
  ========================================================== */

  function gameOverNow() {

    if (gameEnded)
      return;


    gameEnded = true;

    busy = true;


    playSound(
      80,
      .35,
      "sawtooth",
      .035
    );


    showMessage(
      "छत बहुत नीचे आ गई…"
    );


    setTimeout(
      () =>
        showResult(false),
      550
    );

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

        if (
          !grid[r][q]
        )
          continue;


        const p =
          getPosition(q, r);


        if (
          p.y + RADIUS >=
          DANGER_Y
        ) {

          gameOverNow();

          return true;

        }

      }

    }


    return false;

  }


  /* ==========================================================
     BOARD EMPTY
  ========================================================== */

  function isBoardEmpty() {

    for (
      const row of grid
    ) {

      for (
        const bubble of row
      ) {

        if (bubble)
          return false;

      }

    }


    return true;

  }


  /* ==========================================================
     PARTICLES
  ========================================================== */

  function createParticles(
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
        Math.random() *
        Math.PI * 2;


      const speed =
        55 +
        Math.random() * 170;


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
          Math.random() * 3.5,

        color,

        life: 0,

        max:
          .28 +
          Math.random() * .45,

        gravity:
          100 +
          Math.random() * 150

      });

    }

  }


  /* ==========================================================
     UPDATE
  ========================================================== */

  function update(dt) {

    if (paused)
      return;


    launcherRecoil =
      Math.max(
        0,
        launcherRecoil -
        dt * 5
      );


    launcherBounce =
      Math.max(
        0,
        launcherBounce -
        dt * 4
      );


    shake =
      Math.max(
        0,
        shake -
        dt * 9
      );


    /* --------------------------------------------------------
       CEILING
    -------------------------------------------------------- */

    if (
      ceilingAnimation
    ) {

      ceilingAnimation.progress +=
        dt /
        ceilingAnimation.duration;


      if (
        ceilingAnimation.progress >=
        1
      ) {

        ceilingAnimation = null;


        if (
          checkDanger()
        ) {

          return;

        }


        busy = false;

      }

    }


    /* --------------------------------------------------------
       MOVING BUBBLE
    -------------------------------------------------------- */

    if (movingBubble) {

      const b =
        movingBubble;


      b.trail.push({

        x:
          b.x,

        y:
          b.y

      });


      if (
        b.trail.length > 8
      ) {

        b.trail.shift();

      }


      b.x +=
        b.vx * dt;


      b.y +=
        b.vy * dt;


      if (
        b.x <= RADIUS
      ) {

        b.x =
          RADIUS;


        b.vx =
          Math.abs(
            b.vx
          );

      }


      if (
        b.x >=
        W - RADIUS
      ) {

        b.x =
          W - RADIUS;


        b.vx =
          -Math.abs(
            b.vx
          );

      }


      if (
        b.y <= TOP_Y
      ) {

        attachMovingBubble();

      }


      else {

        outer:

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
              !grid[r][q]
            )
              continue;


            const p =
              getPosition(q, r);


            const distance =
              Math.hypot(
                b.x - p.x,
                b.y - p.y
              );


            if (
              distance <
              RADIUS * 1.82
            ) {

              attachMovingBubble();

              break outer;

            }

          }

        }

      }

    }


    /* --------------------------------------------------------
       FALLING BUBBLES
    -------------------------------------------------------- */

    for (
      let i =
        fallingBubbles.length - 1;

      i >= 0;

      i--
    ) {

      const b =
        fallingBubbles[i];


      if (
        b.delay > 0
      ) {

        b.delay -= dt;

        continue;

      }


      b.life += dt;


      b.vy +=
        650 * dt;


      b.x +=
        b.vx * dt;


      b.y +=
        b.vy * dt;


      b.rotation +=
        b.spin * dt;


      b.vx *=
        Math.pow(
          .995,
          dt * 60
        );


      if (
        b.x < RADIUS
      ) {

        b.x =
          RADIUS;


        b.vx =
          Math.abs(
            b.vx
          ) * .72;

      }


      if (
        b.x >
        W - RADIUS
      ) {

        b.x =
          W - RADIUS;


        b.vx =
          -Math.abs(
            b.vx
          ) * .72;

      }


      /*
        Bubble hits the bottom.
      */

      if (
        b.y >=
        H - 32 &&
        !b.bounced
      ) {

        b.y =
          H - 32;


        b.vy *=
          -.25;


        b.vx *=
          .78;


        b.bounced =
          true;


        createParticles(
          b.x,
          b.y,
          b.color,
          6
        );


        playSound(
          115,
          .045,
          "sine",
          .012
        );

      }


      if (
        b.y >
        H + 70 ||
        b.life > 4
      ) {

        fallingBubbles.splice(
          i,
          1
        );

      }

    }


    /* --------------------------------------------------------
       PARTICLES
    -------------------------------------------------------- */

    for (
      let i =
        particles.length - 1;

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
        p.gravity * dt;


      p.vx *=
        .992;


      if (
        p.life >=
        p.max
      ) {

        particles.splice(
          i,
          1
        );

      }

    }


    /* --------------------------------------------------------
       POPS
    -------------------------------------------------------- */

    for (
      let i =
        popEffects.length - 1;

      i >= 0;

      i--
    ) {

      const p =
        popEffects[i];


      p.life += dt;


      if (
        p.life >=
        p.max
      ) {

        popEffects.splice(
          i,
          1
        );

      }

    }


    /* --------------------------------------------------------
       RINGS
    -------------------------------------------------------- */

    for (
      let i =
        rings.length - 1;

      i >= 0;

      i--
    ) {

      rings[i].life +=
        dt;


      if (
        rings[i].life >=
        rings[i].max
      ) {

        rings.splice(
          i,
          1
        );

      }

    }


    /* --------------------------------------------------------
       SPECIAL EFFECTS
    -------------------------------------------------------- */

    for (
      let i =
        specialBursts.length - 1;

      i >= 0;

      i--
    ) {

      specialBursts[i].life +=
        dt;


      if (
        specialBursts[i].life >=
        specialBursts[i].max
      ) {

        specialBursts.splice(
          i,
          1
        );

      }

    }

  }


  /* ==========================================================
     DRAW
  ========================================================== */

  function draw() {

    ctx.clearRect(
      0,
      0,
      W,
      H
    );


    ctx.save();


    if (shake > 0) {

      ctx.translate(

        (Math.random() - .5)
        * shake,

        (Math.random() - .5)
        * shake

      );

    }


    drawBackground();

    drawMithilaDecorations();

    drawDangerLine();

    drawGrid();

    drawFallingBubbles();

    drawSpecialEffects();

    drawPopEffects();

    drawRings();

    drawParticles();

    drawMovingBubble();

    drawLauncher();


    ctx.restore();

  }


  /* ==========================================================
     BACKGROUND
  ========================================================== */

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
      "#183662"
    );


    gradient.addColorStop(
      .45,
      "#132f59"
    );


    gradient.addColorStop(
      1,
      "#0b1f40"
    );


    ctx.fillStyle =
      gradient;


    ctx.fillRect(
      0,
      0,
      W,
      H
    );


    const glow =
      ctx.createRadialGradient(
        W / 2,
        30,
        10,
        W / 2,
        30,
        230
      );


    glow.addColorStop(
      0,
      "rgba(139,181,226,.15)"
    );


    glow.addColorStop(
      1,
      "rgba(139,181,226,0)"
    );


    ctx.fillStyle =
      glow;


    ctx.fillRect(
      0,
      0,
      W,
      300
    );

  }


  /* ==========================================================
     MITHILA DECORATIONS
  ========================================================== */

  function drawMithilaDecorations() {

    ctx.save();


    ctx.globalAlpha =
      .09;


    ctx.strokeStyle =
      "#d6b970";


    ctx.lineWidth =
      1.4;


    ctx.strokeRect(
      9,
      9,
      W - 18,
      H - 18
    );


    ctx.strokeRect(
      16,
      16,
      W - 32,
      H - 32
    );


    for (
      let x = 35;
      x < W - 20;
      x += 68
    ) {

      drawLotus(
        x,
        25,
        7
      );

    }


    drawFish(
      30,
      160,
      13,
      false
    );


    drawFish(
      W - 30,
      265,
      13,
      true
    );


    drawPeacock(
      39,
      500,
      .52
    );


    drawPeacock(
      W - 39,
      395,
      -.52
    );


    drawLotus(
      30,
      H - 65,
      12
    );


    drawLotus(
      W - 30,
      H - 65,
      12
    );


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
      x - size * 1.2,
      y,
      x,
      y - size
    );


    ctx.quadraticCurveTo(
      x + size * 1.2,
      y,
      x,
      y + size
    );


    ctx.stroke();


    ctx.beginPath();


    ctx.moveTo(
      x - size,
      y + size * .4
    );


    ctx.quadraticCurveTo(
      x,
      y + size * 1.5,
      x + size,
      y + size * .4
    );


    ctx.stroke();

  }


  function drawFish(
    x,
    y,
    size,
    flip
  ) {

    ctx.save();


    if (flip)
      ctx.scale(-1, 1);


    ctx.beginPath();


    ctx.ellipse(
      x,
      y,
      size,
      size * .58,
      0,
      0,
      Math.PI * 2
    );


    ctx.stroke();


    ctx.beginPath();


    ctx.moveTo(
      x - size,
      y
    );


    ctx.lineTo(
      x - size * 1.7,
      y - size * .7
    );


    ctx.lineTo(
      x - size * 1.7,
      y + size * .7
    );


    ctx.closePath();


    ctx.stroke();


    ctx.beginPath();


    ctx.arc(
      x + size * .42,
      y - size * .12,
      1.5,
      0,
      Math.PI * 2
    );


    ctx.stroke();


    ctx.restore();

  }


  function drawPeacock(
    x,
    y,
    scale
  ) {

    ctx.save();


    ctx.translate(
      x,
      y
    );


    ctx.scale(
      scale,
      scale
    );


    for (
      let i = 0;
      i < 7;
      i++
    ) {

      const angle =
        -1.1 +
        i * .36;


      ctx.beginPath();


      ctx.moveTo(
        0,
        15
      );


      ctx.quadraticCurveTo(

        Math.cos(angle) * 45,

        Math.sin(angle) * 45,

        Math.cos(angle) * 58,

        Math.sin(angle) * 58

      );


      ctx.stroke();

    }


    ctx.beginPath();


    ctx.ellipse(
      0,
      18,
      9,
      18,
      0,
      0,
      Math.PI * 2
    );


    ctx.stroke();


    ctx.beginPath();


    ctx.arc(
      0,
      -3,
      7,
      0,
      Math.PI * 2
    );


    ctx.stroke();


    for (
      let i = 0;
      i < 3;
      i++
    ) {

      ctx.beginPath();


      ctx.moveTo(
        -3 + i * 3,
        -9
      );


      ctx.lineTo(
        -3 + i * 3,
        -16
      );


      ctx.stroke();

    }


    ctx.restore();

  }


  /* ==========================================================
     DANGER LINE
  ========================================================== */

  function drawDangerLine() {

    ctx.save();


    ctx.setLineDash([
      7,
      8
    ]);


    ctx.strokeStyle =
      "rgba(220,184,105,.32)";


    ctx.lineWidth =
      1.4;


    ctx.beginPath();


    ctx.moveTo(
      18,
      DANGER_Y
    );


    ctx.lineTo(
      W - 18,
      DANGER_Y
    );


    ctx.stroke();


    ctx.restore();

  }


  /* ==========================================================
     DRAW GRID
  ========================================================== */

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

        const bubble =
          grid[r][q];


        if (!bubble)
          continue;


        const p =
          getPosition(q, r);


        let y =
          p.y;


        if (
          ceilingAnimation
        ) {

          const t =
            Math.min(
              1,
              ceilingAnimation.progress
            );


          const eased =
            easeOutBack(t);


          y =
            p.y -
            ROW_HEIGHT *
            (1 - eased);

        }


        if (
          bubble.special
        ) {

          drawSpecialBubble(

            p.x,
            y,
            bubble.special

          );

        }
        else {

          drawBubble(

            p.x,
            y,
            bubble.color

          );

        }

      }

    }

  }


  /* ==========================================================
     DRAW FALLING BUBBLES
  ========================================================== */

  function drawFallingBubbles() {

    for (
      const b of fallingBubbles
    ) {

      if (
        b.delay > 0
      )
        continue;


      const stretch =
        Math.min(
          .25,
          Math.abs(b.vy) /
          2600
        );


      if (
        b.special
      ) {

        drawSpecialBubble(

          b.x,
          b.y,
          b.special,
          b.scale,
          1,
          b.rotation

        );

      }
      else {

        drawBubble(

          b.x,
          b.y,
          b.color,
          b.scale,
          1,
          b.rotation,
          1 - stretch * .55,
          1 + stretch

        );

      }


      if (
        Math.abs(b.vy) > 170
      ) {

        ctx.save();


        ctx.globalAlpha =
          .13;


        ctx.strokeStyle =
          COLORS[
            b.color
          ].light;


        ctx.lineWidth = 3;


        ctx.beginPath();


        ctx.moveTo(
          b.x,
          b.y - 34
        );


        ctx.lineTo(
          b.x,
          b.y - 7
        );


        ctx.stroke();


        ctx.restore();

      }

    }

  }


  /* ==========================================================
     MOVING BUBBLE
  ========================================================== */

  function drawMovingBubble() {

    if (!movingBubble)
      return;


    const b =
      movingBubble;


    ctx.save();


    for (
      let i = 0;
      i < b.trail.length;
      i++
    ) {

      const t =
        b.trail[i];


      const alpha =
        (
          i /
          b.trail.length
        ) * .14;


      ctx.globalAlpha =
        alpha;


      ctx.fillStyle =
        b.special
          ? "#ffffff"
          : COLORS[
              b.color
            ].light;


      ctx.beginPath();


      ctx.arc(
        t.x,
        t.y,
        4 +
        i /
        b.trail.length *
        4,
        0,
        Math.PI * 2
      );


      ctx.fill();

    }


    ctx.restore();


    if (
      b.special
    ) {

      drawSpecialBubble(
        b.x,
        b.y,
        b.special,
        1.03
      );

    }
    else {

      drawBubble(
        b.x,
        b.y,
        b.color,
        1.03
      );

    }

  }


  /* ==========================================================
     NORMAL BUBBLE DRAW
  ========================================================== */

  function drawBubble(

    x,
    y,
    colorIndex,
    scale = 1,
    alpha = 1,
    rotation = 0,
    scaleX = 1,
    scaleY = 1

  ) {

    const color =
      COLORS[colorIndex];


    const radius =
      RADIUS * scale;


    ctx.save();


    ctx.globalAlpha =
      alpha;


    ctx.translate(
      x,
      y
    );


    ctx.rotate(
      rotation
    );


    ctx.scale(
      scaleX,
      scaleY
    );


    /* Shadow */

    ctx.save();


    ctx.globalAlpha =
      alpha * .28;


    ctx.fillStyle =
      "#020a19";


    ctx.beginPath();


    ctx.ellipse(
      3,
      5,
      radius * .92,
      radius * .88,
      0,
      0,
      Math.PI * 2
    );


    ctx.fill();


    ctx.restore();


    /* Main glossy sphere */

    const gradient =
      ctx.createRadialGradient(

        -radius * .34,

        -radius * .42,

        radius * .05,

        0,

        0,

        radius

      );


    gradient.addColorStop(
      0,
      "#ffffff"
    );


    gradient.addColorStop(
      .12,
      color.light
    );


    gradient.addColorStop(
      .34,
      color.main
    );


    gradient.addColorStop(
      .78,
      color.main
    );


    gradient.addColorStop(
      1,
      color.dark
    );


    ctx.fillStyle =
      gradient;


    ctx.beginPath();


    ctx.arc(
      0,
      0,
      radius,
      0,
      Math.PI * 2
    );


    ctx.fill();


    /* Rim */

    ctx.strokeStyle =
      "rgba(255,255,255,.25)";


    ctx.lineWidth =
      1.2;


    ctx.stroke();


    /* Unique Mithila pattern */

    drawBubblePattern(
      color.pattern,
      radius
    );


    /* Gloss */

    ctx.fillStyle =
      "rgba(255,255,255,.52)";


    ctx.beginPath();


    ctx.ellipse(

      -radius * .30,

      -radius * .39,

      radius * .28,

      radius * .15,

      -.35,

      0,

      Math.PI * 2

    );


    ctx.fill();


    ctx.fillStyle =
      "rgba(255,255,255,.25)";


    ctx.beginPath();


    ctx.arc(
      radius * .30,
      radius * .27,
      radius * .09,
      0,
      Math.PI * 2
    );


    ctx.fill();


    ctx.restore();

  }


  /* ==========================================================
     UNIQUE BUBBLE PATTERNS
  ========================================================== */

  function drawBubblePattern(
    pattern,
    radius
  ) {

    ctx.save();


    ctx.globalAlpha =
      .22;


    ctx.strokeStyle =
      "rgba(255,255,255,.72)";


    ctx.fillStyle =
      "rgba(255,255,255,.22)";


    ctx.lineWidth =
      1;


    if (
      pattern ===
      "lotus"
    ) {

      for (
        let i = 0;
        i < 5;
        i++
      ) {

        const angle =
          i *
          Math.PI *
          2 / 5;


        const px =
          Math.cos(angle) *
          radius * .34;


        const py =
          Math.sin(angle) *
          radius * .34;


        ctx.beginPath();


        ctx.ellipse(
          px,
          py,
          radius * .16,
          radius * .30,
          angle,
          0,
          Math.PI * 2
        );


        ctx.stroke();

      }

    }


    else if (
      pattern ===
      "sun"
    ) {

      ctx.beginPath();


      ctx.arc(
        0,
        0,
        radius * .34,
        0,
        Math.PI * 2
      );


      ctx.stroke();


      for (
        let i = 0;
        i < 8;
        i++
      ) {

        const a =
          i *
          Math.PI / 4;


        ctx.beginPath();


        ctx.moveTo(
          Math.cos(a) *
          radius * .39,

          Math.sin(a) *
          radius * .39
        );


        ctx.lineTo(
          Math.cos(a) *
          radius * .63,

          Math.sin(a) *
          radius * .63
        );


        ctx.stroke();

      }

    }


    else if (
      pattern ===
      "leaf"
    ) {

      for (
        let i = -1;
        i <= 1;
        i++
      ) {

        ctx.beginPath();


        ctx.ellipse(
          i * radius * .25,
          i * radius * .12,
          radius * .12,
          radius * .29,
          i * .55,
          0,
          Math.PI * 2
        );


        ctx.stroke();

      }

    }


    else if (
      pattern ===
      "wave"
    ) {

      for (
        let row = -1;
        row <= 1;
        row++
      ) {

        ctx.beginPath();


        for (
          let x = -radius*.6;
          x <= radius*.6;
          x += 4
        ) {

          const y =
            row * radius * .23 +
            Math.sin(
              x / 5
            ) *
            radius * .08;


          if (
            x === -radius*.6
          ) {

            ctx.moveTo(
              x,
              y
            );

          }
          else {

            ctx.lineTo(
              x,
              y
            );

          }

        }


        ctx.stroke();

      }

    }


    else if (
      pattern ===
      "peacock"
    ) {

      ctx.beginPath();


      ctx.arc(
        0,
        0,
        radius * .45,
        0,
        Math.PI * 2
      );


      ctx.stroke();


      for (
        let i = 0;
        i < 5;
        i++
      ) {

        const a =
          i *
          Math.PI *
          2 / 5;


        ctx.beginPath();


        ctx.ellipse(

          Math.cos(a) *
          radius * .42,

          Math.sin(a) *
          radius * .42,

          radius * .12,

          radius * .23,

          a,

          0,

          Math.PI * 2

        );


        ctx.stroke();

      }

    }


    else if (
      pattern ===
      "flower"
    ) {

      for (
        let i = 0;
        i < 6;
        i++
      ) {

        const a =
          i *
          Math.PI / 3;


        ctx.beginPath();


        ctx.ellipse(

          Math.cos(a) *
          radius * .30,

          Math.sin(a) *
          radius * .30,

          radius * .13,

          radius * .25,

          a,

          0,

          Math.PI * 2

        );


        ctx.stroke();

      }


      ctx.beginPath();


      ctx.arc(
        0,
        0,
        radius * .10,
        0,
        Math.PI * 2
      );


      ctx.fill();

    }


    ctx.restore();

  }


  /* ==========================================================
     SPECIAL BUBBLES
  ========================================================== */

  function drawSpecialBubble(

    x,
    y,
    type,
    scale = 1,
    alpha = 1,
    rotation = 0

  ) {

    const radius =
      RADIUS * scale;


    ctx.save();


    ctx.globalAlpha =
      alpha;


    ctx.translate(
      x,
      y
    );


    ctx.rotate(
      rotation
    );


    /*
      Outer glow
    */

    const glow =
      ctx.createRadialGradient(
        0,
        0,
        radius * .2,
        0,
        0,
        radius * 1.65
      );


    if (
      type === "laser"
    ) {

      glow.addColorStop(
        0,
        "rgba(116,201,255,.42)"
      );

      glow.addColorStop(
        1,
        "rgba(116,201,255,0)"
      );

    }


    else if (
      type === "bomb"
    ) {

      glow.addColorStop(
        0,
        "rgba(255,101,78,.35)"
      );

      glow.addColorStop(
        1,
        "rgba(255,101,78,0)"
      );

    }


    else if (
      type === "rainbow"
    ) {

      glow.addColorStop(
        0,
        "rgba(255,255,255,.38)"
      );

      glow.addColorStop(
        1,
        "rgba(255,255,255,0)"
      );

    }


    else {

      glow.addColorStop(
        0,
        "rgba(255,218,104,.48)"
      );

      glow.addColorStop(
        1,
        "rgba(255,218,104,0)"
      );

    }


    ctx.fillStyle =
      glow;


    ctx.beginPath();


    ctx.arc(
      0,
      0,
      radius * 1.65,
      0,
      Math.PI * 2
    );


    ctx.fill();


    /*
      Main special sphere
    */

    let gradient;


    if (
      type === "laser"
    ) {

      gradient =
        ctx.createRadialGradient(
          -8,
          -9,
          2,
          0,
          0,
          radius
        );


      gradient.addColorStop(
        0,
        "#ffffff"
      );

      gradient.addColorStop(
        .18,
        "#9ee7ff"
      );

      gradient.addColorStop(
        .55,
        "#368fd4"
      );

      gradient.addColorStop(
        1,
        "#173d72"
      );

    }


    else if (
      type === "bomb"
    ) {

      gradient =
        ctx.createRadialGradient(
          -7,
          -9,
          2,
          0,
          0,
          radius
        );


      gradient.addColorStop(
        0,
        "#ffb8a8"
      );

      gradient.addColorStop(
        .25,
        "#d94b43"
      );

      gradient.addColorStop(
        .72,
        "#741e29"
      );

      gradient.addColorStop(
        1,
        "#260d17"
      );

    }


    else if (
      type === "rainbow"
    ) {

      gradient =
        ctx.createRadialGradient(
          -7,
          -8,
          2,
          0,
          0,
          radius
        );


      gradient.addColorStop(
        0,
        "#ffffff"
      );

      gradient.addColorStop(
        .2,
        "#ffe0f5"
      );

      gradient.addColorStop(
        .42,
        "#9ee4ff"
      );

      gradient.addColorStop(
        .65,
        "#d7a7ff"
      );

      gradient.addColorStop(
        1,
        "#7563b7"
      );

    }


    else {

      gradient =
        ctx.createRadialGradient(
          -7,
          -9,
          2,
          0,
          0,
          radius
        );


      gradient.addColorStop(
        0,
        "#fffce0"
      );

      gradient.addColorStop(
        .22,
        "#ffe98a"
      );

      gradient.addColorStop(
        .60,
        "#e3a928"
      );

      gradient.addColorStop(
        1,
        "#9b5710"
      );

    }


    ctx.fillStyle =
      gradient;


    ctx.beginPath();


    ctx.arc(
      0,
      0,
      radius,
      0,
      Math.PI * 2
    );


    ctx.fill();


    ctx.strokeStyle =
      "rgba(255,255,255,.48)";


    ctx.lineWidth =
      1.5;


    ctx.stroke();


    /*
      SPECIAL SYMBOL
    */

    ctx.textAlign =
      "center";


    ctx.textBaseline =
      "middle";


    if (
      type === "laser"
    ) {

      ctx.strokeStyle =
        "#e9fbff";


      ctx.lineWidth =
        2;


      ctx.beginPath();


      ctx.moveTo(
        -radius*.55,
        radius*.42
      );


      ctx.lineTo(
        -radius*.08,
        radius*.08
      );


      ctx.lineTo(
        -radius*.28,
        -radius*.03
      );


      ctx.lineTo(
        radius*.52,
        -radius*.52
      );


      ctx.stroke();

    }


    else if (
      type === "bomb"
    ) {

      ctx.fillStyle =
        "#111827";


      ctx.beginPath();


      ctx.arc(
        0,
        2,
        radius * .52,
        0,
        Math.PI * 2
      );


      ctx.fill();


      ctx.fillStyle =
        "#ffbd6a";


      ctx.fillRect(
        -3,
        -radius*.76,
        6,
        radius*.22
      );


      ctx.strokeStyle =
        "#ffe09c";


      ctx.lineWidth =
        1.5;


      ctx.beginPath();


      ctx.arc(
        0,
        -radius*.76,
        4,
        Math.PI,
        Math.PI*1.7
      );


      ctx.stroke();

    }


    else if (
      type === "rainbow"
    ) {

      const rainbow =
        [
          "#ff6577",
          "#ffbd55",
          "#e7df61",
          "#6edb91",
          "#65b9f5",
          "#a778e2"
        ];


      rainbow.forEach(
        (c, i) => {

          ctx.strokeStyle =
            c;


          ctx.lineWidth =
            2;


          ctx.beginPath();


          ctx.arc(

            0,

            0,

            radius *
            (.30 +
            i*.075),

            Math.PI*1.05,

            Math.PI*1.95

          );


          ctx.stroke();

        }
      );

    }


    else {

      ctx.strokeStyle =
        "#fff7c2";


      ctx.lineWidth =
        2;


      for (
        let i = 0;
        i < 8;
        i++
      ) {

        const a =
          i *
          Math.PI / 4;


        ctx.beginPath();


        ctx.moveTo(
          Math.cos(a) *
          radius * .35,

          Math.sin(a) *
          radius * .35
        );


        ctx.lineTo(
          Math.cos(a) *
          radius * .68,

          Math.sin(a) *
          radius * .68
        );


        ctx.stroke();

      }


      ctx.beginPath();


      ctx.arc(
        0,
        0,
        radius * .25,
        0,
        Math.PI * 2
      );


      ctx.stroke();

    }


    /*
      Gloss highlight
    */

    ctx.fillStyle =
      "rgba(255,255,255,.62)";


    ctx.beginPath();


    ctx.ellipse(
      -radius*.30,
      -radius*.40,
      radius*.27,
      radius*.14,
      -.35,
      0,
      Math.PI*2
    );


    ctx.fill();


    ctx.restore();

  }


  /* ==========================================================
     SPECIAL EFFECTS DRAW
  ========================================================== */

  function drawSpecialEffects() {

    for (
      const effect
      of specialBursts
    ) {

      const t =
        Math.min(
          1,
          effect.life /
          effect.max
        );


      if (
        effect.type ===
        "laser-beam"
      ) {

        drawLaserEffect(
          effect,
          t
        );

      }


      else if (
        effect.type ===
        "laser"
      ) {

        drawSpecialCharge(
          effect,
          t,
          "#75d9ff"
        );

      }


      else if (
        effect.type ===
        "bomb"
      ) {

        drawSpecialCharge(
          effect,
          t,
          "#ff6b58"
        );

      }


      else if (
        effect.type ===
        "rainbow"
      ) {

        drawSpecialCharge(
          effect,
          t,
          "#ffffff"
        );

      }


      else if (
        effect.type ===
        "sun"
      ) {

        drawSpecialCharge(
          effect,
          t,
          "#ffe47b"
        );

      }

    }

  }


  function drawSpecialCharge(
    effect,
    t,
    color
  ) {

    const radius =
      22 +
      t * 65;


    ctx.save();


    ctx.globalAlpha =
      (1 - t) * .65;


    ctx.strokeStyle =
      color;


    ctx.lineWidth =
      3 *
      (1 - t);


    ctx.beginPath();


    ctx.arc(
      effect.x,
      effect.y,
      radius,
      0,
      Math.PI * 2
    );


    ctx.stroke();


    ctx.restore();

  }


  function drawLaserEffect(
    effect,
    t
  ) {

    const alpha =
      1 - t;


    ctx.save();


    ctx.globalAlpha =
      alpha;


    ctx.strokeStyle =
      "#bff3ff";


    ctx.shadowColor =
      "#55caff";


    ctx.shadowBlur =
      20;


    ctx.lineWidth =
      13;


    ctx.beginPath();


    if (
      effect.direction ===
      "horizontal"
    ) {

      ctx.moveTo(
        0,
        effect.y
      );


      ctx.lineTo(
        W,
        effect.y
      );

    }
    else {

      ctx.moveTo(
        effect.x,
        TOP_Y
      );


      ctx.lineTo(
        effect.x,
        DANGER_Y
      );

    }


    ctx.stroke();


    ctx.strokeStyle =
      "#ffffff";


    ctx.lineWidth =
      4;


    ctx.shadowBlur =
      7;


    ctx.beginPath();


    if (
      effect.direction ===
      "horizontal"
    ) {

      ctx.moveTo(
        0,
        effect.y
      );


      ctx.lineTo(
        W,
        effect.y
      );

    }
    else {

      ctx.moveTo(
        effect.x,
        TOP_Y
      );


      ctx.lineTo(
        effect.x,
        DANGER_Y
      );

    }


    ctx.stroke();


    ctx.restore();

  }


  /* ==========================================================
     POP EFFECTS
  ========================================================== */

  function drawPopEffects() {

    for (
      const p of popEffects
    ) {

      const t =
        Math.min(
          1,
          p.life /
          p.max
        );


      const scale =
        1 +
        easeOutBack(t) *
        .55;


      const alpha =
        1 - t;


      if (
        p.special
      ) {

        drawSpecialBubble(

          p.x,
          p.y,
          p.special,
          scale,
          alpha

        );

      }
      else {

        drawBubble(

          p.x,
          p.y,
          p.color,
          scale,
          alpha

        );

      }


      ctx.save();


      ctx.globalAlpha =
        alpha * .7;


      ctx.strokeStyle =
        p.special
          ? "#ffffff"
          : COLORS[
              p.color
            ].light;


      ctx.lineWidth =
        2.5 *
        (1 - t);


      ctx.beginPath();


      ctx.arc(

        p.x,

        p.y,

        RADIUS +
        t * 25,

        0,
        Math.PI * 2

      );


      ctx.stroke();


      ctx.restore();

    }

  }


  /* ==========================================================
     RINGS
  ========================================================== */

  function drawRings() {

    for (
      const ring of rings
    ) {

      const t =
        Math.min(
          1,
          ring.life /
          ring.max
        );


      ctx.save();


      ctx.globalAlpha =
        1 - t;


      ctx.strokeStyle =
        COLORS[
          ring.color
        ].light;


      ctx.lineWidth =
        3 *
        (1 - t);


      ctx.beginPath();


      ctx.arc(

        ring.x,

        ring.y,

        18 +
        t * 38,

        0,
        Math.PI * 2

      );


      ctx.stroke();


      ctx.restore();

    }

  }


  /* ==========================================================
     PARTICLES
  ========================================================== */

  function drawParticles() {

    for (
      const p of particles
    ) {

      const alpha =
        Math.max(
          0,
          1 -
          p.life /
          p.max
        );


      ctx.save();


      ctx.globalAlpha =
        alpha;


      ctx.fillStyle =
        COLORS[
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
     LAUNCHER
  ========================================================== */

  function drawLauncher() {

    const bounce =
      Math.sin(
        launcherBounce *
        Math.PI
      ) * 2;


    const recoil =
      launcherRecoil * 8;


    ctx.save();


    ctx.translate(
      SHOOTER_X,
      SHOOTER_Y +
      bounce
    );


    /*
      Glow
    */

    const glow =
      ctx.createRadialGradient(
        0,
        22,
        5,
        0,
        22,
        82
      );


    glow.addColorStop(
      0,
      "rgba(91,150,220,.27)"
    );


    glow.addColorStop(
      1,
      "rgba(91,150,220,0)"
    );


    ctx.fillStyle =
      glow;


    ctx.beginPath();


    ctx.ellipse(
      0,
      22,
      80,
      35,
      0,
      0,
      Math.PI * 2
    );


    ctx.fill();


    /*
      Metal
    */

    const metal =
      ctx.createLinearGradient(
        0,
        0,
        0,
        60
      );


    metal.addColorStop(
      0,
      "#a3c8ed"
    );


    metal.addColorStop(
      .45,
      "#527fb7"
    );


    metal.addColorStop(
      1,
      "#203c69"
    );


    /*
      Left fin
    */

    ctx.fillStyle =
      metal;


    ctx.beginPath();


    ctx.moveTo(
      -45,
      18
    );


    ctx.lineTo(
      -70,
      35
    );


    ctx.lineTo(
      -47,
      45
    );


    ctx.closePath();


    ctx.fill();


    /*
      Right fin
    */

    ctx.beginPath();


    ctx.moveTo(
      45,
      18
    );


    ctx.lineTo(
      70,
      35
    );


    ctx.lineTo(
      47,
      45
    );


    ctx.closePath();


    ctx.fill();


    /*
      Main cannon body
    */

    ctx.beginPath();


    ctx.roundRect(
      -53,
      17,
      106,
      48,
      24
    );


    ctx.fill();


    ctx.strokeStyle =
      "rgba(220,238,255,.38)";


    ctx.lineWidth =
      1.7;


    ctx.stroke();


    /*
      Inner cradle
    */

    ctx.fillStyle =
      "#10294e";


    ctx.beginPath();


    ctx.arc(
      0,
      17,
      31,
      Math.PI,
      Math.PI * 2
    );


    ctx.fill();


    ctx.strokeStyle =
      "#91bced";


    ctx.lineWidth =
      3;


    ctx.beginPath();


    ctx.arc(
      0,
      17,
      29,
      Math.PI,
      Math.PI * 2
    );


    ctx.stroke();


    /*
      Pivot
    */

    ctx.fillStyle =
      "#e2efff";


    ctx.beginPath();


    ctx.arc(
      0,
      17,
      6,
      0,
      Math.PI * 2
    );


    ctx.fill();


    /*
      Current bubble
    */

    if (
      currentSpecial
    ) {

      drawSpecialBubble(

        0,

        -2 - recoil,

        currentSpecial,

        1.02

      );

    }
    else {

      drawBubble(

        0,

        -2 - recoil,

        currentColor,

        1.02

      );

    }


    ctx.restore();


    drawAimGuide();

  }


  /* ==========================================================
     AIM GUIDE
  ========================================================== */

  function drawAimGuide() {

    if (
      busy ||
      paused ||
      gameEnded ||
      levelWon
    )
      return;


    let dx =
      aimX -
      SHOOTER_X;


    let dy =
      aimY -
      SHOOTER_Y;


    if (
      dy > -55
    ) {

      dy = -55;

    }


    const length =
      Math.hypot(
        dx,
        dy
      ) || 1;


    const ux =
      dx /
      length;


    const uy =
      dy /
      length;


    ctx.save();


    ctx.setLineDash([
      6,
      9
    ]);


    ctx.lineWidth =
      1.7;


    ctx.strokeStyle =
      "rgba(222,237,255,.56)";


    ctx.shadowColor =
      "rgba(100,160,225,.25)";


    ctx.shadowBlur =
      7;


    ctx.beginPath();


    ctx.moveTo(
      SHOOTER_X,
      SHOOTER_Y - 3
    );


    ctx.lineTo(

      SHOOTER_X +
      ux * 245,

      SHOOTER_Y +
      uy * 245

    );


    ctx.stroke();


    ctx.restore();

  }


  /* ==========================================================
     EASING
  ========================================================== */

  function easeOutBack(t) {

    const c1 =
      1.70158;


    const c3 =
      c1 + 1;


    return (

      1 +

      c3 *
      Math.pow(
        t - 1,
        3
      ) +

      c1 *
      Math.pow(
        t - 1,
        2
      )

    );

  }


  /* ==========================================================
     INPUT
  ========================================================== */

  function updateAim(
    clientX,
    clientY
  ) {

    const rect =
      canvas.getBoundingClientRect();


    aimX =
      (
        clientX -
        rect.left
      ) *
      W /
      rect.width;


    aimY =
      (
        clientY -
        rect.top
      ) *
      H /
      rect.height;


    aimX =
      Math.max(
        5,
        Math.min(
          W - 5,
          aimX
        )
      );


    aimY =
      Math.max(
        80,
        Math.min(
          SHOOTER_Y - 25,
          aimY
        )
      );

  }


  canvas.addEventListener(
    "pointermove",
    event => {

      updateAim(
        event.clientX,
        event.clientY
      );

    }
  );


  canvas.addEventListener(
    "pointerdown",
    event => {

      event.preventDefault();


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

    levelNumber.textContent =
      save.currentLevel;


    scoreText.textContent =
      score;


    bestText.textContent =
      Math.max(
        save.best,
        score
      );


    setPreviewColor(
      currentBubble,
      currentColor,
      currentSpecial
    );


    setPreviewColor(
      nextBubble,
      nextColor,
      nextSpecial
    );


    if (
      pressureDots
    ) {

      const dots =
        pressureDots.querySelectorAll(
          "i"
        );


      dots.forEach(
        (
          dot,
          index
        ) => {

          if (
            index <
            missedShots
          ) {

            dot.style.background =
              "#d8b56a";


            dot.style.boxShadow =
              "0 0 8px rgba(216,181,106,.5)";

          }
          else {

            dot.style.background =
              "rgba(166,194,224,.32)";


            dot.style.boxShadow =
              "inset 0 1px rgba(255,255,255,.2)";

          }

        }
      );

    }


    if (
      soundBtn
    ) {

      soundBtn.textContent =
        save.sound
          ? "🔊"
          : "🔇";

    }

  }


  function setPreviewColor(
    element,
    index,
    special
  ) {

    if (!element)
      return;


    if (special) {

      if (
        special === "laser"
      ) {

        element.style.background =
          "radial-gradient(circle at 30% 25%,#fff,#9ee7ff 18%,#368fd4 55%,#173d72)";

      }

      else if (
        special === "bomb"
      ) {

        element.style.background =
          "radial-gradient(circle at 30% 25%,#ffb8a8,#d94b43 45%,#260d17)";

      }

      else if (
        special === "rainbow"
      ) {

        element.style.background =
          "linear-gradient(135deg,#ff687b,#ffcf63,#75df9b,#69b9ff,#b277e0)";

      }

      else {

        element.style.background =
          "radial-gradient(circle at 30% 25%,#fffde2,#ffe98a 25%,#e3a928 65%,#9b5710)";

      }


      element.style.boxShadow =
        "0 0 14px rgba(160,210,255,.38), inset 4px 4px 8px rgba(255,255,255,.5)";


      return;

    }


    const c =
      COLORS[index];


    element.style.background =

      `radial-gradient(
        circle at 30% 25%,
        #ffffff 0%,
        ${c.light} 17%,
        ${c.main} 52%,
        ${c.dark} 100%
      )`;


    element.style.boxShadow =
      "inset 5px 4px 7px rgba(255,255,255,.6), inset -6px -7px 9px rgba(0,0,0,.24), 0 6px 12px rgba(0,0,0,.23)";

  }


  function showMessage(text) {

    if (message) {

      message.textContent =
        text;

    }

  }


  /* ==========================================================
     SCREENS
  ========================================================== */

  function showScreen(screen) {

    homeScreen.classList.add(
      "hidden"
    );

    levelsScreen.classList.add(
      "hidden"
    );

    gameScreen.classList.add(
      "hidden"
    );


    screen.classList.remove(
      "hidden"
    );

  }


  /* ==========================================================
     LEVELS
  ========================================================== */

  function renderLevels() {

    levelsGrid.innerHTML =
      "";


    for (
      let level = 1;
      level <= MAX_LEVEL;
      level++
    ) {

      const button =
        document.createElement(
          "button"
        );


      const unlocked =
        level <=
        save.unlocked;


      const completed =
        save.completed.includes(
          level
        );


      button.className =
        "level-btn " +
        (
          unlocked
            ? "open"
            : "locked"
        ) +
        (
          completed
            ? " done"
            : ""
        );


      if (unlocked) {

        button.innerHTML =

          `${level}` +

          (
            completed
              ? `<span class="level-star">⭐</span>`
              : ""
          );


        button.onclick =
          () => {

            save.currentLevel =
              level;


            saveGame();


            showScreen(
              gameScreen
            );


            createLevel();

          };

      }
      else {

        button.innerHTML =
          "🔒";

      }


      levelsGrid.appendChild(
        button
      );

    }

  }


  /* ==========================================================
     SETTINGS
  ========================================================== */

  settingsBtn.onclick =
    () => {

      settingsPanel.classList.remove(
        "hidden"
      );

    };


  closeSettingsBtn.onclick =
    () => {

      settingsPanel.classList.add(
        "hidden"
      );

    };


  resetProgressBtn.onclick =
    () => {

      const confirmed =
        window.confirm(
          "क्या आप पूरी खेल प्रगति रीसेट करना चाहते हैं?"
        );


      if (!confirmed)
        return;


      save = {

        currentLevel: 1,

        unlocked: 1,

        completed: [],

        bestScores: {},

        score: 0,

        best: 0,

        sound: true

      };


      saveGame();


      settingsPanel.classList.add(
        "hidden"
      );


      renderLevels();


      showScreen(
        levelsScreen
      );

    };


  /* ==========================================================
     SOUND
  ========================================================== */

  function initAudio() {

    if (!save.sound)
      return;


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

    } catch {}

  }


  function playSound(
    frequency,
    duration,
    type = "sine",
    volume = .03
  ) {

    if (!save.sound)
      return;


    try {

      initAudio();


      if (!audioContext)
        return;


      const oscillator =
        audioContext.createOscillator();


      const gain =
        audioContext.createGain();


      oscillator.type =
        type;


      oscillator.frequency.setValueAtTime(
        frequency,
        audioContext.currentTime
      );


      gain.gain.setValueAtTime(
        volume,
        audioContext.currentTime
      );


      gain.gain.exponentialRampToValueAtTime(
        .001,
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
        duration

      );

    } catch {}

  }


  soundBtn.onclick =
    () => {

      save.sound =
        !save.sound;


      saveGame();


      updateUI();

    };


  /* ==========================================================
     RESULT
  ========================================================== */

  function showResult(success) {

    resultPanel.classList.remove(
      "hidden"
    );


    resultIcon.textContent =
      success
        ? "🪷"
        : "⬇️";


    resultTitle.textContent =
      success
        ? "बहुत बढ़िया!"
        : "छत बहुत नीचे आ गई";


    resultText.textContent =
      success

        ? (
            save.currentLevel >=
            MAX_LEVEL

              ? "गजब! आपने सभी 50 स्तर पूरे कर लिए।"

              : "बुलबुले मिलाकर स्तर पूरा कर दिया!"
          )

        : "कोई बात नहीं। फिर से कोशिश करते हैं।";


    resultScore.textContent =
      score;


    resultPrimaryBtn.textContent =

      success

        ? (
            save.currentLevel <
            MAX_LEVEL

              ? "अगला स्तर"

              : "स्तर चुनें"
          )

        : "फिर से खेलें";


    resultPrimaryBtn.onclick =
      () => {

        resultPanel.classList.add(
          "hidden"
        );


        if (
          success &&
          save.currentLevel <
          MAX_LEVEL
        ) {

          save.currentLevel++;


          saveGame();


          createLevel();

        }

        else if (
          success
        ) {

          renderLevels();


          showScreen(
            levelsScreen
          );

        }

        else {

          score = 0;


          createLevel();

        }

      };


    resultSecondaryBtn.onclick =
      () => {

        resultPanel.classList.add(
          "hidden"
        );


        renderLevels();


        showScreen(
          levelsScreen
        );

      };

  }


  /* ==========================================================
     NAVIGATION
  ========================================================== */

  startBtn.onclick =
    () => {

      renderLevels();

      showScreen(
        levelsScreen
      );

    };


  homeLevelsBtn.onclick =
    () => {

      renderLevels();

      showScreen(
        levelsScreen
      );

    };


  backHomeBtn.onclick =
    () => {

      showScreen(
        homeScreen
      );

    };


  gameBackBtn.onclick =
    () => {

      renderLevels();

      showScreen(
        levelsScreen
      );

    };


  /* ==========================================================
     VISIBILITY
  ========================================================== */

  document.addEventListener(
    "visibilitychange",
    () => {

      if (
        document.hidden
      ) {

        paused = true;

      }

    }
  );


  /* ==========================================================
     GAME LOOP
  ========================================================== */

  function loop(timestamp) {

    const dt =
      Math.min(

        .033,

        (
          timestamp -
          lastTime
        ) /
        1000 ||
        0

      );


    lastTime =
      timestamp;


    if (
      !gameScreen.classList.contains(
        "hidden"
      )
    ) {

      update(dt);

      draw();

    }


    requestAnimationFrame(
      loop
    );

  }


  /* ==========================================================
     INITIALIZE
  ========================================================== */

  score = 0;

  updateUI();

  renderLevels();

  showScreen(
    homeScreen
  );

  requestAnimationFrame(
    loop
  );


})();
