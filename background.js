// 后台脚本 - 处理扩展的后台任务

// 安装时的初始化
chrome.runtime.onInstalled.addListener(() => {
    console.log('Crt.sh 扩展已安装');
});

// 处理来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'searchCertificates') {
        // 可以在这里添加额外的后台处理逻辑
        searchCertificates(request.domain, request.options)
            .then(results => sendResponse({success: true, data: results}))
            .catch(error => sendResponse({success: false, error: error.message}));
        
        return true; // 保持消息通道开放以进行异步响应
    }
});

// 证书搜索函数
async function searchCertificates(domain, options = {}) {
    const { wildcard = true, expired = true } = options;
    
    let baseUrl = `https://crt.sh/?q=${encodeURIComponent(domain)}&output=json`;
    
    if (!expired) {
        baseUrl += "&exclude=expired";
    }
    
    if (wildcard && !domain.includes('%')) {
        domain = `%.${domain}`;
        baseUrl = `https://crt.sh/?q=${encodeURIComponent(domain)}&output=json`;
        if (!expired) {
            baseUrl += "&exclude=expired";
        }
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
        console.error('证书搜索错误:', error);
        throw error;
    }
}

// 右键菜单功能
chrome.contextMenus.create({
    id: "searchCertificates",
    title: "搜索 '%s' 的证书",
    contexts: ["selection"]
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "searchCertificates") {
        // 可以在这里处理右键菜单点击事件
        console.log('搜索选中的域名:', info.selectionText);
    }
});