// Environment & Network Configuration Layer

const getEnvVar = (key, fallback) => {
    try {
        return import.meta.env[key] || fallback;
    } catch {
        return fallback;
    }
};

export const config = {
    env: getEnvVar('VITE_APP_ENV', 'development'),
    nimiqNetwork: localStorage.getItem('nimiqflow_dev_network') || getEnvVar('VITE_NIMIQ_NETWORK', 'TestAlbatross'),
    evmNetwork: getEnvVar('VITE_EVM_NETWORK', 'Sepolia'),
    rpcUrl: getEnvVar('VITE_RPC_URL', 'https://rpc.nimiqwatch.com'),
    explorerUrl: getEnvVar('VITE_EXPLORER_URL', 'https://albatross.nimiqscan.com'),
    faucetUrl: 'https://faucet.pos.nimiq-testnet.com',
    faucetApiUrl: 'https://faucet.pos.nimiq-testnet.com/tapit',
    coingeckoUrl: getEnvVar('VITE_COINGECKO', 'https://api.coingecko.com/api/v3')
};

export function setNetworkEnvironment(networkName) {
    config.nimiqNetwork = networkName;
    localStorage.setItem('nimiqflow_dev_network', networkName);

    if (networkName === 'TestAlbatross') {
        config.rpcUrl = 'https://rpc.testnet.nimiqwatch.com';
        config.explorerUrl = 'https://albatross.nimiqscan.com';
    } else {
        config.rpcUrl = 'https://rpc.nimiqwatch.com';
        config.explorerUrl = 'https://albatross.nimiqscan.com';
    }
}

