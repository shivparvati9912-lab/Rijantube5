// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyADmwz_xMK0QSnlFYNV3qNblsC-DGCuiyc",
    authDomain: "rijatube-eddff.firebaseapp.com",
    projectId: "rijatube-eddff",
    storageBucket: "rijatube-eddff.firebasestorage.app",
    messagingSenderId: "60460948404",
    appId: "1:60460948404:web:8ce88fe98c1099f77cf0e1"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const ALLOWED_EMAIL = "rijanjoshi66@gmail.com";

// DOM Elements
const loginOverlay = document.getElementById('login-overlay');
const dashboard = document.getElementById('admin-dashboard');
const loginBtn = document.getElementById('google-login-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginError = document.getElementById('login-error');
const userCardsContainer = document.getElementById('user-cards-container');
const bottomNavItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');
const tabTitle = document.getElementById('tab-title');
const userSearchInput = document.getElementById('user-search');

let allUsers = [];

// Auth State Monitor
auth.onAuthStateChanged(user => {
    if (user) {
        if (user.email === ALLOWED_EMAIL) {
            setupDashboard(user);
        } else {
            loginError.innerText = "Access Forbidden: Admin account required.";
            auth.signOut();
        }
    } else {
        showLogin();
    }
});

// Login Function
loginBtn.onclick = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(error => {
        loginError.innerText = error.message;
    });
};

// Logout Function
logoutBtn.onclick = () => {
    if (confirm("Sign out of Admin Panel?")) {
        auth.signOut();
    }
};

function showLogin() {
    loginOverlay.classList.remove('hidden');
    dashboard.classList.add('hidden');
}

function setupDashboard(user) {
    loginOverlay.classList.add('hidden');
    dashboard.classList.remove('hidden');

    document.getElementById('admin-name').innerText = user.displayName;
    document.getElementById('admin-email').innerText = user.email;
    if (user.photoURL) {
        const photo = document.getElementById('admin-photo');
        photo.src = user.photoURL;
        photo.classList.remove('hidden');
    }

    loadStats();
    loadUsers();
}

// Real-time Stats
function loadStats() {
    db.collection('users').onSnapshot(snapshot => {
        const users = snapshot.docs.map(doc => doc.data());
        document.getElementById('total-users').innerText = users.length;
        document.getElementById('total-banned').innerText = users.filter(u => u.is_banned === true).length;
    });
}

// User List with Real-time Updates
function loadUsers() {
    db.collection('users').orderBy('created_at', 'desc').onSnapshot(snapshot => {
        allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderUsers(allUsers);
    }, error => {
        userCardsContainer.innerHTML = `<div class="error-msg">Failed to load users: ${error.message}</div>`;
    });
}

function renderUsers(users) {
    userCardsContainer.innerHTML = '';
    if (users.length === 0) {
        userCardsContainer.innerHTML = '<div class="empty-state"><p>No users found.</p></div>';
        return;
    }

    users.forEach(user => {
        const card = createUserCard(user);
        userCardsContainer.appendChild(card);
    });
}

function createUserCard(user) {
    const div = document.createElement('div');
    div.className = 'user-card';
    const isBanned = user.is_banned === true;

    // Procedural Colors matching the App
    const colors = ['#f44336', '#2196f3', '#4caf50', '#9c27b0', '#ff9800', '#009688', '#3f51b5', '#e91e63', '#ffeb3b', '#00bcd4'];
    const logoColor = colors[(user.logo_index || 0) % colors.length];

    div.innerHTML = `
        <div class="card-header">
            <div class="m-user-logo" style="background: ${logoColor}20; border: 2px solid ${logoColor}">
                <i class="fas fa-user-graduate" style="color: ${logoColor}"></i>
            </div>
            <div class="m-user-info">
                <h4>${user.name || 'Student User'}</h4>
                <p>${user.email || 'Email Protected'}</p>
            </div>
        </div>
        <div class="card-stats">
            <div class="c-stat">
                <label>UID</label>
                <span>${user.uid_number || 'N/A'}</span>
            </div>
            <div class="c-stat">
                <label>Level</label>
                <span>${user.level || 0}</span>
            </div>
            <div class="c-stat">
                <label>EXP</label>
                <span>${user.exp || 0}</span>
            </div>
        </div>
        <div class="card-actions">
            <button class="m-btn ${isBanned ? 'm-unban-btn' : 'm-ban-btn'}" onclick="toggleBan('${user.id}', ${isBanned})">
                ${isBanned ? '<i class="fas fa-user-check"></i> Unban' : '<i class="fas fa-user-slash"></i> Ban User'}
            </button>
        </div>
    `;
    return div;
}

// Search Logic
userSearchInput.oninput = (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = allUsers.filter(u =>
        (u.name && u.name.toLowerCase().includes(query)) ||
        (u.uid_number && u.uid_number.includes(query)) ||
        (u.email && u.email.toLowerCase().includes(query))
    );
    renderUsers(filtered);
};

// Toggle Ban Status
window.toggleBan = async (id, currentStatus) => {
    const action = currentStatus ? "unban" : "ban";
    if (confirm(`Are you sure you want to ${action} this user?`)) {
        try {
            await db.collection('users').doc(id).update({
                is_banned: !currentStatus
            });
        } catch (e) {
            alert("Error updating status: " + e.message);
        }
    }
};

// Bottom Nav Navigation
bottomNavItems.forEach(item => {
    item.onclick = () => {
        const target = item.getAttribute('data-tab');

        // Update UI
        bottomNavItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        // Switch Tabs
        tabContents.forEach(tab => {
            tab.classList.add('hidden');
            if (tab.id === target + '-tab') {
                tab.classList.remove('hidden');
            }
        });

        // Set Title
        tabTitle.innerText = item.querySelector('span').innerText;
    };
});
