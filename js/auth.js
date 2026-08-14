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
        btnElem.innerHTML = `<span class="spinner-login"></span> Mengalihkan...`;
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
                    // window.location.href = "dashboard";
                    window.location.href = "dashboard.html";
                    //link web html
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
        
        // window.location.href = "index";
        window.location.href = "index.html";
        //link web html
        return null;
    }
    
    const currentUser = JSON.parse(sessionStr);
    
    // Jika butuh role tertentu (misal administrator) tapi user biasa
    if (requiredRole && currentUser.role !== requiredRole) {
        alert("⛔ Anda tidak memiliki akses ke halaman ini!");
        // window.location.href = "dashboard";
        window.location.href = "dashboard.html";
        //link web html
        return null;
    }
    
    return currentUser;
}

// --- LOGOUT USER ---
function logoutUser() {
    sessionStorage.clear(); // Hapus seluruh session
    // window.location.href = "index";
    window.location.href = "index.html";
    //link web html
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
// KODE AUTHENTIKASI & PROTEKSI SESI
// ==========================================

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

    if (btnElem) {
        btnElem.disabled = true;
        btnElem.innerHTML = `<span class="spinner-login"></span> Memeriksa...`;
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
                btnElem.innerHTML = `<span class="spinner-login"></span> Check dulu ee...`; //Mengalihkan... - user login
                // Simpan session
                sessionStorage.setItem("currentUser", JSON.stringify(userData));
                // Simpan timestamp login pertama kali
                sessionStorage.setItem("loginTime", Date.now().toString());

                setTimeout(() => {
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
function checkAuthSession(requiredRole) {
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

// --- LOGOUT USER ---
function logoutUser() {
    sessionStorage.clear();
    window.location.href = "index.html";
}

// --- KONFIRMASI LOGOUT ADMIN ---
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

// --- LOGOUT DASHBOARD ---
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
                saveToHistory(true); 
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

// Handler Scroll
window.onscroll = function() {
    let btnScrollTop = document.getElementById("btnScrollTop");
    let btnLogout = document.getElementById("btnLogoutFloating");
    let btnAdmin = document.getElementById("btnKelolaAdmin");
    let btnHistory = document.getElementById("btnHistoryFloating");
    let timerWidget = document.getElementById("sessionTimerFloating");
    let scrollTopVal = document.body.scrollTop || document.documentElement.scrollTop;

    if (btnScrollTop) {
        btnScrollTop.style.display = (scrollTopVal > 200) ? "block" : "none";
    }

    const toggleFloating = (elem) => {
        if (elem) {
            if (scrollTopVal > 50) elem.classList.add("hidden-on-scroll");
            else elem.classList.remove("hidden-on-scroll");
        }
    };

    toggleFloating(btnLogout);
    toggleFloating(btnAdmin);
    toggleFloating(btnHistory);
    toggleFloating(timerWidget);
};

// // ==========================================
// // SOLUSI ALTERNATIF: TIMER JAM DINDING (45 MENIT)
// // ==========================================

// // Durasi Sesi Dalam Menit
// var DURASI_SESI_MENIT = 45;

// function aturWaktuSelesaiSesi() {
//     var waktuSelesai = Date.now() + (DURASI_SESI_MENIT * 60 * 1000);
//     sessionStorage.setItem("targetExpireTime", waktuSelesai.toString());
// }

// function jalankanHitungMundurLayar() {
//     var displayElem = document.getElementById("timerDisplay");
//     if (!displayElem) return;

//     // Ambil target waktu selesai dari sessionStorage
//     var targetStr = sessionStorage.getItem("targetExpireTime");
//     if (!targetStr) {
//         aturWaktuSelesaiSesi();
//         targetStr = sessionStorage.getItem("targetExpireTime");
//     }

//     var targetTime = parseInt(targetStr, 10);

//     // Hentikan interval lama jika ada
//     if (window.timerIntervalUtama) {
//         clearInterval(window.timerIntervalUtama);
//     }

//     // Jalankan perulangan per 1 detik
//     window.timerIntervalUtama = setInterval(function() {
//         if (!sessionStorage.getItem("currentUser")) {
//             clearInterval(window.timerIntervalUtama);
//             return;
//         }

//         var sekarang = Date.now();
//         var sisaMiliDetik = targetTime - sekarang;

//         if (sisaMiliDetik <= 0) {
//             clearInterval(window.timerIntervalUtama);
//             displayElem.innerText = "00:00";
//             alert("⏱️ Sesi Anda telah berakhir karena tidak ada aktivitas selama 45 menit.\nSilakan login kembali.");
//             logoutUser();
//             return;
//         }

//         // Konversi ke Menit & Detik
//         var totalDetik = Math.floor(sisaMiliDetik / 1000);
//         var menit = Math.floor(totalDetik / 60);
//         var detik = totalDetik % 60;

//         var strMenit = String(menit).padStart(2, '0');
//         var strDetik = String(detik).padStart(2, '0');

//         displayElem.innerText = strMenit + ":" + strDetik;

//         // Beri warna merah jika sisa waktu < 5 menit
//         if (menit < 5) {
//             displayElem.style.color = "#e74c3c";
//         } else {
//             displayElem.style.color = "#2ecc71";
//         }
//     }, 1000);
// }

// // Perbarui Target Waktu HANYA saat ada klik atau tombol keyboard (Abaikan pergerakan mouse)
// function perbaruiSesiAktivitas() {
//     if (!sessionStorage.getItem("currentUser")) return;
    
//     // Perbarui waktu target selesai menjadi 45 menit dari SEKARANG
//     aturWaktuSelesaiSesi();
// }

// // Inisialisasi Utama
// document.addEventListener("DOMContentLoaded", function() {
//     if (sessionStorage.getItem("currentUser") && document.getElementById("timerDisplay")) {
//         // Set waktu target awal
//         if (!sessionStorage.getItem("targetExpireTime")) {
//             aturWaktuSelesaiSesi();
//         }

//         // Mulai hitung mundur
//         jalankanHitungMundurLayar();

//         // HANYA reset timer jika user benar-benar meng-klik atau menekan tombol keyboard
//         // (Sengaja TIDAK menggunakan 'mousemove' agar timer bisa terlihat turun secara lancar)
//         window.addEventListener("click", perbaruiSesiAktivitas, true);
//         window.addEventListener("keydown", perbaruiSesiAktivitas, true);
//         window.addEventListener("touchstart", perbaruiSesiAktivitas, true);
//     }
// });