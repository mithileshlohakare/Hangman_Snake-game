// ---------- View switching ----------
const homeView = document.getElementById("home");
const gameView = document.getElementById("game");
const stage = document.getElementById("stage");
const title = document.getElementById("gameTitle");
const restartBtn = document.getElementById("restartBtn");
const backBtn = document.getElementById("backBtn");

let controller = null; // holds current game's {restart, destroy}

// Home cards -> open game
document.querySelectorAll(".card").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const game = btn.dataset.game;
    openGame(game);
  });
});

// Back to home
backBtn.addEventListener("click", ()=>{
  if (controller?.destroy) controller.destroy();
  stage.innerHTML = "";
  gameView.classList.add("hidden");
  homeView.classList.remove("hidden");
  restartBtn.onclick = null;
});

// Open a game
function openGame(which){
  if (controller?.destroy) controller.destroy(); // clean old
  stage.innerHTML = "";
  homeView.classList.add("hidden");
  gameView.classList.remove("hidden");

  if (which==="hangman"){
    title.textContent = "Hangman";
    controller = startHangman(stage);
  }
  if (which==="snake"){
    title.textContent = "Snake";
    controller = startSnake(stage);
  }
  if (which==="bricks"){
    title.textContent = "Bricks Breaker";
    controller = startBricks(stage);
  }
  restartBtn.onclick = controller.restart;
}

/* ------------------------------------------------------------------ */
/*                             HANGMAN                                 */
/* ------------------------------------------------------------------ */
function startHangman(root){
  root.innerHTML = `
    <div class="hm-wrap">
      <div class="hm-left">
        <canvas id="hmCanvas" width="240" height="280"></canvas>
        <p class="hm-title">HANGMAN</p>
      </div>

      <div>
        <div id="hmWord" class="hm-word"></div>
        <p id="hmHint" class="hm-hint"></p>
        <p class="hm-miss">Incorrect guesses: <span id="hmMiss">0</span> / 6</p>
        <div id="hmKeys" class="hm-keyboard"></div>
      </div>
    </div>
  `;

  const words = [
    { word: "PAINTING",  hint: "Uses colors on a surface." },
    { word: "JAVASCRIPT",hint: "Language of the web." },
    { word: "PYRAMID",   hint: "Triangular wonder of Egypt." },
    { word: "GUITAR",    hint: "Stringed instrument." },
    { word: "COMPONENT", hint: "Re-usable UI building block." },
  ];

  const cvs = root.querySelector("#hmCanvas");
  const ctx = cvs.getContext("2d");
  const elWord = root.querySelector("#hmWord");
  const elHint = root.querySelector("#hmHint");
  const elMiss = root.querySelector("#hmMiss");
  const keysWrap = root.querySelector("#hmKeys");

  let selected = null, guessed = new Set(), wrong = 0;

  function drawBase(){
    ctx.clearRect(0,0,cvs.width,cvs.height);
    ctx.lineWidth = 4; ctx.strokeStyle = "#eaf2ff";
    // Base + pole + beam + rope
    ctx.beginPath();
    ctx.moveTo(20,260); ctx.lineTo(200,260);
    ctx.moveTo(60,260); ctx.lineTo(60,30);
    ctx.lineTo(170,30); ctx.lineTo(170,60);
    ctx.stroke();
  }

  function drawParts(step){
    ctx.lineWidth = 3; ctx.strokeStyle = "#eaf2ff";
    switch(step){
      case 1: ctx.beginPath(); ctx.arc(170,80,18,0,Math.PI*2); ctx.stroke(); break;      // head
      case 2: ctx.beginPath(); ctx.moveTo(170,98); ctx.lineTo(170,160); ctx.stroke(); break; // body
      case 3: ctx.beginPath(); ctx.moveTo(170,115); ctx.lineTo(142,138); ctx.stroke(); break; // L arm
      case 4: ctx.beginPath(); ctx.moveTo(170,115); ctx.lineTo(198,138); ctx.stroke(); break; // R arm
      case 5: ctx.beginPath(); ctx.moveTo(170,160); ctx.lineTo(148,198); ctx.stroke(); break; // L leg
      case 6: ctx.beginPath(); ctx.moveTo(170,160); ctx.lineTo(192,198); ctx.stroke(); break; // R leg
    }
  }

  function newRound(){
    selected = words[Math.floor(Math.random()*words.length)];
    guessed.clear();
    wrong = 0;
    elMiss.textContent = wrong;
    elHint.textContent = "Hint: " + selected.hint;
    updateWord();
    drawBase();
    keysWrap.innerHTML = "";
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach(ch=>{
      const b = document.createElement("button");
      b.className = "hm-key";
      b.textContent = ch;
      b.addEventListener("click", ()=> pick(ch, b));
      keysWrap.appendChild(b);
    });
  }

  function updateWord(){
    elWord.textContent = selected.word.split("")
      .map(c => guessed.has(c) ? c : "_").join(" ");
  }

  function checkWin(){
    const all = selected.word.split("").every(c => guessed.has(c));
    if (all){ setTimeout(()=> alert("🏆 You win!"), 100); disableKeys(); }
  }

  function disableKeys(){ keysWrap.querySelectorAll("button").forEach(b=> b.disabled = true); }

  function pick(letter, btn){
    btn.disabled = true;
    if (selected.word.includes(letter)){
      guessed.add(letter);
      updateWord();
      checkWin();
    } else {
      wrong++; elMiss.textContent = wrong; drawParts(wrong);
      if (wrong >= 6){ setTimeout(()=> alert("💀 You lost! Word: "+selected.word), 80); disableKeys(); }
    }
  }

  newRound();

  return {
    restart(){ newRound(); },
    destroy(){ /* nothing global to remove */ }
  };
}

/* ------------------------------------------------------------------ */
/*                               SNAKE                                 */
/* ------------------------------------------------------------------ */
function startSnake(root){
  root.innerHTML = `
    <div class="canvas-wrap">
      <canvas id="snk" width="480" height="480"></canvas>
    </div>
  `;
  const cvs = root.querySelector("#snk");
  const ctx = cvs.getContext("2d");

  const box = 20;
  let snake, dir, food, loop = null;

  const onKey = (e)=>{
    if (e.key==="ArrowLeft"  && dir!=="RIGHT") dir="LEFT";
    if (e.key==="ArrowUp"    && dir!=="DOWN")  dir="UP";
    if (e.key==="ArrowRight" && dir!=="LEFT")  dir="RIGHT";
    if (e.key==="ArrowDown"  && dir!=="UP")    dir="DOWN";
  };

  function reset(){
    snake = [{x: 12*box, y: 12*box}];
    dir = "RIGHT";
    food = {
      x: Math.floor(Math.random()* (cvs.width/box)) * box,
      y: Math.floor(Math.random()* (cvs.height/box)) * box
    };
  }

  function draw(){
    // bg grid
    ctx.fillStyle = "#030617"; ctx.fillRect(0,0,cvs.width,cvs.height);
    // food
    ctx.fillStyle = "#ff4757"; ctx.fillRect(food.x, food.y, box, box);

    // snake
    snake.forEach((s,i)=>{
      ctx.fillStyle = i===0 ? "#22d3ee" : "#94a3b8";
      ctx.fillRect(s.x, s.y, box-1, box-1);
    });

    // move
    let head = {...snake[0]};
    if (dir==="LEFT")  head.x -= box;
    if (dir==="UP")    head.y -= box;
    if (dir==="RIGHT") head.x += box;
    if (dir==="DOWN")  head.y += box;

    // eat
    if (head.x===food.x && head.y===food.y){
      food = {
        x: Math.floor(Math.random()* (cvs.width/box)) * box,
        y: Math.floor(Math.random()* (cvs.height/box)) * box
      };
    } else { snake.pop(); }

    // wall/self hit
    const hitWall = head.x<0 || head.y<0 || head.x>=cvs.width || head.y>=cvs.height;
    const hitSelf = snake.some(s => s.x===head.x && s.y===head.y);
    if (hitWall || hitSelf){
      clearInterval(loop);
      alert("💀 Game Over");
      return;
    }

    snake.unshift(head);
  }

  // start
  reset();
  window.addEventListener("keydown", onKey);
  loop = setInterval(draw, 120);

  return {
    restart(){
      clearInterval(loop);
      reset();
      loop = setInterval(draw, 120);
    },
    destroy(){
      clearInterval(loop);
      window.removeEventListener("keydown", onKey);
    }
  };
}

/* ------------------------------------------------------------------ */
/*                           BRICKS BREAKER                            */
/* ------------------------------------------------------------------ */
function startBricks(root){
  root.innerHTML = `
    <div class="canvas-wrap">
      <canvas id="brk" width="560" height="360"></canvas>
    </div>
  `;
  const cvs = root.querySelector("#brk");
  const ctx = cvs.getContext("2d");

  let ballR = 8, x, y, dx, dy;
  let pW = 90, pH = 12, pX;
  let rCount = 4, cCount = 7, bW = 70, bH = 18, pad = 10, offTop = 40, offLeft = 15;
  let bricks = [], score = 0, loop = null;
  let right=false, left=false;

  const kd = (e)=>{ if(e.key==="ArrowRight") right=true; if(e.key==="ArrowLeft") left=true; };
  const ku = (e)=>{ if(e.key==="ArrowRight") right=false; if(e.key==="ArrowLeft") left=false; };

  function reset(){
    x = cvs.width/2; y = cvs.height-30; dx = 3; dy = -3;
    pX = (cvs.width-pW)/2; score = 0;
    bricks = [];
    for(let c=0;c<cCount;c++){
      bricks[c]=[];
      for(let r=0;r<rCount;r++){ bricks[c][r] = {x:0,y:0,alive:true}; }
    }
  }

  function drawBricks(){
    for(let c=0;c<cCount;c++){
      for(let r=0;r<rCount;r++){
        const b = bricks[c][r];
        if(!b.alive) continue;
        const bx = c*(bW+pad) + offLeft;
        const by = r*(bH+pad) + offTop;
        b.x=bx; b.y=by;
        ctx.fillStyle = `hsl(${(r*80+c*15)%360} 90% 60%)`;
        ctx.fillRect(bx, by, bW, bH);
        ctx.shadowColor = "#00e5ff"; ctx.shadowBlur = 0;
      }
    }
  }

  function draw(){
    ctx.clearRect(0,0,cvs.width,cvs.height);
    // board bg
    ctx.fillStyle = "#020617"; ctx.fillRect(0,0,cvs.width,cvs.height);

    // paddle
    ctx.fillStyle = "#7c3aed"; ctx.fillRect(pX, cvs.height-pH-6, pW, pH);

    // bricks
    drawBricks();

    // ball
    ctx.beginPath();
    ctx.arc(x,y,ballR,0,Math.PI*2);
    ctx.fillStyle = "#00e5ff"; ctx.fill();

    // score
    ctx.fillStyle="#eaf2ff";
    ctx.font="bold 14px system-ui";
    ctx.fillText("Score: "+score, 10, 18);

    // collisions walls
    if(x+dx>cvs.width-ballR || x+dx<ballR) dx=-dx;
    if(y+dy<ballR) dy=-dy;

    // paddle move
    if(right && pX < cvs.width-pW) pX+=6;
    if(left && pX > 0) pX-=6;

    // paddle collide
    if(y+dy > cvs.height-ballR-pH-6){
      if(x>pX && x<pX+pW){ dy = -Math.abs(dy); dx += ( (x-(pX+pW/2)) / (pW/2) ); }
      else if(y+dy > cvs.height-ballR){ // miss
        clearInterval(loop);
        alert("💀 Game Over");
        return;
      }
    }

    // brick collide
    for(let c=0;c<cCount;c++){
      for(let r=0;r<rCount;r++){
        const b = bricks[c][r];
        if(!b.alive) continue;
        if(x>b.x-ballR && x<b.x+bW+ballR && y>b.y-ballR && y<b.y+bH+ballR){
          dy = -dy; b.alive=false; score++;
          if(score === rCount*cCount){
            clearInterval(loop);
            alert("🏆 You Win!");
            return;
          }
        }
      }
    }

    x+=dx; y+=dy;
  }

  // start
  reset();
  window.addEventListener("keydown", kd);
  window.addEventListener("keyup", ku);
  loop = setInterval(draw, 16);

  return {
    restart(){
      clearInterval(loop);
      reset();
      loop = setInterval(draw, 16);
    },
    destroy(){
      clearInterval(loop);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    }
  };
}
