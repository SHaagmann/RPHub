(function(root){
'use strict';

function solve3(matrix,values){
 const rows=matrix.map((row,index)=>[...row,values[index]]);
 for(let column=0;column<3;column++){
  let pivot=column;
  for(let row=column+1;row<3;row++)if(Math.abs(rows[row][column])>Math.abs(rows[pivot][column]))pivot=row;
  if(Math.abs(rows[pivot][column])<1e-12)throw new Error('Die Referenzpunkte sind geometrisch ungeeignet oder zu dicht beieinander.');
  [rows[column],rows[pivot]]=[rows[pivot],rows[column]];
  const divisor=rows[column][column];
  for(let index=column;index<4;index++)rows[column][index]/=divisor;
  for(let row=0;row<3;row++){
   if(row===column)continue;
   const factor=rows[row][column];
   for(let index=column;index<4;index++)rows[row][index]-=factor*rows[column][index];
  }
 }
 return rows.map(row=>row[3]);
}

function fitAffine(points){
 if(!Array.isArray(points)||points.length<3)throw new Error('Mindestens drei Referenzpunkte sind erforderlich.');
 const normalized=points.map(point=>{
  const values=[point?.imageX,point?.imageY,point?.gtaX,point?.gtaY].map(Number);
  if(!values.every(Number.isFinite)||Math.abs(values[2])>1e7||Math.abs(values[3])>1e7||values[0]<0||values[0]>1||values[1]<0||values[1]>1)throw new Error('Jeder Referenzpunkt benötigt Bildkoordinaten zwischen 0 und 1 sowie gültige GTA-X/Y-Werte.');
  return {imageX:values[0],imageY:values[1],gtaX:values[2],gtaY:values[3]};
 });
 let spread=0;
 for(let i=0;i<normalized.length;i++)for(let j=i+1;j<normalized.length;j++)for(let k=j+1;k<normalized.length;k++){
  const a=normalized[i],b=normalized[j],c=normalized[k];
  spread=Math.max(spread,Math.abs((b.imageX-a.imageX)*(c.imageY-a.imageY)-(b.imageY-a.imageY)*(c.imageX-a.imageX)));
 }
 if(spread<1e-8)throw new Error('Die Bildpositionen der Referenzpunkte dürfen nicht kollinear sein.');
 const sums=[[0,0,0],[0,0,0],[0,0,0]],valuesX=[0,0,0],valuesY=[0,0,0];
 for(const point of normalized){
  const row=[point.imageX,point.imageY,1];
  for(let i=0;i<3;i++){
   valuesX[i]+=row[i]*point.gtaX;
   valuesY[i]+=row[i]*point.gtaY;
   for(let j=0;j<3;j++)sums[i][j]+=row[i]*row[j];
  }
 }
 const [a,b,c]=solve3(sums,valuesX),[d,e,f]=solve3(sums,valuesY),transform={a,b,c,d,e,f};
 const determinant=a*e-b*d;
 if(!Number.isFinite(determinant)||Math.abs(determinant)<1e-12)throw new Error('Die GTA-Abbildung ist nicht invertierbar.');
 const errors=normalized.map(point=>{
  const x=a*point.imageX+b*point.imageY+c,y=d*point.imageX+e*point.imageY+f;
  return Math.hypot(x-point.gtaX,y-point.gtaY);
 });
 transform.meanError=errors.reduce((sum,error)=>sum+error,0)/errors.length;
 transform.maxError=Math.max(...errors);
 return transform;
}

function imageToGta(imageX,imageY,transform){
 if(!transform)throw new Error('Es liegt keine gültige GTA-Kalibrierung vor.');
 const x=Number(imageX),y=Number(imageY);
 if(!Number.isFinite(x)||!Number.isFinite(y))throw new Error('Ungültige Bildkoordinaten.');
 return {x:transform.a*x+transform.b*y+transform.c,y:transform.d*x+transform.e*y+transform.f};
}

function gtaToImage(gtaX,gtaY,transform){
 if(!transform)throw new Error('Es liegt keine gültige GTA-Kalibrierung vor.');
 const x=Number(gtaX),y=Number(gtaY),determinant=transform.a*transform.e-transform.b*transform.d;
 if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(determinant)||Math.abs(determinant)<1e-12)throw new Error('Ungültige GTA-Koordinaten oder Kalibrierung.');
 const dx=x-transform.c,dy=y-transform.f;
 return {x:(transform.e*dx-transform.b*dy)/determinant,y:(transform.a*dy-transform.d*dx)/determinant};
}

const api={fitAffine,imageToGta,gtaToImage};
root.RPDeskMapEngine=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
