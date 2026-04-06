(function() {
    const userId = localStorage.getItem("userId");
    const storyFileInput = document.getElementById("storyFileInput");
    let currentStoryMedia = null;
    let storiesData = [];
    let currentStoryIndex = 0;
    let storyTimer = null;

    storyFileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            currentStoryMedia = {
                data: ev.target.result,
                type: file.type.startsWith("video") ? "video" : "image"
            };
            openStoryEditor();
            storyFileInput.value = "";
        };
        reader.readAsDataURL(file);
    };

    function openStoryEditor() {
        const modal = document.getElementById("storyEditorModal");
        const preview = document.getElementById("storyMediaPreview");
        preview.innerHTML = currentStoryMedia.type === "video" 
            ? `<video src="${currentStoryMedia.data}" autoplay muted loop></video>`
            : `<img src="${currentStoryMedia.data}">`;
        modal.style.display = "flex";
    }

    window.closeStoryEditor = () => {
        document.getElementById("storyEditorModal").style.display = "none";
        currentStoryMedia = null;
        storyFileInput.value = "";
    };

    window.publishStory = async () => {
        if (!currentStoryMedia) return;
        const res = await fetch("/uploadStory", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId,
                media: currentStoryMedia.data,
                type: currentStoryMedia.type,
                overlays: []
            })
        });
        const data = await res.json();
        if (data.success) {
            closeStoryEditor();
            showPopup("Story Added!");
            socket.emit("newStory", { userId });
            loadStories();
        }
    };

    async function loadStories() {
        const res = await fetch(`/getStories/${userId}`);
        const data = await res.json();
        if (!data.success) return;
        storiesData = data.stories;
        renderStoryTray();
    }

    function renderStoryTray() {
        const tray = document.getElementById("storyTray");
        if (!tray) return;
        tray.innerHTML = "";
        
        // 1. Handle "Your Story" item first
        const myStories = storiesData.filter(s => s.user_id == userId);
        const hasMyStories = myStories.length > 0;
        const myAvatar = localStorage.getItem("userAvatar") || document.getElementById("profileBtn")?.src || getAvatarSrc(userId);

        const myItem = document.createElement("div");
        myItem.className = "story-item my-story-card";
        
        myItem.innerHTML = `
            <div class="story-circle ${hasMyStories ? '' : 'no-ring'}">
                <img src="${myAvatar}">
                <div class="add-story-overlay"><i class="fa-solid fa-plus"></i></div>
            </div>
            <div class="story-user-name">Your Story</div>
        `;

        myItem.onclick = () => {
            if (hasMyStories) openStoryViewer(userId);
            else storyFileInput.click();
        };

        const plusBtn = myItem.querySelector(".add-story-overlay");
        plusBtn.onclick = (e) => {
            e.stopPropagation();
            storyFileInput.click();
        };

        tray.appendChild(myItem);

        // 2. Group and render other users' stories
        const usersWithStories = {};
        storiesData.forEach(s => {
            if (s.user_id == userId) return; // Skip self as handled above
            if (!usersWithStories[s.user_id]) {
                usersWithStories[s.user_id] = {
                    name: s.name,
                    avatar: s.avatar,
                    stories: []
                };
            }
            usersWithStories[s.user_id].stories.push(s);
        });

        Object.keys(usersWithStories).forEach(uid => {
            const user = usersWithStories[uid];
            const item = document.createElement("div");
            item.className = "story-item";
            item.onclick = () => openStoryViewer(uid);
            item.innerHTML = `
                <div class="story-circle">
                    <img src="${user.avatar || getAvatarSrc(uid)}">
                </div>
                <div class="story-user-name">${user.name}</div>
            `;
            tray.appendChild(item);
        });
    }

    function openStoryViewer(selectedUserId) {
        const userStories = storiesData.filter(s => s.user_id == selectedUserId);
        if (userStories.length === 0) return;
        
        currentStoryIndex = 0;
        const modal = document.getElementById("storyViewerModal");
        modal.style.display = "flex";
        displayStory(userStories);
    }

    function displayStory(userStories) {
        const story = userStories[currentStoryIndex];
        const viewer = document.getElementById("storyViewerMedia");
        const avatar = document.getElementById("storyUserAvatar");
        const name = document.getElementById("storyUserName");
        const delBtn = document.getElementById("deleteStoryBtn");

        avatar.src = story.avatar || getAvatarSrc(story.user_id);
        name.textContent = story.name;
        avatar.dataset.uid = story.user_id;
        delBtn.style.display = story.user_id == userId ? "block" : "none";
        delBtn.onclick = () => deleteStory(story.id);

        viewer.innerHTML = story.type === "video" 
            ? `<video id="viewerVideo" src="${story.media}" autoplay muted></video>`
            : `<img src="${story.media}">`;

        // Progress bars
        const progress = document.getElementById("storyProgress");
        progress.innerHTML = userStories.map((_, i) => `
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${i < currentStoryIndex ? '100%' : '0%'}"></div>
            </div>
        `).join("");

        const currentFill = progress.children[currentStoryIndex].querySelector(".progress-fill");
        clearTimeout(storyTimer);
        
        let start = null;
        const duration = 5000;
        function step(timestamp) {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            currentFill.style.width = Math.min(progress / duration * 100, 100) + "%";
            if (progress < duration) {
                storyTimer = requestAnimationFrame(step);
            } else {
                nextStory(userStories);
            }
        }
        storyTimer = requestAnimationFrame(step);
    }

    window.nextStory = (userStories) => {
        if (!userStories) userStories = storiesData.filter(s => s.user_id == document.getElementById("storyUserAvatar").dataset.uid);
        if (currentStoryIndex < userStories.length - 1) {
            currentStoryIndex++;
            displayStory(userStories);
        } else {
            closeStoryViewer();
        }
    };

    window.prevStory = (userStories) => {
        if (!userStories) userStories = storiesData.filter(s => s.user_id == document.getElementById("storyUserAvatar").dataset.uid);
        if (currentStoryIndex > 0) {
            currentStoryIndex--;
            displayStory(userStories);
        } else {
            // Optionally go to previous user or just stay
        }
    };

    window.closeStoryViewer = () => {
        cancelAnimationFrame(storyTimer);
        document.getElementById("storyViewerModal").style.display = "none";
    };

    async function deleteStory(storyId) {
        if (!confirm("Delete this story?")) return;
        const res = await fetch("/deleteStory", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ storyId, userId })
        });
        if (res.ok) {
            closeStoryViewer();
            socket.emit("newStory", { userId });
            loadStories();
        }
    }

    socket.on("storyUpdate", () => loadStories());
    
    // Init
    loadStories();
})();