const API_URL = "https://script.google.com/macros/s/AKfycbyt1rnaburyDKblXGC0BUKh6-1JLtGcOhxrZiNe8Bye09enlV_EU7_37WHFz4Ymo8_W/exec";
const rayonsContainer = document.getElementById('rayons-container');
const ajouterRayonBtn = document.getElementById('btn-ajouter-rayon');
const nomRayonInput = document.getElementById('nouveau-rayon');

let localData = [];

/* --- UTILITAIRES --- */
function updateLocalStorage() {
  localStorage.setItem('listeCourses', JSON.stringify(localData));
  saveToServer(localData); // backup asynchrone
}

async function saveToServer(data) {
  try {
    await fetch(API_URL, { method: 'POST', body: JSON.stringify(data) });
  } catch(err) { console.error("Erreur save API :", err); }
}

function rebuildDOM() {
  rayonsContainer.innerHTML = "";
  localData.forEach(r => {
    const rayon = createRayon(r.nom, r.id, r.collapsed);
    const cont = rayon.querySelector('.produits-container');
    r.produits.forEach(p => addProduit(cont, p.nom, p.id, p.coche));
    rayonsContainer.appendChild(rayon);
  });
}

/* --- LOAD LOCAL --- */
function loadFromLocal() {
  const saved = localStorage.getItem('listeCourses');
  if (!saved) return false;
  localData = JSON.parse(saved);
  rebuildDOM();
  return true;
}

/* --- LOAD GOOGLE SHEET --- */
async function loadFromServer() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();

    localData = data;           // stocke dans localData
    rebuildDOM();               // rebuild DOM
    updateLocalStorage();       // sauvegarde local et backup Sheet
  } catch(err) {
    console.error("Erreur load API :", err);
  }
}

/* --- CREATE RAYON --- */
function createRayon(nom, id=null, collapsed=false) {
  const rayon = document.createElement('div');
  rayon.className = 'rayon';
  rayon.dataset.id = id || crypto.randomUUID();
  rayon.setAttribute('draggable', 'true');
  rayon.innerHTML = `
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
  if(collapsed) rayon.classList.add('collapsed');

  initRayonActions(rayon);
  initTouchDrag(rayon);
  return rayon;
}

/* --- INIT ACTIONS RAYON --- */
function initRayonActions(rayon) {
  const header = rayon.querySelector('.rayon-header');
  const btnSup = rayon.querySelector('.btn-supprimer-rayon');
  const btnMod = rayon.querySelector('.btn-modifier-rayon');
  const inputProd = rayon.querySelector('.nouveau-produit');
  const contProd = rayon.querySelector('.produits-container');

  header.addEventListener('click', e => {
    if(e.target.closest('button')) return;
    rayon.classList.toggle('collapsed');
    const r = localData.find(r => r.id === rayon.dataset.id);
    if(r) { r.collapsed = rayon.classList.contains('collapsed'); updateLocalStorage(); }
  });

  btnSup.addEventListener('click', () => {
    const idx = localData.findIndex(r => r.id === rayon.dataset.id);
    if(idx !== -1) localData.splice(idx, 1);
    rayon.remove();
    updateLocalStorage();
  });

  btnMod.addEventListener('click', () => {
    const titre = rayon.querySelector('h2');
    const nv = prompt("Nouveau nom:", titre.textContent.trim());
    if(nv){
      titre.textContent = nv;
      const r = localData.find(r => r.id === rayon.dataset.id);
      if(r) r.nom = nv;
      updateLocalStorage();
    }
  });

  inputProd.addEventListener('keydown', e => {
    if(e.key !== 'Enter') return;
    const val = inputProd.value.trim();
    if(!val) return;
    const r = localData.find(r => r.id === rayon.dataset.id);
    const pObj = { id: crypto.randomUUID(), nom: val, coche: false };
    if(r) r.produits.push(pObj);
    addProduit(contProd, val, pObj.id);
    inputProd.value = '';
    updateLocalStorage();
  });
}

/* --- PRODUIT --- */
function addProduit(container, nom, id=null, coche=false) {
  const p = document.createElement('div');
  p.className = 'produit';
  p.dataset.id = id || crypto.randomUUID();
  p.innerHTML = `
    <input type="checkbox" class="produit-checkbox" aria-label="Produit ${nom}">
    <span class="produit-nom">${nom}</span>
    <div class="produit-actions">
      <button class="btn-modifier-produit" aria-label="Modifier le produit">...</button>
      <button class="btn-supprimer-produit" aria-label="Supprimer le produit">x</button>
    </div>
  `;
  const cb = p.querySelector('.produit-checkbox');
  const nomSpan = p.querySelector('.produit-nom');
  cb.checked = coche;
  p.classList.toggle('produit-coche', coche);
  cb.setAttribute('aria-checked', cb.checked);

  cb.addEventListener('change', () => {
    const r = localData.find(r => r.id === p.closest('.rayon').dataset.id);
    if(r){
      const prod = r.produits.find(x => x.id === p.dataset.id);
      if(prod){
        prod.coche = cb.checked;
        p.classList.toggle('produit-coche', cb.checked);
      }
    }
    if(cb.checked) container.appendChild(p); else container.prepend(p);
    updateLocalStorage();
  });

  p.querySelector('.btn-supprimer-produit').addEventListener('click', () => {
    const r = localData.find(r => r.id === p.closest('.rayon').dataset.id);
    if(r) r.produits = r.produits.filter(x => x.id !== p.dataset.id);
    p.remove();
    updateLocalStorage();
  });

  p.querySelector('.btn-modifier-produit').addEventListener('click', () => {
    const nv = prompt("Nouveau nom:", nomSpan.textContent);
    if(nv){
      nomSpan.textContent = nv;
      const r = localData.find(r => r.id === p.closest('.rayon').dataset.id);
      if(r){
        const prod = r.produits.find(x => x.id === p.dataset.id);
        if(prod) prod.nom = nv;
      }
      updateLocalStorage();
    }
  });

  container.appendChild(p);
}

/* --- INIT --- */
document.addEventListener('DOMContentLoaded', () => {
  if(!loadFromLocal()) loadFromServer(); // charge Sheet si localStorage vide
});

/* --- AJOUT RAYON --- */
ajouterRayonBtn.addEventListener('click', () => {
  const nom = nomRayonInput.value.trim();
  if(!nom) return;
  const rayon = createRayon(nom);
  rayonsContainer.appendChild(rayon);
  nomRayonInput.value = '';
  localData.push({ id: rayon.dataset.id, nom, collapsed: false, produits: [] });
  updateLocalStorage();
});

nomRayonInput.addEventListener('keydown', e => { if(e.key === 'Enter') ajouterRayonBtn.click(); });
