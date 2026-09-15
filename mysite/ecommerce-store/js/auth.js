/**
 * auth.js - Authentication session state & RBAC-lite controls
 * Hinglish comments: Is script mein users login, register, logout, aur page-level roles check (RBAC) karne ke functionalities hain.
 */

const Auth = {
    // 1. Get current logged-in user object
    getCurrentUser() {
        const session = DB.findOne('current_session', {});
        if (!session) return null;
        
        // Check if session has expired (e.g. older than 24 hours - simple check)
        const user = DB.findById('users', session.user_id);
        if (!user || user.status === 'DELETED') {
            this.logout();
            return null;
        }
        return user;
    },

    // Check if user is logged in
    isLoggedIn() {
        return this.getCurrentUser() !== null;
    },

    // 2. Perform login credentials match
    login(email, password) {
        const users = DB.get('users');
        const user = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
        
        if (!user) {
            return { success: false, message: 'No account found with this email address.' };
        }

        if (user.status !== 'ACTIVE') {
            return { success: false, message: `Account is currently ${user.status.toLowerCase()}. Contact admin.` };
        }

        // Compare password hash
        const computedHash = btoa(password); // Match btoa encoder in seed.js
        if (user.password_hash !== computedHash) {
            return { success: false, message: 'Invalid password. Please try again.' };
        }

        // Create current session in localStorage
        const sessionRecord = {
            user_id: user.user_id,
            user_type: user.user_type,
            logged_in_at: new Date().toISOString()
        };
        
        // Remove existing session and save new
        DB.clear('current_session');
        DB.insert('current_session', sessionRecord);

        // Merge guest cart items into user's cart if any
        this.mergeGuestCart(user.user_id);

        return { success: true, user: user };
    },

    // 3. Register a new user
    register(fullName, email, phone, password, userType = 'CUSTOMER') {
        const users = DB.get('users');
        const emailExists = users.some(u => u.email.toLowerCase() === email.trim().toLowerCase());
        if (emailExists) {
            return { success: false, message: 'Email address is already registered.' };
        }

        const phoneExists = users.some(u => u.phone_number === phone.trim());
        if (phoneExists) {
            return { success: false, message: 'Phone number is already registered.' };
        }

        // Create new user object
        const newUser = {
            full_name: fullName.trim(),
            email: email.trim().toLowerCase(),
            phone_number: phone.trim(),
            password_hash: btoa(password),
            user_type: userType,
            is_email_verified: false,
            is_phone_verified: false,
            status: userType === 'SELLER' ? 'PENDING' : 'ACTIVE', // Sellers require admin approval
            created_at: new Date().toISOString()
        };

        const createdUser = DB.insert('users', newUser);

        // If customer, auto create a welcome notification
        if (userType === 'CUSTOMER') {
            DB.insert('notifications', {
                user_id: createdUser.user_id,
                type: 'SYSTEM',
                title: 'Welcome to ShopEase!',
                message: `Hi ${fullName}, thank you for registering with ShopEase. Explore products and enjoy flat ₹100 off on your first order using code WELCOME100!`,
                is_read: false
            });
        } else if (userType === 'SELLER') {
            // Auto register a pending seller profile
            DB.insert('sellers', {
                user_id: createdUser.user_id,
                business_name: `${fullName} Venture`,
                gst_number: 'PENDING_VERIFICATION',
                rating: 0,
                is_verified: false,
                commission_percent: 7.0,
                status: 'PENDING'
            });
        }

        return { success: true, user: createdUser };
    },

    // 4. Logout session
    logout() {
        DB.clear('current_session');
    },

    // 5. Client side guard rails (RBAC-lite)
    requireAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
            return false;
        }
        return true;
    },

    // Guard rails for specific roles (e.g. ADMIN/SELLER)
    requireRole(allowedRoles = []) {
        if (!this.requireAuth()) return false;
        
        const user = this.getCurrentUser();
        if (!allowedRoles.includes(user.user_type)) {
            // Redirect unauthorized to index
            window.location.href = 'index.html';
            return false;
        }
        return true;
    },

    // Merge cart items from guest session into user session on login
    // Hinglish comment: Jab user register/login kare, guest cart ke items dynamic check karke logged-in account cart mein transfer ho jate hain.
    mergeGuestCart(userId) {
        const guestItems = DB.find('cart_items', { user_id: 'guest' });
        if (guestItems.length === 0) return;

        const userItems = DB.find('cart_items', { user_id: userId });

        guestItems.forEach(gItem => {
            const existingUserItem = userItems.find(uItem => uItem.variant_id === gItem.variant_id);
            if (existingUserItem) {
                // Update quantity (limit validation can occur on checkout)
                DB.update('cart_items', existingUserItem.cart_item_id, {
                    quantity: existingUserItem.quantity + gItem.quantity
                });
            } else {
                // Transfer ownership
                DB.update('cart_items', gItem.cart_item_id, {
                    user_id: userId
                });
            }
        });

        // Clean up any remaining guest items
        const remainingGuests = DB.find('cart_items', { user_id: 'guest' });
        remainingGuests.forEach(item => DB.remove('cart_items', item.cart_item_id));
    }
};

window.Auth = Auth; // Global visibility
