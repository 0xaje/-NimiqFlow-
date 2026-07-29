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

// Initialize Nimiq Hub API
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
    }, 150);

    const dismissSplash = () => {
        splash.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => {
            if (splash.parentNode) splash.parentNode.removeChild(splash);
        }, 700);
    };

    setTimeout(dismissSplash, 1500);
    splash.addEventListener('click', dismissSplash);
}

// ==========================================
// HERO CARD 3D TILT EFFECT
// ==========================================
function initHeroTilt() {
    const hero = document.getElementById('hero-balance-card');
    if (!hero) return;

    hero.addEventListener('mousemove', (e) => {
        const rect = hero.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const moveX = (x - centerX) / 25;
        const moveY = (y - centerY) / 25;
        hero.style.transform = `perspective(1000px) rotateY(${moveX}deg) rotateX(${-moveY}deg)`;
    });

    hero.addEventListener('mouseleave', () => {
        hero.style.transform = `perspective(1000px) rotateY(0deg) rotateX(0deg)`;
        hero.style.transition = 'transform 0.5s ease';
    });

    hero.addEventListener('mouseenter', () => {
        hero.style.transition = 'none';
    });
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
// WALLET PROVIDER CONNECTORS & LOGOUT
// ==========================================
async function connectNimiqWallet() {
    if (hubApi) {
        try {
            const res = await hubApi.chooseAddress({ appName: 'KorriPay' });
            if (res && res.address) {
                setAddress(res.address);
                showToast(`Connected Nimiq wallet: ${formatNimiqAddress(res.address)}`);
            }
        } catch (err) {
            console.warn('Hub chooseAddress note:', err);
            hubApi.login({ appName: 'KorriPay' }).catch(() => {
                showToast('Wallet selection cancelled or closed');
            });
        }
    } else {
        openModal('tab-content-profile');
    }
}

async function connectMetaMask() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            if (accounts && accounts[0]) {
                showToast(`MetaMask connected: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`);
                const addr = prompt('MetaMask connected! Enter your Nimiq payout address:');
                if (addr) setAddress(addr);
            }
        } catch (err) {
            showToast('MetaMask connection rejected');
        }
    } else {
        showToast('MetaMask extension not found in browser');
    }
}

async function connectPhantom() {
    if (typeof window.solana !== 'undefined' && window.solana.isPhantom) {
        try {
            const res = await window.solana.connect();
            if (res && res.publicKey) {
                const pubKey = res.publicKey.toString();
                showToast(`Phantom connected: ${pubKey.slice(0, 6)}...${pubKey.slice(-4)}`);
                const addr = prompt('Phantom connected! Enter your Nimiq payout address:');
                if (addr) setAddress(addr);
            }
        } catch (err) {
            showToast('Phantom connection rejected');
        }
    } else {
        showToast('Phantom wallet extension not found in browser');
    }
}

function setupWalletConnectModal() {
    const btnClose = document.getElementById('btn-close-wallet-modal');
    const btnConfirm = document.getElementById('btn-confirm-wallet-connect');

    if (btnClose) {
        btnClose.addEventListener('click', () => closeModal('modal-wallet-connect'));
    }

    if (btnConfirm) {
        btnConfirm.addEventListener('click', async () => {
            const selected = document.querySelector('input[name="wallet-provider"]:checked')?.value;
            closeModal('modal-wallet-connect');

            if (selected === 'nimiq') {
                await connectNimiqWallet();
            } else if (selected === 'metamask') {
                await connectMetaMask();
            } else if (selected === 'phantom') {
                await connectPhantom();
            } else if (selected === 'manual') {
                const addr = prompt('Enter your Nimiq address (e.g. NQXX XXXX...):');
                if (addr) setAddress(addr);
            }
        });
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
    showToast('Wallet disconnected successfully.');
}

// ==========================================
// REAL BLOCKCHAIN & API INTEGRATION
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
    const refreshBtn = document.getElementById('btn-refresh-data');
    if (refreshBtn) refreshBtn.classList.add('opacity-50', 'pointer-events-none');
    
    await Promise.all([
        fetchExchangeRate(),
        fetchNimiqAccount(),
        fetchNimiqTransactions()
    ]);

    state.isLoading = false;
    if (refreshBtn) refreshBtn.classList.remove('opacity-50', 'pointer-events-none');
}

// ==========================================
// UI RENDERERS
// ==========================================
function updateRateDisplay() {
    const rateEl = document.getElementById('display-nim-rate');
    const showcaseRate = document.getElementById('showcase-rate');
    const formatted = `$${state.usdRate.toFixed(5)}`;
    if (rateEl) rateEl.textContent = formatted;
    if (showcaseRate) showcaseRate.textContent = formatted;
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
        if (btnConnectLabel) btnConnectLabel.textContent = 'Connect Wallet';
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
            <div class="p-6 glass-card rounded-2xl text-center text-xs text-[#d7c3ae]">
                <span class="material-symbols-outlined text-2xl text-[#ffc982] mb-1">link_off</span>
                <p>Connect your Nimiq address to load live mainnet transactions.</p>
            </div>
        `;
        container.innerHTML = emptyHtml;
        if (fullContainer) fullContainer.innerHTML = emptyHtml;
        return;
    }

    if (state.transactions.length === 0) {
        const emptyHtml = `
            <div class="p-6 glass-card rounded-2xl text-center text-xs text-[#d7c3ae]">
                <span class="material-symbols-outlined text-2xl text-[#ffc982] mb-1">history</span>
                <p>No transactions recorded on mainnet for address ${state.address.slice(0, 9)}...</p>
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
            <div class="flex items-center justify-between p-4 glass-card rounded-2xl hover:bg-white/10 transition-all cursor-pointer group">
                <div class="flex items-center gap-3.5">
                    <div class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 ${colorClass}">
                        <span class="material-symbols-outlined text-lg">${iconName}</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-xs font-bold text-white group-hover:text-[#ffc982] transition-colors">
                            ${isIncoming ? 'Received Payment' : 'Sent Payment'}
                        </span>
                        <span class="text-[11px] text-[#d7c3ae]">${formatDate(tx.timestamp)}</span>
                    </div>
                </div>
                <div class="text-right">
                    <span class="block text-xs font-mono font-bold ${colorClass}">
                        ${signStr}${formatNIM(valNim)} NIM
                    </span>
                    <a href="https://albatross.nimiqscan.com/transaction/${tx.hash}" target="_blank" rel="noopener" class="text-[10px] text-white/50 hover:text-[#ffc982] flex items-center justify-end gap-0.5">
                        <span>Block #${tx.blockNumber}</span>
                        <span class="material-symbols-outlined text-[10px]">open_in_new</span>
                    </a>
                </div>
            </div>
        `;
    };

    container.innerHTML = state.transactions.slice(0, 5).map(renderTxItem).join('');

    if (fullContainer) {
        if (filteredTxList.length === 0) {
            fullContainer.innerHTML = `
                <div class="p-6 glass-card rounded-2xl text-center text-xs text-[#d7c3ae]">
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
            btn.className = 'px-6 py-2.5 rounded-full bg-white/10 text-[#d7c3ae] hover:text-white font-semibold text-xs transition-all active:scale-95 border border-white/10';
        });

        if (activeFilter === 'all' && btnAll) {
            btnAll.className = 'px-6 py-2.5 rounded-full bg-[#f6a623] text-[#462b00] font-bold text-xs transition-all active:scale-95 shadow-md';
        } else if (activeFilter === 'sent' && btnSent) {
            btnSent.className = 'px-6 py-2.5 rounded-full bg-[#f6a623] text-[#462b00] font-bold text-xs transition-all active:scale-95 shadow-md';
        } else if (activeFilter === 'received' && btnRec) {
            btnRec.className = 'px-6 py-2.5 rounded-full bg-[#f6a623] text-[#462b00] font-bold text-xs transition-all active:scale-95 shadow-md';
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
    QRCode.toCanvas(canvas, uri, { width: 180, margin: 1 }, (err) => {
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
// WEBGL SHADER BACKGROUND ANIMATION
// ==========================================
function initShaderCanvas() {
    const canvas = document.getElementById('shader-canvas');
    if (!canvas) return;

    function resizeCanvas() {
        const width = canvas.parentElement ? canvas.parentElement.clientWidth : 300;
        const height = canvas.parentElement ? canvas.parentElement.clientHeight : 200;
        canvas.width = width;
        canvas.height = height;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return;

    const vs = `
        attribute vec2 a_position;
        varying vec2 v_texCoord;
        void main() {
            v_texCoord = a_position * 0.5 + 0.5;
            gl_Position = vec4(a_position, 0.0, 1.0);
        }
    `;

    const fs = `
        precision highp float;
        varying vec2 v_texCoord;
        uniform float u_time;
        
        void main() {
            vec2 uv = v_texCoord;
            float dist = distance(uv, vec2(0.5));
            float ring = sin(dist * 18.0 - u_time * 3.0);
            ring = step(0.94, ring);
            
            vec3 color = vec3(1.0, 0.78, 0.51);
            float alpha = ring * (1.0 - dist * 1.4) * 0.45;
            
            gl_FragColor = vec4(color, alpha);
        }
    `;

    function compileShader(type, src) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, src);
        gl.compileShader(shader);
        return shader;
    }

    const program = gl.createProgram();
    gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vs));
    gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, 'u_time');

    function renderFrame(time) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        if (uTime) gl.uniform1f(uTime, time * 0.001);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(renderFrame);
    }
    requestAnimationFrame(renderFrame);
}

// ==========================================
// NAVIGATION & UNIFIED CONTROLLERS
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

    const navBtnsDesktop = {
        'home': document.getElementById('desktop-nav-home'),
        'pay': document.getElementById('desktop-nav-pay'),
        'invoice': document.getElementById('desktop-nav-invoice'),
        'history': document.getElementById('desktop-nav-history'),
        'profile': document.getElementById('desktop-nav-profile')
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

        // Mobile Nav UI
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

        // Desktop Nav UI
        Object.keys(navBtnsDesktop).forEach(key => {
            if (navBtnsDesktop[key]) {
                if (key === target) {
                    navBtnsDesktop[key].className = 'desktop-nav-btn px-5 py-2 rounded-full text-xs font-bold text-[#ffc982] bg-[#f6a623]/15 border border-[#f6a623]/30 transition-all';
                } else {
                    navBtnsDesktop[key].className = 'desktop-nav-btn px-5 py-2 rounded-full text-xs font-semibold text-[#d7c3ae] hover:text-white transition-all';
                }
            }
        });
    }

    Object.keys(navBtnsMobile).forEach(key => {
        if (navBtnsMobile[key]) {
            navBtnsMobile[key].addEventListener('click', () => switchTab(key));
        }
    });

    Object.keys(navBtnsDesktop).forEach(key => {
        if (navBtnsDesktop[key]) {
            navBtnsDesktop[key].addEventListener('click', () => switchTab(key));
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
    const openConnectModal = () => openModal('modal-wallet-connect');

    document.getElementById('btn-connect-hub')?.addEventListener('click', openConnectModal);
    document.getElementById('btn-banner-connect')?.addEventListener('click', openConnectModal);
    document.getElementById('btn-profile-connected-wallets')?.addEventListener('click', openConnectModal);

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
            showToast('Please connect your Nimiq wallet first');
            return;
        }
        navigator.clipboard.writeText(state.address.replace(/\s+/g, ''));
        showToast('Nimiq address copied to clipboard!');
    };

    document.getElementById('btn-copy-address')?.addEventListener('click', doCopy);
    document.getElementById('btn-copy-receive-address')?.addEventListener('click', doCopy);
    document.getElementById('btn-profile-copy-addr')?.addEventListener('click', doCopy);

    document.getElementById('btn-refresh-data')?.addEventListener('click', refreshAllData);

    const btnSaveAddr = document.getElementById('btn-save-custom-address');
    const inputCustomAddr = document.getElementById('input-custom-address');

    if (btnSaveAddr && inputCustomAddr) {
        btnSaveAddr.addEventListener('click', () => {
            const raw = inputCustomAddr.value.trim();
            if (raw) {
                setAddress(raw);
                showToast('Nimiq address updated successfully!');
            }
        });
    }

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

    document.getElementById('btn-profile-notifications')?.addEventListener('click', () => {
        showToast('Connected to Nimiq Mainnet via RPC node.');
    });
}

// ==========================================
// BOOTSTRAP APP
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    initSplashScreen();
    initHeroTilt();
    initShaderCanvas();
    setupNavigation();
    setupModalTriggers();
    setupWalletConnectModal();
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
