const username = localStorage.getItem("username");
if (!username) window.location.href = "/index.html";

const userId = localStorage.getItem("userId");
if (!userId) window.location.href = "/index.html";
const app = document.getElementById("app");

if (!app) {
  throw new Error("App container not found!");
}
const messageSound = new Audio("/sound/message.mp3");
const callSound = new Audio("/sound/call.mp3");

// improve playback
messageSound.preload = "auto";
callSound.preload = "auto";
callSound.loop = true;
let isChatOpen = false;

const canPlaySounds = () => localStorage.getItem("notificationsEnabled") !== "false";

document.addEventListener(
  "click",
  () => {
    if (canPlaySounds()) messageSound.play().then(() => messageSound.pause());
  },
  { once: true },
);
// ================= CUSTOM POPUP =================
function setupCustomPopup() {
  const popupHTML = `
        <div id="customPopup" class="custom-popup">
            <div class="custom-popup-content">
                <p id="customPopupMessage"></p>
            </div>
        </div>
    `;
  app.insertAdjacentHTML("beforeend", popupHTML);
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  document.head.appendChild(styleSheet);

  setTimeout(() => {
    document.getElementById("customPopup").style.display = "none";
  }, 2000);
}

function showPopup(message) {
  const popup = document.getElementById("customPopup");
  const popupMessage = document.getElementById("customPopupMessage");

  if (popup && popupMessage) {
    popupMessage.textContent = message;
    popup.style.display = "flex";
    setTimeout(() => {
      popup.style.display = "none";
    }, 2000);
  }
}

setupCustomPopup();

// ================= FULL SCREEN IMAGE MODAL =================
function setupFullScreenImageModal() {
  const imageModalHTML = `
    <div id="fullScreenImageModal" class="fullscreen-modal" onclick="closeFullScreenImage()">
        <span class="close-fs-btn" onclick="closeFullScreenImage()">&times;</span>
        <img class="fullscreen-image" id="fullScreenImage" onclick="event.stopPropagation()">
    </div>
  `;
  app.insertAdjacentHTML("beforeend", imageModalHTML);

  const fsImageStyle = document.createElement("style");
  fsImageStyle.textContent = `
    .fullscreen-modal {
        display: none; 
        position: fixed; 
        z-index: 10000; 
        left: 0;
        top: 0;
        width: 100%; 
        height: 100%; 
        background-color: rgba(0,0,0,0.95);
        justify-content: center;
        align-items: center;
        backdrop-filter: blur(5px);
        animation: fadeIn 0.2s ease-out;
    }
    .fullscreen-image {
        max-width: 95%;
        max-height: 95%;
        object-fit: contain;
        border-radius: 4px;
        box-shadow: 0 5px 25px rgba(0,0,0,0.5);
    }
    .close-fs-btn {
        position: absolute;
        top: 20px;
        right: 20px;
        color: white;
        font-size: 30px;
        font-weight: bold;
        cursor: pointer;
        background: rgba(0,0,0,0.5);
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: 0.2s;
    }
    .close-fs-btn:hover {
        background: rgba(255,255,255,0.2);
    }
  `;
  document.head.appendChild(fsImageStyle);
}

setupFullScreenImageModal();

window.openFullScreenImage = function (src) {
  const modal = document.getElementById("fullScreenImageModal");
  const img = document.getElementById("fullScreenImage");
  if (modal && img) {
    img.src = src;
    modal.style.display = "flex";
  }
};

window.closeFullScreenImage = function () {
  const modal = document.getElementById("fullScreenImageModal");
  if (modal) {
    modal.style.display = "none";
    document.getElementById("fullScreenImage").src = "";
  }
};

// ================= LOGOUT =================

document.getElementById("logout").onclick = () => {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.clear();
    window.location.href = "/index.html";
  }
};

// ================= UI IMPROVEMENTS (Auto-resize & Wrapping) =================
const uiStyle = document.createElement("style");
document.head.appendChild(uiStyle);
uiStyle.sheet.insertRule(
  `
  .message .message-text {
    white-space: pre-wrap;
    word-wrap: break-word;
    text-align: left;
  }
`,
  0,
);
// CSS for Reactions and Reaction Bar
const reactionStyles = document.createElement("style");
reactionStyles.textContent = `
  .message {
    position: relative;
    margin-bottom: 10px !important; /* Extra space for reactions hanging at bottom */
  }
  .reactions {
    position: absolute;
    bottom: -14px;
    right: 10px;
    background: #2b2b2b;
    color: #fff;
    border-radius: 12px;
    padding: 2px 8px;
    font-size: 14px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    z-index: 5;
    border: 1px solid #444;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 20px;
    white-space: nowrap;
  }
  #reactionBar {
    background: #2b2b2b;
    border-radius: 20px;
    padding: 6px 12px;
    display: flex;
    gap: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    border: 1px solid #555;
    z-index: 9999;
    animation: fadeIn 0.15s ease-out;
  }
  #reactionBar span {
    cursor: pointer;
    font-size: 22px;
    transition: transform 0.1s;
    user-select: none;
  }
  #reactionBar span:hover {
    transform: scale(1.3);
  }
`;
document.head.appendChild(reactionStyles);

// CSS for Reply Preview inside Message Bubble
const replyMessageStyles = document.createElement("style");
replyMessageStyles.textContent = `
  .reply-preview {
    font-size: 0.85em;
    background: rgba(0, 0, 0, 0.15);
    border-left: 4px solid #4facfe;
    padding: 6px 10px;
    border-radius: 4px;
    margin-bottom: 6px;
    cursor: pointer;
    opacity: 0.9;
  }
  .highlight-message {
    animation: highlightAnim 1.5s ease-out;
  }
  @keyframes highlightAnim {
    0% { background-color: rgba(79, 172, 254, 0.5); }
    100% { background-color: transparent; }
  }
`;
document.head.appendChild(replyMessageStyles);

// Selection Mode Variables
let isSelectionMode = false;
let selectedMessages = new Set();

// Convert Input to Textarea for multiline support
let msgInput = document.getElementById("msgInput");
if (msgInput && msgInput.tagName === "INPUT") {
  const textarea = document.createElement("textarea");
  textarea.id = msgInput.id;
  textarea.className = msgInput.className;
  textarea.placeholder = msgInput.placeholder;
  textarea.style.width = "100%";
  msgInput.replaceWith(textarea);
  msgInput = textarea;
}

// ================= THEME/WALLPAPER SETUP =================

let selectedForwardFriendId = null;

function setupForwardModal() {
  const forwardModalHTML = `
        <div id="forwardModal" class="theme-popup">
            <div class="theme-popup-content" style="max-height: 80vh; display: flex; flex-direction: column; width: 90%; max-width: 400px;">
                <button class="close-btn" onclick="closeForwardModal()" style="position: absolute; top: 15px; right: 15px; background: none; border: none; color: #aaa; font-size: 24px; cursor: pointer;">&times;</button>
                <h3 style="margin-bottom: 10px;">Forward to...</h3>
                <div id="forwardFriendList" style="flex: 1; overflow-y: auto; margin: 15px 0; text-align: left; padding-right: 5px;">
                    <!-- Friends will be injected here -->
                </div>
                <div style="display: flex; justify-content: center; padding-top: 10px;">
                    <button id="confirmForwardBtn" class="save-btn" style="width: auto; padding: 12px 60px; display: none;">Send</button>
                </div>
            </div>
        </div>
    `;
  app.insertAdjacentHTML("beforeend", forwardModalHTML);

  // Close on background click
  document.getElementById("forwardModal").onclick = (e) => {
    if (e.target.id === "forwardModal") closeForwardModal();
  };
}

window.closeForwardModal = function () {
  document.getElementById("forwardModal").style.display = "none";
  selectedForwardFriendId = null;
  document.getElementById("confirmForwardBtn").style.display = "none";
};

async function openForwardModal() {
  const modal = document.getElementById("forwardModal");
  const list = document.getElementById("forwardFriendList");
  const confirmBtn = document.getElementById("confirmForwardBtn");

  list.innerHTML =
    '<p style="text-align:center; color:#888;">Loading friends...</p>';
  modal.style.display = "flex";
  confirmBtn.style.display = "none";

  const res = await fetch(`/getFriends/${userId}`);
  const data = await res.json();
  list.innerHTML = "";

  data.friends.forEach((friend) => {
    const item = document.createElement("div");
    item.className = "forward-friend-item";
    item.onclick = () => {
      document
        .querySelectorAll(".forward-friend-item")
        .forEach((i) => i.classList.remove("selected"));
      item.classList.add("selected");
      selectedForwardFriendId = friend.id;
      confirmBtn.style.display = "block";
    };

    item.innerHTML = `
            <img src="${getAvatarSrc(friend)}">
            <div class="forward-friend-info">
                <div class="forward-friend-name">${friend.name}</div>
            </div>
            <div class="selection-check"><i class="fa-solid fa-circle-check"></i></div>
        `;
    list.appendChild(item);
  });

  confirmBtn.onclick = async () => {
    if (!selectedForwardFriendId || selectedMessages.size === 0) return;

    const ids = Array.from(selectedMessages).map((id) => parseInt(id));
    const msgRes = await fetch("/api/getMessagesByIds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    const msgData = await msgRes.json();

    // Send each message to the target friend
    msgData.messages.forEach((m) => {
      socket.emit("sendMessage", {
        to: selectedForwardFriendId,
        message: m.message,
        type: m.type,
        caption: m.caption,
      });
    });

    // showPopup(`Forwarded ${ids.length} messages`);
    closeForwardModal();
    toggleSelectionMode(false);
  };
}

setupForwardModal();

// ================= SHARE PROFILE FEATURE =================

let selectedShareFriends = new Set();

function setupShareModal() {
  const shareModalHTML = `
    <div id="shareProfileModal" class="theme-popup">
        <div class="theme-popup-content" style="max-height: 80vh; display: flex; flex-direction: column; width: 90%; max-width: 400px;">
            <button class="close-btn" onclick="closeShareModal()" style="position: absolute; top: 15px; right: 15px; background: none; border: none; color: #aaa; font-size: 24px; cursor: pointer;">&times;</button>
            <h3 style="margin-bottom: 10px;">Share Profile to...</h3>
            <div id="shareFriendList" style="flex: 1; overflow-y: auto; margin: 15px 0; text-align: left; padding-right: 5px;">
                <!-- Friends list -->
            </div>
            <div style="display: flex; justify-content: center; padding-top: 10px;">
                <button id="confirmShareBtn" class="save-btn" style="width: auto; padding: 12px 60px; display: none;">Send Profile</button>
            </div>
        </div>
    </div>
  `;
  app.insertAdjacentHTML("beforeend", shareModalHTML);
}

window.closeShareModal = function () {
  document.getElementById("shareProfileModal").style.display = "none";
  selectedShareFriends.clear();
};

window.shareProfile = async function () {
  if (!currentFriendId) return;
  closeProfileMenu();
  document.getElementById("userProfileModal").style.display = "none";
  // Get data of the user being shared
  const profileRes = await fetch(`/api/getMyProfile/${currentFriendId}`);
  const profileData = await profileRes.json();
  if (!profileData.success) return;

  const sharedUser = profileData.user;
  const modal = document.getElementById("shareProfileModal");
  const list = document.getElementById("shareFriendList");
  const confirmBtn = document.getElementById("confirmShareBtn");

  modal.style.display = "flex";
  list.innerHTML = "Loading friends...";
  confirmBtn.style.display = "none";

  const res = await fetch(`/getFriends/${userId}`);
  const data = await res.json();
  list.innerHTML = "";

  data.friends.forEach((friend) => {
    const item = document.createElement("div");
    item.className = "forward-friend-item";
    item.onclick = () => {
      if (selectedShareFriends.has(friend.id)) {
        selectedShareFriends.delete(friend.id);
        item.classList.remove("selected");
      } else {
        selectedShareFriends.add(friend.id);
        item.classList.add("selected");
      }
      confirmBtn.style.display =
        selectedShareFriends.size > 0 ? "block" : "none";
    };

    item.innerHTML = `
      <img src="${getAvatarSrc(friend)}">
      <div class="forward-friend-info">
          <div class="forward-friend-name">${friend.name}</div>
      </div>
      <div class="selection-check"><i class="fa-solid fa-circle-check"></i></div>
    `;
    list.appendChild(item);
  });

  confirmBtn.onclick = () => {
    const shareData = JSON.stringify({
      sharedUserId: sharedUser.id,
      name: sharedUser.name,
      avatar: sharedUser.avatar || getAvatarSrc(sharedUser.id),
    });

    selectedShareFriends.forEach((targetId) => {
      socket.emit("sendMessage", {
        to: targetId,
        message: shareData,
        type: "profile_share",
      });
    });

    showPopup("Profile Shared!");
    closeShareModal();
  };
};

window.requestFromShare = async function (targetId, msgId) {
  const btn = document.getElementById(`addBtn_${msgId}`);
  if (btn) btn.disabled = true;

  const res = await fetch("/sendRequest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, receiver: targetId }),
  });

  if (res.ok) {
    showPopup("Friend request sent!");
    if (btn) btn.innerText = "Pending";
  }
};

setupShareModal();

// ================= NOTIFICATIONS LOGIC =================

let isNotificationPanelOpen = false;

window.toggleNotificationPanel = async function() {
    const panel = document.getElementById("notificationPanel");
    isNotificationPanelOpen = !isNotificationPanelOpen;
    
    if (isNotificationPanelOpen) {
        panel.classList.add("active");
        await loadNotifications();
        markNotificationsRead();
    } else {
        panel.classList.remove("active");
    }
};

async function loadNotifications() {
    const res = await fetch(`/api/getNotifications/${userId}`);
    const data = await res.json();
    const list = document.getElementById("notificationList");
    
    if (!data.success || data.notifications.length === 0) {
        list.innerHTML = `
            <div style="text-align:center; padding:50px 20px; color:#666;">
                <i class="fa-regular fa-bell" style="font-size:40px; margin-bottom:15px; opacity:0.3;"></i>
                <p>No notifications yet</p>
            </div>`;
        updateNotificationBadge(0);
        return;
    }

    list.innerHTML = "";
    let unreadCount = 0;

    data.notifications.forEach(n => {
        if (n.status === 'unread') unreadCount++;
        
        const card = document.createElement("div");
        card.className = "notification-card";
        
        let actionButtons = "";
        let actionText = "";

        if (n.type === 'friend_request') {
            actionText = "sent you a friend request";
            actionButtons = `
                <div style="display:flex; gap:8px; margin-top:10px;">
                    <button class="save-btn" style="padding:5px 15px; font-size:11px;" onclick="handleNotificationAction(${n.sender_id}, 'accept', ${n.id})">Accept</button>
                    <button class="action-btn-outline" style="padding:5px 15px; font-size:11px;" onclick="handleNotificationAction(${n.sender_id}, 'reject', ${n.id})">Reject</button>
                </div>`;
        } else if (n.type === 'request_accepted') {
            actionText = "accepted your friend request";
            actionButtons = `<div style="color:#00ff55; font-size:11px; margin-top:5px;"><i class="fa-solid fa-circle-check"></i> Friends now</div>`;
        }

        card.innerHTML = `
            <img src="${getAvatarSrc(n.avatar || n.sender_id)}">
            <div style="flex:1;">
                <div style="font-size:13px;">
                    <strong style="color:#fff;">${n.name}</strong> 
                    <span style="color:#aaa;">${actionText}</span>
                </div>
                <div style="font-size:10px; color:#666; margin-top:4px;">${timeAgo(n.timestamp)}</div>
                ${actionButtons}
            </div>
        `;
        list.appendChild(card);
    });

    updateNotificationBadge(unreadCount);
}

async function handleNotificationAction(senderId, action, notifId) {
    let endpoint = action === 'accept' ? '/acceptRequest' : '/api/rejectRequest';
    
    // If accepting, we need the request ID. For simplicity, the notification system here assumes 
    // we handle via senderId/receiverId pairs for direct rejection or fetching the request ID
    let body = action === 'accept' 
        ? { id: await getRequestId(senderId), userId: userId, senderId: senderId }
        : { senderId: senderId, receiverId: userId };

    const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    if (res.ok) {
        loadNotifications();
        loadFriends();
        if (action === 'accept') socket.emit("friendRequestAccepted", { friendId: senderId });
    }
}

async function getRequestId(senderId) {
    const res = await fetch(`/getRequests/${userId}`);
    const data = await res.json();
    const req = data.requests.find(r => r.senderId == senderId);
    return req ? req.id : null;
}

async function markNotificationsRead() {
    await fetch("/api/markNotificationsRead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
    });
    setTimeout(() => updateNotificationBadge(0), 2000);
}

window.clearAllNotifications = async function() {
    if (!confirm("Clear all notifications?")) return;
    const res = await fetch("/api/clearNotifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
    });
    if (res.ok) loadNotifications();
};

function updateNotificationBadge(count) {
    const badge = document.getElementById("notificationBadge");
    if (count > 0) {
        badge.innerText = count > 9 ? "9+" : count;
        badge.style.display = "block";
    } else {
        badge.style.display = "none";
    }
}

// Initialize badge on load
setTimeout(async () => {
    const res = await fetch(`/api/getNotifications/${userId}`);
    const data = await res.json();
    if (data.success) {
        const unread = data.notifications.filter(n => n.status === 'unread').length;
        updateNotificationBadge(unread);
    }
}, 1000);

// ================= USER PROFILE & MEDIA MODAL =================

function openProfileMenu(e) {
  e.stopPropagation();
  loadMuteState();
  const sheet = document.getElementById("profileActionSheet");
  sheet.style.display = "block";

  setTimeout(() => {
    sheet.classList.add("active");
  }, 10);
}

function closeProfileMenu() {
  const sheet = document.getElementById("profileActionSheet");
  sheet.classList.remove("active");

  setTimeout(() => {
    sheet.style.display = "none";
  }, 300);
}

// 🔥 Open Timer Modal (Top UI)
window.setChatTimer = function () {
  const modal = document.getElementById("chatTimerModal");
  modal.style.display = "flex";

  // ✅ highlight current selected mode
  const current =
    localStorage.getItem(`chatTimer_${currentFriendId}`) || "Normal";

  document.querySelectorAll(".chat-timer-option").forEach((el) => {
    el.classList.remove("active");

    if (el.innerText.trim() === current) {
      el.classList.add("active");
    }
  });

  closeProfileMenu();
};

// 🔥 Set Mode
window.setTimerMode = function (mode) {
  if (!currentFriendId) return;

  // ✅ store locally (for UI state)
  localStorage.setItem(`chatTimer_${currentFriendId}`, mode);

  // ✅ send to backend
  socket.emit("setTimerMode", { to: currentFriendId, mode });

  // ✅ update UI instantly
  document.querySelectorAll(".chat-timer-option").forEach((el) => {
    el.classList.remove("active");

    if (el.innerText.trim() === mode) {
      el.classList.add("active");
    }
  });

  // ✅ close modal
  document.getElementById("chatTimerModal").style.display = "none";

  // showPopup(`Chat timer set to ${mode}`);
};

// 🔥 Close Modal
window.closeTimerModal = function () {
  document.getElementById("chatTimerModal").style.display = "none";
};
function loadMuteState() {
  if (!currentFriendId) return;

  const chatMuted =
    localStorage.getItem(`muteChat_${currentFriendId}`) === "true";
  const callMuted =
    localStorage.getItem(`muteCall_${currentFriendId}`) === "true";

  document.getElementById("muteChatToggle").checked = chatMuted;
  document.getElementById("muteCallToggle").checked = callMuted;
}
const muteChatToggle = document.getElementById("muteChatToggle");
const muteCallToggle = document.getElementById("muteCallToggle");

muteChatToggle.addEventListener("change", (e) => {
  if (!currentFriendId) return;

  localStorage.setItem(`muteChat_${currentFriendId}`, e.target.checked);
});

muteCallToggle.addEventListener("change", (e) => {
  if (!currentFriendId) return;

  localStorage.setItem(`muteCall_${currentFriendId}`, e.target.checked);
});
// CLOSE ON OUTSIDE CLICK
document.addEventListener("click", (e) => {
  const menu = document.getElementById("profileMenuDropdown");
  if (!menu) return;

  if (!e.target.closest(".profile-menu-wrapper")) {
    menu.style.display = "none";
  }
});

window.removeFriend = async function () {
  if (!currentFriendId) return;
  closeProfileMenu();
  const res = await fetch("/api/removeFriend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, friendId: currentFriendId }),
  });

  const data = await res.json();

  if (data.success) {
    document.getElementById("userProfileModal").style.display = "none";
    // UI removal and active chat clearing is now handled symmetrically via socket events
  } else {
    showPopup("Failed to remove");
  }
};

window.blockUser = async function () {
  if (!currentFriendId) return;
  closeProfileMenu();
  const res = await fetch("/api/blockUser", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, friendId: currentFriendId }),
  });

  const data = await res.json();

  if (data.success) {
    document.getElementById("userProfileModal").style.display = "none";
    // UI removal and active chat clearing is now handled symmetrically via socket events
  } else {
    showPopup("Failed to block");
  }
};

function openUserProfile() {
  if (!currentFriendId) return;

  const modal = document.getElementById("userProfileModal");
  modal.style.display = "flex";

  // OLD SYSTEM (KEEP)
  updateProfileStatus(currentFriendId);
  loadSharedInfo(currentFriendId);

  // NEW DATA
  socket.emit("getUserProfile", { userId: currentFriendId }, (res) => {
    if (!res || !res.success) return;

    const user = res.data;

    // AVATAR
    document.getElementById("profileModalAvatar").src =
      user.avatar || getAvatarSrc(currentFriendId);

    // COVER
    const coverImg = document.getElementById("profileCoverImg");
    coverImg.src = user.cover
      ? user.cover
      : "https://via.placeholder.com/600x200/222/fff?text=No+Cover";

    // NAME
    document.getElementById("profileModalName").innerText = user.name || "User";

    document.getElementById("profileUsername").innerText =
      "@" + (user.name || "user");

    document.getElementById("profileBioBottom").innerText =
      user.bio || "No bio available";

    // CITY (TOP + BOTTOM)
    document.getElementById("profileCityBottom").innerText =
      "📍 " + user.city || "";

    // EMAIL
    document.getElementById("profileEmail").innerText = user.email || "";

    // STATS
    if (user.birthday) {
      const [y, m, d] = user.birthday.split("-");
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      document.getElementById("statBirthday").textContent =
        `${parseInt(d)} ${months[parseInt(m) - 1]}`;
    } else {
      document.getElementById("statBirthday").textContent = "--";
    }
    document.getElementById("statScore").innerText = user.score || 0;

    document.getElementById("statLevel").innerText = user.level || 1;

    document.getElementById("statPosts").innerText = user.posts || 0;
  });
}
async function updateProfileStatus(friendId) {
  const res = await fetch(`/getUserStatus/${friendId}`);
  const data = await res.json();
  const statusEl = document.getElementById("profileModalStatus");

  // Update avatar in modal
  const avatar = document.getElementById("profileModalAvatar");
  avatar.src =
    data.avatar || `https://i.pravatar.cc/150?img=${(friendId % 70) + 1}`;

  if (data.statusHidden) {
    statusEl.textContent = "";
    return;
  }

  if (data.online) {
    statusEl.textContent = "Online";
    statusEl.style.color = "#00ff55";
  } else {
    statusEl.textContent = data.lastSeen
      ? "Last seen " + timeAgo(data.lastSeen)
      : "Offline";
    statusEl.style.color = "#aaa";
  }
}

async function loadSharedInfo(friendId) {
  const res = await fetch(`/getSharedInfo/${userId}/${friendId}`);
  const data = await res.json();

  // 1. Calculate Days
  const daysEl = document.getElementById("friendshipDaysCount");
  if (data.createdAt) {
    const start = new Date(data.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (isNaN(diffDays)) {
      daysEl.textContent = "0";
    } else {
      // A friendship that exists should be at least 1 day old in this view.
      daysEl.textContent = diffDays > 0 ? diffDays : 1;
    }
  } else {
    daysEl.textContent = "0"; // Or 'Unknown'
  }

  // 2. Render Media
  const grid = document.getElementById("sharedMediaGrid");
  const linksList = document.getElementById("sharedLinksList");
  const docsList = document.getElementById("sharedDocsList");

  grid.innerHTML = "";
  linksList.innerHTML = "";
  docsList.innerHTML = "";

  if (data.media.length === 0) {
    const noDataHtml =
      "<p style='color:#777; width:100%; text-align:center; padding: 20px;'>Nothing shared yet</p>";
    grid.innerHTML = noDataHtml;
    linksList.innerHTML = noDataHtml;
    docsList.innerHTML = noDataHtml;
    return;
  }

  data.media.forEach((msg) => {
    // --- CATEGORY: MEDIA ---
    if (["image", "video", "audio", "sticker"].includes(msg.type)) {
      const item = document.createElement("div");
      item.className = "shared-media-item";
      item.dataset.id = msg.id;

      if (msg.type === "image") {
        item.innerHTML = `<img src="${msg.message}" loading="lazy">`;
      } else if (msg.type === "video") {
        item.innerHTML = `<video src="${msg.message}"></video><div class="play-icon">▶</div>`;
      } else if (msg.type === "sticker") {
        item.innerHTML = `<img src="${msg.message}" loading="lazy" style="object-fit: contain; padding: 5px;">`;
      } else if (msg.type === "audio") {
        item.innerHTML = `<div class="audio-icon">🎤</div>`;
      }

      let longPressTimer;
      let isLongPress = false;

      const showDeleteOption = () => {
        isLongPress = true;
        selectedMsgId = parseInt(msg.id);
        selectedMsgSender = String(msg.sender);

        const optionsModal = document.getElementById("sharedMediaOptionsModal");
        optionsModal.style.display = "flex";

        document.getElementById("smShowInChat").onclick = () => {
          optionsModal.style.display = "none";
          document.getElementById("userProfileModal").style.display = "none";
          scrollToMessage(msg.id);
        };

        document.getElementById("smDelete").onclick = () => {
          optionsModal.style.display = "none";
          const modal = document.getElementById("deleteModal");
          modal.style.display = "flex";
          modal.style.justifyContent = "center";
          modal.style.alignItems = "center";
          modal.style.position = "absolute";
          modal.style.top = "0";
          modal.style.left = "0";
          modal.style.zIndex = "10000";
          modal.style.width = "100%";
          modal.style.height = "100%";
          modal.style.backgroundColor = "rgba(0, 0, 0, 0.5)";

          if (String(msg.sender) !== String(userId)) {
            document.getElementById("deleteEveryone").style.display = "none";
          } else {
            document.getElementById("deleteEveryone").style.display = "block";
          }
        };

        document.getElementById("smCancel").onclick = () => {
          optionsModal.style.display = "none";
        };
      };

      item.addEventListener("touchstart", () => {
        isLongPress = false;
        longPressTimer = setTimeout(showDeleteOption, 600);
      });
      item.addEventListener("touchend", () => clearTimeout(longPressTimer));
      item.addEventListener("touchmove", () => clearTimeout(longPressTimer));
      item.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        showDeleteOption();
      });
      item.onclick = () => {
        if (!isLongPress) {
          if (msg.type === "image") {
            openFullScreenImage(msg.message);
          } else if (msg.type === "audio") {
            item.innerHTML = "";
            const audio = document.createElement("audio");
            audio.src = msg.message;
            audio.controls = true;
            audio.autoplay = true;
            audio.style.width = "100%";
            item.style.display = "flex";
            item.style.alignItems = "center";
            item.appendChild(audio);
            item.onclick = null;
          } else {
            window.open(msg.message);
          }
        }
      };

      grid.appendChild(item);
    }
    // --- CATEGORY: LINKS ---
    else if (msg.type === "text") {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = msg.message.match(urlRegex);
      if (urls) {
        urls.forEach((url) => {
          const item = document.createElement("div");
          item.className = "link-item";

          // Simple icon based on common domains
          let icon = "fa-link";
          if (url.includes("youtube.com") || url.includes("youtu.be"))
            icon = "fa-youtube";
          else if (url.includes("google.com")) icon = "fa-google";
          else if (url.includes("github.com")) icon = "fa-github";

          item.innerHTML = `
            <div style="width: 40px; height: 40px; background: rgba(255,255,255,0.05); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                <i class="fa-solid ${icon}" style="color: #4facfe;"></i>
            </div>
            <div class="link-info">
                <div class="link-title">${url}</div>
                <div class="link-url">${url}</div>
            </div>
          `;
          item.onclick = () => window.open(url, "_blank");
          linksList.appendChild(item);
        });
      }
    }
    // --- CATEGORY: DOCUMENTS ---
    else if (msg.type === "document") {
      const item = document.createElement("div");
      item.className = "doc-item";
      const fileName = msg.caption || "Document";

      item.innerHTML = `
        <div style="width: 40px; height: 40px; background: rgba(255,204,0,0.1); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
            <i class="fa-solid fa-file-pdf" style="color: #ffcc00;"></i>
        </div>
        <div class="doc-info">
            <div class="doc-name">${fileName}</div>
            <div class="doc-size">Shared via Gabru</div>
        </div>
        <i class="fa-solid fa-download" style="color: #888; margin-left: auto;"></i>
      `;
      item.onclick = () => {
        const a = document.createElement("a");
        a.href = msg.message;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };
      docsList.appendChild(item);
    }
  });

  // Default fallback if a tab is empty after loop
  if (!grid.innerHTML)
    grid.innerHTML =
      "<p style='color:#777; width:100%; text-align:center; padding: 20px;'>No media</p>";
  if (!linksList.innerHTML)
    linksList.innerHTML =
      "<p style='color:#777; width:100%; text-align:center; padding: 20px;'>No links</p>";
  if (!docsList.innerHTML)
    docsList.innerHTML =
      "<p style='color:#777; width:100%; text-align:center; padding: 20px;'>No documents</p>";
}

// Initialize Tab Switching Logic
function setupProfileTabs() {
  const tabs = document.querySelectorAll(".shared-tab");
  const grid = document.getElementById("sharedMediaGrid");
  const links = document.getElementById("sharedLinksList");
  const docs = document.getElementById("sharedDocsList");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      const target = tab.dataset.tab;
      grid.style.display = target === "media" ? "grid" : "none";
      links.style.display = target === "links" ? "flex" : "none";
      docs.style.display = target === "docs" ? "flex" : "none";
    });
  });
}
setupProfileTabs();

// ================= SOCKET =================
// Helper for avatar
function getAvatarSrc(user) {
  if (user && user.avatar) return user.avatar;
  if (user && user.id)
    return `https://i.pravatar.cc/150?img=${(user.id % 70) + 1}`;
  // If passing just ID
  if (typeof user === "number" || typeof user === "string")
    return `https://i.pravatar.cc/150?img=${(user % 70) + 1}`;
  return `https://i.pravatar.cc/150?img=1`;
}

let activeChat = null;

function removeFriendFromUI(targetId) {
  // Remove from the chat list feed
  const item = document.querySelector(`.chat-item[data-friend-id="${targetId}"]`);
  if (item) item.remove();

  // Clear any unread tracking
  delete unreadCounts[targetId];

  // If currently chatting with this user, force close the chat screen
  if (String(currentFriendId) === String(targetId)) {
    document.getElementById("chatScreen").style.display = "none";
    isChatOpen = false;
    activeChat = null;
    currentFriendId = null;
    currentFriendName = null;
    socket.emit("leaveChat");
    showPopup("Removed");
  }
}

const socket = io();
socket.on("connect", () => {
  socket.emit("register", { 
    userId, 
    sessionToken: localStorage.getItem("sessionToken") 
  });
});

socket.on("forcedLogout", () => {
  localStorage.clear();
  window.location.href = "/index.html?reason=session_terminated";
});

socket.on("newNotification", () => {
    if (canPlaySounds()) messageSound.play().catch(() => {});
    if (isNotificationPanelOpen) loadNotifications();
    else {
        // Fetch unread count to update badge
        loadNotifications(); 
    }
});

socket.on("newFriendRequest", () => {
  const requestModal = document.getElementById("requestModal");
  if (requestModal && requestModal.style.display === "flex") {
    loadRequests();
  }
});

socket.on("requestCanceled", () => {
  const requestModal = document.getElementById("requestModal");
  if (requestModal && requestModal.style.display === "flex") {
    loadRequests();
  }
});

socket.on("friendAdded", () => {
  loadFriends();
});

socket.on("friendRemoved", (data) => {
  const targetId = String(data.userId) === String(userId) ? data.friendId : data.userId;
  removeFriendFromUI(targetId);
});

socket.on("userBlocked", (data) => {
  const targetId = String(data.blockerId) === String(userId) ? data.blockedId : data.blockerId;
  removeFriendFromUI(targetId);
});

// ================= FRIEND SEARCH =================

const addFriendBtn = document.getElementById("addFriendBtn");
const addFriendModal = document.getElementById("addFriendModal");

addFriendBtn.onclick = () => (addFriendModal.style.display = "flex");

const searchModal = document.getElementById("searchModal");

document.getElementById("searchUserBtn").onclick = () => {
  addFriendModal.style.display = "none";
  searchModal.style.display = "flex";
};

document.getElementById("searchBtn").onclick = async () => {
  const name = document.getElementById("searchInput").value;

  const res = await fetch("/searchUser", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, userId }),
  });

  const data = await res.json();
  const result = document.getElementById("searchResult");
  result.innerHTML = "";

  for (const user of data.users) {
    const relationRes = await fetch(`/checkRelation/${userId}/${user.id}`);
    const relation = await relationRes.json();

    const div = document.createElement("div");
    div.className = "search-result";

    let buttonHtml = "";
    if (relation.status === "self") {
      buttonHtml = '<span class="self-label">Me</span>';
    } else if (relation.status === "friends") {
      buttonHtml = `<button class="chat-btn" onclick="openChat(${user.id}, '${user.name}')">Chat</button>`;
    } else if (relation.status === "pending") {
      buttonHtml = `<button class="cancel-btn" style="background:#444; color:white; padding: 6px 12px; border-radius: 6px; border:none; cursor:pointer;" onclick="cancelRequest(${user.id})">Cancel</button>`;
    } else {
      buttonHtml = `<button onclick="sendRequest(${user.id})">Send Request</button>`;
    }

    div.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <img src="${getAvatarSrc(user)}" style="width:30px; height:30px; border-radius:50%;">
        <span>${user.name}</span>
      </div>
      ${buttonHtml}
    `;

    result.appendChild(div);
  }
};

async function sendRequest(id) {
  const res = await fetch("/sendRequest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, receiver: id }),
  });

  if (res.ok) {
    showPopup("Friend request sent!");
    socket.emit("friendRequestSent", { receiver: id });
    // Instantly refresh search view to show "Cancel" button
    document.getElementById("searchBtn")?.click();
  }
}

async function cancelRequest(id) {
  const res = await fetch("/api/cancelRequest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sender: userId, receiver: id }),
  });

  if (res.ok) {
    socket.emit("cancelFriendRequest", { receiver: id });
    // Instantly refresh search view to show "Send Request" button
    document.getElementById("searchBtn")?.click();
  }
}

// ================= FRIEND REQUEST =================

const requestModal = document.getElementById("requestModal");

document.getElementById("viewRequestsBtn").onclick = async () => {
  addFriendModal.style.display = "none";
  requestModal.style.display = "flex";
  await loadRequests();
};

async function acceptRequest(id, senderId = null) {
  const res = await fetch("/acceptRequest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, userId }),
  });

  if (res.ok) {
    showPopup("Friend added!");
    loadFriends();
    loadRequests();

    if (senderId) {
      socket.emit("friendRequestAccepted", { friendId: senderId });
    }
  }
}

async function loadRequests() {
  const res = await fetch(`/getRequests/${userId}`);
  const data = await res.json();

  const list = document.getElementById("requestList");
  list.innerHTML = "";

  data.requests.forEach((r) => {
    const div = document.createElement("div");
    div.className = "request-item";

    const avatarSrc =
      r.avatar || `https://i.pravatar.cc/150?img=${(r.senderId % 70) + 1}`;

    div.innerHTML = `
      <img src="${avatarSrc}" style="width:30px; height:30px; border-radius:50%; margin-right:8px;">
      <span>${r.name}</span>
      <button onclick="acceptRequest(${r.id}, ${r.senderId})">Accept</button>
    `;

    list.appendChild(div);
  });
}

// ================= CHAT =================
let editingMsgId = null;
let editingMsgElement = null;
let editType = null;
let replyingMsg = null;
let longPressTimer;
let selectedMessageEl = null;
let selectedMsgId = null;
let selectedMsgSender = null;
const messageMenu = document.getElementById("messageMenu");
const deleteModal = document.getElementById("deleteModal");

let currentFriendId = null;

// Inject Copy Option into Menu
if (messageMenu && !messageMenu.querySelector('[data-action="copy"]')) {
  const copyBtn = document.createElement("div");
  copyBtn.className = "menu-item";
  copyBtn.dataset.action = "copy";
  copyBtn.innerText = "Copy";
  messageMenu.appendChild(copyBtn);
}
// Inject Save Option into Menu
if (messageMenu && !messageMenu.querySelector('[data-action="save"]')) {
  const saveBtn = document.createElement("div");
  saveBtn.className = "menu-item";
  saveBtn.dataset.action = "save";
  saveBtn.innerHTML = "Save";
  messageMenu.appendChild(saveBtn);
}

let currentFriendName = null;
let unreadCounts = {};
let typingUsers = new Map();
let typingTimers = new Map();
const messagesContainer = document.getElementById("messages");
const renderedMessages = new Set();
let lastRenderedDate = null;

function formatDateSeparator(date) {
  const d = new Date(date);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (msgDate.getTime() === today.getTime()) return "Today";
  if (msgDate.getTime() === yesterday.getTime()) return "Yesterday";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ================= SCROLL TO BOTTOM BUTTON =================
const scrollToBottomBtn = document.createElement("div");
scrollToBottomBtn.id = "scrollToBottomBtn";
scrollToBottomBtn.innerHTML = "⬇";
scrollToBottomBtn.onclick = () => {
  messagesContainer.scrollTo({
    top: messagesContainer.scrollHeight,
    behavior: "smooth",
  });
};
document.getElementById("chatScreen").appendChild(scrollToBottomBtn);

// ================= NEW MESSAGE PREVIEW =================
const newMessagePreview = document.createElement("div");
newMessagePreview.id = "newMessagePreview";
newMessagePreview.onclick = () => {
  messagesContainer.scrollTo({
    top: messagesContainer.scrollHeight,
    behavior: "smooth",
  });
  newMessagePreview.classList.remove("show");
};
document.getElementById("chatScreen").appendChild(newMessagePreview);

function showNewMessagePreview(text, type) {
  let content = text;
  if (type === "image") content = "📷 Photo";
  else if (type === "video") content = "🎥 Video";
  else if (type === "audio") content = "🎤 Audio";
  else if (type === "sticker") content = "💟 Sticker";

  // Truncate
  if (content && content.length > 25)
    content = content.substring(0, 25) + "...";

  newMessagePreview.innerText = `⬇ ${content}`;
  newMessagePreview.classList.add("show");
}

messagesContainer.addEventListener("scroll", () => {
  const distance =
    messagesContainer.scrollHeight -
    messagesContainer.scrollTop -
    messagesContainer.clientHeight;
  if (distance > 150) {
    // Show if user scrolled up more than 150px
    scrollToBottomBtn.classList.add("show");
  } else {
    scrollToBottomBtn.classList.remove("show");
    newMessagePreview.classList.remove("show");
  }
});

const recordingIndicator = document.getElementById("recordingIndicator");
let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let recordingStream;

const micBtn = document.getElementById("micBtn");

// ================= THEME/WALLPAPER LOGIC =================
const themeOptionsPopup = document.getElementById("themeOptionsPopup");
const themeSelectionModal = document.getElementById("themeSelectionModal");
const wallpaperInput = document.getElementById("wallpaperInput");

document.getElementById("cancelThemeBtn").onclick = () => {
  themeOptionsPopup.style.display = "none";
};

document.getElementById("setWallpaperBtn").onclick = () => {
  themeOptionsPopup.style.display = "none";
  wallpaperInput.click();
};

document.getElementById("setThemeBtn").onclick = () => {
  themeOptionsPopup.style.display = "none";
  themeSelectionModal.style.display = "flex";
};

document.getElementById("cancelThemeSelectionBtn").onclick = () => {
  themeSelectionModal.style.display = "none";
};

wallpaperInput.onchange = (e) => {
  const file = e.target.files[0];
  if (!file || !currentFriendId) return;

  if (file.size > 5 * 1024 * 1024) {
    // 5MB limit
    showPopup("Please select a file under 5MB.");
    return;
  }

  const reader = new FileReader();
  reader.onload = async (event) => {
    const base64Image = event.target.result;
    await saveTheme("wallpaper", base64Image);
    applyTheme("wallpaper", base64Image);
  };
  reader.readAsDataURL(file);
};

// 🔴 START RECORDING
async function startRecording() {
  if (!currentFriendId || isRecording) return;

  try {
    recordingStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    // 🎧 AUDIO ANALYSER (real waveform feel)
    const audioContext = new (
      window.AudioContext || window.webkitAudioContext
    )();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(recordingStream);

    source.connect(analyser);

    analyser.fftSize = 32;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    function animateWave() {
      if (!isRecording) return;

      analyser.getByteFrequencyData(dataArray);

      const bars = document.querySelectorAll(".waveform span");

      bars.forEach((bar, i) => {
        const value = dataArray[i] || 0;
        const height = Math.max(5, value / 8);
        bar.style.height = height + "px";
      });

      requestAnimationFrame(animateWave);
    }

    animateWave();
    mediaRecorder = new MediaRecorder(recordingStream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: "audio/webm" });
      capturedMedia.blob = blob;
      capturedMedia.type = "audio";
      showMediaPreview(blob, "audio");
    };

    mediaRecorder.start();
    isRecording = true;

    micBtn.classList.add("recording");
  } catch (err) {
    showPopup("Mic permission denied.");
  }

  recordingIndicator.style.display = "flex";
}

// ⛔ STOP RECORDING
function stopRecording() {
  if (!mediaRecorder || !isRecording) return;

  mediaRecorder.stop();
  isRecording = false;

  if (recordingStream) {
    recordingStream.getTracks().forEach((track) => track.stop());
    recordingStream = null;
  }

  micBtn.classList.remove("recording");
  recordingIndicator.style.display = "none";
}
let pressTimer = null;
let longPressTriggered = false;

// ================= START HOLD =================

// Desktop
micBtn.addEventListener("mousedown", () => {
  longPressTriggered = false;

  pressTimer = setTimeout(() => {
    longPressTriggered = true;
    startRecording();
  }, 500); // 0.5 second hold
});

// Mobile
micBtn.addEventListener("touchstart", () => {
  longPressTriggered = false;

  pressTimer = setTimeout(() => {
    longPressTriggered = true;
    startRecording();
  }, 500);
});

// ================= RELEASE =================

// Desktop
document.addEventListener("mouseup", () => {
  clearTimeout(pressTimer);

  if (longPressTriggered) {
    stopRecording();
  }
});

// Mobile
document.addEventListener("touchend", () => {
  clearTimeout(pressTimer);

  if (longPressTriggered) {
    stopRecording();
  }
});

// ================= BLOCK NORMAL CLICK =================
micBtn.addEventListener("click", (e) => {
  if (!longPressTriggered) {
    e.preventDefault();
    e.stopPropagation();
  }
});

document.querySelectorAll(".theme-preview").forEach((preview) => {
  preview.onclick = async () => {
    const themeName = preview.dataset.theme;
    await saveTheme("theme_name", themeName);
    applyTheme("theme_name", themeName);
    themeSelectionModal.style.display = "none";
  };
});

async function saveTheme(themeType, themeValue) {
  if (!currentFriendId) return;
  await fetch("/setTheme", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      friendId: currentFriendId,
      themeType,
      themeValue,
    }),
  });
  // Notify friend in real-time
  socket.emit("themeChange", {
    to: currentFriendId,
    themeType,
    themeValue,
  });
}

function applyTheme(themeType, themeValue) {
  const chatScreen = document.getElementById("chatScreen");
  chatScreen.style.backgroundImage = "";
  chatScreen.className = "chat-screen";
  chatScreen.style.display = "flex";

  if (themeType === "wallpaper" && themeValue) {
    chatScreen.style.backgroundImage = `url(${themeValue})`;
    chatScreen.style.backgroundSize = "cover";
    chatScreen.style.backgroundPosition = "center";
  } else if (themeType === "theme_name" && themeValue) {
    chatScreen.classList.add(themeValue);
  }
}

socket.on("themeChanged", (data) => {
  // from is the user who changed the theme
  if (currentFriendId && data.from == currentFriendId) {
    applyTheme(data.themeType, data.themeValue);
  }
});

// ================= RECEIVE MESSAGE =================
socket.on("newMessage", (data) => {
  const fromId = data.from == userId ? data.to : data.from;

  const isMuted = localStorage.getItem(`muteChat_${fromId}`) === "true";

  const isCurrentChat =
    currentFriendId &&
    (data.from == currentFriendId || data.to == currentFriendId);

  if (canPlaySounds() && !isMuted && (!isCurrentChat || !isChatOpen)) {
    messageSound.currentTime = 0;
    messageSound.play().catch(() => {});
  }

  // ✅ delivered
  if (data.to == userId) {
    socket.emit("messageDelivered", {
      msgId: data.msgId,
      from: data.from,
    });
  }

  if (isCurrentChat) {
    // ✅ prevent duplicate ONLY
    if (renderedMessages.has(data.msgId)) return;

    appendMessage(
      data.from,
      data.message,
      data.msgId,
      data.status,
      data.seenAt,
      data.type || "text",
      data.timestamp,
      data.caption,
      null,
      data.replyTo,
    );

    // Handle Scroll or Preview
    const isMe = data.from == userId;
    const distance =
      messagesContainer.scrollHeight -
      messagesContainer.scrollTop -
      messagesContainer.clientHeight;

    if (isMe) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } else {
      if (distance > 150) {
        showNewMessagePreview(data.message, data.type);
      } else {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }
    return;
  }

  unreadCounts[fromId] = {
    count: (unreadCounts[fromId]?.count || 0) + 1,
    preview:
      data.message.substring(0, 30) + (data.message.length > 30 ? "..." : ""),
  };

  updateFriendList();
});
socket.on("messageSeenAll", ({ from, seenAt }) => {
  if (currentFriendId != from) return;

  document.querySelectorAll(".message.sent .tick").forEach((tick) => {
    // ❌ skip already seen (important)
    if (tick.classList.contains("seen")) return;

    tick.className = "tick seen";

    let timeEl = tick.parentElement.querySelector(".seen-time");

    if (!timeEl) {
      timeEl = document.createElement("div");
      timeEl.className = "seen-time";
      tick.parentElement.appendChild(timeEl);
    }

    timeEl.setAttribute("data-time", seenAt);
    timeEl.innerText = "Seen " + timeAgo(seenAt);
  });
});
// ================= MESSAGE UI =================
// ================= TIME FORMAT =================

function timeAgo(date) {
  if (!date) return "";
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return Math.floor(seconds / 60) + "m ago";
  if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago";

  return Math.floor(seconds / 86400) + "d ago";
}

// 🔥 AUTO UPDATE "Seen 2m ago"
setInterval(() => {
  document.querySelectorAll(".seen-time").forEach((el) => {
    const time = el.getAttribute("data-time");
    if (time) {
      el.textContent = "Seen " + timeAgo(time);
    }
  });
}, 10000);

function scrollToMessage(msgId) {
  const el = document.querySelector(`[data-id="${msgId}"]`);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("highlight-message");
    setTimeout(() => {
      el.classList.remove("highlight-message");
    }, 1500);
  }
}

window.selectAllMessages = function () {
  const allMsgs = document.querySelectorAll(".message[data-id]");
  allMsgs.forEach((el) => {
    const msgId = el.getAttribute("data-id");
    if (msgId) {
      selectedMessages.add(msgId);
      el.classList.add("selected-msg");
    }
  });
};

async function checkShareRelation(targetId, msgId) {
  const btn = document.getElementById(`addBtn_${msgId}`);
  if (!btn) return;

  if (targetId == userId) {
    btn.style.display = "none";
    return;
  }

  const res = await fetch(`/checkRelation/${userId}/${targetId}`);
  const data = await res.json();
  if (data.status === "friends") {
    btn.innerText = "Friends";
    btn.disabled = true;
  } else if (data.status === "pending") {
    btn.innerText = "Pending";
    btn.disabled = true;
  }
}

function toggleSelectionMode(enabled, initialMsgEl = null) {
  isSelectionMode = enabled;
  const chatActions = document.querySelector(".chat-actions");
  if (!chatActions) return;

  if (enabled) {
    selectedMessages.clear();
    // Change header to Forward and Delete icons
    chatActions.innerHTML = `
      <button class="chat-action-btn" onclick="selectAllMessages()" title="Select All">
        <i class="fa-solid fa-list-check"></i>
      </button>
      <button class="chat-action-btn" onclick="forwardSelectedMessages()">
        <i class="fa-solid fa-share"></i>
      </button>
      <button class="chat-action-btn" onclick="deleteSelectedMessages()">
        <i class="fa-solid fa-trash"></i>
      </button>
      <button class="chat-action-btn" onclick="toggleSelectionMode(false)" style="color: #ff7b7b;">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;
    if (initialMsgEl) toggleMessageSelection(initialMsgEl);
  } else {
    // Revert to Call icons
    selectedMessages.clear();
    document
      .querySelectorAll(".message.selected-msg")
      .forEach((el) => el.classList.remove("selected-msg"));
    openChat(currentFriendId, currentFriendName); // Refresh header and state
  }
}

function toggleMessageSelection(el) {
  const msgId = el.getAttribute("data-id");
  if (!msgId) return;

  if (selectedMessages.has(msgId)) {
    selectedMessages.delete(msgId);
    el.classList.remove("selected-msg");
  } else {
    selectedMessages.add(msgId);
    el.classList.add("selected-msg");
  }

  if (selectedMessages.size === 0) {
    toggleSelectionMode(false);
  }
}

window.forwardSelectedMessages = function () {
  openForwardModal();
};

window.deleteSelectedMessages = function () {
  if (selectedMessages.size === 0) return;

  const modal = document.getElementById("deleteModal");
  modal.style.display = "flex";
  modal.style.justifyContent = "center";
  modal.style.alignItems = "center";
  modal.style.position = "absolute";
  modal.style.top = "0";
  modal.style.left = "0";
  modal.style.width = "100%";
  modal.style.height = "100%";
  modal.style.backgroundColor = "rgba(0,0,0,0.5)";
  modal.style.zIndex = "10000";

  // Enable "Delete for everyone" for bulk actions as well
  document.getElementById("deleteEveryone").style.display = "block";
};

function appendMessage(
  senderId,
  message,
  msgId = null,
  status = "sent",
  seenAt = null,
  type = "text",
  timestamp = null,
  caption = null,
  reactions = null, // 👈 ADD THIS
  replyTo = null,
) {
  if (msgId && renderedMessages.has(msgId)) return;

  if (timestamp) {
    const msgDateStr = new Date(timestamp).toDateString();
    if (msgDateStr !== lastRenderedDate) {
      const sep = document.createElement("div");
      sep.className = "date-separator";
      sep.innerHTML = `<span class="date-label">${formatDateSeparator(timestamp)}</span>`;
      messagesContainer.appendChild(sep);
      lastRenderedDate = msgDateStr;
    }
  }

  if (msgId) renderedMessages.add(msgId);

  const div = document.createElement("div");
  const isMe = senderId == userId;
  if (msgId) {
    div.setAttribute("data-id", msgId);
  }
  div.setAttribute("data-sender", senderId);
  div.className = isMe ? "message sent" : "message received";

  // Helper to download files
  window.downloadFile = function (dataUrl, fileName) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ✅ HANDLE CALL LOGS
  if (
    type === "call_log" ||
    type === "screenshot_log" ||
    type === "timer_log"
  ) {
    div.className = `message ${type.replace("_", "-")}`;
    const timeStr = timestamp
      ? new Date(timestamp).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
    let text = message;
    let icon = "";

    if (type === "call_log") {
      icon = message === "Missed call" ? "📞" : "☎️";
      // Map "Missed call" database entry to appropriate text based on perspective
      if (message === "Missed call") {
        text = isMe ? "No answer" : "Missed call";
      }
    } else if (type === "screenshot_log") {
      icon = "📸";
    } else if (type === "timer_log") {
      icon = "⏱️";
      text = isMe
        ? `You set chat timer to ${message}`
        : `Chat timer updated to ${message}`;
    }

    div.innerHTML = `${icon} ${text} <span class="call-log-time">${timeStr}</span>`;
  } else {
    // Standard message
    let tickHtml = "";
    let seenText = "";

    // ✅ HANDLE DIFFERENT MEDIA TYPES & CAPTIONS
    let contentHtml;
    const sanitizedCaption = caption
      ? caption.replace(/</g, "&lt;").replace(/>/g, "&gt;")
      : null;
    const captionHtml = sanitizedCaption
      ? `<div class="media-caption"></div>`
      : "";

    if (type === "image") {
      contentHtml = `
        <div class="media-wrapper">
          <img src="${message}" class="chat-media" onclick="openFullScreenImage(this.src)">
          ${captionHtml}
        </div>
      `;
    } else if (type === "audio") {
      div.classList.add("audio-message");
      contentHtml = `
        <div class="media-wrapper">
            <audio controls class="chat-media" style="width: 100%;">
              <source src="${message}" type="audio/webm">
            </audio>
            ${captionHtml}
        </div>`;
    } else if (type === "video") {
      contentHtml = `
        <div class="media-wrapper">
          <video src="${message}" class="chat-media" controls></video>
          ${captionHtml}
        </div>
      `;
    } else if (type === "document") {
      const fileName = caption || "File";
      contentHtml = `
        <div class="media-wrapper document-msg" onclick="downloadFile('${message}', '${fileName}')" style="cursor: pointer; display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px;">
            <i class="fa-solid fa-file-arrow-down" style="font-size: 24px; color: #ffcc00;"></i>
            <div style="display: flex; flex-direction: column; overflow: hidden; text-align: left;">
                <span style="font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${fileName}</span>
                <span style="font-size: 10px; ">Click to download</span>
            </div>
          ${captionHtml}
        </div>
      `;
    } else if (type === "sticker") {
      contentHtml = `<img src="${message}" class="chat-sticker">`;
    } else if (type === "profile_share") {
      const sharedData = JSON.parse(message);
      contentHtml = `
        <div class="profile-share-card">
          <img src="${sharedData.avatar}" class="share-avatar">
          <div class="share-info">
            <div class="share-name">${sharedData.name}</div>
            <button class="share-add-btn" id="addBtn_${msgId}" onclick="requestFromShare(${sharedData.sharedUserId}, '${msgId}')">Add Friend</button>
          </div>
        </div>
      `;
      // Check relation after a tiny delay so the element is in the DOM
      setTimeout(() => checkShareRelation(sharedData.sharedUserId, msgId), 50);
    } else {
      // Default to text
      const sanitizedMessage = message
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      const editedTag = msgId && arguments[3] === "edited" ? " (edited)" : "";
      contentHtml = `<div class="message-text">${sanitizedMessage}${editedTag}</div>`;
    }

    // Note: We used contentHtml below instead of raw message

    if (isMe && msgId) {
      tickHtml = `<span class="tick ${status}" data-id="${msgId}" data-seen="${seenAt || ""}"></span>`;
    }

    if (isMe && status === "seen" && seenAt) {
      seenText = `<div class="seen-time" data-time="${seenAt}">Seen ${timeAgo(seenAt)}</div>`;
    }

    const reactionsHtml = reactions
      ? `<div class="reactions">${parseReactions(reactions).join(" ")}</div>`
      : "";
    let replyHtml = "";

    if (replyTo) {
      const repliedMsg = document.querySelector(`[data-id="${replyTo}"]`);
      const replyText = repliedMsg
        ? repliedMsg.querySelector(".message-text")?.innerText || "[Media]"
        : "Message";

      const rSender = repliedMsg
        ? repliedMsg.getAttribute("data-sender")
        : null;
      const rName = rSender
        ? rSender == userId
          ? "You"
          : currentFriendName
        : "";

      replyHtml = `
    <div class="reply-preview" onclick="event.stopPropagation(); scrollToMessage('${replyTo}')">
      ${rName ? `<div style="color: #4facfe; font-size: 10px; font-weight: bold; margin-bottom: 2px;">${rName}</div>` : ""}
      ${replyText}
    </div>
  `;
    }
    div.innerHTML = `
  <div class="message-sender">${isMe ? "Me" : currentFriendName || "Friend"}</div>
   ${replyHtml}
  ${contentHtml}
  ${tickHtml}
  ${seenText}
  ${reactionsHtml}
`;
  }

  messagesContainer.appendChild(div);
  // messagesContainer.scrollTop = messagesContainer.scrollHeight; // Removed auto-scroll to handle previews
  // 🟡 LONG PRESS (mobile)
  div.addEventListener("touchstart", (e) => {
    longPressTimer = setTimeout(() => {
      showMessageMenu(e, div);
    }, 500); // 500ms hold
  });

  div.addEventListener("touchend", () => {
    clearTimeout(longPressTimer);
  });

  // 🖱️ LEFT CLICK (desktop/big screens)
  div.addEventListener("click", (e) => {
    if (isSelectionMode) {
      toggleMessageSelection(div);
      return;
    }
    if (["IMG", "VIDEO", "AUDIO", "A"].includes(e.target.tagName)) return;
    showMessageMenu(e, div);
  });

  // 🖱️ RIGHT CLICK (desktop)
  div.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    showMessageMenu(e, div);
  });
}
document.querySelectorAll(".menu-item").forEach((item) => {
  // ✅ SKIP profile menu items
  if (item.closest(".profile-menu-dropdown")) return;
  item.onclick = () => {
    const action = item.dataset.action;

    if (action === "delete") {
      if (!selectedMessageEl) return;

      selectedMsgId = parseInt(selectedMessageEl.getAttribute("data-id"));
      selectedMsgSender = selectedMessageEl.getAttribute("data-sender");

      if (!selectedMsgId) {
        console.warn("No msgId found");
        return;
      }

      const modal = document.getElementById("deleteModal");
      modal.style.display = "flex";
      modal.style.justifyContent = "center";
      modal.style.alignItems = "center";
      modal.style.position = "absolute";
      modal.style.top = "0";
      modal.style.left = "0";
      modal.style.width = "100%";
      modal.style.height = "100%";
      modal.style.backgroundColor = "rgba(0,0,0,0.5)";
      modal.style.zIndex = "10000";

      // Always show "Delete for everyone" regardless of who sent it
      document.getElementById("deleteEveryone").style.display = "block";
    }
    if (action === "edit") {
      if (!selectedMessageEl) return;

      selectedMsgId = parseInt(selectedMessageEl.getAttribute("data-id"));
      selectedMsgSender = selectedMessageEl.getAttribute("data-sender");

      editingMsgId = selectedMsgId;
      editingMsgElement = selectedMessageEl;

      const textEl = selectedMessageEl.querySelector(".message-text");
      if (!textEl) return;

      msgInput.value = textEl.innerText.replace(" (edited)", "");
      msgInput.focus();

      const isMe = parseInt(selectedMsgSender) === parseInt(userId);
      showEditOptions(isMe);
    }

    if (action === "copy") {
      if (!selectedMessageEl) return;
      let textToCopy = "";
      const textEl = selectedMessageEl.querySelector(".message-text");
      const mediaEl = selectedMessageEl.querySelector(".chat-media");
      const stickerEl = selectedMessageEl.querySelector(".chat-sticker");

      if (textEl) {
        textToCopy = textEl.innerText.replace(" (edited)", "");
      } else if (mediaEl) {
        textToCopy = mediaEl.src;
      } else if (stickerEl) {
        textToCopy = stickerEl.src;
      } else if (selectedMessageEl.classList.contains("call-log")) {
        textToCopy = selectedMessageEl.innerText;
      }

      if (textToCopy) {
        navigator.clipboard.writeText(textToCopy);
      }
    }
    if (action === "save") {
      if (!selectedMessageEl) return;
      const mediaEl = selectedMessageEl.querySelector(
        ".chat-media, .chat-sticker",
      );

      if (mediaEl) {
        const src = mediaEl.src || mediaEl.querySelector("source")?.src;
        if (src) {
          const a = document.createElement("a");
          a.href = src;

          let extension = "";
          if (mediaEl.tagName === "AUDIO") {
            extension = ".mp3";
          } else if (mediaEl.tagName === "VIDEO") {
            extension = ".mp4";
          } else if (mediaEl.tagName === "IMG") {
            extension = src.includes("image/jpeg") ? ".jpg" : ".png";
          }

          a.download = `media_${Date.now()}${extension}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      }
    }
    if (action === "react") {
      showReactionBar(selectedMessageEl);
    }
    if (action === "reply") {
      if (!selectedMessageEl) return;

      const msgId = selectedMessageEl.getAttribute("data-id");
      const senderId = selectedMessageEl.getAttribute("data-sender");
      const textEl = selectedMessageEl.querySelector(".message-text");

      replyingMsg = {
        id: msgId,
        text: textEl ? textEl.innerText : "[Media]",
        senderId: senderId,
      };

      showReplyPreview();
    }
    if (action === "select") {
      toggleSelectionMode(true, selectedMessageEl);
    }
    messageMenu.style.display = "none";
  };
});

function showReplyPreview() {
  document.getElementById("replyBox")?.remove();

  const div = document.createElement("div");
  div.id = "replyBox";

  const name = replyingMsg.senderId == userId ? "You" : currentFriendName;

  div.innerHTML = `
    <div class="reply-content">
      <span class="reply-label">${name}</span>
      <div class="reply-text">${replyingMsg.text}</div>
    </div>
    <button onclick="cancelReply()">✖</button>
  `;

  msgInput.parentElement.prepend(div);
}
const replyStyle = document.createElement("style");
replyStyle.innerHTML = `
#replyBox {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  margin-bottom: 5px;
  border-left: 4px solid #4facfe;
  background: rgba(50,50,60,0.7);
  border-radius: 10px;
  backdrop-filter: blur(10px);
}

.reply-content {
  display: flex;
  flex-direction: column;
}

.reply-label {
  font-size: 11px;
  color: #4facfe;
}

.reply-text {
  font-size: 13px;
  color: #ddd;
}

#replyBox button {
  background: none;
  border: none;
  color: #ff6b6b;
  font-size: 16px;
  cursor: pointer;
}
`;
document.head.appendChild(replyStyle);

function cancelReply() {
  replyingMsg = null;
  document.getElementById("replyBox")?.remove();
}
window.addEventListener("click", (e) => {
  if (e.target === deleteModal) {
    deleteModal.style.display = "none";
  }
});

document.getElementById("deleteMe").onclick = () => {
  if (isSelectionMode) {
    selectedMessages.forEach((msgId) => {
      socket.emit("deleteMessage", {
        msgId: parseInt(msgId),
        type: "me",
        to: currentFriendId,
      });
    });
    // showPopup("Messages deleted");
    toggleSelectionMode(false);
  } else {
    socket.emit("deleteMessage", {
      msgId: selectedMsgId,
      type: "me",
      to: currentFriendId,
    });
  }

  deleteModal.style.display = "none";
};

document.getElementById("deleteEveryone").onclick = () => {
  if (isSelectionMode) {
    selectedMessages.forEach((msgId) => {
      socket.emit("deleteMessage", {
        msgId: parseInt(msgId),
        type: "everyone",
        to: currentFriendId,
      });
    });
    // showPopup("Messages deleted for everyone");
    toggleSelectionMode(false);
  } else {
    socket.emit("deleteMessage", {
      msgId: selectedMsgId,
      type: "everyone",
      to: currentFriendId,
    });
  }

  deleteModal.style.display = "none";
};

function showReactionBar(messageEl) {
  document.getElementById("reactionBar")?.remove();

  const rect = messageEl.getBoundingClientRect();

  const div = document.createElement("div");
  div.id = "reactionBar";

  div.innerHTML = `
    <span onclick="reactToMsg('${messageEl.dataset.id}','❤️')">❤️</span>
    <span onclick="reactToMsg('${messageEl.dataset.id}','😂')">😂</span>
    <span onclick="reactToMsg('${messageEl.dataset.id}','😮')">😮</span>
    <span onclick="reactToMsg('${messageEl.dataset.id}','👍')">👍</span>
    <span onclick="reactToMsg('${messageEl.dataset.id}','🔥')">🔥</span>
    <span onclick="reactToMsg('${messageEl.dataset.id}','🎉')">🎉</span>
  `;

  div.style.position = "absolute";

  // Position above the message
  let top = rect.top - 55;
  if (top < 10) top = rect.bottom + 10; // If too close to top, show below
  div.style.top = top + "px";

  // Center horizontally relative to message, but keep on screen
  let left = rect.left + rect.width / 2 - 250;
  if (left < 10) left = 10;
  if (left + 220 > window.innerWidth) left = window.innerWidth - 230;
  div.style.left = left + "px";

  app.appendChild(div);

  // Close on outside click
  setTimeout(() => {
    const closeHandler = (e) => {
      if (!div.contains(e.target)) {
        div.remove();
        document.removeEventListener("click", closeHandler);
      }
    };
    document.addEventListener("click", closeHandler);
  }, 0);
}
function reactToMsg(msgId, emoji) {
  socket.emit("reactMessage", {
    msgId,
    emoji,
    to: currentFriendId,
  });

  document.getElementById("reactionBar")?.remove();
}
function parseReactions(reactions) {
  if (!reactions) return [];

  return reactions.split(",").map((r) => r.split(":")[1]);
}
socket.on("messageReacted", ({ msgId, reactions }) => {
  const msgEl = document.querySelector(`[data-id="${msgId}"]`);
  if (!msgEl) return;

  let reactEl = msgEl.querySelector(".reactions");

  if (!reactEl) {
    reactEl = document.createElement("div");
    reactEl.className = "reactions";
    msgEl.appendChild(reactEl);
  }

  const emojis = parseReactions(reactions).join(" ");

  if (!emojis) {
    reactEl.remove(); // Remove container if no reactions
  } else {
    reactEl.innerText = emojis;
  }
});
socket.on("messageDeleted", ({ msgId, type }) => {
  const msgEls = document.querySelectorAll(`[data-id="${msgId}"]`);
  msgEls.forEach((el) => el.remove());
});

socket.on("messageEdited", ({ msgId, newText, type }) => {
  const msgEl = document.querySelector(`[data-id="${msgId}"]`);
  if (!msgEl) return;

  const textEl = msgEl.querySelector(".message-text");
  if (!textEl) return;

  if (type === "everyone") {
    textEl.innerText = newText;
  } else {
    textEl.innerText = newText;
  }
});
function showEditOptions(isMe) {
  document.getElementById("editOptions")?.remove();

  const div = document.createElement("div");
  div.id = "editOptions";

  div.innerHTML = `
    <button id="editMeBtn" onclick="setEditType('me', this)">
      Edit For Me
    </button>

    ${
      isMe
        ? `<button id="editEveryoneBtn" onclick="setEditType('everyone', this)">
           Edit For Everyone
          </button>`
        : ""
    }

    <button class="cancel-btn" onclick="cancelEdit()">
      ✖ Cancel
    </button>
  `;

  msgInput.parentElement.prepend(div);
}
function setEditType(type, btn) {
  editType = type;

  // remove active from all
  document.querySelectorAll("#editOptions button").forEach((b) => {
    b.classList.remove("active");
  });

  // add active to selected
  btn.classList.add("active");
}
function cancelEdit() {
  editingMsgId = null;
  editingMsgElement = null;
  editType = null;
  msgInput.value = "";
  document.getElementById("editOptions")?.remove();
}
function showMessageMenu(e, messageEl) {
  selectedMessageEl = messageEl;

  const isLog =
    messageEl.classList.contains("call-log") ||
    messageEl.classList.contains("screenshot-log") ||
    messageEl.classList.contains("timer-log");

  if (isLog) {
    // Only show delete for log messages
    messageMenu.querySelectorAll(".menu-item").forEach((item) => {
      item.style.display = item.dataset.action === "delete" ? "flex" : "none";
    });
  } else {
    // Reset visibility for normal messages
    messageMenu.querySelectorAll(".menu-item").forEach((item) => {
      item.style.display = "flex";
    });
  }

  const editBtn = messageMenu.querySelector('[data-action="edit"]');
  if (editBtn) {
    const isTextMessage = messageEl.querySelector(".message-text");
    editBtn.style.display = isTextMessage ? "" : "none";
  }

  const saveBtn = messageMenu.querySelector('[data-action="save"]');
  if (saveBtn) {
    const hasMedia = messageEl.querySelector(".chat-media, .chat-sticker");
    saveBtn.style.display = hasMedia ? "" : "none";
  }

  messageMenu.style.display = "flex";
  messageMenu.style.visibility = "hidden"; // Hide during calculation to prevent flicker
  messageMenu.style.position = "absolute";
  messageMenu.style.zIndex = "1000";

  const msgRect = messageEl.getBoundingClientRect();
  const appRect = app.getBoundingClientRect();

  const menuWidth = messageMenu.offsetWidth;
  const menuHeight = messageMenu.offsetHeight;

  // Calculate Position Relative to App Container
  let left = msgRect.left - appRect.left + msgRect.width / 2 - menuWidth / 2;

  // Clamp Horizontal (Keep inside App width)
  if (left < 10) left = 10;
  if (left + menuWidth > appRect.width - 10) {
    left = appRect.width - menuWidth - 10;
  }

  // Calculate Vertical (Try Above first)
  let top = msgRect.top - appRect.top - menuHeight - 10;

  // If it goes off-top, try below
  if (top < 10) {
    top = msgRect.bottom - appRect.top + 10;
  }

  // If it goes off-bottom (even when placed below), force it to stay inside
  if (top + menuHeight > appRect.height - 10) {
    top = appRect.height - menuHeight - 10;
  }

  messageMenu.style.left = left + "px";
  messageMenu.style.top = top + "px";
  messageMenu.style.visibility = "visible";
}
document.addEventListener("click", (e) => {
  if (!messageMenu.contains(e.target)) {
    messageMenu.style.display = "none";
  }
});
// ================= SEND MESSAGE =================

sendBtn.onclick = () => {
  if (!currentFriendId) return;

  const text = msgInput.value; // Use raw value for multiline support
  // ================= 🔥 EDIT MODE =================
  if (editingMsgId) {
    if (!editType) {
      showPopup("Please select an edit option ");
      return;
    }

    socket.emit("editMessage", {
      msgId: editingMsgId,
      newText: text,
      type: editType,
      to: currentFriendId,
    });

    cancelEdit();
    return;
  }
  // Check if there is media to send from camera or gallery
  if (capturedMedia.blob && capturedMedia.type) {
    const reader = new FileReader();
    reader.onload = () => {
      const base64Media = reader.result;
      socket.emit(
        "sendMessage",
        {
          to: currentFriendId,
          message: base64Media,
          type: capturedMedia.type,
          // For documents, we store the original filename in the caption if no user text is provided
          caption:
            capturedMedia.type === "document"
              ? text || capturedMedia.name
              : text,
          replyTo: replyingMsg ? replyingMsg.id : null,
        },
        (res) => {
          if (!res || !res.success) return;
          const msg = res.data;
          appendMessage(
            userId,
            msg.message,
            msg.msgId,
            msg.status,
            msg.seenAt,
            capturedMedia.type,
            msg.timestamp,
            msg.caption,
            null,
            msg.replyTo,
          );
          messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll to bottom on send
        },
      );
      cancelReply();
      // Reset preview and captured media
      capturedMedia.blob = null;
      capturedMedia.type = null;
      mediaToSendPreview.style.display = "none";
      mediaToSendPreview.innerHTML = "";
      msgInput.value = ""; // Also clear text input
      msgInput.style.height = "auto"; // Reset height
    };
    reader.readAsDataURL(capturedMedia.blob);
    return; // Sent media, so we are done.
  }

  // Original text message logic
  if (text.trim() === "") return;

  socket.emit(
    "sendMessage",
    {
      to: currentFriendId,
      message: text,
      type: "text",
      replyTo: replyingMsg ? replyingMsg.id : null,
    },
    (res) => {
      if (!res || !res.success) return;

      const msg = res.data;

      appendMessage(
        userId,
        msg.message,
        msg.msgId, // ✅ REAL DB ID
        msg.status,
        msg.seenAt,
        "text",
        msg.timestamp,
        null,
        null,
        msg.replyTo,
      );
      messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll to bottom on send
    },
  );

  cancelReply();
  msgInput.value = "";
  msgInput.style.height = "auto"; // Reset height after sending
  stopTyping();
};

msgInput.onkeydown = (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    // Enter sends, Shift+Enter adds newline
    e.preventDefault();
    sendBtn.click();
  }
};

// ================= TICK UPDATE =================

socket.on("messageDelivered", (data) => {
  const tick = document.querySelector(`.tick[data-id="${data.msgId}"]`);
  if (tick) tick.className = "tick delivered";
});

// 🔥 UPDATED (IMPORTANT)
socket.on("messageSeen", (data) => {
  const tick = document.querySelector(`.tick[data-id="${data.msgId}"]`);
  if (!tick) return;

  tick.className = "tick seen";

  let timeEl = tick.parentElement.querySelector(".seen-time");

  if (!timeEl) {
    timeEl = document.createElement("div");
    timeEl.className = "seen-time";
    tick.parentElement.appendChild(timeEl);
  }

  // ✅ store time for auto update
  timeEl.setAttribute("data-time", data.seenAt);

  timeEl.innerText = "Seen " + timeAgo(data.seenAt);
});
// ================= TYPING =================

let typingTimer;

function startTyping() {
  if (!currentFriendId) return;
  socket.emit("typing", { to: currentFriendId });
}

function stopTyping() {
  if (!currentFriendId) return;
  socket.emit("stopTyping", { to: currentFriendId });
}

msgInput.addEventListener("input", () => {
  clearTimeout(typingTimer);
  startTyping();
  msgInput.style.height = "auto";
  msgInput.style.height = msgInput.scrollHeight + "px"; // Auto-expand height
  typingTimer = setTimeout(stopTyping, 1500);
});

// ================= TYPING RECEIVE =================

socket.on("userTyping", (data) => {
  if (typingTimers.has(data.from)) {
    clearTimeout(typingTimers.get(data.from));
    typingTimers.delete(data.from);
  }

  typingUsers.set(data.from, data.typing);
  updateFriendList();

  if (data.from == currentFriendId) {
    const indicator = document.getElementById("typingIndicator");

    indicator.style.display = data.typing ? "flex" : "none";
  }

  if (data.typing) {
    const timerId = setTimeout(() => {
      typingUsers.set(data.from, false);
      updateFriendList();
      typingTimers.delete(data.from);
    }, 4000);

    typingTimers.set(data.from, timerId);
  }
});

// ================= FRIEND LIST =================

function updateFriendList() {
  const items = document.querySelectorAll(".chat-item");

  items.forEach((item) => {
    const friendId = parseInt(item.dataset.friendId);
    const unread = unreadCounts[friendId];
    const streak = parseInt(item.dataset.streak) || 0;
    const streakHtml = streak > 0 ? `🔥 ${streak}` : "💬";

    const msgEl = item.querySelector(".chat-msg");
    const days = item.querySelector(".chat-days");

    if (typingUsers.get(friendId)) {
      msgEl.textContent = "typing...";
      days.innerHTML = "⏳";
    } else if (unread && unread.count > 0) {
      msgEl.textContent = unread.preview;
      days.innerHTML = `<span class="unread-badge">${unread.count}</span>`;
    } else {
      msgEl.textContent = "Click to chat";
      days.innerHTML = streakHtml;
    }
  });
}

async function loadFriends() {
  const res = await fetch(`/getFriends/${userId}`);
  const data = await res.json();

  const chatList = document.querySelector(".chat-list");
  chatList.innerHTML = "";

  // ✅ POPULATE UNREAD COUNTS FROM DB
  data.friends.forEach((friend) => {
    if (friend.unreadCount > 0) {
      unreadCounts[friend.id] = {
        count: friend.unreadCount,
        preview: friend.lastMessage,
      };
    }
  });

  data.friends.forEach((friend) => {
    const item = document.createElement("div");

    item.className = "chat-item";
    item.dataset.friendId = friend.id;
    item.dataset.streak = friend.streak || 0;

    const fireHtml = friend.streak > 0 ? `🔥 ${friend.streak}` : "💬";

    item.innerHTML = `
      <img src="${getAvatarSrc(friend)}">
      <div class="chat-info">
        <div class="chat-name">${friend.name}</div>
        <div class="chat-msg">${friend.lastMessage || "Click to chat"}</div>
      </div>
      <div class="chat-days">${fireHtml}</div>
    `;

    item.onclick = () => openChat(friend.id, friend.name, friend.avatar);
    chatList.appendChild(item);
  });
  updateFriendList();
}

// ================= OPEN CHAT =================

function closeAllModals() {
  document.getElementById("addFriendModal").style.display = "none";
  document.getElementById("searchModal").style.display = "none";
  document.getElementById("requestModal").style.display = "none";
}

async function openChat(friendId, friendName, friendAvatar = null) {
  isChatOpen = true;
  loadMuteState();
  closeAllModals();
  scrollToBottomBtn.classList.remove("show"); // Ensure button is hidden on open
  currentFriendId = friendId;
  currentFriendName = friendName;
  activeChat = friendId;
  delete unreadCounts[friendId];
  updateFriendList();

  // If no avatar passed (e.g. from search), use placeholder initially
  if (!friendAvatar) {
    friendAvatar = getAvatarSrc({ id: friendId });
  }

  // ✅ Update Header with Name and Status Container
  const chatNameEl = document.getElementById("chatName");
  const headerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
<img src="${friendAvatar}" alt="${friendName}" class="golden-avatar" onclick="openUserProfile()">
      <div class="chat-header-info">
        <span>${friendName}</span>
        <span id="chatStatus" class="chat-status">Connecting...</span>
        
        <!-- Hanging Character -->
        <div id="hangingCharacter" class="hanging-character">
           <div class="hanging-stick"></div>
           <div class="stickman">
              <div class="stickman-head"></div>
              <div class="stickman-body"></div>
              <div class="stickman-arm-left"></div>
              <div class="stickman-arm-right"></div>
              <div class="stickman-leg-left"></div>
              <div class="stickman-leg-right"></div>
           </div>
         </div>
      </div>
    </div>
    <div class="chat-actions">
      <button class="chat-action-btn" onclick="startVoiceCall('${friendId}', '${friendName}')">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
      </button>
      <button class="chat-action-btn" onclick="startVideoCall('${friendId}', '${friendName}')">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
      </button>
      <button class="chat-action-btn" id="chatOptionsBtn">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
      </button>
    </div>
  `;

  chatNameEl.innerHTML = headerHTML;

  // ✅ Handle click on new theme options button
  document.getElementById("chatOptionsBtn").onclick = () => {
    themeOptionsPopup.style.display = "flex";
  };

  // ✅ Make header clickable for profile view (name part)
  const headerInfoClickable = chatNameEl.querySelector(".chat-header-info");
  if (headerInfoClickable) {
    headerInfoClickable.style.cursor = "pointer";
    headerInfoClickable.onclick = openUserProfile;
  }

  // Also make the avatar clickable (if it exists in your DOM structure outside chatName)
  // Assuming structure based on Context:
  const headerImg = document.querySelector(".chat-header img");
  if (headerImg) {
    headerImg.style.cursor = "pointer";
    headerImg.onclick = openUserProfile;
  }

  // ✅ Fetch Initial Status
  updateChatStatus(friendId);

  // Fetch Chat Settings (Timer)
  const settingsRes = await fetch(`/api/getChatSettings/${userId}/${friendId}`);
  const settingsData = await settingsRes.json();
  console.log("Chat Timer Mode:", settingsData.timer_mode);

  // Load and apply theme
  const themeRes = await fetch(`/getTheme/${userId}/${friendId}`);
  const themeData = await themeRes.json();
  if (themeData.theme) {
    applyTheme(themeData.theme.theme_type, themeData.theme.theme_value);
  } else {
    applyTheme(null, null); // Apply default
  }

  const res = await fetch(`/getMessages/${userId}/${friendId}`);
  const data = await res.json();

  const messagesEl = document.getElementById("messages");
  messagesEl.innerHTML = "";
  renderedMessages.clear();
  lastRenderedDate = null;

  data.messages.forEach((msg) => {
    // 🔥 PASS seen_at
    const editedText = extractEditedText(msg.edited_for_me, userId);

    appendMessage(
      msg.sender,
      editedText || msg.message,
      msg.id,
      msg.status,
      msg.seen_at,
      msg.type,
      msg.timestamp,
      msg.caption,
      msg.reactions,
      msg.reply_to,
    );
  });

  socket.emit("joinChat", friendId);

  socket.emit("userInChat", {
    withUser: friendId,
  });

  if (localStorage.getItem("readReceipts") !== "false") {
    socket.emit("markAllSeen", {
      withUser: friendId,
    });
  }

  document.getElementById("chatScreen").style.display = "flex";
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
function extractEditedText(editedStr, userId) {
  if (!editedStr) return null;

  const parts = editedStr.split(",");
  for (let p of parts) {
    if (p.startsWith(userId + ":")) {
      return p.split(":").slice(1).join(":");
    }
  }
  return null;
}

document.getElementById("backChat").onclick = () => {
  document.getElementById("chatScreen").style.display = "none";
  scrollToBottomBtn.classList.remove("show");
  isChatOpen = false;
  activeChat = null; // ✅ ADD THIS
  currentFriendId = null;
  currentFriendName = null;
  // ✅ TELL SERVER YOU LEFT CHAT
  socket.emit("leaveChat");
};

// ================= STATUS UPDATES =================

async function updateChatStatus(friendId) {
  const statusEl = document.getElementById("chatStatus");
  if (!statusEl || currentFriendId != friendId) return;

  const res = await fetch(`/getUserStatus/${friendId}?requesterId=${userId}`);
  const data = await res.json();
  // ✅ Update Avatar in Header to ensure it matches server data
  const chatAvatar = document.querySelector("#chatName img");
  if (chatAvatar && data.avatar) {
    chatAvatar.src = data.avatar;
  }

  if (data.statusHidden) {
    statusEl.textContent = "";
    document.getElementById("hangingCharacter")?.classList.remove("show");
    return;
  }

  if (data.online) {
    statusEl.textContent = "Online";
    statusEl.style.color = "#00ff55";
  } else {
    statusEl.textContent = data.lastSeen
      ? "Last seen " + timeAgo(data.lastSeen)
      : "Offline";
    statusEl.style.color = "#aaa";
  }
}

// ✅ Real-time status listeners
socket.on("userOnline", (id) => {
  if (currentFriendId == id) {
    const statusEl = document.getElementById("chatStatus");
    if (statusEl) {
      // IGNORE GLOBAL ONLINE STATUS
      // User wants
    }
  }
});

socket.on("userOffline", (id) => {
  if (currentFriendId == id) {
    // When they go offline, the server sets last_seen to NOW.
    // We can just set text immediately or re-fetch.
    const statusEl = document.getElementById("chatStatus");
    if (statusEl) {
      statusEl.textContent = "Last seen just now";
      statusEl.style.color = "#aaa";
    }
  }
});

socket.on("friendEnteredChat", ({ friendId }) => {
  if (currentFriendId == friendId) {
    document.getElementById("hangingCharacter")?.classList.add("show");

    updateChatStatus(friendId);
  }
});

socket.on("friendLeftChat", ({ friendId }) => {
  if (currentFriendId == friendId) {
    document.getElementById("hangingCharacter")?.classList.remove("show");

    updateChatStatus(friendId);
  }
});

socket.on("friendStatusInChat", ({ isHere }) => {
  if (isHere) {
    document.getElementById("hangingCharacter")?.classList.add("show");
  }
  if (currentFriendId) updateChatStatus(currentFriendId);
});

// ================= CLOSE MODALS =================

function closeModal(event) {
  const modal = event.target.closest(
    "#addFriendModal, #searchModal, #requestModal",
  );
  if (modal) modal.style.display = "none";
}

document.querySelectorAll(".close-btn").forEach((btn) => {
  btn.addEventListener("click", closeModal);
});
socket.on("timerModeChanged", (data) => {
  if (currentFriendId == data.from) {
    // showPopup(`Chat timer changed to ${data.mode}`);
  }
});
// ================= WEBRTC LOGIC =================

let localStream;
let peerConnection;
let incomingCallData = null;
let callPartnerId = null;
let currentCallType = "voice"; // "voice" or "video"
let callTimerInterval = null;
let callStartTime = null;
let callAnswered = false;
let isCaller = false;
let callState = {
  isVideo: false,
  isMuted: false,
  speaker: false,
  cameraFacing: "user",
  remoteVideo: false,
};
const rtcConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

async function startVoiceCall(friendId, friendName) {
  callPartnerId = friendId;
  currentCallType = "voice";
  isCaller = true;
  callStartTime = null; // Not connected yet
  callState.isVideo = false;
  callState.remoteVideo = false;
  updateVideoLayout();
  setSpeaker(false); // Default to earpiece for voice call

  // UI Update
  document.getElementById("callModal").style.display = "flex";
  document.getElementById("incomingButtons").style.display = "none";
  document.getElementById("activeButtons").style.display = "flex";
  document.getElementById("callName").textContent = friendName;
  document.getElementById("callStatus").textContent = "Calling...";
  document.getElementById("callAvatar").src = getAvatarSrc({ id: friendId });

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    createPeerConnection();

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.emit("callUser", {
      userToCall: friendId,
      signalData: offer,
      from: userId,
      callType: "voice",
    });
  } catch (err) {
    console.error("Error starting call:", err);
    showPopup("Could not access microphone.");
    closeCallUI();
  }
}

async function startVideoCall(friendId, friendName) {
  callPartnerId = friendId;
  currentCallType = "video";
  isCaller = true;
  callStartTime = null; // Not connected yet
  callState.isVideo = true;
  callState.remoteVideo = false;
  updateVideoLayout();
  setSpeaker(true); // Default to speaker for video call

  document.getElementById("callModal").style.display = "flex";
  document.getElementById("incomingButtons").style.display = "none";
  document.getElementById("activeButtons").style.display = "flex";
  document.getElementById("callName").textContent = friendName;
  document.getElementById("callStatus").textContent = "Calling...";
  document.getElementById("callAvatar").src = getAvatarSrc({ id: friendId });

  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    document.getElementById("localVideo").srcObject = localStream;
    createPeerConnection();

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.emit("callUser", {
      userToCall: friendId,
      signalData: offer,
      from: userId,
      callType: "video",
    });
  } catch (err) {
    console.error("Error starting call:", err);
    showPopup("Could not access camera/microphone.");
    closeCallUI();
  }
}

function createPeerConnection() {
  peerConnection = new RTCPeerConnection(rtcConfig);

  peerConnection.onicecandidate = (event) => {
    if (event.candidate && callPartnerId) {
      socket.emit("iceCandidate", {
        candidate: event.candidate,
        to: callPartnerId,
      });
    }
  };

  peerConnection.ontrack = (event) => {
    const remoteVideo = document.getElementById("remoteVideo");

    // Create stream if not exists
    if (!remoteVideo.srcObject) {
      remoteVideo.srcObject = new MediaStream();
    }

    const remoteStream = remoteVideo.srcObject;

    // Add track only if not already added
    if (!remoteStream.getTracks().find((t) => t.id === event.track.id)) {
      remoteStream.addTrack(event.track);
    }

    // 🎯 Detect video track
    if (event.track.kind === "video") {
      callState.remoteVideo = true;
      updateVideoLayout();
    }

    // 🎯 Detect audio track
    if (event.track.kind === "audio") {
      // ensure audio plays
      remoteVideo.muted = false;
    }

    remoteVideo.play().catch(() => {});
  };
  peerConnection.onremovetrack = (event) => {
    if (event.track.kind === "video") {
      callState.remoteVideo = false;
      updateVideoLayout();
    }
  };
  if (localStream) {
    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });
  }
}

function startCallTimer() {
  if (callTimerInterval) clearInterval(callTimerInterval); // Clear any existing timer

  const callStatusEl = document.getElementById("callStatus");
  const miniCallTimerEl = document.getElementById("miniCallTimer");

  callTimerInterval = setInterval(() => {
    if (!callStartTime) return;
    const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;
    callStatusEl.textContent = timeStr;
    if (miniCallTimerEl) miniCallTimerEl.textContent = timeStr;
  }, 1000);
}

// ================= INIT =================

// Inject Call Modal HTML
const callModalHTML = `
<div id="callModal" class="call-modal">

  <!-- TOP RIGHT CAMERA SWITCH -->
  <div class="top-controls">
    <button class="control-btn" onclick="minimizeCall()">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
    </button>
    <button class="control-btn" onclick="switchCamera()">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
    </button>
  </div>
  
  <!-- Local Video Preview -->
  <video id="localVideo" autoplay playsinline muted></video>

  <!-- CALL INFO -->
  <div class="call-info">
    <img id="callAvatar" class="call-avatar" src="https://i.pravatar.cc/150">
    <div id="callName" class="call-name">Unknown</div>
    <div id="callStatus" class="call-status">Calling...</div>
  </div>

  <!-- VIDEOS -->
  <video id="remoteVideo" autoplay playsinline></video>

  <!-- INCOMING BUTTONS -->
  <div class="call-buttons" id="incomingButtons" style="display:none">
    <button class="call-btn btn-reject" onclick="rejectCall()">❌</button>
    <button class="call-btn btn-accept" onclick="acceptCall()">📞</button>
  </div>

  <!-- WHATSAPP STYLE CONTROLS -->
  <div class="call-controls" id="activeButtons">

    <button onclick="toggleMute()" id="muteBtn">🎤</button>

    <button onclick="toggleSpeaker()" id="speakerBtn">🔊</button>

    <button onclick="toggleCamera()" id="cameraToggleBtn">📷</button>

    <button onclick="endCall()" class="end">❌</button>

  </div>

</div>
`;
app.insertAdjacentHTML("beforeend", callModalHTML);

// Inject styles for the new buttons
const callControlsStyle = document.createElement("style");

document.head.appendChild(callControlsStyle);

const callBannerHTML = `
<div id="activeCallBanner" class="active-call-banner" onclick="maximizeCall()">
  <div class="mini-call-info">
    <span id="miniCallStatus">Call in progress...</span>
    <span id="miniCallTimer"></span>
  </div>
  <div style="font-size: 14px;"></div>
</div>
`;
app.insertAdjacentHTML("beforeend", callBannerHTML);

const callBannerStyle = document.createElement("style");
document.head.appendChild(callBannerStyle);

async function switchCamera() {
  if (!callState.isVideo || !peerConnection) return;

  callState.cameraFacing =
    callState.cameraFacing === "user" ? "environment" : "user";

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: callState.cameraFacing },
    });

    const newTrack = stream.getVideoTracks()[0];

    const sender = peerConnection
      .getSenders()
      .find((s) => s.track?.kind === "video");

    if (sender) {
      await sender.replaceTrack(newTrack);
    }

    // update local stream
    localStream.getVideoTracks().forEach((track) => {
      track.stop();
      localStream.removeTrack(track);
    });

    localStream.addTrack(newTrack);
    document.getElementById("localVideo").srcObject = localStream;
  } catch (err) {
    console.error("Switch camera failed:", err);
  }
}
function updateVideoLayout() {
  const modal = document.getElementById("callModal");
  const localVideo = document.getElementById("localVideo");
  const remoteVideo = document.getElementById("remoteVideo");
  const avatar = document.getElementById("callAvatar");

  // Toggle Video Mode class (for positioning local video PiP)
  const isAnyVideo = callState.isVideo || callState.remoteVideo;
  if (isAnyVideo) {
    modal.classList.add("video-mode");
  } else {
    modal.classList.remove("video-mode");
  }

  // Always keep local video in small window (PiP), even if remote is not present
  localVideo.classList.remove("local-video-full");

  // Explicitly handle visibility based on state
  localVideo.style.display = callState.isVideo ? "block" : "none";
  remoteVideo.style.display = callState.remoteVideo ? "block" : "none";

  // Show avatar only if remote video is OFF
  if (avatar) {
    avatar.style.display = callState.remoteVideo ? "none" : "block";
  }
}

function toggleMute() {
  if (!localStream) return;

  localStream.getAudioTracks().forEach((track) => {
    track.enabled = !track.enabled;
    callState.isMuted = !track.enabled;
  });

  document.getElementById("muteBtn").style.background = callState.isMuted
    ? "red"
    : "rgba(255,255,255,0.2)";
}

async function setSpeaker(enable) {
  const remoteVideo = document.getElementById("remoteVideo");

  callState.speaker = enable;

  const btn = document.getElementById("speakerBtn");
  if (btn) {
    btn.style.background = enable ? "#4facfe" : "rgba(255,255,255,0.2)";
  }

  if (remoteVideo.setSinkId) {
    try {
      await remoteVideo.setSinkId(enable ? "speaker" : "default");
    } catch (e) {
      console.warn("Speaker switch failed:", e);
    }
  }
}

function toggleSpeaker() {
  setSpeaker(!callState.speaker);
}

async function toggleCamera() {
  if (!peerConnection || !localStream) return;

  const btn = document.getElementById("cameraToggleBtn");

  try {
    if (!callState.isVideo) {
      // 🟢 TURN ON CAMERA

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: callState.cameraFacing },
      });

      const videoTrack = stream.getVideoTracks()[0];
      videoTrack.enabled = true;

      // Clean up old video tracks in localStream
      localStream.getVideoTracks().forEach((track) => {
        track.stop();
        localStream.removeTrack(track);
      });
      localStream.addTrack(videoTrack);
      document.getElementById("localVideo").srcObject = localStream;

      // Reuse existing sender if available
      const transceiver = peerConnection
        .getTransceivers()
        .find(
          (t) =>
            t.receiver.track.kind === "video" ||
            (t.sender.track && t.sender.track.kind === "video"),
        );

      if (transceiver && transceiver.sender) {
        await transceiver.sender.replaceTrack(videoTrack);
        transceiver.direction = "sendrecv";
      } else {
        peerConnection.addTrack(videoTrack, localStream);
      }

      // 🔥 RENEGOTIATE
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socket.emit("updateCall", {
        to: callPartnerId,
        signal: offer,
      });

      callState.isVideo = true;
      btn.style.background = "#4facfe";

      updateVideoLayout();
      setSpeaker(true);
    } else {
      // 🔴 TURN OFF CAMERA

      // Stop tracks and remove from localStream
      localStream.getVideoTracks().forEach((track) => {
        track.stop();
        localStream.removeTrack(track);
      });

      document.getElementById("localVideo").srcObject = null;

      // Replace sender track with null (don't remove sender)
      const transceiver = peerConnection
        .getTransceivers()
        .find((t) => t.sender.track && t.sender.track.kind === "video");

      if (transceiver && transceiver.sender) {
        await transceiver.sender.replaceTrack(null);
      }

      // 🔥 RENEGOTIATE
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socket.emit("updateCall", {
        to: callPartnerId,
        signal: offer,
      });

      callState.isVideo = false;
      btn.style.background = "rgba(255,255,255,0.2)";

      updateVideoLayout();

      if (!callState.remoteVideo) {
        setSpeaker(false);
      }
    }

    // 🔁 SYNC STATE
    socket.emit("toggleCamera", {
      to: callPartnerId,
      isVideo: callState.isVideo,
    });
  } catch (err) {
    console.error("Camera toggle error:", err);
    showPopup("Camera error");
  }
}

window.minimizeCall = function () {
  document.getElementById("callModal").style.display = "none";
  document.getElementById("activeCallBanner").style.display = "flex";

  // Sync status text immediately
  const status = document.getElementById("callStatus").textContent;
};

window.maximizeCall = function () {
  document.getElementById("callModal").style.display = "flex";
  document.getElementById("activeCallBanner").style.display = "none";
};

// Handle Incoming Call
socket.on("callUser", ({ from, signal, callType }) => {
  incomingCallData = { from, signal, callType };
  const isCallMuted = localStorage.getItem(`muteCall_${from}`) === "true";

  if (canPlaySounds() && !isCallMuted && !isChatOpen) {
    callSound.currentTime = 0;
    callSound.play().catch(() => {});
  }
  callPartnerId = from;
  currentCallType = callType || "voice";
  isCaller = false;
  callStartTime = null;
  callState.isVideo = false;
  callState.remoteVideo = false; // Don't show blank remote video yet
  updateVideoLayout();
  document.getElementById("activeCallBanner").style.display = "none"; // Ensure banner hidden on new call

  document.getElementById("callModal").style.display = "flex";
  document.getElementById("incomingButtons").style.display = "flex";
  document.getElementById("activeButtons").style.display = "none";
  document.getElementById("callName").textContent = "Friend";
  document.getElementById("callStatus").textContent =
    `Incoming ${currentCallType === "video" ? "Video" : "Voice"} Call...`;
  document.getElementById("callAvatar").src = getAvatarSrc({ id: from });
});

async function acceptCall() {
  document.getElementById("incomingButtons").style.display = "none";
  document.getElementById("activeButtons").style.display = "flex";
  document.getElementById("callStatus").textContent = "Connecting...";
  stopCallSound();
  callAnswered = true;
  callStartTime = Date.now();
  callState.isVideo = currentCallType === "video";
  try {
    // Request video if call type is video
    const constraints =
      currentCallType === "video"
        ? { video: true, audio: true }
        : { audio: true };

    localStream = await navigator.mediaDevices.getUserMedia(constraints);

    if (currentCallType === "video") {
      document.getElementById("localVideo").srcObject = localStream;
    }
    updateVideoLayout();
    setSpeaker(callState.isVideo || callState.remoteVideo);

    createPeerConnection();

    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(incomingCallData.signal),
    );

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socket.emit("answerCall", { signal: answer, to: incomingCallData.from });
    document.getElementById("callStatus").textContent = "0:00";
    startCallTimer();
  } catch (err) {
    console.error("Error accepting call:", err);
    endCall();
  }
}
function stopCallSound() {
  callSound.pause();
  callSound.currentTime = 0;
}
function rejectCall() {
  socket.emit("endCall", {
    to: incomingCallData.from,
    answered: false,
  });
  stopCallSound();
  closeCallUI();
}

function endCall() {
  if (!callPartnerId) return;

  let duration = null;

  if (callAnswered && callStartTime) {
    const seconds = Math.floor((Date.now() - callStartTime) / 1000);

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    duration = `${mins}m ${secs}s`;
  }

  socket.emit("endCall", {
    to: callPartnerId,
    duration,
    answered: callAnswered,
  });
  closeCallUI();
}

function closeCallUI() {
  if (callTimerInterval) {
    clearInterval(callTimerInterval);
    callTimerInterval = null;
  }
  stopCallSound();

  document.getElementById("callModal").style.display = "none";
  document.getElementById("activeCallBanner").style.display = "none";

  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
  }

  if (peerConnection) {
    peerConnection.close();
  }

  document.getElementById("remoteVideo").srcObject = null;
  document.getElementById("localVideo").srcObject = null;

  localStream = null;
  peerConnection = null;
  callPartnerId = null;

  // 🔥 RESET STATE
  callState = {
    isVideo: false,
    isMuted: false,
    speaker: false,
    cameraFacing: "user",
    remoteVideo: false,
  };

  callAnswered = false;
  isCaller = false;
}

// ================= CAMERA & MEDIA PREVIEW =================

const cameraBtn = document.getElementById("cameraBtn");
const cameraView = document.getElementById("cameraView");
const cameraVideoFeed = document.getElementById("cameraVideoFeed");
const cameraCanvas = document.getElementById("cameraCanvas");
const capturePhotoBtn = document.getElementById("capturePhotoBtn");
const closeCameraBtn = document.getElementById("closeCameraBtn");
const mediaToSendPreview = document.getElementById("mediaToSendPreview");
const startRecordBtn = document.getElementById("startRecordBtn");
const stopRecordBtn = document.getElementById("stopRecordBtn");

let cameraStream = null;
let capturedMedia = {
  blob: null,
  type: null, // 'image' or 'video'
  name: null,
};
let cameraMediaRecorder;
let cameraRecordedChunks = [];

// Open Camera
if (cameraBtn) {
  cameraBtn.onclick = async () => {
    mediaMenu.classList.remove("show");
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: true,
      });
      cameraVideoFeed.srcObject = cameraStream;
      cameraView.style.display = "block";
    } catch (err) {
      console.error("Error accessing camera:", err);
      try {
        // Fallback to any video source if environment fails
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        cameraVideoFeed.srcObject = cameraStream;
        cameraView.style.display = "block";
      } catch (e) {
        showPopup("Could not access camera. Please check permissions.");
      }
    }
  };
}

// Close Camera
if (closeCameraBtn) {
  closeCameraBtn.onclick = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }
    if (cameraMediaRecorder && cameraMediaRecorder.state === "recording") {
      cameraMediaRecorder.stop();
    }
    cameraStream = null;
    cameraView.style.display = "none";
    startRecordBtn.style.display = "inline-block";
    stopRecordBtn.style.display = "none";
  };
}

// Capture Photo
if (capturePhotoBtn) {
  capturePhotoBtn.onclick = () => {
    if (!cameraStream) return;
    cameraCanvas.width = cameraVideoFeed.videoWidth;
    cameraCanvas.height = cameraVideoFeed.videoHeight;
    const context = cameraCanvas.getContext("2d");
    context.drawImage(
      cameraVideoFeed,
      0,
      0,
      cameraCanvas.width,
      cameraCanvas.height,
    );

    cameraCanvas.toBlob((blob) => {
      capturedMedia.blob = blob;
      capturedMedia.type = "image";
      showMediaPreview(blob, "image");
      closeCameraBtn.onclick(); // Close camera after capture
    }, "image/jpeg");
  };
}

// Start Recording Video
if (startRecordBtn) {
  startRecordBtn.onclick = () => {
    if (!cameraStream) return;
    cameraRecordedChunks = [];
    cameraMediaRecorder = new MediaRecorder(cameraStream);

    cameraMediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        cameraRecordedChunks.push(e.data);
      }
    };

    cameraMediaRecorder.onstop = () => {
      const blob = new Blob(cameraRecordedChunks, { type: "video/webm" });
      capturedMedia.blob = blob;
      capturedMedia.type = "video";
      showMediaPreview(blob, "video");
      closeCameraBtn.onclick(); // Close camera after capture
    };

    cameraMediaRecorder.start();
    startRecordBtn.style.display = "none";
    stopRecordBtn.style.display = "inline-block";
  };
}

// Stop Recording Video
if (stopRecordBtn) {
  stopRecordBtn.onclick = () => {
    if (cameraMediaRecorder && cameraMediaRecorder.state === "recording") {
      cameraMediaRecorder.stop();
    }
  };
}

// Show preview in chat input
function showMediaPreview(blob, type) {
  const url = URL.createObjectURL(blob);
  let previewHtml = "";
  if (type === "image") {
    previewHtml = `<img src="${url}" style="max-height: 50px; border-radius: 5px;">`;
  } else if (type === "video") {
    previewHtml = `<video src="${url}" style="max-height: 50px; border-radius: 5px;" autoplay muted loop controls></video>`;
  } else if (type === "audio") {
    previewHtml = `<audio src="${url}" controls style="height: 40px; width: 220px;"></audio>`;
  } else if (type === "document") {
    previewHtml = `<div style="padding: 10px; background: #444; border-radius: 5px; font-size: 12px; color: white; display: flex; align-items: center; gap: 8px;">
                     <i class="fa-solid fa-file"></i>
                     <span style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${capturedMedia.name}</span>
                   </div>`;
  }

  mediaToSendPreview.innerHTML = `
        ${previewHtml}
        <button id="removeMediaToSend" style="position: absolute; top: 0px; right: 0px; background: rgba(0,0,0,0.7); color: white; border-radius: 50%; width: 20px; height: 20px; border: none; cursor: pointer; line-height: 20px; text-align: center; font-size: 14px;">&times;</button>
    `;
  mediaToSendPreview.style.display = "block";

  document.getElementById("removeMediaToSend").onclick = () => {
    capturedMedia.blob = null;
    capturedMedia.type = null;
    mediaToSendPreview.style.display = "none";
    mediaToSendPreview.innerHTML = "";
    URL.revokeObjectURL(url);
  };
}

socket.on("callAccepted", (signal) => {
  document.getElementById("callStatus").textContent = "0:00";
  peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
  callAnswered = true;
  callStartTime = Date.now();
  startCallTimer();
});

socket.on("iceCandidate", (candidate) => {
  if (peerConnection) {
    peerConnection
      .addIceCandidate(new RTCIceCandidate(candidate))
      .catch((e) => {
        console.warn("ICE candidate failed, retrying in 500ms...", e);
        setTimeout(() => {
          if (peerConnection) {
            peerConnection
              .addIceCandidate(new RTCIceCandidate(candidate))
              .catch((e2) => console.error("ICE candidate retry failed:", e2));
          }
        }, 500);
      });
  }
});

socket.on("callEnded", () => {
  closeCallUI();
});

socket.on("updateCall", async ({ from, signal }) => {
  if (callPartnerId == from && peerConnection) {
    try {
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(signal),
      );
      if (signal.type === "offer") {
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit("callUpdated", { to: from, signal: answer });
      }
    } catch (e) {
      console.error("Error updating call:", e);
    }
  }
});

socket.on("callUpdated", async ({ from, signal }) => {
  if (callPartnerId == from && peerConnection) {
    try {
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(signal),
      );
    } catch (e) {
      console.error("Error setting remote desc:", e);
    }
  }
});

socket.on("cameraToggled", ({ from, isVideo }) => {
  if (callPartnerId !== from) return;

  callState.remoteVideo = isVideo;

  const remoteVideo = document.getElementById("remoteVideo");

  // 🔥 FORCE STREAM REFRESH (CRITICAL FIX)
  if (remoteVideo.srcObject) {
    const oldStream = remoteVideo.srcObject;

    const newStream = new MediaStream();

    oldStream.getTracks().forEach((track) => {
      newStream.addTrack(track);
    });

    remoteVideo.srcObject = newStream;
  }

  updateVideoLayout();

  if (isVideo) {
    remoteVideo.play().catch(() => {});
    setSpeaker(true);
  } else if (!callState.isVideo) {
    setSpeaker(false);
  }
});

// ================= MEDIA, EMOJI & STICKERS LOGIC =================

// 1. Media Menu Toggle
const plusBtn = document.getElementById("plusBtn");
const mediaMenu = document.getElementById("mediaMenu");

plusBtn.onclick = () => {
  mediaMenu.classList.toggle("show");
  // Close other pickers
  document.getElementById("emojiPicker").style.display = "none";
  document.getElementById("stickerPicker").style.display = "none";
};

// 2. Handle Media Buttons (Image/Video)
const chatFileInput = document.getElementById("chatFileInput");
const mediaBtns = document.querySelectorAll(".mediaBtn");

// Document Button
document.getElementById("documentbtn").onclick = () => {
  chatFileInput.accept = "*/*"; // Allow any file
  chatFileInput.click();
  mediaMenu.classList.remove("show");
};

// Image Button
mediaBtns[1].onclick = () => {
  chatFileInput.accept = "image/*";
  chatFileInput.click();
  mediaMenu.classList.remove("show");
};

// Video Button
mediaBtns[2].onclick = () => {
  chatFileInput.accept = "video/*";
  chatFileInput.click();
  mediaMenu.classList.remove("show");
};

// File Input Change Handler
chatFileInput.onchange = (e) => {
  const file = e.target.files[0];
  if (!file || !currentFriendId) return;

  // Limit file size to 10MB to prevent browser freezing
  if (file.size > 10 * 1024 * 1024) {
    showPopup("Please select a file under 10MB.");
    return;
  }

  const isDocumentMode = chatFileInput.accept === "*/*";
  let type;

  if (isDocumentMode) {
    type = "document";
  } else {
    type = file.type.startsWith("video") ? "video" : "image";
  }

  capturedMedia.blob = file;
  capturedMedia.type = type;
  capturedMedia.name = file.name;
  showMediaPreview(file, type);

  // Clear file input so the same file can be selected again
  e.target.value = "";
};

// 3. Emojis
const emojis = [
  "😀",
  "😂",
  "😍",
  "🥺",
  "😎",
  "😭",
  "😡",
  "👍",
  "👎",
  "🎉",
  "🔥",
  "❤️",
  "👋",
  "🤔",
  "🤣",
  "💩",
];
const emojiBtn = document.getElementById("emojiBtn");
const emojiPicker = document.getElementById("emojiPicker");

emojiBtn.onclick = () => {
  emojiPicker.style.display =
    emojiPicker.style.display === "flex" ? "none" : "flex";
  document.getElementById("stickerPicker").style.display = "none";
  mediaMenu.classList.remove("show");
};

// Populate Emojis
emojis.forEach((emoji) => {
  const span = document.createElement("span");
  span.className = "emoji-item";
  span.textContent = emoji;
  span.onclick = () => {
    msgInput.value += emoji;
    msgInput.focus();
  };
  emojiPicker.appendChild(span);
});

// 4. Stickers
// const stickers = [
//   "https://img.icons8.com/emoji/96/000000/star-struck.png",
//   "https://img.icons8.com/emoji/96/000000/partying-face.png",
//   "https://img.icons8.com/emoji/96/000000/zany-face.png",
//   "https://img.icons8.com/emoji/96/000000/frowning-face.png",
//   "https://img.icons8.com/emoji/96/000000/pouting-face.png",
//   "https://img.icons8.com/emoji/96/000000/clown-face.png",
//   "https://img.icons8.com/emoji/96/000000/ghost.png",
//   "https://img.icons8.com/emoji/96/000000/alien.png",
//   "https://img.icons8.com/emoji/96/000000/pile-of-poo.png",
//   "https://img.icons8.com/emoji/96/000000/thumbs-up.png",
// ];

// const stickerBtn = document.getElementById("stickerBtn");
// const stickerPicker = document.getElementById("stickerPicker");

// stickerBtn.onclick = () => {
//   stickerPicker.style.display =
//     stickerPicker.style.display === "flex" ? "none" : "flex";
//   document.getElementById("emojiPicker").style.display = "none";
//   mediaMenu.classList.remove("show");
// };

// // Populate Stickers
// stickers.forEach((url) => {
//   const img = document.createElement("img");
//   img.className = "sticker-item";
//   img.src = url;
//   img.onclick = () => {
//     if (!currentFriendId) return;

//     socket.emit(
//       "sendMessage",
//       {
//         to: currentFriendId,
//         message: url,
//         type: "sticker",
//       },
//       (res) => {
//         if (!res || !res.success) return;
//         const msg = res.data;
//         appendMessage(
//           userId,
//           msg.message,
//           msg.msgId,
//           msg.status,
//           msg.seenAt,
//           "sticker",
//           msg.timestamp,
//         );
//         messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll to bottom on send
//         stickerPicker.style.display = "none";
//       },
//     );
//   };
//   stickerPicker.appendChild(img);
// });

// ================= AUTO FULL SCREEN =================
// function enableFullScreen() {
//   const elem = document.documentElement;
//   if (elem.requestFullscreen) {
//     elem.requestFullscreen().catch((err) => console.log(err));
//   } else if (elem.webkitRequestFullscreen) {
//     elem.webkitRequestFullscreen();
//   } else if (elem.msRequestFullscreen) {
//     elem.msRequestFullscreen();
//   }
// }
// // enableFullScreen();
// document.addEventListener("click", enableFullScreen, { once: true });
// document.addEventListener("touchstart", enableFullScreen, { once: true });

// Close pickers when clicking elsewhere (optional simple implementation)
document.getElementById("messages").onclick = () => {
  emojiPicker.style.display = "none";
  stickerPicker.style.display = "none";
  mediaMenu.classList.remove("show");
};

loadFriends();

// ================= SCREENSHOT DETECTION =================
// Note: Real-time screenshot detection is limited to keyboard shortcuts on Desktop.
// Browsers do not support detection on Mobile for security/privacy reasons.
window.addEventListener("keyup", (e) => {
  // Detect the Print Screen key (Key code 44)
  if (e.key === "PrintScreen" || e.keyCode === 44) {
    sendScreenshotNotification();
  }
});

window.addEventListener("keydown", (e) => {
  // Detect common shortcuts: Win+Shift+S (Windows), Cmd+Shift+4 or Cmd+Shift+3 (Mac)
  const isScreenshotKeys =
    (e.ctrlKey || e.metaKey) &&
    e.shiftKey &&
    (e.key === "s" || e.key === "S" || e.key === "4" || e.key === "3");
  if (isScreenshotKeys) {
    sendScreenshotNotification();
  }
});

function sendScreenshotNotification() {
  if (!currentFriendId) return;

  socket.emit("screenshotTaken", { to: currentFriendId });
}

// ================= LOAD PROFILE SCRIPT =================
const profileScript = document.createElement("script");
profileScript.src = "/profile.js";
document.body.appendChild(profileScript);
