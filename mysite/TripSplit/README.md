# TripSplit — Smart Group Expense Splitter & Settlement Manager

A 100% client-side web application designed for friends, roommates, and travel groups to manage shared expenses, split bills with precision, and calculate the minimal required transactions to settle up balances.

---

## 🚀 Key Features

- **100% Client-Side Privacy**: All trip, member, expense, payment, and settings data are stored exclusively in your browser's `LocalStorage`. Zero backend, zero server uploads.
- **Multiple Trip Group Management**: Create, edit, switch, and delete trip groups (e.g. *Goa Trip 2026*, *College Friends*, *Weekend Party*).
- **Member Management**: Add/edit friends with customizable avatar emojis. Member removal includes active expense safeguards.
- **4 Flexible Split Strategies**:
  1. **Equal Split (`=`)**: Divides expenses equally among selected participants with automatic penny rounding.
  2. **Exact Amount Split (`123`)**: Allows custom monetary amounts per participant; validates total matches expense amount.
  3. **Percentage Split (`%`)**: Allows percentage shares per participant; validates sum equals 100%.
  4. **Custom Shares (`⚖️`)**: Computes weighted ratios based on custom shares (e.g. 2 shares vs 1 share).
- **Greedy Minimum Settlement Engine**:
  - Automatically calculates net member balances (`Paid - Share + Payments Received - Payments Made`).
  - Implements a greedy matching algorithm to match creditors and debtors, minimizing the total number of transfer transactions required.
- **Interactive Settlement UI & Payment Recording**:
  - Visual transaction cards (`From` → `Amount` → `To`).
  - "Mark as Completed" quick actions and custom settlement payment recorder.
  - Maintains a separate completed payments audit log without altering original expense histories.
- **Trip Summary & Analytics**:
  - Expenditure metrics (Total spent, Highest spender, Most expensive category, Single highest expense, Average spend per member).
  - Visual category breakdown progress bars.
- **Expense History, Filtering & Live Search**:
  - Instant live search by expense title, category, or payer name.
  - Filter expenses by category or member.
- **Data Backup & Portability**:
  - Export active group data as a `.json` backup file.
  - Export expense reports as a `.csv` spreadsheet file.
  - Import JSON backups with schema validation.
- **Appearance & Settings**:
  - Dark Mode and Light Mode theme toggle.
  - Currency switcher (INR ₹, USD $, EUR €, GBP £).

---

## 🛠️ Technology Stack

- **Markup**: Semantic HTML5 (OpenGraph SEO tags, WAI-ARIA accessibility)
- **Styling**: Vanilla CSS3 (CSS Custom Properties, CSS Grid, Flexbox, Glassmorphism, Dark/Light Themes)
- **Logic**: Vanilla JavaScript (ES6+ Modules, DOM Events, Greedy Settlement Engine, LocalStorage API)

---

## 💻 How to Run Locally

1. Open `index.html` directly in any modern web browser (Chrome, Edge, Firefox, Safari, Brave).
2. Or serve via any static HTTP web server:
   ```bash
   npx serve .
   ```

---

## 📂 File Structure

```text
TripSplit/
├── index.html        # Main application markup & modals
├── style.css         # Responsive styling & theme variables
├── script.js         # Core application logic, settlement algorithm & UI renderer
└── README.md         # Detailed project documentation
```

---

## 🧮 Settlement Algorithm Explanation

TripSplit uses a **Greedy Minimum Settlement Algorithm** to resolve debts:

1. **Calculate Net Balances**:
   $$\text{Net Balance} = \text{Total Paid} - \text{Total Share} + \text{Payments Made} - \text{Payments Received}$$
2. **Classify Members**:
   - **Creditors**: Members with Net Balance $> +0.005$, sorted descending by amount.
   - **Debtors**: Members with Net Balance $< -0.005$, sorted descending by absolute debt.
3. **Greedy Matching Loop**:
   - Pair the debtor with largest debt and creditor with largest credit.
   - Transfer $\min(\text{credit}, |\text{debt}|)$.
   - Update balances and advance pointers until all net balances reach $0.00$.

---

## 📱 Browser Compatibility

- Google Chrome / Microsoft Edge / Brave
- Mozilla Firefox
- Apple Safari (iOS & macOS)
