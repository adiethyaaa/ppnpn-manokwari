// Cek Login Session saat membuka dashboard
const activeUser = checkAuthSession();

document.addEventListener("DOMContentLoaded", () => {
    terapkanHakAksesUI();
});

// Dijalankan otomatis saat dashboard dibuka
(function inisialisasiUserSession() {
    try {
        let sessionRaw = localStorage.getItem("userSession") || sessionStorage.getItem("userSession") || localStorage.getItem("activeUser");
        if (sessionRaw) {
            window.currentUser = JSON.parse(sessionRaw);
            
            // Opsional: Tampilkan nama user di header dashboard jika ada elemennya
            let elNamaHeader = document.getElementById("userDisplayName") || document.getElementById("lblNamaUser");
            if (elNamaHeader && window.currentUser.nama) {
                elNamaHeader.innerText = window.currentUser.nama;
            }
        }
    } catch (e) {
        console.warn("Gagal memuat session user di dashboard:", e);
    }
})();

function terapkanHakAksesUI() {
    if (!activeUser) return;

    
    const btnHistory = document.getElementById("btnHistoryFloating");

    // Kontrol Tampil/Sembunyi Tombol Floating History
    if (btnHistory) {
        if (activeUser.role === "administrator" || p.bukaHistoryFloating !== false) {
            btnHistory.style.display = "flex";
        } else {
            btnHistory.style.display = "none";
        }
    }

    // Jika Administrator, tampilkan tombol Kelola User MENGAMBANG di sebelah tombol Logout
    if (activeUser.role === "administrator") {
        if (!document.getElementById("btnKelolaAdmin")) {
            let adminBtn = document.createElement("a");
            adminBtn.id = "btnKelolaAdmin";
            // adminBtn.href = "admin";
            adminBtn.href = "admin.html";
            //link web html
            adminBtn.className = "btn-admin-floating"; // Menggunakan class CSS khusus floating
            adminBtn.innerHTML = "⚙️ Kelola User";
            document.body.appendChild(adminBtn); // Tempelkan langsung ke body agar floating
        }
        return; 
    }

    // Jika Operator, sembunyikan tombol sesuai ON/OFF permissions dari Firebase
    const p = activeUser.permissions || {};

    // Buat Tombol Floating Buka History (Kiri Bawah) jika diizinkan
    if (activeUser.role === "administrator" || p.bukaHistoryFloating !== false) {
        if (!document.getElementById("btnHistoryFloating")) {
            let histBtn = document.createElement("button");
            histBtn.id = "btnHistoryFloating";
            histBtn.className = "btn-history-floating";
            histBtn.innerHTML = "🕒 Buka History Laporan";
            histBtn.onclick = openRestoreModal;
            document.body.appendChild(histBtn);
        }
    }

    // Tombol Administrator Floating
    if (activeUser.role === "administrator") {
        if (!document.getElementById("btnKelolaAdmin")) {
            let adminBtn = document.createElement("a");
            adminBtn.id = "btnKelolaAdmin";
            // adminBtn.href = "admin";
            adminBtn.href = "admin.html";
            //link web html
            adminBtn.className = "btn-admin-floating";
            adminBtn.innerHTML = "⚙️ Kelola User";
            document.body.appendChild(adminBtn);
        }
        return;
    }

    const elementMap = {
        uploadJadwal: document.querySelector("button[onclick='prosesExcelJadwal()']"),
        inputManualPopUp: document.querySelector("button[onclick='bukaModalPegawaiManual()']"),
        uploadFingerprint: document.querySelector("button[onclick='prosesExcel()']"),
        recheckPresensi: document.querySelector(".btn-recheck"),
        updateMassal: document.querySelector("button[onclick='tambahDataManual()']"),
        exportTerpilih: document.querySelector("button[onclick=\"prosesBatchExport('excel')\"]"),
        hapusPegawai: document.querySelector(".btn-hapus-pegawai"),
        exportAllExcel: document.querySelector("button[onclick='exportSemuaExcel()']"),
        previewPDF: document.querySelector("button[onclick='previewSemuaPDF()']"),
        saveHistory: document.querySelector(".btn-save-history"),
        restoreHistory: document.querySelector(".btn-restore-history"),
        saveReportFinal: document.getElementById("btnSaveReportFinal")
    };

    Object.keys(elementMap).forEach(key => {
        if (elementMap[key] && p[key] === false) {
            elementMap[key].style.display = "none";
        }
    });
}

// GLOBAL STATE APLIKASI
let globalRekap = {};
let dataPegawai = {}; 
let activeYear = null;
let activeMonth = null; 
let namaBulanTahun = "";
let isFingerprintUploaded = false; 
let bknLogoBase64 = null; 
let lastRekapState = null; 

const BULAN_INDO = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI_INDO = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function preloadBknLogo() {
    let img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Logo_Badan_Kepegawaian_Negara.png/960px-Logo_Badan_Kepegawaian_Negara.png";
    img.onload = function() {
        let canvas = document.createElement("canvas");
        canvas.width = 80;  
        canvas.height = 80;
        let ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, 80, 80);
        bknLogoBase64 = canvas.toDataURL("image/png", 0.7); 
    };
}
window.addEventListener('load', preloadBknLogo);

function setBulanAktif(dateObj) {
    activeYear = dateObj.getFullYear();
    activeMonth = dateObj.getMonth();
    namaBulanTahun = `${BULAN_INDO[activeMonth]} ${activeYear}`;
    document.getElementById("periodeText").innerText = `Periode: ${namaBulanTahun}`;
}

function getYesterdayIso(isoDate) {
    let d = new Date(isoDate);
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getNamaDepan(namaLengkap) {
    if (!namaLengkap) return "";
    return namaLengkap.trim().split(" ")[0];
}

function toggleAuditBox() {
    let section = document.getElementById('sectionAudit');
    let btn = document.getElementById('btnToggleAudit');
    if (section.style.display === 'none') {
        section.style.display = 'block';
        btn.innerText = '📋 Sembunyikan Area Keterangan Presensi';
    } else {
        section.style.display = 'none';
        btn.innerText = '📁 Tampilkan Area Keterangan Presensi';
    }
}

function toggleFormManual() {
    const sectionManual = document.getElementById('sectionManual');
    const btnToggle = document.getElementById('btnToggleManual');
    if (sectionManual.style.display === 'none') {
        sectionManual.style.display = 'block';
        btnToggle.innerText = '📂 Sembunyikan Area Update & Download Manual';
    } else {
        sectionManual.style.display = 'none';
        btnToggle.innerText = '📁 Tampilkan Area Update & Download Manual';
    }
}

function updateCheckboxPegawaiManual() {
    const container = document.getElementById("checkboxPegawaiList");
    container.innerHTML = '';
    
    Object.keys(dataPegawai).sort((a,b) => dataPegawai[a].localeCompare(dataPegawai[b])).forEach(id => {
        let namaLengkap = dataPegawai[id];
        let label = document.createElement("label");
        label.innerHTML = `<input type="checkbox" class="manual-pegawai-checkbox" value="${id}"> ${namaLengkap} (ID: ${id})`;
        container.appendChild(label);
    });
    document.getElementById('checkAllManual').checked = false;
}

function toggleCheckAllManual() {
    const isChecked = document.getElementById('checkAllManual').checked;
    document.querySelectorAll('.manual-pegawai-checkbox').forEach(cb => cb.checked = isChecked);
}

function hapusPegawaiTerpilih() {
    const checkedCheckboxes = document.querySelectorAll('.manual-pegawai-checkbox:checked');
    if (checkedCheckboxes.length === 0) {
        alert("Pilih/centang minimal 1 pegawai yang ingin dihapus!");
        return;
    }

    let namaTarget = [];
    checkedCheckboxes.forEach(cb => {
        let id = cb.value;
        if (dataPegawai[id]) namaTarget.push(`${dataPegawai[id]} (ID: ${id})`);
    });

    let pesanKonfirmasi = `⚠️ KONFIRMASI HAPUS PEGAWAI\n\nApakah Anda YAKIN ingin menghapus ${checkedCheckboxes.length} pegawai berikut dari aplikasi?\n\n- ` + namaTarget.join('\n- ') + `\n\nSeluruh data presensi pegawai ini pada bulan/periode aktif akan DIBERSIHKAN secara permanen!`;

    if (confirm(pesanKonfirmasi)) {
        checkedCheckboxes.forEach(cb => {
            let id = cb.value;
            delete dataPegawai[id];
            
            Object.keys(globalRekap).forEach(key => {
                if (key.startsWith(id + "_")) {
                    delete globalRekap[key];
                }
            });
        });

        updateCheckboxPegawaiManual();
        updateFilterNamaDropdown();
        renderTabel();
        alert(`✅ Berhasil menghapus ${checkedCheckboxes.length} pegawai beserta seluruh data presensinya!`);
    }
}

function updateFilterNamaDropdown() {
    const selectFilter = document.getElementById('filterNama');
    const selectedRole = document.getElementById('filterRole').value;
    selectFilter.innerHTML = '<option value="">-- Semua Pegawai --</option>';
    
    Object.keys(dataPegawai).sort((a,b) => dataPegawai[a].localeCompare(dataPegawai[b])).forEach(id => {
        let role = "STAFF"; 
        let firstKey = Object.keys(globalRekap).find(k => k.startsWith(id + "_"));
        if (firstKey) {
            role = globalRekap[firstKey].role || "STAFF";
        }
        
        if (selectedRole === "" || role === selectedRole) {
            let opt = document.createElement("option");
            opt.value = dataPegawai[id].toLowerCase();
            opt.text = dataPegawai[id];
            selectFilter.appendChild(opt);
        }
    });
}

function updateFilterKehadiranDropdown() {
    const selectFilter = document.getElementById('filterKehadiran');
    let currentVal = selectFilter.value;
    let statusSet = new Set();

    Object.keys(globalRekap).forEach(key => {
        let rec = globalRekap[key];
        let status = getStatusKehadiran(rec);
        if (status) statusSet.add(status);
    });

    selectFilter.innerHTML = '<option value="">-- Semua Status --</option>';
    Array.from(statusSet).sort().forEach(st => {
        let opt = document.createElement("option");
        opt.value = st;
        opt.text = st;
        if (st === currentVal) opt.selected = true;
        selectFilter.appendChild(opt);
    });
}

let sortCol = -1;
let sortAsc = true;
function sortTable(columnIndex) {
    const table = document.getElementById("tabelAbsen");
    const tbody = table.tBodies[0];
    const rows = Array.from(tbody.querySelectorAll("tr"));
    
    if (sortCol === columnIndex) sortAsc = !sortAsc;
    else { sortCol = columnIndex; sortAsc = true; }

    rows.sort((a, b) => {
        let valA = a.cells[columnIndex].innerText.trim();
        let valB = b.cells[columnIndex].innerText.trim();
        let numA = parseFloat(valA);
        let numB = parseFloat(valB);
        
        if (!isNaN(numA) && !isNaN(numB) && valA.match(/^[0-9]+$/)) {
            return sortAsc ? numA - numB : numB - numA;
        }
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
    tbody.append(...rows);
}

function getStatusKehadiran(record) {
    if (record.shiftTipe === "OFF") return "LJ";
    if (record.manualStatus) return record.manualStatus;
    
    let masukStr = record.waktuMasuk;
    let pulangStr = record.waktuPulang;

    if (!masukStr && !pulangStr) return "TK";
    
    if (!masukStr && pulangStr) return "Lupa Absen + TM3";
    if (masukStr && !pulangStr) return "Lupa Absen + PC3";

    let sMasuk = "TM3"; 
    let sPulang = "HN";

    if (record.shiftTipe === "P") {
        if (masukStr) {
            let m = masukStr.substring(0, 5);
            
            if (record.role === "MAGANG") {
                if (m <= "08:00") sMasuk = "HN";
                else if (m <= "08:30") sMasuk = "TM1";
                else if (m <= "09:00") sMasuk = "TM2";
                else sMasuk = "TM3";
            } else {
                if (m <= "07:00") sMasuk = "HN";
                else if (m <= "07:30") sMasuk = "TM1";
                else if (m <= "08:00") sMasuk = "TM2";
                else sMasuk = "TM3";
            }
        }
        if (pulangStr) {
            let p = pulangStr.substring(0, 5);
            let batasPulang = (record.role === "SATPAM") ? "19:00" : "16:30";
            if (p < batasPulang) {
                let actualP = new Date(`2000-01-01 ${pulangStr.substring(0,5)}:00`);
                let targetP = new Date(`2000-01-01 ${batasPulang}:00`);
                let selisihMenit = (targetP - actualP) / 60000;
                
                if (selisihMenit < 30) sPulang = "PC1";
                else if (selisihMenit < 60) sPulang = "PC2";
                else sPulang = "PC3";
            }
        }
    } 
    else if (record.shiftTipe === "M") {
        if (masukStr) {
            let m = masukStr.substring(0, 5);
            if (m <= "19:00") sMasuk = "HN";
            else if (m <= "19:30") sMasuk = "TM1";
            else if (m <= "20:00") sMasuk = "TM2";
            else sMasuk = "TM3";
        }
        if (pulangStr) {
            let p = pulangStr.substring(0, 5);
            if (p < "07:00") {
                let actualP = new Date(`2000-01-02 ${pulangStr.substring(0,5)}:00`);
                let targetP = new Date(`2000-01-02 07:00:00`);
                let selisihMenit = (targetP - actualP) / 60000;

                if (selisihMenit < 30) sPulang = "PC1";
                else if (selisihMenit < 60) sPulang = "PC2";
                else sPulang = "PC3";
            }
        }
    }

    if (sMasuk === "HN" && sPulang === "HN") return "HN";
    if (sMasuk === "HN" && sPulang.startsWith("PC")) return sPulang;
    if (sMasuk !== "HN" && sPulang === "HN") return sMasuk;
    return sMasuk + " + " + sPulang;
}

function getStatusBadgeClass(status) {
    if (status === "HN") return "status-hn";
    if (status === "TK" || status.includes("TK")) return "status-tk";
    if (status === "LJ") return "status-lj";
    if (status === "CT" || status === "Cuti") return "status-ct";
    if (status === "DL" || status === "Dinas Luar") return "status-dl";
    if (status === "CS" || status === "Sakit") return "status-cs"; 
    if (status.includes("Lupa Absen")) return "status-warning";
    return "status-warning"; 
}

function onShiftChangeInEdit(selectElem) {
    let tr = selectElem.closest("tr");
    if (selectElem.value === "OFF") {
        let inputs = tr.querySelectorAll(".edit-input");
        inputs.forEach(inp => inp.value = "");
        let selectKehadiran = tr.querySelector(".edit-kehadiran");
        if (selectKehadiran) selectKehadiran.value = "";
    }
}

// 3. FUNGSI EDIT BARIS TABEL (FIXED)
function editBaris(btn, key) {
    let tr = btn.closest("tr");
    tr.classList.add("sedang-diedit");
    tr.setAttribute("data-key", key); // Simpan key di elemen TR
    
    // Panggil penampil tombol simpan
    tandaiAdaPerubahanTabel();

    let tdShift = tr.cells[3];
    let tdKehadiran = tr.cells[6];
    let tdMasuk = tr.cells[7];
    let tdPulang = tr.cells[8];
    
    let curShift = tdShift.innerText.trim();
    let curStatus = tdKehadiran.innerText.trim();
    let curMasuk = tdMasuk.innerText !== "--" ? tdMasuk.innerText : "";
    let curPulang = tdPulang.innerText !== "--" ? tdPulang.innerText : "";
    
    tdShift.innerHTML = `
        <select class="edit-shift" onchange="onShiftChangeInEdit(this)">
            <option value="P" ${curShift === 'P' ? 'selected' : ''}>P</option>
            <option value="M" ${curShift === 'M' ? 'selected' : ''}>M</option>
            <option value="OFF" ${curShift === 'OFF' ? 'selected' : ''}>OFF</option>
        </select>
    `;

    let isCustomStatus = ['CT','DL','CS','Cuti','Dinas Luar','Sakit'].includes(curStatus);
    let selectedValue = isCustomStatus ? (curStatus.includes('CT') || curStatus === 'Cuti' ? 'CT' : (curStatus.includes('DL') || curStatus === 'Dinas Luar' ? 'DL' : 'CS')) : "";

    tdKehadiran.innerHTML = `
        <select class="edit-kehadiran">
            <option value="" ${selectedValue === '' ? 'selected' : ''}>-- Otomatis --</option>
            <option value="TK" ${curStatus === 'TK' ? 'selected' : ''}>TK</option>
            <option value="CT" ${selectedValue === 'CT' ? 'selected' : ''}>Cuti</option>
            <option value="DL" ${selectedValue === 'DL' ? 'selected' : ''}>Dinas Luar</option>
            <option value="CS" ${selectedValue === 'CS' ? 'selected' : ''}>Sakit</option>
        </select>
    `;

    tdMasuk.innerHTML = `<input type="time" class="edit-input" value="${curMasuk}">`;
    tdPulang.innerHTML = `<input type="time" class="edit-input" value="${curPulang}">`;
    
    let tdAksi = tr.cells[11];
    tdAksi.innerHTML = ` 
        <button class="btn-hapus" onclick="" style="background:#7f8c8d;">Proses..</button>
    `;
}

function simpanBarisSingle(btn, key) {
    let tr = btn.closest("tr");
    let inputs = tr.querySelectorAll(".edit-input");
    let valMasuk = inputs[0].value;
    let valPulang = inputs[1].value;
    let selectShift = tr.querySelector(".edit-shift");
    let selectKehadiran = tr.querySelector(".edit-kehadiran");
    
    let newShift = selectShift ? selectShift.value : "OFF";
    let newStatus = selectKehadiran ? selectKehadiran.value : null;

    if (globalRekap[key] !== undefined) {
        if (newShift === "OFF") {
            globalRekap[key].shiftTipe = "OFF";
            globalRekap[key].waktuMasuk = null;
            globalRekap[key].waktuPulang = null;
            globalRekap[key].manualStatus = null;
        } else {
            globalRekap[key].shiftTipe = newShift;
            globalRekap[key].waktuMasuk = valMasuk ? valMasuk + ":00" : null;
            globalRekap[key].waktuPulang = valPulang ? valPulang + ":00" : null;
            
            if (newStatus && newStatus !== "") {
                globalRekap[key].manualStatus = newStatus;
            } else {
                globalRekap[key].manualStatus = null;
            }
        }
    }
    renderTabel();
    cekTombolSimpanSemua();
}

function simpanSemuaPerubahan() {
    const barisEdit = document.querySelectorAll('#tabelAbsen tbody tr.sedang-diedit');
    if (barisEdit.length === 0) {
        alert("Tidak ada baris yang sedang diedit!");
        return;
    }

    barisEdit.forEach(tr => {
        // 💡 Ambil key langsung dari atribut data-key pada TR
        let key = tr.getAttribute("data-key");
        if (!key) return;

        let inputs = tr.querySelectorAll(".edit-input");
        let valMasuk = inputs[0] ? inputs[0].value : "";
        let valPulang = inputs[1] ? inputs[1].value : "";
        let selectShift = tr.querySelector(".edit-shift");
        let selectKehadiran = tr.querySelector(".edit-kehadiran");
        
        let newShift = selectShift ? selectShift.value : "OFF";
        let newStatus = selectKehadiran ? selectKehadiran.value : null;

        if (globalRekap[key] !== undefined) {
            if (newShift === "OFF") {
                globalRekap[key].shiftTipe = "OFF";
                globalRekap[key].waktuMasuk = null;
                globalRekap[key].waktuPulang = null;
                globalRekap[key].manualStatus = null;
            } else {
                globalRekap[key].shiftTipe = newShift;
                globalRekap[key].waktuMasuk = valMasuk ? valMasuk + ":00" : null;
                globalRekap[key].waktuPulang = valPulang ? valPulang + ":00" : null;
                
                if (newStatus && newStatus !== "") {
                    globalRekap[key].manualStatus = newStatus;
                } else {
                    globalRekap[key].manualStatus = null;
                }
            }
        }
    });

    renderTabel();
    alert("✅ Semua perubahan data di tabel berhasil disimpan!");
    sembunyikanTombolEdit();
}

function cekTombolSimpanSemua() {
    const barisEdit = document.querySelectorAll('#tabelAbsen tbody tr.sedang-diedit');
    if (barisEdit.length > 0) {
        document.getElementById('btnSimpanSemua').style.display = 'inline-block';
    } else {
        document.getElementById('btnSimpanSemua').style.display = 'none';
    }
}

function hapusBaris(key) {
    if (!confirm("Kosongkan jam presensi untuk baris ini?")) return;
    if (globalRekap[key]) {
        globalRekap[key].waktuMasuk = null;
        globalRekap[key].waktuPulang = null;
        globalRekap[key].manualStatus = null;
        renderTabel();
    }
}

function updateAuditBox() {
    const auditContainer = document.getElementById('auditContainer');
    const auditBox = document.getElementById('auditBox');
    const machineAlertBox = document.getElementById('machineAlertBox');
    
    if (!isFingerprintUploaded) {
        auditContainer.style.display = 'none';
        machineAlertBox.style.display = 'none';
        return;
    }

    let tkData = {}; 
    let lupaPagi = {};
    let lupaPulang = {};
    let tanggalLupaLebihDari2 = {}; 

    Object.keys(globalRekap).forEach(key => {
        let rec = globalRekap[key];
        if (rec.shiftTipe === "OFF") return;

        let tglAngka = parseInt(rec.tanggal.split("-")[2]);
        let namaTerbaru = dataPegawai[rec.id] || rec.nama;
        let namaDepan = getNamaDepan(namaTerbaru);
        let shift = rec.shiftTipe;
        let status = getStatusKehadiran(rec);

        if (status.includes("TK")) {
            if (!tkData[tglAngka]) tkData[tglAngka] = [];
            if (!tkData[tglAngka].some(item => item.nama === namaDepan)) {
                tkData[tglAngka].push({ nama: namaDepan, shift: shift });
            }
        } else if (status.includes("Lupa Absen")) {
            if (!rec.waktuMasuk && rec.waktuPulang) {
                if (!lupaPagi[tglAngka]) lupaPagi[tglAngka] = [];
                lupaPagi[tglAngka].push({ nama: namaDepan, shift: shift });
            } 
            else if (rec.waktuMasuk && !rec.waktuPulang) {
                if (!lupaPulang[tglAngka]) lupaPulang[tglAngka] = [];
                lupaPulang[tglAngka].push({ nama: namaDepan, shift: shift });
            } 
            else {
                if (!lupaPagi[tglAngka]) lupaPagi[tglAngka] = [];
                lupaPagi[tglAngka].push({ nama: namaDepan, shift: shift });
                if (!lupaPulang[tglAngka]) lupaPulang[tglAngka] = [];
                lupaPulang[tglAngka].push({ nama: namaDepan, shift: shift });
            }
        }
    });

    let semuaTglUnik = new Set([...Object.keys(tkData), ...Object.keys(lupaPagi), ...Object.keys(lupaPulang)]);
    let sortedTgl = Array.from(semuaTglUnik).map(Number).sort((a,b) => a - b);

    sortedTgl.forEach(tgl => {
        let countLupaTgl = (lupaPagi[tgl] ? lupaPagi[tgl].length : 0) + (lupaPulang[tgl] ? lupaPulang[tgl].length : 0);
        if (countLupaTgl > 2) {
            tanggalLupaLebihDari2[tgl] = countLupaTgl;
        }
    });

    let hasTk = Object.keys(tkData).length > 0;
    let hasLupaPagi = Object.keys(lupaPagi).length > 0;
    let hasLupaPulang = Object.keys(lupaPulang).length > 0;

    auditContainer.style.display = 'block';

    if (!hasTk && !hasLupaPagi && !hasLupaPulang) {
        auditBox.className = 'audit-box audit-clean';
        auditBox.innerHTML = 'Data sudah bersih, silahkan di cek secara manual untuk keterlambatan atau izin lainnya';
        machineAlertBox.style.display = 'none';
    } else {
        auditBox.className = 'audit-box audit-warning';
        let textResult = "Cek data presensi pegawai berikut:\n\n";

        if (hasTk) {
            textResult += "TK (Tanpa Keterangan):\n";
            let idx = 1;
            sortedTgl.forEach(tgl => {
                if (tkData[tgl] && tkData[tgl].length > 0) {
                    let listStr = tkData[tgl].map(item => `${item.nama} (${item.shift})`).join(', ');
                    textResult += `${idx}. Tgl ${tgl} - ${listStr}\n`;
                    idx++;
                }
            });
            textResult += "\n";
        }

        if (hasLupaPagi) {
            textResult += "Lupa Absen Pagi:\n";
            let idx = 1;
            sortedTgl.forEach(tgl => {
                if (lupaPagi[tgl] && lupaPagi[tgl].length > 0) {
                    let listStr = lupaPagi[tgl].map(item => `${item.nama} (${item.shift})`).join(', ');
                    textResult += `${idx}. Tgl ${tgl} (Absen Pagi): ${listStr}\n`;
                    idx++;
                }
            });
            textResult += "\n";
        }

        if (hasLupaPulang) {
            textResult += "Lupa Absen Pulang:\n";
            let idx = 1;
            sortedTgl.forEach(tgl => {
                if (lupaPulang[tgl] && lupaPulang[tgl].length > 0) {
                    let listStr = lupaPulang[tgl].map(item => `${item.nama} (${item.shift})`).join(', ');
                    textResult += `${idx}. Tgl ${tgl} (Absen Pulang): ${listStr}\n`;
                    idx++;
                }
            });
        }

        auditBox.innerText = textResult.trim();

        let alertTglKeys = Object.keys(tanggalLupaLebihDari2);
        if (alertTglKeys.length > 0) {
            machineAlertBox.style.display = 'block';
            let alertDetails = alertTglKeys.map(tgl => `Tanggal ${tgl} (${tanggalLupaLebihDari2[tgl]} orang)`).join(', ');
            machineAlertBox.innerHTML = `⚠️ PERINGATAN MESIN FINGERPRINT: Terdeteksi lebih dari 2 pegawai lupa absen pada ${alertDetails}. Kemungkinan besar mesin absen mengalami kendala/error pada tanggal tersebut. Silakan cek history mesin dan lakukan input manual pada aplikasi.`;
        } else {
            machineAlertBox.style.display = 'none';
        }
    }
}

function jalankanRecheck() {
    updateAuditBox();
    alert("Data berhasil di-update!");
}

function renderTabel() {
    recheckStatusFinalReport();

    const tabelBody = document.getElementById('tabelAbsen').getElementsByTagName('tbody')[0];
    tabelBody.innerHTML = ""; 

    if (Object.keys(dataPegawai).length === 0 || activeYear === null) return;

    let daysInMonth = new Date(activeYear, activeMonth + 1, 0).getDate();
    let counterRow = 1;
    let employeesIds = Object.keys(dataPegawai).sort((a,b) => dataPegawai[a].localeCompare(dataPegawai[b]));

    employeesIds.forEach(id => {
        let nama = dataPegawai[id];

        for (let d = 1; d <= daysInMonth; d++) {
            let dStr = String(d).padStart(2, '0');
            let mStr = String(activeMonth + 1).padStart(2, '0');
            let isoDate = `${activeYear}-${mStr}-${dStr}`;
            let key = id + "_" + isoDate;
            let dateObj = new Date(isoDate);

            let record = globalRekap[key];
            if (!record) continue;

            let masukStr = record.waktuMasuk;
            let pulangStr = record.waktuPulang;
            
            let statusKehadiran = getStatusKehadiran(record);
            let badgeClass = getStatusBadgeClass(statusKehadiran);

            let jMasuk = masukStr ? masukStr.substring(0, 5) : "--";
            let jPulang = pulangStr ? pulangStr.substring(0, 5) : "--";

            let totalText = "--";
            let totalColor = "";
            let kelebihanText = "--";
            let kelebihanColor = "";

            let trClass = "";
            if (statusKehadiran === "LJ" || record.shiftTipe === "OFF") {
                trClass = "baris-libur";
                kelebihanText = "<span class='teks-libur'>Libur</span>";
            } else if (statusKehadiran === "CS" || statusKehadiran === "Sakit") {
                trClass = "baris-sakit";
                totalText = "--"; totalColor = "cukup-jam"; kelebihanText = "Sakit"; kelebihanColor = "cukup-jam";
            } else if (statusKehadiran === "CT" || statusKehadiran === "Cuti") {
                trClass = "baris-cuti";
                totalText = "--"; totalColor = "cukup-jam"; kelebihanText = "Cuti"; kelebihanColor = "cukup-jam";
            } else if (statusKehadiran.includes("TK")) {
                trClass = "baris-tk";
            } else if (statusKehadiran.includes("TM") || statusKehadiran.includes("PC")) {
                trClass = "baris-telat-pc";
            }

            if (statusKehadiran.includes("TK")) {
                totalText = "--"; totalColor = "kurang-jam"; kelebihanText = "Tanpa Keterangan"; kelebihanColor = "kurang-jam";
            } else if (statusKehadiran.includes("Lupa Absen")) {
                totalText = "Lupa Absen"; totalColor = "lupa-absen"; kelebihanText = "--";
            } else if (statusKehadiran === "DL" || statusKehadiran === "Dinas Luar") {
                totalText = "--"; totalColor = "cukup-jam"; kelebihanText = "Dinas Luar"; kelebihanColor = "cukup-jam";
            } else if (statusKehadiran !== "LJ" && statusKehadiran !== "CS" && statusKehadiran !== "CT") {
                
                if (masukStr && pulangStr) {
                    let masukStrClean = masukStr.substring(0, 5) + ":00";
                    let pulangStrClean = pulangStr.substring(0, 5) + ":00";
                    
                    if (record.shiftTipe === "P") {
                        let defaultStart = (record.role === "MAGANG") ? new Date(`2000-01-01 08:00:00`) : new Date(`2000-01-01 07:00:00`);
                        let actualStart = new Date(`2000-01-01 ${masukStrClean}`);
                        let effectiveStart = (actualStart > defaultStart) ? actualStart : defaultStart;

                        let baselineTarget = (record.role === "SATPAM") ? new Date(`2000-01-01 19:00:00`) : new Date(`2000-01-01 16:30:00`);
                        let actualPulangTime = new Date(`2000-01-01 ${pulangStrClean}`);

                        let totalMenitAktual = (actualPulangTime - effectiveStart) / 60000 - 60;
                        if (totalMenitAktual > 0) {
                            let j = Math.floor(totalMenitAktual / 60);
                            let m = Math.floor(totalMenitAktual % 60);
                            totalText = `${j} Jam ${m} Mnt`;
                        } else {
                            totalText = `0 Jam 0 Mnt`;
                        }

                        let menitTelat = 0;
                        if (actualStart > defaultStart) {
                            menitTelat = (actualStart - defaultStart) / 60000;
                        }
                        
                        let adjustedTargetPulangTime = new Date(baselineTarget.getTime() + (menitTelat * 60000));

                        if (actualPulangTime < adjustedTargetPulangTime) {
                            let menitKurang = (adjustedTargetPulangTime - actualPulangTime) / 60000;
                            let j = Math.floor(menitKurang / 60);
                            let m = Math.floor(menitKurang % 60);
                            kelebihanText = `- ${j} J ${m} M`;
                            kelebihanColor = "kurang-jam";
                            totalColor = "kurang-jam";
                        } else {
                            let exc = (actualPulangTime - adjustedTargetPulangTime) / 60000;
                            if (exc > 0) {
                                kelebihanText = `+ ${Math.floor(exc/60)} J ${Math.floor(exc%60)} M`;
                                kelebihanColor = "cukup-jam";
                                totalColor = "cukup-jam";
                            } else {
                                kelebihanText = "0 J 0 M";
                                kelebihanColor = "cukup-jam";
                                totalColor = "cukup-jam";
                            }
                        }

                    } else if (record.shiftTipe === "M") {
                        let defaultStartMalam = new Date(`2000-01-01 19:00:00`);
                        let actualStartMalam = new Date(`2000-01-01 ${masukStrClean}`);
                        if (masukStrClean < "12:00:00") {
                            actualStartMalam = new Date(`2000-01-02 ${masukStrClean}`);
                        }
                        let effectiveStartMalam = (actualStartMalam > defaultStartMalam) ? actualStartMalam : defaultStartMalam;
                        
                        let targetPulangMalam = new Date(`2000-01-02 07:00:00`);
                        let actualPulangMalam = new Date(`2000-01-02 ${pulangStrClean}`);
                        if (pulangStrClean >= "12:00:00" && pulangStrClean >= "15:00:00") {
                            actualPulangMalam = new Date(`2000-01-01 ${pulangStrClean}`);
                        }

                        let totalMenitMalam = (actualPulangMalam - effectiveStartMalam) / 60000 - 60;
                        if (totalMenitMalam > 0) {
                            let j = Math.floor(totalMenitMalam / 60);
                            let m = Math.floor(totalMenitMalam % 60);
                            totalText = `${j} Jam ${m} Mnt`;
                        } else {
                            totalText = `0 Jam 0 Mnt`;
                        }

                        let menitTelatMalam = 0;
                        if (actualStartMalam > defaultStartMalam) {
                            menitTelatMalam = (actualStartMalam - defaultStartMalam) / 60000;
                        }

                        let adjustedTargetPulangMalam = new Date(targetPulangMalam.getTime() + (menitTelatMalam * 60000));

                        if (actualPulangMalam < adjustedTargetPulangMalam) {
                            let menitKurang = (adjustedTargetPulangMalam - actualPulangMalam) / 60000;
                            let j = Math.floor(menitKurang / 60);
                            let m = Math.floor(menitKurang % 60);
                            kelebihanText = `- ${j} J ${m} M`;
                            kelebihanColor = "kurang-jam";
                            totalColor = "kurang-jam";
                        } else {
                            let exc = (actualPulangMalam - adjustedTargetPulangMalam) / 60000;
                            if (exc > 0) {
                                kelebihanText = `+ ${Math.floor(exc/60)} J ${Math.floor(exc%60)} M`;
                                kelebihanColor = "cukup-jam";
                                totalColor = "cukup-jam";
                            } else {
                                kelebihanText = "0 J 0 M";
                                kelebihanColor = "cukup-jam";
                                totalColor = "cukup-jam";
                            }
                        }
                    }
                } else {
                    totalText = "Lupa Absen";
                    totalColor = "lupa-absen";
                }
            }

            let hariStr = HARI_INDO[dateObj.getDay()];
            let tanggalStr = `${dStr} ${BULAN_INDO[activeMonth]} ${activeYear}`;
            
            let bgShift = record.shiftTipe === "P" ? "#f1c40f" : (record.shiftTipe === "M" ? "#34495e" : "#bdc3c7");
            let colorShift = record.shiftTipe === "M" ? "white" : "black";

            const baris = tabelBody.insertRow();
            if(trClass) baris.className = trClass;
            
            baris.innerHTML = `
                <td class="nomor-urut">${counterRow++}</td>
                <td>${id}</td>
                <td>${nama}</td>
                <td><span class="shift-badge" style="background:${bgShift}; color:${colorShift};">${record.shiftTipe || "-"}</span></td>
                <td>${hariStr}</td>
                <td>${tanggalStr}</td>
                <td><span class="status-badge ${badgeClass}">${statusKehadiran}</span></td>
                <td>${jMasuk}</td>
                <td>${jPulang}</td>
                <td class="${totalColor}">${totalText}</td>
                <td class="${kelebihanColor}">${kelebihanText}</td>
                <td>
                    <button class="btn-edit" onclick="editBaris(this, '${key}')">Edit</button>
                    <button class="btn-hapus" onclick="hapusBaris('${key}')">Reset</button>
                </td>
            `;
        }
    });
    filterTabel();
    updateAuditBox(); 
    updateFilterKehadiranDropdown();
    cekTombolSimpanSemua();

    // Panggil pengecekan status tombol Save Report Final setiap kali tabel di-render
    if (typeof recheckStatusFinalReport === "function") {
    recheckStatusFinalReport();
}
}

function filterTabel() {
    const filterRole = document.getElementById('filterRole').value;
    const filterNama = document.getElementById('filterNama').value;
    const filterTanggal = document.getElementById('filterTanggal').value.toLowerCase();
    const filterKehadiran = document.getElementById('filterKehadiran').value;
    const rows = document.querySelectorAll('#tabelAbsen tbody tr');
    
    let visibleIndex = 1;
    rows.forEach(row => {
        const idCell = row.cells[1].innerText;
        const namaCell = row.cells[2].innerText.toLowerCase();
        const tanggalCell = row.cells[5].innerText.toLowerCase();
        const kehadiranCell = row.cells[6].innerText.trim();
        
        let role = "STAFF";
        let firstKey = Object.keys(globalRekap).find(k => k.startsWith(idCell + "_"));
        if (firstKey) role = globalRekap[firstKey].role || "STAFF";

        let matchRole = (filterRole === "" || role === filterRole);
        let matchNama = (filterNama === "" || namaCell === filterNama.toLowerCase());
        let matchTanggal = tanggalCell.includes(filterTanggal);
        let matchKehadiran = (filterKehadiran === "" || kehadiranCell === filterKehadiran);
        
        if (matchRole && matchNama && matchTanggal && matchKehadiran) {
            row.style.display = '';
            row.cells[0].innerText = visibleIndex++;
        } else {
            row.style.display = 'none';
        }
    });
}

function resetFilter() {
    document.getElementById('filterRole').value = '';
    document.getElementById('filterNama').value = '';
    document.getElementById('filterTanggal').value = '';
    document.getElementById('filterKehadiran').value = '';
    updateFilterNamaDropdown();
    filterTabel();
}

function prosesExcelJadwal() {
    const fileInput = document.getElementById('uploadJadwal');
    const file = fileInput.files[0];
    if (!file) { alert("Pilih file Excel Jadwal Shift terlebih dahulu!"); return; }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const rawAoA = XLSX.utils.sheet_to_json(worksheet, {header: 1, defval: ""});

            globalRekap = {}; dataPegawai = {}; isFingerprintUploaded = false; lastRekapState = null;
            document.getElementById('btnUndoMassal').disabled = true;
            document.getElementById('sectionManualWrapper').style.display = 'none'; 
            let tahun = new Date().getFullYear();
            let bulan = new Date().getMonth();
            let foundMonth = false;

            const bulanMap = { 'JANUARY': 0, 'JANUARI': 0, 'FEBRUARY': 1, 'FEBRUARI': 1, 'MARCH': 2, 'MARET': 2, 'APRIL': 3, 'MAY': 4, 'MEI': 4, 'JUNE': 5, 'JUNI': 5, 'JULY': 6, 'JULI': 6, 'AUGUST': 7, 'AGUSTUS': 7, 'SEPTEMBER': 8, 'OCTOBER': 9, 'OKTOBER': 9, 'NOVEMBER': 10, 'DECEMBER': 11, 'DESEMBER': 11 };

            for (let i = 0; i < rawAoA.length; i++) {
                let row = rawAoA[i];
                
                if (!foundMonth) {
                    for(let c = 0; c < 5; c++) {
                        if (row[c] && row[c].toString().toUpperCase().includes("PERIODE:")) {
                            let textPeriode = row[c].toString().toUpperCase();
                            let parts = textPeriode.replace("PERIODE:", "").trim().split(" ");
                            if (parts.length >= 2) {
                                if (bulanMap[parts[0]] !== undefined) {
                                    bulan = bulanMap[parts[0]];
                                    tahun = parseInt(parts[1]);
                                    setBulanAktif(new Date(tahun, bulan, 1));
                                    foundMonth = true;
                                }
                            }
                            break;
                        }
                    }
                }

                let rawRole = row[0] ? row[0].toString().toUpperCase().trim() : "";
                let isNewFormat = (rawRole === "SATPAM" || rawRole === "STAFF" || rawRole === "MAGANG");
                let offset = isNewFormat ? 1 : 0; 

                let noUrut = parseInt(row[0 + offset]);
                let idPegawai = row[1 + offset] ? row[1 + offset].toString().trim() : "";
                let namaPegawai = row[2 + offset] ? row[2 + offset].toString().trim() : "";

                if (!isNaN(noUrut) && idPegawai.length >= 4 && namaPegawai !== "" && namaPegawai !== "Hari" && namaPegawai !== "Tanggal") {
                    dataPegawai[idPegawai] = namaPegawai; 
                    let actualRole = isNewFormat ? rawRole : "STAFF"; 
                    
                    let daysInMonth = new Date(tahun, bulan + 1, 0).getDate();
                    
                    for (let d = 1; d <= daysInMonth; d++) {
                        let shiftCode = row[2 + offset + d] ? row[2 + offset + d].toString().trim().toUpperCase() : "";
                        let isoDate = `${tahun}-${String(bulan+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                        let key = idPegawai + "_" + isoDate;
                        
                        let sTipe = "OFF";
                        let mStat = null;

                        if (shiftCode === "P" || shiftCode === "1") sTipe = "P";
                        else if (shiftCode === "M" || shiftCode === "MLM") sTipe = "M";
                        else if (shiftCode === "CT") { sTipe = "CT"; mStat = "CT"; }
                        else if (shiftCode === "S") { sTipe = "CS"; mStat = "CS"; }
                        else if (shiftCode === "OFF") sTipe = "OFF";

                        globalRekap[key] = {
                            id: idPegawai, nama: namaPegawai, tanggal: isoDate,
                            shiftTipe: sTipe, waktuMasuk: null, waktuPulang: null, manualStatus: mStat,
                            role: actualRole
                        };
                    }
                }
            }

            if (!foundMonth) setBulanAktif(new Date());

            fileInput.value = ""; 
            updateCheckboxPegawaiManual();
            updateFilterNamaDropdown();
            document.getElementById('sectionPresensi').style.display = 'block';
            renderTabel();
            alert("✅ Jadwal Shift berhasil dibuat! Silakan upload file data Fingerprint untuk mengisi jam kehadiran.");

        } catch (error) { alert("❌ Gagal membaca Jadwal: " + error.message); }
    };
    reader.readAsArrayBuffer(file);
}

function prosesExcel() {
    const fileInput = document.getElementById('uploadExcel');
    const file = fileInput.files[0];
    if (!file) { alert("Pilih file Excel Fingerprint terlebih dahulu!"); return; }

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {raw: false});
        
        Object.keys(globalRekap).forEach(key => {
            globalRekap[key].waktuMasuk = null;
            globalRekap[key].waktuPulang = null;
        });

        jsonData.forEach(row => {
            let id = row["No.ID"] ? row["No.ID"].toString().trim() : "";
            let rawTglWaktu = row["Tgl/Waktu"];

            if (!id || !rawTglWaktu || !dataPegawai[id]) return; 

            let parts = rawTglWaktu.toString().trim().split(" ");
            if (parts.length < 2) return;
            
            let tglSplit = parts[0].split("/");
            let isoDate = parts[0];
            if (tglSplit.length === 3) isoDate = `${tglSplit[2]}-${tglSplit[1].padStart(2,'0')}-${tglSplit[0].padStart(2,'0')}`;
            else if (parts[0].includes("-")) {
                let ds = parts[0].split("-");
                if(ds[0].length === 2) isoDate = `${ds[2]}-${ds[1].padStart(2,'0')}-${ds[0].padStart(2,'0')}`; 
            }
            
            let timeVal = parts[1];
            if (timeVal.length === 5) timeVal += ":00";
            
            let keyToday = id + "_" + isoDate;
            let keyYest = id + "_" + getYesterdayIso(isoDate);

            if (globalRekap[keyToday] && globalRekap[keyToday].shiftTipe === "P") {
                if (timeVal >= "00:30:00" && timeVal <= "05:30:00") {
                    timeVal = "05:30:00";
                }
            }

            if (timeVal < "12:00:00") { 
                if (globalRekap[keyToday] && globalRekap[keyToday].shiftTipe === "P") {
                    let r = globalRekap[keyToday];
                    if (!r.waktuMasuk || timeVal < r.waktuMasuk) r.waktuMasuk = timeVal;
                }
                if (globalRekap[keyYest] && globalRekap[keyYest].shiftTipe === "M") {
                    let r = globalRekap[keyYest];
                    if (!r.waktuPulang || timeVal > r.waktuPulang) r.waktuPulang = timeVal;
                }
            } else { 
                if (globalRekap[keyToday] && globalRekap[keyToday].shiftTipe === "P") {
                    let r = globalRekap[keyToday];
                    if (!r.waktuPulang || timeVal > r.waktuPulang) r.waktuPulang = timeVal;
                }
                if (globalRekap[keyToday] && globalRekap[keyToday].shiftTipe === "M") {
                    let r = globalRekap[keyToday];
                    if (!r.waktuMasuk || timeVal < r.waktuMasuk) r.waktuMasuk = timeVal;
                }
            }
        });
        
        fileInput.value = ""; 
        isFingerprintUploaded = true; 
        document.getElementById('sectionManualWrapper').style.display = 'block'; 
        renderTabel();
        alert("✅ Data Mesin Absen berhasil di-Integrasikan (dan me-replace data absen mesin sebelumnya)!");
    };
    reader.readAsArrayBuffer(file);
}

function tambahDataManual() {
    const checkedCheckboxes = document.querySelectorAll('.manual-pegawai-checkbox:checked');
    const tanggal = document.getElementById('tanggalManual').value;
    const jam = document.getElementById('jamManual').value;
    const ket = document.getElementById('ketManual').value;

    if (checkedCheckboxes.length === 0 || !tanggal || !jam) { 
        alert("Pilih minimal 1 pegawai menggunakan centang checkbox, lengkapi Tanggal, dan Jam!"); 
        return; 
    }

    lastRekapState = JSON.parse(JSON.stringify(globalRekap));

    let successCount = 0;
    checkedCheckboxes.forEach(cb => {
        let id = cb.value;
        let key = id + "_" + tanggal;

        if (globalRekap[key]) {
            if (ket === "masuk") globalRekap[key].waktuMasuk = jam + ":00";
            else if (ket === "pulang") globalRekap[key].waktuPulang = jam + ":00";
            globalRekap[key].manualStatus = null; 
            successCount++;
        }
    });
    
    document.getElementById('jamManual').value = ""; 
    document.getElementById('btnUndoMassal').disabled = false; 
    renderTabel();
    alert(`✅ Berhasil mengupdate data presensi untuk ${successCount} pegawai terpilih!\n\n(Catatan: Jika salah isi, Anda bisa mengklik tombol '↩ Undo 1 Langkah' untuk membatalkan)`);
}

function undoUpdateMassal() {
    if (!lastRekapState) {
        alert("Tidak ada riwayat perubahan massal sebelumnya yang dapat di-undo.");
        return;
    }

    if (confirm("Apakah Anda yakin ingin MENGEMBALIKAN data presensi ke posisi sebelum update massal terakhir dilakukan?")) {
        globalRekap = JSON.parse(JSON.stringify(lastRekapState));
        lastRekapState = null; 
        document.getElementById('btnUndoMassal').disabled = true; 
        renderTabel();
        alert("↩ Berhasil mengembalikan (undo) data presensi ke posisi semula!");
    }
}

function hitungRekapitulasiData(dataList) {
    let rekap = { HariKerja:0, HN:0, TK:0, TM1:0, TM2:0, TM3:0, PC1:0, PC2:0, PC3:0, LJ:0, CS:0, CT:0, DL:0 };
    dataList.forEach(item => {
        let st = item["Kehadiran"];
        let shift = item["Shift"];
        
        if (shift === "P" || shift === "M" || (st !== "LJ" && st !== "Libur")) {
            rekap.HariKerja++;
        }

        if (st === "HN") rekap.HN++;
        if (st.includes("TK")) rekap.TK++;
        if (st.includes("TM1")) rekap.TM1++;
        if (st.includes("TM2")) rekap.TM2++;
        if (st.includes("TM3")) rekap.TM3++;
        if (st.includes("PC1")) rekap.PC1++;
        if (st.includes("PC2")) rekap.PC2++;
        if (st.includes("PC3")) rekap.PC3++;
        if (st === "LJ") rekap.LJ++;
        if (st === "CS" || st === "Sakit") rekap.CS++;
        if (st === "CT" || st === "Cuti") rekap.CT++;
        if (st === "DL" || st === "Dinas Luar") rekap.DL++;
    });
    return rekap;
}

function parseTimeTextToMinutes(text) {
    if (!text || text === "--" || text.includes("Lupa Absen")) return 0;
    let jMatch = text.match(/(\d+)\s*Jam/i) || text.match(/(\d+)\s*J/i);
    let mMatch = text.match(/(\d+)\s*Mnt/i) || text.match(/(\d+)\s*M/i);
    let j = jMatch ? parseInt(jMatch[1]) : 0;
    let m = mMatch ? parseInt(mMatch[1]) : 0;
    return (j * 60) + m;
}

function parseKelebihanTextToMinutes(text) {
    if (!text || text === "--" || text.includes("Libur") || text.includes("Sakit") || text.includes("Cuti") || text.includes("Dinas") || text.includes("Tanpa")) return 0;
    let isNegative = text.trim().startsWith("-");
    let jMatch = text.match(/(\d+)\s*J/i);
    let mMatch = text.match(/(\d+)\s*M/i);
    let j = jMatch ? parseInt(jMatch[1]) : 0;
    let m = mMatch ? parseInt(mMatch[1]) : 0;
    let totalM = (j * 60) + m;
    return isNegative ? -totalM : totalM;
}

function cleanStatusForExport(statusStr) {
    if (!statusStr) return "";
    return statusStr.replace("Lupa Absen + ", "").replace("Lupa Absen", "").trim();
}

function getVisibleData() {
    const rows = document.querySelectorAll('#tabelAbsen tbody tr');
    let data = [];
    rows.forEach(row => {
        if (row.style.display !== 'none') {
            data.push({
                "No": row.cells[0].innerText,
                "ID Pegawai": row.cells[1].innerText,
                "Nama Pegawai": row.cells[2].innerText,
                "Shift": row.cells[3].innerText,
                "Hari": row.cells[4].innerText,
                "Tanggal": row.cells[5].innerText,
                "Kehadiran": row.cells[6].innerText,
                "Jam Masuk": row.cells[7].innerText,
                "Jam Pulang": row.cells[8].innerText,
                "Total Waktu": row.cells[9].innerText,
                "Ket/Kelebihan": row.cells[10].innerText
            });
        }
    });
    return data;
}

function getAllData() {
    const rows = document.querySelectorAll('#tabelAbsen tbody tr');
    let data = [];
    rows.forEach(row => {
        data.push({
            "No": row.cells[0].innerText,
            "ID Pegawai": row.cells[1].innerText,
            "Nama Pegawai": row.cells[2].innerText,
            "Shift": row.cells[3].innerText,
            "Hari": row.cells[4].innerText,
            "Tanggal": row.cells[5].innerText,
            "Kehadiran": row.cells[6].innerText,
            "Jam Masuk": row.cells[7].innerText,
            "Jam Pulang": row.cells[8].innerText,
            "Total Waktu": row.cells[9].innerText,
            "Ket/Kelebihan": row.cells[10].innerText
        });
    });
    return data;
}

function exportSemuaExcel() {
    if (!confirm("Apakah Anda yakin ingin mengeksport SEMUA data presensi yang tertampil ke file Excel?")) return;
    const data = getVisibleData();
    if(data.length === 0) return alert("Tidak ada data untuk diexport!");
    generateExcel(data, `Rekap_Kehadiran_Semua_${namaBulanTahun.replace(" ", "_")}`);
}

function previewSemuaPDF() {
    if (!confirm("Apakah Anda yakin ingin melihat PREVIEW PDF untuk SEMUA data presensi yang tertampil?")) return;
    const data = getVisibleData();
    if(data.length === 0) return alert("Tidak ada data untuk dipreview!");
    
    const namaUnik = [...new Set(data.map(item => item["Nama Pegawai"]))];
    let listGroupedData = [];
    namaUnik.forEach(nama => {
        let items = data.filter(i => i["Nama Pegawai"] === nama);
        items.forEach((item, idx) => item["No"] = idx + 1);
        listGroupedData.push({ nama: nama, data: items });
    });

    generatePDFMultiPagePreview(listGroupedData);
}

function prosesBatchExport(tipe) {
    const checkboxes = document.querySelectorAll('.manual-pegawai-checkbox:checked');
    if(checkboxes.length === 0) return alert("Pilih minimal 1 pegawai di area Update/Download Manual ini!");
    
    let pesanAksi = (tipe === 'excel') ? "Export Excel Terpilih" : "Export PDF Terpilih";
    if (!confirm(`Apakah Anda yakin ingin melakukan [${pesanAksi}] untuk ${checkboxes.length} pegawai yang dicentang?`)) return;

    const semuaData = getAllData();

    if (tipe === 'excel') {
        checkboxes.forEach(cb => {
            const id = cb.value;
            const nama = dataPegawai[id];
            const dataFil = semuaData.filter(i => i["Nama Pegawai"] === nama);
            if(dataFil.length > 0) {
                dataFil.forEach((i, idx) => { i["No"] = idx + 1; });
                generateExcel(dataFil, `Rekap_Kehadiran_${nama.replace(/ /g, "_")}_${namaBulanTahun.replace(" ", "_")}`);
            }
        });
    } else if (tipe === 'pdf_download') {
        checkboxes.forEach(cb => {
            const id = cb.value;
            const nama = dataPegawai[id];
            const items = semuaData.filter(i => i["Nama Pegawai"] === nama);
            if(items.length > 0) {
                items.forEach((item, idx) => item["No"] = idx + 1);
                downloadPDFSingleEmployee(nama, items);
            }
        });
    }
}

function generateExcel(data, namaFileBase) {
    const wsData = [
        ["Kantor Regional XIV BKN Manokwari"],
        [`Laporan Kehadiran Pegawai - Periode ${namaBulanTahun}`], [],
        ["No", "ID Pegawai", "Nama Pegawai", "Shift", "Hari", "Tanggal", "Kehadiran", "Jam Masuk", "Jam Pulang", "Total Waktu", "Ket/Kelebihan"]
    ];
    
    let r = hitungRekapitulasiData(data);
    let nonLjCount = 0;
    let totalWaktuMnt = 0;
    let totalKelebihanMnt = 0;

    data.forEach(item => {
        let statusClean = cleanStatusForExport(item["Kehadiran"]);
        if (statusClean !== "LJ" && statusClean !== "Libur") {
            nonLjCount++;
        }
        totalWaktuMnt += parseTimeTextToMinutes(item["Total Waktu"]);
        totalKelebihanMnt += parseKelebihanTextToMinutes(item["Ket/Kelebihan"]);

        wsData.push([ item["No"], item["ID Pegawai"], item["Nama Pegawai"], item["Shift"], item["Hari"], item["Tanggal"], statusClean, item["Jam Masuk"], item["Jam Pulang"], item["Total Waktu"], item["Ket/Kelebihan"] ]);
    });

    let twJ = Math.floor(totalWaktuMnt / 60);
    let twM = Math.floor(totalWaktuMnt % 60);
    let strTotalWaktuSum = `${twJ} J ${twM} M`;

    let absKel = Math.abs(totalKelebihanMnt);
    let tkJ = Math.floor(absKel / 60);
    let tkM = Math.floor(absKel % 60);
    let strTotalKelebihanSum = totalKelebihanMnt > 0 ? `+ ${tkJ} J ${tkM} M` : (totalKelebihanMnt < 0 ? `- ${tkJ} J ${tkM} M` : `0 J 0 M`);

    wsData.push(["", "", "Rekapitulasi Keseluruhan", "", "", "", `${nonLjCount} Hari`, "", "", strTotalWaktuSum, strTotalKelebihanSum]);

    wsData.push([]);
    wsData.push(["--- TABEL REKAPITULASI KEHADIRAN ---"]);
    wsData.push(["HN", "TK", "TM1", "TM2", "TM3", "PC1", "PC2", "PC3"]);
    wsData.push([r.HN, r.TK, r.TM1, r.TM2, r.TM3, r.PC1, r.PC2, r.PC3]);
    
    wsData.push([]);
    wsData.push(["--- JUMLAH ---", "", "--- TABEL KETERANGAN (IZIN/LIBUR) ---"]);
    wsData.push(["Hari Kerja", "", "LJ (Libur)", "CS (Sakit)", "CT (Cuti)", "DL (Dinas Luar)"]);
    wsData.push([r.HariKerja, "", r.LJ, r.CS, r.CT, r.DL]);

    const worksheet = XLSX.utils.aoa_to_sheet(wsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan_Absen");
    XLSX.writeFile(workbook, `${namaFileBase}.xlsx`);
}

function renderSingleEmployeePortraitPDF(doc, namaPegawai, data) {
    let startTextX = 14;
    if (bknLogoBase64) {
        doc.addImage(bknLogoBase64, 'PNG', 14, 6, 11, 11);
        startTextX = 28; 
    }

    doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text(`Laporan Kehadiran - ${namaPegawai}`, startTextX, 10);
    doc.setFontSize(8.5); doc.setFont("helvetica", "normal");
    doc.text(`Kantor Regional XIV BKN Manokwari | Periode: ${namaBulanTahun}`, startTextX, 14);

    let nonLjCount = 0;
    let totalWaktuMnt = 0;
    let totalKelebihanMnt = 0;

    let dataPDF = data.map(item => {
        let statusClean = cleanStatusForExport(item["Kehadiran"]);
        if (statusClean !== "LJ" && statusClean !== "Libur") {
            nonLjCount++;
        }
        totalWaktuMnt += parseTimeTextToMinutes(item["Total Waktu"]);
        totalKelebihanMnt += parseKelebihanTextToMinutes(item["Ket/Kelebihan"]);

        return { ...item, "Kehadiran": statusClean };
    });

    let twJ = Math.floor(totalWaktuMnt / 60);
    let twM = Math.floor(totalWaktuMnt % 60);
    let strTotalWaktuSum = `${twJ} J ${twM} M`;

    let absKel = Math.abs(totalKelebihanMnt);
    let tkJ = Math.floor(absKel / 60);
    let tkM = Math.floor(absKel % 60);
    let strTotalKelebihanSum = totalKelebihanMnt > 0 ? `+ ${tkJ} J ${tkM} M` : (totalKelebihanMnt < 0 ? `- ${tkJ} J ${tkM} M` : `0 J 0 M`);

    dataPDF.push({
        "No": "",
        "ID Pegawai": "",
        "Nama Pegawai": "Rekapitulasi Keseluruhan",
        "Shift": "",
        "Hari": "",
        "Tanggal": "",
        "Kehadiran": `${nonLjCount} Hari`,
        "Jam Masuk": "",
        "Jam Pulang": "",
        "Total Waktu": strTotalWaktuSum,
        "Ket/Kelebihan": strTotalKelebihanSum
    });

    doc.autoTable({
        startY: 23, 
        columns: [
            { header: 'No', dataKey: 'No' }, 
            { header: 'ID', dataKey: 'ID Pegawai' },
            { header: 'Nama', dataKey: 'Nama Pegawai' }, 
            { header: 'Shift', dataKey: 'Shift' },
            { header: 'Hari', dataKey: 'Hari' }, 
            { header: 'Tanggal', dataKey: 'Tanggal' },
            { header: 'Status', dataKey: 'Kehadiran' }, 
            { header: 'Masuk', dataKey: 'Jam Masuk' },
            { header: 'Pulang', dataKey: 'Jam Pulang' }, 
            { header: 'Total', dataKey: 'Total Waktu' },
            { header: 'Kelebihan', dataKey: 'Ket/Kelebihan' }
        ],
        body: dataPDF,
        headStyles: { fillColor: [44, 62, 80], fontSize: 6.5, cellPadding: 1 }, 
        styles: { fontSize: 6, cellPadding: 0.9 },
        columnStyles: { 
            0: { cellWidth: 7 },
            1: { cellWidth: 11 },
            2: { cellWidth: 33 },
            3: { cellWidth: 9, halign: 'center' },
            4: { cellWidth: 12 },
            5: { cellWidth: 22 },
            6: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
            7: { cellWidth: 13, halign: 'center' },
            8: { cellWidth: 13, halign: 'center' },
            9: { cellWidth: 18, halign: 'center' },
            10: { cellWidth: 22, halign: 'center' }
        },
        didParseCell: function(dataCell) {
            if (dataCell.row.index === dataPDF.length - 1) {
                dataCell.cell.styles.fontStyle = 'bold';
                dataCell.cell.styles.fillColor = [234, 237, 237];
                if (dataCell.column.index === 2) {
                    dataCell.cell.styles.halign = 'left';
                }
            }
        }
    });

    let finalY = doc.lastAutoTable.finalY + 5;
    let r = hitungRekapitulasiData(data);

    doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
    doc.text("Rekapitulasi Kehadiran:", 14, finalY);

    doc.autoTable({
        startY: finalY + 2,
        margin: { left: 14, right: 80 },
        head: [['HN', 'TK', 'TM1', 'TM2', 'TM3', 'PC1', 'PC2', 'PC3']],
        body: [[r.HN, r.TK, r.TM1, r.TM2, r.TM3, r.PC1, r.PC2, r.PC3]],
        headStyles: { fillColor: [41, 128, 185], halign: 'center', fontSize: 6.5, cellPadding: 0.9 },
        bodyStyles: { halign: 'center', fontStyle: 'bold', fontSize: 6.5, cellPadding: 0.9 },
        styles: { fontSize: 6.5 }
    });

    let nextY = doc.lastAutoTable.finalY + 4;
    
    doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
    doc.text("Jumlah:", 14, nextY);
    doc.text("Keterangan Izin / Libur:", 38, nextY);

    doc.autoTable({
        startY: nextY + 2,
        margin: { left: 14, right: 175 }, 
        head: [['Hari Kerja']],
        body: [[r.HariKerja]],
        headStyles: { fillColor: [22, 160, 133], halign: 'center', fontSize: 6.5, cellPadding: 0.9 },
        bodyStyles: { halign: 'center', fontStyle: 'bold', fontSize: 6.5, cellPadding: 0.9, fillColor: [230, 247, 244], textColor: [17, 122, 101] },
        styles: { fontSize: 6.5 }
    });

    doc.autoTable({
        startY: nextY + 2,
        margin: { left: 38, right: 80 }, 
        head: [['LJ (Libur)', 'CS (Sakit)', 'CT (Cuti)', 'DL (Dinas Luar)']],
        body: [[r.LJ, r.CS, r.CT, r.DL]],
        headStyles: { fillColor: [142, 68, 173], halign: 'center', fontSize: 6.5, cellPadding: 0.9 },
        bodyStyles: { halign: 'center', fontStyle: 'bold', fontSize: 6.5, cellPadding: 0.9 },
        styles: { fontSize: 6.5 }
    });

    let ttdY = doc.lastAutoTable.finalY + 7;
    
    doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
    doc.text("Mengetahui,", 14, ttdY);
    doc.text("Kepala Bagian Tata Usaha", 14, ttdY + 3.5);
    
    doc.setFont("helvetica", "bold");
    doc.text("$", 14, ttdY + 20);
}

function downloadPDFSingleEmployee(namaPegawai, data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait" });

    renderSingleEmployeePortraitPDF(doc, namaPegawai, data);

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(127, 140, 141); 
        doc.text("Laporan Presensi Pegawai v.15", 14, doc.internal.pageSize.getHeight() - 5);
        doc.text(`Halaman ${i} dari ${pageCount}`, doc.internal.pageSize.getWidth() - 35, doc.internal.pageSize.getHeight() - 5);
    }

    doc.save(`Rekap_Kehadiran_${namaPegawai.replace(/ /g, "_")}_${namaBulanTahun.replace(" ", "_")}.pdf`);
}

function generatePDFMultiPagePreview(listGroupedData) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait" });

    listGroupedData.forEach((group, index) => {
        if (index > 0) {
            doc.addPage();
        }
        renderSingleEmployeePortraitPDF(doc, group.nama, group.data);
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(127, 140, 141); 
        doc.text("Laporan Presensi Pegawai v.15", 14, doc.internal.pageSize.getHeight() - 5);
        doc.text(`Halaman ${i} dari ${pageCount}`, doc.internal.pageSize.getWidth() - 35, doc.internal.pageSize.getHeight() - 5);
    }

    const blobPDF = doc.output('bloburl');
    window.open(blobPDF, '_blank');
}
//^ FIXED. EDIT FINAL.


// ==========================================
// EXPORT PREVIEW PDF LANDSCAPE (3 BARIS PER PEGAWAI & CHUNKING TANGGAL), LAPORAN AKHIR
// ==========================================

function exportPreviewPDFLandscape() {
    if (typeof globalRekap === "undefined" || Object.keys(globalRekap).length === 0) {
        alert("⚠️ Tidak ada data presensi yang dapat diexport!");
        return;
    }

    const yakin = confirm("Apakah Anda yakin ingin membuka Preview PDF Rekap Kehadiran Pegawai (Landscape)?");
    if (!yakin) return;

    // Persiapkan Data Pegawai & Jumlah Hari dalam Bulan (misal 31 hari untuk Juli 2026)
    const totalHari = 31; // Bisa dibuat dinamis sesuai bulan berjalan
    const listNamaPegawai = Object.keys(globalRekap);

    generatePDFLandscapeChunked(listNamaPegawai, globalRekap, totalHari);
}

function generatePDFLandscapeChunked(groupedByRole, sortedRoleKeys, totalHari, tipeSpesimen = "manual") {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("❌ Library jsPDF / AutoTable belum dimuat!");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const namaHariList = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

    // =========================================================================
    // 1. RENDER HALAMAN 1 (REKAPITULASI TOTAL KEHADIRAN PEGAWAI)
    // =========================================================================
    renderTabelRekapitulasiHalamanUtama(doc, groupedByRole, sortedRoleKeys, totalHari, tipeSpesimen);

    // =========================================================================
    // 2. RENDER HALAMAN 2 & 3 (DETAIL PRESENSI HARIAN CHUNKED 1-16 & 17-31)
    // =========================================================================
    const chunkRanges = [
        { start: 1, end: 16 },        // Halaman 2: Tanggal 1 s.d. 16
        { start: 17, end: totalHari }  // Halaman 3: Tanggal 17 s.d. 31
    ];

    chunkRanges.forEach((chunk) => {
        // SELALU TAMBAH HALAMAN BARU KARENA HALAMAN 1 SUDAH TERISI REKAPITULASI
        doc.addPage();

        let startY = 8;
        const pageWidth = doc.internal.pageSize.getWidth();

        // HEADER LAPORAN HARIAN
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(44, 62, 80);
        doc.text("KANTOR REGIONAL XIV BKN MANOKWARI", pageWidth / 2, startY, { align: "center" });
        startY += 4;
        doc.text("REKAP KEHADIRAN PEGAWAI", pageWidth / 2, startY, { align: "center" });
        startY += 4;
        doc.setFontSize(8.5);
        
        const teksPeriodeAktif = (typeof namaBulanTahun !== "undefined" && namaBulanTahun) ? namaBulanTahun.toUpperCase() : "JULI 2026";
        doc.text(`PERIODE: ${teksPeriodeAktif}`, pageWidth / 2, startY, { align: "center" });
        startY += 5;

        // HEADER TABEL HARIAN
        const headRow1 = [
            { content: "No", rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: "ID PPNPN", rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: "Nama Lengkap", rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
        ];
        const headRow2 = [];

        for (let tgl = chunk.start; tgl <= chunk.end; tgl++) {
            headRow1.push({ content: `${tgl} JULI`, colSpan: 2, styles: { halign: 'center', valign: 'middle' } });
            let dt = new Date(2026, 6, tgl);
            headRow2.push({ content: namaHariList[dt.getDay()], colSpan: 2, styles: { halign: 'center' } });
        }

        const bodyRows = [];
        let globalNo = 1;

        sortedRoleKeys.forEach(roleName => {
            const listPegawaiRole = groupedByRole[roleName];
            if (!listPegawaiRole || listPegawaiRole.length === 0) return;

            // Baris Header Kategori Role
            const totalCols = 3 + ((chunk.end - chunk.start + 1) * 2);
            bodyRows.push([{
                content: `KATEGORI: ${roleName}`,
                colSpan: totalCols,
                styles: { fillColor: [52, 73, 94], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6.5, halign: 'left', cellPadding: 1 }
            }]);

            listPegawaiRole.forEach(pegawai => {
                const noStr = String(globalNo++);
                const idStr = String(pegawai.idPpnPN);
                const namaStr = pegawai.namaLengkap;

                const row1 = [
                    { content: noStr, rowSpan: 3, styles: { halign: 'center', valign: 'middle' } },
                    { content: idStr, rowSpan: 3, styles: { halign: 'center', valign: 'middle' } },
                    { content: namaStr, rowSpan: 3, styles: { halign: 'left', valign: 'middle' } }
                ];

                const row2 = [];
                const row3 = [];

                for (let tgl = chunk.start; tgl <= chunk.end; tgl++) {
                    let itemHari = pegawai.presensiHarian[tgl];
                    let shift = "P", masuk = "--", pulang = "--", statusText = "TK";
                    let bgStatus = [255, 235, 238];

                    if (itemHari) {
                        shift = itemHari.shift || itemHari.keteranganShift || itemHari.shiftTipe || itemHari.tipeShift || "P";
                        let rawMasuk = itemHari.jamMasuk || itemHari.waktuMasuk || itemHari.masuk || itemHari.jam_masuk;
                        masuk = (rawMasuk && rawMasuk !== "-" && rawMasuk !== "--") ? String(rawMasuk).substring(0, 5) : "--";
                        let rawPulang = itemHari.jamPulang || itemHari.waktuPulang || itemHari.pulang || itemHari.jam_pulang;
                        pulang = (rawPulang && rawPulang !== "-" && rawPulang !== "--") ? String(rawPulang).substring(0, 5) : "--";

                        let recordForStatus = {
                            waktuMasuk: masuk !== "--" ? masuk : null,
                            waktuPulang: pulang !== "--" ? pulang : null,
                            shiftTipe: shift,
                            role: pegawai.role,
                            manualStatus: ["Cuti", "Sakit", "Dinas Luar", "Libur", "Off", "LJ", "CS", "CT", "DL"].includes(itemHari.keterangan || itemHari.status) ? (itemHari.keterangan || itemHari.status) : null
                        };

                        if (typeof getStatusKehadiran === "function") {
                            statusText = getStatusKehadiran(recordForStatus);
                        } else {
                            statusText = (masuk !== "--" || pulang !== "--") ? "HN" : "TK";
                        }
                    }

                    if (["LJ", "Libur", "Off", "OFF"].includes(statusText) || shift === "OFF" || shift === "Off") {
                        bgStatus = [191, 191, 191];
                        if (statusText === "TK") statusText = "LJ";
                    } else if (statusText === "HN") {
                        bgStatus = [255, 255, 255];
                    } else if (statusText === "TK") {
                        bgStatus = [255, 235, 238];
                    } else {
                        bgStatus = [254, 249, 231];
                    }

                    let bgCellShift = bgStatus;

                    row1.push({ content: statusText, colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fillColor: bgStatus } });
                    row2.push({ content: shift, styles: { halign: 'center', fillColor: bgCellShift } });
                    row2.push({ content: masuk, styles: { halign: 'center', fillColor: bgCellShift } });
                    row3.push({ content: shift, styles: { halign: 'center', fillColor: bgCellShift } });
                    row3.push({ content: pulang, styles: { halign: 'center', fillColor: bgCellShift } });
                }

                row3.isEndPegawai = true;

                bodyRows.push(row1);
                bodyRows.push(row2);
                bodyRows.push(row3);
            });
        });

        // RENDER AUTOTABLE HARIAN
        doc.autoTable({
            startY: startY,
            head: [headRow1, headRow2],
            body: bodyRows,
            theme: 'grid',
            styles: { 
                fontSize: 5.2, 
                cellPadding: 0.5,
                minCellHeight: 3.2,
                lineColor: [44, 62, 80],
                lineWidth: 0.15 
            },
            headStyles: { 
                fillColor: [44, 62, 80], 
                textColor: [255, 255, 255], 
                fontStyle: 'bold', 
                fontSize: 5.8, 
                lineColor: [44, 62, 80], 
                lineWidth: 0.25 
            },
            columnStyles: { 
                0: { cellWidth: 5.5, halign: 'center' }, 
                1: { cellWidth: 11, halign: 'center' }, 
                2: { cellWidth: 24, halign: 'left' } 
            },
            margin: { left: 6, right: 6, top: 6, bottom: 8 },

            willDrawCell: function(data) {
                if (data.section === 'body') {
                    const rawRowData = bodyRows[data.row.index];
                    data.cell.styles.lineColor = [0, 0, 0];

                    const isKategoriRow = data.row.cells[0] && data.row.cells[0].colSpan > 1;
                    if (isKategoriRow) return;

                    if (data.column.index <= 2) {
                        data.cell.styles.lineWidth = { bottom: 0.35, top: 0.15, left: 0.15, right: 0.15 };
                    } else if (rawRowData && rawRowData.isEndPegawai) {
                        data.cell.styles.lineWidth = { bottom: 0.35, top: 0.15, left: 0.15, right: 0.15 };
                    } else {
                        data.cell.styles.lineWidth = 0.15;
                    }
                }
            }
        });
    });

    // FOOTER HALAMAN
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(127, 140, 141);
        doc.text("Laporan Presensi Pegawai v.15 - Kanreg XIV BKN Manokwari", 6, doc.internal.pageSize.getHeight() - 3.5);
        doc.text(`Halaman ${i} dari ${totalPages}`, doc.internal.pageSize.getWidth() - 25, doc.internal.pageSize.getHeight() - 3.5);
    }

    const blobPDF = doc.output('bloburl');
    window.open(blobPDF, '_blank');
}

// =========================================================================
// FUNGSI RENDER TABEL REKAPITULASI UNTUK HALAMAN UTAMA (HALAMAN 1)
// =========================================================================
function renderTabelRekapitulasiHalamanUtama(doc, groupedByRole, sortedRoleKeys, totalHari, tipeSpesimen = "manual") {
    try {
        // 💡 CATATAN: doc.addPage() DIHAPUS agar langsung mencetak di Halaman 1
        let startY = 8;
        const pageWidth = doc.internal.pageSize.getWidth();

        // HEADER TABEL REKAPITULASI
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(44, 62, 80);
        doc.text("KANTOR REGIONAL XIV BKN MANOKWARI", pageWidth / 2, startY, { align: "center" });
        startY += 4;
        doc.text("REKAPITULASI TOTAL KEHADIRAN PEGAWAI", pageWidth / 2, startY, { align: "center" });
        startY += 4;
        doc.setFontSize(8.5);
        
        const teksPeriodeAktif = (typeof namaBulanTahun !== "undefined" && namaBulanTahun) ? namaBulanTahun.toUpperCase() : "--";
        doc.text(`PERIODE: ${teksPeriodeAktif}`, pageWidth / 2, startY, { align: "center" });
        startY += 6;

        // HEADER TABEL
        const headCols = [
            [
                { content: "No", styles: { halign: 'center', valign: 'middle' } },
                { content: "ID PPNPN", styles: { halign: 'center', valign: 'middle' } },
                { content: "Nama Lengkap", styles: { halign: 'center', valign: 'middle' } },
                { content: "JUMLAH HARI KERJA", styles: { halign: 'center', valign: 'middle' } },
                { content: "CS", styles: { halign: 'center', valign: 'middle' } },
                { content: "CT", styles: { halign: 'center', valign: 'middle' } },
                { content: "DL", styles: { halign: 'center', valign: 'middle' } },
                { content: "TK", styles: { halign: 'center', valign: 'middle' } },
                { content: "", styles: { fillColor: [52, 73, 94] } },
                { content: "HN", styles: { halign: 'center', valign: 'middle' } },
                { content: "TM1", styles: { halign: 'center', valign: 'middle' } },
                { content: "TM2", styles: { halign: 'center', valign: 'middle' } },
                { content: "TM3", styles: { halign: 'center', valign: 'middle' } },
                { content: "PC1", styles: { halign: 'center', valign: 'middle' } },
                { content: "PC2", styles: { halign: 'center', valign: 'middle' } },
                { content: "PC3", styles: { halign: 'center', valign: 'middle' } },
                { content: "JUMLAH KEHADIRAN", styles: { halign: 'center', valign: 'middle' } }
            ]
        ];

        const bodyRows = [];
        let globalNo = 1;

        sortedRoleKeys.forEach(roleName => {
            const listPegawaiRole = groupedByRole[roleName];
            if (!listPegawaiRole || listPegawaiRole.length === 0) return;

            bodyRows.push([
                {
                    content: `KATEGORI: ${roleName}`,
                    colSpan: 17,
                    styles: { fillColor: [52, 73, 94], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6.5, halign: 'left', cellPadding: 1 }
                }
            ]);

            listPegawaiRole.forEach(pegawai => {
                let cs = 0, ct = 0, dl = 0, tk = 0, hn = 0;
                let tm1 = 0, tm2 = 0, tm3 = 0, pc1 = 0, pc2 = 0, pc3 = 0;
                let hariKerja = 0;

                for (let tgl = 1; tgl <= totalHari; tgl++) {
                    let itemHari = pegawai.presensiHarian[tgl];
                    if (!itemHari) {
                        tk++;
                        continue;
                    }

                    let shift = itemHari.shift || itemHari.keteranganShift || itemHari.shiftTipe || "P";
                    let rawMasuk = itemHari.jamMasuk || itemHari.waktuMasuk || itemHari.masuk;
                    let rawPulang = itemHari.jamPulang || itemHari.waktuPulang || itemHari.pulang;
                    let masuk = (rawMasuk && rawMasuk !== "-" && rawMasuk !== "--") ? String(rawMasuk).substring(0, 5) : null;
                    let pulang = (rawPulang && rawPulang !== "-" && rawPulang !== "--") ? String(rawPulang).substring(0, 5) : null;

                    if (shift === "P" || shift === "M") {
                        hariKerja++;
                    }

                    let st = "TK";
                    if (typeof getStatusKehadiran === "function") {
                        st = getStatusKehadiran({
                            waktuMasuk: masuk,
                            waktuPulang: pulang,
                            shiftTipe: shift,
                            role: pegawai.role,
                            manualStatus: itemHari.keterangan || itemHari.status
                        });
                    } else {
                        st = (masuk || pulang) ? "HN" : "TK";
                    }

                    if (st === "HN") hn++;
                    else if (st === "CS" || st === "Sakit") cs++;
                    else if (st === "CT" || st === "Cuti") ct++;
                    else if (st === "DL" || st === "Dinas Luar") dl++;
                    else if (st === "LJ" || st === "Libur" || st === "Off") { /* Libur */ }
                    else if (st.includes("TK")) tk++;

                    if (st.includes("TM1")) tm1++;
                    if (st.includes("TM2")) tm2++;
                    if (st.includes("TM3")) tm3++;
                    if (st.includes("PC1")) pc1++;
                    if (st.includes("PC2")) pc2++;
                    if (st.includes("PC3")) pc3++;
                };

                let totalHadir = hn + tm1 + tm2 + tm3 + pc1 + pc2 + pc3;
                let targetHariKerja = hariKerja > 0 ? hariKerja : (pegawai.role === "SATPAM" ? 20 : 23);

                bodyRows.push([
                    String(globalNo++),
                    String(pegawai.idPpnPN),
                    pegawai.namaLengkap,
                    String(targetHariKerja),
                    cs > 0 ? String(cs) : "-",
                    ct > 0 ? String(ct) : "-",
                    dl > 0 ? String(dl) : "-",
                    tk > 0 ? String(tk) : "-",
                    { content: "", styles: { fillColor: [52, 73, 94] } },
                    hn > 0 ? String(hn) : "-",
                    tm1 > 0 ? String(tm1) : "-",
                    tm2 > 0 ? String(tm2) : "-",
                    tm3 > 0 ? String(tm3) : "-",
                    pc1 > 0 ? String(pc1) : "-",
                    pc2 > 0 ? String(pc2) : "-",
                    pc3 > 0 ? String(pc3) : "-",
                    String(totalHadir)
                ]);
            });
        });

        doc.autoTable({
            startY: startY,
            head: headCols,
            body: bodyRows,
            theme: 'grid',
            styles: { fontSize: 6, cellPadding: 1, lineColor: [40, 40, 40], lineWidth: 0.2, halign: 'center' },
            headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6.5, lineColor: [40, 40, 40], lineWidth: 0.25 },
            columnStyles: {
                0: { cellWidth: 8, halign: 'center' },
                1: { cellWidth: 16, halign: 'center' },
                2: { cellWidth: 38, halign: 'left' },
                3: { cellWidth: 18, fontStyle: 'bold' },
                8: { cellWidth: 3 },
                16: { cellWidth: 20, fontStyle: 'bold', fillColor: [235, 245, 251] }
            },
            margin: { left: 10, right: 10, top: 8, bottom: 10 }
        });

        // =========================================================
        // BLOK TANDA TANGAN (BAGIAN BAWAH KANAN)
        // =========================================================
        let finalY = doc.lastAutoTable.finalY + 8;
        const pageHeight = doc.internal.pageSize.getHeight();

        if (finalY + 35 > pageHeight) {
            doc.addPage();
            finalY = 15;
        }

        const alignX = pageWidth - 75;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(0, 0, 0);

        // TANGGAL TTD OTOMATIS TANGGAL 1 BULAN BERIKUTNYA
        const daftarBulan = [
            "Januari", "Februari", "Maret", "April", "Mei", "Juni",
            "Juli", "Agustus", "September", "Oktober", "November", "Desember"
        ];

        let thnAktif = (typeof activeYear !== "undefined" && activeYear) ? activeYear : 2026;
        let blnAktifIdx = (typeof activeMonth !== "undefined" && activeMonth !== null) ? activeMonth : 6;

        let blnBerikutnyaIdx = blnAktifIdx + 1;
        let thnBerikutnya = thnAktif;

        if (blnBerikutnyaIdx > 11) {
            blnBerikutnyaIdx = 0;
            thnBerikutnya += 1;
        }

        const namaBulanBerikutnya = daftarBulan[blnBerikutnyaIdx];
        const teksTanggalTTD = `Manokwari, 1 ${namaBulanBerikutnya} ${thnBerikutnya}`;

        doc.text(teksTanggalTTD, alignX, finalY);
        finalY += 4;
        doc.setFont("helvetica", "bold");

        if (tipeSpesimen === "anchor") {
            finalY += 20;
            doc.setFont("helvetica", "bold");
            doc.text("$", alignX, finalY);
        } else if (tipeSpesimen === "upt") {
            // === TTD UPT ===
            doc.setFont("helvetica", "bold");
            doc.text("Kepala UPT BKN", alignX, finalY);
            finalY += 20;
            doc.text("RAGIL BAROKAH", alignX, finalY);
            doc.line(alignX, finalY + 0.8, alignX + 50, finalY + 0.8);
            finalY += 4.5;
            doc.setFont("helvetica", "normal");
            doc.text("NIP. 198208032015031002", alignX, finalY);
            
        } else {
            doc.setFont("helvetica", "bold");
            doc.text("Kepala Bagian Tata Usaha", alignX, finalY);
            finalY += 20;
            doc.text("BAYU KARTIKA ROSA", alignX, finalY);
            doc.line(alignX, finalY + 0.8, alignX + 50, finalY + 0.8);
            finalY += 4.5;
            doc.setFont("helvetica", "normal");
            doc.text("NIP. 198205102002121007", alignX, finalY);
        }

    } catch (err) {
        console.error("Error pada Render Tabel Rekapitulasi Halaman Utama:", err);
    }
}

// ==========================================
// FIXED. PENGONTROL TOMBOL SIMPAN & BATAL EDIT TABEL
// ==========================================

// 1. FUNGSI UNTUK MEMENTIKAN / MEMUNCULKAN TOMBOL SIMPAN & BATAL EDIT
function tandaiAdaPerubahanTabel() {
    const btnSimpan = document.getElementById("btnSimpanSemua");
    const wrapper = document.getElementById("wrapperEditButtons");

    // Jika menggunakan ID tombol langsung
    if (btnSimpan) {
        btnSimpan.style.display = "inline-block";
    }
    // Jika menggunakan ID pembungkus (wrapper)
    if (wrapper) {
        wrapper.style.display = "flex";
    }
}

// 2. FUNGSI UNTUK MENYEMBUNYIKAN KEMBALI TOMBOL EDIT
function sembunyikanTombolEdit() {
    const btnSimpan = document.getElementById("btnSimpanSemua");
    const wrapper = document.getElementById("wrapperEditButtons");

    if (btnSimpan) {
        btnSimpan.style.display = "none";
    }
    if (wrapper) {
        wrapper.style.display = "none";
    }
}

// 3. Fungsi saat tombol "✖ Batal" diklik
function batalSemuaEdit() {
    if (confirm("Apakah Anda yakin ingin membatalkan seluruh perubahan yang belum disimpan?")) {
        sembunyikanTombolEdit();
        renderTabel(); // Render/muat ulang tabel kembali ke data awal sebelum di-edit
    }
}


// ==========================================
// EXPORT PREVIEW PDF LANDSCAPE (FIXED)
// ==========================================

// Variable temporary untuk menampung data pengelompokan role saat modal dibuka
let tempGroupedByRole = {};

// =========================================================
// 1. FUNGSI UTAMA: MEMBUKA MODAL PILIH KATEGORI PDF LANDSCAPE
// =========================================================
window.exportPreviewPDFLandscape = function() {
    try {
        if (typeof globalRekap === "undefined" || !globalRekap || Object.keys(globalRekap).length === 0) {
            alert("⚠️ Data presensi Rekap Final masih kosong!");
            return;
        }

        // --- A. PROSES SANITASI & GROUPING PER ROLE ---
        const pegawaimap = {};

        Object.keys(globalRekap).forEach(key => {
            const item = globalRekap[key];
            if (!item) return;

            let rawNama = item.namaPegawai || item.namaLengkap || item.nama || "";
            if (!rawNama && key.includes('_')) {
                rawNama = key.split('_')[0];
            }
            
            let namaClean = String(rawNama).trim();
            if (!namaClean || namaClean === "-") return;

            let uniqueKey = namaClean.toUpperCase();
            let idPpnP = String(item.idPpnPN || item.idPegawai || item.id || "").trim();
            let role = String(item.role || item.kategori || item.jabatan || "STAFF").toUpperCase().trim();

            if (!pegawaimap[uniqueKey]) {
                pegawaimap[uniqueKey] = {
                    idPpnPN: idPpnP || "-",
                    namaLengkap: namaClean,
                    role: role,
                    presensiHarian: {}
                };
            } else {
                if ((!pegawaimap[uniqueKey].idPpnPN || pegawaimap[uniqueKey].idPpnPN === "-") && idPpnP) {
                    pegawaimap[uniqueKey].idPpnPN = idPpnP;
                }
            }

            let rawTgl = item.tanggal || item.tgl || (key.includes('_') ? key.split('_')[1] : null);
            if (rawTgl) {
                let tglAngka = parseInt(String(rawTgl).split('-').pop(), 10);
                if (!isNaN(tglAngka)) {
                    pegawaimap[uniqueKey].presensiHarian[tglAngka] = item;
                }
            }
        });

        // Grouping per role
        const listPegawaiAll = Object.values(pegawaimap);
        tempGroupedByRole = {};

        listPegawaiAll.forEach(p => {
            let r = p.role || "STAFF";
            if (!tempGroupedByRole[r]) tempGroupedByRole[r] = [];

            const isExist = tempGroupedByRole[r].some(existing => 
                existing.namaLengkap.toUpperCase() === p.namaLengkap.toUpperCase()
            );

            if (!isExist) {
                tempGroupedByRole[r].push(p);
            }
        });

        // Urutkan Nama A-Z per role
        Object.keys(tempGroupedByRole).forEach(r => {
            tempGroupedByRole[r].sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap));
        });

        const availableRoles = Object.keys(tempGroupedByRole).sort();
        if (availableRoles.length === 0) {
            alert("⚠️ Tidak ada kategori pegawai yang ditemukan!");
            return;
        }

        // --- B. RENDER PILIHAN CHECKBOX DI MODAL (TABEL LAYOUT ANTI-MENIMPA) ---
        const container = document.getElementById("containerListKategoriPdf");
        container.innerHTML = "";

        availableRoles.forEach(roleName => {
            const countPegawai = tempGroupedByRole[roleName].length;
            
            const card = document.createElement("div");
            card.style.cssText = "background: #ffffff; border: 1px solid #e0e6ed; border-radius: 8px; padding: 10px 14px; transition: all 0.2s ease;";
            
            card.onmouseover = () => { card.style.borderColor = '#3498db'; card.style.background = '#f7fbfe'; };
            card.onmouseout = () => { card.style.borderColor = '#e0e6ed'; card.style.background = '#ffffff'; };

            card.innerHTML = `
                <label style="cursor: pointer; display: block; width: 100%; margin: 0; padding: 0;">
                    <table style="width: 100%; border-collapse: collapse; border: none; background: transparent;">
                        <tr>
                            <td style="width: 28px; vertical-align: middle; text-align: left; padding: 0; border: none;">
                                <input type="checkbox" class="cb-kategori-pdf" value="${roleName}" checked style="width: 18px; height: 18px; accent-color: #27ae60; cursor: pointer; display: block; margin: 0;" onchange="updateCheckAllState()">
                            </td>
                            <td style="vertical-align: middle; text-align: left; padding-left: 8px; border: none;">
                                <span style="font-weight: 600; font-size: 14px; color: #2c3e50; display: inline-block;">${roleName}</span>
                            </td>
                            <td style="width: 100px; vertical-align: middle; text-align: right; padding: 0; border: none;">
                                <span style="background: #eef2f7; color: #4a6572; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 12px; display: inline-block;">
                                    ${countPegawai} Pegawai
                                </span>
                            </td>
                        </tr>
                    </table>
                </label>
            `;
            container.appendChild(card);
        });

        document.getElementById("checkAllKategoriPdf").checked = true;

        // Tampilkan Modal
        document.getElementById("modalPilihKategori").style.display = "flex";

    } catch (err) {
        console.error("Error pada Buka Modal PDF Landscape:", err);
        alert("❌ Terjadi Error:\n" + err.message);
    }
};

// =========================================================
// 2. HELPER KONTROL CHECKBOX MODAL
// =========================================================
function toggleCheckAllKategoriPdf(isChecked) {
    document.querySelectorAll(".cb-kategori-pdf").forEach(cb => {
        cb.checked = isChecked;
    });
}

function updateCheckAllState() {
    const all = document.querySelectorAll(".cb-kategori-pdf");
    const checked = document.querySelectorAll(".cb-kategori-pdf:checked");
    const checkAll = document.getElementById("checkAllKategoriPdf");
    if (checkAll) {
        checkAll.checked = (all.length === checked.length);
    }
}

function tutupModalKategoriPdf() {
    document.getElementById("modalPilihKategori").style.display = "none";
}

// =========================================================
// 3. PROSES EXPORT SETELAH KATEGORI DIPILIH & KONFIRMASI
// =========================================================
function prosesExportPdfLandscapeDenganPilihan() {
    const checkedBoxes = document.querySelectorAll(".cb-kategori-pdf:checked");
    if (checkedBoxes.length === 0) {
        alert("⚠️ Pilih minimal 1 kategori pegawai yang ingin diexport!");
        return;
    }

    // Ambil list role terpilih
    const selectedRoleKeys = Array.from(checkedBoxes).map(cb => cb.value).sort();

    // Ambil opsi spesimen TTD terpilih (manual / anchor)
    const radioSelected = document.querySelector('input[name="radioSpesimen"]:checked');
    const tipeSpesimen = radioSelected ? radioSelected.value : "manual";

    // Saring groupedByRole hanya untuk role terpilih
    const filteredGroupedByRole = {};
    selectedRoleKeys.forEach(r => {
        filteredGroupedByRole[r] = tempGroupedByRole[r];
    });

    // --- KONFIRMASI AKHIR SEBELUM TAMPIL FILE ---
    const daftarRoleStr = selectedRoleKeys.join(", ");
    const jenisTTDStr = tipeSpesimen === "anchor" ? "Anchor DS ($)" : "TTD Manual";
    const yakin = confirm(`Apakah Anda yakin ingin membuka Preview PDF Rekap Kehadiran Pegawai (Landscape)?\n\n👉 Kategori: [ ${daftarRoleStr} ]\n👉 Spesimen TTD: ${jenisTTDStr}`);
    
    if (!yakin) return;

    // Tutup Modal
    tutupModalKategoriPdf();

    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("❌ Library jsPDF / AutoTable belum terpasang!");
        return;
    }

    const totalHari = 31; // Jumlah hari dalam bulan berjalan

    // Jalankan Generator PDF dengan membawa parameter tipeSpesimen
    generatePDFLandscapeChunked(filteredGroupedByRole, selectedRoleKeys, totalHari, tipeSpesimen);
}