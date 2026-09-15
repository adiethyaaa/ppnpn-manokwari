// --- SIMPAN KE FIREBASE DATABASE ---
function saveToHistory(isSilent = false) {
    if (!globalRekap || Object.keys(globalRekap).length === 0) {
        if (!isSilent) alert("Belum ada data presensi yang sedang dikerjakan untuk disimpan ke cloud.");
        return false;
    }
    
    let now = new Date();
    let timestamp = now.getTime();
    let dateString = now.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // =========================================================
    // 💡 DETEKSI NAMA USER LOGIN SECARA PRESISI
    // =========================================================
    let activeUser = null;

    // 1. Cek Variabel Global Memory
    if (typeof currentUser !== "undefined" && currentUser) {
        activeUser = currentUser;
    } else if (typeof loggedInUser !== "undefined" && loggedInUser) {
        activeUser = loggedInUser;
    } else {
        // 2. Cek Berbagai Kunci Penyimpanan di LocalStorage / SessionStorage
        try {
            let sessionRaw = localStorage.getItem("userSession") || 
                             sessionStorage.getItem("userSession") || 
                             localStorage.getItem("activeUser") || 
                             localStorage.getItem("loggedInUser") ||
                             sessionStorage.getItem("loggedInUser");
            if (sessionRaw) activeUser = JSON.parse(sessionRaw);
        } catch (e) {
            console.warn("Gagal membaca session dari storage:", e);
        }
    }

    // Ambil Nama Lengkap / Username User Login
    let namaUserFix = "";
    if (activeUser) {
        namaUserFix = activeUser.nama || activeUser.namaLengkap || activeUser.nama_lengkap || activeUser.username || activeUser.user;
    }
    
    // Jika tetap kosong, cek fallback nama dari elemen UI header / status login jika ada
    if (!namaUserFix || namaUserFix.trim() === "") {
        let headerUserEl = document.getElementById("userDisplayName") || document.getElementById("lblNamaUser") || document.getElementById("userNameNav");
        if (headerUserEl && headerUserEl.innerText) {
            namaUserFix = headerUserEl.innerText.replace("Halo,", "").replace("Welcome,", "").trim();
        }
    }

    // Fallback terakhir jika user belum tersimpan di session
    if (!namaUserFix || namaUserFix.trim() === "") {
        namaUserFix = "Operator";
    }

    let unitKerjaFix = (activeUser && activeUser.unitKerja) ? activeUser.unitKerja : "Kanreg XIV BKN";
    if (unitKerjaFix === "Kanreg XIV") unitKerjaFix = "Kanreg XIV BKN";
    if (unitKerjaFix === "UPT Sorong") unitKerjaFix = "UPT BKN Sorong";

    // Build Payload State
    let currentState = {
        id: timestamp,
        dateString: dateString,
        globalRekap: globalRekap,
        dataPegawai: typeof dataPegawai !== "undefined" ? dataPegawai : {},
        activeYear: typeof activeYear !== "undefined" ? activeYear : now.getFullYear(),
        activeMonth: typeof activeMonth !== "undefined" ? activeMonth : now.getMonth(),
        namaBulanTahun: typeof namaBulanTahun !== "undefined" ? namaBulanTahun : "Periode",
        isFingerprintUploaded: typeof isFingerprintUploaded !== "undefined" ? isFingerprintUploaded : false,
        unitKerja: unitKerjaFix,
        savedByNama: namaUserFix, // 👈 Tersimpan Nama Lengkap User Login
        namaUser: namaUserFix,    // 👈 Kunci Tambahan
        isFinalReport: false
    };

    // Simpan ke Firebase Realtime Database node 'history'
    if (typeof db !== "undefined" && db) {
        db.ref('history/' + timestamp).set(currentState, function(err) {
            if (err) {
                if (!isSilent) alert("Terjadi kendala saat menyimpan riwayat: " + err.message);
            } else {
                if (!isSilent) alert(`Riwayat pekerjaan berhasil disimpan ke cloud oleh ${namaUserFix}.`);
            }
        });
    } else {
        if (!isSilent) alert("Koneksi ke database belum terhubung. Silakan periksa jaringan Anda.");
        return false;
    }

    return true;
}


// --- AMBIL DAFTAR RESTORE DARI FIREBASE ---
// --- AMBIL DAFTAR RESTORE DARI FIREBASE (MEMBACA SEMUA VERSI TERSIMPAN) ---
// --- AMBIL DAFTAR RESTORE DARI FIREBASE (DENGAN AKSES HAPUS KHUSUS ADMIN) ---
async function openRestoreModal() {
    let container = document.getElementById("historyListContainer");
    if (!container) return;

    container.innerHTML = "<div style='text-align:center; padding: 20px; color: #7f8c8d;'><span class='spinner-login'></span> Mengambil data dari database Cloud...</div>";
    
    let modal = document.getElementById("modalRestore");
    if (modal) modal.style.display = "flex";

    // 💡 1. PASTIKAN USER TERAUTENTIKASI SECARA ANONIM DULU (AGAR LOLOS "auth != null")
    try {
        if (typeof firebase !== "undefined" && firebase.auth) {
            if (!firebase.auth().currentUser) {
                await firebase.auth().signInAnonymously();
            }
        }
    } catch (authErr) {
        console.warn("Autentikasi Anonim di Restore Error:", authErr);
    }

    // 💡 2. CEK ROLE USER LOGIN
    let activeUser = null;
    if (typeof currentUser !== "undefined" && currentUser) {
        activeUser = currentUser;
    } else {
        try {
            let sessionRaw = localStorage.getItem("userSession") || sessionStorage.getItem("userSession") || localStorage.getItem("activeUser");
            if (sessionRaw) activeUser = JSON.parse(sessionRaw);
        } catch (e) {
            console.warn("Session error:", e);
        }
    }
    const isAdmin = activeUser && (activeUser.role === "administrator" || activeUser.role === "admin");

    let dbRef = null;
    if (typeof db !== "undefined" && db) dbRef = db;
    else if (typeof database !== "undefined" && database) dbRef = database;
    else if (typeof firebase !== "undefined" && firebase.database) dbRef = firebase.database();

    if (!dbRef) {
        container.innerHTML = "<div style='color:red; text-align:center; padding:15px;'>Koneksi Firebase belum siap.</div>";
        return;
    }

    // 💡 3. BACA DATA HISTORI
    dbRef.ref('history').limitToLast(30).once('value', (snapshot) => {
        container.innerHTML = "";
        let historyData = [];

        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                let item = childSnapshot.val();
                if (item) {
                    if (!item.id) item.id = childSnapshot.key;
                    historyData.push(item);
                }
            });
        }

        historyData.reverse(); // Urutkan terbaru di atas

        // 💡 DEDUPILKASI: Pastikan untuk Laporan Final (isFinalReport), setiap periode hanya muncul 1 KALI di Restore History
        let seenFinalPeriods = new Set();
        let filteredHistoryData = [];
        historyData.forEach((item) => {
            if (item.isFinalReport === true || item.isFinalReport === "true") {
                let pKey = (item.namaBulanTahun || item.reportTitle || "").replace("Rekap Final Presensi ", "").trim();
                if (!pKey && item.activeYear !== undefined && item.activeMonth !== undefined) {
                    pKey = `${item.activeYear}_${item.activeMonth}`;
                }
                if (pKey) {
                    if (seenFinalPeriods.has(pKey)) {
                        return; // Lewati duplikat final report periode ini
                    }
                    seenFinalPeriods.add(pKey);
                }
            }
            filteredHistoryData.push(item);
        });

        if (filteredHistoryData.length === 0) {
            container.innerHTML = "<div style='text-align:center; padding: 25px; color: #7f8c8d; font-style: italic; border: 1px dashed #ccc; border-radius: 5px; background: #fafafa;'>Belum ada riwayat pekerjaan tersimpan.</div>";
        } else {
            filteredHistoryData.forEach((item) => {
                let div = document.createElement("div");
                
                let isFinal = item.isFinalReport === true;
                let borderLeftColor = isFinal ? "#27ae60" : "#9b59b6";
                let labelBadge = isFinal ? "<span style='background:#e8f8f5; color:#27ae60; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px; margin-left:6px;'>FINAL</span>" : "";

                let countPegawai = item.dataPegawai ? Object.keys(item.dataPegawai).length : (item.globalRekap ? Object.keys(item.globalRekap).length : 0);
                let namaUserDisplay = item.savedByNama || item.namaUser || item.savedBy || "Operator";
                let timeStampDisplay = item.dateString || "-";
                let periodeDisplay = item.namaBulanTahun || "Periode";

                let btnHapusHtml = "";
                if (isAdmin) {
                    btnHapusHtml = `
                        <button onclick="mintaKonfirmasiHapusHistory('${item.id}', '${timeStampDisplay}')" title="Hapus Riwayat" class="btn btn-hapus-pegawai" style="height: 25px; padding: 0 7px; font-size: 11px;">
                            <svg style="vertical-align:middle;" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    `;
                }

                div.style.cssText = `display: flex; justify-content: space-between; align-items: center; padding: 8px 14px; border-bottom: 1px solid var(--border-subtle); background: #ffffff; margin-bottom: 7px; border-radius: var(--radius-sm); border-left: 4px solid ${borderLeftColor}; box-shadow: 0 1px 3px rgba(0,0,0,0.03); font-size: 12px; gap: 12px; transition: background 0.15s;`;

                div.innerHTML = `
                    <div style="flex: 1; min-width: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; word-break: break-word; overflow-wrap: anywhere; line-height: 1.4;">
                        <span style="font-weight: 700; color: var(--text-primary); font-size: 12.5px;">${timeStampDisplay} WIT</span>
                        <span style="color: var(--text-muted); font-size: 11px;">•</span>
                        <span style="color: var(--text-secondary); font-size: 12px; font-weight: 500;">${namaUserDisplay}</span>
                        ${labelBadge}
                        <span style="color: var(--text-muted); font-size: 11px;">•</span>
                        <span style="background: var(--bg-surface-subtle); border: 1px solid var(--border-subtle); padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 600; color: var(--text-primary);">${periodeDisplay}</span>
                        <span style="color: var(--text-muted); font-size: 11.5px;">(${countPegawai} Pegawai / PPNPN)</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                        <button class="btn btn-restore-history" style="height: 28px; padding: 0 10px; font-size: 11.5px; display: inline-flex; align-items: center; gap: 5px;" onclick="restoreFromFirebase('${item.id}')" title="Pulihkan data checkpoint ini">
                            <svg class="icon-svg" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                            Restore
                        </button>
                        ${btnHapusHtml}
                    </div>
                `;
                container.appendChild(div);
            });
        }
    }).catch((err) => {
        console.error("Gagal memuat history restore:", err);
        container.innerHTML = `<div style="color:red; text-align:center; padding:15px;">Gagal memuat data: ${err.message}</div>`;
    });
}
// 💡 FUNGSI EKSEKUSI RESTORE DENGAN ANIMASI POP-UP PROGRESS & PERSENTASE
// --- RESTORE DATA SPESIFIK DARI FIREBASE (DENGAN PROGRESS BAR) ---
function restoreFromFirebase(timestampId) {
    if (!timestampId) {
        alert("ID data riwayat tidak valid.");
        return;
    }

    if (!confirm("Memulihkan riwayat ini akan menggantikan tampilan data saat ini dengan data yang tersimpan di cloud. Apakah Anda ingin melanjutkan?")) {
        return;
    }

    // 1. Tutup Modal List History Lama
    if (typeof tutupModalRestore === "function") {
        tutupModalRestore();
    } else {
        let modalList = document.getElementById("modalRestore");
        if (modalList) modalList.style.display = "none";
    }

    // 2. Tampilkan Modal Loading Progress
    const modalProgress = document.getElementById("modalRestoreProgress");
    const elPercent = document.getElementById("restorePercentText");
    const elStatus = document.getElementById("restoreStatusText");
    const elBar = document.getElementById("restoreProgressBar");

    if (modalProgress) modalProgress.style.display = "flex";

    // Helper update UI Progress
    function updateProgress(percent, statusText) {
        if (elPercent) elPercent.innerText = `${percent}%`;
        if (elBar) elBar.style.width = `${percent}%`;
        if (elStatus) elStatus.innerText = statusText;
    }

    updateProgress(15, "Menghubungkan ke Database Cloud...");

    // Cek Instance Database
    let dbRef = null;
    if (typeof db !== "undefined" && db) dbRef = db;
    else if (typeof database !== "undefined" && database) dbRef = database;
    else if (typeof firebase !== "undefined" && firebase.database) dbRef = firebase.database();

    if (!dbRef) {
        if (modalProgress) modalProgress.style.display = "none";
        alert("Koneksi ke database belum siap. Silakan coba beberapa saat lagi.");
        return;
    }

    setTimeout(() => {
        updateProgress(40, "Mengunduh snapshot data riwayat...");

        dbRef.ref('history/' + timestampId).once('value')
            .then((snapshot) => {
                let selectedState = snapshot.val();

                if (!selectedState) {
                    throw new Error("Data riwayat tidak ditemukan di Database.");
                }

                updateProgress(70, "Memulihkan variabel & status pekerjaan...");

                setTimeout(() => {
                    updateProgress(90, "Menderetkan data ke tabel utama...");

                    // A. Timpa Variabel Global Aplikasi
                    globalRekap = selectedState.globalRekap || {};
                    dataPegawai = selectedState.dataPegawai || {};
                    if (typeof getNamaPegawaiMaster === "function") {
                        Object.keys(dataPegawai).forEach(id => {
                            dataPegawai[id] = getNamaPegawaiMaster(id, dataPegawai[id]);
                        });
                        Object.keys(globalRekap).forEach(key => {
                            if (globalRekap[key] && globalRekap[key].id) {
                                globalRekap[key].nama = getNamaPegawaiMaster(globalRekap[key].id, globalRekap[key].nama);
                                globalRekap[key].role = getJabatanPegawaiMaster(globalRekap[key].id, globalRekap[key].role);
                            }
                        });
                    }
                    activeYear = selectedState.activeYear;
                    activeMonth = selectedState.activeMonth;
                    namaBulanTahun = selectedState.namaBulanTahun;
                    isFingerprintUploaded = selectedState.isFingerprintUploaded;

                    // B. Perbarui Element Teks Periode
                    const elPeriode = document.getElementById("periodeText");
                    if (elPeriode) {
                        elPeriode.innerText = `Periode: ${namaBulanTahun || '-'}`;
                    }

                    // C. Atur Visibilitas Section UI
                    const secPresensi = document.getElementById('sectionPresensi');
                    const secManual = document.getElementById('sectionManualWrapper');
                    
                    if (Object.keys(globalRekap).length > 0) {
                        if (secPresensi) secPresensi.style.display = 'block';
                        if (secManual) secManual.style.display = 'block';
                    } else {
                        if (secPresensi) secPresensi.style.display = 'none';
                        if (secManual) secManual.style.display = 'none';
                    }

                    // D. Jalankan Fungsi Render UI Bawaan & Otomatis Buka Tab Presensi
                    if (typeof updateCheckboxPegawaiManual === "function") updateCheckboxPegawaiManual();
                    if (typeof updateFilterNamaDropdown === "function") updateFilterNamaDropdown();
                    if (typeof renderTabel === "function") renderTabel();
                    if (typeof switchTab === "function") switchTab("tab-presensi");

                    setTimeout(() => {
                        updateProgress(100, "Selesai!");
                        if (typeof switchTab === "function") switchTab("tab-presensi");

                        // 💡 Modal loading progress langsung tertutup halus
                        setTimeout(() => {
                            if (modalProgress) modalProgress.style.display = "none";
                        }, 300);
                    }, 300);

                }, 300);
            })
            .catch((err) => {
                console.error("Error Restore History:", err);
                if (modalProgress) modalProgress.style.display = "none";
                alert("Terjadi kendala saat memulihkan riwayat: " + err.message);
            });
    }, 200);
}

// =========================================================
// LOGIKA HAPUS RIWAYAT DARI CLOUD (KHUSUS ADMINISTRATOR)
// =========================================================

function mintaKonfirmasiHapusHistory(historyId, timeStampText) {
    const modal = document.getElementById("modalHapusHistory");
    const inputId = document.getElementById("targetHapusHistoryId");
    const teksModal = document.getElementById("teksKonfirmasiHapusHistory");

    if (modal && inputId) {
        inputId.value = historyId;
        if (teksModal) {
            teksModal.innerHTML = `Apakah Anda yakin ingin menghapus data pekerjaan tersimpan:<br><b style="color:#2c3e50;">[ ${timeStampText} ]</b> dari Database Cloud?`;
        }
        modal.style.display = "flex";
    }
}

function tutupModalHapusHistory() {
    const modal = document.getElementById("modalHapusHistory");
    if (modal) modal.style.display = "none";
}

function eksekusiHapusHistoryFirebase() {
    const historyId = document.getElementById("targetHapusHistoryId")?.value;
    const btnConfirm = document.getElementById("btnConfirmHapusHistory");

    if (!historyId) {
        alert("⚠️ ID data riwayat tidak valid!");
        return;
    }

    let dbRef = null;
    if (typeof db !== "undefined" && db) dbRef = db;
    else if (typeof database !== "undefined" && database) dbRef = database;
    else if (typeof firebase !== "undefined" && firebase.database) dbRef = firebase.database();

    if (!dbRef) {
        alert("❌ Koneksi Firebase belum siap!");
        return;
    }

    let originalText = btnConfirm ? btnConfirm.innerHTML : "Ya, Hapus Permanen";
    if (btnConfirm) {
        btnConfirm.disabled = true;
        btnConfirm.innerHTML = "Menghapus...";
    }

    // Eksekusi Hapus dari Node 'history/{historyId}' Firebase
    dbRef.ref('history/' + historyId).remove()
        .then(() => {
            if (btnConfirm) {
                btnConfirm.disabled = false;
                btnConfirm.innerHTML = originalText;
            }
            tutupModalHapusHistory();
            alert("✅ Data riwayat pekerjaan berhasil dihapus dari Cloud!");
            
            // Re-render modal Restore & Laporan Final secara langsung
            if (typeof openRestoreModal === "function") openRestoreModal();
            if (typeof openFinalHistoryModal === "function" && document.getElementById("modalFinalHistory")?.style.display === "flex") {
                openFinalHistoryModal();
            }
        })
        .catch((err) => {
            if (btnConfirm) {
                btnConfirm.disabled = false;
                btnConfirm.innerHTML = originalText;
            }
            alert("❌ Gagal menghapus data: " + err.message);
        });
}


function tutupModalRestore() {
    document.getElementById("modalRestore").style.display = "none";
}



// --- VALIDASI HANYA MUNCUL JIKA DATA SUDAH BERSIH (TIDAK ADA LUPA ABSEN) ---
function recheckStatusFinalReport() {
    const container = document.getElementById("containerSaveFinal");
    const btn = document.getElementById("btnSaveReportFinal");
    const noteMsg = document.getElementById("finalNoteMessage");
    const auditBox = document.getElementById("auditBox");

    if (!container || !btn || !noteMsg) return;

    // Jika belum ada data presensi yang dimuat, sembunyikan wadah tombol
    if (typeof globalRekap === "undefined" || !globalRekap || Object.keys(globalRekap).length === 0) {
        container.style.display = "none";
        return;
    }

    // Cek apakah ada catatan spesifik "Lupa Absen" di Audit Box
    let hasLupaAbsen = false;
    if (auditBox) {
        const textContent = auditBox.innerText || auditBox.textContent || "";
        // Memeriksa keberadaan frasa "Lupa Absen" atau class warning
        if (/lupa\s+absen/i.test(textContent) || auditBox.classList.contains("audit-warning")) {
            hasLupaAbsen = true;
        }
    }

    // 💡 ATURAN USER: Hanya muncul jika data sudah bersih
    if (hasLupaAbsen) {
        container.style.display = "none";
        btn.disabled = true;
    } else {
        container.style.display = "block";
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
        btn.style.backgroundColor = "#27ae60";
        noteMsg.innerText = "Seluruh data sudah bersih dan tidak ada catatan 'Lupa Absen'. Rekap final bulan ini siap disimpan ke database.";
    }
}

// --- FUNGSI SAVE REPORT FINAL (CEK DUPLIKASI & KONFIRMASI REPLACE) ---
window.saveReportFinal = function() {
    try {
        if (!globalRekap || Object.keys(globalRekap).length === 0) {
            alert("⚠️ Tidak ada data presensi yang aktif untuk dijadikan Rekap Final!");
            return;
        }

        // 1. Dapatkan referensi tombol di HTML
        const btnFinal = document.getElementById("btnSaveReportFinal") || document.querySelector("button[onclick*='saveReportFinal']");
        let originalText = "";

        if (btnFinal) {
            originalText = btnFinal.innerHTML;
            btnFinal.disabled = true;
            btnFinal.innerHTML = "⏳ Memeriksa Database Cloud...";
        }

        // Helper untuk mengembalikan tombol ke keadaan semula
        const restoreButton = () => {
            if (btnFinal) {
                btnFinal.disabled = false;
                btnFinal.innerHTML = originalText;
            }
        };

        // 2. Ambil data session user secara aman
        let activeUser = null;
        if (typeof currentUser !== "undefined" && currentUser) {
            activeUser = currentUser;
        } else {
            try {
                let userSession = localStorage.getItem("userSession") || sessionStorage.getItem("userSession") || localStorage.getItem("activeUser");
                if (userSession) activeUser = JSON.parse(userSession);
            } catch (e) {
                console.warn("Session user tidak terbaca:", e);
            }
        }

        let namaUserFix = (activeUser && (activeUser.nama || activeUser.namaLengkap || activeUser.username)) ? (activeUser.nama || activeUser.namaLengkap || activeUser.username) : "Operator";
        let unitKerjaFix = (activeUser && activeUser.unitKerja) ? activeUser.unitKerja : "Kanreg XIV BKN";
        if (unitKerjaFix === "Kanreg XIV") unitKerjaFix = "Kanreg XIV BKN";
        if (unitKerjaFix === "UPT Sorong") unitKerjaFix = "UPT BKN Sorong";

        // 3. Persiapkan Data Payload Final
        let now = new Date();
        let timestamp = now.getTime();
        let dateString = now.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
        let periodeTeks = (typeof namaBulanTahun !== "undefined" && namaBulanTahun) ? namaBulanTahun : "Periode";
        let targetYear = typeof activeYear !== "undefined" ? activeYear : now.getFullYear();
        let targetMonth = typeof activeMonth !== "undefined" ? activeMonth : now.getMonth();

        // 4. Deteksi variabel database Firebase
        let dbRef = null;
        if (typeof db !== "undefined" && db) dbRef = db;
        else if (typeof database !== "undefined" && database) dbRef = database;
        else if (typeof firebase !== "undefined" && firebase.database) dbRef = firebase.database();

        if (!dbRef) {
            restoreButton();
            alert("❌ Koneksi Firebase (db) belum siap!");
            return;
        }

        // 5. Cek apakah sudah pernah ada laporan final untuk periode ini
        dbRef.ref('history').once('value').then((snapshot) => {
            let existingKey = null;
            let existingEntry = null;

            if (snapshot.exists()) {
                snapshot.forEach((child) => {
                    let val = child.val();
                    if (val && (val.isFinalReport === true || val.isFinalReport === "true" || (val.reportTitle && val.reportTitle.indexOf("Rekap Final") !== -1))) {
                        let pVal = (val.namaBulanTahun || (val.reportTitle ? val.reportTitle.replace("Rekap Final Presensi ", "") : "")).trim();
                        let pCur = periodeTeks.trim();
                        let isSameMonth = (val.activeYear !== undefined && val.activeMonth !== undefined && 
                                           Number(val.activeYear) === Number(targetYear) && 
                                           Number(val.activeMonth) === Number(targetMonth));
                        
                        if (pVal === pCur || isSameMonth) {
                            existingKey = child.key;
                            existingEntry = val;
                        }
                    }
                });
            }

            // Jika data sudah pernah ada, tampilkan pop up konfirmasi replace
            if (existingKey) {
                let prevTime = existingEntry && existingEntry.dateString ? existingEntry.dateString : "sebelumnya";
                let msgConfirm = `⚠️ Data Rekap Final untuk periode [${periodeTeks}] sudah pernah disimpan (${prevTime}).\n\nApakah Anda yakin ingin me-replace (mengganti) data tersebut dengan data final terbaru ini?`;
                if (!confirm(msgConfirm)) {
                    restoreButton();
                    return;
                }
            } else {
                const konfirmasiAwal = confirm(`Apakah Anda yakin ingin menyimpan [ Rekap Final Presensi - ${periodeTeks} - ${unitKerjaFix} ] ke Database Cloud?`);
                if (!konfirmasiAwal) {
                    restoreButton();
                    return;
                }
            }

            if (btnFinal) btnFinal.innerHTML = "⏳ Menyimpan Rekap Final...";

            let targetSaveKey = existingKey || String(timestamp);

            let finalPayload = {
                id: targetSaveKey,
                dateString: dateString,
                globalRekap: globalRekap,
                dataPegawai: typeof dataPegawai !== "undefined" ? dataPegawai : {},
                activeYear: targetYear,
                activeMonth: targetMonth,
                namaBulanTahun: periodeTeks,
                reportTitle: "Rekap Final Presensi " + periodeTeks,
                unitKerja: unitKerjaFix,
                savedByNama: namaUserFix,
                namaUser: namaUserFix,
                isFinalReport: true
            };

            // 6. Simpan / Replace ke Node 'history/' Firebase
            dbRef.ref('history/' + targetSaveKey).set(finalPayload, function(err) {
                restoreButton();
                if (err) {
                    alert("❌ Gagal menyimpan Rekap Final: " + err.message);
                } else {
                    let infoAksi = existingKey ? "Berhasil Di-replace (Diperbarui)" : "Berhasil Disimpan";
                    alert(`🏆 Rekap Final Presensi [${periodeTeks}] ${infoAksi}!\n\nData ini otomatis tersimpan di:\n1. 🏆 History Laporan Final\n2. 🕒 Restore History`);
                    
                    // Refresh modal Laporan Final & Restore jika sedang terbuka
                    if (typeof openFinalHistoryModal === "function" && document.getElementById("modalFinalHistory")?.style.display === "flex") {
                        openFinalHistoryModal();
                    }
                    if (typeof openRestoreModal === "function" && document.getElementById("modalRestore")?.style.display === "flex") {
                        openRestoreModal();
                    }
                    if (typeof segarkanRekapKehadiran === "function") {
                        segarkanRekapKehadiran();
                    }
                }
            });

        }).catch((err) => {
            restoreButton();
            console.error("Gagal memeriksa duplikasi final history:", err);
            alert("❌ Terjadi kendala saat memeriksa data di cloud: " + err.message);
        });

    } catch (err) {
        console.error("Error pada saveReportFinal:", err);
        alert("❌ Terjadi kesalahan: " + err.message);
        
        const btnFinal = document.getElementById("btnSaveReportFinal") || document.querySelector("button[onclick*='saveReportFinal']");
        if (btnFinal) {
            btnFinal.disabled = false;
            btnFinal.innerHTML = '<svg class="icon-svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Save Report Final';
        }
    }
};

// ==========================================
// LOGIKA MODAL KHUSUS HISTORY LAPORAN FINAL
// ==========================================
// =========================================================
// FUNGSI MEMBUKA MODAL HISTORY LAPORAN FINAL (HANYA TERBARU PER BULAN)
// =========================================================

window.openFinalHistoryModal = function() {
    var modal = document.getElementById("modalFinalHistory");
    var container = document.getElementById("finalHistoryListContainer");

    if (!modal || !container) {
        alert("⚠️ Elemen modal history laporan final belum siap di halaman HTML!");
        return;
    }

    // Tampilkan Modal
    modal.style.display = "flex";
    container.innerHTML = "<div style='text-align:center; padding: 20px; color: #7f8c8d;'><span class='spinner-login'></span> Memuat daftar laporan final dari Cloud...</div>";

    // Deteksi koneksi Firebase
    let dbRef = null;
    if (typeof db !== "undefined" && db) dbRef = db;
    else if (typeof database !== "undefined" && database) dbRef = database;
    else if (typeof firebase !== "undefined" && firebase.database) dbRef = firebase.database();

    if (!dbRef) {
        container.innerHTML = "<div style='color:red; text-align:center; padding:15px;'>Koneksi Firebase belum siap/terhubung.</div>";
        return;
    }

    // Ambil data dari Firebase node 'history'
    dbRef.ref('history').once('value')
        .then(function(snapshot) {
            container.innerHTML = "";
            var allFinalData = [];

            if (snapshot.exists()) {
                snapshot.forEach(function(childSnapshot) {
                    var val = childSnapshot.val();
                    // Filter khusus Rekap Final
                    if (val && (val.isFinalReport === true || val.isFinalReport === "true" || (val.reportTitle && val.reportTitle.indexOf("Rekap Final") !== -1))) {
                        if (!val.id) val.id = childSnapshot.key;
                        allFinalData.push(val);
                    }
                });
            }

            // 1. Urutkan dari timestamp terbesar (paling terbaru berada di atas)
            allFinalData.sort(function(a, b) {
                var timeA = Number(a.id) || (a.timestamp ? Number(a.timestamp) : 0);
                var timeB = Number(b.id) || (b.timestamp ? Number(b.timestamp) : 0);
                return timeB - timeA;
            });

            // 💡 2. DEDUPILKASI: AMBIL HANYA 1 DATA TERBARU DARI SETIAP PERIODE/BULAN
            var latestByMonthMap = {};
            var finalDataUnique = [];

            allFinalData.forEach(function(item) {
                // Tentukan Kunci Unik Periode (misal: "Januari 2026")
                var keyPeriode = item.namaBulanTahun ? item.namaBulanTahun.trim() : (item.reportTitle ? item.reportTitle.replace("Rekap Final Presensi ", "").trim() : "Periode-Tanpa-Nama");
                
                // Jika periode ini belum pernah dimasukkan, masukkan (karena sudah diurutkan dari yang terbaru, yang pertama ditemui pasti versi paling baru)
                if (!latestByMonthMap[keyPeriode]) {
                    latestByMonthMap[keyPeriode] = true;
                    finalDataUnique.push(item);
                }
            });

            if (finalDataUnique.length === 0) {
                container.innerHTML = 
                    "<div style='text-align:center; padding: 25px; color: #7f8c8d; font-style: italic; border: 1px dashed #ccc; border-radius: 6px; background: #fafafa;'>" +
                        "Belum ada Rekap Final Presensi yang disimpan.<br>" +
                        "<small style='font-size:11px; color:#a0a0a0;'>Gunakan tombol <b>Save Report Final</b> di bawah tabel jika data bulan tersebut sudah bersih.</small>" +
                    "</div>";
            } else {
                finalDataUnique.forEach(function(item) {
                    var div = document.createElement("div");
                    div.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; border: 1px solid #dcdde1; background: #ffffff; border-radius: 6px; border-left: 5px solid #8e44ad; box-shadow: 0 2px 5px rgba(0,0,0,0.03);";
                    
                    var countPegawai = (item.dataPegawai) ? Object.keys(item.dataPegawai).length : ((item.globalRekap) ? Object.keys(item.globalRekap).length : 0);
                    var namaBulanDisplay = item.namaBulanTahun ? item.namaBulanTahun : (item.reportTitle ? item.reportTitle.replace("Rekap Final Presensi ", "") : "Periode");
                    
                    var unitKerjaDisplay = item.unitKerja || item.savedByUnitKerja || "Kanreg XIV BKN";
                    if (unitKerjaDisplay === "Kanreg XIV") unitKerjaDisplay = "Kanreg XIV BKN";
                    if (unitKerjaDisplay === "UPT Sorong") unitKerjaDisplay = "UPT BKN Sorong";
                    var savedByDisplay = item.savedByNama || item.namaUser || item.savedBy || "Operator";
                    
                    var titleDisplay = "Laporan - " + namaBulanDisplay + " - Pegawai " + unitKerjaDisplay;
                    var timeStampDisplay = item.dateString ? item.dateString : "-";

                    div.innerHTML = 
                        "<div>" +
                            "<div style='font-weight: bold; color: #2c3e50; font-size: 13.5px; margin-bottom: 3px;'>" +
                                titleDisplay +
                            "</div>" +
                            "<div style='font-size: 11px; color: #7f8c8d;'>" +
                                "Diperbarui: <span style='color: #34495e; font-weight: 500;'>" + timeStampDisplay + "</span> (" + savedByDisplay + ")" +
                            "</div>" +
                            "<div style='font-size: 11px; color: #95a5a6; margin-top: 2px;'>" +
                                "Total Pegawai: <b>" + countPegawai + "</b>" +
                            "</div>" +
                        "</div>" +
                        "<div>" +
                            "<button class='btn-excel' style='background:#8e44ad; color:white; border:none; padding: 7px 13px; font-size: 11px; border-radius: 4px; font-weight: bold; cursor:pointer;' onclick=\"restoreFromFirebase('" + item.id + "'); tutupModalFinalHistory();\">" +
                                "Buka Laporan" +
                            "</button>" +
                        "</div>";
                    
                    container.appendChild(div);
                });
            }
        })
        .catch(function(err) {
            console.error("Error pada openFinalHistoryModal:", err);
            container.innerHTML = "<div style='color:red; text-align:center; padding:15px;'>Gagal mengambil data: " + err.message + "</div>";
        });
};

window.tutupModalFinalHistory = function() {
    var modal = document.getElementById("modalFinalHistory");
    if (modal) modal.style.display = "none";
};


window.tutupModalFinalHistory = function() {
    var modal = document.getElementById("modalFinalHistory");
    if (modal) modal.style.display = "none";
};




