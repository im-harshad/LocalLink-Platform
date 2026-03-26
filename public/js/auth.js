/**
 * LocalLink Authentication Helpers
 * Professional implementation with detailed error handling
 */

async function loginUser(emailOrObj, password) {
    let credentials;
    if (typeof emailOrObj === 'object') {
        credentials = emailOrObj;
    } else {
        credentials = { email: emailOrObj, password };
    }

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });
        
        const data = await response.json();
        
        if (response.ok && (data.success || data.token)) {
            sessionStorage.setItem('token', data.token);
            sessionStorage.setItem('user', JSON.stringify(data.user || data.userData));
            return { success: true, ...data };
        } else {
            // Enhanced error parsing for express-validator array
            let msg = data.message || 'Authentication failed';
            if (data.errors && Array.isArray(data.errors)) {
                msg = data.errors.map(err => err.msg).join('. ');
            }
            return { success: false, message: msg };
        }
    } catch (err) {
        console.error('[Auth Service] Login Error:', err);
        return { success: false, message: 'Server unreachable. Please check your connection.' };
    }
}

async function signupUser(userData) {
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (response.ok && (data.success || data.userId)) {
            return { success: true, ...data };
        } else {
            let msg = data.message || 'Account creation failed';
            if (data.errors && Array.isArray(data.errors)) {
                msg = data.errors.map(err => err.msg).join('. ');
            }
            return { success: false, message: msg };
        }
    } catch (err) {
        console.error('[Auth Service] Signup Error:', err);
        return { success: false, message: 'Unable to connect to the registration server.' };
    }
}

function logout() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    window.location.replace('/views/login.html');
}

function updateAuthUI() {
    const token = sessionStorage.getItem('token');
    const user = JSON.parse(sessionStorage.getItem('user'));
    
    // Select containers
    const guestUI = document.querySelectorAll('.guest-only');
    const authUI = document.querySelectorAll('.auth-only');
    const userNameDisplay = document.getElementById('user-name-display');

    if (token && user) {
        guestUI.forEach(el => el.classList.add('d-none'));
        authUI.forEach(el => el.classList.remove('d-none'));
        
        if (userNameDisplay) {
            userNameDisplay.textContent = user.name;
        }

        // Adjust dashboard links
        const dashLinks = document.querySelectorAll('.user-dash-link');
        const dashPath = user.role === 'provider' ? '/views/provider-dashboard.html' : '/views/customer-dashboard.html';
        dashLinks.forEach(link => link.setAttribute('href', dashPath));
    } else {
        guestUI.forEach(el => el.classList.remove('d-none'));
        authUI.forEach(el => el.classList.add('d-none'));
    }
}

function checkAuth() {
    if (!sessionStorage.getItem('token')) {
        window.location.replace('/views/login.html');
    }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
});

