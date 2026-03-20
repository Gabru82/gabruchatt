

async function setupMyProfile() {
  const userId = localStorage.getItem("userId");
  if (!userId) return;

  // 1. Inject Styles for Profile Modal
  const style = document.createElement("style");
  style.textContent = `
    .user-profile-modal {
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(8px);
    }
    .user-profile-content {
        background: linear-gradient(145deg, #1e1e24, #2a2a30);
        border: 1px solid rgba(255,255,255,0.1);
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }
    .my-profile-inputs {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 20px;
        text-align: left;
    }
    .my-profile-inputs label {
        color: #aaa;
        font-size: 14px;
        margin-bottom: 5px;
        display: block;
    }
    .my-profile-inputs input {
        width: 95%;
        padding: 12px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px;
        color: white;
        font-size: 16px;
        box-sizing: border-box;
    }
    .my-profile-footer {
        margin-top: 30px;
        padding-top: 15px;
        border-top: 1px solid #444;
    }
    .save-btn {
        background: linear-gradient(45deg, #4facfe, #00f2fe);
        border: none;
        padding: 12px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        font-size: 16px;
        cursor: pointer;
        width: 100%;
        margin-top: 20px;
        transition: transform 0.2s, box-shadow 0.2s;
    }
    .save-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 20px -5px rgba(79, 172, 254, 0.4);
    }
    .logout-btn {
        background: linear-gradient(45deg, #ff416c, #ff4b2b);
        color: white;
        border: none;
        padding: 12px;
        width: 100%;
        border-radius: 8px;
        cursor: pointer;
        font-weight: bold;
        font-size: 16px;
    }
    /* Avatar Upload Styles */
    .avatar-upload {
        position: relative;
        max-width: 150px;
        margin: 10px auto 20px;
    }
    .avatar-edit {
        position: absolute;
        right: 12px;
        z-index: 1;
        bottom: 12px;
    }
    .avatar-edit input {
        display: none;
    }
    .avatar-edit label {
        display: inline-block;
        width: 34px;
        height: 34px;
        margin-bottom: 0;
        border-radius: 100%;
        background: #FFFFFF;
        border: 1px solid transparent;
        box-shadow: 0px 2px 4px 0px rgba(0,0,0,0.12);
        cursor: pointer;
        font-weight: normal;
        transition: all .2s ease-in-out;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23333' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z'%3E%3C/path%3E%3Ccircle cx='12' cy='13' r='4'%3E%3C/circle%3E%3C/svg%3E");
        background-size: 20px;
        background-repeat: no-repeat;
        background-position: center;
    }
    .avatar-preview {
        width: 140px;
        height: 140px;
        position: relative;
        border-radius: 100%;
        border: 4px solid rgba(255,255,255,0.1);
        box-shadow: 0px 2px 4px 0px rgba(0,0,0,0.1);
        overflow: hidden;
    }
    .avatar-preview > div {
        width: 100%;
        height: 100%;
        background-size: cover;
        background-repeat: no-repeat;
        background-position: center;
    }
  `;
  document.head.appendChild(style);

  // 2. Inject Modal HTML
  const modalHTML = `
    <div id="myProfileModal" class="user-profile-modal" style="display: none;">
        <div class="user-profile-content">
            <div class="user-profile-header">
                <h2>Edit Profile</h2>
                <button class="close-profile-btn" id="closeMyProfileBtn">
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            
            <div class="my-profile-inputs">
                <div class="avatar-upload">
                    <div class="avatar-edit">
                        <input type='file' id="imageUpload" accept=".png, .jpg, .jpeg" />
                        <label for="imageUpload"></label>
                    </div>
                    <div class="avatar-preview">
                        <div id="imagePreview" style="background-image: url('https://i.pravatar.cc/150');">
                        </div>
                    </div>
                </div>

                <div>
                    <label>Name</label>
                    <input type="text" id="myProfileName" placeholder="Your Name">
                </div>
                <div>
                    <label>Email</label>
                    <input type="email" id="myProfileEmail" placeholder="Your Email">
                </div>
                <div>
                    <label>Password</label>
                    <input type="text" id="myProfilePassword" placeholder="New Password">
                </div>
                
                <button id="saveProfileBtn" class="save-btn">Save Changes</button>
            </div>

            <div class="my-profile-footer">
                <button id="myProfileLogoutBtn" class="logout-btn">Logout</button>
            </div>
        </div>
    </div>
  `;
 app.insertAdjacentHTML("beforeend", modalHTML);

  const loadMyProfile = async (showModal = false) => {
    try {
      const res = await fetch(`/api/getMyProfile/${userId}`);
      const data = await res.json();
      if (data.success && data.user) {
        if (data.user.avatar) {
          const avatarUrl = data.user.avatar;
          document.getElementById("imagePreview").style.backgroundImage = `url(${avatarUrl})`;
          const profileBtn = document.getElementById("profileBtn");
          if (profileBtn) profileBtn.src = avatarUrl;
        }
        if (showModal) {
          document.getElementById("myProfileName").value = data.user.name;
          document.getElementById("myProfileEmail").value = data.user.email;
          document.getElementById("myProfilePassword").value = data.user.password;
          document.getElementById("myProfileModal").style.display = "flex";
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 3. Inject "My Profile" Button (Before Logout)
  const logoutBtn = document.getElementById("logout");
  if (logoutBtn && logoutBtn.parentNode) {
    const profileBtn = document.createElement("button");
    profileBtn.innerText = "My Profile";
    profileBtn.id = "myProfileBtn";
    // Reuse generic chat button styles if possible
    profileBtn.style.cssText =
      "width: 100%; margin-bottom: 10px; padding: 10px; border: none; border-radius: 8px; background: #4facfe; color: white; font-weight: bold; cursor: pointer;";

    logoutBtn.parentNode.insertBefore(profileBtn, logoutBtn);

    profileBtn.onclick = () => loadMyProfile(true);
  }

  loadMyProfile(false); // Load avatar on page load

  // Bind to external profileBtn if exists (e.g. avatar image)
  const avatarBtn = document.getElementById("profileBtn");
  if (avatarBtn) {
    avatarBtn.onclick = () => loadMyProfile(true);
    avatarBtn.style.cursor = "pointer";
  }

  // 4. Modal Logic
  document.getElementById("closeMyProfileBtn").onclick = () =>
    (document.getElementById("myProfileModal").style.display = "none");

  // Handle Avatar Preview
  const imageUpload = document.getElementById("imageUpload");
  imageUpload.onchange = function () {
    const file = this.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        document.getElementById("imagePreview").style.backgroundImage =
          `url(${e.target.result})`;
      };
      reader.readAsDataURL(file);
    }
  };

  document.getElementById("saveProfileBtn").onclick = async () => {
    const name = document.getElementById("myProfileName").value;
    const email = document.getElementById("myProfileEmail").value;
    const password = document.getElementById("myProfilePassword").value;

    // Get Avatar Base64 from preview background style (hacky but works if set by reader)
    let avatar = document.getElementById("imagePreview").style.backgroundImage;
    avatar = avatar.slice(5, -2); // remove url(" and ")
    if (avatar.includes("pravatar.cc") && !imageUpload.files[0]) avatar = null; // Don't save default if not changed

    const res = await fetch("/api/updateProfile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, name, email, password, avatar }),
    });
    const data = await res.json();
    if (data.success) {
      alert("Profile updated!");
      if (name) localStorage.setItem("username", name);
      document.getElementById("myProfileModal").style.display = "none";
      location.reload();
    } else {
      alert("Update failed.");
    }
  };

  document.getElementById("myProfileLogoutBtn").onclick = () => {
    if (confirm("Are you sure you want to logout?")) {
      localStorage.clear();
      window.location.href = "/index.html";
    }
  };
}

setupMyProfile();
