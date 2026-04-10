(function () {
  const userId = localStorage.getItem("userId");
  const userName = localStorage.getItem("username");
  const socket = io();
  let postMedia = [];
  let selectedPostMusic = null;
  let selectedPostTaggedUsers = new Set();

  let currentViewingPostId = null;
  let currentViewingPost = null;
  let interactionStates = {}; 

  // Independent Post Music State
  let postMusicPreviewPlayer = null;
  let postMusicSearchTimer = null;
  let postSongDuration = 0;
  let postSegmentStartTime = 0;
  const POST_MUSIC_DURATION = 30; // 30s segment for posts
  let postMusicPlayer = null; // Dedicated viewer player
  let isDraggingPostSlider = false;
  let postDragStartX = 0;
  let postSliderStartLeft = 0;
  let postTrimLoopTimeout = null;
  let postViewerMusicTimeout = null;

  // Trigger openPostModal on plusBtnBottom click
  const plusBtn = document.getElementById("plusBtnBottom");
  if (plusBtn) {
    plusBtn.onclick = () => openPostModal();
  }

  // Setup Post Gallery Triggers for Own and Friends Profiles
  function initPostGalleryTriggers() {
    // Own Profile Stats (statPosts2)
    const myStatBtn = document.getElementById("statPosts2");
    if (myStatBtn) {
      const target = myStatBtn.closest(".stat-box") || myStatBtn;
      target.style.cursor = "pointer";
      target.onclick = (e) => { e.stopPropagation(); openPostGallery(userId); };
    }

    // Friends Profile Stats (statPosts)
    const friendStatBtn = document.getElementById("statPosts");
    if (friendStatBtn) {
      const target = friendStatBtn.closest(".stat-box") || friendStatBtn;
      target.style.cursor = "pointer";
      target.onclick = (e) => { e.stopPropagation(); if (window.currentFriendId) openPostGallery(window.currentFriendId); };
    }
  }

  initPostGalleryTriggers();

  window.openPostModal = () => {
    postMedia = [];
    selectedPostMusic = null;
    selectedPostTaggedUsers.clear();
    currentViewingPostId = null;
    document.getElementById("postCaption").value = "";
    document.getElementById("selectedPostMusic").innerText = "None";
    document.getElementById("taggedUsersCount").innerText = "0 people";
    renderMediaPreview();

    // Ensure picker is correctly bound
    const musicRow = document.getElementById("postMusicSelectRow");
    if (musicRow) musicRow.onclick = () => openPostMusicPicker();

    document.getElementById("postEditorModal").style.display = "flex";
  };

  window.closePostEditor = () => {
    document.getElementById("postEditorModal").style.display = "none";
  };

  document.getElementById("postFileInput").onchange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        postMedia.push({
          data: ev.target.result,
          type: file.type.startsWith("video") ? "video" : "image",
        });
        renderMediaPreview();
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  function renderMediaPreview() {
    const container = document.getElementById("postMediaPreview");
    if (postMedia.length === 0) {
      container.innerHTML =
        '<p style="color: #555; width: 100%; text-align: center;">No media selected</p>';
      return;
    }
    container.innerHTML = "";
    postMedia.forEach((media, index) => {
      const div = document.createElement("div");
      div.style.position = "relative";
      div.style.flexShrink = "0";
      div.style.width = "150px";
      div.style.height = "150px";
      div.style.borderRadius = "8px";
      div.style.overflow = "hidden";

      if (media.type === "video") {
        div.innerHTML = `<video src="${media.data}" muted autoplay loop style="width:100%; height:100%; object-fit:cover;"></video>`;
      } else {
        div.innerHTML = `<img src="${media.data}" style="width:100%; height:100%; object-fit:cover;">`;
      }

      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-post-media";
      removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      removeBtn.onclick = (ev) => {
        ev.stopPropagation();
        postMedia.splice(index, 1);
        renderMediaPreview();
      };
      div.appendChild(removeBtn);
      container.appendChild(div);
    });
  }

  // ================= POST MUSIC PICKER LOGIC =================

  window.openPostMusicPicker = (existingMusic = null) => {
    document.getElementById("postMusicPickerModal").style.display = "flex";
    document.getElementById("postMusicSearchInput").value = "";
    document.getElementById("postMusicResultsList").innerHTML =
      '<p style="text-align:center; color:#888;">Type to search music for your post...</p>';
    document.getElementById("postMusicPreviewPlayer").style.display = "none";
    document.getElementById("postMusicTrimmer").style.display = "none";
    document.getElementById("postConfirmMusicBtn").style.display = "none";

    if (existingMusic) {
      selectedPostMusic = existingMusic;
      postSegmentStartTime = existingMusic.startTime || 0;
      playPostMusicPreview(existingMusic);
      setupPostMusicTrimmer(existingMusic);
      document.getElementById("postConfirmMusicBtn").style.display = "block";
    } else {
      postSegmentStartTime = 0;
      selectedPostMusic = null;
    }
    stopPostMusicPreview();
  };

  window.closePostMusicPicker = () => {
    document.getElementById("postMusicPickerModal").style.display = "none";
    stopPostMusicPreview();
  };

  document.getElementById("postMusicSearchInput").oninput = (e) => {
    const query = e.target.value.trim();
    clearTimeout(postMusicSearchTimer);
    postMusicSearchTimer = setTimeout(() => searchPostMusic(query), 500);
  };

  async function searchPostMusic(query) {
    const resultsList = document.getElementById("postMusicResultsList");
    if (!query) return;
    resultsList.innerHTML =
      '<p style="text-align:center; color:#888;">Searching...</p>';

    try {
      const res = await fetch(
        `/searchSongs?query=${encodeURIComponent(query)}`,
      );
      const data = await res.json();
      if (!data.success || !data.songs.length) {
        resultsList.innerHTML =
          '<p style="text-align:center; color:#888;">No songs found.</p>';
        return;
      }
      resultsList.innerHTML = "";
      data.songs.forEach((song) => {
        const item = document.createElement("div");
        item.className = "music-result-item";
        item.style.cssText =
          "display:flex; align-items:center; gap:10px; padding:10px; border-bottom:1px solid #333; cursor:pointer;";
        item.innerHTML = `
                    <img src="${song.thumbnail || "/images/music_placeholder.png"}" style="width:40px; height:40px; border-radius:4px; object-fit:cover;">
                    <div style="flex-grow: 1; overflow:hidden;">
                        <div style="font-size: 14px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${song.title}</div>
                        <div style="font-size: 12px; color: #aaa;">${song.source === "youtube" ? "YouTube" : "Pixabay"}</div>
                    </div>
                    <i class="fa-solid fa-play" style="color:#ffcc00;"></i>
                `;
        item.onclick = () => {
          playPostMusicPreview(song);
          setupPostMusicTrimmer(song);
          document.getElementById("postConfirmMusicBtn").style.display =
            "block";
        };
        resultsList.appendChild(item);
      });
    } catch (err) {
      resultsList.innerHTML =
        '<p style="text-align:center; color:red;">Error loading songs</p>';
    }
  }

  function playPostMusicPreview(song) {
    stopPostMusicPreview();
    const container = document.getElementById("postMusicPreviewPlayer");
    document
      .getElementById("postMusicPreviewThumbnail")
      .querySelector("img").src =
      song.thumbnail || "/images/music_placeholder.png";
    document.getElementById("postMusicPreviewTitle").textContent = song.title;
    document.getElementById("postMusicPreviewSource").textContent =
      song.source === "youtube" ? "YouTube" : "Pixabay";

    const startTime = postSegmentStartTime || 0;
    const btn = document.getElementById("postMusicPreviewPlayPause");
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-pause"></i>';
      btn.onclick = () => {
        if (postTrimLoopTimeout || postMusicPreviewPlayer)
          stopPostMusicPreview();
        else playPostTrimPreview();
      };
    }

    if (song.source === "youtube") {
      postMusicPreviewPlayer = document.createElement("iframe");
      postMusicPreviewPlayer.src = `https://www.youtube.com/embed/${song.id}?autoplay=1&controls=0&modestbranding=1&rel=0&enablejsapi=1&start=${Math.floor(startTime)}&origin=${window.location.origin}`;
      postMusicPreviewPlayer.width = "1";
      postMusicPreviewPlayer.height = "1";
      postMusicPreviewPlayer.style.position = "absolute";
      postMusicPreviewPlayer.style.left = "-9999px";
      postMusicPreviewPlayer.onload = () => {
        if (postMusicPreviewPlayer && postMusicPreviewPlayer.contentWindow) {
          postMusicPreviewPlayer.contentWindow.postMessage(JSON.stringify({
            event: 'command',
            func: 'seekTo',
            args: [startTime, true]
          }), '*');
          postMusicPreviewPlayer.contentWindow.postMessage(JSON.stringify({
            event: 'command',
            func: 'playVideo',
            args: ''
          }), '*');
        }
      };
      document.body.appendChild(postMusicPreviewPlayer);
    } else {
      postMusicPreviewPlayer = document.createElement("audio");
      postMusicPreviewPlayer.src = song.audioUrl;
      postMusicPreviewPlayer.autoplay = true;
      postMusicPreviewPlayer.oncanplay = () => {
        if (postMusicPreviewPlayer) {
          postMusicPreviewPlayer.pause();
          postMusicPreviewPlayer.currentTime = startTime;
          postMusicPreviewPlayer.play();
        }
      };
      document.body.appendChild(postMusicPreviewPlayer);
    }
    container.style.display = "flex";
  }

  function playPostTrimPreview() {
    if (!selectedPostMusic) return;
    const song = selectedPostMusic;
    const btn = document.getElementById("postMusicPreviewPlayPause");
    if (btn) btn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    const trimBtn = document.getElementById("postTrimPreviewPlayPause");
    if (trimBtn) trimBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Play Segment';

    function runLoop() {
      stopPostMusicPreview();
      const loopStartTime = postSegmentStartTime;
      if (song.source === "youtube") {
        postMusicPreviewPlayer = document.createElement("iframe");
        postMusicPreviewPlayer.src = `https://www.youtube.com/embed/${song.id}?autoplay=1&controls=0&modestbranding=1&rel=0&enablejsapi=1&start=${Math.floor(loopStartTime)}&origin=${window.location.origin}`;
        postMusicPreviewPlayer.width = "1";
        postMusicPreviewPlayer.height = "1";
        postMusicPreviewPlayer.style.position = "absolute";
        postMusicPreviewPlayer.style.left = "-9999px";
        postMusicPreviewPlayer.onload = () => {
          if (postMusicPreviewPlayer && postMusicPreviewPlayer.contentWindow) {
            postMusicPreviewPlayer.contentWindow.postMessage(JSON.stringify({
              event: 'command',
              func: 'seekTo',
              args: [loopStartTime, true]
            }), '*');
            postMusicPreviewPlayer.contentWindow.postMessage(JSON.stringify({
              event: 'command',
              func: 'playVideo',
              args: ''
            }), '*');
          }
        };
        document.body.appendChild(postMusicPreviewPlayer);
      } else {
        postMusicPreviewPlayer = document.createElement("audio");
        postMusicPreviewPlayer.src = song.audioUrl;
        postMusicPreviewPlayer.autoplay = true;
        postMusicPreviewPlayer.oncanplay = () => {
          if (postMusicPreviewPlayer) {
            postMusicPreviewPlayer.pause();
            postMusicPreviewPlayer.currentTime = loopStartTime;
            postMusicPreviewPlayer.play();
          }
        };
        document.body.appendChild(postMusicPreviewPlayer);
      }
      postTrimLoopTimeout = setTimeout(runLoop, POST_MUSIC_DURATION * 1000);
    }
    runLoop();
  }

  function stopPostMusicPreview() {
    if (postTrimLoopTimeout) {
      clearTimeout(postTrimLoopTimeout);
      postTrimLoopTimeout = null;
    }
    if (postMusicPreviewPlayer) {
      if (postMusicPreviewPlayer.oncanplay)
        postMusicPreviewPlayer.oncanplay = null;
      if (postMusicPreviewPlayer.pause) postMusicPreviewPlayer.pause();
      postMusicPreviewPlayer.remove();
      postMusicPreviewPlayer = null;
    }
    const btn = document.getElementById("postMusicPreviewPlayPause");
    if (btn) btn.innerHTML = '<i class="fa-solid fa-play"></i>';
    const trimBtn = document.getElementById("postTrimPreviewPlayPause");
    if (trimBtn) trimBtn.innerHTML = '<i class="fa-solid fa-play"></i> Play Segment';
  }

  function setupPostMusicTrimmer(song) {
    document.getElementById("postMusicTrimmer").style.display = "flex";
    postSongDuration = song.duration || 180;
    if (postSongDuration < POST_MUSIC_DURATION)
      postSongDuration = POST_MUSIC_DURATION;
    postSegmentStartTime = 0;
    selectedPostMusic = {
      ...song,
      startTime: 0,
      duration: POST_MUSIC_DURATION,
    };
    updatePostTrimmerUI();

    playPostTrimPreview();

    document.getElementById("postTrimPreviewPlayPause").onclick = () => {
      if (postTrimLoopTimeout || postMusicPreviewPlayer) stopPostMusicPreview();
      else playPostTrimPreview();
    };

    document.getElementById("postTrimResetBtn").onclick = () => {
      postSegmentStartTime = 0;
      updatePostTrimmerUI();
      stopPostMusicPreview();
    };

    const slider = document.getElementById("postSegmentSlider");
    slider.onmousedown = (e) => {
      isDraggingPostSlider = true;
      postDragStartX = e.clientX;
      postSliderStartLeft = slider.offsetLeft;
    };
    slider.ontouchstart = (e) => {
      isDraggingPostSlider = true;
      postDragStartX = e.touches[0].clientX;
      postSliderStartLeft = slider.offsetLeft;
    };
  }

  function updatePostTrimmerUI() {
    const slider = document.getElementById("postSegmentSlider");
    const sliderWidth = slider.parentElement.offsetWidth;
    const segmentWidth = (POST_MUSIC_DURATION / postSongDuration) * sliderWidth;
    const leftPos = (postSegmentStartTime / postSongDuration) * sliderWidth;
    slider.style.width = `${segmentWidth}px`;
    slider.style.left = `${leftPos}px`;
    document.getElementById("postSegmentStartTime").textContent =
      formatPostTime(postSegmentStartTime);
    document.getElementById("postSegmentEndTime").textContent = formatPostTime(
      postSegmentStartTime + POST_MUSIC_DURATION,
    );
    document.getElementById("postSegmentTotalDuration").textContent =
      formatPostTime(postSongDuration);
    if (selectedPostMusic) selectedPostMusic.startTime = postSegmentStartTime;
  }

  function formatPostTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  document.addEventListener("mousemove", (e) =>
    handlePostTrimmerDrag(e.clientX),
  );
  document.addEventListener("touchmove", (e) =>
    handlePostTrimmerDrag(e.touches[0].clientX),
  );
  function handlePostTrimmerDrag(clientX) {
    if (!isDraggingPostSlider) return;
    const slider = document.getElementById("postSegmentSlider");
    const parentWidth = slider.parentElement.offsetWidth;
    let newLeft = postSliderStartLeft + (clientX - postDragStartX);
    if (newLeft < 0) newLeft = 0;
    if (newLeft + slider.offsetWidth > parentWidth)
      newLeft = parentWidth - slider.offsetWidth;
    postSegmentStartTime = (newLeft / parentWidth) * postSongDuration;
    updatePostTrimmerUI();
  }
  document.addEventListener("mouseup", () => (isDraggingPostSlider = false));
  document.addEventListener("touchend", () => (isDraggingPostSlider = false));

  document.getElementById("postConfirmMusicBtn").onclick = async () => {
    if (currentViewingPostId) {
      const res = await fetch("/updatePostMusic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: currentViewingPostId, userId, music: selectedPostMusic })
      });
      const data = await res.json();
      if (data.success) {
        socket.emit("postUpdated", { postId: currentViewingPostId, music: selectedPostMusic });
        if (currentViewingPost) currentViewingPost.music = JSON.stringify(selectedPostMusic);
        if (window.showPopup) showPopup("Music updated!");
      }
      closePostMusicPicker();
      return;
    }
    const display = document.getElementById("selectedPostMusic");
    display.innerHTML = `
            <div style="display:flex; align-items:center; gap:5px; justify-content:flex-end;">
                <img src="${selectedPostMusic.thumbnail || "/images/music_placeholder.png"}" style="width:20px; height:20px; border-radius:3px;">
                <span style="max-width:80px; overflow:hidden; text-overflow:ellipsis;">${selectedPostMusic.title}</span>
                <button onclick="event.stopPropagation(); removePostMusic()" style="background:none; border:none; color:#ff4444; font-size:16px; cursor:pointer;">&times;</button>
            </div>
        `;
    document.getElementById("postMusicSelectRow").onclick = null;
    closePostMusicPicker();
  };

  window.removePostMusic = () => {
    selectedPostMusic = null;
    document.getElementById("selectedPostMusic").innerText = "None";
    document.getElementById("postMusicSelectRow").onclick = () =>
      openPostMusicPicker();
  };

  // ================= POST VIEWER MODAL =================

  window.closePostViewer = () => {
    document.getElementById("postViewerModal").style.display = "none";
    currentViewingPostId = null;
    currentViewingPost = null;
    stopPostMusicPlayback();
  };

  function stopPostMusicPlayback() {
    if (postViewerMusicTimeout) {
      clearTimeout(postViewerMusicTimeout);
      postViewerMusicTimeout = null;
    }
    if (postMusicPlayer) {
      if (postMusicPlayer.oncanplay) postMusicPlayer.oncanplay = null;
      if (postMusicPlayer.pause) postMusicPlayer.pause();
      postMusicPlayer.remove();
      postMusicPlayer = null;
    }
  }

  window.openPostViewer = (post) => {
    const modal = document.getElementById("postViewerModal");
    const mediaContainer = document.getElementById("postViewerMedia");
    const captionEl = document.getElementById("postViewerCaption");
    const musicRow = document.getElementById("postViewerMusicRow");
    const musicTitle = document.getElementById("postViewerMusicTitle");
    const tagsRow = document.getElementById("postViewerTagsRow");

    currentViewingPostId = post.id;
    currentViewingPost = post;
    loadPostInteractions(post.id);

    const optionsBtn = document.getElementById("postOptionsBtn");
    if (optionsBtn) optionsBtn.style.display = (post.user_id == userId) ? "block" : "none";

    let mediaArr = [];
    try {
      mediaArr = JSON.parse(post.media);
    } catch (e) {}
    if (mediaArr.length === 0) return;

    mediaContainer.innerHTML = mediaArr
      .map((m) =>
        m.type === "video"
          ? `<video src="${m.data}" autoplay muted loop style="max-width:100%; max-height:100%; flex-shrink:0;"></video>`
          : `<img src="${m.data}" style="max-width:100%; max-height:100%; flex-shrink:0;">`,
      )
      .join("");
    mediaContainer.style.overflowX = mediaArr.length > 1 ? "auto" : "hidden";
    mediaContainer.style.justifyContent = mediaArr.length > 1 ? "flex-start" : "center";

    captionEl.textContent = post.caption || "";
    let music = null;
    try {
      if (post.music) music = JSON.parse(post.music);
    } catch (e) {}
    if (music) {
      musicRow.style.display = "flex";
      musicTitle.textContent = music.title;
      playPostMusic(music);
    } else {
      musicRow.style.display = "none";
    }

    let tagsArr = [];
    try {
      if (post.tags) tagsArr = JSON.parse(post.tags);
    } catch (e) {}
    if (tagsArr.length > 0 && tagsRow) {
      tagsRow.style.display = "block";
      tagsRow.innerHTML = `<i class="fa-solid fa-user-tag" style="color:#ffcc00; margin-right:5px;"></i> Tagged: ${tagsArr.length} people`;
    } else if (tagsRow) {
      tagsRow.style.display = "none";
    }

    modal.style.display = "flex";
  };

  async function loadPostInteractions(postId) {
    const res = await fetch(`/getPostInteractions/${postId}/${userId}`);
    const data = await res.json();
    if (data.success) {
      interactionStates[postId] = data.data;
      updateInteractionUI(postId);
    }
  }

  function updateInteractionUI(postId) {
    if (postId !== currentViewingPostId) return;
    const state = interactionStates[postId];
    if (!state) return;

    document.getElementById("likeCount").innerText = state.likes;
    document.getElementById("commentCount").innerText = state.comments;
    document.getElementById("shareCount").innerText = state.shares;
    document.getElementById("saveCount").innerText = state.saves;

    const likeIcon = document.getElementById("likeIcon");
    likeIcon.className = state.isLiked ? "fa-solid fa-heart" : "fa-regular fa-heart";

    const saveIcon = document.getElementById("saveIcon");
    saveIcon.className = state.isSaved ? "fa-solid fa-bookmark" : "fa-regular fa-bookmark";
  }

  window.toggleLikePost = async () => {
    if (!currentViewingPostId) return;
    const postId = currentViewingPostId;
    if (interactionStates[postId].isLiking) return;
    interactionStates[postId].isLiking = true;

    const res = await fetch("/likePost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, userId, userName })
    });
    const data = await res.json();
    if (data.success) {
      interactionStates[postId].isLiked = data.liked;
      interactionStates[postId].likes = data.count;
      interactionStates[postId].isLiking = false;
      updateInteractionUI(postId);
    }
  };

  window.toggleSavePost = async () => {
    if (!currentViewingPostId) return;
    const postId = currentViewingPostId;
    if (interactionStates[postId].isSaving) return;
    interactionStates[postId].isSaving = true;

    const res = await fetch("/savePost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, userId, userName })
    });
    const data = await res.json();
    if (data.success) {
      interactionStates[postId].isSaved = data.saved;
      interactionStates[postId].saves = data.count;
      interactionStates[postId].isSaving = false;
      updateInteractionUI(postId);
    }
  };

  window.sharePostInteraction = async () => {
    if (!currentViewingPostId) return;
    const postId = currentViewingPostId;
    const res = await fetch("/sharePost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, userId, userName })
    });
    const data = await res.json();
    if (data.success) {
      interactionStates[postId].shares = data.count;
      updateInteractionUI(postId);
      showPopup("Post Shared!");
    }
  };

  window.openPostComments = async () => {
    if (!currentViewingPostId) return;
    const postId = currentViewingPostId;
    const modal = document.getElementById("postCommentsModal");
    const list = document.getElementById("postCommentsList");
    list.innerHTML = "Loading...";
    modal.style.display = "flex";

    const res = await fetch(`/getPostComments/${postId}`);
    const data = await res.json();
    list.innerHTML = "";
    if (data.comments.length === 0) {
      list.innerHTML = '<p style="color:#555; text-align:center;">No comments yet</p>';
    } else {
      data.comments.forEach(c => appendCommentToUI(c));
    }
  };

  window.sendPostComment = async () => {
    const input = document.getElementById("postCommentInput");
    const comment = input.value.trim();
    if (!comment || !currentViewingPostId) return;
    const postId = currentViewingPostId;

    const res = await fetch("/commentPost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, userId, userName, comment })
    });
    const data = await res.json();
    if (data.success) {
      input.value = "";
      interactionStates[postId].comments = data.count;
      updateInteractionUI(postId);
      // appendCommentToUI(data.comment);
    }
  };

  function appendCommentToUI(c) {
    const list = document.getElementById("postCommentsList");
    const noComments = list.querySelector("p");
    if (noComments) noComments.remove();

    const div = document.createElement("div");
    div.className = "post-comment-item";
    div.innerHTML = `
      <img src="${c.avatar || '/images/profile1.webp'}">
      <div class="comment-content">
        <div class="comment-user">${c.name}</div>
        <div class="comment-text">${c.comment}</div>
        <div class="comment-time">${window.timeAgo ? timeAgo(c.timestamp) : ''}</div>
      </div>
    `;
    list.appendChild(div);
    list.scrollTop = list.scrollHeight;
  }

  window.openInteractionUsers = async (type) => {
    if (!currentViewingPostId) return;
    const modal = document.getElementById("interactionUsersModal");
    const list = document.getElementById("interactionUsersList");
    const title = document.getElementById("interactionModalTitle");
    title.innerText = type.charAt(0).toUpperCase() + type.slice(1);
    list.innerHTML = "Loading...";
    modal.style.display = "flex";

    const res = await fetch(`/getInteractionUsers/${currentViewingPostId}/${type}`);
    const data = await res.json();
    list.innerHTML = "";
    data.users.forEach(u => {
      const d = document.createElement("div");
      d.className = "friend-item-mini";
      d.style.marginBottom = "10px";
      d.innerHTML = `<img src="${u.avatar || '/images/profile1.webp'}"> <div style="color:white; font-weight:bold;">${u.name}</div>`;
      list.appendChild(d);
    });
  };

  // Real-time Interaction Listeners
  socket.on("postLiked", ({ postId, userId: actorId, liked, count }) => {
    if (interactionStates[postId]) {
      interactionStates[postId].likes = count;
      if (actorId == userId) interactionStates[postId].isLiked = liked;
      updateInteractionUI(postId);
    }
  });
  socket.on("postSaved", ({ postId, userId: actorId, saved, count }) => {
    if (interactionStates[postId]) {
      interactionStates[postId].saves = count;
      if (actorId == userId) interactionStates[postId].isSaved = saved;
      updateInteractionUI(postId);
    }
  });
  socket.on("postShared", ({ postId, count }) => {
    if (interactionStates[postId]) {
      interactionStates[postId].shares = count;
      updateInteractionUI(postId);
    }
  });
  socket.on("postCommented", ({ postId, comment, count }) => {
    if (interactionStates[postId]) {
      interactionStates[postId].comments = count;
      updateInteractionUI(postId);
      const commentsModal = document.getElementById("postCommentsModal");
      if (postId === currentViewingPostId && commentsModal.style.display === "flex") {
        appendCommentToUI(comment);
      }
    }
  });

  // ================= POST OPTIONS MENU =================
  window.openPostActionSheet = () => {
    if (!currentViewingPost) return;
    const sheet = document.getElementById("postActionSheet");
    sheet.style.display = "block";
    updatePostVisibilityUI(currentViewingPost.isHidden);
    setTimeout(() => sheet.classList.add("active"), 10);
  };

  window.closePostActionSheet = () => {
    const sheet = document.getElementById("postActionSheet");
    sheet.classList.remove("active");
    setTimeout(() => sheet.style.display = "none", 300);
  };

  window.handleEditPostMusic = () => {
    closePostActionSheet();
    let music = null;
    try { if (currentViewingPost.music) music = JSON.parse(currentViewingPost.music); } catch(e){}
    openPostMusicPicker(music);
  };

  window.handleEditPostCaption = () => {
    closePostActionSheet();
    const modal = document.getElementById("editPostCaptionModal");
    const input = document.getElementById("editPostCaptionInput");
    input.value = currentViewingPost.caption || "";
    modal.style.display = "flex";
  };

  window.savePostCaption = async () => {
    const caption = document.getElementById("editPostCaptionInput").value.trim();
    const res = await fetch("/updatePostCaption", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: currentViewingPostId, userId, caption })
    });
    const data = await res.json();
    if (data.success) {
      socket.emit("postUpdated", { postId: currentViewingPostId, caption });
      if (currentViewingPost) currentViewingPost.caption = caption;
      document.getElementById("editPostCaptionModal").style.display = "none";
      if (window.showPopup) showPopup("Caption updated!");
    }
  };

  window.handleManagePostTags = () => {
    if (!currentViewingPost) return;
    closePostActionSheet();
    let tags = [];
    try { tags = JSON.parse(currentViewingPost.tags || "[]"); } catch(e){}
    selectedPostTaggedUsers = new Set(tags);
    openPostTagPicker();

    const confirmBtn = document.getElementById("confirmPostTagsBtn");
    const originalOnclick = confirmBtn.onclick;
    confirmBtn.onclick = async () => {
      if (currentViewingPostId) {
        const tagsArr = Array.from(selectedPostTaggedUsers);
        const res = await fetch("/updatePostTags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId: currentViewingPostId, userId, tags: tagsArr })
        });
        const data = await res.json();
        if (data.success) {
          socket.emit("postUpdated", { postId: currentViewingPostId, tags: tagsArr });
          if (currentViewingPost) currentViewingPost.tags = JSON.stringify(tagsArr);
          if (window.showPopup) showPopup("Tags updated!");
        }
        closePostTagPicker();
      } else { originalOnclick(); }
      confirmBtn.onclick = originalOnclick;
    };
  };

  window.handleTogglePostVisibility = async () => {
    const res = await fetch("/togglePostVisibility", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: currentViewingPostId, userId })
    });
    const data = await res.json();
    if (data.success) {
      socket.emit("postVisibilityChanged", { postId: currentViewingPostId, isHidden: data.isHidden, userId });
      if (currentViewingPost) currentViewingPost.isHidden = data.isHidden;
      updatePostVisibilityUI(data.isHidden);
      if (window.showPopup) showPopup(data.isHidden ? "Post hidden" : "Post visible");
    }
  };

  function updatePostVisibilityUI(isHidden) {
    const item = document.getElementById("visibilityToggleItem");
    if (item) {
      item.innerHTML = isHidden ? 
        '<i class="fa-solid fa-eye"></i> Unhide Post' : 
        '<i class="fa-solid fa-eye-slash"></i> Hide Post';
    }
  }

  window.handleDeletePost = () => {
    if (!currentViewingPostId) return;

    closePostActionSheet();
    const modal = document.getElementById("confirmModal");
    const text = document.getElementById("confirmText");
    const yesBtn = document.getElementById("confirmYesBtn");
    const noBtn = document.getElementById("confirmNoBtn");

    // Clear any previous handlers to avoid multiple calls
    yesBtn.onclick = null;
    noBtn.onclick = null;

    text.innerText = "Are you sure you want to delete this post?";
    modal.style.display = "flex";
    modal.style.zIndex = "10020"; // High z-index to appear above the post viewer
    modal.style.justifyContent = "center";
    modal.style.alignItems = "center";

    yesBtn.onclick = () => {
      modal.style.display = "none";
      fetch("/deletePost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: currentViewingPostId, userId })
      }).then(res => res.json()).then(data => {
        if (data.success) {
          socket.emit("postDeleted", { postId: currentViewingPostId });
          const item = document.querySelector(`.post-grid-item[data-id="${currentViewingPostId}"]`);
          if (item) item.remove();
          closePostViewer();
          if (window.showPopup) showPopup("Post deleted");
          const stat = document.getElementById("statPosts2");
          if (stat) stat.innerText = Math.max(0, parseInt(stat.innerText) - 1);
        }
      });
    };

    noBtn.onclick = () => {
      modal.style.display = "none";
    };
  };

  // ================= REAL-TIME LISTENERS =================
  socket.on("postUpdated", (data) => {
    const { postId, music, caption, tags } = data;
    if (currentViewingPostId == postId) {
      if (caption !== undefined) document.getElementById("postViewerCaption").textContent = caption;
      if (music !== undefined) {
        const musicRow = document.getElementById("postViewerMusicRow");
        const musicTitle = document.getElementById("postViewerMusicTitle");
        if (music) {
          musicRow.style.display = "flex";
          musicTitle.textContent = music.title;
          playPostMusic(music);
        } else {
          musicRow.style.display = "none";
          stopPostMusicPlayback();
        }
      }
      if (tags !== undefined) {
        const tagsRow = document.getElementById("postViewerTagsRow");
        if (tags && tags.length > 0) {
          tagsRow.style.display = "block";
          tagsRow.innerHTML = `<i class="fa-solid fa-user-tag" style="color:#ffcc00; margin-right:5px;"></i> Tagged: ${tags.length} people`;
        } else { tagsRow.style.display = "none"; }
      }
    }
  });

  socket.on("postDeleted", ({ postId }) => {
    if (currentViewingPostId == postId) closePostViewer();
    const item = document.querySelector(`.post-grid-item[data-id="${postId}"]`);
    if (item) item.remove();
  });

  socket.on("postVisibilityChanged", ({ postId, isHidden, userId: postOwnerId }) => {
    if (currentViewingPostId == postId && String(userId) !== String(postOwnerId) && isHidden) {
      closePostViewer();
    }
    const item = document.querySelector(`.post-grid-item[data-id="${postId}"]`);
    if (item && String(userId) !== String(postOwnerId)) {
      if (isHidden) item.style.display = "none";
      else item.style.display = "block";
    }
  });

  function playPostMusic(music) {
    stopPostMusicPlayback();
    const startTime = music.startTime || 0;
    if (music.source === "youtube") {
      postMusicPlayer = document.createElement("iframe");
      postMusicPlayer.src = `https://www.youtube.com/embed/${music.id}?autoplay=1&controls=0&modestbranding=1&rel=0&enablejsapi=1&start=${Math.floor(startTime)}&origin=${window.location.origin}`;

      postMusicPlayer.width = "1";
      postMusicPlayer.height = "1";
      postMusicPlayer.style.position = "absolute";
      postMusicPlayer.style.left = "-9999px";
      postMusicPlayer.onload = () => {
        if (postMusicPlayer && postMusicPlayer.contentWindow) {
          postMusicPlayer.contentWindow.postMessage(JSON.stringify({
            event: 'command',
            func: 'seekTo',
            args: [startTime, true]
          }), '*');
          postMusicPlayer.contentWindow.postMessage(JSON.stringify({
            event: 'command',
            func: 'playVideo',
            args: ''
          }), '*');
        }
      };
      document.body.appendChild(postMusicPlayer);
    } else {
      postMusicPlayer = document.createElement("audio");
      postMusicPlayer.src = music.audioUrl;
      postMusicPlayer.autoplay = true;
      postMusicPlayer.oncanplay = () => {
        if (postMusicPlayer) {
          postMusicPlayer.pause();
          postMusicPlayer.currentTime = startTime;
          postMusicPlayer.play();
        }
      };
      document.body.appendChild(postMusicPlayer);
    }
    postViewerMusicTimeout = setTimeout(
      () => stopPostMusicPlayback(),
      POST_MUSIC_DURATION * 1000,
    );
  }

  window.openPostTagPicker = () => {
    const modal = document.getElementById("postTagModal");
    modal.style.display = "flex";
    const input = document.getElementById("postTagSearchInput");
    const results = document.getElementById("postTagResultsList");

    results.innerHTML = '<p style="text-align:center; color:#888;">Type to search friends...</p>';
    input.value = "";
    input.focus();

    input.oninput = async (e) => {
      const query = e.target.value.trim();
      if (query.length < 2) return;

      const res = await fetch("/searchUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: query, userId, discoverMode: false }),
      });
      const data = await res.json();
      results.innerHTML = "";

      data.users.forEach((user) => {
        const d = document.createElement("div");
        d.className = "forward-friend-item";
        if (selectedPostTaggedUsers.has(user.id)) d.classList.add("selected");

        d.innerHTML = `
          <img src="${user.avatar || "/images/profile1.webp"}">
          <div class="forward-friend-info">
              <div class="forward-friend-name">${user.name}</div>
          </div>
          <div class="selection-check"><i class="fa-solid fa-circle-check"></i></div>
        `;

        d.onclick = () => {
          if (selectedPostTaggedUsers.has(user.id)) {
            selectedPostTaggedUsers.delete(user.id);
            d.classList.remove("selected");
          } else {
            selectedPostTaggedUsers.add(user.id);
            d.classList.add("selected");
          }
          document.getElementById("taggedUsersCount").innerText = `${selectedPostTaggedUsers.size} people`;
        };
        results.appendChild(d);
      });
    };
  };

  window.closePostTagPicker = () => {
    document.getElementById("postTagModal").style.display = "none";
  };

  document.getElementById("confirmPostTagsBtn").onclick = () => {
    closePostTagPicker();
  };

  document.getElementById("publishPostBtn").onclick = async () => {
    if (postMedia.length === 0)
      return window.showPopup ? showPopup("Please select some media") : null;
    const caption = document.getElementById("postCaption").value;
    const res = await fetch("/uploadPost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        media: postMedia,
        caption,
        music: selectedPostMusic,
        tags: Array.from(selectedPostTaggedUsers),
      }),
    });
    const data = await res.json();
    if (data.success) {
      if (window.showPopup) showPopup("Post Shared!");
      closePostEditor();
      socket.emit("newPost", { userId });
      const stat = document.getElementById("statPosts2");
      if (stat) stat.innerText = parseInt(stat.innerText) + 1;
    }
  };

  window.openPostGallery = async (targetUserId) => {
    const res = await fetch(`/getPosts/${targetUserId}?requesterId=${userId}`);
    const data = await res.json();
    const grid = document.getElementById("postGrid");
    grid.innerHTML = "";
    if (!data.success || !data.posts || data.posts.length === 0) {
      grid.innerHTML =
        '<p style="color: #555; text-align: center; width: 100%; padding: 40px;">No posts yet</p>';
    } else {
      data.posts.forEach((post) => {
        let mediaArr = [];
        try {
          mediaArr = JSON.parse(post.media);
        } catch (e) {}
        if (mediaArr.length === 0) return;
        const firstMedia = mediaArr[0];
        const item = document.createElement("div");
        item.className = "post-grid-item";
        item.setAttribute("data-id", post.id);
        item.innerHTML =
          firstMedia.type === "video"
            ? `<video src="${firstMedia.data}"></video>`
            : `<img src="${firstMedia.data}">`;
        item.onclick = () => openPostViewer(post);
        if (mediaArr.length > 1)
          item.innerHTML += `<div class="multi-media-icon"><i class="fa-solid fa-clone"></i></div>`;
        grid.appendChild(item);
      });
    }
    document.getElementById("postGalleryModal").style.display = "flex";
  };

  // Global Real-time Tagging Listener
  socket.on("postTaggedNotification", (data) => {
    if (window.showPopup) showPopup(`${data.senderName} tagged you in a post`);

    // Dynamically add to UI if notification functions are present
    if (window.addNotificationToUI) {
      window.addNotificationToUI({
        id: Date.now(),
        sender_id: data.senderId,
        senderName: data.senderName,
        senderAvatar: data.senderAvatar,
        type: `post_tag:${data.postId}`,
        status: "unread",
        timestamp: new Date().toISOString()
      });
    }

    // Setup ability to click notification to open post viewer (handled by render logic in chat.js)
    // Ensure openPostViewer is globally accessible for the click handler
    window._openPostById = async (postId, senderId) => {
      const res = await fetch(`/getPosts/${senderId}`);
      const pData = await res.json();
      const post = pData.posts.find(p => p.id == postId);
      if (post) openPostViewer(post);
    };
  });
})();
