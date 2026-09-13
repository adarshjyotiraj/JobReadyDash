// Mock Database
const mockData = {
    users: [
        { username: "admin", password: "password", role: CONFIG.ROLES.ADMIN },
        { username: "dataentry", password: "password", role: CONFIG.ROLES.DATA_ENTRY },
        { username: "analyst", password: "password", role: CONFIG.ROLES.ANALYST }
    ],
    
    participants: [
        { id: 1, name: "Rahul Sharma", email: "rahul.s@example.com", phone: "9876543210", district: "District A", program: "Web Development", employmentStatus: "Employed" },
        { id: 2, name: "Priya Patel", email: "priya.p@example.com", phone: "9876543211", district: "District B", program: "Data Analytics", employmentStatus: "Self-Employed" },
        { id: 3, name: "Amit Kumar", email: "amit.k@example.com", phone: "9876543212", district: "District A", program: "Digital Marketing", employmentStatus: "Unemployed" },
        { id: 4, name: "Sneha Reddy", email: "sneha.r@example.com", phone: "9876543213", district: "District C", program: "Web Development", employmentStatus: "Pursuing Further Training" },
        { id: 5, name: "Vikram Singh", email: "vikram.s@example.com", phone: "9876543214", district: "District B", program: "Cloud Computing", employmentStatus: "Employed" }
    ],
    
    placementRate: {
        total: 500,
        employed: 310,
        selfEmployed: 45,
        unemployed: 100,
        training: 45
    },
    
    skillGaps: [
        { skill: "Advanced Excel", gapScore: 85 },
        { skill: "Communication", gapScore: 78 },
        { skill: "Python Basics", gapScore: 65 },
        { skill: "Project Management", gapScore: 60 },
        { skill: "English Fluency", gapScore: 55 }
    ]
};
