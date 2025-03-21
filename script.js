document.addEventListener('DOMContentLoaded', function() {
    // 添加自定义头像样式 - 这部分添加在函数最开始部分
    const avatarStyle = document.createElement('style');
    avatarStyle.textContent = `
        .logo-icon {
            background-image: url('https://img20.360buyimg.com/openfeedback/jfs/t1/275291/18/7473/12144/67dd638bF07767365/4cfd58139b349fd4.png') !important;
            background-size: contain;
            background-position: center;
            background-repeat: no-repeat;
        }
        
        .bot-avatar {
            background-image: url('https://img20.360buyimg.com/openfeedback/jfs/t1/275291/18/7473/12144/67dd638bF07767365/4cfd58139b349fd4.png') !important;
            background-size: contain;
            background-position: center;
            background-repeat: no-repeat;
        }
    `;
    document.head.appendChild(avatarStyle);
    
    const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-btn');
    const newChatButton = document.getElementById('new-chat');
    const settingsButton = document.getElementById('settings-btn');
    const themeToggle = document.getElementById('theme-toggle');
    
    // 默认视频设置
    let videoSettings = {
        resolution: "512x512", // 默认分辨率
        duration: 4.0,         // 默认时长(秒)
        fps: 24,               // 默认帧率
        audio: "default",      // 默认音效
        steps: 28,             // 默认步数
        seed: -1               // 随机种子
    };
    
    // 设置当前日期
    const currentDateElem = document.getElementById('current-date');
    if (currentDateElem) {
        const now = new Date();
        currentDateElem.textContent = now.toLocaleDateString('zh-CN');
    }
    
    // 确保highlight.js加载
    function ensureHighlightJsLoaded() {
        if (!window.hljs) {
            console.warn("highlight.js 未加载，尝试动态加载...");
            const script = document.createElement('script');
            script.src = "https://cdn.jsdelivr.net/npm/highlight.js@11.7.0/lib/highlight.min.js";
            document.head.appendChild(script);
            
            return new Promise((resolve) => {
                script.onload = () => {
                    console.log("highlight.js 已成功加载");
                    resolve();
                };
                script.onerror = () => {
                    console.error("highlight.js 加载失败");
                    resolve(); // 即使失败也继续
                };
            });
        }
        return Promise.resolve();
    }
    
    // 在页面加载时检查
    ensureHighlightJsLoaded();
    
    // 配置marked.js以支持语法高亮
    marked.setOptions({
        highlight: function(code, lang) {
            try {
                if (lang && window.hljs && window.hljs.getLanguage(lang)) {
                    return window.hljs.highlight(code, { language: lang }).value;
                } else if (window.hljs) {
                    return window.hljs.highlightAuto(code).value;
                }
            } catch (e) {
                console.error("代码高亮出错:", e);
            }
            // 如果hljs未加载或出错，返回原始代码
            return code;
        },
        breaks: true
    });
    
    // 使用CryptoJS加密API密钥
    function decryptApiKey(encryptedKey, password) {
        try {
            const bytes = CryptoJS.AES.decrypt(encryptedKey, password);
            return bytes.toString(CryptoJS.enc.Utf8);
        } catch (error) {
            console.error("解密错误:", error);
            return "";
        }
    }
    
    // 加密API密钥 
    const encryptedApiKey = "U2FsdGVkX1/7gqRQIGh6xSHdPj06YmsJhK9FrfN6hKEGUx1h7B+psBxjbDaZAZxz"+
                            "2z8CCTdyOufgQ4veDVmQ4SKSFCfa1EeppeNauzeyuMA=";
    let decryptedApiKey = null;
    
    // 主题切换功能
    themeToggle.addEventListener('click', function() {
        document.body.classList.toggle('dark-theme');
        const icon = this.querySelector('i');
        if (icon.classList.contains('ri-sun-line')) {
            icon.classList.remove('ri-sun-line');
            icon.classList.add('ri-moon-line');
        } else {
            icon.classList.remove('ri-moon-line');
            icon.classList.add('ri-sun-line');
        }
    });
    
    // 调整textarea高度
    userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 150) + 'px';
    });
    
    // 按Enter键发送消息
    userInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // 点击发送按钮
    sendButton.addEventListener('click', sendMessage);
    
    // 点击设置按钮
    settingsButton.addEventListener('click', showSettingsModal);
    
    // 显示视频设置弹窗
    function showSettingsModal() {
        // 创建模态对话框
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        
        const modalContainer = document.createElement('div');
        modalContainer.className = 'modal-container settings-modal';
        
        modalContainer.innerHTML = `
            <div class="modal-header">
                <h3>视频设置</h3>
                <button class="close-btn"><i class="ri-close-line"></i></button>
            </div>
            <div class="modal-body">
                <div class="settings-note">
                    <p><i class="ri-information-line"></i> CogVideoX-Flash模型仅支持音效和种子设置，其他参数不会影响生成结果。</p>
                </div>
                
                <div class="settings-group">
                    <label for="audio">音效:</label>
                    <select id="audio" class="settings-select">
                        <option value="none" ${videoSettings.audio === "none" ? "selected" : ""}>无音效</option>
                        <option value="default" ${videoSettings.audio === "default" ? "selected" : ""}>默认音效</option>
                    </select>
                </div>
                
                <div class="settings-group">
                    <label for="seed">随机种子 (可选):</label>
                    <input type="number" id="seed" class="settings-input" placeholder="留空为随机" value="${videoSettings.seed === -1 ? '' : videoSettings.seed}">
                    <small>设置相同的种子可以生成相似的视频</small>
                </div>
            </div>
            <div class="modal-footer">
                <button id="save-settings" class="save-btn">保存设置</button>
            </div>
        `;
        
        // 添加到文档
        modalOverlay.appendChild(modalContainer);
        document.body.appendChild(modalOverlay);
        
        // 获取元素
        const closeBtn = modalContainer.querySelector('.close-btn');
        const saveBtn = document.getElementById('save-settings');
        
        // 关闭弹窗
        closeBtn.addEventListener('click', function() {
            document.body.removeChild(modalOverlay);
        });
        
        // 保存设置
        saveBtn.addEventListener('click', function() {
            const audio = document.getElementById('audio').value;
            const seedValue = document.getElementById('seed').value.trim();
            
            videoSettings = {
                resolution: "512x512",
                duration: 4.0,
                fps: 24,
                audio,
                steps: 28,
                seed: seedValue === '' ? -1 : parseInt(seedValue)
            };
            
            // 关闭弹窗
            document.body.removeChild(modalOverlay);
        });
    }
    
    // 新建对话
    newChatButton.addEventListener('click', function() {
        chatContainer.innerHTML = `
            <div class="welcome-message">
                <h2>欢迎使用清言AI视频生成服务</h2>
                <p>这是一个基于CogVideoX-Flash模型的AI视频生成应用，请输入您的描述文本来生成视频。</p>
            </div>
        `;
    });
    
    // 添加用户消息
    function addUserMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message-container', 'user-container');
        messageElement.innerHTML = `
            <div class="avatar user-avatar">
                <i class="ri-user-fill"></i>
            </div>
            <div class="message user-message">
                ${message}
            </div>
        `;
        
        // 删除欢迎消息
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        chatContainer.appendChild(messageElement);
        scrollToBottom();
        
        // 添加出现动画
        setTimeout(() => {
            messageElement.classList.add('appeared');
        }, 50);
    }
    
    // 添加机器人输入指示器
    function addBotTypingIndicator() {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message-container', 'bot-container');
        messageElement.innerHTML = `
            <div class="avatar bot-avatar">
            </div>
            <div class="message bot-message">
                <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        
        chatContainer.appendChild(messageElement);
        scrollToBottom();
        
        return messageElement.querySelector('.bot-message');
    }
    
    // 更新机器人消息为视频
    function updateBotMessageWithVideo(element, videoUrl) {
        // 解析分辨率参数
        const [width, height] = videoSettings.resolution.split('x').map(Number);
        
        element.innerHTML = `
            <div class="video-container">
                <video class="generated-video" width="${width}" height="${height}" controls autoplay loop>
                    <source src="${videoUrl}" type="video/mp4">
                    您的浏览器不支持视频标签。
                </video>
                <div class="video-info">
                    分辨率: ${width}x${height} | 时长: ${videoSettings.duration}秒 | 帧率: ${videoSettings.fps}fps
                    ${videoSettings.audio !== "none" ? ` | 音效: ${videoSettings.audio}` : ''}
                </div>
                <div class="video-controls">
                    <a href="${videoUrl}" download="cogvideo_${Date.now()}.mp4" class="download-btn">
                        <i class="ri-download-line"></i> <span>下载视频</span>
                    </a>
                    <button class="download-btn" onclick="navigator.clipboard.writeText('${videoUrl}')">
                        <i class="ri-file-copy-line"></i> <span>复制链接</span>
                    </button>
                </div>
            </div>
        `;
        
        scrollToBottom();
    }
    
    // 更新机器人消息为等待状态
    function updateBotMessageWithWaiting(element, message) {
        element.innerHTML = `
            <div class="waiting-message">
                <div class="spinner"></div>
                <p>${message}</p>
                <div class="progress-bar">
                    <div class="progress" style="width: 0%"></div>
                </div>
            </div>
        `;
        
        scrollToBottom();
        return element.querySelector('.progress');
    }

    // 更新进度条
    function updateProgressBar(progressElement, percent) {
        if (progressElement) {
            progressElement.style.width = `${percent}%`;
        }
    }

    // 更新机器人消息为错误信息
    function updateBotMessageWithError(element, errorMessage) {
        element.innerHTML = `
            <div class="error-message">
                <i class="ri-error-warning-line"></i>
                <p>${errorMessage}</p>
            </div>
        `;
        
        scrollToBottom();
    }
    
    // 滚动到底部
    function scrollToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    // 获取用户输入的密码并解密API密钥
    async function getDecryptedApiKey() {
        // 如果已经解密过，直接返回
        if (decryptedApiKey) {
            return decryptedApiKey;
        }
        
        // 创建密码输入对话框
        return new Promise((resolve) => {
            // 创建模态对话框
            const modalOverlay = document.createElement('div');
            modalOverlay.className = 'modal-overlay';
            
            const modalContainer = document.createElement('div');
            modalContainer.className = 'modal-container';
            
            modalContainer.innerHTML = `
                <div class="modal-header">
                    <h3>请输入授权码</h3>
                </div>
                <div class="modal-body">
                    <p>请输入管理员向您提供的密码以继续使用</p>
                    <input type="password" id="decrypt-password" class="password-input" placeholder="输入密码...">
                    <div class="error-message" style="display: none; color: #dc3545; margin-top: 10px;"></div>
                </div>
                <div class="modal-footer">
                    <button id="decrypt-button" class="decrypt-button">解密</button>
                </div>
            `;
            
            // 添加到文档
            modalOverlay.appendChild(modalContainer);
            document.body.appendChild(modalOverlay);
            
            // 获取元素
            const passwordInput = document.getElementById('decrypt-password');
            const decryptButton = document.getElementById('decrypt-button');
            const errorMessage = document.querySelector('.error-message');
            
            // 自动聚焦到密码输入框
            passwordInput.focus();
            
            // 点击解密按钮
            const handleDecrypt = () => {
                const password = passwordInput.value.trim();
                if (!password) {
                    errorMessage.textContent = '请输入密码';
                    errorMessage.style.display = 'block';
                    return;
                }
                
                try {
                    // 尝试解密
                    const apiKey = decryptApiKey(encryptedApiKey, password);
                    if (!apiKey) {
                        throw new Error('解密失败，密码可能不正确');
                    }
                    
                    // 解密成功，移除模态框
                    document.body.removeChild(modalOverlay);
                    decryptedApiKey = apiKey; // 保存解密后的密钥
                    resolve(apiKey);
                } catch (error) {
                    errorMessage.textContent = '解密失败，请检查密码是否正确';
                    errorMessage.style.display = 'block';
                    passwordInput.value = '';
                    passwordInput.focus();
                }
            };
            
            // 点击解密按钮
            decryptButton.addEventListener('click', handleDecrypt);
            
            // 按Enter键也可以解密
            passwordInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleDecrypt();
                }
            });
        });
    }
    
    // 发送消息函数
    function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;
        
        // 添加用户消息到聊天容器
        addUserMessage(message);
        
        // 清空输入框并重置高度
        userInput.value = '';
        userInput.style.height = 'auto';
        
        // 添加正在输入指示器
        const botMessageElement = addBotTypingIndicator();
        
        // 调用CogVideoX-Flash API
        fetchVideoFromCogVideoX(message, botMessageElement);
    }
    
    // 调用CogVideoX-Flash API生成视频
    async function fetchVideoFromCogVideoX(prompt, botMessageElement) {
        // 获取解密后的API密钥
        let apiKey;
        try {
            apiKey = await getDecryptedApiKey();
        } catch (error) {
            updateBotMessageWithError(botMessageElement, "API密钥解密失败，无法继续。错误信息: " + error.message);
            return;
        }
        
        // 显示等待消息
        const progressBar = updateBotMessageWithWaiting(botMessageElement, "正在生成视频，这可能需要一些时间...");
        
        try {
            // 请求数据结构 - 根据cogvideox-flash的限制调整参数
            const requestData = {
                prompt: prompt,
                model: "cogvideox-flash",
                with_audio: videoSettings.audio !== "none"
            };
            
            // 如果设置了种子，添加到请求中
            if (videoSettings.seed !== -1) {
                requestData.seed = videoSettings.seed;
            }
            
            console.log("发送API请求数据:", requestData); // 输出请求数据用于调试
            
            // CogVideoX-Flash API端点
            const apiUrl = "https://open.bigmodel.cn/api/paas/v4/videos/generations";
            
            // 使用fetch API发送请求
            const response = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestData)
            });

            const responseData = await response.json();
            
            if (!response.ok) {
                // 针对特定错误代码提供更友好的提示
                if (responseData.error && responseData.error.code === "1301") {
                    throw new Error("内容安全检测：系统检测到输入文本可能包含不安全或敏感内容，请修改您的描述并尝试更加中性的表述。");
                } else {
                    throw new Error(`API请求失败: ${responseData.error?.message || response.status}`);
                }
            }

            console.log("API返回数据:", responseData); // 添加日志输出
            
            // 使用返回的id作为任务ID
            if (responseData.id) {
                const taskId = responseData.id;
                checkVideoGenerationStatus(taskId, apiKey, botMessageElement, progressBar);
            } else {
                throw new Error("未能获取任务ID");
            }
            
        } catch (error) {
            console.error("API请求错误:", error);
            updateBotMessageWithError(botMessageElement, "抱歉，视频生成请求失败。" + error.message);
        }
    }
    
    // 检查视频生成状态
    async function checkVideoGenerationStatus(taskId, apiKey, botMessageElement, progressBar) {
        // 根据官方文档修改状态检查的URL格式
        const statusUrl = `https://open.bigmodel.cn/api/paas/v4/async-result/${taskId}`;
        
        try {
            // 设置轮询间隔
            const checkInterval = setInterval(async () => {
                try {
                    const response = await fetch(statusUrl, {
                        method: "GET",
                        headers: {
                            "Authorization": `Bearer ${apiKey}`
                        }
                    });
                    
                    const statusData = await response.json();
                    console.log("状态检查返回:", statusData); // 添加日志输出
                
                    if (!response.ok) {
                        clearInterval(checkInterval);
                        // 针对特定错误代码提供更友好的提示
                        if (statusData.error && statusData.error.code === "1301") {
                            throw new Error("内容安全检测：系统检测到生成结果可能包含不安全或敏感内容，建议修改您的描述语并避免敏感话题。");
                        } else {
                            throw new Error(`状态检查失败: ${statusData.error?.message || response.status}`);
                        }
                    }
                    
                    // 更新进度条，根据task_status来估算进度
                    if (statusData.task_status) {
                        let progress = 0;
                        if (statusData.task_status === "PROCESSING") {
                            progress = 50; // 处理中估算为50%
                        } else if (statusData.task_status === "SUCCESS") {
                            progress = 100; // 成功时为100%
                        }
                        updateProgressBar(progressBar, progress);
                    }
                    
                    // 检查状态 - 注意文档中状态是SUCCESS而不是SUCCEEDED
                    if (statusData.task_status === "SUCCESS") {
                        clearInterval(checkInterval);
                        // 获取视频URL
                        if (statusData.video_result && statusData.video_result.length > 0) {
                            updateBotMessageWithVideo(botMessageElement, statusData.video_result[0].url);
                        } else {
                            throw new Error("视频生成成功但未找到视频URL");
                        }
                    } else if (statusData.task_status === "FAIL") {
                        clearInterval(checkInterval);
                        let errorMsg = statusData.message || '未知错误';
                        if (statusData.error && statusData.error.code === "1301") {
                            errorMsg = "内容安全检测：系统检测到生成结果可能包含不安全或敏感内容，建议修改您的描述语并避免敏感话题。";
                        }
                        throw new Error(`视频生成失败: ${errorMsg}`);
                    }
                    // 如果状态是PROCESSING，继续轮询
                } catch (error) {
                    clearInterval(checkInterval);
                    updateBotMessageWithError(botMessageElement, error.message);
                }
            }, 3000); // 每3秒检查一次
            
            // 设置超时，防止无限轮询
            setTimeout(() => {
                clearInterval(checkInterval);
                updateBotMessageWithError(botMessageElement, "视频生成超时，请稍后再试");
            }, 300000); // 5分钟超时
            
        } catch (error) {
            console.error("状态检查错误:", error);
            updateBotMessageWithError(botMessageElement, "视频生成状态检查失败: " + error.message);
        }
    }
    
    // 添加深色模式CSS
    const darkThemeStyle = document.createElement('style');
    darkThemeStyle.textContent = `
        body.dark-theme {
            background: linear-gradient(to bottom right, #1a1c2d, #2d2b3d);
            color: #f5f5f5;
        }
        
        body.dark-theme .sidebar {
            background: #252836;
            border-right: 1px solid #3f4156;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }
        
        body.dark-theme .logo-icon {
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
        }
        
        body.dark-theme .model-name {
            color: #a3a8e0;
        }
        
        body.dark-theme .model-version,
        body.dark-theme .footer,
        body.dark-theme .history-title,
        body.dark-theme .light-text {
            color: #a0a0a0;
        }
        
        body.dark-theme .history-title-header {
            color: #a3a8e0;
        }
        
        body.dark-theme .footer {
            border-top: 1px solid #3f4156;
        }
        
        body.dark-theme .chat-history-item:hover {
            background-color: rgba(78, 84, 200, 0.15);
        }
        
        body.dark-theme .main {
            background-color: #1e1f2c;
        }
        
        body.dark-theme .header {
            background-color: #252836;
            box-shadow: 0 2px 15px rgba(0, 0, 0, 0.15);
        }
        
        body.dark-theme .welcome-message {
            background: #252836;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        }
        
        body.dark-theme .welcome-message p {
            color: #a0a0a0;
        }
        
        body.dark-theme .user-message {
            background: linear-gradient(135deg, #394175, #32386e);
            border-left: 1px solid rgba(255, 255, 255, 0.1);
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            color: #f5f5f5;
        }
        
        body.dark-theme .bot-message {
            background: linear-gradient(135deg, #252836, #2a2d3e);
            border-left: 1px solid rgba(255, 255, 255, 0.05);
            border-top: 1px solid rgba(255, 255, 255, 0.02);
            color: #f5f5f5;
        }
        
        body.dark-theme .input-container {
            background-color: #252836;
            box-shadow: 0 -2px 15px rgba(0, 0, 0, 0.15);
        }
        
        body.dark-theme #user-input {
            background-color: #1e1f2c;
            border: 1px solid #3f4156;
            color: #f5f5f5;
        }
        
        body.dark-theme #user-input:focus {
            border-color: #4e54c8;
            box-shadow: 0 0 0 3px rgba(78, 84, 200, 0.2);
        }
        
        body.dark-theme .settings-btn {
            background-color: #1e1f2c;
            border: 1px solid #3f4156;
            color: #a3a8e0;
        }
        
        body.dark-theme .theme-toggle {
            background: #252836;
            border: 1px solid #3f4156;
        }
        
        body.dark-theme .theme-toggle i {
            color: #a3a8e0;
        }
        
        body.dark-theme .settings-modal {
            background: #252836;
        }
        
        body.dark-theme .settings-select,
        body.dark-theme .settings-input {
            background-color: #1e1f2c;
            border: 1px solid #3f4156;
            color: #f5f5f5;
        }
        
        body.dark-theme .video-info {
            color: #a0a0a0;
        }
        
        body.dark-theme .waiting-message {
            background-color: rgba(78, 84, 200, 0.05);
        }
        
        body.dark-theme .progress-bar {
            background-color: #1e1f2c;
        }
        
        body.dark-theme ::-webkit-scrollbar-track {
            background: #252836;
        }
        
        body.dark-theme ::-webkit-scrollbar-thumb {
            background: #3f4156;
        }
        
        body.dark-theme ::-webkit-scrollbar-thumb:hover {
            background: #4e54c8;
        }
    `;
    
    document.head.appendChild(darkThemeStyle);
    
    // 添加模态对话框样式
    const modalStyle = document.createElement('style');
    modalStyle.textContent = `
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        
        .modal-container {
            background-color: white;
            border-radius: 10px;
            box-shadow: 0 5px 25px rgba(0, 0, 0, 0.2);
            width: 400px;
            max-width: 90%;
            overflow: hidden;
            animation: modalFadeIn 0.3s ease;
        }
        
        .settings-modal {
            width: 500px;
        }
        
        @keyframes modalFadeIn {
            from { transform: scale(0.9); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
        
        .modal-header {
            padding: 15px 20px;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .modal-header h3 {
            margin: 0;
            color: var(--primary-color);
        }
        
        .close-btn {
            background: none;
            border: none;
            font-size: 1.2rem;
            cursor: pointer;
            color: var(--light-text);
            transition: color 0.2s ease;
        }
        
        .close-btn:hover {
            color: var(--primary-color);
        }
        
        .modal-body {
            padding: 20px;
        }
        
        .modal-footer {
            padding: 15px 20px;
            border-top: 1px solid var(--border-color);
            display: flex;
            justify-content: flex-end;
        }
        
        .password-input {
            width: 100%;
            padding: 12px 15px;
            margin-top: 10px;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            font-size: 1rem;
            transition: all 0.3s ease;
        }
        
        .password-input:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(78, 84, 200, 0.2);
        }
        
        .decrypt-button, .save-btn {
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1rem;
            transition: all 0.3s ease;
        }
        
        .decrypt-button:hover, .save-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(78, 84, 200, 0.3);
        }
        
        .error-message {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 15px;
            background-color: rgba(220, 53, 69, 0.05);
            border-left: 3px solid var(--danger-color);
            border-radius: 5px;
        }
        
        .error-message i {
            color: var(--danger-color);
            font-size: 1.5rem;
        }
        
        /* 分享按钮样式 */
        .share-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            background: linear-gradient(135deg, #34c759, #32d74b);
            color: white;
            text-decoration: none;
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 0.9rem;
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
        }
        
        .share-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(50, 215, 75, 0.3);
        }
        
        /* 加载中动画微调 */
        .waiting-message p {
            margin-bottom: 15px;
            font-weight: 500;
        }
        
        /* 全屏视频查看样式 */
        .fullscreen-video {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
        }
        
        .fullscreen-video video {
            max-width: 90%;
            max-height: 90%;
        }
        
        .fullscreen-close {
            position: absolute;
            top: 20px;
            right: 20px;
            color: white;
            font-size: 2rem;
            cursor: pointer;
            background: none;
            border: none;
        }
        
        /* 复制成功提示 */
        .copy-tooltip {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            font-size: 0.9rem;
            opacity: 0;
            transition: opacity 0.3s ease;
            z-index: 1000;
        }
        
        .copy-tooltip.show {
            opacity: 1;
        }
    `;
    
    document.head.appendChild(modalStyle);
    
    // 添加剪贴板复制成功提示
    document.addEventListener('click', function(e) {
        if (e.target.closest('button') && e.target.closest('button').innerText.includes('复制链接')) {
            const tooltip = document.createElement('div');
            tooltip.className = 'copy-tooltip';
            tooltip.textContent = '链接已复制到剪贴板';
            document.body.appendChild(tooltip);
            
            setTimeout(() => tooltip.classList.add('show'), 10);
            
            setTimeout(() => {
                tooltip.classList.remove('show');
                setTimeout(() => document.body.removeChild(tooltip), 300);
            }, 2000);
        }
    });
    
    // 添加视频点击全屏查看功能
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('generated-video')) {
            // 暂停当前播放的视频
            e.target.pause();
            
            const videoUrl = e.target.querySelector('source').src;
            
            // 创建全屏视频查看层
            const fullscreenView = document.createElement('div');
            fullscreenView.className = 'fullscreen-video';
            fullscreenView.innerHTML = `
                <button class="fullscreen-close"><i class="ri-close-line"></i></button>
                <video controls autoplay loop>
                    <source src="${videoUrl}" type="video/mp4">
                </video>
            `;
            
            document.body.appendChild(fullscreenView);
            
            // 点击关闭全屏查看
            fullscreenView.querySelector('.fullscreen-close').addEventListener('click', function(event) {
                event.stopPropagation();
                document.body.removeChild(fullscreenView);
                // 恢复原视频播放
                e.target.play();
            });
            
            // 点击背景也关闭
            fullscreenView.addEventListener('click', function(event) {
                if (event.target === fullscreenView) {
                    document.body.removeChild(fullscreenView);
                    // 恢复原视频播放
                    e.target.play();
                }
            });
        }
    });
});