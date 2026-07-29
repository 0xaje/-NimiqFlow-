import HubApi from '@nimiq/hub-api';
import { config } from './config.js';

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

export async function getNativeNimiqProvider() {
    if (window.nimiqPay && typeof window.nimiqPay.init === 'function') {
        try {
            const nimiq = await window.nimiqPay.init();
            return nimiq;
        } catch (err) {
            console.warn('window.nimiqPay.init():', err);
        }
    }

    const hubApi = getHubApiInstance();

    return {
        listAccounts: async () => {
            if (hubApi) {
                const res = await hubApi.chooseAddress({ appName: 'Nimiq Flow' });
                return res && res.address ? [{ address: res.address, label: 'Nimiq Flow Account' }] : [];
            }
            return [];
        },
        sendTransaction: async (params) => {
            if (hubApi) {
                return await hubApi.checkout(params);
            }
        },
        signMessage: async (msg) => {
            if (hubApi) {
                return await hubApi.signMessage({
                    appName: 'Nimiq Flow',
                    message: msg
                });
            }
            return null;
        }
    };
}
