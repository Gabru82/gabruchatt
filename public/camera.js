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
  let beautyIntensity = 1.0;
  let activePresetName = "Original";

  const beautyPresets = {
    "Original": { smooth: 0, brightness: 1, contrast: 1, saturation: 1, warmth: 0, tint: 0, clarity: 0, vignette: 0, glow: 0, sharpen: 0 },
    "Natural": { smooth: 0.3, brightness: 1.05, contrast: 1.0, saturation: 1.05, warmth: 0.05, tint: 0, clarity: 0.1, vignette: 0, glow: 0.1, sharpen: 0 },
    "Glow": { smooth: 0.5, brightness: 1.1, contrast: 1.05, saturation: 1.1, warmth: 0.1, tint: 0, clarity: 0, vignette: 0.1, glow: 0.4, sharpen: 0 },
    "Soft Skin": { smooth: 0.8, brightness: 1.05, contrast: 0.95, saturation: 1.0, warmth: 0, tint: 0, clarity: -0.2, vignette: 0, glow: 0.2, sharpen: 0 },
    "Bright Face": { smooth: 0.4, brightness: 1.2, contrast: 1.1, saturation: 1.0, warmth: 0, tint: 0, clarity: 0.2, vignette: 0, glow: 0.1, sharpen: 0.1 },
    "Warm Tone": { smooth: 0.3, brightness: 1.0, contrast: 1.0, saturation: 1.1, warmth: 0.3, tint: 0, clarity: 0, vignette: 0.1, glow: 0, sharpen: 0 },
    "Cool Tone": { smooth: 0.3, brightness: 1.0, contrast: 1.0, saturation: 1.0, warmth: -0.3, tint: 0.1, clarity: 0, vignette: 0.1, glow: 0, sharpen: 0 },
    "Golden Hour": { smooth: 0.4, brightness: 1.1, contrast: 1.1, saturation: 1.3, warmth: 0.5, tint: -0.1, clarity: 0.1, vignette: 0.2, glow: 0.3, sharpen: 0 },
    "Pink Glow": { smooth: 0.5, brightness: 1.1, contrast: 1.0, saturation: 1.1, warmth: 0, tint: 0.3, clarity: 0, vignette: 0.1, glow: 0.4, sharpen: 0 },
    "HD Skin": { smooth: 0.2, brightness: 1.0, contrast: 1.1, saturation: 1.0, warmth: 0, tint: 0, clarity: 0.5, vignette: 0, glow: 0, sharpen: 0.4 },
    "Matte Skin": { smooth: 0.6, brightness: 1.0, contrast: 1.0, saturation: 0.9, warmth: 0, tint: 0, clarity: -0.1, vignette: 0, glow: 0, sharpen: 0 },
    "High Contrast": { smooth: 0.2, brightness: 1.0, contrast: 1.4, saturation: 1.2, warmth: 0, tint: 0, clarity: 0.3, vignette: 0.2, glow: 0, sharpen: 0.2 },
    "Low Contrast": { smooth: 0.5, brightness: 1.05, contrast: 0.7, saturation: 0.9, warmth: 0, tint: 0, clarity: -0.3, vignette: 0, glow: 0.2, sharpen: 0 },
    "Film Soft": { smooth: 0.4, brightness: 1.0, contrast: 0.9, saturation: 0.8, warmth: 0.1, tint: 0, clarity: -0.2, vignette: 0.3, glow: 0.3, sharpen: 0 },
    "Vintage Warm": { smooth: 0.3, brightness: 0.95, contrast: 1.1, saturation: 0.7, warmth: 0.4, tint: 0, clarity: 0, vignette: 0.4, glow: 0, sharpen: 0 },
    "Clean White": { smooth: 0.5, brightness: 1.2, contrast: 1.0, saturation: 0.8, warmth: -0.1, tint: 0, clarity: 0.2, vignette: 0, glow: 0.1, sharpen: 0.1 },
    "Peach Tone": { smooth: 0.4, brightness: 1.1, contrast: 1.0, saturation: 1.2, warmth: 0.2, tint: 0.2, clarity: 0, vignette: 0.1, glow: 0.2, sharpen: 0 },
    "Sun Kissed": { smooth: 0.3, brightness: 1.1, contrast: 1.05, saturation: 1.4, warmth: 0.4, tint: -0.05, clarity: 0.1, vignette: 0.1, glow: 0.2, sharpen: 0.1 },
    "Night Boost": { smooth: 0.4, brightness: 1.4, contrast: 1.2, saturation: 1.1, warmth: 0, tint: 0, clarity: 0.4, vignette: 0.3, glow: 0.2, sharpen: 0.3 },
    "Neon Glow": { smooth: 0.3, brightness: 1.1, contrast: 1.3, saturation: 1.6, warmth: -0.1, tint: 0.4, clarity: 0.2, vignette: 0.2, glow: 0.5, sharpen: 0.2 },
    "Beauty Pro": { smooth: 0.7, brightness: 1.1, contrast: 1.05, saturation: 1.1, warmth: 0.1, tint: 0.05, clarity: 0.1, vignette: 0.1, glow: 0.3, sharpen: 0.1 },
   
  };

  // Offscreen for multi-pass rendering
  const bufferCanvas = document.createElement("canvas");
  const bufferCtx = bufferCanvas.getContext("2d");
  const maskCanvas = document.createElement("canvas");
  const maskCtx = maskCanvas.getContext("2d");

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

  function getEngineState() {
    const preset = beautyPresets[activePresetName];
    if (!preset || preset.type === "ar") return null;
    
    const state = {};
    for (let k in preset) {
      if (['brightness', 'contrast', 'saturation'].includes(k)) {
        state[k] = 1.0 + (preset[k] - 1.0) * beautyIntensity;
      } else {
        state[k] = preset[k] * beautyIntensity;
      }
    }
    return state;
  }

  function onResults(results) {
    if (arCanvas.width !== video.videoWidth || arCanvas.height !== video.videoHeight) {
      arCanvas.width = video.videoWidth;
      arCanvas.height = video.videoHeight;
      bufferCanvas.width = arCanvas.width;
      bufferCanvas.height = arCanvas.height;
      maskCanvas.width = arCanvas.width;
      maskCanvas.height = arCanvas.height;
    }

    const engine = getEngineState();

    ctx.save();
    ctx.clearRect(0, 0, arCanvas.width, arCanvas.height);

    // Pass 1: Draw Video Frame to Buffer (with Mirroring)
    bufferCtx.save();
    if (currentFacingMode === "user") {
      bufferCtx.translate(bufferCanvas.width, 0);
      bufferCtx.scale(-1, 1);
    }
    bufferCtx.drawImage(results.image, 0, 0, bufferCanvas.width, bufferCanvas.height);
    bufferCtx.restore();

    // Pass 2: Apply Base Fast Filters
    if (engine) {
      ctx.filter = `brightness(${engine.brightness}) contrast(${engine.contrast}) saturate(${engine.saturation}) hue-rotate(${engine.tint * 20}deg)`;
    }
    ctx.drawImage(bufferCanvas, 0, 0);
    ctx.filter = "none";

    // Pass 3: Skin Smoothing
    if (engine && engine.smooth > 0 && results.multiFaceLandmarks?.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];
      const path = new Path2D();
      drawFaceOval(landmarks, path, arCanvas.width, arCanvas.height);
      
      ctx.save();
      ctx.clip(path);
      ctx.globalAlpha = engine.smooth * 0.7;
      ctx.filter = `blur(${Math.max(1, 4 * engine.smooth)}px)`;
      ctx.drawImage(bufferCanvas, 0, 0);
      ctx.restore();
    }

    // Pass 4: Color Grading (Warmth/Tint)
    if (engine && (engine.warmth !== 0)) {
      ctx.save();
      ctx.globalCompositeOperation = "soft-light";
      ctx.fillStyle = engine.warmth > 0 ? `rgba(255, 150, 0, ${engine.warmth * 0.3})` : `rgba(0, 150, 255, ${Math.abs(engine.warmth) * 0.3})`;
      ctx.fillRect(0, 0, arCanvas.width, arCanvas.height);
      ctx.restore();
    }

    // Pass 5: Vignette & Glow
    if (engine && (engine.glow > 0 || engine.vignette > 0)) {
      const cX = arCanvas.width / 2, cY = arCanvas.height / 2;
      const rad = Math.sqrt(cX**2 + cY**2);
      if (engine.glow > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        const g = ctx.createRadialGradient(cX, cY, 0, cX, cY, rad);
        g.addColorStop(0, `rgba(255, 255, 255, ${engine.glow * 0.4})`);
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, arCanvas.width, arCanvas.height);
        ctx.restore();
      }
      if (engine.vignette > 0) {
        const v = ctx.createRadialGradient(cX, cY, rad * 0.2, cX, cY, rad);
        v.addColorStop(0, "transparent");
        v.addColorStop(1, `rgba(0, 0, 0, ${engine.vignette * 0.6})`);
        ctx.fillStyle = v;
        ctx.fillRect(0, 0, arCanvas.width, arCanvas.height);
      }
    }

    // Pass 6: AR Assets
    const activePreset = beautyPresets[activePresetName];
    if (activePreset?.type === "ar" && results.multiFaceLandmarks?.length > 0) {
      if (currentFacingMode === "user") {
        ctx.translate(arCanvas.width, 0);
        ctx.scale(-1, 1);
      }
      const landmarks = results.multiFaceLandmarks[0];
      const w = arCanvas.width;
      const h = arCanvas.height;

      if (activePreset.key === "dog") {
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

  function drawFaceOval(landmarks, target, w, h) {
    const oval = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
    drawPath(landmarks, target, w, h, oval);
  }

  function drawPath(landmarks, target, w, h, indices) {
    const mirror = currentFacingMode === "user";
    const getX = (idx) => mirror ? (1 - landmarks[idx].x) * w : landmarks[idx].x * w;
    
    target.moveTo(getX(indices[0]), landmarks[indices[0]].y * h);
    for (let i = 1; i < indices.length; i++) {
      target.lineTo(getX(indices[i]), landmarks[indices[i]].y * h);
    }
    if (target.closePath) target.closePath();
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
    Object.keys(beautyPresets).forEach((name) => {
      const item = document.createElement("div");
      item.className = `filter-item ${name === activePresetName ? "active" : ""}`;
      item.innerText = name;
      item.onclick = () => {
        activePresetName = name;
        document.querySelectorAll(".filter-item").forEach((el) => el.classList.remove("active"));
        item.classList.add("active");
        
        const slider = document.getElementById("intensitySliderContainer");
        if (name === "Original" || beautyPresets[name].type === "ar") slider.style.display = "none";
        else slider.style.display = "block";
      };
      filterCarousel.appendChild(item);
    });
  }

  document.getElementById("filterIntensity").oninput = (e) => { beautyIntensity = e.target.value / 100; };


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
