const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),m=JSON.parse(fs.readFileSync(path.join(root,'mobile/android/twa-manifest.json'),'utf8'));
test('El APK descargable coincide con la versión, tamaño y checksum publicados',()=>{
 const release=JSON.parse(fs.readFileSync(path.join(root,'lib/androidRelease.json'),'utf8'));
 assert.equal(release.disponible,true);assert.equal(release.packageId,m.packageId);assert.equal(release.version,m.appVersionName);assert.equal(release.versionCode,m.appVersionCode);
 const apk=fs.readFileSync(path.join(root,'public',release.archivo));assert.equal(apk.length,release.bytes);assert.equal(apk.readUInt32LE(0),0x04034b50);
 const sha=require('node:crypto').createHash('sha256').update(apk).digest('hex');assert.equal(sha,release.sha256);assert.equal(fs.readFileSync(path.join(root,'public',release.archivo+'.sha256'),'utf8').trim().split(/\s/)[0],sha);
});
test('Android usa exclusivamente el mismo dominio HTTPS y no agrega proveedores ni orígenes de confianza',()=>{
 assert.equal(m.packageId,'uy.atlantida.ajedrez');assert.equal(m.host,'atlantida-ajedrez.vercel.app');assert.equal(m.startUrl,'/');assert.equal(m.webManifestUrl,'https://atlantida-ajedrez.vercel.app/manifest.webmanifest');assert.deepEqual(m.additionalTrustedOrigins,[]);assert.equal(m.fallbackType,'customtabs');
 const xml=fs.readFileSync(path.join(root,'mobile/android/app/src/main/AndroidManifest.xml'),'utf8');
 assert(xml.includes('android:usesCleartextTraffic="false"'));assert(xml.includes('android:autoVerify="true"'));assert(!xml.includes('http://atlantida'));assert(!xml.includes('android.permission.ACCESS_FINE_LOCATION'));assert(!xml.includes('android.permission.CAMERA'));
 const statements=fs.readFileSync(path.join(root,'mobile/android/app/src/main/res/values/strings.xml'),'utf8');assert(statements.includes('https://'+m.host));
});
test('El sitio reconoce solo el paquete Android y la misma huella pública de su firma',()=>{
 const links=JSON.parse(fs.readFileSync(path.join(root,'public/.well-known/assetlinks.json'),'utf8'));
 assert.equal(links.length,1);assert.equal(links[0].target.package_name,m.packageId);assert.equal(links[0].target.namespace,'android_app');assert.deepEqual(links[0].relation,['delegate_permission/common.handle_all_urls']);
 assert.deepEqual(links[0].target.sha256_cert_fingerprints,m.fingerprints.map(f=>f.value));
 for(const f of links[0].target.sha256_cert_fingerprints)assert.match(f,/^(?:[A-F0-9]{2}:){31}[A-F0-9]{2}$/);
});
test('Los accesos Android conservan el origen del club y el wrapper verifica su descarga',()=>{
 assert.equal(m.appVersionCode,1);assert.equal(m.appVersionName,'0.1.0');assert.equal(m.minSdkVersion,26);
 assert.deepEqual(m.shortcuts.map(s=>new URL(s.url).pathname),['/jugar/online','/entrenamiento','/desafios']);
 for(const s of m.shortcuts)assert.equal(new URL(s.url).origin,'https://'+m.host);
 const wrapper=fs.readFileSync(path.join(root,'mobile/android/gradle/wrapper/gradle-wrapper.properties'),'utf8');assert.match(wrapper,/distributionSha256Sum=[a-f0-9]{64}/);assert(wrapper.includes('validateDistributionUrl=true'));
 assert(!fs.existsSync(path.join(root,'mobile/private/atlantida-release.p12')));
});
