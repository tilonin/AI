import {z} from 'zod';
export const vec=z.tuple([z.number().finite().min(-40).max(40),z.number().finite().min(-10).max(40),z.number().finite().min(-40).max(40)]);
export const objectSchema=z.object({id:z.string().max(80),kind:z.enum(['cube','sphere','crystal','agent']),name:z.string().max(80),position:vec,rotation:vec.default([0,0,0]),velocity:vec.default([0,0,0]),color:z.string().regex(/^#[0-9a-f]{6}$/i),mass:z.number().min(.1).max(20),health:z.number().min(0).max(100),goal:z.enum(['explore','collect','follow','idle']).default('explore'),collected:z.number().int().min(0).default(0)});
export type WorldObject=z.infer<typeof objectSchema>;
export const actionSchema=z.discriminatedUnion('type',[
 z.object({type:z.literal('spawn'),kind:z.enum(['cube','sphere','crystal','agent']),count:z.number().int().min(1).max(16),position:vec.optional()}),
 z.object({type:z.literal('environment'),gravity:z.number().min(0).max(25).optional(),daylight:z.number().min(0).max(1).optional()}),
 z.object({type:z.literal('time'),paused:z.boolean().optional(),speed:z.number().min(.25).max(2).optional()}),
 z.object({type:z.literal('goal'),goal:z.enum(['explore','collect','follow','idle'])}),
 z.object({type:z.literal('impulse'),strength:z.number().min(1).max(15)}),
 z.object({type:z.literal('move'),id:z.string(),position:vec}),
 z.object({type:z.literal('explain')})]);
export type Action=z.infer<typeof actionSchema>;
export const planSchema=z.object({message:z.string().max(2000),actions:z.array(actionSchema).max(8)});
export const snapshotSchema=z.object({version:z.literal(1),name:z.string().max(80),mode:z.enum(['Sandbox','Simulation','AI Interaction']),objects:z.array(objectSchema).max(120),gravity:z.number().min(0).max(25),daylight:z.number().min(0).max(1),speed:z.number().min(.25).max(2),elapsed:z.number().min(0),delivered:z.number().int().min(0).default(0),memory:z.array(z.string().max(500)).max(80)});
export type Snapshot=z.infer<typeof snapshotSchema>;
export const colors={cube:'#dfb786',sphere:'#a7c4cd',crystal:'#9bedcf',agent:'#e9e5cf'};
let seq=0;
export function makeObject(kind:WorldObject['kind'],position?:[number,number,number]):WorldObject{return {id:`${kind}-${Date.now()}-${++seq}`,kind,name:{cube:'Грузовой блок',sphere:'Сфера',crystal:'Энергокристалл',agent:'Агент'}[kind]+' '+seq,position:position??[(Math.random()-.5)*12,3+Math.random()*3,(Math.random()-.5)*10],rotation:[0,0,0],velocity:[0,0,0],color:colors[kind],mass:kind==='cube'?2:1,health:100,goal:'explore',collected:0};}
export function initialWorld():WorldObject[]{return [makeObject('agent',[-2,.8,1]),makeObject('agent',[3,.8,-2]),...Array.from({length:7},(_,i)=>makeObject('crystal',[Math.cos(i*1.8)*5,.7,Math.sin(i*1.8)*4])),makeObject('cube',[-4,.6,2]),makeObject('cube',[-4,1.8,2]),makeObject('sphere',[4,1,3])];}
export function localPlan(text:string,objects:WorldObject[]):z.infer<typeof planSchema>{
 const clauses=text.split(/\s+и\s+|;/i).filter(Boolean);if(clauses.length>1){const plans=clauses.slice(0,4).map(c=>localPlan(c,objects));return {message:plans.map(p=>p.message).join(' '),actions:plans.flatMap(p=>p.actions).slice(0,8)};}
 const t=text.toLowerCase(); const n=Math.min(16,Math.max(1,Number(t.match(/\d+/)?.[0]??3)));
 if(/объяс|что происходит|статус|explain/.test(t))return {message:`В мире ${objects.length} объектов и ${objects.filter(o=>o.kind==='agent').length} агентов. Агенты оценивают ближайшие кристаллы и препятствия на каждом шаге. Выберите задачу «сбор», чтобы они доставили энергию в центр острова.`,actions:[{type:'explain'}]};
 if(/гравита|gravity|невесом/.test(t))return {message:'Обновляю гравитацию мира.',actions:[{type:'environment',gravity:/невесом|выключ|zero/.test(t)?0:Math.min(25,Number(t.match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(',','.')??4))}]};
 if(/ночь|night|закат|день|day/.test(t))return {message:'Меняю освещение окружения.',actions:[{type:'environment',daylight:/ночь|night/.test(t)?.12:/закат/.test(t)?.5:1}]};
 if(/пауза|останов|pause/.test(t))return {message:'Симуляция на паузе.',actions:[{type:'time',paused:true}]};
 if(/запусти|продолж|start|resume/.test(t))return {message:'Продолжаю симуляцию.',actions:[{type:'time',paused:false}]};
 if(/собир|сбор|собер|collect/.test(t))return {message:'Агенты ищут ближайшие кристаллы и доставляют энергию к маяку.',actions:[{type:'goal',goal:'collect'}]};
 if(/исслед|explore/.test(t))return {message:'Агенты исследуют остров и обходят препятствия.',actions:[{type:'goal',goal:'explore'}]};
 if(/следуй|следова|follow/.test(t))return {message:'Агенты направляются к выбранному объекту, либо к маяку.',actions:[{type:'goal',goal:'follow'}]};
 if(/импульс|толк|взрыв|impulse/.test(t))return {message:'Прикладываю радиальный импульс к динамическим объектам.',actions:[{type:'impulse',strength:Math.min(n,15)}]};
 if(/созда|добав|spawn|create/.test(t)){const kind=/агент|робот|agent/.test(t)?'agent':/сфер|шар|sphere/.test(t)?'sphere':/крист|crystal/.test(t)?'crystal':'cube';return {message:`Добавляю объекты (${n}). Они сразу участвуют в физической симуляции.`,actions:[{type:'spawn',kind,count:n}]};}
 if(/перемест|move/.test(t)){const nums=[...t.matchAll(/-?\d+(?:\.\d+)?/g)].map(x=>Number(x[0])); const o=objects.find(x=>x.kind==='cube')??objects[0];if(o&&nums.length>=3)return {message:`Перемещаю «${o.name}» в заданные координаты.`,actions:[{type:'move',id:o.id,position:nums.slice(-3) as [number,number,number]}]};}
 return {message:'Локальный планировщик понимает создание объектов, сбор кристаллов, исследование, импульс, гравитацию, день / ночь, паузу и координаты. Для свободной формулировки подключите LLM-сервер в настройках.',actions:[]};
}
