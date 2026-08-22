// js/sutraInfo.js

// 数据来源：public/sutra{N}.idx.html 页尾内嵌的 #sutra-meta JSON 数据块
// （由 back/tools/gen_sutra_idx.mjs 从真源生成，含繁体经名 t 与卷表 r:[{t,i}]）
// 阅读页按需取当前经一份，不再加载全量 titles/rolls 切片

const metaCache = new Map();   // 经号 → Promise<meta|null>（会话内共享）

/**
 * 加载单部经的内嵌数据
 * @param {number} n - 经号
 * @returns {Promise<{t: string, r: Array}|null>}
 */
function loadSutraMeta(n) {
    if (!metaCache.has(n)) {
        const p = fetch('./public/sutra' + n + '.idx.html')
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.text();
            })
            .then(html => {
                const m = html.match(/<script type="application\/json" id="sutra-meta">([\s\S]*?)<\/script>/);
                if (!m) throw new Error('sutra-meta 数据块缺失');
                return JSON.parse(m[1]);
            })
            .catch(e => {
                console.error('加载 sutra' + n + '.idx.html 内嵌数据失败:', e);
                metaCache.delete(n); // 允许重试
                return null;
            });
        metaCache.set(n, p);
    }
    return metaCache.get(n);
}

/**
 * 根据 sutra 编号获取卷信息
 * @param {string} sutraNum - 经号，如 '424'
 * @returns {Promise<{title: string, rolls: Array, rollName: string}>}
 */
export async function fetchSutraInfo(sutraNum) {
    if (!sutraNum) return null;

    const key = parseInt(sutraNum, 10);
    if (!Number.isFinite(key)) return null;

    const meta = await loadSutraMeta(key);
    if (!meta) return null;

    const rolls = Array.isArray(meta.r) ? meta.r : [];
    // 单卷经 r 只有 1 条（函号卷名），阅读页需展示 rollName
    const rollName = rolls.length === 1 ? rolls[0].t : '';

    return {
        title: meta.t || '',
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
