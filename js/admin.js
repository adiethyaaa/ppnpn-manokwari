// Cek Login Session saat membuka dashboard admin
let currentUser = null;

// Fungsi helper untuk memastikan Firebase DB sudah siap digunakan
function getDb() {
    if (typeof db !== "undefined" && db) return db;
    if (typeof firebase !== "undefined" && firebase.database) return firebase.database();
    return null;
}

function togglePermBox() {
    const roleElem = document.getElementById("adminRole");
    if (!roleElem) return;
    const role = roleElem.value;
    const box = document.getElementById("boxPermissions");
    if (box) box.style.display = (role === "administrator") ? "none" : "block";
}

function simpanUserFirebase() {
    const database = getDb();
    if (!database) {
        alert("❌ Database belum siap. Silakan muat ulang halaman!");
        return;
    }

    const username = document.getElementById("adminUsername").value.trim();
    const password = document.getElementById("adminPassword").value.trim();
    const nama = document.getElementById("adminNama").value.trim();
    const unitKerja = document.getElementById("adminUnitKerja").value; // Ambil nilai Unit Kerja
    const role = document.getElementById("adminRole").value;

    if (!username || !password || !nama) {
        alert("Harap lengkapi Username, Password, dan Nama!");
        return;
    }

    let userPayload = {
        username: username,
        password: password,
        nama: nama,
        unitKerja: unitKerja,
        role: role
    };

    if (role === "operator") {
        userPayload.permissions = {
            uploadJadwal: document.getElementById("perm_uploadJadwal")?.checked || false,
            inputManualPopUp: document.getElementById("perm_inputManualPopUp")?.checked || false,
            uploadFingerprint: document.getElementById("perm_uploadFingerprint")?.checked || false,
            recheckPresensi: document.getElementById("perm_recheckPresensi")?.checked || false,
            updateMassal: document.getElementById("perm_updateMassal")?.checked || false,
            exportTerpilih: document.getElementById("perm_exportTerpilih")?.checked || false,
            hapusPegawai: document.getElementById("perm_hapusPegawai")?.checked || false,
            exportAllExcel: document.getElementById("perm_exportAllExcel")?.checked || false,
            previewPDF: document.getElementById("perm_previewPDF")?.checked || false,
            saveHistory: document.getElementById("perm_saveHistory")?.checked || false,
            restoreHistory: document.getElementById("perm_restoreHistory")?.checked || false,
            editBarisTabel: document.getElementById("perm_editBarisTabel")?.checked || false,
            saveReportFinal: document.getElementById("perm_saveReportFinal")?.checked || false,
            bukaHistoryFloating: document.getElementById("perm_bukaHistoryFloating")?.checked || false
        };
    }

    database.ref('users/' + username).set(userPayload, (err) => {
        if (err) {
            alert("Gagal menyimpan: " + err.message);
        } else {
            alert("✅ Data User dan Role berhasil disimpan!");
            resetFormAdmin();
        }
    });
}

// 2. MUAT DAFTAR USER (MEMBACA & MENAMPILKAN UNIT KERJA)
async function muatDaftarUser() {
    const database = getDb();
    const tbody = document.getElementById("tabelUsersBody");

    if (!database) {
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 24px; color: var(--text-muted);"><span class="spinner-login"></span> Menghubungkan ke Database Cloud...</td></tr>`;
        }
        setTimeout(muatDaftarUser, 500);
        return;
    }

    // Pastikan user terautentikasi di Firebase (Anonymous Auth) agar lolos aturan security rules (auth != null)
    try {
        if (typeof firebase !== "undefined" && firebase.auth) {
            if (!firebase.auth().currentUser) {
                await firebase.auth().signInAnonymously();
            }
        }
    } catch (authErr) {
        console.warn("Autentikasi Firebase di Admin:", authErr);
    }

    database.ref('users').on('value', (snapshot) => {
        if (!tbody) return;
        tbody.innerHTML = "";
        
        if (!snapshot.exists()) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 24px; color: var(--text-muted); font-style: italic;">Belum ada data pengguna yang tersimpan di database.</td></tr>`;
            return;
        }

        snapshot.forEach((child) => {
            const user = child.val();
            if (!user || !user.username) return;

            const tr = document.createElement("tr");
            const roleBadge = user.role === 'administrator' ? 'status-hn' : 'status-dl';
            const unitTeks = user.unitKerja || 'Kanreg XIV';
            
            tr.innerHTML = `
                <td style="padding-left: 14px;"><b>${user.username}</b></td>
                <td>${user.nama || '-'}</td>
                <td style="text-align: center;"><span style="background: #eef2f7; color: #2c3e50; font-weight: 600; padding: 3px 9px; border-radius: 999px; font-size: 11px;">${unitTeks}</span></td>
                <td style="text-align: center;"><span class="status-badge ${roleBadge}">${(user.role || 'operator').toUpperCase()}</span></td>
                <td style="text-align: center;">
                    <div style="display: inline-flex; gap: 6px; align-items: center; justify-content: center;">
                        <button type="button" class="btn btn-ghost" style="height: 27px; padding: 0 8px; font-size: 11.5px; border: 1px solid var(--border-subtle);" onclick="editUser('${user.username}')" title="Ubah data & hak akses pengguna ini">
                            <svg class="icon-svg" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            Edit
                        </button>
                        ${user.username !== '14' ? `
                        <button type="button" class="btn btn-hapus-pegawai" style="height: 27px; padding: 0 8px; font-size: 11.5px;" onclick="hapusUser('${user.username}')" title="Hapus akun ini">
                            <svg class="icon-svg" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            Hapus
                        </button>` : ''}
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }, (error) => {
        console.error("Error Firebase Realtime:", error);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 24px; color: #b91c1c; font-weight: 500;">Gagal memuat pengguna: ${error.message}</td></tr>`;
        }
    });
}

function editUser(username) {
    const database = getDb();
    if (!database) return;

    database.ref('users/' + username).once('value', (snapshot) => {
        const u = snapshot.val();
        if (!u) return;

        document.getElementById("formTitle").innerText = "Edit User: " + u.username;
        document.getElementById("adminUsername").value = u.username;
        document.getElementById("adminUsername").readOnly = true;
        document.getElementById("adminPassword").value = u.password || "";
        document.getElementById("adminNama").value = u.nama || "";
        document.getElementById("adminUnitKerja").value = u.unitKerja || "Kanreg XIV"; // Load Unit Kerja
        document.getElementById("adminRole").value = u.role || "operator";
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
    document.getElementById("adminUnitKerja").value = "Kanreg XIV"; // Reset ke Kanreg XIV
    document.getElementById("adminRole").value = "operator";
    togglePermBox();
}

function hapusUser(username) {
    const database = getDb();
    if (!database) return;

    if (confirm(`Yakin ingin menghapus user [${username}]?`)) {
        database.ref('users/' + username).remove();
    }
}

// ==========================================
// INISIALISASI SAAT HALAMAN DIMUAT
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    if (typeof checkAuthSession === "function") {
        currentUser = checkAuthSession("administrator");
    }
    
    // Panggil muatDaftarUser dengan perlindungan retry otomatis
    muatDaftarUser();
});