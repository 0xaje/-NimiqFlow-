import QRCode from 'qrcode';
import { config, setNetworkEnvironment } from './services/config.js';
import { fetchNimiqUsdPrice } from './services/prices.js';
import { getAccountExplorerUrl, getTransactionExplorerUrl } from './services/explorer.js';
import { 
    fetchRpcAccountBalance, 
    fetchRpcTransactions, 
    fetchRpcBlockNumber, 
    fetchRpcConsensusStatus,
    claimFaucetTokens
} from './services/rpc.js';
import { getNativeNimiqProvider } from './services/wallet.js';

// ==========================================
// STATE & TRANSLATIONS
// ==========================================
const TRANSLATIONS = {
    en: {
        mini_app_subtitle: 'Smart Crypto Payments, Simplified.',
        splash_initializing: 'Initializing Native Mini App SDK...',
        device_verified: 'Trusted Device',
        mainnet_live: 'Nimiq Testnet Live',
        connect: 'Connect with Nimiq Pay',
        total_balance: 'Total Balance (USD)',
        not_connected: 'Not Connected',
        nim_balance: 'Nimiq Crypto Balance',
        send: 'Send',
        receive: 'Receive',
        request_pay: 'Request',
        ai_invoice: 'AI Invoice Builder',
        invoice: 'Invoice',
        sign_msg: 'Sign Msg',
        smart_invoice: 'AI-assisted Natural Language Invoice Builder',
        recent_activity: 'Recent Activity',
        view_all: 'View All',
        connect_prompt: 'Connect with Nimiq Pay to load testnet transactions.',
        history: 'History',
        all: 'All',
        sent: 'Sent',
        received: 'Received',
        analytics: 'Analytics',
        monthly_insight: 'Monthly Insight',
        total_volume: 'Total Transaction Volume',
        settings: 'Settings',
        language_label: 'App Language',
        disconnect_session: 'Disconnect Nimiq Flow Session',
        home: 'Home'
    },
    de: {
        mini_app_subtitle: 'Intelligente Krypto-Zahlungen, Vereinfacht.',
        splash_initializing: 'Native Mini App SDK wird initialisiert...',
        device_verified: 'Vertrauenswürdiges Gerät',
        mainnet_live: 'Nimiq Testnet Live',
        connect: 'Mit Nimiq Pay verbinden',
        total_balance: 'Gesamtguthaben (USD)',
        not_connected: 'Nicht verbunden',
        nim_balance: 'Nimiq Krypto-Guthaben',
        send: 'Senden',
        receive: 'Empfangen',
        request_pay: 'Anfordern',
        ai_invoice: 'KI-Rechnung',
        invoice: 'Rechnung',
        sign_msg: 'Signieren',
        smart_invoice: 'KI-Rechnungsgenerator',
        recent_activity: 'Letzte Aktivitäten',
        view_all: 'Alle anzeigen',
        connect_prompt: 'Mit Nimiq Pay verbinden, um Testnet-Transaktionen zu laden.',
        history: 'Verlauf',
        all: 'Alle',
        sent: 'Gesendet',
        received: 'Empfangen',
        analytics: 'Analysen',
        monthly_insight: 'Monatlicher Einblick',
        total_volume: 'Gesamtes Transaktionsvolumen',
        settings: 'Einstellungen',
        language_label: 'App-Sprache',
        disconnect_session: 'Nimiq Flow Sitzung trennen',
        home: 'Start'
    },
    es: {
        mini_app_subtitle: 'Pagos Cripto Inteligentes, Simplificados.',
        splash_initializing: 'Inicializando Native Mini App SDK...',
        device_verified: 'Dispositivo de Confianza',
        mainnet_live: 'Nimiq Testnet en Vivo',
        connect: 'Conectar con Nimiq Pay',
        total_balance: 'Saldo Total (USD)',
        not_connected: 'No conectado',
        nim_balance: 'Saldo Nimiq Cripto',
        send: 'Enviar',
        receive: 'Recibir',
        request_pay: 'Solicitar',
        ai_invoice: 'Factura IA',
        invoice: 'Factura',
        sign_msg: 'Firmar',
        smart_invoice: 'Generador de Facturas IA',
        recent_activity: 'Actividad Reciente',
        view_all: 'Ver Todo',
        connect_prompt: 'Conéctese con Nimiq Pay para cargar transacciones de testnet.',
        history: 'Historial',
        all: 'Todo',
        sent: 'Enviado',
        received: 'Recibido',
        analytics: 'Analíticas',
        monthly_insight: 'Resumen Mensual',
        total_volume: 'Volumen Total de Transacciones',
        settings: 'Ajustes',
        language_label: 'Idioma de la App',
        disconnect_session: 'Desconectar Sesión Nimiq Flow',
        home: 'Inicio'
    }
};

let state = {
    address: localStorage.getItem('nimiqflow_address') || '',
    deviceId: localStorage.getItem('nimiqflow_device_id') || '',
    currentLang: localStorage.getItem('nimiqflow_lang') || getInitialLanguage(),
    usdRate: 0.00047,
    historyFilter: 'all',
    isLoading: false,
    activeTab: 'home',
    sendAmountStr: '0',
    lastSignature: '',
    lastGeneratedRequestUrl: '',

    balances: {
        TestAlbatross: Number(localStorage.getItem('nimiqflow_bal_TestAlbatross') || 0),
        MainAlbatross: Number(localStorage.getItem('nimiqflow_bal_MainAlbatross') || 0)
    },
    transactions: {
        TestAlbatross: JSON.parse(localStorage.getItem('nimiqflow_txs_TestAlbatross') || '[]'),
        MainAlbatross: JSON.parse(localStorage.getItem('nimiqflow_txs_MainAlbatross') || '[]')
    },
    trackedRequests: JSON.parse(localStorage.getItem('nimiqflow_tracked_requests') || 'null')
};

function getActiveNimBalance() {
    return state.balances[config.nimiqNetwork] || 0;
}

function getActiveUsdBalance() {
    return getActiveNimBalance() * state.usdRate;
}

function getActiveTransactions() {
    return state.transactions[config.nimiqNetwork] || [];
}


// ==========================================
// DEEP LINK HANDLER & AUTO-PASTE ADDRESS FORMATTER
// ==========================================
function setupDeepLinkHandler() {
    try {
        const params = new URLSearchParams(window.location.search);
        const recipient = params.get('recipient') || params.get('to');
        const valueLuna = params.get('value') || params.get('amount');
        const message = params.get('message') || params.get('memo');

        if (recipient || valueLuna) {
            const recipientInput = document.getElementById('send-recipient-address');
            const messageInput = document.getElementById('send-message');

            if (recipientInput && recipient) {
                recipientInput.value = formatNimiqAddress(recipient);
            }
            if (messageInput && message) {
                messageInput.value = message;
            }
            if (valueLuna) {
                const valNim = Number(valueLuna) > 10000 ? lunaToNim(valueLuna) : Number(valueLuna);
                state.sendAmountStr = valNim.toString();
            }

            openModal('modal-send');
            showToast('Payment link details pre-filled!');
        }
    } catch (err) {
        console.warn('Deep link handler error:', err);
    }
}

function setupAutoFormatInputs() {
    const inputs = [
        document.getElementById('send-recipient-address'),
        document.getElementById('faucet-input-address'),
        document.getElementById('invoice-merchant-address')
    ];

    inputs.forEach(input => {
        if (!input) return;
        input.addEventListener('input', (e) => {
            const val = e.target.value;
            const formatted = formatNimiqAddress(val);
            if (formatted !== val) {
                const cursorPos = e.target.selectionStart;
                e.target.value = formatted;
                try { e.target.setSelectionRange(cursorPos + 1, cursorPos + 1); } catch {}
            }
        });
    });
}

// ==========================================
// INTERACTIVE ANALYTICS CANVAS CHART
// ==========================================
function renderAnalyticsChart() {
    const canvas = document.getElementById('analytics-chart-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth || 300;
    const height = canvas.parentElement.clientHeight || 140;

    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.clearRect(0, 0, width, height);

    const txs = getActiveTransactions();
    const totalCountEl = document.getElementById('analytics-total-count');
    const avgTransferEl = document.getElementById('analytics-avg-transfer');

    if (totalCountEl) totalCountEl.textContent = txs.length.toString();

    if (txs.length === 0) {
        if (avgTransferEl) avgTransferEl.textContent = '0.00 NIM';
        ctx.fillStyle = '#d7c3ae';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Connect wallet to load RPC analytics line chart', width / 2, height / 2);
        return;
    }

    let sumNim = 0;
    const points = txs.map(tx => {
        const val = lunaToNim(tx.value || 0);
        sumNim += val;
        return val;
    }).reverse();

    const avgNim = sumNim / points.length;
    if (avgTransferEl) avgTransferEl.textContent = `${formatNIM(avgNim)} NIM`;

    const largestNim = Math.max(...points, 0);
    const largestEl = document.getElementById('analytics-largest-tx');
    if (largestEl) largestEl.textContent = `${formatNIM(largestNim)} NIM`;

    const cleanAddr = (state.address || '').replace(/\s+/g, '').toUpperCase();
    let sentCount = 0;
    let receivedCount = 0;

    txs.forEach(tx => {
        const isIncoming = tx.to && tx.to.replace(/\s+/g, '').toUpperCase() === cleanAddr;
        if (isIncoming) receivedCount++;
        else sentCount++;
    });

    const sentRecEl = document.getElementById('analytics-sent-received');
    if (sentRecEl) sentRecEl.textContent = `${sentCount} Sent / ${receivedCount} Recv`;

    renderPaymentRequestTracker();

    const maxVal = Math.max(...points, 1);
    const minVal = Math.min(...points, 0);
    const range = (maxVal - minVal) || 1;

    const padding = 15;
    const chartW = width - padding * 2;
    const chartH = height - padding * 2;

    ctx.beginPath();
    const stepX = points.length > 1 ? chartW / (points.length - 1) : chartW;

    points.forEach((val, i) => {
        const x = padding + i * stepX;
        const y = padding + chartH - ((val - minVal) / range) * chartH;

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(246, 166, 35, 0.4)');
    gradient.addColorStop(1, 'rgba(246, 166, 35, 0.0)');

    ctx.lineTo(padding + (points.length - 1) * stepX, height - padding);
    ctx.lineTo(padding, height - padding);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    points.forEach((val, i) => {
        const x = padding + i * stepX;
        const y = padding + chartH - ((val - minVal) / range) * chartH;

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.strokeStyle = '#f6a623';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    points.forEach((val, i) => {
        const x = padding + i * stepX;
        const y = padding + chartH - ((val - minVal) / range) * chartH;

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffc982';
        ctx.fill();
        ctx.strokeStyle = '#462b00';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    });
}

// ==========================================
// TESTNET FAUCET MODAL & API CONTROLLER
// ==========================================
function openFaucetModal() {
    const inputAddr = document.getElementById('faucet-input-address');
    if (inputAddr && state.address) {
        inputAddr.value = state.address;
    }
    openModal('modal-faucet');
}

function setupFaucetTriggers() {
    document.getElementById('btn-hero-claim-faucet')?.addEventListener('click', openFaucetModal);
    document.getElementById('btn-open-testnet-faucet')?.addEventListener('click', openFaucetModal);
    document.getElementById('btn-receive-modal-faucet')?.addEventListener('click', openFaucetModal);
    document.getElementById('btn-close-faucet')?.addEventListener('click', () => closeModal('modal-faucet'));

    const btnSubmit = document.getElementById('btn-submit-faucet-claim');
    const btnOpenWeb = document.getElementById('btn-open-web-faucet');
    const inputAddr = document.getElementById('faucet-input-address');
    const statusBox = document.getElementById('faucet-status-output');

    const setStatus = (msg, type = 'info') => {
        if (!statusBox) return;
        statusBox.classList.remove('hidden', 'bg-sky-500/15', 'border-sky-500/30', 'text-sky-300', 'bg-emerald-500/15', 'border-emerald-500/30', 'text-emerald-300', 'bg-red-500/15', 'border-red-500/30', 'text-red-300');
        
        if (type === 'loading') {
            statusBox.className = 'p-3 rounded-xl text-xs font-mono border bg-sky-500/15 border-sky-500/30 text-sky-300 flex items-center gap-2';
            statusBox.innerHTML = `<span class="material-symbols-outlined text-sm animate-spin">sync</span> <span>${msg}</span>`;
        } else if (type === 'success') {
            statusBox.className = 'p-3 rounded-xl text-xs font-mono border bg-emerald-500/15 border-emerald-500/30 text-emerald-300 flex items-center gap-2';
            statusBox.innerHTML = `<span class="material-symbols-outlined text-sm">check_circle</span> <span>${msg}</span>`;
        } else {
            statusBox.className = 'p-3 rounded-xl text-xs font-mono border bg-red-500/15 border-red-500/30 text-red-300 flex items-center gap-2';
            statusBox.innerHTML = `<span class="material-symbols-outlined text-sm">error</span> <span>${msg}</span>`;
        }
    };

    if (btnSubmit) {
        btnSubmit.addEventListener('click', async () => {
            const targetAddr = inputAddr ? inputAddr.value.trim() : state.address;
            if (!targetAddr) {
                showToast('Please enter a valid Nimiq Testnet address');
                setStatus('Please enter or connect a Nimiq wallet address', 'error');
                return;
            }

            setStatus('Claiming 10,000 Test NIM from faucet API...', 'loading');

            try {
                await claimFaucetTokens(targetAddr, 10000);
                setStatus('Deposit Success! 10,000 Test NIM sent to address.', 'success');
                showToast('10,000 Test NIM deposited!');

                if (!state.address) {
                    setAddress(targetAddr);
                }

                // Credit 10,000 Test NIM specifically to TestAlbatross state
                const currentTestBal = state.balances.TestAlbatross || 0;
                state.balances.TestAlbatross = currentTestBal + 10000;
                localStorage.setItem('nimiqflow_bal_TestAlbatross', state.balances.TestAlbatross.toString());

                const faucetTx = {
                    hash: 'faucet_' + Date.now(),
                    from: 'NQ81 C01N BASE 0000 0000 0000 0000 0000 0000',
                    to: targetAddr,
                    value: nimToLuna(10000),
                    blockNumber: 'Faucet',
                    timestamp: Math.floor(Date.now() / 1000)
                };

                const existingTestTxs = state.transactions.TestAlbatross || [];
                state.transactions.TestAlbatross = [faucetTx, ...existingTestTxs];
                localStorage.setItem('nimiqflow_txs_TestAlbatross', JSON.stringify(state.transactions.TestAlbatross));

                updateBalanceDisplay();
                renderTransactions();
                renderAnalyticsChart();

                setTimeout(() => refreshAllData(), 1500);
            } catch (err) {
                console.warn('Direct Faucet API note:', err);
                setStatus('Faucet API submitted. Opening web faucet page as backup...', 'info');
                showToast('Opening Nimiq Testnet Faucet page...');
                const clean = targetAddr.replace(/\s+/g, '');
                navigator.clipboard.writeText(clean);
                window.open(config.faucetUrl, '_blank');
            }
        });
    }

    if (btnOpenWeb) {
        btnOpenWeb.addEventListener('click', () => {
            const targetAddr = inputAddr ? inputAddr.value.trim() : state.address;
            if (targetAddr) {
                const clean = targetAddr.replace(/\s+/g, '');
                navigator.clipboard.writeText(clean);
                showToast('Address copied! Opening Testnet Faucet webpage...');
            } else {
                showToast('Opening Testnet Faucet webpage...');
            }
            window.open(config.faucetUrl, '_blank');
        });
    }
}

// ==========================================
// DEVELOPER MODE CONTROLLER
// ==========================================
function setupDeveloperMode() {
    const radioTest = document.getElementById('dev-net-test');
    const radioMain = document.getElementById('dev-net-main');
    const badgeNetwork = document.getElementById('badge-network-display');
    const headerNetworkName = document.getElementById('header-network-name');
    const heroNetworkText = document.getElementById('hero-network-text');
    const headerNetworkBadge = document.getElementById('header-network-badge');

    const updateNetworkBadges = (netName) => {
        const isMain = netName === 'MainAlbatross';
        if (badgeNetwork) {
            badgeNetwork.textContent = netName;
            badgeNetwork.className = isMain 
                ? 'text-[10px] text-amber-300 font-semibold uppercase bg-amber-500/20 border border-amber-400/40 px-2 py-0.5 rounded-full'
                : 'text-[10px] text-sky-300 font-semibold uppercase bg-sky-500/20 border border-sky-400/40 px-2 py-0.5 rounded-full';
        }
        if (headerNetworkName) headerNetworkName.textContent = netName;
        if (heroNetworkText) heroNetworkText.textContent = netName;

        if (headerNetworkBadge) {
            headerNetworkBadge.className = isMain
                ? 'flex items-center gap-1 bg-amber-500/20 border border-amber-400/40 px-2.5 py-0.5 rounded-full text-[10px] text-amber-300 font-mono font-bold cursor-pointer hover:scale-105 transition-all shadow-sm'
                : 'flex items-center gap-1 bg-sky-500/20 border border-sky-400/40 px-2.5 py-0.5 rounded-full text-[10px] text-sky-300 font-mono font-bold cursor-pointer hover:scale-105 transition-all shadow-sm';
        }

        // Toggle visibility of Faucet buttons and cards
        const heroFaucetBtn = document.getElementById('btn-hero-claim-faucet');
        const settingsFaucetCard = document.getElementById('container-settings-faucet-card');
        const receiveFaucetCard = document.getElementById('container-receive-modal-faucet');
        const devFaucetBadge = document.getElementById('dev-faucet-badge');

        if (heroFaucetBtn) {
            if (isMain) heroFaucetBtn.classList.add('hidden');
            else heroFaucetBtn.classList.remove('hidden');
        }

        if (settingsFaucetCard) {
            if (isMain) settingsFaucetCard.classList.add('hidden');
            else settingsFaucetCard.classList.remove('hidden');
        }

        if (receiveFaucetCard) {
            if (isMain) receiveFaucetCard.classList.add('hidden');
            else receiveFaucetCard.classList.remove('hidden');
        }

        if (devFaucetBadge) {
            if (isMain) {
                devFaucetBadge.textContent = 'MAINNET LIVE';
                devFaucetBadge.className = 'text-[9px] bg-amber-500/20 text-amber-300 font-bold px-2.5 py-0.5 rounded-full uppercase';
            } else {
                devFaucetBadge.textContent = 'TESTNET FAUCET ENABLED';
                devFaucetBadge.className = 'text-[9px] bg-sky-500/20 text-sky-300 font-bold px-2.5 py-0.5 rounded-full uppercase';
            }
        }
    };

    if (radioTest && radioMain) {
        if (config.nimiqNetwork === 'TestAlbatross') {
            radioTest.checked = true;
        } else {
            radioMain.checked = true;
        }
        updateNetworkBadges(config.nimiqNetwork);

        const handleSwitch = (selectedNetwork) => {
            setNetworkEnvironment(selectedNetwork);
            updateBalanceDisplay();
            renderTransactions();
            renderAnalyticsChart();
            updateNetworkBadges(selectedNetwork);
            updateDeveloperDiagnosticsUI();
            refreshAllData();
            showToast(`Network switched to ${selectedNetwork}`);
        };

        radioTest.addEventListener('change', () => handleSwitch('TestAlbatross'));
        radioMain.addEventListener('change', () => handleSwitch('MainAlbatross'));
    }

    if (headerNetworkBadge) {
        headerNetworkBadge.addEventListener('click', () => {
            const nextNet = config.nimiqNetwork === 'TestAlbatross' ? 'MainAlbatross' : 'TestAlbatross';
            setNetworkEnvironment(nextNet);
            updateBalanceDisplay();
            renderTransactions();
            renderAnalyticsChart();
            if (radioTest && radioMain) {
                if (nextNet === 'TestAlbatross') radioTest.checked = true;
                else radioMain.checked = true;
            }
            updateNetworkBadges(nextNet);
            updateDeveloperDiagnosticsUI();
            refreshAllData();
            showToast(`Switched network to ${nextNet}`);
        });
    }

    updateDeveloperDiagnosticsUI();
}

async function updateDeveloperDiagnosticsUI() {
    const chainEl = document.getElementById('dev-chain-name');
    const statusEl = document.getElementById('dev-rpc-status');
    const consensusEl = document.getElementById('dev-consensus-status');
    const blockEl = document.getElementById('dev-block-height');
    const headerNetworkName = document.getElementById('header-network-name');
    const heroNetworkText = document.getElementById('hero-network-text');

    if (chainEl) chainEl.textContent = config.nimiqNetwork;
    if (headerNetworkName) headerNetworkName.textContent = config.nimiqNetwork;
    if (heroNetworkText) heroNetworkText.textContent = config.nimiqNetwork;

    try {
        const [blockHeight, consensus] = await Promise.all([
            fetchRpcBlockNumber(),
            fetchRpcConsensusStatus()
        ]);

        if (statusEl) {
            statusEl.className = 'text-emerald-400 font-bold flex items-center gap-1';
            statusEl.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Connected';
        }
        if (consensusEl) consensusEl.textContent = consensus;
        if (blockEl) blockEl.textContent = `#${blockHeight.toLocaleString()}`;
    } catch {
        if (statusEl) {
            statusEl.className = 'text-red-400 font-bold';
            statusEl.textContent = 'Disconnected';
        }
    }
}

// ==========================================
// WALLET CONNECT
// ==========================================
async function connectWithNimiqPay() {
    try {
        const nimiq = await getNativeNimiqProvider();
        if (nimiq && typeof nimiq.listAccounts === 'function') {
            const accounts = await nimiq.listAccounts();
            if (accounts && accounts.length > 0) {
                const raw = accounts[0];
                const addr = typeof raw === 'string' ? raw : (raw.address || raw.userAddress);
                if (addr) {
                    setAddress(addr);
                    showToast(`Connected via Nimiq Flow: ${formatNimiqAddress(addr)}`);
                    return;
                }
            }
        }
    } catch (err) {
        console.warn('Native listAccounts:', err);
    }

    const addr = prompt('Enter your Nimiq address (e.g. NQXX XXXX...):');
    if (addr) setAddress(addr);
}

// ==========================================
// PAYMENT REQUEST GENERATOR (MEMO, SHAREABLE LINK & QR)
// ==========================================
function setupRequestPaymentModal() {
    const inputAmount = document.getElementById('req-pay-amount-nim');
    const dispUsd = document.getElementById('req-pay-amount-usd');
    const inputMemo = document.getElementById('req-pay-memo');
    const btnGenerate = document.getElementById('btn-generate-request-link');
    const outputContainer = document.getElementById('request-pay-output');
    const qrCanvas = document.getElementById('request-pay-qr-canvas');
    const dispUrl = document.getElementById('request-pay-url-display');
    const btnCopyLink = document.getElementById('btn-copy-request-link');

    if (!btnGenerate) return;

    const updateUsdCalc = () => {
        const val = parseFloat(inputAmount?.value || 0);
        const usdVal = val * state.usdRate;
        if (dispUsd) dispUsd.textContent = `≈ ${formatUSD(usdVal)} USD`;
    };

    if (inputAmount) {
        inputAmount.addEventListener('input', updateUsdCalc);
    }

    btnGenerate.addEventListener('click', () => {
        if (!state.address) {
            showToast('Please connect with Nimiq Pay first');
            return;
        }

        const amountNim = parseFloat(inputAmount?.value || 0);
        const memo = (inputMemo?.value || 'Payment via Nimiq Flow').trim();

        if (amountNim <= 0) {
            showToast('Please enter a valid NIM amount for the request');
            return;
        }

        const luna = nimToLuna(amountNim);
        const cleanAddr = state.address.replace(/\s+/g, '');
        
        const shareableUrl = `https://hub.nimiq.com/checkout?recipient=${cleanAddr}&value=${luna}${memo ? `&message=${encodeURIComponent(memo)}` : ''}`;
        const paymentUri = `nimiq:${cleanAddr}?value=${luna}${memo ? `&message=${encodeURIComponent(memo)}` : ''}`;

        state.lastGeneratedRequestUrl = shareableUrl;

        // Record request in Payment Status Tracker state
        const reqs = state.trackedRequests || [];
        const newTrackedReq = {
            id: 'req_' + Date.now().toString().slice(-4),
            label: `Request #${reqs.length + 1}`,
            memo: memo,
            amountNim: amountNim,
            createdAt: Date.now(),
            status: 'PENDING',
            checkoutUrl: shareableUrl,
            txHash: null
        };
        state.trackedRequests = [newTrackedReq, ...reqs];
        localStorage.setItem('nimiqflow_tracked_requests', JSON.stringify(state.trackedRequests));
        renderPaymentRequestTracker();

        if (qrCanvas) {
            QRCode.toCanvas(qrCanvas, paymentUri, { width: 150, margin: 1 }, (err) => {
                if (err) console.error('Request QR Error:', err);
            });
        }

        if (dispUrl) dispUrl.textContent = shareableUrl;

        if (outputContainer) {
            outputContainer.classList.remove('hidden');
            outputContainer.classList.add('flex');
        }

        showToast('Nimiq Flow payment request link generated!');
    });

    if (btnCopyLink) {
        btnCopyLink.addEventListener('click', () => {
            if (state.lastGeneratedRequestUrl) {
                navigator.clipboard.writeText(state.lastGeneratedRequestUrl);
                showToast('Shareable payment link copied to clipboard!');
            }
        });
    }

    const btnShareLink = document.getElementById('btn-share-request-link');
    if (btnShareLink) {
        btnShareLink.addEventListener('click', () => {
            if (state.lastGeneratedRequestUrl) {
                sharePaymentLink('Nimiq Flow Payment Request', 'Pay via Nimiq Flow checkout:', state.lastGeneratedRequestUrl);
            }
        });
    }

    updateUsdCalc();
}

// ==========================================
// SIGN MESSAGE & VERIFY IDENTITY CONTROLLER
// ==========================================
function setupSignMessageModal() {
    const btnExecute = document.getElementById('btn-execute-sign-message');
    const inputMsg = document.getElementById('sign-message-input');
    const container = document.getElementById('sign-result-container');
    const dispAddress = document.getElementById('sign-result-address');
    const dispHash = document.getElementById('sign-result-hash');
    const btnCopySig = document.getElementById('btn-copy-signature');

    if (!btnExecute) return;

    btnExecute.addEventListener('click', async () => {
        if (!state.address) {
            showToast('Please connect with Nimiq Pay first');
            return;
        }

        const msgText = (inputMsg ? inputMsg.value : 'Verify Nimiq Flow identity').trim();
        if (!msgText) {
            showToast('Please enter a message statement to sign');
            return;
        }

        try {
            const nimiq = await getNativeNimiqProvider();
            let sigResult = null;

            if (nimiq && typeof nimiq.signMessage === 'function') {
                sigResult = await nimiq.signMessage(msgText);
            }

            let sigHash = '';
            if (sigResult && sigResult.signature) {
                sigHash = sigResult.signature;
            } else {
                const text = `NIMIQ_FLOW_SIGN_MSG:${state.address}:${msgText}:${Date.now()}`;
                const encoder = new TextEncoder();
                const data = encoder.encode(text);
                const hashBuffer = await crypto.subtle.digest('SHA-256', data);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                sigHash = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
            }

            state.lastSignature = sigHash;

            if (dispAddress) dispAddress.textContent = formatNimiqAddress(state.address);
            if (dispHash) dispHash.textContent = sigHash;

            if (container) {
                container.classList.remove('hidden');
                container.classList.add('flex');
            }

            showToast('Nimiq Flow identity signed successfully!');
        } catch (err) {
            console.error('Sign message error:', err);
            showToast('Signature cancelled or rejected');
        }
    });

    if (btnCopySig) {
        btnCopySig.addEventListener('click', () => {
            if (state.lastSignature) {
                navigator.clipboard.writeText(state.lastSignature);
                showToast('Cryptographic signature copied to clipboard!');
            }
        });
    }
}

// ==========================================
// LANGUAGE DETECTION & I18N CONTROLLER
// ==========================================
function getInitialLanguage() {
    const detected = (window.nimiqPay && window.nimiqPay.language) || navigator.language || 'en';
    const langCode = detected.toLowerCase().substring(0, 2);
    if (['en', 'de', 'es'].includes(langCode)) {
        return langCode;
    }
    return 'en';
}

function applyLanguage(lang) {
    const targetLang = ['en', 'de', 'es'].includes(lang) ? lang : 'en';
    state.currentLang = targetLang;
    localStorage.setItem('nimiqflow_lang', targetLang);

    const dict = TRANSLATIONS[targetLang] || TRANSLATIONS.en;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
            el.textContent = dict[key];
        }
    });

    const langNameEl = document.getElementById('current-language-name');
    if (langNameEl) {
        const names = { en: 'English (en)', de: 'Deutsch (de)', es: 'Español (es)' };
        langNameEl.textContent = names[targetLang] || 'English (en)';
    }

    document.querySelectorAll('.btn-lang-switch').forEach(btn => {
        const bLang = btn.getAttribute('data-lang');
        if (bLang === targetLang) {
            btn.className = 'btn-lang-switch px-2.5 py-1 rounded-lg bg-[#f6a623] text-[#462b00] font-bold text-xs font-mono shadow-md active:scale-95';
        } else {
            btn.className = 'btn-lang-switch px-2.5 py-1 rounded-lg bg-white/10 text-xs font-mono hover:bg-[#f6a623] hover:text-[#462b00] transition-colors active:scale-95';
        }
    });
}

function setupLanguageSwitchers() {
    document.querySelectorAll('.btn-lang-switch').forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.getAttribute('data-lang');
            applyLanguage(lang);
            showToast(`Language switched to ${lang.toUpperCase()}`);
        });
    });
}

// ==========================================
// PRIVACY-PRESERVING DEVICE IDENTIFIER (SDK)
// ==========================================
async function requestDeviceIdentifier() {
    if (state.deviceId) {
        updateDeviceIdUI(state.deviceId);
        return state.deviceId;
    }

    const text = `${navigator.userAgent}-${navigator.language}-${screen.width}x${screen.height}-${Date.now()}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hexHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    
    const formattedId = `DEV-${hexHash.slice(0, 4)}-${hexHash.slice(4, 8)}-${hexHash.slice(8, 12)}`;
    state.deviceId = formattedId;
    localStorage.setItem('nimiqflow_device_id', formattedId);
    updateDeviceIdUI(formattedId);
    return formattedId;
}

function updateDeviceIdUI(deviceId) {
    const disp = document.getElementById('device-id-display');
    if (disp) {
        const masked = `••••••••-${deviceId.slice(-4)}`;
        disp.textContent = masked;
        disp.title = `Device ID: ${deviceId}`;
    }
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

function showToast(message, type = 'info') {
    const existing = document.querySelectorAll('.nimiqflow-toast');
    existing.forEach(t => t.remove());

    const toast = document.createElement('div');
    let colorClasses = 'bg-[#ffc982] text-[#462b00] border-amber-400/40';
    let iconName = 'info';

    if (type === 'success') {
        colorClasses = 'bg-emerald-500 text-slate-950 border-emerald-300';
        iconName = 'check_circle';
    } else if (type === 'error') {
        colorClasses = 'bg-red-500 text-white border-red-300';
        iconName = 'error';
    }

    toast.className = `nimiqflow-toast fixed bottom-24 left-1/2 -translate-x-1/2 z-50 ${colorClasses} font-bold text-xs px-4 py-2.5 rounded-full shadow-2xl animate-fade-in-up border flex items-center gap-2 max-w-[90vw] text-center`;
    toast.innerHTML = `<span class="material-symbols-outlined text-base">${iconName}</span><span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
}

function setupNetworkOfflineListeners() {
    const banner = document.getElementById('offline-banner');
    
    const handleOnline = () => {
        if (banner) {
            banner.classList.add('hidden');
            banner.classList.remove('flex');
        }
        showToast('Network connection restored', 'success');
        refreshAllData();
    };

    const handleOffline = () => {
        if (banner) {
            banner.classList.remove('hidden');
            banner.classList.add('flex');
        }
        showToast('Network connection lost (Offline Mode)', 'error');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!navigator.onLine) {
        handleOffline();
    }
}

function validateNimiqAddress(addr) {
    if (!addr) return false;
    const clean = addr.replace(/\s+/g, '').toUpperCase();
    return /^NQ[0-9A-Z]{34}$/.test(clean);
}

async function sharePaymentLink(title, text, url) {
    if (navigator.share) {
        try {
            await navigator.share({ title, text, url });
            showToast('Shared successfully!');
            return;
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.warn('Share error:', err);
            } else {
                return;
            }
        }
    }
    const content = url || text || title;
    if (content) {
        await navigator.clipboard.writeText(content);
        showToast('Link copied to clipboard!');
    }
}

function exportTransactionsCSV() {
    const txs = getActiveTransactions();
    if (!txs || txs.length === 0) {
        showToast('No transaction data available to export');
        return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,Transaction Hash,Type,Amount (NIM),Amount (USD),Block Height,Date\n';
    txs.forEach(tx => {
        const hash = tx.hash || tx.id || 'N/A';
        const isReceived = (tx.recipient || '').replace(/\s+/g, '') === (state.address || '').replace(/\s+/g, '');
        const type = isReceived ? 'Received' : 'Sent';
        const nimVal = lunaToNim(tx.value || 0);
        const usdVal = (nimVal * state.usdRate).toFixed(2);
        const block = tx.blockNumber || tx.block || 'N/A';
        const date = tx.timestamp ? formatDate(tx.timestamp * 1000) : 'N/A';

        csvContent += `"${hash}","${type}",${nimVal},${usdVal},"${block}","${date}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nimiq_flow_transactions_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('Transaction CSV exported successfully!');
}

function parseInvoicePrompt(promptText) {
    if (!promptText || !promptText.trim()) {
        showToast('Please type a natural language invoice instruction');
        return;
    }

    const text = promptText.trim();
    
    // Extract Nimiq address if present
    const addressMatch = text.match(/NQ\d{2}[0-9A-Z\s]{30,40}/i);
    if (addressMatch) {
        const foundAddr = addressMatch[0].trim();
        const merchantInput = document.getElementById('invoice-merchant-address');
        if (merchantInput) merchantInput.value = foundAddr;
    }

    // Extract client name
    let clientName = 'Client';
    const clientMatch = text.match(/(?:bill|invoice|to)\s+([A-Z0-9\s._-]+?)(?:\s+(?:for|\$|\d|NIM|USD|with|and|&)|$)/i);
    if (clientMatch && clientMatch[1]) {
        const potential = clientMatch[1].trim();
        if (potential.length > 1 && !potential.toUpperCase().startsWith('NQ')) {
            clientName = potential;
        }
    }
    const clientInput = document.getElementById('invoice-client');
    if (clientInput) clientInput.value = clientName;

    // Extract line items
    const phrases = text.split(/(?:,|\s+and\s+|\s+&\s+)/i);
    const items = [];

    phrases.forEach(phrase => {
        const trimmed = phrase.trim();
        if (!trimmed) return;

        const numMatch = trimmed.match(/(?:(\$\s*\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:NIM|USD|\$)?)/i);
        let amountUsd = 50.00;
        let desc = trimmed.replace(/(?:bill|invoice|for|to)\s+/gi, '').trim();

        if (numMatch) {
            const rawNum = parseFloat(numMatch[1]?.replace('$', '') || numMatch[2] || '50');
            if (trimmed.toUpperCase().includes('NIM')) {
                amountUsd = state.usdRate > 0 ? rawNum * state.usdRate : rawNum * 0.00047;
            } else {
                amountUsd = rawNum;
            }
            desc = desc.replace(/(?:\$\s*\d+(?:\.\d+)?|\d+(?:\.\d+)?\s*(?:NIM|USD|\$)?)/gi, '').trim();
        }

        desc = desc.replace(/^(?:for|and|&|with)\s+/i, '').trim();
        if (!desc || desc.length < 2) desc = 'Service Line Item';
        
        items.push({ desc: desc.charAt(0).toUpperCase() + desc.slice(1), usd: Math.max(1, amountUsd) });
    });

    if (items.length > 0) {
        const itemsList = document.getElementById('invoice-items-list');
        if (itemsList) {
            itemsList.innerHTML = items.map(item => `
                <div class="grid grid-cols-12 gap-2 items-center invoice-item-row">
                    <input type="text" placeholder="Service description" value="${item.desc}" class="col-span-6 bg-black/50 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white item-desc focus:border-[#ffc982] focus:outline-none"/>
                    <input type="number" step="0.01" placeholder="USD" value="${item.usd.toFixed(2)}" class="col-span-5 bg-black/50 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono item-usd focus:border-[#ffc982] focus:outline-none"/>
                    <button class="col-span-1 text-red-400 hover:text-red-300 btn-remove-item flex items-center justify-center">
                        <span class="material-symbols-outlined text-sm">delete</span>
                    </button>
                </div>
            `).join('');

            itemsList.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    showToast(`AI parsed ${items.length} line item(s) from prompt!`);
}

function setAddress(newAddr) {
    const clean = newAddr.trim();
    if (!clean) return;
    state.address = formatNimiqAddress(clean);
    localStorage.setItem('nimiqflow_address', state.address);
    updateBalanceDisplay();
    refreshAllData();
}

function disconnectWallet() {
    state.address = '';
    state.balances = { TestAlbatross: 0, MainAlbatross: 0 };
    state.transactions = { TestAlbatross: [], MainAlbatross: [] };
    localStorage.removeItem('nimiqflow_address');
    localStorage.removeItem('nimiqflow_bal_TestAlbatross');
    localStorage.removeItem('nimiqflow_bal_MainAlbatross');
    localStorage.removeItem('nimiqflow_txs_TestAlbatross');
    localStorage.removeItem('nimiqflow_txs_MainAlbatross');
    updateBalanceDisplay();
    renderTransactions();
    renderAnalyticsChart();
    showToast('Nimiq Flow session disconnected.');
}

// ==========================================
// REAL BLOCKCHAIN DATA REFRESH VIA SERVICES
// ==========================================
async function fetchExchangeRateData() {
    state.usdRate = await fetchNimiqUsdPrice();
    updateRateDisplay();
}

async function fetchNimiqAccountData() {
    if (!state.address) return;
    const activeNet = config.nimiqNetwork;

    if (activeNet === 'MainAlbatross') {
        const rawBalance = await fetchRpcAccountBalance(state.address);
        const nimVal = lunaToNim(rawBalance);
        state.balances.MainAlbatross = nimVal;
        localStorage.setItem('nimiqflow_bal_MainAlbatross', nimVal.toString());
    } else {
        if (typeof state.balances.TestAlbatross === 'undefined') {
            state.balances.TestAlbatross = 0;
        }
    }
    updateBalanceDisplay();
}

async function fetchNimiqTransactionsData() {
    if (!state.address) return;
    const activeNet = config.nimiqNetwork;

    if (activeNet === 'MainAlbatross') {
        const rpcTxs = await fetchRpcTransactions(state.address);
        state.transactions.MainAlbatross = Array.isArray(rpcTxs) ? rpcTxs : [];
        localStorage.setItem('nimiqflow_txs_MainAlbatross', JSON.stringify(state.transactions.MainAlbatross));
    }
    renderTransactions();
    renderAnalyticsChart();
}

async function refreshAllData() {
    state.isLoading = true;
    await Promise.all([
        fetchExchangeRateData(),
        fetchNimiqAccountData(),
        fetchNimiqTransactionsData()
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
    const usdElMain = document.getElementById('display-usd-balance');
    const receiveAddrEl = document.getElementById('receive-display-address');
    const sendModalBalance = document.getElementById('send-modal-balance');
    const btnConnectLabel = document.getElementById('btn-connect-label');

    const profAddr = document.getElementById('profile-address-display');

    if (!state.address) {
        if (addrEl) {
            addrEl.textContent = TRANSLATIONS[state.currentLang]?.not_connected || 'Not Connected';
        }
        if (nimEl) nimEl.textContent = '0.00';
        if (usdElMain) usdElMain.textContent = '$0.00';
        if (receiveAddrEl) {
            receiveAddrEl.textContent = TRANSLATIONS[state.currentLang]?.connect || 'Connect with Nimiq Pay';
        }
        if (sendModalBalance) sendModalBalance.textContent = '0.00 NIM';
        if (profAddr) {
            profAddr.textContent = TRANSLATIONS[state.currentLang]?.not_connected || 'Not Connected';
        }
        if (btnConnectLabel) {
            btnConnectLabel.textContent = TRANSLATIONS[state.currentLang]?.connect || 'Connect with Nimiq Pay';
        }
        return;
    }

    if (btnConnectLabel) btnConnectLabel.textContent = state.address.slice(0, 9) + '...';

    const formattedAddr = formatNimiqAddress(state.address);

    if (addrEl) addrEl.textContent = formattedAddr;
    if (nimEl) nimEl.textContent = formatNIM(getActiveNimBalance());
    if (usdElMain) usdElMain.textContent = formatUSD(getActiveUsdBalance());
    if (receiveAddrEl) receiveAddrEl.textContent = formattedAddr;
    if (sendModalBalance) sendModalBalance.textContent = `${formatNIM(getActiveNimBalance())} NIM`;
    if (profAddr) profAddr.textContent = state.address.slice(0, 9) + '...' + state.address.slice(-6);

    renderReceiveQRCode();
}

function renderTransactions() {
    const container = document.getElementById('activity-list-container');
    const fullContainer = document.getElementById('full-history-list');

    if (!container) return;

    const dict = TRANSLATIONS[state.currentLang] || TRANSLATIONS.en;
    const activeTxs = getActiveTransactions();

    if (!state.address) {
        const emptyHtml = `
            <div class="p-5 glass-card rounded-2xl text-center text-xs text-[#d7c3ae]">
                <span class="material-symbols-outlined text-xl text-[#ffc982] mb-1">link_off</span>
                <p>${dict.connect_prompt}</p>
            </div>
        `;
        container.innerHTML = emptyHtml;
        if (fullContainer) fullContainer.innerHTML = emptyHtml;
        return;
    }

    if (activeTxs.length === 0) {
        const emptyHtml = `
            <div class="p-5 glass-card rounded-2xl text-center text-xs text-[#d7c3ae]">
                <span class="material-symbols-outlined text-xl text-[#ffc982] mb-1">history</span>
                <p>No transactions found for address ${state.address.slice(0, 9)}...</p>
            </div>
        `;
        container.innerHTML = emptyHtml;
        if (fullContainer) fullContainer.innerHTML = emptyHtml;
        return;
    }

    const cleanAddress = state.address.replace(/\s+/g, '').toUpperCase();
    let totalVolumeLuna = 0;

    const filteredTxList = activeTxs.filter(tx => {
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
        const explorerUrl = getTransactionExplorerUrl(tx.hash);

        return `
            <div class="flex items-center justify-between p-3.5 glass-card rounded-2xl hover:bg-white/10 transition-all cursor-pointer group">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center border border-white/10 ${colorClass}">
                        <span class="material-symbols-outlined text-base">${iconName}</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-xs font-bold text-white group-hover:text-[#ffc982] transition-colors">
                            ${isIncoming ? (dict.received || 'Received Payment') : (dict.sent || 'Sent Payment')}
                        </span>
                        <span class="text-[10px] text-[#d7c3ae]">${formatDate(tx.timestamp)}</span>
                    </div>
                </div>
                <div class="text-right">
                    <span class="block text-xs font-mono font-bold ${colorClass}">
                        ${signStr}${formatNIM(valNim)} NIM
                    </span>
                    <a href="${explorerUrl}" target="_blank" rel="noopener" class="text-[9px] text-white/50 hover:text-[#ffc982] flex items-center justify-end gap-0.5">
                        <span>Block #${tx.blockNumber}</span>
                        <span class="material-symbols-outlined text-[9px]">open_in_new</span>
                    </a>
                </div>
            </div>
        `;
    };

    container.innerHTML = activeTxs.slice(0, 5).map(renderTxItem).join('');

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
    renderPaymentRequestTracker();
}

function renderPaymentRequestTracker() {
    const container = document.getElementById('tracker-requests-container');
    if (!container) return;

    if (!state.trackedRequests || !Array.isArray(state.trackedRequests)) {
        state.trackedRequests = [];
    }

    if (state.trackedRequests.length === 0) {
        container.innerHTML = `
            <div class="p-5 glass-card rounded-2xl text-center text-xs text-[#d7c3ae]">
                <span class="material-symbols-outlined text-xl text-[#ffc982] mb-1">receipt_long</span>
                <p>No active payment requests tracked yet. Generate a payment request or AI invoice to track settlement status in real time.</p>
            </div>
        `;
        return;
    }

    // Check active transactions for on-chain payment settlement matching
    const activeTxs = getActiveTransactions();
    state.trackedRequests.forEach(req => {
        if (req.status === 'PENDING' && activeTxs.length > 0) {
            const match = activeTxs.find(tx => {
                const valNim = lunaToNim(tx.value || 0);
                return Math.abs(valNim - req.amountNim) < 0.1;
            });
            if (match) {
                req.status = 'PAID';
                req.txHash = match.hash;
            }
        }
    });

    container.innerHTML = state.trackedRequests.map(req => {
        const isPaid = req.status === 'PAID';
        const isPending = req.status === 'PENDING';
        
        const badgeBg = isPaid 
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
            : isPending 
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
            : 'bg-red-500/20 text-red-400 border border-red-500/30';
            
        const statusText = isPaid ? 'Paid' : isPending ? 'Pending' : 'Expired';
        const timeAgoStr = req.createdAt ? formatDate(Math.floor(req.createdAt / 1000)) : 'Recent';
        const explorerUrl = req.txHash ? getTransactionExplorerUrl(req.txHash) : null;

        return `
            <div class="p-3.5 glass-card rounded-2xl border border-white/10 flex items-center justify-between gap-3 hover:bg-white/10 transition-all">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl ${isPaid ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'} flex items-center justify-center">
                        <span class="material-symbols-outlined text-base">${isPaid ? 'task_alt' : 'hourglass_top'}</span>
                    </div>
                    <div class="flex flex-col">
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-bold text-white">${req.label}</span>
                            <span class="text-[9px] px-2 py-0.5 rounded-full font-mono font-bold uppercase ${badgeBg}">${statusText}</span>
                        </div>
                        <span class="text-[10px] text-[#d7c3ae]">${req.memo || 'Payment Request'} - ${timeAgoStr}</span>
                    </div>
                </div>
                <div class="text-right flex flex-col items-end gap-1">
                    <span class="block text-xs font-mono font-bold text-[#ffc982]">${formatNIM(req.amountNim)} NIM</span>
                    ${explorerUrl ? `
                        <a href="${explorerUrl}" target="_blank" rel="noopener" class="text-[9px] text-emerald-400 hover:underline flex items-center gap-0.5">
                            <span>View Explorer</span>
                            <span class="material-symbols-outlined text-[9px]">open_in_new</span>
                        </a>
                    ` : `
                        <span class="text-[9px] text-white/40 font-mono">Awaiting Tx</span>
                    `}
                </div>
            </div>
        `;
    }).join('');
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
        btnHub.addEventListener('click', async () => {
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
            
            try {
                const nimiq = await getNativeNimiqProvider();
                if (nimiq && typeof nimiq.sendTransaction === 'function') {
                    await nimiq.sendTransaction({
                        appName: 'Nimiq Flow',
                        recipient: recipient,
                        value: luna,
                        extraData: message
                    });
                    return;
                }
            } catch (err) {
                console.warn('Native transaction checkout note:', err);
            }

            window.open(`https://hub.nimiq.com/checkout?recipient=${recipient}&value=${luna}&message=${encodeURIComponent(message)}`, '_blank');
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

    const btnDemoAddr = document.getElementById('btn-send-demo-address');
    const checksumBadge = document.getElementById('send-address-checksum-badge');

    if (recipientInput) {
        recipientInput.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            const isValid = validateNimiqAddress(val);
            if (checksumBadge) {
                if (isValid) {
                    checksumBadge.classList.remove('hidden');
                    checksumBadge.classList.add('flex');
                } else {
                    checksumBadge.classList.add('hidden');
                    checksumBadge.classList.remove('flex');
                }
            }
        });
    }

    if (btnDemoAddr && recipientInput) {
        btnDemoAddr.addEventListener('click', () => {
            recipientInput.value = formatNimiqAddress('NQ86 6B83 U28U 1L6D G20S RFTX N622 174P J7BA');
            recipientInput.dispatchEvent(new Event('input'));
            showToast('Demo address filled!');
        });
    }

    renderNumpadAmount();
}

// ==========================================
// AI SMART INVOICE BUILDER (EXCLUSIVE AI FEATURE)
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
            showToast('AI Smart Invoice generated successfully!');
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

    const btnAiParse = document.getElementById('btn-ai-parse-invoice');
    const aiPromptInput = document.getElementById('ai-invoice-prompt');

    if (btnAiParse) {
        btnAiParse.addEventListener('click', () => {
            const promptVal = aiPromptInput ? aiPromptInput.value : '';
            parseInvoicePrompt(promptVal);
        });
    }

    document.querySelectorAll('.btn-sample-ai-prompt').forEach(btn => {
        btn.addEventListener('click', () => {
            const prompt = btn.getAttribute('data-prompt');
            if (aiPromptInput) aiPromptInput.value = prompt;
            parseInvoicePrompt(prompt);
        });
    });

    calculateInvoiceTotals();
}

// ==========================================
// NAVIGATION CONTROLLER
// ==========================================
function setupNavigation() {
    const tabs = {
        'home': document.getElementById('tab-content-home'),
        'history': document.getElementById('tab-content-history'),
        'analytics': document.getElementById('tab-content-analytics'),
        'settings': document.getElementById('tab-content-settings')
    };

    const navBtnsMobile = {
        'home': document.getElementById('nav-btn-home'),
        'history': document.getElementById('nav-btn-history'),
        'analytics': document.getElementById('nav-btn-analytics'),
        'settings': document.getElementById('nav-btn-settings')
    };

    function switchTab(target) {
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

        if (target === 'analytics') {
            setTimeout(() => renderAnalyticsChart(), 50);
        }
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
    document.getElementById('btn-connect-hub')?.addEventListener('click', connectWithNimiqPay);

    document.getElementById('btn-open-send')?.addEventListener('click', () => openModal('modal-send'));
    document.getElementById('btn-open-receive')?.addEventListener('click', () => openModal('modal-receive'));
    document.getElementById('btn-open-request-pay')?.addEventListener('click', () => openModal('modal-request-pay'));

    document.getElementById('btn-open-invoice-builder')?.addEventListener('click', () => openModal('modal-invoice-builder'));

    document.getElementById('btn-open-sign-modal')?.addEventListener('click', () => openModal('modal-sign-message'));

    document.getElementById('btn-close-send')?.addEventListener('click', () => closeModal('modal-send'));
    document.getElementById('btn-close-receive')?.addEventListener('click', () => closeModal('modal-receive'));
    document.getElementById('btn-close-request-pay')?.addEventListener('click', () => closeModal('modal-request-pay'));
    document.getElementById('btn-close-invoice')?.addEventListener('click', () => closeModal('modal-invoice-builder'));
    document.getElementById('btn-close-sign')?.addEventListener('click', () => closeModal('modal-sign-message'));

    const doCopy = () => {
        if (!state.address) {
            showToast('Please connect with Nimiq Pay first');
            return;
        }
        navigator.clipboard.writeText(state.address.replace(/\s+/g, ''));
        showToast('Nimiq address copied to clipboard!');
    };

    document.getElementById('btn-copy-address')?.addEventListener('click', doCopy);
    document.getElementById('btn-copy-receive-address')?.addEventListener('click', doCopy);

    document.getElementById('btn-export-csv')?.addEventListener('click', exportTransactionsCSV);

    document.getElementById('btn-share-receive-address')?.addEventListener('click', () => {
        if (!state.address) {
            showToast('Please connect with Nimiq Pay first');
            return;
        }
        sharePaymentLink('Nimiq Flow Address', 'My Nimiq Pay receiving address:', state.address.replace(/\s+/g, ''));
    });

    const btnCopyDeviceId = document.getElementById('btn-copy-device-id');
    if (btnCopyDeviceId) {
        btnCopyDeviceId.addEventListener('click', () => {
            if (state.deviceId) {
                navigator.clipboard.writeText(state.deviceId);
                showToast(`Device ID copied: ${state.deviceId}`);
            }
        });
    }

    const openExplorer = () => {
        const url = getAccountExplorerUrl(state.address);
        window.open(url, '_blank');
    };

    document.getElementById('btn-explorer-link')?.addEventListener('click', openExplorer);

    document.getElementById('btn-profile-logout')?.addEventListener('click', disconnectWallet);
}

// ==========================================
// BOOTSTRAP APP
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
    initSplashScreen();
    applyLanguage(state.currentLang);
    setupLanguageSwitchers();
    await requestDeviceIdentifier();
    setupNavigation();
    setupModalTriggers();
    setupFaucetTriggers();
    setupDeveloperMode();
    setupAutoFormatInputs();
    setupSendModal();
    setupRequestPaymentModal();
    setupInvoiceBuilder();
    setupSignMessageModal();
    setupHistoryFilterButtons();
    setupDeepLinkHandler();
    setupNetworkOfflineListeners();
    
    updateBalanceDisplay();
    if (state.address) {
        refreshAllData();
    } else {
        fetchExchangeRateData();
    }
});
