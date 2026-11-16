const test = require('node:test');
const assert = require('node:assert/strict');
const {fitAffine,imageToGta,gtaToImage} = require('../js/pages/map-engine.js');

test('Affine GTA-Kalibrierung unterstützt Translation, Skalierung, Rotation und inverse Umrechnung',()=>{
 const transform=fitAffine([
  {imageX:0.1,imageY:0.2,gtaX:100,gtaY:500},
  {imageX:0.9,imageY:0.2,gtaX:100,gtaY:1300},
  {imageX:0.1,imageY:0.8,gtaX:-500,gtaY:500}
 ]);
 const gta=imageToGta(0.35,0.6,transform);
 assert.ok(Math.abs(gta.x+300)<1e-8);
 assert.ok(Math.abs(gta.y-750)<1e-8);
 const image=gtaToImage(gta.x,gta.y,transform);
 assert.ok(Math.abs(image.x-0.35)<1e-10);
 assert.ok(Math.abs(image.y-0.6)<1e-10);
 assert.ok(transform.meanError<1e-8);
});

test('Affine Kalibrierung weist fehlende, ungültige und kollineare Referenzpunkte zurück',()=>{
 assert.throws(()=>fitAffine([]),/Mindestens drei/);
 assert.throws(()=>fitAffine([
  {imageX:0,imageY:0,gtaX:0,gtaY:0},
  {imageX:0.5,imageY:0.5,gtaX:1,gtaY:1},
  {imageX:1,imageY:1,gtaX:2,gtaY:2}
 ]),/kollinear/);
 assert.throws(()=>fitAffine([
  {imageX:-0.1,imageY:0,gtaX:0,gtaY:0},
  {imageX:0.5,imageY:0,gtaX:1,gtaY:1},
  {imageX:0,imageY:1,gtaX:2,gtaY:2}
 ]),/Bildkoordinaten/);
});

test('Zusätzliche Referenzpunkte werden in die Ausgleichsrechnung einbezogen',()=>{
 const transform=fitAffine([
  {imageX:0,imageY:0,gtaX:10,gtaY:20},
  {imageX:1,imageY:0,gtaX:110,gtaY:20},
  {imageX:0,imageY:1,gtaX:10,gtaY:220},
  {imageX:1,imageY:1,gtaX:110.2,gtaY:220}
 ]);
 assert.ok(transform.meanError>0);
 assert.ok(transform.maxError>=transform.meanError);
 const point=imageToGta(0.4,0.3,transform);
 assert.ok(Math.abs(point.x-50.02)<0.1);
 assert.ok(Math.abs(point.y-80)<1e-8);
});
