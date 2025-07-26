// 内容脚本 - 在网页中运行的脚本

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getCurrentDomain') {
        // 获取当前页面的域名
        const domain = window.location.hostname;
        sendResponse({domain: domain});
    }
    
    if (request.action === 'highlightDomains') {
        // 高亮显示页面中的域名（可选功能）
        highlightDomainsOnPage(request.domains);
        sendResponse({success: true});
    }
});

// 高亮显示页面中的域名
function highlightDomainsOnPage(domains) {
    if (!domains || domains.length === 0) return;
    
    // 创建正则表达式来匹配域名
    const domainPattern = domains.map(domain => 
        domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    ).join('|');
    
    const regex = new RegExp(`\\b(${domainPattern})\\b`, 'gi');
    
    // 遍历页面中的文本节点
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    const textNodes = [];
    let node;
    
    while (node = walker.nextNode()) {
        if (node.nodeValue.trim() && regex.test(node.nodeValue)) {
            textNodes.push(node);
        }
    }
    
    // 高亮匹配的域名
    textNodes.forEach(textNode => {
        const parent = textNode.parentNode;
        if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE') {
            return; // 跳过脚本和样式标签
        }
        
        const highlightedHTML = textNode.nodeValue.replace(regex, 
            '<span style="background-color: yellow; padding: 2px; border-radius: 3px;">$1</span>'
        );
        
        if (highlightedHTML !== textNode.nodeValue) {
            const wrapper = document.createElement('span');
            wrapper.innerHTML = highlightedHTML;
            parent.replaceChild(wrapper, textNode);
        }
    });
}

// 添加一个浮动按钮来快速访问扩展（可选）
function addFloatingButton() {
    // 检查是否已经添加了按钮
    if (document.getElementById('crtsh-floating-btn')) {
        return;
    }
    
    const button = document.createElement('div');
    button.id = 'crtsh-floating-btn';
    button.innerHTML = '🔍';
    button.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        background-color: #4CAF50;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 10000;
        font-size: 20px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
    `;
    
    button.addEventListener('mouseenter', () => {
        button.style.transform = 'scale(1.1)';
    });
    
    button.addEventListener('mouseleave', () => {
        button.style.transform = 'scale(1)';
    });
    
    button.addEventListener('click', () => {
        // 发送消息给background script来打开popup
        chrome.runtime.sendMessage({
            action: 'openPopup',
            domain: window.location.hostname
        });
    });
    
    document.body.appendChild(button);
}

// 页面加载完成后添加浮动按钮（可选，可以通过设置控制）
// addFloatingButton();