// State Management
let appState = {
    initialCapital: 150000000.00,
    currentCapital: 150000000.00,
    trades: [] // Starts clean
};

// Global variables for Chart.js instance
let equityChartInstance = null;

// Conversion rate from USD to IDR for trading calculations
const USD_TO_IDR = 16000;

const DAY_NAMES_ID = {
    Sunday: 'Minggu',
    Monday: 'Senin',
    Tuesday: 'Selasa',
    Wednesday: 'Rabu',
    Thursday: 'Kamis',
    Friday: 'Jumat',
    Saturday: 'Sabtu'
};

const MONTH_NAMES_ID = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// Modal outcome selector state
let inputOutcome = 'PROFIT'; // PROFIT or LOSS default

// Initialize Application on DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initClock();
    setupNavigation();
    setupWizardListeners();
    setupJournalListeners();
    setupSettingsListeners();
    
    // Initial renders
    updateSidebarBalance();
    renderAll();
    updateMarketSessions(); // Initialize sessions clocks
    
    // Set default entry date to today in planner
    document.getElementById('plan-date').value = new Date().toISOString().substring(0, 10);
    
    // Bind Growth Planner listeners
    setupGrowthPlanner();
});

// Real-time Date and Clock Display
function initClock() {
    const clockEl = document.getElementById('current-date-time');
    function updateClock() {
        const now = new Date();
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const dayName = days[now.getDay()];
        const dateStr = now.getDate().toString().padStart(2, '0');
        const monthName = MONTH_NAMES_ID[now.getMonth()];
        const year = now.getFullYear();
        const timeStr = now.toTimeString().split(' ')[0];
        
        clockEl.innerHTML = `<i class="fa-regular fa-calendar-days"></i> ${dayName}, ${dateStr} ${monthName} ${year} | <i class="fa-regular fa-clock"></i> ${timeStr}`;
        
        // Live update sessions clocks alongside main header clock
        updateMarketSessions();
    }
    updateClock();
    setInterval(updateClock, 1000);
}

// Market Sessions Monitor Clocks (Dynamic based on City Timezones)
function updateMarketSessions() {
    const sessions = [
        { id: 'sydney', tz: 'Australia/Sydney', start: 8, end: 17 },
        { id: 'tokyo', tz: 'Asia/Tokyo', start: 9, end: 18 },
        { id: 'london', tz: 'Europe/London', start: 8, end: 17 },
        { id: 'newyork', tz: 'America/New_York', start: 8, end: 17 }
    ];

    sessions.forEach(sess => {
        try {
            // Get local hour & minute in target timezone
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: sess.tz,
                hour: 'numeric',
                minute: 'numeric',
                hour12: false
            });
            const parts = formatter.formatToParts(new Date());
            const hour = parseInt(parts.find(p => p.type === 'hour').value, 10);
            const minute = parseInt(parts.find(p => p.type === 'minute').value, 10);
            
            // Get local day of week in target timezone to check for weekends
            const dayFormatter = new Intl.DateTimeFormat('en-US', {
                timeZone: sess.tz,
                weekday: 'long'
            });
            const localDay = dayFormatter.format(new Date());
            const isWeekend = localDay === 'Saturday' || localDay === 'Sunday';

            const isOpen = !isWeekend && hour >= sess.start && hour < sess.end;
            const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            
            // DOM element updates
            const cardEl = document.getElementById(`session-${sess.id}`);
            const timeEl = document.getElementById(`time-${sess.id}`);
            if (!cardEl || !timeEl) return;
            
            const statusEl = cardEl.querySelector('.session-status');
            
            timeEl.innerText = timeStr;
            
            if (isOpen) {
                cardEl.classList.add('active-session');
                statusEl.innerText = 'BUKA';
                statusEl.className = 'session-status badge-open';
            } else {
                cardEl.classList.remove('active-session');
                statusEl.innerText = 'TUTUP';
                statusEl.className = 'session-status badge-closed';
            }
        } catch (e) {
            console.error('Error updating session for ' + sess.id, e);
        }
    });
}

// Navigation Tabs Setup
function setupNavigation() {
    const menuItems = document.querySelectorAll('.menu-item');
    const tabContents = document.querySelectorAll('.tab-content');
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');

    const pageMeta = {
        dashboard: {
            title: 'Ringkasan Dashboard',
            subtitle: 'Pantau perkembangan modal dan statistik trading Anda.'
        },
        wizard: {
            title: 'Input Laporan Harian',
            subtitle: 'Catat hasil transaksi harian Anda. Pilihan Profit/Loss akan memperbarui saldo modal Anda secara langsung.'
        },
        journal: {
            title: 'Laporan PnL & Jurnal Trading',
            subtitle: 'Evaluasi total profit, kerugian, tingkat disiplin, dan emosi Anda.'
        },
        'sessions-news': {
            title: 'Sesi Pasar & Berita Forex',
            subtitle: 'Pantau jam aktif sesi pasar finansial dan jadwal berita ekonomi rilis.'
        },
        settings: {
            title: 'Pengaturan & Backup',
            subtitle: 'Konfigurasi parameter akun, ekspor data, dan pemeliharaan database.'
        }
    };

    function switchTab(tabId) {
        // Toggle active navigation buttons
        menuItems.forEach(item => {
            if (item.getAttribute('data-tab') === tabId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Toggle active panels
        tabContents.forEach(content => {
            if (content.id === `tab-${tabId}`) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });

        // Update headers
        if (pageMeta[tabId]) {
            pageTitle.innerText = pageMeta[tabId].title;
            pageSubtitle.innerText = pageMeta[tabId].subtitle;
        }

        // Specific actions when entering tabs
        if (tabId === 'dashboard') {
            setTimeout(renderEquityChart, 100); // re-draw charts for sizing
        } else if (tabId === 'wizard') {
            // Keep default values if not editing
            if (!document.getElementById('plan-edit-id').value) {
                resetWizard();
            }
        }

        // Reset edit mode if switching elsewhere
        if (tabId !== 'wizard' && document.getElementById('plan-edit-id').value) {
            cancelEditMode();
        }
    }

    // Bind sidebar clicks
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(item.getAttribute('data-tab'));
        });
    });

    // Support links within dashboard pointing to other tabs
    document.querySelectorAll('[data-go-tab]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(el.getAttribute('data-go-tab'));
        });
    });
}

// Wizard / Planner Functionality (Daily Input Setup)
function setupWizardListeners() {
    // Sync input capital with dashboard capital default
    document.getElementById('plan-capital').value = Math.round(appState.currentCapital);
    
    // Bind outcome Profit / Loss selector buttons in daily input tab
    const profitBtn = document.querySelector('.btn-input-outcome.profit');
    const lossBtn = document.querySelector('.btn-input-outcome.loss');

    profitBtn.addEventListener('click', () => {
        inputOutcome = 'PROFIT';
        profitBtn.style.backgroundColor = 'rgba(16, 185, 129, 0.12)';
        profitBtn.style.borderColor = 'var(--success-green)';
        profitBtn.style.color = 'var(--success-green)';
        
        lossBtn.style.backgroundColor = 'rgba(5, 9, 16, 0.5)';
        lossBtn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        lossBtn.style.color = 'var(--text-muted)';
    });

    lossBtn.addEventListener('click', () => {
        inputOutcome = 'LOSS';
        lossBtn.style.backgroundColor = 'rgba(244, 63, 94, 0.12)';
        lossBtn.style.borderColor = 'var(--error-red)';
        lossBtn.style.color = 'var(--error-red)';
        
        profitBtn.style.backgroundColor = 'rgba(5, 9, 16, 0.5)';
        profitBtn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        profitBtn.style.color = 'var(--text-muted)';
    });

    // Save Plan / Submit Daily Log
    document.getElementById('btn-save-plan').addEventListener('click', saveTradingPlan);
    document.getElementById('btn-cancel-edit').addEventListener('click', cancelEditMode);
}

// Reset Daily Input Form
function resetWizard() {
    document.getElementById('trading-plan-form').reset();
    document.getElementById('plan-date').value = new Date().toISOString().substring(0, 10);
    document.getElementById('plan-capital').value = Math.round(appState.currentCapital);
    document.getElementById('plan-edit-id').value = '';

    // Reset outcome toggles to default PROFIT
    inputOutcome = 'PROFIT';
    const profitBtn = document.querySelector('.btn-input-outcome.profit');
    const lossBtn = document.querySelector('.btn-input-outcome.loss');

    profitBtn.style.backgroundColor = 'rgba(16, 185, 129, 0.12)';
    profitBtn.style.borderColor = 'var(--success-green)';
    profitBtn.style.color = 'var(--success-green)';
    
    lossBtn.style.backgroundColor = 'rgba(5, 9, 16, 0.5)';
    lossBtn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
    lossBtn.style.color = 'var(--text-muted)';

    // Reset Title/Subtitle
    document.getElementById('planner-form-title').innerHTML = '<i class="fa-solid fa-pen-to-square text-gold"></i> Input Laporan Harian';
    document.getElementById('planner-form-subtitle').innerText = 'Catat hasil transaksi harian Anda. Pilihan Profit/Loss akan memperbarui saldo modal Anda secara langsung.';
    document.getElementById('btn-save-plan').innerHTML = '<i class="fa-solid fa-circle-check"></i> Simpan Laporan';
    document.getElementById('btn-cancel-edit').style.display = 'none';
}

// Save or Update Daily PnL Report
function saveTradingPlan() {
    const capital = parseFloat(document.getElementById('plan-capital').value) || 0;
    const pnlInput = parseFloat(document.getElementById('plan-pnl-calc').value) || 0;
    const dateStr = document.getElementById('plan-date').value;
    const emotion = document.getElementById('plan-emotion').value;
    const notes = document.getElementById('plan-notes').value.trim();
    const editId = document.getElementById('plan-edit-id').value;

    if (pnlInput <= 0 || !dateStr) {
        alert('Mohon isi nominal PnL dengan benar (angka positif)!');
        return;
    }

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dateObj = new Date(dateStr);
    const dayName = days[dateObj.getDay()];
    
    // Compute signed PnL
    const actualPnl = inputOutcome === 'PROFIT' ? pnlInput : -pnlInput;

    if (editId) {
        // Edit Mode
        const index = appState.trades.findIndex(t => t.id === editId);
        if (index !== -1) {
            // Recalculate current capital by removing old PnL and adding new PnL
            appState.currentCapital = appState.currentCapital - appState.trades[index].actualPnl + actualPnl;
            
            // Update trade object
            appState.trades[index].date = dateStr;
            appState.trades[index].day = dayName;
            appState.trades[index].capitalAllocated = capital;
            appState.trades[index].actualPnl = actualPnl;
            appState.trades[index].actualPnlPercent = (actualPnl / capital) * 100;
            appState.trades[index].emotion = emotion;
            appState.trades[index].notes = notes;
            
            alert('Laporan harian berhasil diperbarui!');
            cancelEditMode();
        }
    } else {
        // Create new daily log entry
        const log = {
            id: 'log_' + Date.now(),
            pair: 'XAUUSD',
            date: dateStr,
            day: dayName,
            capitalAllocated: capital,
            actualPnl: actualPnl,
            actualPnlPercent: (actualPnl / capital) * 100,
            emotion: emotion,
            notes: notes,
            status: 'CLOSED'
        };

        appState.trades.unshift(log);
        appState.currentCapital += actualPnl;
        
        alert('Laporan harian berhasil disimpan!');
        resetWizard();
    }

    saveData();
    renderAll();

    // Switch to Journal tab
    const journalMenu = document.querySelector('.menu-item[data-tab="journal"]');
    if (journalMenu) journalMenu.click();
}

// Edit Mode Initiator (Pulls data to form)
function editJournalRecord(id) {
    const trade = appState.trades.find(t => t.id === id);
    if (!trade) return;

    // Fill form fields
    document.getElementById('plan-edit-id').value = trade.id;
    document.getElementById('plan-date').value = trade.date;
    document.getElementById('plan-capital').value = Math.round(trade.capitalAllocated);
    document.getElementById('plan-pnl-calc').value = Math.abs(trade.actualPnl);
    document.getElementById('plan-emotion').value = trade.emotion;
    document.getElementById('plan-notes').value = trade.notes;

    // Toggle outcomes
    const profitBtn = document.querySelector('.btn-input-outcome.profit');
    const lossBtn = document.querySelector('.btn-input-outcome.loss');

    if (trade.actualPnl >= 0) {
        inputOutcome = 'PROFIT';
        profitBtn.style.backgroundColor = 'rgba(16, 185, 129, 0.12)';
        profitBtn.style.borderColor = 'var(--success-green)';
        profitBtn.style.color = 'var(--success-green)';
        
        lossBtn.style.backgroundColor = 'rgba(5, 9, 16, 0.5)';
        lossBtn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        lossBtn.style.color = 'var(--text-muted)';
    } else {
        inputOutcome = 'LOSS';
        lossBtn.style.backgroundColor = 'rgba(244, 63, 94, 0.12)';
        lossBtn.style.borderColor = 'var(--error-red)';
        lossBtn.style.color = 'var(--error-red)';
        
        profitBtn.style.backgroundColor = 'rgba(5, 9, 16, 0.5)';
        profitBtn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        profitBtn.style.color = 'var(--text-muted)';
    }

    // Update Form headers & buttons
    document.getElementById('planner-form-title').innerHTML = '<i class="fa-solid fa-pen-to-square text-gold"></i> Edit Laporan Harian';
    document.getElementById('planner-form-subtitle').innerText = 'Perbaiki kesalahan input laporan harian Anda di bawah ini.';
    document.getElementById('btn-save-plan').innerHTML = '<i class="fa-solid fa-circle-check"></i> Simpan Perubahan';
    document.getElementById('btn-cancel-edit').style.display = 'inline-block';

    // Switch views
    const inputHarianMenu = document.querySelector('.menu-item[data-tab="wizard"]');
    if (inputHarianMenu) inputHarianMenu.click();
}

// Cancel editing and restore form state
function cancelEditMode() {
    resetWizard();
}

// Journal Tab & Filtration
function setupJournalListeners() {
    const filters = ['filter-pair', 'filter-outcome', 'filter-day'];
    filters.forEach(id => {
        document.getElementById(id).addEventListener('change', renderJournal);
    });

    document.getElementById('btn-reset-filters').addEventListener('click', () => {
        document.getElementById('filter-pair').value = 'ALL';
        document.getElementById('filter-outcome').value = 'ALL';
        document.getElementById('filter-day').value = 'ALL';
        renderJournal();
    });
}

function renderJournal() {
    const tbody = document.getElementById('journal-tbody');
    tbody.innerHTML = '';

    const filterOutcome = document.getElementById('filter-outcome').value;
    const filterDay = document.getElementById('filter-day').value;

    let filteredTrades = appState.trades.filter(t => t.status === 'CLOSED');

    if (filterOutcome !== 'ALL') {
        if (filterOutcome === 'PROFIT') {
            filteredTrades = filteredTrades.filter(t => t.actualPnl > 5);
        } else if (filterOutcome === 'LOSS') {
            filteredTrades = filteredTrades.filter(t => t.actualPnl < -5);
        } else if (filterOutcome === 'BREAKEVEN') {
            filteredTrades = filteredTrades.filter(t => Math.abs(t.actualPnl) <= 5);
        }
    }

    if (filterDay !== 'ALL') {
        filteredTrades = filteredTrades.filter(t => t.day === filterDay);
    }

    if (filteredTrades.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    Tidak ditemukan data laporan PnL yang sesuai dengan filter Anda.
                </td>
            </tr>
        `;
        return;
    }

    filteredTrades.forEach(trade => {
        const row = document.createElement('tr');
        
        const dateFormatted = new Date(trade.date).toLocaleDateString('id-ID');
        const indDay = DAY_NAMES_ID[trade.day] || trade.day;
        const pnlClass = trade.actualPnl > 5 ? 'pos-pnl' : (trade.actualPnl < -5 ? 'neg-pnl' : '');
        const pnlSign = trade.actualPnl > 5 ? '+' : '';
        
        let outcomeBadge = '<span class="outcome-badge breakeven">Breakeven</span>';
        if (trade.actualPnl > 5) {
            outcomeBadge = '<span class="outcome-badge win">WIN</span>';
        } else if (trade.actualPnl < -5) {
            outcomeBadge = '<span class="outcome-badge loss">LOSS</span>';
        }

        const emotionsMap = {
            Disciplined: 'Disiplin',
            Greedy: 'Serakah (FOMO)',
            Fearful: 'Takut',
            Patient: 'Sabar',
            Revenge: 'Balas Dendam'
        };
        const indEmotion = emotionsMap[trade.emotion] || trade.emotion || 'Netral';

        row.innerHTML = `
            <td>
                <div class="t-date-col">
                    <span>${dateFormatted}</span>
                    <span class="t-day">${indDay}</span>
                </div>
            </td>
            <td><strong>${trade.pair}</strong></td>
            <td class="t-pnl-cell ${pnlClass}">
                <strong>${pnlSign}Rp ${Math.round(Math.abs(trade.actualPnl)).toLocaleString('id-ID')}</strong><br>
                <span class="helper-text ${pnlClass}">${pnlSign}${trade.actualPnlPercent.toFixed(2)}%</span>
            </td>
            <td>${outcomeBadge}</td>
            <td>
                <span class="emotion-tag">${indEmotion}</span>
                <div class="td-notes" title="${trade.notes || ''}">
                    ${trade.notes || '-'}
                </div>
            </td>
            <td>
                <button class="btn-icon-gold" onclick="editJournalRecord('${trade.id}')" title="Edit laporan harian" style="background: none; border: none; color: var(--gold-primary); cursor: pointer; font-size: 14px; margin-right: 12px;">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="btn-icon-danger" onclick="deleteJournalRecord('${trade.id}')" title="Hapus laporan harian" style="background: none; border: none; color: var(--error-red); cursor: pointer; font-size: 14px;">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function deleteJournalRecord(id) {
    if (confirm('Hapus laporan transaksi harian ini? Saldo modal Anda akan dikurangi/ditambah kembali secara otomatis.')) {
        const index = appState.trades.findIndex(t => t.id === id);
        if (index !== -1) {
            // Reverse the PnL effect from capital
            appState.currentCapital -= appState.trades[index].actualPnl;
            
            appState.trades.splice(index, 1);
            saveData();
            renderAll();
        }
    }
}

// Config / Settings View
function setupSettingsListeners() {
    // Initial Setup Capital form submission
    document.getElementById('config-capital-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const initial = parseFloat(document.getElementById('settings-initial-capital').value);
        const current = parseFloat(document.getElementById('settings-current-capital').value);

        if (isNaN(initial) || initial <= 0 || isNaN(current) || current <= 0) {
            alert('Masukkan nilai modal yang valid!');
            return;
        }

        appState.initialCapital = initial;
        appState.currentCapital = current;
        saveData();
        renderAll();
        alert('Konfigurasi modal berhasil disimpan.');
    });

    // Backup controls
    document.getElementById('btn-export-data').addEventListener('click', exportDataToJson);
    
    const triggerBtn = document.getElementById('btn-trigger-import');
    const fileInput = document.getElementById('import-file-input');
    
    triggerBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', importDataFromJson);

    document.getElementById('btn-load-mock-data').addEventListener('click', () => {
        if (confirm('Muat data demonstrasi (mock)? Ini akan mengganti seluruh data Anda saat ini.')) {
            loadMockDataEngine();
        }
    });

    document.getElementById('btn-clear-all-data').addEventListener('click', () => {
        if (confirm('PERINGATAN! Ini akan menghapus seluruh data capital dan jurnal Anda selamanya. Lanjutkan?')) {
            localStorage.removeItem('prince_artha_trading_state');
            appState = {
                initialCapital: 150000000.00,
                currentCapital: 150000000.00,
                trades: []
            };
            renderAll();
            alert('Semua data berhasil dibersihkan.');
        }
    });
}

// Render Dashboard View Statistics
function renderDashboardStats() {
    const closedTrades = appState.trades.filter(t => t.status === 'CLOSED');
    
    // Net PnL sum
    const totalPnl = closedTrades.reduce((acc, t) => acc + t.actualPnl, 0);
    const pnlPercent = (totalPnl / appState.initialCapital) * 100;
    
    const netPnlEl = document.getElementById('dashboard-net-pnl');
    const netPnlPctEl = document.getElementById('dashboard-net-pnl-percent');
    
    netPnlEl.innerText = `${totalPnl >= 0 ? '' : '-'}Rp ${Math.abs(Math.round(totalPnl)).toLocaleString('id-ID')}`;
    netPnlEl.className = `metric-value ${totalPnl >= 0 ? 'pos-pnl' : 'neg-pnl'}`;
    netPnlPctEl.innerText = `${totalPnl >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}% dari Modal Awal (Rp ${Math.round(appState.initialCapital).toLocaleString('id-ID')})`;
    netPnlPctEl.className = `metric-subtext ${totalPnl >= 0 ? 'pos-pnl' : 'neg-pnl'}`;

    // Win Rate Calculation
    const totalWins = closedTrades.filter(t => t.actualPnl > 5).length;
    const totalClosed = closedTrades.length;
    const winRate = totalClosed > 0 ? Math.round((totalWins / totalClosed) * 100) : 0;
    
    document.getElementById('dashboard-win-rate').innerText = `${winRate}%`;
    document.getElementById('dashboard-win-rate-progress').style.width = `${winRate}%`;

    // Total Trades count
    const xauCount = appState.trades.filter(t => t.pair === 'XAUUSD').length;
    document.getElementById('dashboard-total-trades').innerText = appState.trades.length;
    document.getElementById('dashboard-ratio-split').innerText = `Total Laporan Harian: ${xauCount}`;

    // Profit Factor calculation
    let grossProfit = 0;
    let grossLoss = 0;
    closedTrades.forEach(t => {
        if (t.actualPnl > 0) grossProfit += t.actualPnl;
        else grossLoss += Math.abs(t.actualPnl);
    });
    
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss) : (grossProfit > 0 ? 99.99 : 0.00);
    document.getElementById('dashboard-profit-factor').innerText = profitFactor.toFixed(2);
    
    let factorDesc = 'Belum ada loss';
    if (grossLoss > 0) {
        if (profitFactor >= 2.0) factorDesc = 'Sangat Sehat (Excellent)';
        else if (profitFactor >= 1.0) factorDesc = 'Menguntungkan (Profitable)';
        else factorDesc = 'Kurang Sehat (Unprofitable)';
    }
    document.getElementById('dashboard-factor-desc').innerText = factorDesc;

    // Day of Week Distribution Metrics
    renderDayOfWeekMetrics(closedTrades);

    // Recent 3 Trades rendering
    renderRecentTrades();
}

// Calculate and render Day-of-week performance grid
function renderDayOfWeekMetrics(closedTrades) {
    const container = document.getElementById('day-perf-container');
    container.innerHTML = '';

    const daysList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const indDaysList = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

    // Group P&L by Day
    const dayPnl = { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0 };
    closedTrades.forEach(t => {
        if (dayPnl[t.day] !== undefined) {
            dayPnl[t.day] += t.actualPnl;
        }
    });

    // Check if there's any trade data at all
    const maxVal = Math.max(...Object.values(dayPnl).map(Math.abs), 1000000);
    let hasData = closedTrades.length > 0;

    if (!hasData) {
        container.innerHTML = '<p class="text-center text-muted py-4">Belum ada data trading untuk dianalisis.</p>';
        return;
    }

    daysList.forEach((day, index) => {
        const val = dayPnl[day];
        const pctWidth = Math.min((Math.abs(val) / maxVal) * 100, 100);
        const indName = indDaysList[index];
        const sign = val > 5 ? '+' : '';
        const outcomeClass = val > 5 ? 'profit' : (val < -5 ? 'loss' : '');
        const textClass = val > 5 ? 'pos-pnl' : (val < -5 ? 'neg-pnl' : 'text-muted');

        const row = document.createElement('div');
        row.className = 'day-perf-row';
        row.innerHTML = `
            <span class="day-name">${indName}</span>
            <div class="day-bar-wrapper">
                <div class="day-bar ${outcomeClass}" style="width: ${pctWidth === 0 ? '1' : pctWidth}%"></div>
            </div>
            <span class="day-value ${textClass}">${sign}Rp ${Math.round(val/1000)}k</span>
        `;
        container.appendChild(row);
    });
}

// Render last 3 trades on Dashboard panel
function renderRecentTrades() {
    const container = document.getElementById('recent-trades-container');
    container.innerHTML = '';

    const recent = appState.trades.slice(0, 3);

    if (recent.length === 0) {
        container.innerHTML = '<p class="text-center text-muted py-3">Belum ada laporan harian terdokumentasi.</p>';
        return;
    }

    recent.forEach(trade => {
        const item = document.createElement('div');
        item.className = 'recent-trade-item';
        
        const dateFormatted = new Date(trade.date).toLocaleDateString('id-ID');
        
        let pnlText = '';
        const sign = trade.actualPnl > 5 ? '+' : '';
        const pnlClass = trade.actualPnl > 5 ? 'pos-pnl' : (trade.actualPnl < -5 ? 'neg-pnl' : '');
        pnlText = `
            <span class="rt-pnl-val ${pnlClass}">${sign}Rp ${Math.round(Math.abs(trade.actualPnl)).toLocaleString('id-ID')}</span><br>
            <span class="rt-pnl-percent ${pnlClass}">${sign}${trade.actualPnlPercent.toFixed(2)}%</span>
        `;

        item.innerHTML = `
            <div class="rt-left">
                <div class="rt-icon xau">
                    <i class="fa-solid fa-coins"></i>
                </div>
                <div class="rt-info">
                    <span class="rt-pair">${trade.pair}</span>
                    <div class="rt-date">${dateFormatted}</div>
                </div>
            </div>
            <div class="rt-pnl">
                ${pnlText}
            </div>
        `;
        container.appendChild(item);
    });
}

// Generate the Equity Chart visual curve (in IDR)
function renderEquityChart() {
    const canvas = document.getElementById('equityChart');
    if (!canvas) return;

    // Compile equity values in chronological order
    const closedTrades = appState.trades
        .filter(t => t.status === 'CLOSED')
        .reverse();

    let dataPoints = [appState.initialCapital];
    let labels = ['Awal'];

    let currentSum = appState.initialCapital;
    closedTrades.forEach((t, index) => {
        currentSum += t.actualPnl;
        dataPoints.push(currentSum);
        
        const dateObj = new Date(t.date);
        labels.push(`${DAY_NAMES_ID[t.day] || t.day} ${dateObj.getDate()}/${dateObj.getMonth() + 1}`);
    });

    if (equityChartInstance) {
        equityChartInstance.destroy();
    }

    const ctx = canvas.getContext('2d');
    equityChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Capital Balance (IDR)',
                data: dataPoints,
                borderColor: '#d4af37',
                borderWidth: 2,
                backgroundColor: 'rgba(212, 175, 55, 0.05)',
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#d4af37',
                pointBorderColor: '#050910',
                pointHoverRadius: 6,
                pointRadius: 4
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
                    callbacks: {
                        label: function(context) {
                            return `Capital: Rp ${Math.round(context.raw).toLocaleString('id-ID')}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.04)'
                    },
                    ticks: {
                        color: '#94a3b8',
                        font: {
                            family: 'Montserrat'
                        },
                        callback: function(value) {
                            return 'Rp ' + value.toLocaleString('id-ID');
                        }
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.02)'
                    },
                    ticks: {
                        color: '#94a3b8',
                        font: {
                            family: 'Montserrat'
                        }
                    }
                }
            }
        }
    });
}

// State display sync helper
function updateSidebarBalance() {
    const valueEl = document.getElementById('current-capital-display');
    const growthEl = document.getElementById('pnl-total-percentage');

    const totalClosedPnl = appState.trades
        .filter(t => t.status === 'CLOSED')
        .reduce((acc, t) => acc + t.actualPnl, 0);

    const growthPct = (totalClosedPnl / appState.initialCapital) * 100;

    valueEl.innerText = `Rp ${Math.round(appState.currentCapital).toLocaleString('id-ID')}`;
    
    growthEl.innerText = `${totalClosedPnl >= 0 ? '+' : ''}${growthPct.toFixed(2)}%`;
    growthEl.className = `growth-value ${totalClosedPnl >= 0 ? 'pos' : 'neg'}`;
}

// Master Render trigger
function renderAll() {
    updateSidebarBalance();
    renderDashboardStats();
    renderJournal();
    
    // Render growth planner simulation table
    renderGrowthSimulation();
    
    // Config page setup values
    document.getElementById('settings-initial-capital').value = Math.round(appState.initialCapital);
    document.getElementById('settings-current-capital').value = Math.round(appState.currentCapital);
}

// JSON Data Exporter
function exportDataToJson() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `PrinceArtha_DailyJournal_Backup_${new Date().toISOString().slice(0,10)}.json`);
    dlAnchorElem.click();
}

// JSON Data Importer
function importDataFromJson(e) {
    const fileReader = new FileReader();
    fileReader.onload = function(event) {
        try {
            const parsed = JSON.parse(event.target.result);
            if (parsed.initialCapital && parsed.currentCapital && Array.isArray(parsed.trades)) {
                appState = parsed;
                saveData();
                renderAll();
                alert('Database Jurnal berhasil diimpor!');
            } else {
                alert('Format JSON tidak cocok dengan template database Prince Artha.');
            }
        } catch (err) {
            alert('Gagal parsing file JSON: ' + err.message);
        }
    };
    if (e.target.files[0]) {
        fileReader.readAsText(e.target.files[0]);
    }
}

// Mock Seed Data Generator in IDR for Dashboard Demonstrations (1 Month Compound Growth Demo)
function loadMockDataEngine() {
    const sampleCapital = 150000000.00; // Rp 150.000.000
    
    const mock = {
        initialCapital: sampleCapital,
        currentCapital: 379202860.00, // Resulting balance after 20 compounding trading days
        trades: [
            {
                id: 'mock_20',
                pair: 'XAUUSD',
                date: '2026-07-03',
                day: 'Friday',
                capitalAllocated: 344729860,
                actualPnl: 34473000, // +10%
                actualPnlPercent: 10.0,
                emotion: 'Patient',
                notes: 'Laporan harian: Hari ke-20 selesai! Target pertumbuhan 1 bulan sukses dicapai, saldo akhir grow menakjubkan.',
                status: 'CLOSED'
            },
            {
                id: 'mock_19',
                pair: 'XAUUSD',
                date: '2026-07-02',
                day: 'Thursday',
                capitalAllocated: 351765160,
                actualPnl: -7035300, // -2%
                actualPnlPercent: -2.0,
                emotion: 'Disciplined',
                notes: 'Laporan harian: Loss minor menjelang penutupan sesi London. Resiko terkontrol.',
                status: 'CLOSED'
            },
            {
                id: 'mock_18',
                pair: 'XAUUSD',
                date: '2026-07-01',
                day: 'Wednesday',
                capitalAllocated: 322720360,
                actualPnl: 29044800, // +9%
                actualPnlPercent: 9.0,
                emotion: 'Patient',
                notes: 'Laporan harian: Rilis data USD memberikan dorongan profit buy setup Gold yang sangat kuat.',
                status: 'CLOSED'
            },
            {
                id: 'mock_17',
                pair: 'XAUUSD',
                date: '2026-06-30',
                day: 'Tuesday',
                capitalAllocated: 301607860,
                actualPnl: 21112500, // +7%
                actualPnlPercent: 7.0,
                emotion: 'Disciplined',
                notes: 'Laporan harian: Pemulihan saldo berkat transaksi beli di supply swing.',
                status: 'CLOSED'
            },
            {
                id: 'mock_16',
                pair: 'XAUUSD',
                date: '2026-06-29',
                day: 'Monday',
                capitalAllocated: 304654360,
                actualPnl: -3046500, // -1%
                actualPnlPercent: -1.0,
                emotion: 'Patient',
                notes: 'Laporan harian: Loss kecil akibat volatilitas pembukaan market pagi.',
                status: 'CLOSED'
            },
            {
                id: 'mock_15',
                pair: 'XAUUSD',
                date: '2026-06-26',
                day: 'Friday',
                capitalAllocated: 282087360,
                actualPnl: 22567000, // +8%
                actualPnlPercent: 8.0,
                emotion: 'Disciplined',
                notes: 'Laporan harian: Mengakhiri minggu ketiga dengan total saldo menembus Rp 300 juta.',
                status: 'CLOSED'
            },
            {
                id: 'mock_14',
                pair: 'XAUUSD',
                date: '2026-06-25',
                day: 'Thursday',
                capitalAllocated: 256443060,
                actualPnl: 25644300, // +10%
                actualPnlPercent: 10.0,
                emotion: 'Patient',
                notes: 'Laporan harian: Eksekusi buy sempurna di demand swing H4, pertumbuhan 10% dalam sehari!',
                status: 'CLOSED'
            },
            {
                id: 'mock_13',
                pair: 'XAUUSD',
                date: '2026-06-24',
                day: 'Wednesday',
                capitalAllocated: 261676560,
                actualPnl: -5233500, // -2%
                actualPnlPercent: -2.0,
                emotion: 'Disciplined',
                notes: 'Laporan harian: Menghadapi koreksi pasar global, loss dibatasi ketat.',
                status: 'CLOSED'
            },
            {
                id: 'mock_12',
                pair: 'XAUUSD',
                date: '2026-06-23',
                day: 'Tuesday',
                capitalAllocated: 249215760,
                actualPnl: 12460800, // +5%
                actualPnlPercent: 5.0,
                emotion: 'Patient',
                notes: 'Laporan harian: Target pertumbuhan 5% tercapai di sesi London.',
                status: 'CLOSED'
            },
            {
                id: 'mock_11',
                pair: 'XAUUSD',
                date: '2026-06-22',
                day: 'Monday',
                capitalAllocated: 235109260,
                actualPnl: 14106500, // +6%
                actualPnlPercent: 6.0,
                emotion: 'Disciplined',
                notes: 'Laporan harian: Membuka minggu ketiga dengan profit konsisten.',
                status: 'CLOSED'
            },
            {
                id: 'mock_10',
                pair: 'XAUUSD',
                date: '2026-06-19',
                day: 'Friday',
                capitalAllocated: 217693760,
                actualPnl: 17415500, // +8%
                actualPnlPercent: 8.0,
                emotion: 'Patient',
                notes: 'Laporan harian: Penutupan minggu kedua yang sangat baik dengan profit 8%.',
                status: 'CLOSED'
            },
            {
                id: 'mock_9',
                pair: 'XAUUSD',
                date: '2026-06-18',
                day: 'Thursday',
                capitalAllocated: 224426560,
                actualPnl: -6732800, // -3%
                actualPnlPercent: -3.0,
                emotion: 'Disciplined',
                notes: 'Laporan harian: Koreksi harga emas menyentuh stop loss, membatasi resiko harian.',
                status: 'CLOSED'
            },
            {
                id: 'mock_8',
                pair: 'XAUUSD',
                date: '2026-06-17',
                day: 'Wednesday',
                capitalAllocated: 205895960,
                actualPnl: 18530600, // +9%
                actualPnlPercent: 9.0,
                emotion: 'Patient',
                notes: 'Laporan harian: Profit maksimal dari pergerakan impulsif sesi New York.',
                status: 'CLOSED'
            },
            {
                id: 'mock_7',
                pair: 'XAUUSD',
                date: '2026-06-16',
                day: 'Tuesday',
                capitalAllocated: 192426160,
                actualPnl: 13469800, // +7%
                actualPnlPercent: 7.0,
                emotion: 'Disciplined',
                notes: 'Laporan harian: Buy setup Gold sukses berjalan pasca liquidity sweep Asia.',
                status: 'CLOSED'
            },
            {
                id: 'mock_6',
                pair: 'XAUUSD',
                date: '2026-06-15',
                day: 'Monday',
                capitalAllocated: 194369860,
                actualPnl: -1943700, // -1%
                actualPnlPercent: -1.0,
                emotion: 'Patient',
                notes: 'Laporan harian: Loss minor di hari Senin pembukaan market.',
                status: 'CLOSED'
            },
            {
                id: 'mock_5',
                pair: 'XAUUSD',
                date: '2026-06-12',
                day: 'Friday',
                capitalAllocated: 185114160,
                actualPnl: 9255700, // +5%
                actualPnlPercent: 5.0,
                emotion: 'Disciplined',
                notes: 'Laporan harian: Menutup akhir pekan pertama dengan profit stabil.',
                status: 'CLOSED'
            },
            {
                id: 'mock_4',
                pair: 'XAUUSD',
                date: '2026-06-11',
                day: 'Thursday',
                capitalAllocated: 168285600,
                actualPnl: 16828560, // +10%
                actualPnlPercent: 10.0,
                emotion: 'Patient',
                notes: 'Laporan harian: Momentum kuat Gold di sesi London, recovery penuh dari loss kemarin.',
                status: 'CLOSED'
            },
            {
                id: 'mock_3',
                pair: 'XAUUSD',
                date: '2026-06-10',
                day: 'Wednesday',
                capitalAllocated: 171720000,
                actualPnl: -3434400, // -2%
                actualPnlPercent: -2.0,
                emotion: 'Disciplined',
                notes: 'Laporan harian: Terkena loss minor karena pembalikan arah harga saat rilis berita.',
                status: 'CLOSED'
            },
            {
                id: 'mock_2',
                pair: 'XAUUSD',
                date: '2026-06-09',
                day: 'Tuesday',
                capitalAllocated: 162000000,
                actualPnl: 9720000, // +6%
                actualPnlPercent: 6.0,
                emotion: 'Disciplined',
                notes: 'Laporan harian: Trading disiplin di sesi NY. Profit harian bertambah.',
                status: 'CLOSED'
            },
            {
                id: 'mock_1',
                pair: 'XAUUSD',
                date: '2026-06-08',
                day: 'Monday',
                capitalAllocated: 150000000,
                actualPnl: 12000000, // +8%
                actualPnlPercent: 8.0,
                emotion: 'Patient',
                notes: 'Laporan harian: Hari ke-1 target harian 5-10% tercapai dengan buy setup Gold di support OB H1.',
                status: 'CLOSED'
            }
        ]
    };

    appState = mock;
    saveData();
    renderAll();
    alert('Sukses memuat data demonstrasi 1 Bulan Compound Growth Prince Artha (IDR). Buka Dashboard!');
}

// Local Storage IO Helpers
function saveData() {
    localStorage.setItem('prince_artha_trading_state', JSON.stringify(appState));
}

function loadData() {
    const raw = localStorage.getItem('prince_artha_trading_state');
    if (raw) {
        try {
            appState = JSON.parse(raw);
            // Detect old schema trades containing lot size or pending statuses, and clear for a fresh start
            const hasOldSchema = appState.trades && appState.trades.some(t => t.hasOwnProperty('lotSize') || t.status === 'PENDING' || t.status === 'ACTIVE');
            if (hasOldSchema) {
                console.log("Old schema detected. Resetting database for a clean start.");
                appState = {
                    initialCapital: 150000000.00,
                    currentCapital: 150000000.00,
                    trades: []
                };
                saveData();
            }
        } catch (e) {
            console.error('Error loading data from localStorage, resetting.', e);
        }
    }
}

// Register PWA Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registered successfully.', reg))
            .catch(err => console.log('Service Worker registration failed.', err));
    });
}

// Target Growth Simulator Logic (5% - 10% Compound Growth)
function setupGrowthPlanner() {
    const startCapitalInput = document.getElementById('simulate-capital');
    const growthSlider = document.getElementById('simulate-growth-slider');

    if (startCapitalInput && growthSlider) {
        // Sync starting capital dynamically with current capital balance for ease of use
        startCapitalInput.value = Math.round(appState.currentCapital);

        startCapitalInput.addEventListener('input', renderGrowthSimulation);
        
        // Re-sync with sidebar balance updates if changed
        startCapitalInput.addEventListener('focus', () => {
            if (parseFloat(startCapitalInput.value) === 150000000 && appState.currentCapital !== 150000000) {
                startCapitalInput.value = Math.round(appState.currentCapital);
                renderGrowthSimulation();
            }
        });

        growthSlider.addEventListener('input', renderGrowthSimulation);
    }
}

function renderGrowthSimulation() {
    const startCapitalInput = document.getElementById('simulate-capital');
    const growthSlider = document.getElementById('simulate-growth-slider');
    const rateDisplay = document.getElementById('growth-rate-display');
    const tbody = document.getElementById('growth-simulation-tbody');
    
    if (!startCapitalInput || !growthSlider || !tbody) return;
    
    const startCapital = parseFloat(startCapitalInput.value) || 150000000;
    const growthRate = parseInt(growthSlider.value, 10) || 5;
    
    rateDisplay.innerText = `${growthRate}%`;
    tbody.innerHTML = '';
    
    let currentCapital = startCapital;
    for (let day = 1; day <= 20; day++) {
        const dailyProfit = currentCapital * (growthRate / 100);
        const endingCapital = currentCapital + dailyProfit;
        const totalPctGrowth = ((endingCapital - startCapital) / startCapital) * 100;
        
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid var(--border-dark)';
        
        row.innerHTML = `
            <td style="padding: 10px 16px; font-weight: 600; color: var(--text-light); font-size: 13px;">Hari ke-${day}</td>
            <td style="padding: 10px 16px; color: var(--success-green); font-weight: 600; font-size: 13px;">+Rp ${Math.round(dailyProfit).toLocaleString('id-ID')}</td>
            <td style="padding: 10px 16px; font-weight: 700; color: var(--text-light); font-size: 13px;">Rp ${Math.round(endingCapital).toLocaleString('id-ID')}</td>
            <td style="padding: 10px 16px; color: var(--gold-primary); font-weight: 600; font-size: 13px;">+${totalPctGrowth.toFixed(1)}%</td>
        `;
        tbody.appendChild(row);
        
        currentCapital = endingCapital; // compound
    }
}
