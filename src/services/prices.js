import { config } from './config.js';

const CACHE_KEY_PRICE = 'nimiqflow_cached_usd_price';
const CACHE_KEY_TIME = 'nimiqflow_cached_usd_time';
const CACHE_TTL_MS = 30000; // 30 seconds TTL

export async function fetchNimiqUsdPrice() {
    const cachedTime = Number(localStorage.getItem(CACHE_KEY_TIME) || 0);
    const cachedPrice = Number(localStorage.getItem(CACHE_KEY_PRICE) || 0);

    if (cachedPrice > 0 && (Date.now() - cachedTime) < CACHE_TTL_MS) {
        return cachedPrice;
    }

    try {
        const url = `${config.coingeckoUrl}/simple/price?ids=nimiq-2&vs_currencies=usd`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (data['nimiq-2'] && data['nimiq-2'].usd) {
                const price = data['nimiq-2'].usd;
                localStorage.setItem(CACHE_KEY_PRICE, price.toString());
                localStorage.setItem(CACHE_KEY_TIME, Date.now().toString());
                return price;
            }
        }
    } catch (err) {
        console.warn('Prices service CoinGecko error:', err);
    }
    
    return cachedPrice > 0 ? cachedPrice : 0;
}

