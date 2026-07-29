import { config } from './config.js';

export async function fetchNimiqUsdPrice() {
    try {
        const url = `${config.coingeckoUrl}/simple/price?ids=nimiq-2&vs_currencies=usd`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (data['nimiq-2'] && data['nimiq-2'].usd) {
                return data['nimiq-2'].usd;
            }
        }
    } catch (err) {
        console.warn('Prices service CoinGecko error:', err);
    }
    return 0.00047;
}
