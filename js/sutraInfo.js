// js/sutraInfo.js

let sutraInfoCachePromise = null; // 共享加载 Promise：全站只 fetch 一次

/**
 * 根据 sutra 编号获取卷信息
 * @param {string} sutraNum - 经号，如 '424'
 * @returns {Promise<{title: string, rolls: Array, start: string, end: string, rollName: string}>}
 */
export async function fetchSutraInfo(sutraNum) {
    if (!sutraNum) return null;

    const urlParams = new URLSearchParams(window.location.search);
    const hasIdx = urlParams.has('idx');

    // 没有 idx 参数 = 单卷经（直接从 index.html 跳转过来）
    if (!hasIdx) {
        return fetchSutraInfoFromOneVolJson(sutraNum);
    }

    // 有 idx 参数 = 多卷经，优先从统一 JSON 获取（657 个 idx.html 保留作核对数据源）
    const info = await fetchSutraInfoFromVolsJson(sutraNum);
    if (info) return info;

    // 降级：从 index.html 获取
    return fetchSutraInfoFromIndex(sutraNum);
}

/**
 * 从 data/vols/sutraInfo.json 获取经卷信息（全量 JSON 只加载一次）
 * @param {string} sutraNum
 * @returns {Promise<object|null>}
 */
async function fetchSutraInfoFromVolsJson(sutraNum) {
    try {
        if (!sutraInfoCachePromise) {
            sutraInfoCachePromise = fetch('./data/vols/sutraInfo.json').then(async (res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const arr = await res.json();
                const map = {};
                for (const item of arr) map[item.n] = item;
                return map;
            }).catch(e => {
                console.error('加载 data/vols/sutraInfo.json 失败:', e);
                sutraInfoCachePromise = null; // 允许重试
                return null;
            });
        }
        const map = await sutraInfoCachePromise;
        if (!map) return null;

        const key = parseInt(sutraNum, 10);
        const item = map[key];
        if (!item) return null;

        return {
            title: item.t,
            start: item.s,
            end: item.e,
            rollName: '',
            rolls: item.r
        };
    } catch (e) {
        console.error('从 data/vols/sutraInfo.json 获取经卷信息失败:', e);
        return null;
    }
}

/**
 * 从 oneVolSutra.json 获取单卷经的卷名
 * @param {string} sutraNum
 * @returns {Promise<object>}
 */
async function fetchSutraInfoFromOneVolJson(sutraNum) {
    try {
        const response = await fetch('./data/oneVolSutra.json');
        if (!response.ok) {
            console.error('加载 oneVolSutra.json 失败');
            return null;
        }
        
        const data = await response.json();
        const sutraIndex = parseInt(sutraNum, 10);
        
        // 获取卷名（data 是数组，下标就是经号）
        const rollName = data[sutraIndex] || '';
        
        // 从 index.html 获取经题
        const title = await fetchSutraTitleFromIndex(sutraNum);
        
        return {
            title: title || `经 ${sutraNum}`,
            rollName: rollName,  // 单卷经的卷名
            start: '',
            end: '',
            rolls: []
        };
    } catch (e) {
        console.error('从 oneVolSutra.json 获取卷名失败:', e);
        return null;
    }
}

/**
 * 从 index.html 获取经题
 * @param {string} sutraNum
 * @returns {Promise<string>}
 */
async function fetchSutraTitleFromIndex(sutraNum) {
    try {
        const htmlText = await getIndexHtml();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');

        const rows = doc.querySelectorAll('table tr');
        for (const row of rows) {
            const cells = row.querySelectorAll('td');
            if (cells.length < 2) continue;

            const numCell = cells[0].textContent.trim();
            if (numCell !== sutraNum) continue;

            const link = cells[1].querySelector('a');
            if (link) {
                let title = link.textContent.trim();
                title = title.replace(/一卷$/, '');
                return title;
            }
        }
    } catch (e) {
        console.error('从 index.html 获取经题失败:', e);
    }
    return null;
}

/**
 * 解析 idx.html 内容
 * 说明：现已改为优先加载 data/vols/sutraInfo.json（657 个 idx.html 保留作核对数据源），
 * 本函数保留但不主动调用，供核对/恢复时使用。
 * @param {string} htmlText
 * @returns {object}
 */
function parseIdxHtml(htmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');

    // 经名
    const titleLink = doc.querySelector('h1 a');
    const title = titleLink ? titleLink.textContent.trim() : '';

    // 封面起止页
    let start = '', end = '';
    if (titleLink) {
        const href = titleLink.getAttribute('href');
        const startMatch = href.match(/start=(\d+)/);
        const endMatch = href.match(/end=(\d+)/);
        if (startMatch) start = startMatch[1];
        if (endMatch) end = endMatch[1];
    }

    // 提取所有卷
    const rolls = [];
    const entries = doc.querySelectorAll('.entry a[href*="sutra.html"]');

    entries.forEach(link => {
        const titleText = link.textContent.trim();
        if (titleText === '封面') return;

        const href = link.getAttribute('href');
        const idxMatch = href.match(/idx=(\d+)/);
        if (idxMatch) {
            rolls.push({
                title: titleText,
                idx: idxMatch[1]
            });
        }
    });

    return { title, start, end, rolls };
}

/**
 * 获取 index.html 内容（依赖浏览器 HTTP 缓存）
 */
async function getIndexHtml() {
    const response = await fetch('./index.html');
    return await response.text();
}

/**
 * 从 index.html 获取单卷经的经名（保留用于降级）
 * @param {string} sutraNum
 * @returns {Promise<object>}
 */
async function fetchSutraInfoFromIndex(sutraNum) {
    try {
        const htmlText = await getIndexHtml();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');

        const rows = doc.querySelectorAll('table tr');
        for (const row of rows) {
            const cells = row.querySelectorAll('td');
            if (cells.length < 2) continue;

            const numCell = cells[0].textContent.trim();
            if (numCell !== sutraNum) continue;

            const link = cells[1].querySelector('a');
            if (link) {
                let title = link.textContent.trim();
                title = title.replace(/一卷$/, '');

                const href = link.getAttribute('href');
                const startMatch = href.match(/start=(\d+)/);
                const endMatch = href.match(/end=(\d+)/);

                return {
                    title: title,
                    start: startMatch ? startMatch[1] : '',
                    end: endMatch ? endMatch[1] : '',
                    rolls: []
                };
            }
        }
    } catch (e) {
        console.error('从 index.html 获取经名失败:', e);
    }

    return null;
}

/**
 * 根据 idx 获取卷名
 * @param {Array} rolls - 卷列表
 * @param {string} idx - 当前 idx
 * @returns {string}
 */
export function getRollTitle(rolls, idx) {
    if (!rolls || rolls.length === 0) return '';
    const roll = rolls.find(r => r.idx === idx);
    return roll ? roll.title : '';
}

/**
 * 从 URL 参数获取经号
 * @returns {string|null}
 */
export function getSutraNumFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('sutra');
}
