// lib/push/subscription.ts and register.ts branch on Platform.OS === 'web'
// and a handful of browser globalThiss (navigator.serviceWorker, window.PushManager,
// Notification) that don't exist in the RN test environment jest-expo uses.
// This installs bare-bones stand-ins for a single test and returns a
// `restore()` to undo them — call it from `afterEach`.
//
// Platform is fetched via a lazy require() (not a static import) so this
// still mutates the right module instance for tests that call
// jest.resetModules() between installPushEnv() and importing the code under
// test (see register.test.ts).
export function installPushEnv() {
  const Platform = require('react-native').Platform as { OS: string };
  const originalPlatformOS = Platform.OS;
  Platform.OS = 'web';

  const pushManager = {
    getSubscription: jest.fn().mockResolvedValue(null),
    subscribe: jest.fn(),
  };
  const registration = { pushManager };

  const serviceWorker = {
    ready: Promise.resolve(registration),
    addEventListener: jest.fn(),
    register: jest.fn().mockResolvedValue(registration),
  };

  const hadNavigator = 'navigator' in globalThis;
  const previousServiceWorker = (navigator as unknown as { serviceWorker?: unknown }).serviceWorker;
  (navigator as unknown as { serviceWorker: unknown }).serviceWorker = serviceWorker;

  const previousPushManager = (window as unknown as { PushManager?: unknown }).PushManager;
  (window as unknown as { PushManager: unknown }).PushManager = function PushManager() {};

  const notificationMock = {
    permission: 'default' as NotificationPermission,
    requestPermission: jest.fn().mockResolvedValue('granted' as NotificationPermission),
  };
  const previousNotification = (globalThis as unknown as { Notification?: unknown }).Notification;
  (globalThis as unknown as { Notification: unknown }).Notification = notificationMock;

  Object.defineProperty(navigator, 'userAgent', {
    value: 'jest-test-agent',
    configurable: true,
  });

  return {
    pushManager,
    registration,
    serviceWorker,
    notification: notificationMock,
    restore() {
      (Platform as { OS: string }).OS = originalPlatformOS;
      if (hadNavigator) {
        (navigator as unknown as { serviceWorker?: unknown }).serviceWorker = previousServiceWorker;
      }
      (window as unknown as { PushManager?: unknown }).PushManager = previousPushManager;
      (globalThis as unknown as { Notification?: unknown }).Notification = previousNotification;
    },
  };
}
