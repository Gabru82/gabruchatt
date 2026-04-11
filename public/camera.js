(function () {
  const userId = localStorage.getItem("userId");
  const socket = typeof io !== 'undefined' ? io() : null;
  const cameraModal = document.getElementById("cameraModal");
  const video = document.getElementById("snapVideo");
  const arCanvas = document.getElementById("arCanvas");
  const ctx = arCanvas.getContext("2d");
  const filterCarousel = document.getElementById("filterCarousel");
  const sendModal = document.getElementById("cameraSendModal");
  const friendListContainer = document.getElementById("snapFriendList");

  let faceMesh = null;
  let camera = null;
  let activeFilterIndex = 0;
  let capturedImage = null;
  let selectedReceivers = new Set();
  let currentFacingMode = "user";

  // AR Assets Initialization
  const assets = {
    dog_nose: new Image(),
    dog_ears: new Image(),
    sunglasses: new Image()
  };
  assets.dog_nose.crossOrigin = "anonymous";
  assets.dog_nose.src = "https://cdn-icons-png.flaticon.com/512/616/616412.png";
  assets.dog_ears.crossOrigin = "anonymous";
  assets.dog_ears.src = "https://cdn-icons-png.flaticon.com/512/616/616408.png";
  assets.sunglasses.crossOrigin = "anonymous";
  assets.sunglasses.src = "https://cdn-icons-png.flaticon.com/512/655/655781.png";

  const filters = [
    { name: "Original", type: "none" },
    { name: "Beauty", type: "beauty" },
    { name: "Dog", type: "ar", key: "dog" },
    { name: "Cool", type: "ar", key: "glasses" },
    { name: "B&W", type: "canvas", filter: "grayscale(100%)" },
    { name: "Warm", type: "canvas", filter: "sepia(40%) saturate(150%)" },
    { name: "Vivid", type: "canvas", filter: "contrast(130%) saturate(160%)" },
  ];

  async function initAR() {
    if (faceMesh) return;
    faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults(onResults);
  }

  function onResults(results) {
    if (arCanvas.width !== video.videoWidth || arCanvas.height !== video.videoHeight) {
      arCanvas.width = video.videoWidth;
      arCanvas.height = video.videoHeight;
    }

    ctx.save();
    ctx.clearRect(0, 0, arCanvas.width, arCanvas.height);

    const activeFilter = filters[activeFilterIndex];
    
    // Apply Beauty or Canvas filters
    if (activeFilter.type === "beauty") {
      ctx.filter = "brightness(1.05) contrast(1.1) saturate(1.1) blur(0.4px)";
    } else if (activeFilter.type === "canvas") {
      ctx.filter = activeFilter.filter;
    }

    // Mirror for front camera
    if (currentFacingMode === "user") {
      ctx.translate(arCanvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(results.image, 0, 0, arCanvas.width, arCanvas.height);
    ctx.filter = "none"; // Reset for AR overlays

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0 && activeFilter.type === "ar") {
      const landmarks = results.multiFaceLandmarks[0];
      const w = arCanvas.width;
      const h = arCanvas.height;

      if (activeFilter.key === "dog") {
        const nose = landmarks[1];
        const topHead = landmarks[10];
        const noseSize = w * 0.18;
        const earSize = w * 0.45;
        ctx.drawImage(assets.dog_nose, nose.x * w - noseSize / 2, nose.y * h - noseSize / 2, noseSize, noseSize);
        ctx.drawImage(assets.dog_ears, topHead.x * w - earSize / 2, topHead.y * h - earSize * 0.8, earSize, earSize * 0.6);
      } else if (activeFilter.key === "glasses") {
        const leftEye = landmarks[133], rightEye = landmarks[362], center = landmarks[168];
        const dx = (rightEye.x - leftEye.x) * w, dy = (rightEye.y - leftEye.y) * h;
        const angle = Math.atan2(dy, dx), dist = Math.sqrt(dx * dx + dy * dy);
        const gW = dist * 2.4, gH = gW * 0.4;
        ctx.save();
        ctx.translate(center.x * w, center.y * h);
        ctx.rotate(angle);
        ctx.drawImage(assets.sunglasses, -gW / 2, -gH / 2, gW, gH);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  window.openSnapCamera = async () => {
    await initAR();
    try {
      camera = new Camera(video, {
        onFrame: async () => { await faceMesh.send({ image: video }); },
        facingMode: currentFacingMode,
        width: 1280, height: 720
      });
      await camera.start();
      cameraModal.style.display = "flex";
      initFilters();
    } catch (err) {
      console.error("Camera Error:", err);
      if (window.showPopup) showPopup("Could not access camera");
    }
  };

  document.getElementById("cameraBtnBottom").onclick = () => openSnapCamera();

  window.closeSnapCamera = () => {
    if (camera) camera.stop();
    cameraModal.style.display = "none";
    retakeSnap();
  };

  window.switchSnapCamera = async () => {
    currentFacingMode = currentFacingMode === "user" ? "environment" : "user";
    if (camera) { await camera.stop(); openSnapCamera(); }
  };

  // 2. Filters
  function initFilters() {
    filterCarousel.innerHTML = "";
    filters.forEach((f, i) => {
      const item = document.createElement("div");
      item.className = `filter-item ${i === activeFilterIndex ? "active" : ""}`;
      item.innerText = f.name;
      item.onclick = () => {
        activeFilterIndex = i;
        document
          .querySelectorAll(".filter-item")
          .forEach((el) => el.classList.remove("active"));
        item.classList.add("active");
      };
      filterCarousel.appendChild(item);
    });
  }

  // 3. Capture
  window.captureSnap = () => {
    // Capture directly from the AR canvas which already includes video + filters
    capturedImage = arCanvas.toDataURL("image/jpeg", 0.8);
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
                <div class="f-id" data-id="${f.id}" style="display:none;"></div>
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
    const shouldSelectAll = selectedReceivers.size < items.length;
    
    selectedReceivers.clear();
    items.forEach((item) => {
      const id = parseInt(item.querySelector('.f-id').dataset.id);
      if (shouldSelectAll) {
        selectedReceivers.add(id);
        item.classList.add("selected");
      } else {
        item.classList.remove("selected");
      }
    });
    updateSendBtnUI();
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
