/**
 * reviews.js - Product Reviews & Denormalized Ratings Recalculations
 * Hinglish comments: User reviews post hone par parent product ka average rating dynamic recalculation aur verified purchase badge system.
 */

const Reviews = {
    // 1. Submit a product review and trigger rating denormalization updates
    // Hinglish comment: Review save karne ke baad product table me 'avg_rating' aur 'total_reviews' re-calculate karke save kiye jate hain.
    submitReview({ productId, rating, title, comment }) {
        const user = Auth.getCurrentUser();
        if (!user) return { success: false, message: 'Please log in to submit a review.' };

        productId = parseInt(productId);
        rating = parseFloat(rating);

        if (isNaN(rating) || rating < 1 || rating > 5) {
            return { success: false, message: 'Please select a rating between 1 and 5.' };
        }

        // Limit checking: unique(product_id, user_id)
        const existingReview = DB.findOne('reviews', { product_id: productId, user_id: user.user_id });
        if (existingReview) {
            return { success: false, message: 'You have already submitted a review for this product.' };
        }

        // Verify purchase check: has customer received this product variant in delivered status?
        const customerOrders = DB.find('orders', { user_id: user.user_id, order_status: 'DELIVERED' });
        let isVerifiedPurchase = false;
        let verifiedOrderItemId = null;

        const productVariants = DB.find('product_variants', { product_id: productId });
        const variantIds = productVariants.map(v => v.variant_id);

        for (let order of customerOrders) {
            const orderItems = DB.find('order_items', { order_id: order.order_id });
            const matchingItem = orderItems.find(item => variantIds.includes(item.variant_id));
            if (matchingItem) {
                isVerifiedPurchase = true;
                verifiedOrderItemId = matchingItem.order_item_id;
                break;
            }
        }

        // Add review record
        const newReview = {
            product_id: productId,
            user_id: user.user_id,
            order_item_id: verifiedOrderItemId,
            rating: rating,
            title: title.trim(),
            comment: comment.trim(),
            is_verified_purchase: isVerifiedPurchase,
            created_at: new Date().toISOString()
        };

        DB.insert('reviews', newReview);

        // Denormalized ratings updates on the product record
        // Hinglish comment: Re-calculating avg rating: matching reviews count aur values ka sum le kar calculation dynamic hota hai.
        const productReviews = DB.find('reviews', { product_id: productId });
        const totalReviews = productReviews.length;
        const totalRatingSum = productReviews.reduce((sum, rev) => sum + rev.rating, 0);
        const avgRating = parseFloat((totalRatingSum / totalReviews).toFixed(1));

        DB.update('products', productId, {
            avg_rating: avgRating,
            total_reviews: totalReviews
        });

        // Inject rating alert notification to seller
        const product = DB.findById('products', productId);
        if (product) {
            const seller = DB.findOne('sellers', { seller_id: product.seller_id });
            if (seller) {
                DB.insert('notifications', {
                    user_id: seller.user_id,
                    type: 'SYSTEM',
                    title: 'New Product Review!',
                    message: `Your product "${product.product_name}" received a ${rating}-star review.`,
                    is_read: false
                });
            }
        }

        return {
            success: true,
            message: 'Your review has been submitted successfully!',
            avg_rating: avgRating,
            total_reviews: totalReviews
        };
    },

    // Fetch reviews list for a product (includes user names mapping)
    getProductReviews(productId) {
        productId = parseInt(productId);
        const reviews = DB.find('reviews', { product_id: productId });
        
        return reviews.map(rev => {
            const reviewer = DB.findById('users', rev.user_id);
            return {
                ...rev,
                user_name: reviewer ? reviewer.full_name : 'Anonymous Buyer'
            };
        });
    }
};

window.Reviews = Reviews; // Global visibility
