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

    // Ubah teks tombol untuk memberi respon visual
    if (btnElem) {
        btnElem.disabled = true;
        btnElem.innerText = "Memeriksa...";
    }

    // Set timeout jika koneksi firebase lambat/terkendala
    const timeoutTimer = setTimeout(() => {
        if (btnElem) {
            btnElem.disabled = false;
            btnElem.innerText = "Log In";
        }
        alert("⚠️ Koneksi ke server Firebase lambat atau gagal. Silakan periksa jaringan internet Anda / konfigurasi database.");
    }, 10000); // 10 detik

    db.ref('users/' + user).once('value')
        .then((snapshot) => {
            clearTimeout(timeoutTimer);
            if (btnElem) {
                btnElem.disabled = false;
                btnElem.innerText = "Log In";
            }

            const userData = snapshot.val();
            if (userData && userData.password === pass) {
                sessionStorage.setItem("currentUser", JSON.stringify(userData));
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
