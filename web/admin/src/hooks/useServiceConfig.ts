import { useState, useEffect } from "react";
import { useToast } from '../components/Toast';
import { isMicroApp, appReady } from "@dootask/tools";
import {
  createBot,
  getBotList,
  updateBot,
  createProject,
  createTask,
  getTaskDialog,
  openUserDialog,
  getUserDialogList,
  sendMessage,
  getProjectInfo,
  updateProjectUser,
  updateProjectPermisson,
  createProjectColumn,
  generateMentionMessage,
} from "../api/dootask";
import { getConfig, saveConfig, getServerConfig } from "../api/cs";
import {
  createSource,
  getSourceList,
  deleteSource,
} from "../api/source";
import type { SystemConfig, DooTaskChatConfig, ServerConfig } from "../types/config";
import type { CustomerServiceSource } from "../types/source";
import type { UserBot, ProjectUser } from "../types/dootask";

const defaultSystemConfig: SystemConfig = {
  service_name: "客服中心",
  dootask_integration: {
    bot_id: null,
    bot_token: "",
    project_id: null,
    create_task: false,
  },
  default_source_config: {
    welcome_message: "欢迎来到客服中心，请问有什么可以帮助您的？",
    offline_message: "当前客服不在线，请留言，我们会尽快回复您。",
    working_hours: {
      enabled: true,
      start_time: "09:00",
      end_time: "18:00",
      work_days: [1, 2, 3, 4, 5], // 周一到周五
    },
    auto_reply: {
      enabled: true,
      delay: 30,
      message: "您好，客服正在处理其他问题，请稍等片刻。",
    },
    agent_assignment: {
      method: "round-robin", 
      timeout: 60,
      fallback_agent_id: null,
    },
    ui: {
      primary_color: "#3B82F6",
      logo_url: "",
      chat_bubble_position: "right",
    },
  },
  reserved1: "",
  reserved2: "",
};

const defaultDooTaskChatConfig: DooTaskChatConfig = {
  chat_key: "",
}

const defaultServerConfig: ServerConfig = {
  base_url: "http://localhost"
}

export const useServiceConfig = () => {

  const toast = useToast();

  // 状态管理
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(defaultSystemConfig);
  const [dootaskChatConfig, setDootaskChatConfig] = useState<DooTaskChatConfig>(defaultDooTaskChatConfig);
  const [serverConfig, setServerConfig] = useState<ServerConfig>(defaultServerConfig);
  const [sources, setSources] = useState<CustomerServiceSource[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [isRunInMicroApp, setIsRunInMicroApp] = useState<boolean>(false);
  const [userBots, setUserBots] = useState<UserBot[]>([]);
  const [selectedUserBot, setSelectedUserBot] = useState<UserBot | null>(null);
  const [newSourceName, setNewSourceName] = useState<string>("");
  const [isCreatingSource, setIsCreatingSource] = useState<boolean>(false);
  const [editingSource, setEditingSource] = useState<CustomerServiceSource | null>(null);
  
  // 确认对话框状态
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // 初始化和加载配置
  useEffect(() => {
    const initialize = async () => {
      await appReady();
      console.log("微应用初始化完成");

      const microApp = await isMicroApp();
      if (microApp) {
        console.log("当前是微应用");
        setIsRunInMicroApp(true);
        // 获取机器人列表
        try {
          const response = await getBotList();
          const bots = response.data.list;
          console.log("客服机器人列表:", bots);
          setUserBots(bots);
        } catch (error) {
          console.error("获取客服机器人列表失败:", error instanceof Error ? error.message : error);
        }
      }

      // 加载配置
      try {
        const configData = await getConfig("customer_service_system_config");
        if (configData) {
          setSystemConfig(configData);
          if (configData.dootask_integration?.bot_id && microApp) {
            getBotList()
              .then((response) => {
                const bots = response.data.list;
                const selectedBot = bots.find(
                  (bot) => bot.id === configData.dootask_integration.bot_id
                );
                if (selectedBot) {
                  setSelectedUserBot(selectedBot);
                }
                setUserBots(bots);
              })
              .catch((error) => {
                console.error("获取机器人列表失败:", error.message);
              });
          }
        } else {
          setSystemConfig(defaultSystemConfig);
        }

        if (microApp) {
          await loadSources();
        }

        setIsLoading(false);
      } catch (error) {
        console.error("加载配置失败:", error);
        setSystemConfig(defaultSystemConfig);
        setIsLoading(false);
      }

      try {
        const dootaskConfigData = await getConfig("dootask_chat");
        if (dootaskConfigData) {
          setDootaskChatConfig(dootaskConfigData);
        } else {
          setDootaskChatConfig(defaultDooTaskChatConfig);
        }
      } catch (error) {
        console.error("加载配置失败:", error);
      }

      try{
        const serverConfigData = await getServerConfig();
        if (serverConfigData) {
          setServerConfig(serverConfigData)
        } else {
          setServerConfig(defaultServerConfig)
        }
      } catch(error) {
          console.error("加载配置失败:", error);
        }
    };

    initialize();
  }, []);

  // 加载来源列表
  const loadSources = async () => {
    try {
      const sourceList = await getSourceList();
      setSources(sourceList);
    } catch (error) {
      console.error("加载来源列表失败:", error);
    }
  };


  // 获取机器人列表
  const onGetUserBotList = () => {
    if (!isRunInMicroApp) return;
    
    getBotList()
      .then((response) => {
        const bots = response.data.list;
        console.log("客服机器人列表:", bots);
        setUserBots(bots);
      })
      .catch((error) => {
        console.error("获取客服机器人列表失败:", error.message);
      });
  };

  const onUpdateUserBot = (userBot: UserBot) => {
    if (!isRunInMicroApp) return;

    updateBot(userBot)
     .then(() => {
        console.log("机器人更新成功");
        // 更新本地状态
        setSelectedUserBot(userBot);
        setUserBots(prevBots => 
          prevBots.map(bot => 
            bot.id === userBot.id ? userBot : bot
          )
        );
        toast.showSuccess("机器人配置已更新");
      })
     .catch((error) => {
        console.error("更新机器人失败:", error.message);
        toast.showError(`更新机器人失败: ${error.message}`);
      });
  }



  // 创建机器人
  const onCreateUserBot = async () => {
    if (!isRunInMicroApp) return;

    try {
      const createBotResponse = await createBot({
        id: 0,
        avatar: [],
        name: "客服机器人",
      });
      const botId = createBotResponse.data.id;
     
      const openUserDialogResponse = await openUserDialog(botId);
      const userBotDialogID = openUserDialogResponse.data.id;

      if (userBotDialogID <= 0) {
        throw new Error("对话ID无效");
      }

      await sendMessage({
        dialog_id: userBotDialogID,
        text: "/token",
      });
      toast.showSuccess(`机器人创建成功，机器人ID: ${botId}`);
    } catch (error: unknown) {
      console.error("创建或发送消息失败:", (error as Error).message);
      toast.showError(`创建失败: ${(error as Error).message}`);
    }
  };

  // 创建项目
  const onCreateProject = async () => {
    if (!isRunInMicroApp) return;
    
    if (!selectedUserBot) {
      toast.showError("请先选择一个机器人");
      return;
    }
    
    if (systemConfig.dootask_integration.project_id) {
      toast.showError("项目已存在，请先重置后再创建");
      return;
    }

    try {
      // 创建项目
      const response = await createProject({
        name: "智慧客服",
        flow: false,
      });
      
      const projectId = response.data.id;

      // 更新系统配置
      setSystemConfig((prev) => ({
        ...prev,
        dootask_integration: {
          ...prev.dootask_integration,
          bot_id: selectedUserBot.id,
          project_id: projectId,
        },
      }));

      // 更新项目权限
      await updateProjectPermisson(projectId);
      
      // 获取项目信息并提取用户ID
      const projectInfo = await getProjectInfo(projectId);
      const projectUserIds: number[] = [];
      
      // 提取项目用户的userid
      if (projectInfo.data && projectInfo.data.project_user) {
        projectInfo.data.project_user.forEach((user: ProjectUser) => {
          if (user.userid) {
            projectUserIds.push(user.userid);
          }
        });
      }
      
      // 添加机器人ID到用户列表
      if (selectedUserBot.id && !projectUserIds.includes(selectedUserBot.id)) {
        projectUserIds.push(selectedUserBot.id);
      }
      
      // 更新项目用户
      await updateProjectUser(projectId, projectUserIds);
      
      toast.showSuccess(`项目创建成功，项目ID: ${projectId}`);
      
    } catch (error) {
      console.error("创建项目失败:", error);
      toast.showError(`创建项目失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 检查指定项目中是否包含指定用户
  const onCheckProjectUser = async (projectId: number, userId: number): Promise<{projectUserIds: number[], result: boolean}> => {
    if (!isRunInMicroApp) return {projectUserIds: [], result: false};
    const projectInfo = await getProjectInfo(projectId);
    const projectUserIds: number[] = [];
    projectInfo.data.project_user.forEach((user: ProjectUser) => {
      if (user.userid) {
        projectUserIds.push(user.userid);
      }
    });
    if (projectUserIds.includes(userId)) {
      return {projectUserIds: projectUserIds, result: true};
    } else {
      return {projectUserIds: projectUserIds, result: false};
    }
  }

  // 将机器人添加到项目
  const onAddBotToProject = async (projectId: number, botId: number, currentUserIds: number[]): Promise<void> => {
    if (!isRunInMicroApp) {
      throw new Error('不在微应用环境中，无法执行此操作');
    }
    
    try {
      // 将机器人ID添加到现有用户ID列表中
      const updatedUserIds = [...currentUserIds, botId];
      
      // 调用API更新项目用户
      await updateProjectUser(projectId, updatedUserIds);
      
      toast.showSuccess("机器人已成功添加到项目中");
    } catch (error) {
      console.error("添加机器人到项目失败:", error);
      toast.showError(`添加机器人到项目失败: ${error instanceof Error ? error.message : '未知错误'}`);
      throw error;
    }
  };

  // 创建并获取机器人Token
  const onCreateAndGetUserBotToken = async (botId: number) => {
    try {
      const openUserDialogResponse = await openUserDialog(botId);
      const userBotDialogID = openUserDialogResponse.data.id;
      console.log(`对话ID: ${userBotDialogID}`);
      
      await sendMessage({
        dialog_id: userBotDialogID,
        text: "/token",
      });
      
      setTimeout(async () => {
        const dialogList = await getUserDialogList(userBotDialogID);
        console.log("对话列表:", dialogList);
        
        for (const dialog of dialogList.data.list) {
          console.log("消息内容 ", dialog);
          if (dialog.msg.type == "/token") {
            const botToken = dialog.msg.data.token;
            console.log("Token", botToken);
            
            setSystemConfig((prev) => ({
              ...prev,
              dootask_integration: {
                ...prev.dootask_integration,
                bot_id: botId,
                bot_token: botToken,
              },
            }));
            break;
          }
        }
      }, 2000);
    } catch (error) {
      console.error("获取对话列表失败:", error);
    }
  };

  // 选择机器人
  const onSelectUserBot = (bot: UserBot | null) => {
    if (bot) {
      onCreateAndGetUserBotToken(bot.id);
    }
    setSelectedUserBot(bot);
  };

  // 创建来源
  const onCreateSource = async () => {
    if (!isRunInMicroApp) return;
    
    if (!selectedUserBot) {
      toast.showError("请先选择一个机器人");
      return;
    }
    
    if (!systemConfig.dootask_integration.project_id) {
      toast.showError("请先创建项目");
      return;
    }
    
    if (!newSourceName.trim()) {
      toast.showError("请输入来源名称");
      return;
    }

    setIsCreatingSource(true);
    try {
      const columnResponse = await createProjectColumn(systemConfig.dootask_integration.project_id || 0, newSourceName.trim())
      const columnId = columnResponse.data.id;

      const taskName = `智能客服-${newSourceName.trim()}-通知提醒`;

      const taskResponse = await createTask({
        project_id: systemConfig.dootask_integration.project_id || 0,
        name: taskName,
        content: `客服来源：${newSourceName.trim()}`,
      });

      const taskId = taskResponse.data.id;

      const dialogResponse = await getTaskDialog(taskId);
      const dialogId = dialogResponse.data.dialog_id;

      await sendMessage({
        dialog_id: dialogId,
        text: generateMentionMessage(selectedUserBot.id, "智慧客服", "初始化"),
      });

      const sourceResponse = await createSource({
        name: newSourceName.trim(),
        task_id: taskId,
        dialog_id: dialogId,
        project_id: systemConfig.dootask_integration.project_id || 0,
        column_id: columnId,
        bot_id: selectedUserBot.id,
      });

      const newSource: CustomerServiceSource = {
        id: sourceResponse.id,
        source_key: sourceResponse.source_key,
        name: newSourceName.trim(),
        project_id: sourceResponse.project_id,
        task_id: taskId,
        dialog_id: dialogId,
        ...systemConfig.default_source_config,
      };

      setSources((prev) => [...prev, newSource]);
      setNewSourceName("");

      toast.showSuccess(`来源创建成功！\n来源key: ${sourceResponse.source_key}`);
    } catch (error) {
      console.error("创建来源失败:", error);
      toast.showError(`创建来源失败: ${
        error instanceof Error ? error.message : "未知错误"
      }`);
    } finally {
      setIsCreatingSource(false);
    }
  };

  // 删除来源
  const onDeleteSource = (source: CustomerServiceSource) => {
    setConfirmDialog({
      isOpen: true,
      title: '删除确认',
      message: `确定要删除来源 "${source.name}" 吗？`,
      onConfirm: async () => {
        try {
          if (source.id) {
            await deleteSource(source.id);
          }
          setSources((prev) => prev.filter((s) => s.id !== source.id));
          toast.showSuccess("来源删除成功");
        } catch (error) {
          console.error("删除来源失败:", error);
          toast.showError(`删除来源失败: ${
            error instanceof Error ? error.message : "未知错误"
          }`);
        }
      }
    });
  };
  
  // 关闭确认对话框
  const closeConfirmDialog = () => {
    setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  };

  // 重置系统配置
  const onResetSystemConfig = () => {
    setConfirmDialog({
      isOpen: true,
      title: '重置确认',
      message: '确定要重置系统配置吗？这将清除所有DooTask集成设置。',
      onConfirm: () => {
        setSystemConfig((prev) => ({
          ...prev,
          dootask_integration: {
            bot_id: null,
            bot_token: "",
            project_id: null,
            create_task: false,
          },
        }));
        setSelectedUserBot(null);
        toast.showSuccess("系统配置已重置");
      }
    });
  };

  // 保存系统配置
  const handleSystemConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);


    try {
      await saveConfig("customer_service_system_config", systemConfig);
      console.log("保存系统配置:", systemConfig);

      toast.showSuccess("系统配置已成功保存！");
    } catch (error) {
      console.error("保存系统配置失败:", error);
      toast.showError(`保存系统配置失败: ${
        error instanceof Error ? error.message : "未知错误"
      }`);
    } finally {
      setIsSaving(false);
    }
  };

  // 处理系统配置基本字段变化
  const handleSystemConfigChange = (
    field: keyof SystemConfig,
    value: string
  ) => {
    setSystemConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // 处理默认来源配置字段变化
  const handleDefaultSourceConfigChange = (field: string, value: unknown) => {
    setSystemConfig((prev) => ({
      ...prev,
      default_source_config: {
        ...prev.default_source_config,
        [field]: value,
      },
    }));
  };

  // 处理DooTask集成配置变化
  const handleDooTaskConfigChange = (field: string, value: unknown) => {
    setSystemConfig((prev) => ({
      ...prev,
      dootask_integration: {
        ...prev.dootask_integration,
        [field]: value,
      },
    }));
  };

  // 更新createTask配置
  const onUpdateCreateTask = (enabled: boolean) => {
    handleDooTaskConfigChange('create_task', enabled);
  };

  return {
    // 状态
    systemConfig,
    dootaskChatConfig,
    serverConfig,
    sources,
    isLoading,
    isSaving,

    isRunInMicroApp,
    userBots,
    selectedUserBot,
    newSourceName,
    isCreatingSource,
    editingSource,
    
    // 设置状态
    setNewSourceName,
    setEditingSource,
    
    // 确认对话框状态
    confirmDialog,
    closeConfirmDialog,
    
    // 方法
    onGetUserBotList,
    onCreateUserBot,
    onCreateProject,
    onCheckProjectUser,
    onAddBotToProject,
    onSelectUserBot,
    onUpdateUserBot,
    onCreateSource,
    onDeleteSource,
    onResetSystemConfig,
    onUpdateCreateTask,
    handleSystemConfigSubmit,
    handleSystemConfigChange,
    handleDefaultSourceConfigChange,
    handleDooTaskConfigChange,
  };
};