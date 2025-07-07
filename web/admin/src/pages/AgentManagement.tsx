/**
 * 客服管理页面
 */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getAgentList, setAgents, removeAgent } from "../api/auth";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { MessageAlert } from "../components/common/MessageAlert";
import { PlusIcon, UserIcon, TrashIcon } from "@heroicons/react/24/outline";
import { methods } from "@dootask/tools";

interface Agent {
  id: number;
  username: string;
  name: string;
  avatar: string;
  dootask_user_id: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function AgentManagement() {
  const { t } = useTranslation();
  const [agents, setAgentsState] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isSelectingUsers, setIsSelectingUsers] = useState(false);
  const [removingAgentId, setRemovingAgentId] = useState<number | null>(null);

  // 加载客服列表
  const loadAgents = async () => {
    try {
      setIsLoading(true);
      const data = await getAgentList();
      setAgentsState(data || []);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("加载客服列表失败:", error);
        setMessage({ type: "error", text: error.message || t('agent.loadFailed') });
      } else {
        console.error(t('agent.unknownError'), error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 移除客服
  const handleRemoveAgent = async (agentId: number, agentName: string) => {
    if (!confirm(t('agent.confirmRemove', { name: agentName }))) {
      return;
    }

    try {
      setRemovingAgentId(agentId);
      setMessage(null);

      await removeAgent(agentId);
      setMessage({ type: "success", text: t('agent.removeSuccess', { name: agentName }) });

      // 重新加载客服列表
      await loadAgents();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("移除客服失败:", error);
        setMessage({ type: "error", text: error.message || t('agent.removeFailed') });
      } else {
        console.error(t('agent.unknownError'), error);
      }
    } finally {
      setRemovingAgentId(null);
    }
  };

  // 选择用户并设置为客服
  const handleSelectUsers = async () => {
    try {
      // 
      // setIsSelectingUsers(true);
      setMessage(null);

      // 使用DooTask的用户选择器
      const selectedUsers = await methods.selectUsers({
        multiple: true,
        title: t('agent.selectAgentTitle'),
        placeholder: t('agent.selectAgentPlaceholder'),
      });

      if (!selectedUsers || selectedUsers.length === 0) {
        setMessage({ type: "error", text: t('agent.noUsersSelected') });
        return;
      }
      console.log("selectedUsers", selectedUsers);

      setIsSaving(true);

      // 提取用户ID列表
      const userIds = selectedUsers.map((user: number) => user);

      await setAgents(userIds);
      setMessage({
        type: "success",
        text: t('agent.setSuccess', { count: selectedUsers.length }),
      });

      // 重新加载客服列表
      await loadAgents();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("设置客服失败:", error);
        setMessage({ type: "error", text: error.message || t('agent.setFailed') });
      } else {
        console.error(t('agent.unknownError'), error);
      }
    } finally {
      setIsSelectingUsers(false);
      setIsSaving(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  if (isLoading) {
    return <LoadingSpinner message={t('agent.loadingAgents')} />;
  }

  return (
    <div className="h-full py-4 sm:py-6 md:py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {t('agent.management')}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
            {t('agent.managementDescription')}
          </p>
        </div>

        {/* 消息提示 */}
        {message && (
          <div className="mb-6">
            <MessageAlert message={message} />
          </div>
        )}

        {/* 添加客服 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
            {t('agent.addAgent')}
          </h2>
          <div className="flex flex-col gap-3 sm:gap-4">
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              {t('agent.selectFromDootask')}
            </p>
            <div className="flex justify-start">
              <button
                onClick={handleSelectUsers}
                disabled={isSelectingUsers || isSaving}
                className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSelectingUsers ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span className="hidden sm:inline">{t('agent.selecting')}</span>
                    <span className="sm:hidden">选择中</span>
                  </>
                ) : isSaving ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span className="hidden sm:inline">{t('agent.setting')}</span>
                    <span className="sm:hidden">设置中</span>
                  </>
                ) : (
                  <>
                    <PlusIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span>{t('agent.selectAgents')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 客服列表 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
              {t('agent.agentList')} ({agents.length})
            </h2>
          </div>

          {agents.length === 0 ? (
            <div className="p-6 sm:p-8 text-center">
              <UserIcon className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">{t('agent.noAgents')}</p>
              <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-1">
                {t('agent.addDootaskUsers')}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="p-4 sm:p-6 flex items-center justify-between gap-3 sm:gap-4"
                >
                  <div className="flex items-center min-w-0 flex-1">
                    <div className="flex-shrink-0">
                      {agent.avatar ? (
                        <img
                          className="h-8 w-8 sm:h-10 sm:w-10 rounded-full"
                          src={agent.avatar}
                          alt={agent.name}
                        />
                      ) : (
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                          <UserIcon className="h-4 w-4 sm:h-6 sm:w-6 text-gray-500 dark:text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">
                        {agent.name || agent.username}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                        <span className="hidden sm:inline">{t('agent.username')}: </span>{agent.username}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                        <span className="hidden sm:inline">{t('agent.dootaskId')}: </span>
                        <span className="sm:hidden">ID: </span>{agent.dootask_user_id}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                    <span
                      className={`inline-flex items-center px-1.5 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        agent.status === "active"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                      }`}
                    >
                      <span className="hidden sm:inline">{agent.status === "active" ? t('agent.active') : t('agent.inactive')}</span>
                      <span className="sm:hidden">{agent.status === "active" ? "活跃" : "非活跃"}</span>
                    </span>
                    <button
                      onClick={() =>
                        handleRemoveAgent(
                          agent.id,
                          agent.name || agent.username
                        )
                      }
                      disabled={removingAgentId === agent.id}
                      className="inline-flex items-center p-1.5 sm:p-2 text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={t('agent.removeAgent')}
                    >
                      {removingAgentId === agent.id ? (
                        <svg
                          className="animate-spin h-3 w-3 sm:h-4 sm:w-4"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                      ) : (
                        <TrashIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
