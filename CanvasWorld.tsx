import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {Simulation,initPhysics,treeSpots} from './simulation';
import {useWorld,live} from './store';
import type {WorldObject} from './engine';
type V=[number,number,number];type Face={v:V[];color:string;stroke?:string;alpha?:number};
function shade(hex:string,f:number){const c=new THREE.Color(hex);c.multiplyScalar(f);return '#'+c.getHexString();}
function cylinder(pos:V,r:number,rb:number,h:number,n:number,color:string,faces:Face[]){const top:V[]=[],bottom:V[]=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2;top.push([pos[0]+Math.cos(a)*r,pos[1]+h/2,pos[2]+Math.sin(a)*r]);bottom.push([pos[0]+Math.cos(a)*rb,pos[1]-h/2,pos[2]+Math.sin(a)*rb]);}for(let i=0;i<n;i++)faces.push({v:[bottom[i],bottom[(i+1)%n],top[(i+1)%n],top[i]],color:shade(color,.64+.25*(Math.cos(i/n*Math.PI*2-.7)+1)/2)});if(r>0)faces.push({v:top,color});}
function cube(pos:V,size:V,color:string,faces:Face[],rot:V=[0,0,0]){const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot));const vertices:V[]=Array.from({length:8},(_,i)=>{const v=new THREE.Vector3((i&1?1:-1)*size[0]/2,(i&2?1:-1)*size[1]/2,(i&4?1:-1)*size[2]/2).applyQuaternion(q);return [v.x+pos[0],v.y+pos[1],v.z+pos[2]];});[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]].forEach((f,i)=>faces.push({v:f.map(n=>vertices[n]),color:shade(color,[.7,.8,.6,1,.76,.88][i])}));}
function crystal(p:V,size:number,color:string,faces:Face[],t=0){const top:V=[p[0],p[1]+size,p[2]],bottom:V=[p[0],p[1]-size,p[2]];const ring:V[]=Array.from({length:4},(_,i)=>{const a=i*Math.PI/2+t;return [p[0]+Math.cos(a)*size*.65,p[1],p[2]+Math.sin(a)*size*.65];});for(let i=0;i<4;i++){faces.push({v:[top,ring[i],ring[(i+1)%4]],color:shade(color,.75+i*.08)});faces.push({v:[bottom,ring[(i+1)%4],ring[i]],color:shade(color,.6+i*.08)});}}
export default function CanvasWorld({reset}:{reset:number}){const ref=useRef<HTMLCanvasElement>(null),simulation=useRef<Simulation|null>(null);const [error,setError]=useState('');const camera=useRef({angle:.73,elevation:.53,zoom:1,panX:0,panY:0});const projectRef=useRef<(v:V)=>[number,number]>(()=>[0,0]);const unprojectRef=useRef<(x:number,y:number)=>[number,number]>(()=>[0,0]);const hitRef=useRef<{id:string;x:number;y:number;r:number;depth:number}[]>([]);const pointer=useRef<{x:number;y:number;button:number;id:string|null;moved:boolean}|null>(null);
 useEffect(()=>{camera.current={angle:.73,elevation:.53,zoom:1,panX:0,panY:0};},[reset]);
 useEffect(()=>{let stopped=false,frame=0,last=performance.now(),lastFPS=last,frames=0;initPhysics().then(()=>{if(stopped)return;const sim=new Simulation();simulation.current=sim;useWorld.getState().set({renderer:'Canvas 2D'});const canvas=ref.current!,ctx=canvas.getContext('2d');if(!ctx){setError('Canvas 2D недоступен');return;}const draw=(now:number)=>{if(stopped)return;const dt=Math.min((now-last)/1000,.1);last=now;sim.update(dt);frames++;const s=useWorld.getState();if(now-lastFPS>1000){s.set({fps:Math.round(frames/((now-lastFPS)/1000)),elapsed:s.elapsed+(s.paused?0:(now-lastFPS)/1000*s.speed)});lastFPS=now;frames=0;}
 const rect=canvas.getBoundingClientRect(),w=rect.width,h=rect.height,dpr=Math.min(devicePixelRatio,1.7);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const bg=ctx.createRadialGradient(w*.5,h*.45,0,w*.5,h*.5,w*.8);bg.addColorStop(0,s.daylight<.3?'#243b40':'#3e5851');bg.addColorStop(1,s.daylight<.3?'#17292e':'#243a37');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 const cam=camera.current,cos=Math.cos(cam.angle),sin=Math.sin(cam.angle),e=cam.elevation,scale=Math.min(w/29,h/23)*cam.zoom;
 const project=(v:V):[number,number]=>[(v[0]*cos-v[2]*sin)*scale+w*.5+cam.panX,((v[0]*sin+v[2]*cos)*e-v[1]*Math.sqrt(1-e*e))*scale+h*.5+cam.panY];projectRef.current=project;
 unprojectRef.current=(x,y)=>{const rx=(x-w*.5-cam.panX)/scale,rz=(y-h*.5-cam.panY)/scale/e;return [rx*cos+rz*sin,-rx*sin+rz*cos];};
 const faces:Face[]=[];
 // Floating island, geometry is projected in real time by the CPU renderer.
 cylinder([0,-2.35,0],10.4,4.5,1.4,10,'#536f61',faces);cylinder([0,-1.3,0],13.2,10.4,1.1,10,'#7f9680',faces);cylinder([0,-.45,0],14.3,13.2,.9,10,'#bfcbae',faces);
 cylinder([0,.01,0],3.1,3.1,.02,40,'#d3d7be',faces);const terrainFaces=faces.splice(0);
 for(let i=0;i<treeSpots.length;i++){const [x,z]=treeSpots[i];cylinder([x,.65,z],.12,.19,1.3,6,'#7d8062',faces);cylinder([x,1.7,z],0,.95,2.4,6,i%2?'#819f7f':'#9aaf8d',faces);cylinder([x,2.35,z],0,.65,1.8,6,'#a4b795',faces);}
 for(let i=0;i<42;i++){const a=i*2.399,r=7+Math.sin(i*7)*3,x=Math.cos(a)*r,z=Math.sin(a)*r;crystal([x,.12,z],.11+i%3*.04,'#d4d7bf',faces);}
 cylinder([0,.1,0],1.05,1.25,.2,12,'#91a58b',faces);cylinder([0,.65,0],.48,.65,1.1,8,'#dce1cb',faces);cylinder([0,1.24,0],.7,.7,.12,16,'#abc9b0',faces);crystal([0,1.95+Math.sin(now*.0015)*.1,0],.48,'#c1ffe0',faces,now*.0002);
 const hits:typeof hitRef.current=[];
 for(const o of s.objects){const b=sim.bodies.get(o.id);if(!b)continue;const p=b.translation(),pos:V=[p.x,p.y,p.z],r=live.get(o.id)?.rotation??o.rotation;const screen=project(pos);hits.push({id:o.id,x:screen[0],y:screen[1],r:Math.max(12,scale*.7),depth:p.x*sin+p.z*cos});
 if(o.kind==='cube')cube(pos,[.9,.9,.9],o.color,faces,r);
 if(o.kind==='crystal')crystal(pos,.5,o.color,faces,r[1]);
 if(o.kind==='sphere'){// Low-poly sphere made from latitude rings, preserving real Rapier motion.
 const n=10;for(let row=0;row<6;row++){const a0=row/6*Math.PI,a1=(row+1)/6*Math.PI;for(let j=0;j<n;j++){const b0=j/n*Math.PI*2,b1=(j+1)/n*Math.PI*2;const v=(a:number,b:number):V=>[p.x+Math.sin(a)*Math.cos(b)*.5,p.y+Math.cos(a)*.5,p.z+Math.sin(a)*Math.sin(b)*.5];faces.push({v:[v(a0,b0),v(a0,b1),v(a1,b1),v(a1,b0)],color:shade(o.color,.65+.3*(1-row/6)+j%3*.02)});}}}
 if(o.kind==='agent'){const yaw=r[1];cube([p.x,p.y,p.z],[.58,.66,.58],o.color,faces,[0,yaw,0]);const fx=Math.sin(yaw),fz=Math.cos(yaw);cube([p.x+fx*.32,p.y+.1,p.z+fz*.32],[.45,.18,.05],'#29443b',faces,[0,yaw,0]);for(const sign of [-1,1]){const sx=Math.cos(yaw)*sign*.13,sz=-Math.sin(yaw)*sign*.13;cube([p.x+fx*.36+sx,p.y+.11,p.z+fz*.36+sz],[.055,.055,.055],'#adffd2',faces);}cylinder([p.x,p.y+.5,p.z],.018,.018,.3,5,'#647c62',faces);crystal([p.x,p.y+.7,p.z],.075,o.collected?'#bbffe0':'#f3af73',faces);for(const sign of [-1,1])cube([p.x+Math.cos(yaw)*.31*sign,p.y-.29,p.z-Math.sin(yaw)*.31*sign],[.15,.24,.34],'#52694e',faces,[0,yaw,0]);}
 }
 // Painter ordering includes every terrain and object face.
 const depth=(f:Face)=>f.v.reduce((sum,v)=>sum+v[0]*sin+v[2]*cos+v[1]*.3,0)/f.v.length;
 faces.sort((a,b)=>depth(a)-depth(b));
 const drawFace=(f:Face)=>{const pp=f.v.map(project);ctx.beginPath();pp.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=f.color;ctx.fill();ctx.strokeStyle=f.color;ctx.lineWidth=.4;ctx.stroke();};
 terrainFaces.sort((a,b)=>depth(a)-depth(b));for(const f of terrainFaces)drawFace(f);
 // Ground grid uses the same projection as hit testing and physics.
 ctx.strokeStyle='#66826a25';ctx.lineWidth=.6;for(let i=-10;i<=10;i++){for(const axis of [0,1]){const a=project(axis?[i,.02,-9]:[-10,.02,i*.9]),b=project(axis?[i,.02,9]:[10,.02,i*.9]);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();}}
 for(const f of faces)drawFace(f);
 if(s.daylight<.7){ctx.fillStyle=`rgba(10,29,42,${(.7-s.daylight)*.55})`;ctx.fillRect(0,0,w,h);}const glow=project([0,2,0]);const g=ctx.createRadialGradient(...glow,0,...glow,scale*2);g.addColorStop(0,'#c6ffe32b');g.addColorStop(1,'#c6ffe300');ctx.fillStyle=g;ctx.fillRect(glow[0]-scale*2,glow[1]-scale*2,scale*4,scale*4);
 // Ambient motes: generated and animated independently of world objects.
 if(s.objects.length<80){for(let i=0;i<15;i++){const a=i*2.39+now*.00005,p=project([Math.cos(a)*7,1+Math.sin(i+now*.0003)*.6,Math.sin(a)*6]);ctx.fillStyle=`rgba(220,246,202,${.2+Math.sin(i+now*.001)*.15})`;ctx.beginPath();ctx.arc(p[0],p[1],1.1,0,Math.PI*2);ctx.fill();}}
 hitRef.current=hits.sort((a,b)=>b.depth-a.depth);
 if(s.selected){const hit=hits.find(x=>x.id===s.selected),o=s.objects.find(o=>o.id===s.selected);if(hit&&o){ctx.strokeStyle='#ffb87d';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(hit.x,hit.y+scale*.35,scale*.65,scale*.65*e,0,0,Math.PI*2);ctx.stroke();ctx.font='10px Arial';ctx.textAlign='center';const width=ctx.measureText(o.name).width+22;ctx.fillStyle='#152b20e6';ctx.fillRect(hit.x-width/2,hit.y-scale*1.4-17,width,24);ctx.fillStyle='#e1ebd7';ctx.fillText(o.name,hit.x,hit.y-scale*1.4-1);}}
 frame=requestAnimationFrame(draw);
 };frame=requestAnimationFrame(draw);
 }).catch(()=>setError('Не удалось загрузить физический движок. Обновите страницу.'));
 return ()=>{stopped=true;cancelAnimationFrame(frame);simulation.current?.free();simulation.current=null;};
 },[]);
 function point(e:React.PointerEvent){const r=ref.current!.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top] as [number,number];}
 function down(e:React.PointerEvent){e.preventDefault();ref.current?.setPointerCapture(e.pointerId);const [x,y]=point(e),s=useWorld.getState();const hit=hitRef.current.find(h=>Math.hypot(h.x-x,h.y-y)<h.r);pointer.current={x,y,button:e.button,id:hit?.id??null,moved:false};if(e.button!==0)return;
 if(hit){if(s.tool==='delete'){s.remove(hit.id);s.log('Объект удалён.');return;}if(s.tool==='impulse'){simulation.current?.bodies.get(hit.id)?.applyImpulse({x:2,y:5,z:-2},true);return;}s.set({selected:hit.id});if(s.tool==='move'&&simulation.current)simulation.current.dragId=hit.id;}
 }
 function up(e:React.PointerEvent){const p=pointer.current;const [x,y]=point(e);if(p&&!p.moved&&e.button===0&&!p.id){const s=useWorld.getState();const [wx,wz]=unprojectRef.current(x,y);if(['cube','sphere','crystal','agent'].includes(s.tool)){if(Math.abs(wx)<11&&Math.abs(wz)<10){s.add(s.tool as WorldObject['kind'],[wx,2,wz]);s.log('Объект добавлен на остров.');}}else if(s.tool==='select')s.set({selected:null});}pointer.current=null;if(simulation.current)simulation.current.dragId=null;useWorld.getState().set({dragging:false});ref.current?.releasePointerCapture(e.pointerId);}
 const s=useWorld.getState();return <div className="canvas-container"><canvas ref={ref} aria-label="Интерактивный мир AETHER. Вращайте камеру мышью, выбирайте объекты инструментами." style={{width:'100%',height:'100%',display:'block',touchAction:'none',cursor:s.tool==='move'?'grab':'default'}} onContextMenu={e=>e.preventDefault()} onPointerDown={down} onPointerUp={up} onPointerCancel={()=>{pointer.current=null;if(simulation.current)simulation.current.dragId=null;}} onPointerMove={e=>{const p=pointer.current;if(!p)return;const [x,y]=point(e),dx=x-p.x,dy=y-p.y;if(Math.abs(dx)+Math.abs(dy)>2)p.moved=true;const sim=simulation.current;if(sim?.dragId&&p.button===0){const [wx,wz]=unprojectRef.current(x,y);sim.drag(sim.dragId,wx,wz);}else if(p.button===2||e.shiftKey){camera.current.panX+=dx;camera.current.panY+=dy;}else{camera.current.angle-=dx*.007;camera.current.elevation=Math.max(.25,Math.min(.85,camera.current.elevation+dy*.003));}p.x=x;p.y=y;}} onWheel={e=>{camera.current.zoom=Math.max(.6,Math.min(2.6,camera.current.zoom*(e.deltaY>0?.93:1.07)));}}/>{error&&<div className="webgl-error">{error}</div>}<div className="renderer-badge">Canvas · Rapier 3D</div></div>;
}
