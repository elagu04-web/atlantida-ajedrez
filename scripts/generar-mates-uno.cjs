// Regenerar con node scripts/generar-mates-uno.cjs. No usa red ni motor remoto.
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {Chess}=require('chess.js'),{LECCIONES_INICIALES}=require('../lib/aprenderDesdeCero.ts');
const banco=[],vistos=new Set();
function agregar(e){const c=new Chess(e.fen),clave=c.fen().split(' ').slice(0,4).join(' ');if(vistos.has(clave))return;const soluciones=c.moves({verbose:true}).filter(m=>{const p=new Chess(c.fen());p.move(m.lan);return p.isCheckmate();}).map(m=>m.lan);if(!soluciones.length||c.isGameOver())throw Error('No hay mate en una: '+e.id);vistos.add(clave);banco.push({...e,fen:c.fen(),soluciones});}
function transformar(fen,espejo,negro){const c=new Chess(fen),tablero=Array.from({length:8},()=>Array(8).fill(null));for(const fila of c.board())for(const p of fila)if(p){const x='abcdefgh'.indexOf(p.square[0]),y=8-Number(p.square[1]),color=negro?(p.color==='w'?'b':'w'):p.color;tablero[negro?7-y:y][espejo?7-x:x]=color==='w'?p.type.toUpperCase():p.type;}return tablero.map(f=>{let s='',n=0;for(const p of f){if(!p)n++;else{if(n)s+=n;n=0;s+=p;}}return s+(n||'');}).join('/')+' '+(negro?(c.turn()==='w'?'b':'w'):c.turn())+' - - 0 1';}
const basicos=LECCIONES_INICIALES.filter(l=>l.tipo==='mate');
const familia=id=>['mate-uno-2','mate-uno-5'].includes(id)?'ultima-fila':id;
const nivel=id=>['mate-uno-3','mate-uno-4'].includes(id)?2:1;
for(const l of basicos)agregar({id:l.id,fen:l.fen,nivel:nivel(l.id),familia:familia(l.id),fuente:'club'});
for(const l of basicos)for(const [espejo,negro,sufijo] of [[true,false,'espejo'],[false,true,'negras'],[true,true,'negras-espejo']])agregar({id:l.id+'-'+sufijo,fen:transformar(l.fen,espejo,negro),nivel:nivel(l.id),familia:familia(l.id),fuente:'club'});
for(const e of require('../data/entrenamiento-lichess.json'))if(e.temas?.includes('mateIn1')&&e.solucion.length===1)agregar({id:'m1-'+e.id,fen:e.fen,nivel:e.rating<1000?2:e.rating<1250?3:e.rating<1500?4:5,familia:'lichess-'+e.id,fuente:'lichess',rating:e.rating,enlace:'https://lichess.org/training/'+e.id.replace(/^li-/, '')});
fs.writeFileSync(path.join(__dirname,'../data/mates-uno.json'),JSON.stringify(banco,null,2)+'\n');console.log(JSON.stringify({posiciones:banco.length,niveles:banco.reduce((a,e)=>(a[e.nivel]=(a[e.nivel]??0)+1,a),{})}));
