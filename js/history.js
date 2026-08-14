// --- SIMPAN KE FIREBASE DATABASE ---
function saveToHistory(isSilent = false) {
    if (Object.keys(globalRekap).length === 0) {
        if (!isSilent) alert("Tidak ada data presensi yang sedang dikerjakan untuk disimpan!");
        return false;
    }
    
    let now = new Date();
    let timestamp = now.getTime();
    let dateString = now.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    let currentState = {
        id: timestamp,
        dateString: dateString,
        globalRekap: globalRekap,
        dataPegawai: dataPegawai,
        activeYear: activeYear,
        activeMonth: activeMonth,
        namaBulanTahun: namaBulanTahun,
        isFingerprintUploaded: isFingerprintUploaded
    };

    // Simpan ke Firebase dengan ID berupa Timestamp
    db.ref('history/' + timestamp).set(currentState, function(error) {
        if (error) {
            if (!isSilent) alert("❌ Gagal menyimpan data ke Database: " + error.message);
        } else {
            if (!isSilent) {
                alert(`✅ Progress pekerjaan berhasil disimpan ke Cloud!\nWaktu simpan: ${dateString}\n\nData dapat diakses kemudian.`);
            }
        }
    });
}

// --- AMBIL DAFTAR RESTORE DARI FIREBASE ---
function openRestoreModal() {
    let container = document.getElementById("historyListContainer");
    container.innerHTML = "<div style='text-align:center; padding: 20px; color: #7f8c8d;'>Mengambil data dari database Cloud...</div>";
    document.getElementById("modalRestore").style.display = "flex";

    // Membaca data dari Firebase node 'history'
    db.ref('history').orderByChild('isFinalReport').equalTo(true).limitToLast(15).once('value', (snapshot) => {
        container.innerHTML = "";
        let historyData = [];

        snapshot.forEach((childSnapshot) => {
            historyData.push(childSnapshot.val());
        });

        // Urutkan dari yang paling baru
        historyData.reverse();

        if (historyData.length === 0) {
            container.innerHTML = "<div style='text-align:center; padding: 25px; color: #7f8c8d; font-style: italic; border: 1px dashed #ccc; border-radius: 5px;'>Belum ada riwayat pekerjaan tersimpan di database. Klik 'Save History' terlebih dahulu saat bekerja.</div>";
        } else {
            historyData.forEach((item) => {
                let div = document.createElement("div");
                div.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; border-bottom: 1px solid #ddd; background: #f8f9f9; margin-bottom: 8px; border-radius: 5px; border-left: 4px solid #9b59b6;";
                
                let countPegawai = item.dataPegawai ? Object.keys(item.dataPegawai).length : 0;
                
                div.innerHTML = `
                    <div>
                        <div style="font-weight: bold; color: #2c3e50; font-size: 14px; margin-bottom: 3px;">Tersimpan: ${item.dateString}</div>
                        <div style="font-size: 12px; color: #7f8c8d;">Periode: <b>${item.namaBulanTahun}</b> | Total Pegawai: <b>${countPegawai}</b></div>
                    </div>
                    <div>
                        <button class="btn-simpan" style="background:#8e44ad; padding: 8px 12px; font-size: 12px; border-radius: 4px;" onclick="restoreFromFirebase('${item.id}')">Pilih & Restore</button>
                    </div>
                `;
                container.appendChild(div);
            });
        }
    });
}

function tutupModalRestore() {
    document.getElementById("modalRestore").style.display = "none";
}

// --- RESTORE DATA SPESIFIK DARI FIREBASE ---
function restoreFromFirebase(timestampId) {
    if (!confirm("⚠️ PERHATIAN:\n\nMe-restore history akan MENIMPA pekerjaan Anda yang ada di layar saat ini. Yakin ingin melanjutkan?")) return;

    db.ref('history/' + timestampId).once('value', (snapshot) => {
        let selectedState = snapshot.val();
        if (!selectedState) {
            alert("Data riwayat tidak ditemukan di Database!");
            return;
        }

        globalRekap = selectedState.globalRekap || {};
        dataPegawai = selectedState.dataPegawai || {};
        activeYear = selectedState.activeYear;
        activeMonth = selectedState.activeMonth;
        namaBulanTahun = selectedState.namaBulanTahun;
        isFingerprintUploaded = selectedState.isFingerprintUploaded;

        document.getElementById("periodeText").innerText = `Periode: ${namaBulanTahun}`;

        if (Object.keys(globalRekap).length > 0) {
            document.getElementById('sectionPresensi').style.display = 'block';
            document.getElementById('sectionManualWrapper').style.display = 'block';
        } else {
            document.getElementById('sectionPresensi').style.display = 'none';
            document.getElementById('sectionManualWrapper').style.display = 'none';
        }

        updateCheckboxPegawaiManual();
        updateFilterNamaDropdown();
        renderTabel();
        tutupModalRestore();

        alert(`✅ Pekerjaan versi [${selectedState.dateString}] berhasil dipulihkan dari Cloud!`);
    });
}

// --- VALIDASI HANYA UNTUK CATATAN "LUPA ABSEN" ---
function recheckStatusFinalReport() {
    const container = document.getElementById("containerSaveFinal");
    const btn = document.getElementById("btnSaveReportFinal");
    const noteMsg = document.getElementById("finalNoteMessage");
    const auditBox = document.getElementById("auditBox");

    if (!container || !btn || !noteMsg) return;

    // Jika belum ada data presensi yang dimuat, sembunyikan wadah tombol
    if (typeof globalRekap === "undefined" || Object.keys(globalRekap).length === 0) {
        container.style.display = "none";
        return;
    }

    container.style.display = "block";

    // Cek apakah ada catatan spesifik "Lupa Absen" di Audit Box
    let hasLupaAbsen = false;
    if (auditBox) {
        const textContent = auditBox.innerText || auditBox.textContent || "";
        // Memeriksa keberadaan frasa "Lupa Absen" (tidak peka huruf besar/kecil)
        if (/lupa\s+absen/i.test(textContent)) {
            hasLupaAbsen = true;
        }
    }

    if (hasLupaAbsen) {
        btn.disabled = true;
        btn.style.opacity = "0.5";
        btn.style.cursor = "not-allowed";
        btn.style.backgroundColor = "#95a5a6";
        noteMsg.innerText = "⚠️ Tombol ini terkunci karena masih ada pegawai dengan status 'Lupa Absen'. Selesaikan/lengkapi jam masuk/pulang terlebih dahulu.";
    } else {
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
        btn.style.backgroundColor = "#27ae60";
        noteMsg.innerText = "✅ Tidak ada catatan 'Lupa Absen'. Anda dapat menyimpan rekap final bulan ini.";
    }
}

// --- FUNGSI SAVE REPORT FINAL ---
function saveReportFinal() {
    if (typeof globalRekap === "undefined" || Object.keys(globalRekap).length === 0) {
        alert("Tidak ada data presensi yang sedang dikerjakan!");
        return;
    }

    const auditBox = document.getElementById("auditBox");
    if (auditBox) {
        const textContent = auditBox.innerText || auditBox.textContent || "";
        if (/lupa\s+absen/i.test(textContent)) {
            alert("⛔ Gagal menyimpan! Masih terdapat catatan 'Lupa Absen' yang belum diselesaikan.");
            return;
        }
    }

    const btn = document.getElementById("btnSaveReportFinal");
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-login"></span> Memproses Rekap Final...`;
    }

    let now = new Date();
    let timestamp = now.getTime();
    let dateString = now.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    let safeBulanTahunKey = (typeof namaBulanTahun !== "undefined" ? namaBulanTahun : "Periode").replace(/[^a-zA-Z0-9]/g, "_");
    let finalKey = "FINAL_" + safeBulanTahunKey;

    let currentState = {
        id: timestamp,
        finalKey: finalKey,
        isFinalReport: true,
        reportTitle: `Rekap Final Presensi ${typeof namaBulanTahun !== "undefined" ? namaBulanTahun : ""}`,
        dateString: dateString,
        globalRekap: globalRekap,
        dataPegawai: dataPegawai,
        activeYear: activeYear,
        activeMonth: activeMonth,
        namaBulanTahun: namaBulanTahun,
        isFingerprintUploaded: isFingerprintUploaded
    };

    // Timpa rekap final periode/bulan yang sama di Firebase
    db.ref('history').orderByChild('finalKey').equalTo(finalKey).once('value', (snapshot) => {
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                db.ref('history/' + childSnapshot.key).remove();
            });
        }

        db.ref('history/' + timestamp).set(currentState, function(error) {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `🏆 Save Report Final`;
            }

            if (error) {
                alert("❌ Gagal menyimpan ke database: " + error.message);
            } else {
                alert(`🏆 BERHASIL!\n\nRekap Final Presensi periode [${namaBulanTahun}] berhasil disimpan di Cloud Database!`);
                if (typeof openRestoreModal === "function") openRestoreModal();
            }
        });
    });
}

// ==========================================
// LOGIKA MODAL KHUSUS HISTORY LAPORAN FINAL
// ==========================================



// ==========================================
// KODE AMAN: MODAL KHUSUS HISTORY LAPORAN FINAL
// ==========================================

window.openFinalHistoryModal = function() {
    var modal = document.getElementById("modalFinalHistory");
    var container = document.getElementById("finalHistoryListContainer");

    if (!modal || !container) {
        alert("Elemen modal history belum siap di halaman!");
        return;
    }

    // Tampilkan Modal
    modal.style.display = "flex";
    container.innerHTML = "<div style='text-align:center; padding: 20px; color: #7f8c8d;'><span class='spinner-login'></span> Memuat daftar laporan final...</div>";

    // Ambil data dari Firebase
    if (typeof db === "undefined" || !db) {
        container.innerHTML = "<div style='color:red; text-align:center; padding:15px;'>Koneksi Firebase belum siap.</div>";
        return;
    }

    db.ref('history').once('value')
        .then(function(snapshot) {
            container.innerHTML = "";
            var finalData = [];

            if (snapshot.exists()) {
                snapshot.forEach(function(childSnapshot) {
                    var val = childSnapshot.val();
                    if (val && (val.isFinalReport === true || (val.reportTitle && val.reportTitle.indexOf("Rekap Final") !== -1))) {
                        finalData.push(val);
                    }
                });
            }

            finalData.reverse(); // Urutkan dari yang terbaru

            if (finalData.length === 0) {
                container.innerHTML = 
                    "<div style='text-align:center; padding: 25px; color: #7f8c8d; font-style: italic; border: 1px dashed #ccc; border-radius: 6px; background: #fafafa;'>" +
                        "Belum ada Rekap Final Presensi yang disimpan.<br>" +
                        "<small style='font-size:11px; color:#a0a0a0;'>Gunakan tombol <b>🏆 Save Report Final</b> di bawah tabel jika data bulan tersebut sudah bersih.</small>" +
                    "</div>";
            } else {
                finalData.forEach(function(item) {
                    var div = document.createElement("div");
                    div.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; border: 1px solid #dcdde1; background: #ffffff; border-radius: 6px; border-left: 5px solid #8e44ad; box-shadow: 0 2px 5px rgba(0,0,0,0.03);";
                    
                    var countPegawai = (item.dataPegawai) ? Object.keys(item.dataPegawai).length : 0;
                    var namaBulanDisplay = item.namaBulanTahun ? item.namaBulanTahun : (item.reportTitle ? item.reportTitle.replace("Rekap Final Presensi ", "") : "Periode");
                    var titleDisplay = "Laporan - " + namaBulanDisplay;
                    var timeStampDisplay = item.dateString ? item.dateString : "-";

                    div.innerHTML = 
                        "<div>" +
                            "<div style='font-weight: bold; color: #2c3e50; font-size: 14px; margin-bottom: 3px;'>" +
                                "🏆 " + titleDisplay +
                            "</div>" +
                            "<div style='font-size: 11px; color: #7f8c8d;'>" +
                                "Waktu simpan: <span style='color: #34495e; font-weight: 500;'>" + timeStampDisplay + "</span>" +
                            "</div>" +
                            "<div style='font-size: 11px; color: #95a5a6; margin-top: 2px;'>" +
                                "Total Pegawai: <b>" + countPegawai + "</b>" +
                            "</div>" +
                        "</div>" +
                        "<div>" +
                            "<button class='btn-excel' style='background:#8e44ad; padding: 7px 13px; font-size: 11px; border-radius: 4px; font-weight: bold;' onclick=\"restoreFromFirebase('" + item.id + "'); tutupModalFinalHistory();\">" +
                                "Buka Laporan" +
                            "</button>" +
                        "</div>";
                    
                    container.appendChild(div);
                });
            }
        })
        .catch(function(err) {
            container.innerHTML = "<div style='color:red; text-align:center; padding:15px;'>Gagal mengambil data: " + err.message + "</div>";
        });
};

window.tutupModalFinalHistory = function() {
    var modal = document.getElementById("modalFinalHistory");
    if (modal) modal.style.display = "none";
};




// const STORAGE_KEY = "presensi_pegawai_history";
// const MAX_HISTORY = 5; 

// function saveToHistory(isSilent = false) {
//     if (Object.keys(globalRekap).length === 0) {
//         if (!isSilent) alert("Tidak ada data presensi yang sedang dikerjakan untuk disimpan!");
//         return false;
//     }
    
//     let history = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    
//     let now = new Date();
//     let timestamp = now.getTime();
//     let dateString = now.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
//     let currentState = {
//         id: timestamp,
//         dateString: dateString,
//         globalRekap: globalRekap,
//         dataPegawai: dataPegawai,
//         activeYear: activeYear,
//         activeMonth: activeMonth,
//         namaBulanTahun: namaBulanTahun,
//         isFingerprintUploaded: isFingerprintUploaded
//     };
    
//     history.unshift(currentState);
    
//     if (history.length > MAX_HISTORY) {
//         history = history.slice(0, MAX_HISTORY);
//     }
    
//     try {
//         localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
//         if (!isSilent) {
//             alert(`✅ Progress pekerjaan berhasil disimpan ke memori browser!\nWaktu simpan: ${dateString}\n\nAnda sekarang dapat menutup tab/aplikasi dan melanjutkannya lagi nanti menggunakan tombol 'Restore History'.`);
//         }
//         return true;
//     } catch (e) {
//         if (!isSilent) alert("❌ Gagal menyimpan history. Penyimpanan (Storage) browser Anda mungkin penuh.");
//         return false;
//     }
// }

// function openRestoreModal() {
//     let history = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
//     let container = document.getElementById("historyListContainer");
//     container.innerHTML = "";
    
//     if (history.length === 0) {
//         container.innerHTML = "<div style='text-align:center; padding: 25px; color: #7f8c8d; font-style: italic; border: 1px dashed #ccc; border-radius: 5px;'>Belum ada history/riwayat pekerjaan yang tersimpan. Klik 'Save History' terlebih dahulu saat bekerja.</div>";
//     } else {
//         history.forEach((item, index) => {
//             let div = document.createElement("div");
//             div.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; border-bottom: 1px solid #ddd; background: #f8f9f9; margin-bottom: 8px; border-radius: 5px; border-left: 4px solid #9b59b6;";
            
//             let countPegawai = Object.keys(item.dataPegawai).length;
            
//             div.innerHTML = `
//                 <div>
//                     <div style="font-weight: bold; color: #2c3e50; font-size: 14px; margin-bottom: 3px;">Tersimpan: ${item.dateString}</div>
//                     <div style="font-size: 12px; color: #7f8c8d;">Periode Aktif: <b>${item.namaBulanTahun}</b> | Total Pegawai: <b>${countPegawai}</b></div>
//                 </div>
//                 <div>
//                     <button class="btn-simpan" style="background:#8e44ad; padding: 8px 12px; font-size: 12px; border-radius: 4px;" onclick="restoreFromHistory(${index})">Pilih & Restore</button>
//                 </div>
//             `;
//             container.appendChild(div);
//         });
//     }
    
//     document.getElementById("modalRestore").style.display = "flex";
// }

// function tutupModalRestore() {
//     document.getElementById("modalRestore").style.display = "none";
// }

// function restoreFromHistory(index) {
//     if (!confirm("⚠️ PERHATIAN:\n\nMe-restore (memulihkan) history akan MENIMPA pekerjaan Anda yang ada di layar saat ini. Apakah Anda yakin ingin memulihkan versi tersebut?")) return;
    
//     let history = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
//     let selectedState = history[index];
    
//     if (!selectedState) {
//         alert("Data riwayat tidak ditemukan/corrupt!");
//         return;
//     }
    
//     globalRekap = selectedState.globalRekap || {};
//     dataPegawai = selectedState.dataPegawai || {};
//     activeYear = selectedState.activeYear;
//     activeMonth = selectedState.activeMonth;
//     namaBulanTahun = selectedState.namaBulanTahun;
//     isFingerprintUploaded = selectedState.isFingerprintUploaded;
    
//     document.getElementById("periodeText").innerText = `Periode: ${namaBulanTahun}`;
    
//     if (Object.keys(globalRekap).length > 0) {
//         document.getElementById('sectionPresensi').style.display = 'block';
//         document.getElementById('sectionManualWrapper').style.display = 'block';
//     } else {
//         document.getElementById('sectionPresensi').style.display = 'none';
//         document.getElementById('sectionManualWrapper').style.display = 'none';
//     }
    
//     updateCheckboxPegawaiManual();
//     updateFilterNamaDropdown();
//     renderTabel();
//     tutupModalRestore();
    
//     alert(`✅ Pekerjaan Anda versi [${selectedState.dateString}] berhasil dipulihkan dan siap dilanjutkan!`);
// }


