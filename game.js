/* ============================================================
   बुलबुले का खेल
   PREMIUM MITHILA BUBBLE SHOOTER
   Launcher + Bounce + Falling Physics
   ============================================================ */

(() => {

  "use strict";


  /* ==========================================================
     BASIC SETTINGS
  ========================================================== */

  const MAX_LEVEL = 50;

  const SAVE_KEY = "bulbule-ka-khel-v7";

  const COLORS = [
    "#e85b67",
    "#e6c64f",
    "#5eae78",
    "#5793d4",
    "#9670c6",
    "#d77da0"
  ];

  const canvas =
    document.getElementById("gameCanvas");

  const ctx =
    canvas.getContext("2d");

  const $ = id =>
    document.getElementById(id);


  const W = 480;

  const H = 760;

  const R = 20;

  const COLS = 11;

  const ROW_H = 35;

  const TOP = 48;

  const SHOOTER_Y = H - 70;

  const DANGER_Y = SHOOTER_Y - 100;

  const MISS_LIMIT = 3;


  /* ==========================================================
     GAME STATE
  ========================================================== */

  let save = loadSave();

  let grid = [];

  let shooter = 0;

  let next = 1;

  let moving = null;

  let falling = [];

  let particles = [];

  let pops = [];

  let impactRings = [];

  let aim = {
    x: W / 2,
    y: 230
  };

  let busy = false;

  let won = false;

  let gameOver = false;

  let last = 0;

  let shotsSincePop = 0;

  let descentAnim = null;

  let audioCtx = null;

  let launcherBounce = 0;

  let launcherRecoil = 0;


  /* ==========================================================
     SAVE
  ========================================================== */

  function loadSave(){

    const fallback = {
      currentLevel: 1,
      unlocked: 1,
      completed: [],
      score: 0,
      best: 0,
      sound: true
    };

    try{

      const current =
        JSON.parse(
          localStorage.getItem(SAVE_KEY) || "null"
        );

      if(current){
        return {
          ...fallback,
          ...current
        };
      }

    }catch(_){}

    return fallback;
  }


  function persist(){

    try{

      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify(save)
      );

    }catch(_){}

  }


  /* ==========================================================
     LEVEL
  ========================================================== */

  function availableColors(){

    return Math.min(
      6,
      3 +
      Math.floor(
        (save.currentLevel - 1) / 8
      )
    );

  }


  function rnd(){

    return Math.floor(
      Math.random() *
      availableColors()
    );

  }


  /* ==========================================================
     POSITION
  ========================================================== */

  function pos(q,r){

    return {

      x:
        W / 2 +
        (q - (COLS - 1) / 2) *
        R * 2 +
        (r % 2 ? R : 0),

      y:
        TOP +
        r * ROW_H

    };

  }


  function neighbors(q,r){

    const dirs =
      r % 2

        ? [
            [-1,0],
            [1,0],
            [0,-1],
            [1,-1],
            [0,1],
            [1,1]
          ]

        : [
            [-1,0],
            [1,0],
            [-1,-1],
            [0,-1],
            [-1,1],
            [0,1]
          ];


    return dirs

      .map(
        ([x,y]) =>
          [q+x,r+y]
      )

      .filter(
        ([x,y]) =>
          x >= 0 &&
          x < COLS &&
          y >= 0 &&
          y < grid.length
      );

  }


  /* ==========================================================
     CREATE LEVEL
  ========================================================== */

  function createLevel(){

    grid = [];

    const rows =
      Math.min(
        6 +
        Math.floor(
          (save.currentLevel - 1) / 6
        ),
        12
      );


    const density =
      Math.min(
        0.9,
        0.68 +
        save.currentLevel * 0.004
      );


    for(let r=0;r<rows;r++){

      grid[r] = [];

      for(let q=0;q<COLS;q++){

        let value =
          Math.random() < density
            ? rnd()
            : -1;


        if(
          r > 4 &&
          Math.random() < 0.18
        ){

          value = -1;

        }


        grid[r][q] = value;

      }

    }


    /* Top row always attached */

    for(let q=0;q<COLS;q++){

      if(grid[0][q] < 0){

        grid[0][q] = rnd();

      }

    }


    shooter = rnd();

    next = rnd();

    moving = null;

    falling = [];

    particles = [];

    pops = [];

    impactRings = [];

    busy = false;

    won = false;

    gameOver = false;

    shotsSincePop = 0;

    descentAnim = null;

    launcherBounce = 0;

    launcherRecoil = 0;


    msg(
      "निशाना लगाइए और बुलबुला छोड़िए!"
    );

    ui();

  }


  /* ==========================================================
     UI
  ========================================================== */

  function ui(){

    $("levelText").textContent =
      save.currentLevel;

    $("scoreText").textContent =
      save.score;

    $("bestText").textContent =
      save.best;


    setMiniBubble(
      $("currentBubble"),
      shooter
    );

    setMiniBubble(
      $("nextBubble"),
      next
    );


    const remaining =
      Math.max(
        0,
        MISS_LIMIT - shotsSincePop
      );


    $("pressureText").textContent =
      `${remaining} शॉट`;


    $("pressureBar").style.width =
      `${Math.min(
        100,
        shotsSincePop /
        MISS_LIMIT *
        100
      )}%`;

  }


  function setMiniBubble(
    element,
    colorIndex
  ){

    if(!element) return;

    element.style.background =
      `radial-gradient(
        circle at 30% 25%,
        #fff 0 8%,
        ${COLORS[colorIndex]} 38%,
        ${shade(COLORS[colorIndex],-35)} 100%
      )`;

  }


  function shade(hex,amount){

    const n =
      parseInt(
        hex.slice(1),
        16
      );


    const r =
      Math.max(
        0,
        Math.min(
          255,
          (n >> 16) + amount
        )
      );


    const g =
      Math.max(
        0,
        Math.min(
          255,
          ((n >> 8) & 255) +
          amount
        )
      );


    const b =
      Math.max(
        0,
        Math.min(
          255,
          (n & 255) +
          amount
        )
      );


    return `rgb(${r},${g},${b})`;

  }


  /* ==========================================================
     SCREENS
  ========================================================== */

  function show(screen){

    $("homeScreen")
      .classList.add("hidden");

    $("levelsScreen")
      .classList.add("hidden");

    $("gameScreen")
      .classList.add("hidden");


    screen.classList.remove("hidden");

  }


  function renderLevels(){

    const box =
      $("levelsGrid");

    box.innerHTML = "";


    for(
      let i=1;
      i<=MAX_LEVEL;
      i++
    ){

      const unlocked =
        i <= save.unlocked;

      const done =
        save.completed.includes(i);


      const button =
        document.createElement(
          "button"
        );


      button.className =
        `level-btn ${
          done
            ? "done"
            : unlocked
              ? "open"
              : "locked"
        }`;


      button.innerHTML =
        unlocked

          ? `${i}${
              done
                ? '<span class="star">⭐</span>'
                : ""
            }`

          : `🔒<small>${i}</small>`;


      if(unlocked){

        button.onclick = () => {

          save.currentLevel = i;

          persist();

          show(
            $("gameScreen")
          );

          createLevel();

        };

      }


      box.appendChild(button);

    }

  }


  /* ==========================================================
     MESSAGE
  ========================================================== */

  function msg(text){

    $("message").textContent =
      text;

  }


  /* ==========================================================
     SOUND
  ========================================================== */

  function tone(
    frequency,
    duration=.08,
    type="sine",
    volume=.035
  ){

    if(!save.sound)
      return;


    try{

      if(!audioCtx){

        audioCtx =
          new (
            window.AudioContext ||
            window.webkitAudioContext
          )();

      }


      const oscillator =
        audioCtx.createOscillator();

      const gain =
        audioCtx.createGain();


      oscillator.type =
        type;

      oscillator.frequency.value =
        frequency;


      gain.gain.setValueAtTime(
        volume,
        audioCtx.currentTime
      );


      gain.gain.exponentialRampToValueAtTime(
        .001,
        audioCtx.currentTime +
        duration
      );


      oscillator.connect(gain);

      gain.connect(
        audioCtx.destination
      );


      oscillator.start();

      oscillator.stop(
        audioCtx.currentTime +
        duration
      );

    }catch(_){}

  }


  /* ==========================================================
     FIND MATCH
  ========================================================== */

  function cluster(q,r){

    const color =
      grid[r]?.[q];


    if(
      color == null ||
      color < 0
    ){

      return [];

    }


    const result = [];

    const seen =
      new Set([
        `${q},${r}`
      ]);


    const stack = [
      [q,r]
    ];


    while(stack.length){

      const [
        a,
        b
      ] =
        stack.pop();


      result.push([
        a,
        b
      ]);


      for(
        const [
          x,
          y
        ]
        of neighbors(a,b)
      ){

        const key =
          `${x},${y}`;


        if(
          grid[y]?.[x] === color &&
          !seen.has(key)
        ){

          seen.add(key);

          stack.push([
            x,
            y
          ]);

        }

      }

    }


    return result;

  }


  /* ==========================================================
     CEILING CONNECTION
  ========================================================== */

  function ceiling(){

    const connected =
      new Set();

    const stack = [];


    for(
      let q=0;
      q<COLS;
      q++
    ){

      if(
        grid[0]?.[q] >= 0
      ){

        connected.add(
          `${q},0`
        );

        stack.push([
          q,
          0
        ]);

      }

    }


    while(stack.length){

      const [
        q,
        r
      ] =
        stack.pop();


      for(
        const [
          x,
          y
        ]
        of neighbors(q,r)
      ){

        const key =
          `${x},${y}`;


        if(
          grid[y]?.[x] >= 0 &&
          !connected.has(key)
        ){

          connected.add(key);

          stack.push([
            x,
            y
          ]);

        }

      }

    }


    return connected;

  }


  /* ==========================================================
     DETACHED BUBBLES
  ========================================================== */

  function detach(){

    const connected =
      ceiling();

    const detached = [];


    for(
      let r=0;
      r<grid.length;
      r++
    ){

      for(
        let q=0;
        q<COLS;
        q++
      ){

        if(
          grid[r][q] < 0 ||
          connected.has(
            `${q},${r}`
          )
        ){

          continue;

        }


        const p =
          pos(q,r);


        detached.push({

          x:p.x,

          y:p.y,

          color:
            grid[r][q],

          vx:
            (Math.random()-.5) *
            75,

          vy:
            -90 -
            Math.random()*130,

          rot:
            Math.random() *
            Math.PI * 2,

          spin:
            (Math.random()-.5) *
            5,

          delay:
            Math.random()*.13,

          life:0,

          bounce:0

        });


        grid[r][q] = -1;

      }

    }


    falling.push(
      ...detached
    );


    if(detached.length){

      tone(
        190,
        .18,
        "triangle",
        .045
      );


      for(
        const bubble of detached
      ){

        burst(
          bubble.x,
          bubble.y,
          bubble.color,
          5
        );

      }

    }


    return detached.length;

  }


  /* ==========================================================
     FIND EMPTY ATTACHMENT
  ========================================================== */

  function emptyNear(x,y){

    let best = null;

    let distance =
      Infinity;


    for(
      let r=0;
      r<grid.length;
      r++
    ){

      for(
        let q=0;
        q<COLS;
        q++
      ){

        if(
          grid[r][q] >= 0
        ){

          continue;

        }


        const p =
          pos(q,r);


        const d =
          (p.x-x)**2 +
          (p.y-y)**2;


        if(d < distance){

          distance = d;

          best = [
            q,
            r
          ];

        }

      }

    }


    if(!best){

      grid.push(
        new Array(COLS)
          .fill(-1)
      );


      best = [
        Math.floor(COLS/2),
        grid.length-1
      ];

    }


    return best;

  }


  /* ==========================================================
     SHOOT
  ========================================================== */

  function shoot(){

    if(
      busy ||
      won ||
      gameOver ||
      descentAnim
    ){

      return;

    }


    try{

      if(!audioCtx){

        audioCtx =
          new (
            window.AudioContext ||
            window.webkitAudioContext
          )();

      }


      if(
        audioCtx.state ===
        "suspended"
      ){

        audioCtx.resume();

      }

    }catch(_){}


    busy = true;

    launcherRecoil = 1;

    launcherBounce = 1;


    const sx =
      W / 2;

    const sy =
      SHOOTER_Y;


    let dx =
      aim.x - sx;

    let dy =
      aim.y - sy;


    if(
      dy > -45
    ){

      dy = -45;

    }


    const length =
      Math.hypot(
        dx,
        dy
      ) || 1;


    moving = {

      x:sx,

      y:sy,

      vx:
        dx /
        length *
        700,

      vy:
        dy /
        length *
        700,

      color:
        shooter,

      scale:.88,

      squash:0,

      trail:[]

    };


    shooter =
      next;

    next =
      rnd();


    tone(
      310,
      .045,
      "sine",
      .025
    );


    ui();

  }


  /* ==========================================================
     ATTACH
  ========================================================== */

  function attach(){

    if(!moving)
      return;


    const [
      q,
      r
    ] =
      emptyNear(
        moving.x,
        moving.y
      );


    const color =
      moving.color;


    grid[r][q] =
      color;


    const p =
      pos(q,r);


    moving = null;


    impactRings.push({

      x:p.x,

      y:p.y,

      life:0,

      max:.32,

      color

    });


    burst(
      p.x,
      p.y,
      color,
      9
    );


    const group =
      cluster(q,r);


    /* MATCH */

    if(
      group.length >= 3
    ){

      shotsSincePop = 0;


      for(
        const [
          a,
          b
        ]
        of group
      ){

        const pp =
          pos(a,b);


        grid[b][a] =
          -1;


        pops.push({

          x:pp.x,

          y:pp.y,

          color,

          life:0,

          max:.42,

          phase:
            Math.random() *
            6.28

        });


        burst(
          pp.x,
          pp.y,
          color,
          10
        );

      }


      tone(
        520 +
        group.length *
        20,

        .12,

        "sine",

        .045
      );


      save.score +=
        group.length *
        20;


      const detached =
        detach();


      save.score +=
        detached *
        45;


      if(detached >= 5){

        msg(
          "अहाँ कमाल कऽ देलियै! 😄"
        );

        tone(
          700,
          .16,
          "triangle",
          .04
        );

      }

      else if(
        group.length >= 5
      ){

        msg(
          "गजब कऽ देलियै! 🎉"
        );

      }

      else{

        msg(
          "अरे वाह! 😄"
        );

      }

    }

    /* MISS */

    else{

      shotsSincePop++;

      save.score += 5;


      if(
        shotsSincePop >=
        MISS_LIMIT
      ){

        shotsSincePop = 0;

        startDescent();

      }

    }


    save.best =
      Math.max(
        save.best,
        save.score
      );


    persist();

    ui();


    if(clear()){

      win();

      return;

    }


    if(!descentAnim){

      busy = false;

    }

  }


  /* ==========================================================
     LEVEL CLEAR
  ========================================================== */

  function clear(){

    return (

      grid.length > 0 &&

      grid.every(
        row =>
          row.every(
            value =>
              value < 0
          )
      )

    );

  }


  /* ==========================================================
     CEILING DESCENT
  ========================================================== */

  function startDescent(){

    busy = true;


    const oldRows =
      grid.map(
        row =>
          row.slice()
      );


    const newRow =
      new Array(COLS)
        .fill(-1);


    const density =
      Math.min(
        .9,
        .68 +
        save.currentLevel *
        .004
      );


    for(
      let q=0;
      q<COLS;
      q++
    ){

      if(
        Math.random() <
        density
      ){

        newRow[q] =
          rnd();

      }

    }


    if(
      newRow.every(
        value =>
          value < 0
      )
    ){

      newRow[
        Math.floor(COLS/2)
      ] = rnd();

    }


    grid.unshift(
      newRow
    );


    descentAnim = {

      t:0,

      duration:.68,

      oldRows,

      rowAdded:true

    };


    impactRings.push({

      x:W/2,

      y:TOP+4,

      life:0,

      max:.5,

      color:1

    });


    tone(
      125,
      .22,
      "sawtooth",
      .025
    );


    msg(
      "⚠️ बुलबुलों की छत नीचे आ रही है!"
    );

  }


  function finishDescent(){

    descentAnim = null;

    busy = false;


    burst(
      W/2,
      TOP+5,
      1,
      16
    );


    if(
      reachedDanger()
    ){

      endGame();

    }


    ui();

  }


  function reachedDanger(){

    for(
      let r=0;
      r<grid.length;
      r++
    ){

      for(
        let q=0;
        q<COLS;
        q++
      ){

        if(
          grid[r][q] >= 0 &&
          pos(q,r).y + R >=
          DANGER_Y
        ){

          return true;

        }

      }

    }


    return false;

  }


  /* ==========================================================
     GAME OVER
  ========================================================== */

  function endGame(){

    gameOver = true;

    busy = true;


    tone(
      95,
      .4,
      "sawtooth",
      .035
    );


    setTimeout(
      () =>
        openResult(false),
      450
    );

  }


  /* ==========================================================
     WIN
  ========================================================== */

  function win(){

    won = true;

    busy = true;


    save.score += 250;


    save.best =
      Math.max(
        save.best,
        save.score
      );


    if(
      !save.completed.includes(
        save.currentLevel
      )
    ){

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


    persist();


    for(
      let i=0;
      i<3;
      i++
    ){

      setTimeout(
        () => {

          burst(
            W/2 +
            (Math.random()-.5) *
            160,

            300 +
            Math.random()*150,

            i %
            availableColors(),

            28
          );

        },

        i*90
      );

    }


    tone(
      760,
      .2,
      "sine",
      .045
    );


    setTimeout(
      () =>
        openResult(true),
      550
    );

  }


  /* ==========================================================
     RESULT
  ========================================================== */

  function openResult(success){

    const panel =
      $("resultPanel");


    panel.classList.remove(
      "hidden"
    );


    $("resultIcon").textContent =
      success
        ? "🌸"
        : "⬇️";


    $("resultTitle").textContent =
      success
        ? "बहुत बढ़िया!"
        : "अरे! छत नीचे आ गई";


    $("resultText").textContent =

      success

        ? (
            save.currentLevel ===
            MAX_LEVEL

              ? "गजब कऽ देलियै! सभी 50 स्तर पूरे!"

              : "बहुत बढ़िया! स्तर पूरा भऽ गेल।"
          )

        : "बुलबुले बहुत नीचे आ गए। फिर से कोशिश करिए।";


    $("resultScore").textContent =
      save.score;


    $("resultPrimaryBtn").textContent =

      success

        ? (
            save.currentLevel <
            MAX_LEVEL

              ? "अगला स्तर"

              : "स्तर चुनें"
          )

        : "फिर से खेलें";


    $("resultPrimaryBtn").onclick =
      () => {

        panel.classList.add(
          "hidden"
        );


        if(
          success &&
          save.currentLevel <
          MAX_LEVEL
        ){

          save.currentLevel++;

          persist();

          createLevel();

          show(
            $("gameScreen")
          );

        }

        else if(success){

          renderLevels();

          show(
            $("levelsScreen")
          );

        }

        else{

          createLevel();

        }

      };


    $("resultSecondaryBtn").onclick =
      () => {

        panel.classList.add(
          "hidden"
        );

        renderLevels();

        show(
          $("levelsScreen")
        );

      };

  }


  /* ==========================================================
     EASING
  ========================================================== */

  function easeOutBack(t){

    const c1 =
      1.70158;

    const c3 =
      c1 + 1;


    return (
      1 +
      c3 *
      Math.pow(
        t-1,
        3
      ) +

      c1 *
      Math.pow(
        t-1,
        2
      )
    );

  }


  function easeOutCubic(t){

    return (
      1 -
      Math.pow(
        1-t,
        3
      )
    );

  }


  /* ==========================================================
     PARTICLES
  ========================================================== */

  function burst(
    x,
    y,
    colorIndex,
    count
  ){

    for(
      let i=0;
      i<count;
      i++
    ){

      const angle =
        Math.random() *
        Math.PI *
        2;


      const speed =
        45 +
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
          speed,

        size:
          1.5 +
          Math.random()*4,

        color:
          COLORS[colorIndex] ||
          COLORS[0],

        life:0,

        max:
          .32 +
          Math.random()*.48,

        gravity:
          100 +
          Math.random()*180

      });

    }

  }


  /* ==========================================================
     UPDATE
  ========================================================== */

  function update(dt){

    /* Ceiling animation */

    if(descentAnim){

      descentAnim.t =
        Math.min(
          descentAnim.duration,
          descentAnim.t + dt
        );


      if(
        descentAnim.t >=
        descentAnim.duration
      ){

        finishDescent();

      }

    }


    /* Launcher bounce */

    launcherBounce =
      Math.max(
        0,
        launcherBounce -
        dt*3.8
      );


    launcherRecoil =
      Math.max(
        0,
        launcherRecoil -
        dt*5.5
      );


    /* Moving bubble */

    if(moving){

      moving.trail.push({

        x:moving.x,

        y:moving.y

      });


      if(
        moving.trail.length >
        7
      ){

        moving.trail.shift();

      }


      moving.x +=
        moving.vx *
        dt;


      moving.y +=
        moving.vy *
        dt;


      moving.scale =
        .9 +
        Math.sin(
          Math.min(
            1,
            moving.trail.length/7
          ) *
          Math.PI
        ) *
        .08;


      moving.squash =
        Math.sin(
          moving.y*.045
        ) *
        .025;


      /* Wall bounce */

      if(
        moving.x < R
      ){

        moving.x = R;

        moving.vx =
          Math.abs(
            moving.vx
          );

        tone(
          180,
          .035,
          "sine",
          .012
        );

      }


      if(
        moving.x >
        W-R
      ){

        moving.x =
          W-R;

        moving.vx =
          -Math.abs(
            moving.vx
          );

        tone(
          180,
          .035,
          "sine",
          .012
        );

      }


      /* Ceiling */

      if(
        moving.y <= TOP
      ){

        attach();

      }

      else{

        outer:

        for(
          let r=0;
          r<grid.length;
          r++
        ){

          for(
            let q=0;
            q<COLS;
            q++
          ){

            if(
              grid[r][q] < 0
            ){

              continue;

            }


            const p =
              pos(q,r);


            if(
              Math.hypot(
                moving.x-p.x,
                moving.y-p.y
              ) <
              R*1.82
            ){

              attach();

              break outer;

            }

          }

        }

      }

    }


    /* Falling bubbles */

    for(
      let i=falling.length-1;
      i>=0;
      i--
    ){

      const b =
        falling[i];


      if(
        b.delay > 0
      ){

        b.delay -= dt;

        continue;

      }


      b.life += dt;


      /* Gravity */

      b.vy +=
        650 *
        dt;


      b.x +=
        b.vx *
        dt;


      b.y +=
        b.vy *
        dt;


      b.rot +=
        b.spin *
        dt;


      /* Side movement */

      if(
        b.x < R
      ){

        b.x = R;

        b.vx =
          Math.abs(
            b.vx
          )*.7;

      }


      if(
        b.x > W-R
      ){

        b.x = W-R;

        b.vx =
          -Math.abs(
            b.vx
          )*.7;

      }


      /* Bounce */

      if(
        b.y >
        H-30 &&
        b.bounce < 1
      ){

        b.y =
          H-30;


        b.vy *=
          -.24;


        b.vx *=
          .85;


        b.bounce++;


        burst(
          b.x,
          b.y,
          b.color,
          5
        );


        tone(
          120,
          .045,
          "sine",
          .012
        );

      }


      if(
        b.y >
          H+70 ||
        b.life >
          3.5
      ){

        falling.splice(
          i,
          1
        );

      }

    }


    /* Particles */

    for(
      let i=particles.length-1;
      i>=0;
      i--
    ){

      const p =
        particles[i];


      p.life += dt;


      p.x +=
        p.vx *
        dt;


      p.y +=
        p.vy *
        dt;


      p.vy +=
        p.gravity *
        dt;


      p.vx *=
        .992;


      if(
        p.life >
        p.max
      ){

        particles.splice(
          i,
          1
        );

      }

    }


    /* Pops */

    for(
      let i=pops.length-1;
      i>=0;
      i--
    ){

      pops[i].life += dt;


      if(
        pops[i].life >
        pops[i].max
      ){

        pops.splice(
          i,
          1
        );

      }

    }


    /* Impact rings */

    for(
      let i=impactRings.length-1;
      i>=0;
      i--
    ){

      impactRings[i].life += dt;


      if(
        impactRings[i].life >
        impactRings[i].max
      ){

        impactRings.splice(
          i,
          1
        );

      }

    }

  }


  /* ==========================================================
     DRAW
  ========================================================== */

  function draw(){

    ctx.clearRect(
      0,
      0,
      W,
      H
    );


    /* Background */

    const bg =
      ctx.createLinearGradient(
        0,
        0,
        0,
        H
      );


    bg.addColorStop(
      0,
      "#102653"
    );


    bg.addColorStop(
      .55,
      "#162f5d"
    );


    bg.addColorStop(
      1,
      "#0e2043"
    );


    ctx.fillStyle =
      bg;


    ctx.fillRect(
      0,
      0,
      W,
      H
    );


    drawArt();

    drawDanger();


    /* Ceiling bubbles */

    for(
      let r=0;
      r<grid.length;
      r++
    ){

      for(
        let q=0;
        q<COLS;
        q++
      ){

        if(
          grid[r][q] < 0
        ){

          continue;

        }


        let p =
          pos(q,r);


        if(descentAnim){

          const t =
            Math.min(
              1,
              descentAnim.t /
              descentAnim.duration
            );


          const e =
            easeOutBack(t);


          const targetY =
            TOP +
            r*ROW_H;


          p = {

            x:p.x,

            y:
              targetY -
              ROW_H *
              (1-e)

          };

        }


        bubble(
          p.x,
          p.y,
          grid[r][q]
        );

      }

    }


    /* Falling */

    for(
      const b of falling
    ){

      if(
        b.delay > 0
      ){

        continue;

      }


      const alpha =
        Math.max(
          0,
          1 -
          Math.max(
            0,
            b.life-2.5
          ) /
          1
        );


      const stretch =
        Math.min(
          1,
          Math.abs(
            b.vy
          ) /
          650
        );


      bubble(

        b.x,

        b.y,

        b.color,

        1 +
        stretch*.07,

        alpha,

        b.rot,

        1 -
        stretch*.08,

        1 +
        stretch*.18

      );


      drawFallTrail(b);

    }


    /* Pops */

    for(
      const p of pops
    ){

      const t =
        Math.min(
          1,
          p.life /
          p.max
        );


      const scale =
        1 +
        easeOutCubic(t) *
        .45;


      const alpha =
        1-t;


      bubble(
        p.x,
        p.y,
        p.color,
        scale,
        alpha
      );


      drawPopRing(
        p.x,
        p.y,
        t,
        COLORS[p.color]
      );

    }


    /* Rings */

    for(
      const ring
      of impactRings
    ){

      const t =
        Math.min(
          1,
          ring.life /
          ring.max
        );


      const radius =
        18 +
        easeOutCubic(t) *
        42;


      ctx.save();


      ctx.globalAlpha =
        1-t;


      ctx.strokeStyle =
        COLORS[ring.color] ||
        "#d9e8ff";


      ctx.lineWidth =
        3 -
        t*2;


      ctx.beginPath();


      ctx.arc(
        ring.x,
        ring.y,
        radius,
        0,
        Math.PI*2
      );


      ctx.stroke();


      ctx.restore();

    }


    /* Particles */

    for(
      const p
      of particles
    ){

      ctx.globalAlpha =
        Math.max(
          0,
          1 -
          p.life/p.max
        );


      ctx.fillStyle =
        p.color;


      ctx.beginPath();


      ctx.arc(
        p.x,
        p.y,
        p.size,
        0,
        Math.PI*2
      );


      ctx.fill();

    }


    ctx.globalAlpha = 1;


    /* Flying bubble */

    if(moving){

      drawMovingTrail(
        moving
      );


      bubble(

        moving.x,

        moving.y,

        moving.color,

        moving.scale,

        1,

        0,

        1 + moving.squash,

        1 - moving.squash

      );

    }


    /* LAUNCHER */

    drawLauncher();

  }


  /* ==========================================================
     MITHILA ART
  ========================================================== */

  function drawArt(){

    ctx.save();

    ctx.globalAlpha =
      .12;

    ctx.strokeStyle =
      "#8bb5ec";

    ctx.lineWidth =
      1.5;


    ctx.strokeRect(
      9,
      9,
      W-18,
      H-18
    );


    for(
      let x=25;
      x<W-10;
      x+=55
    ){

      lotus(
        x,
        24,
        7
      );


      lotus(
        x,
        H-24,
        7
      );

    }


    for(
      let y=110;
      y<H-100;
      y+=105
    ){

      fish(
        22,
        y,
        12
      );


      fish(
        W-22,
        y+25,
        12
      );

    }


    ctx.restore();

  }


  function lotus(
    x,
    y,
    s
  ){

    ctx.beginPath();

    ctx.moveTo(
      x,
      y+s
    );

    ctx.quadraticCurveTo(
      x-s,
      y,
      x,
      y-s
    );

    ctx.quadraticCurveTo(
      x+s,
      y,
      x,
      y+s
    );

    ctx.stroke();

  }


  function fish(
    x,
    y,
    s
  ){

    ctx.beginPath();

    ctx.ellipse(
      x,
      y,
      s,
      s*.55,
      0,
      0,
      Math.PI*2
    );

    ctx.moveTo(
      x-s,
      y
    );

    ctx.lineTo(
      x-s*1.6,
      y-s*.7
    );

    ctx.lineTo(
      x-s*1.6,
      y+s*.7
    );

    ctx.closePath();

    ctx.stroke();

  }


  /* ==========================================================
     DANGER LINE
  ========================================================== */

  function drawDanger(){

    ctx.save();

    ctx.strokeStyle =
      "rgba(245,190,113,.34)";

    ctx.setLineDash([
      8,
      9
    ]);

    ctx.lineWidth =
      1.5;


    ctx.beginPath();

    ctx.moveTo(
      18,
      DANGER_Y
    );

    ctx.lineTo(
      W-18,
      DANGER_Y
    );

    ctx.stroke();


    ctx.restore();

  }


  /* ==========================================================
     PREMIUM LAUNCHER
  ========================================================== */

  function drawLauncher(){

    const recoil =
      launcherRecoil * 9;


    const bounce =
      Math.sin(
        launcherBounce *
        Math.PI
      ) * 2;


    ctx.save();


    ctx.translate(
      W/2,
      SHOOTER_Y +
      bounce
    );


    /* Glow */

    const glow =
      ctx.createRadialGradient(
        0,
        22,
        5,
        0,
        22,
        75
      );


    glow.addColorStop(
      0,
      "rgba(83,143,220,.26)"
    );


    glow.addColorStop(
      1,
      "rgba(83,143,220,0)"
    );


    ctx.fillStyle =
      glow;


    ctx.beginPath();


    ctx.ellipse(
      0,
      25,
      75,
      32,
      0,
      0,
      Math.PI*2
    );


    ctx.fill();


    /* Launcher body */

    const body =
      ctx.createLinearGradient(
        0,
        8,
        0,
        58
      );


    body.addColorStop(
      0,
      "#8bb6e8"
    );


    body.addColorStop(
      .45,
      "#426da9"
    );


    body.addColorStop(
      1,
      "#213f70"
    );


    ctx.fillStyle =
      body;


    ctx.beginPath();


    ctx.roundRect(
      -54,
      15,
      108,
      48,
      24
    );


    ctx.fill();


    ctx.strokeStyle =
      "rgba(220,239,255,.35)";


    ctx.lineWidth = 2;


    ctx.stroke();


    /* Cradle */

    ctx.fillStyle =
      "#12294e";


    ctx.beginPath();


    ctx.arc(
      0,
      15,
      31,
      Math.PI,
      Math.PI*2
    );


    ctx.fill();


    ctx.strokeStyle =
      "#8fb8e9";


    ctx.lineWidth = 3;


    ctx.beginPath();


    ctx.arc(
      0,
      15,
      28,
      Math.PI,
      Math.PI*2
    );


    ctx.stroke();


    /* Side fins */

    ctx.fillStyle =
      "#31588d";


    ctx.beginPath();

    ctx.moveTo(
      -53,
      23
    );

    ctx.lineTo(
      -72,
      37
    );

    ctx.lineTo(
      -51,
      42
    );

    ctx.closePath();

    ctx.fill();


    ctx.beginPath();

    ctx.moveTo(
      53,
      23
    );

    ctx.lineTo(
      72,
      37
    );

    ctx.lineTo(
      51,
      42
    );

    ctx.closePath();

    ctx.fill();


    /* Pivot */

    ctx.fillStyle =
      "#d7e9ff";


    ctx.beginPath();


    ctx.arc(
      0,
      15,
      6,
      0,
      Math.PI*2
    );


    ctx.fill();


    /* Current bubble */

    bubble(

      0,

      -1-recoil,

      shooter,

      1.02,

      1

    );


    ctx.restore();


    aimLine();

  }


  /* ==========================================================
     AIM LINE
  ========================================================== */

  function aimLine(){

    let dx =
      aim.x -
      W/2;


    let dy =
      aim.y -
      SHOOTER_Y;


    if(
      dy > -45
    ){

      dy = -45;

    }


    const length =
      Math.hypot(
        dx,
        dy
      ) || 1;


    ctx.save();


    ctx.setLineDash([
      7,
      9
    ]);


    ctx.lineWidth = 2;


    ctx.strokeStyle =
      "rgba(215,235,255,.58)";


    ctx.shadowColor =
      "rgba(87,158,235,.35)";


    ctx.shadowBlur = 8;


    ctx.beginPath();


    ctx.moveTo(
      W/2,
      SHOOTER_Y-1
    );


    ctx.lineTo(

      W/2 +
      dx/length *
      230,

      SHOOTER_Y +
      dy/length *
      230

    );


    ctx.stroke();


    ctx.restore();

  }


  /* ==========================================================
     TRAILS
  ========================================================== */

  function drawMovingTrail(b){

    ctx.save();


    for(
      let i=0;
      i<b.trail.length;
      i++
    ){

      const t =
        b.trail[i];


      const alpha =
        (i /
        b.trail.length) *
        .16;


      ctx.globalAlpha =
        alpha;


      ctx.fillStyle =
        COLORS[b.color];


      ctx.beginPath();


      ctx.arc(

        t.x,

        t.y,

        R *
        (
          .35 +
          i /
          b.trail.length *
          .25
        ),

        0,
        Math.PI*2

      );


      ctx.fill();

    }


    ctx.restore();

  }


  function drawFallTrail(b){

    if(
      Math.abs(b.vy) <
      100
    ){

      return;

    }


    ctx.save();


    const alpha =
      Math.min(
        .22,
        Math.abs(b.vy) /
        2500
      );


    ctx.globalAlpha =
      alpha;


    const g =
      ctx.createLinearGradient(
        b.x,
        b.y-45,
        b.x,
        b.y
      );


    g.addColorStop(
      0,
      "rgba(255,255,255,0)"
    );


    g.addColorStop(
      1,
      COLORS[b.color]
    );


    ctx.fillStyle =
      g;


    ctx.beginPath();


    ctx.ellipse(
      b.x,
      b.y-25,
      4,
      24,
      0,
      0,
      Math.PI*2
    );


    ctx.fill();


    ctx.restore();

  }


  /* ==========================================================
     POP RING
  ========================================================== */

  function drawPopRing(
    x,
    y,
    t,
    color
  ){

    ctx.save();


    ctx.globalAlpha =
      (1-t)*.8;


    ctx.strokeStyle =
      color;


    ctx.lineWidth =
      3*(1-t);


    ctx.beginPath();


    ctx.arc(
      x,
      y,
      20+t*25,
      0,
      Math.PI*2
    );


    ctx.stroke();


    ctx.restore();

  }


  /* ==========================================================
     BUBBLE RENDER
  ========================================================== */

  function bubble(

    x,

    y,

    c,

    s=1,

    a=1,

    rotation=0,

    sx=1,

    sy=1

  ){

    const rr =
      R*s;


    ctx.save();


    ctx.globalAlpha =
      a;


    ctx.translate(
      x,
      y
    );


    ctx.rotate(
      rotation
    );


    ctx.scale(
      sx,
      sy
    );


    /* Shadow */

    ctx.globalAlpha =
      a*.25;


    ctx.fillStyle =
      "#020b1c";


    ctx.beginPath();


    ctx.ellipse(
      3,
      6,
      rr*.9,
      rr*.9,
      0,
      0,
      Math.PI*2
    );


    ctx.fill();


    /* Main gradient */

    const g =
      ctx.createRadialGradient(
        -rr*.35,
        -rr*.45,
        2,
        0,
        0,
        rr
      );


    g.addColorStop(
      0,
      "#ffffff"
    );


    g.addColorStop(
      .12,
      "#eef8ff"
    );


    g.addColorStop(
      .24,
      COLORS[c]
    );


    g.addColorStop(
      .78,
      COLORS[c]
    );


    g.addColorStop(
      1,
      shade(
        COLORS[c],
        -48
      )
    );


    ctx.globalAlpha =
      a;


    ctx.fillStyle =
      g;


    ctx.beginPath();


    ctx.arc(
      0,
      0,
      rr,
      0,
      Math.PI*2
    );


    ctx.fill();


    /* Border */

    ctx.strokeStyle =
      "rgba(255,255,255,.18)";


    ctx.lineWidth =
      1.3;


    ctx.stroke();


    /* Highlight */

    ctx.fillStyle =
      "rgba(255,255,255,.48)";


    ctx.beginPath();


    ctx.ellipse(

      -rr*.3,

      -rr*.4,

      rr*.3,

      rr*.17,

      -.35,

      0,

      Math.PI*2

    );


    ctx.fill();


    /* Small reflection */

    ctx.fillStyle =
      "rgba(255,255,255,.15)";


    ctx.beginPath();


    ctx.arc(
      rr*.28,
      rr*.28,
      rr*.1,
      0,
      Math.PI*2
    );


    ctx.fill();


    ctx.restore();

  }


  /* ==========================================================
     AIM INPUT
  ========================================================== */

  function setAim(
    clientX,
    clientY
  ){

    const rect =
      canvas.getBoundingClientRect();


    aim.x =
      (
        clientX -
        rect.left
      ) *
      W /
      rect.width;


    aim.y =
      (
        clientY -
        rect.top
      ) *
      H /
      rect.height;


    if(
      aim.y >
      SHOOTER_Y-20
    ){

      aim.y =
        SHOOTER_Y-20;

    }

  }


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


  /* ==========================================================
     BUTTONS
  ========================================================== */

  $("startBtn").onclick =
    () => {

      renderLevels();

      show(
        $("levelsScreen")
      );

    };


  $("homeLevelsBtn").onclick =
    () => {

      renderLevels();

      show(
        $("levelsScreen")
      );

    };


  $("backHomeBtn").onclick =
    () =>
      show(
        $("homeScreen")
      );


  $("gameBackBtn").onclick =
    () => {

      renderLevels();

      show(
        $("levelsScreen")
      );

    };


  $("restartBtn").onclick =
    createLevel;


  $("soundBtn").onclick =
    () => {

      save.sound =
        !save.sound;

      persist();

      ui();

    };


  $("settingsBtn").onclick =
    () =>
      $("settingsPanel")
        .classList
        .remove("hidden");


  $("closeSettingsBtn").onclick =
    () =>
      $("settingsPanel")
        .classList
        .add("hidden");


  $("resetProgressBtn").onclick =
    () => {

      if(
        confirm(
          "क्या आप पूरी प्रगति रीसेट करना चाहते हैं?"
        )
      ){

        save = {

          currentLevel:1,

          unlocked:1,

          completed:[],

          score:0,

          best:0,

          sound:true

        };


        persist();


        $("settingsPanel")
          .classList
          .add("hidden");


        renderLevels();


        show(
          $("levelsScreen")
        );

      }

    };


  /* ==========================================================
     GAME LOOP
  ========================================================== */

  function loop(time){

    const dt =
      Math.min(
        .033,
        (time-last)/1000 || 0
      );


    last = time;


    if(
      !$("gameScreen")
        .classList
        .contains("hidden")
    ){

      update(dt);

      draw();

    }


    requestAnimationFrame(
      loop
    );

  }


  /* ==========================================================
     START
  ========================================================== */

  renderLevels();

  show(
    $("homeScreen")
  );

  requestAnimationFrame(
    loop
  );

})();
