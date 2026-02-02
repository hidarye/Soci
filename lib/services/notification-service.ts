// خدمة الإخطارات والتنبيهات

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

class NotificationService {
  private notifications: Map<string, Notification> = new Map();
  private listeners: Array<(notification: Notification) => void> = [];

  subscribe(callback: (notification: Notification) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notify(
    title: string,
    message: string,
    type: NotificationType = 'info',
    actionUrl?: string
  ): Notification {
    const notification: Notification = {
      id: `notif_${Date.now()}`,
      title,
      message,
      type,
      timestamp: new Date(),
      read: false,
      actionUrl,
    };

    this.notifications.set(notification.id, notification);
    this.listeners.forEach(listener => listener(notification));

    return notification;
  }

  notifyTaskSuccess(taskName: string) {
    return this.notify(
      'Task Completed',
      `"${taskName}" has been executed successfully`,
      'success'
    );
  }

  notifyTaskError(taskName: string, error: string) {
    return this.notify(
      'Task Failed',
      `"${taskName}" failed: ${error}`,
      'error'
    );
  }

  notifyAccountConnected(platform: string, accountName: string) {
    return this.notify(
      'Account Connected',
      `Connected to ${platform}: ${accountName}`,
      'success'
    );
  }

  notifyAccountDisconnected(platform: string, accountName: string) {
    return this.notify(
      'Account Disconnected',
      `Disconnected from ${platform}: ${accountName}`,
      'warning'
    );
  }

  getAllNotifications(): Notification[] {
    return Array.from(this.notifications.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  getUnreadCount(): number {
    return Array.from(this.notifications.values()).filter(n => !n.read).length;
  }

  markAsRead(id: string) {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.read = true;
    }
  }

  clearAll() {
    this.notifications.clear();
  }
}

export const notificationService = new NotificationService();
