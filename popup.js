// Crt.sh API 类
class CrtshAPI {
    async search(domain, wildcard = false, expired = true) {
        // 构建查询域名
        let queryDomain = domain;
        if (wildcard && !domain.includes('%')) {
            queryDomain = `%.${domain}`;
        }
        
        let baseUrl = `https://crt.sh/?q=${encodeURIComponent(queryDomain)}&output=json`;
        
        if (!expired) {
            baseUrl += "&exclude=expired";
        }
        
        try {
            const response = await fetch(baseUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const text = await response.text();
            
            if (!text.trim()) {
                return [];
            }
            
            try {
                return JSON.parse(text);
            } catch (parseError) {
                // 处理可能的JSON格式问题
                const fixedJson = `[${text.replace(/}{/g, '},{')}]`;
                return JSON.parse(fixedJson);
            }
        } catch (error) {
            console.error('搜索错误:', error);
            throw error;
        }
    }
}

// DOM 元素
const currentDomainDiv = document.getElementById('currentDomain');
const autoSearchBtn = document.getElementById('autoSearchBtn');
const domainInput = document.getElementById('domain');
const manualSearchBtn = document.getElementById('manualSearchBtn');
const expiredCheckbox = document.getElementById('expired');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const resultsDiv = document.getElementById('results');

// 全局变量
let currentPageDomain = '';
let currentRootDomain = '';

// 创建 API 实例
const crtshAPI = new CrtshAPI();

// 提取一级域名函数
function extractRootDomain(hostname) {
    if (!hostname) return '';
    
    // 移除www前缀
    hostname = hostname.replace(/^www\./, '');
    
    // 常见的二级域名后缀
    const secondLevelDomains = [
        'com.cn', 'net.cn', 'org.cn', 'gov.cn', 'edu.cn',
        'co.uk', 'org.uk', 'ac.uk', 'gov.uk',
        'co.jp', 'or.jp', 'ne.jp', 'go.jp',
        'com.au', 'net.au', 'org.au', 'edu.au',
        'co.kr', 'or.kr', 'ne.kr'
    ];
    
    const parts = hostname.split('.');
    
    // 如果只有一个部分，直接返回
    if (parts.length <= 1) return hostname;
    
    // 检查是否包含二级域名后缀
    for (const suffix of secondLevelDomains) {
        if (hostname.endsWith('.' + suffix)) {
            const suffixParts = suffix.split('.');
            const domainParts = parts.slice(-(suffixParts.length + 1));
            return domainParts.join('.');
        }
    }
    
    // 默认情况：返回最后两个部分
    return parts.slice(-2).join('.');
}

// 自动搜索当前网站
async function autoSearchCertificates() {
    if (!currentRootDomain) {
        showError('无法获取当前网站域名');
        return;
    }
    
    await searchCertificates(currentRootDomain, false); // 不使用通配符，只查询一级域名
}

// 手动搜索
async function manualSearchCertificates() {
    const domain = domainInput.value.trim();
    
    if (!domain) {
        showError('请输入域名');
        return;
    }
    
    // 提取一级域名
    const rootDomain = extractRootDomain(domain);
    await searchCertificates(rootDomain, false); // 不使用通配符，只查询一级域名
}

// 通用搜索函数
async function searchCertificates(domain, wildcard = false) {
    if (!domain) {
        showError('请提供有效域名');
        return;
    }
    
    // 重置UI
    hideError();
    hideResults();
    showLoading();
    disableAllButtons();
    
    try {
        const results = await crtshAPI.search(
            domain,
            wildcard,
            expiredCheckbox.checked
        );
        
        hideLoading();
        enableAllButtons();
        
        if (!results || results.length === 0) {
            showError('未找到证书记录');
            return;
        }
        
        displayResults(results, domain);
        
    } catch (error) {
        hideLoading();
        enableAllButtons();
        showError(`搜索失败: ${error.message}`);
    }
}

// 显示结果
function displayResults(results, searchedDomain) {
    resultsDiv.innerHTML = '';
    
    // 添加搜索信息
    const searchInfo = document.createElement('div');
    searchInfo.className = 'search-info';
    searchInfo.innerHTML = `<strong>搜索域名:</strong> ${escapeHtml(searchedDomain)} (共找到 ${results.length} 条记录)`;
    resultsDiv.appendChild(searchInfo);
    
    // 去重域名
    const uniqueDomains = new Set();
    const processedResults = [];
    
    results.forEach(cert => {
        if (cert.name_value) {
            const domains = cert.name_value.split('\n');
            domains.forEach(domain => {
                domain = domain.trim();
                if (domain && !uniqueDomains.has(domain)) {
                    uniqueDomains.add(domain);
                    processedResults.push({
                        domain: domain,
                        issuer: cert.issuer_name,
                        notBefore: cert.not_before,
                        minEntryTimestamp: cert.min_entry_timestamp
                    });
                }
            });
        }
    });
    
    // 按域名排序
    processedResults.sort((a, b) => a.domain.localeCompare(b.domain));
    
    // 显示结果统计
    const statsDiv = document.createElement('div');
    statsDiv.className = 'results-stats';
    statsDiv.innerHTML = `找到 ${processedResults.length} 个唯一域名`;
    resultsDiv.appendChild(statsDiv);
    
    // 显示结果
    processedResults.forEach(result => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        
        resultItem.innerHTML = `
            <div class="domain-name">${escapeHtml(result.domain)}</div>
            <div class="cert-info">
                <div>颁发者: ${escapeHtml(result.issuer || 'N/A')}</div>
                <div>生效时间: ${result.notBefore || 'N/A'}</div>
            </div>
        `;
        
        resultsDiv.appendChild(resultItem);
    });
    
    resultsDiv.style.display = 'block';
}

// 工具函数
function showLoading() {
    loadingDiv.style.display = 'block';
}

function hideLoading() {
    loadingDiv.style.display = 'none';
}

function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function hideError() {
    errorDiv.style.display = 'none';
}

function hideResults() {
    resultsDiv.style.display = 'none';
}

function disableAllButtons() {
    autoSearchBtn.disabled = true;
    manualSearchBtn.disabled = true;
}

function enableAllButtons() {
    autoSearchBtn.disabled = false;
    manualSearchBtn.disabled = false;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 事件监听器
autoSearchBtn.addEventListener('click', autoSearchCertificates);
manualSearchBtn.addEventListener('click', manualSearchCertificates);

domainInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        manualSearchCertificates();
    }
});

// 页面加载时获取当前标签页的域名
chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0] && tabs[0].url) {
        try {
            const url = new URL(tabs[0].url);
            if (url.hostname && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
                currentPageDomain = url.hostname;
                currentRootDomain = extractRootDomain(url.hostname);
                
                // 显示当前域名
                currentDomainDiv.innerHTML = `
                    <div><strong>完整域名:</strong> ${escapeHtml(currentPageDomain)}</div>
                    <div><strong>一级域名:</strong> ${escapeHtml(currentRootDomain)}</div>
                `;
                
                // 启用自动搜索按钮
                autoSearchBtn.disabled = false;
            } else {
                currentDomainDiv.textContent = '当前页面不是有效的网站域名';
                autoSearchBtn.disabled = true;
            }
        } catch (e) {
            currentDomainDiv.textContent = '无法解析当前页面URL';
            autoSearchBtn.disabled = true;
        }
    } else {
        currentDomainDiv.textContent = '无法获取当前页面信息';
        autoSearchBtn.disabled = true;
    }
});