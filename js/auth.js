const daftarUser = {
    "manokwari14": "bknmanokwari";
    "14" : "14"
};

function prosesLogin(event) {
    event.preventDefault();
    const user = document.getElementById("loginUsername").value.trim();
    const pass = document.getElementById("loginPassword").value.trim();

    if (daftarUser[user] && daftarUser[user] === pass) {
        document.getElementById("login-page").style.display = "none";
        document.getElementById("main-app").style.display = "block";
        document.getElementById("loginUsername").value = "";
        document.getElementById("loginPassword").value = "";
    } else {
        alert("❌ Login Gagal!\nUsername atau Password salah.");
    }
}

function mintaKonfirmasiLogout() {
    document.getElementById("modalLogout").style.display = "flex";
}

function tutupModalLogout() {
    document.getElementById("modalLogout").style.display = "none";
}

function logoutWithSave(shouldSave) {
    if (shouldSave) {
        if (Object.keys(globalRekap).length > 0) {
            saveToHistory(true); 
        } else {
            alert("⚠️ Tidak ada data presensi untuk disimpan, melanjutkan logout.");
        }
    }
    
    tutupModalLogout();
    document.getElementById("main-app").style.display = "none";
    document.getElementById("login-page").style.display = "flex";
    window.scrollTo({ top: 0, behavior: 'instant' });
}

// Handler Scroll untuk Tombol Logout & Tombol Ke atas
window.onscroll = function() {
    let btnScrollTop = document.getElementById("btnScrollTop");
    let btnLogout = document.getElementById("btnLogoutFloating");
    let scrollTopVal = document.body.scrollTop || document.documentElement.scrollTop;

    if (scrollTopVal > 200) {
        btnScrollTop.style.display = "block";
    } else {
        btnScrollTop.style.display = "none";
    }

    if (scrollTopVal > 50) {
        btnLogout.classList.add("hidden-on-scroll");
    } else {
        btnLogout.classList.remove("hidden-on-scroll");
    }
};

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
