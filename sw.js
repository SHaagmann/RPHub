'use strict';
const CACHE_NAME = 'rp-desk-static-v2.1';
const SHELL_FILES = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './js/core.js',
  './js/pages/dashboard.js',
  './js/pages/changelog.js',
  './js/pages/investigations.js',
  './js/pages/workspace.js',
  './js/pages/leisure.js',
  './js/pages/records.js',
  './js/pages/map-engine.js',
  './js/pages/map.js',
  './manifest.webmanifest',
  './favicon.svg',
  './assets/app-icon.svg',
  './assets/los-santos-custom.png'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(SHELL_FILES)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('rp-desk-static-')&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
  event.respondWith(caches.match(request,{ignoreSearch:true}).then(cached=>cached||fetch(request).then(response=>{
    if(response.ok&&new URL(request.url).pathname.startsWith(new URL(self.registration.scope).pathname)){
      const copy=response.clone();
      caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));
    }
    return response;
  }).catch(error=>{
    if(request.mode==='navigate')return caches.match(new URL('./index.html',self.registration.scope).href);
    throw error;
  })));
});
