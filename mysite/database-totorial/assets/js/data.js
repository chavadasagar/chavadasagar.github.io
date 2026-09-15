window.PROJECT_DB_DATA = [
  {
    "id": "bus-booking",
    "title": {
      "en": "Bus Booking System Database Design",
      "hi": "Bus Booking System \u2014 Full Database Design"
    },
    "tagline": {
      "en": "RedBus / AbhiBus style online bus ticket reservation platform architecture",
      "hi": "RedBus aur AbhiBus jaisa complete online bus booking platform ka DB design"
    },
    "category": "Transport",
    "targetDB": "PostgreSQL / MySQL",
    "tableCount": 8,
    "overview": {
      "en": "This database design powers an online bus booking platform (similar to RedBus or AbhiBus). It covers bus operators, routes, schedules, seat layout configurations, seat locking mechanisms during checkout, passenger details, booking transactions, cancellation refunds, and operator commission payouts.",
      "hi": "Ye document ek Online Bus Booking Platform (jaise RedBus, AbhiBus type system) ka complete database design cover karta hai. Isme har entity, table, relationship, constraint, index aur temporary seat locking logic ko explain kiya gaya hai taaki high concurrency handle ho sake."
    },
    "architecture": {
      "en": "The architecture supports multi-operator bus fleets. Schedules link buses to routes with departure/arrival timestamps. Passengers search available trips, lock seats for 10 minutes during payment, and receive confirmed PNR tickets upon successful checkout.",
      "hi": "Architecture multi-operator model par base hai. Schedules bus aur route ko connect karte hain. Passenger 10-minute temporary seat lock ke saath live seat layout dekh kar ticket book karta hai aur confirmed PNR receive karta hai."
    },
    "mermaid": "erDiagram\n    OPERATORS ||--o{ BUSES : owns\n    BUSES ||--o{ BUS_SEATS : has\n    ROUTES ||--o{ SCHEDULES : defines\n    BUSES ||--o{ SCHEDULES : assigned\n    SCHEDULES ||--o{ BOOKINGS : receives\n    BOOKINGS ||--o{ PASSENGERS : includes\n    SCHEDULES ||--o{ SEAT_LOCKS : locks",
    "tables": [
      {
        "name": "operators",
        "description": {
          "en": "Master registry of travel agencies and fleet operators.",
          "hi": "Bus operators aur travel agencies ka master table."
        },
        "columns": [
          {
            "name": "operator_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "Unique primary key for operator",
              "hi": "Operator ka unique primary key"
            }
          },
          {
            "name": "company_name",
            "type": "VARCHAR(150)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Registered bus company name",
              "hi": "Bus agency ka naam"
            }
          },
          {
            "name": "contact_phone",
            "type": "VARCHAR(20)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Support contact phone number",
              "hi": "Support helpline number"
            }
          },
          {
            "name": "status",
            "type": "VARCHAR(20)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "'ACTIVE'",
            "desc": {
              "en": "Account status (ACTIVE, SUSPENDED)",
              "hi": "Operator account status"
            }
          }
        ]
      },
      {
        "name": "buses",
        "description": {
          "en": "Bus fleet details including registration number, category, and total seats.",
          "hi": "Har bus ka vehicle detail, registration number aur seat capacity."
        },
        "columns": [
          {
            "name": "bus_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "Unique bus identifier",
              "hi": "Bus ka unique ID"
            }
          },
          {
            "name": "operator_id",
            "type": "UUID",
            "key": "FK",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Foreign key referencing operators table",
              "hi": "Operator table se link"
            }
          },
          {
            "name": "bus_number",
            "type": "VARCHAR(30)",
            "key": "UNIQUE",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "RTO vehicle registration plate",
              "hi": "RTO registration plate number"
            }
          },
          {
            "name": "bus_type",
            "type": "VARCHAR(50)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Category: AC_SLEEPER, NON_AC_SEATER, VOLVO",
              "hi": "Bus type: AC Sleeper, Volvo, Non-AC Seater"
            }
          },
          {
            "name": "total_seats",
            "type": "INT",
            "key": "",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Total seating capacity",
              "hi": "Bus me kitni seats hain"
            }
          }
        ]
      },
      {
        "name": "bus_seats",
        "description": {
          "en": "Physical layout definition for every seat (Deck, Row, Seat Code, Type).",
          "hi": "Har seat ka layout status (Lower/Upper deck, Window seat, Sleeper berth)."
        },
        "columns": [
          {
            "name": "seat_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "Seat ID",
              "hi": "Seat ka unique ID"
            }
          },
          {
            "name": "bus_id",
            "type": "UUID",
            "key": "FK",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Bus reference",
              "hi": "Bus table reference"
            }
          },
          {
            "name": "seat_number",
            "type": "VARCHAR(10)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Seat label (e.g. L1, U5, 12A)",
              "hi": "Seat label (jaise L1, U4)"
            }
          },
          {
            "name": "deck_type",
            "type": "VARCHAR(10)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "'LOWER'",
            "desc": {
              "en": "LOWER or UPPER deck",
              "hi": "Lower deck ya Upper deck"
            }
          },
          {
            "name": "seat_type",
            "type": "VARCHAR(20)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "'SEATER'",
            "desc": {
              "en": "SEATER or SLEEPER",
              "hi": "Seater ya Sleeper berth"
            }
          }
        ]
      },
      {
        "name": "schedules",
        "description": {
          "en": "Trip execution instance linking bus, route, departure/arrival timestamps, and base fare.",
          "hi": "Trip timing schedule (departure/arrival time, route ID aur ticket fare)."
        },
        "columns": [
          {
            "name": "schedule_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "Trip schedule ID",
              "hi": "Trip schedule unique ID"
            }
          },
          {
            "name": "bus_id",
            "type": "UUID",
            "key": "FK",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Assigned bus",
              "hi": "Assigned bus reference"
            }
          },
          {
            "name": "departure_time",
            "type": "TIMESTAMP",
            "key": "INDEX",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Trip departure time",
              "hi": "Bus ravana hone ka samay"
            }
          },
          {
            "name": "base_fare",
            "type": "DECIMAL(10,2)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Ticket price",
              "hi": "Basic seat fare"
            }
          }
        ]
      },
      {
        "name": "seat_locks",
        "description": {
          "en": "Temporary lock table preventing double-booking during online payment (TTL 10 min).",
          "hi": "Payment checkout ke waqt 10 minute temporary seat lock table."
        },
        "columns": [
          {
            "name": "lock_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "Lock transaction ID",
              "hi": "Lock record unique ID"
            }
          },
          {
            "name": "schedule_id",
            "type": "UUID",
            "key": "FK",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Target trip schedule",
              "hi": "Target trip ID"
            }
          },
          {
            "name": "seat_id",
            "type": "UUID",
            "key": "FK",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Target seat",
              "hi": "Target seat ID"
            }
          },
          {
            "name": "expires_at",
            "type": "TIMESTAMP",
            "key": "INDEX",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Lock expiry timestamp",
              "hi": "Lock kab expire hoga"
            }
          }
        ]
      },
      {
        "name": "bookings",
        "description": {
          "en": "Confirmed booking records with unique PNR and payment status.",
          "hi": "Confirmed ticket details, PNR number aur status."
        },
        "columns": [
          {
            "name": "booking_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "Booking primary key",
              "hi": "Booking record ID"
            }
          },
          {
            "name": "pnr_number",
            "type": "VARCHAR(12)",
            "key": "UNIQUE",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Unique PNR alphanumeric code",
              "hi": "Unique PNR ticket code"
            }
          },
          {
            "name": "total_fare",
            "type": "DECIMAL(10,2)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Total paid fare",
              "hi": "Kul kiraya GST ke sath"
            }
          },
          {
            "name": "booking_status",
            "type": "VARCHAR(20)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "'CONFIRMED'",
            "desc": {
              "en": "CONFIRMED, CANCELLED",
              "hi": "Booking status"
            }
          }
        ]
      }
    ],
    "sql": "CREATE TABLE operators (\n    operator_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    company_name VARCHAR(150) NOT NULL,\n    contact_phone VARCHAR(20) NOT NULL,\n    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'\n);\n\nCREATE TABLE buses (\n    bus_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    operator_id UUID NOT NULL REFERENCES operators(operator_id),\n    bus_number VARCHAR(30) UNIQUE NOT NULL,\n    bus_type VARCHAR(50) NOT NULL,\n    total_seats INT NOT NULL\n);\n\nCREATE TABLE bus_seats (\n    seat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    bus_id UUID NOT NULL REFERENCES buses(bus_id) ON DELETE CASCADE,\n    seat_number VARCHAR(10) NOT NULL,\n    deck_type VARCHAR(10) NOT NULL DEFAULT 'LOWER',\n    seat_type VARCHAR(20) NOT NULL DEFAULT 'SEATER',\n    UNIQUE(bus_id, seat_number)\n);\n\nCREATE TABLE schedules (\n    schedule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    bus_id UUID NOT NULL REFERENCES buses(bus_id),\n    departure_time TIMESTAMP NOT NULL,\n    base_fare DECIMAL(10,2) NOT NULL\n);\n\nCREATE TABLE seat_locks (\n    lock_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    schedule_id UUID NOT NULL REFERENCES schedules(schedule_id),\n    seat_id UUID NOT NULL REFERENCES bus_seats(seat_id),\n    expires_at TIMESTAMP NOT NULL,\n    CONSTRAINT unique_seat_schedule_lock UNIQUE(schedule_id, seat_id)\n);\n\nCREATE TABLE bookings (\n    booking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    pnr_number VARCHAR(12) UNIQUE NOT NULL,\n    schedule_id UUID NOT NULL REFERENCES schedules(schedule_id),\n    total_fare DECIMAL(10,2) NOT NULL,\n    booking_status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED'\n);",
    "queries": [
      {
        "title": {
          "en": "Find unbooked and unlocked seats for a trip",
          "hi": "Ek trip ke liye available (unbooked & unlocked) seats khojna"
        },
        "explanation": {
          "en": "Excludes seats that are either confirmed in bookings or currently locked in seat_locks with valid TTL.",
          "hi": "Ye query confirmed bookings aur active temporary seat locks dono ko exclude karke khali seats return karti hai."
        },
        "sql": "SELECT bs.seat_id, bs.seat_number, bs.deck_type, bs.seat_type\nFROM bus_seats bs\nJOIN schedules s ON bs.bus_id = s.bus_id\nWHERE s.schedule_id = 'YOUR_SCHEDULE_UUID'\n  AND bs.seat_id NOT IN (\n      SELECT seat_id FROM booking_passengers bp JOIN bookings b ON bp.booking_id = b.booking_id WHERE b.schedule_id = 'YOUR_SCHEDULE_UUID' AND b.booking_status = 'CONFIRMED'\n  )\n  AND bs.seat_id NOT IN (\n      SELECT seat_id FROM seat_locks WHERE schedule_id = 'YOUR_SCHEDULE_UUID' AND expires_at > NOW()\n  );"
      }
    ],
    "bestPractices": {
      "en": [
        "Enforce UNIQUE constraint on (schedule_id, seat_id) in temporary seat locks.",
        "Use background cleanup cron or Redis TTL for expired locks."
      ],
      "hi": [
        "Temporary locks me (schedule_id, seat_id) par unique constraint zaroori hai.",
        "Expired locks ke liye automated background cleanup worker use karein."
      ]
    },
    "edgeCases": {
      "en": [
        "Simultaneous seat clicks by two users: database constraint guarantees only one transaction succeeds.",
        "Payment failure: seat locks expire naturally in 10 minutes."
      ],
      "hi": [
        "Do users ek hi seat par click karein to UNIQUE constraint fail hoke ek user ko failure response deta hai.",
        "Payment dropped hone par 10 min me lock automatic drop ho jata hai."
      ]
    }
  },
  {
    "id": "captcha-management",
    "title": {
      "en": "CAPTCHA Management System DB Design",
      "hi": "CAPTCHA Management System \u2014 Multi-Tenant SaaS DB Design"
    },
    "tagline": {
      "en": "reCAPTCHA / hCaptcha style enterprise SaaS bot detection & rate limiting system",
      "hi": "reCAPTCHA aur hCaptcha jaisa enterprise SaaS bot detection database design"
    },
    "category": "Security / SaaS",
    "targetDB": "PostgreSQL 15+",
    "tableCount": 8,
    "overview": {
      "en": "Multi-tenant SaaS CAPTCHA verification service architecture (like Google reCAPTCHA or hCaptcha). Handles API keys, website domains, challenge tokens, bot detection scores, verification logs, and strict rate-limiting quotas per client.",
      "hi": "Google reCAPTCHA aur hCaptcha type system ka database design. Multi-tenant SaaS architecture me multiple websites/clients register kar sakte hain, API keys generation, token challenge validation, bot score analytics aur IP rate limiting store hota hai."
    },
    "architecture": {
      "en": "Each client has account tenants with site keys and secret keys. Web apps embed site keys to render CAPTCHA widgets. Every challenge generates a short-lived single-use token (TTL 2 mins). Verification endpoints evaluate token validity, IP address, user-agent, and bot confidence score (0.0 = bot, 1.0 = human).",
      "hi": "Clients login karke site_key aur secret_key generate karte hain. Challenge request par short-lived single-use verification token banta hai. Backend secret_key se token verify karta hai aur bot confidence score (0.0 bot - 1.0 human) record karta hai."
    },
    "mermaid": "erDiagram\n    ACCOUNTS ||--o{ SITES : owns\n    SITES ||--o{ API_KEYS : authenticates\n    SITES ||--o{ CHALLENGES : generates\n    CHALLENGES ||--o{ VERIFICATIONS : validates\n    SITES ||--o{ DAILY_USAGE : tracks",
    "tables": [
      {
        "name": "accounts",
        "description": {
          "en": "Enterprise client account managing subscriptions and billing.",
          "hi": "Client/Customer account master table jo SaaS subscription manage karta hai."
        },
        "columns": [
          {
            "name": "account_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "Unique account identifier",
              "hi": "Account unique identifier"
            }
          },
          {
            "name": "company_name",
            "type": "VARCHAR(150)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Client company name",
              "hi": "Client company ka naam"
            }
          },
          {
            "name": "plan_type",
            "type": "VARCHAR(30)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "'FREE'",
            "desc": {
              "en": "Subscription plan (FREE, PRO, ENTERPRISE)",
              "hi": "SaaS plan level"
            }
          }
        ]
      },
      {
        "name": "sites",
        "description": {
          "en": "Registered web domains configured under a client account.",
          "hi": "Client ke registered web domains aur site-level settings."
        },
        "columns": [
          {
            "name": "site_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "Unique site ID",
              "hi": "Site unique ID"
            }
          },
          {
            "name": "account_id",
            "type": "UUID",
            "key": "FK",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Owner account FK",
              "hi": "Owner account link"
            }
          },
          {
            "name": "site_key",
            "type": "VARCHAR(64)",
            "key": "UNIQUE",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Public API key embedded in frontend HTML",
              "hi": "Public site key HTML widget ke liye"
            }
          },
          {
            "name": "secret_key_hash",
            "type": "VARCHAR(255)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Hashed private secret key used in backend server API",
              "hi": "Backend API verification ke liye secret key hash"
            }
          }
        ]
      },
      {
        "name": "challenges",
        "description": {
          "en": "Ephemeral challenge tokens issued to users with 2-minute TTL.",
          "hi": "Short-lived single-use CAPTCHA challenge token (2-min validity)."
        },
        "columns": [
          {
            "name": "challenge_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "Challenge ID",
              "hi": "Challenge unique ID"
            }
          },
          {
            "name": "site_id",
            "type": "UUID",
            "key": "FK",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Target site FK",
              "hi": "Target site reference"
            }
          },
          {
            "name": "token",
            "type": "VARCHAR(128)",
            "key": "UNIQUE",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Single-use verification token",
              "hi": "Single-use verification token"
            }
          },
          {
            "name": "expires_at",
            "type": "TIMESTAMP",
            "key": "INDEX",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Token expiry timestamp",
              "hi": "Token expiry time"
            }
          },
          {
            "name": "is_used",
            "type": "BOOLEAN",
            "key": "",
            "nullable": "NO",
            "defaultVal": "FALSE",
            "desc": {
              "en": "Prevents token replay attacks",
              "hi": "Replay attack se bachane ke liye single-use flag"
            }
          }
        ]
      },
      {
        "name": "verifications",
        "description": {
          "en": "Audit logs of challenge verifications with bot confidence scores and client IP.",
          "hi": "Verification attempt log with bot detection confidence score (0.0 to 1.0)."
        },
        "columns": [
          {
            "name": "verification_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "Log record ID",
              "hi": "Log record unique ID"
            }
          },
          {
            "name": "challenge_id",
            "type": "UUID",
            "key": "FK",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Linked challenge",
              "hi": "Challenge FK link"
            }
          },
          {
            "name": "ip_address",
            "type": "INET",
            "key": "INDEX",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "User client IP address",
              "hi": "Client user ka IP address"
            }
          },
          {
            "name": "bot_score",
            "type": "DECIMAL(3,2)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Confidence score: 0.0 (Bot) to 1.0 (Human)",
              "hi": "Bot confidence score (0.0 = bot, 1.0 = human)"
            }
          },
          {
            "name": "is_success",
            "type": "BOOLEAN",
            "key": "",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Verification outcome",
              "hi": "Pass/Fail status"
            }
          }
        ]
      }
    ],
    "sql": "CREATE TABLE accounts (\n    account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    company_name VARCHAR(150) NOT NULL,\n    plan_type VARCHAR(30) NOT NULL DEFAULT 'FREE',\n    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE sites (\n    site_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    account_id UUID NOT NULL REFERENCES accounts(account_id),\n    site_key VARCHAR(64) UNIQUE NOT NULL,\n    secret_key_hash VARCHAR(255) NOT NULL,\n    allowed_domains TEXT[] NOT NULL\n);\n\nCREATE TABLE challenges (\n    challenge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    site_id UUID NOT NULL REFERENCES sites(site_id),\n    token VARCHAR(128) UNIQUE NOT NULL,\n    expires_at TIMESTAMP NOT NULL,\n    is_used BOOLEAN NOT NULL DEFAULT FALSE\n);\n\nCREATE INDEX idx_challenges_token ON challenges(token) WHERE is_used = FALSE;\n\nCREATE TABLE verifications (\n    verification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    challenge_id UUID NOT NULL REFERENCES challenges(challenge_id),\n    ip_address INET NOT NULL,\n    user_agent TEXT,\n    bot_score DECIMAL(3,2) NOT NULL,\n    is_success BOOLEAN NOT NULL,\n    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);",
    "queries": [
      {
        "title": {
          "en": "Verify single-use CAPTCHA token and mark used atomically",
          "hi": "Single-use CAPTCHA token verify karna aur atomic way me used mark karna"
        },
        "explanation": {
          "en": "Ensures token is valid, unexpired, and atomically sets `is_used = TRUE` to prevent replay attacks.",
          "hi": "Atomic update statement jo check karta hai ki token valid aur unexpired hai, aur replay attacks rokne ke liye `is_used = TRUE` karta hai."
        },
        "sql": "UPDATE challenges\nSET is_used = TRUE\nWHERE token = 'INPUT_TOKEN'\n  AND is_used = FALSE\n  AND expires_at > NOW()\nRETURNING challenge_id, site_id;"
      }
    ],
    "bestPractices": {
      "en": [
        "Always hash secret keys with BCrypt or SHA-256 before storing.",
        "Never store plain secret keys in database tables."
      ],
      "hi": [
        "Secret keys ko database me plaintext me store mat karein, hashed format me rakhein.",
        "Tokens par single-use (`is_used = TRUE`) enforce karein."
      ]
    },
    "edgeCases": {
      "en": [
        "Replay attacks: attempted by reusing valid tokens twice; thwarted by conditional UPDATE `is_used = FALSE`."
      ],
      "hi": [
        "Replay attacks ko batch UPDATE query me `is_used = FALSE` checking se block kiya jata hai."
      ]
    }
  },
  {
    "id": "caregiver-saas",
    "title": {
      "en": "Caregiver & Shift Management SaaS DB Design",
      "hi": "Caregiver & Shift Management SaaS (Shift-ware NDIS) DB Design"
    },
    "tagline": {
      "en": "NDIS / Aged Care shift scheduling, client care plans, and roster management multi-tenant SaaS",
      "hi": "Caregiver, Aged Care aur NDIS shift roster scheduling SaaS platform ka database design"
    },
    "category": "Healthcare / SaaS",
    "targetDB": "PostgreSQL 15+",
    "tableCount": 10,
    "overview": {
      "en": "Multi-tenant SaaS database design for Caregiver and NDIS Shift Management (Shift-ware). Designed with Row-Level Tenant Isolation (`company_id`), client care plans, caregiver qualifications, shift rosters, timesheets, clock-in GPS coordinates, and invoice billing.",
      "hi": "Shift-ware NDIS Caregiver Management SaaS web + mobile application ka complete DB design. Multi-tenant company-per-tenant isolation (`company_id`), clients care plan, caregiver skills, shift rosters, GPS clock-in tracking aur billing cover karta hai."
    },
    "architecture": {
      "en": "Uses Row-Level Tenant Isolation (`company_id` on all major tables). Care providers schedule shifts for clients. Caregivers receive shift alerts on mobile app, clock in/out with GPS verification, write shift case notes, and generate compliant NDIS invoices.",
      "hi": "Har table me `company_id` foreign key hai for strict multi-tenant isolation. Care providers clients ke liye shift roster banate hain, Caregivers mobile app se GPS clock-in karte hain, case notes likhte hain aur timesheet submit karte hain."
    },
    "mermaid": "erDiagram\n    COMPANIES ||--o{ USERS : employs\n    COMPANIES ||--o{ CLIENTS : serves\n    CLIENTS ||--o{ CARE_PLANS : details\n    COMPANIES ||--o{ SHIFTS : schedules\n    SHIFTS ||--o{ TIMESHEETS : tracks\n    TIMESHEETS ||--o{ INVOICE_ITEMS : bills",
    "tables": [
      {
        "name": "companies",
        "description": {
          "en": "SaaS tenant account representing care provider agencies.",
          "hi": "SaaS Multi-tenant company/agency master table."
        },
        "columns": [
          {
            "name": "company_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "Tenant company ID",
              "hi": "Tenant company ID"
            }
          },
          {
            "name": "company_name",
            "type": "VARCHAR(150)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Agency name",
              "hi": "Care Provider agency name"
            }
          },
          {
            "name": "ndis_registration_no",
            "type": "VARCHAR(50)",
            "key": "",
            "nullable": "YES",
            "defaultVal": "-",
            "desc": {
              "en": "NDIS official registration number",
              "hi": "Government NDIS registration number"
            }
          }
        ]
      },
      {
        "name": "users",
        "description": {
          "en": "Staff members, caregivers, roster managers, and agency admins.",
          "hi": "Caregivers, support workers, roster managers aur admins ka master profile."
        },
        "columns": [
          {
            "name": "user_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "User primary key",
              "hi": "User primary key"
            }
          },
          {
            "name": "company_id",
            "type": "UUID",
            "key": "FK",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Tenant company reference",
              "hi": "Company isolation link"
            }
          },
          {
            "name": "email",
            "type": "VARCHAR(100)",
            "key": "INDEX",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Login email",
              "hi": "Login email address"
            }
          },
          {
            "name": "user_role",
            "type": "VARCHAR(30)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "'CAREGIVER'",
            "desc": {
              "en": "ADMIN, ROSTER_MANAGER, CAREGIVER",
              "hi": "System role"
            }
          }
        ]
      },
      {
        "name": "shifts",
        "description": {
          "en": "Scheduled caregiver shift roster with assigned client, caregiver, and timing.",
          "hi": "Shift roster master table (start time, end time, client, caregiver assignment)."
        },
        "columns": [
          {
            "name": "shift_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "Shift primary key",
              "hi": "Shift unique ID"
            }
          },
          {
            "name": "company_id",
            "type": "UUID",
            "key": "FK",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Tenant isolation link",
              "hi": "Tenant company link"
            }
          },
          {
            "name": "caregiver_id",
            "type": "UUID",
            "key": "FK",
            "nullable": "YES",
            "defaultVal": "-",
            "desc": {
              "en": "Assigned support worker",
              "hi": "Assigned caregiver user ID"
            }
          },
          {
            "name": "start_time",
            "type": "TIMESTAMP",
            "key": "INDEX",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Shift scheduled start",
              "hi": "Shift start timing"
            }
          },
          {
            "name": "end_time",
            "type": "TIMESTAMP",
            "key": "",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Shift scheduled end",
              "hi": "Shift end timing"
            }
          },
          {
            "name": "shift_status",
            "type": "VARCHAR(20)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "'UNASSIGNED'",
            "desc": {
              "en": "UNASSIGNED, PUBLISHED, COMPLETED, CANCELLED",
              "hi": "Shift status"
            }
          }
        ]
      },
      {
        "name": "timesheets",
        "description": {
          "en": "Actual recorded shift attendance with GPS clock-in/out coordinates and break durations.",
          "hi": "Actual clock-in/clock-out time, GPS lat/long verification aur travel km log."
        },
        "columns": [
          {
            "name": "timesheet_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "Timesheet ID",
              "hi": "Timesheet primary key"
            }
          },
          {
            "name": "shift_id",
            "type": "UUID",
            "key": "FK",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Linked shift ID",
              "hi": "Shift FK link"
            }
          },
          {
            "name": "clock_in",
            "type": "TIMESTAMP",
            "key": "",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Actual clock-in timestamp",
              "hi": "Caregiver actual clock-in time"
            }
          },
          {
            "name": "clock_out",
            "type": "TIMESTAMP",
            "key": "",
            "nullable": "YES",
            "defaultVal": "-",
            "desc": {
              "en": "Actual clock-out timestamp",
              "hi": "Caregiver actual clock-out time"
            }
          },
          {
            "name": "clock_in_lat",
            "type": "DECIMAL(10,8)",
            "key": "",
            "nullable": "YES",
            "defaultVal": "-",
            "desc": {
              "en": "GPS latitude at clock-in",
              "hi": "Clock-in time GPS Latitude"
            }
          },
          {
            "name": "clock_in_lng",
            "type": "DECIMAL(11,8)",
            "key": "",
            "nullable": "YES",
            "defaultVal": "-",
            "desc": {
              "en": "GPS longitude at clock-in",
              "hi": "Clock-in time GPS Longitude"
            }
          }
        ]
      }
    ],
    "sql": "CREATE TABLE companies (\n    company_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    company_name VARCHAR(150) NOT NULL,\n    ndis_registration_no VARCHAR(50),\n    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE users (\n    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    company_id UUID NOT NULL REFERENCES companies(company_id),\n    email VARCHAR(100) NOT NULL,\n    user_role VARCHAR(30) NOT NULL DEFAULT 'CAREGIVER'\n);\n\nCREATE INDEX idx_users_company ON users(company_id);\n\nCREATE TABLE shifts (\n    shift_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    company_id UUID NOT NULL REFERENCES companies(company_id),\n    caregiver_id UUID REFERENCES users(user_id),\n    start_time TIMESTAMP NOT NULL,\n    end_time TIMESTAMP NOT NULL,\n    shift_status VARCHAR(20) NOT NULL DEFAULT 'UNASSIGNED'\n);\n\nCREATE TABLE timesheets (\n    timesheet_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    shift_id UUID NOT NULL REFERENCES shifts(shift_id),\n    clock_in TIMESTAMP NOT NULL,\n    clock_out TIMESTAMP,\n    clock_in_lat DECIMAL(10,8),\n    clock_in_lng DECIMAL(11,8)\n);",
    "queries": [
      {
        "title": {
          "en": "Find overlapping shifts for a caregiver to prevent double booking",
          "hi": "Caregiver ke overlapping shift timing check karna taaki double roster assign na ho"
        },
        "explanation": {
          "en": "Checks if caregiver has another shift where time intervals overlap.",
          "hi": "Ye query caregiver ki standard schedule overlap condition (`(start_time < NEW_END) AND (end_time > NEW_START)`) verify karti hai."
        },
        "sql": "SELECT shift_id, start_time, end_time\nFROM shifts\nWHERE company_id = 'TENANT_UUID'\n  AND caregiver_id = 'CAREGIVER_UUID'\n  AND shift_status IN ('PUBLISHED', 'IN_PROGRESS')\n  AND start_time < 'PROPOSED_END_TIME'\n  AND end_time > 'PROPOSED_START_TIME';"
      }
    ],
    "bestPractices": {
      "en": [
        "Always include `company_id` index on all multi-tenant tables.",
        "Use PostgreSQL Row-Level Security (RLS) to enforce tenant privacy."
      ],
      "hi": [
        "Har multi-tenant table par `company_id` index mandatory hai.",
        "Row-Level Security (RLS) policies lagane se cross-tenant data leak nahi hota."
      ]
    },
    "edgeCases": {
      "en": [
        "Caregiver forgetting to clock-out: background job flags open timesheets past shift end time for manager manual review."
      ],
      "hi": [
        "Caregiver agar clock-out na kare to background job timesheet ko 'REQUIRES_APPROVAL' flag kar deta hai."
      ]
    }
  },
  {
    "id": "chat-app",
    "title": {
      "en": "Real-time Chat Application DB Design",
      "hi": "Real-time Chat Application (WhatsApp/Slack) DB Design"
    },
    "tagline": {
      "en": "WhatsApp / Telegram / Slack style high-scale messaging database design",
      "hi": "WhatsApp, Telegram aur Slack style real-time messaging, group chat aur media sharing DB design"
    },
    "category": "Communication",
    "targetDB": "PostgreSQL 15+",
    "tableCount": 12,
    "overview": {
      "en": "Production-grade database design for real-time messaging apps like WhatsApp or Slack. Features 1-on-1 direct messaging, group chats, message status receipts (Sent, Delivered, Read), media attachments, user presence states, and message deletion/editing history.",
      "hi": "WhatsApp / Telegram / Slack style messaging app ka complete DB design. Direct 1-to-1 chats, group chats, message delivery/read receipts (blue ticks), media attachment store aur active online status tracking handle karta hai."
    },
    "architecture": {
      "en": "Separates conversation meta (`conversations`, `conversation_participants`) from message payloads (`messages`). Tracks individual recipient delivery and read timestamps in `message_receipts` for granular multi-user read state.",
      "hi": "Conversations table metadata manage karta hai. Message payloads `messages` table me star hote hain. Group chat me har user ka delivery aur read status (blue tick) `message_receipts` junction table se track hota hai."
    },
    "mermaid": "erDiagram\n    USERS ||--o{ CONVERSATION_PARTICIPANTS : joins\n    CONVERSATIONS ||--o{ CONVERSATION_PARTICIPANTS : contains\n    CONVERSATIONS ||--o{ MESSAGES : holds\n    MESSAGES ||--o{ MESSAGE_RECEIPTS : tracks\n    MESSAGES ||--o{ ATTACHMENTS : includes",
    "tables": [
      {
        "name": "users",
        "description": {
          "en": "User accounts with phone numbers, profile avatars, and online status.",
          "hi": "App users, phone number, profile photo aur last seen timestamp."
        },
        "columns": [
          {
            "name": "user_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "User unique ID",
              "hi": "User primary key"
            }
          },
          {
            "name": "phone_number",
            "type": "VARCHAR(20)",
            "key": "UNIQUE",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Phone number with country code",
              "hi": "Country code ke sath mobile number"
            }
          },
          {
            "name": "display_name",
            "type": "VARCHAR(100)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "User display name",
              "hi": "Chat profile name"
            }
          },
          {
            "name": "last_seen",
            "type": "TIMESTAMP",
            "key": "",
            "nullable": "YES",
            "defaultVal": "-",
            "desc": {
              "en": "Last online presence timestamp",
              "hi": "Last seen online timing"
            }
          }
        ]
      },
      {
        "name": "conversations",
        "description": {
          "en": "Container for direct 1-to-1 or group chat threads.",
          "hi": "Direct 1-to-1 ya group chat thread master table."
        },
        "columns": [
          {
            "name": "conversation_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "Conversation unique ID",
              "hi": "Chat thread ID"
            }
          },
          {
            "name": "type",
            "type": "VARCHAR(20)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "'DIRECT'",
            "desc": {
              "en": "DIRECT or GROUP",
              "hi": "DIRECT chat ya GROUP chat"
            }
          },
          {
            "name": "title",
            "type": "VARCHAR(100)",
            "key": "",
            "nullable": "YES",
            "defaultVal": "-",
            "desc": {
              "en": "Group name (null for direct)",
              "hi": "Group title (direct chat me NULL)"
            }
          }
        ]
      },
      {
        "name": "messages",
        "description": {
          "en": "Individual text messages, media pointers, sender, and timestamp.",
          "hi": "Sent chat message text, sender ID, timestamp aur media reference."
        },
        "columns": [
          {
            "name": "message_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "Message unique ID",
              "hi": "Message primary key"
            }
          },
          {
            "name": "conversation_id",
            "type": "UUID",
            "key": "FK",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Conversation reference",
              "hi": "Conversation FK link"
            }
          },
          {
            "name": "sender_id",
            "type": "UUID",
            "key": "FK",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "User who sent message",
              "hi": "Message bhejne wala user"
            }
          },
          {
            "name": "content",
            "type": "TEXT",
            "key": "",
            "nullable": "YES",
            "defaultVal": "-",
            "desc": {
              "en": "Message text payload",
              "hi": "Text chat content"
            }
          },
          {
            "name": "created_at",
            "type": "TIMESTAMP",
            "key": "INDEX",
            "nullable": "NO",
            "defaultVal": "NOW()",
            "desc": {
              "en": "Message sent time",
              "hi": "Message sent timestamp"
            }
          }
        ]
      },
      {
        "name": "message_receipts",
        "description": {
          "en": "Per-recipient delivery and read receipt status (Single tick, Double tick, Blue tick).",
          "hi": "Har recipient ke liye delivery aur read timestamp status (Single/Double/Blue tick)."
        },
        "columns": [
          {
            "name": "receipt_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "Receipt ID",
              "hi": "Receipt primary key"
            }
          },
          {
            "name": "message_id",
            "type": "UUID",
            "key": "FK",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Target message",
              "hi": "Message reference"
            }
          },
          {
            "name": "user_id",
            "type": "UUID",
            "key": "FK",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Recipient user ID",
              "hi": "Recipient user ID"
            }
          },
          {
            "name": "delivered_at",
            "type": "TIMESTAMP",
            "key": "",
            "nullable": "YES",
            "defaultVal": "-",
            "desc": {
              "en": "Double tick timestamp",
              "hi": "Device delivery time"
            }
          },
          {
            "name": "read_at",
            "type": "TIMESTAMP",
            "key": "",
            "nullable": "YES",
            "defaultVal": "-",
            "desc": {
              "en": "Blue tick timestamp",
              "hi": "User read time"
            }
          }
        ]
      }
    ],
    "sql": "CREATE TABLE users (\n    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    phone_number VARCHAR(20) UNIQUE NOT NULL,\n    display_name VARCHAR(100) NOT NULL,\n    last_seen TIMESTAMP\n);\n\nCREATE TABLE conversations (\n    conversation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    type VARCHAR(20) NOT NULL DEFAULT 'DIRECT',\n    title VARCHAR(100),\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE conversation_participants (\n    conversation_id UUID REFERENCES conversations(conversation_id),\n    user_id UUID REFERENCES users(user_id),\n    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n    PRIMARY KEY (conversation_id, user_id)\n);\n\nCREATE TABLE messages (\n    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    conversation_id UUID NOT NULL REFERENCES conversations(conversation_id),\n    sender_id UUID NOT NULL REFERENCES users(user_id),\n    content TEXT,\n    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE INDEX idx_messages_conversation_time ON messages(conversation_id, created_at DESC);\n\nCREATE TABLE message_receipts (\n    receipt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    message_id UUID NOT NULL REFERENCES messages(message_id),\n    user_id UUID NOT NULL REFERENCES users(user_id),\n    delivered_at TIMESTAMP,\n    read_at TIMESTAMP,\n    UNIQUE(message_id, user_id)\n);",
    "queries": [
      {
        "title": {
          "en": "Fetch latest 50 messages for a conversation with pagination",
          "hi": "Ek conversation ke latest 50 messages retrieve karna (infinite scrolling ke liye)"
        },
        "explanation": {
          "en": "Queries messages ordered by creation time descending with index optimization on `(conversation_id, created_at DESC)`.",
          "hi": "Compound index `(conversation_id, created_at DESC)` ka use karke instant message history query."
        },
        "sql": "SELECT message_id, sender_id, content, created_at\nFROM messages\nWHERE conversation_id = 'CONVERSATION_UUID'\nORDER BY created_at DESC\nLIMIT 50;"
      }
    ],
    "bestPractices": {
      "en": [
        "Use compound index `(conversation_id, created_at DESC)` for fast pagination.",
        "Partition messages table by created_at month/year at scale."
      ],
      "hi": [
        "Messages fetch speed badhane ke liye `(conversation_id, created_at DESC)` compound index lagayein.",
        "Large scale messaging par monthly partitioning apply karein."
      ]
    },
    "edgeCases": {
      "en": [
        "Unread message counter: query COUNT of receipts where `read_at IS NULL` per user."
      ],
      "hi": [
        "Unread message count ke liye `message_receipts` table me `read_at IS NULL` condition count ki jati hai."
      ]
    }
  },
  {
    "id": "dms",
    "title": {
      "en": "Document Management System (DMS) DB Design",
      "hi": "Document Management System (DMS) Enterprise DB Design"
    },
    "tagline": {
      "en": "Enterprise document repository with versioning, folder hierarchies, access permissions, and approval workflows",
      "hi": "Enterprise Document Management System \u2014 Document versioning, permissions aur workflow DB design"
    },
    "category": "Enterprise",
    "targetDB": "SQL Server / PostgreSQL",
    "tableCount": 10,
    "overview": {
      "en": "Enterprise Document Management System (DMS) database architecture based on Functional Requirement Documents (FRD). Manages nested folder hierarchies, document upload version control (V1.0, V1.1), strict user/role permissions, document tagging, and multi-stage approval workflows.",
      "hi": "Ittanta Technologies FRD reference par \u0906\u0927\u093e\u0930\u093f\u0924 Document Management System ka database design. Folder structure, document file upload versioning, strict role permissions aur approval workflows handle karta hai."
    },
    "architecture": {
      "en": "Folders use Adjacency List pattern (`parent_folder_id`). Documents belong to folders and contain multiple document_versions records (file storage path, hash checksum). Permissions are assigned per folder/document to roles or users.",
      "hi": "Folders nested tree hierarchy (`parent_folder_id`) me store hote hain. Single document record ke andar multiple versions (`document_versions`) store hote hain file checksum hash ke saath."
    },
    "mermaid": "erDiagram\n    FOLDERS ||--o{ FOLDERS : parent_of\n    FOLDERS ||--o{ DOCUMENTS : contains\n    DOCUMENTS ||--o{ DOCUMENT_VERSIONS : tracks\n    DOCUMENTS ||--o{ PERMISSIONS : restricts\n    DOCUMENTS ||--o{ WORKFLOW_STAGES : approves",
    "tables": [
      {
        "name": "folders",
        "description": {
          "en": "Self-referencing tree structure for nested directory hierarchy.",
          "hi": "Directory hierarchy tree structure (parent folder reference)."
        },
        "columns": [
          {
            "name": "folder_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "Folder ID",
              "hi": "Folder unique ID"
            }
          },
          {
            "name": "folder_name",
            "type": "VARCHAR(150)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Directory name",
              "hi": "Folder ka naam"
            }
          },
          {
            "name": "parent_folder_id",
            "type": "UUID",
            "key": "FK",
            "nullable": "YES",
            "defaultVal": "NULL",
            "desc": {
              "en": "Parent folder (NULL for root directory)",
              "hi": "Parent folder reference (Root foldar ke liye NULL)"
            }
          }
        ]
      },
      {
        "name": "documents",
        "description": {
          "en": "Master metadata record for a document file entity.",
          "hi": "Document master entity metadata record."
        },
        "columns": [
          {
            "name": "document_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "Document ID",
              "hi": "Document primary key"
            }
          },
          {
            "name": "folder_id",
            "type": "UUID",
            "key": "FK",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Containing directory FK",
              "hi": "Folder reference link"
            }
          },
          {
            "name": "title",
            "type": "VARCHAR(200)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Document title",
              "hi": "Document title"
            }
          },
          {
            "name": "current_version",
            "type": "VARCHAR(20)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "'v1.0'",
            "desc": {
              "en": "Active release version string",
              "hi": "Active latest version tag"
            }
          }
        ]
      },
      {
        "name": "document_versions",
        "description": {
          "en": "Physical file versions stored on cloud/S3 with MD5 hash checksums.",
          "hi": "Document ke alag-alag uploaded versions, file storage path aur hash checksum."
        },
        "columns": [
          {
            "name": "version_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "Version record ID",
              "hi": "Version unique ID"
            }
          },
          {
            "name": "document_id",
            "type": "UUID",
            "key": "FK",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Parent document",
              "hi": "Document FK link"
            }
          },
          {
            "name": "version_number",
            "type": "VARCHAR(20)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Version code (e.g. 1.0, 1.1, 2.0)",
              "hi": "Version label code"
            }
          },
          {
            "name": "file_path",
            "type": "VARCHAR(500)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "S3 object key or storage file path",
              "hi": "Server / S3 cloud storage file path"
            }
          },
          {
            "name": "file_checksum",
            "type": "VARCHAR(64)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "SHA-256 integrity hash",
              "hi": "File integrity SHA-256 hash"
            }
          }
        ]
      }
    ],
    "sql": "CREATE TABLE folders (\n    folder_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    folder_name VARCHAR(150) NOT NULL,\n    parent_folder_id UUID REFERENCES folders(folder_id),\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE documents (\n    document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    folder_id UUID NOT NULL REFERENCES folders(folder_id),\n    title VARCHAR(200) NOT NULL,\n    current_version VARCHAR(20) NOT NULL DEFAULT 'v1.0'\n);\n\nCREATE TABLE document_versions (\n    version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    document_id UUID NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,\n    version_number VARCHAR(20) NOT NULL,\n    file_path VARCHAR(500) NOT NULL,\n    file_checksum VARCHAR(64) NOT NULL,\n    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);",
    "queries": [
      {
        "title": {
          "en": "Retrieve latest version file path for a document",
          "hi": "Ek document ka latest uploaded version file path nikalna"
        },
        "explanation": {
          "en": "Joins documents with document_versions matching current_version string.",
          "hi": "Current active version tag se exact version file storage path fetch karta hai."
        },
        "sql": "SELECT d.title, dv.version_number, dv.file_path, dv.file_checksum\nFROM documents d\nJOIN document_versions dv ON d.document_id = dv.document_id AND d.current_version = dv.version_number\nWHERE d.document_id = 'DOCUMENT_UUID';"
      }
    ],
    "bestPractices": {
      "en": [
        "Store file checksums (SHA-256) to detect duplicate file uploads.",
        "Store actual binary files in Object Storage (S3/GCS), storing only paths in SQL."
      ],
      "hi": [
        "Binary PDF/DOC files database BLOB me store mat karein; S3/GCS cloud URL DB me rakhein.",
        "Duplicate file uploads detect karne ke liye SHA-256 hash check karein."
      ]
    },
    "edgeCases": {
      "en": [
        "Deleting a folder with nested subfolders: use recursive CTE or CASCADE triggers to clean up or soft-delete whole subtrees."
      ],
      "hi": [
        "Subfolder delete karne par recursive CTE se child folders aur documents Soft-Delete kiye jate hain."
      ]
    }
  },
  {
    "id": "ecommerce",
    "title": {
      "en": "E-Commerce Platform Database Design",
      "hi": "E-Commerce Platform \u2014 Complete Database Design"
    },
    "tagline": {
      "en": "Amazon / Flipkart style production-grade e-commerce backend database architecture",
      "hi": "Amazon aur Flipkart jaisa scalable production-grade E-Commerce platform ka DB design"
    },
    "category": "E-Commerce",
    "targetDB": "PostgreSQL 15+",
    "tableCount": 16,
    "overview": {
      "en": "Complete production-grade E-Commerce database design powering platforms like Amazon or Flipkart. Covers product catalogs, SKUs & variants, inventory warehouses, shopping carts, coupons/discounts, order fulfillment workflows, payments, reviews, and address books.",
      "hi": "Amazon / Flipkart style E-Commerce platform ka complete database design. Products, categories, variants (SKU), inventory management, cart, order fulfillment, coupon codes, payments, product reviews aur order tracking modules cover karta hai."
    },
    "architecture": {
      "en": "Splits abstract products from physical purchasable variants (`product_variants` with unique SKU and stock). Cart items freeze prices at checkout into `order_items` to protect against future price updates.",
      "hi": "Abstract `products` table ko `product_variants` (SKU, Size, Color, Stock) se alag rakhta hai. Cart item checkout ke waqt exact unit price `order_items` me snapshot karta hai taaki future price change se old order billing preserve rahe."
    },
    "mermaid": "erDiagram\n    CATEGORIES ||--o{ PRODUCTS : categorizes\n    PRODUCTS ||--o{ PRODUCT_VARIANTS : has\n    PRODUCT_VARIANTS ||--o{ INVENTORY : tracks\n    USERS ||--o{ ORDERS : places\n    ORDERS ||--o{ ORDER_ITEMS : contains\n    PRODUCT_VARIANTS ||--o{ ORDER_ITEMS : supplies\n    ORDERS ||--o{ PAYMENTS : processed_by",
    "tables": [
      {
        "name": "products",
        "description": {
          "en": "Master catalog item title, brand, description, and base category.",
          "hi": "Product master details (title, description, brand, base category)."
        },
        "columns": [
          {
            "name": "product_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "Product primary key",
              "hi": "Product unique ID"
            }
          },
          {
            "name": "title",
            "type": "VARCHAR(200)",
            "key": "INDEX",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Product title",
              "hi": "Product Title"
            }
          },
          {
            "name": "brand",
            "type": "VARCHAR(100)",
            "key": "",
            "nullable": "YES",
            "defaultVal": "-",
            "desc": {
              "en": "Brand name",
              "hi": "Brand name"
            }
          }
        ]
      },
      {
        "name": "product_variants",
        "description": {
          "en": "Specific purchasable variant (Size, Color) with unique SKU and price.",
          "hi": "Purchasable variant (Size, Color, Price, SKU code)."
        },
        "columns": [
          {
            "name": "variant_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "Variant unique ID",
              "hi": "Variant primary key"
            }
          },
          {
            "name": "product_id",
            "type": "UUID",
            "key": "FK",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Parent product reference",
              "hi": "Parent product link"
            }
          },
          {
            "name": "sku",
            "type": "VARCHAR(50)",
            "key": "UNIQUE",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Stock Keeping Unit barcode string",
              "hi": "Unique SKU identifier"
            }
          },
          {
            "name": "price",
            "type": "DECIMAL(10,2)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Selling price",
              "hi": "Variant selling price"
            }
          }
        ]
      },
      {
        "name": "orders",
        "description": {
          "en": "Customer placed order header with order status, shipping address, and total.",
          "hi": "Customer placed order header (status, total amount, shipping address)."
        },
        "columns": [
          {
            "name": "order_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "Order unique ID",
              "hi": "Order primary key"
            }
          },
          {
            "name": "order_number",
            "type": "VARCHAR(30)",
            "key": "UNIQUE",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Customer order number code",
              "hi": "Unique order reference number"
            }
          },
          {
            "name": "order_status",
            "type": "VARCHAR(30)",
            "key": "INDEX",
            "nullable": "NO",
            "defaultVal": "'PENDING'",
            "desc": {
              "en": "PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED",
              "hi": "Order status"
            }
          }
        ]
      }
    ],
    "sql": "CREATE TABLE products (\n    product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    title VARCHAR(200) NOT NULL,\n    brand VARCHAR(100),\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE product_variants (\n    variant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    product_id UUID NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,\n    sku VARCHAR(50) UNIQUE NOT NULL,\n    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),\n    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0)\n);\n\nCREATE TABLE orders (\n    order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    order_number VARCHAR(30) UNIQUE NOT NULL,\n    total_amount DECIMAL(10,2) NOT NULL,\n    order_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);",
    "queries": [
      {
        "title": {
          "en": "Deduct stock inventory atomically on checkout",
          "hi": "Checkout par stock quantity ko atomically kam karna"
        },
        "explanation": {
          "en": "Decrements stock_quantity safely only if current stock is greater than or equal to required quantity.",
          "hi": "Atomic update statement jo zero stock error se bachata hai (`stock_quantity >= REQUIRED_QTY`)."
        },
        "sql": "UPDATE product_variants\nSET stock_quantity = stock_quantity - 2\nWHERE variant_id = 'VARIANT_UUID'\n  AND stock_quantity >= 2;"
      }
    ],
    "bestPractices": {
      "en": [
        "Always snapshot historical product prices inside `order_items`.",
        "Use `CHECK (stock_quantity >= 0)` constraint to prevent negative inventory."
      ],
      "hi": [
        "Price values ko checkout ke waqt `order_items` me copy karein.",
        "Inventory table me `CHECK (stock_quantity >= 0)` constraint lagayein."
      ]
    },
    "edgeCases": {
      "en": [
        "Flash sales overselling: prevented using atomic SQL UPDATE statements with condition check on stock quantity."
      ],
      "hi": [
        "Flash sale rush me over-selling se bachane ke liye atomic conditional UPDATE query execute ki jati hai."
      ]
    }
  },
  {
    "id": "hospital-management",
    "title": {
      "en": "Hospital Management System (HMS) DB Design",
      "hi": "Hospital Management System (HMS) Full DB Design"
    },
    "tagline": {
      "en": "Patients, Doctor OPD appointments, Inpatient Admissions (IPD), Pharmacy, Lab & Billing DB Design",
      "hi": "Hospital HMS \u2014 Patients, OPD Doctors, IPD Bed Admissions, Pharmacy, Lab aur Billing ka complete DB design"
    },
    "category": "Healthcare",
    "targetDB": "PostgreSQL / MySQL",
    "tableCount": 14,
    "overview": {
      "en": "Comprehensive Hospital Management System (HMS) database design covering Patient registrations (UHID), Doctor OPD appointments, Inpatient Bed Admissions (IPD), Pharmacy drug inventory, Lab test reports, and Consolidated Hospital Billing.",
      "hi": "Complete Hospital Management System (HMS) ka database design. Patients Registration (UHID number), Doctor OPD appointments, Inpatient (IPD) ward/bed admission, Pharmacy inventory, Lab reports aur Billing modules cover karta hai."
    },
    "architecture": {
      "en": "Patients receive a unique permanent UHID number. OPD handles outpatient doctor visits, while IPD tracks room/bed allocation and daily nursing logs. Consolidated billing merges consultation fees, bed charges, pharmacy bills, and lab tests into a single invoice.",
      "hi": "Har patient ko lifetime permanent UHID number milta hai. OPD outpatient doctor visit and IPD ward/bed allocation track hota hai. Final billing summary me room charges, doctor fee, pharmacy aur lab bills combine hote hain."
    },
    "mermaid": "erDiagram\n    PATIENTS ||--o{ APPOINTMENTS : books\n    DOCTORS ||--o{ APPOINTMENTS : attends\n    PATIENTS ||--o{ ADMISSIONS : admitted_in\n    BEDS ||--o{ ADMISSIONS : assigned_to\n    ADMISSIONS ||--o{ PRESCRIPTIONS : prescribed\n    ADMISSIONS ||--o{ BILLS : generates",
    "tables": [
      {
        "name": "patients",
        "description": {
          "en": "Master patient records with lifetime unique health identifier (UHID).",
          "hi": "Patient master record lifetime unique health ID (UHID) ke saath."
        },
        "columns": [
          {
            "name": "patient_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "Patient unique ID",
              "hi": "Patient primary key"
            }
          },
          {
            "name": "uhid",
            "type": "VARCHAR(30)",
            "key": "UNIQUE",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Unique Health ID (e.g. UHID202600123)",
              "hi": "Unique Lifetime Health Identifier code"
            }
          },
          {
            "name": "full_name",
            "type": "VARCHAR(150)",
            "key": "INDEX",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Patient full name",
              "hi": "Patient ka poora naam"
            }
          },
          {
            "name": "blood_group",
            "type": "VARCHAR(5)",
            "key": "",
            "nullable": "YES",
            "defaultVal": "-",
            "desc": {
              "en": "Blood type (A+, O-, etc.)",
              "hi": "Blood group code"
            }
          }
        ]
      },
      {
        "name": "doctors",
        "description": {
          "en": "Medical practitioner staff profiles, department, and consultation fees.",
          "hi": "Hospital doctors, specialization department aur OPD consultation fee."
        },
        "columns": [
          {
            "name": "doctor_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "Doctor ID",
              "hi": "Doctor unique ID"
            }
          },
          {
            "name": "doctor_name",
            "type": "VARCHAR(150)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Doctor full name",
              "hi": "Doctor ka naam"
            }
          },
          {
            "name": "specialization",
            "type": "VARCHAR(100)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Cardiology, Orthopedics, etc.",
              "hi": "Speciality department"
            }
          },
          {
            "name": "opd_fee",
            "type": "DECIMAL(10,2)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Consultation charge",
              "hi": "OPD consultation fee"
            }
          }
        ]
      },
      {
        "name": "admissions",
        "description": {
          "en": "Inpatient (IPD) hospital ward bed admissions and discharge summary.",
          "hi": "IPD ward bed admission, admission date aur discharge summary."
        },
        "columns": [
          {
            "name": "admission_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "Admission ID",
              "hi": "Admission record ID"
            }
          },
          {
            "name": "patient_id",
            "type": "UUID",
            "key": "FK",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Admitted patient",
              "hi": "Patient reference"
            }
          },
          {
            "name": "admitted_at",
            "type": "TIMESTAMP",
            "key": "",
            "nullable": "NO",
            "defaultVal": "NOW()",
            "desc": {
              "en": "Admission timestamp",
              "hi": "Hospital admission timing"
            }
          },
          {
            "name": "discharged_at",
            "type": "TIMESTAMP",
            "key": "",
            "nullable": "YES",
            "defaultVal": "-",
            "desc": {
              "en": "Discharge timestamp",
              "hi": "Hospital discharge timing"
            }
          }
        ]
      }
    ],
    "sql": "CREATE TABLE patients (\n    patient_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    uhid VARCHAR(30) UNIQUE NOT NULL,\n    full_name VARCHAR(150) NOT NULL,\n    blood_group VARCHAR(5),\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE doctors (\n    doctor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    doctor_name VARCHAR(150) NOT NULL,\n    specialization VARCHAR(100) NOT NULL,\n    opd_fee DECIMAL(10,2) NOT NULL\n);\n\nCREATE TABLE admissions (\n    admission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    patient_id UUID NOT NULL REFERENCES patients(patient_id),\n    doctor_id UUID NOT NULL REFERENCES doctors(doctor_id),\n    admitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\n    discharged_at TIMESTAMP\n);",
    "queries": [
      {
        "title": {
          "en": "Find currently admitted IPD patients in hospital",
          "hi": "Abhi hospital me admitted (IPD) active patients ki list nikalna"
        },
        "explanation": {
          "en": "Queries admissions where discharged_at is NULL.",
          "hi": "Admissions table me `discharged_at IS NULL` query karke current admitted patients report dikhata hai."
        },
        "sql": "SELECT p.uhid, p.full_name, d.doctor_name, a.admitted_at\nFROM admissions a\nJOIN patients p ON a.patient_id = p.patient_id\nJOIN doctors d ON a.doctor_id = d.doctor_id\nWHERE a.discharged_at IS NULL;"
      }
    ],
    "bestPractices": {
      "en": [
        "Generate UHID strings using structured sequence patterns (e.g. UHID-YYYY-XXXX).",
        "Never hardcode medical bill item prices."
      ],
      "hi": [
        "UHID string ko systematic sequence generator se format karein.",
        "Pharmacy aur lab billing me prices master pricing catalog se hi copy karein."
      ]
    },
    "edgeCases": {
      "en": [
        "Unassigned IPD bed upon discharge: bed status automatically toggled back to AVAILABLE via database trigger."
      ],
      "hi": [
        "Discharge timing set hote hi bed status trigger ke through AVAILABLE mark ho jata hai."
      ]
    }
  },
  {
    "id": "jewellery-showroom",
    "title": {
      "en": "Jewellery Showroom Database Design",
      "hi": "Jewellery Showroom Complete Database Design"
    },
    "tagline": {
      "en": "Gold / Silver / Diamond stock management, daily gold rate engine, old gold exchange, and retail billing",
      "hi": "Gold, Silver, Diamond showroom stock, daily metal rate updates, old gold exchange aur GST billing DB design"
    },
    "category": "Retail",
    "targetDB": "PostgreSQL / MySQL",
    "tableCount": 12,
    "overview": {
      "en": "Specialized retail database design for Jewellery Showrooms. Handles daily dynamic metal rates (24K, 22K, 18K Gold, Silver per gram), item metal weight breakdown (Gross Weight, Net Weight, Stone Weight, Making Charges), old gold customer trade-in exchanges, and GST tax billing.",
      "hi": "Jewellery Showroom Management System ke liye specialized database design. Daily Gold/Silver market rates, item weight breakdown (Gross Wt, Net Wt, Stone Wt, Making Charges %), Old Gold Exchange trade-in aur GST invoice tax calculations cover karta hai."
    },
    "architecture": {
      "en": "Daily metal prices are logged in `daily_rates`. Invoice line items fetch the latest metal rate for the item's purity karat. Making charges can be percentage-based or per-gram.",
      "hi": "Daily metal rates `daily_rates` table me update hote hain. Invoice item calculate hote waqt 22K/18K Gold ka actual net weight * daily rate + Making charge + GST compute hota hai."
    },
    "mermaid": "erDiagram\n    DAILY_RATES ||--o{ INVOICE_ITEMS : applies_to\n    ITEMS ||--o{ INVOICE_ITEMS : sold_in\n    CUSTOMERS ||--o{ INVOICES : buys\n    CUSTOMERS ||--o{ OLD_GOLD_EXCHANGES : trades_in\n    OLD_GOLD_EXCHANGES ||--o{ INVOICES : offsets",
    "tables": [
      {
        "name": "daily_rates",
        "description": {
          "en": "Daily market gold/silver rates per gram for different purity karats.",
          "hi": "Daily market gold/silver rates per gram (24K, 22K, 18K, Silver)."
        },
        "columns": [
          {
            "name": "rate_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "Rate ID",
              "hi": "Rate record ID"
            }
          },
          {
            "name": "rate_date",
            "type": "DATE",
            "key": "INDEX",
            "nullable": "NO",
            "defaultVal": "CURRENT_DATE",
            "desc": {
              "en": "Rate date",
              "hi": "Market rate date"
            }
          },
          {
            "name": "gold_24k_per_gram",
            "type": "DECIMAL(10,2)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "24K rate per gram",
              "hi": "24K Gold rate per gram"
            }
          },
          {
            "name": "gold_22k_per_gram",
            "type": "DECIMAL(10,2)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "22K rate per gram",
              "hi": "22K Gold rate per gram"
            }
          }
        ]
      },
      {
        "name": "items",
        "description": {
          "en": "Showroom jewellery inventory with exact weight specifications.",
          "hi": "Jewellery inventory (Gross weight, Stone weight, Net gold weight, Karat purity)."
        },
        "columns": [
          {
            "name": "item_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "Item tag barcode ID",
              "hi": "Jewellery tag barcode ID"
            }
          },
          {
            "name": "tag_number",
            "type": "VARCHAR(50)",
            "key": "UNIQUE",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Unique tag barcode string",
              "hi": "Jewellery tag barcode number"
            }
          },
          {
            "name": "gross_weight_grams",
            "type": "DECIMAL(8,3)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Total item weight on scale",
              "hi": "Kaanta balance gross weight"
            }
          },
          {
            "name": "net_weight_grams",
            "type": "DECIMAL(8,3)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Net metal weight excluding stones",
              "hi": "Pure gold net weight stones hatakar"
            }
          },
          {
            "name": "karat",
            "type": "VARCHAR(10)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "'22K'",
            "desc": {
              "en": "22K, 18K, 24K",
              "hi": "Gold purity karat"
            }
          }
        ]
      }
    ],
    "sql": "CREATE TABLE daily_rates (\n    rate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    rate_date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,\n    gold_24k_per_gram DECIMAL(10,2) NOT NULL,\n    gold_22k_per_gram DECIMAL(10,2) NOT NULL,\n    silver_per_gram DECIMAL(10,2) NOT NULL\n);\n\nCREATE TABLE items (\n    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    tag_number VARCHAR(50) UNIQUE NOT NULL,\n    item_name VARCHAR(150) NOT NULL,\n    gross_weight_grams DECIMAL(8,3) NOT NULL,\n    net_weight_grams DECIMAL(8,3) NOT NULL,\n    karat VARCHAR(10) NOT NULL DEFAULT '22K',\n    making_charge_per_gram DECIMAL(10,2) NOT NULL\n);",
    "queries": [
      {
        "title": {
          "en": "Calculate live price for a jewellery item based on today's gold rate",
          "hi": "Aaj ke gold rate ke hisab se jewellery item ki live selling price calculate karna"
        },
        "explanation": {
          "en": "Multiplies item's net gold weight by today's 22K rate and adds making charges.",
          "hi": "Net weight ko aaj ke 22K gold rate se multiply karke total making charge add karta hai."
        },
        "sql": "SELECT i.tag_number, i.item_name, i.net_weight_grams, dr.gold_22k_per_gram,\n       (i.net_weight_grams * dr.gold_22k_per_gram) + (i.net_weight_grams * i.making_charge_per_gram) AS estimated_price\nFROM items i\nCROSS JOIN daily_rates dr\nWHERE i.tag_number = 'TAG10023' AND dr.rate_date = CURRENT_DATE;"
      }
    ],
    "bestPractices": {
      "en": [
        "Store weights up to 3 decimal places (`DECIMAL(8,3)`) for precise gram accuracy.",
        "Lock gold rate on invoice creation."
      ],
      "hi": [
        "Weight measurements hamesha 3 decimal places (`DECIMAL(8,3)`) rakhein.",
        "Invoice creation ke waqt exact gold rate billing lock karein."
      ]
    },
    "edgeCases": {
      "en": [
        "Old gold exchange value exceeding new purchase: system issues store credit voucher for remaining balance."
      ],
      "hi": [
        "Old gold exchange price agar nayi purchase se jyada ho to credit voucher table record ban jata hai."
      ]
    }
  },
  {
    "id": "library-management",
    "title": {
      "en": "Library Management System (LMS) DB Design",
      "hi": "Library Management System (LMS) Database Design"
    },
    "tagline": {
      "en": "Books catalog, physical book copies (ISBN), member management, issue/return transactions, and overdue fine calculations",
      "hi": "Complete Library Management System \u2014 Books, ISBN copies, Member cards, Issue/Return aur Fine calculation DB design"
    },
    "category": "Education",
    "targetDB": "PostgreSQL / MySQL",
    "tableCount": 10,
    "overview": {
      "en": "Production-grade database design for Library Management Systems (LMS). Features ISBN book cataloging, multiple physical copy accession barcodes, member membership cards, book borrowing/return issue tracking, overdue fine calculation, and book reservation queues.",
      "hi": "Complete Library Management System (LMS) ka database design. Book titles catalog (ISBN), physical book copy accessions (Barcodes), member accounts, issue/return tracking, overdue fine logic aur book reservation queue handle karta hai."
    },
    "architecture": {
      "en": "Distinguishes abstract book titles (`books` with ISBN) from physical copies (`book_copies` with unique accession numbers). Issue records track borrowing dates, due dates, return dates, and fine amounts.",
      "hi": "Master `books` table ISBN title detail rakhta hai, jabki `book_copies` physical book copy barcode track karta hai. Issue table me due date aur per-day fine calculation logic hoti hai."
    },
    "mermaid": "erDiagram\n    BOOKS ||--o{ BOOK_COPIES : has\n    MEMBERS ||--o{ BOOK_ISSUES : borrows\n    BOOK_COPIES ||--o{ BOOK_ISSUES : issued_as\n    BOOK_ISSUES ||--o{ FINES : incurs\n    BOOKS ||--o{ RESERVATIONS : holds",
    "tables": [
      {
        "name": "books",
        "description": {
          "en": "Master book catalog title, author, publisher, and ISBN code.",
          "hi": "Book catalog master details (Title, Author, ISBN, Edition)."
        },
        "columns": [
          {
            "name": "book_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "Book master ID",
              "hi": "Book primary key"
            }
          },
          {
            "name": "isbn",
            "type": "VARCHAR(20)",
            "key": "UNIQUE",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "International Standard Book Number",
              "hi": "International ISBN code"
            }
          },
          {
            "name": "title",
            "type": "VARCHAR(200)",
            "key": "INDEX",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Book title",
              "hi": "Book ka title"
            }
          },
          {
            "name": "author",
            "type": "VARCHAR(150)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Author name",
              "hi": "Lekhak ka naam"
            }
          }
        ]
      },
      {
        "name": "book_copies",
        "description": {
          "en": "Physical physical copy inventory with barcode accession numbers.",
          "hi": "Library me physical book copies ka barcode accession number."
        },
        "columns": [
          {
            "name": "copy_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "Copy ID",
              "hi": "Copy unique ID"
            }
          },
          {
            "name": "book_id",
            "type": "UUID",
            "key": "FK",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Master book reference",
              "hi": "Master book link"
            }
          },
          {
            "name": "accession_number",
            "type": "VARCHAR(50)",
            "key": "UNIQUE",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Physical barcode scanner tag",
              "hi": "Physical copy barcode number"
            }
          },
          {
            "name": "status",
            "type": "VARCHAR(20)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "'AVAILABLE'",
            "desc": {
              "en": "AVAILABLE, ISSUED, RESERVED, LOST",
              "hi": "Copy availability status"
            }
          }
        ]
      },
      {
        "name": "book_issues",
        "description": {
          "en": "Borrowing transaction log tracking issue date, due date, and actual return date.",
          "hi": "Member book issue/return record (issue date, due date, actual return date)."
        },
        "columns": [
          {
            "name": "issue_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "Issue transaction ID",
              "hi": "Issue transaction ID"
            }
          },
          {
            "name": "copy_id",
            "type": "UUID",
            "key": "FK",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Borrowed copy",
              "hi": "Issued copy barcode ID"
            }
          },
          {
            "name": "member_id",
            "type": "UUID",
            "key": "FK",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Borrowing member",
              "hi": "Borrower member ID"
            }
          },
          {
            "name": "due_date",
            "type": "DATE",
            "key": "INDEX",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Target return deadline",
              "hi": "Kitab lautaney ki antim tithi"
            }
          },
          {
            "name": "returned_at",
            "type": "TIMESTAMP",
            "key": "",
            "nullable": "YES",
            "defaultVal": "-",
            "desc": {
              "en": "Actual return timestamp",
              "hi": "Actual return hone ka samay"
            }
          }
        ]
      }
    ],
    "sql": "CREATE TABLE books (\n    book_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    isbn VARCHAR(20) UNIQUE NOT NULL,\n    title VARCHAR(200) NOT NULL,\n    author VARCHAR(150) NOT NULL\n);\n\nCREATE TABLE book_copies (\n    copy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    book_id UUID NOT NULL REFERENCES books(book_id) ON DELETE CASCADE,\n    accession_number VARCHAR(50) UNIQUE NOT NULL,\n    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE'\n);\n\nCREATE TABLE book_issues (\n    issue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    copy_id UUID NOT NULL REFERENCES book_copies(copy_id),\n    member_id UUID NOT NULL,\n    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n    due_date DATE NOT NULL,\n    returned_at TIMESTAMP\n);",
    "queries": [
      {
        "title": {
          "en": "Calculate overdue fine amount for late returns ($5/day)",
          "hi": "Late return par overdue fine amount calculate karna (Rs 5/day)"
        },
        "explanation": {
          "en": "Calculates difference between return date (or today) and due_date multiplied by daily fine rate.",
          "hi": "Due date aur return date ke beech ke days calculate karke per-day fine rate se multiply karta hai."
        },
        "sql": "SELECT issue_id, member_id, due_date,\n       (CURRENT_DATE - due_date) * 5.00 AS overdue_fine_amount\nFROM book_issues\nWHERE returned_at IS NULL AND due_date < CURRENT_DATE;"
      }
    ],
    "bestPractices": {
      "en": [
        "Update `book_copies.status` atomically when issuing or returning books.",
        "Index `due_date` to quickly retrieve overdue books."
      ],
      "hi": [
        "Book issue/return hote hi `book_copies.status` update karein.",
        "Overdue reminders ke liye `due_date` column par index zaroor banayein."
      ]
    },
    "edgeCases": {
      "en": [
        "Lost book reporting: copy status updated to LOST and member charged book replacement fee."
      ],
      "hi": [
        "Book kho jane par status 'LOST' update hoke member account par replacement penalty load hoti hai."
      ]
    }
  },
  {
    "id": "real-estate",
    "title": {
      "en": "Real Estate Management System DB Design",
      "hi": "Real Estate Management System DB Design"
    },
    "tagline": {
      "en": "99acres / MagicBricks style property buying, selling, renting, lead scheduling, and commission DB design",
      "hi": "99acres aur MagicBricks style Property Buy/Sell/Rent, Broker Leads aur Lease agreements ka DB design"
    },
    "category": "Real Estate",
    "targetDB": "PostgreSQL / MySQL",
    "tableCount": 16,
    "overview": {
      "en": "Comprehensive database design for Real Estate Platforms (similar to 99acres or MagicBricks). Manages property listings (Buy/Rent), owner/agent profiles, property specs & amenities, buyer lead inquiries, scheduled site visits, lease agreements, and broker commissions.",
      "hi": "99acres aur MagicBricks type Real Estate portal ka complete DB design. Property Buy/Sell/Rent listings, Owner/Agent profile separation, Amenities junction, Buyer Leads, Scheduled Site visits aur Lease agreements cover karta hai."
    },
    "architecture": {
      "en": "Centralized `users` table handles both Buyers, Owners, and Agents (with extra agent profiles in `agents` table). Properties support polymorphic pricing (sale price vs monthly rent) and link to many-to-many amenities via `property_amenities`.",
      "hi": "`users` table base profile rakhta hai jabki `agents` extra broker verification data rkhta hai. `properties` table sale ya rent type set karta hai aur `property_amenities` junction table many-to-many facilities connect karta hai."
    },
    "mermaid": "erDiagram\n    USERS ||--o{ AGENTS : profile\n    USERS ||--o{ PROPERTIES : lists\n    PROPERTIES ||--o{ PROPERTY_IMAGES : displays\n    PROPERTIES ||--o{ LEADS : receives\n    PROPERTIES ||--o{ SITE_VISITS : schedules\n    PROPERTIES ||--o{ LEASE_AGREEMENTS : executes",
    "tables": [
      {
        "name": "users",
        "description": {
          "en": "Master user table for Buyers, Tenants, Owners, and Agents.",
          "hi": "Buyers, Tenants, Owners aur Brokers ka master table."
        },
        "columns": [
          {
            "name": "user_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "User primary key",
              "hi": "User unique ID"
            }
          },
          {
            "name": "email",
            "type": "VARCHAR(100)",
            "key": "UNIQUE",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "User email address",
              "hi": "User login email"
            }
          },
          {
            "name": "user_type",
            "type": "VARCHAR(20)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "'BUYER'",
            "desc": {
              "en": "BUYER, TENANT, OWNER, AGENT",
              "hi": "User role category"
            }
          }
        ]
      },
      {
        "name": "properties",
        "description": {
          "en": "Core property listing details (BHK, Area SqFt, Price, Listing Type).",
          "hi": "Property listing main detail (Listing Type - SALE/RENT, Price, BHK, Area SqFt)."
        },
        "columns": [
          {
            "name": "property_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "Property primary key",
              "hi": "Property unique ID"
            }
          },
          {
            "name": "owner_id",
            "type": "UUID",
            "key": "FK",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Owner user reference",
              "hi": "Owner user reference"
            }
          },
          {
            "name": "listing_type",
            "type": "VARCHAR(10)",
            "key": "INDEX",
            "nullable": "NO",
            "defaultVal": "'SALE'",
            "desc": {
              "en": "SALE or RENT",
              "hi": "SALE ya RENT listing"
            }
          },
          {
            "name": "price",
            "type": "DECIMAL(12,2)",
            "key": "INDEX",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Asking price or monthly rent",
              "hi": "Total sale price ya monthly rent"
            }
          },
          {
            "name": "bhk_type",
            "type": "VARCHAR(10)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "1BHK, 2BHK, 3BHK, VILLA",
              "hi": "BHK configuration"
            }
          }
        ]
      }
    ],
    "sql": "CREATE TABLE users (\n    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    email VARCHAR(100) UNIQUE NOT NULL,\n    user_type VARCHAR(20) NOT NULL DEFAULT 'BUYER',\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE properties (\n    property_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    owner_id UUID NOT NULL REFERENCES users(user_id),\n    listing_type VARCHAR(10) NOT NULL DEFAULT 'SALE',\n    price DECIMAL(12,2) NOT NULL,\n    bhk_type VARCHAR(10) NOT NULL,\n    city VARCHAR(100) NOT NULL,\n    is_active BOOLEAN NOT NULL DEFAULT TRUE\n);\n\nCREATE INDEX idx_properties_search ON properties(city, listing_type, price);",
    "queries": [
      {
        "title": {
          "en": "Search active 2BHK rental properties in a city below budget",
          "hi": "Shehar me budget ke andar active 2BHK rent properties search karna"
        },
        "explanation": {
          "en": "Uses composite index on (city, listing_type, price) for instant query execution.",
          "hi": "Composite index `(city, listing_type, price)` se fast search execute karta hai."
        },
        "sql": "SELECT property_id, bhk_type, price, city\nFROM properties\nWHERE city = 'Mumbai' AND listing_type = 'RENT' AND bhk_type = '2BHK' AND price <= 35000 AND is_active = TRUE;"
      }
    ],
    "bestPractices": {
      "en": [
        "Use geospatial POSTGIS or lat/long indexing for map location searches.",
        "Separate property media images into dedicated `property_images` table."
      ],
      "hi": [
        "Map location search ke liye Latitude/Longitude indexes use karein.",
        "Property images path `property_images` table me store karein."
      ]
    },
    "edgeCases": {
      "en": [
        "Sold/Rented property: set `is_active = FALSE` to hide from search while retaining historical lead analytics."
      ],
      "hi": [
        "Property sale hone par `is_active = FALSE` set karke search result se hidden kar diya jata hai."
      ]
    }
  },
  {
    "id": "restaurant-management",
    "title": {
      "en": "Restaurant Management System DB Design",
      "hi": "Restaurant Management System DB Design"
    },
    "tagline": {
      "en": "Single & Multi-branch chain restaurant order management, Kitchen Display (KDS), Dine-in tables, and Inventory",
      "hi": "Restaurant Management \u2014 Multi-branch, Menu categories, Dine-in tables, Kitchen Display (KDS) aur Inventory DB design"
    },
    "category": "Retail",
    "targetDB": "PostgreSQL / MySQL",
    "tableCount": 16,
    "overview": {
      "en": "Scalable database design for single restaurant outlets and multi-branch chains. Covers menu categories, item variants & addons, dine-in table reservations, Kitchen Display System (KDS) order routing, payment invoicing, and raw material stock tracking.",
      "hi": "Single outlet aur multi-branch chain restaurant management ka database design. Menu categories, variants (Half/Full), Addons, Dine-in table reservations, Kitchen Display (KDS) order state, billing invoice aur raw material stock management cover karta hai."
    },
    "architecture": {
      "en": "Supports multi-branch chain hierarchy (`restaurants` -> `branches`). Orders handle Dine-in, Takeaway, and Delivery order types. Kitchen Display Systems query live pending orders filtered by branch.",
      "hi": "`restaurants` master model `branches` connect karta hai. Orders table `order_type` (DINE_IN, TAKEAWAY, DELIVERY) track karta hai. Kitchen Display System live pending orders route karta hai."
    },
    "mermaid": "erDiagram\n    RESTAURANTS ||--o{ BRANCHES : owns\n    BRANCHES ||--o{ MENU_CATEGORIES : offers\n    MENU_CATEGORIES ||--o{ MENU_ITEMS : contains\n    BRANCHES ||--o{ TABLES : maintains\n    TABLES ||--o{ ORDERS : hosts\n    ORDERS ||--o{ ORDER_ITEMS : includes\n    ORDERS ||--o{ PAYMENTS : settles",
    "tables": [
      {
        "name": "branches",
        "description": {
          "en": "Individual restaurant branch location outlet.",
          "hi": "Restaurant chain branch outlet details."
        },
        "columns": [
          {
            "name": "branch_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "Branch ID",
              "hi": "Branch unique ID"
            }
          },
          {
            "name": "branch_name",
            "type": "VARCHAR(150)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Branch location name",
              "hi": "Branch ka naam"
            }
          },
          {
            "name": "city",
            "type": "VARCHAR(100)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "City location",
              "hi": "Shehar ka naam"
            }
          }
        ]
      },
      {
        "name": "orders",
        "description": {
          "en": "Customer order transaction header (Dine-in, Takeaway, Delivery).",
          "hi": "Customer order master header (Order status, Order type, Table number)."
        },
        "columns": [
          {
            "name": "order_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "Order ID",
              "hi": "Order primary key"
            }
          },
          {
            "name": "branch_id",
            "type": "UUID",
            "key": "FK",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Target branch",
              "hi": "Branch reference link"
            }
          },
          {
            "name": "order_type",
            "type": "VARCHAR(20)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "'DINE_IN'",
            "desc": {
              "en": "DINE_IN, TAKEAWAY, DELIVERY",
              "hi": "Order type"
            }
          },
          {
            "name": "order_status",
            "type": "VARCHAR(20)",
            "key": "INDEX",
            "nullable": "NO",
            "defaultVal": "'PENDING'",
            "desc": {
              "en": "PENDING, PREPARING, READY, SERVED, COMPLETED",
              "hi": "KDS order status"
            }
          }
        ]
      }
    ],
    "sql": "CREATE TABLE branches (\n    branch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    branch_name VARCHAR(150) NOT NULL,\n    city VARCHAR(100) NOT NULL\n);\n\nCREATE TABLE orders (\n    order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    branch_id UUID NOT NULL REFERENCES branches(branch_id),\n    order_type VARCHAR(20) NOT NULL DEFAULT 'DINE_IN',\n    order_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',\n    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE INDEX idx_orders_kds ON orders(branch_id, order_status);",
    "queries": [
      {
        "title": {
          "en": "Fetch active pending orders for Kitchen Display System (KDS)",
          "hi": "Kitchen Display Screen (KDS) ke liye pending kitchen orders query karna"
        },
        "explanation": {
          "en": "Queries live orders currently in PENDING or PREPARING status for a kitchen display screen.",
          "hi": "Kitchen display scren ke liye sirf `PENDING` aur `PREPARING` orders list karta hai."
        },
        "sql": "SELECT order_id, order_type, order_status, created_at\nFROM orders\nWHERE branch_id = 'BRANCH_UUID' AND order_status IN ('PENDING', 'PREPARING')\nORDER BY created_at ASC;"
      }
    ],
    "bestPractices": {
      "en": [
        "Separate order item addons (extra cheese, spicy level) into `order_item_addons` junction table.",
        "Index `(branch_id, order_status)` for fast Kitchen Display updates."
      ],
      "hi": [
        "Item extra addons (Extra Cheese) ko alag junction table me rakhein.",
        "Kitchen display fast render ke liye `(branch_id, order_status)` index banayein."
      ]
    },
    "edgeCases": {
      "en": [
        "Table swapping mid-meal: update `orders.table_id` and toggle old/new table occupancy status."
      ],
      "hi": [
        "Customer table shift hone par order ki `table_id` update hoti hai aur old table AVAILABLE mark hoti hai."
      ]
    }
  },
  {
    "id": "secure-password-system",
    "title": {
      "en": "Secure Password Storage Architecture & DB Design",
      "hi": "Secure Password Storage System Design & DB Schema"
    },
    "tagline": {
      "en": "Enterprise system design & DB schema for storing user passwords securely (BCrypt / Argon2id, Salt & KMS)",
      "hi": "System Design & DB Schema \u2014 Passwords ko securely store karne ke liye BCrypt, Argon2id, Salt aur KMS security architecture"
    },
    "category": "Security",
    "targetDB": "PostgreSQL / Security Architecture",
    "tableCount": 4,
    "overview": {
      "en": "System design and database architecture for storing authentication passwords securely. Explains why symmetric encryption is dangerous, how slow cryptographic hash functions (Argon2id, BCrypt) work, salt generation against rainbow tables, pepper KMS keys, rate limiting, and account lockouts.",
      "hi": "Passwords ko securely store karne ka enterprise system design aur database architecture. Encryption kyu GALAT hai, BCrypt aur Argon2id hashing algorithms, Rainbow Table attacks se bachane ke liye Salt, Pepper keys, Rate limiting aur Account Lockout rules explain karta hai."
    },
    "architecture": {
      "en": "Passwords must NEVER be encrypted\u2014they must be hashed using a slow one-way cryptographic function (Argon2id or BCrypt with work factor 12). Unique random salts prevent pre-computed lookup attacks. The resulting hash output string contains algorithm params, salt, and hash.",
      "hi": "Passwords ko kabhi ENCRYPT mat karein \u2014 unhe slow one-way cryptographic hash algorithm (BCrypt ya Argon2id) se HASH kiya jata hai. Har user ke liye random Salt add hota hai jo Rainbow Table attacks rokta hai."
    },
    "mermaid": "erDiagram\n    USERS ||--o{ AUTH_CREDENTIALS : possesses\n    USERS ||--o{ LOGIN_ATTEMPTS : logs\n    USERS ||--o{ MFA_DEVICES : registers",
    "tables": [
      {
        "name": "auth_credentials",
        "description": {
          "en": "Secure authentication credentials storing password hashes and algorithm parameters.",
          "hi": "Password hashes, salt, algorithm params aur password change date store karne wala table."
        },
        "columns": [
          {
            "name": "user_id",
            "type": "UUID",
            "key": "PK/FK",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "User reference ID",
              "hi": "User primary key reference"
            }
          },
          {
            "name": "password_hash",
            "type": "VARCHAR(255)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "BCrypt/Argon2id formatted hash string containing embedded salt",
              "hi": "BCrypt ya Argon2id hash string (embedded salt ke sath)"
            }
          },
          {
            "name": "hash_algorithm",
            "type": "VARCHAR(30)",
            "key": "",
            "nullable": "NO",
            "defaultVal": "'ARGON2ID'",
            "desc": {
              "en": "ARGON2ID or BCRYPT",
              "hi": "Hashing algorithm type"
            }
          },
          {
            "name": "password_changed_at",
            "type": "TIMESTAMP",
            "key": "",
            "nullable": "NO",
            "defaultVal": "NOW()",
            "desc": {
              "en": "Last password update date",
              "hi": "Password badalne ki date"
            }
          }
        ]
      },
      {
        "name": "login_attempts",
        "description": {
          "en": "Audit tracking log of failed login attempts to trigger IP rate limiting and account locks.",
          "hi": "Failed login attempts ka log tabhi account lockout aur IP rate limiting trigger hoti hai."
        },
        "columns": [
          {
            "name": "attempt_id",
            "type": "UUID",
            "key": "PK",
            "nullable": "NO",
            "defaultVal": "gen_random_uuid()",
            "desc": {
              "en": "Attempt log ID",
              "hi": "Attempt log primary key"
            }
          },
          {
            "name": "user_id",
            "type": "UUID",
            "key": "FK",
            "nullable": "YES",
            "defaultVal": "-",
            "desc": {
              "en": "Target user ID",
              "hi": "Target user reference"
            }
          },
          {
            "name": "ip_address",
            "type": "INET",
            "key": "INDEX",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Client IP address",
              "hi": "Client User ka IP"
            }
          },
          {
            "name": "is_successful",
            "type": "BOOLEAN",
            "key": "",
            "nullable": "NO",
            "defaultVal": "-",
            "desc": {
              "en": "Success or failure status",
              "hi": "Login success/fail status"
            }
          },
          {
            "name": "attempt_time",
            "type": "TIMESTAMP",
            "key": "INDEX",
            "nullable": "NO",
            "defaultVal": "NOW()",
            "desc": {
              "en": "Attempt timestamp",
              "hi": "Attempt timestamp"
            }
          }
        ]
      }
    ],
    "sql": "CREATE TABLE auth_credentials (\n    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,\n    password_hash VARCHAR(255) NOT NULL,\n    hash_algorithm VARCHAR(30) NOT NULL DEFAULT 'ARGON2ID',\n    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE login_attempts (\n    attempt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    user_id UUID REFERENCES users(user_id),\n    ip_address INET NOT NULL,\n    is_successful BOOLEAN NOT NULL,\n    attempt_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE INDEX idx_login_attempts_ip_time ON login_attempts(ip_address, attempt_time DESC);",
    "queries": [
      {
        "title": {
          "en": "Check failed login count in last 15 minutes for account lockout enforcement",
          "hi": "Account lockout rule ke liye pichle 15 minute ke failed login attempts check karna"
        },
        "explanation": {
          "en": "Counts failed attempts for an IP/User within 15 minutes window to trigger lockout threshold (e.g. > 5 attempts).",
          "hi": "Pichle 15 minute ke window me failed login attempts (`is_successful = FALSE`) count karke lockout rule trigger karta hai."
        },
        "sql": "SELECT COUNT(*) AS failed_count\nFROM login_attempts\nWHERE (user_id = 'USER_UUID' OR ip_address = '192.168.1.50'::inet)\n  AND is_successful = FALSE\n  AND attempt_time > NOW() - INTERVAL '15 minutes';"
      }
    ],
    "bestPractices": {
      "en": [
        "NEVER use plain SHA-256 or MD5 without a slow work factor; use BCrypt (Work Factor 12+) or Argon2id.",
        "Never encrypt passwords with reversible AES keys.",
        "Always enforce HTTPS TLS transmission."
      ],
      "hi": [
        "Plain SHA-256 ya MD5 kabhi use na karein kyunki ye brute-force vulnerable hain; BCrypt (work factor 12) ya Argon2id use karein.",
        "Passwords ko reversible AES encryption se store mat karein.",
        "HTTPS TLS transmission enforce karein."
      ]
    },
    "edgeCases": {
      "en": [
        "Brute force dictionary attacks: prevented via IP rate-limiting and temporary 30-minute account lockout after 5 consecutive failed attempts."
      ],
      "hi": [
        "5 se jyada galat password try karne par account ko 30 minute ke liye temporary lock kar diya jata hai."
      ]
    }
  }
];