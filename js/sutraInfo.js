// js/sutraInfo.js

let titlesCachePromise = null;   // 共享 titles.json 加载 Promise
let rollsCachePromise = null;    // 共享 rolls.json 加载 Promise

// 经名来源：data/cache/titles.json（gen_cache.mjs 从真源生成，经号→繁体经名）
// 卷表来源：data/cache/rolls.json（gen_cache.mjs 从真源生成，[{ n, r:[{t,i}] }]）

/**
 * 加载经号→经名映射（全站只 fetch 一次）
 * @returns {Promise<Record<string,string>>}
 */
function loadTitles() {
    if (!titlesCachePromise) {
        titlesCachePromise = fetch('./data/cache/titles.json').then(async (res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        }).catch(e => {
            console.error('加载 data/cache/titles.json 失败:', e);
            titlesCachePromise = null; // 允许重试
            return {};
        });
    }
    return titlesCachePromise;
}

/**
 * 加载卷表（全站只 fetch 一次）
 * @returns {Promise<Record<number, Array>>} 经号 → rolls
 */
function loadRolls() {
    if (!rollsCachePromise) {
        rollsCachePromise = fetch('./data/cache/rolls.json').then(async (res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const arr = await res.json();
            const map = {};
            for (const item of arr) map[item.n] = item.r;
            return map;
        }).catch(e => {
            console.error('加载 data/cache/rolls.json 失败:', e);
            rollsCachePromise = null; // 允许重试
            return {};
        });
    }
    return rollsCachePromise;
}

/**
 * 根据 sutra 编号获取卷信息
 * @param {string} sutraNum - 经号，如 '424'
 * @returns {Promise<{title: string, rolls: Array, rollName: string}>}
 */
export async function fetchSutraInfo(sutraNum) {
    if (!sutraNum) return null;

    const key = parseInt(sutraNum, 10);
    const [titles, rollsMap] = await Promise.all([loadTitles(), loadRolls()]);

    const rolls = rollsMap[key] || [];
    // 单卷经 r 只有 1 条（函号卷名），阅读页需展示 rollName
    const rollName = rolls.length === 1 ? rolls[0].t : '';

    return {
        title: titles[String(key)] || '',
        rollName,
        rolls
    };
}

/**
 * 根据 idx 获取卷名
 * @param {Array} rolls - 卷列表 [{t,i}]（t=卷名，i=起始idx）
 * @param {string} idx - 当前 idx
 * @returns {string}
 */
export function getRollTitle(rolls, idx) {
    if (!rolls || rolls.length === 0) return '';
    const roll = rolls.find(r => r.i === idx);
    return roll ? roll.t : '';
}

/**
 * 从 URL 参数获取经号
 * @returns {string|null}
 */
export function getSutraNumFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('sutra');
}
