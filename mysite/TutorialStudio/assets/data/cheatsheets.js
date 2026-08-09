window.TUTORIAL_CHEATSHEETS = [
  {
    id: "html",
    title: "HTML5 Essentials Cheatsheet",
    category: "HTML & CSS",
    icon: "code",
    sections: [
      {
        title: "Document Structure",
        items: [
          { name: "<!DOCTYPE html>", desc: "Declares the document type as HTML5" },
          { name: "<html lang=\"en\">", desc: "Root element specifying English language" },
          { name: "<head>", desc: "Container for metadata, stylesheets, title" },
          { name: "<meta charset=\"UTF-8\">", desc: "Standard character encoding" },
          { name: "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">", desc: "Responsive mobile viewport config" },
          { name: "<body>", desc: "Contains visible document content" }
        ]
      },
      {
        title: "Semantic Layout Tags",
        items: [
          { name: "<header>", desc: "Introductory content or navigation banner" },
          { name: "<nav>", desc: "Major navigation link container" },
          { name: "<main>", desc: "Dominant content unique to the document" },
          { name: "<section>", desc: "Thematic grouping of content with heading" },
          { name: "<article>", desc: "Self-contained composition (blog post, card)" },
          { name: "<aside>", desc: "Sidebars or tangential content" },
          { name: "<footer>", desc: "Footer section (copyright, author, links)" }
        ]
      },
      {
        title: "Forms & Inputs",
        items: [
          { name: "<form action=\"/api\" method=\"POST\">", desc: "Form submission container" },
          { name: "<input type=\"text|email|password|number\">", desc: "Various input field types" },
          { name: "<textarea rows=\"4\">", desc: "Multi-line text input" },
          { name: "<select><option value=\"1\">One</option></select>", desc: "Dropdown selection" },
          { name: "<button type=\"submit\">", desc: "Submission button element" }
        ]
      }
    ]
  },
  {
    id: "css",
    title: "CSS3 Flexbox & Grid Cheatsheet",
    category: "HTML & CSS",
    icon: "layout",
    sections: [
      {
        title: "Flexbox Layout",
        items: [
          { name: "display: flex;", desc: "Enables flex container" },
          { name: "flex-direction: row | column | row-reverse;", desc: "Sets main axis direction" },
          { name: "justify-content: center | space-between | space-around | space-evenly;", desc: "Aligns along main axis" },
          { name: "align-items: center | flex-start | flex-end | stretch;", desc: "Aligns along cross axis" },
          { name: "gap: 1rem 1.5rem;", desc: "Row and column spacing between flex items" },
          { name: "flex: 1 1 auto;", desc: "Shorthand for flex-grow, flex-shrink, flex-basis" }
        ]
      },
      {
        title: "CSS Grid",
        items: [
          { name: "display: grid;", desc: "Enables grid container" },
          { name: "grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));", desc: "Responsive auto-flowing grid columns" },
          { name: "grid-template-rows: auto 1fr auto;", desc: "Defines header, main, footer rows" },
          { name: "grid-column: span 2;", desc: "Element spans across 2 columns" },
          { name: "place-items: center;", desc: "Centers items both horizontally and vertically" }
        ]
      },
      {
        title: "Modern CSS Utilities",
        items: [
          { name: "backdrop-filter: blur(12px);", desc: "Glassmorphism blur effect" },
          { name: "transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);", desc: "Smooth state transition" },
          { name: "transform: translateY(-4px) scale(1.02);", desc: "Hardware-accelerated transforms" },
          { name: "box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);", desc: "Layered elevation drop shadow" }
        ]
      }
    ]
  },
  {
    id: "javascript",
    title: "JavaScript (ES6+) Modern Cheatsheet",
    category: "JavaScript & Frontend",
    icon: "zap",
    sections: [
      {
        title: "Array Higher-Order Methods",
        items: [
          { name: "arr.map(x => x * 2)", desc: "Transforms every element into a new array" },
          { name: "arr.filter(x => x > 10)", desc: "Filters elements satisfying predicate" },
          { name: "arr.reduce((acc, cur) => acc + cur, 0)", desc: "Reduces array to a single aggregated value" },
          { name: "arr.find(x => x.id === targetId)", desc: "Returns first matching element" },
          { name: "arr.some(x => x.active) / arr.every(...)", desc: "Tests if some or all elements pass condition" },
          { name: "arr.flatMap(x => [x, x * 2])", desc: "Maps and flattens result by 1 level" }
        ]
      },
      {
        title: "Async & Promises",
        items: [
          { name: "async function loadData() { ... }", desc: "Defines asynchronous function returning a Promise" },
          { name: "const res = await fetch(url); const data = await res.json();", desc: "Awaits asynchronous HTTP response" },
          { name: "Promise.all([p1, p2, p3])", desc: "Runs promises concurrently and resolves when all finish" },
          { name: "Promise.allSettled([p1, p2])", desc: "Resolves when all promises settle (succeed or fail)" }
        ]
      },
      {
        title: "Destructuring & Modern Syntax",
        items: [
          { name: "const { name, age = 18, ...rest } = user;", desc: "Object destructuring with default and rest" },
          { name: "const [first, second, ...others] = items;", desc: "Array destructuring" },
          { name: "const clone = { ...original, updated: true };", desc: "Spread operator for shallow clone & merge" },
          { name: "user?.profile?.address?.city ?? 'Unknown'", desc: "Optional chaining and nullish coalescing" }
        ]
      }
    ]
  },
  {
    id: "python",
    title: "Python 3 Core & Data Cheatsheet",
    category: "Backend & Programming",
    icon: "terminal",
    sections: [
      {
        title: "Comprehensions & Lambdas",
        items: [
          { name: "[x**2 for x in nums if x % 2 == 0]", desc: "List comprehension with filtering" },
          { name: "{k: v for k, v in pairs.items() if v}", desc: "Dictionary comprehension" },
          { name: "sq = lambda x: x * x", desc: "Anonymous inline lambda function" },
          { name: "sorted(users, key=lambda u: u['age'], reverse=True)", desc: "Custom key sorting with reverse flag" }
        ]
      },
      {
        title: "File I/O & Context Managers",
        items: [
          { name: "with open('file.txt', 'r', encoding='utf-8') as f:\n    data = f.read()", desc: "Safe file opening with automatic closing" },
          { name: "import json\ndata = json.loads(json_str)\njson_str = json.dumps(data, indent=2)", desc: "JSON parsing and formatting" }
        ]
      },
      {
        title: "Useful Standard Libraries",
        items: [
          { name: "from collections import defaultdict, Counter", desc: "Advanced dictionary containers" },
          { name: "import itertools", desc: "Iterators for efficient looping (chain, groupby, product)" },
          { name: "from datetime import datetime, timezone", desc: "Date and time manipulations" }
        ]
      }
    ]
  },
  {
    id: "sql",
    title: "SQL & Relational Databases Cheatsheet",
    category: "Databases",
    icon: "database",
    sections: [
      {
        title: "Query Fundamentals",
        items: [
          { name: "SELECT col1, COUNT(*) FROM table WHERE col2 > 10 GROUP BY col1 HAVING COUNT(*) > 2 ORDER BY 2 DESC LIMIT 10;", desc: "Full query pipeline" },
          { name: "SELECT DISTINCT category FROM products;", desc: "Unique values only" },
          { name: "WHERE name LIKE '%tech%' AND status IN ('active', 'pending')", desc: "Pattern matching and membership filtering" }
        ]
      },
      {
        title: "Joins & Aggregations",
        items: [
          { name: "INNER JOIN orders ON users.id = orders.user_id", desc: "Matches rows in both tables" },
          { name: "LEFT JOIN reviews ON products.id = reviews.product_id", desc: "All rows from left, matching from right" },
          { name: "SUM(price), AVG(rating), MIN(date), MAX(views)", desc: "Common aggregate functions" }
        ]
      }
    ]
  },
  {
    id: "git",
    title: "Git Version Control Cheatsheet",
    category: "Web Tools & Security",
    icon: "git-branch",
    sections: [
      {
        title: "Essential Workflow",
        items: [
          { name: "git init", desc: "Initialize a new local Git repository" },
          { name: "git status -s", desc: "Short status of staged/unstaged changes" },
          { name: "git add . && git commit -m \"feat: description\"", desc: "Stage all files and commit" },
          { name: "git push -u origin main", desc: "Push local commits to remote branch" },
          { name: "git pull --rebase origin main", desc: "Fetch and replay local commits on top of remote" }
        ]
      },
      {
        title: "Branching & Stashing",
        items: [
          { name: "git checkout -b feature/login", desc: "Create and switch to new branch" },
          { name: "git merge feature/login", desc: "Merge feature branch into current" },
          { name: "git stash push -m \"WIP\" / git stash pop", desc: "Temporarily shelve and restore uncommitted changes" },
          { name: "git log --oneline --graph --all", desc: "Visual ascii commit history graph" }
        ]
      }
    ]
  }
];
