export const SCAN_CONFIG = {
  watchComponents: [
    'TopBar',
    'Sidebar',
    'MobileBottomNav',
    'TasksPage',
    'ChatRoomPage',
    'NotificationBell',
    'DashboardPage',
  ],
  renderThreshold: 3,
  verboseLogging: process.env.NODE_ENV === 'development',
}
