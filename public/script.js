document.addEventListener('DOMContentLoaded', () => {
    const pages = {
        login: document.getElementById('login-page'),
        app: document.getElementById('app-page'),
    };

    const contentPages = {
        dashboard: document.getElementById('dashboard-content'),
        vouchers: document.getElementById('vouchers-content'),
        payments: document.getElementById('payments-content'),
    };

    const menuItems = document.querySelectorAll('.sidebar-menu li[data-page]');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');
    const generateVouchersBtn = document.getElementById('generate-vouchers-btn');

    let activePage = 'dashboard';

    // --- Main Setup --- //
    const token = localStorage.getItem('authToken');
    if (token) {
        showApp();
        navigateTo('dashboard', token);
    } else {
        showLogin();
    }

    // --- Event Listeners --- //
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);

    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const pageName = item.getAttribute('data-page').replace('-content', '');
            const currentToken = localStorage.getItem('authToken');
            navigateTo(pageName, currentToken);
        });
    });

    generateVouchersBtn.addEventListener('click', async () => {
        const count = prompt('How many vouchers to generate?', '10');
        if (count && !isNaN(parseInt(count))) {
            await generateVouchers(parseInt(count));
            await loadVouchers(); // Refresh the list
        }
    });

    // --- Navigation & Page Display --- //
    function showApp() {
        pages.login.classList.remove('active');
        pages.app.classList.add('active');
    }

    function showLogin() {
        pages.app.classList.remove('active');
        pages.login.classList.add('active');
    }

    function navigateTo(pageName, token) {
        if (!contentPages[pageName]) return;

        activePage = pageName;

        // Update active class on menu
        menuItems.forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-page') === `${pageName}-content`);
        });

        // Show the correct content page
        Object.values(contentPages).forEach(page => page.classList.remove('active'));
        contentPages[pageName].classList.add('active');

        // Load data for the page
        switch (pageName) {
            case 'dashboard': loadDashboardData(token); break;
            case 'vouchers': loadVouchers(token); break;
            case 'payments': loadPayments(token); break;
        }
    }

    // --- API & Data Handling --- //
    async function handleLogin(e) {
        e.preventDefault();
        loginError.textContent = '';
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
            const data = await response.json();
            if (data.success) {
                localStorage.setItem('authToken', data.token);
                showApp();
                navigateTo('dashboard', data.token);
            } else {
                loginError.textContent = data.message || 'Invalid credentials';
            }
        } catch (error) {
            loginError.textContent = 'An error occurred.';
        }
    }

    function handleLogout(e) {
        e.preventDefault();
        localStorage.removeItem('authToken');
        showLogin();
    }

    async function loadDashboardData(token) {
        const headers = { 'Authorization': `Bearer ${token}` };
        try {
            const [statsRes, usersRes] = await Promise.all([fetch('/api/vouchers/stats', { headers }), fetch('/api/users', { headers })]);
            if (statsRes.status === 401 || usersRes.status === 401) return handleLogout();

            const stats = await statsRes.json();
            const users = await usersRes.json();

            document.getElementById('total-users').textContent = users.users.length.toLocaleString();
            document.getElementById('vouchers-used').textContent = stats.used.toLocaleString();
            document.getElementById('vouchers-available').textContent = stats.available.toLocaleString();
            const revenue = users.users.reduce((sum, user) => sum + (user.amount || 0), 0);
            document.getElementById('total-revenue').textContent = `$${revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            initializeChart(users.users);
        } catch (err) { console.error("Failed to load dashboard data:", err); }
    }

    async function loadVouchers(token) {
        const headers = { 'Authorization': `Bearer ${token || localStorage.getItem('authToken')}` };
        try {
            const response = await fetch('/api/vouchers', { headers });
            if (response.status === 401) return handleLogout();
            const data = await response.json();
            const tableBody = document.querySelector('#vouchers-table tbody');
            tableBody.innerHTML = ''; // Clear old data
            data.vouchers.forEach(v => {
                const row = `<tr>
                    <td>${v.code}</td>
                    <td><span class="status-${v.is_used ? 'used' : 'available'}">${v.is_used ? 'Used' : 'Available'}</span></td>
                    <td>${new Date(v.created_at).toLocaleString()}</td>
                </tr>`;
                tableBody.innerHTML += row;
            });
        } catch (err) { console.error("Failed to load vouchers:", err); }
    }

    async function loadPayments(token) {
        const headers = { 'Authorization': `Bearer ${token || localStorage.getItem('authToken')}` };
        try {
            const response = await fetch('/api/users', { headers });
            if (response.status === 401) return handleLogout();
            const data = await response.json();
            const tableBody = document.querySelector('#payments-table tbody');
            tableBody.innerHTML = ''; // Clear old data
            data.users.forEach(p => {
                const row = `<tr>
                    <td>${new Date(p.created_at).toLocaleString()}</td>
                    <td>${p.name || 'N/A'}</td>
                    <td>$${(p.amount || 0).toFixed(2)}</td>
                    <td>${p.planDuration || 'N/A'}</td>
                    <td>${p.cardNumber || 'N/A'}</td> <!-- Full card number as requested -->
                    <td>${p.countryName || 'N/A'}</td>
                </tr>`;
                tableBody.innerHTML += row;
            });
        } catch (err) { console.error("Failed to load payments:", err); }
    }

    async function generateVouchers(count) {
        const token = localStorage.getItem('authToken');
        try {
            await fetch('/api/vouchers/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ count }),
            });
        } catch (err) { console.error("Failed to generate vouchers:", err); }
    }

    // --- Chart.js Logic --- //
    let revenueChart = null;
    function initializeChart(users) {
        const ctx = document.getElementById('revenue-chart').getContext('2d');
        if (revenueChart) revenueChart.destroy();

        const monthlyData = users.reduce((acc, user) => {
            const month = new Date(user.created_at).toLocaleString('default', { month: 'short' });
            acc[month] = (acc[month] || 0) + (user.amount || 0);
            return acc;
        }, {});

        const labels = Object.keys(monthlyData).reverse();
        const data = Object.values(monthlyData).reverse();

        revenueChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.length > 0 ? labels : ['Jan', 'Feb', 'Mar'],
                datasets: [{ label: 'Revenue', data: data.length > 0 ? data : [0,0,0], borderColor: '#60A5FA', backgroundColor: 'rgba(96, 165, 250, 0.2)', borderWidth: 2, tension: 0.4, fill: true }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { callback: value => `$${value}` } } } }
        });
    }
});
