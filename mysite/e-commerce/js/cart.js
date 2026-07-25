/**
 * cart.js - Cart Management & Stock Reservation Logic
 * Hinglish comments: Cart operations handling ke saath stock reserve (quantity_reserved) aur release karne ke complex rules yaha hain.
 */

const Cart = {
    // Get active user ID for this cart context
    getUserId() {
        const user = Auth.getCurrentUser();
        return user ? user.user_id : 'guest';
    },

    // Get all cart items for current user context
    getItems() {
        const userId = this.getUserId();
        const items = DB.find('cart_items', { user_id: userId });
        
        // Populate with variant details for display convenience
        return items.map(item => {
            const variant = DB.findById('product_variants', item.variant_id);
            const product = variant ? DB.findById('products', variant.product_id) : null;
            const stock = variant ? DB.findOne('inventory_stock', { variant_id: item.variant_id }) : null;
            
            // Get variant primary image
            let image = 'https://placehold.co/150';
            if (variant) {
                const imgRecord = DB.findOne('product_images', { variant_id: item.variant_id, is_primary: true }) 
                                || DB.findOne('product_images', { variant_id: item.variant_id });
                if (imgRecord) image = imgRecord.image_url;
            }

            return {
                ...item,
                variant: variant,
                product: product,
                stock: stock,
                image_url: image
            };
        });
    },

    // 1. Add item to cart and reserve stock simulation
    // Hinglish comment: Item cart mein add hone par inventory stock table me 'quantity_reserved' barha di jati hai.
    addToCart(variantId, quantity = 1) {
        const userId = this.getUserId();
        const parsedVarId = parseInt(variantId);
        
        // Fetch variant and check status
        const variant = DB.findById('product_variants', parsedVarId);
        if (!variant || !variant.is_active) {
            return { success: false, message: 'This product variant is currently unavailable.' };
        }

        // Fetch current stock record
        const stock = DB.findOne('inventory_stock', { variant_id: parsedVarId });
        if (!stock) {
            return { success: false, message: 'Stock information not found for this product.' };
        }

        // Check already added quantity in cart to calculate total demanded
        const existingCartItem = DB.findOne('cart_items', { user_id: userId, variant_id: parsedVarId });
        const existingQty = existingCartItem ? existingCartItem.quantity : 0;
        const totalDemanded = existingQty + quantity;

        // Stock threshold evaluation: Available - Reserved
        const stockAvailableForReservation = stock.quantity_available - stock.quantity_reserved;
        if (stockAvailableForReservation < quantity) {
            return {
                success: false,
                message: `Unable to add. Only ${Math.max(0, stockAvailableForReservation)} item(s) left in stock.`
            };
        }

        // Reserve stock
        DB.update('inventory_stock', stock.stock_id, {
            quantity_reserved: stock.quantity_reserved + quantity
        });

        // Insert or update cart item
        if (existingCartItem) {
            DB.update('cart_items', existingCartItem.cart_item_id, {
                quantity: totalDemanded
            });
        } else {
            DB.insert('cart_items', {
                user_id: userId,
                variant_id: parsedVarId,
                quantity: quantity
            });
        }

        UI.updateNavBadges();
        return { success: true, message: 'Product added to cart successfully!' };
    },

    // 2. Modify cart item quantity and update stock reservation
    // Hinglish comment: Cart quantity update karte waqt extra stock check kiya jata hai aur reservation adjusting diff se update hoti hai.
    updateQuantity(cartItemId, newQuantity) {
        const item = DB.findById('cart_items', cartItemId);
        if (!item) return { success: false, message: 'Cart item not found.' };

        newQuantity = parseInt(newQuantity);
        if (newQuantity <= 0) {
            return this.removeFromCart(cartItemId);
        }

        const stock = DB.findOne('inventory_stock', { variant_id: item.variant_id });
        if (!stock) return { success: false, message: 'Stock not found.' };

        const diff = newQuantity - item.quantity;

        if (diff > 0) {
            // Need to reserve more
            const availableForRes = stock.quantity_available - stock.quantity_reserved;
            if (availableForRes < diff) {
                return {
                    success: false,
                    message: `Cannot increase. Only ${Math.max(0, availableForRes)} more item(s) left in stock.`
                };
            }
            DB.update('inventory_stock', stock.stock_id, {
                quantity_reserved: stock.quantity_reserved + diff
            });
        } else if (diff < 0) {
            // Release some reserved stock
            const absDiff = Math.abs(diff);
            DB.update('inventory_stock', stock.stock_id, {
                quantity_reserved: Math.max(0, stock.quantity_reserved - absDiff)
            });
        }

        DB.update('cart_items', cartItemId, { quantity: newQuantity });
        UI.updateNavBadges();
        return { success: true, message: 'Quantity updated.' };
    },

    // 3. Remove item from cart and release reserved stock
    // Hinglish comment: Item cart se delete hone par uska reserved stock release hokar database table me adjust ho jata hai.
    removeFromCart(cartItemId) {
        const item = DB.findById('cart_items', cartItemId);
        if (!item) return { success: false, message: 'Cart item not found.' };

        // Release reserved stock
        const stock = DB.findOne('inventory_stock', { variant_id: item.variant_id });
        if (stock) {
            DB.update('inventory_stock', stock.stock_id, {
                quantity_reserved: Math.max(0, stock.quantity_reserved - item.quantity)
            });
        }

        DB.remove('cart_items', cartItemId);
        UI.updateNavBadges();
        return { success: true, message: 'Item removed from cart.' };
    },

    // 4. Release all reserved stocks for current user's cart (on logout/clear)
    releaseCartReservation() {
        const userId = this.getUserId();
        const items = DB.find('cart_items', { user_id: userId });
        items.forEach(item => {
            const stock = DB.findOne('inventory_stock', { variant_id: item.variant_id });
            if (stock) {
                DB.update('inventory_stock', stock.stock_id, {
                    quantity_reserved: Math.max(0, stock.quantity_reserved - item.quantity)
                });
            }
        });
    },

    // Clear whole cart
    clearCart() {
        this.releaseCartReservation();
        
        const userId = this.getUserId();
        const items = DB.find('cart_items', { user_id: userId });
        items.forEach(item => {
            DB.remove('cart_items', item.cart_item_id);
        });
        
        UI.updateNavBadges();
    },

    // 5. Calculate cart pricing breakdown
    getBreakdown(couponCode = null) {
        const items = this.getItems();
        let subtotal = 0;

        items.forEach(item => {
            if (item.variant) {
                const activePrice = item.variant.discount_price || item.variant.price;
                subtotal += activePrice * item.quantity;
            }
        });

        // Compute Shipping Fee: Free if subtotal is greater than ₹999, else ₹50
        const shippingCharge = subtotal > 999 || subtotal === 0 ? 0 : 50;

        // Compute Tax: Simple flat 12% GST simulated
        const taxAmount = Math.round(subtotal * 0.12);

        // Apply Coupon Validation if provided
        let discountAmount = 0;
        let couponError = null;
        let couponRecord = null;

        if (couponCode && typeof Coupons !== 'undefined') {
            const userId = this.getUserId();
            const validation = Coupons.validate(couponCode, subtotal, userId);
            if (validation.valid) {
                couponRecord = validation.coupon;
                if (couponRecord.discount_type === 'FLAT') {
                    discountAmount = couponRecord.discount_value;
                } else if (couponRecord.discount_type === 'PERCENTAGE') {
                    discountAmount = Math.round((subtotal * couponRecord.discount_value) / 100);
                    // Cap at max discount limit
                    if (couponRecord.max_discount_amount && discountAmount > couponRecord.max_discount_amount) {
                        discountAmount = couponRecord.max_discount_amount;
                    }
                }
            } else {
                couponError = validation.message;
            }
        }

        const totalAmount = Math.max(0, subtotal - discountAmount + taxAmount + shippingCharge);

        return {
            subtotal: subtotal,
            discount: discountAmount,
            tax: taxAmount,
            shipping: shippingCharge,
            total: totalAmount,
            coupon: couponRecord,
            couponError: couponError
        };
    }
};

window.Cart = Cart; // Global visibility
