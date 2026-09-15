// =========================================================
// 1. INIT & PROTEKSI SESI (SESSION MANAGEMENT)
// =========================================================

// Initialize Session User saat Halaman Dibuka
// Initialize Session User saat Halaman Dibuka
(function initAuthSession() {
    try {
        let sessionRaw = localStorage.getItem("userSession") || sessionStorage.getItem("userSession") || localStorage.getItem("activeUser");
        if (sessionRaw) {
            window.currentUser = JSON.parse(sessionRaw);
        }

        // 💡 PENYESUAIAN OPSI 2: Otomatisasi Firebase Auth di Latar Belakang
        if (typeof firebase !== "undefined" && firebase.auth) {
            firebase.auth().onAuthStateChanged((user) => {
                if (!user) {
                    firebase.auth().signInAnonymously().catch(e => console.warn("Auto Auth Silent Error:", e));
                }
            });
        }
    } catch (e) {
        console.warn("Gagal inisialisasi user session:", e);
    }
})();

// Cek Apakah User Sudah Login (Proteksi Halaman)
function checkAuthSession(requiredRole = null) {
    // 💡 PERBAIKAN: Gunakan kunci yang konsisten "userSession"
    const sessionStr = localStorage.getItem("userSession") || sessionStorage.getItem("userSession");
    
    if (!sessionStr) {
        window.location.href = "index.html";
        return null;
    }
    
    const loggedInUser = JSON.parse(sessionStr);
    window.currentUser = loggedInUser; // Set ulang ke global memori
    
    if (requiredRole && loggedInUser.role !== requiredRole) {
        alert("⛔ Anda tidak memiliki akses ke halaman ini!");
        window.location.href = "dashboard.html";
        return null;
    }
    
    return loggedInUser;
}

// =========================================================
// 2. PROSES LOGIN
// =========================================================
// =========================================================
// PROSES LOGIN (FIXED FIREBASE INITIALIZATION)
// =========================================================
async function prosesLogin() {
    const usernameInput = document.getElementById("loginUsername");
    const passwordInput = document.getElementById("loginPassword");

    if (!usernameInput || !passwordInput) {
        alert("⚠️ Elemen form login tidak ditemukan!");
        return;
    }

    const usernameVal = usernameInput.value.trim().toLowerCase();
    const passwordVal = passwordInput.value.trim();

    if (!usernameVal || !passwordVal) {
        alert("⚠️ Harap isi Username dan Password!");
        return;
    }

    // Ubah tampilan tombol saat memproses
    const btnLogin = document.getElementById("btnLoginSubmit");
    let originalText = "Log In";
    if (btnLogin) {
        originalText = btnLogin.innerHTML;
        btnLogin.innerHTML = "⏳ Memproses...";
        btnLogin.disabled = true;
    }

    // 💡 1. INSISIALISASI FIREBASE DATABASE
    let dbRef = null;
    try {
        if (typeof firebase !== "undefined") {
            if (!firebase.apps.length && typeof firebaseConfig !== "undefined") {
                firebase.initializeApp(firebaseConfig);
            }
            if (firebase.apps.length) {
                dbRef = firebase.database();
                window.db = dbRef;
            }
        }
    } catch (errInit) {
        console.error("Gagal inisialisasi Firebase App:", errInit);
    }

    if (!dbRef) {
        if (typeof db !== "undefined" && db !== null) dbRef = db;
        else if (typeof database !== "undefined" && database !== null) dbRef = database;
    }

    if (!dbRef) {
        alert("❌ Koneksi Firebase belum siap!");
        if (btnLogin) { btnLogin.innerHTML = originalText; btnLogin.disabled = false; }
        return;
    }

    // 💡 2. PASTIKAN USER TERAUTENTIKASI SECARA ANONIM DULU (CEK OPSI 2)
    try {
        if (typeof firebase !== "undefined" && firebase.auth) {
            if (!firebase.auth().currentUser) {
                await firebase.auth().signInAnonymously();
            }
        }
    } catch (authErr) {
        console.warn("Autentikasi Anonim Error:", authErr);
    }

    // 💡 3. MEMBACA DATA USER DARI FIREBASE NODE 'users'
    dbRef.ref('users/' + usernameVal).once('value')
        .then((snapshot) => {
            const user = snapshot.val();

            if (user && String(user.password).trim() === passwordVal) {
                let unitVal = user.unitKerja || 'Kanreg XIV BKN';
                if (unitVal === 'Kanreg XIV') unitVal = 'Kanreg XIV BKN';
                if (unitVal === 'UPT Sorong') unitVal = 'UPT BKN Sorong';

                const dataUserLogin = {
                    username: user.username || usernameVal,
                    nama: user.nama || user.namaLengkap || user.username || usernameVal,
                    role: user.role || 'operator',
                    unitKerja: unitVal,
                    permissions: user.permissions || {}
                };

                window.currentUser = dataUserLogin;
                localStorage.setItem("userSession", JSON.stringify(dataUserLogin));
                sessionStorage.setItem("userSession", JSON.stringify(dataUserLogin));

                window.location.href = "dashboard.html";
            } else {
                alert("❌ Username atau Password salah!");
                if (btnLogin) {
                    btnLogin.innerHTML = originalText;
                    btnLogin.disabled = false;
                }
            }
        })
        .catch((err) => {
            console.error("Error Firebase Login:", err);
            alert("❌ Terjadi Kesalahan Database:\n" + err.message);
            if (btnLogin) {
                btnLogin.innerHTML = originalText;
                btnLogin.disabled = false;
            }
        });
}

// =========================================================
// 3. LOGOUT & MODAL KONFIRMASI
// =========================================================

function logoutUser() {
    // 💡 PERBAIKAN: Bersihkan semua jejak session agar aman
    localStorage.removeItem("userSession");
    sessionStorage.removeItem("userSession");
    localStorage.removeItem("activeUser");
    sessionStorage.clear(); 
    
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

function mintaKonfirmasiLogoutAdmin() {
    const modal = document.getElementById("modalLogoutAdmin");
    if (modal) {
        modal.style.display = "flex";
    } else {
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
    setTimeout(() => {
        logoutUser();
    }, 400);
}

function logoutWithSave(shouldSave) {
    const btnNoSave = document.getElementById("btnLogoutNoSave");
    const btnWithSave = document.getElementById("btnLogoutWithSave");

    if (shouldSave) {
        if (btnWithSave) {
            btnWithSave.disabled = true;
            btnWithSave.innerHTML = `<span class="spinner-login"></span> Menyimpan...`;
        }
        if (btnNoSave) btnNoSave.disabled = true;

        setTimeout(() => {
            if (typeof globalRekap !== "undefined" && Object.keys(globalRekap).length > 0) {
                if (typeof saveToHistory === "function") saveToHistory(true); 
            } else {
                alert("⚠️ Tidak ada data presensi untuk disimpan, melanjutkan logout.");
            }

            if (btnWithSave) {
                btnWithSave.innerHTML = `<span class="spinner-login"></span> Mengalihkan...`;
            }

            setTimeout(() => {
                logoutUser();
            }, 400);
        }, 300);

    } else {
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

// =========================================================
// 4. AUTO LOGOUT / INACTIVITY TIMER
// =========================================================

// =========================================================
// 4. AUTO LOGOUT / INACTIVITY TIMER (SAFE GLOBAL DECLARATION)
// =========================================================

// Gunakan properti window agar aman dari duplicate declaration error
window.inactivityTimer = window.inactivityTimer || null;
window.countdownInterval = window.countdownInterval || null;
window.INACTIVITY_LIMIT_SECONDS = 15 * 60; // timer 15 Menit (900 Detik)
window.secondsRemaining = window.secondsRemaining || window.INACTIVITY_LIMIT_SECONDS;

// Fungsi untuk mereset dan menjalankan ulang timer
function resetInactivityTimer() {
    // 1. Hapus timeout & interval lama jika ada
    if (window.inactivityTimer) clearTimeout(window.inactivityTimer);
    if (window.countdownInterval) clearInterval(window.countdownInterval);

    // 2. Reset hitungan detik
    window.secondsRemaining = window.INACTIVITY_LIMIT_SECONDS;
    updateTimerDisplay();

    // 3. Jalankan Interval Hitung Mundur setiap 1 detik
    window.countdownInterval = setInterval(() => {
        window.secondsRemaining--;
        updateTimerDisplay();

        if (window.secondsRemaining <= 0) {
            clearInterval(window.countdownInterval);
        }
    }, 1000);

    // 4. Setel Timeout Auto Logout saat waktu habis
    window.inactivityTimer = setTimeout(() => {
        alert("⏱️ Sesi Anda telah berakhir karena tidak ada aktivitas selama beberapa menit. Silakan login kembali.");
        if (typeof logoutUser === "function") {
            logoutUser();
        } else {
            localStorage.removeItem("userSession");
            sessionStorage.removeItem("userSession");
            window.location.href = "index.html";
        }
    }, window.INACTIVITY_LIMIT_SECONDS * 1000);
}

// Fungsi pembantu untuk memperbarui teks angka di layar HTML
function updateTimerDisplay() {
    const elDisplay = document.getElementById("timerCountdown");
    if (!elDisplay) return;

    const minutes = Math.floor(window.secondsRemaining / 60);
    const seconds = window.secondsRemaining % 60;

    // Format angka 2 digit (contoh: 02:05)
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');

    elDisplay.innerText = `${formattedMinutes}:${formattedSeconds}`;

    // Update pill styling jika < 1 menit (peringatan sesi)
    const pill = document.getElementById("sessionTimerPill") || elDisplay.closest(".session-timer-pill");
    if (pill) {
        if (minutes < 1) {
            pill.classList.add("warning");
        } else {
            pill.classList.remove("warning");
        }
    }
}

// =========================================================
// JAM REALTIME (WIT - MANOKWARI, PAPUA BARAT)
// =========================================================
function startRealtimeClock() {
    function tick() {
        const now = new Date();
        const clockEl = document.getElementById("liveClockDisplay");
        const dateEl = document.getElementById("liveDateDisplay");

        if (clockEl) {
            const timeOptions = {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
                timeZone: 'Asia/Jayapura'
            };
            clockEl.innerText = now.toLocaleTimeString('id-ID', timeOptions) + " WIT";
        }

        if (dateEl) {
            const dateOptions = {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: 'Asia/Jayapura'
            };
            dateEl.innerText = now.toLocaleDateString('id-ID', dateOptions);
        }
    }

    tick();
    setInterval(tick, 1000);
}

// Event Listener DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
    // Jalankan jam realtime di seluruh halaman
    startRealtimeClock();

    // Deteksi Halaman Login secara presisi (termasuk root URL GitHub Pages)
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.endsWith("/") || 
                        currentPath.endsWith("index.html") || 
                        currentPath.includes("index.html");

    // TIMER HANYA DIJALANKAN JIKA BUKAN HALAMAN LOGIN
    if (!isLoginPage) {
        
        // 1. Tampilkan Info User di Header Atas
        let activeUser = null;
        if (typeof currentUser !== "undefined" && currentUser) {
            activeUser = currentUser;
        } else {
            try {
                let sessionRaw = localStorage.getItem("userSession") || sessionStorage.getItem("userSession");
                if (sessionRaw) activeUser = JSON.parse(sessionRaw);
            } catch (e) {
                console.warn("Gagal membaca session:", e);
            }
        }

        if (activeUser) {
            const usernameDisplay = activeUser.nama || activeUser.username || "User";
            const elLabel = document.getElementById("lblSessionUsername");
            if (elLabel) elLabel.innerText = usernameDisplay;

            const elDropdownName = document.getElementById("dropdownUserName");
            if (elDropdownName) elDropdownName.innerText = usernameDisplay;

            const elAvatar = document.getElementById("userAvatarInitials");
            if (elAvatar) {
                elAvatar.innerText = usernameDisplay.charAt(0).toUpperCase();
            }

            const elRole = document.getElementById("lblSessionRole");
            if (elRole) {
                const roleName = (activeUser.role === "administrator") ? "Administrator" : "Operator";
                elRole.innerText = roleName;
                elRole.className = `user-role-badge ${activeUser.role === 'administrator' ? 'role-admin' : 'role-operator'}`;
            }

            const elUnit = document.getElementById("lblSessionUnit");
            if (elUnit) {
                let unitDisplay = activeUser.unitKerja || "Kanreg XIV BKN";
                if (unitDisplay === "Kanreg XIV") unitDisplay = "Kanreg XIV BKN";
                if (unitDisplay === "UPT Sorong") unitDisplay = "UPT BKN Sorong";
                elUnit.innerText = unitDisplay;
            }

            // Tampilkan tombol kelola admin di dropdown jika administrator
            const btnAdminHeader = document.getElementById("btnHeaderAdmin");
            if (btnAdminHeader) {
                if (activeUser.role === "administrator") {
                    btnAdminHeader.style.display = "flex";
                } else {
                    btnAdminHeader.style.display = "none";
                }
            }
        }

        // 2. Jalankan Timer Sesi
        resetInactivityTimer();
        
        // 3. Reset Timer hanya pada event Klik / Touch / Keydown
        const resetEvents = ["click", "touchstart", "keydown"];
        resetEvents.forEach((eventType) => {
            document.addEventListener(eventType, () => {
                resetInactivityTimer();
            }, { passive: true });
        });
    }
});

// =========================================================
// 5. USER PROFILE DROPDOWN TOGGLE
// =========================================================

function toggleUserDropdown(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const menu = document.getElementById("userDropdownMenu");
    const btn = document.getElementById("btnUserDropdownToggle");
    if (!menu) return;

    const isVisible = menu.style.display === "block";
    menu.style.display = isVisible ? "none" : "block";
    if (btn) btn.setAttribute("aria-expanded", !isVisible);
}

// Tutup dropdown jika klik di luar
document.addEventListener("click", (e) => {
    const dropdownContainer = document.querySelector(".user-dropdown-container");
    const menu = document.getElementById("userDropdownMenu");
    const btn = document.getElementById("btnUserDropdownToggle");
    if (dropdownContainer && !dropdownContainer.contains(e.target) && menu) {
        menu.style.display = "none";
        if (btn) btn.setAttribute("aria-expanded", "false");
    }
});

// =========================================================
// 6. UI & SCROLL HANDLERS
// =========================================================

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.onscroll = function() {
    let btnScrollTop = document.getElementById("btnScrollTop");
    let scrollTopVal = document.body.scrollTop || document.documentElement.scrollTop;

    // Tombol Scroll ke Atas Muncul Jika Jauh ke Bawah
    if (btnScrollTop) {
        btnScrollTop.style.display = (scrollTopVal > 250) ? "block" : "none";
    }
};

// Handler klik di luar modal logout dan ESC key
document.addEventListener("click", (e) => {
    if (e.target && e.target.classList && e.target.classList.contains("modal-backdrop")) {
        if (e.target.id === "modalLogoutAdmin" && typeof tutupModalLogoutAdmin === "function") {
            tutupModalLogoutAdmin();
        } else if (e.target.id === "modalLogout" && typeof tutupModalLogout === "function") {
            tutupModalLogout();
        }
    }
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" || e.key === "Esc") {
        const modalAdmin = document.getElementById("modalLogoutAdmin");
        if (modalAdmin && modalAdmin.style.display !== "none" && typeof tutupModalLogoutAdmin === "function") {
            tutupModalLogoutAdmin();
        }
        const modalLogout = document.getElementById("modalLogout");
        if (modalLogout && modalLogout.style.display !== "none" && typeof tutupModalLogout === "function") {
            tutupModalLogout();
        }
    }
});