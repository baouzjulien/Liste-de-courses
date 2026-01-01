/* =================================================
   CONSTANTES ET ÉLÉMENTS DOM
================================================= */
const API_URL = "https://script.google.com/macros/s/AKfycbyt1rnaburyDKblXGC0BUKh6-1JLtGcOhxrZiNe8Bye09enlV_EU7_37WHFz4Ymo8_W/exec";
const rayonsContainer = document.getElementById('rayons-container');
const ajouterRayonBtn = document.getElementById('btn-ajouter-rayon');
const nomRayonInput = document.getElementById('nouveau-rayon');

let localData = [];

/* =================================================
   UTILITAIRES
================================================= */

// debounce générique
function debounce(fn, delay = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(null, args), delay);
  };
}

// normalisation accents + casse
function normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/* =================================================
   SAUVEGARDE LOCALE + SERVEUR
================================================= */

function updateLocalStorage() {
  localStorage.setItem('listeCourses', JSON.stringify(localData));
  debounceSaveServer();
}

let saveTimeout = null;
function debounceSaveServer(delay = 1000) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => saveToServer(localData), delay);
}

async function saveToServer(data) {
  try {
    await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  } catch (err) {
    console.error("Erreur save API :", err);
  }
}

/* =================================================
   RECHERCHE / AUTOCOMPLÉTION
================================================= */

// recherche locale prioritaire (produits non cochés d’abord)
function findLocalMatch(rayonId, value) {
  const r = localData.find(r => r.id === rayonId);
  if (!r) return null;

  const v = normalize(value);

  return r.produits
    .slice()
    .sort((a, b) => a.coche - b.coche)
    .find(p => normalize(p.nom).startsWith(v));
}

// fallback recherche globale
function findGlobalMatch(value) {
  const v = normalize(value);

  for (const r of localData) {
    const match = r.produits.find(p =>
      normalize(p.nom).startsWith(v)
    );
    if (match) return match;
  }
  return null;
}

/* =================================================
   REBUILD DOM
================================================= */

function rebuildDOM() {
  rayonsContainer.innerHTML = "";
  localData.forEach(r => {
    const rayon = createRayon(r.nom, r.id, r.collapsed);
    const cont = rayon.querySelector('.produits-container');

    r.produits
      .slice()
      .sort((a, b) => a.coche - b.coche)
      .forEach(p => addProduit(cont, p.nom, p.id, p.coche));

    rayonsContainer.appendChild(rayon);
  });
}

/* =================================================
   CHARGEMENT DONNÉES
================================================= */

function loadFromLocal() {
  const saved = localStorage.getItem('listeCourses');
  if (!saved) return false;
  localData = JSON.parse(saved);
  rebuildDOM();
  return true;
}

async function loadFromServer() {
  try {
    const res = await fetch(API_URL);
    localData = await res.json();
    rebuildDOM();
    updateLocalStorage();
  } catch (err) {
    console.error("Erreur load API :", err);
  }
}

/* =================================================
   COMPOSANT RAYON
================================================= */

function createRayon(nom, id = null, collapsed = false) {
  const rayon = document.createElement('div');
  rayon.className = 'rayon';
  rayon.dataset.id = id || crypto.randomUUID();
  rayon.setAttribute('draggable', 'true');

  rayon.innerHTML = `
    <div class="rayon-header">
      <button class="btn-deplacer-rayon">☰</button>
      <h2>${nom}</h2>
      <div class="rayon-actions">
        <button class="btn-modifier-rayon">...</button>
        <button class="btn-supprimer-rayon">x</button>
      </div>
    </div>
    <div class="produits-container"></div>
    <div class="rayon-footer">
      <input type="text" class="nouveau-produit" placeholder="Ajouter un produit">
    </div>
  `;

  if (collapsed) rayon.classList.add('collapsed');

  initRayonActions(rayon);
  initTouchDrag(rayon);
  return rayon;
}

/* =================================================
   ACTIONS RAYON
================================================= */

function initRayonActions(rayon) {
  const header = rayon.querySelector('.rayon-header');
  const btnSup = rayon.querySelector('.btn-supprimer-rayon');
  const btnMod = rayon.querySelector('.btn-modifier-rayon');
  const inputProd = rayon.querySelector('.nouveau-produit');
  const contProd = rayon.querySelector('.produits-container');

  /* Collapse */
  header.addEventListener('click', e => {
    if (e.target.closest('button')) return;
    rayon.classList.toggle('collapsed');
    const r = localData.find(r => r.id === rayon.dataset.id);
    if (r) r.collapsed = rayon.classList.contains('collapsed');
    updateLocalStorage();
  });

  /* Supprimer rayon */
  btnSup.addEventListener('click', () => {
    localData = localData.filter(r => r.id !== rayon.dataset.id);
    rayon.remove();
    updateLocalStorage();
  });

  /* Modifier rayon */
  btnMod.addEventListener('click', () => {
    const h2 = rayon.querySelector('h2');
    const nv = prompt("Nouveau nom:", h2.textContent);
    if (!nv) return;
    h2.textContent = nv;
    const r = localData.find(r => r.id === rayon.dataset.id);
    if (r) r.nom = nv;
    updateLocalStorage();
  });

  /* ==========================
     AUTO-COMPLÉTION
  ========================== */

  let lastSuggestion = null;

  const debouncedAutocomplete = debounce(() => {
    const value = inputProd.value;
    if (!value) return;

    let match = findLocalMatch(rayon.dataset.id, value)
             || findGlobalMatch(value);

    if (!match) return;

    lastSuggestion = match.nom;
    inputProd.value = match.nom;
    inputProd.setSelectionRange(value.length, match.nom.length);
  });

  inputProd.addEventListener('input', debouncedAutocomplete);

  /* ==========================
     TAB = accepter suggestion
  ========================== */

  inputProd.addEventListener('keydown', e => {
    if (e.key === 'Tab' && lastSuggestion) {
      e.preventDefault();
      inputProd.value = lastSuggestion;
      inputProd.setSelectionRange(
        lastSuggestion.length,
        lastSuggestion.length
      );
    }
  });

  /* ==========================
     ENTER = ajout / anti-doublon
  ========================== */

  inputProd.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;

    const val = inputProd.value.trim();
    if (!val) return;

    const r = localData.find(r => r.id === rayon.dataset.id);
    if (!r) return;

    const exists = r.produits.some(p =>
      normalize(p.nom) === normalize(val)
    );

    if (exists) {
      alert("Produit déjà présent");
      inputProd.value = '';
      lastSuggestion = null;
      return;
    }

    const pObj = { id: crypto.randomUUID(), nom: val, coche: false };
    r.produits.push(pObj);
    addProduit(contProd, val, pObj.id);
    inputProd.value = '';
    lastSuggestion = null;
    updateLocalStorage();
  });
}

/* =================================================
   PRODUIT
================================================= */

function addProduit(container, nom, id = null, coche = false) {
  const p = document.createElement('div');
  p.className = 'produit';
  p.dataset.id = id || crypto.randomUUID();

  p.innerHTML = `
    <input type="checkbox">
    <span class="produit-nom">${nom}</span>
    <button class="btn-supprimer-produit">x</button>
  `;

  const cb = p.querySelector('input');
  cb.checked = coche;
  p.classList.toggle('produit-coche', coche);

  cb.addEventListener('change', () => {
    const rayon = p.closest('.rayon');
    const r = localData.find(r => r.id === rayon.dataset.id);
    const prod = r.produits.find(x => x.id === p.dataset.id);
    prod.coche = cb.checked;
    p.classList.toggle('produit-coche', cb.checked);
    updateLocalStorage();
  });

  p.querySelector('.btn-supprimer-produit').addEventListener('click', () => {
    const rayon = p.closest('.rayon');
    const r = localData.find(r => r.id === rayon.dataset.id);
    r.produits = r.produits.filter(x => x.id !== p.dataset.id);
    p.remove();
    updateLocalStorage();
  });

  container.appendChild(p);
}

/* =================================================
   DRAG & DROP (PC + MOBILE)
================================================= */

rayonsContainer.addEventListener('dragstart', e => e.target.classList.add('dragging'));
rayonsContainer.addEventListener('dragend', e => {
  e.target.classList.remove('dragging');
  const order = [...rayonsContainer.children].map(r => r.dataset.id);
  localData.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  updateLocalStorage();
});

rayonsContainer.addEventListener('dragover', e => {
  e.preventDefault();
  const dragging = document.querySelector('.dragging');
  const after = [...rayonsContainer.children]
    .find(r => e.clientY < r.getBoundingClientRect().top + r.offsetHeight / 2);
  after ? rayonsContainer.insertBefore(dragging, after) : rayonsContainer.appendChild(dragging);
});

function initTouchDrag(rayon) {
  const btn = rayon.querySelector('.btn-deplacer-rayon');
  let dragging = false;

  btn.addEventListener('touchstart', e => {
    dragging = true;
    rayon.classList.add('dragging');
    e.preventDefault();
  }, { passive: false });

  btn.addEventListener('touchmove', e => {
    if (!dragging) return;
    const after = [...rayonsContainer.children]
      .find(r => e.touches[0].clientY < r.getBoundingClientRect().top + r.offsetHeight / 2);
    after ? rayonsContainer.insertBefore(rayon, after) : rayonsContainer.appendChild(rayon);
    e.preventDefault();
  }, { passive: false });

  btn.addEventListener('touchend', () => {
    dragging = false;
    rayon.classList.remove('dragging');
    updateLocalStorage();
  });
}

/* =================================================
   INIT
================================================= */

document.addEventListener('DOMContentLoaded', () => {
  if (!loadFromLocal()) loadFromServer();
});

/* =================================================
   AJOUT RAYON
================================================= */

ajouterRayonBtn.addEventListener('click', () => {
  const nom = nomRayonInput.value.trim();
  if (!nom) return;

  const r = { id: crypto.randomUUID(), nom, collapsed: false, produits: [] };
  localData.push(r);
  rayonsContainer.appendChild(createRayon(nom, r.id));
  nomRayonInput.value = '';
  updateLocalStorage();
});

nomRayonInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') ajouterRayonBtn.click();
});
