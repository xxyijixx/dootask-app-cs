import React, { createContext, useContext, useState, useEffect } from 'react';
import { getLanguageName } from '@dootask/tools';
import { useTranslation } from 'react-i18next';

type Language = 'zh-CN' | 'en-US';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { i18n } = useTranslation();

    // 从@dootask/tools获取初始语言，如果没有则使用默认值
  const getInitialLanguage = async(): Promise<Language> => {
    if (typeof window !== 'undefined') {
      const storedLang = window.sessionStorage.getItem('language');
      if (storedLang) {
        return storedLang as Language;
      }
      
      const dootaskLang = await getLanguageName();
      if (dootaskLang) {
        console.log('DooTask获取到的语言信息', dootaskLang);
        // 兼容DooTask返回的语言格式
        if (dootaskLang === 'zh') {
          return 'zh-CN';
        } else if (dootaskLang === 'en') {
          return 'en-US';
        } else {
          // 如果不是zh或en，则使用默认语言en-US
          return 'en-US';
        }
      }
      
      // 获取浏览器语言偏好
      const browserLang = navigator.language;
      if (browserLang.startsWith('zh')) {
        return 'zh-CN';
      } else if (browserLang.startsWith('en')) {
        return 'en-US';
      }
    }
    
    return 'en-US';
  };

  const [language, setLanguageState] = useState<Language>('en-US');
  

  // 初始化主题
  useEffect(() => {
    const initTheme = async () => {
      const initialLanguage= await getInitialLanguage();
      setLanguageState(initialLanguage);
    };
    initTheme();
  }, []);
  // 设置语言
  const setLanguage = (lang: Language) => {
    console.log(`切换语言从 ${language} 到 ${lang}`);
    setLanguageState(lang);
    i18n.changeLanguage(lang);
    // 保存到sessionStorage
    // if (typeof window !== 'undefined' && window.sessionStorage) {
    //   window.sessionStorage.setItem('language', lang);
    // }
  };

  // 监听getLanguage()的变化
  useEffect(() => {
    const checkLanguageChange = async() => {
      const currentLang = await getLanguageName();
      if (currentLang) {
        let normalizedLang: Language;
        // 兼容DooTask返回的语言格式
        if (currentLang === 'zh') {
          normalizedLang = 'zh-CN';
        } else if (currentLang === 'en') {
          normalizedLang = 'en-US';
        } else {
          // 如果不是zh或en，则使用默认语言en-US
          normalizedLang = 'en-US';
        }
        
        if (normalizedLang !== language) {
          console.log(`检测到DooTask语言变化: ${language} -> ${normalizedLang}`);
          setLanguageState(normalizedLang);
          i18n.changeLanguage(normalizedLang);
        }
      }
    };

    // 设置定时器检查语言变化
    const interval = setInterval(checkLanguageChange, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [language, i18n]);

  // 初始化时设置i18n语言
  useEffect(() => {
    i18n.changeLanguage(language);
  }, []);

  // 当语言变化时，更新document的lang属性
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
