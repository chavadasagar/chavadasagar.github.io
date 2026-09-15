window.QUIZ_DATA = [
  {
    "id": "q_pk",
    "question": "What is the primary function of a Primary Key in a relational database?",
    "options": [
      "To encrypt table rows",
      "To uniquely identify every single row in a table",
      "To sort search results alphabetically",
      "To compress database size"
    ],
    "correct": 1,
    "explanation": "A Primary Key ensures every row has a unique identifier, preventing duplicate records and enabling relational links."
  },
  {
    "id": "q_fk",
    "question": "How is a Foreign Key used in database design?",
    "options": [
      "To connect a column in one table to the Primary Key of another table",
      "To translate database queries into English",
      "To delete tables automatically",
      "To format currency numbers"
    ],
    "correct": 0,
    "explanation": "Foreign Keys create relational links between tables and enforce referential integrity."
  },
  {
    "id": "q_nm",
    "question": "How do you implement a Many-to-Many (N:M) relationship in a relational database?",
    "options": [
      "By storing an array string in a single column",
      "By creating an intermediate Junction Table containing Foreign Keys to both tables",
      "By deleting one of the tables",
      "By using a Primary Key twice"
    ],
    "correct": 1,
    "explanation": "A Junction (or Bridge) Table decomposes an N:M relationship into two 1:N relationships."
  },
  {
    "id": "q_price_snap",
    "question": "In an E-Commerce database, why should order_items store a unit_price snapshot at checkout?",
    "options": [
      "To make the table wider",
      "To preserve the historical price paid even if future product catalog prices change",
      "To hide prices from customers",
      "To avoid using Foreign Keys"
    ],
    "correct": 1,
    "explanation": "Historical invoices must remain accurate even if catalog prices are updated later."
  },
  {
    "id": "q_index",
    "question": "What is the main performance benefit of creating a database index on a heavily searched column?",
    "options": [
      "It turns slow O(N) full table scans into fast O(log N) indexed lookups",
      "It reduces table column width",
      "It speeds up INSERT statements",
      "It deletes duplicate rows automatically"
    ],
    "correct": 0,
    "explanation": "Indexes build B-Tree lookup structures that drastically reduce read query search times."
  }
];
