import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

async function initFCM() {
  const uId = localStorage.getItem("userId");
  if (!uId) return;

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const token = await getToken(messaging, { 
        vapidKey: "YOUR_PUBLIC_VAPID_KEY" 
      });
      
      if (token) {
        await fetch("/saveDeviceToken", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: uId, token })
        });
      }
    }
  } catch (err) {
    console.error("FCM Init Error", err);
  }
}

onMessage(messaging, (payload) => {
  console.log("Foreground message received", payload);
  if (window.showPopup) {
    window.showPopup(`${payload.notification.title}: ${payload.notification.body}`);
  }
  if (window.loadNotifications) window.loadNotifications();
});

initFCM();