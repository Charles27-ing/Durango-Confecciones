// app.js - Versión conectada a DatoCMS

document.addEventListener('DOMContentLoaded', function() {

  // ===================================================================
  // 1. CONFIGURACIÓN DE LA API DE DATOCMS
  // ===================================================================
  const DATO_API_TOKEN = '5012cfcb9789ff74d37abad1849d9e'; // ¡Pega tu token aquí!
  const DATO_API_URL = 'https://graphql.datocms.com/';

  // Esta es la "pregunta" que le hacemos a la API en lenguaje GraphQL.
  // Le pedimos todos los productos con sus campos.
  const query = `
    query {
      allProductos{
        id
        nombre
        descripcion
        precio
        categoria
        imagen {
          url
          alt
        }
      }
    }
  `;

  // ===================================================================
  // 2. HACER LA LLAMADA A LA API PARA OBTENER LOS PRODUCTOS
  // ===================================================================
  fetch(DATO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${DATO_API_TOKEN}`,
    },
    body: JSON.stringify({ query: query } ),
  })
  .then(res => res.json())
  .then(result => {
    if (result.data && result.data.allProductos) {
      const products = result.data.allProductos;
      
      // Agrupamos los productos por su categoría
      const productsByCategory = groupProductsByCategory(products);
      
      // Obtenemos una lista ordenada de los nombres de las categorías
      const categories = Object.keys(productsByCategory).sort();

      // ¡Llamamos a las dos funciones principales!
      renderNavigation(categories);
      renderCategorySections(categories, productsByCategory);
      renderModals(products);

    } else {
      console.error('La respuesta de la API no tiene el formato esperado:', result);
    }
  })
  .catch(error => {
    console.error('Error al cargar los datos desde DatoCMS:', error);
    const mainContainer = document.getElementById('dynamic-category-sections');
    mainContainer.innerHTML = '<p class="text-center text-danger vh-100 d-flex align-items-center justify-content-center">No se pudieron cargar los productos. Revisa la consola para más detalles.</p>';
  });

  // --- FUNCIONES AUXILIARES ---

  function groupProductsByCategory(products) {
    return products.reduce((acc, product) => {
      const category = product.categoria || 'Sin Categoría';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(product);
      return acc;
    }, {});
  }

  /**
   * Crea los enlaces en la barra de navegación.
   */
  function renderNavigation(categories) {
    const navContainer = document.getElementById('category-nav-links');
    if (!navContainer) return;

    let navHTML = '';
    categories.forEach(category => {
      const categoryId = category.toLowerCase().replace(/\s+/g, '-');
      navHTML += `
        <li class="nav-item">
          <a class="nav-link" href="#${categoryId}">${category}</a>
        </li>
      `;
    });
    // Añadimos un enlace de contacto al final
    navHTML += `
      <li class="nav-item">
        <a class="nav-link" href="#contacto">Contacto</a>
      </li>
    `;
    navContainer.innerHTML = navHTML;
  }

  /**
   * Crea las secciones de productos en el cuerpo de la página.
   */
  function renderCategorySections(categories, productsByCategory) {
    const mainContainer = document.getElementById('dynamic-category-sections');
    if (!mainContainer) return;

    let sectionsHTML = '';
    categories.forEach(category => {
      const categoryId = category.toLowerCase().replace(/\s+/g, '-');
      const products = productsByCategory[category];
      
      sectionsHTML += `
        <section class="category-section py-5" id="${categoryId}">
          <div class="container">
            <div class="text-center mb-5">
              <h2 class="category-title d-inline-block position-relative">${category}</h2>
            </div>
            <div class="row">
              ${products.map(product => getCardHTML(product)).join('')}
            </div>
          </div>
        </section>
      `;
    });
    mainContainer.innerHTML = sectionsHTML;
  }

  /**
   * Crea todos los modales (ventanas emergentes) y los añade al final.
   */
  function renderModals(products) {
    const modalsContainer = document.getElementById('product-modals-container');
    if (!modalsContainer) return;
    modalsContainer.innerHTML = products.map(product => getModalHTML(product)).join('');
  }

  function getCardHTML(product) {
    // Esta función no cambia
    return `
      <div class="col-lg-4 col-md-6 mb-4">
        <div class="card h-100 shadow-sm">
          <img src="${product.imagen.url}" class="card-img-top" alt="${product.nombre}" data-bs-toggle="modal" data-bs-target="#productModal${product.id}">
          <div class="card-body d-flex flex-column">
            <h5 class="card-title">${product.nombre}</h5>
            <h6 class="card-subtitle mt-auto mb-2 text-muted">$${product.precio}</h6>
          </div>
        </div>
      </div>
    `;
  }

  function getModalHTML(product) {
    // Esta función tampoco cambia
    return `
      <div class="modal fade" id="productModal${product.id}" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">${product.nombre}</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <img src="${product.imagen.url}" class="img-fluid mb-3" alt="${product.nombre}">
              <p>${product.descripcion}</p>
              <h4 class="text-end">$${product.precio}</h4>
            </div>
          </div>
        </div>
      </div>
    `;
  }
});
