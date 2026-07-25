/**
 * seed.js - Seeding dummy data on first run
 * Hinglish comments: Yaha initial dummy database set-up ho raha hai.
 */

const SEED = {
    // Check if seeding is required (e.g. no products or users exist)
    shouldSeed() {
        const products = DB.get('products');
        const users = DB.get('users');
        return !products || products.length === 0 || !users || users.length === 0;
    },

    // Password simple encode for demo
    hashPassword(password) {
        return btoa(password); // Simple Base64 for demo purposes only
    },

    run() {
        console.log('Seeding initial data...');
        
        // 1. Seed Users (Admin, Seller, Customer)
        const users = [
            {
                user_id: 1,
                full_name: 'System Admin',
                email: 'admin@ecom.com',
                phone_number: '9876543210',
                password_hash: this.hashPassword('password123'),
                user_type: 'ADMIN',
                is_email_verified: true,
                is_phone_verified: true,
                status: 'ACTIVE',
                created_at: new Date().toISOString()
            },
            {
                user_id: 2,
                full_name: 'TechCorp Electronics',
                email: 'seller@ecom.com',
                phone_number: '9876543211',
                password_hash: this.hashPassword('password123'),
                user_type: 'SELLER',
                is_email_verified: true,
                is_phone_verified: true,
                status: 'ACTIVE',
                created_at: new Date().toISOString()
            },
            {
                user_id: 3,
                full_name: 'Rahul Sharma',
                email: 'customer@ecom.com',
                phone_number: '9876543212',
                password_hash: this.hashPassword('password123'),
                user_type: 'CUSTOMER',
                is_email_verified: true,
                is_phone_verified: true,
                status: 'ACTIVE',
                created_at: new Date().toISOString()
            }
        ];
        DB.save('users', users);

        // Update meta counter for users
        this.updateMeta('users', 3);

        // 2. Seed User Address
        const addresses = [
            {
                address_id: 1,
                user_id: 3,
                address_type: 'HOME',
                recipient_name: 'Rahul Sharma',
                phone_number: '9876543212',
                address_line1: 'Flat 402, Block C, Royal Residency',
                address_line2: 'Sector 62',
                city: 'Noida',
                state: 'Uttar Pradesh',
                pincode: '201301',
                country: 'India',
                is_default: true
            },
            {
                address_id: 2,
                user_id: 3,
                address_type: 'OFFICE',
                recipient_name: 'Rahul Sharma',
                phone_number: '9988776655',
                address_line1: 'Tech Solutions Ltd, 5th Floor, Tower B',
                address_line2: 'IT Park Phase 2',
                city: 'Noida',
                state: 'Uttar Pradesh',
                pincode: '201305',
                country: 'India',
                is_default: false
            }
        ];
        DB.save('addresses', addresses);
        this.updateMeta('addresses', 2);

        // 3. Seed Categories
        const categories = [
            { category_id: 1, parent_category_id: null, category_name: 'Electronics & Gadgets', slug: 'electronics', description: 'Phones, audio, accessories', image_url: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=150&auto=format&fit=crop', is_active: true, display_order: 1 },
            { category_id: 2, parent_category_id: null, category_name: 'Fashion & Apparel', slug: 'fashion', description: 'Jackets, T-Shirts and styling', image_url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=150&auto=format&fit=crop', is_active: true, display_order: 2 },
            { category_id: 3, parent_category_id: null, category_name: 'Home & Kitchen', slug: 'home-kitchen', description: 'Fittings, furniture, tools', image_url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=150&auto=format&fit=crop', is_active: true, display_order: 3 },
            { category_id: 4, parent_category_id: null, category_name: 'Beauty & Personal Care', slug: 'beauty', description: 'Skincare and beauty accessories', image_url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=150&auto=format&fit=crop', is_active: true, display_order: 4 }
        ];
        DB.save('categories', categories);
        this.updateMeta('categories', 4);

        // 4. Seed Brands
        const brands = [
            { brand_id: 1, brand_name: 'TechCorp', logo_url: '', is_active: true },
            { brand_id: 2, brand_name: 'StyleCo', logo_url: '', is_active: true },
            { brand_id: 3, brand_name: 'HomeComfort', logo_url: '', is_active: true },
            { brand_id: 4, brand_name: 'GlowBeauty', logo_url: '', is_active: true }
        ];
        DB.save('brands', brands);
        this.updateMeta('brands', 4);

        // 5. Seed Sellers
        const sellers = [
            {
                seller_id: 1,
                user_id: 2,
                business_name: 'TechCorp Electronics Ltd',
                gst_number: '07AAAAA1111A1Z1',
                rating: 4.8,
                is_verified: true,
                commission_percent: 5.0,
                status: 'ACTIVE'
            },
            {
                seller_id: 2,
                user_id: 2, // Map to seller user for ease of demo
                business_name: 'StyleCo Apparel',
                gst_number: '07BBBBB2222B2Z2',
                rating: 4.2,
                is_verified: true,
                commission_percent: 8.0,
                status: 'ACTIVE'
            },
            {
                seller_id: 3,
                user_id: 2,
                business_name: 'HomeComfort Logistics',
                gst_number: '07CCCCC3333C3Z3',
                rating: 4.5,
                is_verified: true,
                commission_percent: 6.0,
                status: 'ACTIVE'
            }
        ];
        DB.save('sellers', sellers);
        this.updateMeta('sellers', 3);

        // 6. Seed Products
        const products = [
            // Electronics
            { product_id: 1, seller_id: 1, category_id: 1, brand_id: 1, product_name: 'Smartphone Pro 5G', slug: 'smartphone-pro-5g', description: 'Experience lightning-fast speeds with the all-new Smartphone Pro 5G. Packed with 120Hz AMOLED Screen, flagship processor, and a professional 108MP primary camera system.', base_price: 44999, is_active: true, status: 'APPROVED', avg_rating: 4.5, total_reviews: 2, created_at: new Date().toISOString() },
            { product_id: 2, seller_id: 1, category_id: 1, brand_id: 1, product_name: 'Wireless Earbuds X1', slug: 'wireless-earbuds-x1', description: 'True wireless stereo earbuds featuring active noise cancellation (ANC), IPX5 sweat resistance, and 30-hour combined playback battery life.', base_price: 1999, is_active: true, status: 'APPROVED', avg_rating: 4.2, total_reviews: 1, created_at: new Date().toISOString() },
            { product_id: 3, seller_id: 1, category_id: 1, brand_id: 1, product_name: 'Noise-Cancelling Headphones', slug: 'noise-cancelling-headphones', description: 'Over-ear studio-quality headphones offering premium comfort, 40dB ambient sound isolation, and high-fidelity Hi-Res Audio driver configurations.', base_price: 12999, is_active: true, status: 'APPROVED', avg_rating: 0, total_reviews: 0, created_at: new Date().toISOString() },
            
            // Fashion
            { product_id: 4, seller_id: 2, category_id: 2, brand_id: 2, product_name: 'Classic Denim Jacket', slug: 'classic-denim-jacket', description: 'Timeless denim jacket styled in premium rugged cotton canvas. Perfect for layering and all-season streetwear aesthetics.', base_price: 1799, is_active: true, status: 'APPROVED', avg_rating: 4.8, total_reviews: 1, created_at: new Date().toISOString() },
            { product_id: 5, seller_id: 2, category_id: 2, brand_id: 2, product_name: 'Casual Cotton T-Shirt', slug: 'casual-cotton-t-shirt', description: 'Regular fit t-shirt knitted with 100% organic long-staple cotton fibers. Lightweight, breathable, and pre-shrunk.', base_price: 499, is_active: true, status: 'APPROVED', avg_rating: 4.0, total_reviews: 1, created_at: new Date().toISOString() },
            
            // Home & Kitchen
            { product_id: 6, seller_id: 3, category_id: 3, brand_id: 3, product_name: 'Ergonomic Office Chair', slug: 'ergonomic-office-chair', description: 'High-back mesh workspace chair with adjustable lumbar support, 3D armrests, dynamic tilt mechanism, and heavy-duty steel base wheels.', base_price: 6999, is_active: true, status: 'APPROVED', avg_rating: 4.6, total_reviews: 1, created_at: new Date().toISOString() },
            { product_id: 7, seller_id: 3, category_id: 3, brand_id: 3, product_name: 'Compact Electric Kettle', slug: 'compact-electric-kettle', description: '1.5-Liter double-wall stainless steel electric kettle. Equips rapid boil technology, automatic shut-off safety, and dry-boil safety protection.', base_price: 1199, is_active: true, status: 'APPROVED', avg_rating: 0, total_reviews: 0, created_at: new Date().toISOString() },
            
            // Beauty
            { product_id: 8, seller_id: 3, category_id: 4, brand_id: 4, product_name: 'Hydrating Face Serum', slug: 'hydrating-face-serum', description: 'Nourishing facial essence formulated with 2% Pure Hyaluronic Acid and Vitamin B5. Moisturizes skin barrier, enhances texture, and yields visible glow.', base_price: 599, is_active: true, status: 'APPROVED', avg_rating: 5.0, total_reviews: 1, created_at: new Date().toISOString() },
            { product_id: 9, seller_id: 3, category_id: 4, brand_id: 4, product_name: 'Matte Red Lipstick', slug: 'matte-red-lipstick', description: 'Long-lasting hydrating matte liquid lipstick in ruby red shade. Smudge-proof and lightweight for comfortable 12-hour wear.', base_price: 399, is_active: true, status: 'APPROVED', avg_rating: 0, total_reviews: 0, created_at: new Date().toISOString() }
        ];
        DB.save('products', products);
        this.updateMeta('products', 9);

        // 7. Seed Variants
        const variants = [
            // Smartphone Pro 5G Variants (Product ID 1)
            { variant_id: 1, product_id: 1, sku: 'PH-SP5G-128B', variant_name: '128GB Storage - Obsidian Black', price: 49999, discount_price: 44999, weight_grams: 188, is_active: true },
            { variant_id: 2, product_id: 1, sku: 'PH-SP5G-256G', variant_name: '256GB Storage - Regal Gold', price: 59999, discount_price: 54999, weight_grams: 192, is_active: true },
            
            // Wireless Earbuds Variants (Product ID 2)
            { variant_id: 3, product_id: 2, sku: 'AU-WE1-BLK', variant_name: 'Charcoal Black', price: 2999, discount_price: 1999, weight_grams: 48, is_active: true },
            { variant_id: 4, product_id: 2, sku: 'AU-WE1-WHT', variant_name: 'Arctic White', price: 2999, discount_price: 2199, weight_grams: 48, is_active: true },
            
            // Headphones Variants (Product ID 3)
            { variant_id: 5, product_id: 3, sku: 'AU-NCH-BLK', variant_name: 'Stealth Black Standard', price: 14999, discount_price: 12999, weight_grams: 280, is_active: true },
            
            // Denim Jacket Variants (Product ID 4)
            { variant_id: 6, product_id: 4, sku: 'AP-CDJ-MEDU', variant_name: 'Indigo Blue - Size M', price: 2499, discount_price: 1799, weight_grams: 650, is_active: true },
            { variant_id: 7, product_id: 4, sku: 'AP-CDJ-LRGE', variant_name: 'Indigo Blue - Size L', price: 2499, discount_price: 1799, weight_grams: 680, is_active: true },
            { variant_id: 8, product_id: 4, sku: 'AP-CDJ-CBLK', variant_name: 'Charcoal Black - Size M', price: 2699, discount_price: 1999, weight_grams: 650, is_active: true },
            
            // Cotton T-Shirt Variants (Product ID 5)
            { variant_id: 9, product_id: 5, sku: 'AP-CCT-REDM', variant_name: 'Crimson Red - Size M', price: 799, discount_price: 499, weight_grams: 160, is_active: true },
            { variant_id: 10, product_id: 5, sku: 'AP-CCT-BLUL', variant_name: 'Navy Blue - Size L', price: 799, discount_price: 499, weight_grams: 170, is_active: true },
            
            // Office Chair Variants (Product ID 6)
            { variant_id: 11, product_id: 6, sku: 'HM-EOC-SGRY', variant_name: 'Space Grey Edition', price: 8999, discount_price: 6999, weight_grams: 14000, is_active: true },
            { variant_id: 12, product_id: 6, sku: 'HM-EOC-BLK', variant_name: 'Stealth Black Edition', price: 8999, discount_price: 7199, weight_grams: 14000, is_active: true },
            
            // Kettle Variants (Product ID 7)
            { variant_id: 13, product_id: 7, sku: 'HM-CEK-SILV', variant_name: 'Brushed Silver 1.5L', price: 1499, discount_price: 1199, weight_grams: 850, is_active: true },
            
            // Face Serum Variants (Product ID 8)
            { variant_id: 14, product_id: 8, sku: 'BY-HFS-50ML', variant_name: 'Standard Glass Bottle 50ml', price: 799, discount_price: 599, weight_grams: 110, is_active: true },
            
            // Lipstick Variants (Product ID 9)
            { variant_id: 15, product_id: 9, sku: 'BY-MRL-RUBY', variant_name: 'Ruby Rush Matte', price: 499, discount_price: 399, weight_grams: 28, is_active: true }
        ];
        DB.save('product_variants', variants);
        this.updateMeta('product_variants', 15);

        // 8. Seed Product Images
        const images = [
            { image_id: 1, variant_id: 1, image_url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&auto=format&fit=crop', is_primary: true, display_order: 1 },
            { image_id: 2, variant_id: 2, image_url: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500&auto=format&fit=crop', is_primary: true, display_order: 1 },
            { image_id: 3, variant_id: 3, image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&auto=format&fit=crop', is_primary: true, display_order: 1 },
            { image_id: 4, variant_id: 4, image_url: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f4f?w=500&auto=format&fit=crop', is_primary: true, display_order: 1 },
            { image_id: 5, variant_id: 5, image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop', is_primary: true, display_order: 1 },
            { image_id: 6, variant_id: 6, image_url: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500&auto=format&fit=crop', is_primary: true, display_order: 1 },
            { image_id: 7, variant_id: 7, image_url: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500&auto=format&fit=crop', is_primary: true, display_order: 1 },
            { image_id: 8, variant_id: 8, image_url: 'https://images.unsplash.com/photo-1516257984-b1b4d707412e?w=500&auto=format&fit=crop', is_primary: true, display_order: 1 },
            { image_id: 9, variant_id: 9, image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop', is_primary: true, display_order: 1 },
            { image_id: 10, variant_id: 10, image_url: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=500&auto=format&fit=crop', is_primary: true, display_order: 1 },
            { image_id: 11, variant_id: 11, image_url: 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?w=500&auto=format&fit=crop', is_primary: true, display_order: 1 },
            { image_id: 12, variant_id: 12, image_url: 'https://images.unsplash.com/photo-1580481072645-022f9a6dbf27?w=500&auto=format&fit=crop', is_primary: true, display_order: 1 },
            { image_id: 13, variant_id: 13, image_url: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=500&auto=format&fit=crop', is_primary: true, display_order: 1 },
            { image_id: 14, variant_id: 14, image_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500&auto=format&fit=crop', is_primary: true, display_order: 1 },
            { image_id: 15, variant_id: 15, image_url: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=500&auto=format&fit=crop', is_primary: true, display_order: 1 }
        ];
        DB.save('product_images', images);
        this.updateMeta('product_images', 15);

        // 9. Seed Inventory Stock
        const inventory = [
            { stock_id: 1, variant_id: 1, quantity_available: 12, quantity_reserved: 0, reorder_threshold: 3 },
            { stock_id: 2, variant_id: 2, quantity_available: 8, quantity_reserved: 0, reorder_threshold: 2 },
            { stock_id: 3, variant_id: 3, quantity_available: 25, quantity_reserved: 0, reorder_threshold: 5 },
            { stock_id: 4, variant_id: 4, quantity_available: 14, quantity_reserved: 0, reorder_threshold: 4 },
            { stock_id: 5, variant_id: 5, quantity_available: 10, quantity_reserved: 0, reorder_threshold: 3 },
            { stock_id: 6, variant_id: 6, quantity_available: 18, quantity_reserved: 0, reorder_threshold: 5 },
            { stock_id: 7, variant_id: 7, quantity_available: 20, quantity_reserved: 0, reorder_threshold: 5 },
            { stock_id: 8, variant_id: 8, quantity_available: 9, quantity_reserved: 0, reorder_threshold: 2 },
            { stock_id: 9, variant_id: 9, quantity_available: 35, quantity_reserved: 0, reorder_threshold: 10 },
            { stock_id: 10, variant_id: 10, quantity_available: 30, quantity_reserved: 0, reorder_threshold: 10 },
            { stock_id: 11, variant_id: 11, quantity_available: 6, quantity_reserved: 0, reorder_threshold: 2 },
            { stock_id: 12, variant_id: 12, quantity_available: 8, quantity_reserved: 0, reorder_threshold: 2 },
            { stock_id: 13, variant_id: 13, quantity_available: 16, quantity_reserved: 0, reorder_threshold: 4 },
            { stock_id: 14, variant_id: 14, quantity_available: 45, quantity_reserved: 0, reorder_threshold: 8 },
            { stock_id: 15, variant_id: 15, quantity_available: 50, quantity_reserved: 0, reorder_threshold: 10 }
        ];
        DB.save('inventory_stock', inventory);
        this.updateMeta('inventory_stock', 15);

        // 10. Seed Coupons
        const coupons = [
            {
                coupon_id: 1,
                coupon_code: 'WELCOME100',
                discount_type: 'FLAT',
                discount_value: 100,
                min_order_value: 500,
                max_discount_amount: 100,
                usage_limit_per_user: 1,
                total_usage_limit: 1000,
                valid_from: new Date('2026-01-01').toISOString(),
                valid_until: new Date('2027-12-31').toISOString(),
                is_active: true
            },
            {
                coupon_id: 2,
                coupon_code: 'FESTIVE20',
                discount_type: 'PERCENTAGE',
                discount_value: 20,
                min_order_value: 1000,
                max_discount_amount: 500,
                usage_limit_per_user: 2,
                total_usage_limit: 500,
                valid_from: new Date('2026-01-01').toISOString(),
                valid_until: new Date('2027-12-31').toISOString(),
                is_active: true
            }
        ];
        DB.save('coupons', coupons);
        this.updateMeta('coupons', 2);

        // 11. Seed Reviews (pre-loaded to show avg ratings work)
        const reviews = [
            { review_id: 1, product_id: 1, user_id: 3, order_item_id: 0, rating: 5, title: 'Amazing phone!', comment: 'Camera is unbelievable, battery runs solid 2 days. Highly recommended!', is_verified_purchase: true, created_at: new Date().toISOString() },
            { review_id: 2, product_id: 1, user_id: 3, order_item_id: 0, rating: 4, title: 'Super premium feel', comment: 'Charging gets a bit hot, but screen quality is marvelous.', is_verified_purchase: true, created_at: new Date().toISOString() },
            { review_id: 3, product_id: 2, user_id: 3, order_item_id: 0, rating: 4.2, title: 'Nice sound isolation', comment: 'Battery backup is great but bass is average.', is_verified_purchase: true, created_at: new Date().toISOString() },
            { review_id: 4, product_id: 4, user_id: 3, order_item_id: 0, rating: 5, title: 'Perfect streetwear look', comment: 'Fabric is heavy and feels durable. M fits me perfect.', is_verified_purchase: true, created_at: new Date().toISOString() },
            { review_id: 5, product_id: 5, user_id: 3, order_item_id: 0, rating: 4, title: 'Good basic t-shirt', comment: 'Simple comfort cotton. Great daily wear.', is_verified_purchase: true, created_at: new Date().toISOString() },
            { review_id: 6, product_id: 6, user_id: 3, order_item_id: 0, rating: 5, title: 'Ergonomic savior', comment: 'Helped reduce my back pain during long coding hours.', is_verified_purchase: true, created_at: new Date().toISOString() },
            { review_id: 7, product_id: 8, user_id: 3, order_item_id: 0, rating: 5, title: 'Fades spots really well', comment: 'Using it for 2 weeks, skin feels hydrated and soft.', is_verified_purchase: true, created_at: new Date().toISOString() }
        ];
        DB.save('reviews', reviews);
        this.updateMeta('reviews', 7);

        // 12. Seed Notifications
        const notifications = [
            {
                notification_id: 1,
                user_id: 3,
                type: 'SYSTEM',
                title: 'Welcome to ShopEase!',
                message: 'Explore our catalog and find the best products tailored for you. Use code WELCOME100 for ₹100 flat discount on your first purchase!',
                is_read: false,
                created_at: new Date().toISOString()
            }
        ];
        DB.save('notifications', notifications);
        this.updateMeta('notifications', 1);

        console.log('Seeding completed successfully!');
    },

    updateMeta(entity, value) {
        const metaKey = DB_PREFIX + '_meta';
        try {
            const meta = JSON.parse(localStorage.getItem(metaKey)) || {};
            meta[entity] = value;
            localStorage.setItem(metaKey, JSON.stringify(meta));
        } catch (e) {}
    },

    // Reset database and re-seed
    resetAndReseed() {
        localStorage.clear();
        DB.init();
        this.run();
    }
};

// Auto run on load if database is empty
if (SEED.shouldSeed()) {
    SEED.run();
}

window.SEED = SEED; // Global visibility
