importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDiuByNWkZCGCIyUznfdOKnybPowEwl0N8",
  authDomain: "earnwise-2.firebaseapp.com",
  projectId: "earnwise-2",
  storageBucket: "earnwise-2.firebasestorage.app",
  messagingSenderId: "889656302094",
  appId: "1:889656302094:web:ea2e0bd77591a888e87a5f"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
