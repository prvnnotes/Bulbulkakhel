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

  // Prevent delayed callbacks from an old shot/level
  // from touching the new game.
  let gameSession = 0;
  let actionSerial = 0;
  let currentActionId = 0;

  let messageTimer = null;
  let messageAnimation = null;

  function guardedTimeout(
    callback,
    delay,
    session = gameSession,
    actionId = currentActionId
  ) {
    return setTimeout(() => {
      if (session !== gameSession) return;

      if (
        actionId !== null &&
        actionId !== currentActionId
      ) {
        return;
      }

      callback();
    }, delay);
  }


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

    /*
      New level/session invalidates every delayed
      callback belonging to the previous level.
    */

    gameSession++;
    actionSerial++;
    currentActionId = actionSerial;

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

      grid.push(
        row
      );
    }

    /*
      Always keep the first row attached.
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

    currentSpecial =
      null;

    nextSpecial =
      null;

    aimX =
      SHOOTER_X;

    aimY =
      300;

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

      let changed =
        false;

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

            changed =
              true;
          }

        }
      }

      if (
        !changed
      ) {

        break;

      }
    }
  }


  /* ==========================================================
     GRID POSITION
  ========================================================== */

  function getX(
    q,
    r
  ) {

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


  function getY(
    r
  ) {

    return (
      TOP_Y +
      r *
      ROW_HEIGHT
    );
  }


  function position(
    q,
    r
  ) {

    return {

      x:
        getX(
          q,
          r
        ),

      y:
        getY(
          r
        )

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


  function neighbors(
    q,
    r
  ) {

    const odd =
      r % 2 === 1;

    const dirs =
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
      [
        startQ,
        startR
      ]
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
        q +
        "," +
        r;

      if (
        seen.has(
          key
        )
      ) {

        continue;

      }

      seen.add(
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
        [
          q,
          r
        ]
      );

      for (
        const neighbour
        of neighbors(
          q,
          r
        )
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
          q +
          ",0"
        );

        stack.push(
          [
            q,
            0
          ]
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
        of neighbors(
          q,
          r
        )
      ) {

        if (
          !grid[nr]?.[nq]
        ) {

          continue;

        }

        const key =
          nq +
          "," +
          nr;

        if (
          !result.has(
            key
          )
        ) {

          result.add(
            key
          );

          stack.push(
            [
              nq,
              nr
            ]
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

    let best =
      null;

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
            (
              [nq, nr]
            ) =>
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


    if (
      !best
    ) {

      grid.push(
        new Array(
          COLS
        ).fill(
          null
        )
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

  function getAimDirection() {
    let dx =
      aimX -
      SHOOTER_X;

    let dy =
      aimY -
      SHOOTER_Y;

    /*
      Same minimum upward angle used by
      the actual shot AND the aim guide.
    */
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

    return {
      x:
        dx /
        distance,

      y:
        dy /
        distance
    };
  }


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


    /*
      IMPORTANT:
      The exact same direction calculation
      is used by the laser/aim guide.
    */

    const direction =
      getAimDirection();

    const speed = 820;

    const actionId =
      ++actionSerial;

    currentActionId =
      actionId;


    movingBubble = {

      x:
        SHOOTER_X,

      y:
        SHOOTER_Y - 4,

      vx:
        direction.x *
        speed,

      vy:
        direction.y *
        speed,

      color:
        currentColor,

      special:
        currentSpecial,

      actionId,

      scale:
        0.82,

      squash:
        0,

      rotation:
        0,

      trail:
        []

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
      Generate next bubble.
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


    /*
      A delayed/old shot must NEVER
      affect the current level.
    */

    if (
      shot.actionId !==
      currentActionId
    ) {

      movingBubble =
        null;

      busy =
        false;

      return;
    }


    const actionId =
      shot.actionId;


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


    impacts.push({

      x:
        p.x,

      y:
        p.y,

      life:
        0,

      max:
        0.26

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

      life:
        0,

      max:
        0.28

    });


    /*
      Special bubble
    */

    if (
      bubble.special
    ) {

      activateSpecial(
        q,
        r,
        bubble.special,
        actionId
      );

      return;
    }


    /*
      Normal colour match
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
        group,
        actionId
      );

    } else {

      /*
        No match = one miss.
      */

      softWobble(
        q,
        r
      );


      missedShots++;


      if (
        missedShots >=
        MISS_LIMIT
      ) {

        missedShots =
          0;

        descendCeiling(
          actionId
        );

      } else {

        showMessage(
          missedShots === 1
            ? "अच्छा निशाना!"
            : "बस एक मौका और…"
        );

        busy =
          false;

      }

    }


    updateUI();


    /*
      Safety check.
    */

    if (
      isBoardEmpty()
    ) {

      completeLevel();

    }

  }


  /* ==========================================================
     SOFT BUBBLE IMPACT
  ========================================================== */

  function softWobble(
    q,
    r
  ) {

    for (
      const [
        nq,
        nr
      ]
      of neighbors(
        q,
        r
      )
    ) {

      const bubble =
        grid[nr]?.[nq];


      if (
        !bubble
      ) {
        continue;
      }


      bubble.wobble =
        1;

      bubble.squish =
        0.65;


      bubbleWobbles.push({

        q:
          nq,

        r:
          nr,

        life:
          0,

        max:
          0.34

      });

    }

  }


  /* ==========================================================
     MATCH / POP
  ========================================================== */

  function handleMatch(
    group,
    actionId =
      currentActionId
  ) {

    /*
      Ignore stale actions.
    */

    if (
      actionId !==
      currentActionId
    ) {

      return;

    }


    missedShots =
      0;


    const count =
      group.length;


    score +=
      count * 20;


    if (
      count >= 5
    ) {

      score +=
        count * 10;

    }


    /*
      Pop matched bubbles.
    */

    for (
      const [
        q,
        r
      ]
      of group
    ) {

      const bubble =
        grid[r][q];


      if (
        !bubble
      ) {

        continue;

      }


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

        special:
          null,

        life:
          0,

        max:
          0.42 +
          Math.random() *
          0.08,

        delay:
          Math.random() *
          0.06,

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


    /*
      Feedback message.
      showMessage() itself handles
      centre positioning and fading.
    */

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
        count * 0.35
      );


    playSound(
      450 +
      count * 30,
      0.15,
      "sine",
      0.045
    );


    /*
      Wait for the pop animation,
      then drop bubbles that are no
      longer connected to the ceiling.

      guardedTimeout prevents this old
      callback from touching a later level.
    */

    const session =
      gameSession;


    guardedTimeout(
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
          dropped * 45;


        updateUI();

        saveGame();


        if (
          isBoardEmpty()
        ) {

          completeLevel();

        } else {

          busy =
            false;

        }

      },

      220,

      session,

      actionId
    );

  }


  /* ==========================================================
     DROP DETACHED BUBBLES
  ========================================================== */

  function dropDetached() {

    const connected =
      connectedToCeiling();

    let count =
      0;


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
          !bubble
        ) {

          continue;

        }


        /*
          Still connected to ceiling.
        */

        if (
          connected.has(
            q +
            "," +
            r
          )
        ) {

          continue;

        }


        const p =
          position(
            q,
            r
          );


        /*
          Falling bubbles stay ROUND.
          The bounceScale only gives a
          small natural squash when they
          hit the bottom.
        */

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
              0.5
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
              0.5
            ) *
            4,

          scale:
            0.98,

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

          life:
            0

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
        0.18,
        "triangle",
        0.035
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
    type,
    actionId =
      currentActionId
  ) {

    if (
      actionId !==
      currentActionId
    ) {

      return;

    }


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

      life:
        0,

      max:
        type === "bomb"
          ? 0.78
          : 0.66

    });


    missedShots =
      0;


    shake =
      type === "bomb"
        ? 12
        : 7;


    if (
      type === "laser"
    ) {

      activateLaser(
        q,
        r,
        actionId
      );

    } else if (
      type === "bomb"
    ) {

      activateBomb(
        q,
        r,
        actionId
      );

    } else {

      activateColorSpecial(
        type === "sun",
        actionId
      );

    }

  }


  function clearBubbleAt(
    q,
    r
  ) {

    const bubble =
      grid[r]?.[q];


    if (
      !bubble
    ) {

      return;

    }


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

      life:
        0,

      max:
        0.45,

      delay:
        Math.random() *
        0.05,

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
    /* ==========================================================
     LASER SPECIAL
  ========================================================== */

  function activateLaser(
    q,
    r,
    actionId =
      currentActionId
  ) {

    if (
      actionId !==
      currentActionId
    ) {
      return;
    }

    showMessage(
      "⚡ लेज़र चला!"
    );

    /*
      Clear the complete row and column
      around the laser bubble.
    */

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
      0.23,
      "sawtooth",
      0.04
    );


    const session =
      gameSession;


    guardedTimeout(
      () => {

        specialFinish(
          actionId
        );

      },

      280,

      session,

      actionId
    );

  }


  /* ==========================================================
     BOMB SPECIAL
  ========================================================== */

  function activateBomb(
    q,
    r,
    actionId =
      currentActionId
  ) {

    if (
      actionId !==
      currentActionId
    ) {
      return;
    }

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
            p.x -
              center.x,

            p.y -
              center.y
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
      0.3,
      "sawtooth",
      0.05
    );


    const session =
      gameSession;


    guardedTimeout(
      () => {

        specialFinish(
          actionId
        );

      },

      300,

      session,

      actionId
    );

  }


  /* ==========================================================
     MOST COMMON COLOUR
  ========================================================== */

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


  /* ==========================================================
     RAINBOW / SUN SPECIAL
  ========================================================== */

  function activateColorSpecial(
    isSun,
    actionId =
      currentActionId
  ) {

    if (
      actionId !==
      currentActionId
    ) {

      return;

    }


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
      isSun
        ? 620
        : 560,

      0.2,

      "sine",

      0.04
    );


    const session =
      gameSession;


    guardedTimeout(
      () => {

        specialFinish(
          actionId
        );

      },

      300,

      session,

      actionId
    );

  }


  /* ==========================================================
     FINISH SPECIAL
  ========================================================== */

  function specialFinish(
    actionId =
      currentActionId
  ) {

    if (
      actionId !==
      currentActionId
    ) {

      return;

    }


    const dropped =
      dropDetached();


    score +=
      dropped * 45;


    updateUI();

    saveGame();


    if (
      isBoardEmpty()
    ) {

      completeLevel();

    } else {

      busy =
        false;

    }

  }


  /* ==========================================================
     CEILING DESCENT
  ========================================================== */

  function descendCeiling(
    actionId =
      currentActionId
  ) {

    if (
      actionId !==
      currentActionId
    ) {

      return;

    }


    if (
      ceilingAnimation ||
      gameEnded ||
      levelWon
    ) {

      return;

    }


    busy =
      true;


    const row =
      new Array(
        COLS
      ).fill(
        null
      );


    for (
      let q = 0;
      q < COLS;
      q++
    ) {

      if (
        Math.random() <
        0.86
      ) {

        row[q] =
          makeBubble();

      }

    }


    if (
      row.every(
        bubble =>
          !bubble
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

      progress:
        0,

      duration:
        0.62

    };


    shake =
      5;


    showMessage(
      "⚠️ छत एक पंक्ति नीचे आ गई!"
    );


    playSound(
      120,
      0.18,
      "sawtooth",
      0.025
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
     BOARD EMPTY
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
     LEVEL COMPLETE
  ========================================================== */

  function completeLevel() {

    if (
      levelWon
    ) {

      return;

    }


    levelWon =
      true;

    busy =
      true;


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
        save.bestScores[level] ||
          0,

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
      0.25,
      "sine",
      0.055
    );


    for (
      let i = 0;
      i < 26;
      i++
    ) {

      createCelebrationParticle();

    }


    const session =
      gameSession;

    const actionId =
      currentActionId;


    guardedTimeout(
      () => {

        showResult(
          true
        );

      },

      700,

      session,

      actionId
    );

  }


  /* ==========================================================
     GAME OVER
  ========================================================== */

  function endGame() {

    if (
      gameEnded
    ) {

      return;

    }


    gameEnded =
      true;

    busy =
      true;


    showMessage(
      "छत बहुत नीचे आ गई"
    );


    playSound(
      100,
      0.3,
      "sawtooth",
      0.04
    );


    const session =
      gameSession;

    const actionId =
      currentActionId;


    guardedTimeout(
      () => {

        showResult(
          false
        );

      },

      600,

      session,

      actionId
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
          Math.cos(
            angle
          ) *
          speed,

        vy:
          Math.sin(
            angle
          ) *
          speed -
          55,

        color,

        size:
          1.5 +
          Math.random() *
          3,

        life:
          0,

        max:
          0.35 +
          Math.random() *
          0.4

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

      life:
        0,

      max:
        0.8 +
        Math.random() *
        0.5

    });

  }
    /* ==========================================================
     UPDATE
  ========================================================== */

  function update(dt) {

    if (paused) {
      return;
    }


    /*
      Launcher animation
    */

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


    /* ----------------------------------------------------------
       CEILING ANIMATION
    ---------------------------------------------------------- */

    if (
      ceilingAnimation
    ) {

      ceilingAnimation.progress +=
        dt /
        ceilingAnimation.duration;


      if (
        ceilingAnimation.progress >= 1
      ) {

        ceilingAnimation.progress =
          1;

        ceilingAnimation =
          null;


        /*
          Check danger only after
          the complete descent.
        */

        if (
          checkDanger()
        ) {

          endGame();

          return;

        }


        busy =
          false;


        showMessage(
          "अब निशाना लगाइए 🎯"
        );


        updateUI();

      }

    }


    /* ----------------------------------------------------------
       BUBBLE WOBBLE / SOFT PHYSICS
    ---------------------------------------------------------- */

    for (
      const row
      of grid
    ) {

      for (
        const bubble
        of row
      ) {

        if (
          !bubble
        ) {

          continue;

        }


        if (
          bubble.squish >
          0
        ) {

          bubble.squish =
            Math.max(
              0,
              bubble.squish -
                dt * 5
            );

        }


        if (
          bubble.wobble >
          0
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


    /* ----------------------------------------------------------
       MOVING BUBBLE
    ---------------------------------------------------------- */

    if (
      movingBubble
    ) {

      const b =
        movingBubble;


      /*
        Old action safety.
      */

      if (
        b.actionId !==
        currentActionId
      ) {

        movingBubble =
          null;

        busy =
          false;

        return;

      }


      /*
        Trail
      */

      b.trail.push({

        x:
          b.x,

        y:
          b.y,

        life:
          0

      });


      if (
        b.trail.length >
        12
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


      /*
        Actual movement.
      */

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
        LEFT WALL
      */

      if (
        b.x <=
        RADIUS
      ) {

        b.x =
          RADIUS;

        b.vx =
          Math.abs(
            b.vx
          );

        b.squash =
          0.8;

      }


      /*
        RIGHT WALL
      */

      if (
        b.x >=
        W -
        RADIUS
      ) {

        b.x =
          W -
          RADIUS;

        b.vx =
          -Math.abs(
            b.vx
          );

        b.squash =
          0.8;

      }


      /*
        Bubble collision.
      */

      let hit =
        false;


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


          if (
            !cell
          ) {

            continue;

          }


          const p =
            position(
              q,
              r
            );


          if (
            Math.hypot(
              p.x -
                b.x,

              p.y -
                b.y
            ) <=
            DIAMETER -
            3
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
                ) /
                2,

              y:
                (
                  p.y +
                  b.y
                ) /
                2,

              life:
                0,

              max:
                0.2

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
        TOP_Y +
        RADIUS
      ) {

        b.y =
          TOP_Y +
          RADIUS;

        hit =
          true;

      }


      if (
        hit
      ) {

        finishShot();

      }

    }


    /* ----------------------------------------------------------
       FALLING BUBBLES
    ---------------------------------------------------------- */

    for (
      let i =
        fallingBubbles.length -
        1;

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

        /*
          Gravity
        */

        b.vy +=
          b.gravity *
          dt;


        b.x +=
          b.vx *
          dt;


        b.y +=
          b.vy *
          dt;


        /*
          Natural rotation
        */

        b.rotation +=
          b.spin *
          dt;


        /*
          Wall bounce
        */

        if (
          b.x <=
          RADIUS
        ) {

          b.x =
            RADIUS;

          b.vx =
            Math.abs(
              b.vx
            ) *
            0.8;

        }


        if (
          b.x >=
          W -
          RADIUS
        ) {

          b.x =
            W -
            RADIUS;

          b.vx =
            -Math.abs(
              b.vx
            ) *
            0.8;

        }


        const floor =
          Math.min(
            H - 24,
            b.floorY
          );


        /*
          Bottom bounce
        */

        if (
          b.y >=
          floor
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
                b.bounceCount ===
                0
                  ? 0.46
                  : 0.30
              );


            b.vx *=
              0.88;


            b.bounceCount++;


            /*
              Small rubbery squash.
            */

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
          Slowly move grounded
          bubbles out of view.
        */

        b.y +=
          75 *
          dt;

      }


      /*
        IMPORTANT:
        Bubble remains visually round.
        bounceScale only affects the
        tiny impact squash.
      */

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


    /* ----------------------------------------------------------
       PARTICLES
    ---------------------------------------------------------- */

    for (
      let i =
        particles.length -
        1;

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


    /* ----------------------------------------------------------
       POP EFFECTS
    ---------------------------------------------------------- */

    for (
      let i =
        popEffects.length -
        1;

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


    /* ----------------------------------------------------------
       RINGS
    ---------------------------------------------------------- */

    for (
      let i =
        rings.length -
        1;

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


    /* ----------------------------------------------------------
       IMPACTS
    ---------------------------------------------------------- */

    for (
      let i =
        impacts.length -
        1;

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


    /* ----------------------------------------------------------
       SPECIAL BURSTS
    ---------------------------------------------------------- */

    for (
      let i =
        specialBursts.length -
        1;

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

    drawTopLine();

    drawBubbleGrid();

    drawFallingBubbles();

    /*
      Aim guide is drawn BEFORE
      launcher and moving bubble,
      so the cannon sits cleanly
      above the guide.
    */

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
      0.58,
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


    /*
      Very subtle decorative pattern.
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
      Tiny decorative motifs.
    */

    ctx.save();

    ctx.globalAlpha =
      0.055;

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


    /*
      Danger line.
    */

    ctx.save();

    ctx.globalAlpha =
      0.24;

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
     TOP LINE
  ========================================================== */

  function drawTopLine() {

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
     DRAW BUBBLE GRID
  ========================================================== */

  function drawBubbleGrid() {

    for (
      let r = 0;
      r < grid.length;
      r++
    ) {

      for (
        let c = 0;
        c < COLS;
        c++
      ) {

        const bubble =
          grid[r][c];

        if (
          !bubble
        ) {

          continue;

        }


        const p =
          position(
            c,
            r
          );


        let x =
          p.x;

        let y =
          p.y;


        /*
          Gentle ceiling movement.
        */

        if (
          ceilingAnimation
        ) {

          y +=
            ceilingAnimation.offset;

        }


        /*
          Small natural wobble.
        */

        const wobbleAmount =
          bubble.wobble *
          1.7;

        x +=
          Math.sin(
            bubble.phase
          ) *
          wobbleAmount;


        y +=
          Math.cos(
            bubble.phase *
            0.9
          ) *
          wobbleAmount *
          0.45;


        /*
          Tiny squash after impact.
        */

        let scaleX =
          1;

        let scaleY =
          1;


        if (
          bubble.squish >
          0
        ) {

          scaleX +=
            bubble.squish *
            0.055;

          scaleY -=
            bubble.squish *
            0.045;

        }


        drawBubble(
          x,
          y,
          bubble.color,
          scaleX,
          scaleY,
          bubble.special,
          bubble.rotation
        );

      }

    }

  }


  /* ==========================================================
     DRAW FALLING BUBBLES
  ========================================================== */

  function drawFallingBubbles() {

    for (
      const bubble
      of fallingBubbles
    ) {

      let scale =
        bubble.bounceScale ||
        1;


      /*
        Keep falling bubbles
        visually round.
      */

      if (
        scale > 1.001
      ) {

        const squash =
          Math.min(
            0.09,
            scale - 1
          );

        ctx.save();

        ctx.translate(
          bubble.x,
          bubble.y
        );

        ctx.rotate(
          bubble.rotation
        );

        drawBubble(
          0,
          0,
          bubble.color,
          1 + squash,
          1 - squash * 0.7,
          bubble.special
        );

        ctx.restore();

      } else {

        drawBubble(
          bubble.x,
          bubble.y,
          bubble.color,
          1,
          1,
          bubble.special,
          bubble.rotation
        );

      }

    }

  }


  /* ==========================================================
     DRAW MOVING BUBBLE
  ========================================================== */

  function drawMovingBubble() {

    if (
      !movingBubble
    ) {

      return;

    }


    const b =
      movingBubble;


    /*
      Bubble trail.
    */

    if (
      b.trail &&
      b.trail.length
    ) {

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
            i + 1
          ) /
          b.trail.length *
          0.16;


        const radius =
          RADIUS *
          (
            0.22 +
            (
              i /
              b.trail.length
            ) *
            0.28
          );


        ctx.globalAlpha =
          alpha;


        ctx.fillStyle =
          colorValue(
            b.color
          );


        ctx.beginPath();

        ctx.arc(
          t.x,
          t.y,
          radius,
          0,
          Math.PI * 2
        );

        ctx.fill();

      }

      ctx.restore();

    }


    drawBubble(
      b.x,
      b.y,
      b.color,
      b.scaleX || 1,
      b.scaleY || 1,
      b.special,
      b.rotation || 0
    );

  }


  /* ==========================================================
     DRAW AIM GUIDE
  ========================================================== */

  function drawAimGuide() {

    if (
      movingBubble ||
      busy
    ) {

      return;

    }


    if (
      !aimDirection
    ) {

      return;

    }


    const start =
      getLauncherPosition();


    const path =
      traceAimPath(
        start.x,
        start.y,
        aimDirection.x,
        aimDirection.y
      );


    if (
      !path ||
      path.length < 2
    ) {

      return;

    }


    /*
      Solid trajectory line.
      This follows the SAME direction
      used by the actual shot.
    */

    ctx.save();

    ctx.lineWidth =
      2.5;

    ctx.lineCap =
      "round";

    ctx.lineJoin =
      "round";

    ctx.strokeStyle =
      "rgba(255,247,223,0.72)";


    ctx.beginPath();

    ctx.moveTo(
      path[0].x,
      path[0].y
    );


    for (
      let i = 1;
      i < path.length;
      i++
    ) {

      ctx.lineTo(
        path[i].x,
        path[i].y
      );

    }

    ctx.stroke();


    /*
      Soft glow.
    */

    ctx.globalAlpha =
      0.18;

    ctx.lineWidth =
      7;

    ctx.strokeStyle =
      "#fff7df";


    ctx.beginPath();

    ctx.moveTo(
      path[0].x,
      path[0].y
    );


    for (
      let i = 1;
      i < path.length;
      i++
    ) {

      ctx.lineTo(
        path[i].x,
        path[i].y
      );

    }

    ctx.stroke();


    /*
      Destination marker.
    */

    const end =
      path[path.length - 1];


    ctx.globalAlpha =
      0.85;

    ctx.fillStyle =
      "#fff7df";


    ctx.beginPath();

    ctx.arc(
      end.x,
      end.y,
      4,
      0,
      Math.PI * 2
    );

    ctx.fill();


    ctx.restore();

  }


  /* ==========================================================
     DRAW LAUNCHER
  ========================================================== */

  function drawLauncher() {

    const p =
      getLauncherPosition();


    const recoil =
      launcherRecoil *
      8;


    ctx.save();

    ctx.translate(
      p.x,
      p.y
    );


    /*
      Cannon rotation.
    */

    if (
      aimDirection
    ) {

      ctx.rotate(
        Math.atan2(
          aimDirection.y,
          aimDirection.x
        ) +
        Math.PI / 2
      );

    }


    /*
      Recoil.
    */

    ctx.translate(
      0,
      recoil
    );


    /*
      Cannon body.
    */

    const bodyGradient =
      ctx.createLinearGradient(
        -22,
        0,
        22,
        0
      );


    bodyGradient.addColorStop(
      0,
      "#b9974b"
    );

    bodyGradient.addColorStop(
      0.5,
      "#f1d77d"
    );

    bodyGradient.addColorStop(
      1,
      "#a77e38"
    );


    ctx.fillStyle =
      bodyGradient;


    ctx.beginPath();

    ctx.roundRect(
      -17,
      -52,
      34,
      67,
      12
    );

    ctx.fill();


    /*
      Cannon inner barrel.
    */

    ctx.fillStyle =
      "#172f59";


    ctx.beginPath();

    ctx.roundRect(
      -10,
      -49,
      20,
      52,
      8
    );

    ctx.fill();


    /*
      Gold barrel rim.
    */

    ctx.strokeStyle =
      "#f5dc8b";

    ctx.lineWidth =
      3;


    ctx.beginPath();

    ctx.roundRect(
      -12,
      -53,
      24,
      10,
      5
    );

    ctx.stroke();


    /*
      Cannon base.
    */

    ctx.rotate(
      -Math.PI / 2
    );


    const baseGradient =
      ctx.createRadialGradient(
        0,
        0,
        2,
        0,
        0,
        48
      );


    baseGradient.addColorStop(
      0,
      "#f2d982"
    );

    baseGradient.addColorStop(
      0.55,
      "#c39e4f"
    );

    baseGradient.addColorStop(
      1,
      "#80622d"
    );


    ctx.fillStyle =
      baseGradient;


    ctx.beginPath();

    ctx.arc(
      0,
      0,
      40,
      0,
      Math.PI * 2
    );

    ctx.fill();


    ctx.strokeStyle =
      "rgba(255,248,220,0.5)";

    ctx.lineWidth =
      2;


    ctx.stroke();


    /*
      Centre plate.
    */

    ctx.fillStyle =
      "#173562";


    ctx.beginPath();

    ctx.arc(
      0,
      0,
      27,
      0,
      Math.PI * 2
    );

    ctx.fill();


    ctx.strokeStyle =
      "#e3c96f";


    ctx.beginPath();

    ctx.arc(
      0,
      0,
      27,
      0,
      Math.PI * 2
    );

    ctx.stroke();


    ctx.restore();


    /*
      Current bubble sitting above
      the launcher.
    */

    if (
      currentBubble
    ) {

      drawBubble(
        p.x,
        p.y - 48,
        currentBubble,
        0.94,
        0.94
      );

    }


    /*
      Next bubble preview.
    */

    const nextX =
      p.x + 62;

    const nextY =
      p.y + 13;


    ctx.save();

    ctx.globalAlpha =
      0.85;


    ctx.fillStyle =
      "rgba(8,20,42,0.45)";


    ctx.beginPath();

    ctx.arc(
      nextX,
      nextY,
      23,
      0,
      Math.PI * 2
    );

    ctx.fill();


    ctx.restore();


    if (
      nextBubble
    ) {

      drawBubble(
        nextX,
        nextY,
        nextBubble,
        0.62,
        0.62
      );

    }

  }


  /* ==========================================================
     DRAW A SINGLE BUBBLE
  ========================================================== */

  function drawBubble(
    x,
    y,
    color,
    scaleX = 1,
    scaleY = 1,
    special = null,
    rotation = 0
  ) {

    if (
      !color
    ) {

      return;

    }


    ctx.save();


    ctx.translate(
      x,
      y
    );


    if (
      rotation
    ) {

      ctx.rotate(
        rotation
      );

    }


    ctx.scale(
      scaleX,
      scaleY
    );


    const radius =
      RADIUS;


    /*
      Outer shadow.
    */

    ctx.shadowColor =
      "rgba(0,0,0,0.28)";

    ctx.shadowBlur =
      7;

    ctx.shadowOffsetY =
      3;


    const gradient =
      ctx.createRadialGradient(
        -radius * 0.34,
        -radius * 0.38,
        radius * 0.08,

        0,
        0,
        radius
      );


    const base =
      colorValue(
        color
      );


    const light =
      lightenColor(
        base,
        0.28
      );


    const dark =
      darkenColor(
        base,
        0.20
      );


    gradient.addColorStop(
      0,
      "#ffffff"
    );

    gradient.addColorStop(
      0.16,
      light
    );

    gradient.addColorStop(
      0.58,
      base
    );

    gradient.addColorStop(
      1,
      dark
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


    /*
      Gloss.
    */

    ctx.shadowColor =
      "transparent";


    const gloss =
      ctx.createRadialGradient(
        -radius * 0.34,
        -radius * 0.42,
        1,

        -radius * 0.25,
        -radius * 0.30,
        radius * 0.42
      );


    gloss.addColorStop(
      0,
      "rgba(255,255,255,0.92)"
    );

    gloss.addColorStop(
      0.25,
      "rgba(255,255,255,0.42)"
    );

    gloss.addColorStop(
      1,
      "rgba(255,255,255,0)"
    );


    ctx.fillStyle =
      gloss;


    ctx.beginPath();

    ctx.arc(
      -radius * 0.18,
      -radius * 0.22,
      radius * 0.48,
      0,
      Math.PI * 2
    );

    ctx.fill();


    /*
      Outer rim.
    */

    ctx.strokeStyle =
      "rgba(255,255,255,0.28)";

    ctx.lineWidth =
      1.5;


    ctx.beginPath();

    ctx.arc(
      0,
      0,
      radius - 0.8,
      0,
      Math.PI * 2
    );

    ctx.stroke();


    /*
      Special-ball icon.
    */

    if (
      special
    ) {

      drawSpecialIcon(
        special,
        radius
      );

    }
  /* ==========================================================
     SPECIAL ICONS
  ========================================================== */

  function drawSpecialIcon(
    special,
    radius
  ) {

    ctx.save();


    /*
      Special icons are deliberately
      simple and readable on mobile.
    */

    ctx.shadowColor =
      "rgba(0,0,0,0.18)";

    ctx.shadowBlur =
      2;


    if (
      special === "laser"
    ) {

      /*
        ⚡ Laser
      */

      ctx.fillStyle =
        "#fff7bd";

      ctx.strokeStyle =
        "#fff";

      ctx.lineWidth =
        1.2;


      ctx.beginPath();

      ctx.moveTo(
        radius * 0.10,
        -radius * 0.58
      );

      ctx.lineTo(
        -radius * 0.12,
        -radius * 0.08
      );

      ctx.lineTo(
        radius * 0.10,
        -radius * 0.08
      );

      ctx.lineTo(
        -radius * 0.08,
        radius * 0.58
      );

      ctx.lineTo(
        radius * 0.34,
        radius * 0.02
      );

      ctx.lineTo(
        radius * 0.10,
        radius * 0.02
      );

      ctx.closePath();

      ctx.fill();

      ctx.stroke();

    }


    else if (
      special === "bomb"
    ) {

      /*
        💣 Bomb
      */

      ctx.fillStyle =
        "#24365d";

      ctx.strokeStyle =
        "#fff4cf";

      ctx.lineWidth =
        1.6;


      ctx.beginPath();

      ctx.arc(
        0,
        3,
        radius * 0.42,
        0,
        Math.PI * 2
      );

      ctx.fill();

      ctx.stroke();


      /*
        Fuse
      */

      ctx.beginPath();

      ctx.moveTo(
        radius * 0.20,
        -radius * 0.32
      );

      ctx.quadraticCurveTo(
        radius * 0.40,
        -radius * 0.62,
        radius * 0.58,
        -radius * 0.42
      );

      ctx.stroke();


      /*
        Fuse spark
      */

      ctx.fillStyle =
        "#ffe48a";


      ctx.beginPath();

      ctx.arc(
        radius * 0.59,
        -radius * 0.42,
        radius * 0.10,
        0,
        Math.PI * 2
      );

      ctx.fill();

    }


    else if (
      special === "rainbow"
    ) {

      /*
        🌈 Rainbow
      */

      const colors = [
        "#ff4f70",
        "#ffd84d",
        "#62d76f",
        "#4d9cff",
        "#b56cff"
      ];


      ctx.lineWidth =
        radius * 0.13;

      ctx.lineCap =
        "round";


      for (
        let i = 0;
        i < colors.length;
        i++
      ) {

        ctx.strokeStyle =
          colors[i];

        ctx.beginPath();

        ctx.arc(
          0,
          radius * 0.16,
          radius *
            (
              0.22 +
              i * 0.12
            ),
          Math.PI,
          Math.PI * 2
        );

        ctx.stroke();

      }

    }


    else if (
      special === "sun"
    ) {

      /*
        ☀ Sun
      */

      ctx.strokeStyle =
        "#fff7c2";

      ctx.fillStyle =
        "#ffe071";

      ctx.lineWidth =
        2;


      for (
        let i = 0;
        i < 8;
        i++
      ) {

        const angle =
          (
            Math.PI * 2 /
            8
          ) *
          i;


        const x1 =
          Math.cos(angle) *
          radius *
          0.38;


        const y1 =
          Math.sin(angle) *
          radius *
          0.38;


        const x2 =
          Math.cos(angle) *
          radius *
          0.63;


        const y2 =
          Math.sin(angle) *
          radius *
          0.63;


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


      ctx.beginPath();

      ctx.arc(
        0,
        0,
        radius * 0.34,
        0,
        Math.PI * 2
      );

      ctx.fill();

    }


    ctx.restore();

  }


  /* ==========================================================
     COLOR HELPERS
  ========================================================== */

  function colorValue(
    color
  ) {

    const colors = {

      red:
        "#ef5265",

      yellow:
        "#f4c94f",

      green:
        "#56c978",

      blue:
        "#4d8ee8",

      purple:
        "#9b6be7",

      pink:
        "#e875b8"

    };


    return (
      colors[color] ||
      color ||
      "#ffffff"
    );

  }


  function hexToRgb(
    hex
  ) {

    if (
      !hex
    ) {

      return {
        r: 255,
        g: 255,
        b: 255
      };

    }


    hex =
      hex.replace(
        "#",
        ""
      );


    if (
      hex.length === 3
    ) {

      hex =
        hex
          .split("")
          .map(
            x =>
              x + x
          )
          .join("");

    }


    const value =
      parseInt(
        hex,
        16
      );


    return {

      r:
        (
          value >>
          16
        ) & 255,

      g:
        (
          value >>
          8
        ) & 255,

      b:
        value &
        255

    };

  }


  function rgbToHex(
    r,
    g,
    b
  ) {

    const clamp =
      value =>
        Math.max(
          0,
          Math.min(
            255,
            Math.round(
              value
            )
          )
        );


    return (
      "#" +
      [r, g, b]
        .map(
          value =>
            clamp(value)
              .toString(16)
              .padStart(
                2,
                "0"
              )
        )
        .join("")
    );

  }


  function lightenColor(
    color,
    amount
  ) {

    const rgb =
      hexToRgb(
        color
      );


    return rgbToHex(

      rgb.r +
        (
          255 -
          rgb.r
        ) *
        amount,

      rgb.g +
        (
          255 -
          rgb.g
        ) *
        amount,

      rgb.b +
        (
          255 -
          rgb.b
        ) *
        amount

    );

  }


  function darkenColor(
    color,
    amount
  ) {

    const rgb =
      hexToRgb(
        color
      );


    return rgbToHex(

      rgb.r *
        (
          1 -
          amount
        ),

      rgb.g *
        (
          1 -
          amount
        ),

      rgb.b *
        (
          1 -
          amount
        )

    );

  }


  /* ==========================================================
     POP EFFECTS
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


      if (
        elapsed <= 0
      ) {

        continue;

      }


      const progress =
        Math.min(
          1,
          elapsed /
          effect.max
        );


      const scale =
        0.35 +
        progress *
        1.35;


      const alpha =
        1 -
        progress;


      ctx.save();

      ctx.globalAlpha =
        alpha;


      ctx.strokeStyle =
        colorValue(
          effect.color
        );


      ctx.lineWidth =
        2.5;


      ctx.beginPath();

      ctx.arc(
        effect.x,
        effect.y,
        RADIUS *
        scale,
        0,
        Math.PI * 2
      );

      ctx.stroke();


      /*
        Small white highlight
      */

      ctx.globalAlpha =
        alpha *
        0.65;

      ctx.fillStyle =
        "#ffffff";


      ctx.beginPath();

      ctx.arc(
        effect.x -
          RADIUS *
          0.25,

        effect.y -
          RADIUS *
          0.25,

        3 +
          progress * 2,

        0,
        Math.PI * 2
      );

      ctx.fill();


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

      const progress =
        ring.life /
        ring.max;


      const radius =
        ring.radius +
        progress *
        ring.growth;


      ctx.save();

      ctx.globalAlpha =
        (
          1 -
          progress
        ) *
        0.75;


      ctx.strokeStyle =
        ring.color ||
        "#fff2b5";


      ctx.lineWidth =
        ring.lineWidth ||
        3;


      ctx.beginPath();

      ctx.arc(
        ring.x,
        ring.y,
        radius,
        0,
        Math.PI * 2
      );

      ctx.stroke();

      ctx.restore();

    }

  }


  /* ==========================================================
     IMPACT EFFECTS
  ========================================================== */

  function drawImpacts() {

    for (
      const impact
      of impacts
    ) {

      const progress =
        impact.life /
        impact.max;


      ctx.save();

      ctx.globalAlpha =
        1 -
        progress;


      ctx.fillStyle =
        "#fff5ce";


      ctx.beginPath();

      ctx.arc(
        impact.x,
        impact.y,
        3 +
          progress * 12,
        0,
        Math.PI * 2
      );

      ctx.fill();


      ctx.restore();

    }

  }


  /* ==========================================================
     PARTICLES
  ========================================================== */

  function drawParticles() {

    for (
      const particle
      of particles
    ) {

      const progress =
        particle.life /
        particle.max;


      const alpha =
        Math.max(
          0,
          1 -
          progress
        );


      ctx.save();

      ctx.globalAlpha =
        alpha;


      ctx.fillStyle =
        colorValue(
          particle.color
        );


      ctx.translate(
        particle.x,
        particle.y
      );


      ctx.rotate(
        particle.rotation ||
        0
      );


      const size =
        particle.size ||
        4;


      ctx.fillRect(
        -size / 2,
        -size / 2,
        size,
        size
      );


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

      const progress =
        burst.life /
        burst.max;


      const radius =
        burst.radius *
        (
          0.2 +
          progress *
          0.8
        );


      ctx.save();

      ctx.globalAlpha =
        (
          1 -
          progress
        );


      ctx.strokeStyle =
        burst.color ||
        "#fff3bd";


      ctx.lineWidth =
        4 *
        (
          1 -
          progress
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


      /*
        Radial rays.
      */

      const rays =
        10;


      for (
        let i = 0;
        i < rays;
        i++
      ) {

        const angle =
          (
            Math.PI * 2 /
            rays
          ) *
          i;


        const inner =
          radius *
          0.72;


        const outer =
          radius *
          (
            1.02 +
            (
              i % 2
            ) *
            0.16
          );


        ctx.beginPath();

        ctx.moveTo(
          burst.x +
            Math.cos(angle) *
            inner,

          burst.y +
            Math.sin(angle) *
            inner
        );


        ctx.lineTo(
          burst.x +
            Math.cos(angle) *
            outer,

          burst.y +
            Math.sin(angle) *
            outer
        );


        ctx.stroke();

      }


      ctx.restore();

    }

  }


  /* ==========================================================
     LAUNCHER POSITION
  ========================================================== */

  function getLauncherPosition() {

    return {

      x:
        W / 2,

      y:
        H - 73

    };

  }


  /* ==========================================================
     AIM POINT
  ========================================================== */

  function setAimFromPoint(
    clientX,
    clientY
  ) {

    if (
      busy ||
      movingBubble
    ) {

      return;

    }


    const rect =
      canvas.getBoundingClientRect();


    const x =
      (
        clientX -
        rect.left
      ) *
      (
        W /
        rect.width
      );


    const y =
      (
        clientY -
        rect.top
      ) *
      (
        H /
        rect.height
      );


    const launcher =
      getLauncherPosition();


    let dx =
      x -
      launcher.x;


    let dy =
      y -
      launcher.y;


    /*
      Never allow aiming downward.
    */

    if (
      dy >
      -35
    ) {

      dy =
        -35;

    }


    const length =
      Math.hypot(
        dx,
        dy
      );


    if (
      length <
      0.001
    ) {

      return;

    }


    dx /=
      length;

    dy /=
      length;


    aimDirection = {

      x:
        dx,

      y:
        dy

    };


    draw();

  }


  /* ==========================================================
     POINTER INPUT
  ========================================================== */

  let pointerHolding =
    false;

  let activePointerId =
    null;


  canvas.addEventListener(
    "pointerdown",
    event => {

      if (
        busy
      ) {

        return;

      }


      pointerHolding =
        true;

      activePointerId =
        event.pointerId;


      try {

        canvas.setPointerCapture(
          event.pointerId
        );

      } catch (
        error
      ) {}


      setAimFromPoint(
        event.clientX,
        event.clientY
      );

      event.preventDefault();

    },
    {
      passive:
        false
    }
  );


  canvas.addEventListener(
    "pointermove",
    event => {

      if (
        !pointerHolding ||
        activePointerId !==
        event.pointerId
      ) {

        return;

      }


      setAimFromPoint(
        event.clientX,
        event.clientY
      );


      event.preventDefault();

    },
    {
      passive:
        false
    }
  );


  canvas.addEventListener(
    "pointerup",
    event => {

      if (
        activePointerId !==
        event.pointerId
      ) {

        return;

      }


      setAimFromPoint(
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

      } catch (
        error
      ) {}


      shoot();

      event.preventDefault();

    },
    {
      passive:
        false
    }
  );


  canvas.addEventListener(
    "pointercancel",
    event => {

      if (
        activePointerId ===
        event.pointerId
      ) {

        pointerHolding =
          false;

        activePointerId =
          null;

      }

    }
  );


  canvas.addEventListener(
    "pointerleave",
    event => {

      /*
        Do NOT cancel aiming here.
        Pointer capture keeps the
        drag working correctly.
      */

    }
  );
      /* ==========================================================
     BUTTON / UI EVENTS
  ========================================================== */

  function bindButton(
    id,
    handler
  ) {

    const element =
      document.getElementById(
        id
      );


    if (
      !element
    ) {

      return;

    }


    element.addEventListener(
      "click",
      event => {

        event.preventDefault();

        handler();

      }
    );

  }


  /* ----------------------------------------------------------
     HOME
  ---------------------------------------------------------- */

  bindButton(
    "playButton",
    () => {

      showScreen(
        "levelsScreen"
      );

      renderLevels();

    }
  );


  /* ----------------------------------------------------------
     LEVEL SELECT
  ---------------------------------------------------------- */

  bindButton(
    "backHomeButton",
    () => {

      showScreen(
        "homeScreen"
      );

    }
  );


  /* ----------------------------------------------------------
     GAME BACK
  ---------------------------------------------------------- */

  bindButton(
    "gameBackButton",
    () => {

      /*
        Invalidate all delayed actions
        from the current game.
      */

      gameSession++;

      actionSerial++;

      currentActionId =
        actionSerial;


      movingBubble =
        null;

      fallingBubbles.length =
        0;

      particles.length =
        0;

      popEffects.length =
        0;

      rings.length =
        0;

      impacts.length =
        0;

      specialBursts.length =
        0;


      busy =
        false;


      resetPointerState();


      showScreen(
        "levelsScreen"
      );

      renderLevels();

    }
  );


  /* ----------------------------------------------------------
     SOUND
  ---------------------------------------------------------- */

  bindButton(
    "soundButton",
    () => {

      soundEnabled =
        !soundEnabled;


      localStorage.setItem(
        "bulbuleSound",
        soundEnabled
          ? "1"
          : "0"
      );


      updateSoundButton();


      if (
        soundEnabled
      ) {

        playSound(
          "pop"
        );

      }

    }
  );


  bindButton(
    "settingsButton",
    () => {

      openModal(
        "settingsModal"
      );

    }
  );


  bindButton(
    "closeSettingsButton",
    () => {

      closeModal(
        "settingsModal"
      );

    }
  );


  bindButton(
    "settingsMuteButton",
    () => {

      soundEnabled =
        !soundEnabled;


      localStorage.setItem(
        "bulbuleSound",
        soundEnabled
          ? "1"
          : "0"
      );


      updateSoundButton();

      updateSettingsMuteButton();

    }
  );


  /* ==========================================================
     RESULT MODAL
  ========================================================== */

  bindButton(
    "nextLevelButton",
    () => {

      closeModal(
        "resultModal"
      );


      if (
        level <
        MAX_LEVEL
      ) {

        startLevel(
          level + 1
        );

      } else {

        showScreen(
          "levelsScreen"
        );

        renderLevels();

      }

    }
  );


  bindButton(
    "retryButton",
    () => {

      closeModal(
        "resultModal"
      );


      startLevel(
        level
      );

    }
  );


  bindButton(
    "resultLevelsButton",
    () => {

      closeModal(
        "resultModal"
      );


      showScreen(
        "levelsScreen"
      );

      renderLevels();

    }
  );


  /* ==========================================================
     MODAL HELPERS
  ========================================================== */

  function openModal(
    id
  ) {

    const modal =
      document.getElementById(
        id
      );


    if (
      !modal
    ) {

      return;

    }


    modal.classList.add(
      "show"
    );


    modal.setAttribute(
      "aria-hidden",
      "false"
    );

  }


  function closeModal(
    id
  ) {

    const modal =
      document.getElementById(
        id
      );


    if (
      !modal
    ) {

      return;

    }


    modal.classList.remove(
      "show"
    );


    modal.setAttribute(
      "aria-hidden",
      "true"
    );

  }


  /* ==========================================================
     SCREEN MANAGEMENT
  ========================================================== */

  function showScreen(
    screenId
  ) {

    const screens =
      document.querySelectorAll(
        ".screen"
      );


    screens.forEach(
      screen => {

        screen.classList.remove(
          "active"
        );

      }
    );


    const target =
      document.getElementById(
        screenId
      );


    if (
      target
    ) {

      target.classList.add(
        "active"
      );

    }


    /*
      Stop gameplay when leaving
      the game screen.
    */

    if (
      screenId !==
      "gameScreen"
    ) {

      resetPointerState();

    }

  }


  /* ==========================================================
     LEVEL SCREEN
  ========================================================== */

  function renderLevels() {

    const container =
      document.getElementById(
        "levelsGrid"
      );


    if (
      !container
    ) {

      return;

    }


    container.innerHTML =
      "";


    for (
      let i = 1;
      i <= MAX_LEVEL;
      i++
    ) {

      const button =
        document.createElement(
          "button"
        );


      button.className =
        "level-card";


      const unlocked =
        i <=
        highestUnlocked;


      const completed =
        i <
        highestUnlocked;


      if (
        !unlocked
      ) {

        button.classList.add(
          "locked"
        );

      }


      if (
        completed
      ) {

        button.classList.add(
          "completed"
        );

      }


      button.innerHTML = `

        <span class="level-number">
          ${i}
        </span>

        <span class="level-status">
          ${
            completed
              ? "✓"
              : unlocked
                ? "▶"
                : "🔒"
          }
        </span>

      `;


      if (
        unlocked
      ) {

        button.addEventListener(
          "click",
          () => {

            startLevel(
              i
            );

          }
        );

      }


      container.appendChild(
        button
      );

    }

  }


  /* ==========================================================
     START LEVEL
  ========================================================== */

  function startLevel(
    requestedLevel
  ) {

    level =
      Math.max(
        1,
        Math.min(
          MAX_LEVEL,
          requestedLevel
        )
      );


    showScreen(
      "gameScreen"
    );


    createLevel(
      level
    );


    updateUI();

  }


  /* ==========================================================
     UPDATE UI
  ========================================================== */

  function updateUI() {

    const levelElement =
      document.getElementById(
        "levelNumber"
      );


    const scoreElement =
      document.getElementById(
        "scoreNumber"
      );


    const pressureElement =
      document.getElementById(
        "pressureNumber"
      );


    const bestElement =
      document.getElementById(
        "bestNumber"
      );


    if (
      levelElement
    ) {

      levelElement.textContent =
        level;

    }


    if (
      scoreElement
    ) {

      scoreElement.textContent =
        score;

    }


    if (
      pressureElement
    ) {

      const pressure =
        Math.min(
          100,
          Math.round(
            (
              ceilingRows /
              Math.max(
                1,
                MAX_CEILING_ROWS
              )
            ) *
            100
          )
        );


      pressureElement.textContent =
        `${pressure}%`;

    }


    if (
      bestElement
    ) {

      bestElement.textContent =
        bestScore;

    }


    updateSoundButton();

    updateSettingsMuteButton();

  }


  /* ==========================================================
     SOUND BUTTON UI
  ========================================================== */

  function updateSoundButton() {

    const button =
      document.getElementById(
        "soundButton"
      );


    if (
      !button
    ) {

      return;

    }


    button.textContent =
      soundEnabled
        ? "🔊"
        : "🔇";


    button.setAttribute(
      "aria-label",
      soundEnabled
        ? "Sound on"
        : "Sound off"
    );

  }


  function updateSettingsMuteButton() {

    const button =
      document.getElementById(
        "settingsMuteButton"
      );


    if (
      !button
    ) {

      return;

    }


    button.textContent =
      soundEnabled
        ? "🔊 Sound On"
        : "🔇 Sound Off";

  }


  /* ==========================================================
     MESSAGE POPUP
     TEXT ONLY — NO BOX
  ========================================================== */

  function showMessage(
    text
  ) {

    const element =
      document.getElementById(
        "message"
      );


    if (
      !element
    ) {

      return;

    }


    if (
      messageTimer
    ) {

      clearTimeout(
        messageTimer
      );

      messageTimer =
        null;

    }


    if (
      messageAnimation
    ) {

      try {

        messageAnimation.cancel();

      } catch (
        error
      ) {}

      messageAnimation =
        null;

    }


    /*
      Existing CSS may define the
      message as a large box.
      These inline values deliberately
      override it.
    */

    Object.assign(
      element.style,
      {

        position:
          "absolute",

        left:
          "50%",

        top:
          "50%",

        transform:
          "translate(-50%, -50%)",

        width:
          "max-content",

        maxWidth:
          "86%",

        height:
          "auto",

        minHeight:
          "0",

        padding:
          "0",

        margin:
          "0",

        background:
          "transparent",

        border:
          "0",

        borderRadius:
          "0",

        boxShadow:
          "none",

        backdropFilter:
          "none",

        WebkitBackdropFilter:
          "none",

        color:
          "#fff7df",

        fontSize:
          "clamp(20px, 4.8vw, 28px)",

        fontWeight:
          "800",

        lineHeight:
          "1.25",

        textAlign:
          "center",

        pointerEvents:
          "none",

        zIndex:
          "20"

      }
    );


    element.textContent =
      text;


    element.classList.add(
      "show"
    );


    /*
      Fade in → hold → fade out.
    */

    try {

      messageAnimation =
        element.animate(

          [
            {
              opacity:
                0,

              transform:
                "translate(-50%, -50%) scale(0.94)"
            },

            {
              opacity:
                1,

              transform:
                "translate(-50%, -50%) scale(1)"
            },

            {
              opacity:
                1,

              transform:
                "translate(-50%, -50%) scale(1)"
            },

            {
              opacity:
                0,

              transform:
                "translate(-50%, -50%) scale(1.03)"
            }

          ],

          {
            duration:
              1700,

            easing:
              "ease-out",

            fill:
              "forwards"

          }

        );


    } catch (
      error
    ) {

      element.style.opacity =
        "1";

    }


    messageTimer =
      setTimeout(
        () => {

          element.classList.remove(
            "show"
          );

          element.style.opacity =
            "0";

          messageTimer =
            null;

        },
        1800
      );

  }


  /* ==========================================================
     AUDIO
  ========================================================== */

  let audioContext =
    null;


  function getAudioContext() {

    if (
      !soundEnabled
    ) {

      return null;

    }


    if (
      !audioContext
    ) {

      try {

        audioContext =
          new (
            window.AudioContext ||
            window.webkitAudioContext
          )();

      } catch (
        error
      ) {

        return null;

      }

    }


    if (
      audioContext.state ===
      "suspended"
    ) {

      audioContext.resume()
        .catch(
          () => {}
        );

    }


    return audioContext;

  }


  function playTone(
    frequency,
    duration,
    type = "sine",
    volume = 0.035
  ) {

    const audio =
      getAudioContext();


    if (
      !audio
    ) {

      return;

    }


    try {

      const oscillator =
        audio.createOscillator();


      const gain =
        audio.createGain();


      oscillator.type =
        type;


      oscillator.frequency.setValueAtTime(
        frequency,
        audio.currentTime
      );


      gain.gain.setValueAtTime(
        0.0001,
        audio.currentTime
      );


      gain.gain.exponentialRampToValueAtTime(
        volume,
        audio.currentTime +
          0.015
      );


      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        audio.currentTime +
          duration
      );


      oscillator.connect(
        gain
      );


      gain.connect(
        audio.destination
      );


      oscillator.start();


      oscillator.stop(
        audio.currentTime +
        duration +
        0.03
      );

    } catch (
      error
    ) {}

  }


  function playSound(
    type
  ) {

    if (
      !soundEnabled
    ) {

      return;

    }


    switch (
      type
    ) {

      case "shoot":

        playTone(
          330,
          0.09,
          "triangle",
          0.025
        );

        break;


      case "pop":

        playTone(
          620,
          0.08,
          "sine",
          0.035
        );

        setTimeout(
          () =>
            playTone(
              820,
              0.10,
              "sine",
              0.025
            ),
          35
        );

        break;


      case "special":

        playTone(
          440,
          0.10,
          "triangle",
          0.035
        );

        setTimeout(
          () =>
            playTone(
              660,
              0.12,
              "triangle",
              0.03
            ),
          60
        );

        setTimeout(
          () =>
            playTone(
              880,
              0.14,
              "sine",
              0.025
            ),
          120
        );

        break;


      case "drop":

        playTone(
          220,
          0.12,
          "sine",
          0.025
        );

        break;


      case "level":

        playTone(
          523,
          0.12,
          "sine",
          0.035
        );

        setTimeout(
          () =>
            playTone(
              659,
              0.12,
              "sine",
              0.035
            ),
          90
        );

        setTimeout(
          () =>
            playTone(
              784,
              0.18,
              "sine",
              0.035
            ),
          180
        );

        break;


      case "danger":

        playTone(
          180,
          0.18,
          "sawtooth",
          0.025
        );

        break;

    }

  }


  /* ==========================================================
     VISIBILITY / TAB SWITCH PROTECTION
  ========================================================== */

  function resetPointerState() {

    pointerHolding =
      false;

    activePointerId =
      null;

  }


  document.addEventListener(
    "visibilitychange",
    () => {

      paused =
        document.hidden;


      resetPointerState();


      /*
        Prevent a huge dt jump when
        the page becomes active again.
      */

      lastTime =
        performance.now();

    }
  );


  window.addEventListener(
    "pagehide",
    () => {

      paused =
        true;


      resetPointerState();


      lastTime =
        performance.now();

    }
  );


  window.addEventListener(
    "pageshow",
    () => {

      paused =
        false;


      resetPointerState();


      lastTime =
        performance.now();

    }
  );


  /* ==========================================================
     RESIZE
  ========================================================== */

  function resizeCanvas() {

    const rect =
      canvas.getBoundingClientRect();


    const dpr =
      Math.min(
        2,
        window.devicePixelRatio ||
        1
      );


    canvas.width =
      Math.round(
        rect.width *
        dpr
      );


    canvas.height =
      Math.round(
        rect.height *
        dpr
      );


    /*
      Keep game coordinates fixed
      while rendering at device pixel
      resolution.
    */

    ctx.setTransform(
      dpr,
      0,
      0,
      dpr,
      0,
      0
    );

  }


  window.addEventListener(
    "resize",
    () => {

      resizeCanvas();

      draw();

    }
  );


  /* ==========================================================
     INITIAL UI STATE
  ========================================================== */

  soundEnabled =
    localStorage.getItem(
      "bulbuleSound"
    ) !== "0";


  highestUnlocked =
    Math.max(
      1,
      Math.min(
        MAX_LEVEL,
        parseInt(
          localStorage.getItem(
            "bulbuleHighestLevel"
          ) ||
          "1",
          10
        )
      )
    );


  bestScore =
    parseInt(
      localStorage.getItem(
        "bulbuleBestScore"
      ) ||
      "0",
      10
    );


  updateSoundButton();

  updateSettingsMuteButton();

  renderLevels();

  resizeCanvas();


  /* ==========================================================
     GAME LOOP
  ========================================================== */

  let lastTime =
    performance.now();


  function gameLoop(
    now
  ) {

    /*
      When the browser tab/app is
      hidden, don't accumulate elapsed
      time. This prevents the game from
      jumping/freezing after returning.
    */

    if (
      paused
    ) {

      lastTime =
        now;

      draw();

      requestAnimationFrame(
        gameLoop
      );

      return;

    }


    let dt =
      (
        now -
        lastTime
      ) /
      1000;


    lastTime =
      now;


    /*
      Safety cap.
      Even if the browser stalls for
      some reason, physics never gets a
      massive time step.
    */

    dt =
      Math.min(
        0.033,
        Math.max(
          0,
          dt
        )
      );


    update(
      dt
    );


    draw();


    requestAnimationFrame(
      gameLoop
    );

  }


  requestAnimationFrame(
    gameLoop
  );


  /* ==========================================================
     STARTUP
  ========================================================== */

  showScreen(
    "homeScreen"
  );


  updateUI();


    ctx.restore();

  }
    /* ==========================================================
     FINAL SAFETY / INITIALIZATION
  ========================================================== */

  /*
    Make sure the canvas always starts
    with a valid aim direction.
  */

  if (
    !aimDirection
  ) {

    aimDirection = {
      x: 0,
      y: -1
    };

  }


  /*
    Initial draw.
  */

  draw();


  /*
    Prevent accidental browser gestures
    while playing on mobile.
  */

  canvas.style.touchAction =
    "none";


  /*
    Prevent context menu on long press.
  */

  canvas.addEventListener(
    "contextmenu",
    event => {

      event.preventDefault();

    }
  );


  /* ==========================================================
     KEYBOARD SUPPORT
  ========================================================== */

  document.addEventListener(
    "keydown",
    event => {

      /*
        Escape closes open modals.
      */

      if (
        event.key ===
        "Escape"
      ) {

        closeModal(
          "settingsModal"
        );

        closeModal(
          "resultModal"
        );

        return;

      }


      /*
        Space shoots using the
        current aim direction.
      */

      if (
        event.code ===
        "Space"
      ) {

        if (
          document.getElementById(
            "gameScreen"
          )?.classList.contains(
            "active"
          )
        ) {

          event.preventDefault();

          shoot();

        }

      }

    }
  );


  /* ==========================================================
     BEFORE UNLOAD
  ========================================================== */

  window.addEventListener(
    "beforeunload",
    () => {

      /*
        Invalidate delayed actions so
        nothing from this session can
        affect a future page state.
      */

      gameSession++;

      actionSerial++;

      currentActionId =
        actionSerial;


      resetPointerState();

    }
  );


  /* ==========================================================
     FINAL UI SYNC
  ========================================================== */

  updateUI();

  renderLevels();

  resizeCanvas();

  draw();


})();
