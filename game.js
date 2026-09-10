(() => {
"use strict";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const levelText = document.getElementById("levelText");
const scoreText = document.getElementById("scoreText");
const bestText = document.getElementById("bestText");
const nextBubbleEl = document.getElementById("nextBubble");
const messageEl = document.getElementById("message");

const W = canvas.width, H = canvas.height;
const R = 19;
const COLS = 11;
const ROW_H = 34;
const TOP = 48;
const COLORS = ["#e75b55","#efc84a","#62ad68","#4f8fd0","#9b70c5","#df82ae"];

const SAVE_KEY = "bulbule-ka-khel-save-v1";
let save = loadSave();
let grid = [];
let shooter = 0;
let next = 0;
let moving = null;
let aim = {x: W/2, y: 150};
let busy = false;
let levelWon = false;
let animationId = 0;

function loadSave(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(raw) return {...{level:1,score:0,best:0,sound:true},...JSON.parse(raw)};
  }catch(e){}
  return {level:1,score:0,best:0,sound:true};
}
function persist(){
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));}catch(e){}
}
function colorFor(i){return COLORS[i % COLORS.length]}
function randomColor(){
  const count = Math.min(6, 3 + Math.floor((save.level-1)/10));
  return Math.floor(Math.random()*count);
}
function center(q,r){
  const offset = (r % 2) ? R : 0;
  return {x: W/2 + (q-(COLS-1)/2)*R*2 + offset, y: TOP+r*ROW_H};
}
function resetLevel(){
  grid = [];
  const rows = Math.min(7 + Math.floor((save.level-1)/12), 11);
  const density = Math.min(.95, .72 + save.level*.002);
  for(let r=0;r<rows;r++){
    grid[r]=[];
    for(let q=0;q<COLS;q++){
      grid[r][q] = (r < 2 || Math.random()<density) ? randomColor() : -1;
    }
  }
  shooter=randomColor(); next=randomColor();
  moving=null; busy=false; levelWon=false;
  messageEl.textContent="निशाना लगाइए और बुलबुला छोड़िए!";
  updateUI(); draw();
}
function updateUI(){
  levelText.textContent=save.level;
  scoreText.textContent=save.score;
  bestText.textContent=save.best;
  nextBubbleEl.style.background=colorFor(next);
}
function drawBubble(x,y,col,alpha=1){
  ctx.save();
  ctx.globalAlpha=alpha;
  const g=ctx.createRadialGradient(x-7,y-8,2,x,y,R);
  g.addColorStop(0,"#ffffff");
  g.addColorStop(.18,colorFor(col));
  g.addColorStop(1,colorFor(col));
  ctx.fillStyle=g;
  ctx.beginPath();ctx.arc(x,y,R,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="rgba(255,255,255,.65)";ctx.lineWidth=1.5;ctx.stroke();
  ctx.restore();
}
function draw(){
  ctx.clearRect(0,0,W,H);
  drawMithilaBorder();
  for(let r=0;r<grid.length;r++){
    for(let q=0;q<COLS;q++){
      if(grid[r][q]>=0){const p=center(q,r);drawBubble(p.x,p.y,grid[r][q]);}
    }
  }
  if(moving) drawBubble(moving.x,moving.y,moving.col);
  else drawBubble(W/2,H-64,shooter);
  drawBubble(W-48,H-64,next);
  if(!moving && !busy){
    const sx=W/2,sy=H-64;
    let dx=aim.x-sx,dy=aim.y-sy;
    if(dy>-35) dy=-35;
    const len=Math.hypot(dx,dy)||1;
    const ex=sx+dx/len*180, ey=sy+dy/len*180;
    ctx.save();ctx.setLineDash([7,8]);ctx.strokeStyle="rgba(65,54,48,.28)";ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(ex,ey);ctx.stroke();ctx.restore();
  }
}
function drawMithilaBorder(){
  ctx.save();
  ctx.strokeStyle="rgba(123,75,179,.18)";ctx.lineWidth=2;
  ctx.strokeRect(7,7,W-14,H-14);
  for(let x=22;x<W-22;x+=38){
    ctx.beginPath();ctx.arc(x,20,6,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.arc(x,H-20,6,0,Math.PI*2);ctx.stroke();
  }
  ctx.restore();
}
function neighbors(q,r){
  const odd=r%2;
  const dirs=odd?[[-1,0],[1,0],[0,-1],[0,1],[1,-1],[1,1]]:[[-1,0],[1,0],[-1,-1],[-1,1],[0,-1],[0,1]];
  return dirs.map(([dq,dr])=>[q+dq,r+dr]).filter(([a,b])=>a>=0&&a<COLS&&b>=0&&b<grid.length);
}
function cluster(q,r){
  const col=grid[r]?.[q]; if(col<0 || col===undefined)return [];
  const out=[],seen=new Set([`${q},${r}`]),stack=[[q,r]];
  while(stack.length){
    const [a,b]=stack.pop();out.push([a,b]);
    for(const [x,y] of neighbors(a,b)){
      const k=`${x},${y}`;
      if(grid[y]?.[x]===col&&!seen.has(k)){seen.add(k);stack.push([x,y]);}
    }
  }
  return out;
}
function connectedToCeiling(){
  const seen=new Set(),stack=[];
  for(let q=0;q<COLS;q++)if(grid[0]?.[q]>=0){seen.add(`${q},0`);stack.push([q,0]);}
  while(stack.length){
    const [q,r]=stack.pop();
    for(const [x,y] of neighbors(q,r)){
      const k=`${x},${y}`;
      if(grid[y]?.[x]>=0&&!seen.has(k)){seen.add(k);stack.push([x,y]);}
    }
  }
  return seen;
}
function dropDetached(){
  const connected=connectedToCeiling();let n=0;
  for(let r=0;r<grid.length;r++)for(let q=0;q<COLS;q++){
    if(grid[r][q]>=0&&!connected.has(`${q},${r}`)){grid[r][q]=-1;n++;}
  }
  return n;
}
function nearestEmpty(x,y){
  let best=null,dist=Infinity;
  for(let r=0;r<grid.length;r++)for(let q=0;q<COLS;q++){
    if(grid[r][q]<0){
      const p=center(q,r),d=(p.x-x)**2+(p.y-y)**2;
      if(d<dist){dist=d;best=[q,r];}
    }
  }
  if(!best){grid.push(new Array(COLS).fill(-1));best=[Math.floor(COLS/2),grid.length-1];}
  return best;
}
function shoot(){
  if(busy||levelWon)return;
  busy=true;
  const sx=W/2,sy=H-64,dx=aim.x-sx,dy=aim.y-sy;
  const len=Math.hypot(dx,dy)||1;
  moving={x:sx,y:sy,vx:dx/len*8,vy:dy/len*8,col:shooter};
  shooter=next;next=randomColor();updateUI();requestAnimationFrame(tick);
}
function tick(){
  if(!moving){busy=false;return;}
  moving.x+=moving.vx;moving.y+=moving.vy;
  if(moving.x<R){moving.x=R;moving.vx=Math.abs(moving.vx)}
  if(moving.x>W-R){moving.x=W-R;moving.vx=-Math.abs(moving.vx)}
  let hit=moving.y<=TOP+R;
  outer: for(let r=0;r<grid.length;r++)for(let q=0;q<COLS;q++){
    if(grid[r][q]>=0){
      const p=center(q,r);
      if(Math.hypot(moving.x-p.x,moving.y-p.y)<R*1.9){hit=true;break outer;}
    }
  }
  if(hit){
    const [q,r]=nearestEmpty(moving.x,moving.y);
    grid[r][q]=moving.col;moving=null;
    const group=cluster(q,r);
    if(group.length>=3){
      group.forEach(([a,b])=>grid[b][a]=-1);
      const dropped=dropDetached();
      save.score += group.length*10+dropped*25;
      if(dropped>0) messageEl.textContent="अहाँ कमाल कऽ देलियै! 😄";
      else messageEl.textContent=group.length>=5?"गजब कऽ देलियै!":"अरे वाह! 😄";
      save.best=Math.max(save.best,save.score);
      if(allClear()){
        save.level=Math.min(50,save.level+1);
        save.score+=250;
        save.best=Math.max(save.best,save.score);
        messageEl.textContent=save.level===50?"🎉 गजब कऽ देलियै! स्तर 50 पूरा!":"बहुत बढ़िया! स्तर पूरा भऽ गेल।";
        levelWon=true;
        persist();updateUI();draw();
        if(save.level<50)setTimeout(resetLevel,900);
        return;
      }
    }else{
      save.score+=5;save.best=Math.max(save.best,save.score);
    }
    persist();updateUI();busy=false;draw();return;
  }
  draw();animationId=requestAnimationFrame(tick);
}
function allClear(){return grid.every(row=>row.every(v=>v<0))}
function setAim(clientX,clientY){
  const rect=canvas.getBoundingClientRect();
  aim.x=(clientX-rect.left)*W/rect.width;
  aim.y=(clientY-rect.top)*H/rect.height;
  if(aim.y>H-90)aim.y=H-90;
  draw();
}
canvas.addEventListener("pointermove",e=>setAim(e.clientX,e.clientY));
canvas.addEventListener("pointerdown",e=>{setAim(e.clientX,e.clientY);shoot();});
document.getElementById("restartBtn").addEventListener("click",resetLevel);
document.getElementById("soundBtn").addEventListener("click",e=>{
  save.sound=!save.sound;e.currentTarget.textContent=save.sound?"🔊 ध्वनि":"🔇 म्यूट";persist();
});
const settings=document.getElementById("settingsPanel");
document.getElementById("settingsBtn").addEventListener("click",()=>settings.classList.remove("hidden"));
document.getElementById("closeSettingsBtn").addEventListener("click",()=>settings.classList.add("hidden"));
document.getElementById("resetProgressBtn").addEventListener("click",()=>{
  if(confirm("क्या आप पूरी प्रगति रीसेट करना चाहते हैं?")){
    save={level:1,score:0,best:0,sound:true};persist();settings.classList.add("hidden");resetLevel();
  }
});
document.getElementById("soundBtn").textContent=save.sound?"🔊 ध्वनि":"🔇 म्यूट";
resetLevel();
})();