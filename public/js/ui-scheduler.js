// public/js/ui-scheduler.js

export function renderScheduler(viewMode, items, screens, selectedDate, selectedScreenId) {
    const container = document.getElementById('scheduler-view-container');
    if (!container) return;
    container.innerHTML = '';

    const now = new Date();
    const isToday = now.getFullYear() === selectedDate.getFullYear() &&
                  now.getMonth() === selectedDate.getMonth() &&
                  now.getDate() === selectedDate.getDate();
    const currentHour = isToday ? now.getHours() : -1;

    const grid = document.createElement('div');
    grid.className = 'scheduler-container';
    
    const headerRow = document.createElement('div');
    headerRow.className = 'scheduler-header';
    grid.appendChild(headerRow);

    const timeline = document.createElement('div');
    timeline.className = 'timeline';
    for (let i = 0; i <= 23; i++) { 
        const timeSlot = document.createElement('div');
        timeSlot.className = 'time-slot';
        if (i === currentHour) {
            timeSlot.classList.add('current-hour');
        }
        
        const ampm = i >= 12 ? 'PM' : 'AM';
        let hour = i % 12;
        if (hour === 0) hour = 12; 
        timeSlot.textContent = `${hour} ${ampm}`;
        
        timeline.appendChild(timeSlot);
    }
    grid.appendChild(timeline);

    if (viewMode === 'day') {
        const columnDefinition = `repeat(${screens.length}, minmax(170px, 1fr))`;
        grid.style.gridTemplateColumns = `80px ${columnDefinition}`;
        headerRow.style.gridTemplateColumns = `80px ${columnDefinition}`;

        headerRow.appendChild(document.createElement('div'));
        screens.forEach(screen => {
            const header = document.createElement('div');
            header.textContent = screen.name;
            headerRow.appendChild(header);
        });
    } else if (viewMode === 'screen') {
        const columnDefinition = `repeat(7, minmax(170px, 1fr))`;
        grid.style.gridTemplateColumns = `80px ${columnDefinition}`;
        headerRow.style.gridTemplateColumns = `80px ${columnDefinition}`;

        headerRow.appendChild(document.createElement('div'));
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        days.forEach(day => {
            const header = document.createElement('div');
            header.textContent = day;
            headerRow.appendChild(header);
        });
    }

    container.appendChild(grid);

    if (isToday && headerRow.offsetHeight > 0) {
        const headerHeight = headerRow.offsetHeight;
        const hourHeight = 60;
        const highlight = document.createElement('div');
        highlight.className = 'current-hour-highlight';
        highlight.style.top = `${headerHeight + (currentHour * hourHeight)}px`;
        grid.appendChild(highlight);
    }

    if (viewMode === 'day') {
        screens.forEach(screen => {
            const column = document.createElement('div');
            column.className = 'screen-column';
            column.dataset.screenId = screen.id;
            grid.appendChild(column);
        });
        
        const dayStart = new Date(selectedDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(selectedDate);
        dayEnd.setHours(23, 59, 59, 999);

        const filteredItems = items.filter(item => {
            const startTime = item.startTime.toDate();
            const endTime = item.endTime.toDate();
            // Item is relevant if its time range overlaps with the current day's time range
            return startTime <= dayEnd && endTime >= dayStart;
        });

        filteredItems.forEach(item => {
            const startTime = item.startTime.toDate();
            const endTime = item.endTime.toDate();
            
            // Clamp the start and end times to the current day's boundaries
            const displayStartTime = startTime < dayStart ? dayStart : startTime;
            const displayEndTime = endTime > dayEnd ? dayEnd : endTime;

            const startHour = displayStartTime.getHours() + displayStartTime.getMinutes() / 60;
            // Add a small fraction for the end hour to ensure it fills to the end of the minute
            const endHour = displayEndTime.getHours() + displayEndTime.getMinutes() / 60 + (displayEndTime.getSeconds() / 3600);

            // Render only if there's a visible duration on this day
            if (endHour > startHour) {
                const top = startHour * 60; 
                const height = (endHour - startHour) * 60;

                item.screenIds.forEach(screenId => {
                    const column = grid.querySelector(`.screen-column[data-screen-id='${screenId}']`);
                    if (column) {
                        const scheduledDiv = document.createElement('div');
                        scheduledDiv.className = 'scheduled-item';
                        scheduledDiv.style.top = `${top}px`;
                        scheduledDiv.style.height = `${height}px`;
                        scheduledDiv.dataset.id = item.id;
                        const contentName = item.content?.data?.name || 'Untitled Content';
                        scheduledDiv.innerHTML = `<div class="item-media-name" title="${contentName}">${contentName}</div>`;
                        column.appendChild(scheduledDiv);
                    }
                });
            }
        });

    } else if (viewMode === 'screen') {
        // This view is less affected by multi-day issues but we'll apply similar logic for consistency
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; // Match JS getDay()
        days.forEach((_, index) => {
            const column = document.createElement('div');
            column.className = 'day-column';
            column.dataset.day = index; // 0 for Sunday, 1 for Monday, etc.
            grid.appendChild(column);
        });

        const startOfWeek = new Date(selectedDate);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + (startOfWeek.getDay() === 0 ? -6 : 1)); 
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);

        if (!selectedScreenId) {
            return;
        }

        const filteredItems = items.filter(item => {
            if (!item.screenIds.includes(selectedScreenId)) return false;
            const itemTime = item.startTime.toDate();
            return itemTime >= startOfWeek && itemTime < endOfWeek;
        });

        filteredItems.forEach(item => {
            const startTime = item.startTime.toDate();
            const endTime = item.endTime.toDate();
            const startHour = startTime.getHours() + startTime.getMinutes() / 60;
            const endHour = endTime.getHours() + endTime.getMinutes() / 60;
            const top = startHour * 60;
            const height = (endHour - startHour) * 60;

            const day = startTime.getDay(); // 0 for Sunday, 1 for Monday, etc.
            const column = grid.querySelector(`.day-column[data-day='${day}']`);
            
            if (column) {
                const scheduledDiv = document.createElement('div');
                scheduledDiv.className = 'scheduled-item';
                scheduledDiv.style.top = `${top}px`;
                scheduledDiv.style.height = `${height}px`;
                scheduledDiv.dataset.id = item.id;
                const contentName = item.content?.data?.name || 'Untitled Content';
                scheduledDiv.innerHTML = `<div class="item-media-name" title="${contentName}">${contentName}</div>`;
                column.appendChild(scheduledDiv);
            }
        });
    }
}