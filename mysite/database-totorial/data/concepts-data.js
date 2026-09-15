window.CONCEPTS_DATA = [
  {
    "id": "primary-key",
    "title": "Primary Key (PK)",
    "definition": "A Primary Key is a column or set of columns that uniquely identifies every single row in a database table.",
    "example": "users table \u2192 user_id (1, 2, 3...)",
    "why": "Guarantees row uniqueness, prevents duplicate records, and enables reliable foreign key references.",
    "mistake": "Using non-unique values like user full names as primary keys.",
    "relatedProjects": [
      "ecommerce",
      "chat-app",
      "hospital-management"
    ]
  },
  {
    "id": "foreign-key",
    "title": "Foreign Key (FK)",
    "definition": "A Foreign Key is a column in one table that links to the Primary Key of another table, creating a relational link.",
    "example": "orders table \u2192 user_id (links to users.user_id)",
    "why": "Enforces Referential Integrity. Ensures an order cannot exist for a non-existent user.",
    "mistake": "Inserting orphan records without valid Foreign Key references.",
    "relatedProjects": [
      "ecommerce",
      "bus-booking",
      "library-management"
    ]
  },
  {
    "id": "one-to-many",
    "title": "One-to-Many (1:N) Relationship",
    "definition": "A relationship where a single record in Table A can connect to multiple records in Table B, but each record in Table B connects to only one record in Table A.",
    "example": "One User \u2192 Many Orders",
    "why": "Models fundamental parent-child real-world relationships.",
    "mistake": "Storing multiple order IDs inside a comma-separated column in the users table.",
    "relatedProjects": [
      "ecommerce",
      "restaurant-management",
      "real-estate"
    ]
  },
  {
    "id": "many-to-many",
    "title": "Many-to-Many (N:M) & Junction Tables",
    "definition": "A relationship where multiple records in Table A connect to multiple records in Table B. Implemented using an intermediate Junction Table containing Foreign Keys to both tables.",
    "example": "Products \u2194 Categories (Junction Table: product_categories)",
    "why": "Eliminates array columns and enables flexible multi-category tagging.",
    "mistake": "Trying to implement N:M relationships without a junction table.",
    "relatedProjects": [
      "ecommerce",
      "real-estate",
      "jewellery-showroom"
    ]
  },
  {
    "id": "normalization",
    "title": "Database Normalization (1NF, 2NF, 3NF)",
    "definition": "The systematic process of organizing database fields to eliminate data redundancy and improve data integrity.",
    "example": "Moving customer address fields from every order record into a dedicated addresses table.",
    "why": "Reduces storage duplication and prevents update anomalies.",
    "mistake": "Over-normalizing tables into dozens of tiny tables causing slow 10-way SQL joins.",
    "relatedProjects": [
      "dms",
      "hospital-management",
      "library-management"
    ]
  },
  {
    "id": "indexing",
    "title": "Database Indexing & Performance",
    "definition": "A data structure (usually B-Tree) that speeds up data retrieval operations on a database table at the cost of additional write overhead.",
    "example": "CREATE INDEX idx_users_email ON users(email);",
    "why": "Turns slow O(N) full table scans into fast O(log N) lookup searches.",
    "mistake": "Adding indexes to every single column, which drastically slows down INSERT and UPDATE queries.",
    "relatedProjects": [
      "chat-app",
      "ecommerce",
      "captcha-management"
    ]
  },
  {
    "id": "multi-tenancy",
    "title": "Multi-Tenant Architecture (`company_id`)",
    "definition": "A SaaS database design pattern where multiple customer companies share the same database instance while keeping their data isolated using tenant ID columns.",
    "example": "shifts table \u2192 company_id",
    "why": "Enables cost-effective SaaS scaling and enforces strict data boundary privacy.",
    "mistake": "Forgetting to filter SQL queries by active tenant company_id, causing data leakage.",
    "relatedProjects": [
      "caregiver-saas",
      "captcha-management"
    ]
  },
  {
    "id": "soft-delete",
    "title": "Soft Delete (`is_deleted` / `deleted_at`)",
    "definition": "Instead of permanently deleting a row with SQL `DELETE`, marking a column `is_deleted = TRUE` or setting a timestamp `deleted_at = NOW()`.",
    "example": "users table \u2192 deleted_at IS NULL",
    "why": "Preserves audit history, enables accidental deletion recovery, and protects foreign key references.",
    "mistake": "Hard-deleting records that are referenced by historical financial orders or invoices.",
    "relatedProjects": [
      "dms",
      "real-estate",
      "hospital-management"
    ]
  }
];
