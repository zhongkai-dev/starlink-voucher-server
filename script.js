document.addEventListener('DOMContentLoaded', () => {
    const loginPage = document.getElementById('login-page');
    const dashboardPage = document.getElementById('dashboard-page');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');

    // --- Authentication Logic --- //

    // Definitive check for the user's login state.
    if (localStorage.getItem('isLoggedIn') === 'true') {
        showDashboard();
    } else {
        showLogin();
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Dummy authentication
        if (username === 'admin' && password === 'password') {
            localStorage.setItem('isLoggedIn', 'true');
            showDashboard();
        } else {
            loginError.textContent = 'Invalid username or password';
        }
    });

    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('isLoggedIn');
        showLogin();
    });

    function showDashboard() {
        loginPage.classList.remove('active');
        dashboardPage.classList.add('active');
        initializeChart();
    }

    function showLogin() {
        dashboardPage.classList.remove('active');
        loginPage.classList.add('active');
    }


    // --- Chart.js Logic --- //
    let revenueChart = null; // To hold the chart instance

    function initializeChart() {
        const ctx = document.getElementById('revenue-chart').getContext('2d');
        
        if(revenueChart) {
            revenueChart.destroy(); // Destroy old chart if it exists
        }

        revenueChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
                datasets: [{
                    label: 'Revenue',
                    data: [1200, 1900, 3000, 5000, 2300, 3100, 4000],
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
                        beginAtZero: true
                    }
                }
            }
        });
    }
});
