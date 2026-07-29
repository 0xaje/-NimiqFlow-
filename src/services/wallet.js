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

