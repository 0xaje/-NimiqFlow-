import { config } from './config.js';

export function getAccountExplorerUrl(address) {
    const clean = (address || '').replace(/\s+/g, '');
    const baseUrl = config.nimiqNetwork === 'TestAlbatross' 
        ? 'https://albatross.nimiqscan.com' 
        : config.explorerUrl;

    if (!clean) return baseUrl;
    return `${baseUrl}/account/${clean}`;
}

export function getTransactionExplorerUrl(txHash) {
    const baseUrl = config.nimiqNetwork === 'TestAlbatross' 
        ? 'https://albatross.nimiqscan.com' 
        : config.explorerUrl;

    if (!txHash) return baseUrl;
    return `${baseUrl}/transaction/${txHash}`;
}
