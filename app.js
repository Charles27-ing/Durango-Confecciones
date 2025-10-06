// app.js - Versión Corregida

document.addEventListener('DOMContentLoaded', function() {

    // ===================================================================
    // 1. CONFIGURACIÓN Y VARIABLES GLOBALES
    // ===================================================================
    const DATO_API_TOKEN = '5012cfcb9789ff74d37abad1849d9e'; // Verifica que sea válido
    const DATO_API_URL = 'https://graphql.datocms.com/';
    let allProducts = [];
    let productsByGender = {};
    let activeGender = 'Todos';
    let cart = [];
    let customerData = { nombre: '', apellido: '', cedula: '', direccion: '', telefono: '' };

    const productGrid = document.getElementById('product-grid');
    const modalsContainer = document.getElementById('product-modals-container');
    const noResults = document.getElementById('no-results');
    const productCount = document.getElementById('product-count'); // Añadido
    const WHATSAPP_NUMBER = '1234567890'; // Cambia este número

    const query = `
        query {
            allProductos {
                id, nombre, descripcion, precio, genero, subcategoria,
                tallasDisponibles, disponible, referencia, medidasDeModelo, orden
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
        if (result.errors) {
            console.error('Error en la consulta GraphQL:', result.errors);
            if (productGrid) productGrid.innerHTML = `<p class="text-center text-danger">Error al procesar la solicitud a la API. Revisa la consola.</p>`;
            return;
        }
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
            if (productGrid) productGrid.innerHTML = '<p class="text-center text-danger">Error al cargar datos.</p>';
        }
    })
    .catch(error => {
        console.error('Error de red al conectar con DatoCMS:', error);
        if (productGrid) productGrid.innerHTML = '<p class="text-center text-danger">No se pudieron cargar los productos. Revisa tu conexión a internet.</p>';
    });

    // ===================================================================
    // 3. LÓGICA DE FILTROS
    // ===================================================================
    function groupProducts() {
        productsByGender = allProducts.reduce((acc, product) => {
            const gender = product.genero || 'Otros';
            if (!acc[gender]) { acc[gender] = { subcategories: new Set() }; }
            if (product.subcategoria) { acc[gender].subcategories.add(product.subcategoria); }
            return acc;
        }, {});
    }

    function setupFilters() {
        const searchInput = document.getElementById('search-input');
        const searchButton = document.getElementById('search-button');
        const searchInputHeader = document.getElementById('search-input-header');
        const searchButtonHeader = document.getElementById('search-button-header');
        const genderFilterButtons = document.getElementById('gender-filter-buttons');
        const priceFilter = document.getElementById('price-filter');
        const priceValue = document.getElementById('price-value');
        const inStockFilter = document.getElementById('in-stock-filter');
        const sortBy = document.getElementById('sort-by');

        // Sincronizar inputs de búsqueda
        if (searchInput && searchInputHeader) {
            searchInput.addEventListener('input', () => { searchInputHeader.value = searchInput.value; });
            searchInputHeader.addEventListener('input', () => { searchInput.value = searchInputHeader.value; });
        }

        // Event listeners para búsqueda
        if (searchButton) searchButton.addEventListener('click', applyFilters);
        if (searchInput) searchInput.addEventListener('keyup', (event) => { if (event.key === 'Enter') applyFilters(); });
        if (searchButtonHeader) searchButtonHeader.addEventListener('click', applyFilters);
        if (searchInputHeader) searchInputHeader.addEventListener('keyup', (event) => { if (event.key === 'Enter') applyFilters(); });

        const genders = ['Todos', ...Object.keys(productsByGender).sort()];
        genderFilterButtons.innerHTML = genders.map(gender => `<button class="btn ${gender === 'Todos' ? 'btn-secondary' : 'btn-outline-secondary'} gender-btn ${gender === 'Todos' ? 'active' : ''}" data-gender="${gender}">${gender}</button>`).join('');

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

        const maxPrice = Math.ceil(Math.max(0, ...allProducts.map(p => p.precio || 0)) / 10) * 10;
        priceFilter.max = maxPrice;
        priceFilter.value = maxPrice;
        priceValue.textContent = `$${maxPrice}`;
        priceFilter.addEventListener('input', () => priceValue.textContent = `$${priceFilter.value}`);
        priceFilter.addEventListener('change', applyFilters);
        inStockFilter.addEventListener('change', applyFilters);
        sortBy.addEventListener('change', applyFilters);
    }

    function activateGenderFilter(gender) {
        activeGender = gender;
        const genderFilterButtons = document.getElementById('gender-filter-buttons');
        const desktopButton = genderFilterButtons.querySelector(`[data-gender="${gender}"]`);
        if (desktopButton) {
            const activeButton = genderFilterButtons.querySelector('.active');
            if (activeButton) {
                activeButton.classList.remove('active', 'btn-secondary');
                activeButton.classList.add('btn-outline-secondary');
            }
            desktopButton.classList.add('active', 'btn-secondary');
            desktopButton.classList.remove('btn-outline-secondary');
        }
        renderSubcategories(activeGender);
        applyFilters();
    }

    function renderSubcategories(gender) {
        const subcategoryFilterPills = document.getElementById('subcategory-filter-pills');
        let subcategories = [];
        if (gender === 'Todos') {
            const allSubcats = new Set(allProducts.map(p => p.subcategoria).filter(Boolean));
            subcategories = [...allSubcats];
        } else if (productsByGender[gender]) {
            subcategories = [...productsByGender[gender].subcategories];
        }

        subcategoryFilterPills.innerHTML = `<button class="btn btn-secondary subcat-pill active" data-subcat="Todas">Todas</button>` +
            subcategories.sort().map(subcat => `<button class="btn btn-outline-secondary subcat-pill" data-subcat="${subcat}">${subcat}</button>`).join('');

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
        const searchInputCat = document.getElementById('search-input');
        const searchInputHead = document.getElementById('search-input-header');
        const subcategoryFilterPills = document.getElementById('subcategory-filter-pills');
        const priceFilter = document.getElementById('price-filter');
        const inStockFilter = document.getElementById('in-stock-filter');
        const sortBy = document.getElementById('sort-by');

        const searchTerm = (searchInputCat && searchInputCat.value ? searchInputCat.value : (searchInputHead && searchInputHead.value ? searchInputHead.value : '')).toLowerCase();
        const selectedSubcat = subcategoryFilterPills.querySelector('.active')?.dataset.subcat || 'Todas';
        const maxPrice = parseFloat(priceFilter.value);
        const inStock = inStockFilter.checked;
        const sortValue = sortBy.value;

        let filteredProducts = allProducts.filter(product => {
            const searchMatch = !searchTerm || (product.nombre && product.nombre.toLowerCase().includes(searchTerm));
            const genderMatch = activeGender === 'Todos' || product.genero === activeGender;
            const subcatMatch = selectedSubcat === 'Todas' || product.subcategoria === selectedSubcat;
            const priceMatch = (product.precio || 0) <= maxPrice;
            const stockMatch = !inStock || product.disponible;
            return searchMatch && genderMatch && subcatMatch && priceMatch && stockMatch;
        });

        // Sorting
        if (sortValue === 'nuevo') {
            filteredProducts.sort((a, b) => (b.orden || 0) - (a.orden || 0));
        } else if (sortValue === 'precio-asc') {
            filteredProducts.sort((a, b) => (a.precio || 0) - (b.precio || 0));
        } else if (sortValue === 'precio-desc') {
            filteredProducts.sort((a, b) => (b.precio || 0) - (a.precio || 0));
        }

        renderProductGrid(filteredProducts);
    }

    // ===================================================================
    // 4. RENDERIZADO DE PRODUCTOS Y MODALES
    // ===================================================================
    function renderProductGrid(products) {
        productGrid.innerHTML = '';
        noResults.style.display = products.length === 0 ? 'block' : 'none';
        if (productCount) productCount.textContent = `${products.length} Productos encontrados`; // Chequeo para evitar error
        products.filter(p => p.id).forEach(product => { productGrid.innerHTML += getCardHTML(product); });
    }

    function getCardHTML(product) {
        return `
            <div class="col">
                <div class="card h-100 shadow-sm border-0 product-card" data-product-id="${product.id}">
                    <img src="${(product.imagen && product.imagen.url) || 'https://via.placeholder.com/300'}" class="card-img-top" alt="${(product.imagen && product.imagen.alt) || product.nombre || 'Producto'}">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${product.nombre || 'Sin Nombre'}</h5>
                        <p class="card-text text-muted small">${product.genero || ''} / ${product.subcategoria || ''} ${product.referencia ? `- ${product.referencia}` : ''}</p>
                        <h6 class="card-subtitle mt-auto fw-bold fs-5 text-primary">$${product.precio || 0}</h6>
                    </div>
                </div>
            </div>
        `;
    }

    function renderModals(products) {
        modalsContainer.innerHTML = products.filter(p => p.id).map(getModalHTML).join('');
    }

    // Ajuste en getModalHTML para asegurar consistencia en data-precio
function getModalHTML(product) {
    // Manejo flexible para tallasDisponibles
    const variants = Array.isArray(product.tallasDisponibles) && product.tallasDisponibles.length > 0 && typeof product.tallasDisponibles[0] === 'object' 
        ? product.tallasDisponibles 
        : product.tallasDisponibles ? product.tallasDisponibles.map(t => ({ talla: t, precio: product.precio || 0, disponible: true })) : [];
    const hasVariants = variants.length > 0;
    const basePrice = product.precio || 0;
    return `
        <div class="modal fade" id="productModal${product.id}" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header border-0"><h5 class="modal-title fs-4">${product.nombre || 'Sin Nombre'}</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6"><img src="${(product.imagen && product.imagen.url) || 'https://via.placeholder.com/400'}" class="img-fluid rounded mb-3" alt="${(product.imagen && product.imagen.alt) || product.nombre || 'Producto'}"></div>
                            <div class="col-md-6 d-flex flex-column">
                                <p>${product.descripcion || 'Sin descripción.'} ${product.medidasModelo ? `<br>${product.medidasModelo}` : ''}</p>
                                <h4 class="text-end fw-bold text-primary mb-3" id="modal-price-${product.id}">$${basePrice}</h4>
                                ${hasVariants ? `
                                    <div class="mb-3">
                                        <label class="form-label fw-bold">Talla:</label>
                                        <div class="size-buttons d-flex flex-wrap" id="size-buttons-${product.id}">
                                            ${variants.map(variant => `<button class="btn ${variant.disponible ? '' : 'disabled'}" data-talla="${variant.talla}" data-precio="${variant.precio || basePrice}" data-product-id="${product.id}">${variant.talla}</button>`).join('')}
                                        </div>
                                    </div>` : '<p class="text-muted">Talla única.</p>'}
                                    <div class="quantity-selector mb-3">
                                        <button class="btn btn-outline-secondary decrement">-</button>
                                        <input type="number" value="1" min="1" class="quantity-input" id="quantity-${product.id}">
                                        <button class="btn btn-outline-secondary increment">+</button>
                                        <i class="bi bi-heart wishlist-heart ms-3"></i>
                                    </div>
                                    <div class="mt-auto">
                                        <button class="btn btn-primary w-100 btn-lg add-to-cart-from-modal-btn" data-product-id="${product.id}" ${hasVariants ? 'disabled' : ''}>
                                            Agregar al Carrito
                                        </button>
                                        <div id="modal-feedback-${product.id}" class="text-success text-center mt-2 fw-bold"></div>
                                    </div>
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
            const card = event.target.closest('.product-card[data-product-id]');
            if (card) {
                const productId = card.dataset.productId;
                const modalElement = document.getElementById(`productModal${productId}`);
                if (modalElement) {
                    const modal = new bootstrap.Modal(modalElement);
                    modal.show();
                }
            }
        });

        modalsContainer.addEventListener('click', function(event) {
            if (event.target.matches('.size-buttons .btn:not(.disabled)')) {
                const buttons = event.target.parentElement.querySelectorAll('.btn');
                buttons.forEach(btn => btn.classList.remove('active'));
                event.target.classList.add('active');
                updateModalPrice(event.target.dataset.productId, event.target.dataset.precio);
                const button = document.querySelector(`.add-to-cart-from-modal-btn[data-product-id="${event.target.dataset.productId}"]`);
                button.disabled = false;
            } else if (event.target.matches('.increment')) {
                const input = event.target.previousElementSibling;
                input.value = parseInt(input.value) + 1;
            } else if (event.target.matches('.decrement')) {
                const input = event.target.previousElementSibling;
                if (parseInt(input.value) > 1) input.value = parseInt(input.value) - 1;
            } else if (event.target.matches('.wishlist-heart')) {
                event.target.classList.toggle('active');
            } else if (event.target.matches('.add-to-cart-from-modal-btn')) {
                handleAddToCartFromModal(event);
            }
        });
    }

    function updateModalPrice(productId, precio) {
        const priceElement = document.getElementById(`modal-price-${productId}`);
        if (priceElement) priceElement.textContent = `$${precio}`;
    }

    function handleAddToCartFromModal(event) {
        const button = event.target;
        if (!button || !button.dataset || !button.dataset.productId) {
            console.error('Botón o productId no válido');
            return;
        }
        const productId = button.dataset.productId;
        const product = allProducts.find(p => p.id === productId);
        if (!product) {
            console.error('Producto no encontrado para ID:', productId);
            return;
        }
        const sizeButtons = document.getElementById(`size-buttons-${productId}`);
        const selectedButton = sizeButtons ? sizeButtons.querySelector('.active') : null;
        let selectedSize = 'Única';
        let selectedPrice = product.precio || 0;
        let quantity = parseInt(document.getElementById(`quantity-${productId}`).value) || 1;

        if (selectedButton) {
            const talla = selectedButton.dataset.talla;
            if (!talla) {
                alert("Por favor, selecciona una talla.");
                return;
            }
            selectedSize = talla;
            // Asegurarse de que precio sea un número válido
            const precioFromButton = parseFloat(selectedButton.dataset.precio);
            selectedPrice = isNaN(precioFromButton) ? selectedPrice : precioFromButton;
        } else if (product.tallasDisponibles && product.tallasDisponibles.length > 0) {
            alert("Por favor, selecciona una talla.");
            return;
        }

        addToCart(product, quantity, selectedSize, selectedPrice);

    const feedbackDiv = document.getElementById(`modal-feedback-${productId}`);
    const modalElement = document.getElementById(`productModal${productId}`);

    if (feedbackDiv) {
        feedbackDiv.textContent = '¡Añadido correctamente!';
    }

    // Cerrar modal inmediatamente
    if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
        modal.hide();
    }

    // Limpiar feedback después de un tiempo
    if (feedbackDiv) {
        setTimeout(() => {
            feedbackDiv.textContent = '';
        }, 1000);
    }
}

    // ===================================================================
    // 5. LÓGICA DEL CARRITO DE PEDIDOS
    // ===================================================================
    function initializeCart() {
        const savedCart = localStorage.getItem('durangoCart');
        if (savedCart) { cart = JSON.parse(savedCart); }
        updateCartUI();

        const confirmButton = document.getElementById('send-order-button');
        confirmButton.addEventListener('click', () => {
            const form = document.getElementById('customer-form');
            if (form.checkValidity()) {
                customerData.nombre = document.getElementById('customer-name').value;
                customerData.apellido = document.getElementById('customer-lastname').value;
                customerData.cedula = document.getElementById('customer-id').value;
                customerData.direccion = document.getElementById('customer-address').value;
                customerData.telefono = document.getElementById('customer-phone').value;
                generateWhatsAppMessage();
                // Cerrar offcanvas
                const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('cartOffcanvas'));
                if (offcanvas) offcanvas.hide();
            } else {
                form.reportValidity();
            }
        });
    }

    function addToCart(product, quantity, size, price) {
        const cartItemId = `${product.id}-${size}`;
        const existingItem = cart.find(item => item.cartId === cartItemId);
        if (existingItem) { existingItem.quantity += quantity; }
        else { cart.push({ ...product, quantity: quantity, size: size, price: price, cartId: cartItemId }); }
        saveCart();
        updateCartUI();
    }

    function incrementCartItem(cartItemId) {
        const item = cart.find(item => item.cartId === cartItemId);
        if (item) { item.quantity++; saveCart(); updateCartUI(); }
    }

    function decrementCartItem(cartItemId) {
        const item = cart.find(item => item.cartId === cartItemId);
        if (item) {
            item.quantity--;
            if (item.quantity <= 0) { removeFromCart(cartItemId); }
            else { saveCart(); updateCartUI(); }
        }
    }

    function removeFromCart(cartItemId) {
        cart = cart.filter(item => item.cartId !== cartItemId);
        saveCart();
        updateCartUI();
    }

    function editSize(cartItemId) {
        const item = cart.find(i => i.cartId === cartItemId);
        if (!item) return;

        const sizeSpan = document.getElementById(`size-${cartItemId}`);
        if (!sizeSpan) return;

        const tallas = item.tallasDisponibles ? item.tallasDisponibles.map(t => typeof t === 'object' ? t.talla : t).filter(Boolean) : [];
        if (tallas.length === 0) return;

        const select = document.createElement('select');
        select.className = 'form-select form-select-sm d-inline-block w-auto';
        select.innerHTML = tallas.map(t => `<option value="${t}" ${t === item.size ? 'selected' : ''}>${t}</option>`).join('');

        select.addEventListener('change', () => {
            const newSize = select.value;
            if (newSize !== item.size) {
                // Remover el item actual y añadir uno nuevo con la nueva talla
                removeFromCart(cartItemId);
                // Para añadir con nueva talla, necesitamos el precio de la talla
                const variant = item.tallasDisponibles.find(v => (typeof v === 'object' ? v.talla : v) === newSize);
                const newPrice = typeof variant === 'object' && variant.precio ? variant.precio : item.price;
                addToCart(item, item.quantity, newSize, newPrice);
            } else {
                // Restaurar span
                sizeSpan.innerHTML = item.size;
            }
        });

        select.addEventListener('blur', () => {
            // Si no cambió, restaurar
            if (select.value === item.size) {
                sizeSpan.innerHTML = item.size;
            }
        });

        sizeSpan.innerHTML = '';
        sizeSpan.appendChild(select);
        select.focus();
    }

    function saveCart() {
        localStorage.setItem('durangoCart', JSON.stringify(cart));
    }

    function updateCartUI() {
        const cartItemsContainer = document.getElementById('cart-items-container');
        const cartEmptyMessage = document.getElementById('cart-empty-message');
        const sendOrderButton = document.getElementById('send-order-button');
        const cartCounter = document.getElementById('cart-counter');
        const cartTotal = document.getElementById('cart-total');

        if (!cartItemsContainer) return;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '';
            cartEmptyMessage.style.display = 'block';
            sendOrderButton.disabled = true;
            cartCounter.style.display = 'none';
            if (cartTotal) cartTotal.style.display = 'none';
        } else {
            cartEmptyMessage.style.display = 'none';
            sendOrderButton.disabled = false;
            cartItemsContainer.innerHTML = cart.map(item => {
                const tallasDisponibles = item.tallasDisponibles ? item.tallasDisponibles.map(t => typeof t === 'object' ? t.talla : t).filter(Boolean) : [];
                return `
                    <div class="d-flex align-items-center mb-3 border-bottom pb-2">
                        <img src="${(item.imagen && item.imagen.url) || 'https://via.placeholder.com/50'}" class="me-3" style="width: 50px; height: 50px; object-fit: cover;" alt="${item.nombre}">
                        <div class="flex-grow-1">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h6 class="mb-1">${item.nombre}</h6>
                                    <p class="mb-1 text-muted small">Talla: <span id="size-${item.cartId}">${item.size}</span></p>
                                    <p class="mb-0 fw-bold">$${item.price}</p>
                                </div>
                                <button class="btn btn-sm btn-outline-danger remove-from-cart-btn" data-cart-item-id="${item.cartId}"><i class="bi bi-trash"></i></button>
                            </div>
                            <div class="d-flex align-items-center mt-2">
                                <button class="btn btn-sm btn-outline-secondary quantity-btn me-2" data-action="decrement" data-cart-item-id="${item.cartId}">-</button>
                                <span class="fw-bold mx-2">${item.quantity}</span>
                                <button class="btn btn-sm btn-outline-secondary quantity-btn me-2" data-action="increment" data-cart-item-id="${item.cartId}">+</button>
                                ${tallasDisponibles.length > 0 ? `<button class="btn btn-sm btn-outline-primary edit-size-btn ms-auto" data-cart-item-id="${item.cartId}">Editar Talla</button>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            if (cartTotal) {
                cartTotal.textContent = `Total: $${total}`;
                cartTotal.style.display = 'block';
            }

            const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
            cartCounter.textContent = totalItems;
            cartCounter.style.display = 'block';

            document.querySelectorAll('.quantity-btn').forEach(button => {
                button.addEventListener('click', e => {
                    const { action, cartItemId } = e.currentTarget.dataset;
                    if (action === 'increment') incrementCartItem(cartItemId);
                    else if (action === 'decrement') decrementCartItem(cartItemId);
                });
            });

            document.querySelectorAll('.remove-from-cart-btn').forEach(button => {
                button.addEventListener('click', e => removeFromCart(e.currentTarget.dataset.cartItemId));
            });

            document.querySelectorAll('.edit-size-btn').forEach(button => {
                button.addEventListener('click', e => editSize(e.currentTarget.dataset.cartItemId));
            });
        }
    }

    function generateWhatsAppMessage() {
        let message = `¡Hola! 👋 Quisiera hacer el siguiente pedido:\n\n`;
        message += `Nombre: ${customerData.nombre} ${customerData.apellido}\nCédula: ${customerData.cedula}\nDirección: ${customerData.direccion}\nTeléfono: ${customerData.telefono}\n\n========================\n`;
        cart.forEach(item => {
            message += `*Producto:* ${item.nombre}\n*Talla:* ${item.size}\n*Cantidad:* ${item.quantity}\n*Precio Unit.:* $${item.price}\n--------------------------------\n`;
        });
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        message += `\n*TOTAL APROXIMADO:* $${total}\n========================\n\nQuedo a la espera de la confirmación. ¡Gracias!`;
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`, '_blank');
    }
});