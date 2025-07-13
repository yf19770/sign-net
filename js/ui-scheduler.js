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
        
        // --- FIX: Convert to 12-hour AM/PM format ---
        const ampm = i >= 12 ? 'PM' : 'AM';
        let hour = i % 12;
        if (hour === 0) hour = 12; // 0 becomes 12 AM, 12 stays 12 PM
        timeSlot.textContent = `${hour} ${ampm}`;
        
        timeline.appendChild(timeSlot);
    }
    grid.appendChild(timeline);

    // --- RENDER HEADER CONTENT & DEFINE GRID COLUMNS (must happen before calculating height) ---
    if (viewMode === 'day') {
        // --- FIX: Use minmax to make columns responsive and scrollable ---
        const columnDefinition = `repeat(${screens.length}, minmax(170px, 1fr))`;
        grid.style.gridTemplateColumns = `80px ${columnDefinition}`;
        headerRow.style.gridTemplateColumns = `80px ${columnDefinition}`;

        headerRow.appendChild(document.createElement('div')); // Placeholder for timeline
        screens.forEach(screen => {
            const header = document.createElement('div');
            header.textContent = screen.name;
            headerRow.appendChild(header);
        });
    } else if (viewMode === 'screen') {
        // --- FIX: Use minmax for week view as well ---
        const columnDefinition = `repeat(7, minmax(170px, 1fr))`;
        grid.style.gridTemplateColumns = `80px ${columnDefinition}`;
        headerRow.style.gridTemplateColumns = `80px ${columnDefinition}`;

        headerRow.appendChild(document.createElement('div')); // Placeholder for timeline
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        days.forEach(day => {
            const header = document.createElement('div');
            header.textContent = day;
            headerRow.appendChild(header);
        });
    }

    // Append grid to container BEFORE calculating height to ensure it's in the DOM
    container.appendChild(grid);

    // --- FIX: Calculate highlight position AFTER the header is rendered in the DOM ---
    if (isToday) {
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
        
        const filteredItems = items.filter(item => {
            const itemDate = item.startTime.toDate();
            return itemDate.getFullYear() === selectedDate.getFullYear() &&
                   itemDate.getMonth() === selectedDate.getMonth() &&
                   itemDate.getDate() === selectedDate.getDate();
        });

        filteredItems.forEach(item => {
            const startTime = item.startTime.toDate();
            const endTime = item.endTime.toDate();
            const startHour = startTime.getHours() + startTime.getMinutes() / 60;
            const endHour = endTime.getHours() + endTime.getMinutes() / 60;
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
                    scheduledDiv.innerHTML = `<div class="item-media-name" title="${item.media.name}">${item.media.name}</div>`;
                    column.appendChild(scheduledDiv);
                }
            });
        });

    } else if (viewMode === 'screen') {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        days.forEach((_, index) => {
            const column = document.createElement('div');
            column.className = 'day-column';
            column.dataset.day = index + 1;
            grid.appendChild(column);
        });

        const startOfWeek = new Date(selectedDate);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + (startOfWeek.getDay() === 0 ? -6 : 1));
        startOfWeek.setHours(0, 0, 0,.0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);

        if (!selectedScreenId) {
            // No need to append grid again, it's already there
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

            const day = startTime.getDay();
            const dayIndex = day === 0 ? 7 : day;
            const column = grid.querySelector(`.day-column[data-day='${dayIndex}']`);
            
            if (column) {
                const scheduledDiv = document.createElement('div');
                scheduledDiv.className = 'scheduled-item';
                scheduledDiv.style.top = `${top}px`;
                scheduledDiv.style.height = `${height}px`;
                scheduledDiv.dataset.id = item.id;
                scheduledDiv.innerHTML = `<div class="item-media-name" title="${item.media.name}">${item.media.name}</div>`;
                column.appendChild(scheduledDiv);
            }
        });
    }

    // No need to append grid again, it was appended earlier
}