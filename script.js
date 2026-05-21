// DOM 元素
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');
const clearChatBtn = document.getElementById('clearChatBtn');
const themeToggle = document.getElementById('themeToggle');

const apiKeyInput = document.getElementById('apiKeyInput');
const baseUrlInput = document.getElementById('baseUrlInput');
const modelInput = document.getElementById('modelInput');
const saveConfigBtn = document.getElementById('saveConfigBtn');

const sentimentText = document.getElementById('sentimentText');
const analyzeBtn = document.getElementById('analyzeBtn');
const sentimentResult = document.getElementById('sentimentResult');
const sentimentTokensSpan = document.getElementById('sentimentTokens');

const summaryText = document.getElementById('summaryText');
const summarizeBtn = document.getElementById('summarizeBtn');
const summaryResult = document.getElementById('summaryResult');
const summaryTokensSpan = document.getElementById('summaryTokens');

const imagePrompt = document.getElementById('imagePrompt');
const generateImageBtn = document.getElementById('generateImageBtn');
const imageResult = document.getElementById('imageResult');

const totalTokensSpan = document.getElementById('totalTokens');

// 全局状态
let conversationHistory = [];   // 存储对话 { role, content }
let totalTokensUsed = 0;
let currentConfig = {
    apiKey: '',
    baseUrl: 'https://api.openai.com',
    model: 'gpt-3.5-turbo'
};

// 初始化: 加载本地配置和历史
function loadFromStorage() {
    const savedConfig = localStorage.getItem('ai_toolkit_config');
    if (savedConfig) {
        try {
            const config = JSON.parse(savedConfig);
            currentConfig = config;
            apiKeyInput.value = config.apiKey || '';
            baseUrlInput.value = config.baseUrl || 'https://api.openai.com';
            modelInput.value = config.model || 'gpt-3.5-turbo';
        } catch(e) { console.error(e); }
    } else {
        // 默认示例值(演示)
        baseUrlInput.value = 'https://api.openai.com';
        modelInput.value = 'gpt-3.5-turbo';
    }
    
    const savedHistory = localStorage.getItem('ai_toolkit_chat_history');
    if (savedHistory) {
        try {
            conversationHistory = JSON.parse(savedHistory);
            renderChatHistory();
        } catch(e) {}
    }
    
    const savedTokens = localStorage.getItem('ai_toolkit_total_tokens');
    if (savedTokens) {
        totalTokensUsed = parseInt(savedTokens) || 0;
        updateTokenDisplay();
    }
}

function saveConfig() {
    currentConfig = {
        apiKey: apiKeyInput.value.trim(),
        baseUrl: baseUrlInput.value.trim(),
        model: modelInput.value.trim()
    };
    localStorage.setItem('ai_toolkit_config', JSON.stringify(currentConfig));
    // 显示保存成功提示
    const btn = saveConfigBtn;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> 已保存';
    setTimeout(() => {
        btn.innerHTML = originalHtml;
    }, 1500);
}

function updateTokenDisplay() {
    totalTokensSpan.innerText = totalTokensUsed.toLocaleString();
    localStorage.setItem('ai_toolkit_total_tokens', totalTokensUsed);
}

function addTokenUsage(usage) {
    if (usage && usage.total_tokens) {
        totalTokensUsed += usage.total_tokens;
        updateTokenDisplay();
        return usage.total_tokens;
    }
    return 0;
}

function saveChatHistory() {
    localStorage.setItem('ai_toolkit_chat_history', JSON.stringify(conversationHistory));
}

function renderChatHistory() {
    chatMessages.innerHTML = '';
    if (conversationHistory.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'text-center text-gray-400 py-10';
        emptyDiv.innerHTML = '<i class="fas fa-comment-dots text-3xl mb-2 block"></i>暂无对话，开始聊天吧！';
        chatMessages.appendChild(emptyDiv);
        return;
    }
    conversationHistory.forEach(msg => {
        addMessageToUI(msg.role, msg.content);
    });
    scrollChatToBottom();
}

function addMessageToUI(role, content, isStream = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'} message-fade-in`;
    const bubbleClass = role === 'user' 
        ? 'bg-blue-500 text-white rounded-2xl rounded-tr-sm' 
        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-2xl rounded-tl-sm';
    messageDiv.innerHTML = `
        <div class="max-w-[80%] ${bubbleClass} px-4 py-2 shadow-sm">
            <div class="text-sm whitespace-pre-wrap break-words">${escapeHtml(content)}</div>
        </div>
    `;
    chatMessages.appendChild(messageDiv);
    scrollChatToBottom();
}

function scrollChatToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function sendChat() {
    const userMessage = chatInput.value.trim();
    if (!userMessage) return;
    if (!currentConfig.apiKey) {
        alert('请先配置 API Key');
        return;
    }
    // 添加用户消息
    conversationHistory.push({ role: 'user', content: userMessage });
    saveChatHistory();
    addMessageToUI('user', userMessage);
    chatInput.value = '';
    
    // 添加加载占位
    const loadingId = 'loading-' + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'flex justify-start message-fade-in';
    loadingDiv.id = loadingId;
    loadingDiv.innerHTML = `<div class="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-tl-sm px-4 py-2"><i class="fas fa-spinner fa-pulse"></i> AI思考中...</div>`;
    chatMessages.appendChild(loadingDiv);
    scrollChatToBottom();
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: conversationHistory,
                apiKey: currentConfig.apiKey,
                baseUrl: currentConfig.baseUrl,
                model: currentConfig.model
            })
        });
        const data = await response.json();
        // 移除loading
        document.getElementById(loadingId)?.remove();
        if (data.success) {
            const assistantMsg = data.data;
            conversationHistory.push({ role: 'assistant', content: assistantMsg });
            saveChatHistory();
            addMessageToUI('assistant', assistantMsg);
            if (data.usage) {
                addTokenUsage(data.usage);
            }
        } else {
            addMessageToUI('assistant', `错误: ${data.error || '请求失败'}`);
        }
    } catch (err) {
        document.getElementById(loadingId)?.remove();
        addMessageToUI('assistant', `网络错误: ${err.message}`);
    }
}

async function callTool(endpoint, text, resultSpan, tokensSpan, successPrefix = '') {
    if (!currentConfig.apiKey) {
        alert('请先配置 API Key');
        return;
    }
    if (!text) {
        resultSpan.innerText = '请输入内容';
        return;
    }
    resultSpan.innerText = '处理中...';
    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text,
                apiKey: currentConfig.apiKey,
                baseUrl: currentConfig.baseUrl,
                model: currentConfig.model
            })
        });
        const data = await res.json();
        if (data.success) {
            resultSpan.innerText = successPrefix + data.data.slice(0, 120);
            if (data.usage) {
                const tokensUsed = addTokenUsage(data.usage);
                tokensSpan.innerText = `本次消耗 ${tokensUsed} tokens`;
            } else {
                tokensSpan.innerText = '';
            }
        } else {
            resultSpan.innerText = `失败: ${data.error}`;
            tokensSpan.innerText = '';
        }
    } catch (err) {
        resultSpan.innerText = `请求错误: ${err.message}`;
        tokensSpan.innerText = '';
    }
}

async function generateImage() {
    const prompt = imagePrompt.value.trim();
    if (!prompt) {
        alert('请输入图像描述');
        return;
    }
    if (!currentConfig.apiKey) {
        alert('请先配置 API Key');
        return;
    }
    imageResult.innerHTML = '<div class="text-gray-400 text-sm"><i class="fas fa-spinner fa-pulse"></i> 生成中...</div>';
    try {
        const response = await fetch('/api/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: prompt,
                apiKey: currentConfig.apiKey,
                baseUrl: currentConfig.baseUrl,
                model: currentConfig.model === 'gpt-3.5-turbo' ? 'dall-e-2' : currentConfig.model
            })
        });
        const data = await response.json();
        if (data.success) {
            imageResult.innerHTML = `<img src="${data.data}" class="max-w-full rounded-lg shadow-md" alt="Generated">`;
        } else {
            imageResult.innerHTML = `<div class="text-red-400 text-sm">生成失败: ${data.error}</div>`;
        }
    } catch (err) {
        imageResult.innerHTML = `<div class="text-red-400">错误: ${err.message}</div>`;
    }
}

function clearChat() {
    if (confirm('清空所有对话记录？')) {
        conversationHistory = [];
        saveChatHistory();
        renderChatHistory();
    }
}

// 暗黑模式
function initTheme() {
    if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}
function toggleTheme() {
    if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }
}

// 事件绑定
sendChatBtn.addEventListener('click', sendChat);
chatInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') sendChat();
});
clearChatBtn.addEventListener('click', clearChat);
themeToggle.addEventListener('click', toggleTheme);
saveConfigBtn.addEventListener('click', saveConfig);
analyzeBtn.addEventListener('click', () => callTool('/api/analyze', sentimentText.value, sentimentResult, sentimentTokensSpan, '🎭 结果: '));
summarizeBtn.addEventListener('click', () => callTool('/api/summarize', summaryText.value, summaryResult, summaryTokensSpan, '📄 摘要: '));
generateImageBtn.addEventListener('click', generateImage);

// 启动
loadFromStorage();
initTheme();
renderChatHistory();
updateTokenDisplay();