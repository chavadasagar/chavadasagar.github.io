/**
 * orders.js - Order Placement, Status Updates & Stock Deduction
 * Hinglish comments: Order check-out processing, multi-seller split logic, price snap-shot capture aur inventory cancellation reverse rules yaha hain.
 */

const Orders = {
    // 1. Place a new order from current cart items
    // Hinglish comment: Checkout confirm hone par order items me price snapshot store hota hai aur database stocks deduct ho jate hain.
    placeOrder({ addressId, paymentMethod, couponCode = null }) {
        const user = Auth.getCurrentUser();
        if (!user) return { success: false, message: 'Please log in to place an order.' };

        const cartItems = Cart.getItems();
        if (cartItems.length === 0) {
            return { success: false, message: 'Your cart is empty.' };
        }

        // Validate shipping address
        const address = DB.findById('addresses', addressId);
        if (!address || address.user_id !== user.user_id) {
            return { success: false, message: 'Please select a valid shipping address.' };
        }

        // Address snapshots object mapping
        const addressSnapshot = {
            recipient_name: address.recipient_name,
            phone_number: address.phone_number,
            address_line1: address.address_line1,
            address_line2: address.address_line2,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
            country: address.country,
            address_type: address.address_type
        };

        // Fetch pricing summary details
        const breakdown = Cart.getBreakdown(couponCode);
        if (couponCode && breakdown.couponError) {
            return { success: false, message: 'Coupon error: ' + breakdown.couponError };
        }

        // Verify stock availability one last time (already reserved, but safety check)
        for (let item of cartItems) {
            const stock = DB.findOne('inventory_stock', { variant_id: item.variant_id });
            if (!stock || stock.quantity_available < item.quantity) {
                return {
                    success: false,
                    message: `Product variant "${item.variant ? item.variant.variant_name : 'Item'}" has insufficient stock. Please adjust quantities.`
                };
            }
        }

        // Generate Order number ORD + YEAR + MONTH + DAY + Random 4 digits
        const today = new Date();
        const dateStr = today.getFullYear().toString() +
                        (today.getMonth() + 1).toString().padStart(2, '0') +
                        today.getDate().toString().padStart(2, '0');
        const rand = Math.floor(1000 + Math.random() * 9000);
        const orderNumber = `ORD${dateStr}${rand}`;

        // Create main order record
        const paymentStatus = paymentMethod === 'COD' ? 'PENDING' : 'SUCCESS';
        const newOrder = {
            order_number: orderNumber,
            user_id: user.user_id,
            shipping_address: addressSnapshot,
            order_status: 'PLACED',
            subtotal_amount: breakdown.subtotal,
            discount_amount: breakdown.discount,
            tax_amount: breakdown.tax,
            shipping_charge: breakdown.shipping,
            total_amount: breakdown.total,
            coupon_id: breakdown.coupon ? breakdown.coupon.coupon_id : null,
            payment_status: paymentStatus,
            placed_at: new Date().toISOString()
        };

        const placedOrder = DB.insert('orders', newOrder);

        // Map cart items into order items with price snapshots
        // Hinglish comment: Hum product ka active price snapshot karte hain taaki future products price change purane records affect na kare.
        cartItems.forEach(item => {
            const activePrice = item.variant.discount_price || item.variant.price;
            const orderItem = {
                order_id: placedOrder.order_id,
                variant_id: item.variant_id,
                seller_id: item.product.seller_id,
                product_name_snapshot: `${item.product.product_name} (${item.variant.variant_name})`,
                unit_price_snapshot: activePrice,
                quantity: item.quantity,
                item_total: activePrice * item.quantity,
                item_status: 'PLACED'
            };
            DB.insert('order_items', orderItem);

            // Permanently deduct stock: reduce available and release reserved quantity
            // Hinglish comment: Inventory deduct hoti hai: quantity_available se minus aur quantity_reserved se release.
            const stock = DB.findOne('inventory_stock', { variant_id: item.variant_id });
            if (stock) {
                DB.update('inventory_stock', stock.stock_id, {
                    quantity_available: Math.max(0, stock.quantity_available - item.quantity),
                    quantity_reserved: Math.max(0, stock.quantity_reserved - item.quantity)
                });
            }
        });

        // Save order status audit history logs
        DB.insert('order_status_history', {
            order_id: placedOrder.order_id,
            status: 'PLACED',
            changed_by: 'CUSTOMER',
            changed_at: new Date().toISOString(),
            notes: 'Order placed successfully by customer.'
        });

        // Log Simulated Payment Transaction
        const transactionId = 'TXN' + Math.floor(1000000000 + Math.random() * 9000000000);
        DB.insert('payments', {
            order_id: placedOrder.order_id,
            payment_method: paymentMethod,
            transaction_id: transactionId,
            amount: breakdown.total,
            status: paymentStatus,
            paid_at: paymentStatus === 'SUCCESS' ? new Date().toISOString() : null
        });

        // Record Coupon Usage
        if (breakdown.coupon) {
            DB.insert('coupon_usage', {
                coupon_id: breakdown.coupon.coupon_id,
                user_id: user.user_id,
                order_id: placedOrder.order_id,
                used_at: new Date().toISOString()
            });
        }

        // Add Customer notification
        DB.insert('notifications', {
            user_id: user.user_id,
            type: 'ORDER_UPDATE',
            title: 'Order Placed!',
            message: `Your order ${orderNumber} for ${UI.formatCurrency(breakdown.total)} has been successfully placed.`,
            is_read: false
        });

        // Clear user cart (stock was released and deducted already, clearCart will do nothing more on stock)
        // Clean manually to avoid clearing stock twice
        const items = DB.find('cart_items', { user_id: user.user_id });
        items.forEach(item => DB.remove('cart_items', item.cart_item_id));
        UI.updateNavBadges();

        return { success: true, order_id: placedOrder.order_id, order_number: orderNumber };
    },

    // 2. Cancel order and return inventory stock back
    // Hinglish comment: Agar order deliver nahi hua ho aur cancel kiya jaye, to stock wapas system me add ho jata hai.
    cancelOrder(orderId, reason = 'Cancelled by user') {
        const order = DB.findById('orders', orderId);
        if (!order) return { success: false, message: 'Order not found.' };

        // Allow cancellation only if PLACED or CONFIRMED status
        if (!['PLACED', 'CONFIRMED'].includes(order.order_status)) {
            return { success: false, message: `Cannot cancel order at "${order.order_status}" stage.` };
        }

        // Update main order status
        DB.update('orders', orderId, { order_status: 'CANCELLED' });

        // Update all order items status
        const items = DB.find('order_items', { order_id: orderId });
        items.forEach(item => {
            DB.update('order_items', item.order_item_id, { item_status: 'CANCELLED' });

            // Restore stocks back to inventory
            // Hinglish comment: Inventory update: order cancellation par quantity_available wapas increase hoti hai.
            const stock = DB.findOne('inventory_stock', { variant_id: item.variant_id });
            if (stock) {
                DB.update('inventory_stock', stock.stock_id, {
                    quantity_available: stock.quantity_available + item.quantity
                });
            }
        });

        // Add to history log
        DB.insert('order_status_history', {
            order_id: orderId,
            status: 'CANCELLED',
            changed_by: 'CUSTOMER',
            changed_at: new Date().toISOString(),
            notes: 'Order cancelled: ' + reason
        });

        // Trigger Simulated refund if prepaid
        const payment = DB.findOne('payments', { order_id: orderId });
        if (payment && payment.status === 'SUCCESS') {
            const refundTransaction = 'REF' + Math.floor(1000000000 + Math.random() * 9000000000);
            DB.insert('refunds', {
                payment_id: payment.payment_id,
                order_item_id: null, // Full order refund
                refund_amount: order.total_amount,
                reason: reason,
                status: 'SUCCESS'
            });
        }

        // Notification alert
        DB.insert('notifications', {
            user_id: order.user_id,
            type: 'ORDER_UPDATE',
            title: 'Order Cancelled',
            message: `Your order ${order.order_number} has been cancelled successfully. Refund will reflect soon.`,
            is_read: false
        });

        return { success: true, message: 'Order has been cancelled successfully.' };
    },

    // Fetch order history for customer
    getCustomerOrders() {
        const user = Auth.getCurrentUser();
        if (!user) return [];
        const orders = DB.find('orders', { user_id: user.user_id });
        orders.sort((a, b) => new Date(b.placed_at) - new Date(a.placed_at));
        return orders;
    },

    // Fetch details of a single order
    getOrderDetails(orderId) {
        const order = DB.findById('orders', orderId);
        if (!order) return null;

        const items = DB.find('order_items', { order_id: order.order_id });
        const history = DB.find('order_status_history', { order_id: order.order_id });
        history.sort((a, b) => new Date(a.changed_at) - new Date(b.changed_at));

        const payment = DB.findOne('payments', { order_id: order.order_id });
        const refund = payment ? DB.findOne('refunds', { payment_id: payment.payment_id }) : null;

        return {
            order: order,
            items: items,
            history: history,
            payment: payment,
            refund: refund
        };
    }
};

window.Orders = Orders; // Global visibility
