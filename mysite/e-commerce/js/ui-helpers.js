/**
 * ui-helpers.js - Universal UI utilities and injectors
 * Hinglish comments: Is script mein dynamic UI headers, footers, toast alerts aur modal components inject karne ke helpers hain.
 */

const UI = {
    // 1. Format number as Indian currency (e.g. ₹1,499.00 or ₹1,499)
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    },

    // 2. Render rating stars HTML
    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const halfStar = rating % 1 >= 0.5 ? 1 : 0;
        const emptyStars = 5 - fullStars - halfStar;
        
        let html = '<span class="stars-display" style="display:inline-flex; gap:2px;">';
        for (let i = 0; i < fullStars; i++) {
            html += `<svg width="14" height="14" viewBox="0 0 24 24" fill="#ca8a04"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`;
        }
        if (halfStar) {
            html += `<svg width="14" height="14" viewBox="0 0 24 24" fill="#ca8a04"><path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27V2l2.81 6.63z"/></svg>`;
        }
        for (let i = 0; i < emptyStars; i++) {
            html += `<svg width="14" height="14" viewBox="0 0 24 24" fill="#cbd5e1"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`;
        }
        html += `</span>`;
        return html;
    },

    // 3. Show Toast notification
    showToast(message, type = 'success') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = '';
        if (type === 'success') {
            icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>`;
        } else if (type === 'danger') {
            icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>`;
        } else if (type === 'warning') {
            icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>`;
        } else {
            icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`;
        }

        toast.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px;">
                ${icon}
                <span>${message}</span>
            </div>
            <button class="toast-close">&times;</button>
        `;

        container.appendChild(toast);

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            toast.style.animation = 'none';
            toast.remove();
        });

        // Auto remove in 3.5s
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    },

    // 4. Modal manager
    showModal({ title, bodyHTML, primaryText = 'Confirm', secondaryText = 'Cancel', onConfirm, onCancel }) {
        let modalOverlay = document.getElementById('global-modal-overlay');
        if (!modalOverlay) {
            modalOverlay = document.createElement('div');
            modalOverlay.id = 'global-modal-overlay';
            modalOverlay.className = 'modal-overlay';
            document.body.appendChild(modalOverlay);
        }

        modalOverlay.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    <button class="modal-close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    ${bodyHTML}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline btn-sm modal-cancel-btn">${secondaryText}</button>
                    <button class="btn btn-primary btn-sm modal-confirm-btn">${primaryText}</button>
                </div>
            </div>
        `;

        modalOverlay.classList.add('show');

        const closeBtn = modalOverlay.querySelector('.modal-close-btn');
        const cancelBtn = modalOverlay.querySelector('.modal-cancel-btn');
        const confirmBtn = modalOverlay.querySelector('.modal-confirm-btn');

        const closeModal = () => {
            modalOverlay.classList.remove('show');
            if (onCancel) onCancel();
        };

        closeBtn.onclick = closeModal;
        cancelBtn.onclick = closeModal;
        confirmBtn.onclick = () => {
            if (onConfirm) {
                const preventClose = onConfirm();
                if (preventClose === false) return;
            }
            modalOverlay.classList.remove('show');
        };
    },

    // 5. Injects Shared Headers, Mobile bottom navigation and Footers
    injectSharedHeaderAndFooter() {
        const headerPlaceholder = document.getElementById('header-placeholder');
        const footerPlaceholder = document.getElementById('footer-placeholder');

        const session = DB.findOne('current_session', {});
        const user = session ? DB.findById('users', session.user_id) : null;
        
        // Count cart and wishlist quantities
        const activeUserId = session ? session.user_id : 'guest';
        const cartItems = DB.find('cart_items', { user_id: activeUserId });
        const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

        const wishlist = DB.find('wishlists', { user_id: activeUserId });
        const wishlistCount = wishlist.length;

        const notifs = session ? DB.find('notifications', { user_id: session.user_id, is_read: false }) : [];
        const notifCount = notifs.length;

        // Path adjustment helper based on current page depth
        const getRootPath = () => {
            // Hum saare files root level par hi create kar rahe hain, isliye straightforward path use karenge.
            return '';
        };
        const rootPath = getRootPath();

        const pathName = window.location.pathname;
        const isAuthPage = pathName.endsWith('login.html') || pathName.endsWith('register.html');

        if (headerPlaceholder) {
            if (isAuthPage) {
                headerPlaceholder.innerHTML = '';
            } else {
                // Build Desktop Menu elements based on Role
                let dashboardLink = '';
                let dropdownExtraLinks = '';
                
                if (user) {
                    if (user.user_type === 'ADMIN') {
                        dashboardLink = `<a href="${rootPath}admin-dashboard.html" class="nav-link-item"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 16v-4M12 8h.01"/></svg> Admin</a>`;
                        dropdownExtraLinks = `<a href="${rootPath}admin-dashboard.html" class="dropdown-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M3 20h9M3 4h18M3 12h18"/></svg> Admin Panel</a>`;
                    } else if (user.user_type === 'SELLER') {
                        dashboardLink = `<a href="${rootPath}seller-dashboard.html" class="nav-link-item"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg> Seller Hub</a>`;
                        dropdownExtraLinks = `<a href="${rootPath}seller-dashboard.html" class="dropdown-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 17V7M15 17V7"/></svg> Seller Dashboard</a>`;
                    }
                }

                // Desktop Header HTML
                const headerHTML = `
                    <!-- Desktop Header View -->
                    <header class="header-desktop">
                        <div class="container">
                            <div class="header-desktop-inner">
                                <a href="${rootPath}index.html" class="logo">
                                    🛒 Shop<span>Ease</span>
                                </a>
                                
                                <!-- Search engine container -->
                                <div class="search-bar-container">
                                    <form action="${rootPath}products.html" method="GET" id="desktop-search-form" style="width:100%">
                                        <input type="text" name="q" placeholder="Search product name, brands, seller..." class="search-input" id="desktop-search-input">
                                        <button type="submit" class="search-icon-btn">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                                        </button>
                                    </form>
                                </div>

                                <!-- Right nav section -->
                                <nav class="nav-links-desktop">
                                    <a href="${rootPath}index.html" class="nav-link-item">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg> Home
                                    </a>
                                    <a href="${rootPath}products.html" class="nav-link-item">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg> Shop
                                    </a>
                                    ${dashboardLink}
                                    <a href="${rootPath}wishlist.html" class="nav-link-item">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg> Wishlist
                                        ${wishlistCount > 0 ? `<span class="nav-badge" id="wishlist-badge-desktop">${wishlistCount}</span>` : ''}
                                    </a>
                                    <a href="${rootPath}cart.html" class="nav-link-item">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg> Cart
                                        ${cartCount > 0 ? `<span class="nav-badge" id="cart-badge-desktop">${cartCount}</span>` : ''}
                                    </a>
                                    
                                    <!-- User Session Trigger Dropdown -->
                                    <div class="user-menu-container">
                                        <button class="user-menu-btn" id="user-menu-btn">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                            <span>${user ? user.full_name.split(' ')[0] : 'Account'}</span>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
                                        </button>
                                        <div class="user-dropdown" id="user-dropdown">
                                            ${user ? `
                                                <div class="dropdown-user-info">
                                                    <div class="user-name">${user.full_name}</div>
                                                    <div class="user-email">${user.email}</div>
                                                    <div class="user-badge">${user.user_type}</div>
                                                </div>
                                                <a href="${rootPath}profile.html" class="dropdown-item">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> My Profile
                                                </a>
                                                <a href="${rootPath}orders.html" class="dropdown-item">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> My Orders
                                                </a>
                                                ${dropdownExtraLinks}
                                                <div class="dropdown-divider"></div>
                                                <button class="dropdown-item text-danger" id="logout-btn-desktop" style="width:100%">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 01-2-2h4M16 17l5-5-5-5M21 12H9"/></svg> Logout
                                                </button>
                                            ` : `
                                                <a href="${rootPath}login.html" class="dropdown-item">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg> Sign In
                                                </a>
                                                <a href="${rootPath}register.html" class="dropdown-item">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg> Register
                                                </a>
                                            `}
                                        </div>
                                    </div>
                                </nav>
                            </div>
                        </div>
                    </header>

                    <!-- Mobile Header View -->
                    <header class="header-mobile">
                        <a href="${rootPath}index.html" class="logo">🛒 Shop<span>Ease</span></a>
                        <div class="header-mobile-actions">
                            <a href="${rootPath}products.html" class="header-mobile-btn">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                            </a>
                            <a href="${rootPath}wishlist.html" class="header-mobile-btn">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                                ${wishlistCount > 0 ? `<span class="nav-badge" style="top:-3px; right:-3px;">${wishlistCount}</span>` : ''}
                            </a>
                        </div>
                    </header>
                `;

                headerPlaceholder.innerHTML = headerHTML;
                
                // Set query value if current page is search/browse products
                const urlParams = new URLSearchParams(window.location.search);
                const queryVal = urlParams.get('q');
                if (queryVal && document.getElementById('desktop-search-input')) {
                    document.getElementById('desktop-search-input').value = queryVal;
                }

                // Bind Dropdown trigger click
                const dropdownBtn = document.getElementById('user-menu-btn');
                const dropdownMenu = document.getElementById('user-dropdown');
                if (dropdownBtn && dropdownMenu) {
                    dropdownBtn.onclick = (e) => {
                        e.stopPropagation();
                        dropdownMenu.classList.toggle('show');
                    };
                    
                    document.onclick = () => {
                        dropdownMenu.classList.remove('show');
                    };
                }

                // Bind logout button click
                const logoutBtn = document.getElementById('logout-btn-desktop');
                if (logoutBtn) {
                    logoutBtn.onclick = () => {
                        DB.clear('current_session');
                        this.showToast('Logged out successfully', 'success');
                        setTimeout(() => {
                            window.location.href = rootPath + 'index.html';
                        }, 1000);
                    };
                }
            }
        }

        // Inject Mobile Navigation Panel
        let mobileNavPlaceholder = document.getElementById('mobile-nav-placeholder');
        if (!mobileNavPlaceholder) {
            mobileNavPlaceholder = document.createElement('div');
            mobileNavPlaceholder.id = 'mobile-nav-placeholder';
            document.body.appendChild(mobileNavPlaceholder);
        }

        if (isAuthPage) {
            mobileNavPlaceholder.style.display = 'none';
            // Optionally remove padding bottom from body for auth pages
            document.body.style.paddingBottom = '0px';
        } else {
            mobileNavPlaceholder.style.display = 'flex';
            document.body.style.paddingBottom = ''; // Reset to default CSS
            
            // Determine user dashboard type for bottom tab
            let mobileCenterLink = `<a href="${rootPath}orders.html" class="bottom-nav-item ${window.location.pathname.endsWith('orders.html') ? 'active' : ''}">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-dasharray="none" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Orders
            </a>`;
            
            if (user) {
                if (user.user_type === 'SELLER') {
                    mobileCenterLink = `<a href="${rootPath}seller-dashboard.html" class="bottom-nav-item ${window.location.pathname.endsWith('seller-dashboard.html') ? 'active' : ''}">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg> Seller Hub
                    </a>`;
                } else if (user.user_type === 'ADMIN') {
                    mobileCenterLink = `<a href="${rootPath}admin-dashboard.html" class="bottom-nav-item ${window.location.pathname.endsWith('admin-dashboard.html') ? 'active' : ''}">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 16v-4M12 8h.01"/></svg> Admin
                    </a>`;
                }
            }

            const isHome = pathName.endsWith('index.html') || pathName.endsWith('/') || pathName === '';
            const isProducts = pathName.endsWith('products.html') || pathName.endsWith('product-detail.html');
            const isCart = pathName.endsWith('cart.html') || pathName.endsWith('checkout.html');
            const isProfile = pathName.endsWith('profile.html') || pathName.endsWith('login.html') || pathName.endsWith('register.html');

            const mobileNavHTML = `
                <nav class="bottom-nav-mobile">
                    <a href="${rootPath}index.html" class="bottom-nav-item ${isHome ? 'active' : ''}">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg> Home
                    </a>
                    <a href="${rootPath}products.html" class="bottom-nav-item ${isProducts ? 'active' : ''}">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 21l-4.35-4.35"/><circle cx="11" cy="11" r="8"/></svg> Search
                    </a>
                    ${mobileCenterLink}
                    <a href="${rootPath}cart.html" class="bottom-nav-item ${isCart ? 'active' : ''}">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg> Cart
                        ${cartCount > 0 ? `<span class="nav-badge" style="top: 8px; right: 18px;">${cartCount}</span>` : ''}
                    </a>
                    <a href="${rootPath}profile.html" class="bottom-nav-item ${isProfile ? 'active' : ''}">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Profile
                    </a>
                </nav>
            `;

            mobileNavPlaceholder.innerHTML = mobileNavHTML;
        }

        // Inject Footer HTML
        if (footerPlaceholder) {
            const footerHTML = `
                <footer>
                    <div class="container">
                        <div class="footer-grid">
                            <div class="footer-col">
                                <h4 style="color:white; font-size:18px; margin-bottom:12px;">🛒 ShopEase</h4>
                                <p style="line-height: 1.6; font-size:13px;">Simple, clean and premium e-commerce shopping experience simulation running entirely in the client browser database.</p>
                            </div>
                            <div class="footer-col">
                                <h4>Shop Catalog</h4>
                                <ul class="footer-links">
                                    <li><a href="${rootPath}products.html?category=electronics">Electronics</a></li>
                                    <li><a href="${rootPath}products.html?category=fashion">Fashion Wear</a></li>
                                    <li><a href="${rootPath}products.html?category=home-kitchen">Home Utilities</a></li>
                                    <li><a href="${rootPath}products.html?category=beauty">Beauty Serum & Lipsticks</a></li>
                                </ul>
                            </div>
                            <div class="footer-col">
                                <h4>Quick Navigation</h4>
                                <ul class="footer-links">
                                    <li><a href="${rootPath}profile.html">My Profile</a></li>
                                    <li><a href="${rootPath}orders.html">Track Orders</a></li>
                                    <li><a href="${rootPath}wishlist.html">My Wishlist</a></li>
                                    <li><a href="${rootPath}cart.html">View Cart</a></li>
                                </ul>
                            </div>
                            <div class="footer-col">
                                <h4>Developer Testing</h4>
                                <p style="font-size:12px; margin-bottom:12px; line-height:1.5;">Reset and re-seed all database entities in localStorage to inspect clean states.</p>
                                <button class="reset-db-btn" id="reset-db-footer-btn">Reset Demo Data</button>
                            </div>
                        </div>
                        <div class="footer-bottom">
                            <p>&copy; 2026 ShopEase E-Commerce Inc. All simulated rights reserved.</p>
                            <p style="color:#64748b;">Built with pure HTML, CSS, and Vanilla JS</p>
                        </div>
                    </div>
                </footer>
            `;

            footerPlaceholder.innerHTML = footerHTML;

            const resetBtn = document.getElementById('reset-db-footer-btn');
            if (resetBtn) {
                resetBtn.onclick = () => {
                    this.showModal({
                        title: 'Reset Demo Database?',
                        bodyHTML: '<p>This will erase all dynamic orders, address updates, added items, and revert the shop database back to default seed records. Are you sure you want to proceed?</p>',
                        primaryText: 'Yes, Reset',
                        secondaryText: 'Cancel',
                        onConfirm: () => {
                            SEED.resetAndReseed();
                            this.showToast('Database reset and re-seeded successfully!', 'success');
                            setTimeout(() => {
                                window.location.reload();
                            }, 1000);
                        }
                    });
                };
            }
        }
    },

    // Recalculates and updates nav count badges dynamically without full page reload
    updateNavBadges() {
        const session = DB.findOne('current_session', {});
        const activeUserId = session ? session.user_id : 'guest';
        
        const cartItems = DB.find('cart_items', { user_id: activeUserId });
        const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

        const wishlist = DB.find('wishlists', { user_id: activeUserId });
        const wishlistCount = wishlist.length;

        // Desktop updates
        const dCart = document.getElementById('cart-badge-desktop');
        if (dCart) {
            if (cartCount > 0) {
                dCart.innerText = cartCount;
                dCart.style.display = 'flex';
            } else {
                dCart.style.display = 'none';
            }
        }

        const dWish = document.getElementById('wishlist-badge-desktop');
        if (dWish) {
            if (wishlistCount > 0) {
                dWish.innerText = wishlistCount;
                dWish.style.display = 'flex';
            } else {
                dWish.style.display = 'none';
            }
        }

        this.injectSharedHeaderAndFooter();
    },

    // 6. Inject floating Sandbox Dev tools panel on all pages
    injectDevToolsWidget() {
        let widget = document.getElementById('dev-sandbox-widget');
        if (widget) return;

        widget = document.createElement('div');
        widget.id = 'dev-sandbox-widget';
        widget.style.position = 'fixed';
        widget.style.bottom = '80px'; // Sticky above mobile nav bar
        widget.style.right = '20px';
        widget.style.zIndex = '9999';
        widget.style.fontFamily = 'var(--font)';
        
        const session = DB.findOne('current_session', {});
        const user = session ? DB.findById('users', session.user_id) : null;
        let userInfoStr = 'Guest Session';
        if (user) {
            userInfoStr = `👤 ${user.full_name.split(' ')[0]} (${user.user_type})`;
        }

        widget.innerHTML = `
            <!-- Floating Gear Icon button -->
            <button id="dev-sandbox-toggle-btn" style="background-color:#0f172a; color:white; padding:10px 14px; border-radius:var(--radius-full); font-size:12px; font-weight:600; box-shadow:var(--shadow-lg); display:flex; align-items:center; gap:6px; border:1px solid #334155; cursor:pointer;">
                ⚙️ Sandbox Dev Tools
            </button>

            <!-- Dev Panel Card Box -->
            <div id="dev-sandbox-panel" style="display:none; position:absolute; bottom:44px; right:0; width:280px; background-color:#1e293b; color:#e2e8f0; border-radius:var(--radius-lg); border:1px solid #334155; box-shadow:var(--shadow-lg); padding:16px; flex-direction:column; gap:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #334155; padding-bottom:8px;">
                    <span style="font-weight:700; font-size:13px; color:white;">🛠️ Sandbox Panel</span>
                    <button id="dev-sandbox-close-btn" style="color:#94a3b8; font-size:18px; line-height:1; cursor:pointer;">&times;</button>
                </div>

                <div style="font-size:11px; color:#94a3b8;">
                    Current Session: <strong style="color:white;">${userInfoStr}</strong>
                </div>

                <!-- Section: Session switching -->
                <div style="display:flex; flex-direction:column; gap:6px;">
                    <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">Quick Login Switcher</div>
                    <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:4px;">
                        <button onclick="UI.devSwitchSession('CUSTOMER')" style="background-color:#334155; color:white; padding:6px 2px; border-radius:var(--radius-sm); font-size:9px; font-weight:600; cursor:pointer;">Customer</button>
                        <button onclick="UI.devSwitchSession('SELLER')" style="background-color:#334155; color:white; padding:6px 2px; border-radius:var(--radius-sm); font-size:9px; font-weight:600; cursor:pointer;">Seller</button>
                        <button onclick="UI.devSwitchSession('ADMIN')" style="background-color:#334155; color:white; padding:6px 2px; border-radius:var(--radius-sm); font-size:9px; font-weight:600; cursor:pointer;">Admin</button>
                    </div>
                </div>

                <!-- Section: Order Flows Simulations -->
                <div style="display:flex; flex-direction:column; gap:6px; border-top:1px dashed #334155; padding-top:10px;">
                    <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">Simulations & Flows</div>
                    <button onclick="UI.startAutopilot('BUY_FLOW')" style="background-color:#7c3aed; color:white; padding:8px; border-radius:var(--radius-md); font-size:11px; font-weight:600; text-align:left; cursor:pointer; display:flex; align-items:center; gap:6px;">
                        🚀 Auto-Pilot: Complete Buy Flow
                    </button>
                    <button onclick="UI.devGenerateTestOrders()" style="background-color:#0f766e; color:white; padding:8px; border-radius:var(--radius-md); font-size:11px; font-weight:600; text-align:left; cursor:pointer; display:flex; align-items:center; gap:6px;">
                        📦 Generate 3 Test Orders
                    </button>
                    <button onclick="UI.devMarkAllDelivered()" style="background-color:#ca8a04; color:white; padding:8px; border-radius:var(--radius-md); font-size:11px; font-weight:600; text-align:left; cursor:pointer; display:flex; align-items:center; gap:6px;">
                        ✔️ Mark Orders as DELIVERED
                    </button>
                </div>

                <!-- Section: Database Utilities -->
                <div style="display:flex; flex-direction:column; gap:6px; border-top:1px dashed #334155; padding-top:10px;">
                    <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">Utilities</div>
                    <button onclick="UI.devClearTransient()" style="background-color:#dc2626; color:white; padding:6px; border-radius:var(--radius-md); font-size:11px; font-weight:600; text-align:center; cursor:pointer;">
                        🗑️ Clear Cart & Wishlist
                    </button>
                    <button onclick="document.getElementById('reset-db-footer-btn').click()" style="background-color:#475569; color:white; padding:6px; border-radius:var(--radius-md); font-size:11px; font-weight:600; text-align:center; cursor:pointer;">
                        🔄 Re-seed Database
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(widget);

        // Bind interactive toggles
        const toggleBtn = document.getElementById('dev-sandbox-toggle-btn');
        const panel = document.getElementById('dev-sandbox-panel');
        const closeBtn = document.getElementById('dev-sandbox-close-btn');

        toggleBtn.onclick = (e) => {
            e.stopPropagation();
            panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
        };

        closeBtn.onclick = (e) => {
            e.stopPropagation();
            panel.style.display = 'none';
        };

        // Close panel if clicked outside
        document.addEventListener('click', (e) => {
            if (!widget.contains(e.target)) {
                panel.style.display = 'none';
            }
        });
    },

    // Session Switch helper callback
    devSwitchSession(userType) {
        let email = 'customer@ecom.com';
        if (userType === 'ADMIN') email = 'admin@ecom.com';
        else if (userType === 'SELLER') email = 'seller@ecom.com';

        const result = Auth.login(email, 'password123');
        if (result.success) {
            this.showToast(`Switched session to ${userType}!`, 'success');
            setTimeout(() => { window.location.reload(); }, 600);
        } else {
            this.showToast(result.message, 'danger');
        }
    },

    // Generate test orders database records helper
    devGenerateTestOrders() {
        const session = DB.findOne('current_session', {});
        if (!session) {
            this.showToast('Please log in as Customer first!', 'warning');
            return;
        }
        const userId = session.user_id;
        const user = DB.findById('users', userId);
        if (!user || user.user_type !== 'CUSTOMER') {
            this.showToast('Test orders can only be generated for Customers!', 'warning');
            return;
        }

        // Get shipping address snapshot
        const address = DB.findOne('addresses', { user_id: userId }) || {
            recipient_name: user.full_name,
            phone_number: user.phone_number,
            address_line1: 'Flat 402, Royal Residency',
            address_line2: 'Sector 62',
            city: 'Noida',
            state: 'Uttar Pradesh',
            pincode: '201301',
            country: 'India'
        };

        // Placed order
        const o1 = DB.insert('orders', {
            order_number: 'ORD' + Date.now().toString().slice(-6) + '1',
            user_id: userId,
            shipping_address: address,
            order_status: 'PLACED',
            subtotal_amount: 1999,
            discount_amount: 0,
            tax_amount: 240,
            shipping_charge: 50,
            total_amount: 2289,
            coupon_id: null,
            payment_status: 'PENDING',
            placed_at: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
        });
        DB.insert('order_items', {
            order_id: o1.order_id,
            variant_id: 3, // Earbuds Black
            seller_id: 1,
            product_name_snapshot: 'Wireless Earbuds X1 (Charcoal Black)',
            unit_price_snapshot: 1999,
            quantity: 1,
            item_total: 1999,
            item_status: 'PLACED'
        });
        DB.insert('order_status_history', {
            order_id: o1.order_id,
            status: 'PLACED',
            changed_by: 'SYSTEM',
            changed_at: o1.placed_at,
            notes: 'Simulated checkout order placement.'
        });

        // Shipped order
        const o2 = DB.insert('orders', {
            order_number: 'ORD' + Date.now().toString().slice(-6) + '2',
            user_id: userId,
            shipping_address: address,
            order_status: 'SHIPPED',
            subtotal_amount: 499,
            discount_amount: 0,
            tax_amount: 60,
            shipping_charge: 50,
            total_amount: 609,
            coupon_id: null,
            payment_status: 'SUCCESS',
            placed_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
        });
        DB.insert('order_items', {
            order_id: o2.order_id,
            variant_id: 9, // Red T-Shirt
            seller_id: 2,
            product_name_snapshot: 'Casual Cotton T-Shirt (Crimson Red - Size M)',
            unit_price_snapshot: 499,
            quantity: 1,
            item_total: 499,
            item_status: 'SHIPPED'
        });
        DB.insert('order_status_history', {
            order_id: o2.order_id,
            status: 'PLACED',
            changed_by: 'SYSTEM',
            changed_at: o2.placed_at,
            notes: 'Simulated checkout order placement.'
        });
        DB.insert('order_status_history', {
            order_id: o2.order_id,
            status: 'SHIPPED',
            changed_by: 'SELLER',
            changed_at: new Date(Date.now() - 72000000).toISOString(),
            notes: 'Shipment dispatched from logistics partner.'
        });

        // Delivered order
        const o3 = DB.insert('orders', {
            order_number: 'ORD' + Date.now().toString().slice(-6) + '3',
            user_id: userId,
            shipping_address: address,
            order_status: 'DELIVERED',
            subtotal_amount: 599,
            discount_amount: 100,
            tax_amount: 72,
            shipping_charge: 50,
            total_amount: 621,
            coupon_id: 1,
            payment_status: 'SUCCESS',
            placed_at: new Date(Date.now() - 172800000).toISOString() // 2 days ago
        });
        DB.insert('order_items', {
            order_id: o3.order_id,
            variant_id: 14, // Face Serum
            seller_id: 3,
            product_name_snapshot: 'Hydrating Face Serum (Standard Glass Bottle 50ml)',
            unit_price_snapshot: 599,
            quantity: 1,
            item_total: 599,
            item_status: 'DELIVERED'
        });
        DB.insert('order_status_history', {
            order_id: o3.order_id,
            status: 'PLACED',
            changed_by: 'SYSTEM',
            changed_at: o3.placed_at,
            notes: 'Simulated checkout order placement.'
        });
        DB.insert('order_status_history', {
            order_id: o3.order_id,
            status: 'DELIVERED',
            changed_by: 'SYSTEM',
            changed_at: new Date(Date.now() - 144000000).toISOString(),
            notes: 'Order delivered successfully to recipient.'
        });

        // Seed notifications
        DB.insert('notifications', {
            user_id: userId,
            type: 'ORDER_UPDATE',
            title: 'Mock Orders Generated',
            message: 'Your developer test sandbox has generated 3 test orders with PLACED, SHIPPED and DELIVERED states.',
            is_read: false
        });

        this.showToast('Generated 3 test orders!', 'success');
        setTimeout(() => { window.location.reload(); }, 800);
    },

    // Mark all active orders delivered helper
    devMarkAllDelivered() {
        const session = DB.findOne('current_session', {});
        if (!session) {
            this.showToast('Please log in as Customer first!', 'warning');
            return;
        }
        const userId = session.user_id;
        const orders = DB.find('orders', { user_id: userId });
        
        if (orders.length === 0) {
            this.showToast('No active orders found to update.', 'warning');
            return;
        }

        let count = 0;
        orders.forEach(order => {
            if (order.order_status !== 'CANCELLED' && order.order_status !== 'DELIVERED') {
                DB.update('orders', order.order_id, { order_status: 'DELIVERED', payment_status: 'SUCCESS' });
                
                const items = DB.find('order_items', { order_id: order.order_id });
                items.forEach(item => {
                    DB.update('order_items', item.order_item_id, { item_status: 'DELIVERED' });
                });

                DB.insert('order_status_history', {
                    order_id: order.order_id,
                    status: 'DELIVERED',
                    changed_by: 'SYSTEM',
                    changed_at: new Date().toISOString(),
                    notes: 'Order marked delivered via developer Sandbox Panel.'
                });
                count++;
            }
        });

        this.showToast(`Updated ${count} orders to DELIVERED!`, 'success');
        setTimeout(() => { window.location.reload(); }, 800);
    },

    // Clear cart and wishlist items helper
    devClearTransient() {
        const session = DB.findOne('current_session', {});
        const userId = session ? session.user_id : 'guest';

        // Clear cart with reservation releases
        if (typeof Cart !== 'undefined') {
            Cart.clearCart();
        } else {
            const items = DB.find('cart_items', { user_id: userId });
            items.forEach(item => DB.remove('cart_items', item.cart_item_id));
        }

        // Clear wishlist
        const wishes = DB.find('wishlists', { user_id: userId });
        wishes.forEach(item => DB.remove('wishlists', item.wishlist_id));

        this.showToast('Cleared cart and wishlist items.', 'info');
        setTimeout(() => { window.location.reload(); }, 600);
    },

    // 7. Auto-pilot guided flows engine
    startAutopilot(flowName) {
        localStorage.setItem('ecom_autopilot', JSON.stringify({ flow: flowName, step: 1 }));
        this.showToast('Starting Auto-Pilot Demo...', 'info');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    },

    stopAutopilot() {
        localStorage.removeItem('ecom_autopilot');
        this.showToast('Auto-Pilot Stopped.', 'info');
        const banner = document.getElementById('dev-autopilot-banner');
        if (banner) banner.remove();
        document.body.style.marginTop = '';
        setTimeout(() => { window.location.reload(); }, 600);
    },

    injectAutopilotBanner(flowName, stepDesc) {
        let banner = document.getElementById('dev-autopilot-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'dev-autopilot-banner';
            banner.style.position = 'fixed';
            banner.style.top = '0';
            banner.style.left = '0';
            banner.style.width = '100%';
            banner.style.backgroundColor = '#7c3aed'; // Purple theme for automation
            banner.style.color = 'white';
            banner.style.padding = '10px 20px';
            banner.style.zIndex = '10000';
            banner.style.display = 'flex';
            banner.style.justifyContent = 'space-between';
            banner.style.alignItems = 'center';
            banner.style.fontFamily = 'var(--font)';
            banner.style.boxShadow = 'var(--shadow-md)';
            banner.style.fontSize = '13px';
            banner.style.fontWeight = '600';
            document.body.appendChild(banner);
        }
        banner.innerHTML = `
            <span>🚀 AUTO-PILOT DEMO: <span style="text-transform:uppercase; color:#ede9fe; font-weight:700;">${flowName.replace('_', ' ')}</span> &mdash; ${stepDesc}</span>
            <button onclick="UI.stopAutopilot()" style="background-color:#991b1b; color:white; border:none; padding:4px 10px; border-radius:var(--radius-sm); font-size:11px; font-weight:600; cursor:pointer;">Stop Demo</button>
        `;
        document.body.style.marginTop = '42px';
    },

    runAutopilotStep(run) {
        const path = window.location.pathname;
        
        if (run.flow === 'BUY_FLOW') {
            if (run.step === 1) {
                this.injectAutopilotBanner(run.flow, 'Checking user session status...');
                const session = DB.findOne('current_session', {});
                const user = session ? DB.findById('users', session.user_id) : null;
                
                setTimeout(() => {
                    if (user && user.user_type === 'CUSTOMER') {
                        // Already Customer, go to products PLP grid
                        run.step = 3;
                        localStorage.setItem('ecom_autopilot', JSON.stringify(run));
                        window.location.href = 'products.html';
                    } else {
                        // Sign out guest/other and login Customer
                        DB.clear('current_session');
                        run.step = 2;
                        localStorage.setItem('ecom_autopilot', JSON.stringify(run));
                        window.location.href = 'login.html';
                    }
                }, 1500);
            }
            else if (run.step === 2 && path.endsWith('login.html')) {
                this.injectAutopilotBanner(run.flow, 'Logging in as Customer (Rahul Sharma)...');
                setTimeout(() => {
                    const emailInput = document.getElementById('login-email');
                    const passwordInput = document.getElementById('login-password');
                    const submitBtn = document.getElementById('login-submit-btn');
                    
                    if (emailInput && passwordInput && submitBtn) {
                        emailInput.value = 'customer@ecom.com';
                        passwordInput.value = 'password123';
                        this.showToast('Autofilled login credentials...', 'info');
                        
                        setTimeout(() => {
                            run.step = 3;
                            localStorage.setItem('ecom_autopilot', JSON.stringify(run));
                            submitBtn.click();
                        }, 1200);
                    }
                }, 1000);
            }
            else if (run.step === 3 && path.endsWith('products.html')) {
                this.injectAutopilotBanner(run.flow, 'Exploring catalog & selecting item...');
                setTimeout(() => {
                    const productCard = document.querySelector('a[href^="product-detail.html"]');
                    if (productCard) {
                        this.showToast('Scrolling to selected product card...', 'info');
                        productCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        
                        setTimeout(() => {
                            run.step = 4;
                            localStorage.setItem('ecom_autopilot', JSON.stringify(run));
                            productCard.click();
                        }, 1500);
                    } else {
                        this.showToast('Product cards not found on shop. Stopping autopilot.', 'danger');
                        this.stopAutopilot();
                    }
                }, 1500);
            }
            else if (run.step === 4 && path.endsWith('product-detail.html')) {
                this.injectAutopilotBanner(run.flow, 'Viewing details & adding variant to Cart...');
                setTimeout(() => {
                    const addToCartBtn = document.getElementById('add-to-cart-btn');
                    if (addToCartBtn) {
                        addToCartBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        this.showToast('Clicking Add to Cart...', 'info');
                        
                        setTimeout(() => {
                            addToCartBtn.click();
                            
                            setTimeout(() => {
                                run.step = 5;
                                localStorage.setItem('ecom_autopilot', JSON.stringify(run));
                                window.location.href = 'cart.html';
                            }, 1500);
                        }, 1500);
                    } else {
                        this.showToast('Add to Cart button missing, stopping.', 'danger');
                        this.stopAutopilot();
                    }
                }, 1500);
            }
            else if (run.step === 5 && path.endsWith('cart.html')) {
                this.injectAutopilotBanner(run.flow, 'Opening Cart & applying coupon savings...');
                setTimeout(() => {
                    const couponToggleBtn = document.getElementById('coupon-accordion-btn');
                    const couponInput = document.getElementById('coupon-code-input');
                    const applyBtn = document.getElementById('apply-coupon-btn');
                    
                    if (couponToggleBtn && couponInput && applyBtn) {
                        // Open collapsible drawer
                        couponToggleBtn.click();
                        
                        setTimeout(() => {
                            couponInput.value = 'SAVE100';
                            this.showToast('Applying promo coupon SAVE100...', 'info');
                            
                            setTimeout(() => {
                                applyBtn.click();
                                
                                setTimeout(() => {
                                    const checkoutBtn = document.getElementById('checkout-proceed-btn');
                                    if (checkoutBtn) {
                                        this.showToast('Proceeding to Checkout page...', 'info');
                                        checkoutBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        
                                        setTimeout(() => {
                                            run.step = 6;
                                            localStorage.setItem('ecom_autopilot', JSON.stringify(run));
                                            checkoutBtn.click();
                                        }, 1800);
                                    }
                                }, 1800);
                            }, 1200);
                        }, 1000);
                    } else {
                        const checkoutBtn = document.getElementById('checkout-proceed-btn');
                        if (checkoutBtn) {
                            checkoutBtn.click();
                            run.step = 6;
                            localStorage.setItem('ecom_autopilot', JSON.stringify(run));
                        }
                    }
                }, 1500);
            }
            else if (run.step === 6 && path.endsWith('checkout.html')) {
                this.injectAutopilotBanner(run.flow, 'Submitting delivery address & simulating payment...');
                setTimeout(() => {
                    const placeOrderBtn = document.getElementById('place-order-submit-btn');
                    if (placeOrderBtn) {
                        placeOrderBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        this.showToast('Simulating UPI secure gateway...', 'info');
                        
                        setTimeout(() => {
                            run.step = 7;
                            localStorage.setItem('ecom_autopilot', JSON.stringify(run));
                            placeOrderBtn.click();
                        }, 2000);
                    } else {
                        this.showToast('Checkout buttons missing. stopping.', 'danger');
                        this.stopAutopilot();
                    }
                }, 1500);
            }
            else if (run.step === 7 && path.endsWith('order-detail.html')) {
                this.injectAutopilotBanner(run.flow, 'Simulated Purchase completed successfully!');
                localStorage.removeItem('ecom_autopilot');
                document.body.style.marginTop = '';
                
                setTimeout(() => {
                    const banner = document.getElementById('dev-autopilot-banner');
                    if (banner) banner.remove();
                    
                    this.showModal({
                        title: '🚀 Auto-Pilot Success!',
                        bodyHTML: `
                            <p style="margin-bottom:12px;"><strong>Congratulations!</strong> The end-to-end automated purchase flow has completed successfully.</p>
                            <ul style="padding-left:20px; font-size:13px; line-height:1.6; color:var(--text-muted); margin-bottom:16px;">
                                <li>Logged in as Customer account</li>
                                <li>Scrolled and selected product variant</li>
                                <li>Reserved stock and added to Cart</li>
                                <li>Applied discount coupon code</li>
                                <li>Submitted checkout & simulated payments</li>
                                <li>Created orders timeline tracker</li>
                            </ul>
                            <p style="font-size:12px;">You can now view your order details, tracking logs, and write reviews!</p>
                        `,
                        primaryText: 'Awesome, Got It!',
                        secondaryText: 'Close',
                        onConfirm: () => {}
                    });
                }, 1000);
            }
        }
    }
};

// Autoload header, footer and devtools on content load
window.addEventListener('DOMContentLoaded', () => {
    UI.injectSharedHeaderAndFooter();
    UI.injectDevToolsWidget();
    
    // Check if Autopilot is active
    const autopilot = localStorage.getItem('ecom_autopilot');
    if (autopilot) {
        try {
            const run = JSON.parse(autopilot);
            UI.runAutopilotStep(run);
        } catch (e) {
            localStorage.removeItem('ecom_autopilot');
        }
    }
});

window.UI = UI; // Global visibility
