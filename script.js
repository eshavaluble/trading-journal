// Volubit Trading Journal - script.js
// Full Data Logic for Dashboard, Charts & Trade CRUD

var trades = [];
var performanceChart = null;
var winLossChart = null;
var editingTradeId = null;
var currentUser = null;

// ====== INIT ======
document.addEventListener('DOMContentLoaded', function () {
    checkAuthStatus();
    setupEventListeners();
    addToastContainer();
});

function checkAuthStatus() {
    var stored = localStorage.getItem('tradingJournalUser');
    if (stored) {
        currentUser = JSON.parse(stored);
        document.getElementById('userName').textContent = currentUser.username;
        document.getElementById('userAvatar').textContent = currentUser.username.charAt(0).toUpperCase();
        loadTrades();
        initCharts();
        renderTrades();
        updateStats();
        updateFilterOptions();
    } else {
        window.location.href = 'login.html';
    }
}

// ====== AUTH ======
function handleLogout() {
    if (confirm('Yakin ingin logout dari Volubit?')) {
        localStorage.removeItem('tradingJournalUser');
        window.location.href = 'login.html';
    }
}

// ====== STORAGE ======
function loadTrades() {
    var userId = currentUser.id;
    var key = 'vtj_trades_' + userId;
    var stored = localStorage.getItem(key);
    // fallback: support old key
    if (!stored) stored = localStorage.getItem('tradingJournalTrades');
    trades = stored ? JSON.parse(stored) : [];
}

function saveTrades() {
    var key = 'vtj_trades_' + currentUser.id;
    localStorage.setItem(key, JSON.stringify(trades));
}

// ====== EVENTS ======
function setupEventListeners() {
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    var modal = document.getElementById('tradeModal');
    var detailModal = document.getElementById('detailModal');

    document.getElementById('addTradeBtn').addEventListener('click', function () { openModal(); });
    document.getElementById('closeModal').addEventListener('click', closeModalHandler);
    document.getElementById('cancelBtn').addEventListener('click', closeModalHandler);
    document.querySelector('#tradeModal .modal-backdrop').addEventListener('click', closeModalHandler);
    document.getElementById('closeDetailModal').addEventListener('click', closeDetailModal);
    document.querySelector('#detailModal .modal-backdrop').addEventListener('click', closeDetailModal);
    document.getElementById('tradeForm').addEventListener('submit', handleFormSubmit);

    ['filterSymbol', 'filterType', 'filterCategory', 'filterOutcome'].forEach(function (id) {
        document.getElementById(id).addEventListener('change', renderTrades);
    });

    // Toggle leverage visibility
    document.querySelectorAll('input[name="tradeType"]').forEach(function (radio) {
        radio.addEventListener('change', function () { });
    });

    document.getElementById('tradeCategory').addEventListener('change', function () {
        var lev = document.getElementById('leverageGroup');
        lev.style.display = this.value === 'futures' ? 'flex' : 'none';
    });
    document.getElementById('leverageGroup').style.display = 'none';

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            if (modal.classList.contains('active')) closeModalHandler();
            if (detailModal.classList.contains('active')) closeDetailModal();
        }
    });
}

// ====== MODAL ======
function openModal(editId) {
    editId = editId || null;
    editingTradeId = editId;
    var form = document.getElementById('tradeForm');
    var modalTitle = document.getElementById('modalTitle');

    if (editId) {
        var trade = trades.find(function (t) { return t.id === editId; });
        if (!trade) return;
        modalTitle.textContent = 'Edit Trade';

        document.getElementById('tradeId').value = trade.id;
        document.getElementById('symbol').value = trade.symbol || '';
        document.getElementById('tradeCategory').value = trade.category || '';
        document.getElementById('platform').value = trade.platform || '';
        document.getElementById('leverage').value = trade.leverage || '';
        document.getElementById('leverageGroup').style.display = trade.category === 'futures' ? 'flex' : 'none';

        // radio
        var radios = document.querySelectorAll('input[name="tradeType"]');
        radios.forEach(function (r) { r.checked = r.value === trade.type; });

        document.getElementById('entryPrice').value = trade.entryPrice || '';
        document.getElementById('exitPrice').value = trade.exitPrice || '';
        document.getElementById('quantity').value = trade.quantity || '';
        document.getElementById('takeProfit').value = trade.takeProfit || '';
        document.getElementById('stopLoss').value = trade.stopLoss || '';
        document.getElementById('fees').value = trade.fees || '';
        document.getElementById('entryDate').value = trade.entryDate || '';
        document.getElementById('exitDate').value = trade.exitDate || '';
        document.getElementById('tradeSetup').value = trade.setup || '';
        document.getElementById('tradeEmotion').value = trade.emotion || '';
        document.getElementById('reason').value = trade.reason || '';
        document.getElementById('lessonLearned').value = trade.lesson || '';
        document.getElementById('tradeStatus').value = trade.status || 'closed';
        document.getElementById('tags').value = trade.tags ? trade.tags.join(', ') : '';
    } else {
        modalTitle.textContent = 'Tambah Trade Baru';
        form.reset();
        document.getElementById('tradeId').value = '';
        document.getElementById('entryDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('leverageGroup').style.display = 'none';
    }

    document.getElementById('tradeModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModalHandler() {
    document.getElementById('tradeModal').classList.remove('active');
    document.body.style.overflow = '';
    editingTradeId = null;
}

function openDetailModal(id) {
    var trade = trades.find(function (t) { return t.id === id; });
    if (!trade) return;

    document.getElementById('detailTitle').textContent = trade.symbol + ' — ' + (trade.type === 'long' ? '📈 Long' : '📉 Short');
    document.getElementById('detailSubtitle').textContent = trade.platform + ' · ' + cap(trade.category) + (trade.leverage ? ' ' + trade.leverage + 'x' : '');

    var pnlClass = (trade.pnl >= 0) ? 'pnl-positive' : 'pnl-negative';
    var pnlStr = (trade.pnl >= 0 ? '+' : '') + '$' + fmtNum(trade.pnl);
    var rr = calcRR(trade);

    document.getElementById('detailContent').innerHTML =
        '<div class="detail-grid">' +
        dItem('PnL', '<span class="' + pnlClass + '">' + pnlStr + '</span>') +
        dItem('Status', '<span class="badge badge-' + (trade.status || 'closed') + '">' + cap(trade.status || 'closed') + '</span>') +
        dItem('Entry Price', '$' + fmtNum(trade.entryPrice)) +
        dItem('Exit Price', trade.exitPrice ? '$' + fmtNum(trade.exitPrice) : '—') +
        dItem('Quantity', trade.quantity) +
        dItem('Fees', trade.fees ? '$' + fmtNum(trade.fees) : '—') +
        dItem('Take Profit', trade.takeProfit ? '$' + fmtNum(trade.takeProfit) : '—') +
        dItem('Stop Loss', trade.stopLoss ? '$' + fmtNum(trade.stopLoss) : '—') +
        dItem('Entry Date', fmtDate(trade.entryDate)) +
        dItem('Exit Date', trade.exitDate ? fmtDate(trade.exitDate) : '—') +
        dItem('Setup', trade.setup || '—') +
        dItem('Risk/Reward', rr !== null ? rr.toFixed(2) : '—') +
        '</div>' +
        (trade.reason ? '<div class="detail-section"><div class="detail-section-title">Alasan & Analisa</div><div class="detail-textarea">' + escHtml(trade.reason) + '</div></div>' : '') +
        (trade.lesson ? '<div class="detail-section"><div class="detail-section-title">Pelajaran yang Didapat</div><div class="detail-textarea">' + escHtml(trade.lesson) + '</div></div>' : '') +
        (trade.emotion ? '<div class="detail-section"><div class="detail-section-title">Kondisi Emosi</div><div class="detail-value">' + trade.emotion + '</div></div>' : '') +
        (trade.tags && trade.tags.length ? '<div class="detail-section"><div class="detail-section-title">Tags</div><div style="display:flex;gap:6px;flex-wrap:wrap">' + trade.tags.map(function (t) { return '<span class="badge badge-spot">' + escHtml(t) + '</span>'; }).join('') + '</div></div>' : '');

    document.getElementById('detailModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeDetailModal() {
    document.getElementById('detailModal').classList.remove('active');
    document.body.style.overflow = '';
}

function dItem(label, val) {
    return '<div class="detail-item"><div class="detail-label">' + label + '</div><div class="detail-value">' + val + '</div></div>';
}

// ====== FORM SUBMIT ======
function handleFormSubmit(e) {
    e.preventDefault();

    var typeRadio = document.querySelector('input[name="tradeType"]:checked');
    if (!typeRadio) { showToast('Pilih posisi Long atau Short terlebih dahulu.', 'error'); return; }

    var entryPrice = parseFloatSafe(document.getElementById('entryPrice').value);
    var exitPrice = parseFloatSafe(document.getElementById('exitPrice').value);
    var quantity = parseFloatSafe(document.getElementById('quantity').value);
    var fees = parseFloatSafe(document.getElementById('fees').value) || 0;
    var tradeType = typeRadio.value;

    var pnl = exitPrice !== null ? calcPnL(entryPrice, exitPrice, quantity, tradeType, fees) : 0;

    var tagsRaw = document.getElementById('tags').value.trim();
    var tagsArr = tagsRaw ? tagsRaw.split(',').map(function (t) { return t.trim().toLowerCase(); }).filter(Boolean) : [];

    var tradeData = {
        id: editingTradeId || genId(),
        symbol: document.getElementById('symbol').value.trim().toUpperCase(),
        category: document.getElementById('tradeCategory').value,
        platform: document.getElementById('platform').value,
        leverage: parseInt(document.getElementById('leverage').value) || null,
        type: tradeType,
        entryPrice: entryPrice,
        exitPrice: exitPrice,
        quantity: quantity,
        takeProfit: parseFloatSafe(document.getElementById('takeProfit').value),
        stopLoss: parseFloatSafe(document.getElementById('stopLoss').value),
        fees: fees,
        entryDate: document.getElementById('entryDate').value,
        exitDate: document.getElementById('exitDate').value || null,
        setup: document.getElementById('tradeSetup').value,
        emotion: document.getElementById('tradeEmotion').value,
        reason: document.getElementById('reason').value.trim(),
        lesson: document.getElementById('lessonLearned').value.trim(),
        status: document.getElementById('tradeStatus').value,
        tags: tagsArr,
        pnl: pnl,
        createdAt: editingTradeId ? (trades.find(function (t) { return t.id === editingTradeId; }) || {}).createdAt || new Date().toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    if (editingTradeId) {
        var idx = trades.findIndex(function (t) { return t.id === editingTradeId; });
        if (idx !== -1) trades[idx] = tradeData;
        showToast('Trade berhasil diperbarui!', 'success');
    } else {
        trades.push(tradeData);
        showToast('Trade berhasil disimpan!', 'success');
    }

    saveTrades();
    renderTrades();
    updateStats();
    updateCharts();
    updateFilterOptions();
    closeModalHandler();
}

// ====== CALCULATIONS ======
function calcPnL(entry, exit, qty, type, fees) {
    if (exit === null) return 0;
    var raw = type === 'long' ? (exit - entry) * qty : (entry - exit) * qty;
    return raw - (fees || 0);
}

function calcRR(trade) {
    if (!trade.stopLoss || !trade.takeProfit || !trade.entryPrice) return null;
    var risk = Math.abs(trade.entryPrice - trade.stopLoss);
    var reward = Math.abs(trade.takeProfit - trade.entryPrice);
    if (risk === 0) return null;
    return reward / risk;
}

// ====== STATS ======
function updateStats() {
    var closedTrades = trades.filter(function (t) { return t.status !== 'open' && t.exitPrice !== null; });
    var totalPnL = closedTrades.reduce(function (s, t) { return s + t.pnl; }, 0);
    var wins = closedTrades.filter(function (t) { return t.pnl > 0; });
    var losses = closedTrades.filter(function (t) { return t.pnl < 0; });
    var winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;
    var avgWin = wins.length > 0 ? wins.reduce(function (s, t) { return s + t.pnl; }, 0) / wins.length : 0;
    var biggestLoss = losses.length > 0 ? Math.min.apply(null, losses.map(function (t) { return t.pnl; })) : 0;

    var rrValues = trades.map(calcRR).filter(function (v) { return v !== null; });
    var avgRR = rrValues.length > 0 ? rrValues.reduce(function (s, v) { return s + v; }, 0) / rrValues.length : 0;

    // PnL
    var pnlEl = document.getElementById('totalPnL');
    pnlEl.textContent = (totalPnL >= 0 ? '+' : '') + '$' + fmtNum(Math.abs(totalPnL));
    pnlEl.className = 'stat-value ' + (totalPnL >= 0 ? 'pnl-positive' : 'pnl-negative');
    var pnlChangeEl = document.getElementById('pnlChange');
    pnlChangeEl.textContent = (totalPnL >= 0 ? 'Profit kumulatif' : 'Loss kumulatif');
    pnlChangeEl.className = 'stat-change ' + (totalPnL >= 0 ? 'positive' : 'negative');

    document.getElementById('winRate').textContent = winRate.toFixed(1) + '%';
    document.getElementById('winRateChange').textContent = wins.length + ' win / ' + losses.length + ' loss';
    document.getElementById('totalTrades').textContent = trades.length;
    document.getElementById('avgWin').textContent = '$' + fmtNum(avgWin);
    document.getElementById('biggestLoss').textContent = '$' + fmtNum(Math.abs(biggestLoss));
    document.getElementById('avgRR').textContent = avgRR.toFixed(2);
}

// ====== FILTER ======
function updateFilterOptions() {
    var symbols = [...new Set(trades.map(function (t) { return t.symbol; }))].sort();
    var sel = document.getElementById('filterSymbol');
    sel.innerHTML = '<option value="">Semua Aset</option>' +
        symbols.map(function (s) { return '<option value="' + s + '">' + s + '</option>'; }).join('');
}

function getFilteredTrades() {
    var sym = document.getElementById('filterSymbol').value;
    var type = document.getElementById('filterType').value;
    var cat = document.getElementById('filterCategory').value;
    var outcome = document.getElementById('filterOutcome').value;

    return trades.filter(function (t) {
        if (sym && t.symbol !== sym) return false;
        if (type && t.type !== type) return false;
        if (cat && t.category !== cat) return false;
        if (outcome === 'win' && t.pnl <= 0) return false;
        if (outcome === 'loss' && t.pnl >= 0) return false;
        return true;
    }).sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
}

// ====== RENDER TRADES ======
function renderTrades() {
    var tbody = document.getElementById('tradesTableBody');
    var emptyState = document.getElementById('emptyState');
    var filtered = getFilteredTrades();

    if (filtered.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.add('active');
        return;
    }
    emptyState.classList.remove('active');

    tbody.innerHTML = filtered.map(function (t) {
        var pnlClass = t.pnl >= 0 ? 'pnl-positive' : 'pnl-negative';
        var pnlStr = (t.pnl >= 0 ? '+' : '') + '$' + fmtNum(t.pnl);
        var catBadge = '<span class="badge badge-' + (t.category || 'spot') + '">' + cap(t.category || 'spot') + '</span>';
        var statusBadge = '<span class="badge badge-' + (t.status || 'closed') + '">' + cap(t.status || 'closed') + '</span>';
        var tpsl = (t.takeProfit ? '$' + fmtNum(t.takeProfit) : '—') + ' / ' + (t.stopLoss ? '$' + fmtNum(t.stopLoss) : '—');

        return '<tr>' +
            '<td>' + fmtDate(t.entryDate) + '</td>' +
            '<td><strong>' + escHtml(t.symbol) + '</strong>' + (t.leverage ? '<small style="color:var(--text-muted);margin-left:4px;">' + t.leverage + 'x</small>' : '') + '</td>' +
            '<td>' + escHtml(t.platform || '—') + '</td>' +
            '<td>' + catBadge + '</td>' +
            '<td class="type-' + t.type + '">' + cap(t.type) + '</td>' +
            '<td>$' + fmtNum(t.entryPrice) + '</td>' +
            '<td>' + (t.exitPrice ? '$' + fmtNum(t.exitPrice) : statusBadge) + '</td>' +
            '<td style="font-size:0.82rem;color:var(--text-muted)">' + tpsl + '</td>' +
            '<td>' + t.quantity + '</td>' +
            '<td class="' + pnlClass + '">' + pnlStr + '</td>' +
            '<td><div class="action-buttons">' +
            '<button class="btn-icon" onclick="openDetailModal(\'' + t.id + '\')" title="Detail"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></button>' +
            '<button class="btn-icon" onclick="openModal(\'' + t.id + '\')" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>' +
            '<button class="btn-icon" onclick="deleteTrade(\'' + t.id + '\')" title="Hapus" style="color:var(--accent-danger)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"></polyline><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path></svg></button>' +
            '</div></td>' +
            '</tr>';
    }).join('');
}

// ====== DELETE ======
function deleteTrade(id) {
    if (confirm('Hapus trade ini? Tindakan ini tidak dapat diurungkan.')) {
        trades = trades.filter(function (t) { return t.id !== id; });
        saveTrades();
        renderTrades();
        updateStats();
        updateCharts();
        updateFilterOptions();
        showToast('Trade berhasil dihapus.', 'error');
    }
}

// ====== CHARTS ======
function initCharts() {
    // Performance Line Chart
    var ctx1 = document.getElementById('performanceChart').getContext('2d');
    performanceChart = new Chart(ctx1, {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'Kumulatif PnL', data: [], borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.08)', borderWidth: 2, fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#6366f1', pointHoverRadius: 6 }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#14141c', titleColor: '#f0f0f6', bodyColor: '#9898b0', borderColor: '#272733', borderWidth: 1, padding: 12, displayColors: false,
                    callbacks: { label: function (ctx) { return 'PnL: ' + (ctx.raw >= 0 ? '+' : '') + '$' + fmtNum(ctx.raw); } }
                }
            },
            scales: {
                x: { grid: { color: '#1e1e2a', drawBorder: false }, ticks: { color: '#5a5a72', maxRotation: 30, font: { size: 11 } } },
                y: { grid: { color: '#1e1e2a', drawBorder: false }, ticks: { color: '#5a5a72', font: { size: 11 }, callback: function (v) { return '$' + fmtNum(v); } } }
            },
            interaction: { intersect: false, mode: 'index' }
        }
    });

    // Win/Loss Doughnut Chart
    var ctx2 = document.getElementById('winLossChart').getContext('2d');
    winLossChart = new Chart(ctx2, {
        type: 'doughnut',
        data: { labels: ['Win', 'Loss', 'Break Even'], datasets: [{ data: [0, 0, 0], backgroundColor: ['rgba(16,185,129,0.85)', 'rgba(239,68,68,0.85)', 'rgba(245,158,11,0.85)'], borderColor: '#181820', borderWidth: 3, hoverOffset: 6 }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            cutout: '68%',
            plugins: { legend: { display: false }, tooltip: { backgroundColor: '#14141c', titleColor: '#f0f0f6', bodyColor: '#9898b0', borderColor: '#272733', borderWidth: 1, padding: 12 } }
        }
    });

    updateCharts();
}

function updateCharts() {
    if (!performanceChart || !winLossChart) return;

    // Line chart
    var sorted = trades.filter(function (t) { return t.exitPrice && t.exitDate; }).sort(function (a, b) { return new Date(a.exitDate) - new Date(b.exitDate); });
    var cum = 0;
    var labels = [];
    var data = [];
    sorted.forEach(function (t) {
        cum += t.pnl;
        labels.push(fmtDate(t.exitDate));
        data.push(parseFloat(cum.toFixed(2)));
    });

    performanceChart.data.labels = labels;
    performanceChart.data.datasets[0].data = data;
    var totalPnL = cum;
    var lineColor = totalPnL >= 0 ? '#6366f1' : '#ef4444';
    performanceChart.data.datasets[0].borderColor = lineColor;
    performanceChart.data.datasets[0].pointBackgroundColor = lineColor;
    performanceChart.data.datasets[0].backgroundColor = totalPnL >= 0 ? 'rgba(99,102,241,0.08)' : 'rgba(239,68,68,0.08)';
    performanceChart.update();

    // Doughnut chart
    var closed = trades.filter(function (t) { return t.exitPrice !== null && t.status !== 'open'; });
    var wins = closed.filter(function (t) { return t.pnl > 0; }).length;
    var losses = closed.filter(function (t) { return t.pnl < 0; }).length;
    var be = closed.filter(function (t) { return t.pnl === 0; }).length;
    winLossChart.data.datasets[0].data = [wins, losses, be];
    winLossChart.update();

    document.getElementById('wlWins').textContent = wins;
    document.getElementById('wlLosses').textContent = losses;
    document.getElementById('wlBE').textContent = be;
}

// ====== TOAST ======
function addToastContainer() {
    var el = document.createElement('div');
    el.className = 'toast-container';
    el.id = 'toastContainer';
    document.body.appendChild(el);
}

function showToast(msg, type) {
    type = type || 'success';
    var container = document.getElementById('toastContainer');
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.innerHTML = '<span>' + escHtml(msg) + '</span>';
    container.appendChild(toast);
    setTimeout(function () { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(function () { toast.remove(); }, 350); }, 3000);
}

// ====== UTILS ======
function genId() { return 'vtj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9); }
function parseFloatSafe(val) { var n = parseFloat(val); return isNaN(n) ? null : n; }
function fmtNum(n) { if (n === null || n === undefined) return '0.00'; return parseFloat(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtDate(ds) { if (!ds) return '—'; var d = new Date(ds); return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); }
function cap(s) { if (!s) return ''; return s.charAt(0).toUpperCase() + s.slice(1); }
function escHtml(s) { if (!s) return ''; return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
