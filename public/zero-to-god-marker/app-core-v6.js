
'use strict';
const N=10,MAX=4,KEY='z2g-crop-marker-v6',OLD_KEY='z2g-crop-marker-v5',DB='z2g-crop-marker-handles-v5',STORE='handles';
const $=id=>document.getElementById(id);
const E={img:$('image'),cv:$('canvas'),loading:$('loading'),level:$('levelText'),count:$('count'),dots:$('dots'),objects:$('objects'),name:$('name'),circle:$('circle'),square:$('square'),prev:$('prev'),next:$('next'),undo:$('undo'),reset:$('reset'),complete:$('completeLevel'),copy:$('copy'),export:$('export'),clear:$('clearAll'),chooseFolder:$('chooseFolder'),chooseFiles:$('chooseFiles'),fileInput:$('fileInput'),sourceState:$('sourceState'),saveState:$('saveState'),toast:$('toast')};
const ctx=E.cv.getContext('2d');
let state=load(),level=Math.max(0,Math.min(N-1,state.level||0)),mode=state.mode==='rectangle'?'rectangle':'ellipse',active=-1,gesture=null,timer=null,saving=false,projectHandle=null,outputHandle=null,fileMap=new Map(),currentFile=null,currentUrl='',sourceMode='none';
function pad(n){return String(n).padStart(2,'0')}
function fresh(){return{version:6,level:0,mode:'ellipse',levels:Array.from({length:N},(_,i)=>({level:i+1,image:`${i+1}.png`,imageWidth:1024,imageHeight:1536,sourceImage:null,done:false,savedAt:null,objects:[]}))}}
function migrateObject(o){
 if(!o||!o.center)return null;
 if(o.shape==='ellipse')return{...o,radiusX:Number(o.radiusX)||Number(o.radius)||30,radiusY:Number(o.radiusY)||Number(o.radius)||30};
 if(o.shape==='rectangle')return{...o,width:Number(o.width)||Number(o.size)||60,height:Number(o.height)||Number(o.size)||60};
 if(o.shape==='circle')return{...o,shape:'ellipse',radiusX:Number(o.radius)||30,radiusY:Number(o.radius)||30};
 return{...o,shape:'rectangle',width:Number(o.size)||Number(o.width)||60,height:Number(o.size)||Number(o.height)||60};
}
function migrate(x){
 const out=x&&Array.isArray(x.levels)&&x.levels.length===N?x:fresh();
 out.version=6;
 out.mode=(out.mode==='square'||out.mode==='rectangle')?'rectangle':'ellipse';
 out.levels=out.levels.map((v,i)=>({...v,level:i+1,image:v.image||`${i+1}.png`,imageWidth:v.imageWidth||1024,imageHeight:v.imageHeight||1536,done:!!v.done,savedAt:v.savedAt||null,objects:(v.objects||[]).map(migrateObject).filter(Boolean)}));
 return out;
}
function load(){try{const raw=localStorage.getItem(KEY)||localStorage.getItem(OLD_KEY);return raw?migrate(JSON.parse(raw)):fresh()}catch{return fresh()}}
function saveLocal(){state.level=level;state.mode=mode;state.version=6;localStorage.setItem(KEY,JSON.stringify(state))}
function cur(){return state.levels[level]}
function r(v){return Math.round(Number(v)*100)/100}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function toast(s){clearTimeout(timer);E.toast.textContent=s;E.toast.classList.add('show');timer=setTimeout(()=>E.toast.classList.remove('show'),2300)}
function dbOpen(){return new Promise((resolve,reject)=>{const q=indexedDB.open(DB,1);q.onupgradeneeded=()=>q.result.createObjectStore(STORE);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})}
async function dbSet(key,value){const db=await dbOpen();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(value,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
async function dbGet(key){const db=await dbOpen();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),q=tx.objectStore(STORE).get(key);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})}
async function permission(handle,ask=false){if(!handle)return false;const opts={mode:'readwrite'};if(await handle.queryPermission(opts)==='granted')return true;return ask&&(await handle.requestPermission(opts)==='granted')}
async function connectFolder(handle,ask=true){if(!await permission(handle,ask))throw new Error('Folder permission was not granted.');projectHandle=handle;outputHandle=await projectHandle.getDirectoryHandle('output',{create:true});sourceMode='folder';fileMap.clear();await dbSet('project',projectHandle);E.sourceState.textContent=`Direct output: ${projectHandle.name}/output/level-XX`;E.sourceState.className='source-state ready';E.chooseFolder.textContent='Change Project Folder';await show(level)}
async function chooseFolder(){if(!window.showDirectoryPicker){toast('Folder writing is unavailable here. Use “Select 10 Images” instead.');return}try{const h=await window.showDirectoryPicker({mode:'readwrite'});await connectFolder(h,true);toast('Original images connected.')}catch(err){if(err?.name!=='AbortError')toast(err.message||'Could not open that folder.')}}
async function restoreFolder(){try{const h=await dbGet('project');if(h&&await permission(h,false)){await connectFolder(h,false);return}}catch{}render();show(level)}
function imageNumber(name){const m=String(name).match(/(?:^|\D)(10|[1-9])(?:\D|$)/);return m?Number(m[1]):NaN}
async function chooseImageFiles(files){const a=[...files].filter(f=>f.type.startsWith('image/')).sort((x,y)=>imageNumber(x.name)-imageNumber(y.name));const nums=a.map(f=>imageNumber(f.name));if(a.length!==10||nums.some(Number.isNaN)||new Set(nums).size!==10||Math.min(...nums)!==1||Math.max(...nums)!==10){toast('Select exactly ten images named 1 through 10.');return}fileMap=new Map(a.map(f=>[imageNumber(f.name),f]));sourceMode='files';projectHandle=null;outputHandle=null;E.sourceState.textContent='Mobile/file mode: each completed level downloads as a ZIP';E.sourceState.className='source-state ready';await show(level);toast('Ten original images loaded.')}
async function findImageFile(n){if(sourceMode==='files')return fileMap.get(n)||null;if(sourceMode!=='folder'||!projectHandle)return null;const roots=[projectHandle];for(const sub of ['images','levels','scenes'])try{roots.push(await projectHandle.getDirectoryHandle(sub))}catch{}
 const bases=[String(n),pad(n),`level-${pad(n)}`,`level-${n}`,`level_${pad(n)}`,`level_${n}`],exts=['png','jpg','jpeg','webp'];
 for(const root of roots)for(const b of bases)for(const ext of exts){try{return await (await root.getFileHandle(`${b}.${ext}`)).getFile()}catch{}}
 return null}
async function show(i){level=clamp(i,0,N-1);active=-1;gesture=null;E.name.value='';E.loading.hidden=false;E.loading.textContent=sourceMode==='none'?'Select the project folder or all ten original images.':'Loading original image…';if(currentUrl){URL.revokeObjectURL(currentUrl);currentUrl=''}currentFile=await findImageFile(level+1);if(currentFile){currentUrl=URL.createObjectURL(currentFile);E.img.src=currentUrl}else{E.img.removeAttribute('src');E.loading.hidden=false;E.loading.textContent=sourceMode==='none'?'Select the project folder or all ten original images.':`Could not find the original image for Level ${level+1}.`}
 render();saveLocal()}
E.img.onload=()=>{const v=cur();v.imageWidth=E.img.naturalWidth||1024;v.imageHeight=E.img.naturalHeight||1536;v.sourceImage=currentFile?.name||v.image;E.cv.width=v.imageWidth;E.cv.height=v.imageHeight;E.loading.hidden=true;saveLocal();paint()};
E.img.onerror=()=>{E.loading.hidden=false;E.loading.textContent='This level image could not be loaded.'};
