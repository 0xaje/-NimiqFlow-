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
    const endpoints = isTestnet ? TESTNET_RPC_ENDPOINTS : MAINNET_RPC_ENDPOINTS;
    
    console.log(`[NimiqFlow] RPC Request: method=${method}, network=${config.nimiqNetwork}, endpoints=${JSON.stringify(endpoints)}, params=${JSON.stringify(params)}`);

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
                console.log(`[NimiqFlow] RPC Response from ${endpoint} for ${method}:`, json);
                if (json && typeof json.result !== 'undefined' && json.result !== null) {
                    return json.result;
                }
                if (json && json.error) {
                    console.warn(`[NimiqFlow] RPC Error from ${endpoint}:`, json.error);
                }
            } else {
                console.warn(`[NimiqFlow] RPC HTTP Error ${res.status} from ${endpoint}`);
            }
        } catch (err) {
            console.warn(`[NimiqFlow] RPC endpoint ${endpoint} failed for ${method}:`, err);
        }
    }
    return null;
}

export async function claimFaucetTokens(address, amount = 10000) {
    if (!address) throw new Error("Wallet address is required for faucet claim");
    const cleanAddress = address.replace(/\s+/g, '');

    console.log(`[NimiqFlow] Claiming faucet tokens for address: ${cleanAddress}, amount: ${amount}`);

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
                console.log(`[NimiqFlow] Faucet claim success response:`, data);
                return { success: true, ...data };
            } catch {
                return { success: true, message: 'Faucet request dispatched successfully.' };
            }
        }
        const errText = await res.text();
        console.warn(`[NimiqFlow] Faucet HTTP ${res.status}: ${errText}`);
        return { success: false, message: errText || `Faucet HTTP Error ${res.status}` };
    } catch (err) {
        console.warn('[NimiqFlow] Faucet tapit request error:', err);
        return { success: false, message: err.message || 'Faucet network request failed.' };
    }
}

export function formatRpcAddress(addr) {
    if (!addr) return '';
    const clean = addr.replace(/\s+/g, '').toUpperCase();
    if (clean.length !== 36) return addr;
    return clean.match(/.{1,4}/g).join(' ');
}

export async function fetchRpcAccountBalance(address) {
    if (!address) {
        console.log(`[NimiqFlow] fetchRpcAccountBalance called with empty address`);
        return 0;
    }
    const formattedAddr = formatRpcAddress(address);
    const cleanAddr = address.replace(/\s+/g, '').toUpperCase();

    console.log(`[NimiqFlow] fetchRpcAccountBalance querying address: formatted="${formattedAddr}", clean="${cleanAddr}" on network="${config.nimiqNetwork}" (RPC URL: "${config.rpcUrl}")`);

    // Query active JSON-RPC node (Testnet or Mainnet)
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

    console.log(`[NimiqFlow] fetchRpcAccountBalance result for ${cleanAddr}: ${rpcBalance} Lunas (${rpcBalance / 100000} NIM)`);
    return rpcBalance;
}

export async function fetchRpcTransactions(address, limit = 25) {
    if (!address) return [];
    const formattedAddr = formatRpcAddress(address);
    console.log(`[NimiqFlow] fetchRpcTransactions querying address: ${formattedAddr} on ${config.nimiqNetwork}`);
    const result = await queryRpc('getTransactionsByAddress', [formattedAddr, limit, null]);
    if (result && Array.isArray(result.data)) {
        console.log(`[NimiqFlow] fetchRpcTransactions returned ${result.data.length} txs`);
        return result.data;
    }
    if (result && Array.isArray(result)) {
        console.log(`[NimiqFlow] fetchRpcTransactions returned ${result.length} txs`);
        return result;
    }
    return [];
}

export async function fetchRpcBlockNumber() {
    console.log(`[NimiqFlow] Fetching RPC block number for network ${config.nimiqNetwork}...`);
    const result = await queryRpc('getBlockNumber', []);
    let blockNum = 0;
    if (typeof result === 'number') blockNum = result;
    else if (result && typeof result.data === 'number') blockNum = result.data;
    else if (result && typeof result.blockNumber === 'number') blockNum = result.blockNumber;
    
    console.log(`[NimiqFlow] Current RPC Block Number for ${config.nimiqNetwork}: ${blockNum}`);
    return blockNum;
}

export async function fetchRpcConsensusStatus() {
    console.log(`[NimiqFlow] Fetching RPC consensus status for network ${config.nimiqNetwork}...`);
    const result = await queryRpc('isConsensusEstablished', []);
    let status = 'Offline';
    if (typeof result === 'boolean') status = result ? 'Established' : 'Syncing';
    console.log(`[NimiqFlow] Current RPC Consensus Status for ${config.nimiqNetwork}: ${status}`);
    return status;
}


