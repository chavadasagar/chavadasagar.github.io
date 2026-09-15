window.PROJECTS_DATA = [
  {
    "id": "ecommerce",
    "name": "E-Commerce Platform",
    "icon": "\ud83d\uded2",
    "difficulty": "Intermediate",
    "category": "E-Commerce",
    "industry": "Retail & Shopping",
    "estimatedTime": "45 Minutes",
    "description": "Learn how Amazon and Flipkart-style platforms design relational databases to handle products, SKU variants, real-time inventory, carts, order processing, and payment status.",
    "modules": [
      "User Management",
      "Product Catalog",
      "Inventory & SKUs",
      "Cart & Checkout",
      "Order Management",
      "Payment Gateway",
      "Shipping & Tracking",
      "Reviews & Ratings"
    ],
    "lessons": [
      {
        "id": "overview",
        "title": "1. System Overview & Problem Statement",
        "content": "<h3>Why E-Commerce Database Architecture Matters</h3>\n<p>An e-commerce database must handle millions of product browsing requests, maintain accurate real-time inventory stock, and ensure transactional consistency during high-concurrency flash sales.</p>\n<div class=\"workflow-visual\">\n  <div class=\"step\">User Browses Catalog</div> \u2192 \n  <div class=\"step\">Adds Variant to Cart</div> \u2192 \n  <div class=\"step\">Applies Coupon</div> \u2192 \n  <div class=\"step\">Places Order</div> \u2192 \n  <div class=\"step\">Deducts Inventory</div> \u2192 \n  <div class=\"step\">Generates Invoice</div>\n</div>\n<p><strong>Core Technical Challenge:</strong> Preventing overselling when 1,000 customers try to purchase the last 5 available units of a smartphone simultaneously.</p>"
      },
      {
        "id": "modules",
        "title": "2. Business Modules Breakdown",
        "content": "<h3>Core Business Modules</h3>\n<p>Every e-commerce system is broken down into isolated functional domain modules:</p>\n<ul>\n  <li><strong>Catalog Management:</strong> Categories, Brands, Products, and SKU Variants.</li>\n  <li><strong>Inventory Control:</strong> Stock counts, warehouse locations, and low-stock alerts.</li>\n  <li><strong>Order & Checkout:</strong> Shopping cart state, order headers, and line-item snapshots.</li>\n  <li><strong>Financial Transactions:</strong> Payment gateway tokens, status logs, and refund receipts.</li>\n</ul>"
      },
      {
        "id": "tables",
        "title": "3. Table Schema Deep-Dive",
        "content": "Explore all database tables, foreign keys, and indexes in the Table Explorer tab below."
      }
    ],
    "tables": [
      {
        "name": "users",
        "purpose": "Stores registered customer accounts and authentication profiles.",
        "columns": [
          {
            "name": "user_id",
            "type": "BIGINT",
            "constraints": [
              "PK",
              "AUTO_INCREMENT"
            ],
            "description": "Unique user identifier"
          },
          {
            "name": "email",
            "type": "VARCHAR(150)",
            "constraints": [
              "UNIQUE",
              "NOT NULL"
            ],
            "description": "Customer login email address"
          },
          {
            "name": "password_hash",
            "type": "VARCHAR(255)",
            "constraints": [
              "NOT NULL"
            ],
            "description": "Argon2id or BCrypt password hash"
          },
          {
            "name": "full_name",
            "type": "VARCHAR(100)",
            "constraints": [
              "NOT NULL"
            ],
            "description": "Customer full name"
          },
          {
            "name": "created_at",
            "type": "TIMESTAMP",
            "constraints": [
              "NOT NULL"
            ],
            "description": "Account registration timestamp"
          }
        ]
      },
      {
        "name": "products",
        "purpose": "Stores abstract product catalog items (e.g. iPhone 15).",
        "columns": [
          {
            "name": "product_id",
            "type": "BIGINT",
            "constraints": [
              "PK",
              "AUTO_INCREMENT"
            ],
            "description": "Unique product primary key"
          },
          {
            "name": "title",
            "type": "VARCHAR(200)",
            "constraints": [
              "NOT NULL",
              "INDEX"
            ],
            "description": "Product display title"
          },
          {
            "name": "brand",
            "type": "VARCHAR(100)",
            "constraints": [
              "INDEX"
            ],
            "description": "Manufacturer or brand name"
          },
          {
            "name": "description",
            "type": "TEXT",
            "constraints": [],
            "description": "Detailed product description"
          }
        ]
      },
      {
        "name": "product_variants",
        "purpose": "Stores specific purchasable SKUs (e.g. iPhone 15 - 128GB Black).",
        "columns": [
          {
            "name": "variant_id",
            "type": "BIGINT",
            "constraints": [
              "PK",
              "AUTO_INCREMENT"
            ],
            "description": "Unique variant primary key"
          },
          {
            "name": "product_id",
            "type": "BIGINT",
            "constraints": [
              "FK",
              "NOT NULL"
            ],
            "description": "Foreign key to products.product_id"
          },
          {
            "name": "sku",
            "type": "VARCHAR(50)",
            "constraints": [
              "UNIQUE",
              "NOT NULL"
            ],
            "description": "Stock Keeping Unit barcode string"
          },
          {
            "name": "price",
            "type": "DECIMAL(10,2)",
            "constraints": [
              "NOT NULL"
            ],
            "description": "Selling price in local currency"
          },
          {
            "name": "stock_quantity",
            "type": "INT",
            "constraints": [
              "NOT NULL"
            ],
            "description": "Available inventory count"
          }
        ]
      },
      {
        "name": "orders",
        "purpose": "Stores customer order transaction headers.",
        "columns": [
          {
            "name": "order_id",
            "type": "BIGINT",
            "constraints": [
              "PK",
              "AUTO_INCREMENT"
            ],
            "description": "Unique order identifier"
          },
          {
            "name": "user_id",
            "type": "BIGINT",
            "constraints": [
              "FK",
              "NOT NULL"
            ],
            "description": "Customer who placed the order"
          },
          {
            "name": "order_number",
            "type": "VARCHAR(30)",
            "constraints": [
              "UNIQUE",
              "NOT NULL"
            ],
            "description": "Human-readable order reference number"
          },
          {
            "name": "total_amount",
            "type": "DECIMAL(10,2)",
            "constraints": [
              "NOT NULL"
            ],
            "description": "Total order cost including tax & shipping"
          },
          {
            "name": "order_status",
            "type": "VARCHAR(30)",
            "constraints": [
              "NOT NULL",
              "INDEX"
            ],
            "description": "PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED"
          }
        ]
      },
      {
        "name": "order_items",
        "purpose": "Stores ordered items with historical price snapshots.",
        "columns": [
          {
            "name": "order_item_id",
            "type": "BIGINT",
            "constraints": [
              "PK",
              "AUTO_INCREMENT"
            ],
            "description": "Line item primary key"
          },
          {
            "name": "order_id",
            "type": "BIGINT",
            "constraints": [
              "FK",
              "NOT NULL"
            ],
            "description": "Parent order reference"
          },
          {
            "name": "variant_id",
            "type": "BIGINT",
            "constraints": [
              "FK",
              "NOT NULL"
            ],
            "description": "Purchased variant reference"
          },
          {
            "name": "unit_price",
            "type": "DECIMAL(10,2)",
            "constraints": [
              "NOT NULL"
            ],
            "description": "Price snapshot at moment of purchase"
          },
          {
            "name": "quantity",
            "type": "INT",
            "constraints": [
              "NOT NULL"
            ],
            "description": "Quantity purchased"
          }
        ]
      }
    ],
    "relationships": [
      {
        "source": "users",
        "target": "orders",
        "type": "1:N",
        "explanation": "One user can place multiple orders over time. Each order belongs to exactly one user.",
        "fkColumn": "orders.user_id \u2192 users.user_id"
      },
      {
        "source": "products",
        "target": "product_variants",
        "type": "1:N",
        "explanation": "One product can have multiple color/size variants. Each variant belongs to one parent product.",
        "fkColumn": "product_variants.product_id \u2192 products.product_id"
      },
      {
        "source": "orders",
        "target": "order_items",
        "type": "1:N",
        "explanation": "One order contains multiple purchased line items.",
        "fkColumn": "order_items.order_id \u2192 orders.order_id"
      }
    ],
    "designDecisions": [
      {
        "title": "Why are Products and Product Variants separate tables?",
        "badDesign": "Storing Size, Color, and Stock directly in the single `products` table.",
        "betterDesign": "Splitting into `products` (title, description) and `product_variants` (SKU, Size, Color, Price, Stock).",
        "reasoning": "A T-Shirt has one overall description, but 5 sizes and 3 colors (15 distinct SKUs). Storing everything in one table duplicates product descriptions 15 times and makes inventory tracking a nightmare."
      },
      {
        "title": "Why snapshot unit_price inside order_items?",
        "badDesign": "Joining `order_items` directly to `product_variants.price` to compute past order totals.",
        "betterDesign": "Copying the exact `unit_price` at the moment of checkout into `order_items.unit_price`.",
        "reasoning": "If a product price increases from $100 to $150 next month, past customer receipts would incorrectly show $150 if joined dynamically. Historical financial records must be immutable."
      }
    ],
    "businessRules": [
      {
        "title": "Stock Deduction Rule",
        "rule": "Stock must be deducted atomically (`stock_quantity >= quantity`) during checkout.",
        "type": "Database Rule"
      },
      {
        "title": "Order Price Snapshot",
        "rule": "Never calculate historical order totals from current catalog prices.",
        "type": "Database Rule"
      },
      {
        "title": "Cart Expiry Cleanup",
        "rule": "Abandoned shopping cart items older than 30 days are purged automatically.",
        "type": "Background Process"
      }
    ],
    "commonMistakes": [
      {
        "title": "Mistake 1: Storing Variant Colors as Comma-Separated Strings",
        "badCode": "colors = 'Red, Blue, Green'",
        "goodCode": "Use normalized product_variants table with dedicated color & size rows.",
        "explanation": "Comma-separated strings break SQL joins, prevent stock indexing per color, and fail normalization rules."
      }
    ],
    "quiz": [
      {
        "id": "q1",
        "question": "Why should order_items store unit_price explicitly instead of referencing product_variants.price?",
        "options": [
          "To reduce database file size",
          "To preserve historical purchase price when product prices change in the future",
          "To remove the need for Foreign Keys",
          "To speed up user login"
        ],
        "correct": 1,
        "explanation": "If product prices change next week, past customer order invoices must retain the price paid at the time of purchase."
      }
    ]
  },
  {
    "id": "chat-app",
    "name": "Real-time Chat Application",
    "icon": "\ud83d\udcac",
    "difficulty": "Intermediate",
    "category": "Communication",
    "industry": "Messaging & Social",
    "estimatedTime": "40 Minutes",
    "description": "Design high-throughput database schemas for WhatsApp, Telegram, and Slack-style messaging apps supporting 1-on-1 chats, group threads, media attachments, and read receipts.",
    "modules": [
      "User Presence",
      "Conversations",
      "Message Payload",
      "Delivery Receipts",
      "Media Attachments",
      "Group Administration"
    ],
    "lessons": [
      {
        "id": "overview",
        "title": "1. System Overview",
        "content": "<p>A modern real-time chat application must deliver sub-100ms message delivery, support group conversations, and efficiently query message history using pagination.</p>"
      }
    ],
    "tables": [
      {
        "name": "conversations",
        "purpose": "Stores direct messaging threads and group chat metadata.",
        "columns": [
          {
            "name": "conversation_id",
            "type": "UUID",
            "constraints": [
              "PK"
            ],
            "description": "Unique conversation thread ID"
          },
          {
            "name": "type",
            "type": "VARCHAR(20)",
            "constraints": [
              "NOT NULL"
            ],
            "description": "DIRECT or GROUP"
          },
          {
            "name": "title",
            "type": "VARCHAR(100)",
            "constraints": [],
            "description": "Group title (NULL for direct chats)"
          }
        ]
      },
      {
        "name": "messages",
        "purpose": "Stores sent message text payloads and timestamp ordering.",
        "columns": [
          {
            "name": "message_id",
            "type": "UUID",
            "constraints": [
              "PK"
            ],
            "description": "Unique message ID"
          },
          {
            "name": "conversation_id",
            "type": "UUID",
            "constraints": [
              "FK",
              "NOT NULL"
            ],
            "description": "Parent conversation thread"
          },
          {
            "name": "sender_id",
            "type": "UUID",
            "constraints": [
              "FK",
              "NOT NULL"
            ],
            "description": "Sender user ID"
          },
          {
            "name": "content",
            "type": "TEXT",
            "constraints": [],
            "description": "Message text payload"
          },
          {
            "name": "created_at",
            "type": "TIMESTAMP",
            "constraints": [
              "NOT NULL",
              "INDEX"
            ],
            "description": "Sent timestamp"
          }
        ]
      }
    ],
    "relationships": [
      {
        "source": "conversations",
        "target": "messages",
        "type": "1:N",
        "explanation": "One conversation thread contains thousands of messages.",
        "fkColumn": "messages.conversation_id \u2192 conversations.conversation_id"
      }
    ],
    "designDecisions": [
      {
        "title": "Why separation of Conversations and Messages?",
        "badDesign": "Storing sender and recipient directly on every message line without a conversation container.",
        "betterDesign": "Creating a central `conversations` entity and referencing `conversation_id` on every message.",
        "reasoning": "Group chats with 500 members would require 500 rows per message if stored naively. Group metadata belongs in conversations."
      }
    ],
    "businessRules": [
      {
        "title": "Message History Indexing",
        "rule": "Index `(conversation_id, created_at DESC)` for fast pagination.",
        "type": "Database Rule"
      }
    ],
    "commonMistakes": [
      {
        "title": "Mistake: Missing Compound Index on Messages",
        "badCode": "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 50;",
        "goodCode": "CREATE INDEX idx_messages_conv_time ON messages(conversation_id, created_at DESC);",
        "explanation": "Without a compound index, loading chat history causes full table scans on millions of messages."
      }
    ],
    "quiz": [
      {
        "id": "q1",
        "question": "Which index strategy speeds up chat history pagination?",
        "options": [
          "Index on content column",
          "Compound index on (conversation_id, created_at DESC)",
          "Index on sender_id only",
          "No index needed"
        ],
        "correct": 1,
        "explanation": "A compound index on conversation_id and created_at DESC allows instant time-sorted message fetching."
      }
    ]
  },
  {
    "id": "bus-booking",
    "name": "Bus Booking System",
    "icon": "\ud83d\ude8c",
    "difficulty": "Intermediate",
    "category": "Booking",
    "industry": "Transportation & Travel",
    "estimatedTime": "45 Minutes",
    "description": "RedBus and AbhiBus-style bus ticket reservation platform architecture featuring seat layouts, trip schedules, temporary seat locks, PNR generation, and cancellations.",
    "modules": [
      "Bus Fleet",
      "Route & Schedule",
      "Seat Layout Matrix",
      "Temporary Seat Lock",
      "Booking & PNR",
      "Cancellation & Refunds"
    ],
    "lessons": [
      {
        "id": "overview",
        "title": "1. System Overview",
        "content": "<p>Online bus booking systems handle multi-operator fleet management, route schedules, live seat layout maps, temporary seat locking during payment, and PNR ticket generation.</p>"
      }
    ],
    "tables": [
      {
        "name": "schedules",
        "purpose": "Trip execution instance linking bus, route, departure time, and fare.",
        "columns": [
          {
            "name": "schedule_id",
            "type": "UUID",
            "constraints": [
              "PK"
            ],
            "description": "Trip schedule ID"
          },
          {
            "name": "bus_id",
            "type": "UUID",
            "constraints": [
              "FK",
              "NOT NULL"
            ],
            "description": "Assigned bus"
          },
          {
            "name": "departure_time",
            "type": "TIMESTAMP",
            "constraints": [
              "NOT NULL",
              "INDEX"
            ],
            "description": "Trip departure time"
          },
          {
            "name": "base_fare",
            "type": "DECIMAL(10,2)",
            "constraints": [
              "NOT NULL"
            ],
            "description": "Ticket base price"
          }
        ]
      },
      {
        "name": "seat_locks",
        "purpose": "Temporary seat lock table preventing double booking during checkout (TTL 10 min).",
        "columns": [
          {
            "name": "lock_id",
            "type": "UUID",
            "constraints": [
              "PK"
            ],
            "description": "Lock transaction ID"
          },
          {
            "name": "schedule_id",
            "type": "UUID",
            "constraints": [
              "FK",
              "NOT NULL"
            ],
            "description": "Target trip schedule"
          },
          {
            "name": "seat_id",
            "type": "UUID",
            "constraints": [
              "FK",
              "NOT NULL"
            ],
            "description": "Target seat"
          },
          {
            "name": "expires_at",
            "type": "TIMESTAMP",
            "constraints": [
              "NOT NULL",
              "INDEX"
            ],
            "description": "Lock expiration timestamp"
          }
        ]
      }
    ],
    "relationships": [
      {
        "source": "schedules",
        "target": "seat_locks",
        "type": "1:N",
        "explanation": "A trip schedule holds temporary seat locks during active payment checkouts.",
        "fkColumn": "seat_locks.schedule_id \u2192 schedules.schedule_id"
      }
    ],
    "designDecisions": [
      {
        "title": "Why use temporary seat locks during payment?",
        "badDesign": "Directly creating confirmed bookings before payment succeeds.",
        "betterDesign": "Using a temporary `seat_locks` table with a 10-minute expiry timer.",
        "reasoning": "Prevents two passengers from booking and paying for seat 12B simultaneously during heavy festival rush."
      }
    ],
    "businessRules": [
      {
        "title": "Unique Lock Enforcement",
        "rule": "Enforce UNIQUE(schedule_id, seat_id) constraint on seat locks.",
        "type": "Database Rule"
      }
    ],
    "commonMistakes": [
      {
        "title": "Mistake: No Expiry Cleanup for Failed Payments",
        "badCode": "Leaving expired seat locks in database indefinitely.",
        "goodCode": "Query `expires_at > NOW()` and run background TTL worker.",
        "explanation": "Expired locks without cleanup permanently block seat inventory from being sold."
      }
    ],
    "quiz": [
      {
        "id": "q1",
        "question": "What primary problem does the seat_locks table solve?",
        "options": [
          "Calculates distance between cities",
          "Prevents double booking of the same seat during payment checkout",
          "Generates bus driver salaries",
          "Stores bus maintenance records"
        ],
        "correct": 1,
        "explanation": "Seat locks temporarily hold seats for 10 minutes while a user completes payment."
      }
    ]
  },
  {
    "id": "captcha-management",
    "name": "CAPTCHA Management System",
    "icon": "\ud83d\udd10",
    "difficulty": "Advanced",
    "category": "SaaS",
    "industry": "Security & Bot Detection",
    "estimatedTime": "35 Minutes",
    "description": "reCAPTCHA and hCaptcha-style multi-tenant SaaS architecture for API key management, challenge tokens, bot detection scoring, and client rate-limiting.",
    "modules": [
      "Client Accounts",
      "Site Keys",
      "Challenge Tokens",
      "Verification Logs",
      "Bot Analytics"
    ],
    "lessons": [
      {
        "id": "overview",
        "title": "1. System Overview",
        "content": "<p>Enterprise multi-tenant CAPTCHA service handling millions of daily verification requests, bot confidence scoring (0.0 to 1.0), and single-use challenge tokens.</p>"
      }
    ],
    "tables": [
      {
        "name": "sites",
        "purpose": "Registered client web domains and API keys.",
        "columns": [
          {
            "name": "site_id",
            "type": "UUID",
            "constraints": [
              "PK"
            ],
            "description": "Site identifier"
          },
          {
            "name": "site_key",
            "type": "VARCHAR(64)",
            "constraints": [
              "UNIQUE",
              "NOT NULL"
            ],
            "description": "Public site key"
          },
          {
            "name": "secret_key_hash",
            "type": "VARCHAR(255)",
            "constraints": [
              "NOT NULL"
            ],
            "description": "Hashed private secret key"
          }
        ]
      },
      {
        "name": "challenges",
        "purpose": "Short-lived single-use verification tokens.",
        "columns": [
          {
            "name": "challenge_id",
            "type": "UUID",
            "constraints": [
              "PK"
            ],
            "description": "Challenge identifier"
          },
          {
            "name": "token",
            "type": "VARCHAR(128)",
            "constraints": [
              "UNIQUE",
              "NOT NULL"
            ],
            "description": "Single-use token"
          },
          {
            "name": "is_used",
            "type": "BOOLEAN",
            "constraints": [
              "NOT NULL"
            ],
            "description": "Replay prevention flag"
          }
        ]
      }
    ],
    "relationships": [
      {
        "source": "sites",
        "target": "challenges",
        "type": "1:N",
        "explanation": "One site issues thousands of challenge tokens.",
        "fkColumn": "challenges.site_id \u2192 sites.site_id"
      }
    ],
    "designDecisions": [
      {
        "title": "Why single-use token flags (`is_used = TRUE`)?",
        "badDesign": "Allowing tokens to be verified multiple times within their expiry window.",
        "betterDesign": "Atomically setting `is_used = TRUE` during verification query.",
        "reasoning": "Prevents replay attacks where a bot reuses a single solved CAPTCHA token to submit spam forms 1,000 times."
      }
    ],
    "businessRules": [
      {
        "title": "Token Replay Prevention",
        "rule": "Tokens must be atomically updated `is_used = TRUE` on verification.",
        "type": "Database Rule"
      }
    ],
    "commonMistakes": [
      {
        "title": "Mistake: Storing Plaintext Secret Keys",
        "badCode": "secret_key = 'sec_12345'",
        "goodCode": "secret_key_hash = sha256(secret_key)",
        "explanation": "Plaintext secret keys exposed in database dumps compromise client security."
      }
    ],
    "quiz": [
      {
        "id": "q1",
        "question": "How does setting is_used = TRUE protect CAPTCHA tokens?",
        "options": [
          "It speeds up database backups",
          "It prevents replay attacks by ensuring tokens cannot be re-verified",
          "It changes token background color",
          "It deletes the client site"
        ],
        "correct": 1,
        "explanation": "Single-use flags stop bots from reusing a single solved CAPTCHA token multiple times."
      }
    ]
  },
  {
    "id": "caregiver-saas",
    "name": "Caregiver / Shift Management SaaS",
    "icon": "\ud83e\uddd1\u200d\u2695\ufe0f",
    "difficulty": "Advanced",
    "category": "SaaS",
    "industry": "Healthcare & NDIS Care",
    "estimatedTime": "50 Minutes",
    "description": "Shift-ware NDIS caregiver management SaaS with multi-tenant company isolation (`company_id`), client care plans, caregiver rosters, GPS clock-in timesheets, and invoicing.",
    "modules": [
      "Tenants & Companies",
      "Caregivers & Roles",
      "Clients & Care Plans",
      "Shift Roster",
      "GPS Timesheets",
      "NDIS Invoicing"
    ],
    "lessons": [
      {
        "id": "overview",
        "title": "1. System Overview",
        "content": "<p>Multi-tenant Aged Care & NDIS shift management platform with row-level company isolation, caregiver qualifications, shift rosters, and timesheet billing.</p>"
      }
    ],
    "tables": [
      {
        "name": "shifts",
        "purpose": "Scheduled caregiver shift roster with assigned client and timings.",
        "columns": [
          {
            "name": "shift_id",
            "type": "UUID",
            "constraints": [
              "PK"
            ],
            "description": "Shift identifier"
          },
          {
            "name": "company_id",
            "type": "UUID",
            "constraints": [
              "FK",
              "NOT NULL"
            ],
            "description": "Tenant isolation link"
          },
          {
            "name": "start_time",
            "type": "TIMESTAMP",
            "constraints": [
              "NOT NULL",
              "INDEX"
            ],
            "description": "Scheduled start time"
          }
        ]
      }
    ],
    "relationships": [
      {
        "source": "companies",
        "target": "shifts",
        "type": "1:N",
        "explanation": "Each tenant company manages its own shift roster.",
        "fkColumn": "shifts.company_id \u2192 companies.company_id"
      }
    ],
    "designDecisions": [
      {
        "title": "Why add company_id to all major tables?",
        "badDesign": "Relying on deep joins to determine tenant ownership.",
        "betterDesign": "Adding explicit `company_id` on all core tables for Row-Level Tenant Isolation.",
        "reasoning": "Prevents cross-tenant data leaks and enables fast PostgreSQL Row-Level Security (RLS) policies."
      }
    ],
    "businessRules": [
      {
        "title": "Tenant Isolation Rule",
        "rule": "All queries must filter by active tenant `company_id`.",
        "type": "Database Rule"
      }
    ],
    "commonMistakes": [
      {
        "title": "Mistake: Unindexed company_id Columns",
        "badCode": "company_id UUID NOT NULL",
        "goodCode": "CREATE INDEX idx_shifts_company ON shifts(company_id);",
        "explanation": "Multi-tenant queries filtering by company_id require indexes to avoid full table scans."
      }
    ],
    "quiz": [
      {
        "id": "q1",
        "question": "What is the main benefit of row-level company_id isolation in multi-tenant SaaS?",
        "options": [
          "Decreases server RAM cost",
          "Ensures strict data privacy so tenants cannot access each other's data",
          "Removes need for Primary Keys",
          "Deletes old users automatically"
        ],
        "correct": 1,
        "explanation": "Explicit company_id columns enable robust multi-tenant data boundary security."
      }
    ]
  },
  {
    "id": "dms",
    "name": "Document Management System",
    "icon": "\ud83d\udcc1",
    "difficulty": "Intermediate",
    "category": "Enterprise",
    "industry": "Document & Workflow",
    "estimatedTime": "40 Minutes",
    "description": "Enterprise Document Management System (DMS) design with nested folder hierarchies, version control (V1.0, V1.1), access permissions, and approval workflows.",
    "modules": [
      "Folder Hierarchy",
      "Document Metadata",
      "Version Control",
      "File Checksums",
      "Access Permissions",
      "Approval Workflows"
    ],
    "lessons": [
      {
        "id": "overview",
        "title": "1. System Overview",
        "content": "<p>Enterprise DMS architecture supporting recursive folder directory trees, document upload file version control, and SHA-256 file integrity checksums.</p>"
      }
    ],
    "tables": [
      {
        "name": "folders",
        "purpose": "Self-referencing tree hierarchy for directory structure.",
        "columns": [
          {
            "name": "folder_id",
            "type": "UUID",
            "constraints": [
              "PK"
            ],
            "description": "Folder identifier"
          },
          {
            "name": "parent_folder_id",
            "type": "UUID",
            "constraints": [
              "FK"
            ],
            "description": "Parent folder (NULL for root)"
          }
        ]
      },
      {
        "name": "document_versions",
        "purpose": "File versions stored on cloud storage with SHA-256 hash checksums.",
        "columns": [
          {
            "name": "version_id",
            "type": "UUID",
            "constraints": [
              "PK"
            ],
            "description": "Version record ID"
          },
          {
            "name": "file_path",
            "type": "VARCHAR(500)",
            "constraints": [
              "NOT NULL"
            ],
            "description": "Cloud object storage path"
          },
          {
            "name": "file_checksum",
            "type": "VARCHAR(64)",
            "constraints": [
              "NOT NULL"
            ],
            "description": "SHA-256 file hash"
          }
        ]
      }
    ],
    "relationships": [
      {
        "source": "folders",
        "target": "folders",
        "type": "1:N",
        "explanation": "Self-referencing relationship forming a folder directory tree.",
        "fkColumn": "folders.parent_folder_id \u2192 folders.folder_id"
      }
    ],
    "designDecisions": [
      {
        "title": "Why store file URLs instead of binary files in SQL BLOBs?",
        "badDesign": "Uploading 500MB PDF binaries directly into database BLOB columns.",
        "betterDesign": "Storing binary files in Cloud Object Storage (AWS S3/GCS) and storing file URLs in SQL.",
        "reasoning": "BLOBs bloat database backup files, exhaust DB RAM caches, and slow down query response times."
      }
    ],
    "businessRules": [
      {
        "title": "Checksum Integrity Rule",
        "rule": "Compute SHA-256 checksum on file upload to prevent duplicate files.",
        "type": "Application Logic"
      }
    ],
    "commonMistakes": [
      {
        "title": "Mistake: Storing Files Directly in SQL Database",
        "badCode": "file_data BLOB",
        "goodCode": "file_path VARCHAR(500)",
        "explanation": "Storing heavy files directly inside relational tables degrades query performance drastically."
      }
    ],
    "quiz": [
      {
        "id": "q1",
        "question": "Where should actual uploaded document binary files be stored in enterprise systems?",
        "options": [
          "Inside SQL table BLOB columns",
          "In Cloud Object Storage (S3/GCS) with file paths stored in SQL",
          "Inside JavaScript code files",
          "In database index files"
        ],
        "correct": 1,
        "explanation": "Cloud storage handles heavy binary payloads efficiently while database tables keep fast string metadata."
      }
    ]
  },
  {
    "id": "hospital-management",
    "name": "Hospital Management System",
    "icon": "\ud83c\udfe5",
    "difficulty": "Intermediate",
    "category": "Healthcare",
    "industry": "Medical & Clinical",
    "estimatedTime": "45 Minutes",
    "description": "Patients UHID registration, Doctor OPD appointments, Inpatient (IPD) ward bed admissions, Pharmacy inventory, and Consolidated Billing database design.",
    "modules": [
      "Patient Registry (UHID)",
      "Doctor OPD",
      "Inpatient IPD Wards",
      "Pharmacy Inventory",
      "Lab Test Reports",
      "Consolidated Hospital Billing"
    ],
    "lessons": [
      {
        "id": "overview",
        "title": "1. System Overview",
        "content": "<p>Complete Hospital Management System (HMS) architecture with lifetime unique patient UHID identifiers, OPD outpatient visits, IPD bed allocations, and merged billing.</p>"
      }
    ],
    "tables": [
      {
        "name": "patients",
        "purpose": "Master patient records with lifetime unique health identifier (UHID).",
        "columns": [
          {
            "name": "patient_id",
            "type": "UUID",
            "constraints": [
              "PK"
            ],
            "description": "Patient identifier"
          },
          {
            "name": "uhid",
            "type": "VARCHAR(30)",
            "constraints": [
              "UNIQUE",
              "NOT NULL"
            ],
            "description": "Unique Lifetime Health ID"
          }
        ]
      }
    ],
    "relationships": [
      {
        "source": "patients",
        "target": "admissions",
        "type": "1:N",
        "explanation": "A patient can have multiple IPD hospital admissions over time.",
        "fkColumn": "admissions.patient_id \u2192 patients.patient_id"
      }
    ],
    "designDecisions": [
      {
        "title": "Why generate a permanent UHID string?",
        "badDesign": "Creating duplicate patient profiles every time a patient visits a different doctor.",
        "betterDesign": "Assigning a permanent lifetime UHID string on first patient registration.",
        "reasoning": "Consolidates complete patient medical history, prescriptions, and lab tests across lifetime hospital visits."
      }
    ],
    "businessRules": [
      {
        "title": "Active Admission Check",
        "rule": "A bed cannot be assigned if its status is currently occupied.",
        "type": "Database Rule"
      }
    ],
    "commonMistakes": [
      {
        "title": "Mistake: Duplicate Patient Records",
        "badCode": "Registering patient without checking phone / national ID",
        "goodCode": "Enforce unique constraint on national ID / phone number.",
        "explanation": "Duplicate patient profiles obscure critical medical allergy history and cause billing errors."
      }
    ],
    "quiz": [
      {
        "id": "q1",
        "question": "What is the purpose of a permanent UHID in Hospital Systems?",
        "options": [
          "To generate doctor salaries",
          "To consolidate a patient's complete medical history under a single unique ID",
          "To order hospital food",
          "To lock hospital doors"
        ],
        "correct": 1,
        "explanation": "UHID links all past OPD visits, IPD admissions, lab reports, and prescriptions for a patient."
      }
    ]
  },
  {
    "id": "jewellery-showroom",
    "name": "Jewellery Showroom System",
    "icon": "\ud83d\udc8d",
    "difficulty": "Intermediate",
    "category": "Retail",
    "industry": "Jewelry & Precious Metals",
    "estimatedTime": "40 Minutes",
    "description": "Specialized retail database design for Jewellery Showrooms. Handles daily gold/silver rates, item weight breakdowns (Gross Wt, Net Wt, Stones), old gold trade-ins, and GST billing.",
    "modules": [
      "Daily Metal Rates",
      "Item Tag Weight Spec",
      "Old Gold Exchange",
      "GST Invoicing",
      "Gold Saving Schemes"
    ],
    "lessons": [
      {
        "id": "overview",
        "title": "1. System Overview",
        "content": "<p>Specialized retail DB architecture tracking daily market gold prices per gram (24K, 22K, 18K), gross vs net weight, stone charges, making fees, and trade-in exchanges.</p>"
      }
    ],
    "tables": [
      {
        "name": "daily_rates",
        "purpose": "Daily market gold and silver price per gram.",
        "columns": [
          {
            "name": "rate_id",
            "type": "UUID",
            "constraints": [
              "PK"
            ],
            "description": "Rate record ID"
          },
          {
            "name": "rate_date",
            "type": "DATE",
            "constraints": [
              "UNIQUE",
              "NOT NULL"
            ],
            "description": "Market rate date"
          },
          {
            "name": "gold_22k_per_gram",
            "type": "DECIMAL(10,2)",
            "constraints": [
              "NOT NULL"
            ],
            "description": "22K gold rate per gram"
          }
        ]
      }
    ],
    "relationships": [
      {
        "source": "daily_rates",
        "target": "invoices",
        "type": "1:N",
        "explanation": "Invoices fetch official daily gold rates matching invoice date.",
        "fkColumn": "invoices.rate_date \u2192 daily_rates.rate_date"
      }
    ],
    "designDecisions": [
      {
        "title": "Why store weights to 3 decimal places (`DECIMAL(8,3)`)?",
        "badDesign": "Using standard 2-decimal floats (`DECIMAL(8,2)`) for gold weight in grams.",
        "betterDesign": "Using `DECIMAL(8,3)` to store weights precisely to 1 milligram (0.001g).",
        "reasoning": "At current gold prices, a 0.01 gram error multiplied across thousands of transactions causes massive accounting discrepancies."
      }
    ],
    "businessRules": [
      {
        "title": "Weight Precision Rule",
        "rule": "Store all precious metal weights with 3-decimal milligram precision.",
        "type": "Database Rule"
      }
    ],
    "commonMistakes": [
      {
        "title": "Mistake: Hardcoding Daily Gold Rates in Item Tables",
        "badCode": "item_price = 50000",
        "goodCode": "Calculate dynamically: `net_weight * daily_rates.gold_22k + making_charges`",
        "explanation": "Gold rates change twice daily; hardcoded prices require updating millions of database rows twice every day."
      }
    ],
    "quiz": [
      {
        "id": "q1",
        "question": "Why should gold weights be stored using 3 decimal places (DECIMAL(8,3))?",
        "options": [
          "To make numbers look longer",
          "To accurately record weights down to 1 milligram (0.001g)",
          "To round up prices automatically",
          "To speed up database search"
        ],
        "correct": 1,
        "explanation": "Gold is priced per gram, requiring milligram precision (0.001g) for financial accuracy."
      }
    ]
  },
  {
    "id": "library-management",
    "name": "Library Management System",
    "icon": "\ud83d\udcda",
    "difficulty": "Beginner",
    "category": "Management",
    "industry": "Education & Libraries",
    "estimatedTime": "30 Minutes",
    "description": "Learn fundamentals of database design through Library Management (LMS): ISBN catalog titles, physical copy barcodes, member cards, book loans, and overdue fine logic.",
    "modules": [
      "Book Catalog (ISBN)",
      "Physical Copies (Barcodes)",
      "Member Registry",
      "Book Issues & Returns",
      "Fine Calculations",
      "Reservations"
    ],
    "lessons": [
      {
        "id": "overview",
        "title": "1. System Overview",
        "content": "<p>A classic database design project teaching normalized entity separation between abstract book titles (ISBN) and physical library copies (Accession Barcodes).</p>"
      }
    ],
    "tables": [
      {
        "name": "books",
        "purpose": "Master book catalog title, author, and ISBN.",
        "columns": [
          {
            "name": "book_id",
            "type": "UUID",
            "constraints": [
              "PK"
            ],
            "description": "Book master ID"
          },
          {
            "name": "isbn",
            "type": "VARCHAR(20)",
            "constraints": [
              "UNIQUE",
              "NOT NULL"
            ],
            "description": "International ISBN code"
          }
        ]
      },
      {
        "name": "book_copies",
        "purpose": "Physical book copy inventory with barcode accession tags.",
        "columns": [
          {
            "name": "copy_id",
            "type": "UUID",
            "constraints": [
              "PK"
            ],
            "description": "Physical copy ID"
          },
          {
            "name": "accession_number",
            "type": "VARCHAR(50)",
            "constraints": [
              "UNIQUE",
              "NOT NULL"
            ],
            "description": "Physical barcode scanner tag"
          }
        ]
      }
    ],
    "relationships": [
      {
        "source": "books",
        "target": "book_copies",
        "type": "1:N",
        "explanation": "One book title (ISBN) has multiple physical copies in stock.",
        "fkColumn": "book_copies.book_id \u2192 books.book_id"
      }
    ],
    "designDecisions": [
      {
        "title": "Why separate Books and Book Copies?",
        "badDesign": "Creating a duplicate book row every time the library purchases another physical copy of 'Clean Code'.",
        "betterDesign": "Storing book title metadata once in `books` and physical copies in `book_copies` with unique accession numbers.",
        "reasoning": "Prevents data redundancy. If author name changes, updating one row in `books` fixes all 20 physical copies."
      }
    ],
    "businessRules": [
      {
        "title": "Overdue Fine Calculation",
        "rule": "Compute fine = `(return_date - due_date) * daily_rate` when books are returned late.",
        "type": "Application Logic"
      }
    ],
    "commonMistakes": [
      {
        "title": "Mistake: Issuing Book Titles Instead of Physical Copies",
        "badCode": "issue_table.book_id",
        "goodCode": "issue_table.copy_id",
        "explanation": "Issuing a title doesn't specify which exact physical book copy was handed to the student."
      }
    ],
    "quiz": [
      {
        "id": "q1",
        "question": "Why should a library system separate Books (ISBN) from Book Copies (Accession Numbers)?",
        "options": [
          "To duplicate book descriptions",
          "To store title metadata once while tracking multiple physical copy barcodes independently",
          "To prevent members from borrowing books",
          "To hide book prices"
        ],
        "correct": 1,
        "explanation": "Separates abstract title information from individual physical copy availability."
      }
    ]
  },
  {
    "id": "real-estate",
    "name": "Real Estate Management System",
    "icon": "\ud83c\udfe0",
    "difficulty": "Intermediate",
    "category": "Management",
    "industry": "Real Estate & Rental",
    "estimatedTime": "45 Minutes",
    "description": "99acres and MagicBricks-style property buy/rent marketplace database architecture: listings, BHK configurations, agent commissions, site visit schedules, and lease deals.",
    "modules": [
      "User & Agent Profiles",
      "Property Listings",
      "Amenities Junction",
      "Site Visits",
      "Lease Agreements",
      "Broker Commissions"
    ],
    "lessons": [
      {
        "id": "overview",
        "title": "1. System Overview",
        "content": "<p>Real estate portal DB architecture handling Property Buy/Rent listings, owner vs broker user roles, scheduled site visits, and lease contract tracking.</p>"
      }
    ],
    "tables": [
      {
        "name": "properties",
        "purpose": "Main property listing details (Price, BHK, City, Listing Type).",
        "columns": [
          {
            "name": "property_id",
            "type": "UUID",
            "constraints": [
              "PK"
            ],
            "description": "Property identifier"
          },
          {
            "name": "listing_type",
            "type": "VARCHAR(10)",
            "constraints": [
              "NOT NULL",
              "INDEX"
            ],
            "description": "SALE or RENT"
          },
          {
            "name": "price",
            "type": "DECIMAL(12,2)",
            "constraints": [
              "NOT NULL",
              "INDEX"
            ],
            "description": "Asking price or monthly rent"
          }
        ]
      }
    ],
    "relationships": [
      {
        "source": "users",
        "target": "properties",
        "type": "1:N",
        "explanation": "An owner or broker lists multiple properties on the platform.",
        "fkColumn": "properties.owner_id \u2192 users.user_id"
      }
    ],
    "designDecisions": [
      {
        "title": "Why use a Junction Table for Property Amenities?",
        "badDesign": "Adding 50 boolean columns (`has_pool`, `has_gym`, `has_lift`, etc.) directly on `properties`.",
        "betterDesign": "Creating `amenities` master table and a Many-to-Many junction table `property_amenities`.",
        "reasoning": "Adding a new amenity in bad design requires altering SQL schema tables. Junction tables allow dynamic amenity additions without code migration."
      }
    ],
    "businessRules": [
      {
        "title": "Property Search Indexing",
        "rule": "Create composite index on `(city, listing_type, price)` for instant search.",
        "type": "Database Rule"
      }
    ],
    "commonMistakes": [
      {
        "title": "Mistake: Hardcoding 50 Amenity Columns",
        "badCode": "has_wifi BOOLEAN, has_gym BOOLEAN...",
        "goodCode": "Use property_amenities junction table.",
        "explanation": "Hardcoded amenity columns bloat table width and complicate dynamic search queries."
      }
    ],
    "quiz": [
      {
        "id": "q1",
        "question": "What is the best way to handle properties with multiple optional amenities (Pool, Gym, Parking)?",
        "options": [
          "Add 50 boolean columns to properties table",
          "Use a Many-to-Many junction table (property_amenities)",
          "Store amenities in a text file",
          "Delete amenities"
        ],
        "correct": 1,
        "explanation": "Junction tables elegantly handle flexible Many-to-Many relationships without schema changes."
      }
    ]
  },
  {
    "id": "restaurant-management",
    "name": "Restaurant Management System",
    "icon": "\ud83c\udf7d\ufe0f",
    "difficulty": "Intermediate",
    "category": "Management",
    "industry": "Food & Restaurant",
    "estimatedTime": "40 Minutes",
    "description": "Multi-branch restaurant chain database design: menu variants & addons, dine-in table reservations, Kitchen Display Systems (KDS), and inventory stock.",
    "modules": [
      "Multi-Branch Fleet",
      "Menu & Addons",
      "Dine-in Tables",
      "Order & KDS Routing",
      "Billing & Tax",
      "Raw Material Stock"
    ],
    "lessons": [
      {
        "id": "overview",
        "title": "1. System Overview",
        "content": "<p>Restaurant Management System DB architecture for single outlets and multi-branch chains, tracking Kitchen Display (KDS) order states, dine-in table allocations, and stock.</p>"
      }
    ],
    "tables": [
      {
        "name": "orders",
        "purpose": "Order transaction header (Dine-in, Takeaway, Delivery).",
        "columns": [
          {
            "name": "order_id",
            "type": "UUID",
            "constraints": [
              "PK"
            ],
            "description": "Order identifier"
          },
          {
            "name": "branch_id",
            "type": "UUID",
            "constraints": [
              "FK",
              "NOT NULL"
            ],
            "description": "Branch reference"
          },
          {
            "name": "order_status",
            "type": "VARCHAR(20)",
            "constraints": [
              "NOT NULL",
              "INDEX"
            ],
            "description": "PENDING, PREPARING, READY, SERVED"
          }
        ]
      }
    ],
    "relationships": [
      {
        "source": "branches",
        "target": "orders",
        "type": "1:N",
        "explanation": "Each restaurant branch processes its own daily orders.",
        "fkColumn": "orders.branch_id \u2192 branches.branch_id"
      }
    ],
    "designDecisions": [
      {
        "title": "Why index `(branch_id, order_status)`?",
        "badDesign": "Querying all orders across all branches and filtering in application code.",
        "betterDesign": "Indexing `(branch_id, order_status)` on orders table.",
        "reasoning": "Kitchen Display Screens (KDS) refresh every 3 seconds requesting live `PENDING` orders for their specific branch."
      }
    ],
    "businessRules": [
      {
        "title": "KDS Filter Rule",
        "rule": "Kitchen displays only query orders where `order_status IN ('PENDING', 'PREPARING')`.",
        "type": "Database Rule"
      }
    ],
    "commonMistakes": [
      {
        "title": "Mistake: Hardcoding Dish Addons",
        "badCode": "order_item.extra_cheese = TRUE",
        "goodCode": "Use order_item_addons junction table.",
        "explanation": "Dishes can have multiple dynamic addons (spicy level, extra toppings, sides) requiring normalized structures."
      }
    ],
    "quiz": [
      {
        "id": "q1",
        "question": "Why is indexing (branch_id, order_status) critical for Kitchen Display Systems?",
        "options": [
          "To print physical receipts",
          "To allow kitchen screens to query pending branch orders instantly without full table scans",
          "To change menu prices",
          "To calculate employee tips"
        ],
        "correct": 1,
        "explanation": "KDS screens refresh frequently; compound indexing guarantees fast real-time order retrieval."
      }
    ]
  }
];
