/**
 * SETTINGS.JS
 * System preferences, user registrations, and db actions.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Core initialization
    loadSettingsData();
    setupAdminRestrictions();

    // 2. Rules Save Listener
    document.getElementById('rules-form').addEventListener('submit', handleRulesSubmit);

    // 3. Database controls Listeners
    document.getElementById('db-test-btn').addEventListener('click', handleDbTest);
    document.getElementById('db-reset-btn').addEventListener('click', handleDbReset);
    document.getElementById('db-clear-btn').addEventListener('click', handleDbClear);
});

function loadSettingsData() {
    // Populate current rules inputs from local cache
    const savedFine = localStorage.getItem('lms_config_fine_rate') || '1.00';
    const savedPeriod = localStorage.getItem('lms_config_loan_period') || '14';
    document.getElementById('rule-fine-rate').value = savedFine;
    document.getElementById('rule-loan-period').value = savedPeriod;
}

function setupAdminRestrictions() {
    // If not Admin, disable edits
    if (!auth.isAdmin()) {
        // Disable rules
        const rulesForm = document.getElementById('rules-form');
        rulesForm.querySelectorAll('input, button').forEach(el => el.disabled = true);
        
        // Disable DB triggers
        document.getElementById('db-reset-btn').disabled = true;
        document.getElementById('db-clear-btn').disabled = true;
        
        toast.show('Access restricted: Staff users cannot modify core configurations.', 'warning');
    }
}

function handleRulesSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const fineRate = parseFloat(form.fineRate.value).toFixed(2);
    const loanPeriod = parseInt(form.loanPeriod.value, 10);

    localStorage.setItem('lms_config_fine_rate', fineRate);
    localStorage.setItem('lms_config_loan_period', loanPeriod.toString());
    
    toast.show('Circulation rules updated successfully!', 'success');
}


// ----------------------------------------------------
// Database Maintenance Operations
// ----------------------------------------------------
function handleDbReset() {
    dialog.confirm(
        'Database Seed Reset',
        'Warning: This action will restore all collections to their default factory seed data. Your current transactions, checkouts, and custom edits will be lost.',
        () => {
            // Logged in user session cache details
            const user = auth.getCurrentUser();
            
            // Clear storage tables (but keep configs if needed)
            const collections = ['branches', 'staff', 'roles', 'categories', 'publishers', 'authors', 'books', 'bookCopies', 'members', 'loans', 'reservations', 'reviews', 'fines'];
            collections.forEach(key => localStorage.removeItem(key));
            
            // Seed database
            db.seedDatabase();

            // Re-seed original session operator back into staff to keep login session alive if it was wiped
            if (user) {
                const currentStaff = db.find('staff');
                const userExists = currentStaff.some(s => s.email.toLowerCase() === user.email.toLowerCase());
                if (!userExists) {
                    db.insert('staff', {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        password: 'admin', // default safe restore password
                        role: user.role,
                        branchId: user.branchId,
                        status: 'Active'
                    }, 'STF-');
                }
            }

            toast.show('Database restore and default seeding completed!', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    );
}

function handleDbClear() {
    dialog.confirm(
        'Format Entire Database',
        'CRITICAL WARNING: This clears all LocalStorage parameters completely. You will be logged out and the database will be empty.',
        () => {
            localStorage.clear();
            sessionStorage.clear();
            toast.show('All storage formatted. Logging out...', 'warning');
            setTimeout(() => {
                auth.redirect('../login.html');
            }, 1000);
        }
    );
}

function handleDbTest() {
    toast.show('Running automated diagnostics...', 'info');
    setTimeout(() => {
        const results = runTests();
        const logsHtml = results.logs.map(log => {
            if (log.includes('✅')) {
                return `<div style="color: #34d399; margin-bottom: 2px;">${log}</div>`;
            } else if (log.includes('❌') || log.includes('💥')) {
                return `<div style="color: #f87171; margin-bottom: 2px; font-weight: bold;">${log}</div>`;
            }
            return `<div style="color: var(--text-secondary); margin-bottom: 2px;">${log}</div>`;
        }).join('');
        
        dialog.alert(
            'System Diagnostics Results',
            `Passed: <strong>${results.passed}</strong> | Failed: <strong style="color: ${results.failed > 0 ? 'var(--danger)' : 'inherit'}">${results.failed}</strong><br><br><div style="text-align: left; font-family: monospace; font-size: 0.75rem; background: var(--bg-primary); border: 1px solid var(--border-color); padding: 0.75rem; border-radius: var(--radius-sm); max-height: 200px; overflow-y: auto; white-space: pre-wrap; line-height: 1.4;">${logsHtml}</div>`
        );
    }, 400);
}
