document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    // Use a function to get elements to ensure they exist when needed
    const getElements = () => ({
        pages: {
            login: document.getElementById('login-page'),
            app: document.getElementById('app-page'),        },
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
        
        if(elements.settingsForm) elements.settingsForm.addEventListener('submit', handleSettingsSave);
    }

    // --- Core Functions ---

    function showAppPage(initialPage) {
        const els = getElements();
        if (!els.pages.login || !els.pages.app) return;
        els.pages.login.classList.remove('active');
        els.pages.app.classList.add('active');
        navigateTo(initialPage);
    }

    function showLoginPage() {
        const els = getElements();
        if (!els.pages.login || !els.pages.app) return;
        els.pages.app.classList.remove('active');
        els.pages.login.classList.add('active');
    }

    function navigateTo(pageName) {
        const els = getElements();
        if (!localStorage.getItem('authToken')) return handleLogout();
        els.menuItems.forEach(item => item.classList.toggle('active', item.dataset.page === `${pageName}-content`));
        if(els.contentPages) {
            Object.values(els.contentPages).forEach(page => {
                if(page) page.classList.remove('active');
            });
            if(els.contentPages[pageName]) {
                els.contentPages[pageName].classList.add('active');
                switch (pageName) {
                    case 'dashboard': loadDashboardData(); break;
                    case 'vouchers': loadVouchers(); break;
                    case 'payments': loadPayments(); break;
                    case 'settings': loadSettings(); break;
                }
            }
        }
    }

    async function handleLogin(e) {
        e.preventDefault();
        const els = getElements(); 
        els.loginError.textContent = '';
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: els.loginForm.username.value, password: els.loginForm.password.value })
            });
            const data = await response.json();
            if (data.success) {
                localStorage.setItem('authToken', data.token);
                showAppPage('dashboard');
            } else {
                els.loginError.textContent = data.message || 'Invalid credentials';
            }
        } catch (error) {
            els.loginError.textContent = 'An error occurred.';
        }
    }

    function handleLogout(e) {
        if(e) e.preventDefault();
        localStorage.removeItem('authToken');
        showLoginPage();
    }
    
    async function handleSettingsSave(e) {
        e.preventDefault();
        const settings = {
            kpay_name: document.getElementById('kpay-name').value,
            kpay_phone: document.getElementById('kpay-phone').value,
            kpay_note: document.getElementById('kpay-note').value,
            usdt_bep20_address: document.getElementById('usdt-bep20').value,
            usdt_trc20_address: document.getElementById('usdt-trc20').value,
            usdt_amount: document.getElementById('usdt-amount').value,
        };
        await apiRequest('/api/payment-settings', 'POST', settings);
        alert('Settings saved!');
    }

    // --- Unified API Request Function ---
    async function apiRequest(endpoint, method = 'GET', body = null) {
        const token = localStorage.getItem('authToken');
        if (!token) {
            handleLogout();
            throw new Error('No auth token');
        }
        const options = { method, headers: { 'Authorization': `Bearer ${token}` } };
        if (body) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }
        const response = await fetch(endpoint, options);
        if (response.status === 401) {
            handleLogout();
            throw new Error('Unauthorized');
        }
        if (method === 'DELETE' && response.ok) return { success: true };
        return response.json();
    }

    // --- Data Loading & Chart Functions ---
    async function loadDashboardData() {
        try {
            const [statsData, usersData] = await Promise.all([apiRequest('/api/vouchers/stats'), apiRequest('/api/users')]);
            const totalPaymentsEl = document.getElementById('total-payments');
            const vouchersUsedEl = document.getElementById('vouchers-used');
            const vouchersAvailableEl = document.getElementById('vouchers-available');
            const totalRevenueEl = document.getElementById('total-revenue');
            if(totalPaymentsEl) totalPaymentsEl.textContent = usersData.users.length.toLocaleString();
            if(vouchersUsedEl) vouchersUsedEl.textContent = statsData.used.toLocaleString();
            if(vouchersAvailableEl) vouchersAvailableEl.textContent = statsData.available.toLocaleString();
            const revenue = usersData.users.reduce((sum, user) => sum + (user.amount || 0), 0);
            if(totalRevenueEl) totalRevenueEl.textContent = `$${revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            initializeChart(usersData.users);
        } catch (err) { if (err.message !== 'Unauthorized') console.error("Failed to load dashboard data:", err); }
    }
    async function loadVouchers() {
        const tableBody = document.querySelector('#vouchers-table tbody');
        if(!tableBody) return;
        tableBody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
        try {
            const data = await apiRequest('/api/vouchers');
            tableBody.innerHTML = '';
            if (data.vouchers.length === 0) tableBody.innerHTML = '<tr><td colspan="5">No vouchers found.</td></tr>';
            else {
                data.vouchers.forEach(v => {
                    tableBody.innerHTML += `<tr><td>${v.code}</td><td>${v.plan || 'N/A'}</td><td><span class="status-${v.is_used ? 'used' : 'available'}">${v.is_used ? 'Used' : 'Available'}</span></td><td>${new Date(v.created_at).toLocaleString()}</td><td><button class="delete-btn" data-id="${v._id}">Delete</button></td></tr>`;
                });
            }
        } catch (err) { if (err.message !== 'Unauthorized') tableBody.innerHTML = '<tr><td colspan="5">Failed to load data.</td></tr>'; }
    }
    async function loadPayments() {
        const tableBody = document.querySelector('#payments-table tbody');
        if(!tableBody) return;
        tableBody.innerHTML = '<tr><td colspan="7">Loading...</td></tr>';
        try {
            const data = await apiRequest('/api/users');
            tableBody.innerHTML = '';
            if (data.users.length === 0) tableBody.innerHTML = '<tr><td colspan="7">No payments found.</td></tr>';
            else {
                data.users.forEach(p => {
                    tableBody.innerHTML += `<tr><td>${new Date(p.created_at).toLocaleString()}</td><td>${p.name || 'N/A'}</td><td>$${(p.amount || 0).toFixed(2)}</td><td>${p.planDuration || 'N/A'}</td><td>${p.cardNumber || 'N/A'}</td><td>${p.countryName || 'N/A'}</td><td><button class="delete-btn" data-id="${p._id}">Delete</button></td></tr>`;
                });
            }
        } catch (err) { if (err.message !== 'Unauthorized') tableBody.innerHTML = '<tr><td colspan="7">Failed to load data.</td></tr>'; }
    }
    async function loadSettings() {
        try {
            const data = await apiRequest('/api/payment-settings');
            if (data.settings) {
                const kpayNameEl = document.getElementById('kpay-name');
                const kpayPhoneEl = document.getElementById('kpay-phone');
                const kpayNoteEl = document.getElementById('kpay-note');
                const usdtBep20El = document.getElementById('usdt-bep20');
                const usdtTrc20El = document.getElementById('usdt-trc20');
                const usdtAmountEl = document.getElementById('usdt-amount');

                if(kpayNameEl) kpayNameEl.value = data.settings.kpay_name || '';
                if(kpayPhoneEl) kpayPhoneEl.value = data.settings.kpay_phone || '';
                if(kpayNoteEl) kpayNoteEl.value = data.settings.kpay_note || '';
                if(usdtBep20El) usdtBep20El.value = data.settings.usdt_bep20_address || '';
                if(usdtTrc20El) usdtTrc20El.value = data.settings.usdt_trc20_address || '';
                if(usdtAmountEl) usdtAmountEl.value = data.settings.usdt_amount || 12;
            }
        } catch (err) { if (err.message !== 'Unauthorized') alert('Could not load settings.'); }
    }
    function initializeChart(users) {
        const ctx = document.getElementById('revenue-chart')?.getContext('2d');
        if (!ctx) return;
        let revenueChart = Chart.getChart(ctx);
        if (revenueChart) revenueChart.destroy();
        const monthlyData = users.reduce((acc, user) => { const month = new Date(user.created_at).toLocaleString('default', { month: 'short' }); acc[month] = (acc[month] || 0) + (user.amount || 0); return acc; }, {});
        const labels = Object.keys(monthlyData).reverse(); const data = Object.values(monthlyData).reverse();
        revenueChart = new Chart(ctx, { type: 'line', data: { labels: labels.length > 0 ? labels : ['N/A'], datasets: [{ label: 'Revenue', data: data.length > 0 ? data : [0], borderColor: '#60A5FA', backgroundColor: 'rgba(96, 165, 250, 0.2)', tension: 0.4, fill: true }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { callback: value => `$${value}` } } } } });
    }

    // --- Run the app ---
    initializeApp();
});