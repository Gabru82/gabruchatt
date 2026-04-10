(function () {
  const userId = localStorage.getItem("userId");
  const socket = io();
  let postMedia = [];
  let selectedPostMusic = null;
  let selectedPostTaggedUsers = new Set();

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

  // Trigger postGalleryModal on statPosts2 click
  const statPostsBtn = document.getElementById("statPosts2");
  if (statPostsBtn) {
    const target = statPostsBtn.closest(".stat-box") || statPostsBtn;
    target.style.cursor = "pointer";
    target.onclick = (e) => {
      e.stopPropagation();
      openPostGallery(userId);
    };
  }

  window.openPostModal = () => {
    postMedia = [];
    selectedPostMusic = null;
    selectedPostTaggedUsers.clear();
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

  window.openPostMusicPicker = () => {
    document.getElementById("postMusicPickerModal").style.display = "flex";
    document.getElementById("postMusicSearchInput").value = "";
    document.getElementById("postMusicResultsList").innerHTML =
      '<p style="text-align:center; color:#888;">Type to search music for your post...</p>';
    document.getElementById("postMusicPreviewPlayer").style.display = "none";
    document.getElementById("postMusicTrimmer").style.display = "none";
    document.getElementById("postConfirmMusicBtn").style.display = "none";
    postSegmentStartTime = 0;
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

  document.getElementById("postConfirmMusicBtn").onclick = () => {
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

    let mediaArr = [];
    try {
      mediaArr = JSON.parse(post.media);
    } catch (e) {}
    if (mediaArr.length === 0) return;

    mediaContainer.innerHTML = mediaArr
      .map((m) =>
        m.type === "video"
          ? `<video src="${m.data}" autoplay muted loop style="max-width:100%; max-height:100%;"></video>`
          : `<img src="${m.data}" style="max-width:100%; max-height:100%;">`,
      )
      .join("");

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
    modal.style.display = "flex";
  };

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
    const res = await fetch(`/getPosts/${targetUserId}`);
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
