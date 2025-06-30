const CONVERSATION_UUID_KEY = "chat_conversation_uuid";
let conversationUuid = localStorage.getItem(CONVERSATION_UUID_KEY);
let API_BASE_URL = "";
let socket = null; // WebSocket连接
let currentLanguage = "zh"; // 默认语言
let isManualClose = false; // 标记是否为手动关闭

// 模块级缓存变量
let cachedConversationInfo = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存过期时间

// 国际化文本配置
const I18N_TEXTS = {
  zh: {
    supportChat: "Support Chat",
    inputPlaceholder: "输入您的消息...",
    sendButton: "发送",
    newConversationButton: "新会话",
    // 系统消息
    conversationExpired: "会话已失效，正在重新连接...",
    conversationClosed: "此会话已关闭，无法发送新消息",
    messageSendFailed: "消息发送失败，请稍后重试",
    sourceNotFound: "来源配置错误，请联系管理员",
    invalidParams: "参数错误，请检查输入内容",
    unknownError: "发送消息时出现未知错误，请稍后重试",
    initializingConversation: "正在初始化新会话...",
    conversationClosedStatus: "此会话已关闭",
    loadMessagesError: "加载消息时出现错误，请刷新页面重试",
    newConversationCreated: "新会话已创建，您可以开始对话了",
  },
  en: {
    supportChat: "Support Chat",
    inputPlaceholder: "Type your message...",
    sendButton: "Send",
    newConversationButton: "New Chat",
    // 系统消息
    conversationExpired: "Session expired, reconnecting...",
    conversationClosed: "This conversation is closed, cannot send new messages",
    messageSendFailed: "Failed to send message, please try again later",
    sourceNotFound: "Source configuration error, please contact administrator",
    invalidParams: "Parameter error, please check your input",
    unknownError:
      "Unknown error occurred while sending message, please try again later",
    initializingConversation: "Initializing new conversation...",
    conversationClosedStatus: "This conversation is closed",
    loadMessagesError:
      "Error loading messages, please refresh the page and try again",
    newConversationCreated:
      "New conversation created, you can start chatting now",
  },
};

// 获取国际化文本
function t(key) {
  return I18N_TEXTS[currentLanguage]?.[key] || I18N_TEXTS.zh[key] || key;
}

async function createNewConversation(source) {
  try {
    const response = await fetch(API_BASE_URL + "/api/v1/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ source }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data.code === 200 && data.data && data.data.uuid) {
      localStorage.setItem(CONVERSATION_UUID_KEY, data.data.uuid);
      return data.data.uuid;
    } else {
      // 处理创建会话的错误情况
      if (data.error === "SOURCE_NOT_FOUND") {
        console.error("Failed to create conversation: Source not found");
      } else if (data.error === "INVALID_PARAMS") {
        console.error("Failed to create conversation: Invalid parameters");
      } else {
        console.error(
          "Failed to create conversation:",
          data.message || data.msg
        );
      }
      return null;
    }
  } catch (error) {
    console.error("Error creating conversation:", error);
    return null;
  }
}

async function getMessages(uuid) {
  try {
    // 后端现在默认返回最新的消息，不再需要分页参数
    const response = await fetch(
      `${API_BASE_URL}/api/v1/chat/${uuid}/messages`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data.code === 200 && data.data && data.data.items) {
      return data.data.items;
    } else {
      // 处理会话不存在或已关闭的情况
      if (data.error === "CONVERSATION_NOT_FOUND") {
        console.warn("会话不存在，需要创建新会话");
        // 清除本地存储的会话UUID
        localStorage.removeItem(CONVERSATION_UUID_KEY);
        conversationUuid = null;
        return { error: "conversation_not_found" };
      }
      if (data.error === "CONVERSATION_CLOSED") {
        console.warn("会话已关闭");
        return { error: "conversation_closed" };
      }
      if (data.error === "SOURCE_NOT_FOUND") {
        console.warn("来源不存在");
        return { error: "source_not_found" };
      }
      if (data.error === "INVALID_PARAMS") {
        console.warn("参数错误");
        return { error: "invalid_params" };
      }
      console.error("Failed to get messages:", data.message);
      return [];
    }
  } catch (error) {
    console.error("Error getting messages:", error);
    return [];
  }
}

// 清除缓存的辅助函数
function clearConversationCache() {
  cachedConversationInfo = null;
  cacheTimestamp = null;
}

// 检查缓存是否有效
function isCacheValid(uuid) {
  if (!cachedConversationInfo || !cacheTimestamp) {
    return false;
  }

  // 检查UUID是否匹配
  if (cachedConversationInfo.uuid !== uuid) {
    return false;
  }

  // 检查是否过期
  const now = Date.now();
  return now - cacheTimestamp < CACHE_DURATION;
}

async function getConversationInfo(uuid) {
  // 检查是否有缓存的会话信息
  if (isCacheValid(uuid)) {
    console.log("Using cached conversation info");
    return cachedConversationInfo;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/chat/${uuid}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data.code === 200 && data.data) {
      // 缓存会话信息
      const conversationInfo = data.data;
      conversationInfo.uuid = uuid; // 添加uuid以便后续比对
      cachedConversationInfo = conversationInfo;
      cacheTimestamp = Date.now();
      return conversationInfo;
    } else {
      // 处理会话不存在或已关闭的情况
      if (data.error === "CONVERSATION_NOT_FOUND") {
        console.warn("会话不存在");
        return { error: "conversation_not_found", uuid };
      }
      if (data.error === "SOURCE_NOT_FOUND") {
        console.warn("来源不存在");
        return { error: "source_not_found", uuid };
      }
      if (data.error === "INVALID_PARAMS") {
        console.warn("参数错误");
        return { error: "invalid_params", uuid };
      }
      console.error("Failed to get conversation info:", data.message);
      return null;
    }
  } catch (error) {
    console.error("Error getting conversation info:", error);
    return null;
  }
}

async function sendMessage(uuid, content) {
  try {
    const sender = "customer";
    const response = await fetch(`${API_BASE_URL}/api/v1/chat/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uuid, content, sender }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data.code === 200 && data.data) {
      return data.data;
    } else {
      // 处理会话不存在或已关闭的情况
      if (data.error === "CONVERSATION_NOT_FOUND") {
        console.warn("会话不存在，需要创建新会话");
        // 清除本地存储的会话UUID
        localStorage.removeItem(CONVERSATION_UUID_KEY);
        conversationUuid = null;
        return { error: "conversation_not_found" };
      }
      if (data.error === "CONVERSATION_CLOSED") {
        console.warn("会话已关闭");
        return { error: "conversation_closed" };
      }
      if (data.error === "MESSAGE_SEND_FAILED") {
        console.warn("消息发送失败");
        return { error: "message_send_failed" };
      }
      if (data.error === "SOURCE_NOT_FOUND") {
        console.warn("来源不存在");
        return { error: "source_not_found" };
      }
      if (data.error === "INVALID_PARAMS") {
        console.warn("参数错误");
        return { error: "invalid_params" };
      }
      console.error("Failed to send message:", data.message);
      return null;
    }
  } catch (error) {
    console.error("Error sending message:", error);
    return null;
  }
}

// 主题配置
const THEMES = {
  colorful: {
    // 彩色渐变主题（现有样式）
    toggleButton: {
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      boxShadow: "0 8px 25px rgba(102, 126, 234, 0.4)",
      hoverBoxShadow: "0 12px 35px rgba(102, 126, 234, 0.6)",
    },
    header: {
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "white",
      buttonBackground: "rgba(255, 255, 255, 0.2)",
      buttonHoverBackground: "rgba(255, 255, 255, 0.3)",
      buttonColor: "white",
    },
    messagesArea: {
      background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
    },
    customerMessage: {
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "white",
      boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
    },
    agentMessage: {
      background: "#ffffff",
      color: "#374151",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
      border: "1px solid #e5e7eb",
    },
    systemMessage: {
      background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
      color: "white",
      boxShadow: "0 4px 12px rgba(251, 191, 36, 0.3)",
    },
    sendButton: {
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      hoverBoxShadow: "0 8px 25px rgba(102, 126, 234, 0.4)",
    },
    agentAvatar: {
      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
    },
  },
  minimal: {
    // 素色简约主题
    toggleButton: {
      background: "#374151",
      boxShadow: "0 4px 12px rgba(55, 65, 81, 0.3)",
      hoverBoxShadow: "0 6px 20px rgba(55, 65, 81, 0.4)",
    },
    header: {
      background: "#f9fafb",
      color: "#374151",
      borderBottom: "1px solid #e5e7eb",
      buttonBackground: "rgba(55, 65, 81, 0.1)",
      buttonHoverBackground: "rgba(55, 65, 81, 0.2)",
      buttonColor: "#374151",
    },
    messagesArea: {
      background: "#ffffff",
    },
    customerMessage: {
      background: "#374151",
      color: "white",
      boxShadow: "0 2px 4px rgba(55, 65, 81, 0.1)",
    },
    agentMessage: {
      background: "#f3f4f6",
      color: "#374151",
      boxShadow: "none",
      border: "1px solid #e5e7eb",
    },
    systemMessage: {
      background: "#f59e0b",
      color: "white",
      boxShadow: "0 2px 4px rgba(245, 158, 11, 0.2)",
    },
    sendButton: {
      background: "#374151",
      hoverBoxShadow: "0 4px 12px rgba(55, 65, 81, 0.3)",
    },
    agentAvatar: {
      background: "#6b7280",
      boxShadow: "0 2px 4px rgba(107, 114, 128, 0.2)",
    },
  },
};

async function initializeChatWidget(options) {
  let baseUrl = "http://localhost:8888"; // Default value
  let source = "widget"; // Default value
  let theme = "colorful"; // Default theme
  let language = "zh"; // Default language

  if (options) {
    if (options.baseUrl) {
      baseUrl = options.baseUrl;
    }
    if (options.source) {
      source = options.source;
    }
    if (options.theme && THEMES[options.theme]) {
      theme = options.theme;
    }
    if (
      options.language &&
      (options.language === "zh" || options.language === "en")
    ) {
      language = options.language;
      currentLanguage = language;
    }
  }

  const currentTheme = THEMES[theme];
  API_BASE_URL = baseUrl;

  if (!conversationUuid) {
    console.log("No conversation UUID found, creating a new one...");
    conversationUuid = await createNewConversation(source);
    if (!conversationUuid) {
      console.error(
        "Could not initialize chat widget: Failed to create conversation."
      );
      return;
    }
  } else {
    // 检查现有会话的状态
    console.log("Checking existing conversation status...");
    const conversationInfo = await getConversationInfo(conversationUuid);
    if (conversationInfo && conversationInfo.error) {
      if (conversationInfo.error === "conversation_not_found") {
        // 会话不存在，创建新会话
        console.log("Conversation not found, creating a new one...");
        localStorage.removeItem(CONVERSATION_UUID_KEY);
        conversationUuid = await createNewConversation(source);
        if (!conversationUuid) {
          console.error(
            "Could not initialize chat widget: Failed to create conversation."
          );
          return;
        }
      }
    } else if (conversationInfo && conversationInfo.status === "closed") {
      // 会话已关闭，记录状态但不创建新会话
      console.log("Conversation is closed");
    }

    // 会话信息已在getConversationInfo函数中缓存
  }
  console.log("Conversation UUID:", conversationUuid);

  // 初始化WebSocket连接（只有在会话未关闭时才初始化）
  if (conversationUuid) {
    // getConversationInfo函数已处理缓存逻辑
    const conversationInfo = await getConversationInfo(conversationUuid);
    if (!conversationInfo || conversationInfo.status !== "closed") {
      initWebSocket();
    }
  }

  // Here you would typically render your chat widget UI
  // For now, let's just add a simple indicator
  // Check if the chat container already exists to prevent multiple creations
  let chatContainer = document.getElementById("chat-widget-container");
  let toggleButton = document.getElementById("chat-toggle-button");
  if (!chatContainer) {
    chatContainer = document.createElement("div");
    chatContainer.id = "chat-widget-container";
    chatContainer.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 360px;
            height: 500px;
            background: #ffffff;
            border: none;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 25px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        `;

    // Add CSS animations
    const style = document.createElement("style");
    style.textContent = `
            @keyframes slideInUp {
                from {
                    transform: translateY(100%);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes messageSlideIn {
                from {
                    transform: translateY(20px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
        `;
    document.head.appendChild(style);
    document.body.appendChild(chatContainer);

    // Add a button to toggle chat visibility
    toggleButton = document.createElement("button");
    toggleButton.id = "chat-toggle-button";
    toggleButton.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4 17.17V4H20V16Z" fill="currentColor"/>
                <circle cx="7" cy="10" r="1" fill="currentColor"/>
                <circle cx="12" cy="10" r="1" fill="currentColor"/>
                <circle cx="17" cy="10" r="1" fill="currentColor"/>
            </svg>
        `;
    toggleButton.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: ${currentTheme.toggleButton.background};
            color: white;
            border: none;
            box-shadow: ${currentTheme.toggleButton.boxShadow};
            cursor: pointer;
            z-index: 1001;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

    // Add hover effects
    toggleButton.addEventListener("mouseenter", () => {
      toggleButton.style.transform = "scale(1.1)";
      toggleButton.style.boxShadow = currentTheme.toggleButton.hoverBoxShadow;
    });

    toggleButton.addEventListener("mouseleave", () => {
      toggleButton.style.transform = "scale(1)";
      toggleButton.style.boxShadow = currentTheme.toggleButton.boxShadow;
    });

    toggleButton.onclick = () => {
      chatContainer.style.display = "flex";
      chatContainer.style.animation =
        "slideInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
      toggleButton.style.display = "none";
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    };
    document.body.appendChild(toggleButton);

    // Initially hide the chat window
    chatContainer.style.display = "none";
  }

  chatContainer.innerHTML = `
        <div style="
            padding: 20px 24px;
            background: ${currentTheme.header.background};
            color: ${currentTheme.header.color};
            font-weight: 600;
            text-align: center;
            font-size: 16px;
            position: relative;
            border-radius: 16px 16px 0 0;
            ${
              currentTheme.header.borderBottom
                ? `border-bottom: ${currentTheme.header.borderBottom};`
                : ""
            }
        ">
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H11V21H5V3H13V9H21Z" fill="currentColor"/>
                </svg>
                ${t("supportChat")}
            </div>
            <div style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%); display: flex; gap: 8px;">
                <button id="minimize-button" style="
                    background: ${currentTheme.header.buttonBackground};
                    border: none;
                    color: ${currentTheme.header.buttonColor};
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                    font-size: 18px;
                " onmouseover="this.style.background='${
                  currentTheme.header.buttonHoverBackground
                }'" onmouseout="this.style.background='${
    currentTheme.header.buttonBackground
  }'">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 13H5V11H19V13Z" fill="currentColor"/>
                    </svg>
                </button>
                <button id="close-button" style="
                    background: ${currentTheme.header.buttonBackground};
                    border: none;
                    color: ${currentTheme.header.buttonColor};
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                    font-size: 18px;
                " onmouseover="this.style.background='${
                  currentTheme.header.buttonHoverBackground
                }'" onmouseout="this.style.background='${
    currentTheme.header.buttonBackground
  }'">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
                    </svg>
                </button>
            </div>
        </div>
        <div id="messages-container" style="
            flex-grow: 1;
            padding: 20px;
            overflow-y: auto;
            background: ${currentTheme.messagesArea.background};
            scroll-behavior: smooth;
        "></div>
        <div style="
            padding: 20px;
            border-top: 1px solid rgba(0, 0, 0, 0.05);
            display: flex;
            align-items: center;
            background: #ffffff;
            gap: 12px;
            border-radius: 0 0 16px 16px;
        ">
            <input type="text" id="message-input" style="
                flex-grow: 1;
                padding: 12px 16px;
                border: 2px solid #e2e8f0;
                border-radius: 24px;
                font-size: 14px;
                outline: none;
                transition: all 0.2s ease;
                background: #f8fafc;
            " placeholder="${t(
              "inputPlaceholder"
            )}" onfocus="this.style.borderColor='#667eea'; this.style.background='#ffffff'" onblur="this.style.borderColor='#e2e8f0'; this.style.background='#f8fafc'">
            <button id="send-button" style="
                padding: 12px 20px;
                background: ${currentTheme.sendButton.background};
                color: white;
                border: none;
                border-radius: 24px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 6px;
                min-width: 80px;
                justify-content: center;
            " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='${
              currentTheme.sendButton.hoverBoxShadow
            }'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill="currentColor"/>
                </svg>
                ${t("sendButton")}
            </button>
        </div>
    `;

  const messagesContainer = chatContainer.querySelector("#messages-container");
  const messageInput = chatContainer.querySelector("#message-input");
  const sendButton = chatContainer.querySelector("#send-button");
  const closeButton = chatContainer.querySelector("#close-button");

  const minimizeButton = chatContainer.querySelector("#minimize-button");

  // 最小化按钮事件 - 收起聊天窗口
  minimizeButton.onclick = () => {
    chatContainer.style.animation =
      "slideInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) reverse";
    setTimeout(() => {
      chatContainer.style.display = "none";
      toggleButton.style.display = "flex";
      toggleButton.style.animation = "fadeIn 0.2s ease-out";
    }, 250);
  };

  // 关闭按钮事件 - 完全关闭聊天窗口
  closeButton.onclick = () => {
    chatContainer.style.animation =
      "slideInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) reverse";
    setTimeout(() => {
      chatContainer.style.display = "none";
      toggleButton.style.display = "none";
      toggleButton.style.animation = "fadeIn 0.2s ease-out";
    }, 250);
  };

  function addMessageToChat(message) {
    const messageElement = document.createElement("div");
    messageElement.style.cssText = `
            margin-bottom: 16px;
            display: flex;
            justify-content: ${
              message.sender === "customer" ? "flex-end" : "flex-start"
            };
            animation: messageSlideIn 0.3s ease-out;
        `;

    const isCustomer = message.sender === "customer";
    const isSystem = message.sender === "system";

    let bubbleStyle,
      avatarHtml = "";

    if (isSystem) {
      bubbleStyle = `
                background: ${currentTheme.systemMessage.background};
                color: ${currentTheme.systemMessage.color};
                padding: 12px 16px;
                border-radius: 16px;
                max-width: 85%;
                word-wrap: break-word;
                box-shadow: ${currentTheme.systemMessage.boxShadow};
                font-size: 13px;
                text-align: center;
                font-weight: 500;
            `;
    } else if (isCustomer) {
      bubbleStyle = `
                background: ${currentTheme.customerMessage.background};
                color: ${currentTheme.customerMessage.color};
                padding: 12px 16px;
                border-radius: 18px 18px 4px 18px;
                max-width: 75%;
                word-wrap: break-word;
                box-shadow: ${currentTheme.customerMessage.boxShadow};
                font-size: 14px;
                line-height: 1.4;
            `;
    } else {
      // Agent message
      bubbleStyle = `
                background: ${currentTheme.agentMessage.background};
                color: ${currentTheme.agentMessage.color};
                padding: 12px 16px;
                border-radius: 18px 18px 18px 4px;
                max-width: 75%;
                word-wrap: break-word;
                ${
                  currentTheme.agentMessage.boxShadow
                    ? `box-shadow: ${currentTheme.agentMessage.boxShadow};`
                    : ""
                }
                ${
                  currentTheme.agentMessage.border
                    ? `border: ${currentTheme.agentMessage.border};`
                    : ""
                }
                font-size: 14px;
                line-height: 1.4;
            `;

      avatarHtml = `
                <div style="
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: ${currentTheme.agentAvatar.background};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 8px;
                    flex-shrink: 0;
                    box-shadow: ${currentTheme.agentAvatar.boxShadow};
                ">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM12 14.9C10.8 14.9 9.8 15.9 9.8 17.1C9.8 18.3 10.8 19.3 12 19.3C13.2 19.3 14.2 18.3 14.2 17.1C14.2 15.9 13.2 14.9 12 14.9ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9H21Z" fill="white"/>
                    </svg>
                </div>
            `;
    }

    messageElement.innerHTML = `
            ${isSystem ? avatarHtml : ""}
            <div style="${bubbleStyle}">
                ${message.content}
            </div>
        `;

    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  async function onClickSendMessageEvent() {
    const content = messageInput.value.trim();
    if (content && conversationUuid && !messageInput.disabled) {
      // 检查会话状态（getConversationInfo函数已处理缓存逻辑）
      const conversationInfo = await getConversationInfo(conversationUuid);

      if (conversationInfo && conversationInfo.status === "closed") {
        handleConversationClosed();
        return;
      }

      // Display user's message immediately
      addMessageToChat({ content: content, sender: "customer" });
      messageInput.value = "";
      const sentMessage = await sendMessage(conversationUuid, content);

      // 处理发送消息的错误情况
      if (sentMessage && sentMessage.error) {
        if (sentMessage.error === "conversation_not_found") {
          // 会话不存在，尝试创建新会话
          addMessageToChat({
            content: t("conversationExpired"),
            sender: "system",
          });
          // 重新初始化会话
          const newUuid = await createNewConversation(source || "widget");
          if (newUuid) {
            conversationUuid = newUuid;
            initWebSocket();
            // 重新发送消息
            await sendMessage(conversationUuid, content);
          }
        } else if (sentMessage.error === "conversation_closed") {
          handleConversationClosed();
        } else if (sentMessage.error === "message_send_failed") {
          addMessageToChat({
            content: t("messageSendFailed"),
            sender: "system",
          });
        } else if (sentMessage.error === "source_not_found") {
          addMessageToChat({
            content: t("sourceNotFound"),
            sender: "system",
          });
        } else if (sentMessage.error === "invalid_params") {
          addMessageToChat({
            content: t("invalidParams"),
            sender: "system",
          });
        } else {
          addMessageToChat({
            content: t("unknownError"),
            sender: "system",
          });
        }
      }
    }
  }

  async function onClickNewDialogEvent() {
    // 创建新会话
    const newUuid = await createNewConversation(source || "widget");
    if (newUuid) {
      conversationUuid = newUuid;
      // 清除缓存的会话信息
      clearConversationCache();
      // 更新本地存储
      localStorage.setItem(CONVERSATION_UUID_KEY, newUuid);
      // 清空聊天记录
      messagesContainer.innerHTML = "";
      // 重新启用输入框和发送按钮
      messageInput.disabled = false;
      messageInput.placeholder = t("inputPlaceholder");
      sendButton.disabled = false;
      sendButton.style.opacity = "1";
      sendButton.style.cursor = "pointer";
      sendButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill="currentColor"/>
                </svg>
                ${t("sendButton")}`;
      sendButton.onclick = onClickSendMessageEvent;
      // 重新初始化WebSocket
      isManualClose = true;
      initWebSocket();

      addMessageToChat({
        content: t("newConversationCreated"),
        sender: "system",
      });
    }
  }

  sendButton.onclick = onClickSendMessageEvent;

  messageInput.onkeypress = (e) => {
    if (e.key === "Enter") {
      sendButton.click();
    }
  };

  // Load existing messages and check conversation status
  if (conversationUuid) {
    // 首先检查会话状态（getConversationInfo函数已处理缓存逻辑）
    const conversationInfo = await getConversationInfo(conversationUuid);

    if (conversationInfo && conversationInfo.status === "closed") {
      handleConversationClosed();
    } else {
      // 会话正常，加载消息
      const messages = await getMessages(conversationUuid);
      if (messages && messages.error) {
        if (messages.error === "conversation_not_found") {
          // 会话不存在，创建新会话
          addMessageToChat({
            content: t("initializingConversation"),
            sender: "system",
          });
          const newUuid = await createNewConversation(source || "widget");
          if (newUuid) {
            conversationUuid = newUuid;
            initWebSocket();
          }
        } else if (messages.error === "conversation_closed") {
          handleConversationClosed();
        } else if (messages.error === "source_not_found") {
          addMessageToChat({
            content: t("sourceNotFound"),
            sender: "system",
          });
        } else if (messages.error === "invalid_params") {
          addMessageToChat({
            content: t("invalidParams"),
            sender: "system",
          });
        } else {
          addMessageToChat({
            content: t("loadMessagesError"),
            sender: "system",
          });
        }
      } else if (Array.isArray(messages)) {
        messages.forEach((msg) => {
          addMessageToChat(msg);
        });
      }
    }
    // 确保加载消息后滚动到最底部
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // 初始化WebSocket连接
  function initWebSocket() {
    // 如果已经有连接，先关闭
    if (socket) {
      socket.close();
    }

    // 创建WebSocket连接
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${API_BASE_URL.replace(
      /^https?:\/\//,
      ""
    )}/api/v1/chat/ws?conv_uuid=${conversationUuid}&client_type=customer`;

    try {
      socket = new WebSocket(wsUrl);

      // 连接打开时
      socket.onopen = () => {
        console.log("WebSocket连接已建立");
      };

      // 接收消息
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log("收到 WebSocket 消息:", message);
          const messageData = message.data;
          switch (message.type) {
            case "new_message":
              console.log("收到新消息:", messageData);
              addMessageToChat({
                content: messageData.content,
                sender: "agent",
              });
              break;
            case "conversation_closed":
              // 处理会话关闭事件
              handleConversationClosed();
              break;
            default:
              console.log("未处理的消息类型:", message.type);
          }
        } catch (e) {
          console.error("解析WebSocket消息失败:", e);
        }
      };

      // 连接关闭
      socket.onclose = () => {
        console.log("WebSocket连接已关闭");
        // 可以在这里添加重连逻辑
        setTimeout(() => {
          if (isManualClose) {
            isManualClose = false;
          } else {
            if (conversationUuid) {
              initWebSocket();
            }
          }
        }, 5000); // 5秒后尝试重连
      };

      // 连接错误
      socket.onerror = (error) => {
        console.error("WebSocket错误:", error);
      };
    } catch (error) {
      console.error("创建WebSocket连接失败:", error);
    }
  }

  // Handler conversation closed
  function handleConversationClosed() {
    // addMessageToChat({
    //   content: t("conversationClosedStatus"),
    //   sender: "system",
    // });
    messageInput.disabled = true;
    messageInput.placeholder = t("conversationClosedStatus");

    sendButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill="currentColor"/>
                </svg>
                ${t("newConversationButton")}`;

    sendButton.onclick = onClickNewDialogEvent;
  }

  // Expose functions globally for external access
  window.ChatWidget = {
    init: initializeChatWidget,
    getMessages: getMessages,
    sendMessage: sendMessage,
    getConversationInfo: getConversationInfo,
  };
}

// // If the script is loaded asynchronously, initialize it when DOM is ready
document.addEventListener("DOMContentLoaded", async () => {
  // Always initialize the chat widget when DOM is ready with default values
  // initializeChatWidget({ baseUrl: 'http://192.168.31.214:8888', source: 'CS-4A6euKS8gwMUaqyOWcks' });
  const globalConfig = window.WIDGET_CONFIG || {};
  const autoInit = globalConfig.autoInit !== false; // 默认为true，除非明确设置为false

  if (autoInit) {
    const config = {
      baseUrl: globalConfig.baseUrl || "http://192.168.31.214:8888", // 默认值
      source: globalConfig.source || "CS-4A6euKS8gwMUaqyOWcks", // 默认值
      theme: globalConfig.theme || "colorful",
      language: globalConfig.language || "zh", // 默认语言
    };
    initializeChatWidget(config);
  }
});
