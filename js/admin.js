const currentUser = checkAuthSession("administrator");

document.addEventListener("DOMContentLoaded", () => {
    muatDaftarUser();
});

function togglePermBox() {
    const role = document.getElementById("adminRole").value;
    document.getElementById("boxPermissions").style.display = (role === "administrator") ? "none" : "block";
}

function simpanUserFirebase() {
    const username = document.getElementById("adminUsername").value.trim();
    const password = document.getElementById("adminPassword").value.trim();
    const nama = document.getElementById("adminNama").value.trim();
    const role = document.getElementById("adminRole").value;

    if (!username || !password || !nama) {
        alert("Harap lengkapi Username, Password, dan Nama!");
        return;
    }

    let userPayload = {
        username: username,
        password: password,
        nama: nama,
        role: role
    };

    if (role === "operator") {
        userPayload.permissions = {
            uploadJadwal: document.getElementById("perm_uploadJadwal").checked,
            inputManualPopUp: document.getElementById("perm_inputManualPopUp").checked,
            uploadFingerprint: document.getElementById("perm_uploadFingerprint").checked,
            recheckPresensi: document.getElementById("perm_recheckPresensi").checked,
            updateMassal: document.getElementById("perm_updateMassal").checked,
            exportTerpilih: document.getElementById("perm_exportTerpilih").checked,
            hapusPegawai: document.getElementById("perm_hapusPegawai").checked,
            exportAllExcel: document.getElementById("perm_exportAllExcel").checked,
            previewPDF: document.getElementById("perm_previewPDF").checked,
            saveHistory: document.getElementById("perm_saveHistory").checked,
            restoreHistory: document.getElementById("perm_restoreHistory").checked,
            editBarisTabel: document.getElementById("perm_editBarisTabel").checked
        };
    }

    db.ref('users/' + username).set(userPayload, (err) => {
        if (err) alert("Gagal menyimpan: " + err.message);
        else {
            alert("✅ Data User & Kewenangan berhasil disimpan!");
            resetFormAdmin();
            muatDaftarUser();
        }
    });
}

function muatDaftarUser() {
    db.ref('users').on('value', (snapshot) => {
        const tbody = document.getElementById("tabelUsersBody");
        tbody.innerHTML = "";
        
        snapshot.forEach((child) => {
            const user = child.val();
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><b>${user.username}</b></td>
                <td>${user.nama}</td>
                <td><span class="status-badge ${user.role === 'administrator' ? 'status-hn' : 'status-dl'}">${user.role.toUpperCase()}</span></td>
                <td>
                    <button class="btn-edit" onclick="editUser('${user.username}')">Edit Akses</button>
                    ${user.username !== '14' ? `<button class="btn-hapus" onclick="hapusUser('${user.username}')">Hapus</button>` : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });
    });
}

function editUser(username) {
    db.ref('users/' + username).once('value', (snapshot) => {
        const u = snapshot.val();
        if (!u) return;

        document.getElementById("formTitle").innerText = "Edit User: " + u.username;
        document.getElementById("adminUsername").value = u.username;
        document.getElementById("adminUsername").readOnly = true;
        document.getElementById("adminPassword").value = u.password;
        document.getElementById("adminNama").value = u.nama;
        document.getElementById("adminRole").value = u.role;
        togglePermBox();

        if (u.role === "operator" && u.permissions) {
            Object.keys(u.permissions).forEach(key => {
                const el = document.getElementById("perm_" + key);
                if (el) el.checked = u.permissions[key];
            });
        }
    });
}

function resetFormAdmin() {
    document.getElementById("formTitle").innerText = "Tambah User Baru";
    document.getElementById("adminUsername").value = "";
    document.getElementById("adminUsername").readOnly = false;
    document.getElementById("adminPassword").value = "";
    document.getElementById("adminNama").value = "";
    document.getElementById("adminRole").value = "operator";
    togglePermBox();
}

function hapusUser(username) {
    if (confirm(`Yakin ingin menghapus user [${username}]?`)) {
        db.ref('users/' + username).remove();
    }
}