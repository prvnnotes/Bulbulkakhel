/* ============================================================
   BULBULE KA KHEL
   PREMIUM MITHILA BUBBLE SHOOTER
   SOFT / BOUNCY EDITION
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
     COLORS
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
     SPECIALS
  ========================================================== */

  const SPECIAL = {

    laser: {
      icon: "⚡"
    },

    bomb: {
      icon: "💣"
    },

    rainbow: {
      icon: "🌈"
    },

    sun: {
      icon: "☀"
    }

  };


  /* ==========================================================
     SAVE
  ========================================================== */

  const SAVE_KEY =
    "bulbuleKaKhelSave";


  let save =
    loadSave();


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
        localStorage.getItem(
          SAVE_KEY
        );


      if (!raw)
        return fallback;


      const data =
        JSON.parse(raw);


      return {

        ...fallback,
        ...data,

        currentLevel:
          Number(
            data.currentLevel || 1
          ),

        unlocked:
          Math.max(
            1,
            Number(
              data.unlocked || 1
            )
          ),

        completed:
          Array.isArray(
            data.completed
          )
            ? data.completed
            : [],

        bestScores:
          data.bestScores || {},

        score:
          Number(
            data.score || 0
          ),

        best:
          Number(
            data.best || 0
          ),

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
     STATE
  ========================================================== */

  let grid = [];

  let currentColor = 0;
  let nextColor = 1;

  let currentSpecial = null;
  let nextSpecial = null;

  let score = 0;
  let missedShots = 0;

  let busy = false;
  let paused = false;

  let gameEnded = false;
  let levelWon = false;

  let movingBubble = null;

  let fallingBubbles = [];

  let popEffects = [];

  let particles = [];

  let rings = [];

  let specialBursts = [];

  let impacts = [];

  let wobbleEffects = [];

  let ceilingAnimation = null;

  let launcherRecoil = 0;
  let launcherBounce = 0;

  let shake = 0;

  let specialCount = 0;

  let aimX = W / 2;
  let aimY = 280;

  let lastTime = 0;

  let audioContext = null;

  /* Touch state */

  let pointerHolding = false;
  let activePointerId = null;


  /* ==========================================================
     LEVEL CONFIG
  ========================================================== */

  function levelConfig() {

    const level =
      save.currentLevel;


    let rows = 6;

    if (level >= 11)
      rows = 7;

    if (level >= 21)
      rows = 8;

    if (level >= 31)
      rows = 9;

    if (level >= 41)
      rows = 10;


    let colors = 3;

    if (level >= 7)
      colors = 4;

    if (level >= 17)
      colors = 5;

    if (level >= 31)
      colors = 6;


    return {
      rows,
      colors
    };

  }


  function randomColor() {

    return Math.floor(
      Math.random() *
      levelConfig().colors
    );

  }


  /* ==========================================================
     SPECIAL CHOICE
  ========================================================== */

  function chooseSpecial() {

    if (
      save.currentLevel < 4
    ) {

      return null;

    }


    if (
      specialCount >=
      MAX_SPECIALS_PER_LEVEL
    ) {

      return null;

    }


    /*
      Rare enough that normal
      balls remain dominant.
    */

    if (
      Math.random() > 0.055
    ) {

      return null;

    }


    specialCount++;


    const roll =
      Math.random();


    if (roll < 0.34)
      return "laser";


    if (roll < 0.66)
      return "bomb";


    if (roll < 0.88)
      return "rainbow";


    return "sun";

  }


  function makeBubble() {

    return {

      color:
        randomColor(),

      special:
        chooseSpecial(),

      squish: 0,
      wobble: 0

    };

  }


  /* ==========================================================
     GRID
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

        let bubble =
          makeBubble();


        /*
          Slight empty spaces only
          after early levels.
        */

        if (
          r > 1 &&
          save.currentLevel >= 8 &&
          Math.random() < 0.045
        ) {

          bubble = null;

        }


        row.push(
          bubble
        );

      }


      grid.push(row);

    }


    /*
      Top row must be solid enough.
    */

    for (
      let q = 0;
      q < COLS;
      q++
    ) {

      if (
        !grid[0][q]
      ) {

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

    popEffects = [];
    particles = [];
    rings = [];

    specialBursts = [];
    impacts = [];
    wobbleEffects = [];

    ceilingAnimation = null;

    launcherRecoil = 0;
    launcherBounce = 0;

    shake = 0;


    updateUI();


    showMessage(
      "निशाना लगाइए और बुलबुला छोड़िए"
    );

  }


  function removeStartingMatches() {

    for (
      let pass = 0;
      pass < 10;
      pass++
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


          if (
            !bubble ||
            bubble.special
          ) {

            continue;

          }


          const group =
            findCluster(
              q,
              r,
              bubble.color
            );


          if (
            group.length >= 3
          ) {

            const target =
              group[
                Math.floor(
                  Math.random() *
                  group.length
                )
              ];


            grid[
              target[1]
            ][
              target[0]
            ] = {

              color:
                randomColor(),

              special:
                null,

              squish: 0,
              wobble: 0

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
     POSITION
  ========================================================== */

  function getX(
    q,
    r
  ) {

    return (
      RADIUS +
      q * DIAMETER +
      (
        r % 2
          ? RADIUS
          : 0
      )
    );

  }


  function getY(r) {

    return (
      TOP_Y +
      r * ROW_HEIGHT
    );

  }


  function getPosition(
    q,
    r
  ) {

    return {

      x:
        getX(q, r),

      y:
        getY(r)

    };

  }


  function inside(
    q,
    r
  ) {

    return (
      q >= 0 &&
      q < COLS &&
      r >= 0 &&
      r < grid.length
    );

  }


  function getNeighbors(
    q,
    r
  ) {

    const odd =
      r % 2 === 1;


    const offsets = odd

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


    return offsets
      .map(
        ([dq, dr]) =>
          [
            q + dq,
            r + dr
          ]
      )
      .filter(
        ([nq, nr]) =>
          inside(
            nq,
            nr
          )
      );

  }


  /* ==========================================================
     CLUSTER
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


    const stack = [
      [startQ, startR]
    ];


    const visited =
      new Set();


    const result = [];


    while (
      stack.length
    ) {

      const [
        q,
        r
      ] =
        stack.pop();


      const key =
        `${q},${r}`;


      if (
        visited.has(key)
      ) {

        continue;

      }


      visited.add(
        key
      );


      const bubble =
        grid[r]?.[q];


      if (
        !bubble ||
        bubble.special ||
        bubble.color !== color
      ) {

        continue;

      }


      result.push(
        [q, r]
      );


      for (
        const [
          nq,
          nr
        ]
        of getNeighbors(q, r)
      ) {

        stack.push(
          [nq, nr]
        );

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

        connected.add(
          `${q},0`
        );


        stack.push(
          [q, 0]
        );

      }

    }


    while (
      stack.length
    ) {

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
        ) {

          continue;

        }


        const key =
          `${nq},${nr}`;


        if (
          connected.has(key)
        ) {

          continue;

        }


        connected.add(
          key
        );


        stack.push(
          [nq, nr]
        );

      }

    }


    return connected;

  }


  /* ==========================================================
     BEST ATTACHMENT
  ========================================================== */

  function findBestAttachment(
    x,
    y
  ) {

    let best = null;
    let bestDistance = Infinity;


    /*
      First look only at empty cells
      touching another bubble.
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
        ) {

          continue;

        }


        const neighbors =
          getNeighbors(
            q,
            r
          );


        const attached =
          neighbors.some(
            ([nq, nr]) =>
              Boolean(
                grid[nr]?.[nq]
              )
          );


        if (
          !attached
        ) {

          continue;

        }


        const p =
          getPosition(
            q,
            r
          );


        const d =
          Math.hypot(
            p.x - x,
            p.y - y
          );


        if (
          d <
          bestDistance
        ) {

          bestDistance = d;
          best = [q, r];

        }

      }

    }


    /*
      Fallback.
    */

    if (!best) {

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

            continue;

          }


          const p =
            getPosition(
              q,
              r
            );


          const d =
            Math.hypot(
              p.x - x,
              p.y - y
            );


          if (
            d <
            bestDistance
          ) {

            bestDistance = d;
            best = [q, r];

          }

        }

      }

    }


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
      ceilingAnimation ||
      !movingBubble
        && false
    ) {
      return;
    }


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


    const speed =
      880;


    movingBubble = {

      x:
        SHOOTER_X,

      y:
        SHOOTER_Y - 4,

      vx:
        (
          dx /
          distance
        ) *
        speed,

      vy:
        (
          dy /
          distance
        ) *
        speed,

      color:
        currentColor,

      special:
        currentSpecial,

      scale:
        0.82,

      squash:
        0,

      rotation: 0,

      trail: []

    };


    currentColor =
      nextColor;


    currentSpecial =
      nextSpecial;


    nextColor =
      randomColor();


    nextSpecial =
      chooseSpecial();


    updateUI();


    playSound(
      330,
      0.06,
      "sine",
      0.025
    );

  }


  /* ==========================================================
     FINISH SHOT
  ========================================================== */

  function finishMovingBubble() {

    if (
      !movingBubble
    ) {

      return;

    }


    const shot =
      movingBubble;


    const [
      q,
      r
    ] =
      findBestAttachment(
        shot.x,
        shot.y
      );


    const attached = {

      color:
        shot.color,

      special:
        shot.special || null,

      squish:
        0.95,

      wobble:
        0

    };


    grid[r][q] =
      attached;


    const p =
      getPosition(
        q,
        r
      );


    movingBubble =
      null;


    /*
      Soft impact.
    */

    impacts.push({

      x: p.x,
      y: p.y,

      life: 0,

      max: 0.28,

      strength: 1

    });


    createParticles(
      p.x,
      p.y,
      attached.color,
      6
    );


    rings.push({

      x: p.x,
      y: p.y,

      color:
        attached.color,

      life: 0,

      max: 0.28

    });


    /*
      Special bubble.
    */

    if (
      attached.special
    ) {

      activateSpecial(
        q,
        r,
        attached.special
      );

      return;

    }


    /*
      Normal match.
    */

    const group =
      findCluster(
        q,
        r,
        attached.color
      );


    if (
      group.length >= 3
    ) {

      handleMatch(
        group
      );

    } else {

      /*
        Give nearby balls a little
        soft wobble.
      */

      softWobbleAround(
        q,
        r
      );


      missedShots++;


      if (
        missedShots >=
        MISS_LIMIT
      ) {

        missedShots = 0;


        setTimeout(
          () => {
            descendCeiling();
          },
          80
        );


      } else {

        showMessage(
          missedShots === 1
            ? "अच्छा निशाना!"
            : "बस एक मौका और…"
        );


        busy = false;

      }

    }


    updateUI();


    if (
      isBoardEmpty()
    ) {

      completeLevel();

    }

  }


  /* ==========================================================
     SOFT WOBBLE
  ========================================================== */

  function softWobbleAround(
    centerQ,
    centerR
  ) {

    const nearby =
      getNeighbors(
        centerQ,
        centerR
      );


    nearby.forEach(
      ([q, r], index) => {

        const bubble =
          grid[r]?.[q];


        if (!bubble)
          return;


        bubble.wobble =
          0.8;


        wobbleEffects.push({

          q,
          r,

          life: 0,

          max:
            0.32 +
            index * 0.025

        });

      }
    );

  }


  /* ==========================================================
     MATCH
  ========================================================== */

  function handleMatch(
    group
  ) {

    missedShots = 0;


    const size =
      group.length;


    score +=
      size *
      20;


    if (
      size >= 5
    ) {

      score +=
        size *
        10;

    }


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
        getPosition(
          q,
          r
        );


      /*
        Squish all neighbouring
        bubbles before pop.
      */

      softWobbleAround(
        q,
        r
      );


      grid[r][q] =
        null;


      popEffects.push({

        x: p.x,
        y: p.y,

        color:
          bubble.color,

        special:
          bubble.special || null,

        life: 0,

        max:
          0.42 +
          Math.random() * 0.1,

        delay:
          Math.random() * 0.06,

        seed:
          Math.random() *
          Math.PI *
          2

      });


      createParticles(
        p.x,
        p.y,
        bubble.color,
        13
      );

    }


    if (
      size >= 7
    ) {

      showMessage(
        "गजब कऽ देलियै! ✨"
      );

    }

    else if (
      size >= 5
    ) {

      showMessage(
        "अहाँ कमाल कऽ देलियै!"
      );

    }

    else {

      showMessage(
        "बहुत नीक! 😄"
      );

    }


    shake =
      Math.min(
        7,
        2 +
        size *
        .35
      );


    playSound(
      440 +
      size *
      35,
      0.14,
      "sine",
      0.045
    );


    setTimeout(
      () => {

        if (
          gameEnded ||
          levelWon
        ) {

          return;

        }


        const dropped =
          dropDetached();


        if (
          dropped
        ) {

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
      220
    );

  }


  /* ==========================================================
     DROP DETACHED
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
        ) {

          continue;

        }


        const p =
          getPosition(
            q,
            r
          );


        /*
          These are the soft-body
          starting values.
        */

        fallingBubbles.push({

          x: p.x,
          y: p.y,

          color:
            bubble.color,

          special:
            bubble.special,

          vx:
            (
              Math.random() -
              0.5
            ) *
            95,

          vy:
            -55 -
            Math.random() *
            80,

          gravity:
            410,

          rotation:
            Math.random() *
            Math.PI *
            2,

          spin:
            (
              Math.random() -
              0.5
            ) *
            5,

          scale:
            0.98,

          squash:
            0.85,

          stretch:
            1.1,

          bounce:
            0,

          life: 0,

          grounded:
            false,

          floorY:
            H + 45 +

            Math.random() *
            80

        });


        grid[r][q] =
          null;


        count++;

      }

    }


    if (
      count
    ) {

      showMessage(
        count >= 8
          ? "गजब कऽ देलियै! 💫"
          : "अहाँ कमाल कऽ देलियै!"
      );


      playSound(
        170,
        0.18,
        "triangle",
        0.035
      );

    }


    return count;

  }


  /* ==========================================================
     SPECIALS
  ========================================================== */

  function activateSpecial(
    q,
    r,
    type
  ) {

    const p =
      getPosition(
        q,
        r
      );


    grid[r][q] =
      null;


    specialBursts.push({

      x: p.x,
      y: p.y,

      type,

      life: 0,

      max:
        type === "bomb"
          ? 0.78
          : 0.65

    });


    missedShots = 0;


    shake =
      type === "bomb"
        ? 12
        : 7;


    if (
      type === "laser"
    ) {

      activateLaser(
        q,
        r
      );

    }

    else if (
      type === "bomb"
    ) {

      activateBomb(
        q,
        r
      );

    }

    else if (
      type === "rainbow"
    ) {

      activateRainbow();

    }

    else if (
      type === "sun"
    ) {

      activateSun();

    }

  }


  function clearBubbleAt(
    q,
    r
  ) {

    const bubble =
      grid[r]?.[q];


    if (!bubble)
      return;


    const p =
      getPosition(
        q,
        r
      );


    grid[r][q] =
      null;


    popEffects.push({

      x: p.x,

      y: p.y,

      color:
        bubble.color,

      special:
        bubble.special || null,

      life: 0,

      max:
        0.42 +
        Math.random() * 0.08,

      delay:
        Math.random() * 0.05,

      seed:
        Math.random()

    });


    createParticles(
      p.x,
      p.y,
      bubble.color,
      11
    );

  }


  /* ==========================================================
     LASER
  ========================================================== */

  function activateLaser(
    q,
    r
  ) {

    showMessage(
      "⚡ लेज़र चला!"
    );


    for (
      let col = 0;
      col < COLS;
      col++
    ) {

      if (
        grid[r]?.[col]
      ) {

        clearBubbleAt(
          col,
          r
        );

      }

    }


    for (
      let row = 0;
      row < grid.length;
      row++
    ) {

      if (
        grid[row]?.[q]
      ) {

        clearBubbleAt(
          q,
          row
        );

      }

    }


    playSound(
      720,
      0.22,
      "sawtooth",
      0.04
    );


    setTimeout(
      specialFinish,
      280
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
      "💥 बम का धमाका!"
    );


    const center =
      getPosition(
        q,
        r
      );


    for (
      let row = 0;
      row < grid.length;
      row++
    ) {

      for (
        let col = 0;
        col < COLS;
        col++
      ) {

        const bubble =
          grid[row][col];


        if (!bubble)
          continue;


        const p =
          getPosition(
            col,
            row
          );


        const distance =
          Math.hypot(
            p.x - center.x,
            p.y - center.y
          );


        if (
          distance <= 100
        ) {

          clearBubbleAt(
            col,
            row
          );

        }

      }

    }


    playSound(
      110,
      0.3,
      "sawtooth",
      0.05
    );


    setTimeout(
      specialFinish,
      300
    );

  }


  /* ==========================================================
     MOST COMMON COLOR
  ========================================================== */

  function getMostCommonColor() {

    const counts = {};


    for (
      const row
      of grid
    ) {

      for (
        const bubble
        of row
      ) {

        if (
          !bubble ||
          bubble.special
        ) {

          continue;

        }


        counts[bubble.color] =
          (
            counts[bubble.color] ||
            0
          ) + 1;

      }

    }


    let bestColor = 0;
    let bestCount = -1;


    for (
      const key
      in counts
    ) {

      if (
        counts[key] >
        bestCount
      ) {

        bestCount =
          counts[key];

        bestColor =
          Number(key);

      }

    }


    return bestColor;

  }


  /* ==========================================================
     RAINBOW
  ========================================================== */

  function activateRainbow() {

    showMessage(
      "🌈 रंगों का जादू!"
    );


    clearColor(
      getMostCommonColor()
    );

  }


  /* ==========================================================
     SUN
  ========================================================== */

  function activateSun() {

    showMessage(
      "☀️ सुनहरी चमक!"
    );


    clearColor(
      getMostCommonColor()
    );

  }


  function clearColor(
    color
  ) {

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


        if (
          !bubble ||
          bubble.special ||
          bubble.color !== color
        ) {

          continue;

        }


        clearBubbleAt(
          q,
          r
        );

      }

    }


    playSound(
      560,
      0.2,
      "sine",
      0.04
    );


    setTimeout(
      specialFinish,
      300
    );

  }


  function specialFinish() {

    const dropped =
      dropDetached();


    if (
      dropped
    ) {

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

  }


  /* ==========================================================
     CEILING
  ========================================================== */

  function descendCeiling() {

    if (
      ceilingAnimation
    ) {

      return;

    }


    const row = [];


    for (
      let q = 0;
      q < COLS;
      q++
    ) {

      row.push(
        makeBubble()
      );

    }


    grid.unshift(
      row
    );


    ceilingAnimation = {

      life: 0,

      max: 0.45

    };


    showMessage(
      "छत एक पंक्ति नीचे आ गई!"
    );


    playSound(
      120,
      0.15,
      "sawtooth",
      0.025
    );


    /*
      Add a soft shake.
    */

    for (
      let r = 0;
      r < Math.min(
        2,
        grid.length
      );
      r++
    ) {

      for (
        let q = 0;
        q < COLS;
        q++
      ) {

        const bubble =
          grid[r]?.[q];


        if (bubble) {

          bubble.wobble =
            0.65;

        }

      }

    }


    if (
      getHighestBubbleY() >=
      DANGER_Y
    ) {

      endGame();

    }

  }


  function getHighestBubbleY() {

    let highest =
      Infinity;


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

          highest =
            Math.min(
              highest,
              getY(r)
            );

        }

      }

    }


    return highest;

  }


  /* ==========================================================
     BOARD EMPTY
  ========================================================== */

  function isBoardEmpty() {

    for (
      const row
      of grid
    ) {

      for (
        const bubble
        of row
      ) {

        if (bubble)
          return false;

      }

    }


    return true;

  }


  /* ==========================================================
     WIN
  ========================================================== */

  function completeLevel() {

    if (
      levelWon
    ) {

      return;

    }


    levelWon = true;
    busy = true;


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
      Math.max(
        save.unlocked,
        Math.min(
          MAX_LEVEL,
          save.currentLevel + 1
        )
      );


    save.bestScores[
      save.currentLevel
    ] =
      Math.max(
        save.bestScores[
          save.currentLevel
        ] || 0,
        score
      );


    save.best =
      Math.max(
        save.best,
        score
      );


    save.score =
      score;


    saveGame();


    showMessage(
      "बहुत बढ़िया! स्तर पूरा भऽ गेल।"
    );


    playSound(
      720,
      0.25,
      "sine",
      0.055
    );


    /*
      Little celebration.
    */

    for (
      let i = 0;
      i < 28;
      i++
    ) {

      createCelebrationParticle();

    }


    setTimeout(
      () => {

        showResult(
          true
        );

      },
      700
    );

  }


  /* ==========================================================
     LOSE
  ========================================================== */

  function endGame() {

    if (
      gameEnded
    ) {

      return;

    }


    gameEnded = true;
    busy = true;


    showMessage(
      "छत बहुत नीचे आ गई"
    );


    playSound(
      100,
      0.3,
      "sawtooth",
      0.04
    );


    setTimeout(
      () => {

        showResult(
          false
        );

      },
      650
    );

  }


  /* ==========================================================
     CELEBRATION PARTICLES
  ========================================================== */

  function createCelebrationParticle() {

    particles.push({

      x:
        Math.random() *
        W,

      y:
        20 +
        Math.random() *
        150,

      vx:
        (
          Math.random() -
          0.5
        ) *
        160,

      vy:
        80 +
        Math.random() *
        120,

      color:
        Math.floor(
          Math.random() *
          COLORS.length
        ),

      size:
        2 +
        Math.random() *
        3,

      life: 0,

      max:
        0.8 +
        Math.random() *
        0.5

    });

  }


  /* ==========================================================
     PARTICLES
  ========================================================== */

  function createParticles(
    x,
    y,
    color,
    count
  ) {

    for (
      let i = 0;
      i < count;
      i++
    ) {

      const angle =
        Math.random() *
        Math.PI *
        2;


      const speed =
        55 +
        Math.random() *
        180;


      particles.push({

        x,
        y,

        vx:
          Math.cos(angle) *
          speed,

        vy:
          Math.sin(angle) *
          speed -
          55,

        color,

        size:
          1.5 +
          Math.random() *
          3.2,

        life: 0,

        max:
          0.35 +
          Math.random() *
          0.4

      });

    }

  }


  /* ==========================================================
     UPDATE
  ========================================================== */

  function update(dt) {

    launcherRecoil =
      Math.max(
        0,
        launcherRecoil -
        dt *
        5
      );


    launcherBounce =
      Math.max(
        0,
        launcherBounce -
        dt *
        4
      );


    shake =
      Math.max(
        0,
        shake -
        dt *
        18
      );


    /* --------------------------------------------------------
       Ceiling animation
    -------------------------------------------------------- */

    if (
      ceilingAnimation
    ) {

      ceilingAnimation.life +=
        dt;


      if (
        ceilingAnimation.life >=
        ceilingAnimation.max
      ) {

        ceilingAnimation =
          null;

      }

    }


    /* --------------------------------------------------------
       Grid bubble squish/wobble
    -------------------------------------------------------- */

    for (
      const row
      of grid
    ) {

      for (
        const bubble
        of row
      ) {

        if (!bubble)
          continue;


        if (
          bubble.squish > 0
        ) {

          bubble.squish -=
            dt * 5;

        }


        if (
          bubble.wobble > 0
        ) {

          bubble.wobble -=
            dt * 3.7;

        }

      }

    }


    /* --------------------------------------------------------
       Wobble effects
    -------------------------------------------------------- */

    for (
      let i =
        wobbleEffects.length - 1;
      i >= 0;
      i--
    ) {

      const effect =
        wobbleEffects[i];


      effect.life +=
        dt;


      if (
        effect.life >=
        effect.max
      ) {

        wobbleEffects.splice(
          i,
          1
        );

      }

    }


    /* --------------------------------------------------------
       Moving bubble
    -------------------------------------------------------- */

    if (
      movingBubble
    ) {

      const bubble =
        movingBubble;


      /*
        Trail.
      */

      bubble.trail.push({

        x:
          bubble.x,

        y:
          bubble.y,

        life: 0

      });


      if (
        bubble.trail.length > 11
      ) {

        bubble.trail.shift();

      }


      for (
        const trail
        of bubble.trail
      ) {

        trail.life +=
          dt;

      }


      /*
        Movement.
      */

      bubble.x +=
        bubble.vx *
        dt;


      bubble.y +=
        bubble.vy *
        dt;


      /*
        Slight rolling rotation.
      */

      bubble.rotation +=
        (
          bubble.vx /
          5000
        ) *
        dt;


      /*
        Side bounce.
      */

      if (
        bubble.x <
        RADIUS
      ) {

        bubble.x =
          RADIUS;


        bubble.vx =
          Math.abs(
            bubble.vx
          );


        bubble.squash =
          0.8;

      }


      if (
        bubble.x >
        W - RADIUS
      ) {

        bubble.x =
          W - RADIUS;


        bubble.vx =
          -Math.abs(
            bubble.vx
          );


        bubble.squash =
          0.8;

      }


      /*
        Recover squash.
      */

      bubble.squash +=
        (
          0 -
          bubble.squash
        ) *
        Math.min(
          1,
          dt * 15
        );


      let collision =
        false;


      /*
        Bubble collision.
      */

      for (
        let r = 0;
        r < grid.length &&
        !collision;
        r++
      ) {

        for (
          let q = 0;
          q < COLS;
          q++
        ) {

          if (
            !grid[r][q]
          ) {

            continue;

          }


          const p =
            getPosition(
              q,
              r
            );


          const distance =
            Math.hypot(
              p.x - bubble.x,
              p.y - bubble.y
            );


          if (
            distance <=
            DIAMETER - 3
          ) {

            collision =
              true;


            /*
              Tiny squash before
              attachment.
            */

            bubble.squash =
              1;


            grid[r][q].squish =
              1;


            grid[r][q].wobble =
              1;


            impacts.push({

              x:
                (
                  p.x +
                  bubble.x
                ) /
                2,

              y:
                (
                  p.y +
                  bubble.y
                ) /
                2,

              life: 0,

              max: 0.22,

              strength: 0.8

            });


            break;

          }

        }

      }


      /*
        Ceiling collision.
      */

      if (
        bubble.y <=
        TOP_Y +
        RADIUS
      ) {

        bubble.y =
          TOP_Y +
          RADIUS;


        collision =
          true;

      }


      if (
        collision
      ) {

        finishMovingBubble();

      }

    }


    /* --------------------------------------------------------
       Falling bubbles
    -------------------------------------------------------- */

    for (
      let i =
        fallingBubbles.length - 1;
      i >= 0;
      i--
    ) {

      const bubble =
        fallingBubbles[i];


      bubble.life +=
        dt;


      if (
        !bubble.grounded
      ) {

        /*
          Gravity.
        */

        bubble.vy +=
          bubble.gravity *
          dt;


        bubble.x +=
          bubble.vx *
          dt;


        bubble.y +=
          bubble.vy *
          dt;


        bubble.rotation +=
          bubble.spin *
          dt;


        /*
          Stretch while falling.
        */

        const fallSpeed =
          Math.abs(
            bubble.vy
          );


        bubble.stretch =
          1 +
          Math.min(
            0.28,
            fallSpeed /
            1500
          );


        bubble.squash =
          1 /
          bubble.stretch;


        /*
          Side walls.
        */

        if (
          bubble.x <
          RADIUS
        ) {

          bubble.x =
            RADIUS;


          bubble.vx =
            Math.abs(
              bubble.vx
            ) *
            0.78;


          bubble.squash =
            0.75;

        }


        if (
          bubble.x >
          W - RADIUS
        ) {

          bubble.x =
            W - RADIUS;


          bubble.vx =
            -Math.abs(
              bubble.vx
            ) *
            0.78;


          bubble.squash =
            0.75;

        }


        /*
          Soft bottom bounce.
        */

        const floor =
          Math.min(
            H - 25,
            bubble.floorY
          );


        if (
          bubble.y >= floor
        ) {

          bubble.y =
            floor;


          if (
            Math.abs(
              bubble.vy
            ) > 100
          ) {

            bubble.vy =
              -Math.abs(
                bubble.vy
              ) *
              0.48;


            bubble.vx *=
              0.88;


            bubble.squash =
              1.28;


            bubble.stretch =
              0.78;


            createParticles(
              bubble.x,
              bubble.y,
              bubble.color,
              3
            );


          } else {

            bubble.grounded =
              true;

          }

        }

      } else {

        /*
          Tiny final bounce /
          slide / exit.
        */

        bubble.vx *=
          Math.pow(
            0.35,
            dt
          );


        bubble.rotation +=
          bubble.spin *
          dt *
          0.35;


        bubble.squash +=
          (
            1 -
            bubble.squash
          ) *
          Math.min(
            1,
            dt * 10
          );


        if (
          bubble.life >
          1.5
        ) {

          bubble.y +=
            80 * dt;

        }

      }


      /*
        Remove after leaving.
      */

      if (
        bubble.y >
        H + 120
      ) {

        fallingBubbles.splice(
          i,
          1
        );

      }

    }


    /* --------------------------------------------------------
       Particles
    -------------------------------------------------------- */

    for (
      let i =
        particles.length - 1;
      i >= 0;
      i--
    ) {

      const p =
        particles[i];


      p.life +=
        dt;


      p.x +=
        p.vx *
        dt;


      p.y +=
        p.vy *
        dt;


      p.vy +=
        280 *
        dt;


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
       Pops
    -------------------------------------------------------- */

    for (
      let i =
        popEffects.length - 1;
      i >= 0;
      i--
    ) {

      const effect =
        popEffects[i];


      effect.life +=
        dt;


      if (
        effect.life >=
        effect.max +
        effect.delay
      ) {

        popEffects.splice(
          i,
          1
        );

      }

    }


    /* --------------------------------------------------------
       Rings
    -------------------------------------------------------- */

    for (
      let i =
        rings.length - 1;
      i >= 0;
      i--
    ) {

      const ring =
        rings[i];


      ring.life +=
        dt;


      if (
        ring.life >=
        ring.max
      ) {

        rings.splice(
          i,
          1
        );

      }

    }


    /* --------------------------------------------------------
       Impacts
    -------------------------------------------------------- */

    for (
      let i =
        impacts.length - 1;
      i >= 0;
      i--
    ) {

      const impact =
        impacts[i];


      impact.life +=
        dt;


      if (
        impact.life >=
        impact.max
      ) {

        impacts.splice(
          i,
          1
        );

      }

    }


    /* --------------------------------------------------------
       Special bursts
    -------------------------------------------------------- */

    for (
      let i =
        specialBursts.length - 1;
      i >= 0;
      i--
    ) {

      const burst =
        specialBursts[i];


      burst.life +=
        dt;


      if (
        burst.life >=
        burst.max
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


    if (
      shake > 0
    ) {

      ctx.translate(

        (
          Math.random() -
          0.5
        ) *
        shake,

        (
          Math.random() -
          0.5
        ) *
        shake

      );

    }


    drawBackground();

    drawCeiling();

    drawBubbles();

    drawFallingBubbles();

    drawAimGuide();

    drawLauncher();

    drawMovingBubble();

    drawPopEffects();

    drawRings();

    drawImpacts();

    drawParticles();

    drawSpecialBursts();


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
      "#1f3d70"
    );


    gradient.addColorStop(
      0.55,
      "#183360"
    );


    gradient.addColorStop(
      1,
      "#10294f"
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
      Subtle pattern.
    */

    ctx.save();


    ctx.globalAlpha =
      0.045;


    ctx.strokeStyle =
      "#efd987";


    for (
      let x = 25;
      x < W;
      x += 70
    ) {

      for (
        let y = 80;
        y < H;
        y += 100
      ) {

        ctx.beginPath();


        ctx.arc(
          x,
          y,
          18,
          0,
          Math.PI * 2
        );


        ctx.stroke();


        ctx.beginPath();


        ctx.moveTo(
          x - 14,
          y
        );


        ctx.lineTo(
          x + 14,
          y
        );


        ctx.moveTo(
          x,
          y - 14
        );


        ctx.lineTo(
          x,
          y + 14
        );


        ctx.stroke();

      }

    }


    ctx.restore();


    /*
      Mithila motifs.
    */

    ctx.save();


    ctx.globalAlpha =
      0.065;


    ctx.font =
      "42px serif";


    ctx.fillText(
      "🪷",
      18,
      215
    );


    ctx.fillText(
      "🐟",
      410,
      420
    );


    ctx.fillText(
      "🦚",
      25,
      590
    );


    ctx.fillText(
      "🪷",
      405,
      650
    );


    ctx.restore();


    /*
      Danger line.
    */

    ctx.save();


    ctx.globalAlpha =
      0.27;


    ctx.strokeStyle =
      "#d8bd6f";


    ctx.setLineDash(
      [5, 8]
    );


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
     CEILING
  ========================================================== */

  function drawCeiling() {

    ctx.save();


    ctx.globalAlpha =
      0.25;


    ctx.strokeStyle =
      "#d9bd70";


    ctx.lineWidth =
      2;


    ctx.beginPath();


    ctx.moveTo(
      12,
      28
    );


    ctx.lineTo(
      W - 12,
      28
    );


    ctx.stroke();


    ctx.restore();

  }


  /* ==========================================================
     BUBBLE DRAW
  ========================================================== */

  function drawBubbles() {

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
          getPosition(
            q,
            r
          );


        let scaleX = 1;
        let scaleY = 1;
        let offsetX = 0;
        let offsetY = 0;


        /*
          Soft wobble.
        */

        if (
          bubble.wobble > 0
        ) {

          const wobble =
            Math.sin(
              (
                bubble.wobble *
                15
              )
            ) *
            bubble.wobble;


          scaleX =
            1 +
            wobble *
            0.045;


          scaleY =
            1 -
            wobble *
            0.035;


          offsetX =
            Math.sin(
              bubble.wobble *
              19
            ) *
            bubble.wobble *
            2;

        }


        /*
          Soft impact squash.
        */

        if (
          bubble.squish > 0
        ) {

          scaleX *=
            1 +
            bubble.squish *
            0.16;


          scaleY *=
            1 -
            bubble.squish *
            0.12;

        }


        ctx.save();


        ctx.translate(
          p.x + offsetX,
          p.y
        );


        ctx.scale(
          scaleX,
          scaleY
        );


        if (
          bubble.special
        ) {

          drawSpecialBubble(
            0,
            0,
            bubble.special,
            1,
            1
          );

        } else {

          drawBubble(
            0,
            0,
            bubble.color,
            1,
            1
          );

        }


        ctx.restore();

      }

    }

  }


  /* ==========================================================
     NORMAL BUBBLE
  ========================================================== */

  function drawBubble(
    x,
    y,
    color,
    scale = 1,
    alpha = 1
  ) {

    const c =
      COLORS[color] ||
      COLORS[0];


    ctx.save();


    ctx.globalAlpha =
      alpha;


    ctx.translate(
      x,
      y
    );


    ctx.scale(
      scale,
      scale
    );


    const gradient =
      ctx.createRadialGradient(
        -7,
        -8,
        2,
        0,
        0,
        RADIUS
      );


    gradient.addColorStop(
      0,
      "#ffffff"
    );


    gradient.addColorStop(
      .16,
      c.light
    );


    gradient.addColorStop(
      .52,
      c.main
    );


    gradient.addColorStop(
      1,
      c.dark
    );


    ctx.fillStyle =
      gradient;


    ctx.beginPath();


    ctx.arc(
      0,
      0,
      RADIUS,
      0,
      Math.PI * 2
    );


    ctx.fill();


    ctx.strokeStyle =
      "rgba(255,255,255,.25)";


    ctx.lineWidth =
      1.4;


    ctx.stroke();


    /*
      Gloss.
    */

    ctx.fillStyle =
      "rgba(255,255,255,.36)";


    ctx.beginPath();


    ctx.arc(
      -7,
      -8,
      4,
      0,
      Math.PI * 2
    );


    ctx.fill();


    drawBubblePattern(
      c.pattern,
      c
    );


    ctx.restore();

  }


  /* ==========================================================
     BUBBLE PATTERN
  ========================================================== */

  function drawBubblePattern(
    pattern,
    c
  ) {

    ctx.save();


    ctx.globalAlpha =
      .2;


    ctx.strokeStyle =
      c.light;


    ctx.lineWidth =
      1;


    if (
      pattern === "lotus"
    ) {

      for (
        let i = 0;
        i < 5;
        i++
      ) {

        const a =
          -Math.PI *
          .8 +
          i *
          Math.PI *
          .4;


        ctx.beginPath();


        ctx.moveTo(
          0,
          7
        );


        ctx.quadraticCurveTo(
          Math.cos(a) * 10,
          Math.sin(a) * 8,
          Math.cos(a) * 14,
          Math.sin(a) * 3
        );


        ctx.stroke();

      }

    }


    else if (
      pattern === "sun"
    ) {

      ctx.beginPath();


      ctx.arc(
        0,
        0,
        8,
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
          Math.PI /
          4;


        ctx.beginPath();


        ctx.moveTo(
          Math.cos(a) * 10,
          Math.sin(a) * 10
        );


        ctx.lineTo(
          Math.cos(a) * 15,
          Math.sin(a) * 15
        );


        ctx.stroke();

      }

    }


    else if (
      pattern === "leaf"
    ) {

      ctx.beginPath();


      ctx.moveTo(
        -10,
        8
      );


      ctx.quadraticCurveTo(
        0,
        0,
        10,
        -8
      );


      ctx.stroke();


      ctx.beginPath();


      ctx.arc(
        -6,
        2,
        4,
        -.8,
        1.1
      );


      ctx.stroke();

    }


    else if (
      pattern === "wave"
    ) {

      ctx.beginPath();


      ctx.moveTo(
        -13,
        5
      );


      ctx.quadraticCurveTo(
        -7,
        -3,
        0,
        5
      );


      ctx.quadraticCurveTo(
        7,
        13,
        13,
        5
      );


      ctx.stroke();

    }


    else if (
      pattern === "peacock"
    ) {

      ctx.beginPath();


      ctx.arc(
        0,
        3,
        10,
        Math.PI,
        0
      );


      ctx.stroke();


      ctx.beginPath();


      ctx.arc(
        0,
        3,
        4,
        Math.PI,
        0
      );


      ctx.stroke();

    }


    else if (
      pattern === "flower"
    ) {

      for (
        let i = 0;
        i < 6;
        i++
      ) {

        const a =
          i *
          Math.PI /
          3;


        ctx.beginPath();


        ctx.arc(
          Math.cos(a) * 7,
          Math.sin(a) * 7,
          4,
          0,
          Math.PI * 2
        );


        ctx.stroke();

      }

    }


    ctx.restore();

  }


  /* ==========================================================
     SPECIAL BUBBLE
  ========================================================== */

  function drawSpecialBubble(
    x,
    y,
    type,
    scale = 1,
    alpha = 1
  ) {

    ctx.save();


    ctx.globalAlpha =
      alpha;


    ctx.translate(
      x,
      y
    );


    ctx.scale(
      scale,
      scale
    );


    let gradient;


    if (
      type === "laser"
    ) {

      gradient =
        ctx.createRadialGradient(
          -7,
          -8,
          2,
          0,
          0,
          RADIUS
        );


      gradient.addColorStop(
        0,
        "#ffffff"
      );


      gradient.addColorStop(
        .2,
        "#b8f3ff"
      );


      gradient.addColorStop(
        .6,
        "#4198dc"
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
          -8,
          2,
          0,
          0,
          RADIUS
        );


      gradient.addColorStop(
        0,
        "#ffd7cd"
      );


      gradient.addColorStop(
        .45,
        "#d94b43"
      );


      gradient.addColorStop(
        1,
        "#300d18"
      );

    }


    else if (
      type === "rainbow"
    ) {

      gradient =
        ctx.createLinearGradient(
          -20,
          -20,
          20,
          20
        );


      gradient.addColorStop(
        0,
        "#ff647c"
      );


      gradient.addColorStop(
        .25,
        "#ffcf62"
      );


      gradient.addColorStop(
        .5,
        "#70dc96"
      );


      gradient.addColorStop(
        .75,
        "#69b8ff"
      );


      gradient.addColorStop(
        1,
        "#ab70df"
      );

    }


    else {

      gradient =
        ctx.createRadialGradient(
          -7,
          -8,
          2,
          0,
          0,
          RADIUS
        );


      gradient.addColorStop(
        0,
        "#fffde2"
      );


      gradient.addColorStop(
        .25,
        "#ffe98a"
      );


      gradient.addColorStop(
        .65,
        "#e2a72d"
      );


      gradient.addColorStop(
        1,
        "#965514"
      );

    }


    ctx.fillStyle =
      gradient;


    ctx.beginPath();


    ctx.arc(
      0,
      0,
      RADIUS,
      0,
      Math.PI * 2
    );


    ctx.fill();


    ctx.strokeStyle =
      "rgba(255,255,255,.35)";


    ctx.lineWidth =
      1.5;


    ctx.stroke();


    ctx.fillStyle =
      "#ffffff";


    ctx.font =
      "bold 17px sans-serif";


    ctx.textAlign =
      "center";


    ctx.textBaseline =
      "middle";


    ctx.fillText(
      SPECIAL[type]?.icon ||
      "✦",
      0,
      1
    );


    ctx.fillStyle =
      "rgba(255,255,255,.42)";


    ctx.beginPath();


    ctx.arc(
      -7,
      -8,
      4,
      0,
      Math.PI * 2
    );


    ctx.fill();


    ctx.restore();

  }


  /* ==========================================================
     MOVING BUBBLE DRAW
  ========================================================== */

  function drawMovingBubble() {

    if (
      !movingBubble
    ) {

      return;

    }


    /*
      Trail.
    */

    for (
      let i = 0;
      i <
      movingBubble.trail.length;
      i++
    ) {

      const trail =
        movingBubble.trail[i];


      const alpha =
        (
          i + 1
        ) /
        movingBubble.trail.length *
        .15;


      ctx.save();


      ctx.globalAlpha =
        alpha;


      ctx.fillStyle =
        COLORS[
          movingBubble.color
        ].light;


      ctx.beginPath();


      ctx.arc(
        trail.x,
        trail.y,
        3,
        0,
        Math.PI * 2
      );


      ctx.fill();


      ctx.restore();

    }


    /*
      Soft flying squash.
    */

    const speed =
      Math.hypot(
        movingBubble.vx,
        movingBubble.vy
      );


    const stretch =
      1 +
      Math.min(
        .15,
        speed /
        6000
      );


    ctx.save();


    ctx.translate(
      movingBubble.x,
      movingBubble.y
    );


    ctx.rotate(
      movingBubble.rotation
    );


    ctx.scale(
      1 / stretch,
      stretch
    );


    if (
      movingBubble.special
    ) {

      drawSpecialBubble(
        0,
        0,
        movingBubble.special,
        movingBubble.scale,
        1
      );

    } else {

      drawBubble(
        0,
        0,
        movingBubble.color,
        movingBubble.scale,
        1
      );

    }


    ctx.restore();

  }


  /* ==========================================================
     FALLING DRAW
  ========================================================== */

  function drawFallingBubbles() {

    for (
      const bubble
      of fallingBubbles
    ) {

      const fallSpeed =
        Math.abs(
          bubble.vy
        );


      let stretch =
        1 +
        Math.min(
          .23,
          fallSpeed /
          1700
        );


      let squash =
        1 /
        stretch;


      /*
        Extra squash during bounce.
      */

      if (
        bubble.squash > 1
      ) {

        squash *=
          bubble.squash;


        stretch /=
          bubble.squash;

      }


      ctx.save();


      ctx.globalAlpha =
        Math.max(
          0,
          1 -
          bubble.life *
          .42
        );


      ctx.translate(
        bubble.x,
        bubble.y
      );


      ctx.rotate(
        bubble.rotation
      );


      ctx.scale(
        bubble.scale *
        squash,
        bubble.scale *
        stretch
      );


      if (
        bubble.special
      ) {

        drawSpecialBubble(
          0,
          0,
          bubble.special,
          1,
          1
        );

      } else {

        drawBubble(
          0,
          0,
          bubble.color,
          1,
          1
        );

      }


      ctx.restore();

    }

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
    ) {

      return;

    }


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


    const ux =
      dx /
      distance;


    const uy =
      dy /
      distance;


    ctx.save();


    ctx.setLineDash(
      [6, 9]
    );


    ctx.lineWidth =
      1.7;


    ctx.strokeStyle =
      "rgba(222,237,255,.60)";


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
     LAUNCHER
  ========================================================== */

  function drawLauncher() {

    const bounce =
      Math.sin(
        launcherBounce *
        Math.PI
      ) *
      2;


    const recoil =
      launcherRecoil *
      8;


    ctx.save();


    ctx.translate(
      SHOOTER_X,
      SHOOTER_Y +
      bounce
    );


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
      Current bubble sits softly
      inside the launcher.
    */

    if (
      currentSpecial
    ) {

      drawSpecialBubble(
        0,
        -2 - recoil,
        currentSpecial,
        1.02,
        1
      );

    } else {

      drawBubble(
        0,
        -2 - recoil,
        currentColor,
        1.02,
        1
      );

    }


    ctx.restore();

  }


  /* ==========================================================
     POP EFFECT
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


  function drawPopEffects() {

    for (
      const effect
      of popEffects
    ) {

      const elapsed =
        Math.max(
          0,
          effect.life -
          effect.delay
        );


      const t =
        Math.min(
          1,
          elapsed /
          effect.max
        );


      if (
        t <= 0
      ) {

        continue;

      }


      const alpha =
        1 - t;


      /*
        Squash first, then expand.
      */

      let sx;
      let sy;


      if (
        t < .18
      ) {

        const squeeze =
          t / .18;


        sx =
          1 +
          squeeze *
          .18;


        sy =
          1 -
          squeeze *
          .13;

      } else {

        const expand =
          easeOutBack(
            (
              t - .18
            ) /
            .82
          );


        sx =
          1 +
          expand *
          .58;


        sy =
          1 +
          expand *
          .58;

      }


      ctx.save();


      ctx.globalAlpha =
        alpha;


      ctx.translate(
        effect.x,
        effect.y
      );


      ctx.scale(
        sx,
        sy
      );


      if (
        effect.special
      ) {

        drawSpecialBubble(
          0,
          0,
          effect.special,
          1,
          1
        );

      } else {

        drawBubble(
          0,
          0,
          effect.color,
          1,
          1
        );

      }


      ctx.restore();

    }

  }


  /* ==========================================================
     RINGS
  ========================================================== */

  function drawRings() {

    for (
      const ring
      of rings
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
        (
          1 -
          t
        );


      ctx.beginPath();


      ctx.arc(
        ring.x,
        ring.y,
        18 +
        t * 40,
        0,
        Math.PI * 2
      );


      ctx.stroke();


      ctx.restore();

    }

  }


  /* ==========================================================
     IMPACTS
  ========================================================== */

  function drawImpacts() {

    for (
      const impact
      of impacts
    ) {

      const t =
        Math.min(
          1,
          impact.life /
          impact.max
        );


      const radius =
        8 +
        t *
        28;


      ctx.save();


      ctx.globalAlpha =
        (
          1 -
          t
        ) *
        .65;


      ctx.strokeStyle =
        "#ffffff";


      ctx.lineWidth =
        2.5 *
        (
          1 -
          t
        );


      ctx.beginPath();


      ctx.arc(
        impact.x,
        impact.y,
        radius,
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
      const p
      of particles
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
     SPECIAL BURSTS
  ========================================================== */

  function drawSpecialBursts() {

    for (
      const burst
      of specialBursts
    ) {

      const t =
        Math.min(
          1,
          burst.life /
          burst.max
        );


      if (
        burst.type === "laser"
      ) {

        ctx.save();


        ctx.globalAlpha =
          (
            1 -
            t
          ) *
          .82;


        ctx.strokeStyle =
          "#bff5ff";


        ctx.shadowColor =
          "#53caff";


        ctx.shadowBlur =
          20;


        ctx.lineWidth =
          11;


        ctx.beginPath();


        ctx.moveTo(
          0,
          burst.y
        );


        ctx.lineTo(
          W,
          burst.y
        );


        ctx.moveTo(
          burst.x,
          TOP_Y
        );


        ctx.lineTo(
          burst.x,
          DANGER_Y
        );


        ctx.stroke();


        ctx.strokeStyle =
          "#ffffff";


        ctx.lineWidth =
          3;


        ctx.shadowBlur =
          6;


        ctx.stroke();


        ctx.restore();

      } else {

        const color =
          burst.type === "bomb"
            ? "#ff6b58"
            : burst.type === "rainbow"
              ? "#ffffff"
              : "#ffe47b";


        const radius =
          18 +
          t *
          90;


        ctx.save();


        ctx.globalAlpha =
          (
            1 -
            t
          ) *
          .68;


        ctx.strokeStyle =
          color;


        ctx.lineWidth =
          4 *
          (
            1 -
            t
          );


        ctx.beginPath();


        ctx.arc(
          burst.x,
          burst.y,
          radius,
          0,
          Math.PI * 2
        );


        ctx.stroke();


        ctx.restore();

      }

    }

  }


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

          } else {

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


    if (
      special
    ) {

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


  function showMessage(
    text
  ) {

    if (
      message
    ) {

      message.textContent =
        text;

    }

  }


  /* ==========================================================
     SCREENS
  ========================================================== */

  function showScreen(
    screen
  ) {

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


      if (
        unlocked
      ) {

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

      } else {

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


      if (
        !confirmed
      ) {

        return;

      }


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

    if (
      !save.sound
    ) {

      return;

    }


    try {

      if (
        !audioContext
      ) {

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

    if (
      !save.sound
    ) {

      return;

    }


    try {

      initAudio();


      if (
        !audioContext
      ) {

        return;

      }


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

  function showResult(
    success
  ) {

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
     TOUCH / POINTER
  ========================================================== */

  canvas.addEventListener(
    "pointermove",
    event => {

      if (
        busy ||
        paused ||
        gameEnded ||
        levelWon ||
        ceilingAnimation
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
    event => {

      if (
        busy ||
        paused ||
        gameEnded ||
        levelWon ||
        ceilingAnimation
      ) {

        return;

      }


      event.preventDefault();


      pointerHolding =
        true;


      activePointerId =
        event.pointerId;


      updateAim(
        event.clientX,
        event.clientY
      );


      try {

        canvas.setPointerCapture(
          event.pointerId
        );

      } catch {}

    }
  );


  canvas.addEventListener(
    "pointerup",
    event => {

      if (
        !pointerHolding
      ) {

        return;

      }


      if (
        activePointerId !==
        null &&
        event.pointerId !==
        activePointerId
      ) {

        return;

      }


      event.preventDefault();


      updateAim(
        event.clientX,
        event.clientY
      );


      pointerHolding =
        false;


      activePointerId =
        null;


      try {

        canvas.releasePointerCapture(
          event.pointerId
        );

      } catch {}


      shoot();

    }
  );


  canvas.addEventListener(
    "pointercancel",
    event => {

      if (
        activePointerId !==
        null &&
        event.pointerId !==
        activePointerId
      ) {

        return;

      }


      pointerHolding =
        false;


      activePointerId =
        null;


      try {

        canvas.releasePointerCapture(
          event.pointerId
        );

      } catch {}

    }
  );


  /* ==========================================================
     AIM
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

  function loop(
    timestamp
  ) {

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
     INIT
  ========================================================== */

  updateUI();

  renderLevels();

  showScreen(
    homeScreen
  );

  requestAnimationFrame(
    loop
  );

})();
