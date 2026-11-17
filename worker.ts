import {worldsApi,type WorldDatabase} from './worlds';
import {z} from 'zod';
import {planGeopolitics,ProviderError,type AIEnv} from './geo-ai';
type Assets=Record<string,[string,string]>;
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function createWorker(assets:Assets){const cache=new Map<string,Uint8Array>();let requests=0,windowStart=0;return {async fetch(request:Request,env:AIEnv&{DB?:WorldDatabase}){const url=new URL(request.url);try{
 if(url.pathname==='/api/health')return json({ok:true,llm:!!env.LLM_API_KEY,model:env.LLM_MODEL??'gpt-4.1-mini',database:!!env.DB});
 if(url.pathname.startsWith('/api/worlds')){const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)return json({error:'Недопустимый источник запроса'},403);return worldsApi(request,env.DB);}
 if(url.pathname.startsWith('/api/')){
  if(request.method!=='POST')return json({error:'Метод не поддерживается'},405);
  const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)return json({error:'Недопустимый источник запроса'},403);
  if(Date.now()-windowStart>60000){windowStart=Date.now();requests=0;}if(++requests>20)return json({error:'Не более 20 запросов в минуту'},429);
  if(url.pathname!=='/api/geopolitics')return json({error:'Этот API доступен только через отдельный Node.js-сервер'},404);
  if(Number(request.headers.get('Content-Length'))>2097152)return json({error:'Слишком большой запрос'},413);const text=await request.text();if(text.length>2097152)return json({error:'Слишком большой запрос'},413);
  return json(await planGeopolitics(JSON.parse(text),env,request.signal));
 }
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
 const path=assets[url.pathname]?url.pathname:(!url.pathname.includes('.')?'/index.html':url.pathname),asset=assets[path];if(!asset)return new Response('Not found',{status:404});
 let bytes=cache.get(path);if(!bytes){bytes=Uint8Array.from(atob(asset[1]),c=>c.charCodeAt(0));cache.set(path,bytes);}const headers={'Content-Type':asset[0],'Content-Encoding':'gzip','Cache-Control':path.startsWith('/assets/')?'public,max-age=31536000,immutable':'no-cache','X-Content-Type-Options':'nosniff'};return new Response(request.method==='HEAD'?null:bytes as unknown as BodyInit,{headers,encodeBody:'manual'} as ResponseInit);
 }catch(e){if(e instanceof ProviderError)return json({error:e.message},e.status);if(e instanceof z.ZodError)return json({error:'Некорректное состояние или план AI. Изменения не применены.'},422);return json({error:e instanceof Error&&e.name==='TimeoutError'?'AI не ответил вовремя':'Не удалось обработать запрос. Изменения не применены.'},502);}}};}
