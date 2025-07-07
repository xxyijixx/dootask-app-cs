import { useServiceConfig } from "../hooks/useServiceConfig";
import { useTranslation } from 'react-i18next';
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { BotConfigSection } from "../components/config/BotConfigSection";
import { ChatConfigSection } from "../components/config/ChatConfigSection";
import { ConfirmDialog } from "../components/ConfirmDialog";

export default function ServiceConfig() {
  const { t } = useTranslation();
  const {
    systemConfig,
    dootaskChatConfig,
    serverConfig,
    sources,
    isLoading,
    isSaving,
    userBots,
    selectedUserBot,
    newSourceName,
    isCreatingSource,
    confirmDialog,
    closeConfirmDialog,
    setNewSourceName,
    setEditingSource,
    onGetUserBotList,
    onCreateUserBot,
    onUpdateUserBot,
    onCreateProject,
    onCheckProjectUser,
    onAddBotToProject,
    onSelectUserBot,
    onCreateSource,
    onDeleteSource,
    onResetSystemConfig,
    onUpdateCreateTask,
    handleSystemConfigSubmit,
  } = useServiceConfig();

  if (isLoading) {
    return <LoadingSpinner message={t('config.loadingConfig')} />;
  }

  return (
    <div className="h-full py-4 sm:py-6 md:py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{t('config.title')}</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
            {t('config.description')}
          </p>
        </div>

        <form onSubmit={handleSystemConfigSubmit} className="space-y-4 sm:space-y-6">

          {/* 机器人配置 */}
          <BotConfigSection
            systemConfig={systemConfig}
            dootaskChatConfig={dootaskChatConfig}
            serverConfig={serverConfig}
            userBots={userBots}
            selectedUserBot={selectedUserBot}
            sourcesCount={sources.length}
            onGetUserBotList={onGetUserBotList}
            onCreateUserBot={onCreateUserBot}
            onUpdateUserBot={onUpdateUserBot}
            onSelectUserBot={onSelectUserBot}
            onCreateProject={onCreateProject}
            onResetSystemConfig={onResetSystemConfig}
            onCheckProjectUser={onCheckProjectUser}
            onAddBotToProject={onAddBotToProject}
          />

          {/* 聊天配置 */}
          <ChatConfigSection
            systemConfig={systemConfig}
            selectedUserBot={selectedUserBot}
            sources={sources}
            newSourceName={newSourceName}
            isCreatingSource={isCreatingSource}
            serverConfig={serverConfig}
            setNewSourceName={setNewSourceName}
            onCreateProject={onCreateProject}
            onResetSystemConfig={onResetSystemConfig}
            onCreateSource={onCreateSource}
            onDeleteSource={onDeleteSource}
            onEditSource={setEditingSource}
            onUpdateCreateTask={onUpdateCreateTask}
          />

          {/* 基本配置 */}
          {/* <BasicConfigSection
            systemConfig={systemConfig}
            onSystemConfigChange={handleSystemConfigChange}
            onDefaultSourceConfigChange={handleDefaultSourceConfigChange}
          /> */}

          {/* 工作时间设置 */}
           {/* <WorkingHoursSection
             systemConfig={systemConfig}
             onDefaultSourceConfigChange={handleDefaultSourceConfigChange}
           /> */}

          {/* 默认自动回复和客服分配设置 */}
           {/* <AutoReplySection
             systemConfig={systemConfig}
             onDefaultSourceConfigChange={handleDefaultSourceConfigChange}
           /> */}

          {/* 默认界面设置 */}
           {/* <UIConfigSection
             systemConfig={systemConfig}
             onDefaultSourceConfigChange={handleDefaultSourceConfigChange}
           /> */}

          {/* 提交按钮 */}
          <div className="flex justify-end pt-4 sm:pt-6">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 border border-transparent text-sm sm:text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white"
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
                  <span>{t('config.saving')}</span>
                </>
              ) : (
                <>
                  <span>{t('config.saveConfig')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      
      {/* 确认对话框 */}
       <ConfirmDialog
         isOpen={confirmDialog.isOpen}
         onClose={closeConfirmDialog}
         onConfirm={confirmDialog.onConfirm}
         title={confirmDialog.title}
         message={confirmDialog.message}
         type={confirmDialog.title === t('config.deleteConfirm') ? 'danger' : 'warning'}
         confirmText={confirmDialog.title === t('config.deleteConfirm') ? t('config.delete') : t('config.confirm')}
         cancelText={t('config.cancel')}
       />
    </div>
  );
}
