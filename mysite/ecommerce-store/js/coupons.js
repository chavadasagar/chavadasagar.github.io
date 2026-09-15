/**
 * coupons.js - Promo coupon validations and tracking logs
 * Hinglish comments: Coupons apply karne, expiry validation, min purchase requirements, aur usage limit checking logic.
 */

const Coupons = {
    // 1. Validate a coupon code for checkout
    // Hinglish comment: Coupon validity parameters (date, order minimum, aur usage limit) yaha checked hote hain.
    validate(couponCode, orderSubtotal, userId) {
        if (!couponCode) return { valid: false, message: 'Please enter a coupon code.' };
        
        const coupons = DB.get('coupons');
        const coupon = coupons.find(c => c.coupon_code.toUpperCase() === couponCode.trim().toUpperCase());
        
        if (!coupon) {
            return { valid: false, message: 'Invalid coupon code. Please try another.' };
        }

        if (!coupon.is_active) {
            return { valid: false, message: 'This coupon is no longer active.' };
        }

        // Validate date ranges
        const now = new Date();
        const start = new Date(coupon.valid_from);
        const end = new Date(coupon.valid_until);

        if (now < start) {
            return { valid: false, message: 'This coupon promotion has not started yet.' };
        }
        if (now > end) {
            return { valid: false, message: 'This coupon code has expired.' };
        }

        // Validate minimum order purchase threshold
        if (orderSubtotal < coupon.min_order_value) {
            return {
                valid: false,
                message: `Minimum order value to apply this coupon is ${UI.formatCurrency(coupon.min_order_value)}.`
            };
        }

        // Validate total global usage limits
        const totalUsages = DB.find('coupon_usage', { coupon_id: coupon.coupon_id });
        if (totalUsages.length >= coupon.total_usage_limit) {
            return { valid: false, message: 'This coupon limit has been fully claimed.' };
        }

        // Validate individual user usage limits (only if logged in)
        if (userId && userId !== 'guest') {
            const userUsages = DB.find('coupon_usage', { coupon_id: coupon.coupon_id, user_id: parseInt(userId) });
            if (userUsages.length >= coupon.usage_limit_per_user) {
                return {
                    valid: false,
                    message: `You have reached the maximum usage limit (${coupon.usage_limit_per_user}) for this coupon.`
                };
            }
        }

        return { valid: true, coupon: coupon };
    },

    // Retrieve active list of coupons
    getActiveCoupons() {
        const now = new Date();
        return DB.find('coupons', c => 
            c.is_active && 
            new Date(c.valid_from) <= now && 
            new Date(c.valid_until) >= now
        );
    }
};

window.Coupons = Coupons; // Global visibility
