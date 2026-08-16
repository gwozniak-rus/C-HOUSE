import { Pressable, StyleSheet, Text, View } from 'react-native';

import { usePushNotifications } from '../lib/push/usePushNotifications';

export function PushNotificationToggle() {
  const { isSupported, permission, isSubscribed, isLoading, error, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) {
    return (
      <View style={styles.container}>
        <Text style={styles.helperText}>Push notifications aren&apos;t supported in this browser.</Text>
      </View>
    );
  }

  if (permission === 'denied') {
    return (
      <View style={styles.container}>
        <Text style={styles.helperText}>
          Notifications are blocked for this site. Enable them in your browser settings to receive alerts.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.button, isSubscribed && styles.buttonSubscribed]}
        onPress={isSubscribed ? unsubscribe : subscribe}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Working…' : isSubscribed ? 'Disable notifications' : 'Enable notifications'}
        </Text>
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#111',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonSubscribed: {
    backgroundColor: '#555',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    maxWidth: 280,
  },
  errorText: {
    fontSize: 13,
    color: '#c0392b',
    textAlign: 'center',
  },
});
