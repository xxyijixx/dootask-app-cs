import React, { useState } from "react";
import { Button, Input } from "@headlessui/react";
import {
  BoltIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CogIcon,
  QuestionMarkCircleIcon,
  XMarkIcon,
  DocumentArrowDownIcon,
} from "@heroicons/react/20/solid";
import { useTranslation } from "react-i18next";
import type { UserBot } from "../../types/dootask";
import type { SystemConfig, ServerConfig } from "../../types/config";
import type { CustomerServiceSource } from "../../types/source";

interface ChatConfigSectionProps {
  systemConfig: SystemConfig;
  selectedUserBot: UserBot | null;
  sources: CustomerServiceSource[];
  newSourceName: string;
  isCreatingSource: boolean;
  serverConfig: ServerConfig;
  onCreateProject: () => void;
  onResetSystemConfig: () => void;
  onCreateSource: () => void;
  onDeleteSource: (source: CustomerServiceSource) => void;
  onEditSource: (source: CustomerServiceSource) => void;
  setNewSourceName: (name: string) => void;
  onUpdateCreateTask: (enabled: boolean) => void;
}

export const ChatConfigSection: React.FC<ChatConfigSectionProps> = ({
  systemConfig,
  selectedUserBot,
  sources,
  newSourceName,
  isCreatingSource,
  serverConfig,
  onCreateProject,
  onResetSystemConfig,
  onCreateSource,
  onDeleteSource,
  onEditSource,
  setNewSourceName,
  onUpdateCreateTask,
}) => {
  const { t } = useTranslation();
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [selectedSource, setSelectedSource] = useState<CustomerServiceSource | null>(null);
  return (
    <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="flex items-center gap-2 mb-4">
        <BoltIcon className="h-6 w-6 text-blue-500" />
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
          {t('config.chatConfig')}
        </h2>
      </div>
      <div className="space-y-4">

        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            type="button"
            onClick={onCreateProject}
            disabled={
              !selectedUserBot ||
              !!systemConfig.dootask_integration.project_id
            }
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition data-[hover]:bg-blue-600 data-[focus]:ring-2 data-[focus]:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            <SparklesIcon className="h-4 w-4" />
            {t('config.createProject')}
          </Button>

          <Button
            type="button"
            onClick={onResetSystemConfig}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition data-[hover]:bg-red-600 data-[focus]:ring-2 data-[focus]:ring-red-500 w-full sm:w-auto"
          >
            <ExclamationTriangleIcon className="h-4 w-4" />
            {t('config.resetSystemConfig')}
          </Button>
        </div>

        {/* DooTask 任务配置 */}
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
          {/* <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
            DooTask 任务配置
          </h3> */}
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="create_task"
                checked={systemConfig.dootask_integration.create_task}
                onChange={(e) => onUpdateCreateTask(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="create_task"
                className="ml-2 block text-sm text-gray-900 dark:text-gray-300"
              >
                {t('config.autoCreateDooTaskTask')}
              </label>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('config.autoCreateTaskDescription')}
            </p>
          </div>
        </div>

        {/* 来源管理 */}
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
            {t('config.sourceManagement')}
          </h3>

          {/* 创建新来源 */}
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md mb-4">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <Input
                  type="text"
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  placeholder={t('config.enterSourceName')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:text-white"
                />
              </div>
              <Button
                type="button"
                onClick={onCreateSource}
                disabled={
                  isCreatingSource ||
                  !selectedUserBot ||
                  !systemConfig.dootask_integration.project_id ||
                  !newSourceName.trim()
                }
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md shadow-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                {isCreatingSource ? (
                  <CogIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <PlusIcon className="h-4 w-4" />
                )}
                {isCreatingSource ? t('config.creating') : t('config.createSource')}
              </Button>
            </div>
          </div>

          {/* 来源列表 */}
          {sources.length > 0 && (
            <div className="space-y-3">
              {sources.map((source) => (
                <div
                  key={source.id}
                  className="bg-white dark:bg-gray-600 p-4 rounded-md border border-gray-200 dark:border-gray-500"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800 dark:text-white">
                        {source.name}
                      </h4>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <span>{t('config.sourceKey')}: </span>
                        <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                          {source.source_key}
                        </code>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <div className="space-y-1 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
                          <div>
                            <span className="font-medium">{t('config.projectId')}:</span>{' '}
                            <span className="break-all block sm:inline">{source.project_id}</span>
                          </div>
                          <div>
                            <span className="font-medium">{t('config.taskId')}:</span>{' '}
                            <span className="break-all block sm:inline">{source.task_id}</span>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="font-medium">{t('config.dialogId')}:</span>{' '}
                            <span className="break-all block sm:inline">{source.dialog_id}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <Button
                        type="button"
                        onClick={() => {
                          setSelectedSource(source);
                          setShowUsageModal(true);
                        }}
                        className="inline-flex items-center justify-center gap-1 px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 w-full sm:w-auto"
                      >
                        <QuestionMarkCircleIcon className="h-3 w-3" />
                        {t('config.usageInstructions')}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => onEditSource(source)}
                        className="inline-flex items-center justify-center gap-1 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 w-full sm:w-auto"
                      >
                        <PencilIcon className="h-3 w-3" />
                        {t('config.edit')}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => onDeleteSource(source)}
                        className="inline-flex items-center justify-center gap-1 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 w-full sm:w-auto"
                      >
                        <TrashIcon className="h-3 w-3" />
                        {t('config.delete')}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 使用说明弹窗 */}
      {showUsageModal && selectedSource && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto shadow-lg border border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{t('config.widgetUsageInstructions')}</h3>
              <Button
                type="button"
                onClick={() => {
                  setShowUsageModal(false);
                  setSelectedSource(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-800 dark:text-white mb-2">{t('config.addCodeToWebpage')}</h4>
                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md">
                  <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
{`<!-- ${t('config.source.global')} -->
<script>
    window.CHATDESK_WIDGET_CONFIG = {
        // ${t('config.source.baseUrl')}
        baseUrl: '${serverConfig.base_url}',
        
        // ${t('config.source.sourceKey')}
        source: '${selectedSource.source_key}',
        
        // ${t('config.source.language')}
        language: 'zh',
        
        // ${t('config.source.theme')}
        theme: 'minimal',
    };
</script>

<!-- ${t('config.source.refscript')} -->
<script src="${serverConfig.base_url}/widget/bundle.js" defer></script>
`}
                  </pre>
                </div>
              </div>
              
              <div>
                 <h4 className="font-medium text-gray-800 dark:text-white mb-2">{t('config.currentSourceInfo')}</h4>
                 <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                   <p className="text-sm text-gray-600 dark:text-gray-400">
                     <strong>{t('config.sourceName')}：</strong>{selectedSource.name}
                   </p>
                   <p className="text-sm text-gray-600 dark:text-gray-400">
                     <strong>Source Key：</strong>
                     <code className="bg-gray-200 dark:bg-gray-600 px-1 rounded ml-1">{selectedSource.source_key}</code>
                   </p>
                 </div>
               </div>
              
              <div>
                <h4 className="font-medium text-gray-800 dark:text-white mb-2">{t('config.downloadWidgetFile')}</h4>
                <Button
                  type="button"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = `${serverConfig.base_url}/widget/bundle.js?download=true`;
                    link.download = 'bundle.js';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  {t('config.downloadBundle')}
                </Button>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {t('config.widgetUsageNote')}
                </p>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
               <Button
                 type="button"
                 onClick={() => {
                   setShowUsageModal(false);
                   setSelectedSource(null);
                 }}
                 className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
               >
                 {t('config.close')}
               </Button>
             </div>
          </div>
        </div>
      )}
    </section>
  );
};