// Firebase Cloud Messaging service worker for background push notifications.
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAd9KgnzExZ5RdrJVB_hpzxUvrqHiQ3jmU",
  authDomain: "mrcash.app",
  projectId: "mrcash-com",
  storageBucket: "mrcash-com.firebasestorage.app",
  messagingSenderId: "348374269609",
  appId: "1:348374269609:web:9fed2a4f69f2c0f00ff3b8",
  measurementId: "G-9ZZLG53Z64",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "MrCash";
  const options = {
    body: payload.notification?.body || "",
    icon: "/coin.png",
  };
  self.registration.showNotification(title, options);
});
