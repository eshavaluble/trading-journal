// Trading Journal JavaScript
// Data Management and UI Logic

// State
var trades = [];
var chart = null;
var editingTradeId = null;
var currentUser = null;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    setupEventListeners();
});

// Check authentication status
function checkAuthStatus() {
    var user = localStorage.getItem('tradingJournalUser');
    if (user) {
        currentUser = JSON.parse(user);
        showLoggedInState();
        loadTrades();
        initializeChart();
        renderTrades();
        updateStats();
        updateFilterOptions();
    } else {
        // Not logged in, redirect to login page
        window.location.href = 'login.html';
    }
}

// Show logged in state UI
function showLoggedInState() {
    document.getElementById('userName').textContent = currentUser.username;
}

// Handle logout
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('tradingJournalUser');
        currentUser = null;
        trades = [];
        window.location.href = 'login.html';
    }
}

// Load trades from localStorage
function loadTrades() {
    var stored = localStorage.getItem('tradingJournalTrades');
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
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Modal
    var modal = document.getElementById('tradeModal');
    var addTradeBtn = document.getElementById('addTradeBtn');
    var closeModal = document.getElementById('closeModal');
    var cancelBtn = document.getElementById('cancelBtn');
    var tradeForm = document.getElementById('tradeForm');
    var modalBackdrop = document.querySelector('.modal-backdrop');

    addTradeBtn.addEventListener('click', function() { openModal(); });
    closeModal.addEventListener('click', function() { closeModalHandler(); });
    cancelBtn.addEventListener('click', function() { closeModalHandler(); });
    modalBackdrop.addEventListener('click', function() { closeModalHandler(); });
    tradeForm.addEventListener('submit', handleFormSubmit);

    // Filters
    document.getElementById('filterSymbol').addEventListener('change', renderTrades);
    document.getElementById('filterType').addEventListener('change', renderTrades);

    // Escape key closes modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModalHandler();
        }
    });
}

// Modal functions
function openModal(editId) {
    editId = editId || null;
    var modal = document.getElementById('tradeModal');
    var modalTitle = document.getElementById('modalTitle');
    var form = document.getElementById('tradeForm');

    editingTradeId = editId;

    if (editId) {
        var trade = trades.find(function(t) { return t.id === editId; });
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
    var modal = document.getElementById('tradeModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    editingTradeId = null;
}

// Form submission
function handleFormSubmit(e) {
    e.preventDefault();

    var tradeData = {
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
        createdAt: editingTradeId ? trades.find(function(t) { return t.id === editingTradeId; }).createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    if (editingTradeId) {
        var index = trades.findIndex(function(t) { return t.id === editingTradeId; });
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
        trades = trades.filter(function(t) { return t.id !== id; });
        saveTrades();
        renderTrades();
        updateStats();
        updateChart();
        updateFilterOptions();
    }
}

// Get filtered trades
function getFilteredTrades() {
    var symbolFilter = document.getElementById('filterSymbol').value;
    var typeFilter = document.getElementById('filterType').value;

    return trades.filter(function(trade) {
        if (symbolFilter && trade.symbol !== symbolFilter) return false;
        if (typeFilter && trade.type !== typeFilter) return false;
        return true;
    }).sort(function(a, b) { return new Date(b.exitDate) - new Date(a.exitDate); });
}

// Render trades table
function renderTrades() {
    var tbody = document.getElementById('tradesTableBody');
    var emptyState = document.getElementById('emptyState');
    var filteredTrades = getFilteredTrades();

    if (filteredTrades.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.add('active');
        return;
    }

    emptyState.classList.remove('active');
    tbody.innerHTML = filteredTrades.map(function(trade) {
        return '<tr>' +
            '<td>' + formatDate(trade.exitDate) + '</td>' +
            '<td><strong>' + trade.symbol + '</strong></td>' +
            '<td class="type-' + trade.type + '">' + trade.type.charAt(0).toUpperCase() + trade.type.slice(1) + '</td>' +
            '<td>$' + formatNumber(trade.entryPrice) + '</td>' +
            '<td>$' + formatNumber(trade.exitPrice) + '</td>' +
            '<td>' + formatNumber(trade.quantity) + '</td>' +
            '<td class="' + (trade.pnl >= 0 ? 'pnl-positive' : 'pnl-negative') + '">' +
            (trade.pnl >= 0 ? '+' : '') + '$' + formatNumber(trade.pnl) +
            '</td>' +
            '<td>' +
            '<div class="action-buttons">' +
            '<button class="btn-icon" onclick="openModal(\'' + trade.id + '\')" title="Edit">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>' +
            '<path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>' +
            '</svg>' +
            '</button>' +
            '<button class="btn-icon" onclick="deleteTrade(\'' + trade.id + '\')" title="Delete">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<polyline points="3,6 5,6 21,6"></polyline>' +
            '<path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>' +
            '</svg>' +
            '</button>' +
            '</div>' +
            '</td>' +
            '</tr>';
    }).join('');
}

// Update statistics
function updateStats() {
    var totalPnL = trades.reduce(function(sum, t) { return sum + t.pnl; }, 0);
    var wins = trades.filter(function(t) { return t.pnl > 0; }).length;
    var winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;
    var winsArray = trades.filter(function(t) { return t.pnl > 0; });
    var avgWin = winsArray.length > 0 ? winsArray.reduce(function(sum, t) { return sum + t.pnl; }, 0) / winsArray.length : 0;

    document.getElementById('totalPnL').textContent = '$' + formatNumber(totalPnL);
    document.getElementById('totalPnL').className = 'stat-value ' + (totalPnL >= 0 ? 'pnl-positive' : 'pnl-negative');

    var pnlChangeEl = document.getElementById('pnlChange');
    pnlChangeEl.textContent = (totalPnL >= 0 ? '+' : '') + '$' + formatNumber(Math.abs(totalPnL));
    pnlChangeEl.className = 'stat-change ' + (totalPnL >= 0 ? 'positive' : 'negative');

    document.getElementById('winRate').textContent = winRate.toFixed(1) + '%';
    document.getElementById('winRateChange').textContent = wins + ' / ' + trades.length + ' trades';

    document.getElementById('totalTrades').textContent = trades.length;
    document.getElementById('avgWin').textContent = '$' + formatNumber(avgWin);
}

// Update filter dropdown options
function updateFilterOptions() {
    var symbolFilter = document.getElementById('filterSymbol');
    var symbols = [...new Set(trades.map(function(t) { return t.symbol; }))].sort();

    symbolFilter.innerHTML = '<option value="">All Symbols</option>' +
        symbols.map(function(s) { return '<option value="' + s + '">' + s + '</option>'; }).join('');
}

// Initialize Chart
function initializeChart() {
    var ctx = document.getElementById('performanceChart').getContext('2d');

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
                            return 'P&L: $' + formatNumber(context.raw);
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

    var sortedTrades = [...trades].sort(function(a, b) { return new Date(a.exitDate) - new Date(b.exitDate); });
    
    var cumulativePnL = 0;
    var dataPoints = sortedTrades.map(function(trade) {
        cumulativePnL += trade.pnl;
        return {
            x: trade.exitDate,
            y: cumulativePnL
        };
    });

    var labels = sortedTrades.map(function(t) { return formatDate(t.exitDate); });

    chart.data.labels = labels;
    chart.data.datasets[0].data = dataPoints.map(function(d) { return d.y; });

    // Update line color based on overall performance
    var totalPnL = cumulativePnL;
    chart.data.datasets[0].borderColor = totalPnL >= 0 ? '#10b981' : '#ef4444';
    chart.data.datasets[0].pointBackgroundColor = totalPnL >= 0 ? '#10b981' : '#ef4444';
    chart.data.datasets[0].backgroundColor = totalPnL >= 0 ? 
        'rgba(16, 185, 129, 0.1)' : 
        'rgba(239, 68, 68, 0.1)';

    chart.update();
}

// Utility functions
function formatNumber(num) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
    var date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
