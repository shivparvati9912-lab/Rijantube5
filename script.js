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
    loadPatchHistory();
}

// Targeting Logic
const targetType = document.getElementById('patch-target-type');
const targetUserGroup = document.getElementById('target-user-group');
const targetUserSelect = document.getElementById('patch-target-user');

targetType.onchange = () => {
    targetUserGroup.style.display = targetType.value === 'specific' ? 'flex' : 'none';
};

// Real-time Stats
function loadStats() {
    db.collection('users').onSnapshot(snapshot => {
        const users = snapshot.docs.map(doc => doc.data());
        // Filter out admin from stats
        const activeUsers = users.filter(u => u.email !== ALLOWED_EMAIL);

        document.getElementById('total-users').innerText = activeUsers.length;
        document.getElementById('total-banned').innerText = activeUsers.filter(u => u.is_banned === true).length;
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
    // Filter out the admin email as requested
    const filteredUsers = users.filter(u => u.email !== ALLOWED_EMAIL);

    // Populate Targeting Dropdown
    targetUserSelect.innerHTML = '';
    filteredUsers.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id; // Using Firestore Doc ID as UID
        opt.innerText = `${u.name || 'User'} (${u.email || 'No Email'})`;
        targetUserSelect.appendChild(opt);
    });

    if (filteredUsers.length === 0) {
        userCardsContainer.innerHTML = '<div class="empty-state"><p>No users found.</p></div>';
        return;
    }

    filteredUsers.forEach(user => {
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
                <div class="tag-badge-small" style="background: ${getTagColor(user.tag)}">
                    ${user.tag || 'Student'}
                </div>
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
            <button class="m-btn m-ban-btn" style="background: ${isBanned ? 'var(--success)' : 'var(--danger)'}20; color: ${isBanned ? 'var(--success)' : 'var(--danger)'}; border-color: ${isBanned ? 'var(--success)' : 'var(--danger)'}40;" onclick="toggleBan('${user.id}', ${isBanned}, '${user.email}')">
                <i class="fas ${isBanned ? 'fa-user-check' : 'fa-user-slash'}"></i> ${isBanned ? 'Unban' : 'Ban'}
            </button>
            <button class="m-btn tag-btn" onclick="manageTag('${user.id}', '${user.tag || 'Student'}')">
                <i class="fas fa-tags"></i> Tag
            </button>
        </div>
    `;
    return div;
}

function getTagColor(tag) {
    switch (tag) {
        case 'Golden VIP': return '#FFD700';
        case 'VIP': return '#FF4081';
        case 'Student': return '#2196F3';
        default: return 'var(--text-dim)';
    }
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
window.toggleBan = async (id, currentStatus, email) => {
    // Security check: Admin cannot be banned
    if (email === ALLOWED_EMAIL && !currentStatus) {
        alert("Security Alert: The administrator account cannot be banned.");
        return;
    }

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

// Manage User Tags
window.manageTag = async (id, currentTag) => {
    const tags = ['Student', 'VIP', 'Golden VIP'];
    const nextIndex = (tags.indexOf(currentTag) + 1) % tags.length;
    const newTag = tags[nextIndex];

    try {
        await db.collection('users').doc(id).update({
            tag: newTag
        });
    } catch (e) {
        alert("Error updating tag: " + e.message);
    }
}

// Patch System Logic
const patchDurationType = document.getElementById('patch-duration-type');
const durationInputGroup = document.getElementById('duration-input-group');
const sendPatchBtn = document.getElementById('send-patch-btn');

patchDurationType.onchange = () => {
    durationInputGroup.style.display = patchDurationType.value === 'custom' ? 'flex' : 'none';
};

sendPatchBtn.onclick = async () => {
    const message = document.getElementById('patch-message').value.trim();
    const tag = document.getElementById('patch-tag').value;
    const durationType = patchDurationType.value;
    const hours = parseInt(document.getElementById('patch-hours').value);
    const targetTypeVal = targetType.value;
    const targetUid = targetTypeVal === 'all' ? 'all' : targetUserSelect.value;
    const statusDiv = document.getElementById('patch-status');

    if (!message) {
        statusDiv.innerText = "Error: Message cannot be empty.";
        return;
    }

    sendPatchBtn.disabled = true;
    sendPatchBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Sending...';

    try {
        const now = firebase.firestore.Timestamp.now();
        let expiry = null;
        if (durationType === 'custom') {
            expiry = firebase.firestore.Timestamp.fromMillis(now.toMillis() + (hours * 3600000));
        }

        await db.collection('patches').add({
            message: message,
            tag: tag, // 'optional' or 'required'
            targetUid: targetUid,
            expiry: expiry,
            createdAt: now,
            active: true,
            hiddenWeb: false
        });

        statusDiv.style.color = 'var(--success)';
        statusDiv.innerText = "Patch broadcasted successfully!";
        document.getElementById('patch-message').value = '';

        setTimeout(() => {
            statusDiv.innerText = '';
        }, 3000);
    } catch (e) {
        statusDiv.style.color = 'var(--danger)';
        statusDiv.innerText = "Failed to send patch: " + e.message;
    } finally {
        sendPatchBtn.disabled = false;
        sendPatchBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Patch Now';
    }
};

// Patch History and Revocation
function loadPatchHistory() {
    const historyContainer = document.getElementById('patch-history-container');
    db.collection('patches')
        .where('hiddenWeb', '==', false)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .onSnapshot(snapshot => {
            historyContainer.innerHTML = '';
            if (snapshot.empty) {
                historyContainer.innerHTML = '<div class="empty-state" style="margin-top: 10px;"><p>No history found.</p></div>';
                return;
            }

            snapshot.forEach(doc => {
                const patch = doc.data();
                const card = createHistoryCard(doc.id, patch);
                historyContainer.appendChild(card);
            });
        });
}

function createHistoryCard(id, patch) {
    const div = document.createElement('div');
    div.className = 'history-item';
    const date = patch.createdAt ? patch.createdAt.toDate().toLocaleString() : 'Just now';
    const isRevoked = patch.active === false;

    div.innerHTML = `
        <div class="history-header">
            <span class="status-badge status-${patch.tag}">${patch.tag}</span>
            <span style="font-size: 0.7rem; color: var(--text-dim);">${date}</span>
        </div>
        <p class="history-msg">${patch.message}</p>
        <div class="history-meta">
            <span class="meta-badge"><i class="fas fa-bullseye"></i> Target: ${patch.targetUid}</span>
            ${isRevoked ? '<span class="meta-badge" style="color: var(--danger); border: 1px solid var(--danger);">REVOKED</span>' : ''}
        </div>
        <div class="history-actions">
            <button class="h-del-btn h-del-web" onclick="deletePatch('${id}', false)">
                <i class="fas fa-eye-slash"></i> Hide Web
            </button>
            <button class="h-del-btn h-del-both" onclick="deletePatch('${id}', true)">
                <i class="fas fa-trash-alt"></i> Delete Both
            </button>
        </div>
    `;
    return div;
}

window.deletePatch = async (id, both) => {
    const confirmMsg = both ? "Delete for BOTH Website and App? (Revoke notification)" : "Delete for Website History only?";
    if (confirm(confirmMsg)) {
        try {
            const updates = { hiddenWeb: true };
            if (both) updates.active = false;
            await db.collection('patches').doc(id).update(updates);
        } catch (e) {
            alert("Error: " + e.message);
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
