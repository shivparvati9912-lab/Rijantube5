// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyADmwz_xMK0QSnlFYNV3qNblsC-DGCuiyc",
    authDomain: "rijatube-eddff.firebaseapp.com",
    projectId: "rijatube-eddff",
    storageBucket: "rijatube-eddff.firebasestorage.app",
    messagingSenderId: "60460948404",
    appId: "1:60460948404:web:8ce88fe98c1099f77cf0e1" // Mocked based on android, common pattern
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
const userListBody = document.getElementById('user-list-body');
const sideLinks = document.querySelectorAll('.nav-links li');
const tabContents = document.querySelectorAll('.tab-content');
const tabTitle = document.getElementById('tab-title');

// Auth State Monitor
auth.onAuthStateChanged(user => {
    if (user) {
        if (user.email === ALLOWED_EMAIL) {
            setupDashboard(user);
        } else {
            loginError.innerText = "Access Denied: You are not an administrator.";
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
    auth.signOut();
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

// Stats Loading
async function loadStats() {
    const snapshot = await db.collection('users').get();
    const users = snapshot.docs.map(doc => doc.data());
    
    document.getElementById('total-users').innerText = users.length;
    document.getElementById('total-banned').innerText = users.filter(u => u.is_banned === true).length;
    document.getElementById('active-users').innerText = Math.floor(users.length * 0.4); // Mock active count
}

// User List Loading
function loadUsers() {
    db.collection('users').orderBy('created_at', 'desc').onSnapshot(snapshot => {
        userListBody.innerHTML = '';
        snapshot.forEach(doc => {
            const user = doc.data();
            const userId = doc.id;
            const row = createUserRow(userId, user);
            userListBody.appendChild(row);
        });
    });
}

function createUserRow(id, user) {
    const tr = document.createElement('tr');
    const isBanned = user.is_banned === true;
    
    // Procedural Logo Mock for Web
    const colors = ['#f44336', '#2196f3', '#4caf50', '#9c27b0', '#ff9800', '#009688', '#3f51b5', '#e91e63', '#ffeb3b', '#00bcd4'];
    const logoColor = colors[(user.logo_index || 0) % colors.length];

    tr.innerHTML = `
        <td><div class="user-logo" style="background: ${logoColor}20; border: 2px solid ${logoColor}"><i class="fas fa-face-smile" style="color: ${logoColor}"></i></div></td>
        <td>
            <div class="user-meta">
                <p>${user.name || 'Unknown'}</p>
                <p>${user.email || 'No Email'}</p>
            </div>
        </td>
        <td><code>${user.uid_number || 'N/A'}</code></td>
        <td>Lvl ${user.level || 0} (${user.exp || 0} EXP)</td>
        <td><span class="status-badge ${isBanned ? 'status-banned' : 'status-active'}">${isBanned ? 'Banned' : 'Active'}</span></td>
        <td>
            <button class="action-btn ${isBanned ? 'unban-btn' : 'ban-btn'}" onclick="toggleBan('${id}', ${isBanned})">
                ${isBanned ? 'Unban User' : 'Ban User'}
            </button>
        </td>
    `;
    return tr;
}

// Ban/Unban Logic
window.toggleBan = async (id, currentStatus) => {
    const confirmMsg = currentStatus ? "Unban this user?" : "Ban this user? They will lose access to the app.";
    if (confirm(confirmMsg)) {
        await db.collection('users').doc(id).update({
            is_banned: !currentStatus
        });
        loadStats();
    }
};

// Tab Navigation
sideLinks.forEach(link => {
    link.onclick = () => {
        const target = link.getAttribute('data-tab');
        
        sideLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        tabContents.forEach(content => {
            content.classList.add('hidden');
            if (content.id === target + '-tab') {
                content.classList.remove('hidden');
            }
        });
        
        tabTitle.innerText = link.querySelector('span').innerText;
    };
});
