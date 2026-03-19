const username = localStorage.getItem("username");
if (!username) window.location.href = "/index.html";

const userId = localStorage.getItem("userId");
if (!userId) window.location.href = "/index.html";
const app = document.getElementById("app");

if (!app) {
  throw new Error("App container not found!");
}
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
    margin-bottom: 24px !important; /* Extra space for reactions hanging at bottom */
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
function setupThemeUI() {
  const themeModalHTML = `
        <div id="themeOptionsPopup" class="theme-popup">
            <div class="theme-popup-content">
                <div class="theme-option" id="setWallpaperBtn">Set Wallpaper</div>
                <div class="theme-option" id="setThemeBtn">Set Theme</div>
                <div class="theme-option" id="cancelThemeBtn">Cancel</div>
            </div>
        </div>

        <div id="themeSelectionModal" class="theme-popup">
            <div class="theme-popup-content">
                <h3>Choose a Theme</h3>
                <div class="theme-previews">
                    <div class="theme-preview" data-theme="theme-1">
                        <div class="bg"></div>
                        <div class="msg-box"></div>
                        <span>Default</span>
                    </div>
                    <div class="theme-preview" data-theme="theme-2">
                        <div class="bg"></div>
                        <div class="msg-box"></div>
                        <span>Forest</span>
                    </div>
                    <div class="theme-preview" data-theme="theme-3">
                        <div class="bg"></div>
                        <div class="msg-box"></div>
                        <span>Dusk</span>
                    </div>
                    <div class="theme-preview" data-theme="theme-4">
                        <div class="bg"></div>
                        <div class="msg-box"></div>
                        <span>Ocean</span>
                    </div>
                    <div class="theme-preview" data-theme="theme-5">
                        <div class="bg"></div>
                        <div class="msg-box"></div>
                        <span>Pastel</span>
                    </div>
                </div>
                 <div class="theme-option" id="cancelThemeSelectionBtn">Cancel</div>
            </div>
        </div>
        <input type="file" id="wallpaperInput" accept="image/*" style="display: none;" />
    `;
  app.insertAdjacentHTML("beforeend", themeModalHTML);

  const themeStyles = `
        /* Popups */
        @keyframes fadeInScaleUp {
            from {
                opacity: 0;
                transform: scale(0.95) translateY(10px);
            }
            to {
                opacity: 1;
                transform: scale(1) translateY(0);
            }
        }

        .theme-popup {
            display: none;
            position: absolute;
            z-index: 1001;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
            background-color: rgba(0,0,0,0.6);
            justify-content: center;
            align-items: center;
        }
        .theme-popup-content {
            background-color: #2c2c2e;
            background: rgba(35, 35, 38, 0.8);
            backdrop-filter: blur(18px);
            -webkit-backdrop-filter: blur(18px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 12px 35px rgba(0, 0, 0, 0.3);
            padding: 20px;
            border-radius: 10px;
            min-width: 250px;
            border-radius: 18px;
            min-width: 280px;
            text-align: center;
            color: white;
            color: #f0f0f0;
            animation: fadeInScaleUp 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        .theme-option {
            padding: 12px;
            padding: 15px;
            cursor: pointer;
            border-bottom: 1px solid #444;
            border-radius: 12px;
            transition: background-color 0.2s ease;
            font-weight: 500;
            margin: 8px 0;
            border-bottom: none;
        }
        .theme-option:last-child {
            border-bottom: none;
        }
        .theme-option:hover {
            background-color: #3a3a3c;
            background-color: rgba(255, 255, 255, 0.07);
        }
        #cancelThemeBtn, #cancelThemeSelectionBtn {
            color: #ff7b7b;
            font-weight: 600;
        }
        #cancelThemeBtn:hover, #cancelThemeSelectionBtn:hover {
            background-color: rgba(255, 123, 123, 0.1);
        }

        /* Theme Previews */
        .theme-previews {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        .theme-preview {
            cursor: pointer;
            width: 80px;
        }
        .theme-preview .bg {
            width: 80px;
            height: 120px;
            border-radius: 8px;
            border: 2px solid #555;
            position: relative;
            overflow: hidden;
        }
        .theme-preview .msg-box {
            position: absolute;
            bottom: 10px;
            left: 10px;
            width: 50px;
            height: 20px;
            border-radius: 5px;
        }
        .theme-preview span {
            margin-top: 5px;
            display: block;
            font-size: 14px;
        }

        /* --- Theme Definitions --- */
        #chatScreen.theme-1 { background-color: #1c1c1e; }
        .theme-preview[data-theme="theme-1"] .bg { background-color: #1c1c1e; }

        #chatScreen.theme-2 { background: linear-gradient(to bottom, #2a5a3e, #1e3c2c); }
        #chatScreen.theme-2 .message.sent { background-color: #3d8c5a; }
        #chatScreen.theme-2 .message.received { background-color: #2c6b45; }
        .theme-preview[data-theme="theme-2"] .bg { background: linear-gradient(to bottom, #2a5a3e, #1e3c2c); }

        #chatScreen.theme-3 { background: linear-gradient(to bottom, #4a3b6c, #2c2345); }
        #chatScreen.theme-3 .message.sent { background-color: #6a5299; }
        #chatScreen.theme-3 .message.received { background-color: #523f7d; }
        .theme-preview[data-theme="theme-3"] .bg { background: linear-gradient(to bottom, #4a3b6c, #2c2345); }

        #chatScreen.theme-4 { background: linear-gradient(to bottom, #3b5b8c, #233c61); }
        #chatScreen.theme-4 .message.sent { background-color: #527ac2; }
        #chatScreen.theme-4 .message.received { background-color: #4166a3; }
        .theme-preview[data-theme="theme-4"] .bg { background: linear-gradient(to bottom, #3b5b8c, #233c61); }

        #chatScreen.theme-5 { background: linear-gradient(to bottom, #f2d7d9, #e1b3b6); color: #5c3739; }
        #chatScreen.theme-5 .message.sent { background-color: #ffffff; color: #5c3739; }
        #chatScreen.theme-5 .message.received { background-color: #fce4e6; color: #5c3739; }
        #chatScreen.theme-5 .message .message-sender { color: #8c5e60; }
        #chatScreen.theme-5 #msgInput {  color: #ffffff; border-color: #e1b3b6; }
        #chatScreen.theme-5 #msgInput::placeholder { color: #a08284; }
        .theme-preview[data-theme="theme-5"] .bg { background: linear-gradient(to bottom, #f2d7d9, #e1b3b6); }
    `;

  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = themeStyles;
  document.head.appendChild(styleSheet);
}

// ================= USER PROFILE & MEDIA MODAL =================
const userProfileModalHTML = `
<div id="userProfileModal" class="user-profile-modal">
    <div class="user-profile-content">
        <div class="user-profile-header">
            <button class="close-profile-btn" onclick="document.getElementById('userProfileModal').style.display='none'">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
        
        <div class="user-info-section">
            <img id="profileModalAvatar" src="" class="profile-modal-avatar">
            <h2 id="profileModalName">User Name</h2>
            <p id="profileModalStatus" class="profile-status">Offline</p>
            <div class="friendship-days">
               <span id="friendshipDaysCount">0</span> Days of Friendship
            </div>
        </div>

        <div class="shared-media-section">
            <h3>Shared Media</h3>
            <div id="sharedMediaGrid" class="media-grid">
                <!-- Media items will be injected here -->
            </div>
        </div>
    </div>
</div>
`;
app.insertAdjacentHTML("beforeend", userProfileModalHTML);

function openUserProfile() {
  if (!currentFriendId) return;

  const modal = document.getElementById("userProfileModal");
  const avatar = document.getElementById("profileModalAvatar");
  const name = document.getElementById("profileModalName");
  const status = document.getElementById("profileModalStatus");
  const daysCount = document.getElementById("friendshipDaysCount");
  const grid = document.getElementById("sharedMediaGrid");

  modal.style.display = "flex";
  avatar.src = `https://i.pravatar.cc/150?img=${(currentFriendId % 70) + 1}`;
  name.textContent = currentFriendName;

  // Get live status from existing chat header or fetch fresh
  updateProfileStatus(currentFriendId);

  // Fetch shared info (Days + Media)
  loadSharedInfo(currentFriendId);
}

async function updateProfileStatus(friendId) {
  const res = await fetch(`/getUserStatus/${friendId}`);
  const data = await res.json();
  const statusEl = document.getElementById("profileModalStatus");

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
  grid.innerHTML = "";

  if (data.media.length === 0) {
    grid.innerHTML =
      "<p style='color:#777; width:100%; text-align:center;'>No shared media</p>";
    return;
  }

  data.media.forEach((msg) => {
    const item = document.createElement("div");
    item.className = "shared-media-item";
    item.dataset.id = msg.id;

    if (msg.type === "image") {
      item.innerHTML = `<img src="${msg.message}" loading="lazy">`;
    } else if (msg.type === "video") {
      item.innerHTML = `<video src="${msg.message}"></video><div class="play-icon">▶</div>`;
    } else if (msg.type === "audio") {
      item.innerHTML = `<div class="audio-icon">🎤</div>`;
    }

    let longPressTimer;
    let isLongPress = false;

    const showDeleteOption = () => {
      isLongPress = true;
      selectedMsgId = msg.id;

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
      if (!isLongPress) window.open(msg.message);
    };

    grid.appendChild(item);
  });
}

setupThemeUI();

// ================= SOCKET =================
let activeChat = null;

const socket = io();
socket.on("connect", () => {
  socket.emit("register", userId);
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
    body: JSON.stringify({ name }),
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
      buttonHtml = '<span class="pending-label">Request Sent</span>';
    } else {
      buttonHtml = `<button onclick="sendRequest(${user.id})">Send Request</button>`;
    }

    div.innerHTML = `
      <span>${user.name}</span>
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

    div.innerHTML = `
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
let currentFriendId = null;

// Inject Copy Option into Menu
if (messageMenu && !messageMenu.querySelector('[data-action="copy"]')) {
  const copyBtn = document.createElement("div");
  copyBtn.className = "menu-item";
  copyBtn.dataset.action = "copy";
  copyBtn.innerText = "Copy";
  messageMenu.appendChild(copyBtn);
}

let currentFriendName = null;
let unreadCounts = {};
let typingUsers = new Map();
let typingTimers = new Map();
const messagesContainer = document.getElementById("messages");
const renderedMessages = new Set();

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

const micBtn = document.getElementById("micBtn");

// ================= THEME/WALLPAPER LOGIC =================
const themeOptionsPopup = document.getElementById("themeOptionsPopup");
const themeSelectionModal = document.getElementById("themeSelectionModal");
const wallpaperInput = document.getElementById("wallpaperInput");
let themeLongPressTimer;

messagesContainer.addEventListener("mousedown", (e) => {
  if (e.target === messagesContainer) {
    // Check if click is on the container itself
    themeLongPressTimer = setTimeout(() => {
      if (currentFriendId) themeOptionsPopup.style.display = "flex";
    }, 500);
  }
});
messagesContainer.addEventListener("mouseup", () => {
  clearTimeout(themeLongPressTimer);
});
messagesContainer.addEventListener("touchstart", (e) => {
  if (e.target === messagesContainer) {
    themeLongPressTimer = setTimeout(() => {
      if (currentFriendId) themeOptionsPopup.style.display = "flex";
    }, 500);
  }
});
messagesContainer.addEventListener("touchend", () => {
  clearTimeout(themeLongPressTimer);
});

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
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // 🎧 AUDIO ANALYSER (real waveform feel)
    const audioContext = new (
      window.AudioContext || window.webkitAudioContext
    )();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

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
    mediaRecorder = new MediaRecorder(stream);
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

  micBtn.classList.remove("recording");
  recordingIndicator.style.display = "none";
}
// 🖱️ Desktop hold
micBtn.addEventListener("mousedown", startRecording);

// 📱 Mobile hold
micBtn.addEventListener("touchstart", startRecording);

// 🖱️ Release anywhere
document.addEventListener("mouseup", stopRecording);

// 📱 Touch release anywhere
document.addEventListener("touchend", stopRecording);

// 🔁 Tap again to stop (fallback)
micBtn.addEventListener("click", () => {
  if (isRecording) {
    stopRecording();
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
  const isCurrentChat =
    currentFriendId &&
    (data.from == currentFriendId || data.to == currentFriendId);

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

  const fromId = data.from == userId ? data.to : data.from;

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
  if (msgId) renderedMessages.add(msgId);

  const div = document.createElement("div");
  const isMe = senderId == userId;
  if (msgId) {
    div.setAttribute("data-id", msgId);
  }
  div.setAttribute("data-sender", senderId);
  div.className = isMe ? "message sent" : "message received";

  // ✅ HANDLE CALL LOGS
  if (type === "call_log") {
    div.classList.add("call-log");
    const timeStr = timestamp
      ? new Date(timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
    let text = message;

    // If I sent "Missed call", it means I called and they didn't answer -> "No Answer"
    if (isMe && message === "Missed call") text = "No answer";
    else if (!isMe && message === "Missed call") text = "Missed call";

    div.innerHTML = `📞 ${text} <span class="call-log-time">${timeStr}</span>`;
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
      ? `<div class="media-caption">${sanitizedCaption}</div>`
      : "";

    if (type === "image") {
      contentHtml = `
        <div class="media-wrapper">
          <img src="${message}" class="chat-media" onclick="window.open(this.src)">
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
    } else if (type === "sticker") {
      contentHtml = `<img src="${message}" class="chat-sticker">`;
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

      // hide "delete for everyone" if not my msg
      if (parseInt(selectedMsgSender) !== parseInt(userId)) {
        document.getElementById("deleteEveryone").style.display = "none";
      } else {
        document.getElementById("deleteEveryone").style.display = "block";
      }
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
const deleteModal = document.getElementById("deleteModal");
window.addEventListener("click", (e) => {
  if (e.target === deleteModal) {
    deleteModal.style.display = "none";
  }
});

document.getElementById("deleteMe").onclick = () => {
  socket.emit("deleteMessage", {
    msgId: selectedMsgId,
    type: "me",
    to: currentFriendId,
  });

  deleteModal.style.display = "none";
};

document.getElementById("deleteEveryone").onclick = () => {
  socket.emit("deleteMessage", {
    msgId: selectedMsgId,
    type: "everyone",
    to: currentFriendId,
  });

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

  const editBtn = messageMenu.querySelector('[data-action="edit"]');
  if (editBtn) {
    editBtn.style.display = messageEl.classList.contains("call-log") ? "none" : "";
  }

  messageMenu.style.display = "flex";
  messageMenu.style.position = "absolute";
  messageMenu.style.zIndex = "1000";

  const rect = messageEl.getBoundingClientRect();
  const menuWidth = messageMenu.offsetWidth;
  const menuHeight = messageMenu.offsetHeight;

  let left = rect.left + rect.width / 2 - menuWidth / 2;
  let top = rect.top - menuHeight - 10; // Position above the message

  // Prevent horizontal overflow
  if (left < 10) left = 10;
  if (left + menuWidth > window.innerWidth - 10)
    left = window.innerWidth - menuWidth - 10;

  // If menu goes off-top, flip to bottom
  if (top < 10) top = rect.bottom + 10;

  messageMenu.style.left = left + "px";
  messageMenu.style.top = top + "px";
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
          type: capturedMedia.type, // 'image' or 'video'
          caption: text, // Send the raw text as caption
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
      days.innerHTML = "💬";
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

    item.innerHTML = `
      <img src="https://i.pravatar.cc/100?img=${(friend.id % 70) + 1}">
      <div class="chat-info">
        <div class="chat-name">${friend.name}</div>
        <div class="chat-msg">${friend.lastMessage || "Click to chat"}</div>
      </div>
      <div class="chat-days">💬</div>
    `;

    item.onclick = () => openChat(friend.id, friend.name);
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

async function openChat(friendId, friendName) {
  closeAllModals();
  scrollToBottomBtn.classList.remove("show"); // Ensure button is hidden on open
  currentFriendId = friendId;
  currentFriendName = friendName;
  activeChat = friendId;
  delete unreadCounts[friendId];
  updateFriendList();

  // ✅ Update Header with Name and Status Container
  const chatNameEl = document.getElementById("chatName");
  const headerHTML = `
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
    <div class="chat-actions">
      <button class="chat-action-btn" onclick="startVoiceCall('${friendId}', '${friendName}')">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
      </button>
      <button class="chat-action-btn" onclick="startVideoCall('${friendId}', '${friendName}')">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
      </button>
    </div>
  `;

  chatNameEl.innerHTML = headerHTML;

  // ✅ Make header clickable for profile view
  const headerInfo = chatNameEl.querySelector(".chat-header-info");
  if (headerInfo) {
    headerInfo.style.cursor = "pointer";
    headerInfo.onclick = openUserProfile;
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

  socket.emit("markAllSeen", {
    withUser: friendId,
  });

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

  const res = await fetch(`/getUserStatus/${friendId}`);
  const data = await res.json();

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
      statusEl.textContent = "Online";
      statusEl.style.color = "#00ff55";
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
  }
});

socket.on("friendLeftChat", ({ friendId }) => {
  if (currentFriendId == friendId) {
    document.getElementById("hangingCharacter")?.classList.remove("show");
  }
});

socket.on("friendStatusInChat", ({ isHere }) => {
  if (isHere) {
    document.getElementById("hangingCharacter")?.classList.add("show");
  }
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
  document.getElementById("callAvatar").src =
    `https://i.pravatar.cc/150?img=${(friendId % 70) + 1}`;

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
  document.getElementById("callAvatar").src =
    `https://i.pravatar.cc/150?img=${(friendId % 70) + 1}`;

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
  document.getElementById("callAvatar").src =
    `https://i.pravatar.cc/150?img=${(from % 70) + 1}`;
});

async function acceptCall() {
  document.getElementById("incomingButtons").style.display = "none";
  document.getElementById("activeButtons").style.display = "flex";
  document.getElementById("callStatus").textContent = "Connecting...";
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

function rejectCall() {
  socket.emit("endCall", {
    to: incomingCallData.from,
    answered: false,
  });
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

// Image Button
mediaBtns[0].onclick = () => {
  chatFileInput.accept = "image/*";
  chatFileInput.click();
  mediaMenu.classList.remove("show");
};

// Video Button
mediaBtns[1].onclick = () => {
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

  // Instead of sending, set up for preview
  const type = file.type.startsWith("video") ? "video" : "image";
  capturedMedia.blob = file;
  capturedMedia.type = type;
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
const stickers = [
  "https://img.icons8.com/emoji/96/000000/star-struck.png",
  "https://img.icons8.com/emoji/96/000000/partying-face.png",
  "https://img.icons8.com/emoji/96/000000/zany-face.png",
  "https://img.icons8.com/emoji/96/000000/frowning-face.png",
  "https://img.icons8.com/emoji/96/000000/pouting-face.png",
  "https://img.icons8.com/emoji/96/000000/clown-face.png",
  "https://img.icons8.com/emoji/96/000000/ghost.png",
  "https://img.icons8.com/emoji/96/000000/alien.png",
  "https://img.icons8.com/emoji/96/000000/pile-of-poo.png",
  "https://img.icons8.com/emoji/96/000000/thumbs-up.png",
];

const stickerBtn = document.getElementById("stickerBtn");
const stickerPicker = document.getElementById("stickerPicker");

stickerBtn.onclick = () => {
  stickerPicker.style.display =
    stickerPicker.style.display === "flex" ? "none" : "flex";
  document.getElementById("emojiPicker").style.display = "none";
  mediaMenu.classList.remove("show");
};

// Populate Stickers
stickers.forEach((url) => {
  const img = document.createElement("img");
  img.className = "sticker-item";
  img.src = url;
  img.onclick = () => {
    if (!currentFriendId) return;

    socket.emit(
      "sendMessage",
      {
        to: currentFriendId,
        message: url,
        type: "sticker",
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
          "sticker",
          msg.timestamp,
        );
        messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll to bottom on send
        stickerPicker.style.display = "none";
      },
    );
  };
  stickerPicker.appendChild(img);
});

// Close pickers when clicking elsewhere (optional simple implementation)
document.getElementById("messages").onclick = () => {
  emojiPicker.style.display = "none";
  stickerPicker.style.display = "none";
  mediaMenu.classList.remove("show");
};

loadFriends();
