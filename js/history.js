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
            if (!isSilent) alert("❌ Gagal menyimpan data ke Firebase: " + error.message);
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
    container.innerHTML = "<div style='text-align:center; padding: 20px; color: #7f8c8d;'>Mengambil data dari database Firebase...</div>";
    document.getElementById("modalRestore").style.display = "flex";

    // Membaca data dari Firebase node 'history'
    db.ref('history').orderByChild('id').limitToLast(10).once('value', (snapshot) => {
        container.innerHTML = "";
        let historyData = [];

        snapshot.forEach((childSnapshot) => {
            historyData.push(childSnapshot.val());
        });

        // Urutkan dari yang paling baru
        historyData.reverse();

        if (historyData.length === 0) {
            container.innerHTML = "<div style='text-align:center; padding: 25px; color: #7f8c8d; font-style: italic; border: 1px dashed #ccc; border-radius: 5px;'>Belum ada riwayat pekerjaan tersimpan di database Firebase. Klik 'Save History' terlebih dahulu saat bekerja.</div>";
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


