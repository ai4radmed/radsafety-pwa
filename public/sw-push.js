/**
 * 웹 푸시 Service Worker 핸들러
 * workbox가 생성하는 sw.js와 별개로 push/notificationclick 이벤트 처리
 * astro.config.mjs의 workbox.importScripts로 포함됩니다.
 */

// push 이벤트: 서버에서 푸시 메시지가 도착하면 알림 표시
self.addEventListener('push', (event) => {
    if (!event.data) return;

    let data;
    try {
        data = event.data.json();
    } catch {
        data = { title: '방사선안전관리', body: event.data.text() };
    }

    const title = data.title || '방사선안전관리';
    const options = {
        body: data.body || data.message || '',
        icon: '/icon-192.png',
        badge: '/icon-128.png',
        data: {
            url: data.url || data.link || '/',
        },
        tag: data.tag || 'radsafety-notification',
        renotify: true,
        requireInteraction: false,
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// notificationclick 이벤트: 알림 탭하면 해당 URL 열기
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const url = event.notification.data?.url || '/notifications';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // 이미 열린 탭이 있으면 포커스
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            // 없으면 새 탭
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        }),
    );
});
