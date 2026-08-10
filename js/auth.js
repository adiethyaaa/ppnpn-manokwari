// --- PROSES LOGIN FIREBASE ---
function prosesLoginFirebase(event) {
    event.preventDefault();
    const user = document.getElementById("loginUsername").value.trim();
    const pass = document.getElementById("loginPassword").value.trim();

    if (!user || !pass) {
        alert("Harap isi username dan password!");
        return;
    }

    db.ref('users/' + user).once('value', (snapshot) => {
        const userData = snapshot.val();
        if (userData && userData.password === pass) {
            sessionStorage.setItem("currentUser", JSON.stringify(userData));
            window.location.href = "dashboard.html";
        } else {
            alert("❌ Login Gagal!\nUsername atau Password salah.");
        }
    });
}

// --- CEK SESSION LOGIN & HAK AKSES ---
function checkAuthSession(requiredRole = null) {
    const sessionStr = sessionStorage.getItem("currentUser");
    if (!sessionStr) {
        window.location.href = "index.html";
        return null;
    }
    const currentUser = JSON.parse(sessionStr);
    
    if (requiredRole && currentUser.role !== requiredRole) {
        alert("⛔ Anda tidak memiliki akses ke halaman ini!");
        window.location.href = "dashboard.html";
        return null;
    }
    
    return currentUser;
}

// --- LOGOUT ---
function logoutUser() {
    sessionStorage.removeItem("currentUser");
    window.location.href = "index.html";
}

// Fitur scroll otomatis untuk tombol logout mengambang
window.onscroll = function() {
    let btnScrollTop = document.getElementById("btnScrollTop");
    let btnLogout = document.getElementById("btnLogoutFloating");
    let scrollTopVal = document.body.scrollTop || document.documentElement.scrollTop;

    if (btnScrollTop) {
        btnScrollTop.style.display = (scrollTopVal > 200) ? "block" : "none";
    }
    if (btnLogout) {
        if (scrollTopVal > 50) btnLogout.classList.add("hidden-on-scroll");
        else btnLogout.classList.remove("hidden-on-scroll");
    }
};

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}