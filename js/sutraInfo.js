// js/sutraInfo.js

/**
 * 根据 sutra 编号获取卷信息
 * @param {string} sutraNum - 经号，如 '86'
 * @returns {Promise<{title: string, rolls: Array, start: string, end: string}>}
 */
export async function fetchSutraInfo(sutraNum) {
    if (!sutraNum) return null;
    
    // 先尝试加载 idx 文件（多卷经）
    try {
        const response = await fetch(`/public/sutra${sutraNum}.idx`);
        if (response.ok) {
            const htmlText = await response.text();
            return parseIdxHtml(htmlText);
        }
    } catch (e) {
        console.log(`sutra${sutraNum}.idx 不存在，尝试从 index.html 获取`);
    }
    
    // 降级：从 index.html 获取经名（单卷经）
    return fetchSutraInfoFromIndex(sutraNum);
}

/**
 * 解析 idx.html 内容
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
    
    // 提取所有卷（包括序）
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

// 缓存 index.html 内容
let indexHtmlCache = null;

/**
 * 获取 index.html 内容（带缓存）
 */
async function getIndexHtml() {
    if (indexHtmlCache) return indexHtmlCache;
    const response = await fetch('/index.html');
    indexHtmlCache = await response.text();
    return indexHtmlCache;
}

/**
 * 从 index.html 获取单卷经的经名
 * @param {string} sutraNum 
 * @returns {Promise<object>}
 */
async function fetchSutraInfoFromIndex(sutraNum) {
    try {
        const htmlText = await getIndexHtml();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        
        // 查找对应经号的链接
        const rows = doc.querySelectorAll('table tr');
        for (const row of rows) {
            const cells = row.querySelectorAll('td');
            if (cells.length < 2) continue;
            
            const numCell = cells[0].textContent.trim();
            if (numCell !== sutraNum) continue;
            
            const link = cells[1].querySelector('a');
            if (link) {
                const title = link.textContent.trim();
                // 提取 start 和 end
                const href = link.getAttribute('href');
                const startMatch = href.match(/start=(\d+)/);
                const endMatch = href.match(/end=(\d+)/);
                
                return {
                    title: title,
                    start: startMatch ? startMatch[1] : '',
                    end: endMatch ? endMatch[1] : '',
                    rolls: []  // 单卷经没有卷列表
                };
            }
        }
    } catch (e) {
        console.error('从 index.html 获取经名失败:', e);
    }
    
    return null;
}

/**
 * 根据 idx 获取卷名（单卷经返回空字符串）
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
