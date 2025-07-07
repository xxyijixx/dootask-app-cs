import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Button,
} from "@headlessui/react";
import {
  CheckIcon,
  ChevronDownIcon,
  BoltIcon,
  // SparklesIcon,
  ExclamationTriangleIcon,
  UserPlusIcon,
} from "@heroicons/react/20/solid";
import type { UserBot } from "../../types/dootask";
import type { SystemConfig, DooTaskChatConfig, ServerConfig } from "../../types/config";

interface BotConfigSectionProps {
  systemConfig: SystemConfig;
  dootaskChatConfig: DooTaskChatConfig;
  serverConfig: ServerConfig;
  userBots: UserBot[];
  selectedUserBot: UserBot | null;
  sourcesCount: number;
  onGetUserBotList: () => void;
  onCreateUserBot: () => void;
  onCreateProject: () => void;
  onResetSystemConfig: () => void;
  onSelectUserBot: (bot: UserBot | null) => void;
  onUpdateUserBot: (bot: UserBot) => void;
  onCheckProjectUser: (projectId: number, userId: number) => Promise<{projectUserIds: number[], result: boolean}>;
  onAddBotToProject: (projectId: number, botId: number, currentUserIds: number[]) => Promise<void>;
}

export const BotConfigSection: React.FC<BotConfigSectionProps> = ({
  systemConfig,
  dootaskChatConfig,
  serverConfig,
  userBots,
  selectedUserBot,
  sourcesCount,
  onGetUserBotList,
  onCreateUserBot,
  onSelectUserBot,
  onUpdateUserBot,
  onCheckProjectUser,
  onAddBotToProject,
}) => {
  const { t } = useTranslation();
  const DEFAULT_WEBHOOK_URL = `${serverConfig.base_url}/api/v1/dootask/${dootaskChatConfig.chat_key}/chat`;
  
  // 项目成员检查状态
  const [botInProject, setBotInProject] = useState<boolean | null>(null);
  const [projectUserIds, setProjectUserIds] = useState<number[]>([]);
  const [isCheckingProject, setIsCheckingProject] = useState(false);
  const [isAddingToProject, setIsAddingToProject] = useState(false);
  
  // 检查机器人是否在项目中
  const checkBotInProject = async (bot: UserBot | null) => {
    if (!bot || !systemConfig.dootask_integration.project_id) {
      setBotInProject(null);
      setProjectUserIds([]);
      return;
    }
    
    setIsCheckingProject(true);
    try {
      const result = await onCheckProjectUser(systemConfig.dootask_integration.project_id, bot.id);
      setBotInProject(result.result);
      setProjectUserIds(result.projectUserIds);
    } catch (error) {
      console.error('检查项目成员失败:', error);
      setBotInProject(null);
      setProjectUserIds([]);
    } finally {
      setIsCheckingProject(false);
    }
  };
  
  // 将机器人添加到项目
  const handleAddBotToProject = async () => {
    if (!selectedUserBot || !systemConfig.dootask_integration.project_id) return;
    
    setIsAddingToProject(true);
    try {
      await onAddBotToProject(
        systemConfig.dootask_integration.project_id,
        selectedUserBot.id,
        projectUserIds
      );
      // 重新检查项目成员状态
      await checkBotInProject(selectedUserBot);
    } catch (error) {
      console.error('添加机器人到项目失败:', error);
    } finally {
      setIsAddingToProject(false);
    }
  };
  
  // 处理机器人选择
  const handleSelectUserBot = (bot: UserBot | null) => {
    onSelectUserBot(bot);
    checkBotInProject(bot);
  };
  
  // 组件加载时检查当前选中的机器人
  useEffect(() => {
    checkBotInProject(selectedUserBot);
  }, [selectedUserBot, systemConfig.dootask_integration.project_id]);

  return (
    <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="flex items-center gap-2 mb-4">
        <BoltIcon className="h-6 w-6 text-blue-500" />
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
          {t('config.botConfig')}
        </h2>
      </div>
      <div className="space-y-4">
        {/* 显示当前配置状态 */}
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('config.currentConfigStatus')}
          </h3>
          <div className="space-y-3 sm:space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <span className="text-gray-500 dark:text-gray-400 text-sm min-w-0 sm:min-w-[100px]">
                {t('config.botId')}:
              </span>
              <span className="font-mono text-sm break-all sm:ml-2">
                {systemConfig.dootask_integration.bot_id || t('config.notSet')}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center">
              <span className="text-gray-500 dark:text-gray-400 text-sm min-w-0 sm:min-w-[100px]">
                {t('config.projectId')}:
              </span>
              <span className="font-mono text-sm break-all sm:ml-2">
                {systemConfig.dootask_integration.project_id || t('config.notSet')}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center">
              <span className="text-gray-500 dark:text-gray-400 text-sm min-w-0 sm:min-w-[100px]">
                {t('config.sourcesCount')}:
              </span>
              <span className="font-mono text-sm break-all sm:ml-2">{sourcesCount}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 sm:flex-initial">
            <Listbox value={selectedUserBot} onChange={handleSelectUserBot}>
              <ListboxButton className="relative w-full sm:w-64 cursor-default rounded-md bg-white dark:bg-gray-700 py-2 pl-3 pr-10 text-left shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm">
                <span className="flex items-center">
                  {selectedUserBot?.avatar && (
                    <img
                      src={selectedUserBot.avatar}
                      alt={selectedUserBot.name}
                      className="h-6 w-6 flex-shrink-0 rounded-full mr-2"
                    />
                  )}
                  <span className="block truncate text-gray-900 dark:text-white">
                    {selectedUserBot?.name || t('config.noBotSelected')}
                  </span>
                </span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronDownIcon
                    className="h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                </span>
              </ListboxButton>
              <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-700 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {userBots.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <BoltIcon className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500 mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      {t('config.noBotAvailable')}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {t('config.createBotToGetStarted')}
                    </p>
                  </div>
                ) : (
                  userBots.map((bot) => (
                    <ListboxOption
                      key={bot.id}
                      value={bot}
                      className="group relative cursor-default select-none py-2 pl-10 pr-4 text-gray-900 dark:text-white data-[focus]:bg-blue-600 data-[focus]:text-white"
                    >
                      <div className="flex items-center">
                        {bot.avatar && (
                          <img
                            src={bot.avatar}
                            alt={bot.name}
                            className="h-6 w-6 flex-shrink-0 rounded-full mr-2"
                          />
                        )}
                        <span className="block truncate font-normal group-data-[selected]:font-semibold">
                          {bot.name}
                        </span>
                      </div>
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600 group-data-[focus]:text-white [.group:not([data-selected])_&]:hidden">
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    </ListboxOption>
                  ))
                )}
              </ListboxOptions>
            </Listbox>
          </div>

          <Button
            type="button"
            onClick={async () => {
              await onCreateUserBot();
              // 创建机器人后刷新机器人列表
              onGetUserBotList();
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md shadow-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition data-[hover]:bg-green-600 data-[focus]:ring-2 data-[focus]:ring-green-500 w-full sm:w-auto"
          >
            <BoltIcon className="h-4 w-4" />
            {t('config.createBot')}
          </Button>
        </div>
        
        {/* 项目成员检查状态 */}
        {selectedUserBot && systemConfig.dootask_integration.project_id && !botInProject && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
                {isCheckingProject ? (
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {t('config.checkingBotInProject')}
                  </p>
                ) : botInProject === false ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <ExclamationTriangleIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      <p className="text-sm text-orange-800 dark:text-orange-200">
                        {t('config.botNotInProject', { botName: selectedUserBot.name, botId: selectedUserBot.id })}
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={handleAddBotToProject}
                      disabled={isAddingToProject}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition data-[hover]:bg-blue-700 data-[focus]:ring-2 data-[focus]:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <UserPlusIcon className="h-4 w-4" />
                      {isAddingToProject ? t('config.adding') : t('config.addBotToProject')}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('config.cannotCheckProjectStatus')}
                  </p>
                )}
              </div>
          </div>
        )}
        
        {/* Webhook 配置状态和操作 */}
        {systemConfig.dootask_integration.create_task && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  {t('config.autoCreateTaskEnabled')}
                </p>
                
                {/* Webhook 状态显示和操作 */}
                {selectedUserBot && (
                  <div className="space-y-2">
                    {selectedUserBot.webhook_url === "" ? (
                      <div className="space-y-3">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          {t('config.webhookNotSet')}
                        </p>
                        <Button
                          type="button"
                          onClick={() => {
                            onUpdateUserBot({
                              ...selectedUserBot,
                              webhook_url: DEFAULT_WEBHOOK_URL,
                            })
                          }}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-md shadow-sm hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition data-[hover]:bg-yellow-700 data-[focus]:ring-2 data-[focus]:ring-yellow-500 w-full sm:w-auto"
                        >
                          <BoltIcon className="h-4 w-4" />
                          {t('config.setDefaultWebhook')}
                        </Button>
                      </div>
                    ) : selectedUserBot.webhook_url !== DEFAULT_WEBHOOK_URL ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                            {t('config.currentWebhook')}:
                          </p>
                          <code className="bg-yellow-100 dark:bg-yellow-800 px-2 py-1 rounded text-xs break-all block">{selectedUserBot.webhook_url}</code>
                          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
                            {t('config.webhookNotDefault')}
                          </p>
                        </div>
                        <Button
                          type="button"
                          onClick={() => {
                            onUpdateUserBot({
                              ...selectedUserBot,
                              webhook_url: DEFAULT_WEBHOOK_URL,
                            })
                          }}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-md shadow-sm hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition data-[hover]:bg-yellow-700 data-[focus]:ring-2 data-[focus]:ring-yellow-500 w-full sm:w-auto"
                        >
                          <BoltIcon className="h-4 w-4" />
                          {t('config.resetToDefault')}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <p className="text-sm text-green-800 dark:text-green-200">
                            {t('config.webhookConfiguredCorrectly')}:
                          </p>
                        </div>
                        <code className="bg-green-100 dark:bg-green-800 px-2 py-1 rounded text-xs break-all block">{DEFAULT_WEBHOOK_URL}</code>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
