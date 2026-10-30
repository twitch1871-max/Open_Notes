import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,scryptSync,timingSafeEqual,createHash,randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
const dataDir=process.env.DATA_DIR||new URL('./.data/',import.meta.url).pathname;
await mkdir(dataDir,{recursive:true});
const db=new DatabaseSync(resolve(dataDir,'opennotes.sqlite'));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE,password TEXT,salt TEXT);
CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),expires INTEGER);
CREATE TABLE IF NOT EXISTS notes(id TEXT,user_id TEXT REFERENCES users(id),title TEXT,body TEXT,updated INTEGER,PRIMARY KEY(id,user_id));`);
const routes={'/':['index.html','text/html'],'/src/app.js':['src/app.js','text/javascript'],'/src/model.js':['src/model.js','text/javascript'],'/src/style.css':['src/style.css','text/css']};
const attempts=new Map();
function hash(s){return createHash('sha256').update(s).digest('hex');}
function session(req){const token=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('session='))?.slice(8);return token?db.prepare('SELECT users.id, users.email FROM sessions JOIN users ON users.id=sessions.user_id WHERE hash=? AND expires>?').get(hash(token),Date.now()):null;}
function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
async function body(req){let text='';for await(const part of req){text+=part;if(Buffer.byteLength(text)>1_000_000)throw new Error('Zu viele Daten');}return JSON.parse(text||'{}');}
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
 const path=new URL(req.url,'http://localhost').pathname;
 try{
 if(path.startsWith('/api/')){
  if(!['GET','HEAD'].includes(req.method)){
   if(req.headers['sec-fetch-site']==='cross-site')return send(res,403,{error:'Ungültige Herkunft'});
   if(req.headers.origin&&req.headers.origin!==`${process.env.COOKIE_SECURE==='1'?'https':'http'}://${req.headers.host}`)return send(res,403,{error:'Ungültige Herkunft'});
   if(!req.headers['content-type']?.startsWith('application/json'))return send(res,415,{error:'JSON erforderlich'});
  }
  if(['/api/register','/api/login'].includes(path)&&req.method==='POST'){
   const ip=req.socket.remoteAddress;const now=Date.now();let attempt=attempts.get(ip);if(!attempt||attempt.until<now){attempt={count:0,until:now+60000};attempts.set(ip,attempt);}if(++attempt.count>15)return send(res,429,{error:'Zu viele Versuche. Bitte in einer Minute erneut versuchen.'});
   const data=await body(req);const email=typeof data.email==='string'?data.email.trim().toLowerCase():'';const password=data.password;
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||typeof password!=='string'||password.length<10||password.length>256)return send(res,400,{error:'Gültige E-Mail und Passwort mit 10 bis 256 Zeichen erforderlich.'});
   let user=db.prepare('SELECT * FROM users WHERE email=?').get(email);
   if(path==='/api/register'){
    if(user)return send(res,409,{error:'Konto kann mit dieser E-Mail nicht erstellt werden.'});
    const salt=randomBytes(16).toString('hex');user={id:randomUUID(),email};db.prepare('INSERT INTO users VALUES(?,?,?,?)').run(user.id,email,scryptSync(password,salt,64).toString('hex'),salt);
   }else{
    const actual=scryptSync(password,user?.salt||'invalid',64);if(!user||!timingSafeEqual(actual,Buffer.from(user.password,'hex')))return send(res,401,{error:'E-Mail oder Passwort ist falsch.'});
   }
   db.prepare('DELETE FROM sessions WHERE expires<?').run(now);const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token),user.id,now+604800000);
   res.setHeader('Set-Cookie',`session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${process.env.COOKIE_SECURE==='1'?'; Secure':''}`);return send(res,200,{email:user.email});
  }
  const user=session(req);if(!user)return send(res,401,{error:'Bitte anmelden.'});
  if(path==='/api/me'&&req.method==='GET')return send(res,200,{email:user.email});
  if(path==='/api/logout'&&req.method==='POST'){const token=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('session='))?.slice(8);if(token)db.prepare('DELETE FROM sessions WHERE hash=?').run(hash(token));res.setHeader('Set-Cookie','session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');return send(res,200,{ok:true});}
  if(path==='/api/notes'&&req.method==='GET')return send(res,200,db.prepare('SELECT id,title,body,updated FROM notes WHERE user_id=? ORDER BY updated DESC').all(user.id));
  if(path.startsWith('/api/notes/')){const id=decodeURIComponent(path.slice(11));if(!/^[a-zA-Z0-9-]{1,80}$/.test(id))return send(res,400,{error:'Ungültige ID'});
   if(req.method==='PUT'){const n=await body(req);if(typeof n.title!=='string'||n.title.length>500||typeof n.body!=='string'||n.body.length>500000)return send(res,400,{error:'Notiz ist zu groß oder ungültig.'});const updated=Date.now();db.prepare('INSERT INTO notes VALUES(?,?,?,?,?) ON CONFLICT(id,user_id) DO UPDATE SET title=excluded.title,body=excluded.body,updated=excluded.updated').run(id,user.id,n.title,n.body,updated);return send(res,200,{updated});}
   if(req.method==='DELETE'){db.prepare('DELETE FROM notes WHERE id=? AND user_id=?').run(id,user.id);return send(res,200,{ok:true});}
  }
  return send(res,404,{error:'Nicht gefunden'});
 }
 const route=routes[path];if(!route){res.writeHead(404);return res.end('Not found');}const content=await readFile(new URL(route[0],import.meta.url));res.writeHead(200,{'Content-Type':route[1]+'; charset=utf-8'});res.end(content);
 }catch(error){send(res,400,{error:error instanceof SyntaxError?'Ungültige Anfrage':'Anfrage konnte nicht verarbeitet werden.'});}
});
server.listen(Number(process.env.PORT)||5173,'0.0.0.0',()=>console.log('OpenNotes listening on port '+(process.env.PORT||5173)));
