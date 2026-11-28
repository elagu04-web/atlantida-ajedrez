// Catálogo CC0 de Lichess. Precalcula recorridos legales para no analizar miles
// de PGN cada vez que alguien abre el explorador en su teléfono.
const fs=require('node:fs'),path=require('node:path'),{Chess}=require('chess.js');
const raiz=path.resolve(__dirname,'..'),catalogo=require('../data/aperturas-catalogo.json');
const recorridos=catalogo.map(a=>{const c=new Chess();c.loadPgn(a.pgn);if(c.fen().split(' ').slice(0,4).join(' ')!==a.fen)throw Error('Posición inconsistente: '+a.nombre);return c.history({verbose:true}).map(m=>m.from+m.to+(m.promotion??'')).join(' ');});
fs.writeFileSync(path.join(raiz,'data/aperturas-recorridos.json'),JSON.stringify(recorridos)+'\n');
console.log(`${recorridos.length} recorridos verificados; profundidad máxima ${Math.max(...recorridos.map(r=>r.split(' ').length))} medias jugadas.`);
