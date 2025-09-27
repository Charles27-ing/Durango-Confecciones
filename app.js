// app.js - Versión corregida para carga inicial de productos

document.addEventListener('DOMContentLoaded', function() {

  // ===================================================================
  // 1. CONFIGURACIÓN Y VARIABLES GLOBALES (Sin cambios)
  // ===================================================================
  const DATO_API_TOKEN = '5012cfcb9789ff74d37abad1849d9e';
  const DATO_API_URL = 'https://graphql.datocms.com/';

  let allProducts = [];
  let productsByGender = {};
  let activeGender = 'Todos';

  const searchInput = document.getElementById('search-input' );
  const searchButton = document.getElementById('search-button');
  const genderFilterButtons = document.getElementById('gender-filter-buttons');
  const subcategoryFilterPills = document.getElementById('subcategory-filter-pills');
  const priceFilter = document.getElementById('price-filter');
  const priceValue = document.getElementById('price-value');
  const productGrid = document.getElementById('product-grid');
  const noResults = document.getElementById('no-results');
  const modalsContainer = document.getElementById('product-modals-container');

  const query = `
      query {
          allProductos {
              id, nombre, descripcion, precio, genero, subcategoria,
              imagen { url, alt }
          }
      }
  `;

  // ===================================================================
  // 2. OBTENER DATOS DE DATOCMS
  // ===================================================================
  fetch(DATO_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${DATO_API_TOKEN}` },
      body: JSON.stringify({ query: query }),
  })
  .then(res => res.json())
  .then(result => {
      if (result.data && result.data.allProductos) {
          allProducts = result.data.allProductos;
          groupProducts();
          setupFilters();
          renderModals(allProducts);
          
          // === CAMBIO CLAVE #1 ===
          // Realizamos la primera carga de productos aquí, de forma explícita.
          renderProductGrid(allProducts); 

      } else {
          console.error('Respuesta de API no válida:', result);
          productGrid.innerHTML = '<p class="text-center text-danger">Error al cargar datos.</p>';
      }
  })
  .catch(error => {
      console.error('Error al cargar datos desde DatoCMS:', error);
      productGrid.innerHTML = '<p class="text-center text-danger">No se pudieron cargar los productos.</p>';
  });

  // ===================================================================
  // 3. ORGANIZACIÓN DE DATOS (Sin cambios)
  // ===================================================================
  function groupProducts() {
      productsByGender = allProducts.reduce((acc, product) => {
          const gender = product.genero || 'Otros';
          const subcat = product.subcategoria || 'General';
          if (!acc[gender]) {
              acc[gender] = { subcategories: new Set(), products: [] };
          }
          acc[gender].subcategories.add(subcat);
          acc[gender].products.push(product);
          return acc;
      }, {});
  }

  // ===================================================================
  // 4. CONFIGURACIÓN DE FILTROS Y EVENTOS
  // ===================================================================
  function setupFilters() {
      searchButton.addEventListener('click', applyFilters);
      searchInput.addEventListener('keyup', (event) => {
          if (event.key === 'Enter') applyFilters();
      });

      const genders = ['Todos', ...Object.keys(productsByGender).sort()];
      genderFilterButtons.innerHTML = genders.map(gender =>
          `<button class="btn btn-outline-secondary gender-btn" data-gender="${gender}">${gender}</button>`
      ).join('');
      
      genderFilterButtons.querySelectorAll('.gender-btn').forEach(button => {
          button.addEventListener('click', () => {
              activateGenderFilter(button.dataset.gender);
          });
      });

      document.querySelectorAll('.mobile-gender-filter').forEach(link => {
          link.addEventListener('click', (e) => {
              e.preventDefault();
              activateGenderFilter(e.target.dataset.gender);
              const navbarCollapse = document.getElementById('navbarNav');
              const bsCollapse = new bootstrap.Collapse(navbarCollapse, { toggle: false });
              if (navbarCollapse.classList.contains('show')) bsCollapse.hide();
              document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth' });
          });
      });

      // === CAMBIO CLAVE #2 ===
      // Configuramos el estado inicial de los filtros, pero sin llamar a applyFilters()
      // para no causar el problema de la carga inicial.
      activeGender = 'Todos';
      const desktopButton = genderFilterButtons.querySelector(`[data-gender="Todos"]`);
      if (desktopButton) {
          desktopButton.classList.add('active', 'btn-primary');
          desktopButton.classList.remove('btn-outline-secondary');
      }
      renderSubcategories('Todos');

      const maxPrice = Math.ceil(Math.max(...allProducts.map(p => p.precio), 0) / 10) * 10;
      priceFilter.max = maxPrice;
      priceFilter.value = maxPrice;
      priceValue.textContent = `$${maxPrice}`;
      priceFilter.addEventListener('input', () => priceValue.textContent = `$${priceFilter.value}`);
      priceFilter.addEventListener('change', applyFilters);
  }

  function activateGenderFilter(gender) {
      activeGender = gender;
      
      const desktopButton = genderFilterButtons.querySelector(`[data-gender="${gender}"]`);
      if (desktopButton) {
          genderFilterButtons.querySelector('.active')?.classList.remove('active', 'btn-primary');
          genderFilterButtons.querySelector('.active')?.classList.add('btn-outline-secondary');
          desktopButton.classList.add('active', 'btn-primary');
          desktopButton.classList.remove('btn-outline-secondary');
      }
      
      renderSubcategories(activeGender);
      applyFilters();
  }

  // ===================================================================
  // 5. LÓGICA DE FILTRADO Y RENDERIZADO (Sin cambios)
  // ===================================================================
  function renderSubcategories(gender) {
      let subcategories = [];
      if (gender === 'Todos') {
          const allSubcats = new Set(allProducts.map(p => p.subcategoria).filter(Boolean));
          subcategories = [...allSubcats];
      } else if (productsByGender[gender]) {
          subcategories = [...productsByGender[gender].subcategories];
      }
      
      subcategoryFilterPills.innerHTML = `<button class="btn btn-secondary subcat-pill active" data-subcat="Todas">Todas</button>` +
          subcategories.sort().map(subcat =>
              `<button class="btn btn-outline-secondary subcat-pill" data-subcat="${subcat}">${subcat}</button>`
          ).join('');

      subcategoryFilterPills.querySelectorAll('.subcat-pill').forEach(pill => {
          pill.addEventListener('click', () => {
              subcategoryFilterPills.querySelector('.active')?.classList.remove('active', 'btn-secondary');
              subcategoryFilterPills.querySelector('.active')?.classList.add('btn-outline-secondary');
              pill.classList.add('active', 'btn-secondary');
              pill.classList.remove('btn-outline-secondary');
              applyFilters();
          });
      });
  }

  function applyFilters() {
      const searchTerm = searchInput.value.toLowerCase();
      const selectedSubcat = subcategoryFilterPills.querySelector('.active')?.dataset.subcat || 'Todas';
      const maxPrice = parseFloat(priceFilter.value);

      const filteredProducts = allProducts.filter(product => {
          const searchMatch = !searchTerm || product.nombre.toLowerCase().includes(searchTerm);
          const genderMatch = activeGender === 'Todos' || product.genero === activeGender;
          const subcatMatch = selectedSubcat === 'Todas' || product.subcategoria === selectedSubcat;
          const priceMatch = product.precio <= maxPrice;
          
          return searchMatch && genderMatch && subcatMatch && priceMatch;
      });

      renderProductGrid(filteredProducts);
  }

  function renderProductGrid(products) {
      productGrid.innerHTML = '';
      noResults.style.display = products.length === 0 ? 'block' : 'none';
      products.forEach(product => {
          productGrid.innerHTML += getCardHTML(product);
      });
  }

  // ===================================================================
  // 6. FUNCIONES PARA GENERAR HTML (Sin cambios)
  // ===================================================================
  function getCardHTML(product) { /* ... */ }
  function renderModals(products) { /* ... */ }
  function getModalHTML(product) { /* ... */ }

  // (Pego las funciones de HTML aquí para que el código esté completo)
  function getCardHTML(product) {
      return `
          <div class="col-lg-4 col-md-6 mb-4 product-card-wrapper">
              <div class="card h-100 shadow-sm border-0 product-card">
                  <img src="${product.imagen.url}" class="card-img-top" alt="${product.imagen.alt || product.nombre}" data-bs-toggle="modal" data-bs-target="#productModal${product.id}">
                  <div class="card-body d-flex flex-column">
                      <h5 class="card-title">${product.nombre}</h5>
                      <p class="card-text text-muted">${product.genero || ''} / ${product.subcategoria || ''}</p>
                      <h6 class="card-subtitle mt-auto mb-2 fw-bold fs-5 text-primary">$${product.precio}</h6>
                  </div>
              </div>
          </div>
      `;
  }

  function renderModals(products) {
      modalsContainer.innerHTML = products.map(getModalHTML).join('');
  }

  function getModalHTML(product) {
      return `
          <div class="modal fade" id="productModal${product.id}" tabindex="-1" aria-hidden="true">
              <div class="modal-dialog modal-lg modal-dialog-centered">
                  <div class="modal-content">
                      <div class="modal-header border-0">
                          <h5 class="modal-title fs-4">${product.nombre}</h5>
                          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                      </div>
                      <div class="modal-body">
                          <div class="row">
                              <div class="col-md-6">
                                  <img src="${product.imagen.url}" class="img-fluid rounded mb-3" alt="${product.imagen.alt || product.nombre}">
                              </div>
                              <div class="col-md-6 d-flex flex-column">
                                  <p>${product.descripcion}</p>
                                  <p class="mt-auto">
                                      <span class="badge bg-secondary me-1">${product.genero || ''}</span>
                                      <span class="badge bg-info text-dark">${product.subcategoria || ''}</span>
                                  </p>
                                  <h4 class="text-end fw-bold text-primary">$${product.precio}</h4>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      `;
  }
});
