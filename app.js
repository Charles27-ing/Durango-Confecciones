// app.js - Versión Completa, Corregida y Funcional

document.addEventListener('DOMContentLoaded', function() {

    // ===================================================================
    // 1. CONFIGURACIÓN Y VARIABLES GLOBALES
    // ===================================================================
    const DATO_API_TOKEN = '5012cfcb9789ff74d37abad1849d9e';
    const DATO_API_URL = 'https://graphql.datocms.com/';

    let allProducts = [];
    let productsByGender = {};
    let activeGender = 'Todos';

    // Elementos del DOM para filtros y productos
    const searchInput = document.getElementById('search-input' );
    const searchButton = document.getElementById('search-button');
    const genderFilterButtons = document.getElementById('gender-filter-buttons');
    const subcategoryFilterPills = document.getElementById('subcategory-filter-pills');
    const priceFilter = document.getElementById('price-filter');
    const priceValue = document.getElementById('price-value');
    const productGrid = document.getElementById('product-grid');
    const noResults = document.getElementById('no-results');
    const modalsContainer = document.getElementById('product-modals-container');

    // Elementos del DOM para el carrito
    let cart = [];
    const cartCounter = document.getElementById('cart-counter');
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartEmptyMessage = document.getElementById('cart-empty-message');
    const sendOrderButton = document.getElementById('send-order-button');
    const WHATSAPP_NUMBER = '573114246588'; // <-- ¡¡CAMBIA ESTE NÚMERO!!

    const query = `
        query {
            allProductos {
                id, nombre, descripcion, precio, genero, subcategoria,
                imagen { url, alt }
            }
        }
    `;

    // ===================================================================
    // 2. INICIALIZACIÓN
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
            renderProductGrid(allProducts);
            initializeCart();
            setupModalEventListeners();
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
    // 3. LÓGICA DE FILTROS
    // ===================================================================
    function groupProducts() {
        productsByGender = allProducts.reduce((acc, product) => {
            const gender = product.genero || 'Otros';
            if (!acc[gender]) {
                acc[gender] = { subcategories: new Set() };
            }
            if (product.subcategoria) {
                acc[gender].subcategories.add(product.subcategoria);
            }
            return acc;
        }, {});
    }

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
            button.addEventListener('click', () => activateGenderFilter(button.dataset.gender));
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

    // ===================================================================
    // 4. RENDERIZADO DE PRODUCTOS Y MODALES
    // ===================================================================
    function renderProductGrid(products) {
        productGrid.innerHTML = '';
        noResults.style.display = products.length === 0 ? 'block' : 'none';

        products.forEach(product => {
            productGrid.innerHTML += getCardHTML(product);
        });

        document.querySelectorAll('.add-to-cart-btn').forEach(button => {
            button.addEventListener('click', handleAddToCart);
        });
    }

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
                    <div class="card-footer bg-transparent border-0 p-3">
                        <button class="btn btn-primary w-100 add-to-cart-btn" data-product-id="${product.id}">
                            <i class="bi bi-bag-plus-fill"></i> Añadir al Pedido
                        </button>
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
                                <div class="col-md-6"><img src="${product.imagen.url}" class="img-fluid rounded mb-3" alt="${product.imagen.alt || product.nombre}"></div>
                                <div class="col-md-6 d-flex flex-column">
                                    <p>${product.descripcion}</p>
                                    <p class="mt-auto"><span class="badge bg-secondary me-1">${product.genero || ''}</span><span class="badge bg-info text-dark">${product.subcategoria || ''}</span></p>
                                    <h4 class="text-end fw-bold text-primary">$${product.precio}</h4>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function setupModalEventListeners() {
        productGrid.addEventListener('click', function(event) {
            const target = event.target;
            if (target.matches('.card-img-top[data-bs-toggle="modal"]')) {
                const modalId = target.dataset.bsTarget;
                const modalElement = document.querySelector(modalId);

                if (modalElement) {
                    // 1. Creamos la instancia del modal
                    const modal = new bootstrap.Modal(modalElement);

                    // 2. Escuchamos el evento 'hidden.bs.modal' que se dispara cuando el modal TERMINA de cerrarse.
                    modalElement.addEventListener('hidden.bs.modal', function onModalHidden() {
                        // 3. Buscamos cualquier backdrop que haya quedado huérfano y lo eliminamos.
                        const orphanBackdrop = document.querySelector('.modal-backdrop');
                        if (orphanBackdrop) {
                            orphanBackdrop.remove();
                        }
                        // 4. Nos aseguramos de que el body vuelva a ser interactivo.
                        document.body.style.overflow = 'auto';
                        
                        // 5. Removemos el listener para evitar que se acumulen.
                        modalElement.removeEventListener('hidden.bs.modal', onModalHidden);
                    }, { once: true }); // { once: true } es una buena práctica para que el evento solo se dispare una vez.

                    // 6. Mostramos el modal.
                    modal.show();
                }
            }
        });
    }
    // ===================================================================
    // 5. LÓGICA DEL CARRITO DE PEDIDOS
    // ===================================================================
    function initializeCart() {
        const savedCart = localStorage.getItem('durangoCart');
        if (savedCart) {
            cart = JSON.parse(savedCart);
        }
        updateCartUI();
        sendOrderButton.addEventListener('click', generateWhatsAppMessage);
    }

    function handleAddToCart(event) {
        const productId = event.currentTarget.dataset.productId;
        const product = allProducts.find(p => p.id === productId);
        addToCart(product, 1);

        event.currentTarget.innerHTML = '<i class="bi bi-check-lg"></i> Añadido';
        event.currentTarget.classList.replace('btn-primary', 'btn-success');
        setTimeout(() => {
            event.currentTarget.innerHTML = '<i class="bi bi-bag-plus-fill"></i> Añadir al Pedido';
            event.currentTarget.classList.replace('btn-success', 'btn-primary');
        }, 1500);
    }

    function addToCart(product, quantity) {
        const existingItem = cart.find(item => item.id === product.id);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push({ ...product, quantity: quantity });
        }
        saveCart();
        updateCartUI();
    }

    function incrementCartItem(productId) {
        const item = cart.find(item => item.id === productId);
        if (item) {
            item.quantity++;
            saveCart();
            updateCartUI();
        }
    }

    function decrementCartItem(productId) {
        const item = cart.find(item => item.id === productId);
        if (item) {
            item.quantity--;
            if (item.quantity <= 0) {
                removeFromCart(productId);
            } else {
                saveCart();
                updateCartUI();
            }
        }
    }

    function removeFromCart(productId) {
        cart = cart.filter(item => item.id !== productId);
        saveCart();
        updateCartUI();
    }

    function saveCart() {
        localStorage.setItem('durangoCart', JSON.stringify(cart));
    }

    function updateCartUI() {
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '';
            cartEmptyMessage.style.display = 'block';
            sendOrderButton.disabled = true;
            cartCounter.style.display = 'none';
        } else {
            cartEmptyMessage.style.display = 'none';
            sendOrderButton.disabled = false;
            cartItemsContainer.innerHTML = cart.map(item => `
                <div class="card mb-3 cart-item">
                    <div class="row g-0">
                        <div class="col-4"><img src="${item.imagen.url}" class="img-fluid rounded-start" alt="${item.nombre}"></div>
                        <div class="col-8">
                            <div class="card-body py-2 px-3">
                                <div class="d-flex justify-content-between">
                                    <h6 class="card-title mb-1">${item.nombre}</h6>
                                    <button class="btn btn-sm btn-outline-danger border-0 remove-from-cart-btn" data-product-id="${item.id}"><i class="bi bi-trash"></i></button>
                                </div>
                                <p class="card-text mb-2"><small class="text-muted">$${item.precio}</small></p>
                                <div class="d-flex justify-content-start align-items-center">
                                    <button class="btn btn-sm btn-outline-secondary quantity-btn" data-action="decrement" data-product-id="${item.id}">-</button>
                                    <span class="mx-3 fw-bold">${item.quantity}</span>
                                    <button class="btn btn-sm btn-outline-secondary quantity-btn" data-action="increment" data-product-id="${item.id}">+</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');

            const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
            cartCounter.textContent = totalItems;
            cartCounter.style.display = 'block';

            document.querySelectorAll('.quantity-btn').forEach(button => {
                button.addEventListener('click', e => {
                    const { action, productId } = e.currentTarget.dataset;
                    if (action === 'increment') incrementCartItem(productId);
                    else if (action === 'decrement') decrementCartItem(productId);
                });
            });
            document.querySelectorAll('.remove-from-cart-btn').forEach(button => {
                button.addEventListener('click', e => removeFromCart(e.currentTarget.dataset.productId));
            });
        }
    }

    function generateWhatsAppMessage() {
        let message = "¡Hola! 👋 Quisiera hacer el siguiente pedido:\n\n========================\n";
        cart.forEach(item => {
            message += `*Producto:* ${item.nombre}\n*Cantidad:* ${item.quantity}\n*Precio Unit.:* $${item.precio}\n--------------------------------\n`;
        });
        const total = cart.reduce((sum, item) => sum + (item.precio * item.quantity), 0);
        message += `\n*TOTAL APROXIMADO:* $${total}\n========================\n\nQuedo a la espera de la confirmación. ¡Gracias!`;
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`, '_blank' );
    }
});
