// js/sutraInfo.js

import { sutraLinks } from '../data/sutra_links.js';

let sutraInfoCachePromise = null; // 共享加载 Promise：全站只 fetch 一次

// 经号 → 经名（经名来源统一为 sutra_links.js：优先繁体经名，回退简体 title）
// sutra_links.js 结构：[经号,start,end,title,translator,mv,alias?,tradTitle?]
// tradTitle 恒为最后一个字段（7字段=[...,trad]，8字段=[...,alias,trad]）
const titleByN = new Map();
for (const s of sutraLinks) {
    if (typeof s[0] !== 'number') continue;
    const last = s[s.length - 1];
    const title = typeof last === 'string' && last ? last : s[3];
    titleByN.set(s[0], title);
}

/**
 * 根据 sutra 编号获取卷信息
 * @param {string} sutraNum - 经号，如 '424'
 * @returns {Promise<{title: string, rolls: Array, rollName: string}>}
 */
export async function fetchSutraInfo(sutraNum) {
    if (!sutraNum) return null;

    // 统一从卷表 sutraVols.json 获取（覆盖多卷+单卷全部经，一次 fetch）
    const info = await fetchSutraInfoFromVolsJson(sutraNum);
    if (info) return info;

    // 降级：从 index.html 获取
    return fetchSutraInfoFromIndex(sutraNum);
}

/**
 * 从 data/vols/sutraVols.json 获取经卷信息（全量 JSON 只加载一次）
 * 卷表结构：[{ n, r:[{t,i}] }]，多卷经 r=卷列表，单卷经 r=[{t:函号,i:start}]
 * @param {string} sutraNum
 * @returns {Promise<object|null>}
 */
async function fetchSutraInfoFromVolsJson(sutraNum) {
    try {
        if (!sutraInfoCachePromise) {
            sutraInfoCachePromise = fetch('./data/vols/sutraVols.json').then(async (res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const arr = await res.json();
                const map = {};
                for (const item of arr) map[item.n] = item;
                return map;
            }).catch(e => {
                console.error('加载 data/vols/sutraVols.json 失败:', e);
                sutraInfoCachePromise = null; // 允许重试
                return null;
            });
        }
        const map = await sutraInfoCachePromise;
        if (!map) return null;

        const key = parseInt(sutraNum, 10);
        const item = map[key];
        if (!item) return null;

        // 单卷经 r 只有 1 条（函号卷名），阅读页需展示 rollName
        const rolls = item.r || [];
        const rollName = rolls.length === 1 ? rolls[0].t : '';

        return {
            title: titleByN.get(key) || '',
            rollName,
            rolls
        };
    } catch (e) {
        console.error('从 data/vols/sutraVols.json 获取经卷信息失败:', e);
        return null;
    }
}

/**
 * 解析 idx.html 内容
 * 说明：现已改为优先加载 data/vols/sutraVols.json（657 个 idx.html 保留作核对数据源），
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
