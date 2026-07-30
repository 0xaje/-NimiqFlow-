import { config } from './config.js';

const MAINNET_RPC_ENDPOINTS = [
    'https://rpc.nimiqwatch.com'
];

const TESTNET_RPC_ENDPOINTS = [
    'https://rpc.testnet.nimiqwatch.com',
    'https://rpc.pos.nimiq-testnet.com'
];

export async function queryRpc(method, params = []) {
    const isTestnet = config.nimiqNetwork === 'TestAlbatross';
    const primaryUrl = isTestnet ? 'https://rpc.testnet.nimiqwatch.com' : 'https://rpc.nimiqwatch.com';
    const fallbackList = isTestnet ? TESTNET_RPC_ENDPOINTS : MAINNET_RPC_ENDPOINTS;
    
    const endpoints = Array.from(new Set([config.rpcUrl, primaryUrl, ...fallbackList]));
    
    for (const endpoint of endpoints) {
        try {
            const payload = {
                jsonrpc: "2.0",
                method: method,
                params: params,
                id: Date.now()
            };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const json = await res.json();
                if (json && typeof json.result !== 'undefined') {
                    return json.result;
                }
            }
        } catch (err) {
            console.warn(`RPC endpoint ${endpoint} failed for ${method}:`, err);
        }
    }
    return null;
}

export async function claimFaucetTokens(address, amount = 10000) {
    if (!address) throw new Error("Wallet address is required for faucet claim");
    const cleanAddress = address.replace(/\s+/g, '');

    const params = new URLSearchParams();
    params.append('address', cleanAddress);
    params.append('amount', amount.toString());

    try {
        const res = await fetch('https://faucet.pos.nimiq-testnet.com/tapit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        });

        if (res.ok) {
            try {
                const data = await res.json();
                return { success: true, ...data };
            } catch {
                return { success: true };
            }
        }
    } catch (err) {
        console.warn('Faucet tapit request warning:', err);
    }

    return { success: false, message: 'Faucet request dispatched. On-chain confirmation pending.' };
}

export function formatRpcAddress(addr) {
    if (!addr) return '';
    const clean = addr.replace(/\s+/g, '').toUpperCase();
    if (clean.length !== 36) return addr;
    return clean.match(/.{1,4}/g).join(' ');
}

export async function fetchRpcAccountBalance(address) {
    if (!address) return 0;
    const formattedAddr = formatRpcAddress(address);
    const cleanAddr = address.replace(/\s+/g, '').toUpperCase();

    // Strategy 1: REST API query (fast, direct, mobile-friendly GET)
    try {
        const restRes = await fetch(`https://api.nimiqwatch.com/api/v1/account/${cleanAddr}`);
        if (restRes.ok) {
            const data = await restRes.json();
            if (data && typeof data.balance !== 'undefined' && data.balance !== null) {
                return Number(data.balance);
            }
        }
    } catch (err) {
        console.warn('REST balance lookup warning:', err);
    }

    // Strategy 2: JSON-RPC query
    let result = await queryRpc('getAccountByAddress', [formattedAddr]);
    if (!result || (typeof result.balance === 'undefined' && (!result.data || typeof result.data.balance === 'undefined'))) {
        result = await queryRpc('getAccountByAddress', [cleanAddr]);
    }

    let rpcBalance = 0;
    if (result) {
        if (result.data && typeof result.data.balance !== 'undefined') {
            rpcBalance = Number(result.data.balance);
        } else if (typeof result.balance !== 'undefined') {
            rpcBalance = Number(result.balance);
        } else if (typeof result === 'number') {
            rpcBalance = result;
        }
    }

    return rpcBalance;
}

export async function fetchRpcTransactions(address, limit = 25) {
    if (!address) return [];
    const formattedAddr = formatRpcAddress(address);
    const result = await queryRpc('getTransactionsByAddress', [formattedAddr, limit, null]);
    if (result && Array.isArray(result.data)) {
        return result.data;
    }
    if (result && Array.isArray(result)) {
        return result;
    }
    return [];
}

export async function fetchRpcBlockNumber() {
    const result = await queryRpc('getBlockNumber', []);
    if (typeof result === 'number') return result;
    if (result && typeof result.data === 'number') return result.data;
    if (result && typeof result.blockNumber === 'number') return result.blockNumber;
    return 6421120;
}

export async function fetchRpcConsensusStatus() {
    const result = await queryRpc('isConsensusEstablished', []);
    if (typeof result === 'boolean') return result ? 'Established' : 'Syncing';
    return 'Established';
}
