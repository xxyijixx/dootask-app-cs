import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { formatTimeDisplay, getFullTimeString } from '../utils/timeFormat';
import { chatApi } from "../api/chat";
import type { Conversation } from "../types/chat";
import {
  PaperAirplaneIcon,
  EllipsisVerticalIcon,
  ArrowLeftIcon,
  CogIcon,
  ChatBubbleLeftRightIcon,
  UserIcon,
  CpuChipIcon,
} from "@heroicons/react/24/outline";
import {
  Button,
  Field,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Transition,
} from "@headlessui/react";
import { useMessageStore } from "../store/messageStore";
import { useConversationStore } from "../store/conversationStore";

interface ChatWindowProps {
  conversationId?: number;
  onBackClick?: () => void; // 添加返回按钮回调
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversationId,
  onBackClick,
}) => {
  const { t } = useTranslation();
  const { messagesByConversation, loading, fetchMessages, refreshTrigger, addMessage, loadMoreMessages } =
    useMessageStore();
  const { conversations } = useConversationStore();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [clickedTimeIds, setClickedTimeIds] = useState<Set<number>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);


  
  // 获取当前会话的消息状态
  const conversationState = conversationId
    ? messagesByConversation[conversationId]
    : null;
  const messages = conversationState?.messages || [];
  const hasMore = conversationState?.hasMore || false;
  const messagesLoading = conversationState?.loading || false;
  
  // 添加调试日志
  console.log('ChatWindow - conversationId:', conversationId);
  console.log('ChatWindow - messagesByConversation:', messagesByConversation);
  console.log('ChatWindow - messages数量:', messages.length);
    

  useEffect(() => {
    if (!conversationId) return;

    // 获取会话的消息
    fetchMessages(conversationId);

    // 从store中获取会话信息
    const currentConversation = conversations.find(conv => conv.id === conversationId);
    if (currentConversation) {
      setConversation(currentConversation);
    }
  }, [conversationId, fetchMessages, conversations]);

  // 当消息列表更新时，滚动到底部（仅在不是加载更多时）
  useEffect(() => {
    if (!messagesLoading && conversationState?.currentPage === 1) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, messagesLoading, conversationState?.currentPage]);

  // 当刷新触发器更新时，重新获取消息
  useEffect(() => {
    if (conversationId) {
      fetchMessages(conversationId);
    }
  }, [refreshTrigger, conversationId, fetchMessages]);

  // 滚动监听，实现懒加载
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop } = container;
      // 当滚动到顶部附近时加载更多消息
      if (scrollTop < 100 && hasMore && !messagesLoading && conversationId) {
        const previousScrollHeight = container.scrollHeight;
        loadMoreMessages(conversationId).then(() => {
          // 加载完成后保持滚动位置
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = newScrollHeight - previousScrollHeight;
        });
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [conversationId, hasMore, messagesLoading, loadMoreMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId) return;

    const messageContent = newMessage.trim();
    setSending(true);
    
    // 清空输入框
    setNewMessage("");

    // 创建临时消息对象，立即添加到本地状态
    const tempMessage = {
      id: Date.now(), // 使用时间戳作为临时ID
      conversation_uuid: conversation?.uuid || '',
      conversation_id: conversationId,
      content: messageContent,
      sender: "agent" as const,
      type: "text" as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 立即添加消息到本地状态
    addMessage(conversationId, tempMessage);

    try {
      // 发送消息到服务器
      const response = await chatApi.sendMessage({
        id: conversationId,
        content: messageContent,
        sender: "agent",
        type: "text",
      });
      
      // 如果服务器返回了消息数据，可以用服务器返回的数据更新本地消息
      // 这里假设服务器返回的消息有正确的ID
      if (response) {
        // 可以选择用服务器返回的消息替换临时消息
        // 或者保持当前的临时消息不变
      }
      
      setSending(false);
    } catch (error) {
      console.error("发送消息失败:", error);
      // 发送失败时，可以选择移除刚添加的消息或显示错误状态
      // 这里暂时保留消息，但可以根据需要调整
      setSending(false);
    }
  };

  const handleTimeClick = (messageId: number) => {
    setClickedTimeIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-lg h-full space-y-4 px-4">
        <ChatBubbleLeftRightIcon className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 dark:text-gray-600" />
        <div className="text-center">
          <p className="text-lg sm:text-xl font-medium text-gray-500 dark:text-gray-400 mb-2">
            {t('chat.welcomeToCustomerService')}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {t('chat.selectConversationToStart')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* 顶部标题栏 */}
      <div className="flex items-center justify-between px-4 sm:px-6 md:px-8 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {onBackClick && (
            <Button
              onClick={onBackClick}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 flex-shrink-0"
            >
              <ArrowLeftIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400" />
            </Button>
          )}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <ChatBubbleLeftRightIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 flex-shrink-0" />
            <h2 className="text-base sm:text-lg md:text-xl font-semibold dark:text-white truncate">
              {conversation?.title || `${t('chat.conversation')} ${conversation?.id || ""}`}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <span
              className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                conversation?.status === "open"
                  ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400"
              }`}
            >
              <span className="hidden sm:inline">{conversation?.status === "open" ? t('chat.statusOpen') : t('chat.statusClosed')}</span>
              <span className="sm:hidden">{conversation?.status === "open" ? "开启" : "关闭"}</span>
            </span>
            {conversation?.status === "open" && (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            )}
          </div>
        </div>

        {/* 菜单按钮 */}
        <Menu as="div" className="relative flex-shrink-0">
          <MenuButton className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2">
            <EllipsisVerticalIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400" />
          </MenuButton>
          <Transition
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <MenuItems className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 focus:outline-none z-10">
              <MenuItem>
                {({ focus }) => (
                  <button
                    className={`${
                      focus ? "bg-gray-100 dark:bg-gray-600" : ""
                    } group flex w-full items-center rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-200`}
                  >
                    {t('chat.viewDetails')}
                  </button>
                )}
              </MenuItem>
              <MenuItem>
                {({ focus }) => (
                  <button
                    className={`${
                      focus ? "bg-gray-100 dark:bg-gray-600" : ""
                    } group flex w-full items-center rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-200`}
                  >
                    {t('chat.endConversation')}
                  </button>
                )}
              </MenuItem>
            </MenuItems>
          </Transition>
        </Menu>
      </div>

      {/* 消息列表 */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-3 sm:py-4">
        {/* 加载更多提示 */}
        {messagesLoading && hasMore && (
          <div className="text-center text-gray-400 dark:text-gray-500 mb-4">
            <div className="flex items-center justify-center gap-2">
              <CogIcon className="w-4 h-4 animate-spin" />
              <span>{t('chat.loadingMoreMessages')}</span>
            </div>
          </div>
        )}
        
        {/* 没有更多消息提示 */}
        {!hasMore && messages.length > 0 && (
          <div className="text-center text-gray-400 dark:text-gray-500 mb-4">
            <span className="text-sm">{t('chat.allMessagesShown')}</span>
          </div>
        )}
        
        {loading && messages.length === 0 ? (
          <div className="text-center text-gray-400 dark:text-gray-500 mt-10">
            <div className="flex items-center justify-center gap-2">
              <CogIcon className="w-5 h-5 animate-spin" />
              <span>{t('common.loading')}</span>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-300 dark:text-gray-600" />
            <div>
              <p className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-1">
                {t('chat.noMessages')}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {t('chat.startConversation')}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <Transition
                key={`${message.id}-${message.created_at}-${index}`}
                appear
                show={true}
                enter="transition-all duration-300"
                enterFrom="opacity-0 translate-y-2"
                enterTo="opacity-100 translate-y-0"
              >
                <div
                  className={`flex gap-2 sm:gap-3 ${
                    message.sender === "agent" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.sender === "customer" && (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                      <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                  )}
                  <div className="flex flex-col max-w-[280px] sm:max-w-xs lg:max-w-md">
                    <div
                      className={`px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl ${
                        message.sender === "agent"
                          ? "bg-blue-500 text-white rounded-br-md shadow-md shadow-blue-500/20"
                          : "bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md shadow-sm border border-gray-200 dark:border-gray-600"
                      }`}
                    >
                      <p className="text-sm leading-relaxed break-words">{message.content}</p>
                    </div>
                    <p
                      className={`text-xs mt-1 opacity-70 cursor-pointer hover:opacity-100 transition-opacity ${
                        message.sender === "agent" ? "text-right" : "text-left"
                      }`}
                      onClick={() => handleTimeClick(message.id)}
                      title={message.created_at ? getFullTimeString(message.created_at) : ""}
                    >
                      {message.created_at
                        ? clickedTimeIds.has(message.id)
                          ? getFullTimeString(message.created_at)
                          : formatTimeDisplay(message.created_at, t)
                        : ""}
                    </p>
                  </div>
                  {message.sender === "agent" && (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                      <CpuChipIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                  )}
                </div>
              </Transition>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/50 backdrop-blur-sm">
        <div className="flex gap-2 sm:gap-3 items-end">
          <Field className="flex-1">
            <Input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && handleSendMessage(e)
              }
              placeholder={t('chat.inputPlaceholderWithShortcuts')}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 dark:border-gray-600 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300 dark:focus:border-transparent bg-white dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-200 resize-none shadow-sm"
              disabled={sending}
              style={{ minHeight: "40px" }}
            />
          </Field>
          <Button
            onClick={handleSendMessage}
            disabled={sending || !newMessage.trim()}
            className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 bg-blue-500 text-white rounded-lg sm:rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-1 sm:gap-2 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/30 flex-shrink-0"
          >
            {sending ? (
              <>
                <CogIcon className="w-4 h-4 animate-spin" />
                <span className="hidden sm:inline">{t('chat.sending')}</span>
              </>
            ) : (
              <>
                <PaperAirplaneIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{t('chat.send')}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  );
};
