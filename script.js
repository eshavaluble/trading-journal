// Trading Journal JavaScript
// Data Management and UI Logic

// State
let trades = [];
let chart = null;
let editingTradeId = null;
let currentUser = null;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    setupAuthEventListeners();
    setupEventListeners();
});

// Check authentication status
function checkAuthStatus() {
    const user = localStorage.getItem('tradingJournalUser');
    if (user) {
        currentUser = JSON.parse(user);
        showLoggedInState();
        loadTrades();
        initializeChart();
        renderTrades();
        updateStats();
        updateFilterOptions();
    } else {
        showLoggedOutState();
        // Show auth modal by default for new visitors
        openAuthModal('login');
    }
}

// Show logged in state UI
function showLoggedInState() {
    document.getElementById('authButtons').style.display = 'none';
    document.getElementById('userMenu').style.display = 'flex';
    document.getElementById('mainNav').style.display = 'flex';
    document.getElementById('mainContent').style.display = 'block';
    document.getElementById('userName').textContent = currentUser.username;
}

// Show logged out state UI
function showLoggedOutState() {
    document.getElementById('authButtons').style.display = 'flex';
    document.getElementById('userMenu').style.display = 'none';
    document.getElementById('mainNav').style.display = 'none';
function setupAuthEventListeners() {
    const authModal = document.getElementById('authModal');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const closeAuthModal = document.getElementById('closeAuthModal');
    const showRegister = document.getElementById('showRegister');
    const showLogin = document.getElementById('showLogin');
    const loginFormSubmit = document.getElementById('loginFormSubmit');
    const registerFormSubmit = document.getElementById('registerFormSubmit');
    const logoutBtn = document.getElementById('logoutBtn');

    // Open auth modal for login
    loginBtn.addEventListener('click', () => {
        openAuthModal('login');
    });

    // Open auth modal for register
    registerBtn.addEventListener('click', () => {
        openAuthModal('register');
    });

    // Close auth modal
    closeAuthModal.addEventListener('click', () => {
        closeAuthModalHandler();
    });

    authModal.querySelector('.modal-backdrop').addEventListener('click', () => {
        closeAuthModalHandler();
    });

    // Switch to register form
    showRegister.addEventListener('click', () => {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
        clearAuthErrors();
    });

    // Switch to login form
    showLogin.addEventListener('click', () => {
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('loginForm').style.display = 'block';
        clearAuthErrors();
    });

    // Login form submission
    loginFormSubmit.addEventListener('submit', handleLogin);

    // Register form submission
    registerFormSubmit.addEventListener('submit', handleRegister);

    // Logout
    logoutBtn.addEventListener('click', handleLogout);

    // Escape key closes auth modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && authModal.classList.contains('active')) {
            closeAuthModalHandler();
        }
    });
}

// Open auth modal
function openAuthModal(mode) {
    const authModal = document.getElementById('authModal');
    if (mode === 'register') {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
    } else {
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('loginForm').style.display = 'block';
    }
    clearAuthErrors();
    authModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close auth modal
function closeAuthModalHandler() {
    const authModal = document.getElementById('authModal');
    authModal.classList.remove('active');
    document.body.style.overflow = '';
    clearAuthForms();
}

// Clear auth forms
function clearAuthForms() {
    document.getElementById('loginFormSubmit').reset();
    document.getElementById('registerFormSubmit').reset();
    clearAuthErrors();
}

// Clear auth errors
function clearAuthErrors() {
    document.getElementById('loginError').textContent = '';
    document.getElementById('loginError').classList.remove('active');
    document.getElementById('registerError').textContent = '';
    document.getElementById('registerError').classList.remove('active');
}

// Show error
function showError(elementId, message) {
    const errorEl = document.getElementById(elementId);
    errorEl.textContent = message;
    errorEl.classList.add('active');
}

// Handle login
function handleLogin(e) {
    e.preventDefault();
    clearAuthErrors();

    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;

    // Get users from storage
    const users = JSON.parse(localStorage.getItem('tradingJournalUsers') || '[]');

    // Find user
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
        showError('loginError', 'Invalid email or password');
        return;
    }

    // Login successful
    currentUser = { id: user.id, username: user.username, email: user.email };
    localStorage.setItem('tradingJournalUser', JSON.stringify(currentUser));

    closeAuthModalHandler();
    showLoggedInState();
    loadTrades();
    initializeChart();
    renderTrades();
    updateStats();
    updateFilterOptions();
}

// Handle register
function handleRegister(e) {
    e.preventDefault();
    clearAuthErrors();

    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim().toLowerCase();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;

    // Validation
    if (username.length < 2) {
        showError('registerError', 'Username must be at least 2 characters');
        return;
    }

    if (password.length < 6) {
        showError('registerError', 'Password must be at least 6 characters');
        return;
    }

    if (password !== confirmPassword) {
        showError('registerError', 'Passwords do not match');
        return;
    }

    // Get existing users
    const users = JSON.parse(localStorage.getItem('tradingJournalUsers') || '[]');

    // Check if email already exists
    if (users.some(u => u.email === email)) {
        showError('registerError', 'Email already registered');
        return;
    }

    // Create new user
    const newUser = {
        id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        username,
        email,
        password,
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem('tradingJournalUsers', JSON.stringify(users));

    // Auto login
    currentUser = { id: newUser.id, username: newUser.username, email: newUser.email };
    localStorage.setItem('tradingJournalUser', JSON.stringify(currentUser));

    closeAuthModalHandler();
    showLoggedInState();
    trades = [];
    initializeChart();
    renderTrades();
    updateStats();
}

// Handle logout
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('tradingJournalUser');
        currentUser = null;
        trades = [];
        showLoggedOutState();
    }
}

// Load trades from localStorage
function loadTrades() {
    const stored = localStorage.getItem('tradingJournalTrades');
    if (stored) {
        trades = JSON.parse(stored);
    }
}

// Save trades to localStorage
function saveTrades() {
    localStorage.setItem('tradingJournalTrades', JSON.stringify(trades));
}

// Setup all event listeners
function setupEventListeners() {
    // Modal
    const modal = document.getElementById('tradeModal');
    const addTradeBtn = document.getElementById('addTradeBtn');
    const closeModal = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const tradeForm = document.getElementById('tradeForm');
    const modalBackdrop = document.querySelector('.modal-backdrop');

    addTradeBtn.addEventListener('click', () => openModal());
    closeModal.addEventListener('click', () => closeModalHandler());
    cancelBtn.addEventListener('click', () => closeModalHandler());
    modalBackdrop.addEventListener('click', () => closeModalHandler());
    tradeForm.addEventListener('submit', handleFormSubmit);

    // Filters
    document.getElementById('filterSymbol').addEventListener('change', renderTrades);
    document.getElementById('filterType').addEventListener('change', renderTrades);

    // Escape key closes modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModalHandler();
        }
    });
}

// Modal functions
function openModal(editId = null) {
    const modal = document.getElementById('tradeModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('tradeForm');

    editingTradeId = editId;

    if (editId) {
        const trade = trades.find(t => t.id === editId);
        if (trade) {
            modalTitle.textContent = 'Edit Trade';
            document.getElementById('tradeId').value = trade.id;
            document.getElementById('symbol').value = trade.symbol;
            document.getElementById('tradeType').value = trade.type;
            document.getElementById('entryPrice').value = trade.entryPrice;
            document.getElementById('exitPrice').value = trade.exitPrice;
            document.getElementById('quantity').value = trade.quantity;
            document.getElementById('entryDate').value = trade.entryDate;
            document.getElementById('exitDate').value = trade.exitDate;
            document.getElementById('notes').value = trade.notes || '';
        }
    } else {
        modalTitle.textContent = 'Add New Trade';
        form.reset();
        document.getElementById('tradeId').value = '';
        document.getElementById('entryDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('exitDate').value = new Date().toISOString().split('T')[0];
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModalHandler() {
    const modal = document.getElementById('tradeModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    editingTradeId = null;
}

// Form submission
function handleFormSubmit(e) {
    e.preventDefault();

    const tradeData = {
        id: editingTradeId || generateId(),
        symbol: document.getElementById('symbol').value.toUpperCase(),
        type: document.getElementById('tradeType').value,
        entryPrice: parseFloat(document.getElementById('entryPrice').value),
        exitPrice: parseFloat(document.getElementById('exitPrice').value),
        quantity: parseFloat(document.getElementById('quantity').value),
        entryDate: document.getElementById('entryDate').value,
        exitDate: document.getElementById('exitDate').value,
        notes: document.getElementById('notes').value,
        pnl: calculatePnL(
            parseFloat(document.getElementById('entryPrice').value),
            parseFloat(document.getElementById('exitPrice').value),
            parseFloat(document.getElementById('quantity').value),
            document.getElementById('tradeType').value
        ),
        createdAt: editingTradeId ? trades.find(t => t.id === editingTradeId)?.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    if (editingTradeId) {
        const index = trades.findIndex(t => t.id === editingTradeId);
        if (index !== -1) {
            trades[index] = tradeData;
        }
    } else {
        trades.push(tradeData);
    }

    saveTrades();
    renderTrades();
    updateStats();
    updateChart();
    updateFilterOptions();
    closeModalHandler();
}

// Calculate P&L
function calculatePnL(entryPrice, exitPrice, quantity, type) {
    if (type === 'long') {
        return (exitPrice - entryPrice) * quantity;
    } else {
        return (entryPrice - exitPrice) * quantity;
    }
}

// Generate unique ID
function generateId() {
    return 'trade_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Delete trade
function deleteTrade(id) {
    if (confirm('Are you sure you want to delete this trade?')) {
        trades = trades.filter(t => t.id !== id);
        saveTrades();
        renderTrades();
        updateStats();
        updateChart();
        updateFilterOptions();
    }
}

// Get filtered trades
function getFilteredTrades() {
    const symbolFilter = document.getElementById('filterSymbol').value;
    const typeFilter = document.getElementById('filterType').value;

    return trades.filter(trade => {
        if (symbolFilter && trade.symbol !== symbolFilter) return false;
        if (typeFilter && trade.type !== typeFilter) return false;
        return true;
    }).sort((a, b) => new Date(b.exitDate) - new Date(a.exitDate));
}

// Render trades table
function renderTrades() {
    const tbody = document.getElementById('tradesTableBody');
    const emptyState = document.getElementById('emptyState');
    const filteredTrades = getFilteredTrades();

    if (filteredTrades.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.add('active');
        return;
    }

    emptyState.classList.remove('active');
    tbody.innerHTML = filteredTrades.map(trade => `
        <tr>
            <td>${formatDate(trade.exitDate)}</td>
            <td><strong>${trade.symbol}</strong></td>
            <td class="type-${trade.type}">${trade.type.charAt(0).toUpperCase() + trade.type.slice(1)}</td>
            <td>$${formatNumber(trade.entryPrice)}</td>
            <td>$${formatNumber(trade.exitPrice)}</td>
            <td>${formatNumber(trade.quantity)}</td>
            <td class="${trade.pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}">
                ${trade.pnl >= 0 ? '+' : ''}$${formatNumber(trade.pnl)}
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon" onclick="openModal('${trade.id}')" title="Edit">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-icon" onclick="deleteTrade('${trade.id}')" title="Delete">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3,6 5,6 21,6"></polyline>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Update statistics
function updateStats() {
    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
    const wins = trades.filter(t => t.pnl > 0).length;
    const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;
    const winsArray = trades.filter(t => t.pnl > 0);
    const avgWin = winsArray.length > 0 ? winsArray.reduce((sum, t) => sum + t.pnl, 0) / winsArray.length : 0;

    document.getElementById('totalPnL').textContent = `$${formatNumber(totalPnL)}`;
    document.getElementById('totalPnL').className = `stat-value ${totalPnL >= 0 ? 'pnl-positive' : 'pnl-negative'}`;

    const pnlChangeEl = document.getElementById('pnlChange');
    pnlChangeEl.textContent = `${totalPnL >= 0 ? '+' : ''}$${formatNumber(Math.abs(totalPnL))}`;
    pnlChangeEl.className = `stat-change ${totalPnL >= 0 ? 'positive' : 'negative'}`;

    document.getElementById('winRate').textContent = `${winRate.toFixed(1)}%`;
    document.getElementById('winRateChange').textContent = `${wins} / ${trades.length} trades`;

    document.getElementById('totalTrades').textContent = trades.length;
    document.getElementById('avgWin').textContent = `$${formatNumber(avgWin)}`;
}

// Update filter dropdown options
function updateFilterOptions() {
    const symbolFilter = document.getElementById('filterSymbol');
    const symbols = [...new Set(trades.map(t => t.symbol))].sort();

    symbolFilter.innerHTML = '<option value="">All Symbols</option>' +
        symbols.map(s => `<option value="${s}">${s}</option>`).join('');
}

// Initialize Chart
function initializeChart() {
    const ctx = document.getElementById('performanceChart').getContext('2d');

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Cumulative P&L',
                data: [],
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#6366f1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#1a1a23',
                    titleColor: '#f0f0f5',
                    bodyColor: '#9898a6',
                    borderColor: '#2a2a35',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `P&L: $${formatNumber(context.raw)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: '#2a2a35',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#6b6b78',
                        maxRotation: 45
                    }
                },
                y: {
                    grid: {
                        color: '#2a2a35',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#6b6b78',
                        callback: function(value) {
                            return '$' + formatNumber(value);
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });

    updateChart();
}

// Update chart data
function updateChart() {
    if (!chart) return;

    const sortedTrades = [...trades].sort((a, b) => new Date(a.exitDate) - new Date(b.exitDate));
    
    let cumulativePnL = 0;
    const dataPoints = sortedTrades.map(trade => {
        cumulativePnL += trade.pnl;
        return {
            x: trade.exitDate,
            y: cumulativePnL
        };
    });

    const labels = sortedTrades.map(t => formatDate(t.exitDate));

    chart.data.labels = labels;
    chart.data.datasets[0].data = dataPoints.map(d => d.y);

    // Update line color based on overall performance
    const totalPnL = cumulativePnL;
    chart.data.datasets[0].borderColor = totalPnL >= 0 ? '#10b981' : '#ef4444';
    chart.data.datasets[0].pointBackgroundColor = totalPnL >= 0 ? '#10b981' : '#ef4444';
    chart.data.datasets[0].backgroundColor = totalPnL >= 0 
        ? 'rgba(16, 185, 129, 0.1)' 
        : 'rgba(239, 68, 68, 0.1)';

    chart.update();
}

// Utility functions
function formatNumber(num) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

