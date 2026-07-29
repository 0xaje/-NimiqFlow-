import HubApi from '@nimiq/hub-api';

let hubApi = null;
try {
    hubApi = new HubApi('https://hub.nimiq.com');
} catch (err) {
    console.warn('HubApi note:', err);
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
