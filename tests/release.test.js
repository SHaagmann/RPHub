const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {nextVersion,bumpVersion} = require('../scripts/release.js');

test('Release-Befehl aktualisiert Version, Changelog und Cache-Buster gemeinsam',()=>{
 const root = fs.mkdtempSync(path.join(os.tmpdir(),'rpdesk-release-'));
 try {
  fs.mkdirSync(path.join(root,'js/pages'),{recursive:true});
  fs.copyFileSync(path.join(__dirname,'../js/pages/changelog.js'),path.join(root,'js/pages/changelog.js'));
  fs.copyFileSync(path.join(__dirname,'../index.html'),path.join(root,'index.html'));

  assert.equal(bumpVersion(root,'minor','Neue Auswertung','2026-11-13'),'1.3');
  const changelog=fs.readFileSync(path.join(root,'js/pages/changelog.js'),'utf8');
  const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.match(changelog,/const APP_VERSION = '1\.3'/);
  assert.match(changelog,/version:"1\.3",date:"2026-11-13",type:"minor",changes:\["Neue Auswertung"\]/);
  assert.doesNotMatch(index,/\?v=1\.2/);
  assert.ok([...index.matchAll(/\?v=1\.3/g)].length>1);

  assert.equal(bumpVersion(root,'major','Großer Umbau','2026-11-14'),'2.0');
  assert.match(fs.readFileSync(path.join(root,'js/pages/changelog.js'),'utf8'),/version:"2\.0",date:"2026-11-14",type:"major"/);
 } finally {
  fs.rmSync(root,{recursive:true,force:true});
 }
});

test('Versionsschritte akzeptieren nur minor und major',()=>{
 assert.equal(nextVersion('1.9','minor'),'1.10');
 assert.equal(nextVersion('1.9','major'),'2.0');
 assert.throws(()=>nextVersion('1.9','patch'),/minor.*major/);
 assert.throws(()=>nextVersion('v1.9','minor'),/Ungültige Versionsnummer/);
});
