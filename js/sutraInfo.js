// js/sutraInfo.js

/**
 * 根据 sutra 编号获取卷信息
 * @param {string} sutraNum - 经号，如 '86'
 * @returns {Promise<{title: string, rolls: Array, start: string, end: string}>}
 */
export async function fetchSutraInfo(sutraNum) {
    if (!sutraNum) return null;
    
    try {
        const response = await fetch(`/public/sutra${sutraNum}.idx`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const htmlText = await response.text();
        return parseIdxHtml(htmlText);
    } catch (e) {
        console.error('获取经卷信息失败:', e);
        return null;
    }
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

/**
 * 根据 idx 获取卷名
 * @param {Array} rolls - 卷列表
 * @param {string} idx - 当前 idx
 * @returns {string}
 */
export function getRollTitle(rolls, idx) {
    const roll = rolls.find(r => r.idx === idx);
    return roll ? roll.title : '';
}
