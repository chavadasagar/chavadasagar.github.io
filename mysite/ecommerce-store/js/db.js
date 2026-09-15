/**
 * db.js - Local Storage DB Layer (Mini ORM)
 * Sab data localStorage mein keys ke standard schema ke matching save hoga.
 */

const DB_PREFIX = 'ecom_';

// Mapping of table keys to their respective primary key field names
const PK_MAPPING = {
    'users': 'user_id',
    'addresses': 'address_id',
    'categories': 'category_id',
    'brands': 'brand_id',
    'sellers': 'seller_id',
    'products': 'product_id',
    'product_variants': 'variant_id',
    'product_images': 'image_id',
    'inventory_stock': 'stock_id',
    'carts': 'cart_id',
    'cart_items': 'cart_item_id',
    'wishlists': 'wishlist_id',
    'orders': 'order_id',
    'order_items': 'order_item_id',
    'order_status_history': 'history_id',
    'payments': 'payment_id',
    'refunds': 'refund_id',
    'coupons': 'coupon_id',
    'coupon_usage': 'usage_id',
    'reviews': 'review_id',
    'notifications': 'notification_id'
};

const DB = {
    // Get full key name with prefix
    getKey(entity) {
        return DB_PREFIX + entity;
    },

    // Initialize all tables in localStorage if empty
    init() {
        Object.keys(PK_MAPPING).forEach(entity => {
            const key = this.getKey(entity);
            if (!localStorage.getItem(key)) {
                localStorage.setItem(key, JSON.stringify([]));
            }
        });
        
        // Setup metadata counter for auto-increment ids
        const metaKey = DB_PREFIX + '_meta';
        if (!localStorage.getItem(metaKey)) {
            const initialCounters = {};
            Object.keys(PK_MAPPING).forEach(entity => {
                initialCounters[entity] = 0;
            });
            localStorage.setItem(metaKey, JSON.stringify(initialCounters));
        }
    },

    // Retrieve all records for a table
    get(entity) {
        const key = this.getKey(entity);
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error(`Error reading database entity: ${entity}`, e);
            return [];
        }
    },

    // Save full table data
    save(entity, data) {
        const key = this.getKey(entity);
        try {
            localStorage.setItem(key, JSON.stringify(data));
            // Trigger storage event manually for same-tab updates if needed
            window.dispatchEvent(new Event('storage'));
            return true;
        } catch (e) {
            console.error(`Error saving database entity: ${entity}`, e);
            return false;
        }
    },

    // Get primary key field name
    getPkField(entity) {
        return PK_MAPPING[entity] || 'id';
    },

    // Generate next auto-incrementing ID
    getNextId(entity) {
        const metaKey = DB_PREFIX + '_meta';
        try {
            const meta = JSON.parse(localStorage.getItem(metaKey)) || {};
            if (meta[entity] === undefined) {
                meta[entity] = 0;
            }
            meta[entity] += 1;
            localStorage.setItem(metaKey, JSON.stringify(meta));
            return meta[entity];
        } catch (e) {
            // Fallback in case of parsing errors: calculate max + 1
            const items = this.get(entity);
            const pk = this.getPkField(entity);
            if (items.length === 0) return 1;
            const ids = items.map(x => parseInt(x[pk]) || 0);
            return Math.max(...ids) + 1;
        }
    },

    // Find records matching conditions (predicate function or key-value object match)
    find(entity, predicate) {
        const items = this.get(entity);
        if (typeof predicate === 'function') {
            return items.filter(predicate);
        }
        // Match matching object key-values
        return items.filter(item => {
            for (let key in predicate) {
                if (item[key] !== predicate[key]) return false;
            }
            return true;
        });
    },

    // Find single matching record
    findOne(entity, predicate) {
        const items = this.get(entity);
        if (typeof predicate === 'function') {
            return items.find(predicate) || null;
        }
        return items.find(item => {
            for (let key in predicate) {
                if (item[key] !== predicate[key]) return false;
            }
            return true;
        }) || null;
    },

    // Find single record by its primary key ID
    findById(entity, id) {
        const pk = this.getPkField(entity);
        const parsedId = parseInt(id) || id; // Handle string vs numeric ids
        return this.findOne(entity, item => item[pk] === parsedId || item[pk] === id);
    },

    // Insert record with auto ID
    insert(entity, record) {
        const items = this.get(entity);
        const pk = this.getPkField(entity);
        
        const newRecord = { ...record };
        if (!newRecord[pk]) {
            newRecord[pk] = this.getNextId(entity);
        }
        
        // Add created_at timestamp if not present
        if (!newRecord.created_at) {
            newRecord.created_at = new Date().toISOString();
        }
        
        items.push(newRecord);
        this.save(entity, items);
        return newRecord;
    },

    // Update record by ID
    update(entity, id, patch) {
        const items = this.get(entity);
        const pk = this.getPkField(entity);
        const parsedId = parseInt(id) || id;
        
        let updatedRecord = null;
        const updatedItems = items.map(item => {
            if (item[pk] === parsedId || item[pk] === id) {
                updatedRecord = { ...item, ...patch, updated_at: new Date().toISOString() };
                return updatedRecord;
            }
            return item;
        });
        
        if (updatedRecord) {
            this.save(entity, updatedItems);
        }
        return updatedRecord;
    },

    // Remove record from database table
    remove(entity, id) {
        const items = this.get(entity);
        const pk = this.getPkField(entity);
        const parsedId = parseInt(id) || id;
        
        const lengthBefore = items.length;
        const filteredItems = items.filter(item => item[pk] !== parsedId && item[pk] !== id);
        
        if (filteredItems.length !== lengthBefore) {
            this.save(entity, filteredItems);
            return true;
        }
        return false;
    },

    // Soft delete (sets is_active to false or status to DELETED)
    softDelete(entity, id) {
        const pk = this.getPkField(entity);
        const patch = entity === 'users' ? { status: 'DELETED' } : { is_active: false };
        return this.update(entity, id, patch);
    },

    // Reset a specific table to empty array
    clear(entity) {
        this.save(entity, []);
        // Reset counter
        const metaKey = DB_PREFIX + '_meta';
        try {
            const meta = JSON.parse(localStorage.getItem(metaKey)) || {};
            meta[entity] = 0;
            localStorage.setItem(metaKey, JSON.stringify(meta));
        } catch (e) {}
    },

    // Reset database completely (except current session)
    resetAll() {
        Object.keys(PK_MAPPING).forEach(entity => {
            this.clear(entity);
        });
    }
};

// Initialize DB structure immediately on script load
DB.init();
window.DB = DB; // Global visibility
