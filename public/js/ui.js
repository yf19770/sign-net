// public/js/ui.js

export function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    toast.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3800);
}

export function showModal(id) {
    document.getElementById(id).classList.add('active');
    if (id === 'modal-enter-pin') {
        const pinInput = document.getElementById('pairing-pin-input');
        if (pinInput) { pinInput.value = ''; setTimeout(() => pinInput.focus(), 100); }
    }
}

export function hideModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
}

export function renderScreens(screens) {
    const screensTableBody = document.getElementById('screens-table-body');
    if (!screensTableBody) return;
    screensTableBody.innerHTML = '';
    if (screens.length === 0) {
        screensTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 40px; color: var(--text-muted);">No screens created. Click "Add Screen" to get started.</td></tr>`;
    } else {
        screens.forEach(screen => {
            const row = document.createElement('tr');
            row.dataset.id = screen.id;
            row.innerHTML = `
                <td data-label="Screen Name" class="screen-name">${screen.name}</td>
                <td data-label="Screen ID" class="screen-id">${screen.id}</td>
                <td data-label="Status"><span class="status-dot ${screen.status || 'offline'}">${screen.status || 'Offline'}</span></td>
                <td data-label="Actions" class="action-buttons">
                    <div>
                        <i class="fas fa-link" title="Pair Screen"></i>
                        <i class="fas fa-pen-to-square" title="Edit"></i>
                        <i class="fas fa-trash-can" title="Delete"></i>
                    </div>
                </td>
            `;
            screensTableBody.appendChild(row);
        });
    }
}

export function createMediaItemElement(item, globalDefaultContent) {
    const mediaDiv = document.createElement('div');
    mediaDiv.className = 'media-item skeleton-container';
    mediaDiv.dataset.id = item.id;
    mediaDiv.dataset.storagePath = item.storagePath;
    const contentData = { type: 'image', data: { name: item.name, url: item.url, storagePath: item.storagePath } };
    
    mediaDiv.dataset.content = JSON.stringify(contentData);
    
    mediaDiv.dataset.media = JSON.stringify(contentData.data);
    const img = document.createElement('img');
    img.className = 'lazy-image';
    img.src = item.url;
    img.alt = item.name;
    mediaDiv.appendChild(img);
    const overlay = document.createElement('div');
    overlay.className = 'media-overlay';
    const filename = document.createElement('p');
    filename.className = 'media-filename';
    filename.contentEditable = true;
    filename.dataset.id = item.id;
    filename.dataset.originalName = item.name;
    filename.textContent = item.name;
    overlay.appendChild(filename);
    mediaDiv.appendChild(overlay);
    const actionsBar = document.createElement('div');
    actionsBar.className = 'media-actions-bar';
    const saveBtn = document.createElement('i');
    saveBtn.className = 'fas fa-save media-save-btn hidden';
    saveBtn.title = "Save Name";
    const deleteBtn = document.createElement('i');
    deleteBtn.className = 'fas fa-trash-can';
    deleteBtn.title = "Delete";
    actionsBar.appendChild(saveBtn);
    actionsBar.appendChild(deleteBtn);
    mediaDiv.appendChild(actionsBar);
    const isGlobalDefault = globalDefaultContent && globalDefaultContent.type === 'image' && globalDefaultContent.data.url === item.url;
    const fallbackIndicator = document.createElement('i');
    fallbackIndicator.className = `fas fa-star global-fallback-indicator ${isGlobalDefault ? 'active' : ''}`;
    fallbackIndicator.title = "Set as Global Fallback";
    mediaDiv.appendChild(fallbackIndicator);
    return mediaDiv;
}

export function renderMedia(media, globalDefaultContent) {
    const mediaGrid = document.getElementById('media-grid-container');
    if (!mediaGrid) return;
    mediaGrid.innerHTML = '';
    if (media.length === 0) {
        mediaGrid.innerHTML = `<p class="empty-state-text" style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 40px 0;">No images uploaded yet.</p>`;
    } else {
        media.forEach(item => {
            const element = createMediaItemElement(item, globalDefaultContent);
            mediaGrid.appendChild(element);
        });
    }
}

export function renderPlaylists(playlists, globalDefaultContent) {
    const playlistGrid = document.getElementById('playlist-grid-container');
    if (!playlistGrid) return;
    playlistGrid.innerHTML = '';
    if (playlists.length === 0) {
        const ctaCard = document.createElement('div');
        ctaCard.className = 'playlist-card-cta';
        ctaCard.id = 'create-first-playlist-cta';
        ctaCard.innerHTML = `<i class="fas fa-plus-circle icon"></i><span class="text">Create Your First Playlist</span>`;
        playlistGrid.appendChild(ctaCard);
    } else {
        playlists.forEach(playlist => {
            const card = document.createElement('div');
            card.className = 'playlist-card';
            const contentData = { type: 'playlist', data: { id: playlist.id, name: playlist.name } };
            card.dataset.playlist = JSON.stringify(playlist);
            card.dataset.content = JSON.stringify(contentData);

            const isGlobalDefault = globalDefaultContent && globalDefaultContent.type === 'playlist' && globalDefaultContent.data.id === playlist.id;

            card.innerHTML = `
                <i class="fas fa-star global-fallback-indicator ${isGlobalDefault ? 'active' : ''}" title="Set as Global Fallback"></i>
                <div class="playlist-card-content">
                    <i class="fas fa-layer-group icon"></i>
                    <span class="name">${playlist.name}</span>
                    <span class="count">${playlist.items.length} item${playlist.items.length !== 1 ? 's' : ''}</span>
                </div>
            `;
            playlistGrid.appendChild(card);
        });
    }
}

export function renderDashboard(screensWithState, media, schedules) {
    const onlineCount = screensWithState.filter(s => s.status === 'online').length;
    const mediaCount = media.length;
    const screenStatusValueEl = document.getElementById('widget-screen-status-value');
    const mediaCountValueEl = document.getElementById('widget-media-count-value');
    if (screenStatusValueEl) {
        screenStatusValueEl.innerHTML = `<span class="online">${onlineCount}</span> / <span class="total">${screensWithState.length}</span>`;
    }
    if (mediaCountValueEl) {
        mediaCountValueEl.textContent = mediaCount;
    }

    const liveViewGrid = document.getElementById('live-view-grid');
    if (!liveViewGrid) return;
    liveViewGrid.innerHTML = '';
    screensWithState.forEach(screen => {
        const previewDiv = document.createElement('div');
        previewDiv.className = 'screen-preview';
        const imageUrl = screen.currentImageURL || 'https://via.placeholder.com/400x200/1E1E1E/9CA3AF?text=Offline+or+Idle';
        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-container skeleton-container';
        const img = document.createElement('img');
        img.className = 'lazy-image';
        img.src = imageUrl;
        img.alt = `${screen.name} content`;
        imageContainer.appendChild(img);
        previewDiv.appendChild(imageContainer);
        const screenInfoDiv = document.createElement('div');
        screenInfoDiv.className = 'screen-info';
        const nameSpan = document.createElement('span');
        nameSpan.className = 'name';
        nameSpan.textContent = screen.name;
        const statusSpan = document.createElement('span');
        statusSpan.className = `status-dot ${screen.status || 'offline'}`;
        statusSpan.textContent = screen.status || 'Offline';
        screenInfoDiv.appendChild(nameSpan);
        screenInfoDiv.appendChild(statusSpan);
        previewDiv.appendChild(screenInfoDiv);
        liveViewGrid.appendChild(previewDiv);
    });
    const upcomingList = document.getElementById('upcoming-schedule-list');
    if (!upcomingList) return;
    upcomingList.innerHTML = '';
    const now = new Date();
    const upcomingItems = schedules
        .filter(item => item.startTime.toDate() > now)
        .sort((a, b) => a.startTime.toDate() - b.startTime.toDate())
        .slice(0, 5); 
    if (upcomingItems.length === 0) {
        upcomingList.innerHTML = `<p style="color: var(--text-muted);">No upcoming scheduled events.</p>`;
    } else {
        upcomingItems.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'upcoming-item';
            const time = item.startTime.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const contentName = item.content.data.name || 'Untitled';
            itemDiv.innerHTML = `<div class="time">${time}</div><div class="details">Displaying <span>${contentName}</span> on ${item.screenIds.length} screen(s).</div>`;
            upcomingList.appendChild(itemDiv);
        });
    }
}

function createTabbedMediaPicker(containerId, media, playlists, selectedContent = null) {
    const pickerContainer = document.getElementById(containerId);
    if (!pickerContainer) return;
    pickerContainer.innerHTML = `
        <div class="modal-tabs">
            <button class="modal-tab active" data-tab="images">Images</button>
            <button class="modal-tab" data-tab="playlists">Playlists</button>
        </div>
        <div id="${containerId}-tab-images" class="tab-content active image-picker-grid"></div>
        <div id="${containerId}-tab-playlists" class="tab-content playlist-picker-list"></div>
    `;
    const imageTab = pickerContainer.querySelector(`#${containerId}-tab-images`);
    const playlistTab = pickerContainer.querySelector(`#${containerId}-tab-playlists`);
    media.forEach(item => {
        const imgItem = document.createElement('div');
        imgItem.className = 'image-picker-item';
        const contentData = { type: 'image', data: { name: item.name, url: item.url, storagePath: item.storagePath } };
        imgItem.dataset.content = JSON.stringify(contentData);
        imgItem.innerHTML = `<img src="${item.url}" title="${item.name}">`;
        imgItem.onclick = () => { pickerContainer.querySelector('.selected')?.classList.remove('selected'); imgItem.classList.add('selected'); };
        imageTab.appendChild(imgItem);
    });
    playlists.forEach(playlist => {
        const playlistItem = document.createElement('div');
        playlistItem.className = 'playlist-picker-item';
        const contentData = { type: 'playlist', data: { id: playlist.id, name: playlist.name } };
        playlistItem.dataset.content = JSON.stringify(contentData);
        playlistItem.innerHTML = `<i class="fas fa-layer-group"></i><span>${playlist.name}</span><span class="count">${playlist.items.length} items</span>`;
        playlistItem.onclick = () => { pickerContainer.querySelector('.selected')?.classList.remove('selected'); playlistItem.classList.add('selected'); };
        playlistTab.appendChild(playlistItem);
    });
    pickerContainer.querySelectorAll('.modal-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            pickerContainer.querySelector('.modal-tab.active')?.classList.remove('active');
            pickerContainer.querySelector('.tab-content.active')?.classList.remove('active');
            tab.classList.add('active');
            pickerContainer.querySelector(`#${containerId}-tab-${tab.dataset.tab}`).classList.add('active');
        });
    });
    if (selectedContent) {
        if (selectedContent.type === 'playlist') {
            pickerContainer.querySelector('.modal-tab[data-tab="playlists"]')?.click();
            const el = playlistTab.querySelector(`[data-content*='"id":"${selectedContent.data.id}"']`);
            el?.classList.add('selected');
        } else if (selectedContent.type === 'image') {
            const el = imageTab.querySelector(`[data-content*='"url":"${selectedContent.data.url}"']`);
            el?.classList.add('selected');
        }
    }
}

export function populateScreenEditModal(allMedia, allPlaylists, screenToEdit) {
    if (!screenToEdit) return;
    document.getElementById('screen-modal-title').textContent = 'Edit Screen';
    document.getElementById('screen-id-edit-storage').value = screenToEdit.id;
    document.getElementById('screen-name-input').value = screenToEdit.name;
    createTabbedMediaPicker('edit-screen-media-picker-container', allMedia, allPlaylists, screenToEdit.defaultContent);
}

export function populateAddScreenModal(allMedia, allPlaylists) {
    const nameInput = document.getElementById('add-screen-name-input');
    nameInput.value = '';
    createTabbedMediaPicker('add-screen-media-picker-container', allMedia, allPlaylists);
}

export function populateSchedulerModal(screens, media, playlists, existingItem = null) {
    const screenSelectContainer = document.getElementById('schedule-screen-select');
    const startInput = document.getElementById('schedule-start-time');
    const endInput = document.getElementById('schedule-end-time');
    const modalTitle = document.getElementById('schedule-modal-title');
    const saveButton = document.getElementById('save-schedule-btn');
    const deleteButton = document.getElementById('delete-schedule-btn');
    const idStorage = document.getElementById('schedule-id-edit-storage');

    createTabbedMediaPicker('schedule-media-picker-container', media, playlists, existingItem?.content);
    
    idStorage.value = '';
    deleteButton.classList.add('hidden');
    modalTitle.textContent = 'Create Schedule Item';
    saveButton.textContent = 'Save Schedule';
    screenSelectContainer.innerHTML = '';
    screens.forEach(screen => {
        const item = document.createElement('div');
        item.className = 'multi-select-item';
        item.dataset.id = screen.id;
        item.textContent = screen.name;
        item.onclick = () => item.classList.toggle('selected');
        if (existingItem?.screenIds.includes(screen.id)) {
            item.classList.add('selected');
        }
        screenSelectContainer.appendChild(item);
    });
    if (existingItem) {
        idStorage.value = existingItem.id;
        modalTitle.textContent = 'Edit Schedule Item';
        saveButton.textContent = 'Update Schedule';
        deleteButton.classList.remove('hidden');
        const toLocalISOString = (date) => new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        startInput.value = toLocalISOString(existingItem.startTime.toDate());
        endInput.value = toLocalISOString(existingItem.endTime.toDate());
    } else {
        const now = new Date();
        const toLocalISOString = (date) => new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        startInput.value = toLocalISOString(now);
        now.setHours(now.getHours() + 1);
        endInput.value = toLocalISOString(now);
    }
}

export function populatePlaylistEditor(allMedia, playlistToEdit = null) {
    const modalTitle = document.getElementById('playlist-modal-title');
    const nameInput = document.getElementById('playlist-name-input');
    const idStorage = document.getElementById('playlist-id-edit-storage');
    const deleteButton = document.getElementById('delete-playlist-btn');
    const slidesContainer = document.getElementById('playlist-slides-container');
    slidesContainer.querySelectorAll('.playlist-slide:not(.add-slide-card)').forEach(el => el.remove());
    if (playlistToEdit) {
        modalTitle.textContent = 'Edit Playlist';
        nameInput.value = playlistToEdit.name;
        idStorage.value = playlistToEdit.id;
        deleteButton.classList.remove('hidden');
        playlistToEdit.items.forEach(item => { addSlideToPlaylistEditor(item.media, item.duration); });
    } else {
        modalTitle.textContent = 'Create Playlist';
        nameInput.value = '';
        idStorage.value = '';
        deleteButton.classList.add('hidden');
    }
}

export function addSlideToPlaylistEditor(mediaData, duration = 10) {
    const slidesContainer = document.getElementById('playlist-slides-container');
    const addSlideButton = document.getElementById('add-slide-btn');
    const slideEl = document.createElement('div');
    slideEl.className = 'playlist-slide';
    slideEl.dataset.media = JSON.stringify(mediaData);
    slideEl.dataset.duration = duration;

    slideEl.innerHTML = `
        <img src="${mediaData.url}" alt="${mediaData.name}" draggable="false">
        <div class="remove-slide-btn" title="Remove from playlist"><i class="fas fa-times"></i></div>
        <div class="duration-editor">
            <i class="fas fa-clock"></i>
            <span class="duration-text">${duration}s</span>
            <input type="number" value="${duration}" class="duration-input" hidden>
        </div>
    `;
    // Set draggable property AFTER innerHTML assignment to avoid it being overwritten.
    slideEl.draggable = true;

    slideEl.querySelector('.remove-slide-btn').addEventListener('click', () => slideEl.remove());
    const durationEditor = slideEl.querySelector('.duration-editor');
    const durationText = slideEl.querySelector('.duration-text');
    const durationInput = slideEl.querySelector('.duration-input');
    durationEditor.addEventListener('click', () => {
        durationText.hidden = true;
        durationInput.hidden = false;
        durationInput.focus();
        durationInput.select();
    });
    durationInput.addEventListener('blur', () => {
        const newDuration = parseInt(durationInput.value, 10) || 10;
        slideEl.dataset.duration = newDuration;
        durationInput.value = newDuration;
        durationText.textContent = `${newDuration}s`;
        durationText.hidden = false;
        durationInput.hidden = true;
    });
    durationInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); durationInput.blur(); } });
    slidesContainer.insertBefore(slideEl, addSlideButton);
}

export function populateImageSelector(allMedia) {
    const grid = document.getElementById('playlist-image-selector-grid');
    grid.innerHTML = '';
    allMedia.forEach(item => {
        const imgItem = document.createElement('div');
        imgItem.className = 'image-picker-item';
        imgItem.dataset.media = JSON.stringify({ name: item.name, url: item.url, storagePath: item.storagePath });
        imgItem.innerHTML = `<img src="${item.url}" title="${item.name}"><div class="selection-indicator"><i class="fas fa-check"></i></div>`;
        imgItem.addEventListener('click', () => { imgItem.classList.toggle('selected'); });
        grid.appendChild(imgItem);
    });
}

export function updateGlobalDefaultIndicator(globalDefaultContent) {
    const allIndicators = document.querySelectorAll('.global-fallback-indicator');
    allIndicators.forEach(indicator => indicator.classList.remove('active'));
    if (!globalDefaultContent) return;

    let contentContainer;
    if (globalDefaultContent.type === 'image') {
        contentContainer = document.querySelector(`.media-item[data-content*='"url":"${globalDefaultContent.data.url}"']`);
    } else if (globalDefaultContent.type === 'playlist') {
        contentContainer = document.querySelector(`.playlist-card[data-content*='"id":"${globalDefaultContent.data.id}"']`);
    }

    if (contentContainer) {
        const indicatorToActivate = contentContainer.querySelector('.global-fallback-indicator');
        if (indicatorToActivate) {
            indicatorToActivate.classList.add('active');
        }
    }
}