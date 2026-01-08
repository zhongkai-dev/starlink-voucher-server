document.addEventListener('DOMContentLoaded', () => {
    const loginPage = document.getElementById('login-page');
    const dashboardPage = document.getElementById('dashboard-page');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');

    // --- Authentication & Data Fetching Logic --- //

    // Check for token on page load
    const token = localStorage.getItem('authToken');
    if (token) {
        showDashboard(token);
    } else {
        showLogin();
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.textContent = ''; // Clear previous errors
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('authToken', data.token);
                showDashboard(data.token);
            } else {
                loginError.textContent = data.message || 'Invalid username or password';
            }
        } catch (error) {
            loginError.textContent = 'An error occurred. Please try again.';
        }
    });

    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('authToken');
        showLogin();
    });

    async function showDashboard(authToken) {
        loginPage.classList.remove('active');
        dashboardPage.classList.add('active');
        await fetchDashboardData(authToken);
    }

    function showLogin() {
        dashboardPage.classList.remove('active');
        loginPage.classList.add('active');
    }

    async function fetchDashboardData(authToken) {
        try {
            const headers = { 'Authorization': `Bearer ${authToken}` };

            // Fetch voucher stats and user count in parallel
            const [statsResponse, usersResponse] = await Promise.all([
                fetch('/api/vouchers/stats', { headers }),
                fetch('/api/users', { headers }),
            ]);

            if (!statsResponse.ok || !usersResponse.ok) {
                // If token is invalid, force logout
                if (statsResponse.status === 401 || usersResponse.status === 401) {
                    localStorage.removeItem('authToken');
                    showLogin();
                }
                throw new Error('Failed to fetch dashboard data');
            }

            const statsData = await statsResponse.json();
            const usersData = await usersResponse.json();
            
            // Update UI with real data
            document.querySelector('#dashboard-page .card:nth-child(1) p').textContent = usersData.users.length.toLocaleString();
            document.querySelector('#dashboard-page .card:nth-child(2) p').textContent = statsData.used.toLocaleString();
            
            // For demonstration, Online Devices and Revenue will be mocked for now
            document.querySelector('#dashboard-page .card:nth-child(3) p').textContent = Math.floor(Math.random() * 500) + 100; // Random Online Devices
            const revenue = usersData.users.reduce((sum, user) => sum + (user.amount || 0), 0);
            document.querySelector('#dashboard-page .card:nth-child(4) p').textContent = `$${revenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

            // We'll use user creation dates for the chart
            initializeChart(usersData.users);

        } catch (error) {
            console.error('Error fetching data:', error);
            // Optionally show an error message on the dashboard
        }
    }

    // --- Chart.js Logic --- //
    let revenueChart = null;

    function initializeChart(users) {
        const ctx = document.getElementById('revenue-chart').getContext('2d');
        if (revenueChart) {
            revenueChart.destroy();
        }

        // Process user data for the chart
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
                datasets: [{
                    label: 'Revenue Over Time',
                    data: data.length > 0 ? data : [0,0,0],
                    borderColor: '#60A5FA',
                    backgroundColor: 'rgba(96, 165, 250, 0.2)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                         ticks: { callback: value => `$${value}` }
                    }
                }
            }
        });
    }
});
