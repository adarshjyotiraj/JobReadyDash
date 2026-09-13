// Centralized API Service Layer
const api = {
    // Utility to get auth headers
    getHeaders: function() {
        const token = localStorage.getItem(CONFIG.TOKEN_KEY);
        const headers = {
            'Content-Type': 'application/json'
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    },

    // Handle standard fetch responses
    handleResponse: async function(response) {
        if (response.status === 401 || response.status === 403) {
            // Token expired or unauthorized
            auth.logout();
            throw new Error("Session expired. Please login again.");
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || "API Request Failed");
        }
        
        // Handle empty responses (like from DELETE)
        const text = await response.text();
        return text ? JSON.parse(text) : {};
    },

    // --- AUTHENTICATION ---
    login: async function(username, password) {
        if (CONFIG.USE_MOCK_DATA) {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    const user = mockData.users.find(u => u.username === username && u.password === password);
                    if (user) {
                        resolve({
                            token: "mock_jwt_token_" + Date.now(),
                            role: user.role,
                            username: user.username
                        });
                    } else {
                        reject(new Error("Invalid credentials"));
                    }
                }, 800); // Simulate network delay
            });
        }

        const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        return this.handleResponse(response);
    },

    // --- PARTICIPANTS ---
    getParticipants: async function() {
        if (CONFIG.USE_MOCK_DATA) {
            return new Promise(resolve => setTimeout(() => resolve([...mockData.participants]), 500));
        }

        const response = await fetch(`${CONFIG.API_BASE_URL}/api/participants`, {
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    },

    createParticipant: async function(data) {
        if (CONFIG.USE_MOCK_DATA) {
            return new Promise(resolve => {
                setTimeout(() => {
                    const newId = Math.max(...mockData.participants.map(p => p.id)) + 1;
                    const newParticipant = { id: newId, ...data };
                    mockData.participants.push(newParticipant);
                    resolve(newParticipant);
                }, 500);
            });
        }

        const response = await fetch(`${CONFIG.API_BASE_URL}/api/participants`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        });
        return this.handleResponse(response);
    },

    updateParticipant: async function(id, data) {
        if (CONFIG.USE_MOCK_DATA) {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    const index = mockData.participants.findIndex(p => p.id == id);
                    if (index !== -1) {
                        mockData.participants[index] = { ...mockData.participants[index], ...data };
                        resolve(mockData.participants[index]);
                    } else {
                        reject(new Error("Participant not found"));
                    }
                }, 500);
            });
        }

        const response = await fetch(`${CONFIG.API_BASE_URL}/api/participants/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        });
        return this.handleResponse(response);
    },

    deleteParticipant: async function(id) {
        if (CONFIG.USE_MOCK_DATA) {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    const index = mockData.participants.findIndex(p => p.id == id);
                    if (index !== -1) {
                        mockData.participants.splice(index, 1);
                        resolve({ success: true });
                    } else {
                        reject(new Error("Participant not found"));
                    }
                }, 500);
            });
        }

        const response = await fetch(`${CONFIG.API_BASE_URL}/api/participants/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    },

    // --- ANALYTICS ---
    getPlacementRate: async function() {
        if (CONFIG.USE_MOCK_DATA) {
            return new Promise(resolve => setTimeout(() => resolve({...mockData.placementRate}), 600));
        }

        const response = await fetch(`${CONFIG.API_BASE_URL}/api/analytics/placement-rate`, {
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    },

    getSkillGaps: async function() {
        if (CONFIG.USE_MOCK_DATA) {
            return new Promise(resolve => setTimeout(() => resolve([...mockData.skillGaps]), 600));
        }

        const response = await fetch(`${CONFIG.API_BASE_URL}/api/analytics/skill-gaps`, {
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }
};
