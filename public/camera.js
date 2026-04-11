(function () {
  const userId = localStorage.getItem("userId");
  const cameraModal = document.getElementById("cameraModal");
  const video = document.getElementById("snapVideo");
  const filterCarousel = document.getElementById("filterCarousel");
  const sendModal = document.getElementById("cameraSendModal");
  const friendListContainer = document.getElementById("snapFriendList");

  let stream = null;
  let capturedImage = null;
  let selectedReceivers = new Set();
  let currentFacingMode = "user";

  const filters = [
    { name: "Original", css: "none" },
    { name: "B&W", css: "grayscale(100%)" },
    { name: "Sepia", css: "sepia(100%)" },
    { name: "Warm", css: "sepia(30%) saturate(160%) hue-rotate(-10deg)" },
    { name: "Cool", css: "hue-rotate(180deg) saturate(120%)" },
    { name: "Vivid", css: "contrast(120%) saturate(150%)" },
    { name: "Invert", css: "invert(100%)" },
  ];

  // 1. Initialize Camera
  window.openSnapCamera = async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: currentFacingMode },
        audio: false,
      });
      video.srcObject = stream;
      cameraModal.style.display = "flex";
      initFilters();
    } catch (err) {
      console.error("Camera Error:", err);
      if (window.showPopup) showPopup("Could not access camera");
    }
  };

  document.getElementById("cameraBtnBottom").onclick = () => openSnapCamera();

  window.closeSnapCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    cameraModal.style.display = "none";
    retakeSnap();
  };

  window.switchSnapCamera = () => {
    currentFacingMode = currentFacingMode === "user" ? "environment" : "user";
    closeSnapCamera();
    openSnapCamera();
  };

  // 2. Filters
  function initFilters() {
    filterCarousel.innerHTML = "";
    filters.forEach((f, i) => {
      const item = document.createElement("div");
      item.className = `filter-item ${i === 0 ? "active" : ""}`;
      item.innerText = f.name;
      item.onclick = () => {
        document
          .querySelectorAll(".filter-item")
          .forEach((el) => el.classList.remove("active"));
        item.classList.add("active");
        video.style.filter = f.css;
      };
      filterCarousel.appendChild(item);
    });
  }

  // 3. Capture
  window.captureSnap = () => {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");

    // Apply filter to canvas
    ctx.filter = getComputedStyle(video).filter;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    capturedImage = canvas.toDataURL("image/jpeg", 0.8);
    document.getElementById("capturedSnapImg").src = capturedImage;
    document.getElementById("snapPreview").style.display = "block";
  };

  window.retakeSnap = () => {
    document.getElementById("snapPreview").style.display = "none";
    capturedImage = null;
  };

  window.saveSnapLocal = () => {
    const link = document.createElement("a");
    link.href = capturedImage;
    link.download = `snap_${Date.now()}.jpg`;
    link.click();
  };

  // 4. Sending
  window.openSnapSendModal = async () => {
    sendModal.style.display = "flex";
    selectedReceivers.clear();
    updateSendBtnUI();

    const res = await fetch(`/getFriends/${userId}`);
    const data = await res.json();

    renderSnapFriends(data.friends || []);

    document.getElementById("snapFriendSearch").oninput = (e) => {
      const query = e.target.value.toLowerCase();
      const filtered = data.friends.filter((f) =>
        f.name.toLowerCase().includes(query),
      );
      renderSnapFriends(filtered);
    };
  };

  function renderSnapFriends(friends) {
    friendListContainer.innerHTML = "";
    friends.forEach((f) => {
      const item = document.createElement("div");
      item.className = `forward-friend-item ${selectedReceivers.has(f.id) ? "selected" : ""}`;
      item.innerHTML = `
                <img src="${f.avatar || "/images/profile1.webp"}">
                <div class="forward-friend-info">
                    <div class="forward-friend-name">${f.name}</div>
                </div>
                <div class="selection-check"><i class="fa-solid fa-circle-check"></i></div>
            `;
      item.onclick = () => {
        if (selectedReceivers.has(f.id)) selectedReceivers.delete(f.id);
        else selectedReceivers.add(f.id);
        item.classList.toggle("selected");
        updateSendBtnUI();
      };
      friendListContainer.appendChild(item);
    });
  }

  function updateSendBtnUI() {
    const btn = document.getElementById("sendSnapFinalBtn");
    btn.style.display = selectedReceivers.size > 0 ? "block" : "none";
    btn.innerText = `Send to ${selectedReceivers.size} friend${selectedReceivers.size > 1 ? "s" : ""}`;
  }

  window.toggleSelectAllSnaps = () => {
    const items = document.querySelectorAll(
      "#snapFriendList .forward-friend-item",
    );
    const allSelected = selectedReceivers.size === items.length;

    items.forEach((item) => {
      const id = parseInt(item.getAttribute("data-id")); // Assuming you add data-id or similar
      // For simplicity in this block, we'll re-fetch IDs if needed or just use current items
    });
    // Implementation note: Logic would typically map visible friends to selection
  };

  window.confirmSendSnap = () => {
    if (selectedReceivers.size === 0 || !capturedImage) return;

    socket.emit("sendSnap", {
      senderId: userId,
      receivers: Array.from(selectedReceivers),
      image: capturedImage,
      timestamp: new Date().toISOString(),
    });

    if (window.showPopup) showPopup("Snap sent!");
    sendModal.style.display = "none";
    closeSnapCamera();
  };

  // Receiver Snap Logic
  window.viewSnapMessage = (msgId, imageBase64) => {
    const container = document.querySelector(
      `.snap-message-container[data-msg-id="${msgId}"]`,
    );
    if (!container) return;
    const placeholder = container.querySelector(".snap-placeholder");
    if (!placeholder || placeholder.classList.contains("viewed")) return;

    // Explicitly notify backend that the snap is being opened now
    socket.emit("snapOpened", { msgId, userId });

    const originalPlaceholderHTML = placeholder.outerHTML;

    container.innerHTML = `
            <div class="snap-view-content" style="position:relative;">
                <img src="${imageBase64}" class="chat-media" onclick="openFullScreenImage(this.src)">
                <button class="snap-save-btn" onclick="saveSnap('${msgId}')" style="position:absolute; bottom:10px; right:10px; background:rgba(0,0,0,0.6); color:white; border:none; padding:5px 10px; border-radius:15px; font-size:12px; cursor:pointer;">
                    <i class="fa-solid fa-bookmark"></i> Save
                </button>
            </div>
        `;
    if (container.classList.contains("is-saved")) {
      const btn = container.querySelector(".snap-save-btn");
      if (btn) {
        btn.className = "snap-save-toggle";
        btn.innerHTML = '<i class="fa-solid fa-bookmark"></i> Unsave';
        btn.onclick = () => window.unsaveSnap(msgId);
      }
      const label = document.createElement("div");
      label.className = "snap-status-label";
      label.style.cssText = "font-size:10px; color:#888; margin-top:4px;";
      label.textContent = "Saved in chat";
      container.querySelector("img").after(label);
    }
    let timer = setTimeout(() => {
      if (container.classList.contains("is-saved")) return;

      container.innerHTML = originalPlaceholderHTML;
      const newPlaceholder = container.querySelector(".snap-placeholder");
      newPlaceholder.classList.add("viewed");
      newPlaceholder.querySelector("span").innerText = "Opened";
      newPlaceholder.querySelector("i").className = "fa-solid fa-envelope-open";
    }, 5000); // 5 second timer

    // Store timer to cancel if saved
    window._snapTimers = window._snapTimers || {};
    window._snapTimers[msgId] = timer;
  };

  window.saveSnap = (msgId) => {
    const container = document.querySelector(
      `.snap-message-container[data-msg-id="${msgId}"]`,
    );
    if (container) {
      container.classList.add("is-saved");
      if (window._snapTimers && window._snapTimers[msgId]) {
        clearTimeout(window._snapTimers[msgId]);
        delete window._snapTimers[msgId];
      }
      const btn = container.querySelector(".snap-save-btn");
      if (btn) {
        btn.className = "snap-save-toggle";
        btn.innerHTML = '<i class="fa-solid fa-bookmark"></i> Unsave';
        btn.onclick = () => window.unsaveSnap(msgId);
      }
      if (!container.querySelector(".snap-status-label")) {
        const label = document.createElement("div");
        label.className = "snap-status-label";
        label.style.cssText = "font-size:10px; color:#888; margin-top:4px;";
        label.textContent = "Saved in chat";
        const img = container.querySelector("img");
        if (img) img.after(label);
      }
    }
    socket.emit("snapSaved", { msgId, userId });
    if (window.showPopup) showPopup("Snap saved to chat!");
  };

  window.unsaveSnap = (msgId) => {
    const container = document.querySelector(
      `.snap-message-container[data-msg-id="${msgId}"]`,
    );
    if (container) {
      container.classList.remove("is-saved");
      const label = container.querySelector(".snap-status-label");
      if (label) label.remove();
      const btn = container.querySelector(".snap-save-toggle");
      if (btn) {
        btn.className = "snap-save-btn";
        btn.innerHTML = '<i class="fa-solid fa-bookmark"></i> Save';
        btn.onclick = () => window.saveSnap(msgId);
      }

      // If unsaved after timer expired, revert viewed content to Opened placeholder
      const viewContent = container.querySelector(".snap-view-content");
      if (viewContent && (!window._snapTimers || !window._snapTimers[msgId])) {
        const img = viewContent.querySelector("img");
        const msg = img ? img.src : "";
        container.innerHTML = `
                    <div class="snap-placeholder viewed" data-msg-id="${msgId}" onclick="viewSnapMessage('${msgId}', '${msg}')">
                        <i class="fa-solid fa-envelope-open"></i>
                        <span>Opened</span>
                    </div>
                `;
      }
    }
    socket.emit("snapUnsaved", { msgId, userId });
    if (window.showPopup) showPopup("Snap unsaved");
  };
})();
