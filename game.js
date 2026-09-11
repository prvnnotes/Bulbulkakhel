(() => {
  "use strict";

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

  const W = 480;
  const H = 760;

  canvas.width = W;
  canvas.height = H;

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

  const SAVE_KEY = "bulbuleKaKhelSave";

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

  const SPECIAL_ICONS = {
    laser: "⚡",
    bomb: "💣",
    rainbow: "🌈",
    sun: "☀"
  };

  const defaultSave = {
    currentLevel: 1,
    unlocked: 1,
    completed: [],
    bestScores: {},
    best: 0,
    sound: true
  };

  let save = loadSave();

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

  let particles = [];
  let popEffects = [];
  let rings = [];
  let impacts = [];
  let specialBursts = [];
  let bubbleWobbles = [];

  let ceilingAnimation = null;

  let launcherRecoil = 0;
  let launcherBounce = 0;
  let shake = 0;

  let aimX = SHOOTER_X;
  let aimY = 300;

  let pointerHolding = false;
  let activePointerId = null;

  let audioContext = null;

  /*
    Special ball scheduler:
    Every 8th or 9th shot approximately.
  */
  let shotsToSpecial =
    8 + Math.floor(Math.random() * 2);

  let lastTime = 0;


  /* ==========================================================
     SAVE
  ========================================================== */

  function loadSave() {
    try {
      const raw =
        localStorage.getItem(SAVE_KEY);

      if (!raw) {
        return {
          ...defaultSave,
          completed: [],
          bestScores: {}
        };
      }

      const data =
        JSON.parse(raw);

      return {
        ...defaultSave,
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

        best:
          Number(data.best || 0),

        sound:
          data.sound !== false
      };

    } catch {
      return {
        ...defaultSave,
        completed: [],
        bestScores: {}
      };
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
     LEVEL CONFIG
  ========================================================== */

  function levelConfig() {

    const level =
      save.currentLevel;

    return {

      rows:
        level >= 41
          ? 10
          : level >= 31
            ? 9
            : level >= 21
              ? 8
              : level >= 11
                ? 7
                : 6,

      colors:
        level >= 31
          ? 6
          : level >= 17
            ? 5
            : level >= 7
              ? 4
              : 3
    };
  }


  function randomColor() {

    return Math.floor(
      Math.random() *
      levelConfig().colors
    );
  }


  /* ==========================================================
     SPECIAL BUBBLE
  ========================================================== */

  function createSpecialForShot() {

    if (
      save.currentLevel < 4
    ) {
      return null;
    }

    if (
      shotsToSpecial > 0
    ) {
      return null;
    }

    shotsToSpecial =
      8 +
      Math.floor(
        Math.random() * 2
      );

    const types = [
      "laser",
      "bomb",
      "rainbow",
      "sun"
    ];

    return types[
      Math.floor(
        Math.random() *
        types.length
      )
    ];
  }


  function makeBubble() {

    return {

      color:
        randomColor(),

      special: null,

      squish: 0,

      wobble: 0,

      phase:
        Math.random() *
        Math.PI *
        2

    };
  }


  /* ==========================================================
     CREATE LEVEL
  ========================================================== */

  function createLevel() {

    const config =
      levelConfig();

    grid = [];

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
    impacts = [];
    specialBursts = [];
    bubbleWobbles = [];

    ceilingAnimation = null;

    launcherRecoil = 0;
    launcherBounce = 0;

    shake = 0;

    shotsToSpecial =
      8 +
      Math.floor(
        Math.random() * 2
      );

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

        if (
          r > 1 &&
          save.currentLevel >= 8 &&
          Math.random() < 0.05
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
      Ensure top row has support.
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

    aimX =
      SHOOTER_X;

    aimY = 300;

    updateUI();

    showMessage(
      "निशाना लगाइए"
    );
  }


  function removeStartingMatches() {

    for (
      let pass = 0;
      pass < 8;
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
            ] =
              makeBubble();

            changed = true;
          }

        }
      }

      if (!changed) {
        break;
      }
    }
  }


  /* ==========================================================
     GRID POSITION
  ========================================================== */

  function getX(q, r) {

    return (
      RADIUS +
      q *
      DIAMETER +
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
      r *
      ROW_HEIGHT
    );
  }


  function position(q, r) {

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


  function neighbors(q, r) {

    const odd =
      r % 2 === 1;

    const dirs = odd

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

    return dirs
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

    const start =
      grid[startR]?.[startQ];

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

    const seen =
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
        q + "," + r;

      if (
        seen.has(key)
      ) {
        continue;
      }

      seen.add(key);

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
        const neighbour
        of neighbors(q, r)
      ) {

        stack.push(
          neighbour
        );

      }
    }


    return result;
  }


  /* ==========================================================
     CONNECTED TO CEILING
  ========================================================== */

  function connectedToCeiling() {

    const result =
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

        result.add(
          q + ",0"
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
        of neighbors(q, r)
      ) {

        if (
          !grid[nr]?.[nq]
        ) {
          continue;
        }

        const key =
          nq + "," + nr;

        if (
          !result.has(key)
        ) {

          result.add(key);

          stack.push(
            [nq, nr]
          );

        }

      }
    }


    return result;
  }


  /* ==========================================================
     ATTACHMENT
  ========================================================== */

  function findBestAttachment(
    x,
    y
  ) {

    let best = null;

    let bestDistance =
      Infinity;


    /*
      Prefer cells connected
      to existing bubbles.
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


        const hasNeighbor =
          neighbors(
            q,
            r
          ).some(
            ([nq, nr]) =>
              Boolean(
                grid[nr]?.[nq]
              )
          );


        if (
          !hasNeighbor &&
          r !== 0
        ) {

          continue;

        }


        const p =
          position(
            q,
            r
          );


        const distance =
          Math.hypot(
            p.x - x,
            p.y - y
          );


        if (
          distance <
          bestDistance
        ) {

          bestDistance =
            distance;

          best = [
            q,
            r
          ];

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
      ceilingAnimation
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


    const speed = 820;


    movingBubble = {

      x:
        SHOOTER_X,

      y:
        SHOOTER_Y - 4,

      vx:
        dx /
        distance *
        speed,

      vy:
        dy /
        distance *
        speed,

      color:
        currentColor,

      special:
        currentSpecial,

      scale:
        0.82,

      squash: 0,

      rotation: 0,

      trail: []

    };


    /*
      One shot consumed.
    */

    shotsToSpecial--;


    /*
      Current -> next
    */

    currentColor =
      nextColor;

    currentSpecial =
      nextSpecial;


    /*
      Next bubble.
    */

    nextColor =
      randomColor();


    nextSpecial =
      createSpecialForShot();


    updateUI();


    playSound(
      330,
      0.06,
      "sine",
      0.025
    );
  }


  /* ==========================================================
     FINISH MOVING BUBBLE
  ========================================================== */

  function finishShot() {

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


    const bubble = {

      color:
        shot.color,

      special:
        shot.special ||
        null,

      squish:
        1,

      wobble:
        1,

      phase:
        Math.random() *
        Math.PI *
        2

    };


    grid[r][q] =
      bubble;


    const p =
      position(
        q,
        r
      );


    movingBubble =
      null;


    /*
      Soft collision effect.
    */

    impacts.push({

      x:
        p.x,

      y:
        p.y,

      life: 0,

      max: .26

    });


    createParticles(
      p.x,
      p.y,
      bubble.color,
      7
    );


    rings.push({

      x:
        p.x,

      y:
        p.y,

      color:
        bubble.color,

      life: 0,

      max: .28

    });


    /*
      Special.
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


    /*
      Normal match.
    */

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

      softWobble(
        q,
        r
      );


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

  function softWobble(q, r) {

    for (
      const [
        nq,
        nr
      ]
      of neighbors(q, r)
    ) {

      const bubble =
        grid[nr]?.[nq];

      if (!bubble)
        continue;


      bubble.wobble =
        1;


      bubble.squish =
        0.65;


      bubbleWobbles.push({

        q:
          nq,

        r:
          nr,

        life: 0,

        max:
          0.34

      });

    }
  }


  /* ==========================================================
     MATCH
  ========================================================== */

  function handleMatch(
    group
  ) {

    missedShots = 0;


    const count =
      group.length;


    score +=
      count *
      20;


    if (
      count >= 5
    ) {

      score +=
        count *
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


      bubble.squish =
        1;


      bubble.wobble =
        1;


      const p =
        position(
          q,
          r
        );


      popEffects.push({

        x:
          p.x,

        y:
          p.y,

        color:
          bubble.color,

        special: null,

        life: 0,

        max:
          .42 +
          Math.random() *
          .08,

        delay:
          Math.random() *
          .06,

        phase:
          Math.random() *
          Math.PI *
          2

      });


      createParticles(
        p.x,
        p.y,
        bubble.color,
        14
      );


      grid[r][q] =
        null;

    }


    if (
      count >= 7
    ) {

      showMessage(
        "गजब कऽ देलियै! ✨"
      );

    } else if (
      count >= 5
    ) {

      showMessage(
        "अहाँ कमाल कऽ देलियै!"
      );

    } else {

      showMessage(
        "बहुत नीक! 😄"
      );

    }


    shake =
      Math.min(
        8,
        2 +
        count *
        .35
      );


    playSound(
      450 +
      count *
      30,
      .15,
      "sine",
      .045
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


        score +=
          dropped *
          45;


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
     DETACHED DROP
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


        if (
          connected.has(
            q + "," + r
          )
        ) {

          continue;

        }


        const p =
          position(
            q,
            r
          );


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
            (
              Math.random() -
              .5
            ) *
            85,

          vy:
            -70 -
            Math.random() *
            60,

          gravity:
            420,

          rotation:
            Math.random() *
            Math.PI *
            2,

          spin:
            (
              Math.random() -
              .5
            ) *
            4,

          /*
            Keep the bubble
            circular while falling.
          */

          scale:
            .98,

          bounceScale:
            1,

          bounceCount:
            0,

          grounded:
            false,

          floorY:
            H -
            20 +
            Math.random() *
            65,

          life: 0

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
        180,
        .18,
        "triangle",
        .035
      );

    }


    return count;
  }


  /* ==========================================================
     SPECIAL BUBBLES
  ========================================================== */

  function activateSpecial(
    q,
    r,
    type
  ) {

    const p =
      position(
        q,
        r
      );


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
          ? .78
          : .66

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

    } else if (
      type === "bomb"
    ) {

      activateBomb(
        q,
        r
      );

    } else {

      activateColorSpecial(
        type === "sun"
      );

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
      position(
        q,
        r
      );


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
        .45,

      delay:
        Math.random() *
        .05,

      phase:
        Math.random() *
        Math.PI *
        2

    });


    createParticles(
      p.x,
      p.y,
      bubble.color,
      12
    );

  }


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
      .23,
      "sawtooth",
      .04
    );


    setTimeout(
      specialFinish,
      280
    );
  }


  function activateBomb(
    q,
    r
  ) {

    showMessage(
      "💥 बम का धमाका!"
    );


    const center =
      position(
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

        if (
          !grid[row][col]
        ) {

          continue;

        }


        const p =
          position(
            col,
            row
          );


        if (
          Math.hypot(
            p.x - center.x,
            p.y - center.y
          ) <= 100
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
      .3,
      "sawtooth",
      .05
    );


    setTimeout(
      specialFinish,
      300
    );
  }


  function mostCommonColor() {

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


    let best =
      0;

    let amount =
      -1;


    for (
      const key
      in counts
    ) {

      if (
        counts[key] >
        amount
      ) {

        amount =
          counts[key];

        best =
          Number(key);

      }

    }


    return best;
  }


  function activateColorSpecial(
    isSun
  ) {

    showMessage(
      isSun
        ? "☀️ सुनहरी चमक!"
        : "🌈 रंगों का जादू!"
    );


    const color =
      mostCommonColor();


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
          bubble &&
          !bubble.special &&
          bubble.color === color
        ) {

          clearBubbleAt(
            q,
            r
          );

        }

      }
    }


    playSound(
      isSun ? 620 : 560,
      .2,
      "sine",
      .04
    );


    setTimeout(
      specialFinish,
      300
    );

  }


  function specialFinish() {

    const dropped =
      dropDetached();


    score +=
      dropped *
      45;


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
      ceilingAnimation ||
      gameEnded ||
      levelWon
    ) {

      return;

    }


    busy = true;


    const row =
      new Array(COLS)
        .fill(null);


    for (
      let q = 0;
      q < COLS;
      q++
    ) {

      if (
        Math.random() <
        .86
      ) {

        row[q] =
          makeBubble();

      }

    }


    if (
      row.every(
        bubble => !bubble
      )
    ) {

      row[
        Math.floor(
          COLS / 2
        )
      ] =
        makeBubble();

    }


    grid.unshift(
      row
    );


    ceilingAnimation = {

      progress: 0,

      duration:
        .62

    };


    shake = 5;


    showMessage(
      "⚠️ छत एक पंक्ति नीचे आ गई!"
    );


    playSound(
      120,
      .18,
      "sawtooth",
      .025
    );

  }


  function checkDanger() {

    for (
      let r = 0;
      r < grid.length;
      r++
    ) {

      if (
        grid[r].some(
          Boolean
        )
      ) {

        if (
          getY(r) +
          RADIUS >=
          DANGER_Y
        ) {

          return true;

        }

      }

    }


    return false;
  }


  /* ==========================================================
     BOARD CHECK
  ========================================================== */

  function isBoardEmpty() {

    return grid.every(
      row =>
        row.every(
          bubble =>
            !bubble
        )
    );

  }


  /* ==========================================================
     WIN / LOSE
  ========================================================== */

  function completeLevel() {

    if (
      levelWon
    ) {

      return;

    }


    levelWon = true;
    busy = true;


    const level =
      save.currentLevel;


    if (
      !save.completed.includes(
        level
      )
    ) {

      save.completed.push(
        level
      );

    }


    save.unlocked =
      Math.max(
        save.unlocked,
        Math.min(
          MAX_LEVEL,
          level + 1
        )
      );


    save.bestScores[level] =
      Math.max(
        save.bestScores[level] || 0,
        score
      );


    save.best =
      Math.max(
        save.best,
        score
      );


    saveGame();


    showMessage(
      "बहुत बढ़िया! स्तर पूरा भऽ गेल।"
    );


    playSound(
      720,
      .25,
      "sine",
      .055
    );


    for (
      let i = 0;
      i < 26;
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
      .3,
      "sawtooth",
      .04
    );


    setTimeout(
      () => {

        showResult(
          false
        );

      },
      600
    );

  }


  /* ==========================================================
     PARTICLES
  ========================================================== */

  function createParticles(
    x,
    y,
    color,
    count = 10
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
        175;


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
          3,

        life: 0,

        max:
          .35 +
          Math.random() *
          .4

      });

    }

  }


  function createCelebrationParticle() {

    particles.push({

      x:
        Math.random() *
        W,

      y:
        20 +
        Math.random() *
        140,

      vx:
        (
          Math.random() -
          .5
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
        .8 +
        Math.random() *
        .5

    });

  }


  /* ==========================================================
     UPDATE
  ========================================================== */

  function update(dt) {

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
        dt * 16
      );


    /* --------------------------------------------------------
       Ceiling
    -------------------------------------------------------- */

    if (
      ceilingAnimation
    ) {

      ceilingAnimation.progress +=
        dt /
        ceilingAnimation.duration;


      if (
        ceilingAnimation.progress >= 1
      ) {

        ceilingAnimation.progress = 1;

        ceilingAnimation = null;


        /*
          Check danger AFTER
          animation completes.
        */

        if (
          checkDanger()
        ) {

          endGame();

          return;

        }


        busy = false;


        showMessage(
          "अब निशाना लगाइए 🎯"
        );


        updateUI();

      }

    }


    /* --------------------------------------------------------
       Existing bubble softness
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

          bubble.squish =
            Math.max(
              0,
              bubble.squish -
              dt * 5
            );

        }


        if (
          bubble.wobble > 0
        ) {

          bubble.wobble =
            Math.max(
              0,
              bubble.wobble -
              dt * 3.7
            );

        }


        bubble.phase +=
          dt * 2;

      }

    }


    /* --------------------------------------------------------
       Moving bubble
    -------------------------------------------------------- */

    if (
      movingBubble
    ) {

      const b =
        movingBubble;


      b.trail.push({

        x:
          b.x,

        y:
          b.y,

        life: 0

      });


      if (
        b.trail.length > 12
      ) {

        b.trail.shift();

      }


      for (
        const trail
        of b.trail
      ) {

        trail.life +=
          dt;

      }


      b.x +=
        b.vx *
        dt;


      b.y +=
        b.vy *
        dt;


      b.rotation +=
        (
          b.vx /
          5000
        ) *
        dt;


      /*
        Wall bounce.
      */

      if (
        b.x <= RADIUS
      ) {

        b.x =
          RADIUS;

        b.vx =
          Math.abs(
            b.vx
          );

        b.squash =
          .8;

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

        b.squash =
          .8;

      }


      let hit =
        false;


      /*
        Bubble collision.
      */

      for (
        let r = 0;
        r < grid.length &&
        !hit;
        r++
      ) {

        for (
          let q = 0;
          q < COLS;
          q++
        ) {

          const cell =
            grid[r][q];


          if (!cell)
            continue;


          const p =
            position(
              q,
              r
            );


          if (
            Math.hypot(
              p.x - b.x,
              p.y - b.y
            ) <=
            DIAMETER - 3
          ) {

            hit =
              true;


            cell.squish =
              1;

            cell.wobble =
              1;


            impacts.push({

              x:
                (
                  p.x +
                  b.x
                ) / 2,

              y:
                (
                  p.y +
                  b.y
                ) / 2,

              life: 0,

              max: .2

            });


            break;

          }

        }

      }


      /*
        Ceiling collision.
      */

      if (
        b.y <=
        TOP_Y + RADIUS
      ) {

        b.y =
          TOP_Y + RADIUS;

        hit =
          true;

      }


      if (
        hit
      ) {

        finishShot();

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

      const b =
        fallingBubbles[i];


      b.life +=
        dt;


      if (
        !b.grounded
      ) {

        b.vy +=
          b.gravity *
          dt;


        b.x +=
          b.vx *
          dt;


        b.y +=
          b.vy *
          dt;


        b.rotation +=
          b.spin *
          dt;


        /*
          Gentle wall bounce.
        */

        if (
          b.x <= RADIUS
        ) {

          b.x =
            RADIUS;


          b.vx =
            Math.abs(
              b.vx
            ) *
            .8;

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
            ) *
            .8;

        }


        const floor =
          Math.min(
            H - 24,
            b.floorY
          );


        /*
          Real bounce.
        */

        if (
          b.y >= floor
        ) {

          b.y =
            floor;


          if (
            Math.abs(
              b.vy
            ) > 115 &&
            b.bounceCount < 2
          ) {

            b.vy =
              -Math.abs(
                b.vy
              ) *
              (
                b.bounceCount === 0
                  ? .46
                  : .30
              );


            b.vx *=
              .88;


            b.bounceCount++;


            b.bounceScale =
              1.16;


            createParticles(
              b.x,
              b.y,
              b.color,
              3
            );


          } else {

            b.grounded =
              true;

          }

        }

      } else {

        /*
          Final gentle movement
          before leaving screen.
        */

        b.y +=
          75 *
          dt;

      }


      b.bounceScale +=
        (
          1 -
          b.bounceScale
        ) *
        Math.min(
          1,
          dt * 10
        );


      if (
        b.y >
        H + 110
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
       Pop effects
    -------------------------------------------------------- */

    for (
      let i =
        popEffects.length - 1;
      i >= 0;
      i--
    ) {

      const p =
        popEffects[i];


      p.life +=
        dt;


      if (
        p.life >=
        p.max +
        p.delay
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
       Impacts
    -------------------------------------------------------- */

    for (
      let i =
        impacts.length - 1;
      i >= 0;
      i--
    ) {

      impacts[i].life +=
        dt;


      if (
        impacts[i].life >=
        impacts[i].max
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


    if (
      shake > 0
    ) {

      ctx.translate(

        (
          Math.random() -
          .5
        ) *
        shake,

        (
          Math.random() -
          .5
        ) *
        shake

      );

    }


    drawBackground();

    drawTopLine();

    drawBubbleGrid();

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
      "#203d70"
    );

    gradient.addColorStop(
      .58,
      "#18345f"
    );

    gradient.addColorStop(
      1,
      "#112a50"
    );


    ctx.fillStyle =
      gradient;


    ctx.fillRect(
      0,
      0,
      W,
      H
    );


    ctx.save();


    ctx.globalAlpha =
      .045;


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


    ctx.save();


    ctx.globalAlpha =
      .055;


    ctx.font =
      "42px serif";


    ctx.fillText(
      "✦",
      20,
      210
    );


    ctx.fillText(
      "●",
      410,
      420
    );


    ctx.fillText(
      "✦",
      30,
      590
    );


    ctx.fillText(
      "●",
      410,
      650
    );


    ctx.restore();


    ctx.save();


    ctx.globalAlpha =
      .24;


    ctx.strokeStyle =
      "#d8bd6f";


    ctx.setLineDash(
      [5,8]
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


  function drawTopLine() {

    ctx.save();


    ctx.globalAlpha =
      .25;


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
     BUBBLE GRID
  ========================================================== */

  function drawBubbleGrid() {

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
          position(
            q,
            r
          );


        let y =
          p.y;


        /*
          Animate the newly lowered
          ceiling row.
        */

        if (
          ceilingAnimation
        ) {

          const t =
            Math.min(
              1,
              ceilingAnimation.progress
            );


          const eased =
            1 -
            Math.pow(
              1 - t,
              3
            );


          y =
            p.y -
            ROW_HEIGHT *
            (1 - eased);

        }


        let sx = 1;
        let sy = 1;
        let ox = 0;


        if (
          bubble.wobble > 0
        ) {

          const w =
            Math.sin(
              bubble.phase *
              4
            ) *
            bubble.wobble;


          sx +=
            w *
            .035;


          sy -=
            w *
            .025;


          ox =
            Math.sin(
              bubble.phase *
              5
            ) *
            bubble.wobble *
            1.5;

        }


        /*
          Soft impact.
        */

        if (
          bubble.squish > 0
        ) {

          sx +=
            bubble.squish *
            .13;


          sy -=
            bubble.squish *
            .10;

        }


        ctx.save();


        ctx.translate(
          p.x + ox,
          y
        );


        ctx.scale(
          sx,
          sy
        );


        if (
          bubble.special
        ) {

          drawSpecial(
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
    alpha = 1,
    rotation = 0,
    sx = 1,
    sy = 1
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


    ctx.rotate(
      rotation
    );


    ctx.scale(
      scale * sx,
      scale * sy
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
      "rgba(255,255,255,.38)";


    ctx.beginPath();


    ctx.arc(
      -7,
      -8,
      4,
      0,
      Math.PI * 2
    );


    ctx.fill();


    drawPattern(
      c.pattern,
      c
    );


    ctx.restore();

  }


  /* ==========================================================
     BUBBLE PATTERN
  ========================================================== */

  function drawPattern(
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
          -.8 *
          Math.PI +
          i *
          .4 *
          Math.PI;


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

    else {

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
     SPECIAL DRAW
  ========================================================== */

  function drawSpecial(
    x,
    y,
    type,
    scale = 1,
    alpha = 1,
    rotation = 0
  ) {

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
      SPECIAL_ICONS[type] ||
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
     FALLING BUBBLES DRAW
  ========================================================== */

  function drawFallingBubbles() {

    for (
      const bubble
      of fallingBubbles
    ) {

      /*
        IMPORTANT:
        Keep them round.
        Only use a very small bounce
        deformation on actual impact.
      */

      let sx = 1;
      let sy = 1;


      if (
        bubble.bounceScale >
        1
      ) {

        sx *=
          bubble.bounceScale;


        sy *=
          2 -
          bubble.bounceScale;

      }


      ctx.save();


      ctx.globalAlpha =
        Math.max(
          0,
          1 -
          bubble.life *
          .32
        );


      if (
        bubble.special
      ) {

        drawSpecial(
          bubble.x,
          bubble.y,
          bubble.special,
          bubble.scale,
          1,
          bubble.rotation
        );

      } else {

        drawBubble(
          bubble.x,
          bubble.y,
          bubble.color,
          bubble.scale,
          1,
          bubble.rotation,
          sx,
          sy
        );

      }


      ctx.restore();

    }

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


      ctx.save();


      ctx.globalAlpha =
        (
          i + 1
        ) /
        movingBubble.trail.length *
        .12;


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


    const stretch =
      1 +
      Math.min(
        .1,
        Math.abs(
          movingBubble.vy
        ) /
        7000
      );


    if (
      movingBubble.special
    ) {

      drawSpecial(
        movingBubble.x,
        movingBubble.y,
        movingBubble.special,
        movingBubble.scale,
        1,
        movingBubble.rotation
      );

    } else {

      drawBubble(
        movingBubble.x,
        movingBubble.y,
        movingBubble.color,
        movingBubble.scale,
        1,
        movingBubble.rotation,
        1 / stretch,
        stretch
      );

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
      [6,9]
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


    if (
      currentSpecial
    ) {

      drawSpecial(
        0,
        -2 - recoil,
        currentSpecial,
        1.02
      );

    } else {

      drawBubble(
        0,
        -2 - recoil,
        currentColor,
        1.02
      );

    }


    ctx.restore();

  }


  /* ==========================================================
     POP EFFECT
  ========================================================== */

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


      let sx = 1;
      let sy = 1;


      /*
        Tiny squash first,
        then expansion.
      */

      if (
        t < .18
      ) {

        const k =
          t / .18;


        sx =
          1 +
          k *
          .16;


        sy =
          1 -
          k *
          .11;

      } else {

        const k =
          (
            t - .18
          ) /
          .82;


        const size =
          1 +
          k *
          .55;


        sx =
          size;


        sy =
          size;

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


      drawBubble(
        0,
        0,
        effect.color,
        1,
        1
      );


      ctx.restore();


      ctx.save();


      ctx.globalAlpha =
        alpha *
        .7;


      ctx.strokeStyle =
        COLORS[
          effect.color
        ].light;


      ctx.lineWidth =
        2.5 *
        (1 - t);


      ctx.beginPath();


      ctx.arc(
        effect.x,
        effect.y,
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
        (1 - t);


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


      ctx.save();


      ctx.globalAlpha =
        (
          1 - t
        ) *
        .65;


      ctx.strokeStyle =
        "#ffffff";


      ctx.lineWidth =
        2.5 *
        (1 - t);


      ctx.beginPath();


      ctx.arc(
        impact.x,
        impact.y,
        8 +
        t * 28,
        0,
        Math.PI * 2
      );


      ctx.stroke();


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
     SPECIAL EFFECTS
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


      ctx.save();


      ctx.globalAlpha =
        (
          1 - t
        ) *
        .75;


      if (
        burst.type ===
        "laser"
      ) {

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

      } else {

        const color =
          burst.type === "bomb"
            ? "#ff6b58"
            : burst.type === "rainbow"
              ? "#ffffff"
              : "#ffe47b";


        ctx.strokeStyle =
          color;


        ctx.lineWidth =
          4 *
          (
            1 - t
          );


        ctx.beginPath();


        ctx.arc(
          burst.x,
          burst.y,
          18 +
          t * 88,
          0,
          Math.PI * 2
        );


        ctx.stroke();

      }


      ctx.restore();

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
      COLORS[index] ||
      COLORS[0];


    element.style.background =
      `radial-gradient(circle at 30% 25%,#ffffff 0%,${c.light} 17%,${c.main} 52%,${c.dark} 100%)`;


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
     LEVELS
  ========================================================== */

  function renderLevels() {

    if (!levelsGrid)
      return;


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

        ...defaultSave,

        completed: [],

        bestScores: {}

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
     TOUCH CONTROL
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
    () => {

      pointerHolding =
        false;


      activePointerId =
        null;

    }
  );


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
