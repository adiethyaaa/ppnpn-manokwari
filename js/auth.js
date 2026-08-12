// --- PROSES LOGIN FIREBASE DENGAN ANIMASI LOADING ---
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

    // Tampilkan Animasi Loading & Matikan Tombol Sementara
    if (btnElem) {
        btnElem.disabled = true;
        btnElem.innerHTML = `<span class="spinner-login"></span> Check dulu eee...`;
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

            const userData = snapshot.val();
            if (userData && userData.password === pass) {
                // Beri sedikit jeda halus (300ms) agar animasi terlihat elegan sebelum berpindah
                btnElem.innerHTML = `<span class="spinner-login"></span> Mengalihkan...`;
                setTimeout(() => {
                    sessionStorage.setItem("currentUser", JSON.stringify(userData));
                    window.location.href = "dashboard.html";
                }, 300);
            } else {
                if (btnElem) {
                    btnElem.disabled = false;
                    btnElem.innerText = "Log In";
                }
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

// --- PROSES LOGOUT DASHBOARD DENGAN ANIMASI SPINNER ---
function logoutWithSave(shouldSave) {
    const btnNoSave = document.getElementById("btnLogoutNoSave");
    const btnWithSave = document.getElementById("btnLogoutWithSave");

    if (shouldSave) {
        // Tampilkan Spinner di Tombol Simpan & Logout
        if (btnWithSave) {
            btnWithSave.disabled = true;
            btnWithSave.innerHTML = `<span class="spinner-login"></span> Menyimpan...`;
        }
        if (btnNoSave) btnNoSave.disabled = true;

        setTimeout(() => {
            if (typeof globalRekap !== "undefined" && Object.keys(globalRekap).length > 0) {
                saveToHistory(true); 
            } else {
                alert("⚠️ Tidak ada data presensi untuk disimpan, melanjutkan logout.");
            }

            if (btnWithSave) {
                btnWithSave.innerHTML = `<span class="spinner-login"></span> Mengalihkan...`;
            }

            // Jeda singkat agar animasi terlihat elegan sebelum berpindah halaman
            setTimeout(() => {
                logoutUser();
            }, 400);
        }, 300);

    } else {
        // Tampilkan Spinner di Tombol Logout Tanpa Simpan
        if (btnNoSave) {
            btnNoSave.disabled = true;
            btnNoSave.innerHTML = `<span class="spinner-login"></span> Mengalihkan...`;
        }
        if (btnWithSave) btnWithSave.disabled = true;

        setTimeout(() => {
            logoutUser();
        }, 400);
    }
}

// Handler Scroll Otomatis untuk Tombol Logout & Tombol Kelola User
window.onscroll = function() {
    let btnScrollTop = document.getElementById("btnScrollTop");
    let btnLogout = document.getElementById("btnLogoutFloating");
    let btnAdmin = document.getElementById("btnKelolaAdmin");
    let btnHistory = document.getElementById("btnHistoryFloating");
    let scrollTopVal = document.body.scrollTop || document.documentElement.scrollTop;

    // Tombol Ke Atas
    if (btnScrollTop) {
        btnScrollTop.style.display = (scrollTopVal > 750) ? "block" : "none";
    }
    if (btnHistory) {
        btnHistory.style.display = (scrollTopVal > 750) ? "block" : "none";
    }

    // Sembunyikan Tombol History  saat Scroll atas > 50px
    // if (btnHistory) {
    //     if (scrollTopVal > 50) btnHistory.classList.add("hidden-on-scroll");
    //     else btnHistory.classList.remove("hidden-on-scroll");
    // }

    
    // Sembunyikan Tombol Logout saat Scroll Down > 50px
    if (btnLogout) {
        if (scrollTopVal > 50) btnLogout.classList.add("hidden-on-scroll");
        else btnLogout.classList.remove("hidden-on-scroll");
    }

    // Sembunyikan Tombol Kelola User Admin saat Scroll Down > 50px
    if (btnAdmin) {
        if (scrollTopVal > 50) btnAdmin.classList.add("hidden-on-scroll");
        else btnAdmin.classList.remove("hidden-on-scroll");
    }
    
};

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Event listener untuk mendeteksi aktivitas pengguna
if (typeof window !== "undefined") {
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(eventName => {
        window.addEventListener(eventName, resetInactivityTimer, true);
    });

    // Jalankan timer pertama kali saat script dimuat
    resetInactivityTimer();
}

// ==========================================
// AUTO LOGOUT KARENA INAKTIVITAS (45 MENIT)
// ==========================================
const INACTIVITY_LIMIT = 5 * 60 * 1000; // 45 menit dalam milidetik
let inactivityTimer;

function resetInactivityTimer() {
    // Hanya jalankan timer jika user sedang dalam posisi login
    if (!sessionStorage.getItem("currentUser")) return;

    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        alert("⏱️ Sesi Anda telah berakhir karena tidak ada aktivitas selama 5 menit.\nSilakan login kembali.");
        logoutUser();
    }, INACTIVITY_LIMIT);
}

// Event listener untuk mendeteksi aktivitas pengguna
if (typeof window !== "undefined") {
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(eventName => {
        window.addEventListener(eventName, resetInactivityTimer, true);
    });

    // Jalankan timer pertama kali saat script dimuat
    resetInactivityTimer();
}

// --- KONFIRMASI & SPINNER LOGOUT ADMIN ---
function mintaKonfirmasiLogoutAdmin() {
    const modal = document.getElementById("modalLogoutAdmin");
    if (modal) {
        modal.style.display = "flex";
    } else {
        // Fallback jika modal tidak ditemukan
        if (confirm("Apakah Anda yakin ingin keluar dari halaman Administrator?")) {
            logoutUser();
        }
    }
}

function tutupModalLogoutAdmin() {
    const modal = document.getElementById("modalLogoutAdmin");
    if (modal) modal.style.display = "none";
}

function prosesLogoutAdminDenganSpinner() {
    const btn = document.getElementById("btnConfirmLogoutAdmin");
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-login"></span> Mengalihkan...`;
    }

    // Jeda 400ms untuk memberikan efek visual animasi spinner berputar
    setTimeout(() => {
        logoutUser();
    }, 400);
}