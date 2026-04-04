if (localStorage.getItem("userId")) {
  window.location.href = "/home.html";
}
const authUI = document.getElementById("authUI");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const forgotForm = document.getElementById("forgotForm");
const otpForm = document.getElementById("otpForm");
const loginOtpForm = document.getElementById("loginOtpForm");
const resetForm = document.getElementById("resetForm");

function switchForm(targetForm) {
  // Hide all forms
  loginForm.classList.remove("active");
  registerForm.classList.remove("active");
  forgotForm.classList.remove("active");
  otpForm.classList.remove("active");
  if (loginOtpForm) loginOtpForm.classList.remove("active");
  resetForm.classList.remove("active");

  // activate target
  if (targetForm) targetForm.classList.add("active");
}

const socket = io();
socket.on("loginApproved", (data) => {
  document.getElementById("pendingLoginModal").style.display = "none";
  localStorage.setItem("userId", data.id);
  localStorage.setItem("username", data.name);
  localStorage.setItem("sessionToken", data.sessionToken);
  showPopup("Login Approved!");
  setTimeout(() => window.location.href = "/home.html", 1000);
});
socket.on("loginDenied", () => {
  document.getElementById("pendingLoginModal").style.display = "none";
  showPopup("Login Denied by other device.");
});
socket.on("loginTimeout", () => {
  document.getElementById("pendingLoginModal").style.display = "none";
  showPopup("Approval request timed out.");
});

// Navigation Listeners
document.getElementById("showForgot").onclick = () => switchForm(forgotForm);
document.getElementById("showRegister").onclick = () => switchForm(registerForm);
document.getElementById("showLogin").onclick = () => switchForm(loginForm);
document.getElementById("backToLogin1").onclick = () => switchForm(loginForm);
document.getElementById("backToLogin2").onclick = () => switchForm(loginForm);
document.getElementById("backToLogin3").onclick = () => {
  // Clear any temporary data when going back to login
  window._resetEmail = null;
  document.getElementById("forgotEmail").value = "";
  document.getElementById("otpInput").value = "";
  document.getElementById("newPassword").value = "";
  document.getElementById("confirmPassword").value = "";
  switchForm(loginForm);
};
document.getElementById("backToLogin4").onclick = () => switchForm(loginForm);

// ================= FORGOT PASSWORD FLOW =================

const forgotEmailInp = document.getElementById("forgotEmail");
const sendForgotOtpBtn = document.getElementById("sendOtpBtn");
const otpInputInp = document.getElementById("otpInput");
const verifyForgotOtpBtn = document.getElementById("verifyOtpBtn");
const newPasswordInp = document.getElementById("newPassword");
const confirmPasswordInp = document.getElementById("confirmPassword");
const savePasswordBtn = document.getElementById("savePasswordBtn");

sendForgotOtpBtn.onclick = async () => {
  const email = document.getElementById("forgotEmail").value;

  if (!email) {
    showPopup("Enter your email");
    return;
  }
  
  sendForgotOtpBtn.disabled = true;
  sendForgotOtpBtn.innerText = "Sending...";

  const res = await fetch("/sendForgotOtp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await res.json();
  showPopup(data.message);

  if (data.success) {
    window._resetEmail = email; // Store email only if OTP was successfully sent
    let timeLeft = 60;
    const timer = setInterval(() => {
      timeLeft--;
      sendForgotOtpBtn.innerText = `Resend (${timeLeft}s)`;
      if (timeLeft <= 0) {
        clearInterval(timer);
        sendForgotOtpBtn.disabled = false;
        sendForgotOtpBtn.innerText = "Send OTP";
      }
    }, 1000);
    switchForm(otpForm);
  } else {
    sendForgotOtpBtn.disabled = false;
    sendForgotOtpBtn.innerText = "Send OTP";
  }
};

verifyForgotOtpBtn.onclick = async () => {
  const email = window._resetEmail;
  const otp = document.getElementById("otpInput").value;

  if (!email || !otp) {
    showPopup("Please enter OTP and ensure email was sent.");
    return;
  }

  verifyForgotOtpBtn.disabled = true;
  verifyForgotOtpBtn.innerText = "Verifying...";

  const res = await fetch("/verifyForgotOtp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });

  const data = await res.json();
  showPopup(data.message);

  if (data.success) {
    switchForm(resetForm);
  } else {
    verifyForgotOtpBtn.disabled = false;
    verifyForgotOtpBtn.innerText = "Verify";
  }
};

savePasswordBtn.onclick = async () => {
  const email = window._resetEmail;
  const password = document.getElementById("newPassword").value;
  const confirm = document.getElementById("confirmPassword").value;

  if (!email || !password || !confirm) {
    showPopup("Fill all fields");
    return;
  }

  if (password !== confirm) {
    showPopup("Passwords do not match");
    return;
  }

  savePasswordBtn.disabled = true;
  savePasswordBtn.innerText = "Saving...";

  const res = await fetch("/resetPassword", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      newPassword: password,
    }),
  });

  const data = await res.json();

  if (data.success) {
    showPopup(data.message);
    window._resetEmail = null; // Clear temporary email
    // Clear fields
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmPassword").value = "";
    
    switchForm(loginForm);
  } else {
    showPopup(data.message || "Error updating password");
  }
};
function setupCustomPopup() {
  // Ensure the popup is always on top
  const existingPopup = document.getElementById("customPopup");
  if (!existingPopup) {
    const popupHTML = `
      <div id="customPopup" style="display:none; position:fixed; z-index:10000; left:0; top:0; width:100%; height:100%; background-color:rgba(0,0,0,0.7); justify-content:center; align-items:center;">
          <div style="background:#222; padding:25px; border-radius:12px; text-align:center; color:white; border:1px solid #444; box-shadow:0 10px 30px rgba(0,0,0,0.5); min-width: 280px;">
              <p id="customPopupMessage" style="margin-bottom:20px; font-size:18px; line-height:1.4;"></p>
          </div>
      </div>
      <div id="pendingLoginModal" style="display:none; position:fixed; z-index:10001; left:0; top:0; width:100%; height:100%; background-color:rgba(0,0,0,0.9); justify-content:center; align-items:center;">
          <div style="background:#1a1a1a; padding:40px; border-radius:20px; text-align:center; color:white; border:1px solid #333; max-width: 400px;">
              <div class="spinner" style="border: 4px solid rgba(255,255,255,0.1); border-left-color: #ffd447; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
              <h3 style="margin-bottom:15px;">2FA Approval Required</h3>
              <p style="color:#aaa; font-size:14px;">A notification has been sent to your active devices. Please approve this login to continue.</p>
              <p id="pendingTimer" style="margin-top:20px; color:#ffd447; font-weight:bold;">60s</p>
          </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", popupHTML);
  }
}

function showPopup(message) {
  const popup = document.getElementById("customPopup");
  const popupMessage = document.getElementById("customPopupMessage");
  if (popup && popupMessage) {
    popupMessage.textContent = message;
    popup.style.display = "flex";
    setTimeout(() => {
      popup.style.display = "none";
    }, 1000);
  }
}

setupCustomPopup();

const regEmailInp = document.getElementById("regEmail");
const regNameInp = document.getElementById("regName");
const regOtpInp = document.getElementById("regOtp");
const regPasswordInp = document.getElementById("regPassword");
const sendRegOtpBtn = document.getElementById("sendRegOtpBtn");
const verifyRegOtpBtn = document.getElementById("verifyRegOtpBtn");
const registerBtn = document.getElementById("registerBtn");

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

sendRegOtpBtn.onclick = async () => {
  const email = regEmailInp.value;
  const name = regNameInp.value;

  if (!name || !email) return showPopup("Name and Email are required");
  if (!validateEmail(email)) return showPopup("Enter a valid email");

  sendRegOtpBtn.disabled = true;
  sendRegOtpBtn.innerText = "Sending...";

  const res = await fetch("/sendRegOtp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await res.json();
  showPopup(data.message);

  if (data.success) {
    let timeLeft = 60;
    const timer = setInterval(() => {
      timeLeft--;
      sendRegOtpBtn.innerText = `Resend (${timeLeft}s)`;
      if (timeLeft <= 0) {
        clearInterval(timer);
        sendRegOtpBtn.disabled = false;
        sendRegOtpBtn.innerText = "Send";
      }
    }, 1000);
  } else {
    sendRegOtpBtn.disabled = false;
    sendRegOtpBtn.innerText = "Send";
  }
};

verifyRegOtpBtn.onclick = async () => {
  const email = regEmailInp.value;
  const otp = regOtpInp.value;

  if (!otp) return showPopup("Enter the 6-digit OTP");

  const res = await fetch("/verifyRegOtp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });

  const data = await res.json();
  if (data.success) {
    showPopup("Email Verified!");
    verifyRegOtpBtn.innerText = "Verified";
    verifyRegOtpBtn.style.backgroundColor = "#28a745";
    verifyRegOtpBtn.style.color = "white";
    verifyRegOtpBtn.disabled = true;
    regOtpInp.disabled = true;
    regEmailInp.disabled = true;

    // Reveal password and create button
    regPasswordInp.style.display = "block";
    registerBtn.style.display = "block";
  } else {
    showPopup(data.message);
  }
};

registerBtn.onclick = async () => {
  const name = regNameInp.value;
  const email = regEmailInp.value;
  const password = regPasswordInp.value;

  if (!name || !email || !password) {
    showPopup("Please fill the details");
    return;
  }

  const res = await fetch("/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      name,
      email,
      password,
    }),
  });

  const data = await res.json();

  if (data.success) {
    showPopup("Account created!");
    switchForm(loginForm);
  } else {
    showPopup(data.message);
  }
};

document.querySelector("#loginForm button").onclick = async () => {
  const email = document.querySelector(
    "#loginForm input[placeholder='Email']",
  ).value;
  const password = document.querySelector(
    "#loginForm input[placeholder='Password']",
  ).value;

  if (!email || !password) {
    showPopup("Please fill the details");
    return;
  }

  const res = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (data.success) {
    if (data.pending) {
      document.getElementById("pendingLoginModal").style.display = "flex";
      socket.emit("watchPendingLogin", data.pendingId);
      let timeLeft = 60;
      const timer = setInterval(() => {
        timeLeft--;
        document.getElementById("pendingTimer").innerText = timeLeft + "s";
        if (timeLeft <= 0) clearInterval(timer);
      }, 1000);
      return;
    }
    if (data.needsOtp) {
      window._loginEmail = data.email;
      window._loginPassword = password; // Store for potential resend
      showPopup("2FA Required: OTP sent to your email.");
      switchForm(loginOtpForm);
      return;
    }
    localStorage.setItem("userId", data.id);
    localStorage.setItem("username", data.name);
    localStorage.setItem("sessionToken", data.sessionToken);

    showPopup("Login Successful!");
    setTimeout(() => {
      window.location.href = "/home.html";
    }, 1000);
  } else {
    showPopup(data.message || "Invalid login");
  }
};

// ================= LOGIN OTP FLOW =================

document.getElementById("verifyLoginOtpBtn").onclick = async () => {
  const email = window._loginEmail;
  const otp = document.getElementById("loginOtpInput").value;

  if (!otp) return showPopup("Enter OTP");

  const res = await fetch("/verifyLoginOtp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });

  const data = await res.json();
  if (data.success) {
    localStorage.setItem("userId", data.id);
    localStorage.setItem("username", data.name);
    localStorage.setItem("sessionToken", data.sessionToken);
    showPopup("Login Successful!");
    setTimeout(() => window.location.href = "/home.html", 1000);
  } else {
    showPopup(data.message);
  }
};

document.getElementById("resendLoginOtpBtn").onclick = async () => {
  const res = await fetch("/sendLoginOtp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: window._loginEmail, password: window._loginPassword }),
  });
  const data = await res.json();
  showPopup(data.message);
};
