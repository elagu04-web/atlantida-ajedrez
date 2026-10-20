/* Network-only app data: never cache games, account pages, APIs or PGNs. */
const CACHE='atlantida-offline-v1';
const OFFLINE='/offline.html';
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll([OFFLINE,'/app-icons/icon-192.png'])));
 // Updates wait until existing app windows close; never interrupt a live game.
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('atlantida-offline-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 const url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(url.pathname==='/app-icons/icon-192.png'&&!url.search){
  event.respondWith(caches.open(CACHE).then(async cache=>await cache.match('/app-icons/icon-192.png')||fetch(request)));return;
 }
 if(request.mode!=='navigate')return;
 event.respondWith(fetch(request).catch(async()=>{
  const cache=await caches.open(CACHE);
  return await cache.match(OFFLINE)||new Response('Sin conexión. Volvé a abrir Atlántida cuando tengas internet.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
 }));
});
