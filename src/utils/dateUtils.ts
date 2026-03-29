import { TFunction } from 'i18next';

/**
 * Formats a date (Date object, ISO string, or number) into a relative time string.
 * e.g., "2m ago", "1h ago", "Oct 24"
 */
export const formatRelativeTime = (dateEntry: Date | string | number, t: TFunction): string => {
  if (!dateEntry) return '';
  const date = new Date(dateEntry);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 0) return t('common.justNow');
  if (diffInSeconds < 60) return t('common.justNow');
  
  const minutes = Math.floor(diffInSeconds / 60);
  if (minutes < 60) return t('common.minAgo', { count: minutes, minAbbr: t('common.minuteAbbr') });
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('common.hoursAgo', { count: hours, hrAbbr: t('common.hourAbbr') });
  
  const days = Math.floor(hours / 24);
  if (days < 7) return t('common.daysAgo', { count: days, dayAbbr: t('common.dayAbbr') });

  // Older than a week, show date like "Mar 27"
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}`;
};

/**
 * Parses time-ago strings from mock data like '2 min ago', '1 hour ago', '1 day ago'
 * OR handles ISO strings by falling back to formatRelativeTime.
 */
export const translateTimeAgo = (timeAgo: string, t: TFunction): string => {
  if (!timeAgo) return '';
  
  // Try to match mock format first
  const match = timeAgo.match(/^(\d+)\s+(min|hour|day|week)s?\s+ago$/);
  if (match) {
    const count = parseInt(match[1]);
    const unit = match[2];
    const minAbbr = t('common.minuteAbbr', { defaultValue: 'm' });
    const hrAbbr = t('common.hourAbbr', { defaultValue: 'h' });

    switch (unit) {
      case 'min': return t('common.minAgo', { count, minAbbr });
      case 'hour': return t('common.hoursAgo', { count, hrAbbr });
      case 'day': return t('common.daysAgo', { count, dayAbbr: t('common.dayAbbr') });
      case 'week': return t('common.weeksAgo', { count, weekAbbr: t('common.weekAbbr') });
      default: return timeAgo;
    }
  }

  // Fallback to formatting as a date if it's an ISO string
  return formatRelativeTime(timeAgo, t);
};
