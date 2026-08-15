/**
 * Sample Datasets for 1-Click Testing & Demonstrations
 */

const SampleDatasets = {
  csv: {
    ecommerce: {
      name: "E-Commerce Orders (Nested)",
      description: "Demonstrates dot-notation for nested objects and array indices",
      data: `order_id,customer.name,customer.email,address.city,address.country,items[0].name,items[0].qty,total,is_paid
ORD-9021,Alice Walker,alice@nexus.io,San Francisco,USA,Wireless Ergonomic Mouse,2,89.98,true
ORD-9022,Bob Chen,bob.chen@acme.co,Toronto,Canada,Mechanical Keyboard Pro,1,149.50,true
ORD-9023,Elena Rostova,elena@global.org,Berlin,Germany,USB-C 4K Dual Dock,1,199.00,false
ORD-9024,Devon Vance,devon@startup.tech,Austin,USA,"Noise-Cancelling Headphones, Wireless",1,299.99,true
ORD-9025,Priya Patel,priya@cloud.in,Bengaluru,India,"Ultra-Wide Monitor 34""",1,450.00,true`
    },
    employees: {
      name: "Employee Directory (Quoted & Multiline)",
      description: "Demonstrates commas inside quotes, boolean conversion, and salary numbers",
      data: `id,name,department,role,salary,remote,notes
101,"Miller, Sarah",Engineering,"Senior Backend Engineer, Cloud",135000,true,"Lead for GraphQL migration"
102,"Johnson, Mark",Marketing,"Director of Growth, APAC",118000,false,"Office in Tokyo"
103,"Gupta, Rahul",Product,"Principal Product Manager",142000,true,"Specialized in AI tooling"
104,"Dubois, Amelie",Design,"UX/UI Lead, Systems",125000,true,"Figma Design System maintainer"
105,"Tanaka, Kenji",Support,"Customer Success Lead",85000,false,"Bilingual EN/JP"`
    },
    inventory: {
      name: "Semicolon-Delimited Inventory",
      description: "Demonstrates automatic detection of semicolon delimiters",
      data: `sku;product_name;category;stock_qty;unit_price;reorder_level
SKU-1001;Aluminium Laptop Stand;Accessories;150;45.90;25
SKU-1002;Braided USB-C Cable (2m);Cables;420;12.50;50
SKU-1003;Tempered Glass Desk Mat;Office;75;69.00;15
SKU-1004;Magnetic Phone Mount;Automotive;210;29.99;30
SKU-1005;Smart LED Monitor Lightbar;Lighting;90;89.95;20`
    }
  },

  json: {
    users: {
      name: "User Profiles (Nested Objects & Arrays)",
      description: "Nested structures to test JSON -> CSV column flattening",
      data: JSON.stringify([
        {
          id: 1,
          name: "Dr. Evelyn Reed",
          username: "ereed",
          email: "evelyn@biotech.org",
          isActive: true,
          profile: {
            age: 34,
            department: "Quantum Computing",
            clearance: "Level-5"
          },
          contact: {
            phone: "+1-555-0199",
            location: {
              city: "Seattle",
              state: "WA",
              country: "USA"
            }
          },
          skills: ["Qiskit", "Python", "Linear Algebra", "Cryogenics"]
        },
        {
          id: 2,
          name: "Marcus Aurelius Thorne",
          username: "mthorne",
          email: "marcus@neural.ai",
          isActive: false,
          profile: {
            age: 29,
            department: "Neural Interfaces",
            clearance: "Level-4"
          },
          contact: {
            phone: "+44-20-7946-0912",
            location: {
              city: "London",
              state: "England",
              country: "UK"
            }
          },
          skills: ["PyTorch", "Signal Processing", "C++"]
        },
        {
          id: 3,
          name: "Aiko Takahashi",
          username: "atakahashi",
          email: "aiko@cybernetics.jp",
          isActive: true,
          profile: {
            age: 41,
            department: "Robotics Core",
            clearance: "Level-5"
          },
          contact: {
            phone: "+81-3-5555-0143",
            location: {
              city: "Tokyo",
              state: "Kanto",
              country: "Japan"
            }
          },
          skills: ["ROS2", "Computer Vision", "Rust", "Embedded Systems"]
        }
      ], null, 2)
    },
    analytics: {
      name: "Analytics Event Log",
      description: "Tabular telemetry stream data",
      data: JSON.stringify([
        { "timestamp": "2026-08-09T08:15:30Z", "event": "page_view", "user_id": "usr_991", "session_duration_sec": 142, "utm_source": "google", "device": "mobile" },
        { "timestamp": "2026-08-09T08:16:12Z", "event": "button_click", "user_id": "usr_991", "session_duration_sec": 184, "utm_source": "google", "device": "mobile" },
        { "timestamp": "2026-08-09T08:20:05Z", "event": "add_to_cart", "user_id": "usr_402", "session_duration_sec": 510, "utm_source": "newsletter", "device": "desktop" },
        { "timestamp": "2026-08-09T08:24:50Z", "event": "checkout_completed", "user_id": "usr_402", "session_duration_sec": 795, "utm_source": "newsletter", "device": "desktop" }
      ], null, 2)
    }
  },

  text: {
    article: {
      name: "Sample Multi-paragraph Text",
      description: "Ideal for testing case transformation, word counting, line sorting and duplicate removal",
      data: `The quick brown fox jumps over the lazy dog.
Cloud computing has revolutionized client-side web applications.
Modern browsers can parse gigabytes of structured data directly in memory.
No servers are required for local CSV, JSON, and text transformations.
Client-side processing guarantees complete privacy and zero data leakage.

The quick brown fox jumps over the lazy dog.
Data security is paramount for enterprise compliance.
Fast client-side tools reduce network latency and server overhead.
Enjoy instantaneous conversions with zero latency!`
    },
    dirtyList: {
      name: "Dirty List with Whitespace & Duplicates",
      description: "Test line trimming, blank line elimination, deduplication and sorting",
      data: `   Apple Inc.   
Google LLC
   Microsoft Corporation   
Amazon.com
google llc
   Meta Platforms   
Apple Inc.

Netflix, Inc.
   Amazon.com   
Spotify Technology`
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SampleDatasets;
}
