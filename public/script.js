document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    // Use a function to get elements to ensure they exist when needed
    const getElements = () => ({
        pages: {
            login: document.getElementById('login-page'),
            app: document.getElementById('app-page'),
        },
        contentPages: {
            dashboard: document.getElementById('dashboard-content'),
            vouchers: document.getElementById('vouchers-content'),
            payments: document.getElementById('payments-content'),
            settings: document.getElementById('settings-content'),
        },
        menuItems: document.querySelectorAll('.sidebar-menu li[data-page]'),
        loginForm: document.getElementById('login-form'),
        loginError: document.getElementById('login-error'),
        logoutBtn: document.getElementById('logout-btn'),
        generateVouchersBtn: document.getElementById('generate-vouchers-btn'),
        clearVouchersBtn: document.getElementById('clear-vouchers-btn'),
        clearPaymentsBtn: document.getElementById('clear-payments-btn'),
        generateModal: document.getElementById('generate-modal'),
        generateForm: document.getElementById('generate-form'),
        cancelGenerateBtn: document.getElementById('cancel-generate-btn'),
        settingsForm: document.getElementById('settings-form'),
    });

    function initializeApp() {
        const elements = getElements();

        // Defensive check: If essential elements don't exist, do nothing.
        if (!elements.pages.login || !elements.pages.app || !elements.loginForm) {
            console.error("Essential elements not found. Aborting initialization.");
            return;
        }

        // --- Initial Setup ---
        if (localStorage.getItem('authToken')) {
            showAppPage('dashboard');
        } else {
            showLoginPage();
        }

        // --- Event Listeners ---
        elements.loginForm.addEventListener('submit', handleLogin);
        elements.logoutBtn.addEventListener('click', handleLogout);
        elements.menuItems.forEach(item => item.addEventListener('click', (e) => { e.preventDefault(); navigateTo(item.dataset.page.replace('-content', '')); }));
        elements.generateVouchersBtn.addEventListener('click', () => elements.generateModal.classList.add('active'));
        elements.cancelGenerateBtn.addEventListener('click', () => elements.generateModal.classList.remove('active'));
        elements.generateForm.addEventListener('submit', async (e) => { e.preventDefault(); const count = document.getElementById('generate-count').value; await apiRequest('/api/vouchers/generate', 'POST', { count }); elements.generateModal.classList.remove('active'); await loadVouchers(); });
        elements.clearVouchersBtn.addEventListener('click', async () => { if (confirm('Delete ALL vouchers?')) { await apiRequest('/api/vouchers/clear', 'DELETE'); await loadVouchers(); } });
        elements.clearPaymentsBtn.addEventListener('click', async () => { if (confirm('Delete ALL payments?')) { await apiRequest('/api/users/clear', 'DELETE'); await loadPayments(); } });
        
        const vouchersTableBody = document.querySelector('#vouchers-table tbody');
        if(vouchersTableBody) vouchersTableBody.addEventListener('click', async (e) => { if (e.target.classList.contains('delete-btn')) { const id = e.target.dataset.id; if (confirm('Delete this voucher?')) { await apiRequest(`/api/vouchers/${id}`, 'DELETE'); await loadVouchers(); } } });
        
        const paymentsTableBody = document.querySelector('#payments-table tbody');
        if(paymentsTableBody) paymentsTableBody.addEventListener('click', async (e) => { if (e.target.classList.contains('delete-btn')) { const id = e.target.dataset.id; if (confirm('Delete this payment record?')) { await apiRequest(`/api/users/${id}`, 'DELETE'); await loadPayments(); } } });
        
        if(elements.settingsForm) elements.settingsForm.addEventListener('submit', async (e) => { /* ... settings form submit logic ... */ });
    }

    // --- Core Functions (showAppPage, showLoginPage, navigateTo, handleLogin, handleLogout, apiRequest) ---
    // These are mostly unchanged, but now use the getElements() for safety

    function showAppPage(initialPage) { const els = getElements(); els.pages.login.classList.remove('active'); els.pages.app.classList.add('active'); navigateTo(initialPage); }
    function showLoginPage() { const els = getElements(); els.pages.app.classList.remove('active'); els.pages.login.classList.add('active'); }

    function navigateTo(pageName) {
        const els = getElements();
        if (!localStorage.getItem('authToken')) return handleLogout();
        els.menuItems.forEach(item => item.classList.toggle('active', item.dataset.page === `${pageName}-content`));
        Object.values(els.contentPages).forEach(page => page.classList.remove('active'));
        els.contentPages[pageName].classList.add('active');
        switch (pageName) { case 'dashboard': loadDashboardData(); break; case 'vouchers': loadVouchers(); break; case 'payments': loadPayments(); break; case 'settings': loadSettings(); break; }
    }

    async function handleLogin(e) {
        e.preventDefault();
        const els = getElements();
        els.loginError.textContent = '';
        try {
            const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: els.loginForm.username.value, password: els.loginForm.password.value }) });
            const data = await response.json();
            if (data.success) { localStorage.setItem('authToken', data.token); showAppPage('dashboard'); } 
            else { els.loginError.textContent = data.message || 'Invalid credentials'; }
        } catch (error) { els.loginError.textContent = 'An error occurred.'; }
    }

    function handleLogout(e) { if(e) e.preventDefault(); localStorage.removeItem('authToken'); showLoginPage(); }

    async function apiRequest(endpoint, method = 'GET', body = null) { /* ... unchanged ... */ }
    async function loadDashboardData() { /* ... unchanged ... */ }
    async function loadVouchers() { /* ... unchanged ... */ }
    async function loadPayments() { /* ... unchanged ... */ }
    async function loadSettings() { /* ... unchanged ... */ }
    function initializeChart(users) { /* ... unchanged ... */ }

    // --- Run the app ---
    initializeApp();
});
