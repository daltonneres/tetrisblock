/* ===============================
   CONFIGURAÇÕES
================================ */
const GRID_SIZE = 10;
const COLORS = ["#ff5252","#ff9800","#ffeb3b","#4caf50","#03a9f4","#9c27b0"];

const SHAPES = [
  [[1]], [[1,1]], [[1,1,1]], [[1,1,1,1]],
  [[1],[1],[1],[1]],
  [[1,1],[1,1]],
  [[1,1,1],[1,1,1],[1,1,1]],
  [[0,1,0],[1,1,1],[0,1,0]]
];

/* ===============================
   ESTADO GLOBAL
================================ */
let board=[], score=0, combo=1;
let grid, piecesContainer, scoreEl, comboEl;
let draggingPiece=null;
let mode="classic";

let timer=null;
let timeLeft=0;
let targetScore=0;

let timerEl, progressBarEl;

/* ===============================
   START
================================ */
function startGame(selectedMode){
  mode = selectedMode;

  document.getElementById("startScreen").classList.add("hidden");
  document.getElementById("gameScreen").classList.remove("hidden");

  grid = document.getElementById("grid");
  piecesContainer = document.getElementById("pieces");
  scoreEl = document.getElementById("score");
  comboEl = document.getElementById("combo");
  timerEl = document.getElementById("timer");
  progressBarEl = document.getElementById("progressBar");

  initGame();
}

/* ===============================
   INIT
================================ */
function initGame(){
  score=0;
  combo=1;

  createGrid();

  if(mode==="survival"){
    placeInitialBlocks(18);     // 🔥 pedras iniciais
    timeLeft = 90;             // ⏱️ 1:30
    targetScore = 1500;        // 🎯 meta fixa
    startTimer();
  }

  if(mode==="timed"){
    timeLeft = Math.floor(Math.random()*60)+30;
    targetScore = Math.floor(Math.random()*2000)+1000;
    startTimer();
  }

  generatePieces(mode==="survival"?5:3);
  updateHUD();
  updateTimerUI();
  updateProgress();
}

/* ===============================
   GRID
================================ */
function createGrid(){
  grid.innerHTML="";
  board=[];
  for(let i=0;i<GRID_SIZE*GRID_SIZE;i++){
    const cell=document.createElement("div");
    cell.className="cell";
    grid.appendChild(cell);
    board.push(null);
  }
}

/* ===============================
   BLOCOS INICIAIS
================================ */
function placeInitialBlocks(amount){
  let placed=0;
  while(placed<amount){
    const idx=Math.floor(Math.random()*board.length);
    if(board[idx]) continue;
    board[idx]="#555";
    grid.children[idx].classList.add("filled");
    grid.children[idx].style.background="#555";
    placed++;
  }
}

/* ===============================
   PEÇAS
================================ */
function generatePieces(qty){
  piecesContainer.innerHTML="";
  for(let i=0;i<qty;i++){
    const shape=SHAPES[Math.floor(Math.random()*SHAPES.length)];
    const color=COLORS[Math.floor(Math.random()*COLORS.length)];

    const piece=document.createElement("div");
    piece.className="piece";
    piece.dataset.shape=JSON.stringify(shape);
    piece.dataset.color=color;
    piece.style.gridTemplateColumns=`repeat(${shape[0].length},auto)`;

    shape.flat().forEach(v=>{
      const b=document.createElement("div");
      if(v){
        b.className="block";
        b.style.background=color;
      }
      piece.appendChild(b);
    });

    enableDrag(piece);
    piecesContainer.appendChild(piece);
  }
}

/* ===============================
   DRAG
================================ */
function enableDrag(piece){
  piece.onpointerdown=e=>{
    draggingPiece=piece;
    piece.setPointerCapture(e.pointerId);
  };

  piece.onpointermove=e=>{
    if(!draggingPiece)return;
    clearPreview();
    const pos=getGridPos(e);
    showPreview(piece,pos.x,pos.y);
  };

  piece.onpointerup=e=>{
    if(!draggingPiece)return;
    const pos=getGridPos(e);

    if(canPlace(piece,pos.x,pos.y)){
      placePiece(piece,pos.x,pos.y);
      piece.remove();

      if(!piecesContainer.children.length)
        generatePieces(mode==="survival"?5:3);

      checkGameOver();
    }

    clearPreview();
    draggingPiece=null;
  };
}

/* ===============================
   LÓGICA
================================ */
function canPlace(piece,x,y){
  const shape=JSON.parse(piece.dataset.shape);
  return shape.every((r,ry)=>
    r.every((v,rx)=>{
      if(!v)return true;
      const nx=x+rx, ny=y+ry;
      return nx>=0 && ny>=0 &&
             nx<GRID_SIZE && ny<GRID_SIZE &&
             !board[ny*GRID_SIZE+nx];
    })
  );
}

function placePiece(piece,x,y){
  const shape=JSON.parse(piece.dataset.shape);
  let blocks=0;

  shape.forEach((r,ry)=>r.forEach((v,rx)=>{
    if(!v)return;
    const idx=(y+ry)*GRID_SIZE+(x+rx);
    board[idx]=piece.dataset.color;
    grid.children[idx].classList.add("filled");
    grid.children[idx].style.background=piece.dataset.color;
    blocks++;
  }));

  score += blocks * 10;

  const lines = clearLines();
  combo = lines ? combo+1 : 1;

  if(lines){
    const gain = lines * 200 * combo;
    score += gain;
    floatingScore(`+${gain} 🔥 x${combo}`);
  }

  updateHUD();
  updateProgress();
}

/* ===============================
   LINHAS
================================ */
function clearLines(){
  let count=0;
  for(let i=0;i<GRID_SIZE;i++){
    if([...Array(GRID_SIZE)].every((_,j)=>board[i*GRID_SIZE+j])){
      for(let c=0;c<GRID_SIZE;c++) reset(i*GRID_SIZE+c);
      count++;
    }
    if([...Array(GRID_SIZE)].every((_,j)=>board[j*GRID_SIZE+i])){
      for(let r=0;r<GRID_SIZE;r++) reset(r*GRID_SIZE+i);
      count++;
    }
  }
  return count;
}

function reset(i){
  board[i]=null;
  grid.children[i].classList.remove("filled");
  grid.children[i].style.background="";
}

/* ===============================
   TIMER + HUD
================================ */
function startTimer(){
  clearInterval(timer);
  timer=setInterval(()=>{
    timeLeft--;
    updateTimerUI();

    if(score>=targetScore) endGame(true);
    if(timeLeft<=0) endGame(false);
  },1000);
}

function updateTimerUI(){
  const m=Math.floor(timeLeft/60);
  const s=timeLeft%60;
  timerEl.textContent=
    `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function updateProgress(){
  if(!targetScore) return;
  const pct=Math.min((score/targetScore)*100,100);
  progressBarEl.style.width=pct+"%";
}

/* ===============================
   GAME OVER / VITÓRIA
================================ */
function checkGameOver(){
  for(const p of piecesContainer.children)
    for(let y=0;y<GRID_SIZE;y++)
      for(let x=0;x<GRID_SIZE;x++)
        if(canPlace(p,x,y)) return;
  endGame(false);
}

function endGame(win){
  clearInterval(timer);

  if(win){
    document.getElementById("victoryScore").textContent = score;
    document.getElementById("victoryScreen")
      .classList.remove("hidden");
  } else {
    document.getElementById("finalScore").textContent = score;
    document.getElementById("gameOverScreen")
      .classList.remove("hidden");
  }
}

/* ===============================
   UI
================================ */
function updateHUD(){
  scoreEl.textContent=score;
  comboEl.textContent="x"+combo;
}

function backToStart(){
  clearInterval(timer);
  document.getElementById("gameScreen").classList.add("hidden");
  document.getElementById("gameOverScreen").classList.add("hidden");
  document.getElementById("victoryScreen")?.classList.add("hidden");
  document.getElementById("startScreen").classList.remove("hidden");
}

/* ===============================
   AUX
================================ */
function getGridPos(e){
  const r=grid.getBoundingClientRect();
  return {
    x:Math.floor((e.clientX-r.left)/(r.width/GRID_SIZE)),
    y:Math.floor((e.clientY-r.top)/(r.height/GRID_SIZE))
  };
}

function showPreview(piece,x,y){
  if(!canPlace(piece,x,y))return;
  const shape=JSON.parse(piece.dataset.shape);
  shape.forEach((r,ry)=>r.forEach((v,rx)=>{
    if(!v)return;
    grid.children[(y+ry)*GRID_SIZE+(x+rx)]
      ?.classList.add("preview");
  }));
}

function clearPreview(){
  document.querySelectorAll(".preview")
    .forEach(c=>c.classList.remove("preview"));
}

function floatingScore(text){
  const f=document.createElement("div");
  f.className="floating-score";
  f.textContent=text;
  document.body.appendChild(f);
  setTimeout(()=>f.remove(),900);
}
