import QRCode from 'qrcode';
import HubApi from '@nimiq/hub-api';

// ==========================================
// CONSTANTS & STATE
// ==========================================
const RPC_ENDPOINT = 'https://rpc.nimiqwatch.com';
const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price?ids=nimiq-2&vs_currencies=usd';

let state = {
    address: localStorage.getItem('korripay_address') || '',
    nimBalance: 0,
    usdRate: 0.00047,
    usdBalance: 0,
    transactions: [],
    historyFilter: 'all', // 'all' | 'sent' | 'received'
    isLoading: false,
    activeTab: 'home',
    sendAmountStr: '0'
};

// Initialize Nimiq Hub API natively
let hubApi = null;
try {
    hubApi = new HubApi('https://hub.nimiq.com');
} catch (err) {
    console.warn('Nimiq HubApi init note:', err);
}

// ==========================================
// SPLASH SCREEN CONTROLLER
// ==========================================
function initSplashScreen() {
    const splash = document.getElementById('splash-screen');
    const progressBar = document.getElementById('splash-progress-bar');
    if (!splash) return;

    setTimeout(() => {
        if (progressBar) progressBar.style.width = '100%';
    }, 100);

    const dismissSplash = () => {
        splash.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => {
            if (splash.parentNode) splash.parentNode.removeChild(splash);
        }, 500);
    };

    setTimeout(dismissSplash, 1100);
    splash.addEventListener('click', dismissSplash);
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function formatNimiqAddress(addr) {
    if (!addr) return '';
    const clean = addr.replace(/\s+/g, '').toUpperCase();
    if (clean.length !== 36) return addr;
    return clean.match(/.{1,4}/g).join(' ');
}

function lunaToNim(luna) {
    return Number(luna) / 100000;
}

function nimToLuna(nim) {
    return Math.round(Number(nim) * 100000);
}

function formatUSD(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount);
}

function formatNIM(amount) {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

function formatDate(timestamp) {
    if (!timestamp) return 'Recently';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + 
           date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#ffc982] text-[#462b00] font-bold text-xs px-4 py-2 rounded-full shadow-2xl animate-fade-in-up border border-white/20';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

// ==========================================
// NATIVE NIMIQ HUB WALLET CONNECTOR
// ==========================================
async function connectNimiqHubWallet() {
    if (hubApi) {
        try {
            const res = await hubApi.chooseAddress({ appName: 'KorriPay' });
            if (res && res.address) {
                setAddress(res.address);
                showToast(`Connected Nimiq Hub: ${formatNimiqAddress(res.address)}`);
            }
        } catch (err) {
            console.warn('Hub chooseAddress note:', err);
            hubApi.login({ appName: 'KorriPay' }).catch(() => {
                showToast('Wallet selection cancelled or closed');
            });
        }
    } else {
        const addr = prompt('Enter your Nimiq address (e.g. NQXX XXXX...):');
        if (addr) setAddress(addr);
    }
}

function setAddress(newAddr) {
    const clean = newAddr.trim();
    if (!clean) return;
    state.address = formatNimiqAddress(clean);
    localStorage.setItem('korripay_address', state.address);
    updateBalanceDisplay();
    refreshAllData();
}

function disconnectWallet() {
    state.address = '';
    state.nimBalance = 0;
    state.usdBalance = 0;
    state.transactions = [];
    localStorage.removeItem('korripay_address');
    updateBalanceDisplay();
    renderTransactions();
    showToast('Nimiq Hub session disconnected.');
}

// ==========================================
// REAL BLOCKCHAIN RPC & API INTEGRATION
// ==========================================
async function fetchExchangeRate() {
    try {
        const response = await fetch(COINGECKO_API);
        if (response.ok) {
            const data = await response.json();
            if (data['nimiq-2'] && data['nimiq-2'].usd) {
                state.usdRate = data['nimiq-2'].usd;
                updateRateDisplay();
            }
        }
    } catch (err) {
        console.warn('CoinGecko API fetch:', err);
    }
}

async function fetchNimiqAccount() {
    if (!state.address) return;
    try {
        const payload = {
            jsonrpc: "2.0",
            method: "getAccountByAddress",
            params: [state.address],
            id: 1
        };

        const response = await fetch(RPC_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const json = await response.json();
            if (json.result && json.result.data) {
                const rawBalance = json.result.data.balance || 0;
                state.nimBalance = lunaToNim(rawBalance);
                state.usdBalance = state.nimBalance * state.usdRate;
                updateBalanceDisplay();
            }
        }
    } catch (err) {
        console.error('Nimiq RPC Account Error:', err);
    }
}

async function fetchNimiqTransactions() {
    if (!state.address) return;
    try {
        const payload = {
            jsonrpc: "2.0",
            method: "getTransactionsByAddress",
            params: [state.address, 25, null],
            id: 1
        };

        const response = await fetch(RPC_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const json = await response.json();
            if (json.result && Array.isArray(json.result.data)) {
                state.transactions = json.result.data;
                renderTransactions();
            }
        }
    } catch (err) {
        console.error('Nimiq RPC Transactions Error:', err);
    }
}

async function refreshAllData() {
    state.isLoading = true;
    await Promise.all([
        fetchExchangeRate(),
        fetchNimiqAccount(),
        fetchNimiqTransactions()
    ]);
    state.isLoading = false;
}

// ==========================================
// UI RENDERERS
// ==========================================
function updateRateDisplay() {
    const rateEl = document.getElementById('display-nim-rate');
    if (rateEl) rateEl.textContent = `$${state.usdRate.toFixed(5)}`;
}

function updateBalanceDisplay() {
    const addrEl = document.getElementById('display-address');
    const nimEl = document.getElementById('display-nim-balance');
    const usdEl = document.getElementById('display-usd-balance');
    const receiveAddrEl = document.getElementById('receive-display-address');
    const sendModalBalance = document.getElementById('send-modal-balance');
    const connectBanner = document.getElementById('wallet-connect-banner');
    const btnConnectLabel = document.getElementById('btn-connect-label');

    // Profile elements
    const profAddr = document.getElementById('profile-address-display');
    const profNet = document.getElementById('profile-net-worth');
    const profHoldings = document.getElementById('profile-nim-holdings');

    if (!state.address) {
        if (addrEl) addrEl.textContent = 'Not Connected';
        if (nimEl) nimEl.textContent = '0.00';
        if (usdEl) usdEl.textContent = '$0.00';
        if (receiveAddrEl) receiveAddrEl.textContent = 'Please connect wallet';
        if (sendModalBalance) sendModalBalance.textContent = '0.00 NIM';
        if (profAddr) profAddr.textContent = 'Not Connected';
        if (profNet) profNet.textContent = '$0.00';
        if (profHoldings) profHoldings.textContent = '0.00 NIM';
        if (connectBanner) connectBanner.classList.remove('hidden');
        if (btnConnectLabel) btnConnectLabel.textContent = 'Connect Hub';
        return;
    }

    if (connectBanner) connectBanner.classList.add('hidden');
    if (btnConnectLabel) btnConnectLabel.textContent = state.address.slice(0, 9) + '...';

    const formattedAddr = formatNimiqAddress(state.address);

    if (addrEl) addrEl.textContent = formattedAddr;
    if (nimEl) nimEl.textContent = formatNIM(state.nimBalance);
    if (usdEl) usdEl.textContent = formatUSD(state.usdBalance);
    if (receiveAddrEl) receiveAddrEl.textContent = formattedAddr;
    if (sendModalBalance) sendModalBalance.textContent = `${formatNIM(state.nimBalance)} NIM`;

    if (profAddr) profAddr.textContent = state.address.slice(0, 9) + '...' + state.address.slice(-6);
    if (profNet) profNet.textContent = formatUSD(state.usdBalance);
    if (profHoldings) profHoldings.textContent = `${formatNIM(state.nimBalance)} NIM`;

    renderReceiveQRCode();
}

function renderTransactions() {
    const container = document.getElementById('activity-list-container');
    const fullContainer = document.getElementById('full-history-list');

    if (!container) return;

    if (!state.address) {
        const emptyHtml = `
            <div class="p-5 glass-card rounded-2xl text-center text-xs text-[#d7c3ae]">
                <span class="material-symbols-outlined text-xl text-[#ffc982] mb-1">link_off</span>
                <p>Connect Nimiq Hub to load mainnet transactions.</p>
            </div>
        `;
        container.innerHTML = emptyHtml;
        if (fullContainer) fullContainer.innerHTML = emptyHtml;
        return;
    }

    if (state.transactions.length === 0) {
        const emptyHtml = `
            <div class="p-5 glass-card rounded-2xl text-center text-xs text-[#d7c3ae]">
                <span class="material-symbols-outlined text-xl text-[#ffc982] mb-1">history</span>
                <p>No mainnet transactions found for address ${state.address.slice(0, 9)}...</p>
            </div>
        `;
        container.innerHTML = emptyHtml;
        if (fullContainer) fullContainer.innerHTML = emptyHtml;
        return;
    }

    const cleanAddress = state.address.replace(/\s+/g, '').toUpperCase();
    let totalVolumeLuna = 0;

    const filteredTxList = state.transactions.filter(tx => {
        const isIncoming = tx.to && tx.to.replace(/\s+/g, '').toUpperCase() === cleanAddress;
        totalVolumeLuna += Number(tx.value || 0);

        if (state.historyFilter === 'sent') return !isIncoming;
        if (state.historyFilter === 'received') return isIncoming;
        return true;
    });

    const totalVolumeNim = lunaToNim(totalVolumeLuna);
    const totalVolumeUsd = totalVolumeNim * state.usdRate;

    const volUsdEl = document.getElementById('history-total-volume-usd');
    const volNimEl = document.getElementById('history-total-volume-nim');
    if (volUsdEl) volUsdEl.textContent = formatUSD(totalVolumeUsd);
    if (volNimEl) volNimEl.textContent = `${formatNIM(totalVolumeNim)} NIM`;

    const renderTxItem = (tx) => {
        const isIncoming = tx.to && tx.to.replace(/\s+/g, '').toUpperCase() === cleanAddress;
        const valNim = lunaToNim(tx.value);
        const iconName = isIncoming ? 'arrow_downward' : 'arrow_upward';
        const colorClass = isIncoming ? 'text-emerald-400' : 'text-amber-400';
        const signStr = isIncoming ? '+' : '-';

        return `
            <div class="flex items-center justify-between p-3.5 glass-card rounded-2xl hover:bg-white/10 transition-all cursor-pointer group">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center border border-white/10 ${colorClass}">
                        <span class="material-symbols-outlined text-base">${iconName}</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-xs font-bold text-white group-hover:text-[#ffc982] transition-colors">
                            ${isIncoming ? 'Received Payment' : 'Sent Payment'}
                        </span>
                        <span class="text-[10px] text-[#d7c3ae]">${formatDate(tx.timestamp)}</span>
                    </div>
                </div>
                <div class="text-right">
                    <span class="block text-xs font-mono font-bold ${colorClass}">
                        ${signStr}${formatNIM(valNim)} NIM
                    </span>
                    <a href="https://albatross.nimiqscan.com/transaction/${tx.hash}" target="_blank" rel="noopener" class="text-[9px] text-white/50 hover:text-[#ffc982] flex items-center justify-end gap-0.5">
                        <span>Block #${tx.blockNumber}</span>
                        <span class="material-symbols-outlined text-[9px]">open_in_new</span>
                    </a>
                </div>
            </div>
        `;
    };

    container.innerHTML = state.transactions.slice(0, 5).map(renderTxItem).join('');

    if (fullContainer) {
        if (filteredTxList.length === 0) {
            fullContainer.innerHTML = `
                <div class="p-5 glass-card rounded-2xl text-center text-xs text-[#d7c3ae]">
                    <p>No ${state.historyFilter} transactions found.</p>
                </div>
            `;
        } else {
            fullContainer.innerHTML = filteredTxList.map(renderTxItem).join('');
        }
    }
}

function setupHistoryFilterButtons() {
    const btnAll = document.getElementById('filter-btn-all');
    const btnSent = document.getElementById('filter-btn-sent');
    const btnRec = document.getElementById('filter-btn-received');

    const updateFilterUI = (activeFilter) => {
        state.historyFilter = activeFilter;
        [btnAll, btnSent, btnRec].forEach(btn => {
            if (!btn) return;
            btn.className = 'px-5 py-2 rounded-full bg-white/10 text-[#d7c3ae] hover:text-white font-semibold text-xs transition-all active:scale-95 border border-white/10';
        });

        if (activeFilter === 'all' && btnAll) {
            btnAll.className = 'px-5 py-2 rounded-full bg-[#f6a623] text-[#462b00] font-bold text-xs transition-all active:scale-95 shadow-md';
        } else if (activeFilter === 'sent' && btnSent) {
            btnSent.className = 'px-5 py-2 rounded-full bg-[#f6a623] text-[#462b00] font-bold text-xs transition-all active:scale-95 shadow-md';
        } else if (activeFilter === 'received' && btnRec) {
            btnRec.className = 'px-5 py-2 rounded-full bg-[#f6a623] text-[#462b00] font-bold text-xs transition-all active:scale-95 shadow-md';
        }

        renderTransactions();
    };

    if (btnAll) btnAll.addEventListener('click', () => updateFilterUI('all'));
    if (btnSent) btnSent.addEventListener('click', () => updateFilterUI('sent'));
    if (btnRec) btnRec.addEventListener('click', () => updateFilterUI('received'));
}

function renderReceiveQRCode() {
    const canvas = document.getElementById('receive-qr-canvas');
    if (!canvas || !state.address) return;
    const uri = `nimiq:${state.address.replace(/\s+/g, '')}`;
    QRCode.toCanvas(canvas, uri, { width: 170, margin: 1 }, (err) => {
        if (err) console.error('QR error:', err);
    });
}

// ==========================================
// SEND PAYMENT & INTERACTIVE NUMPAD
// ==========================================
function setupSendModal() {
    const numpadDisp = document.getElementById('send-numpad-display');
    const sendUsdEq = document.getElementById('send-usd-equivalent');
    const recipientInput = document.getElementById('send-recipient-address');
    const messageInput = document.getElementById('send-message');
    const btnHub = document.getElementById('btn-submit-send-hub');
    const btnToggleQr = document.getElementById('btn-toggle-send-qr');
    const qrContainer = document.getElementById('send-qr-preview-container');
    const qrCanvas = document.getElementById('send-qr-canvas');
    const qrUriText = document.getElementById('send-qr-uri');

    function updateNumpadAmount(char) {
        if (char === '.') {
            if (!state.sendAmountStr.includes('.')) {
                state.sendAmountStr += '.';
            }
        } else {
            if (state.sendAmountStr === '0') {
                state.sendAmountStr = char;
            } else {
                if (state.sendAmountStr.includes('.') && state.sendAmountStr.split('.')[1].length >= 2) return;
                state.sendAmountStr += char;
            }
        }
        renderNumpadAmount();
    }

    function backspaceNumpadAmount() {
        if (state.sendAmountStr.length <= 1) {
            state.sendAmountStr = '0';
        } else {
            state.sendAmountStr = state.sendAmountStr.slice(0, -1);
        }
        renderNumpadAmount();
    }

    function renderNumpadAmount() {
        if (numpadDisp) numpadDisp.textContent = state.sendAmountStr;
        const val = parseFloat(state.sendAmountStr) || 0;
        const usdVal = val * state.usdRate;
        if (sendUsdEq) sendUsdEq.textContent = `≈ ${formatUSD(usdVal)} USD`;
    }

    document.querySelectorAll('.numpad-btn[data-num]').forEach(btn => {
        btn.addEventListener('click', () => {
            const char = btn.getAttribute('data-num');
            updateNumpadAmount(char);
        });
    });

    document.getElementById('btn-numpad-backspace')?.addEventListener('click', backspaceNumpadAmount);

    if (btnHub) {
        btnHub.addEventListener('click', () => {
            const recipient = recipientInput ? recipientInput.value.trim() : '';
            const amount = parseFloat(state.sendAmountStr) || 0;
            const message = messageInput ? messageInput.value.trim() : '';

            if (!recipient) {
                showToast('Please enter a recipient Nimiq address');
                return;
            }

            if (amount <= 0) {
                showToast('Please enter a valid NIM amount using the keypad');
                return;
            }

            const luna = nimToLuna(amount);
            
            if (hubApi) {
                hubApi.checkout({
                    appName: 'KorriPay',
                    recipient: recipient,
                    value: luna,
                    extraData: message
                }).catch(err => {
                    console.warn('Hub Api checkout launch:', err);
                    window.open(`https://hub.nimiq.com/checkout?recipient=${recipient}&value=${luna}&message=${encodeURIComponent(message)}`, '_blank');
                });
            } else {
                window.open(`https://hub.nimiq.com/checkout?recipient=${recipient}&value=${luna}&message=${encodeURIComponent(message)}`, '_blank');
            }
        });
    }

    if (btnToggleQr) {
        btnToggleQr.addEventListener('click', () => {
            if (!qrContainer) return;
            const isHidden = qrContainer.classList.contains('hidden');
            if (isHidden) {
                const recipient = recipientInput ? recipientInput.value.trim() : state.address;
                const amount = parseFloat(state.sendAmountStr) || 0;
                const luna = nimToLuna(amount);
                const uri = `nimiq:${recipient.replace(/\s+/g, '')}${amount > 0 ? `?value=${luna}` : ''}`;
                
                QRCode.toCanvas(qrCanvas, uri, { width: 160, margin: 1 }, (err) => {
                    if (err) console.error('Send QR Error:', err);
                });
                if (qrUriText) qrUriText.textContent = uri;
                qrContainer.classList.remove('hidden');
                qrContainer.classList.add('flex');
            } else {
                qrContainer.classList.add('hidden');
                qrContainer.classList.remove('flex');
            }
        });
    }

    renderNumpadAmount();
}

// ==========================================
// SMART AI INVOICE BUILDER
// ==========================================
function setupInvoiceBuilder() {
    const merchantAddrInput = document.getElementById('invoice-merchant-address');
    const itemsList = document.getElementById('invoice-items-list');
    const btnAddItem = document.getElementById('btn-add-invoice-item');
    const btnGenerate = document.getElementById('btn-generate-invoice-preview');
    const formSection = document.getElementById('invoice-form-section');
    const previewSection = document.getElementById('invoice-preview-section');
    const btnBackEdit = document.getElementById('btn-back-to-edit-invoice');
    const btnPrint = document.getElementById('btn-print-invoice');

    if (merchantAddrInput && state.address) {
        merchantAddrInput.value = state.address;
    }

    function calculateInvoiceTotals() {
        const rows = document.querySelectorAll('.invoice-item-row');
        let totalUsd = 0;
        rows.forEach(row => {
            const usdInput = row.querySelector('.item-usd');
            if (usdInput) {
                totalUsd += parseFloat(usdInput.value) || 0;
            }
        });

        const totalNim = state.usdRate > 0 ? totalUsd / state.usdRate : 0;
        
        const usdDisp = document.getElementById('invoice-total-usd-display');
        const nimDisp = document.getElementById('invoice-total-nim-display');

        if (usdDisp) usdDisp.textContent = formatUSD(totalUsd);
        if (nimDisp) nimDisp.textContent = `≈ ${formatNIM(totalNim)} NIM`;

        return { totalUsd, totalNim };
    }

    if (itemsList) {
        itemsList.addEventListener('input', calculateInvoiceTotals);
        itemsList.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.btn-remove-item');
            if (deleteBtn) {
                const row = deleteBtn.closest('.invoice-item-row');
                if (row && document.querySelectorAll('.invoice-item-row').length > 1) {
                    row.remove();
                    calculateInvoiceTotals();
                } else {
                    showToast('At least one line item is required');
                }
            }
        });
    }

    if (btnAddItem) {
        btnAddItem.addEventListener('click', () => {
            const newRow = document.createElement('div');
            newRow.className = 'grid grid-cols-12 gap-2 items-center invoice-item-row';
            newRow.innerHTML = `
                <input type="text" placeholder="Service description" value="Software Service" class="col-span-6 bg-black/50 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white item-desc focus:border-[#ffc982] focus:outline-none"/>
                <input type="number" step="0.01" placeholder="USD" value="50.00" class="col-span-5 bg-black/50 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono item-usd focus:border-[#ffc982] focus:outline-none"/>
                <button class="col-span-1 text-red-400 hover:text-red-300 btn-remove-item flex items-center justify-center">
                    <span class="material-symbols-outlined text-sm">delete</span>
                </button>
            `;
            itemsList.appendChild(newRow);
            calculateInvoiceTotals();
        });
    }

    if (btnGenerate) {
        btnGenerate.addEventListener('click', () => {
            const num = (document.getElementById('invoice-num')?.value || 'INV-2026-001').trim();
            const client = (document.getElementById('invoice-client')?.value || 'Client').trim();
            const merchantAddr = (document.getElementById('invoice-merchant-address')?.value || state.address).trim();
            
            if (!merchantAddr) {
                showToast('Merchant Nimiq address is required');
                return;
            }

            const { totalUsd, totalNim } = calculateInvoiceTotals();

            document.getElementById('prev-inv-num').textContent = num;
            document.getElementById('prev-inv-client').textContent = client;
            document.getElementById('prev-inv-merchant-addr').textContent = formatNimiqAddress(merchantAddr);
            document.getElementById('prev-inv-date').textContent = new Date().toLocaleDateString();
            document.getElementById('prev-inv-total-usd').textContent = formatUSD(totalUsd);
            document.getElementById('prev-inv-total-nim').textContent = `${formatNIM(totalNim)} NIM`;

            const tbody = document.getElementById('prev-inv-items-body');
            if (tbody) {
                const rows = document.querySelectorAll('.invoice-item-row');
                tbody.innerHTML = Array.from(rows).map(row => {
                    const desc = row.querySelector('.item-desc')?.value || 'Item';
                    const usd = parseFloat(row.querySelector('.item-usd')?.value || 0);
                    const nim = state.usdRate > 0 ? usd / state.usdRate : 0;
                    return `
                        <tr>
                            <td class="py-1.5 font-medium text-gray-800">${desc}</td>
                            <td class="py-1.5 text-right font-mono text-gray-700">${formatUSD(usd)}</td>
                            <td class="py-1.5 text-right font-mono font-bold text-amber-600">${formatNIM(nim)} NIM</td>
                        </tr>
                    `;
                }).join('');
            }

            const qrCanvas = document.getElementById('invoice-qr-canvas');
            if (qrCanvas) {
                const luna = nimToLuna(totalNim);
                const paymentUri = `nimiq:${merchantAddr.replace(/\s+/g, '')}?value=${luna}&message=${encodeURIComponent(`Invoice ${num}`)}`;
                QRCode.toCanvas(qrCanvas, paymentUri, { width: 100, margin: 0 });
            }

            formSection.classList.add('hidden');
            previewSection.classList.remove('hidden');
            previewSection.classList.add('flex');
        });
    }

    if (btnBackEdit) {
        btnBackEdit.addEventListener('click', () => {
            previewSection.classList.add('hidden');
            previewSection.classList.remove('flex');
            formSection.classList.remove('hidden');
        });
    }

    if (btnPrint) {
        btnPrint.addEventListener('click', () => {
            window.print();
        });
    }

    calculateInvoiceTotals();
}

// ==========================================
// NAVIGATION CONTROLLER
// ==========================================
function setupNavigation() {
    const tabs = {
        'home': document.getElementById('tab-content-home'),
        'history': document.getElementById('tab-content-history'),
        'profile': document.getElementById('tab-content-profile')
    };

    const navBtnsMobile = {
        'home': document.getElementById('nav-btn-home'),
        'pay': document.getElementById('nav-btn-pay'),
        'invoice': document.getElementById('nav-btn-invoice'),
        'history': document.getElementById('nav-btn-history'),
        'profile': document.getElementById('nav-btn-profile')
    };

    function switchTab(target) {
        if (target === 'pay') {
            openModal('modal-send');
            return;
        }

        if (target === 'invoice') {
            openModal('modal-invoice-builder');
            return;
        }

        state.activeTab = target;

        Object.keys(tabs).forEach(key => {
            if (tabs[key]) {
                if (key === target) {
                    tabs[key].classList.remove('hidden');
                    tabs[key].classList.add('flex');
                } else {
                    tabs[key].classList.add('hidden');
                    tabs[key].classList.remove('flex');
                }
            }
        });

        Object.keys(navBtnsMobile).forEach(key => {
            if (navBtnsMobile[key]) {
                if (key === target) {
                    navBtnsMobile[key].classList.add('text-[#ffc982]', 'font-bold', 'scale-105');
                    navBtnsMobile[key].classList.remove('opacity-60', 'text-[#d7c3ae]');
                } else {
                    navBtnsMobile[key].classList.remove('text-[#ffc982]', 'font-bold', 'scale-105');
                    navBtnsMobile[key].classList.add('opacity-60', 'text-[#d7c3ae]');
                }
            }
        });
    }

    Object.keys(navBtnsMobile).forEach(key => {
        if (navBtnsMobile[key]) {
            navBtnsMobile[key].addEventListener('click', () => switchTab(key));
        }
    });

    document.getElementById('btn-view-all-history')?.addEventListener('click', () => switchTab('history'));
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function setupModalTriggers() {
    document.getElementById('btn-connect-hub')?.addEventListener('click', connectNimiqHubWallet);
    document.getElementById('btn-banner-connect')?.addEventListener('click', connectNimiqHubWallet);

    document.getElementById('btn-open-send')?.addEventListener('click', () => openModal('modal-send'));
    document.getElementById('btn-open-receive')?.addEventListener('click', () => openModal('modal-receive'));
    document.getElementById('btn-open-invoice-builder')?.addEventListener('click', () => openModal('modal-invoice-builder'));
    document.getElementById('btn-open-invoice-builder-2')?.addEventListener('click', () => openModal('modal-invoice-builder'));
    document.getElementById('btn-open-qr-scanner')?.addEventListener('click', () => openModal('modal-send'));

    document.getElementById('btn-close-send')?.addEventListener('click', () => closeModal('modal-send'));
    document.getElementById('btn-close-receive')?.addEventListener('click', () => closeModal('modal-receive'));
    document.getElementById('btn-close-invoice')?.addEventListener('click', () => closeModal('modal-invoice-builder'));

    const doCopy = () => {
        if (!state.address) {
            showToast('Please connect your Nimiq Hub wallet first');
            return;
        }
        navigator.clipboard.writeText(state.address.replace(/\s+/g, ''));
        showToast('Nimiq address copied to clipboard!');
    };

    document.getElementById('btn-copy-address')?.addEventListener('click', doCopy);
    document.getElementById('btn-copy-receive-address')?.addEventListener('click', doCopy);
    document.getElementById('btn-profile-copy-addr')?.addEventListener('click', doCopy);

    const openExplorer = () => {
        if (!state.address) {
            window.open('https://albatross.nimiqscan.com', '_blank');
            return;
        }
        window.open(`https://albatross.nimiqscan.com/account/${state.address.replace(/\s+/g, '')}`, '_blank');
    };

    document.getElementById('btn-explorer-link')?.addEventListener('click', openExplorer);
    document.getElementById('btn-profile-support')?.addEventListener('click', openExplorer);

    document.getElementById('btn-profile-logout')?.addEventListener('click', disconnectWallet);

    document.getElementById('btn-notifications')?.addEventListener('click', () => {
        showToast('Connected to Nimiq Mainnet via RPC node.');
    });
}

// ==========================================
// BOOTSTRAP APP
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    initSplashScreen();
    setupNavigation();
    setupModalTriggers();
    setupSendModal();
    setupInvoiceBuilder();
    setupHistoryFilterButtons();
    
    updateBalanceDisplay();
    if (state.address) {
        refreshAllData();
    } else {
        fetchExchangeRate();
    }
});
