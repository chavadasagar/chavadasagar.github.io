/**
 * products.js - Catalog Management & Filter Queries
 * Hinglish comments: Product lists pull karne ke logic, search, category matching, filters, aur sorting functions yaha hain.
 */

const Products = {
    // 1. Fetch all products applying dynamic filters & search queries
    getAll(filters = {}) {
        let products = DB.get('products');
        
        // Soft delete check: only retrieve active and approved items
        products = products.filter(p => p.is_active && p.status === 'APPROVED');

        // Apply Search Term Filter (across product name, brand, seller and description)
        if (filters.q) {
            const query = filters.q.toLowerCase().trim();
            products = products.filter(p => {
                // Find brand name
                const brand = DB.findById('brands', p.brand_id);
                const brandName = brand ? brand.brand_name.toLowerCase() : '';
                
                // Find seller business name
                const seller = DB.findById('sellers', p.seller_id);
                const sellerName = seller ? seller.business_name.toLowerCase() : '';

                return p.product_name.toLowerCase().includes(query) ||
                       p.description.toLowerCase().includes(query) ||
                       brandName.includes(query) ||
                       sellerName.includes(query);
            });
        }

        // Apply Category Filter (supports Category ID or Slug match)
        if (filters.category) {
            const cat = DB.findOne('categories', c => 
                c.category_id === parseInt(filters.category) || 
                c.slug === filters.category
            );
            if (cat) {
                products = products.filter(p => p.category_id === cat.category_id);
            } else {
                return []; // Category listed but not found
            }
        }

        // Apply Brand Filter
        if (filters.brands && filters.brands.length > 0) {
            const brandIds = filters.brands.map(id => parseInt(id));
            products = products.filter(p => brandIds.includes(p.brand_id));
        }

        // Apply Rating Filter (minimum average rating)
        if (filters.minRating) {
            const minRating = parseFloat(filters.minRating);
            products = products.filter(p => p.avg_rating >= minRating);
        }

        // Map primary variants and filter by price range
        let productList = products.map(p => {
            const pVariants = DB.find('product_variants', { product_id: p.product_id, is_active: true });
            
            // If no variants, skip this product in display
            if (pVariants.length === 0) return null;

            // Find lowest price variant for listing summary
            const pricedVariants = pVariants.map(v => ({
                ...v,
                active_price: v.discount_price || v.price
            }));
            
            pricedVariants.sort((a, b) => a.active_price - b.active_price);
            const primaryVariant = pricedVariants[0];

            // Get product images
            const images = DB.find('product_images', { variant_id: primaryVariant.variant_id });
            const primaryImage = images.find(img => img.is_primary) || images[0] || { image_url: 'https://placehold.co/400' };

            // Find brand and seller
            const brand = DB.findById('brands', p.brand_id);
            const seller = DB.findById('sellers', p.seller_id);

            return {
                ...p,
                primary_variant: primaryVariant,
                variants: pricedVariants,
                image_url: primaryImage.image_url,
                brand_name: brand ? brand.brand_name : 'Generic',
                seller_name: seller ? seller.business_name : 'Unknown Seller'
            };
        }).filter(item => item !== null);

        // Apply Price Filter (check active price of primary variant)
        if (filters.minPrice) {
            const min = parseFloat(filters.minPrice);
            productList = productList.filter(item => item.primary_variant.active_price >= min);
        }
        if (filters.maxPrice) {
            const max = parseFloat(filters.maxPrice);
            productList = productList.filter(item => item.primary_variant.active_price <= max);
        }

        // Apply Sorting Algorithms
        if (filters.sort) {
            switch (filters.sort) {
                case 'price-asc':
                    productList.sort((a, b) => a.primary_variant.active_price - b.primary_variant.active_price);
                    break;
                case 'price-desc':
                    productList.sort((a, b) => b.primary_variant.active_price - a.primary_variant.active_price);
                    break;
                case 'rating':
                    productList.sort((a, b) => b.avg_rating - a.avg_rating);
                    break;
                case 'newest':
                default:
                    productList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                    break;
            }
        }

        return productList;
    },

    // 2. Fetch specific details for a product (PDP query helper)
    getProductDetails(productId) {
        const parsedId = parseInt(productId);
        const product = DB.findById('products', parsedId);
        
        if (!product || !product.is_active || product.status !== 'APPROVED') {
            return null;
        }

        const brand = DB.findById('brands', product.brand_id);
        const seller = DB.findById('sellers', product.seller_id);
        const variants = DB.find('product_variants', { product_id: parsedId, is_active: true });
        
        // Populate variant images and stock
        const variantsDetailed = variants.map(v => {
            const images = DB.find('product_images', { variant_id: v.variant_id });
            const stock = DB.findOne('inventory_stock', { variant_id: v.variant_id });
            
            return {
                ...v,
                images: images.sort((a, b) => a.display_order - b.display_order),
                stock: stock || { quantity_available: 0, quantity_reserved: 0 }
            };
        });

        // Get reviews and sort newest first
        const reviews = DB.find('reviews', { product_id: parsedId });
        reviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return {
            ...product,
            brand: brand,
            seller: seller,
            variants: variantsDetailed,
            reviews: reviews
        };
    },

    // Fetch active categories
    getCategories() {
        return DB.find('categories', { is_active: true }).sort((a, b) => a.display_order - b.display_order);
    },

    // Fetch active brands
    getBrands() {
        return DB.find('brands', { is_active: true });
    }
};

window.Products = Products; // Global visibility
