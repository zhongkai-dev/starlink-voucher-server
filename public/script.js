document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    const pages = { login: document.getElementById('login-page'), app: document.getElementById('app-page') };
    const contentPages = { dashboard: document.getElementById('dashboard-content'), vouchers: document.getElementById('vouchers-content'), payments: document.getElementById('payments-content') };
    const menuItems = document.querySelectorAll('.sidebar-menu li[data-page]');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');
    const generateVouchersBtn = document.getElementById('generate-vouchers-btn');
    const clearVouchersBtn = document.getElementById('clear-vouchers-btn');
    const clearPaymentsBtn = document.getElementById('clear-payments-btn');
    const generateModal = document.getElementById('generate-modal');
    const generateForm = document.getElementById('generate-form');
    const cancelGenerateBtn = document.getElementById('cancel-generate-btn');

    // --- Initial Setup ---
    if (localStorage.getItem('authToken')) {
        showAppPage('dashboard');
    } else {
        showLoginPage();
    }

    // --- Event Listeners ---
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    menuItems.forEach(item => item.addEventListener('click', (e) => { e.preventDefault(); navigateTo(item.dataset.page.replace('-content', '')); }));

    generateVouchersBtn.addEventListener('click', () => generateModal.classList.add('active'));
    cancelGenerateBtn.addEventListener('click', () => generateModal.classList.remove('active'));
    generateForm.addEventListener('submit', async (e) => { e.preventDefault(); const count = document.getElementById('generate-count').value; await apiRequest('/api/vouchers/generate', 'POST', { count }); generateModal.classList.remove('active'); await loadVouchers(); });

    clearVouchersBtn.addEventListener('click', async () => { if (confirm('Are you sure you want to delete ALL vouchers?')) { await apiRequest('/api/vouchers/clear', 'DELETE'); await loadVouchers(); } });
    clearPaymentsBtn.addEventListener('click', async () => { if (confirm('Are you sure you want to delete ALL payments?')) { await apiRequest('/api/users/clear', 'DELETE'); await loadPayments(); } });

    document.querySelector('#vouchers-table tbody').addEventListener('click', async (e) => { if (e.target.classList.contains('delete-btn')) { const id = e.target.dataset.id; if (confirm('Delete this voucher?')) { await apiRequest(`/api/vouchers/${id}`, 'DELETE'); await loadVouchers(); } } });
    document.querySelector('#payments-table tbody').addEventListener('click', async (e) => { if (e.target.classList.contains('delete-btn')) { const id = e.target.dataset.id; if (confirm('Delete this payment record?')) { await apiRequest(`/api/users/${id}`, 'DELETE'); await loadPayments(); } } });

    // --- Core Functions ---
    function showAppPage(initialPage) { pages.login.classList.remove('active'); pages.app.classList.add('active'); navigateTo(initialPage); }
    function showLoginPage() { pages.app.classList.remove('active'); pages.login.classList.add('active'); }

    function navigateTo(pageName) {
        if (!localStorage.getItem('authToken')) return handleLogout();
        menuItems.forEach(item => item.classList.toggle('active', item.dataset.page === `${pageName}-content`));
        Object.values(contentPages).forEach(page => page.classList.remove('active'));
        contentPages[pageName].classList.add('active');
        switch (pageName) { case 'dashboard': loadDashboardData(); break; case 'vouchers': loadVouchers(); break; case 'payments': loadPayments(); break; }
    }

    async function handleLogin(e) {
        e.preventDefault();
        loginError.textContent = '';
        try {
            const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: loginForm.username.value, password: loginForm.password.value }) });
            const data = await response.json();
            if (data.success) { localStorage.setItem('authToken', data.token); showAppPage('dashboard'); } 
            else { loginError.textContent = data.message || 'Invalid credentials'; }
        } catch (error) { loginError.textContent = 'An error occurred.'; }
    }

    function handleLogout(e) { if(e) e.preventDefault(); localStorage.removeItem('authToken'); showLoginPage(); }

    // --- Unified API Request Function (THE FIX) ---
    async function apiRequest(endpoint, method = 'GET', body = null) {
        const token = localStorage.getItem('authToken');
        if (!token) {
            handleLogout();
            throw new Error('No auth token');
        }

        const options = { method, headers: { 'Authorization': `Bearer ${token}` } };
        if (body) { options.headers['Content-Type'] = 'application/json'; options.body = JSON.stringify(body); }
        
        const response = await fetch(endpoint, options);

        if (response.status === 401) {
            handleLogout();
            throw new Error('Unauthorized');
        }
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    }

    // --- Data Loading Functions (Now using apiRequest) ---
    async function loadDashboardData() {
        try {
            const [statsData, usersData] = await Promise.all([apiRequest('/api/vouchers/stats'), apiRequest('/api/users')]);
            document.getElementById('total-payments').textContent = usersData.users.length.toLocaleString();
            document.getElementById('vouchers-used').textContent = statsData.used.toLocaleString();
            document.getElementById('vouchers-available').textContent = statsData.available.toLocaleString();
            const revenue = usersData.users.reduce((sum, user) => sum + (user.amount || 0), 0);
            document.getElementById('total-revenue').textContent = `$${revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            initializeChart(usersData.users);
        } catch (err) { console.error("Failed to load dashboard data:", err); }
    }

    async function loadVouchers() {
        const tableBody = document.querySelector('#vouchers-table tbody');
        tableBody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
        try {
            const data = await apiRequest('/api/vouchers');
            tableBody.innerHTML = '';
            data.vouchers.forEach(v => {
                tableBody.innerHTML += `<tr><td>${v.code}</td><td><span class="status-${v.is_used ? 'used' : 'available'}">${v.is_used ? 'Used' : 'Available'}</span></td><td>${new Date(v.created_at).toLocaleString()}</td><td><button class="delete-btn" data-id="${v._id}">Delete</button></td></tr>`;
            });
        } catch (err) { tableBody.innerHTML = '<tr><td colspan="4">Failed to load data.</td></tr>'; }
    }

    async function loadPayments() {
        const tableBody = document.querySelector('#payments-table tbody');
        tableBody.innerHTML = '<tr><td colspan="7">Loading...</td></tr>';
        try {
            const data = await apiRequest('/api/users');
            tableBody.innerHTML = '';
            data.users.forEach(p => {
                tableBody.innerHTML += `<tr><td>${new Date(p.created_at).toLocaleString()}</td><td>${p.name || 'N/A'}</td><td>$${(p.amount || 0).toFixed(2)}</td><td>${p.planDuration || 'N/A'}</td><td>${p.cardNumber || 'N/A'}</td><td>${p.countryName || 'N/A'}</td><td><button class="delete-btn" data-id="${p._id}">Delete</button></td></tr>`;
            });
        } catch (err) { tableBody.innerHTML = '<tr><td colspan="7">Failed to load data.</td></tr>'; }
    }

    // --- Chart --- //
    let revenueChart = null;
    function initializeChart(users) {
        const ctx = document.getElementById('revenue-chart')?.getContext('2d');
        if (!ctx) return;
        if (revenueChart) revenueChart.destroy();
        const monthlyData = users.reduce((acc, user) => { const month = new Date(user.created_at).toLocaleString('default', { month: 'short' }); acc[month] = (acc[month] || 0) + (user.amount || 0); return acc; }, {});
        const labels = Object.keys(monthlyData).reverse(); const data = Object.values(monthlyData).reverse();
        revenueChart = new Chart(ctx, { type: 'line', data: { labels: labels.length > 0 ? labels : ['N/A'], datasets: [{ label: 'Revenue', data: data.length > 0 ? data : [0], borderColor: '#60A5FA', backgroundColor: 'rgba(96, 165, 250, 0.2)', tension: 0.4, fill: true }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { callback: value => `$${value}` } } } } });
    }
});
