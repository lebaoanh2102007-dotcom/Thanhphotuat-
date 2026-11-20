import * as THREE from 'three';

const socket = window.io ? io({transports:['websocket','polling']}) : null;
const game = document.getElementById('game');
const joinScreen = document.getElementById('joinScreen');
const nameInput = document.getElementById('nameInput');
const jobInput = document.getElementById('jobInput');
const messages = document.getElementById('messages');
const connection = document.getElementById('connection');
const online = document.getElementById('online');
const chatBox = document.getElementById('chatBox');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9bc3d1);
scene.fog = new THREE.Fog(0x9bc3d1, 75, 230);
const camera = new THREE.PerspectiveCamera(65, innerWidth/innerHeight, .1, 500);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
game.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xd9efff,0x52604b,2.0));
const sun = new THREE.DirectionalLight(0xffedcf,2.3);
sun.position.set(-55,90,35); sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-100; sun.shadow.camera.right=100; sun.shadow.camera.top=100; sun.shadow.camera.bottom=-100;
scene.add(sun);

const mat=(color,roughness=.9)=>new THREE.MeshStandardMaterial({color,roughness});
const groundMat=mat(0x648b60), roadMat=mat(0x303943), lineMat=mat(0xe8dcae), sidewalkMat=mat(0x9caaa9);
const box=(w,h,d,material,x,y,z,parent=scene)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};

// Ground and a compact procedural city grid.
box(520,1,520,groundMat,0,-.55,0);
for(let i=-4;i<=4;i++){
  const p=i*28;
  box(10,.08,250,roadMat,p,.02,0);
  box(250,.08,10,roadMat,0,.025,p);
  for(let n=-4;n<=4;n++){
    const q=n*28;
    if(Math.abs(q-p)<18) continue;
    // Sidewalk strips
    box(1.1,.13,250,sidewalkMat,p-5.6,.08,0); box(1.1,.13,250,sidewalkMat,p+5.6,.08,0);
    box(250,.13,1.1,sidewalkMat,0,.08,p-5.6); box(250,.13,1.1,sidewalkMat,0,.08,p+5.6);
  }
}
for(let i=-4;i<=4;i++) for(let j=-4;j<=4;j++){
  if((i+j)%7===0) continue;
  const x=i*28+14, z=j*28+14;
  const count=2+Math.floor(Math.random()*3);
  for(let k=0;k<count;k++){
    const w=4+Math.random()*6,d=4+Math.random()*6,h=7+Math.random()*25;
    const bx=x+(Math.random()-.5)*13,bz=z+(Math.random()-.5)*13;
    const palette=[0xb7a99a,0xc8c2b4,0x899ca5,0xd1b99b,0x9bada0];
    const building=box(w,h,d,mat(palette[Math.floor(Math.random()*palette.length)]),bx,h/2,bz);
    // Window bands
    const winMat=new THREE.MeshStandardMaterial({color:0x83b8c9,emissive:0x18313b,roughness:.35});
    for(let yy=2.5;yy<h-1;yy+=3.2){
      for(let xx=-w/2+1;xx<w/2-.5;xx+=1.7){
        box(.75,.95,.045,winMat,bx+xx,yy,bz+d/2+.025,scene);
      }
    }
    if(h>20) box(w*.55,1,d*.55,mat(0x555d66),bx,h+.5,bz);
  }
}
// Road lane dashes
for(let i=-4;i<=4;i++) for(let n=-10;n<=10;n++){
  const p=n*11;
  box(.16,.035,3.2,lineMat,i*28,.09,p);
  box(3.2,.035,.16,lineMat,p,.095,i*28);
}
// Trees and street lamps
for(let i=-4;i<=4;i++) for(let j=-4;j<=4;j++){
  const x=i*28+7,z=j*28+7;
  if(Math.random()>.55) continue;
  const trunk=mat(0x65472f),leaf=mat(0x34734c);
  const t=new THREE.Mesh(new THREE.CylinderGeometry(.25,.38,2.4,7),trunk);t.position.set(x,1.2,z);t.castShadow=true;scene.add(t);
  const crown=new THREE.Mesh(new THREE.SphereGeometry(1.6,8,7),leaf);crown.position.set(x,3,z);crown.castShadow=true;scene.add(crown);
}

function makeAvatar(color=0xc78cff){
  const group=new THREE.Group();
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.48,.85,4,8),mat(color));body.position.y=1.2;body.castShadow=true;group.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.34,12,10),mat(0xf0c9a5));head.position.y=2.15;head.castShadow=true;group.add(head);
  const hair=new THREE.Mesh(new THREE.SphereGeometry(.35,10,7,0,Math.PI*2,0,Math.PI/2),mat(0x30251f));hair.position.y=2.34;group.add(hair);
  const legMat=mat(0x26364b);
  for(const side of [-1,1]){const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.17,.55,3,6),legMat);leg.position.set(side*.22,.38,0);leg.castShadow=true;group.add(leg);}
  return group;
}
const playerObjects=new Map();
let myId=null,myAvatar=null,joined=false;
let worldYaw=0, cameraPitch=.24, cameraDistance=8;
const keys={};
let joystick={x:0,y:0},touchRun=false;
let velocity=new THREE.Vector3();
let lastSend=0;
const clock=new THREE.Clock();

function addPlayer(p,isMe=false){
  if(playerObjects.has(p.id)) return playerObjects.get(p.id);
  const avatar=makeAvatar(p.color || 0xc78cff);
  avatar.position.set(p.x||0,0,p.z||0); avatar.rotation.y=p.yaw||0;
  scene.add(avatar);
  const labelCanvas=document.createElement('canvas');labelCanvas.width=256;labelCanvas.height=64;
  const ctx=labelCanvas.getContext('2d');ctx.fillStyle='#071522cc';ctx.roundRect(4,4,248,56,14);ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 25px sans-serif';ctx.textAlign='center';ctx.fillText(p.name||'Người chơi',128,41);
  const tex=new THREE.CanvasTexture(labelCanvas);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));
  sprite.scale.set(3, .75, 1);sprite.position.y=3.05;avatar.add(sprite);
  playerObjects.set(p.id,{avatar,data:p});
  if(isMe){myAvatar=avatar;myId=p.id;}
  return playerObjects.get(p.id);
}
function removePlayer(id){const obj=playerObjects.get(id);if(obj){scene.remove(obj.avatar);playerObjects.delete(id);}}
function updatePlayer(p){const o=playerObjects.get(p.id);if(!o)return;o.data=p;o.avatar.position.set(p.x,0,p.z);o.avatar.rotation.y=p.yaw;}

function addMessage(html,cls='msg'){const el=document.createElement('div');el.className=cls;el.innerHTML=html;messages.appendChild(el);while(messages.children.length>45)messages.removeChild(messages.firstChild);messages.scrollTop=messages.scrollHeight;}
function safe(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function toast(s){const t=document.getElementById('toast');t.textContent=s;t.style.opacity=1;clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.style.opacity=0,2400);}

if(socket){
 socket.on('connect',()=>{connection.textContent='● Đã kết nối máy chủ';connection.style.color='#9ff0b6';});
 socket.on('disconnect',()=>{connection.textContent='○ Mất kết nối máy chủ';connection.style.color='#ffb2a7';});
 socket.on('welcome',data=>{myId=data.id;Object.values(data.players||{}).forEach(p=>addPlayer(p,p.id===data.id));online.textContent=`● ${Object.keys(data.players||{}).length} online`;});
 socket.on('playerJoined',p=>{addPlayer(p);toast(`${p.name} vừa vào thành phố`);});
 socket.on('playerMoved',updatePlayer);
 socket.on('playerLeft',id=>{removePlayer(id);});
 socket.on('systemMessage',s=>addMessage(safe(s),'system'));
 socket.on('chatMessage',m=>addMessage(`<b>${safe(m.name)}:</b> ${safe(m.text)}`));
 socket.on('playerCount',n=>online.textContent=`● ${n} online`);
}else connection.textContent='Không tải được Socket.IO';

document.getElementById('joinButton').addEventListener('click',()=>{
 if(!socket || !socket.connected){toast('Chưa kết nối được máy chủ');return;}
 const name=(nameInput.value.trim()||'Người chơi').slice(0,20);
 document.getElementById('playerName').textContent=name;
 document.getElementById('playerJob').textContent=jobInput.value;
 socket.emit('join',{name,job:jobInput.value});
 joined=true;joinScreen.style.display='none';
 toast('Chúc bạn chơi vui vẻ!');
});
document.getElementById('chatForm').addEventListener('submit',e=>{
 e.preventDefault();const input=document.getElementById('chatInput');const text=input.value.trim();
 if(text&&socket?.connected&&joined)socket.emit('chat',text);input.value='';
});
document.getElementById('chatToggle').addEventListener('click',()=>chatBox.classList.toggle('collapsed'));

addEventListener('keydown',e=>{keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();});
addEventListener('keyup',e=>keys[e.code]=false);
addEventListener('blur',()=>Object.keys(keys).forEach(k=>keys[k]=false));

let dragging=false,lastX=0,lastY=0;
renderer.domElement.addEventListener('pointerdown',e=>{if(e.target.closest?.('.chat'))return;dragging=true;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);});
renderer.domElement.addEventListener('pointermove',e=>{if(!dragging)return;worldYaw-=(e.clientX-lastX)*.006;cameraPitch=THREE.MathUtils.clamp(cameraPitch+(e.clientY-lastY)*.003,-.1,.75);lastX=e.clientX;lastY=e.clientY;});
renderer.domElement.addEventListener('pointerup',()=>dragging=false);
renderer.domElement.addEventListener('pointercancel',()=>dragging=false);

// Touch joystick
const joy=document.getElementById('joystick'),stick=document.getElementById('stick');
let joyPointer=null;
joy.addEventListener('pointerdown',e=>{joyPointer=e.pointerId;joy.setPointerCapture(e.pointerId);moveJoy(e);});
joy.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer)moveJoy(e);});
function moveJoy(e){const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=e.clientX-cx,dy=e.clientY-cy;const len=Math.hypot(dx,dy),max=36;if(len>max){dx=dx/len*max;dy=dy/len*max;}joystick.x=dx/max;joystick.y=dy/max;stick.style.transform=`translate(${dx}px,${dy}px)`;}
function resetJoy(){joyPointer=null;joystick={x:0,y:0};stick.style.transform='translate(0,0)';}
joy.addEventListener('pointerup',resetJoy);joy.addEventListener('pointercancel',resetJoy);
const runBtn=document.getElementById('runButton');runBtn.addEventListener('pointerdown',()=>touchRun=true);runBtn.addEventListener('pointerup',()=>touchRun=false);runBtn.addEventListener('pointerleave',()=>touchRun=false);

function animate(){
 requestAnimationFrame(animate);
 const dt=Math.min(clock.getDelta(),.05);
 if(joined&&myAvatar){
   let ix=(keys.KeyD?1:0)-(keys.KeyA?1:0)+joystick.x;
   let iz=(keys.KeyS?1:0)-(keys.KeyW?1:0)+joystick.y;
   const len=Math.hypot(ix,iz);if(len>1){ix/=len;iz/=len;}
   const running=keys.ShiftLeft||keys.ShiftRight||touchRun;
   const speed=running?12:7;
   const forward=new THREE.Vector3(-Math.sin(worldYaw),0,-Math.cos(worldYaw));
   const right=new THREE.Vector3(Math.cos(worldYaw),0,-Math.sin(worldYaw));
   const move=forward.multiplyScalar(-iz).add(right.multiplyScalar(ix));
   if(move.lengthSq()>.001){move.normalize();myAvatar.position.addScaledVector(move,speed*dt);myAvatar.rotation.y=Math.atan2(move.x,move.z);}
   myAvatar.position.x=THREE.MathUtils.clamp(myAvatar.position.x,-115,115);
   myAvatar.position.z=THREE.MathUtils.clamp(myAvatar.position.z,-115,115);
   const now=performance.now();
   if(now-lastSend>70){socket.emit('move',{x:myAvatar.position.x,z:myAvatar.position.z,yaw:myAvatar.rotation.y});lastSend=now;}
   document.getElementById('coords').textContent=`X: ${Math.round(myAvatar.position.x)} • Z: ${Math.round(myAvatar.position.z)}`;
 }
 if(myAvatar){
   const target=new THREE.Vector3(myAvatar.position.x+Math.sin(worldYaw)*cameraDistance, cameraDistance*.62+cameraPitch*8, myAvatar.position.z+Math.cos(worldYaw)*cameraDistance);
   camera.position.lerp(target,1-Math.pow(.001,dt));camera.lookAt(myAvatar.position.x,1.3,myAvatar.position.z);
 }else{camera.position.lerp(new THREE.Vector3(0,35,48),.02);camera.lookAt(0,0,0);}
 renderer.render(scene,camera);
}
animate();
setInterval(()=>{const d=new Date();document.getElementById('clock').textContent=d.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});},1000);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
