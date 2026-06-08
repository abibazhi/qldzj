// js/sutraInfo.js

/**
 * 根据 sutra 编号获取卷信息
 * @param {string} sutraNum - 经号，如 '86'
 * @returns {Promise<{title: string, rolls: Array, start: string, end: string}>}
 */
export async function fetchSutraInfo(sutraNum) {
    if (!sutraNum) return null;
    
    const urlParams = new URLSearchParams(window.location.search);
    const hasIdx = urlParams.has('idx');
    
    // 没有 idx 参数 = 单卷经（直接从 index.html 跳转过来）
    if (!hasIdx) {
        return fetchSutraInfoFromIndex(sutraNum);
    }
    
    // 有 idx 参数 = 多卷经，尝试加载 idx 文件
    try {
        const response = await fetch(`/public/sutra${sutraNum}.idx`);
        if (response.ok) {
            const htmlText = await response.text();
            return parseIdxHtml(htmlText);
        }
    } catch (e) {
        console.log(`sutra${sutraNum}.idx 加载失败，尝试从 index.html 获取`);
    }
    
    // 降级：从 index.html 获取
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
    const response = await fetch('/index.html');
    return await response.text();
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
