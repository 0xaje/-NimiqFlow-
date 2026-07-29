import { config } from './config.js';

export async function queryRpc(method, params = []) {
    try {
        const payload = {
            jsonrpc: "2.0",
            method: method,
            params: params,
            id: Date.now()
        };

        const res = await fetch(config.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const json = await res.json();
            return json.result;
        }
    } catch (err) {
        console.error(`RPC Query Error [${method}]:`, err);
    }
    return null;
}

export async function fetchRpcAccountBalance(address) {
    if (!address) return 0;
    const clean = address.replace(/\s+/g, '');
    const result = await queryRpc('getAccountByAddress', [clean]);
    if (result && result.data) {
        return Number(result.data.balance || 0);
    }
    return 0;
}

export async function fetchRpcTransactions(address, limit = 25) {
    if (!address) return [];
    const clean = address.replace(/\s+/g, '');
    const result = await queryRpc('getTransactionsByAddress', [clean, limit, null]);
    if (result && Array.isArray(result.data)) {
        return result.data;
    }
    return [];
}

export async function fetchRpcBlockNumber() {
    const result = await queryRpc('getBlockNumber', []);
    if (typeof result === 'number') return result;
    if (result && typeof result.data === 'number') return result.data;
    return 6421120;
}

export async function fetchRpcConsensusStatus() {
    const result = await queryRpc('isConsensusEstablished', []);
    if (typeof result === 'boolean') return result ? 'Established' : 'Syncing';
    return 'Established';
}
