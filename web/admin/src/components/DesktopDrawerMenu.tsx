import React, { useState, useEffect } from 'react';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { XMarkIcon, ChatBubbleLeftRightIcon, UserGroupIcon, Cog6ToothIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { isElectron, isMainElectron, popoutWindow } from '@dootask/tools';

interface DesktopDrawerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  isAgent: boolean;
}

export const DesktopDrawerMenu: React.FC<DesktopDrawerMenuProps> = ({
  isOpen,
  onClose,
  isAdmin,
  isAgent,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [isElectronEnv, setIsElectronEnv] = useState(false);
  const [isMainElectronEnv, setIsMainElectronEnv] = useState(false);

  // 检测屏幕尺寸和环境
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    const checkEnvironment = async () => {
      const electronEnv = await isElectron();
      const mainElectronEnv = await isMainElectron();
      setIsElectronEnv(electronEnv);
      setIsMainElectronEnv(mainElectronEnv);
    };

    checkMobile();
    checkEnvironment();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleNavigation = (path: string) => {
    onClose();
    navigate(path);
  };

  const handleOpenNewWindow = () => {
    if (isElectronEnv && isMainElectronEnv) {
      popoutWindow({});
    }
    onClose();
  };

  const menuItems = [
    {
      id: 'chat',
      title: t("navigation.chat"),
      description: t('navigation.chatDescription'),
      icon: ChatBubbleLeftRightIcon,
      path: '/chat',
      show: isAdmin || isAgent,
      color: 'blue'
    },
    {
      id: 'agents',
      title: t("navigation.agent"),
      description: t('navigation.agentDescription'),
      icon: UserGroupIcon,
      path: '/agents',
      show: isAdmin,
      color: 'green'
    },
    {
      id: 'config',
      title: t("navigation.config"),
      description: t('navigation.configDescription'),
      icon: Cog6ToothIcon,
      path: '/config',
      show: isAdmin,
      color: 'purple'
    }
  ];

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
      green: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400',
      purple: 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400'
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  // 移动端全屏菜单
  if (isMobile) {
    return (
      <Transition
        show={isOpen}
        enter="transition ease-out duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition ease-in duration-200"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900">
          {/* 菜单头部 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('navigation.menu')}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          
          {/* 菜单内容 */}
          <div className="p-4 space-y-2">
            {menuItems
              .filter(item => item.show)
              .map((item) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.path)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getColorClasses(item.color)}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium">{item.title}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{item.description}</div>
                    </div>
                  </button>
                );
              })}
            
            {/* Electron 新窗口打开选项 */}
            {isElectronEnv && isMainElectronEnv && (
              <button
                onClick={handleOpenNewWindow}
                className="w-full flex items-center gap-4 p-4 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                  <ArrowTopRightOnSquareIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium">新窗口打开</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">在新窗口中打开系统</div>
                </div>
              </button>
            )}
          </div>
        </div>
      </Transition>
    );
  }

  // 桌面端抽屉菜单
  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* 背景遮罩 */}
        {/* <TransitionChild
          as={React.Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </TransitionChild> */}

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              {/* 抽屉面板 */}
              <TransitionChild
                as={React.Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <DialogPanel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col overflow-y-scroll bg-white dark:bg-gray-900 shadow-xl">
                    {/* 抽屉头部 */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t('navigation.menu')}
                      </h2>
                      <button
                        type="button"
                        className="rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onClick={onClose}
                      >
                        <span className="sr-only">关闭菜单</span>
                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                      </button>
                    </div>

                    {/* 抽屉内容 */}
                    <div className="flex-1 px-6 py-4">
                      <nav className="space-y-3">
                        {menuItems
                          .filter(item => item.show)
                          .map((item) => {
                            const IconComponent = item.icon;
                            return (
                              <button
                                key={item.id}
                                onClick={() => handleNavigation(item.path)}
                                className="w-full flex items-center gap-4 p-4 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                              >
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getColorClasses(item.color)}`}>
                                  <IconComponent className="w-6 h-6" />
                                </div>
                                <div className="flex-1 text-left">
                                  <div className="font-medium text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-200">
                                    {item.title}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {item.description}
                                  </div>
                                </div>
                              </button>
                            );
                          })}

                        {/* Electron 新窗口打开选项 */}
                        {isElectronEnv && isMainElectronEnv && (
                          <button
                            onClick={handleOpenNewWindow}
                            className="w-full flex items-center gap-4 p-4 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                          >
                            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                              <ArrowTopRightOnSquareIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div className="flex-1 text-left">
                              <div className="font-medium text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-200">
                                {t('navigation.newWindowOpen')}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {t('navigation.newWindowOpenDescription')}
                              </div>
                            </div>
                          </button>
                        )}
                      </nav>
                    </div>

                    {/* 抽屉底部 */}
                    {/* <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        Doocs Support System
                      </div>
                    </div> */}
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};