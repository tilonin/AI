import {create} from 'zustand';
import {initialWorld,makeObject,snapshotSchema,actionSchema,type Snapshot,type WorldObject,type Action} from './engine';
export type Tool='select'|'move'|'cube'|'sphere'|'crystal'|'agent'|'impulse'|'delete';
export type Log={id:number;text:string;kind:'system'|'ai'|'user'};
interface State extends Snapshot{paused:boolean;selected:string|null;tool:Tool;logs:Log[];impulse:number;dragging:boolean;revision:number;fps:number;renderer:string;set:(s:Partial<State>)=>void;log:(text:string,kind?:Log['kind'])=>void;add:(kind:WorldObject['kind'],p?:[number,number,number])=>void;remove:(id:string)=>void;update:(id:string,patch:Partial<WorldObject>)=>void;act:(a:Action)=>void;snapshot:()=>Snapshot;load:(s:unknown)=>void;reset:(mode:Snapshot['mode'])=>void}
export const live=new Map<string,{position:[number,number,number];rotation:[number,number,number];velocity:[number,number,number]}>();
const base=()=>({version:1 as const,name:'Остров Эхо',mode:'Sandbox' as Snapshot['mode'],objects:initialWorld(),gravity:9.81,daylight:.85,speed:1,elapsed:0,delivered:0,memory:[] as string[]});
export const useWorld=create<State>((set,get)=>({...base(),paused:false,selected:null,tool:'select',logs:[{id:0,text:'Мир создан. Два агента готовы к работе.',kind:'system'}],impulse:0,dragging:false,revision:0,fps:60,renderer:'Three.js',set,
 log:(text,kind='system')=>set(s=>({logs:[...s.logs,{id:Date.now()+Math.random(),text,kind}].slice(-100),memory:[...s.memory,text.slice(0,500)].slice(-80)})),
 add:(kind,p)=>{if(get().objects.length>=120){get().log('Достигнут лимит: 120 объектов.');return;}set(s=>({objects:[...s.objects,makeObject(kind,p)]}));},
 remove:id=>{live.delete(id);set(s=>({objects:s.objects.filter(o=>o.id!==id),selected:s.selected===id?null:s.selected}));},
 update:(id,patch)=>set(s=>({objects:s.objects.map(o=>o.id===id?{...o,...patch}:o)})),
 act:raw=>{const a=actionSchema.parse(raw),s=get();if(a.type==='spawn')for(let i=0;i<a.count;i++)s.add(a.kind,a.position?[a.position[0]+i*.9,a.position[1]+i*.4,a.position[2]]:undefined);if(a.type==='environment')set({...(a.gravity!==undefined?{gravity:a.gravity}:{}),...(a.daylight!==undefined?{daylight:a.daylight}:{})});if(a.type==='time')set({...(a.paused!==undefined?{paused:a.paused}:{}),...(a.speed!==undefined?{speed:a.speed}:{})});if(a.type==='goal')set(st=>({objects:st.objects.map(o=>o.kind==='agent'?{...o,goal:a.goal}:o)}));if(a.type==='impulse')set({impulse:a.strength+Math.random()*.001});if(a.type==='move'){s.update(a.id,{position:a.position,velocity:[0,0,0]});set(st=>({revision:st.revision+1}));}},
 snapshot:()=>{const s=get();return snapshotSchema.parse({version:1,name:s.name,mode:s.mode,objects:s.objects.map(o=>({...o,...(live.get(o.id)??{})})),gravity:s.gravity,daylight:s.daylight,speed:s.speed,elapsed:s.elapsed,delivered:s.delivered,memory:s.memory});},
 load:raw=>{const s=snapshotSchema.parse(raw);live.clear();set(st=>({...s,selected:null,paused:false,revision:st.revision+1}));get().log('Состояние мира восстановлено.');},
 reset:mode=>{live.clear();set(s=>({...base(),mode,selected:null,paused:false,revision:s.revision+1,logs:[]}));if(mode==='Simulation'){get().act({type:'spawn',kind:'cube',count:12});get().act({type:'goal',goal:'collect'});}if(mode==='AI Interaction')get().act({type:'goal',goal:'collect'});get().log(`Новая сессия: ${mode}.`);}
}));
export function saveSlot(slot:number){const world=useWorld.getState().snapshot();localStorage.setItem('aether-slot-'+slot,JSON.stringify({date:new Date().toISOString(),world}));return world;}
