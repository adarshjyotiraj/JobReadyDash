let allParticipants = [];
let filteredParticipants = [];
let currentSortCol = 'id';
let currentSortAsc = true;
let currentPage = 1;
const ITEMS_PER_PAGE = 10;

let participantModal;
let deleteModal;
let deleteTargetId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    auth.requireAuth();
    auth.setupRoleUI();

    // Sidebar Toggle
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    if (sidebarCollapse) {
        sidebarCollapse.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active');
        });
    }

    // Initialize Modals
    participantModal = new bootstrap.Modal(document.getElementById('participantModal'));
    deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));

    // Attach Event Listeners
    document.getElementById('search-input').addEventListener('input', applyFilters);
    document.getElementById('status-filter').addEventListener('change', applyFilters);
    document.getElementById('participant-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('btn-confirm-delete').addEventListener('click', confirmDelete);

    // Reset form on modal close
    document.getElementById('participantModal').addEventListener('hidden.bs.modal', () => {
        document.getElementById('participant-form').reset();
        document.getElementById('form-id').value = '';
        document.getElementById('participantModalLabel').textContent = 'Add New Participant';
    });

    // Load Data
    await loadParticipants();
});

async function loadParticipants() {
    try {
        allParticipants = await api.getParticipants();
        filteredParticipants = [...allParticipants];
        renderTable();
    } catch (error) {
        console.error("Failed to load participants:", error);
        ui.showToast("Failed to load participants.", "danger");
    }
}

// Rendering
function renderTable() {
    const tbody = document.getElementById('participants-table-body');
    tbody.innerHTML = '';
    
    // Sort
    filteredParticipants.sort((a, b) => {
        let valA = a[currentSortCol];
        let valB = b[currentSortCol];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        
        if (valA < valB) return currentSortAsc ? -1 : 1;
        if (valA > valB) return currentSortAsc ? 1 : -1;
        return 0;
    });

    // Paginate
    const totalItems = filteredParticipants.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedItems = filteredParticipants.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // Empty State
    if (paginatedItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No participants found.</td></tr>`;
    } else {
        paginatedItems.forEach(p => {
            const tr = document.createElement('tr');
            
            // Badge formatting
            let badgeClass = 'bg-secondary';
            if(p.employmentStatus === 'Employed') badgeClass = 'badge-employed';
            if(p.employmentStatus === 'Self-Employed') badgeClass = 'badge-self-employed';
            if(p.employmentStatus === 'Unemployed') badgeClass = 'badge-unemployed';
            if(p.employmentStatus === 'Pursuing Further Training') badgeClass = 'badge-training';

            // Actions logic based on role
            const userRole = auth.getRole();
            let actionHtml = '';
            
            if (userRole === CONFIG.ROLES.ADMIN || userRole === CONFIG.ROLES.DATA_ENTRY) {
                actionHtml += `<button class="btn btn-sm btn-outline-primary me-1" onclick="editParticipant(${p.id})"><i class="bi bi-pencil"></i></button>`;
            }
            if (userRole === CONFIG.ROLES.ADMIN) {
                actionHtml += `<button class="btn btn-sm btn-outline-danger" onclick="initDelete(${p.id}, '${p.name}')"><i class="bi bi-trash"></i></button>`;
            }

            tr.innerHTML = `
                <td>#${p.id}</td>
                <td class="fw-semibold">${p.name}</td>
                <td>
                    <div><i class="bi bi-envelope text-muted"></i> <span style="font-size: 0.9em;">${p.email}</span></div>
                    <div><i class="bi bi-telephone text-muted"></i> <span style="font-size: 0.9em;">${p.phone}</span></div>
                </td>
                <td>${p.district}</td>
                <td>${p.program}</td>
                <td><span class="badge ${badgeClass}">${p.employmentStatus}</span></td>
                <td class="text-end">${actionHtml || '<span class="text-muted">View Only</span>'}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Update Pagination Info
    const end = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
    document.getElementById('pagination-info').textContent = `Showing ${totalItems === 0 ? 0 : startIndex + 1} to ${end} of ${totalItems} entries`;
    
    renderPaginationControls(totalPages);
}

function renderPaginationControls(totalPages) {
    const ul = document.getElementById('pagination-controls');
    ul.innerHTML = '';
    
    // Prev
    ul.innerHTML += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" onclick="changePage(${currentPage - 1}, event)">Previous</a></li>`;
    
    // Pages (simplified for demo)
    for(let i=1; i<=totalPages; i++) {
        ul.innerHTML += `<li class="page-item ${currentPage === i ? 'active' : ''}"><a class="page-link" href="#" onclick="changePage(${i}, event)">${i}</a></li>`;
    }
    
    // Next
    ul.innerHTML += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link" href="#" onclick="changePage(${currentPage + 1}, event)">Next</a></li>`;
}

function changePage(page, event) {
    if(event) event.preventDefault();
    const totalPages = Math.ceil(filteredParticipants.length / ITEMS_PER_PAGE) || 1;
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderTable();
}

function sortTable(col) {
    if (currentSortCol === col) {
        currentSortAsc = !currentSortAsc;
    } else {
        currentSortCol = col;
        currentSortAsc = true;
    }
    renderTable();
}

function applyFilters() {
    const searchVal = document.getElementById('search-input').value.toLowerCase();
    const statusVal = document.getElementById('status-filter').value;

    filteredParticipants = allParticipants.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(searchVal) || 
                            p.email.toLowerCase().includes(searchVal) || 
                            p.id.toString().includes(searchVal);
        const matchStatus = statusVal === "" || p.employmentStatus === statusVal;
        
        return matchSearch && matchStatus;
    });

    currentPage = 1;
    renderTable();
}

// CRUD Operations
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('form-id').value;
    const payload = {
        name: document.getElementById('form-name').value,
        email: document.getElementById('form-email').value,
        phone: document.getElementById('form-phone').value,
        district: document.getElementById('form-district').value,
        program: document.getElementById('form-program').value,
        employmentStatus: document.getElementById('form-status').value
    };

    const btnSave = document.getElementById('btn-save');
    btnSave.disabled = true;
    btnSave.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';

    try {
        if (id) {
            // Update
            const updated = await api.updateParticipant(id, payload);
            const index = allParticipants.findIndex(p => p.id == id);
            allParticipants[index] = updated;
            ui.showToast("Participant updated successfully.");
        } else {
            // Create
            const created = await api.createParticipant(payload);
            allParticipants.push(created);
            ui.showToast("Participant added successfully.");
        }
        
        participantModal.hide();
        applyFilters();
    } catch (error) {
        ui.showToast(error.message || "Operation failed", "danger");
    } finally {
        btnSave.disabled = false;
        btnSave.innerHTML = 'Save Participant';
    }
}

function editParticipant(id) {
    const p = allParticipants.find(p => p.id == id);
    if (!p) return;

    document.getElementById('form-id').value = p.id;
    document.getElementById('form-name').value = p.name;
    document.getElementById('form-email').value = p.email;
    document.getElementById('form-phone').value = p.phone;
    document.getElementById('form-district').value = p.district;
    document.getElementById('form-program').value = p.program;
    document.getElementById('form-status').value = p.employmentStatus;

    document.getElementById('participantModalLabel').textContent = 'Edit Participant';
    participantModal.show();
}

function initDelete(id, name) {
    deleteTargetId = id;
    document.getElementById('delete-participant-name').textContent = name;
    deleteModal.show();
}

async function confirmDelete() {
    if (!deleteTargetId) return;
    
    const btn = document.getElementById('btn-confirm-delete');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

    try {
        await api.deleteParticipant(deleteTargetId);
        allParticipants = allParticipants.filter(p => p.id != deleteTargetId);
        ui.showToast("Participant deleted successfully.");
        deleteModal.hide();
        applyFilters();
    } catch (error) {
        ui.showToast(error.message || "Deletion failed", "danger");
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Delete';
        deleteTargetId = null;
    }
}
