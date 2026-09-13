// Authentication and Session Management
const auth = {
    // Check if user is logged in
    isAuthenticated: function() {
        return !!localStorage.getItem(CONFIG.TOKEN_KEY);
    },

    // Get current user role
    getRole: function() {
        return localStorage.getItem(CONFIG.USER_ROLE_KEY);
    },

    // Get current username
    getUsername: function() {
        return localStorage.getItem(CONFIG.USERNAME_KEY);
    },

    // Login process
    processLogin: function(token, role, username) {
        localStorage.setItem(CONFIG.TOKEN_KEY, token);
        localStorage.setItem(CONFIG.USER_ROLE_KEY, role);
        localStorage.setItem(CONFIG.USERNAME_KEY, username);
    },

    // Logout process
    logout: function() {
        localStorage.removeItem(CONFIG.TOKEN_KEY);
        localStorage.removeItem(CONFIG.USER_ROLE_KEY);
        localStorage.removeItem(CONFIG.USERNAME_KEY);
        window.location.href = 'index.html';
    },

    // Protect routes - redirect to login if not authenticated
    requireAuth: function() {
        if (!this.isAuthenticated()) {
            window.location.href = 'index.html';
        }
    },

    // Check if user has required role
    hasRole: function(allowedRoles) {
        const currentRole = this.getRole();
        return allowedRoles.includes(currentRole);
    },

    // Setup UI based on roles (Hide/Show elements)
    setupRoleUI: function() {
        const role = this.getRole();
        
        // Update user profile text
        const profileNames = document.querySelectorAll('.user-name-display');
        const roleBadges = document.querySelectorAll('.user-role-badge');
        
        profileNames.forEach(el => el.textContent = this.getUsername());
        roleBadges.forEach(el => el.textContent = role);

        // Apply restrictions
        if (role === CONFIG.ROLES.ANALYST) {
            // Analyst cannot see data entry or destructive actions
            document.querySelectorAll('.requires-admin').forEach(el => el.classList.add('d-none'));
            document.querySelectorAll('.requires-data-entry').forEach(el => el.classList.add('d-none'));
        } else if (role === CONFIG.ROLES.DATA_ENTRY) {
            // Data Entry cannot see admin actions
            document.querySelectorAll('.requires-admin').forEach(el => el.classList.add('d-none'));
        }
    }
};

// UI Utilities shared across pages
const ui = {
    showLoading: function(elementId) {
        const el = document.getElementById(elementId);
        if (el) el.classList.remove('d-none');
    },
    
    hideLoading: function(elementId) {
        const el = document.getElementById(elementId);
        if (el) el.classList.add('d-none');
    },

    showToast: function(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;

        const toastEl = document.createElement('div');
        toastEl.className = `toast align-items-center text-white bg-${type} border-0`;
        toastEl.setAttribute('role', 'alert');
        toastEl.setAttribute('aria-live', 'assertive');
        toastEl.setAttribute('aria-atomic', 'true');
        
        toastEl.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        toastContainer.appendChild(toastEl);
        const bsToast = new bootstrap.Toast(toastEl, { delay: 3000 });
        bsToast.show();
        
        // Cleanup DOM after hiding
        toastEl.addEventListener('hidden.bs.toast', () => {
            toastEl.remove();
        });
    }
};

// Logout handler attachment
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtns = document.querySelectorAll('.logout-btn');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            // Optional confirmation
            if(confirm("Are you sure you want to logout?")) {
                auth.logout();
            }
        });
    });
});
