async function setupMyProfile() {
  const userId = localStorage.getItem("userId");
  if (!userId) return;

  const style = document.createElement("style");

  document.head.appendChild(style);

  const modalHTML = `
    <div id="myProfileModal" class="user-profile-modal" style="display: none;">
        <div class="user-profile-content">
            <div class="user-profile-header">
                <button class="close-profile-btn" id="closeMyProfileBtn" style="position:absolute; right:2; top:15px; z-index:100; background:rgba(0,0,0,0.5);">
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            
            <div class="profile-header-visual">
                <div class="cover-photo-container" onclick="document.getElementById('coverUpload').click()">
                    <img id="coverPreview" src="https://images.unsplash.com/photo-1557683316-973673baf926?w=800">
                    <input type="file" id="coverUpload" hidden accept="image/*">
                </div>
                <div class="profile-avatar-wrapper">
                    <img id="myAvatarPreview" src="https://i.pravatar.cc/150" onclick="document.getElementById('avatarUpload').click()">
                    <div class="status-indicator"></div>
                    <input type="file" id="avatarUpload" hidden accept="image/*">
                </div>
            </div>

            <div class="profile-main-info">
                <div class="profile-name-row">
                    <div>
                        <h2 id="dispName" style="font-size: 22px;">Loading...</h2>
                        <span id="dispHandle" style="color: #888; font-size: 14px;">@user</span>
                    </div>
                    <button class="action-btn-outline" onclick="openEditProfile()">Edit Profile</button>
                </div>
           

                <div class="profile-bio" id="dispBio">Tell the world about yourself...</div>
                <div class="profile-city" id="dispCity" style="font-size: 13px; color: #aaa; margin-bottom: 10px;"><i class="fa-solid fa-location-dot"></i> <span id="dispCityText">Add city</span></div>
                <div class="profile-links"><i class="fa-solid fa-link"></i> <span id="dispLink">Add website</span></div>
            </div>

      <div class="profile-stats-bar">

    <div class="stat-box">
        <span class="stat-value" id="statFriends">0</span>
        <span class="stat-label">Friends</span>
    </div>

    <div class="stat-box">
        <span class="stat-value" id="statScore">0</span>
        <span class="stat-label">Score</span>
    </div>

    <div class="stat-box">
        <span class="stat-value" id="statPosts">0</span>
        <span class="stat-label">Posts</span>
    </div>

    <div class="stat-box">
        <span class="stat-value" id="statLevel">1</span>
        <span class="stat-label">Level</span>
    </div>

    <!-- 📅 Personal Info -->
    <div class="stat-box info">
        <span class="stat-value" id="statBirthday">--</span>
        <span class="stat-label">Birthday</span>
    </div>

</div>

            <div style="padding: 10px 20px; width:100%;">
                <h3 style="margin-bottom: 10px; font-size: 16px; border-left: 3px solid var(--profile-accent); padding-left: 10px;">Settings</h3>
              <div class="settings-group">

  <!-- 🔐 Privacy Controls -->
  <div class="settings-title">Privacy</div>
 
  <div class="settings-item">
    <span>Active Status</span>
    <input type="checkbox" id="activeStatus">
  </div>
  <div class="settings-item">
    <span>Read Receipts</span>
    <input type="checkbox" id="readReceipts">
  </div>
  <div class="settings-item">
    <span>Who can message me</span>
    <select id="messagePermission">
      <option value="everyone">Everyone</option>
      <option value="friends">Friends Only</option>
      <option value="noone">No One</option>
    </select>
  </div>

  <!-- 🔔 Notifications -->
  <div class="settings-title">Notifications</div>
  <div class="settings-item">
    <span>Push Notifications</span>
    <input type="checkbox" id="pushNotifications">
  </div>
  <div class="settings-item">
    <span>Email Notifications</span>
    <input type="checkbox" id="emailNotifications">
  </div>
  <div class="settings-item">
    <span>Message Alerts</span>
    <input type="checkbox" id="messageAlerts">
  </div>

  <!-- 🛡️ Security -->
  <div class="settings-title">Security</div>
  <div class="settings-item">
    <span>Change Password</span>
    <button id="updatePasswordBtn" onclick="openChangePassword()">Update</button>
  </div>
  <div class="settings-item">
    <span>Two-Factor Authentication</span>
    <input type="checkbox" id="twoFactorAuth">
  </div>
  <div class="settings-item">
    <span>Login Activity</span>
    <button onclick="viewLoginActivity()">View</button>
  </div>

  <!-- 🎨 Appearance -->
  <div class="settings-title">Appearance</div>
  <div class="settings-item">
    <span>Dark Mode</span>
    <input type="checkbox" id="darkModeToggle">
  </div>
  <div class="settings-item">
    <span>Language</span>
    <select id="languageSelect">
      <option>English</option>
      <option>Hindi</option>
    </select>
  </div>

  <!-- ⚙️ Account -->
  <div class="settings-title">Account</div>

  <div class="settings-item">
    <span>Blocked Users</span>
    <button onclick="viewBlockedUsers()">Manage</button>
  </div>
  <div class="settings-item danger">
    <span>Delete Account</span>
    <button onclick="deleteAccount()">Delete</button>
  </div>

</div>

                <h3 style="margin: 20px 0 10px; font-size: 16px; border-left: 3px solid var(--profile-accent); padding-left: 10px;">Friends</h3>
                <div id="profileFriendsList" class="friends-list-mini"></div>

                <button onclick="logoutFromProfile()" class="logout-btn" style="background:#ff416c; width:100%; border:none; padding:15px; border-radius:12px; color:white; font-weight:bold;">Logout</button>
            </div>
            </div>
        </div>
    </div>

    <div id="fullEditModal" class="theme-popup" style="z-index: 4000;">
        <div class="theme-popup-content" style="text-align:left; width:90%; max-width:400px;">
            <h3>Edit Profile</h3>
            <div style="margin:15px 0;">
                <label style="font-size:12px; color:#aaa;">Full Name</label>
                <input id="editInpName" style="width:100%; padding:10px; background:#111; border:1px solid #333; color:white; border-radius:8px; margin-top:5px;">
            </div>
            <div style="margin:15px 0;">
                <label style="font-size:12px; color:#aaa;">Email Address</label>
                <input id="editInpEmail" type="email" style="width:100%; padding:10px; background:#111; border:1px solid #333; color:white; border-radius:8px; margin-top:5px;">
            </div>
            <div style="margin:15px 0;">
                <label style="font-size:12px; color:#aaa;">Bio</label>
                <textarea id="editInpBio" style="width:100%; height:80px; padding:10px; background:#111; border:1px solid #333; color:white; border-radius:8px; margin-top:5px; resize:none;"></textarea>
            </div>
            <div style="margin:15px 0;">
                <label style="font-size:12px; color:#aaa;">City</label>
                <input id="editInpCity" style="width:100%; padding:10px; background:#111; border:1px solid #333; color:white; border-radius:8px; margin-top:5px;">
            </div>
            <div style="margin:15px 0;">
                <label style="font-size:12px; color:#aaa;">Birthday</label>
                <input type="date" id="editInpBirthday" style="width:100%; padding:10px; background:#111; border:1px solid #333; color:white; border-radius:8px; margin-top:5px;">
            </div>
            <div style="margin:15px 0;">
                <label style="font-size:12px; color:#aaa;">Website</label>
                <input id="editInpLink" style="width:100%; padding:10px; background:#111; border:1px solid #333; color:white; border-radius:8px; margin-top:5px;">
            </div>
            <div style="display:flex; gap:10px; margin-top:20px;">
                <button onclick="saveAdvancedProfile()" class="save-btn" style="flex:2;">Save Changes</button>
                <button onclick="document.getElementById('fullEditModal').style.display='none'" class="action-btn-outline" style="flex:1;">Cancel</button>
            </div>
        </div>
    </div>

    <!-- Crop Modal for Zoom/Adjust -->
    <div id="cropModal" class="theme-popup" style="z-index: 5000; display: none;">
        <div class="theme-popup-content" style="width: 90%; max-width: 480px; padding: 20px;">
            <h3>Adjust Photo</h3>
            <p style="font-size: 13px; color: #aaa; margin-bottom: 15px;">Drag to reposition and use slider to zoom</p>
            <div id="cropViewport" style="width: 100%; height: 320px; background: #000; overflow: hidden; position: relative; margin: 0; touch-action: none; display: flex; align-items: center; justify-content: center; border-radius: 12px;">
                <img id="cropImage" style="position: absolute; cursor: move; user-select: none; max-width: none;">
                <div id="cropOverlay" style="position: absolute; border: 2px solid #fff; box-shadow: 0 0 0 9999px rgba(0,0,0,0.6); pointer-events: none; z-index: 5;"></div>
            </div>
            <div style="margin: 20px 0;">
                <div style="display: flex; justify-content: space-between; font-size: 12px; color: #eee; margin-bottom: 8px;">
                    <span>Zoom Level</span>
                    <span id="zoomLabel">100%</span>
                </div>
                <input type="range" id="cropZoom" min="0.1" max="4" step="0.01" value="1" style="width: 100%;">
            </div>
            <div style="display: flex; gap: 10px;">
                <button id="applyCropBtn" class="save-btn" style="flex: 2;">Save Photo</button>
                <button onclick="document.getElementById('cropModal').style.display='none'" class="action-btn-outline" style="flex: 1;">Cancel</button>
            </div>
        </div>
    </div>
  `;
  app.insertAdjacentHTML("beforeend", modalHTML);

  // Setup Crop Tool Logic
  let cropState = { type: 'avatar', x: 0, y: 0, zoom: 1, isDragging: false, startX: 0, startY: 0 };

  const openCropTool = (src, type) => {
    cropState.type = type;
    const modal = document.getElementById('cropModal');
    const img = document.getElementById('cropImage');
    const overlay = document.getElementById('cropOverlay');
    const zoomInp = document.getElementById('cropZoom');
    
    img.src = src;
    modal.style.display = 'flex';
    
    cropState.x = 0; cropState.y = 0; cropState.zoom = 1;
    zoomInp.value = 1;
    document.getElementById('zoomLabel').textContent = '100%';

    img.onload = () => {
        img.style.transform = `translate(0px, 0px) scale(1)`;
        if (type === 'avatar') {
            overlay.style.width = '240px'; overlay.style.height = '240px'; overlay.style.borderRadius = '50%';
        } else {
            overlay.style.width = '90%'; overlay.style.height = '150px'; overlay.style.borderRadius = '8px';
        }
    };
  };

  const updateImgView = () => {
    document.getElementById('cropImage').style.transform = `translate(${cropState.x}px, ${cropState.y}px) scale(${cropState.zoom})`;
  };

  const viewport = document.getElementById('cropViewport');
  const startPos = (e) => {
    cropState.isDragging = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    cropState.startX = clientX - cropState.x;
    cropState.startY = clientY - cropState.y;
  };
  const movePos = (e) => {
    if (!cropState.isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    cropState.x = clientX - cropState.startX;
    cropState.y = clientY - cropState.startY;
    updateImgView();
  };
  const endPos = () => cropState.isDragging = false;

  viewport.addEventListener('mousedown', startPos);
  window.addEventListener('mousemove', movePos);
  window.addEventListener('mouseup', endPos);
  viewport.addEventListener('touchstart', startPos);
  window.addEventListener('touchmove', movePos);
  window.addEventListener('touchend', endPos);

  document.getElementById('cropZoom').oninput = (e) => {
    cropState.zoom = parseFloat(e.target.value);
    document.getElementById('zoomLabel').textContent = Math.round(cropState.zoom * 100) + '%';
    updateImgView();
  };

  document.getElementById('applyCropBtn').onclick = () => {
    const img = document.getElementById('cropImage');
    const overlay = document.getElementById('cropOverlay');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const outW = cropState.type === 'avatar' ? 512 : 1200;
    const outH = cropState.type === 'avatar' ? 512 : 450;
    canvas.width = outW; canvas.height = outH;

    const oRect = overlay.getBoundingClientRect();
    const iRect = img.getBoundingClientRect();
    const s = outW / oRect.width; // Scale Factor

    ctx.drawImage(img, 
        (iRect.left - oRect.left) * s, 
        (iRect.top - oRect.top) * s, 
        iRect.width * s, 
        iRect.height * s
    );
    
    const result = canvas.toDataURL('image/jpeg', 0.85);
    document.getElementById(cropState.type === 'avatar' ? 'myAvatarPreview' : 'coverPreview').src = result;
    document.getElementById('cropModal').style.display = 'none';
    saveAdvancedProfile(); // Auto-save the adjusted result
  };

  const activeStatusInp = document.getElementById("activeStatus");
  if (activeStatusInp) {
      activeStatusInp.onchange = () => saveAdvancedProfile();
  }

  window.openEditProfile = () => {
    document.getElementById("fullEditModal").style.display = "flex";
  };

  window.logoutFromProfile = () => {
    if (confirm("Logout of your account?")) {
      localStorage.clear();
      window.location.href = "/index.html";
    }
  };

  const loadMyProfile = async (showModal = false) => {
    try {
      const res = await fetch(`/api/getMyProfile/${userId}`);
      const data = await res.json();
      if (data.success && data.user) {
        const u = data.user;
        document.getElementById("dispName").textContent = u.name;
        document.getElementById("dispHandle").textContent =
          "@" + (u.email ? u.email.split("@")[0] : "user");
        document.getElementById("dispBio").textContent = u.bio || "No bio yet.";
        document.getElementById("dispCityText").textContent = u.city || "Add city";
        document.getElementById("dispLink").textContent =
          u.links || "No website";
        if (u.birthday) {
          const [y, m, d] = u.birthday.split("-");
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          document.getElementById("statBirthday").textContent = `${parseInt(d)} ${months[parseInt(m) - 1]}`;
        } else {
          document.getElementById("statBirthday").textContent = "--";
        }
        document.getElementById("statFriends").textContent = u.friendsCount || 0;
        document.getElementById("statPosts").textContent = u.postsCount || 0;
        document.getElementById("statScore").textContent = u.score || 0;
        document.getElementById("statLevel").textContent = u.level || 1;

        if (document.getElementById("activeStatus")) {
            document.getElementById("activeStatus").checked = u.active_status !== 0;
        }

        if (u.avatar) {
          document.getElementById("myAvatarPreview").src = u.avatar;
          const pBtn = document.getElementById("profileBtn");
          if (pBtn) pBtn.src = u.avatar;
        }
        if (u.cover) document.getElementById("coverPreview").src = u.cover;

        if (showModal) {
          document.getElementById("editInpName").value = u.name;
          document.getElementById("editInpEmail").value = u.email || "";
          document.getElementById("editInpBio").value = u.bio || "";
          document.getElementById("editInpCity").value = u.city || "";
          document.getElementById("editInpBirthday").value = u.birthday || "";
          document.getElementById("editInpLink").value = u.links || "";
          document.getElementById("myProfileModal").style.display = "flex";
        }
        loadProfileFriends();
      }
    } catch (e) {
      console.error(e);
    }
  };

  window.saveAdvancedProfile = async () => {
    const name = document.getElementById("editInpName").value;
    const email = document.getElementById("editInpEmail").value;

    if (!name || name.trim() === "") {
      showPopup("Name cannot be empty!");
      return;
    }
    if (!email || !email.includes("@")) {
      showPopup("Please enter a valid email address!");
      return;
    }

    const bio = document.getElementById("editInpBio").value;
    const city = document.getElementById("editInpCity").value;
    const birthday = document.getElementById("editInpBirthday").value;
    const links = document.getElementById("editInpLink").value;
    const avatar = document.getElementById("myAvatarPreview").src;
    const cover = document.getElementById("coverPreview").src;
    const active_status = document.getElementById("activeStatus")?.checked ? 1 : 0;

    const res = await fetch("/api/updateProfile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, name, email, bio, links, avatar, cover, city, birthday, active_status }),
    });
    const data = await res.json();
    if (data.success) {      
      // Update local storage so the chat header/sidebar updates the name
      localStorage.setItem("username", name);

      document.getElementById("fullEditModal").style.display = "none";
      loadMyProfile(false);
    } else {
      showPopup(data.message || "Update failed");
    }
  };

  async function loadProfileFriends() {
    try {
      const res = await fetch(`/getFriends/${userId}`);
      const data = await res.json();
      const list = document.getElementById("profileFriendsList");
      list.innerHTML = "";
      if (!data.friends || data.friends.length === 0) {
        list.innerHTML =
          '<p style="color:#666; text-align:center; padding:20px;">No friends yet</p>';
        return;
      }
      data.friends.forEach((f) => {
        const item = document.createElement("div");
        item.className = "friend-item-mini";
        item.innerHTML = `
                <img src="${f.avatar || "https://i.pravatar.cc/150?img=" + f.id}">
                <div style="flex:1;">
                    <div style="font-weight:600;">${f.name}</div>
                    <div style="font-size:12px; color:#888;">${f.streak > 0 ? "🔥 " + f.streak + " day streak" : "Friend"}</div>
                </div>
            `;
        list.appendChild(item);
      });
    } catch (e) {
      console.error(e);
    }
  }

  // Setup File Uploads
  ["avatar", "cover"].forEach((type) => {
    const input = document.getElementById(`${type}Upload`);
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          openCropTool(ev.target.result, type);
        };
        reader.readAsDataURL(file);
      }
    };
  });

  document.getElementById("closeMyProfileBtn").onclick = () =>
    (document.getElementById("myProfileModal").style.display = "none");

  const avatarBtn = document.getElementById("profileBtn");
  if (avatarBtn) {
    avatarBtn.onclick = () => loadMyProfile(true);
    avatarBtn.style.cursor = "pointer";
  }

  loadMyProfile(false);
}

setupMyProfile();
