const API_URL = "https://script.google.com/macros/s/AKfycbyt1rnaburyDKblXGC0BUKh6-1JLtGcOhxrZiNe8Bye09enlV_E7_37WHFz4Ymo8_W/exec";

const rayonsContainer = document.getElementById('rayons-container');
const ajouterRayonBtn = document.getElementById('btn-ajouter-rayon');
const nomRayonInput = document.getElementById('nouveau-rayon');

const BUFFER_KEY = 'listeCoursesBuffer';
let syncInProgress = false;

// --- UTILITAIRES BUFFER ---
function loadBuffer() {
  try { return JSON.parse(localStorage.getItem(BUFFER_KEY)) || []; }
  catch { return []; }
}
function saveBuffer(buffer) { localStorage.setItem(BUFFER_KEY, JSON.stringify(buffer)); }
function addToBuffer(action) {
  const buffer = loadBuffer();
  buffer.push(action);
  saveBuffer(buffer);
}

// --- AJOUT RAYON ---
ajouterRayonBtn.addEventListener('click', () => {
  const nom = nomRayonInput.value.trim();
  if (!nom) return;
  const rayon = createRayon(nom);
  rayonsContainer.appendChild(rayon);
  nomRayonInput.value = '';
  addToBuffer({type:'addRayon', id:rayon.dataset.id, nom});
});
nomRayonInput.addEventListener('keydown', e => { if(e.key==='Enter') ajouterRayonBtn.click(); });

// --- CREATE RAYON ---
function createRayon(nom) {
  const rayon = document.createElement('div');
  rayon.className='rayon';
  rayon.dataset.id=crypto.randomUUID();
  rayon.setAttribute('draggable','true');

  rayon.innerHTML=`
    <div class="rayon-header">
      <button class="btn-deplacer-rayon" aria-label="Déplacer le rayon">☰</button>
      <h2>${nom}</h2>
      <div class="rayon-actions">
        <button class="btn-modifier-rayon" aria-label="Modifier le rayon">...</button>
        <button class="btn-supprimer-rayon" aria-label="Supprimer le rayon">x</button>
      </div>
    </div>
    <div class="produits-container"></div>
    <div class="rayon-footer">
      <input type="text" class="nouveau-produit" placeholder="Ajouter un produit">
    </div>
  `;
  initRayonActions(rayon);
  initTouchDrag(rayon);
  return rayon;
}

// --- ACTIONS RAYON ---
function initRayonActions(rayon){
  const header = rayon.querySelector('.rayon-header');
  const btnSup = rayon.querySelector('.btn-supprimer-rayon');
  const btnMod = rayon.querySelector('.btn-modifier-rayon');
  const btnDrag = rayon.querySelector('.btn-deplacer-rayon');
  const inputProd = rayon.querySelector('.nouveau-produit');
  const contProd = rayon.querySelector('.produits-container');

  // Collapse/expand
  header.addEventListener('click', e=>{
    if(e.target.closest('button')) return;
    rayon.classList.toggle('collapsed');
    addToBuffer({type:'toggleCollapse', id:rayon.dataset.id, collapsed:rayon.classList.contains('collapsed')});
  });

  // Supprimer rayon
  btnSup.addEventListener('click', ()=>{
    rayon.remove();
    addToBuffer({type:'deleteRayon', id:rayon.dataset.id});
  });

  // Modifier rayon
  btnMod.addEventListener('click', ()=>{
    const titre=rayon.querySelector('h2');
    const nv = prompt("Nouveau nom:", titre.firstChild.textContent.trim());
    if(nv){
      titre.firstChild.textContent=nv+' ';
      addToBuffer({type:'renameRayon', id:rayon.dataset.id, nom:nv});
    }
  });

  // Ajouter produit
  inputProd.addEventListener('keydown', e=>{
    if(e.key==='Enter'){
      const val=inputProd.value.trim();
      if(!val) return;
      const p = addProduit(contProd, val);
      inputProd.value='';
      addToBuffer({type:'addProduit', rayonId:rayon.dataset.id, produit:{id:p.dataset.id, nom:val, coche:false}});
    }
  });

  // Drag PC
  rayon.addEventListener('dragstart',()=>rayon.classList.add('dragging'));
  rayon.addEventListener('dragend',()=>{
    rayon.classList.remove('dragging');
    addToBuffer({type:'reorderRayon'});
  });
  btnDrag.addEventListener('mousedown',()=>rayon.setAttribute('draggable','true'));
  ['mouseup','mouseleave'].forEach(evt=>btnDrag.addEventListener(evt,()=>rayon.removeAttribute('draggable')));
}

// --- PRODUIT ---
function addProduit(container, nom){
  const p=document.createElement('div');
  p.className='produit';
  p.dataset.id=crypto.randomUUID();
  p.innerHTML=`
    <input type="checkbox" class="produit-checkbox" aria-label="Produit ${nom}">
    <span class="produit-nom">${nom}</span>
    <div class="produit-actions">
      <button class="btn-modifier-produit" aria-label="Modifier le produit">...</button>
      <button class="btn-supprimer-produit" aria-label="Supprimer le produit">x</button>
    </div>
  `;
  const cb=p.querySelector('.produit-checkbox');
  const btnSup=p.querySelector('.btn-supprimer-produit');
  const btnMod=p.querySelector('.btn-modifier-produit');
  const nomSpan=p.querySelector('.produit-nom');

  cb.setAttribute('aria-checked', cb.checked);

  // Toggle
  cb.addEventListener('change', ()=>{
    cb.setAttribute('aria-checked',cb.checked);
    p.classList.toggle('produit-coche', cb.checked);
    const cont=container;
    if(cb.checked) cont.appendChild(p); else cont.prepend(p);
    addToBuffer({type:'toggleProduit', rayonId:p.parentElement.parentElement.dataset.id, produitId:p.dataset.id, coche:cb.checked});
  });

  // Supprimer
  btnSup.addEventListener('click', ()=>{
    p.remove();
    addToBuffer({type:'deleteProduit', rayonId:p.parentElement.parentElement.dataset.id, produitId:p.dataset.id});
  });

  // Modifier
  btnMod.addEventListener('click', ()=>{
    const nv=prompt("Nouveau nom:",nomSpan.textContent);
    if(nv){
      nomSpan.textContent=nv;
      addToBuffer({type:'renameProduit', rayonId:p.parentElement.parentElement.dataset.id, produitId:p.dataset.id, nom:nv});
    }
  });

  container.appendChild(p);
  return p;
}

// --- SYNC BUFFER TO SERVER ---
async function flushBuffer(){
  if(syncInProgress) return;
  const buffer = loadBuffer();
  if(buffer.length===0) return;
  syncInProgress=true;
  try{
    await fetch(API_URL,{method:'POST',body:JSON.stringify(buffer)});
    localStorage.removeItem(BUFFER_KEY);
  }catch(err){console.error("Erreur sync buffer:",err);}
  finally{syncInProgress=false;}
}

// --- LONG POLLING ---
let lastUpdate = 0;
async function syncLoop(){
  try{
    await flushBuffer(); // envoyer changements locaux
    const res = await fetch(`${API_URL}?ping=1`);
    const data = await res.json();
    const timestamp = data.updated;
    if(timestamp!==lastUpdate){
      lastUpdate = timestamp;
      await loadFromServer();
    }
  }catch(err){console.error("Erreur sync:",err);}
  finally{setTimeout(syncLoop,500);}
}

// --- LOAD FROM SERVER ---
async function loadFromServer(){
  try{
    const res=await fetch(API_URL);
    const data=await res.json();

    const rayonsMap = {};
    rayonsContainer.querySelectorAll('.rayon').forEach(r=>rayonsMap[r.dataset.id]=r);

    data.forEach(r=>{
      let rayon = rayonsMap[r.id];
      if(!rayon){
        rayon=createRayon(r.nom);
        rayon.dataset.id=r.id;
        rayonsContainer.appendChild(rayon);
      } else {
        const h2=rayon.querySelector('h2');
        if(h2.firstChild.textContent.trim()!==r.nom) h2.firstChild.textContent=r.nom+' ';
      }
      rayon.classList.toggle('collapsed',r.collapsed);

      const cont=rayon.querySelector('.produits-container');
      const prodMap={};
      cont.querySelectorAll('.produit').forEach(p=>prodMap[p.dataset.id]=p);

      r.produits.forEach(p=>{
        let prod = prodMap[p.id];
        if(!prod){
          prod=addProduit(cont,p.nom);
          prod.dataset.id=p.id;
        } else if(prod.querySelector('.produit-nom').textContent!==p.nom){
          prod.querySelector('.produit-nom').textContent=p.nom;
        }
        const cb=prod.querySelector('.produit-checkbox');
        cb.checked=p.coche;
        prod.classList.toggle('produit-coche',p.coche);
        cb.setAttribute('aria-checked',cb.checked);
      });

      // supprimer produits absents
      cont.querySelectorAll('.produit').forEach(p=>{
        if(!r.produits.find(x=>x.id===p.dataset.id)) p.remove();
      });
    });

    // supprimer rayons absents
    rayonsContainer.querySelectorAll('.rayon').forEach(r=>{
      if(!data.find(x=>x.id===r.dataset.id)) r.remove();
    });

  }catch(err){console.error("Erreur load server:",err);}
}

// --- INIT ---
document.addEventListener('DOMContentLoaded',()=>{
  loadFromServer();
  syncLoop();
});
