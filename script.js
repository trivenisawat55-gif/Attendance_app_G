// ==========================================
// STATE MANAGEMENT & DATA STORAGE
// ==========================================
const DEFAULT_EMPLOYEES = [
    { id: "E001", name: "Aditi", dept: "IT", role: "Developer" },
    { id: "E002", name: "Vedita", dept: "HR", role: "HR Executive" },
    { id: "E003", name: "Priya", dept: "Finance", role: "Accountant" },
    { id: "E004", name: "Triveni", dept: "IT", role: "Lead Developer" },
    { id: "E005", name: "Rohan", dept: "Marketing", role: "Manager" }
];

let employees = JSON.parse(localStorage.getItem('wp_employees')) || DEFAULT_EMPLOYEES;
let attendance = JSON.parse(localStorage.getItem('wp_attendance')) || [];
let leaves = JSON.parse(localStorage.getItem('wp_leaves')) || [];

let currentUser = null; // Stores currently authenticated user object
let attendanceChartInstance = null;
let deptChartInstance = null;

// ==========================================
// AUTHENTICATION & ROLE SWITCHING
// ==========================================
function onRoleSelectChange() {
    const role = document.getElementById("loginRole").value;
    const userSelect = document.getElementById("loginUser");
    userSelect.innerHTML = "";

    if (role === "admin") {
        userSelect.innerHTML = `<option value="ADMIN">HR / System Admin</option>`;
    } else if (role === "manager") {
        // Find employees who can act as department managers
        userSelect.innerHTML = `
            <option value="E004">Triveni (IT Manager)</option>
            <option value="E002">Vedita (HR Manager)</option>
            <option value="E005">Rohan (Marketing Manager)</option>
        `;
    } else {
        // Populate all employees
        employees.forEach(emp => {
            userSelect.innerHTML += `<option value="${emp.id}">${emp.name} (${emp.id} - ${emp.dept})</option>`;
        });
    }
}

function handleLogin(e) {
    e.preventDefault();
    const role = document.getElementById("loginRole").value;
    const userId = document.getElementById("loginUser").value;

    if (role === "admin") {
        currentUser = { id: "ADMIN", name: "System Admin", dept: "HR / Admin", role: "admin" };
    } else {
        const emp = employees.find(e => e.id === userId);
        if (emp) {
            currentUser = { ...emp, role: role };
        } else {
            alert("User not found!");
            return;
        }
    }

    document.getElementById("loginContainer").classList.add("hidden");
    document.getElementById("appContainer").classList.remove("hidden");

    setupRoleInterface();
    showSection("dashboard");
}

function handleLogout() {
    currentUser = null;
    document.getElementById("appContainer").classList.add("hidden");
    document.getElementById("loginContainer").classList.remove("hidden");
}

function setupRoleInterface() {
    // Header setup
    document.getElementById("headerUserName").innerText = currentUser.name;
    document.getElementById("headerUserDept").innerText = currentUser.dept;
    document.getElementById("userRoleBadge").innerText = `Role: ${currentUser.role.toUpperCase()}`;

    // Render Navigation based on role constraints
    const navMenu = document.getElementById("navMenu");
    navMenu.innerHTML = "";

    if (currentUser.role === "employee") {
        navMenu.innerHTML = `
            <button class="nav-btn active" onclick="showSection('dashboard', this)"><i class="fa-solid fa-chart-pie"></i> Dashboard</button>
            <button class="nav-btn" onclick="showSection('attendance', this)"><i class="fa-solid fa-calendar-check"></i> Attendance</button>
            <button class="nav-btn" onclick="showSection('leave', this)"><i class="fa-solid fa-plane-departure"></i> Apply Leave</button>
        `;
        document.getElementById("metricCardTotal").classList.add("hidden");
        document.getElementById("selfAttendanceCard").classList.remove("hidden");
        document.getElementById("adminAttendanceCard").classList.add("hidden");
        document.getElementById("leaveFormCard").classList.remove("hidden");
        document.getElementById("leaveActionHeader").classList.add("hidden");
    } 
    else if (currentUser.role === "manager") {
        navMenu.innerHTML = `
            <button class="nav-btn active" onclick="showSection('dashboard', this)"><i class="fa-solid fa-chart-pie"></i> Dashboard</button>
            <button class="nav-btn" onclick="showSection('attendance', this)"><i class="fa-solid fa-calendar-check"></i> View Attendance</button>
            <button class="nav-btn" onclick="showSection('leave', this)"><i class="fa-solid fa-plane-departure"></i> Department Leaves</button>
            <button class="nav-btn" onclick="showSection('reports', this)"><i class="fa-solid fa-chart-line"></i> Reports</button>
        `;
        document.getElementById("metricCardTotal").classList.remove("hidden");
        document.getElementById("selfAttendanceCard").classList.add("hidden");
        document.getElementById("adminAttendanceCard").classList.add("hidden");
        document.getElementById("leaveFormCard").classList.add("hidden");
        document.getElementById("leaveActionHeader").classList.remove("hidden");
    } 
    else if (currentUser.role === "admin") {
        navMenu.innerHTML = `
            <button class="nav-btn active" onclick="showSection('dashboard', this)"><i class="fa-solid fa-chart-pie"></i> Dashboard</button>
            <button class="nav-btn" onclick="showSection('employees', this)"><i class="fa-solid fa-user-group"></i> Manage Employees</button>
            <button class="nav-btn" onclick="showSection('attendance', this)"><i class="fa-solid fa-calendar-check"></i> Attendance</button>
            <button class="nav-btn" onclick="showSection('leave', this)"><i class="fa-solid fa-plane-departure"></i> All Leaves</button>
            <button class="nav-btn" onclick="showSection('reports', this)"><i class="fa-solid fa-chart-line"></i> Analytics & Reports</button>
        `;
        document.getElementById("metricCardTotal").classList.remove("hidden");
        document.getElementById("selfAttendanceCard").classList.add("hidden");
        document.getElementById("adminAttendanceCard").classList.remove("hidden");
        document.getElementById("leaveFormCard").classList.add("hidden");
        document.getElementById("leaveActionHeader").classList.remove("hidden");
    }
}

// ==========================================
// NAVIGATION & DASHBOARD
// ==========================================
function showSection(sectionId, btnElement) {
    document.querySelectorAll(".section").forEach(sec => sec.classList.add("hidden"));
    document.getElementById(sectionId).classList.remove("hidden");

    if (btnElement) {
        document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));
        btnElement.classList.add("active");
    }

    document.getElementById("pageTitle").innerText = sectionId.charAt(0).toUpperCase() + sectionId.slice(1) + " Overview";

    // Close mobile sidebar if open
    document.getElementById("sidebar").classList.remove("active");

    updateDashboard();

    if (sectionId === "employees") displayEmployees();
    if (sectionId === "attendance") displayAttendance();
    if (sectionId === "leave") displayLeaves();
    if (sectionId === "reports") generateReport();
}

function updateDashboard() {
    const today = new Date().toISOString().split("T")[0];
    let filteredEmployees = employees;
    let filteredAttendance = attendance.filter(a => a.date === today);
    let filteredLeaves = leaves;

    // Managers see department-filtered data
    if (currentUser.role === "manager") {
        filteredEmployees = employees.filter(e => e.dept === currentUser.dept);
        const deptEmpIds = filteredEmployees.map(e => e.id);
        filteredAttendance = filteredAttendance.filter(a => deptEmpIds.includes(a.employeeId));
        filteredLeaves = leaves.filter(l => l.dept === currentUser.dept);
    } 
    // Employees see personal data
    else if (currentUser.role === "employee") {
        filteredAttendance = attendance.filter(a => a.employeeId === currentUser.id && a.date === today);
        filteredLeaves = leaves.filter(l => l.employeeId === currentUser.id);
    }

    document.getElementById("totalEmployees").innerText = filteredEmployees.length;

    const presentCount = filteredAttendance.filter(a => a.status === "Present").length;
    const absentCount = filteredAttendance.filter(a => a.status === "Absent").length;
    const pendingLeavesCount = filteredLeaves.filter(l => l.status === "Pending").length;

    document.getElementById("presentToday").innerText = presentCount;
    document.getElementById("absentToday").innerText = absentCount;
    document.getElementById("pendingLeaves").innerText = pendingLeavesCount;

    renderCharts(presentCount, absentCount);
}

// ==========================================
// CHARTS (Chart.js Integration)
// ==========================================
function renderCharts(present, absent) {
    // Attendance Pie Chart
    const ctx1 = document.getElementById("attendanceChart").getContext("2d");
    if (attendanceChartInstance) attendanceChartInstance.destroy();

    attendanceChartInstance = new Chart(ctx1, {
        type: 'doughnut',
        data: {
            labels: ['Present Today', 'Absent Today'],
            datasets: [{
                data: [present, absent],
                backgroundColor: ['#10b981', '#ef4444']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // Department Bar Chart
    const ctx2 = document.getElementById("deptChart").getContext("2d");
    if (deptChartInstance) deptChartInstance.destroy();

    const depts = ["IT", "HR", "Finance", "Marketing"];
    const deptCounts = depts.map(d => employees.filter(e => e.dept === d).length);

    deptChartInstance = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: depts,
            datasets: [{
                label: 'Employee Count',
                data: deptCounts,
                backgroundColor: '#4f46e5'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// ==========================================
// EMPLOYEE MANAGEMENT (HR / Admin Only)
// ==========================================
function addEmployee() {
    const id = document.getElementById("empId").value.trim();
    const name = document.getElementById("empName").value.trim();
    const dept = document.getElementById("empDept").value;
    const role = document.getElementById("empRole").value.trim();

    if (!id || !name || !role) {
        alert("Please complete all fields!");
        return;
    }

    if (employees.some(e => e.id === id)) {
        alert("Employee ID already exists!");
        return;
    }

    employees.push({ id, name, dept, role });
    saveData();
    displayEmployees();
    updateDashboard();

    document.getElementById("empId").value = "";
    document.getElementById("empName").value = "";
    document.getElementById("empRole").value = "";
    alert("Employee registered successfully!");
}

function displayEmployees() {
    const table = document.getElementById("employeeTable");
    table.innerHTML = "";

    employees.forEach((emp, index) => {
        table.innerHTML += `
            <tr>
                <td><strong>${emp.id}</strong></td>
                <td>${emp.name}</td>
                <td>${emp.dept}</td>
                <td>${emp.role}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="deleteEmployee(${index})">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

function deleteEmployee(index) {
    if (confirm("Are you sure you want to remove this employee?")) {
        employees.splice(index, 1);
        saveData();
        displayEmployees();
        updateDashboard();
    }
}

function filterEmployeeTable() {
    const query = document.getElementById("empSearch").value.toLowerCase();
    const rows = document.querySelectorAll("#employeeTable tr");

    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(query) ? "" : "none";
    });
}

// ==========================================
// ATTENDANCE LOGS
// ==========================================
function displayAttendance() {
    const table = document.getElementById("attendanceTable");
    const actionColHeader = document.getElementById("attendanceActionCol");
    table.innerHTML = "";

    const selectedDate = document.getElementById("attendanceDate").value || new Date().toISOString().split("T")[0];
    document.getElementById("currentDateStr").innerText = new Date().toDateString();

    let logsToShow = attendance;

    // Role-based records display
    if (currentUser.role === "employee") {
        logsToShow = attendance.filter(a => a.employeeId === currentUser.id);
        actionColHeader.classList.add("hidden");
    } else if (currentUser.role === "manager") {
        const deptEmpIds = employees.filter(e => e.dept === currentUser.dept).map(e => e.id);
        logsToShow = attendance.filter(a => deptEmpIds.includes(a.employeeId));
        actionColHeader.classList.add("hidden");
    } else {
        // HR / Admin Views & Marks
        actionColHeader.classList.remove("hidden");
        logsToShow = employees.map(emp => {
            const existingRecord = attendance.find(a => a.employeeId === emp.id && a.date === selectedDate);
            return {
                employeeId: emp.id,
                employeeName: emp.name,
                dept: emp.dept,
                date: selectedDate,
                status: existingRecord ? existingRecord.status : 'Not Marked'
            };
        });
    }

    logsToShow.forEach(record => {
        const statusBadge = record.status === 'Present' ? 'badge-success' : record.status === 'Absent' ? 'badge-danger' : 'badge-warning';

        let actionButtons = '-';
        if (currentUser.role === "admin") {
            actionButtons = `
                <button class="btn btn-success btn-sm" onclick="adminMarkAttendance('${record.employeeId}', 'Present')">Present</button>
                <button class="btn btn-danger btn-sm" onclick="adminMarkAttendance('${record.employeeId}', 'Absent')">Absent</button>
            `;
        }

        table.innerHTML += `
            <tr>
                <td><strong>${record.employeeId}</strong></td>
                <td>${record.employeeName || getEmpName(record.employeeId)}</td>
                <td>${record.dept || getEmpDept(record.employeeId)}</td>
                <td>${record.date}</td>
                <td><span class="badge ${statusBadge}">${record.status}</span></td>
                ${currentUser.role === "admin" ? `<td>${actionButtons}</td>` : ''}
            </tr>
        `;
    });
}

function markSelfAttendance(status) {
    const today = new Date().toISOString().split("T")[0];
    const existingIndex = attendance.findIndex(a => a.employeeId === currentUser.id && a.date === today);

    if (existingIndex !== -1) {
        attendance[existingIndex].status = status;
    } else {
        attendance.push({
            employeeId: currentUser.id,
            employeeName: currentUser.name,
            dept: currentUser.dept,
            date: today,
            status: status
        });
    }

    saveData();
    displayAttendance();
    updateDashboard();
    alert(`Marked as ${status} for Today!`);
}

function adminMarkAttendance(empId, status) {
    const selectedDate = document.getElementById("attendanceDate").value || new Date().toISOString().split("T")[0];
    const emp = employees.find(e => e.id === empId);

    const existingIndex = attendance.findIndex(a => a.employeeId === empId && a.date === selectedDate);
    if (existingIndex !== -1) {
        attendance[existingIndex].status = status;
    } else {
        attendance.push({
            employeeId: emp.id,
            employeeName: emp.name,
            dept: emp.dept,
            date: selectedDate,
            status: status
        });
    }

    saveData();
    displayAttendance();
    updateDashboard();
}

function filterAttendanceTable() {
    const query = document.getElementById("attendanceSearch").value.toLowerCase();
    const rows = document.querySelectorAll("#attendanceTable tr");

    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(query) ? "" : "none";
    });
}

// ==========================================
// LEAVE MANAGEMENT
// ==========================================
function applyLeave() {
    const type = document.getElementById("leaveType").value;
    const date = document.getElementById("leaveDate").value;

    if (!date) {
        alert("Please select a date!");
        return;
    }

    leaves.push({
        id: "L" + Date.now(),
        employeeId: currentUser.id,
        employeeName: currentUser.name,
        dept: currentUser.dept,
        type: type,
        date: date,
        status: "Pending"
    });

    saveData();
    displayLeaves();
    updateDashboard();
    alert("Leave Application Submitted!");
}

function displayLeaves() {
    const table = document.getElementById("leaveTable");
    table.innerHTML = "";

    let leavesToShow = leaves;

    if (currentUser.role === "employee") {
        leavesToShow = leaves.filter(l => l.employeeId === currentUser.id);
    } else if (currentUser.role === "manager") {
        leavesToShow = leaves.filter(l => l.dept === currentUser.dept);
    }

    leavesToShow.forEach((leave, index) => {
        const badgeClass = leave.status === "Approved" ? "badge-success" : leave.status === "Rejected" ? "badge-danger" : "badge-warning";

        let actionCell = `<span class="text-muted">Processed</span>`;
        if ((currentUser.role === "manager" || currentUser.role === "admin") && leave.status === "Pending") {
            actionCell = `
                <button class="btn btn-success btn-sm" onclick="processLeave('${leave.id}', 'Approved')">Approve</button>
                <button class="btn btn-danger btn-sm" onclick="processLeave('${leave.id}', 'Rejected')">Reject</button>
            `;
        }

        table.innerHTML += `
            <tr>
                <td><strong>${leave.employeeName}</strong> (${leave.employeeId})</td>
                <td>${leave.dept}</td>
                <td>${leave.type}</td>
                <td>${leave.date}</td>
                <td><span class="badge ${badgeClass}">${leave.status}</span></td>
                <td>${actionCell}</td>
            </tr>
        `;
    });
}

function processLeave(leaveId, status) {
    const leave = leaves.find(l => l.id === leaveId);
    if (leave) {
        leave.status = status;
        saveData();
        displayLeaves();
        updateDashboard();
    }
}

function filterLeaveTable() {
    const query = document.getElementById("leaveSearch").value.toLowerCase();
    const rows = document.querySelectorAll("#leaveTable tr");

    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(query) ? "" : "none";
    });
}

// ==========================================
// REPORTS GENERATION
// ==========================================
function generateReport() {
    const reportType = document.getElementById("reportType").value;
    const thead = document.getElementById("reportTableHead");
    const tbody = document.getElementById("reportTableBody");

    thead.innerHTML = "";
    tbody.innerHTML = "";

    if (reportType === "attendance") {
        thead.innerHTML = `
            <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Department</th>
                <th>Status</th>
            </tr>
        `;

        let data = attendance;
        if (currentUser.role === "manager") {
            data = data.filter(a => a.dept === currentUser.dept);
        }

        data.forEach(row => {
            tbody.innerHTML += `
                <tr>
                    <td>${row.date}</td>
                    <td>${row.employeeName}</td>
                    <td>${row.dept}</td>
                    <td>${row.status}</td>
                </tr>
            `;
        });
    } else {
        thead.innerHTML = `
            <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Leave Type</th>
                <th>Date</th>
                <th>Status</th>
            </tr>
        `;

        let data = leaves;
        if (currentUser.role === "manager") {
            data = data.filter(l => l.dept === currentUser.dept);
        }

        data.forEach(row => {
            tbody.innerHTML += `
                <tr>
                    <td>${row.employeeName}</td>
                    <td>${row.dept}</td>
                    <td>${row.type}</td>
                    <td>${row.date}</td>
                    <td>${row.status}</td>
                </tr>
            `;
        });
    }
}

// ==========================================
// HELPER FUNCTIONS & INIT
// ==========================================
function getEmpName(id) {
    const emp = employees.find(e => e.id === id);
    return emp ? emp.name : id;
}

function getEmpDept(id) {
    const emp = employees.find(e => e.id === id);
    return emp ? emp.dept : 'N/A';
}

function saveData() {
    localStorage.setItem('wp_employees', JSON.stringify(employees));
    localStorage.setItem('wp_attendance', JSON.stringify(attendance));
    localStorage.setItem('wp_leaves', JSON.stringify(leaves));
}

function toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("active");
}

// Initialize default date picker value to today
document.getElementById("attendanceDate").value = new Date().toISOString().split("T")[0];
onRoleSelectChange();
