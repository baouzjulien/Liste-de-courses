const rayonsContainer = document.getElementById('rayons-container');
const ajouterRayonBtn = document.getElementById('btn-ajouter-rayon');
const nomRayonInput = document.getElementById('nouveau-rayon');

/* --- AJOUT RAYON --- */
ajouterRayonBtn.addEventListener('click', () => {
  const nom = nomRayonInput.value.trim();
  if (!nom) return;
  rayonsContainer.appendChild(createRayon(nom));
  nomRayonInput.value = '';
  save();
});
nomRayonInput.addEventListener('keydown', e => { if (e.key === 'Enter') ajouterRayonBtn.click(); });

/* --- CREATE RAYON --- */
function createRayon(nom) {
  const rayon = document.createElement('div');
  rayon.className = 'rayon';
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

  initRayonActions(rayon);
  initTouchDrag(rayon);
  return rayon;
}

/* --- ACTIONS RAYON --- */
function initRayonActions(rayon) {
  const header = rayon.querySelector('.rayon-header');
  const btnSup = rayon.querySelector('.btn-supprimer-rayon');
  const btnMod = rayon.querySelector('.btn-modifier-rayon');
  const btnDrag = rayon.querySelector('.btn-deplacer-rayon');
  const inputProd = rayon.querySelector('.nouveau-produit');
  const contProd = rayon.querySelector('.produits-container');

  // Collapse / expand
  header.addEventListener('click', e => {
    if (e.target.closest('button')) return;
    rayon.classList.toggle('collapsed');
    save();
  });

  // Afficher les boutons rayon au clic
  rayon.addEventListener('click', e => {
    if (e.target.closest('button') || e.target.closest('.produit')) return;
    const actions = rayon.querySelector('.rayon-actions');
    actions.style.display = actions.style.display === 'inline-block' ? 'none' : 'inline-block';
  });

  // Supprimer / modifier rayon
  btnSup.addEventListener('click', () => { rayon.remove(); save(); });
  btnMod.addEventListener('click', () => {
    const titre = rayon.querySelector('h2');
    const nv = prompt("Nouveau nom:", titre.firstChild.textContent.trim());
    if (nv) titre.firstChild.textContent = nv + ' ';
    save();
  });

  // Ajouter produit via Enter
  inputProd.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const val = inputProd.value.trim();
      if (!val) return;
      addProduit(contProd, val);
      inputProd.value = '';
      save();
    }
  });

  // Drag PC
  rayon.addEventListener('dragstart', () => rayon.classList.add('dragging'));
  rayon.addEventListener('dragend', () => {
    rayon.classList.remove('dragging');
    save();
  });

  btnDrag.addEventListener('mousedown', () => rayon.setAttribute('draggable', 'true'));
  ['mouseup', 'mouseleave'].forEach(evt => {
    btnDrag.addEventListener(evt, () => rayon.removeAttribute('draggable'));
  });
}

/* --- PRODUIT --- */
function addProduit(container, nom) {
  const p = document.createElement('div');
  p.className = 'produit';
  p.innerHTML = `
    <input type="checkbox" class="produit-checkbox">
    <span class="produit-nom">${nom}</span>
    <div class="produit-actions">
      <button class="btn-modifier-produit">...</button>
      <button class="btn-supprimer-produit">x</button>
    </div>
  `;

  const cb = p.querySelector('.produit-checkbox');
  const btnSup = p.querySelector('.btn-supprimer-produit');
  const btnMod = p.querySelector('.btn-modifier-produit');
  const nomSpan = p.querySelector('.produit-nom');

  // Afficher les boutons produit au clic et cacher les autres
  p.addEventListener('click', e => {
    if (e.target.closest('button')) return;
    e.stopPropagation(); // empêche de déclencher le click du rayon

    // Masquer tous les autres produits
    container.querySelectorAll('.produit-actions').forEach(act => {
      if (act !== p.querySelector('.produit-actions')) act.style.display = 'none';
    });

    // Toggle celui du produit cliqué
    const actions = p.querySelector('.produit-actions');
    actions.style.display = 'inline-block';
  });

  // Checkbox
  cb.addEventListener('change', () => {
    if (cb.checked) { p.classList.add('produit-coche'); container.appendChild(p); }
    else { p.classList.remove('produit-coche'); container.prepend(p); }
    save();
  });

  // Supprimer / modifier produit
  btnSup.addEventListener('click', () => { p.remove(); save(); });
  btnMod.addEventListener('click', () => {
    const nv = prompt("Nouveau nom:", nomSpan.textContent);
    if (nv) { nomSpan.textContent = nv; save(); }
  });

  container.appendChild(p);
}

/* --- LOCALSTORAGE --- */
function save() {
  const data = [];
  rayonsContainer.querySelectorAll('.rayon').forEach(rayon => {
    const nom = rayon.querySelector('h2').firstChild.textContent.trim();
    const collapsed = rayon.classList.contains('collapsed');
    const produits = [];
    rayon.querySelectorAll('.produit').forEach(p => {
      produits.push({
        nom: p.querySelector('.produit-nom').textContent,
        coche: p.querySelector('.produit-checkbox').checked
      });
    });
    data.push({ nom, collapsed, produits });
  });
  localStorage.setItem('listeCourses', JSON.stringify(data));
}

function load() {
  const saved = localStorage.getItem('listeCourses');
  if (!saved) return;
  JSON.parse(saved).forEach(r => {
    const rayon = createRayon(r.nom);
    if (r.collapsed) rayon.classList.add('collapsed');
    const cont = rayon.querySelector('.produits-container');
    r.produits.forEach(p => {
      addProduit(cont, p.nom);
      const last = cont.lastChild;
      const cb = last.querySelector('.produit-checkbox');
      if (p.coche) { cb.checked = true; last.classList.add('produit-coche'); }
    });
    rayonsContainer.appendChild(rayon);
  });
}
document.addEventListener('DOMContentLoaded', load);

/* --- DRAG PC --- */
rayonsContainer.addEventListener('dragover', e => {
  e.preventDefault();
  const dragging = rayonsContainer.querySelector('.dragging');
  const after = getAfterElement(rayonsContainer, e.clientY);
  if (!after) rayonsContainer.appendChild(dragging);
  else rayonsContainer.insertBefore(dragging, after);
});
function getAfterElement(container, y) {
  return [...container.querySelectorAll('.rayon:not(.dragging)')]
    .reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset, element: child };
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

/* --- DRAG TACTILE MOBILE --- */
function initTouchDrag(rayon) {
  const btn = rayon.querySelector('.btn-deplacer-rayon');
  let isDragging = false;

  btn.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) return;
    isDragging = true;
    rayon.classList.add('dragging');
    e.preventDefault();
  }, { passive: false });

  btn.addEventListener('touchmove', e => {
    if (!isDragging) return;
    const touchY = e.touches[0].clientY;
    const after = getAfterElement(rayonsContainer, touchY);
    if (!after) rayonsContainer.appendChild(rayon);
    else rayonsContainer.insertBefore(rayon, after);
    e.preventDefault();
  }, { passive: false });

  btn.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    rayon.classList.remove('dragging');
    save();
  });
}

/* --- SERVICE WORKER UPDATE --- */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(reg => {
      if (reg.waiting) notifyUpdate();
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) notifyUpdate();
        });
      });
    });
}

function notifyUpdate() {
  const updateDiv = document.createElement('div');
  updateDiv.style.position = 'fixed';
  updateDiv.style.bottom = '1rem';
  updateDiv.style.left = '50%';
  updateDiv.style.transform = 'translateX(-50%)';
  updateDiv.style.background = '#333';
  updateDiv.style.color = 'white';
  updateDiv.style.padding = '0.5rem 1rem';
  updateDiv.style.borderRadius = '5px';
  updateDiv.style.cursor = 'pointer';
  updateDiv.textContent = 'Nouvelle version disponible, cliquez pour recharger';
  document.body.appendChild(updateDiv);

  updateDiv.addEventListener('click', () => {
    if (navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage('skipWaiting');
    window.location.reload();
  });
}