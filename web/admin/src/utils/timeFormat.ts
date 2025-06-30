import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * 格式化时间显示
 * @param dateString - 时间字符串
 * @param t - 翻译函数
 * @returns 格式化后的时间字符串
 */
export function formatTimeDisplay(dateString: string, t: (key: string) => string): string {
  if (!dateString) return '';
  
  const messageDate = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
  
  const timeString = messageDate.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  // 今天：只显示时间
  if (messageDay.getTime() === today.getTime()) {
    return timeString;
  }
  
  // 昨天：显示"昨天 + 时间"
  if (messageDay.getTime() === yesterday.getTime()) {
    return `${t('time.yesterday')} ${timeString}`;
  }
  
  // 其他时间：显示日期
  const currentYear = now.getFullYear();
  const messageYear = messageDate.getFullYear();
  
  if (messageYear === currentYear) {
    // 本年：显示月日
    return messageDate.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit'
    });
  } else {
    // 非本年：显示年月日
    return messageDate.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }
}

/**
 * 获取完整时间字符串
 * @param dateString - 时间字符串
 * @returns 完整的时间字符串
 */
export function getFullTimeString(dateString: string): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/\//g, '-');
}

/**
 * 时间显示组件的Hook
 * @param dateString - 时间字符串
 * @returns 时间显示相关的状态和函数
 */
export function useTimeDisplay(dateString: string) {
  const { t } = useTranslation();
  const [showFullTime, setShowFullTime] = React.useState(false);
  
  const displayTime = showFullTime 
    ? getFullTimeString(dateString)
    : formatTimeDisplay(dateString, t);
    
  const toggleTimeDisplay = () => {
    setShowFullTime(!showFullTime);
  };
  
  return {
    displayTime,
    showFullTime,
    toggleTimeDisplay
  };
}