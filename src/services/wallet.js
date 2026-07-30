import HubApi from '@nimiq/hub-api';
import { config } from './config.js';

export function isValidNimiqAddress(addr) {
    if (!addr || typeof addr !== 'string') return false;
    const clean = addr.replace(/\s+/g, '').toUpperCase();
    return /^NQ[0-9A-Z]{34}$/.test(clean);
}

function getHubApiInstance() {
    const hubUrl = config.nimiqNetwork === 'TestAlbatross' 
        ? 'https://hub.nimiq-testnet.com' 
        : 'https://hub.nimiq.com';
    try {
        return new HubApi(hubUrl);
    } catch (err) {
        console.warn('HubApi initialization note:', err);
        return null;
    }
}

/**
 * Parses URL query parameters & hash fragment for Nimiq wallet addresses.
 * E.g. ?address=NQ86... or ?wallet=NQ... or #address=NQ...
 */
export function extractAddressFromUrl() {
    try {
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash);
        
        const candidateKeys = ['address', 'wallet', 'account', 'userAddress', 'nimiqAddress', 'addr'];
        
        for (const key of candidateKeys) {
            const val = searchParams.get(key) || hashParams.get(key);
            if (val && isValidNimiqAddress(val)) {
                const bal = searchParams.get('balance') || searchParams.get('balanceNim') || searchParams.get('luna') || hashParams.get('balance') || hashParams.get('balanceNim');
                let parsedBal = null;
                if (bal) {
                    const numBal = parseFloat(bal);
                    parsedBal = numBal > 100000 ? numBal / 100000 : numBal;
                }
                return {
                    address: val.trim(),
                    balance: parsedBal
                };
            }
        }
    } catch (err) {
        console.warn('extractAddressFromUrl error:', err);
    }
    return null;
}

/**
 * Inspects window global objects for injected Nimiq Pay / Nimiq providers.
 */
export async function detectInjectedNimiqPay() {
    // 1. Check URL parameters first
    const urlRes = extractAddressFromUrl();
    if (urlRes && urlRes.address) {
        return {
            address: urlRes.address,
            balance: urlRes.balance,
            source: 'url_parameter',
            provider: null
        };
    }

    // 2. Check injected window objects: window.nimiqPay, window.nimiq, window.NimiqPay, window.Nimiq, etc.
    const candidates = [
        window.nimiqPay,
        window.nimiq,
        window.NimiqPay,
        window.Nimiq,
        window.nimiqPayProvider
    ].filter(Boolean);

    for (const p of candidates) {
        let detectedAddress = null;
        let detectedBalance = null;

        // Method 1: p.init()
        if (typeof p.init === 'function') {
            try {
                const initRes = await p.init();
                if (initRes && (initRes.address || initRes.listAccounts)) {
                    detectedAddress = initRes.address || null;
                    if (initRes.balance !== undefined || initRes.balanceNim !== undefined) {
                        detectedBalance = initRes.balanceNim || initRes.balance;
                    }
                    return { address: detectedAddress, balance: detectedBalance, provider: initRes, source: 'window_injected_init' };
                }
            } catch (err) {
                console.warn('Injected provider .init() warning:', err);
            }
        }

        // Method 2: p.getAccount() or p.getAddress() or p.listAccounts() or p.requestAccounts()
        const methods = ['getAccount', 'getAddress', 'listAccounts', 'requestAccounts', 'getAccounts'];
        for (const m of methods) {
            if (typeof p[m] === 'function') {
                try {
                    const res = await p[m]();
                    if (typeof res === 'string' && isValidNimiqAddress(res)) {
                        detectedAddress = res;
                    } else if (Array.isArray(res) && res.length > 0) {
                        const first = res[0];
                        detectedAddress = typeof first === 'string' ? first : (first.address || first.userAddress);
                        if (first && (first.balance !== undefined || first.balanceNim !== undefined || first.luna !== undefined)) {
                            detectedBalance = first.balanceNim || first.balance || (first.luna ? first.luna / 100000 : null);
                        }
                    } else if (res && (res.address || res.userAddress)) {
                        detectedAddress = res.address || res.userAddress;
                        detectedBalance = res.balanceNim || res.balance || (res.luna ? res.luna / 100000 : null);
                    }
                    if (detectedAddress && isValidNimiqAddress(detectedAddress)) {
                        break;
                    }
                } catch (err) {
                    console.warn(`Injected provider .${m}() warning:`, err);
                }
            }
        }

        // Method 3: Direct property inspection (.address, .userAddress, .account, .accounts)
        if (!detectedAddress) {
            const props = ['address', 'userAddress', 'account', 'accounts'];
            for (const prop of props) {
                const val = p[prop];
                if (typeof val === 'string' && isValidNimiqAddress(val)) {
                    detectedAddress = val;
                    break;
                }
                if (Array.isArray(val) && val.length > 0) {
                    const first = val[0];
                    const addr = typeof first === 'string' ? first : (first && (first.address || first.userAddress));
                    if (addr && isValidNimiqAddress(addr)) {
                        detectedAddress = addr;
                        if (first && (first.balance !== undefined || first.balanceNim !== undefined)) {
                            detectedBalance = first.balanceNim || first.balance;
                        }
                        break;
                    }
                }
            }
        }

        if (detectedAddress) {
            if (detectedBalance === null) {
                if (typeof p.getBalance === 'function') {
                    try {
                        const bRes = await p.getBalance(detectedAddress);
                        if (typeof bRes === 'number') {
                            detectedBalance = bRes > 100000 ? bRes / 100000 : bRes;
                        } else if (bRes && (bRes.nim || bRes.balance)) {
                            detectedBalance = bRes.nim || bRes.balance;
                        }
                    } catch {}
                } else if (typeof p.balance !== 'undefined') {
                    const b = Number(p.balance);
                    detectedBalance = b > 100000 ? b / 100000 : b;
                } else if (typeof p.balanceNim !== 'undefined') {
                    detectedBalance = Number(p.balanceNim);
                }
            }

            return {
                address: detectedAddress,
                balance: detectedBalance,
                provider: p,
                source: 'window_injected'
            };
        }
    }

    // 3. Direct global window properties (window.nimiqAddress, window.userAddress)
    const globalAddrs = [window.nimiqAddress, window.userAddress, window.NIMIQ_ADDRESS].filter(Boolean);
    for (const gAddr of globalAddrs) {
        if (typeof gAddr === 'string' && isValidNimiqAddress(gAddr)) {
            const gBal = window.nimiqBalance || window.userBalance || null;
            return {
                address: gAddr,
                balance: gBal ? Number(gBal) : null,
                source: 'window_global'
            };
        }
    }

    return null;
}

/**
 * Returns a robust Nimiq provider interface, attempting native Nimiq Pay first before falling back to HubApi.
 */
export async function getNativeNimiqProvider() {
    // Attempt multi-strategy native detection
    const detected = await detectInjectedNimiqPay();

    if (detected) {
        const prov = detected.provider || {};
        return {
            isNativePay: true,
            source: detected.source,
            detectedAddress: detected.address || null,
            listAccounts: async () => {
                if (detected.address) {
                    return [{ address: detected.address, label: 'Nimiq Pay Account' }];
                }
                if (typeof prov.listAccounts === 'function') {
                    return await prov.listAccounts();
                }
                if (typeof prov.getAccount === 'function') {
                    const acc = await prov.getAccount();
                    const addr = typeof acc === 'string' ? acc : (acc.address || acc.userAddress);
                    return [{ address: addr, label: 'Nimiq Pay Account' }];
                }
                return [];
            },
            sendTransaction: async (params) => {
                if (typeof prov.sendTransaction === 'function') {
                    return await prov.sendTransaction(params);
                }
                if (typeof prov.checkout === 'function') {
                    return await prov.checkout(params);
                }
                // Fallback for native pay: deep-link checkout
                const recipient = params.recipient || params.address;
                const value = params.value || params.amount;
                const message = params.extraData || params.message || '';
                window.location.href = `nimiq:${recipient}?value=${value}${message ? `&message=${encodeURIComponent(message)}` : ''}`;
            },
            signMessage: async (msg) => {
                if (typeof prov.signMessage === 'function') {
                    return await prov.signMessage(typeof msg === 'string' ? msg : { appName: 'KorriPay', message: msg });
                }
                return null;
            }
        };
    }

    // Fallback: Web HubApi for standard desktop/mobile web browsers
    const hubApi = getHubApiInstance();

    return {
        isNativePay: false,
        source: 'hub_api',
        listAccounts: async () => {
            if (hubApi) {
                try {
                    const res = await hubApi.chooseAddress({ appName: 'KorriPay' });
                    if (res && res.address) {
                        return [{ address: res.address, label: res.label || 'Nimiq Account' }];
                    }
                } catch (err) {
                    console.warn('hubApi.chooseAddress note:', err);
                    throw err;
                }
            }
            return [];
        },
        login: async () => {
            if (hubApi) {
                try {
                    const res = await hubApi.login({ appName: 'KorriPay' });
                    return res;
                } catch (err) {
                    console.warn('hubApi.login note:', err);
                    throw err;
                }
            }
            return null;
        },
        sendTransaction: async (params) => {
            if (hubApi) {
                return await hubApi.checkout(params);
            }
        },
        signMessage: async (msg) => {
            if (hubApi) {
                return await hubApi.signMessage({
                    appName: 'KorriPay',
                    message: msg
                });
            }
            return null;
        }
    };
}
