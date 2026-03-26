/**
 * LocalLink — Real-Time Socket.io + Notification System
 * Include this script in all dashboard/authenticated pages
 */

(function() {
    let socket = null;
    let unreadCount = 0;

    // ── Connect Socket.io ──────────────────────────────────────────────────────
    function connectSocket() {
        const token = sessionStorage.getItem('token');
        if (!token) return;

        // Load socket.io client from server
        const script = document.createElement('script');
        script.src = '/socket.io/socket.io.js';
        script.onload = () => {
            socket = io({ auth: { token } });

            socket.on('connect', () => {
                console.log('[Socket.io] Connected:', socket.id);
                showToast('Live', 'Real-time updates active', 'success', 2000);
            });

            socket.on('disconnect', () => {
                console.log('[Socket.io] Disconnected');
            });

            socket.on('connect_error', (err) => {
                console.warn('[Socket.io] Connection error:', err.message);
            });

            // ── Event Listeners ────────────────────────────────────────────────

            // New notification event
            socket.on('new_notification', (data) => {
                unreadCount++;
                updateNotificationBadge(unreadCount);
                showToast(data.title, data.message, getToastType(data.type));
                // Refresh notification dropdown if open
                if (document.getElementById('notification-panel')?.classList.contains('show')) {
                    loadNotifications();
                }
            });

            // Payment success event
            socket.on('payment_success', (data) => {
                showToast('💳 Payment Confirmed!', `₹${data.amount} paid. +${data.points_earned} loyalty points earned!`, 'success', 5000);
                // Refresh loyalty widget if exists
                if (typeof loadLoyaltyData === 'function') loadLoyaltyData();
            });

            // Queue update event
            socket.on('queue_update', (data) => {
                if (data.position === 1) {
                    showToast('🔔 Your Turn Soon!', 'You are next in the queue! Get ready.', 'warning', 5000);
                }
            });
        };
        document.head.appendChild(script);
    }

    // ── Notification Badge ─────────────────────────────────────────────────────
    function updateNotificationBadge(count) {
        const badge = document.getElementById('notification-badge');
        if (!badge) return;
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    // ── Load Notifications from API ────────────────────────────────────────────
    async function loadNotifications() {
        const token = sessionStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch('/api/notifications', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success) {
                unreadCount = data.unread_count;
                updateNotificationBadge(unreadCount);
                renderNotificationPanel(data.notifications);
            }
        } catch (err) {
            console.error('Load notifications error:', err);
        }
    }

    // ── Render Notification Panel HTML ─────────────────────────────────────────
    function renderNotificationPanel(notifications) {
        const panel = document.getElementById('notification-list');
        if (!panel) return;

        if (!notifications || notifications.length === 0) {
            panel.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="fa-regular fa-bell-slash d-block mb-2 fa-2x opacity-25"></i>
                    <small>No notifications yet</small>
                </div>`;
            return;
        }

        panel.innerHTML = notifications.map(n => `
            <div class="notification-item px-3 py-2 border-bottom ${n.is_read ? '' : 'unread'}" 
                 data-id="${n.id}" onclick="markNotificationRead(${n.id}, this)">
                <div class="d-flex align-items-start gap-2">
                    <div class="notification-icon-sm ${getNotifIconClass(n.type)}">
                        <i class="${getNotifIcon(n.type)}"></i>
                    </div>
                    <div class="flex-grow-1 overflow-hidden">
                        <div class="fw-bold small text-dark text-truncate">${n.title}</div>
                        <div class="small text-muted" style="font-size: 0.78rem; line-height: 1.3;">${n.message}</div>
                        <div class="text-muted opacity-50" style="font-size: 0.7rem;">${timeAgo(new Date(n.created_at))}</div>
                    </div>
                    ${!n.is_read ? '<div class="notif-dot flex-shrink-0"></div>' : ''}
                </div>
            </div>
        `).join('');
    }

    // ── Mark Single Notification as Read ──────────────────────────────────────
    window.markNotificationRead = async function(id, el) {
        const token = sessionStorage.getItem('token');
        el.classList.remove('unread');
        el.querySelector('.notif-dot')?.remove();
        try {
            await fetch(`/api/notifications/${id}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (unreadCount > 0) {
                unreadCount--;
                updateNotificationBadge(unreadCount);
            }
        } catch (err) {}
    };

    // ── Mark All as Read ───────────────────────────────────────────────────────
    window.markAllNotificationsRead = async function() {
        const token = sessionStorage.getItem('token');
        try {
            await fetch('/api/notifications/read-all', {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            unreadCount = 0;
            updateNotificationBadge(0);
            document.querySelectorAll('.notification-item.unread').forEach(el => {
                el.classList.remove('unread');
                el.querySelector('.notif-dot')?.remove();
            });
        } catch (err) {}
    };

    // ── Toast Notifications ────────────────────────────────────────────────────
    window.showToast = function(title, message, type = 'info', duration = 4000) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = `
                position: fixed; top: 80px; right: 20px; z-index: 9999;
                display: flex; flex-direction: column; gap: 10px; max-width: 340px;
            `;
            document.body.appendChild(container);
        }

        const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
        const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };

        const toast = document.createElement('div');
        toast.style.cssText = `
            background: white; border-radius: 12px; padding: 14px 16px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.12); border-left: 4px solid ${colors[type] || colors.info};
            display: flex; align-items: flex-start; gap: 12px;
            animation: slideInRight 0.3s ease; font-family: 'Outfit', sans-serif;
            transition: opacity 0.3s ease, transform 0.3s ease;
        `;
        toast.innerHTML = `
            <i class="fa-solid ${icons[type] || icons.info} mt-1" style="color: ${colors[type]}; flex-shrink:0;"></i>
            <div>
                <div style="font-weight:700; font-size:0.85rem; color:#1e293b;">${title}</div>
                <div style="font-size:0.78rem; color:#64748b; margin-top:2px; line-height:1.4;">${message}</div>
            </div>
            <button onclick="this.parentElement.remove()" style="background:none;border:none;color:#94a3b8;cursor:pointer;margin-left:auto;flex-shrink:0;font-size:16px;">&times;</button>
        `;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(20px)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    };

    // ── Helper Functions ───────────────────────────────────────────────────────
    function getToastType(notifType) {
        const map = { booking: 'info', payment: 'success', queue: 'warning', loyalty: 'success', system: 'info' };
        return map[notifType] || 'info';
    }

    function getNotifIcon(type) {
        const map = { booking: 'fa-solid fa-calendar-check', payment: 'fa-solid fa-credit-card', queue: 'fa-solid fa-ticket', loyalty: 'fa-solid fa-star', system: 'fa-solid fa-bell' };
        return map[type] || 'fa-solid fa-bell';
    }

    function getNotifIconClass(type) {
        const map = { booking: 'notif-booking', payment: 'notif-payment', queue: 'notif-queue', loyalty: 'notif-loyalty', system: 'notif-system' };
        return map[type] || 'notif-system';
    }

    function timeAgo(date) {
        const diff = Math.floor((Date.now() - date.getTime()) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    }

    // ── Inject Notification Bell HTML into Navbar ──────────────────────────────
    window.injectNotificationBell = function() {
        // Find the auth-only nav div and add bell before the dropdown
        const authOnly = document.querySelector('.auth-only');
        if (!authOnly) return;

        // Check if bell is already injected
        if (document.getElementById('notification-bell-wrapper')) return;

        const bellWrapper = document.createElement('div');
        bellWrapper.id = 'notification-bell-wrapper';
        bellWrapper.className = 'position-relative';
        bellWrapper.innerHTML = `
            <button class="btn btn-sm btn-light rounded-circle position-relative notification-bell-btn"
                    id="notification-bell-btn" 
                    onclick="toggleNotificationPanel()"
                    style="width:36px;height:36px;padding:0;display:flex;align-items:center;justify-content:center;">
                <i class="fa-regular fa-bell" style="font-size:1rem;"></i>
                <span id="notification-badge" style="
                    display:none; position:absolute; top:-4px; right:-4px;
                    background:#ef4444; color:white; border-radius:50%;
                    width:18px; height:18px; font-size:0.6rem;
                    align-items:center; justify-content:center;
                    font-weight:700; border:2px solid white;
                "></span>
            </button>
            <div id="notification-panel" class="notification-panel shadow-lg" style="display:none;">
                <div class="notification-header d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
                    <span class="fw-bold small">Notifications</span>
                    <button class="btn btn-link btn-sm p-0 text-muted small" onclick="markAllNotificationsRead()">Mark all read</button>
                </div>
                <div id="notification-list" style="max-height:320px;overflow-y:auto;"></div>
            </div>
        `;

        authOnly.insertBefore(bellWrapper, authOnly.firstChild);
        loadNotifications();
    };

    window.toggleNotificationPanel = function() {
        const panel = document.getElementById('notification-panel');
        if (!panel) return;
        const isVisible = panel.style.display !== 'none';
        panel.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) loadNotifications();
    };

    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
        const panel = document.getElementById('notification-panel');
        const btn = document.getElementById('notification-bell-btn');
        if (panel && btn && !panel.contains(e.target) && !btn.contains(e.target)) {
            panel.style.display = 'none';
        }
    });

    // ── Add CSS for notifications ──────────────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { opacity: 0; transform: translateX(30px); }
            to   { opacity: 1; transform: translateX(0); }
        }
        .notification-panel {
            position: absolute; top: calc(100% + 8px); right: 0;
            width: 330px; background: white; border-radius: 14px;
            border: 1px solid rgba(0,0,0,0.08); z-index: 1050;
            overflow: hidden;
        }
        .notification-item { cursor: pointer; transition: background 0.2s; }
        .notification-item:hover { background: #f8fafc; }
        .notification-item.unread { background: #eff6ff; }
        .notification-icon-sm {
            width: 30px; height: 30px; border-radius: 8px;
            display: flex; align-items: center; justify-content: center;
            font-size: 0.75rem; flex-shrink: 0;
        }
        .notif-booking  { background: #dbeafe; color: #2563eb; }
        .notif-payment  { background: #d1fae5; color: #059669; }
        .notif-queue    { background: #fef3c7; color: #d97706; }
        .notif-loyalty  { background: #fce7f3; color: #db2777; }
        .notif-system   { background: #f3f4f6; color: #6b7280; }
        .notif-dot {
            width: 8px; height: 8px; border-radius: 50%;
            background: #3b82f6; flex-shrink: 0; margin-top: 6px;
        }
    `;
    document.head.appendChild(style);

    // ── Auto Initialize ────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        const token = sessionStorage.getItem('token');
        if (token) {
            connectSocket();
            // Small delay to ensure auth.js has run updateAuthUI first
            setTimeout(injectNotificationBell, 200);
        }
    });

    // Expose for external use
    window.loadNotifications = loadNotifications;

})();
