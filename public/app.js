if (localStorage.getItem("userId")) {
  window.location.href = "/home.html";
}
const authUI = document.getElementById("authUI");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const forgotForm = document.getElementById("forgotForm");
const otpForm = document.getElementById("otpForm");
const resetForm = document.getElementById("resetForm");

function switchForm(targetForm) {
  // Hide all forms
  loginForm.classList.remove("active");
  registerForm.classList.remove("active");
  forgotForm.classList.remove("active");
  otpForm.classList.remove("active");
  resetForm.classList.remove("active");

  // activate target
  if (targetForm) targetForm.classList.add("active");
}

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

  const res = await fetch("/api/sendForgotOtp", {
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

  const res = await fetch("/api/verifyForgotOtp", {
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

  const res = await fetch("/api/resetPassword", {
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
  const popupHTML = `
        <div id="customPopup" style="display:none; position:fixed; z-index:10000; left:0; top:0; width:100%; height:100%; background-color:rgba(0,0,0,0.7); justify-content:center; align-items:center;">
            <div style="background:#222; padding:25px; border-radius:12px; text-align:center; color:white; border:1px solid #444; box-shadow:0 10px 30px rgba(0,0,0,0.5); min-width: 280px;">
                <p id="customPopupMessage" style="margin-bottom:20px; font-size:56px; line-height:1.4;"></p>
            </div>
        </div>
    `;
  if (!existingPopup) {
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

  const res = await fetch("/api/sendRegOtp", {
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

  const res = await fetch("/api/verifyRegOtp", {
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
    localStorage.setItem("userId", data.id);
    localStorage.setItem("username", data.name);

    showPopup("Login Successful!");
    setTimeout(() => {
      window.location.href = "/home.html";
    }, 1000);
  } else {
    showPopup(data.message || "Invalid login");
  }
};
