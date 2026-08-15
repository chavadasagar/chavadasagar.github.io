/**
 * main.js - Global App Entry point and Page Coordinate
 * Hinglish comments: Tab-to-tab sync, profile role route-guards checking aur global search handlers yaha load hote hain.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialise database keys
    DB.init();

    // 2. Validate routing page access requirements (Page Route Guards)
    checkPageRouteGuards();

    // 3. Sync updates on storage changes (Cross-tab synchronisation)
    // Hinglish comment: Jab kisi dusre tab me cart/wishlist change ho, badges aur lists live update ho jati hain.
    window.addEventListener('storage', (e) => {
        if (e.key && e.key.startsWith('ecom_')) {
            if (typeof UI !== 'undefined' && UI.updateNavBadges) {
                UI.updateNavBadges();
            }
        }
    });

    // 4. Setup search input enter hooks
    setupSearchInterceptors();
});

// Check access permission for admin/seller dash pages
function checkPageRouteGuards() {
    const path = window.location.pathname;
    
    if (path.endsWith('seller-dashboard.html')) {
        if (typeof Auth !== 'undefined') {
            Auth.requireRole(['SELLER']);
        }
    } else if (path.endsWith('admin-dashboard.html')) {
        if (typeof Auth !== 'undefined') {
            Auth.requireRole(['ADMIN']);
        }
    } else if (path.endsWith('profile.html') || path.endsWith('orders.html') || path.endsWith('checkout.html') || path.endsWith('wishlist.html')) {
        if (typeof Auth !== 'undefined') {
            Auth.requireAuth();
        }
    }
}

// Redirect or capture search events from desktop
function setupSearchInterceptors() {
    const searchForm = document.getElementById('desktop-search-form');
    const searchInput = document.getElementById('desktop-search-input');
    
    if (searchForm && searchInput) {
        searchForm.onsubmit = (e) => {
            const query = searchInput.value.trim();
            if (!query) {
                e.preventDefault();
                return false;
            }
        };
    }
}
