async function setupMyProfile() {
  const userId = localStorage.getItem("userId");
  if (!userId) return;

  const style = document.createElement("style");

  document.head.appendChild(style);

  // Setup Crop Tool Logic
  let cropState = {
    type: "avatar",
    x: 0,
    y: 0,
    zoom: 1,
    isDragging: false,
    startX: 0,
    startY: 0,
  };

  const openCropTool = (src, type) => {
    cropState.type = type;
    const modal = document.getElementById("cropModal");
    const img = document.getElementById("cropImage");
    const overlay = document.getElementById("cropOverlay");
    const zoomInp = document.getElementById("cropZoom");

    img.src = src;
    modal.style.display = "flex";

    cropState.x = 0;
    cropState.y = 0;
    cropState.zoom = 1;
    zoomInp.value = 1;
    document.getElementById("zoomLabel").textContent = "100%";

    img.onload = () => {
      img.style.transform = `translate(0px, 0px) scale(1)`;
      if (type === "avatar") {
        overlay.style.width = "240px";
        overlay.style.height = "240px";
        overlay.style.borderRadius = "50%";
      } else {
        overlay.style.width = "90%";
        overlay.style.height = "150px";
        overlay.style.borderRadius = "8px";
      }
    };
  };

  const updateImgView = () => {
    document.getElementById("cropImage").style.transform =
      `translate(${cropState.x}px, ${cropState.y}px) scale(${cropState.zoom})`;
  };

  const viewport = document.getElementById("cropViewport");
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
  const endPos = () => (cropState.isDragging = false);

  viewport.addEventListener("mousedown", startPos);
  window.addEventListener("mousemove", movePos);
  window.addEventListener("mouseup", endPos);
  viewport.addEventListener("touchstart", startPos);
  window.addEventListener("touchmove", movePos);
  window.addEventListener("touchend", endPos);

  document.getElementById("cropZoom").oninput = (e) => {
    cropState.zoom = parseFloat(e.target.value);
    document.getElementById("zoomLabel").textContent =
      Math.round(cropState.zoom * 100) + "%";
    updateImgView();
  };

  document.getElementById("applyCropBtn").onclick = () => {
    const img = document.getElementById("cropImage");
    const overlay = document.getElementById("cropOverlay");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const outW = cropState.type === "avatar" ? 512 : 1200;
    const outH = cropState.type === "avatar" ? 512 : 450;
    canvas.width = outW;
    canvas.height = outH;

    const oRect = overlay.getBoundingClientRect();
    const iRect = img.getBoundingClientRect();
    const s = outW / oRect.width; // Scale Factor

    ctx.drawImage(
      img,
      (iRect.left - oRect.left) * s,
      (iRect.top - oRect.top) * s,
      iRect.width * s,
      iRect.height * s,
    );

    const result = canvas.toDataURL("image/jpeg", 0.85);
    document.getElementById(
      cropState.type === "avatar" ? "myAvatarPreview" : "coverPreview",
    ).src = result;
    document.getElementById("cropModal").style.display = "none";
    saveAdvancedProfile(); // Auto-save the adjusted result
  };

  // ================= UPDATE PASSWORD FLOW =================
  let updateFlowMethod = 'id'; // 'id' for current pwd verification, 'email' for forgot flow
  let updateFlowEmail = null;

  const switchUpdateStep = (stepId) => {
    ['updateStepVerify', 'updateStepEmail', 'updateStepOTP', 'updateStepNew'].forEach(id => {
      document.getElementById(id).style.display = (id === stepId) ? 'block' : 'none';
    });
  };

  window.openChangePassword = () => {
    updateFlowMethod = 'id';
    updateFlowEmail = null;
    document.getElementById("currentPwdInp").value = "";
    document.getElementById("updatePasswordModal").style.display = "flex";
    switchUpdateStep('updateStepVerify');
  };

  window.closeUpdatePasswordModal = () => {
    document.getElementById("updatePasswordModal").style.display = "none";
  };

  // Step 1: Verify Current Password
  document.getElementById("verifyCurrentBtn").onclick = async (e) => {
    const password = document.getElementById("currentPwdInp").value;
    if (!password) return showPopup("Please enter your current password");

    e.target.disabled = true;
    const res = await fetch("/api/verifyCurrentPassword", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, password }),
    });
    const data = await res.json();
    e.target.disabled = false;

    if (data.success) {
      updateFlowMethod = 'id';
      switchUpdateStep('updateStepNew');
    } else {
      showPopup(data.message);
    }
  };

  // Forgot Password Branch
  document.getElementById("updateForgotBtn").onclick = () => {
    switchUpdateStep('updateStepEmail');
  };

  document.getElementById("sendUpdateOtpBtn").onclick = async (e) => {
    const email = document.getElementById("updateEmailInp").value;
    if (!email || !email.includes("@")) return showPopup("Enter a valid registered email");

    e.target.disabled = true;
    const res = await fetch("/api/sendForgotOtp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    e.target.disabled = false;

    if (data.success) {
      updateFlowEmail = email;
      showPopup("OTP sent to your email");
      switchUpdateStep('updateStepOTP');
    } else {
      showPopup(data.message);
    }
  };

  document.getElementById("verifyUpdateOtpBtn").onclick = async (e) => {
    const otp = document.getElementById("updateOTPInp").value;
    if (otp.length !== 6) return showPopup("Enter the 6-digit OTP");

    e.target.disabled = true;
    const res = await fetch("/api/verifyForgotOtp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: updateFlowEmail, otp }),
    });
    const data = await res.json();
    e.target.disabled = false;

    if (data.success) {
      updateFlowMethod = 'email';
      switchUpdateStep('updateStepNew');
    } else {
      showPopup(data.message);
    }
  };

  // Step 2 (Final): Save New Password
  document.getElementById("saveUpdateBtn").onclick = async (e) => {
    const newPwd = document.getElementById("updateNewPwdInp").value;
    const confirmPwd = document.getElementById("updateConfirmPwdInp").value;

    if (newPwd.length < 6) return showPopup("Password must be at least 6 characters");
    if (newPwd !== confirmPwd) return showPopup("Passwords do not match");

    e.target.disabled = true;
    e.target.innerText = "Saving...";

    let success = false;
    let message = "";

    if (updateFlowMethod === 'id') {
      // Use profile update route for logged-in user
      const res = await fetch("/api/updateProfile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password: newPwd }),
      });
      const data = await res.json();
      success = data.success;
      message = success ? "Password updated successfully" : (data.message || "Failed to update");
    } else {
      // Use reset password route for forgot flow
      const res = await fetch("/api/resetPassword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: updateFlowEmail, newPassword: newPwd }),
      });
      const data = await res.json();
      success = data.success;
      message = data.message;
    }

    e.target.disabled = false;
    e.target.innerText = "Save Password";

    if (success) {
      showPopup(message);
      closeUpdatePasswordModal();
      // Clear inputs for next time
      document.getElementById("updateNewPwdInp").value = "";
      document.getElementById("updateConfirmPwdInp").value = "";
      document.getElementById("updateEmailInp").value = "";
      document.getElementById("updateOTPInp").value = "";
    } else {
      showPopup(message);
    }
  };

  const activeStatusInp = document.getElementById("activeStatus");
  if (activeStatusInp) {
    activeStatusInp.onchange = () => saveAdvancedProfile();
  }

  const tfaInp = document.getElementById("twoFactorAuth");
  if (tfaInp) {
    tfaInp.onchange = (e) => {
      const isEnabling = e.target.checked;
      // Revert until verified
      e.target.checked = !isEnabling;
      
      const modal = document.getElementById("passwordModal");
      const title = modal.querySelector("h3");
      title.innerText = isEnabling ? "Enable 2FA" : "Disable 2FA";
      modal.style.display = "flex";
      
      window.verifyDeletePassword = async function() {
        const password = document.getElementById("deletePasswordInput").value;
        if (!password) return showPopup("Enter password");
        
        const res = await fetch("/api/toggle2FA", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, enabled: isEnabling, password }),
        });
        const data = await res.json();
        if (data.success) {
          tfaInp.checked = isEnabling;
          showPopup(`2FA ${isEnabling ? 'Enabled' : 'Disabled'}`);
          closePasswordModal();
        } else {
          showPopup(data.message || "Verification failed");
        }
      };
    };
  }

  const readReceiptsInp = document.getElementById("readReceipts");
  if (readReceiptsInp) {
    readReceiptsInp.onchange = () => saveAdvancedProfile();
  }

  const pushNotificationsInp = document.getElementById("pushNotifications");
  if (pushNotificationsInp) {
    pushNotificationsInp.onchange = () => saveAdvancedProfile();
  }

  window.openEditProfile = () => {
    document.getElementById("fullEditModal").style.display = "flex";
  };

  // 🔥 Open logout modal
  window.logoutFromProfile = function () {
    document.getElementById("logoutModal").style.display = "flex";
  };

  // 🔥 Close modal
  window.closeLogoutModal = function () {
    document.getElementById("logoutModal").style.display = "none";
  };

  // 🔥 Confirm logout
  window.confirmLogout = function () {
    localStorage.clear();
    window.location.href = "/index.html";
  };
  // 🔥 Open password modal
// 🔥 Open password modal
window.deleteAccount = function () {
  document.getElementById("passwordModal").style.display = "flex";
};

// 🔥 Close password modal
function closePasswordModal() {
  document.getElementById("passwordModal").style.display = "none";
}

// 🔥 Step 1: verify password input
window.verifyDeletePassword = function () {
  const password = document.getElementById("deletePasswordInput").value;
  if (!password) {
    showPopup("Enter your password");
    return;
  }

  // store temp password
  window._deletePassword = password;

  closePasswordModal();

  // open confirm modal
  document.getElementById("deleteConfirmModal").style.display = "flex";
};

// 🔥 Final confirm → API call
window.confirmDeleteAccount = async function () {
  const password = window._deletePassword;

  const res = await fetch("/api/deactivateAccount", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, password }),
  });

  const data = await res.json();

  if (data.success) {
    localStorage.clear();
    window.location.href = "/index.html";
  } else {
    showPopup(data.message || "Failed to deactivate account");
  }
};

window.closeDeleteConfirm = function () {
  document.getElementById("deleteConfirmModal").style.display = "none";
};

window.closePasswordModal = function () {
  document.getElementById("passwordModal").style.display = "none";
};
  // 🔥 Step 1: verify password input
  window.verifyDeletePassword = function () {
    const password = document.getElementById("deletePasswordInput").value;
    if (!password) {
      showPopup("Enter your password");
      return;
    }

    // store temp password
    window._deletePassword = password;

    closePasswordModal();

    // open confirm modal
    document.getElementById("deleteConfirmModal").style.display = "flex";
  };

  // 🔥 Close confirm (FIXED)
  window.closeDeleteConfirm = function () {
    document.getElementById("deleteConfirmModal").style.display = "none";
  };
  // 🔥 Final confirm → API call
  window.confirmDeleteAccount = async function () {
    const password = window._deletePassword;

    const res = await fetch("/api/deactivateAccount", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, password }),
    });

    const data = await res.json();

    if (data.success) {
      localStorage.clear();
      window.location.href = "/index.html";
    } else {
      showPopup(data.message || "Failed to deactivate account");
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
        document.getElementById("dispCityText").textContent =
          u.city || "Add city";
        document.getElementById("dispLink").textContent =
          u.links || "No website";
        if (u.birthday) {
          const [y, m, d] = u.birthday.split("-");
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
          document.getElementById("statBirthday2").textContent =
            `${parseInt(d)} ${months[parseInt(m) - 1]}`;
        } else {
          document.getElementById("statBirthday2").textContent = "--";
        }
        document.getElementById("statFriends").textContent =
          u.friendsCount || 0;
        document.getElementById("statPosts2").textContent = u.postsCount || 0;
        document.getElementById("statScore2").textContent = u.score || 0;
        document.getElementById("statLevel2").textContent = u.level || 1;

        if (document.getElementById("activeStatus")) {
          document.getElementById("activeStatus").checked =
            u.active_status !== 0;
        }

        if (document.getElementById("readReceipts")) {
          document.getElementById("readReceipts").checked =
            u.read_receipts !== 0;
          localStorage.setItem("readReceipts", u.read_receipts !== 0);
        }

        if (document.getElementById("pushNotifications")) {
          const enabled = u.notifications_enabled !== 0;
          document.getElementById("pushNotifications").checked = enabled;
          localStorage.setItem("notificationsEnabled", enabled);
        }
        
        if (document.getElementById("twoFactorAuth")) {
          document.getElementById("twoFactorAuth").checked = u.tfa_enabled === 1;
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

    const activeStatusEl = document.getElementById("activeStatus");
    const active_status = activeStatusEl
      ? activeStatusEl.checked
        ? 1
        : 0
      : undefined;

    const readReceiptsEl = document.getElementById("readReceipts");
    const read_receipts = readReceiptsEl
      ? readReceiptsEl.checked
        ? 1
        : 0
      : undefined;

    const notificationsEl = document.getElementById("pushNotifications");
    const notifications_enabled = notificationsEl
      ? notificationsEl.checked
        ? 1
        : 0
      : undefined;

    const res = await fetch("/api/updateProfile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        name,
        email,
        bio,
        links,
        avatar,
        cover,
        city,
        birthday,
        active_status,
        read_receipts,
        notifications_enabled,
      }),
    });
    const data = await res.json();
    if (data.success) {
      // Update local storage so the chat header/sidebar updates the name
      localStorage.setItem("username", name);

      if (read_receipts !== undefined) {
        localStorage.setItem("readReceipts", read_receipts !== 0);
      }

      if (notifications_enabled !== undefined) {
        localStorage.setItem(
          "notificationsEnabled",
          notifications_enabled !== 0,
        );
      }

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

  window.viewLoginActivity = async function () {
    const modal = document.getElementById("loginActivityModal");
    const list = document.getElementById("sessionsList");
    const currentToken = localStorage.getItem("sessionToken");

    modal.style.display = "flex";
    list.innerHTML = "<p style='text-align:center; color:#888;'>Loading sessions...</p>";

    try {
      const res = await fetch(`/api/getLoginSessions/${userId}`);
      const data = await res.json();

      if (!data.success || !data.sessions.length) {
        list.innerHTML = "<p style='color:#888; text-align:center;'>No active sessions found</p>";
        return;
      }

      list.innerHTML = "";
      data.sessions.forEach(sess => {
        const isCurrent = sess.session_token === currentToken;
        const div = document.createElement("div");
        div.className = "session-item";
        div.style.cssText = "background:rgba(30,30,30,0.9); padding:15px; border-radius:12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; border:1px solid rgba(255,255,255,0.05);";
        
        div.innerHTML = `
          <div class="session-info" style="text-align:left;">
            <div style="font-weight:bold; font-size:14px; color:#fff;">
              ${sess.user_agent.split(')')[0].split('(')[1] || 'Unknown Device'} 
              ${isCurrent ? '<span style="color:#00ff55; font-size:11px; margin-left:8px;">THIS DEVICE</span>' : ''}
            </div>
            <div style="font-size:12px; color:#aaa; margin-top:4px;">IP: ${sess.ip_address}</div>
            <div style="font-size:11px; color:#666; margin-top:2px;">Logged in: ${new Date(sess.login_time).toLocaleString()}</div>
          </div>
          ${!isCurrent ? `<button onclick="terminateSession('${sess.session_token}')" style="background:#ff4d4d; color:white; border:none; padding:8px 15px; border-radius:8px; font-size:12px; cursor:pointer;">Logout</button>` : ''}
        `;
        list.appendChild(div);
      });
    } catch (e) {
      list.innerHTML = "<p style='color:#ff4d4d;'>Error loading sessions</p>";
    }
  };

  window.terminateSession = async function (token) {
    const res = await fetch("/api/terminateSession", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, sessionToken: token }),
    });
    const data = await res.json();
    if (data.success) viewLoginActivity(); // Refresh list
  };

  window.viewBlockedUsers = async function () {
    const modal = document.getElementById("blockedUsersModal");
    const list = document.getElementById("blockedUsersList");

    modal.style.display = "flex";
    list.innerHTML = "Loading...";

    try {
      const res = await fetch(`/api/getBlockedUsers/${userId}`);
      const data = await res.json();

      if (!data.success || !data.users.length) {
        list.innerHTML = "<p style='color:#888;'>No blocked users</p>";
        return;
      }

      list.innerHTML = "";

      data.users.forEach((u) => {
        const div = document.createElement("div");
        div.className = "blocked-user-item";

        div.innerHTML = `
        <img src="${u.avatar || "https://i.pravatar.cc/150?img=" + u.id}">
        <span>${u.name}</span>
        <button class="unblock-btn" onclick="unblockUser(${u.id})">Unblock</button>
      `;

        list.appendChild(div);
      });
    } catch (e) {
      console.error(e);
      list.innerHTML = "Error loading users";
    }
  };
  function showConfirm(message, onYes) {
    const modal = document.getElementById("confirmModal");
    const text = document.getElementById("confirmText");
    const yesBtn = document.getElementById("confirmYesBtn");
    const noBtn = document.getElementById("confirmNoBtn");

    text.innerText = message;
    modal.style.display = "flex";

    // remove old events
    yesBtn.onclick = null;
    noBtn.onclick = null;

    yesBtn.onclick = () => {
      modal.style.display = "none";
      onYes();
    };

    noBtn.onclick = () => {
      modal.style.display = "none";
    };
  }
  window.unblockUser = function (blockedId) {
    showConfirm("Unblock this user?", async () => {
      const res = await fetch("/api/unblockUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          blockedId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        showPopup("User unblocked");
        viewBlockedUsers(); // refresh
      } else {
        showPopup("Failed to unblock");
      }
    });
  };
}

setupMyProfile();
