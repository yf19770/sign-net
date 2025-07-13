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
}

export function hideModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
}

export function renderScreens(screens) {
    const screensTableBody = document.getElementById('screens-table-body');
    if (!screensTableBody) return;
    screensTableBody.innerHTML = '';
    if (screens.length === 0) {
        screensTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 40px; color: var(--text-muted);">No screens found. Click "Add New Screen" to get started.</td></tr>`;
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
                    <i class="fas fa-copy" title="Copy View URL"></i>
                    <i class="fas fa-pen-to-square" title="Edit"></i>
                    <i class="fas fa-trash-can" title="Delete"></i>
                </div>
              </td>
         `;
            screensTableBody.appendChild(row);
        });
    }
}

/**
 * Creates a single media item element for the grid.
 */
export function createMediaItemElement(item, globalDefaultImage) {
    const mediaDiv = document.createElement('div');
    mediaDiv.className = 'media-item skeleton-container';
    mediaDiv.dataset.id = item.id;
    mediaDiv.dataset.storagePath = item.storagePath;
    mediaDiv.dataset.media = JSON.stringify({ name: item.name, url: item.url });

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

    const isGlobalDefault = globalDefaultImage && globalDefaultImage.url === item.url;
    const fallbackIndicator = document.createElement('i');
    fallbackIndicator.className = `fas fa-star global-fallback-indicator ${isGlobalDefault ? 'active' : ''}`;
    fallbackIndicator.title = "Set as Global Fallback";
    mediaDiv.appendChild(fallbackIndicator);

    return mediaDiv;
}

export function renderDashboard(screensWithState, media, schedules) {
    const onlineCount = screensWithState.filter(s => s.status === 'online').length;
    document.getElementById('widget-screen-status-value').innerHTML = `<span class="online">${onlineCount}</span> / <span class="total">${screensWithState.length}</span>`;
    document.getElementById('widget-media-count-value').textContent = media.length;

    const liveViewGrid = document.getElementById('live-view-grid');
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
            itemDiv.innerHTML = `<div class="time">${time}</div><div class="details">Displaying <span>${item.media.name}</span> on ${item.screenIds.length} screen(s).</div>`;
            upcomingList.appendChild(itemDiv);
        });
    }
}

export function populateScreenModal(allMedia, screenToEdit = null) {
    document.getElementById('screen-modal-title').textContent = screenToEdit ? 'Edit Screen' : 'Add New Screen';
    document.getElementById('screen-id-edit-storage').value = screenToEdit ? screenToEdit.id : '';
    document.getElementById('screen-name-input').value = screenToEdit ? screenToEdit.name : '';
    document.getElementById('screen-id-input').value = screenToEdit ? screenToEdit.id : '';
    document.getElementById('screen-id-input').readOnly = !!screenToEdit;

    const imagePickerContainer = document.getElementById('screen-default-image-picker');
    imagePickerContainer.innerHTML = '';

    allMedia.forEach(item => {
        const imgItem = document.createElement('div');
        imgItem.className = 'image-picker-item';
        const mediaDataString = JSON.stringify({ name: item.name, url: item.url });
        imgItem.dataset.media = mediaDataString;
        imgItem.innerHTML = `<img src="${item.url}" title="${item.name}"><div class="clear-selection-btn"><i class="fas fa-times"></i></div>`;
        
        if (screenToEdit && screenToEdit.defaultImage && screenToEdit.defaultImage.url === item.url) {
            imgItem.classList.add('selected');
        }

        imgItem.onclick = (e) => {
            if (e.target.closest('.clear-selection-btn')) {
                imgItem.classList.remove('selected');
                return;
            }
            if (imgItem.classList.contains('selected')) return;
            imagePickerContainer.querySelector('.selected')?.classList.remove('selected');
            imgItem.classList.add('selected');
        };
        
        imagePickerContainer.appendChild(imgItem);
    });

    showModal('modal-add-screen');
}

export function populateSchedulerModal(screens, media, existingItem = null) {
    const screenSelectContainer = document.getElementById('schedule-screen-select');
    const imagePickerContainer = document.getElementById('schedule-image-picker');
    const startInput = document.getElementById('schedule-start-time');
    const endInput = document.getElementById('schedule-end-time');
    const modalTitle = document.getElementById('schedule-modal-title');
    const saveButton = document.getElementById('save-schedule-btn');
    const deleteButton = document.getElementById('delete-schedule-btn');
    const idStorage = document.getElementById('schedule-id-edit-storage');

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
        if (existingItem && existingItem.screenIds.includes(screen.id)) {
            item.classList.add('selected');
        }
        screenSelectContainer.appendChild(item);
    });

    imagePickerContainer.innerHTML = '';
    media.forEach(item => {
        const imgItem = document.createElement('div');
        imgItem.className = 'image-picker-item';
        const mediaDataString = JSON.stringify({ name: item.name, url: item.url });
        imgItem.dataset.media = mediaDataString;
        imgItem.innerHTML = `<img src="${item.url}" title="${item.name}">`;
        imgItem.onclick = () => {
            imagePickerContainer.querySelector('.selected')?.classList.remove('selected');
            imgItem.classList.add('selected');
        };
        if (existingItem && existingItem.media.url === item.url) {
            imgItem.classList.add('selected');
        }
        imagePickerContainer.appendChild(imgItem);
    });

    if (existingItem) {
        idStorage.value = existingItem.id;
        modalTitle.textContent = 'Edit Schedule Item';
        saveButton.textContent = 'Update Schedule';
        deleteButton.classList.remove('hidden');

        const toLocalISOString = (date) => {
            const tzoffset = (new Date()).getTimezoneOffset() * 60000;
            return (new Date(date - tzoffset)).toISOString().slice(0, 16);
        }
        
        startInput.value = toLocalISOString(existingItem.startTime.toDate());
        endInput.value = toLocalISOString(existingItem.endTime.toDate());
    } else {
        const now = new Date();
        const toLocalISOString = (date) => {
            const tzoffset = (new Date()).getTimezoneOffset() * 60000;
            return (new Date(date - tzoffset)).toISOString().slice(0, 16);
        };
        startInput.value = toLocalISOString(now);
        now.setHours(now.getHours() + 1);
        endInput.value = toLocalISOString(now);
    }
}