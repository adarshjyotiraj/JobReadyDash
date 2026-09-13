const CONFIG = {
    // API_BASE_URL: "http://localhost:8080", // Real backend URL
    API_BASE_URL: "http://localhost:8080", // Placeholder for actual backend connection
    
    // Toggle this to false when connecting to the Spring Boot backend
    USE_MOCK_DATA: true,
    
    // LocalStorage Keys
    TOKEN_KEY: "jobreadydash_jwt_token",
    USER_ROLE_KEY: "jobreadydash_user_role",
    USERNAME_KEY: "jobreadydash_username",
    
    // Role definitions
    ROLES: {
        ADMIN: "ADMIN",
        DATA_ENTRY: "DATA_ENTRY",
        ANALYST: "ANALYST"
    }
};
