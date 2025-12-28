// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCv-3XGV3nimwCNSMPKHBOrCJdDeaTR3AI",
    authDomain: "rijatube-eddff.firebaseapp.com",
    databaseURL: "https://rijatube-eddff-default-rtdb.firebaseio.com",
    projectId: "rijatube-eddff",
    storageBucket: "rijatube-eddff.firebasestorage.app",
    messagingSenderId: "60460948404",
    appId: "1:60460948404:web:4e1bae18253109ff7cf0e1",
    measurementId: "G-C6JRPNKR1V"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const ALLOWED_ADMINS = ["rijanjoshi66@gmail.com", "shivparvati9912@gmail.com"];

const USER_TAGS = [
    "Student", "Blue Tick", "Golden Tick", "Admin", "Moderator", "VIP", "Golden VIP",
    "Legend", "Mythical", "Original", "Tester", "Developer", "Support", "Helper",
    "Artist", "Creator", "Streamer", "YouTuber", "Pro Player", "Elite", "Master",
    "Grandmaster", "Champion", "Hero", "Guardian", "Sentinel", "Scout", "Veteran",
    "Rookie", "Nova", "Supernova", "Galaxy", "Universal", "Divine", "Immortal",
    "Eternal", "Zenith", "Apex", "Prime", "Alpha", "Beta", "Gamma", "Delta",
    "Sigma", "Omega", "Shadow", "Light", "Dark", "Solar", "Lunar", "Astral",
    "Cosmic", "Mystic", "Ancient", "Relic", "Artifact", "Gem", "Diamond",
    "Platinum", "Gold", "Silver", "Bronze"
];

// DOM Elements (Safe selection)
const safeGet = (id) => document.getElementById(id);
const loginOverlay = safeGet('login-overlay');
const dashboard = safeGet('admin-dashboard');
const loginBtn = safeGet('google-login-btn');
const logoutBtn = safeGet('logout-btn');
const loginError = safeGet('login-error');
const userCardsContainer = safeGet('user-cards-container');
const userSearchInput = safeGet('user-search');
const targetType = safeGet('patch-target-type');
const targetUserGroup = safeGet('target-user-group');
const targetUserSelect = safeGet('patch-target-user');
const patchDurationType = safeGet('patch-duration-type');
const durationInputGroup = safeGet('duration-input-group');
const sendPatchBtn = safeGet('send-patch-btn');
const sendNoticeBtn = safeGet('send-notice-btn');
const noticeStatus = safeGet('notice-status');

let allUsers = [];

// Auth State Monitor
auth.onAuthStateChanged(user => {
    if (user) {
        if (ALLOWED_ADMINS.includes(user.email)) {
            setupDashboard(user);
        } else {
            if (loginError) loginError.innerText = "Access Forbidden: Admin account required.";
            auth.signOut();
        }
    } else {
        showLogin();
    }
});

// Login Function
if (loginBtn) {
    loginBtn.onclick = () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(error => {
            if (loginError) loginError.innerText = error.message;
        });
    };
}

// Logout Function
if (logoutBtn) {
    logoutBtn.onclick = () => {
        if (confirm("Sign out of Admin Panel?")) {
            auth.signOut();
        }
    };
}

function showLogin() {
    if (loginOverlay) loginOverlay.classList.remove('hidden');
    if (dashboard) dashboard.classList.add('hidden');
    // If on a sub-page and not logged in, redirect to index
    if (!window.location.pathname.endsWith('index.html') && !window.location.pathname.endsWith('/') && !loginOverlay) {
        location.href = 'index.html';
    }
}

function setupDashboard(user) {
    if (loginOverlay) loginOverlay.classList.add('hidden');
    if (dashboard) dashboard.classList.remove('hidden');

    const nameEl = safeGet('admin-name');
    const emailEl = safeGet('admin-email');
    if (nameEl) nameEl.innerText = user.displayName;
    if (emailEl) emailEl.innerText = user.email;

    if (user.photoURL) {
        const photo = safeGet('admin-photo');
        if (photo) {
            photo.src = user.photoURL;
            photo.classList.remove('hidden');
        }
    }

    // Page-specific initializers
    loadCommonData();
    const path = window.location.pathname;
    if (path.includes('users.html')) loadUsers();
    if (path.includes('patch.html')) { loadUsers(); loadPatchHistory(); }
    if (path.includes('analytics.html')) loadAnalytics();
    if (path.includes('logs.html')) loadSystemLogs();
    if (path.includes('leaderboard.html')) loadLeaderboard();
    if (path.includes('support.html')) loadSupportRequests();
    if (path.includes('supporthelp.html')) loadAdvancedSupportRequests();

    updateAdminStatus(true);
}

function loadCommonData() {
    loadStats(); // Always load stats for the header/overview
}

// Track Admin Online Status
function updateAdminStatus(online) {
    const user = auth.currentUser;
    if (user && ALLOWED_ADMINS.includes(user.email)) {
        db.collection('users').doc(user.uid).update({
            is_online: online,
            last_online: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(() => { }); // Ignore error if doc doesn't exist yet
    }
}

window.onbeforeunload = () => updateAdminStatus(false);

// Targeting Logic
if (targetType) {
    targetType.onchange = () => {
        if (targetUserGroup) targetUserGroup.style.display = targetType.value === 'specific' ? 'flex' : 'none';
    };
}

// Real-time Stats
function loadStats() {
    db.collection('users').onSnapshot(snapshot => {
        const users = snapshot.docs.map(doc => doc.data());
        // Filter out admins from stats
        const activeUsers = users.filter(u => !ALLOWED_ADMINS.includes(u.email));

        const total = activeUsers.length;
        const banned = activeUsers.filter(u => u.is_banned === true).length;
        const online = activeUsers.filter(u => u.is_online === true).length;

        // Front Page Stats
        const totalUsersEl = safeGet('total-users');
        const totalBannedEl = safeGet('total-banned');
        if (totalUsersEl) totalUsersEl.innerText = total;
        if (totalBannedEl) totalBannedEl.innerText = banned;

        // Analytics Tab Stats
        const anaTotal = safeGet('ana-total-users');
        const anaAdmins = safeGet('ana-admins');
        const anaBanned = safeGet('ana-banned');
        const anaOnline = safeGet('ana-online');

        if (anaTotal) anaTotal.innerText = total;
        if (anaBanned) anaBanned.innerText = banned;
        if (anaOnline) anaOnline.innerText = online;
    });
}

// User List with Real-time Updates
function loadUsers() {
    if (!userCardsContainer && !targetUserSelect) return;
    db.collection('users').onSnapshot(snapshot => {
        allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderUsers(allUsers);
    }, error => {
        if (userCardsContainer) userCardsContainer.innerHTML = `<div class="error-msg">Failed to load users: ${error.message}</div>`;
    });
}

function renderUsers(users) {
    if (userCardsContainer) userCardsContainer.innerHTML = '';
    // Filter out all admin emails
    const filteredUsers = users.filter(u => !ALLOWED_ADMINS.includes(u.email));

    // Populate Targeting Dropdown
    if (targetUserSelect) {
        targetUserSelect.innerHTML = '';
        filteredUsers.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id; // Using Firestore Doc ID as UID
            opt.innerText = `${u.name || 'User'} (${u.email || 'No Email'})`;
            targetUserSelect.appendChild(opt);
        });
    }

    if (userCardsContainer) {
        if (filteredUsers.length === 0) {
            userCardsContainer.innerHTML = '<div class="empty-state"><p>No users found.</p></div>';
            return;
        }

        filteredUsers.forEach(user => {
            const card = createUserCard(user);
            userCardsContainer.appendChild(card);
        });
    }
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
                    <div style="display: flex; gap: 8px; align-items: center; margin-top: 5px;">
                        <div class="tag-badge-small" style="background: ${getTagColor(user.tag)}">
                            ${user.tag || 'Student'}
                        </div>
                        <span class="status-indicator ${user.is_online ? 'online' : ''}" style="font-size: 0.65rem;">
                            ${user.is_online ? 'Online' : 'Offline'}
                        </span>
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
                <i class="fas fa-tags"></i> Tag (Cycle)
            </button>
            <button class="m-btn edit-btn" style="background: var(--primary)20; border-color: var(--primary)40; color: var(--primary);" onclick="openEditModal('${user.id}')">
                <i class="fas fa-pencil-alt"></i> Edit
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
    // Security check: Admins cannot be banned
    if (ALLOWED_ADMINS.includes(email) && !currentStatus) {
        alert("Security Alert: Administrator accounts cannot be banned.");
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

// Full Edit System
let currentEditUserId = null;

window.openEditModal = (userId) => {
    currentEditUserId = userId;
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    safeGet('edit-name').value = user.name || '';
    safeGet('edit-level').value = user.level || 0;

    // Setup Tags Selector
    const container = safeGet('tags-selector');
    container.innerHTML = '';
    const activeTags = user.tags || (user.tag ? [user.tag] : []);

    USER_TAGS.forEach(tag => {
        const div = document.createElement('div');
        div.className = `tag-option ${activeTags.includes(tag) ? 'selected' : ''}`;
        div.innerText = tag;
        div.onclick = () => div.classList.toggle('selected');
        container.appendChild(div);
    });

    safeGet('edit-user-modal').classList.remove('hidden');
};

window.closeEditModal = () => {
    safeGet('edit-user-modal').classList.add('hidden');
    currentEditUserId = null;
};

window.saveUserChanges = async () => {
    if (!currentEditUserId) return;

    const newName = safeGet('edit-name').value.trim();
    const newLevel = parseInt(safeGet('edit-level').value);
    const selectedTags = Array.from(document.querySelectorAll('.tag-option.selected')).map(el => el.innerText);

    if (newLevel > 1000) {
        alert("Max level is 1000");
        return;
    }

    try {
        await db.collection('users').doc(currentEditUserId).update({
            name: newName,
            level: newLevel,
            tags: selectedTags,
            tag: selectedTags[0] || 'Student' // For backward compatibility
        });

        // Add a log entry
        await db.collection('logs').add({
            action: `Modified user ${currentEditUserId}`,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            admin: auth.currentUser.email
        });

        closeEditModal();
        alert("User updated successfully!");
    } catch (e) {
        alert("Save failed: " + e.message);
    }
};

// Patch System Logic
if (patchDurationType) {
    patchDurationType.onchange = () => {
        if (durationInputGroup) durationInputGroup.style.display = patchDurationType.value === 'custom' ? 'flex' : 'none';
    };
}

if (sendPatchBtn) {
    sendPatchBtn.onclick = async () => {
        const message = safeGet('patch-message').value.trim();
        const tag = safeGet('patch-tag').value;
        const durationType = patchDurationType.value;
        const hours = parseInt(safeGet('patch-hours').value);
        const targetTypeVal = targetType.value;
        const targetUid = targetTypeVal === 'all' ? 'all' : targetUserSelect.value;
        const statusDiv = safeGet('patch-status');

        if (targetTypeVal === 'specific' && !targetUid) {
            if (statusDiv) statusDiv.innerText = "Error: Please select a specific user or wait for users to load.";
            return;
        }

        if (!message) {
            if (statusDiv) statusDiv.innerText = "Error: Message cannot be empty.";
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

            if (statusDiv) {
                statusDiv.style.color = 'var(--success)';
                statusDiv.innerText = "Patch broadcasted successfully!";
                safeGet('patch-message').value = '';
            }

            setTimeout(() => {
                if (statusDiv) statusDiv.innerText = '';
            }, 3000);
        } catch (e) {
            if (statusDiv) {
                statusDiv.style.color = 'var(--danger)';
                statusDiv.innerText = "Failed to send patch: " + e.message;
            }
        } finally {
            sendPatchBtn.disabled = false;
            sendPatchBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Patch Now';
        }
    };
}

// Global Notice System
if (sendNoticeBtn) {
    sendNoticeBtn.onclick = async () => {
        const title = safeGet('notice-title').value.trim();
        const message = safeGet('notice-message').value.trim();
        const duration = parseInt(safeGet('notice-duration').value) || 5;

        if (!title || !message) {
            showAdminToast("Title and Message are required!", "danger");
            return;
        }

        sendNoticeBtn.disabled = true;
        sendNoticeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Broadcasting...';

        try {
            await db.collection('notices').doc('latest').set({
                title: title,
                message: message,
                duration: duration,
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                sender: auth.currentUser.email
            });

            showAdminToast("Global Notice Broadcasted!", "success");
            safeGet('notice-title').value = '';
            safeGet('notice-message').value = '';
        } catch (e) {
            showAdminToast("Broadcast failed: " + e.message, "danger");
        } finally {
            sendNoticeBtn.disabled = false;
            sendNoticeBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Broadcast Notice Now';
        }
    };
}

function showAdminToast(msg, type) {
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '100px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = type === 'success' ? 'var(--success)' : 'var(--danger)';
    toast.style.color = 'white';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '12px';
    toast.style.zIndex = '3000';
    toast.style.boxShadow = '0 10px 20px rgba(0,0,0,0.3)';
    toast.style.fontWeight = 'bold';
    toast.style.animation = 'fadeInScale 0.3s ease-out';
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Patch History and Revocation
function loadPatchHistory() {
    const historyContainer = safeGet('patch-history-container');
    if (!historyContainer) return;
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

// Support System
let activeChatRequestId = null;
let chatUnsubscribe = null;

function loadSupportRequests() {
    const requestList = safeGet('request-list');
    if (!requestList) return;
    db.collection('support_requests').onSnapshot(snapshot => {
        requestList.innerHTML = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const item = document.createElement('div');
            item.className = `request-item ${activeChatRequestId === doc.id ? 'active' : ''}`;
            item.onclick = () => openChat(doc.id, data);

            item.innerHTML = `
                <div class="request-name">${data.name}</div>
                <p style="font-size: 0.75rem; color: var(--text-dim); margin: 5px 0;">${data.message.substring(0, 40)}...</p>
                <div class="request-meta">
                    <span class="request-status status-${data.status}">${data.status}</span>
                </div>
            `;
            requestList.appendChild(item);
        });
    });
}

window.updateRequestStatus = async (e, id, status) => {
    e.stopPropagation();
    try {
        await db.collection('support_requests').doc(id).update({ status: status });
    } catch (err) {
        alert("Error: " + err.message);
    }
};

function openChat(requestId, requestData) {
    activeChatRequestId = requestId;

    // UI adjustments for mobile
    const main = document.querySelector('.messenger-main');
    const sidebar = document.querySelector('.messenger-sidebar');
    if (main) main.style.display = 'flex';
    if (sidebar && window.innerWidth < 768) sidebar.style.display = 'none';

    const header = safeGet('chat-header');
    const inputArea = safeGet('chat-input-area');
    const userName = safeGet('chat-user-name');

    if (header) header.classList.remove('hidden');
    if (inputArea) inputArea.classList.remove('hidden');
    if (userName) userName.innerText = requestData.name;

    // Highlight active item
    document.querySelectorAll('.request-item').forEach(i => i.classList.remove('active'));

    // Listen for user online status
    db.collection('users').doc(requestData.uid).onSnapshot(doc => {
        if (doc.exists) {
            const online = doc.data().is_online;
            const statusEl = document.getElementById('chat-user-status');
            statusEl.innerText = online ? 'Online' : 'Offline';
            statusEl.className = `status-indicator ${online ? 'online' : ''}`;
        }
    });

    loadMessages(requestId);
}

function loadMessages(requestId) {
    if (chatUnsubscribe) chatUnsubscribe();

    const messagesContainer = document.getElementById('chat-messages');
    chatUnsubscribe = db.collection('chats')
        .where('requestId', '==', requestId)
        .orderBy('created_at', 'asc')
        .onSnapshot(snapshot => {
            messagesContainer.innerHTML = '';
            snapshot.forEach(doc => {
                const msg = doc.data();
                const bubble = document.createElement('div');
                bubble.className = `message-bubble ${msg.is_admin ? 'message-admin' : 'message-user'}`;
                bubble.innerText = msg.message;
                messagesContainer.appendChild(bubble);
            });
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
}

const chatSendBtn = safeGet('chat-send-btn');
const chatInput = safeGet('chat-input');
if (chatSendBtn) chatSendBtn.onclick = sendMessage;
if (chatInput) {
    chatInput.onkeypress = (e) => {
        if (e.key === 'Enter') sendMessage();
    };
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg || !activeChatRequestId) return;

    input.value = '';
    const user = auth.currentUser;

    await db.collection('chats').add({
        requestId: activeChatRequestId,
        senderId: user.uid,
        senderName: "Rijan (Admin)",
        message: msg,
        is_admin: true,
        created_at: firebase.firestore.FieldValue.serverTimestamp()
    });
}

// Leaderboard Logic
function loadLeaderboard() {
    const container = safeGet('leaderboard-container');
    if (!container) return;
    db.collection('users')
        .orderBy('level', 'desc')
        .orderBy('exp', 'desc')
        .limit(20)
        .onSnapshot(snapshot => {
            container.innerHTML = '';
            let rank = 1;
            snapshot.forEach(doc => {
                const user = doc.data();
                const isAdmin = ALLOWED_ADMINS.includes(user.email);

                const card = document.createElement('div');
                card.className = 'user-card';
                card.style.borderLeft = rank <= 3 ? `4px solid var(--gold)` : 'none';

                card.innerHTML = `
                    <div class="user-main" style="display: flex; align-items: center;">
                        <div class="rank-number" style="font-weight: 800; font-size: 1.2rem; min-width: 40px; color: var(--primary);">
                            #${rank}
                        </div>
                        <div class="m-user-info">
                            <h4 style="margin: 0;">${user.name || 'Student User'} ${isAdmin ? '<i class="fas fa-verified" style="color: #2196F3; font-size: 0.8rem;"></i>' : ''}</h4>
                            <p style="margin: 5px 0 0 0; font-size: 0.85rem; color: var(--text-dim);">Level ${user.level || 0} • ${user.exp || 0} EXP</p>
                        </div>
                    </div>
                `;
                container.appendChild(card);
                rank++;
            });
        });
}

// Analytics
function loadAnalytics() {
    const compList = safeGet('compromised-list');
    if (!compList) return;
    db.collection('users')
        .where('is_compromised', '==', true)
        .onSnapshot(snapshot => {
            compList.innerHTML = '';
            if (snapshot.empty) {
                compList.innerHTML = '<p style="text-align: center; color: var(--text-dim); padding: 20px;">No security threats detected.</p>';
                return;
            }
            snapshot.forEach(doc => {
                const user = doc.data();
                const card = document.createElement('div');
                card.className = 'history-item';
                card.style.borderLeft = '4px solid var(--danger)';
                card.innerHTML = `
                    <div class="history-header">
                        <span class="status-badge" style="background: var(--danger); color: white;">COMPROMISED</span>
                        <span style="font-size: 0.8rem; font-weight: bold;">${user.name}</span>
                    </div>
                    <p class="history-msg">UID: ${user.uid_number} | Package: ${user.security_details?.current_package || 'Unknown'}</p>
                    <div class="history-meta">
                        <span>Rooted: ${user.security_details?.rooted ? 'YES' : 'NO'}</span>
                        <span>Emulator: ${user.security_details?.emulator ? 'YES' : 'NO'}</span>
                    </div>
                `;
                compList.appendChild(card);
            });
        });
}

function loadSystemLogs() {
    const logsContainer = safeGet('activity-logs');
    if (!logsContainer) return;

    // Simulate activity log
    logsContainer.innerHTML = `
        <div class="history-item">
            <div class="history-header">
                <span class="status-badge" style="background: var(--primary); color: white;">SYSTEM</span>
                <span>${new Date().toLocaleString()}</span>
            </div>
            <p class="history-msg">Administrator logged in from dashboard.</p>
        </div>
        <div class="history-item">
            <div class="history-header">
                <span class="status-badge" style="background: var(--success); color: white;">AUTH</span>
                <span>Initializing...</span>
            </div>
            <p class="history-msg">Firebase Connected Successfully.</p>
        </div>
    `;
}

function loadAdvancedSupportRequests() {
    const list = safeGet('advanced-request-list');
    if (!list) return;

    db.collection('support_requests').onSnapshot(snapshot => {
        list.innerHTML = '';
        if (snapshot.empty) {
            list.innerHTML = '<p style="text-align: center; color: var(--text-dim);">No requests yet.</p>';
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const card = document.createElement('div');
            card.className = 'history-item';
            const statusColor = data.status === 'approved' ? 'var(--success)' : (data.status === 'rejected' ? 'var(--danger)' : 'var(--warning)');

            card.innerHTML = `
                <div class="history-header">
                    <span class="status-badge" style="background: ${statusColor}; color: white;">${data.status.toUpperCase()}</span>
                    <strong>${data.name}</strong>
                </div>
                <p class="history-msg">${data.message}</p>
                <div class="history-actions">
                    <button onclick="updateRequestStatus(event, '${doc.id}', 'approved')" style="color: var(--success); border: 1px solid var(--success); background: none; border-radius: 5px; cursor: pointer; padding: 5px 10px;">
                        <i class="fas fa-check"></i>
                    </button>
                    <button onclick="updateRequestStatus(event, '${doc.id}', 'rejected')" style="color: var(--danger); border: 1px solid var(--danger); background: none; border-radius: 5px; cursor: pointer; padding: 5px 10px;">
                        <i class="fas fa-times"></i>
                    </button>
                    <button onclick="location.href='support.html'" style="color: var(--primary); border: 1px solid var(--primary); background: none; border-radius: 5px; cursor: pointer; padding: 5px 10px;">
                        <i class="fas fa-comments"></i> Chat
                    </button>
                    <button onclick="deleteSupportRequest(event, '${doc.id}')" style="color: var(--danger); border: 1px solid var(--danger); background: none; border-radius: 5px; cursor: pointer; padding: 5px 10px;" title="Delete Permanently">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
            list.appendChild(card);
        });
    });
}

async function deleteSupportRequest(e, id) {
    e.stopPropagation();
    if (confirm("Permanently delete this request from Firebase? (This will also remove it from the User's view in the App)")) {
        try {
            await db.collection('support_requests').doc(id).delete();
            // Also cleanup chats associated with this request
            const chatSnap = await db.collection('chats').where('requestId', '==', id).get();
            const batch = db.batch();
            chatSnap.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        } catch (err) {
            alert("Error: " + err.message);
        }
    }
}

// Remove old SPA nav logic as we are using multi-page links now.
