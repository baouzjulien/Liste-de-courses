const rayons = document.getElementById('rayons-container');
const ajouterRayonBtn = document.getElementById('btn-ajouter-rayon');
const nomRayonInput = document.getElementById('nouveau-rayon');

// Ajouter un nouveau rayon -------------------------------------------------------------
ajouterRayonBtn.addEventListener('click', () => {
    const nomRayon = nomRayonInput.value.trim();
    if (nomRayon) {
        const nouveauRayon = document.createElement('div');
        nouveauRayon.className = 'rayon';
        nouveauRayon.innerHTML =
        `<h2>${nomRayon}</h2>
        <div class= "rayon-actions">
          <button class="btn-modifier-rayon">Modifier</button>
          <button class="btn-supprimer-rayon">supprimer</button>
        </div>
        <div class="produits-container"></div>
        <input type="text" class="nouveau-produit" placeholder="Nom du produit">
        <button class="btn-ajouter-produit">Ajouter Produit</button>
        `;
        rayons.appendChild(nouveauRayon);
        nomRayonInput.value = '';
        const btnSupprimerRayon = nouveauRayon.querySelector('.btn-supprimer-rayon');
        btnSupprimerRayon.addEventListener('click', () => {
            rayons.removeChild(nouveauRayon);
        });
        const btnModifierRayon = nouveauRayon.querySelector('.btn-modifier-rayon');
        btnModifierRayon.addEventListener('click', () => {
            const nouveauNom = prompt('Entrez le nouveau nom du rayon:', nomRayon);
            if (nouveauNom) {
                nouveauRayon.querySelector('h2').textContent = nouveauNom;
            }
        });


        const btnAjouterProduit = nouveauRayon.querySelector('.btn-ajouter-produit');
        const nouveauProduitInput = nouveauRayon.querySelector('.nouveau-produit');
        const produitsContainer = nouveauRayon.querySelector('.produits-container');
        btnAjouterProduit.addEventListener('click', () => {
            const nomProduit = nouveauProduitInput.value.trim();
            if (nomProduit) {
                const nouveauProduit = document.createElement('div');
                nouveauProduit.className = 'produit';
                nouveauProduit.innerHTML =
                `
                <input type="checkbox" class="produit-checkbox">
                <span class="produit-nom">${nomProduit}</span>
                <div class="produit-actions">
                    <button class="btn-modifier-produit">Modifier</button>
                    <button class="btn-supprimer-produit">Supprimer</button>
                </div>`;
                const btnSupprimerProduit = nouveauProduit.querySelector('.btn-supprimer-produit');
                btnSupprimerProduit.addEventListener('click', () => {
                    produitsContainer.removeChild(nouveauProduit);});
                const btnModifierProduit = nouveauProduit.querySelector('.btn-modifier-produit');
                btnModifierProduit.addEventListener('click', () => {
                    const nouveauNomProduit = prompt('Entrez le nouveau nom du produit:', nomProduit);
                    if (nouveauNomProduit) {
                        nouveauProduit.querySelector(".produit-nom").textContent = nouveauNomProduit;
                    }             });
                produitsContainer.appendChild(nouveauProduit);
                nouveauProduitInput.value = '';
                const produitCheckbox = nouveauProduit.querySelector('.produit-checkbox');
                produitCheckbox.addEventListener('change', () => {
                    if (produitCheckbox.checked) {
                        nouveauProduit.classList.add('produit-coche');
                        produitsContainer.appendChild(nouveauProduit);
                    } else {
                        nouveauProduit.classList.remove('checked');
                        produitsContainer.prepend(nouveauProduit);
                    }
                });
            } else {
                alert('Veuillez entrer un nom de produit valide.');
        }    });

    } else {
        alert('Veuillez entrer un nom de rayon valide.');
    }
});