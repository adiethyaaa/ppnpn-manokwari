// --- PROSES LOGIN FIREBASE ---
function prosesLoginFirebase(event) {
    event.preventDefault();
    
    const userElem = document.getElementById("loginUsername");
    const passElem = document.getElementById("loginPassword");
    const btnElem = document.getElementById("btnLoginSubmit");

    const user = userElem ? userElem.value.trim() : "";
    const pass = passElem ? passElem.value.trim() : "";

    if (!user || !pass) {
        alert("Harap isi username dan password!");
        return;
    }

    if (btnElem) {
        btnElem.disabled = true;
        btnElem.innerText = "Memeriksa...";
    }

    const timeoutTimer = setTimeout(() => {
        if (btnElem) {
            btnElem.disabled = false;
            btnElem.innerText = "Log In";
        }
        alert("⚠️ Koneksi ke server Firebase lambat/gagal. Silakan periksa jaringan internet Anda.");
    }, 10000);

    db.ref('users/' + user).once('value')
        .then((snapshot) => {
            clearTimeout(timeoutTimer);
            if (btnElem) {
                btnElem.disabled = false;
                btnElem.innerText = "Log In";
            }

            const userData = snapshot.val();
            if (userData && userData.password === pass) {
                // Simpan data session user aktif
                sessionStorage.setItem("currentUser", JSON.stringify(userData));
                // Alihkan ke dashboard
                window.location.href = "dashboard.html";
            } else {
                alert("❌ Login Gagal!\nUsername atau Password salah.");
            }
        })
        .catch((error) => {
            clearTimeout(timeoutTimer);
            if (btnElem) {
                btnElem.disabled = false;
                btnElem.innerText = "Log In";
            }
            alert("❌ Terjadi Kesalahan Koneksi Firebase:\n" + error.message);
        });
}

// --- FUNGSI PROTEKSI: CEK APAKAH USER SUDAH LOGIN ---
function checkAuthSession(requiredRole = null) {
    const sessionStr = sessionStorage.getItem("currentUser");
    if (!sessionStr) {
        // Jika tidak ada session login, paksa kembali ke index.html
        window.location.href = "index.html";
        return null;
    }
    
    const currentUser = JSON.parse(sessionStr);
    
    // Jika butuh role tertentu (misal administrator) tapi user biasa
    if (requiredRole && currentUser.role !== requiredRole) {
        alert("⛔ Anda tidak memiliki akses ke halaman ini!");
        window.location.href = "dashboard.html";
        return null;
    }
    
    return currentUser;
}

// --- LOGOUT USER ---
function logoutUser() {
    sessionStorage.clear(); // Hapus seluruh session
    window.location.href = "index.html";
}

function mintaKonfirmasiLogout() {
    const modal = document.getElementById("modalLogout");
    if (modal) modal.style.display = "flex";
}

function tutupModalLogout() {
    const modal = document.getElementById("modalLogout");
    if (modal) modal.style.display = "none";
}

function logoutWithSave(shouldSave) {
    if (shouldSave) {
        if (typeof globalRekap !== "undefined" && Object.keys(globalRekap).length > 0) {
            saveToHistory(true); 
        } else {
            alert("⚠️ Tidak ada data presensi untuk disimpan, melanjutkan logout.");
        }
    }
    logoutUser();
}

// Handler Scroll
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