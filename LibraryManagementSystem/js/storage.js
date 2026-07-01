/**
 * STORAGE.JS
 * LocalStorage Database Engine with standard CRUD helpers
 * and mock data seeder.
 */

const db = {
    // Basic LocalStorage Helpers
    loadData(key) {
        try {
            const val = localStorage.getItem(key);
            return val ? JSON.parse(val) : null;
        } catch (e) {
            console.error(`Error reading ${key} from LocalStorage`, e);
            return null;
        }
    },

    saveData(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error(`Error saving ${key} to LocalStorage`, e);
            return false;
        }
    },

    // CRUD Engine
    find(collection, filterFn = null) {
        const data = this.loadData(collection) || [];
        return filterFn ? data.filter(filterFn) : data;
    },

    findById(collection, id) {
        const data = this.loadData(collection) || [];
        return data.find(item => item.id === id) || null;
    },

    insert(collection, item, idPrefix = 'ID-') {
        const data = this.loadData(collection) || [];
        
        // Auto-generate Unique ID if not present
        if (!item.id) {
            item.id = this.generateId(collection, idPrefix);
        }

        data.push(item);
        this.saveData(collection, data);
        
        // Trigger custom event so other components know DB changed
        window.dispatchEvent(new CustomEvent('db-changed', { detail: { collection, action: 'insert', item } }));
        return item;
    },

    update(collection, id, updatedFields) {
        const data = this.loadData(collection) || [];
        const index = data.findIndex(item => item.id === id);
        
        if (index === -1) return null;

        const updatedItem = { ...data[index], ...updatedFields };
        data[index] = updatedItem;
        
        this.saveData(collection, data);
        window.dispatchEvent(new CustomEvent('db-changed', { detail: { collection, action: 'update', item: updatedItem } }));
        return updatedItem;
    },

    remove(collection, id) {
        const data = this.loadData(collection) || [];
        const index = data.findIndex(item => item.id === id);
        
        if (index === -1) return false;

        const removedItem = data[index];
        data.splice(index, 1);
        
        this.saveData(collection, data);
        window.dispatchEvent(new CustomEvent('db-changed', { detail: { collection, action: 'delete', item: removedItem } }));
        return true;
    },

    // ID Generator based on existing max numeric ID in collection
    generateId(collection, prefix) {
        const data = this.loadData(collection) || [];
        let maxNum = 1000;
        data.forEach(item => {
            if (item.id && item.id.startsWith(prefix)) {
                const numPart = parseInt(item.id.replace(prefix, ''), 10);
                if (!isNaN(numPart) && numPart > maxNum) {
                    maxNum = numPart;
                }
            }
        });
        return `${prefix}${maxNum + 1}`;
    },

    // Initializer and Mock Seeder
    seedDatabase() {
        // Seeding Branches
        if (!this.loadData('branches')) {
            this.saveData('branches', [
                { id: 'BRN-101', name: 'Downtown Central Library', location: '102 Main St, Central Plaza' },
                { id: 'BRN-102', name: 'Northside Library & Media Center', location: '445 Elm Rd, North End' },
                { id: 'BRN-103', name: 'West End Community Library', location: '89 Oak Boulevard, Westside' }
            ]);
        }

        // Seeding Staff (Default password is 'admin123' and 'staff123')
        if (!this.loadData('staff')) {
            this.saveData('staff', [
                { id: 'STF-1001', name: 'Sagar Kumar', email: 'admin@library.com', password: 'admin', role: 'Admin', branchId: 'BRN-101', status: 'Active' },
                { id: 'STF-1002', name: 'Jane Doe', email: 'staff@library.com', password: 'staff', role: 'Staff', branchId: 'BRN-102', status: 'Active' },
                { id: 'STF-1003', name: 'James Smith', email: 'smith@library.com', password: 'staff', role: 'Staff', branchId: 'BRN-103', status: 'Suspended' }
            ]);
        }

        // Seeding Roles
        if (!this.loadData('roles')) {
            this.saveData('roles', [
                {
                    id: 'ROL-1001',
                    name: 'Staff',
                    description: 'Standard staff member with daily circulation operations access.',
                    permissions: {
                        dashboard: ['view'],
                        books: ['view', 'add', 'edit'],
                        copies: ['view', 'add', 'edit'],
                        loans: ['view', 'add', 'edit'],
                        members: ['view', 'add', 'edit'],
                        reservations: ['view', 'add', 'edit'],
                        authors: ['view', 'add', 'edit'],
                        categories: ['view', 'add', 'edit'],
                        publishers: ['view', 'add', 'edit'],
                        branches: ['view', 'add', 'edit'],
                        reviews: ['view', 'add', 'edit', 'delete'],
                        reports: ['view'],
                        settings: ['view']
                    }
                }
            ]);
        }

        // Seeding Categories
        if (!this.loadData('categories')) {
            this.saveData('categories', [
                { id: 'CAT-201', name: 'Fiction', description: 'Literary prose describing imaginary events and people.' },
                { id: 'CAT-202', name: 'Science & Technology', description: 'Books on engineering, computer science, physics, and tech trends.' },
                { id: 'CAT-203', name: 'History & Biography', description: 'Historical records, memoirs, and life stories of historical figures.' },
                { id: 'CAT-204', name: 'Self-Improvement', description: 'Personal growth, finance management, habits, and psychology.' },
                { id: 'CAT-205', name: 'Arts & Literature', description: 'Poetry, paint techniques, architectural studies, and dramatic plays.' }
            ]);
        }

        // Seeding Publishers
        if (!this.loadData('publishers')) {
            this.saveData('publishers', [
                { id: 'PUB-301', name: 'O\'Reilly Media', address: '1005 Gravenstein Highway North, Sebastopol, CA', phone: '7078290515' },
                { id: 'PUB-302', name: 'Penguin Random House', address: '1745 Broadway, New York, NY', phone: '2127829000' },
                { id: 'PUB-303', name: 'HarperCollins Publishers', address: '195 Broadway, New York, NY', phone: '2122077000' },
                { id: 'PUB-304', name: 'Packt Publishing', address: '35 Livery St, Birmingham, UK', phone: '1212656480' }
            ]);
        }

        // Seeding Authors
        if (!this.loadData('authors')) {
            this.saveData('authors', [
                { id: 'AUT-401', name: 'George Orwell', bio: 'English novelist, essayist, journalist and critic, best known for 1984 and Animal Farm.' },
                { id: 'AUT-402', name: 'Robert C. Martin', bio: 'Also known as Uncle Bob, a software engineer and author of Clean Code and Clean Architecture.' },
                { id: 'AUT-403', name: 'Walter Isaacson', bio: 'American author and biographer of Steve Jobs, Albert Einstein, and Leonardo da Vinci.' },
                { id: 'AUT-404', name: 'James Clear', bio: 'Specialist in habits and decision-making, famous for his bestselling book Atomic Habits.' },
                { id: 'AUT-405', name: 'Kyle Simpson', bio: 'Open-source enthusiast, teacher, and author of the popular You Don\'t Know JS series.' }
            ]);
        }

        // Seeding Books (Empty base64 covers will fallback to stylish CSS templates in pages)
        if (!this.loadData('books')) {
            this.saveData('books', [
                { id: 'BOK-501', title: '1984', authorId: 'AUT-401', categoryId: 'CAT-201', publisherId: 'PUB-302', isbn: '9780451524935', publishYear: 1949, coverImage: '', description: 'A dystopian social science fiction novel and classic in political fiction.' },
                { id: 'BOK-502', title: 'Clean Code', authorId: 'AUT-402', categoryId: 'CAT-202', publisherId: 'PUB-303', isbn: '9780132350884', publishYear: 2008, coverImage: '', description: 'A handbook of agile software craftsmanship teaching how to write code that reads well.' },
                { id: 'BOK-503', title: 'Steve Jobs', authorId: 'AUT-403', categoryId: 'CAT-203', publisherId: 'PUB-302', isbn: '9781451648539', publishYear: 2011, coverImage: '', description: 'The exclusive, bestselling biography of Apple co-founder Steve Jobs.' },
                { id: 'BOK-504', title: 'Atomic Habits', authorId: 'AUT-404', categoryId: 'CAT-204', publisherId: 'PUB-302', isbn: '9780735211292', publishYear: 2018, coverImage: '', description: 'An easy & proven way to build good habits and break bad ones.' },
                { id: 'BOK-505', title: 'You Don\'t Know JS: Scope & Closures', authorId: 'AUT-405', categoryId: 'CAT-202', publisherId: 'PUB-301', isbn: '9781449335588', publishYear: 2014, coverImage: '', description: 'Deep dive into core language mechanics of JavaScript: scope, nesting, closures.' }
            ]);
        }

        // Seeding Book Copies (shelfLocation, status, branch mapping)
        if (!this.loadData('bookCopies')) {
            this.saveData('bookCopies', [
                { id: 'COP-6001', bookId: 'BOK-501', barcode: '1000001A', shelfLocation: 'Aisle 1, Shelf A', status: 'Available', branchId: 'BRN-101' },
                { id: 'COP-6002', bookId: 'BOK-501', barcode: '1000001B', shelfLocation: 'Aisle 1, Shelf B', status: 'Issued', branchId: 'BRN-101' },
                { id: 'COP-6003', bookId: 'BOK-502', barcode: '2000002A', shelfLocation: 'Aisle 3, Shelf D', status: 'Available', branchId: 'BRN-101' },
                { id: 'COP-6004', bookId: 'BOK-502', barcode: '2000002B', shelfLocation: 'Aisle 3, Shelf D', status: 'Issued', branchId: 'BRN-102' },
                { id: 'COP-6005', bookId: 'BOK-503', barcode: '3000003A', shelfLocation: 'Aisle 5, Shelf C', status: 'Available', branchId: 'BRN-101' },
                { id: 'COP-6006', bookId: 'BOK-504', barcode: '4000004A', shelfLocation: 'Aisle 2, Shelf F', status: 'Available', branchId: 'BRN-101' },
                { id: 'COP-6007', bookId: 'BOK-504', barcode: '4000004B', shelfLocation: 'Aisle 2, Shelf F', status: 'Reserved', branchId: 'BRN-103' },
                { id: 'COP-6008', bookId: 'BOK-505', barcode: '5000005A', shelfLocation: 'Aisle 3, Shelf B', status: 'Maintenance', branchId: 'BRN-101' }
            ]);
        }

        // Seeding Members (maxBooksAllowed determined by MembershipType)
        if (!this.loadData('members')) {
            this.saveData('members', [
                { id: 'MEM-7001', name: 'John Doe', email: 'john@gmail.com', phone: '9876543210', membershipType: 'Regular', status: 'Active', joinDate: '2026-01-10', maxBooksAllowed: 5 },
                { id: 'MEM-7002', name: 'Alice Vane', email: 'alice@gmail.com', phone: '9988776655', membershipType: 'Premium', status: 'Active', joinDate: '2026-02-15', maxBooksAllowed: 10 },
                { id: 'MEM-7003', name: 'Bob Wilson', email: 'bob@gmail.com', phone: '9123456780', membershipType: 'Student', status: 'Active', joinDate: '2026-03-01', maxBooksAllowed: 3 },
                { id: 'MEM-7004', name: 'Charlie Clark', email: 'charlie@gmail.com', phone: '9888877777', membershipType: 'Student', status: 'Suspended', joinDate: '2026-04-10', maxBooksAllowed: 3 }
            ]);
        }

        // Seeding Loans (Checkouts)
        // Note: Make one loan active and overdue to simulate fine collection on dashboard
        if (!this.loadData('loans')) {
            const today = new Date();
            
            // Overdue Loan: Issued 20 days ago, due 6 days ago (14 days return allowed)
            const d1_issue = new Date();
            d1_issue.setDate(today.getDate() - 20);
            const d1_due = new Date();
            d1_due.setDate(today.getDate() - 6);

            // Active On-Time Loan: Issued 5 days ago, due in 9 days
            const d2_issue = new Date();
            d2_issue.setDate(today.getDate() - 5);
            const d2_due = new Date();
            d2_due.setDate(today.getDate() + 9);

            // Returned Loan: Returned on time with no fine
            const d3_issue = new Date();
            d3_issue.setDate(today.getDate() - 25);
            const d3_due = new Date();
            d3_due.setDate(today.getDate() - 11);
            const d3_return = new Date();
            d3_return.setDate(today.getDate() - 12);

            this.saveData('loans', [
                { 
                    id: 'LON-8001', 
                    memberId: 'MEM-7001', 
                    bookCopyId: 'COP-6002', 
                    issueDate: d1_issue.toISOString().split('T')[0], 
                    dueDate: d1_due.toISOString().split('T')[0], 
                    returnDate: null, 
                    fineAmount: 6.00, // 6 days overdue * $1.00/day fine
                    status: 'Overdue' 
                },
                { 
                    id: 'LON-8002', 
                    memberId: 'MEM-7002', 
                    bookCopyId: 'COP-6004', 
                    issueDate: d2_issue.toISOString().split('T')[0], 
                    dueDate: d2_due.toISOString().split('T')[0], 
                    returnDate: null, 
                    fineAmount: 0.00, 
                    status: 'Issued' 
                },
                { 
                    id: 'LON-8003', 
                    memberId: 'MEM-7003', 
                    bookCopyId: 'COP-6003', 
                    issueDate: d3_issue.toISOString().split('T')[0], 
                    dueDate: d3_due.toISOString().split('T')[0], 
                    returnDate: d3_return.toISOString().split('T')[0], 
                    fineAmount: 0.00, 
                    status: 'Returned' 
                }
            ]);
        }

        // Seeding Reservations
        if (!this.loadData('reservations')) {
            this.saveData('reservations', [
                { id: 'RES-9001', memberId: 'MEM-7002', bookId: 'BOK-504', reservationDate: '2026-06-25', status: 'Pending' }
            ]);
        }

        // Seeding Reviews
        if (!this.loadData('reviews')) {
            this.saveData('reviews', [
                { id: 'REV-111', memberId: 'MEM-7001', bookId: 'BOK-501', rating: 5, comment: 'An absolute masterpiece of literature. A warning to all generations.', reviewDate: '2026-05-12' },
                { id: 'REV-112', memberId: 'MEM-7002', bookId: 'BOK-502', rating: 4, comment: 'Essential reading for any aspiring programmer. Clear and direct.', reviewDate: '2026-06-01' }
            ]);
        }

        // Seeding Fines
        if (!this.loadData('fines')) {
            const today = new Date();
            const d1_created = new Date();
            d1_created.setDate(today.getDate() - 6);

            this.saveData('fines', [
                { id: 'FIN-222', loanId: 'LON-8001', memberId: 'MEM-7001', amount: 6.00, status: 'Unpaid', createdDate: d1_created.toISOString().split('T')[0] }
            ]);
        }
    }
};


// Expose to window for global access
window.db = db;


// Expose to window for global access
window.db = db;
