// Cek Login Session saat membuka dashboard
const activeUser = checkAuthSession();

// =========================================================
// SISTEM NAVIGASI TAB (EXTENSIBLE TAB CONTROLLER)
// =========================================================
function switchTab(tabId) {
    if (!tabId) return;

    // Normalisasi jika tabId diawali '#'
    if (tabId.startsWith('#')) tabId = tabId.substring(1);

    // Jika tab aksi massal dipanggil secara legacy, arahkan ke tab presensi dan buka panel double-side
    if (tabId === 'tab-manual') {
        switchTab('tab-presensi');
        if (typeof toggleSidePanelMassal === 'function') {
            toggleSidePanelMassal(true);
        }
        return;
    }

    // 1. Update status aktif pada tombol tab
    const tabButtons = document.querySelectorAll('.nav-tab-btn');
    tabButtons.forEach(btn => {
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
        } else {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
        }
    });

    // 2. Tampilkan panel tab yang sesuai
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabPanes.forEach(pane => {
        if (pane.id === tabId) {
            pane.classList.add('active');
        } else {
            pane.classList.remove('active');
        }
    });

    // 3. Sinkronisasi URL Hash '#' untuk kemudahan navigasi dan bookmark
    try {
        if (window.location.hash !== '#' + tabId) {
            if (history && history.replaceState) {
                history.replaceState(null, '', '#' + tabId);
            } else {
                window.location.hash = '#' + tabId;
            }
        }
    } catch (e) {
        console.warn("Hash update warning:", e);
    }

    // 4. Simpan tab aktif ke sessionStorage agar konsisten
    try {
        sessionStorage.setItem('activeDashboardTab', tabId);
    } catch (e) {
        console.warn("Storage warning:", e);
    }

    // 5. Jika kembali ke tab presensi, pastikan viewport virtual scroll terhitung akurat
    if (tabId === 'tab-presensi' && typeof renderVirtualWindow === 'function') {
        renderVirtualWindow(true);
    } else if (tabId === 'tab-rekap') {
        if (typeof segarkanRekapKehadiran === 'function') segarkanRekapKehadiran();
        if (typeof muatDatabasePegawai === 'function') muatDatabasePegawai();
    }
}

// Listener untuk navigasi URL Hash (Back/Forward browser)
window.addEventListener('hashchange', () => {
    let hash = window.location.hash ? window.location.hash.substring(1) : '';
    if (hash && document.getElementById(hash) && hash !== 'tab-manual') {
        switchTab(hash);
    }
});

// Inisialisasi Tab & Hak Akses saat DOM Siap
document.addEventListener("DOMContentLoaded", () => {
    // 1. Pasang Event Listener ke semua tombol tab
    const tabButtons = document.querySelectorAll('.nav-tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = btn.getAttribute('data-tab');
            if (targetTab) switchTab(targetTab);
        });
    });

    // 2. Aktifkan tab berdasarkan URL Hash '#' atau sessionStorage (default: tab-presensi)
    let initialTab = 'tab-presensi';
    let hash = window.location.hash ? window.location.hash.substring(1) : '';
    if (hash && document.getElementById(hash) && hash !== 'tab-manual') {
        initialTab = hash;
    } else {
        try {
            const saved = sessionStorage.getItem('activeDashboardTab');
            if (saved && document.getElementById(saved) && saved !== 'tab-manual') {
                initialTab = saved;
            }
        } catch (e) {}
    }
    switchTab(initialTab);

    // 3. Terapkan Hak Akses
    terapkanHakAksesUI();

    // 4. Pulihkan State Sesi Presensi dari sessionStorage jika ada
    muatStateSesiPresensi();
    updateStateTombolMultiData();
});

// Dijalankan otomatis saat dashboard dibuka
(function inisialisasiUserSession() {
    try {
        let sessionRaw = localStorage.getItem("userSession") || sessionStorage.getItem("userSession") || localStorage.getItem("activeUser");
        if (sessionRaw) {
            window.currentUser = JSON.parse(sessionRaw);
            
            // Tampilkan nama user di header dashboard jika ada elemennya
            let elNamaHeader = document.getElementById("lblSessionUsername") || document.getElementById("userDisplayName") || document.getElementById("lblNamaUser");
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

    const p = activeUser.permissions || {};

    // 1. Kontrol Tombol Admin di Header Atas / Dropdown
    const btnAdminHeader = document.getElementById("btnHeaderAdmin");
    if (btnAdminHeader) {
        btnAdminHeader.style.display = (activeUser.role === "administrator") ? "flex" : "none";
    }

    // 2. Kontrol Tombol History Floating (jika ada elemennya)
    const btnHistory = document.getElementById("btnHistoryFloating");
    if (btnHistory) {
        if (activeUser.role === "administrator" || p.bukaHistoryFloating !== false) {
            btnHistory.style.display = "inline-flex";
        } else {
            btnHistory.style.display = "none";
        }
    }

    // Jika Administrator, berikan akses penuh (tidak ada tombol yang disembunyikan)
    if (activeUser.role === "administrator") {
        return;
    }

    // 3. Jika Operator, sembunyikan tombol sesuai ON/OFF permissions dari Firebase
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
window.cachedListPegawai = [];
try {
    const savedMaster = localStorage.getItem('cached_database_pegawai');
    if (savedMaster) window.cachedListPegawai = JSON.parse(savedMaster);
} catch (e) {}
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
    const elPeriode = document.getElementById("periodeText");
    if (elPeriode) elPeriode.innerText = `Periode: ${namaBulanTahun}`;
}

// =========================================================
// SISTEM PERSISTENSI DATA SESI (SESSION STORAGE)
// Menjaga data tabel tetap ada saat browser di-refresh (F5 / reload),
// dan otomatis terhapus bersih saat tab/browser ditutup oleh pengguna.
// =========================================================
function simpanStateSesiPresensi() {
    try {
        if (!globalRekap || Object.keys(globalRekap).length === 0) {
            sessionStorage.removeItem('ppnpn_session_presensi_state');
            updateStateTombolMultiData();
            return;
        }
        const state = {
            globalRekap: globalRekap,
            dataPegawai: dataPegawai,
            activeYear: activeYear,
            activeMonth: activeMonth,
            namaBulanTahun: namaBulanTahun,
            isFingerprintUploaded: isFingerprintUploaded
        };
        sessionStorage.setItem('ppnpn_session_presensi_state', JSON.stringify(state));
        updateStateTombolMultiData();
    } catch (e) {
        console.warn("Gagal menyimpan state sesi presensi:", e);
    }
}

function muatStateSesiPresensi() {
    try {
        const raw = sessionStorage.getItem('ppnpn_session_presensi_state');
        if (!raw) {
            updateStateTombolMultiData();
            return false;
        }
        const state = JSON.parse(raw);
        if (state && state.globalRekap && Object.keys(state.globalRekap).length > 0) {
            globalRekap = state.globalRekap;
            dataPegawai = state.dataPegawai || {};
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
            activeYear = state.activeYear;
            activeMonth = state.activeMonth;
            namaBulanTahun = state.namaBulanTahun || "";
            isFingerprintUploaded = !!state.isFingerprintUploaded;

            if (activeYear !== null && activeMonth !== null) {
                setBulanAktif(new Date(activeYear, activeMonth, 1));
            }

            updateCheckboxPegawaiManual();
            updateFilterNamaDropdown();
            updateFilterKehadiranDropdown();
            
            const secPresensi = document.getElementById('sectionPresensi');
            if (secPresensi) secPresensi.style.display = 'block';

            const secManual = document.getElementById('sectionManualWrapper');
            if (secManual && isFingerprintUploaded) secManual.style.display = 'block';

            renderTabel();
            updateStateTombolMultiData();
            return true;
        }
    } catch (e) {
        console.warn("Gagal memuat state sesi presensi:", e);
    }
    updateStateTombolMultiData();
    return false;
}

function updateStateTombolMultiData() {
    const adaData = globalRekap && Object.keys(globalRekap).length > 0;
    const btnTab = document.getElementById('btnTabMultiData');
    const btnToolbar = document.getElementById('btnBukaDrawerMassal');

    if (btnTab) {
        btnTab.disabled = !adaData;
        if (!adaData) {
            btnTab.classList.add('disabled');
            btnTab.title = "Belum ada data presensi yang dimuat";
        } else {
            btnTab.classList.remove('disabled');
            btnTab.title = "Buka Panel Edit Multi Data Pegawai dan PPNPN";
        }
    }

    if (btnToolbar) {
        btnToolbar.disabled = !adaData;
        if (!adaData) {
            btnToolbar.classList.add('disabled');
            btnToolbar.title = "Belum ada data presensi yang dimuat";
        } else {
            btnToolbar.classList.remove('disabled');
            btnToolbar.title = "Buka Panel Edit Multi Data Pegawai dan PPNPN";
        }
    }
}

window.simpanStateSesiPresensi = simpanStateSesiPresensi;
window.muatStateSesiPresensi = muatStateSesiPresensi;
window.updateStateTombolMultiData = updateStateTombolMultiData;

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
    if (!section || !btn) return;
    if (section.style.display === 'none') {
        section.style.display = 'block';
        btn.innerHTML = `<svg class="icon-svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> Sembunyikan Area Keterangan Presensi`;
    } else {
        section.style.display = 'none';
        btn.innerHTML = `<svg class="icon-svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> Tampilkan Area Keterangan Presensi`;
    }
}

function toggleFormManual() {
    const sectionManual = document.getElementById('sectionManual');
    const btnToggle = document.getElementById('btnToggleManual');
    if (!sectionManual || !btnToggle) return;
    if (sectionManual.style.display === 'none') {
        sectionManual.style.display = 'block';
        btnToggle.innerHTML = `<svg class="icon-svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> Sembunyikan Area Update & Download Manual`;
    } else {
        sectionManual.style.display = 'none';
        btnToggle.innerHTML = `<svg class="icon-svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> Tampilkan Area Update & Download Manual`;
    }
}

function updateCheckboxPegawaiManual() {
    const container = document.getElementById("checkboxPegawaiList");
    if (!container) return;
    container.innerHTML = '';
    
    const ids = Object.keys(dataPegawai || {});
    if (ids.length === 0) {
        container.innerHTML = '<span style="font-size: 11.5px; color: var(--text-muted); display: block; padding: 10px 4px;">Belum ada pegawai dimuat. Silakan buat kalender shift terlebih dahulu di tab \'Impor & Sinkronisasi\'.</span>';
        updateSelectedPegawaiBadge();
        return;
    }

    ids.sort((a,b) => comparePegawaiByJabatanThenNama(a, b, dataPegawai[a], dataPegawai[b])).forEach(id => {
        let namaLengkap = getNamaPegawaiMaster(id, dataPegawai[id]);
        let masterJabatan = getJabatanPegawaiMaster(id);
        let label = document.createElement("label");
        label.className = "manual-pegawai-item";
        label.style.display = "flex";
        label.style.alignItems = "center";
        label.style.gap = "8px";
        label.style.padding = "5px 6px";
        label.style.cursor = "pointer";
        label.style.fontSize = "12px";
        label.style.borderRadius = "var(--radius-sm)";
        label.innerHTML = `<input type="checkbox" class="manual-pegawai-checkbox" value="${id}" onchange="updateSelectedPegawaiBadge()" style="accent-color: var(--brand-accent); width: 14px; height: 14px; cursor: pointer; flex-shrink: 0;"> <span style="line-height: 1.3;">${namaLengkap} <small style="color: var(--text-muted); font-size: 10.5px;">(${masterJabatan} - ID: ${id})</small></span>`;
        container.appendChild(label);
    });

    const checkAll = document.getElementById('checkAllManual');
    if (checkAll) checkAll.checked = false;
    updateSelectedPegawaiBadge();
}

function updateSelectedPegawaiBadge() {
    const badge = document.getElementById('selectedPegawaiCountBadge');
    if (!badge) return;
    const count = document.querySelectorAll('.manual-pegawai-checkbox:checked').length;
    badge.textContent = `${count} terpilih`;
}

function toggleCheckAllManual() {
    const checkAll = document.getElementById('checkAllManual');
    if (!checkAll) return;
    const isChecked = checkAll.checked;
    document.querySelectorAll('.manual-pegawai-checkbox').forEach(cb => {
        const parentLabel = cb.closest('label');
        if (!parentLabel || parentLabel.style.display !== 'none') {
            cb.checked = isChecked;
        }
    });
    updateSelectedPegawaiBadge();
}

function filterDrawerPegawai(query) {
    const q = (query || '').toLowerCase().trim();
    const container = document.getElementById('checkboxPegawaiList');
    if (!container) return;
    const labels = container.querySelectorAll('label');
    labels.forEach(lbl => {
        const text = lbl.textContent.toLowerCase();
        if (!q || text.includes(q)) {
            lbl.style.display = 'flex';
        } else {
            lbl.style.display = 'none';
        }
    });
}

function toggleSidePanelMassal(show) {
    const panel = document.getElementById('sidePanelMassal');
    const backdrop = document.getElementById('sideDrawerBackdrop');
    if (!panel) return;

    const shouldOpen = (typeof show === 'boolean') ? show : !panel.classList.contains('show');

    if (shouldOpen) {
        if (!globalRekap || Object.keys(globalRekap).length === 0) {
            alert("Data presensi belum tersedia. Silakan buat kalender shift di tab Impor & Sinkronisasi atau pulihkan data dari Riwayat.");
            return;
        }
        if (typeof updateCheckboxPegawaiManual === 'function') {
            updateCheckboxPegawaiManual();
        }
        panel.classList.add('show');
        if (backdrop) backdrop.classList.add('show');
        document.body.style.overflow = 'hidden';
    } else {
        panel.classList.remove('show');
        if (backdrop) backdrop.classList.remove('show');
        document.body.style.overflow = '';
    }
}

window.toggleSidePanelMassal = toggleSidePanelMassal;
window.filterDrawerPegawai = filterDrawerPegawai;
window.updateSelectedPegawaiBadge = updateSelectedPegawaiBadge;
window.updateCheckboxPegawaiManual = updateCheckboxPegawaiManual;
window.toggleCheckAllManual = toggleCheckAllManual;

function hapusPegawaiTerpilih() {
    const checkedCheckboxes = document.querySelectorAll('.manual-pegawai-checkbox:checked');
    if (checkedCheckboxes.length === 0) {
        alert("Silakan pilih minimal 1 Pegawai atau PPNPN yang ingin dihapus dari daftar.");
        return;
    }

    let namaTarget = [];
    checkedCheckboxes.forEach(cb => {
        let id = cb.value;
        if (dataPegawai[id]) namaTarget.push(`${dataPegawai[id]} (ID: ${id})`);
    });

    let pesanKonfirmasi = `Apakah Anda yakin ingin menghapus ${checkedCheckboxes.length} Pegawai dan PPNPN terpilih berikut?\n\n- ` + namaTarget.join('\n- ') + `\n\nCatatan: Seluruh data presensi pegawai ini pada bulan/periode aktif akan dibersihkan dari aplikasi.`;

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
        simpanStateSesiPresensi();
        alert(`Data presensi untuk ${checkedCheckboxes.length} Pegawai dan PPNPN terpilih berhasil dihapus.`);
    }
}

function updateFilterNamaDropdown() {
    const selectFilter = document.getElementById('filterNama');
    if (!selectFilter) return;
    const selectedRole = document.getElementById('filterRole')?.value || "";
    selectFilter.innerHTML = '<option value="">-- Semua Pegawai dan PPNPN --</option>';
    
    Object.keys(dataPegawai).sort((a,b) => comparePegawaiByJabatanThenNama(a, b, dataPegawai[a], dataPegawai[b])).forEach(id => {
        let masterNama = getNamaPegawaiMaster(id, dataPegawai[id]);
        let masterJabatan = getJabatanPegawaiMaster(id);
        
        if (selectedRole === "" || masterJabatan === selectedRole) {
            let opt = document.createElement("option");
            opt.value = masterNama.toLowerCase();
            opt.text = `${masterNama} (${masterJabatan})`;
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
    if (!window.tableDataFiltered || window.tableDataFiltered.length === 0) return;
    
    if (sortCol === columnIndex) sortAsc = !sortAsc;
    else { sortCol = columnIndex; sortAsc = true; }

    const propMap = [
        'no', 'id', 'nama', 'shiftTipe', 'hariStr', 'tanggalStr',
        'statusKehadiran', 'jMasuk', 'jPulang', 'totalText', 'kelebihanTextRaw'
    ];
    const prop = propMap[columnIndex];

    if (prop) {
        window.tableDataFiltered.sort((a, b) => {
            let valA = (a[prop] !== undefined) ? String(a[prop]).trim() : '';
            let valB = (b[prop] !== undefined) ? String(b[prop]).trim() : '';
            let numA = parseFloat(valA);
            let numB = parseFloat(valB);
            
            if (!isNaN(numA) && !isNaN(numB) && valA.match(/^[0-9]+$/)) {
                return sortAsc ? numA - numB : numB - numA;
            }
            return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        });

        renderVirtualWindow();
    }
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

// 3. FUNGSI EDIT BARIS TABEL (COMPACT & MODERN UX)
function editBaris(btn, key) {
    activeEditingKey = key;
    tandaiAdaPerubahanTabel();
    if (typeof renderVirtualWindow === "function") {
        renderVirtualWindow(true);
    } else {
        renderTabel();
    }
    cekTombolSimpanSemua();
}

function batalEditBarisSingle(btn, key) {
    activeEditingKey = null;
    if (typeof renderVirtualWindow === "function") {
        renderVirtualWindow(true);
    } else {
        renderTabel();
    }
    cekTombolSimpanSemua();
}

function simpanBarisSingle(btn, key) {
    activeEditingKey = null;
    let tr = btn.closest("tr");
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
    renderTabel();
    cekTombolSimpanSemua();
}

function simpanSemuaPerubahan() {
    const barisEdit = document.querySelectorAll('#tabelAbsen tbody tr.sedang-diedit');
    if (barisEdit.length === 0) {
        alert("Saat ini tidak ada baris yang sedang dalam proses edit.");
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

    activeEditingKey = null;
    renderTabel();
    alert("Seluruh perubahan data presensi di tabel berhasil disimpan.");
    sembunyikanTombolEdit();
}

function cekTombolSimpanSemua() {
    const barisEdit = document.querySelectorAll('#tabelAbsen tbody tr.sedang-diedit');
    const wrapper = document.getElementById('wrapperEditButtons');
    const label = document.getElementById('lblModeEditActive');
    if (barisEdit.length > 0) {
        if (wrapper) wrapper.style.display = 'flex';
        if (label) {
            label.innerHTML = `Mode Edit Aktif <span style="background: rgba(34, 197, 94, 0.2); color: #86efac; border: 1px solid rgba(134, 239, 172, 0.4); padding: 2px 8px; border-radius: 999px; font-size: 11px; margin-left: 6px; font-weight: 700;">${barisEdit.length} data sedang diedit</span>`;
        }
    } else {
        if (wrapper) wrapper.style.display = 'none';
    }
}

function hapusBaris(key) {
    if (!confirm("Apakah Anda yakin ingin mengosongkan jam presensi untuk baris ini?")) return;
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

    if (typeof recheckStatusFinalReport === "function") {
        recheckStatusFinalReport();
    }
}

function jalankanRecheck() {
    updateAuditBox();
    alert("Pemeriksaan presensi selesai diperbarui.");
}

// =========================================================
// HELPER DATABASE MASTER PEGAWAI & SORTING JABATAN HIRARKIS
// =========================================================
function getMasterPegawai(id, fallbackNama = '') {
    let list = window.cachedListPegawai;
    if (!list || list.length === 0) {
        try {
            const saved = localStorage.getItem('cached_database_pegawai');
            if (saved) {
                list = JSON.parse(saved);
                window.cachedListPegawai = list;
            }
        } catch (e) {}
    }
    if (!list || list.length === 0) return null;

    const sId = id !== undefined && id !== null ? String(id).trim() : '';
    const sNama = fallbackNama !== undefined && fallbackNama !== null ? String(fallbackNama).trim() : '';

    // 1. Pencocokan ID Persis (String Case-Insensitive)
    if (sId) {
        let found = list.find(p => p.id && String(p.id).trim().toLowerCase() === sId.toLowerCase());
        if (found) return found;
    }

    // 2. Pencocokan Nama Lengkap Persis (Case-Insensitive)
    if (sNama) {
        let found = list.find(p => p.nama && p.nama.trim().toLowerCase() === sNama.toLowerCase());
        if (found) return found;
    }

    // 3. Pencocokan Nama yang Dinormalisasi (Abaikan spasi, tanda baca, simbol)
    if (sNama) {
        const cleanTarget = sNama.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanTarget.length >= 3) {
            let found = list.find(p => {
                if (!p.nama) return false;
                const cleanP = p.nama.toLowerCase().replace(/[^a-z0-9]/g, '');
                return cleanP === cleanTarget;
            });
            if (found) return found;

            // Substring inclusion jika ada gelar atau perbedaan kata panggilan
            found = list.find(p => {
                if (!p.nama) return false;
                const cleanP = p.nama.toLowerCase().replace(/[^a-z0-9]/g, '');
                return (cleanP.length >= 4 && (cleanP.includes(cleanTarget) || cleanTarget.includes(cleanP)));
            });
            if (found) return found;
        }
    }

    // 4. Pencocokan Numerik ID (jika sId bukan nomor baris 1-99 yang ambigu)
    if (sId) {
        const numId = parseInt(sId, 10);
        if (!isNaN(numId) && numId > 99) {
            let found = list.find(p => parseInt(p.id, 10) === numId);
            if (found) return found;
        }
    }

    // 5. Pencocokan jika sId ternyata adalah Nama Pegawai
    if (sId && !sNama) {
        const cleanTargetId = sId.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanTargetId.length >= 3) {
            let found = list.find(p => {
                if (!p.nama) return false;
                const cleanP = p.nama.toLowerCase().replace(/[^a-z0-9]/g, '');
                return cleanP === cleanTargetId || (cleanP.length >= 4 && (cleanP.includes(cleanTargetId) || cleanTargetId.includes(cleanP)));
            });
            if (found) return found;
        }
    }

    return null;
}

function getNamaPegawaiMaster(id, fallbackNama = '') {
    const m = getMasterPegawai(id, fallbackNama);
    if (m && m.nama && m.nama.trim()) {
        return m.nama.trim();
    }
    return fallbackNama || (id ? String(id).trim() : '');
}

function getIdPegawaiMaster(id, fallbackNama = '') {
    const m = getMasterPegawai(id, fallbackNama);
    if (m && m.id && String(m.id).trim()) {
        return String(m.id).trim();
    }
    return id ? String(id).trim() : '';
}

function getJabatanPegawaiMaster(id, fallbackJabatan = 'Tenaga Pramubakti', fallbackNama = '') {
    const m = getMasterPegawai(id, fallbackNama);
    if (m && m.jabatanPosisi && m.jabatanPosisi.trim()) {
        return m.jabatanPosisi.trim();
    }
    if (fallbackJabatan) {
        const f = String(fallbackJabatan).toUpperCase();
        if (f.includes('KEAMANAN') || f.includes('SATPAM') || f.includes('SECURITY')) {
            return (f.includes('PPPK') || f.includes('P3K')) ? 'Tenaga Keamanan - PPPK' : 'Tenaga Keamanan';
        }
        if (f.includes('PENGEMUDI') || f.includes('DRIVER') || f.includes('SOPIR')) {
            return (f.includes('PPPK') || f.includes('P3K')) ? 'Tenaga Pengemudi - PPPK' : 'Tenaga Pengemudi';
        }
        if (f.includes('KEBERSIHAN') || f.includes('CLEANING') || f.includes('OB') || f.includes('CS')) {
            return (f.includes('PPPK') || f.includes('P3K')) ? 'Tenaga Kebersihan - PPPK' : 'Tenaga Kebersihan';
        }
        if (f.includes('PRAMUBAKTI') || f.includes('STAFF')) {
            return (f.includes('PPPK') || f.includes('P3K')) ? 'Tenaga Pramubakti - PPPK' : 'Tenaga Pramubakti';
        }
        if (f.includes('PPPK') || f.includes('P3K') || f.includes('ASN')) {
            return 'Tenaga Pramubakti - PPPK';
        }
    }
    return fallbackJabatan || 'Tenaga Pramubakti';
}

function getJabatanSortRank(jabatanStr) {
    if (!jabatanStr) return 99;
    const j = String(jabatanStr).toUpperCase().trim();
    
    // 1. Tenaga Keamanan PPPK
    if ((j.includes("KEAMANAN") || j.includes("SATPAM") || j.includes("SECURITY")) && (j.includes("PPPK") || j.includes("P3K"))) {
        return 1;
    }
    // 2. Tenaga Keamanan tanpa PPPK
    if (j.includes("KEAMANAN") || j.includes("SATPAM") || j.includes("SECURITY")) {
        return 2;
    }
    // 3. Tenaga Pengemudi PPPK
    if ((j.includes("PENGEMUDI") || j.includes("DRIVER") || j.includes("SOPIR")) && (j.includes("PPPK") || j.includes("P3K"))) {
        return 3;
    }
    // 4. Tenaga Pengemudi tanpa PPPK
    if (j.includes("PENGEMUDI") || j.includes("DRIVER") || j.includes("SOPIR")) {
        return 4;
    }
    // 5. Tenaga Kebersihan PPPK
    if ((j.includes("KEBERSIHAN") || j.includes("CLEANING") || j.includes("OB") || j.includes("CS")) && (j.includes("PPPK") || j.includes("P3K"))) {
        return 5;
    }
    // 6. Tenaga Kebersihan tanpa PPPK
    if (j.includes("KEBERSIHAN") || j.includes("CLEANING") || j.includes("OB") || j.includes("CS")) {
        return 6;
    }
    // 7. Tenaga Pramubakti PPPK
    if ((j.includes("PRAMUBAKTI") || j.includes("PRAMU")) && (j.includes("PPPK") || j.includes("P3K"))) {
        return 7;
    }
    // 8. Tenaga Pramubakti tanpa PPPK
    if (j.includes("PRAMUBAKTI") || j.includes("PRAMU")) {
        return 8;
    }
    // PPPK / ASN umum jika ada
    if (j.includes("PPPK") || j.includes("P3K") || j.includes("ASN")) {
        return 9;
    }
    // Staff & lainnya
    if (j.includes("STAFF")) {
        return 10;
    }
    return 20;
}

function comparePegawaiByJabatanThenNama(idA, idB, fallbackNamaA = '', fallbackNamaB = '', roleA = '', roleB = '') {
    const jabA = getJabatanPegawaiMaster(idA, roleA, fallbackNamaA);
    const jabB = getJabatanPegawaiMaster(idB, roleB, fallbackNamaB);
    const rankA = getJabatanSortRank(jabA);
    const rankB = getJabatanSortRank(jabB);
    if (rankA !== rankB) {
        return rankA - rankB;
    }
    const namaA = getNamaPegawaiMaster(idA, fallbackNamaA);
    const namaB = getNamaPegawaiMaster(idB, fallbackNamaB);
    return namaA.localeCompare(namaB);
}

function getJabatanBadgeClass(jabatan) {
    if (!jabatan) return 'badge-jabatan-pramubakti';
    const j = String(jabatan).toUpperCase();
    if (j.includes('KEAMANAN') || j.includes('SATPAM')) {
        return (j.includes('PPPK') || j.includes('P3K')) ? 'badge-jabatan-keamanan-pppk' : 'badge-jabatan-keamanan';
    }
    if (j.includes('PENGEMUDI') || j.includes('DRIVER')) {
        return (j.includes('PPPK') || j.includes('P3K')) ? 'badge-jabatan-pengemudi-pppk' : 'badge-jabatan-pengemudi';
    }
    if (j.includes('KEBERSIHAN') || j.includes('CLEANING')) {
        return (j.includes('PPPK') || j.includes('P3K')) ? 'badge-jabatan-kebersihan-pppk' : 'badge-jabatan-kebersihan';
    }
    if (j.includes('PRAMUBAKTI') || j.includes('STAFF')) {
        return (j.includes('PPPK') || j.includes('P3K')) ? 'badge-jabatan-pramubakti-pppk' : 'badge-jabatan-pramubakti';
    }
    if (j.includes('PPPK') || j.includes('P3K')) return 'badge-jabatan-keamanan-pppk';
    return 'badge-jabatan-pramubakti';
}

function renderCellNamaPegawai(item) {
    const id = item.id || '';
    const masterPeg = getMasterPegawai(id, item.nama);
    const masterNama = masterPeg && masterPeg.nama ? masterPeg.nama : getNamaPegawaiMaster(id, item.nama);
    const masterJabatan = masterPeg && masterPeg.jabatanPosisi ? masterPeg.jabatanPosisi : getJabatanPegawaiMaster(id, item.jabatan || item.role, item.nama);
    const officialId = masterPeg && masterPeg.id ? masterPeg.id : id;
    const safeNama = (masterNama || '').replace(/"/g, '&quot;');
    const safeJabatan = (masterJabatan || '').replace(/"/g, '&quot;');
    const safeId = (officialId || '').replace(/"/g, '&quot;');

    return `
        <div class="pegawai-hover-wrapper">
            <span class="pegawai-nama-link">${safeNama}</span>
            <div class="pegawai-hover-popover" role="tooltip">
                <div class="pegawai-popover-header">
                    <svg class="icon-svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <span>Database Master Pegawai</span>
                </div>
                <div class="pegawai-popover-body">
                    <div class="pegawai-popover-row">
                        <span class="popover-label">Nama Lengkap:</span>
                        <span class="popover-val" style="font-weight: 700; color: #0f172a;">${safeNama}</span>
                    </div>
                    <div class="pegawai-popover-row">
                        <span class="popover-label">Nama Jabatan:</span>
                        <span class="popover-val" style="font-weight: 600; color: #047857;">${safeJabatan}</span>
                    </div>
                    <div class="pegawai-popover-row">
                        <span class="popover-label">ID PPNPN:</span>
                        <span class="popover-val" style="font-family: ui-monospace, monospace; color: #64748b;">${safeId}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// =========================================================
// HIGH-PERFORMANCE VIEWPORT VIRTUAL SCROLL & MEMORY OPTIMIZATION
// =========================================================
window.tableDataMaster = [];
window.tableDataFiltered = [];
let isVirtualScrollAttached = false;
let virtualRenderRAF = null;
let lastVirtualStartIndex = -1;
let lastVirtualEndIndex = -1;
let activeEditingKey = null;
const VIRTUAL_ROW_HEIGHT = 41;
const VIRTUAL_BUFFER_ROWS = 15;

function renderTabel() {
    if (typeof recheckStatusFinalReport === "function") {
        recheckStatusFinalReport();
    }

    const tabelBody = document.getElementById('tabelAbsen')?.getElementsByTagName('tbody')[0];
    if (!tabelBody) return;

    if (Object.keys(dataPegawai).length === 0 || activeYear === null) {
        tabelBody.innerHTML = '<tr><td colspan="12" style="text-align: center; color: var(--text-muted); padding: 28px 0; font-size: 12.5px;">Belum ada data presensi. Silakan upload kalender shift pada menu Impor & Sinkronisasi.</td></tr>';
        return;
    }

    let daysInMonth = new Date(activeYear, activeMonth + 1, 0).getDate();
    // Urutkan pegawai berdasarkan hierarki jabatan: Keamanan PPPK -> Keamanan -> Pengemudi -> Kebersihan -> Pramubakti
    let employeesIds = Object.keys(dataPegawai).sort((a, b) => 
        comparePegawaiByJabatanThenNama(a, b, dataPegawai[a], dataPegawai[b])
    );

    window.tableDataMaster = [];

    employeesIds.forEach(id => {
        let masterPeg = getMasterPegawai(id, dataPegawai[id]);
        let masterNama = masterPeg && masterPeg.nama ? masterPeg.nama : getNamaPegawaiMaster(id, dataPegawai[id]);
        let officialId = masterPeg && masterPeg.id ? masterPeg.id : id;
        dataPegawai[id] = masterNama;
        let masterJabatan = masterPeg && masterPeg.jabatanPosisi ? masterPeg.jabatanPosisi : getJabatanPegawaiMaster(officialId, 'Tenaga Pramubakti', masterNama);

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
            let kelebihanTextRaw = "--";

            let trClass = "";
            if (statusKehadiran === "LJ" || record.shiftTipe === "OFF") {
                trClass = "baris-libur";
                kelebihanText = "Libur";
                kelebihanColor = "teks-libur";
                kelebihanTextRaw = "Libur";
            } else if (statusKehadiran === "CS" || statusKehadiran === "Sakit") {
                trClass = "baris-sakit";
                totalText = "--"; totalColor = "cukup-jam"; kelebihanText = "Sakit"; kelebihanColor = "cukup-jam"; kelebihanTextRaw = "Sakit";
            } else if (statusKehadiran === "CT" || statusKehadiran === "Cuti") {
                trClass = "baris-cuti";
                totalText = "--"; totalColor = "cukup-jam"; kelebihanText = "Cuti"; kelebihanColor = "cukup-jam"; kelebihanTextRaw = "Cuti";
            } else if (statusKehadiran.includes("TK")) {
                trClass = "baris-tk";
            } else if (statusKehadiran.includes("TM") || statusKehadiran.includes("PC")) {
                trClass = "baris-telat-pc";
            }

            if (statusKehadiran.includes("TK")) {
                totalText = "--"; totalColor = "kurang-jam"; kelebihanText = "Tanpa Keterangan"; kelebihanColor = "kurang-jam"; kelebihanTextRaw = "Tanpa Keterangan";
            } else if (statusKehadiran.includes("Lupa Absen")) {
                totalText = "Lupa Absen"; totalColor = "lupa-absen"; kelebihanText = "--"; kelebihanTextRaw = "--";
            } else if (statusKehadiran === "DL" || statusKehadiran === "Dinas Luar") {
                totalText = "--"; totalColor = "cukup-jam"; kelebihanText = "Dinas Luar"; kelebihanColor = "cukup-jam"; kelebihanTextRaw = "Dinas Luar";
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
                            kelebihanTextRaw = kelebihanText;
                        } else {
                            let exc = (actualPulangTime - adjustedTargetPulangTime) / 60000;
                            if (exc > 0) {
                                kelebihanText = `+ ${Math.floor(exc/60)} J ${Math.floor(exc%60)} M`;
                                kelebihanColor = "cukup-jam";
                                totalColor = "cukup-jam";
                                kelebihanTextRaw = kelebihanText;
                            } else {
                                kelebihanText = "0 J 0 M";
                                kelebihanColor = "cukup-jam";
                                totalColor = "cukup-jam";
                                kelebihanTextRaw = "0 J 0 M";
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
                            kelebihanTextRaw = kelebihanText;
                        } else {
                            let exc = (actualPulangMalam - adjustedTargetPulangMalam) / 60000;
                            if (exc > 0) {
                                kelebihanText = `+ ${Math.floor(exc/60)} J ${Math.floor(exc%60)} M`;
                                kelebihanColor = "cukup-jam";
                                totalColor = "cukup-jam";
                                kelebihanTextRaw = kelebihanText;
                            } else {
                                kelebihanText = "0 J 0 M";
                                kelebihanColor = "cukup-jam";
                                totalColor = "cukup-jam";
                                kelebihanTextRaw = "0 J 0 M";
                            }
                        }
                    }
                } else {
                    totalText = "Lupa Absen";
                    totalColor = "lupa-absen";
                    kelebihanTextRaw = "--";
                }
            }

            let hariStr = HARI_INDO[dateObj.getDay()];
            let tanggalStr = `${dStr} ${BULAN_INDO[activeMonth]} ${activeYear}`;
            
            let bgShift = record.shiftTipe === "P" ? "#f1c40f" : (record.shiftTipe === "M" ? "#34495e" : "#bdc3c7");
            let colorShift = record.shiftTipe === "M" ? "white" : "black";

            window.tableDataMaster.push({
                key: key,
                id: officialId,
                rawId: id,
                nama: masterNama,
                jabatan: masterJabatan,
                role: masterJabatan,
                shiftTipe: record.shiftTipe,
                bgShift: bgShift,
                colorShift: colorShift,
                hariStr: hariStr,
                tanggalStr: tanggalStr,
                statusKehadiran: statusKehadiran,
                badgeClass: badgeClass,
                jMasuk: jMasuk,
                jPulang: jPulang,
                totalText: totalText,
                totalColor: totalColor,
                kelebihanText: kelebihanText,
                kelebihanColor: kelebihanColor,
                kelebihanTextRaw: kelebihanTextRaw,
                trClass: trClass
            });
        }
    });

    filterTabel();
    updateAuditBox(); 
    updateFilterKehadiranDropdown();
    cekTombolSimpanSemua();
    simpanStateSesiPresensi();
    updateStateTombolMultiData();
}

function scheduleVirtualWindowRender() {
    if (virtualRenderRAF) cancelAnimationFrame(virtualRenderRAF);
    virtualRenderRAF = requestAnimationFrame(() => {
        renderVirtualWindow(false);
    });
}

function renderVirtualWindow(force = false) {
    const tabelBody = document.getElementById('tabelAbsen')?.getElementsByTagName('tbody')[0];
    if (!tabelBody) return;

    if (!window.tableDataFiltered || window.tableDataFiltered.length === 0) {
        tabelBody.innerHTML = '<tr><td colspan="12" style="text-align: center; color: var(--text-muted); padding: 24px 0; font-size: 12px;">Tidak ada data yang cocok dengan filter pencarian.</td></tr>';
        lastVirtualStartIndex = -1;
        lastVirtualEndIndex = -1;
        return;
    }

    const total = window.tableDataFiltered.length;

    // Jika data sedikit (<= 50 baris), render langsung seluruhnya tanpa spacer
    if (total <= 50) {
        if (!force && lastVirtualStartIndex === 0 && lastVirtualEndIndex === total) return;
        lastVirtualStartIndex = 0;
        lastVirtualEndIndex = total;

        let html = '';
        for (let i = 0; i < total; i++) {
            html += buatHtmlBarisTabel(window.tableDataFiltered[i], i);
        }
        tabelBody.innerHTML = html;
        return;
    }

    // Hitung posisi tabel terhadap viewport & sticky header (~97px)
    const table = document.getElementById('tabelAbsen');
    if (!table) return;
    const rect = table.getBoundingClientRect();
    const stickyHeaderOffset = 97;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

    const scrolledPast = Math.max(0, stickyHeaderOffset - rect.top);
    let startIndex = Math.max(0, Math.floor(scrolledPast / VIRTUAL_ROW_HEIGHT) - VIRTUAL_BUFFER_ROWS);
    const visibleCount = Math.ceil(viewportHeight / VIRTUAL_ROW_HEIGHT) + (VIRTUAL_BUFFER_ROWS * 2);
    let endIndex = Math.min(total, startIndex + visibleCount);

    if (startIndex >= total) {
        startIndex = Math.max(0, total - visibleCount);
        endIndex = total;
    }

    // Hindari re-render jika window index tidak berubah dan bukan force render
    if (!force && startIndex === lastVirtualStartIndex && endIndex === lastVirtualEndIndex) {
        return;
    }

    lastVirtualStartIndex = startIndex;
    lastVirtualEndIndex = endIndex;

    const topSpacerHeight = startIndex * VIRTUAL_ROW_HEIGHT;
    const bottomSpacerHeight = Math.max(0, (total - endIndex) * VIRTUAL_ROW_HEIGHT);

    let html = '';
    if (topSpacerHeight > 0) {
        html += `<tr class="virtual-spacer-row" style="height:${topSpacerHeight}px; border:none !important;"><td colspan="12" style="height:${topSpacerHeight}px; padding:0 !important; margin:0 !important; line-height:0 !important; font-size:0 !important; border:none !important; background:transparent !important;"></td></tr>`;
    }

    for (let i = startIndex; i < endIndex; i++) {
        html += buatHtmlBarisTabel(window.tableDataFiltered[i], i);
    }

    if (bottomSpacerHeight > 0) {
        html += `<tr class="virtual-spacer-row" style="height:${bottomSpacerHeight}px; border:none !important;"><td colspan="12" style="height:${bottomSpacerHeight}px; padding:0 !important; margin:0 !important; line-height:0 !important; font-size:0 !important; border:none !important; background:transparent !important;"></td></tr>`;
    }

    tabelBody.innerHTML = html;
}

function buatHtmlBarisTabel(item, i) {
    let totalWaktuDisplay = (item.totalText === "--" || !item.totalText) 
        ? '<span class="badge-no-record">No record</span>' 
        : item.totalText;

    if (item.key === activeEditingKey) {
        let curShift = item.shiftTipe || "OFF";
        let curStatus = item.statusKehadiran || "";
        let curMasuk = (item.jMasuk && item.jMasuk !== "--") ? item.jMasuk : "";
        let curPulang = (item.jPulang && item.jPulang !== "--") ? item.jPulang : "";
        let isCustomStatus = ['CT','DL','CS','Cuti','Dinas Luar','Sakit'].includes(curStatus);
        let selectedValue = isCustomStatus ? (curStatus.includes('CT') || curStatus === 'Cuti' ? 'CT' : (curStatus.includes('DL') || curStatus === 'Dinas Luar' ? 'DL' : 'CS')) : "";

        return `
            <tr class="sedang-diedit ${item.trClass || ''}" data-key="${item.key}">
                <td class="nomor-urut">${i + 1}</td>
                <td>${item.id}</td>
                <td>${item.nama}</td>
                <td>
                    <select class="edit-shift" onchange="onShiftChangeInEdit(this)" style="font-size: 11px; padding: 2px 4px; height: 24px; border: 1px solid var(--border-subtle); border-radius: 4px;">
                        <option value="P" ${curShift === 'P' ? 'selected' : ''}>P</option>
                        <option value="M" ${curShift === 'M' ? 'selected' : ''}>M</option>
                        <option value="OFF" ${curShift === 'OFF' ? 'selected' : ''}>OFF</option>
                    </select>
                </td>
                <td>${item.hariStr}</td>
                <td>${item.tanggalStr}</td>
                <td>
                    <select class="edit-kehadiran" style="font-size: 11px; padding: 2px 4px; height: 24px; border: 1px solid var(--border-subtle); border-radius: 4px;">
                        <option value="" ${selectedValue === '' ? 'selected' : ''}>-- Otomatis --</option>
                        <option value="TK" ${curStatus === 'TK' ? 'selected' : ''}>TK</option>
                        <option value="CT" ${selectedValue === 'CT' ? 'selected' : ''}>Cuti</option>
                        <option value="DL" ${selectedValue === 'DL' ? 'selected' : ''}>Dinas Luar</option>
                        <option value="CS" ${selectedValue === 'CS' ? 'selected' : ''}>Sakit</option>
                    </select>
                </td>
                <td><input type="time" class="edit-input" value="${curMasuk}" style="font-size: 11px; padding: 1px 3px; height: 24px; border: 1px solid var(--border-subtle); border-radius: 4px; width: 100%; box-sizing: border-box;"></td>
                <td><input type="time" class="edit-input" value="${curPulang}" style="font-size: 11px; padding: 1px 3px; height: 24px; border: 1px solid var(--border-subtle); border-radius: 4px; width: 100%; box-sizing: border-box;"></td>
                <td class="${item.totalColor}">${totalWaktuDisplay}</td>
                <td class="${item.kelebihanColor}">${item.kelebihanText}</td>
                <td>
                    <div class="table-actions-cell">
                        <button class="btn-tbl-action btn-tbl-save" onclick="simpanBarisSingle(this, '${item.key}')" title="Simpan perubahan baris ini">
                            <svg class="icon-svg" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                            Simpan
                        </button>
                        <button class="btn-tbl-action btn-tbl-cancel" onclick="batalEditBarisSingle(this, '${item.key}')" title="Batal edit baris ini">
                            <svg class="icon-svg" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            Batal
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    let isLibur = (item.statusKehadiran === "LJ" || item.shiftTipe === "OFF");
    let jamCells = isLibur 
        ? `<td colspan="2" style="text-align: center;"><span class="badge-jadwal-libur">Jadwal Libur</span></td>`
        : `<td>${item.jMasuk}</td><td>${item.jPulang}</td>`;

    return `
        <tr class="${item.trClass || ''}" data-key="${item.key}">
            <td class="nomor-urut">${i + 1}</td>
            <td style="font-family: ui-monospace, monospace; font-size: 11px;">${item.id}</td>
            <td>${renderCellNamaPegawai(item)}</td>
            <td><span class="shift-badge" style="background:${item.bgShift}; color:${item.colorShift};">${item.shiftTipe || "-"}</span></td>
            <td>${item.hariStr}</td>
            <td>${item.tanggalStr}</td>
            <td><span class="status-badge ${item.badgeClass}">${item.statusKehadiran}</span></td>
            ${jamCells}
            <td class="${item.totalColor}">${totalWaktuDisplay}</td>
            <td class="${item.kelebihanColor}">${item.kelebihanText}</td>
            <td>
                <div class="table-actions-cell">
                    <button class="btn-tbl-action btn-tbl-edit" onclick="editBaris(this, '${item.key}')" title="Edit jam / status baris ini">
                        <svg class="icon-svg" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Edit
                    </button>
                    <button class="btn-tbl-action btn-tbl-reset" onclick="hapusBaris('${item.key}')" title="Kosongkan jam presensi baris ini">
                        <svg class="icon-svg" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                        Reset
                    </button>
                </div>
            </td>
        </tr>
    `;
}

function filterTabel() {
    const filterRole = (document.getElementById('filterRole')?.value || '').trim();
    const filterNama = (document.getElementById('filterNama')?.value || '').toLowerCase().trim();
    const filterTanggal = (document.getElementById('filterTanggal')?.value || '').toLowerCase().trim();
    const filterKehadiran = (document.getElementById('filterKehadiran')?.value || '').trim();

    if (!window.tableDataMaster) window.tableDataMaster = [];

    // Filter array di memori tanpa manipulasi DOM berulang (hemat RAM dan respon instan)
    window.tableDataFiltered = window.tableDataMaster.filter(item => {
        if (filterRole) {
            const jItem = item.jabatan || item.role || '';
            const normJ = getJabatanPegawaiMaster(item.id, jItem);
            if (normJ !== filterRole && jItem !== filterRole) return false;
        }
        if (filterNama && !item.nama.toLowerCase().includes(filterNama)) return false;
        if (filterTanggal && !item.tanggalStr.toLowerCase().includes(filterTanggal)) return false;
        if (filterKehadiran && item.statusKehadiran !== filterKehadiran) return false;
        return true;
    });

    renderVirtualWindow(true);

    if (!isVirtualScrollAttached) {
        window.addEventListener('scroll', scheduleVirtualWindowRender, { passive: true });
        window.addEventListener('resize', scheduleVirtualWindowRender, { passive: true });
        isVirtualScrollAttached = true;
    }
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
    const file = fileInput ? fileInput.files[0] : null;
    if (!file) { alert("Silakan pilih file Excel Jadwal Shift terlebih dahulu."); return; }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rawAoA = XLSX.utils.sheet_to_json(worksheet, {header: 1, defval: ""});

            if (!rawAoA || rawAoA.length === 0) {
                alert("File Excel jadwal kosong atau tidak terbaca.");
                return;
            }

            globalRekap = {}; 
            dataPegawai = {}; 
            isFingerprintUploaded = false; 
            lastRekapState = null;

            const btnUndo = document.getElementById('btnUndoMassal');
            if (btnUndo) btnUndo.disabled = true;
            const secManual = document.getElementById('sectionManualWrapper');
            if (secManual) secManual.style.display = 'none';

            let tahun = new Date().getFullYear();
            let bulan = new Date().getMonth();
            let foundMonth = false;
            let day1ColIndex = -1;
            let currentSectionRole = "STAFF";

            const bulanMap = {
                'JANUARI': 0, 'JANUARY': 0, 'JAN': 0,
                'FEBRUARI': 1, 'FEBRUARY': 1, 'FEB': 1,
                'MARET': 2, 'MARCH': 2, 'MAR': 2,
                'APRIL': 3, 'APR': 3,
                'MEI': 4, 'MAY': 4,
                'JUNI': 5, 'JUNE': 5, 'JUN': 5,
                'JULI': 6, 'JULY': 6, 'JUL': 6,
                'AGUSTUS': 7, 'AUGUST': 7, 'AGU': 7, 'AGT': 7, 'AUG': 7,
                'SEPTEMBER': 8, 'SEP': 8, 'SEPT': 8,
                'OKTOBER': 9, 'OCTOBER': 9, 'OKT': 9, 'OCT': 9,
                'NOVEMBER': 10, 'NOV': 10,
                'DESEMBER': 11, 'DECEMBER': 11, 'DES': 11, 'DEC': 11
            };

            for (let i = 0; i < rawAoA.length; i++) {
                let row = rawAoA[i] || [];

                // 1. Ekstraksi Periode Bulan & Tahun dari header (mis: "PERIODE: JUNI 2026")
                if (!foundMonth) {
                    for (let c = 0; c < row.length; c++) {
                        let cellVal = row[c] ? row[c].toString().trim() : "";
                        if (!cellVal) continue;
                        let cellUpper = cellVal.toUpperCase();
                        if (cellUpper.includes("PERIODE") || cellUpper.includes("BULAN") || /\b202\d\b/.test(cellUpper)) {
                            for (let [bName, bIdx] of Object.entries(bulanMap)) {
                                let reMonthYear = new RegExp(`\\b${bName}\\b.*?\\b(20[2-3]\\d)\\b`, 'i');
                                let reYearMonth = new RegExp(`\\b(20[2-3]\\d)\\b.*?\\b${bName}\\b`, 'i');
                                let m1 = cellUpper.match(reMonthYear);
                                if (m1) {
                                    bulan = bIdx;
                                    tahun = parseInt(m1[1]);
                                    setBulanAktif(new Date(tahun, bulan, 1));
                                    foundMonth = true;
                                    break;
                                }
                                let m2 = cellUpper.match(reYearMonth);
                                if (m2) {
                                    tahun = parseInt(m2[1]);
                                    bulan = bIdx;
                                    setBulanAktif(new Date(tahun, bulan, 1));
                                    foundMonth = true;
                                    break;
                                }
                            }
                        }
                        if (foundMonth) break;
                    }
                }

                // 2. Deteksi Letak Kolom Tanggal 1 (Header Angka 1, 2, 3...)
                if (day1ColIndex === -1) {
                    for (let c = 0; c < row.length; c++) {
                        let v = row[c] ? row[c].toString().trim() : "";
                        let vNext = (c + 1 < row.length && row[c + 1]) ? row[c + 1].toString().trim() : "";
                        if (v === "1" && vNext === "2") {
                            day1ColIndex = c;
                            break;
                        }
                    }
                }

                // 3. Deteksi Baris Pembatas Kategori/Jabatan (misal "SATPAM", "STAFF", dll)
                let nonEmptyCells = row.map(x => (x !== null && x !== undefined ? x.toString().trim() : "")).filter(x => x.length > 0);
                if (nonEmptyCells.length === 1) {
                    let t = nonEmptyCells[0].toUpperCase();
                    if (t.includes("SATPAM") || t.includes("KEAMANAN") || t.includes("SECURITY")) currentSectionRole = "SATPAM";
                    else if (t.includes("STAFF")) currentSectionRole = "STAFF";
                    else if (t.includes("KEBERSIHAN") || t.includes("CLEANING")) currentSectionRole = "Tenaga Kebersihan";
                    else if (t.includes("PRAMUBAKTI")) currentSectionRole = "Tenaga Pramubakti";
                    else if (t.includes("PENGEMUDI") || t.includes("DRIVER")) currentSectionRole = "Tenaga Pengemudi";
                    else if (t.includes("PPPK") || t.includes("ASN")) currentSectionRole = "ASN PPPK";
                    else if (t.includes("MAGANG")) currentSectionRole = "MAGANG";
                }

                // 4. Deteksi Baris Data Pegawai
                let colA = row[0] ? row[0].toString().trim() : "";
                let colB = row[1] ? row[1].toString().trim() : "";
                let colC = row[2] ? row[2].toString().trim() : "";
                let colD = row[3] ? row[3].toString().trim() : "";

                let idPegawai = "";
                let namaPegawai = "";
                let rolePegawai = currentSectionRole;

                // Format A (Sesuai Screenshot): Col A Kategori (SATPAM), Col B No (1), Col C ID (140024), Col D Nama (Pierre Pentury)
                if (!isNaN(parseInt(colB)) && /^\d{4,10}$/.test(colC) && colD !== "" && colD !== "Hari" && colD !== "Tanggal") {
                    idPegawai = colC;
                    namaPegawai = colD;
                    if (colA && isNaN(parseInt(colA))) {
                        let rUpper = colA.toUpperCase();
                        if (rUpper.includes("SATPAM") || rUpper.includes("KEAMANAN")) rolePegawai = "SATPAM";
                        else if (rUpper.includes("STAFF")) rolePegawai = "STAFF";
                        else if (rUpper.includes("KEBERSIHAN")) rolePegawai = "Tenaga Kebersihan";
                        else if (rUpper.includes("PRAMUBAKTI")) rolePegawai = "Tenaga Pramubakti";
                        else if (rUpper.includes("PENGEMUDI") || rUpper.includes("DRIVER")) rolePegawai = "Tenaga Pengemudi";
                        else if (rUpper.includes("PPPK") || rUpper.includes("ASN")) rolePegawai = "ASN PPPK";
                        else if (rUpper.includes("MAGANG")) rolePegawai = "MAGANG";
                        else rolePegawai = colA;
                    }
                }
                // Format B: Col A No (1), Col B ID (140024), Col C Nama
                else if (!isNaN(parseInt(colA)) && /^\d{4,10}$/.test(colB) && colC !== "" && colC !== "Hari" && colC !== "Tanggal") {
                    idPegawai = colB;
                    namaPegawai = colC;
                }
                // Format C: Pencarian Cerdas Kolom ID (4-10 Digit) diikuti Nama
                else {
                    for (let c = 0; c < Math.min(row.length, 5); c++) {
                        let val = row[c] ? row[c].toString().trim() : "";
                        let nextVal = (c + 1 < row.length && row[c + 1]) ? row[c + 1].toString().trim() : "";
                        if (/^\d{4,10}$/.test(val) && nextVal.length >= 2 && nextVal !== "Tanggal" && nextVal !== "Hari" && isNaN(parseInt(nextVal))) {
                            idPegawai = val;
                            namaPegawai = nextVal;
                            break;
                        }
                    }
                }

                // Jika data pegawai ditemukan, bangun rekap shift bulanan
                if (idPegawai && namaPegawai) {
                    let masterNama = getNamaPegawaiMaster(idPegawai, namaPegawai);
                    let masterJabatan = getJabatanPegawaiMaster(idPegawai, rolePegawai);
                    dataPegawai[idPegawai] = masterNama;
                    let daysInMonth = new Date(tahun, bulan + 1, 0).getDate();
                    let startCol = (day1ColIndex !== -1) ? day1ColIndex : 4;

                    for (let d = 1; d <= daysInMonth; d++) {
                        let colIdx = startCol + (d - 1);
                        let shiftCode = (colIdx < row.length && row[colIdx]) ? row[colIdx].toString().trim().toUpperCase() : "";
                        let isoDate = `${tahun}-${String(bulan + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        let key = idPegawai + "_" + isoDate;

                        let sTipe = "OFF";
                        let mStat = null;

                        if (shiftCode === "P" || shiftCode === "1" || shiftCode === "PAGI") {
                            sTipe = "P";
                        } else if (shiftCode === "M" || shiftCode === "MLM" || shiftCode === "MALAM" || shiftCode === "3") {
                            sTipe = "M";
                        } else if (shiftCode === "S" || shiftCode === "SIANG" || shiftCode === "2") {
                            if (rolePegawai.toUpperCase().includes("SATPAM") || rolePegawai.toUpperCase().includes("KEAMANAN")) sTipe = "M";
                            else { sTipe = "CS"; mStat = "CS"; }
                        } else if (shiftCode === "CT" || shiftCode === "CUTI") {
                            sTipe = "CT";
                            mStat = "CT";
                        } else if (shiftCode === "CS" || shiftCode === "SAKIT") {
                            sTipe = "CS";
                            mStat = "CS";
                        } else if (shiftCode === "DL" || shiftCode === "DINAS") {
                            sTipe = "DL";
                            mStat = "DL";
                        } else if (shiftCode === "TK" || shiftCode === "ALPA") {
                            sTipe = "TK";
                            mStat = "TK";
                        } else if (shiftCode === "OFF" || shiftCode === "LIBUR" || shiftCode === "LJ") {
                            sTipe = "OFF";
                        } else if (shiftCode === "") {
                            let dow = new Date(tahun, bulan, d).getDay();
                            if (rolePegawai.toUpperCase().includes("SATPAM") || rolePegawai.toUpperCase().includes("KEAMANAN")) sTipe = "OFF";
                            else sTipe = (dow === 0 || dow === 6) ? "OFF" : "P";
                        }

                        globalRekap[key] = {
                            id: idPegawai,
                            nama: masterNama,
                            tanggal: isoDate,
                            shiftTipe: sTipe,
                            waktuMasuk: null,
                            waktuPulang: null,
                            manualStatus: mStat,
                            role: masterJabatan
                        };
                    }
                }
            }

            if (!foundMonth) setBulanAktif(new Date());

            const totalPegawaiLoaded = Object.keys(dataPegawai).length;
            if (totalPegawaiLoaded === 0) {
                alert("Peringatan: Tidak ditemukan baris data Pegawai dan PPNPN yang valid pada file Excel. Pastikan file memiliki nomor, ID Pegawai, dan Nama Pegawai.");
                return;
            }

            if (fileInput) fileInput.value = "";
            updateCheckboxPegawaiManual();
            updateFilterNamaDropdown();

            const secPresensi = document.getElementById('sectionPresensi');
            if (secPresensi) secPresensi.style.display = 'block';

            renderTabel();
            alert(`Jadwal shift berhasil dibuat untuk ${totalPegawaiLoaded} pegawai (${BULAN_INDO[bulan]} ${tahun}). Silakan unggah file data fingerprint untuk melengkapi jam kehadiran.`);

        } catch (error) {
            console.error("Error membaca file jadwal:", error);
            alert("Mohon maaf, terjadi kendala saat membaca file jadwal: " + error.message);
        }
    };
    reader.readAsArrayBuffer(file);
}

// ==========================================================================
// FITUR UNDUH TEMPLATE EXCEL JADWAL SHIFT RESMI (SESUAI CONTOH KANREG XIV)
// ==========================================================================
function unduhTemplateJadwalExcel() {
    if (typeof XLSX === "undefined") {
        alert("Pustaka XLSX belum termuat. Silakan periksa koneksi internet Anda.");
        return;
    }

    let targetYear = (typeof activeYear !== "undefined" && activeYear) ? activeYear : new Date().getFullYear();
    let targetMonth = (typeof activeMonth !== "undefined" && activeMonth !== null) ? activeMonth : new Date().getMonth();
    let namaBulanStr = BULAN_INDO[targetMonth] ? BULAN_INDO[targetMonth].toUpperCase() : "JUNI";
    let periodeLabel = `${namaBulanStr} ${targetYear}`;

    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const hariShort = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    const aoa = [];

    // Baris 1: Judul Utama
    aoa.push(["", "", "", "KANTOR REGIONAL XIV BKN MANOKWARI"]);
    // Baris 2: Spasi kosong
    aoa.push([]);
    // Baris 3: Sub-Judul
    aoa.push(["", "", "", "JADWAL PPNPN"]);
    // Baris 4: Periode
    aoa.push(["", "", "", `PERIODE: ${periodeLabel}`]);

    // Baris 5: Header Tanggal (1..31)
    const row5 = ["(Rumus)", "No", "ID\nPPNPN", "Tanggal"];
    for (let d = 1; d <= 31; d++) {
        row5.push(d);
    }
    aoa.push(row5);

    // Baris 6: Header Nama Hari
    const row6 = ["Kode", "", "", "Hari"];
    for (let d = 1; d <= 31; d++) {
        if (d <= daysInMonth) {
            let dow = new Date(targetYear, targetMonth, d).getDay();
            row6.push(hariShort[dow]);
        } else {
            row6.push("Min");
        }
    }
    aoa.push(row6);

    // Dapatkan data pegawai jika ada di cache
    const pegawaiMaster = (window.cachedListPegawai && window.cachedListPegawai.length > 0)
        ? window.cachedListPegawai.filter(p => p.status === "Aktif" || !p.status)
        : [];

    const satpamList = pegawaiMaster.filter(p => (p.jabatanPosisi || '').toUpperCase().includes("KEAMANAN") || (p.jobSet || '').toUpperCase().includes("SATPAM"));
    const staffList = pegawaiMaster.filter(p => !satpamList.includes(p));

    // SECTION SATPAM
    aoa.push(["", "", "", "SATPAM"]);
    aoa.push(["SATPAM"]);

    if (satpamList.length > 0) {
        satpamList.forEach((peg, idx) => {
            const rowData = ["SATPAM", idx + 1, peg.id, peg.nama];
            for (let d = 1; d <= 31; d++) {
                if (d > daysInMonth) {
                    rowData.push("OFF");
                } else {
                    // Pola rotasi shift satpam 4 hari kerja 2 hari libur
                    let rotasi = (idx * 3 + d) % 6;
                    if (rotasi === 4 || rotasi === 5) rowData.push("OFF");
                    else if (rotasi === 0 || rotasi === 1) rowData.push("M");
                    else rowData.push("P");
                }
            }
            aoa.push(rowData);
        });
    } else {
        // Sample Satpam sesuai contoh screenshot user
        const sampleSatpam = [
            { no: 1, id: "140024", nama: "Pierre Pentury", shifts: ["M","M","M","M","OFF","OFF","P","P","P","P","OFF","OFF","P","P","M","M","OFF","OFF","P","P","P","P","OFF","OFF","M","M","M","M","OFF","OFF","OFF"] },
            { no: 2, id: "140013", nama: "Sander Mamoribo", shifts: ["M","M","M","M","OFF","OFF","P","P","P","P","OFF","OFF","P","P","M","M","OFF","OFF","P","P","P","P","OFF","OFF","M","M","M","M","OFF","OFF","OFF"] },
            { no: 3, id: "140008", nama: "Fernando Maruanaya", shifts: ["P","P","P","P","OFF","OFF","M","M","M","M","OFF","OFF","M","M","P","P","OFF","OFF","M","M","M","M","OFF","OFF","P","P","P","P","OFF","OFF","OFF"] },
            { no: 4, id: "140020", nama: "Victor Lam Awom", shifts: ["P","P","P","P","OFF","OFF","M","M","M","M","OFF","OFF","M","M","P","P","OFF","OFF","M","M","M","M","OFF","OFF","P","P","P","P","OFF","OFF","OFF"] }
        ];
        sampleSatpam.forEach(item => {
            const r = ["SATPAM", item.no, item.id, item.nama, ...item.shifts];
            aoa.push(r);
        });
    }

    // SECTION STAFF / NON-SATPAM
    aoa.push([]);
    aoa.push(["", "", "", "STAFF"]);
    aoa.push(["STAFF"]);

    if (staffList.length > 0) {
        staffList.forEach((peg, idx) => {
            let roleTag = peg.jobSet || "STAFF";
            const rowData = [roleTag, idx + 1, peg.id, peg.nama];
            for (let d = 1; d <= 31; d++) {
                if (d > daysInMonth) {
                    rowData.push("OFF");
                } else {
                    let dow = new Date(targetYear, targetMonth, d).getDay();
                    rowData.push((dow === 0 || dow === 6) ? "OFF" : "P");
                }
            }
            aoa.push(rowData);
        });
    } else {
        // Sample Staff
        const sampleStaff = [
            { no: 1, id: "140011", nama: "Agustinus Komok Silli" },
            { no: 2, id: "140015", nama: "Siti Rahma" },
            { no: 3, id: "140018", nama: "Hasanuddin" }
        ];
        sampleStaff.forEach(item => {
            const r = ["STAFF", item.no, item.id, item.nama];
            for (let d = 1; d <= 31; d++) {
                if (d > daysInMonth) {
                    r.push("OFF");
                } else {
                    let dow = new Date(targetYear, targetMonth, d).getDay();
                    r.push((dow === 0 || dow === 6) ? "OFF" : "P");
                }
            }
            aoa.push(r);
        });
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Konfigurasi Lebar Kolom
    ws['!cols'] = [
        { wch: 10 }, // A: (Rumus) / Kode / SATPAM
        { wch: 5 },  // B: No
        { wch: 14 }, // C: ID PPNPN
        { wch: 28 }, // D: Tanggal / Hari / Nama Pegawai
    ];
    for (let d = 1; d <= 31; d++) {
        ws['!cols'].push({ wch: 6 }); // E..AI
    }

    // Konfigurasi Merge Cells
    ws['!merges'] = [
        { s: { r: 0, c: 3 }, e: { r: 0, c: 15 } }, // Title
        { s: { r: 2, c: 3 }, e: { r: 2, c: 10 } }, // Subtitle
        { s: { r: 3, c: 3 }, e: { r: 3, c: 10 } }, // Periode
        { s: { r: 4, c: 1 }, e: { r: 5, c: 1 } },  // No
        { s: { r: 4, c: 2 }, e: { r: 5, c: 2 } },  // ID PPNPN
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jadwal PPNPN");

    const fileName = `Template_Jadwal_Shift_PPNPN_${periodeLabel.replace(/\s+/g, '_')}.xlsx`;
    XLSX.writeFile(wb, fileName);
}

window.unduhTemplateJadwalExcel = unduhTemplateJadwalExcel;


function prosesExcel() {
    const fileInput = document.getElementById('uploadExcel');
    const file = fileInput.files[0];
    if (!file) { alert("Silakan pilih file Excel Fingerprint terlebih dahulu."); return; }

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
        const secManual = document.getElementById('sectionManualWrapper');
        if (secManual) secManual.style.display = 'block';
        renderTabel();
        alert("Data mesin absensi berhasil diintegrasikan dengan jadwal presensi.");
    };
    reader.readAsArrayBuffer(file);
}

function tambahDataManual() {
    const checkedCheckboxes = document.querySelectorAll('.manual-pegawai-checkbox:checked');
    const tanggal = document.getElementById('tanggalManual').value;
    const jam = document.getElementById('jamManual').value;
    const ket = document.getElementById('ketManual').value;

    if (checkedCheckboxes.length === 0 || !tanggal || !jam) { 
        alert("Silakan pilih minimal satu pegawai, serta pastikan tanggal dan jam telah terisi."); 
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
    alert(`Data presensi untuk ${successCount} pegawai terpilih berhasil diperbarui.\n\n(Catatan: Anda dapat menggunakan tombol 'Undo' jika ingin membatalkan perubahan terakhir).`);
}

function undoUpdateMassal() {
    if (!lastRekapState) {
        alert("Belum ada riwayat perubahan sebelumnya yang dapat dibatalkan.");
        return;
    }

    if (confirm("Apakah Anda ingin membatalkan perubahan presensi dan mengembalikannya ke posisi sebelumnya?")) {
        globalRekap = JSON.parse(JSON.stringify(lastRekapState));
        lastRekapState = null; 
        document.getElementById('btnUndoMassal').disabled = true; 
        renderTabel();
        alert("Perubahan data presensi berhasil dibatalkan dan dikembalikan ke posisi semula.");
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

function stripHtml(str) {
    if (!str) return "";
    return String(str).replace(/<[^>]*>/g, '').trim();
}

function cleanStatusForExport(statusStr) {
    if (!statusStr) return "";
    return statusStr.replace("Lupa Absen + ", "").replace("Lupa Absen", "").trim();
}

function getVisibleData() {
    if (window.tableDataFiltered && window.tableDataFiltered.length > 0) {
        return window.tableDataFiltered.map((item, idx) => ({
            "No": String(idx + 1),
            "ID Pegawai": item.id || "",
            "Nama Pegawai": item.nama || "",
            "Shift": item.shiftTipe || "-",
            "Hari": item.hariStr || "",
            "Tanggal": item.tanggalStr || "",
            "Kehadiran": item.statusKehadiran || "",
            "Jam Masuk": item.jMasuk || "--",
            "Jam Pulang": item.jPulang || "--",
            "Total Waktu": item.totalText || "0 J 0 M",
            "Ket/Kelebihan": stripHtml(item.kelebihanTextRaw || item.kelebihanText || "0 M")
        }));
    }
    const rows = document.querySelectorAll('#tabelAbsen tbody tr');
    let data = [];
    rows.forEach(row => {
        if (row.style.display !== 'none' && row.cells.length >= 11) {
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
                "Ket/Kelebihan": stripHtml(row.cells[10].innerText)
            });
        }
    });
    return data;
}

function getAllData() {
    if (window.tableDataMaster && window.tableDataMaster.length > 0) {
        return window.tableDataMaster.map((item, idx) => ({
            "No": String(idx + 1),
            "ID Pegawai": item.id || "",
            "Nama Pegawai": item.nama || "",
            "Shift": item.shiftTipe || "-",
            "Hari": item.hariStr || "",
            "Tanggal": item.tanggalStr || "",
            "Kehadiran": item.statusKehadiran || "",
            "Jam Masuk": item.jMasuk || "--",
            "Jam Pulang": item.jPulang || "--",
            "Total Waktu": item.totalText || "0 J 0 M",
            "Ket/Kelebihan": stripHtml(item.kelebihanTextRaw || item.kelebihanText || "0 M")
        }));
    }
    const rows = document.querySelectorAll('#tabelAbsen tbody tr');
    let data = [];
    rows.forEach(row => {
        if (row.cells.length >= 11) {
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
                "Ket/Kelebihan": stripHtml(row.cells[10].innerText)
            });
        }
    });
    return data;
}

function exportSemuaExcel() {
    if (!confirm("Apakah Anda ingin mengunduh seluruh data presensi yang sedang ditampilkan ke dalam format Excel?")) return;
    const data = getVisibleData();
    if(data.length === 0) return alert("Belum ada data presensi yang dapat diekspor.");
    generateExcel(data, `Rekap_Kehadiran_Semua_${namaBulanTahun.replace(" ", "_")}`);
}

function previewSemuaPDF() {
    if (!confirm("Apakah Anda ingin menampilkan pratinjau PDF untuk seluruh data presensi yang sedang aktif?")) return;
    const data = getVisibleData();
    if(data.length === 0) return alert("Belum ada data presensi yang dapat ditampilkan pratinjaunya.");
    
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
    if(checkboxes.length === 0) return alert("Silakan pilih minimal satu pegawai di daftar terlebih dahulu.");
    
    let pesanAksi = (tipe === 'excel') ? "Export Excel Terpilih" : "Export PDF Terpilih";
    if (!confirm(`Apakah Anda ingin memproses ${pesanAksi} untuk ${checkboxes.length} pegawai yang dipilih?`)) return;

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
    let userUnit = (window.currentUser && window.currentUser.unitKerja) ? window.currentUser.unitKerja : "Kanreg XIV BKN";
    if (userUnit === "Kanreg XIV") userUnit = "Kanreg XIV BKN";
    if (userUnit === "UPT Sorong") userUnit = "UPT BKN Sorong";
    const headerInstansi = (userUnit === "UPT BKN Sorong") ? "UPT BKN Sorong" : "Kanreg XIV BKN";

    const wsData = [
        [headerInstansi],
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
    let userUnitSingle = (window.currentUser && window.currentUser.unitKerja) ? window.currentUser.unitKerja : "Kanreg XIV BKN";
    if (userUnitSingle === "Kanreg XIV") userUnitSingle = "Kanreg XIV BKN";
    if (userUnitSingle === "UPT Sorong") userUnitSingle = "UPT BKN Sorong";
    let headerSingle = (userUnitSingle === "UPT BKN Sorong") ? "UPT BKN Sorong" : "Kanreg XIV BKN";
    doc.text(`${headerSingle} | Periode: ${namaBulanTahun}`, startTextX, 14);

    let nonLjCount = 0;
    let totalWaktuMnt = 0;
    let totalKelebihanMnt = 0;

    let dataPDF = data.map(item => {
        let statusClean = cleanStatusForExport(item["Kehadiran"]);
        if (statusClean !== "LJ" && statusClean !== "Libur") {
            nonLjCount++;
        }
        let kelClean = stripHtml(item["Ket/Kelebihan"]);
        totalWaktuMnt += parseTimeTextToMinutes(item["Total Waktu"]);
        totalKelebihanMnt += parseKelebihanTextToMinutes(kelClean);

        return { ...item, "Kehadiran": statusClean, "Ket/Kelebihan": kelClean };
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
        alert("Belum ada data presensi yang dapat diekspor.");
        return;
    }

    const yakin = confirm("Apakah Anda ingin membuka pratinjau PDF Rekap Kehadiran Pegawai (Landscape)?");
    if (!yakin) return;

    // Persiapkan Data Pegawai & Jumlah Hari dalam Bulan (misal 31 hari untuk Juli 2026)
    const totalHari = 31; // Bisa dibuat dinamis sesuai bulan berjalan
    const listNamaPegawai = Object.keys(globalRekap);

    generatePDFLandscapeChunked(listNamaPegawai, globalRekap, totalHari);
}

function generatePDFLandscapeChunked(groupedByRole, sortedRoleKeys, totalHari, tipeSpesimen = "manual") {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("Komponen pembuat PDF (jsPDF) belum siap. Silakan muat ulang halaman.");
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

            // Baris Header Jabatan Role
            const totalCols = 3 + ((chunk.end - chunk.start + 1) * 2);
            bodyRows.push([{
                content: `JABATAN: ${roleName}`,
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
                            // 💡 PERBAIKAN: Baca dari itemHari.manualStatus (properti asli dari tabel edit)
                            manualStatus: itemHari.manualStatus || itemHari.keterangan || itemHari.status || null
                        };

                        if (typeof getStatusKehadiran === "function") {
                            statusText = getStatusKehadiran(recordForStatus);
                        } else {
                            statusText = (masuk !== "--" || pulang !== "--") ? "HN" : "TK";
                        }
                    }

                    // 💡 Paksa Jam Masuk & Pulang menjadi "--" berdasarkan status
                    const listStatusKosong = ["CS", "CT", "DL", "TK", "LJ", "Cuti", "Sakit", "Dinas Luar", "Libur", "OFF", "Off"];
                    if (listStatusKosong.some(statusKondisi => statusText.includes(statusKondisi))) {
                        masuk = "--";
                        pulang = "--";
                    }

                    // Menentukan warna background sel
                    // 💡 PENENTUAN WARNA SOFT (PASTEL) UNTUK STATUS PRESENSI HARIAN
                    if (["LJ", "Libur", "Off", "OFF"].includes(statusText) || shift === "OFF" || shift === "Off") {
                        bgStatus = [224, 224, 224]; // Abu-abu Soft
                        if (statusText === "TK") statusText = "LJ";
                    } else if (statusText === "HN") {
                        bgStatus = [255, 255, 255]; // Putih Bersih
                    } else if (statusText === "CS" || statusText === "Sakit") {
                        bgStatus = [207, 226, 255]; // Biru Soft (Soft Blue)
                    } else if (statusText === "CT" || statusText === "Cuti") {
                        bgStatus = [84, 235, 147]; // Hijau Soft (Soft Green)
                    } else if (statusText === "DL" || statusText === "Dinas Luar") {
                        bgStatus = [255, 228, 196]; // Oranye Soft (Soft Orange)
                    } else if (statusText.includes("TK")) {
                        bgStatus = [255, 119, 119]; // Merah Soft (Soft Red)
                    } else {
                        bgStatus = [255, 243, 205]; // Kuning Soft (Keterlambatan/Lupa Absen)
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
    let userUnitLandscape = (window.currentUser && window.currentUser.unitKerja) ? window.currentUser.unitKerja : "Kanreg XIV BKN";
    if (userUnitLandscape === "Kanreg XIV") userUnitLandscape = "Kanreg XIV BKN";
    if (userUnitLandscape === "UPT Sorong") userUnitLandscape = "UPT BKN Sorong";
    let footerInstansi = (userUnitLandscape === "UPT BKN Sorong") ? "UPT BKN Sorong" : "Kanreg XIV BKN";

    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(127, 140, 141);
        doc.text(`Laporan Presensi Pegawai v.15 - ${footerInstansi}`, 6, doc.internal.pageSize.getHeight() - 3.5);
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
                    content: `JABATAN: ${roleName}`,
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
                            // 💡 PERBAIKAN: Baca dari itemHari.manualStatus
                            manualStatus: itemHari.manualStatus || itemHari.keterangan || itemHari.status || null
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
            doc.text("Kepala UPT BKN Sorong", alignX, finalY);
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
        activeEditingKey = null;
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
            alert("Belum ada data presensi yang tersedia untuk laporan.");
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

            let idPpnP = String(item.idPpnPN || item.idPegawai || item.id || "").trim();
            let masterNama = getNamaPegawaiMaster(idPpnP, namaClean);
            let role = getJabatanPegawaiMaster(idPpnP, item.role || item.kategori || item.jabatan || "STAFF");
            let uniqueKey = idPpnP || masterNama.toUpperCase();

            if (!pegawaimap[uniqueKey]) {
                pegawaimap[uniqueKey] = {
                    idPpnPN: idPpnP || "-",
                    namaLengkap: masterNama,
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

        const availableRoles = Object.keys(tempGroupedByRole).sort((a, b) => getJabatanSortRank(a) - getJabatanSortRank(b));
        if (availableRoles.length === 0) {
            alert("Tidak ditemukan kategori pegawai pada data yang dipilih.");
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
        alert("Mohon maaf, terjadi kendala saat memproses pratinjau PDF:\n" + err.message);
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
        alert("Silakan pilih minimal satu kategori pegawai untuk diekspor.");
        return;
    }

    // Ambil list role terpilih dan urutkan sesuai hierarki jabatan
    const selectedRoleKeys = Array.from(checkedBoxes).map(cb => cb.value).sort((a, b) => getJabatanSortRank(a) - getJabatanSortRank(b));

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
    const yakin = confirm(`Apakah Anda ingin membuka pratinjau PDF Rekap Kehadiran Pegawai (Landscape)?\n\n• Kategori: ${daftarRoleStr}\n• Spesimen TTD: ${jenisTTDStr}`);
    
    if (!yakin) return;

    // Tutup Modal
    tutupModalKategoriPdf();

    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("Komponen pembuat PDF (jsPDF) belum siap. Silakan muat ulang halaman.");
        return;
    }

    const totalHari = 31; // Jumlah hari dalam bulan berjalan

    // Jalankan Generator PDF dengan membawa parameter tipeSpesimen
    generatePDFLandscapeChunked(filteredGroupedByRole, selectedRoleKeys, totalHari, tipeSpesimen);
}

// =========================================================
// UNIVERSAL MODAL & DRAWER CLOSE (CLICK OUTSIDE & ESC KEY)
// =========================================================
window.addEventListener('click', (e) => {
    // 1. Tutup modal jika user mengklik area backdrop/overlay di luar modal content
    if (e.target && (e.target.classList.contains('modal-backdrop') || e.target.classList.contains('modal-overlay'))) {
        // Pengecualian: jangan tutup modal proses restore progress otomatis
        if (e.target.id === 'modalRestoreProgress') return;

        const id = e.target.id;
        if (id === 'modalLogout' && typeof tutupModalLogout === 'function') tutupModalLogout();
        else if (id === 'modalLogoutAdmin' && typeof tutupModalLogoutAdmin === 'function') tutupModalLogoutAdmin();
        else if (id === 'modalRestore' && typeof tutupModalRestore === 'function') tutupModalRestore();
        else if (id === 'modalPegawaiManual' && typeof tutupModalPegawaiManual === 'function') tutupModalPegawaiManual();
        else if (id === 'modalBulkText' && typeof tutupModalBulkText === 'function') tutupModalBulkText();
        else if (id === 'modalFinalHistory' && typeof tutupModalFinalHistory === 'function') tutupModalFinalHistory();
        else if (id === 'modalPilihKategori' && typeof tutupModalKategoriPdf === 'function') tutupModalKategoriPdf();
        else if (id === 'modalHapusHistory' && typeof tutupModalHapusHistory === 'function') tutupModalHapusHistory();
        else if (id === 'modalEditRekapPegawai' && typeof tutupModalEditRekap === 'function') tutupModalEditRekap();
        else if (id === 'modalMasterPegawai' && typeof tutupModalMasterPegawai === 'function') tutupModalMasterPegawai();
        else if (id === 'modalSisaCuti' && typeof tutupModalSisaCuti === 'function') tutupModalSisaCuti();
        else {
            e.target.style.display = 'none';
        }
    }
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
        // 1. Tutup child modal bulk text terlebih dahulu jika sedang terbuka
        const bulkText = document.getElementById('modalBulkText');
        if (bulkText && bulkText.style.display !== 'none' && typeof tutupModalBulkText === 'function') {
            tutupModalBulkText();
            return;
        }

        // 2. Tutup modal lain yang aktif
        const openModal = Array.from(document.querySelectorAll('.modal-backdrop, .modal-overlay')).find(el => {
            return el.id !== 'modalRestoreProgress' && el.style.display !== 'none' && window.getComputedStyle(el).display !== 'none';
        });

        if (openModal) {
            const id = openModal.id;
            if (id === 'modalLogout' && typeof tutupModalLogout === 'function') tutupModalLogout();
            else if (id === 'modalLogoutAdmin' && typeof tutupModalLogoutAdmin === 'function') tutupModalLogoutAdmin();
            else if (id === 'modalRestore' && typeof tutupModalRestore === 'function') tutupModalRestore();
            else if (id === 'modalPegawaiManual' && typeof tutupModalPegawaiManual === 'function') tutupModalPegawaiManual();
            else if (id === 'modalFinalHistory' && typeof tutupModalFinalHistory === 'function') tutupModalFinalHistory();
            else if (id === 'modalPilihKategori' && typeof tutupModalKategoriPdf === 'function') tutupModalKategoriPdf();
            else if (id === 'modalHapusHistory' && typeof tutupModalHapusHistory === 'function') tutupModalHapusHistory();
            else if (id === 'modalEditRekapPegawai' && typeof tutupModalEditRekap === 'function') tutupModalEditRekap();
            else if (id === 'modalMasterPegawai' && typeof tutupModalMasterPegawai === 'function') tutupModalMasterPegawai();
            else if (id === 'modalSisaCuti' && typeof tutupModalSisaCuti === 'function') tutupModalSisaCuti();
            else openModal.style.display = 'none';
            return;
        }

        // 3. Tutup Side Drawer Massal jika terbuka
        const drawer = document.getElementById('sidePanelMassal');
        if (drawer && drawer.classList.contains('show') && typeof toggleSidePanelMassal === 'function') {
            toggleSidePanelMassal(false);
        }
    }
});

// ==========================================================================
// TAB REKAP KEHADIRAN OTOMATIS & EDIT OPERATOR (HEMAT MEMORI & SYNC CLOUD)
// ==========================================================================
window.rekapRowsMaster = [];
window.cachedFinalHistories = [];
window.activeRekapPeriodeKey = '';

function segarkanRekapKehadiran() {
    muatDaftarPeriodeRekap();
}

function muatDaftarPeriodeRekap() {
    const selectElem = document.getElementById('selectPeriodeRekap');
    if (!selectElem) return;

    selectElem.innerHTML = '<option value="" disabled selected>Menghubungkan ke Database Cloud...</option>';

    const database = (typeof db !== "undefined" && db) ? db : (typeof firebase !== "undefined" && firebase.database ? firebase.database() : null);

    if (!database) {
        selectElem.innerHTML = '<option value="" disabled selected>Koneksi database belum siap</option>';
        return;
    }

    database.ref('history').once('value').then(snapshot => {
        window.cachedFinalHistories = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const item = child.val();
                if (item && (item.isFinalReport === true || item.isFinalReport === "true" || (item.reportTitle && item.reportTitle.indexOf("Rekap Final") !== -1))) {
                    if (!item.id) item.id = child.key;
                    window.cachedFinalHistories.push(item);
                }
            });

            // Urutkan dari yang terbaru (timestamp terbesar / terbaru)
            window.cachedFinalHistories.sort((a, b) => {
                let timeA = Number(a.id) || (a.timestamp ? Number(a.timestamp) : 0);
                let timeB = Number(b.id) || (b.timestamp ? Number(b.timestamp) : 0);
                return timeB - timeA;
            });
        }

        selectElem.innerHTML = '';

        if (window.cachedFinalHistories.length === 0) {
            const optNone = document.createElement('option');
            optNone.value = '';
            optNone.text = '⚠️ Belum ada Laporan Final tersimpan';
            optNone.disabled = true;
            optNone.selected = true;
            selectElem.appendChild(optNone);

            const badgeSumber = document.getElementById('badgeSumberDataRekap');
            if (badgeSumber) badgeSumber.innerText = 'Sumber: Belum ada data final';

            const tbody = document.getElementById('tbodyRekapKehadiran');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="14" style="text-align: center; padding: 32px 14px; color: var(--text-muted); font-size: 12px;">⚠️ Belum ada data Rekap Final yang tersimpan di Database Cloud.<br><small style="color:var(--text-secondary); margin-top:4px; display:inline-block;">Simpan laporan final terlebih dahulu via tombol <b>"Simpan Rekap Final"</b> pada tab Presensi Harian.</small></td></tr>`;
            }
            updateRekapStats(0, 0, 0, 0, 0, 0);
            return;
        }

        // Tampilkan semua opsi HANYA dari sumber data final (tanpa tanggal dan tanpa sesi aktif)
        window.cachedFinalHistories.forEach(item => {
            let key = item.id;
            let namaPeriode = item.namaBulanTahun ? item.namaBulanTahun.trim() : (item.reportTitle ? item.reportTitle.replace("Rekap Final Presensi ", "").trim() : "Final");
            let unitDisplay = item.unitKerja || item.savedByUnitKerja || '';
            if (unitDisplay === 'Kanreg XIV') unitDisplay = 'Kanreg XIV BKN';
            if (unitDisplay === 'UPT Sorong') unitDisplay = 'UPT BKN Sorong';
            if (unitDisplay) unitDisplay = ` [${unitDisplay}]`;

            const opt = document.createElement('option');
            opt.value = 'history_' + key;
            opt.text = `Final: ${namaPeriode}${unitDisplay}`;
            selectElem.appendChild(opt);
        });

        // Pilih laporan final yang pertama (terbaru) secara default
        selectElem.selectedIndex = 0;
        muatRekapKehadiranDariPilihan();
    }).catch(err => {
        console.error("Gagal membaca history final untuk rekap:", err);
        selectElem.innerHTML = '<option value="" disabled selected>Gagal memuat data final</option>';
    });
}

function muatRekapKehadiranDariPilihan() {
    const selectElem = document.getElementById('selectPeriodeRekap');
    const badgeSumber = document.getElementById('badgeSumberDataRekap');
    const selectedVal = selectElem ? selectElem.value : '';
    window.activeRekapPeriodeKey = selectedVal;

    if (!selectedVal || !selectedVal.startsWith('history_')) {
        const tbody = document.getElementById('tbodyRekapKehadiran');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="14" style="text-align: center; padding: 32px 14px; color: var(--text-muted); font-size: 12px;">Silakan pilih salah satu Laporan Final dari menu dropdown di atas.</td></tr>`;
        }
        updateRekapStats(0, 0, 0, 0, 0, 0);
        return;
    }

    let histId = selectedVal.replace('history_', '');
    let histItem = (window.cachedFinalHistories || []).find(h => h.id === histId);
    if (!histItem) return;

    let targetDataPegawai = histItem.dataPegawai || {};
    let targetGlobalRekap = histItem.globalRekap || {};
    let yr = histItem.activeYear !== undefined ? Number(histItem.activeYear) : new Date().getFullYear();
    let mo = histItem.activeMonth !== undefined ? Number(histItem.activeMonth) : new Date().getMonth();
    let periodeStr = histItem.namaBulanTahun || (NAMA_BULAN_ID[mo] ? `${NAMA_BULAN_ID[mo]} ${yr}` : 'Final');

    if (badgeSumber) {
        badgeSumber.innerText = `Sumber: Laporan Final [${periodeStr}]`;
    }

    // Kalkulasi rekap dari sumber data final bulan tersebut
    prosesKalkulasiRekap(targetDataPegawai, targetGlobalRekap, yr, mo, selectedVal);
}

function prosesKalkulasiRekap(pegawaiMap, rekapMap, yearVal, monthVal, periodeKey) {
    // Ambil overrides tersimpan jika operator pernah mengedit nilai kehadiran / izin secara manual
    let overrides = {};
    try {
        let saved = sessionStorage.getItem('rekap_override_' + periodeKey);
        if (saved) overrides = JSON.parse(saved);
    } catch (e) {
        console.warn("Error parsing rekap overrides:", e);
    }

    // Urutkan pegawai rekap berdasarkan hierarki jabatan: Keamanan PPPK -> Keamanan -> Pengemudi -> Kebersihan -> Pramubakti
    const employeeIds = Object.keys(pegawaiMap || {}).sort((a, b) => 
        comparePegawaiByJabatanThenNama(a, b, pegawaiMap[a], pegawaiMap[b])
    );
    const daysInMonth = (yearVal !== null && monthVal !== null) ? new Date(yearVal, monthVal + 1, 0).getDate() : 31;

    window.rekapRowsMaster = [];

    employeeIds.forEach((rawId, index) => {
        const rawNama = pegawaiMap[rawId] || '';
        // Sandingkan ID PPNPN dan Nama Lengkap resmi dari Database Master Pegawai (aktif maupun tidak aktif)
        const masterPeg = getMasterPegawai(rawId, rawNama);
        const officialId = masterPeg && masterPeg.id ? String(masterPeg.id).trim() : String(rawId).trim();
        const officialNama = masterPeg && masterPeg.nama ? String(masterPeg.nama).trim() : (rawNama || rawId);

        let role = "STAFF";
        let cs = 0, ct = 0, dl = 0, tk = 0, hn = 0, lj = 0;
        let tm = 0, pc = 0;
        let hariKerja = 0;

        for (let d = 1; d <= daysInMonth; d++) {
            let dStr = String(d).padStart(2, '0');
            let mStr = String(monthVal + 1).padStart(2, '0');
            let isoDate = `${yearVal}-${mStr}-${dStr}`;

            // Cari absensi dari rekapMap dengan rawId, officialId, atau nama
            let rec = rekapMap[rawId + "_" + isoDate] || 
                      rekapMap[officialId + "_" + isoDate] ||
                      (rawNama ? rekapMap[rawNama + "_" + isoDate] : null) ||
                      (officialNama ? rekapMap[officialNama + "_" + isoDate] : null);

            if (!rec) {
                let dateObj = new Date(yearVal, monthVal, d);
                let dayOfWeek = dateObj.getDay();
                if (dayOfWeek === 0 || dayOfWeek === 6) {
                    lj++;
                } else {
                    tk++;
                    hariKerja++;
                }
                continue;
            }

            if (rec.role) role = rec.role;

            let shift = rec.shiftTipe || "P";
            if (shift !== "OFF") hariKerja++;

            let st = "TK";
            if (typeof getStatusKehadiran === "function") {
                st = getStatusKehadiran(rec);
            } else {
                st = (rec.waktuMasuk || rec.waktuPulang) ? "HN" : "TK";
            }

            if (st === "HN") hn++;
            else if (st === "CS" || st === "Sakit") cs++;
            else if (st === "CT" || st === "Cuti") ct++;
            else if (st === "DL" || st === "Dinas Luar") dl++;
            else if (st === "LJ" || shift === "OFF") lj++;
            else if (st.includes("TK")) tk++;

            if (st.includes("TM")) tm++;
            if (st.includes("PC")) pc++;
        }

        const officialJabatan = masterPeg && masterPeg.jabatanPosisi
            ? masterPeg.jabatanPosisi.trim()
            : getJabatanPegawaiMaster(officialId, role, officialNama);

        let totalHadir = hn + tm + pc;
        let isOverridden = false;
        let catatan = "";

        // Terapkan override jika operator pernah memodifikasi data rekap
        const ov = overrides[officialId] || overrides[rawId];
        if (ov) {
            isOverridden = true;
            if (ov.hn !== undefined) hn = Number(ov.hn);
            if (ov.tm !== undefined) tm = Number(ov.tm);
            if (ov.pc !== undefined) pc = Number(ov.pc);
            if (ov.cs !== undefined) cs = Number(ov.cs);
            if (ov.ct !== undefined) ct = Number(ov.ct);
            if (ov.dl !== undefined) dl = Number(ov.dl);
            if (ov.tk !== undefined) tk = Number(ov.tk);
            if (ov.lj !== undefined) lj = Number(ov.lj);
            if (ov.ket !== undefined) catatan = ov.ket;
            totalHadir = hn + tm + pc;
        }

        window.rekapRowsMaster.push({
            no: index + 1,
            id: officialId,
            rawId: rawId,
            nama: officialNama,
            jabatan: officialJabatan,
            role: officialJabatan,
            hariKerja: hariKerja,
            hn: hn,
            tm: tm,
            pc: pc,
            totalHadir: totalHadir,
            cs: cs,
            ct: ct,
            dl: dl,
            tk: tk,
            lj: lj,
            catatan: catatan,
            isOverridden: isOverridden
        });
    });

    renderTabelRekap();
}

function renderTabelRekap() {
    const tbody = document.getElementById('tbodyRekapKehadiran');
    if (!tbody) return;

    if (!window.rekapRowsMaster || window.rekapRowsMaster.length === 0) {
        tbody.innerHTML = `<tr><td colspan="14" style="text-align: center; padding: 28px 0; color: var(--text-muted); font-size: 12.5px;">Belum ada data rekap presensi pada laporan final ini. Pilih laporan final lain atau perbarui data.</td></tr>`;
        updateRekapStats(0, 0, 0, 0, 0, 0);
        return;
    }

    let totHadirSemua = 0, totTKSemua = 0, totCSSemua = 0, totCTSemua = 0, totDLSemua = 0;
    let html = '';

    window.rekapRowsMaster.forEach((item, idx) => {
        totHadirSemua += item.totalHadir;
        totTKSemua += item.tk;
        totCSSemua += item.cs;
        totCTSemua += item.ct;
        totDLSemua += item.dl;

        let badgeHN = item.hn > 0 ? `<span class="badge-rekap-pill badge-rekap-hn">${item.hn}</span>` : '-';
        let badgeTM = item.tm > 0 ? `<span class="badge-rekap-pill" style="background:#fffbeb; color:#b45309; border:1px solid #fde68a;">${item.tm}</span>` : '-';
        let badgePC = item.pc > 0 ? `<span class="badge-rekap-pill" style="background:#fff7ed; color:#c2410c; border:1px solid #fed7aa;">${item.pc}</span>` : '-';
        let badgeCS = item.cs > 0 ? `<span class="badge-rekap-pill badge-rekap-cs">${item.cs}</span>` : '-';
        let badgeCT = item.ct > 0 ? `<span class="badge-rekap-pill badge-rekap-ct">${item.ct}</span>` : '-';
        let badgeDL = item.dl > 0 ? `<span class="badge-rekap-pill badge-rekap-dl">${item.dl}</span>` : '-';
        let badgeTK = item.tk > 0 ? `<span class="badge-rekap-pill badge-rekap-tk">${item.tk}</span>` : '-';
        let badgeLJ = item.lj > 0 ? `<span class="badge-rekap-pill" style="background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1;">${item.lj}</span>` : '-';

        const safeNama = (item.nama || '').replace(/'/g, "\\'");

        // REKAP KEHADIRAN:
        // 1. Kolom ID PPNPN disandingkan dari database master pegawai (aktif/tidak aktif)
        // 2. Efek hover popover DIHAPUS dari tabel rekap (hanya aktif pada tab presensi harian)
        // 3. Nama tampil sebagai teks tebal biasa dengan tombol Cek Sisa Cuti di samping kanannya
        html += `
            <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td style="text-align: center; font-family: ui-monospace, monospace; font-size: 11px; font-weight: 600; color: #1e293b;">${item.id}</td>
                <td>
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                        <span style="font-weight: 600; color: #1e293b; font-size: 12px;">${item.nama}</span>
                        <button type="button" class="btn-cek-cuti" onclick="cekSisaCutiTahunan('${item.id}', '${safeNama}')" title="Cek sisa cuti tahunan ${safeNama}">
                            <svg class="icon-svg" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            Cek Sisa Cuti
                        </button>
                    </div>
                </td>
                <td style="text-align: center;">
                    <span class="badge-jabatan-posisi ${getJabatanBadgeClass(item.jabatan || item.role)}">${item.jabatan || item.role}</span>
                </td>
                <td style="text-align: center; font-weight: 600;">${item.hariKerja}</td>
                <td style="text-align: center;">${badgeHN}</td>
                <td style="text-align: center;">${badgeTM}</td>
                <td style="text-align: center;">${badgePC}</td>
                <td style="text-align: center;">${badgeCS}</td>
                <td style="text-align: center;">${badgeCT}</td>
                <td style="text-align: center;">${badgeDL}</td>
                <td style="text-align: center;">${badgeTK}</td>
                <td style="text-align: center;">${badgeLJ}</td>
                <td style="text-align: center;">
                    <button type="button" class="btn-tbl-action btn-tbl-edit" onclick="editRekapPegawai('${item.id}')" title="Edit manual angka kehadiran & izin">
                        <svg class="icon-svg" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Edit
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    updateRekapStats(window.rekapRowsMaster.length, totHadirSemua, totTKSemua, totCSSemua, totCTSemua, totDLSemua);
}

// ==========================================================================
// FITUR CEK SISA CUTI TAHUNAN (ALERT / POP UP MODAL)
// ==========================================================================
function cekSisaCutiTahunan(id, nama) {
    const kuotaTahunan = 12; // Standar Hak Cuti Tahunan: 12 hari per tahun kalender

    // Dapatkan tahun periode aktif
    let targetYear = (typeof activeYear !== 'undefined' && activeYear) ? Number(activeYear) : new Date().getFullYear();
    const selectedVal = window.activeRekapPeriodeKey || '';
    if (selectedVal.startsWith('history_')) {
        let histId = selectedVal.replace('history_', '');
        let histItem = (window.cachedFinalHistories || []).find(h => h.id === histId);
        if (histItem && histItem.activeYear) {
            targetYear = Number(histItem.activeYear);
        }
    }

    // Hitung total akumulasi cuti tahunan (CT) yang telah diambil dari seluruh history final tahun tersebut
    const riwayat = hitungAkumulasiCutiTahunan(id, targetYear);
    
    // Periksa apakah di tabel saat ini operator sedang mengedit CT pegawai
    const rowSaatIni = (window.rekapRowsMaster || []).find(r => r.id === id);
    let totalCTTerpakai = riwayat.totalCT;
    if (rowSaatIni && rowSaatIni.ct > 0 && riwayat.totalCT === 0) {
        totalCTTerpakai = rowSaatIni.ct;
    }

    const sisa = kuotaTahunan - totalCTTerpakai;

    // Tampilkan di Pop Up Alert Modal Sisa Cuti
    const modal = document.getElementById('modalSisaCuti');
    if (!modal) {
        // Fallback jika elemen modal belum ada di DOM
        if (sisa <= 0) {
            alert(`sisa cuti tahunan ${nama}:\nHABIS`);
        } else {
            alert(`sisa cuti tahunan ${nama}:\n${sisa} hari`);
        }
        return;
    }

    document.getElementById('sisaCutiNamaPegawai').innerText = nama;
    document.getElementById('sisaCutiIdPegawai').innerText = id;
    document.getElementById('sisaCutiTahun').innerText = targetYear;
    document.getElementById('sisaCutiTerpakai').innerText = `${totalCTTerpakai} Hari`;

    const badgeContainer = document.getElementById('sisaCutiBadgeContainer');
    const tersediaText = document.getElementById('sisaCutiTersediaText');

    if (sisa <= 0) {
        badgeContainer.innerHTML = `<span class="badge-sisa-cuti badge-sisa-cuti-merah">HABIS</span>`;
        if (tersediaText) {
            tersediaText.innerHTML = `<span style="color: #dc2626; font-weight: 700;">0 Hari (Cuti Tahunan Habis)</span>`;
        }
    } else {
        badgeContainer.innerHTML = `<span class="badge-sisa-cuti badge-sisa-cuti-hijau">${sisa} hari</span>`;
        if (tersediaText) {
            tersediaText.innerHTML = `<span style="color: #059669; font-weight: 700;">${sisa} Hari Tersedia</span>`;
        }
    }

    // Tampilkan rincian bulan jika ada
    const rincianBox = document.getElementById('sisaCutiRincianBulanBox');
    const rincianList = document.getElementById('sisaCutiRincianList');
    if (rincianBox && rincianList) {
        if (riwayat.rincian && riwayat.rincian.length > 0) {
            rincianBox.style.display = 'block';
            rincianList.innerHTML = riwayat.rincian.map(r => `
                <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #f1f5f9; padding: 2px 0;">
                    <span>● Periode ${r.bulan}:</span>
                    <span style="font-weight: 600; color: #4338ca;">${r.hari} Hari CT</span>
                </div>
            `).join('');
        } else if (totalCTTerpakai > 0) {
            rincianBox.style.display = 'block';
            rincianList.innerHTML = `
                <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                    <span>● Periode Laporan Final Ini:</span>
                    <span style="font-weight: 600; color: #4338ca;">${totalCTTerpakai} Hari CT</span>
                </div>
            `;
        } else {
            rincianBox.style.display = 'none';
            rincianList.innerHTML = '';
        }
    }

    modal.style.display = 'flex';
}

function tutupModalSisaCuti() {
    const modal = document.getElementById('modalSisaCuti');
    if (modal) modal.style.display = 'none';
}

function hitungAkumulasiCutiTahunan(employeeId, targetYear, fallbackAltId = null) {
    let totalCT = 0;
    let rincian = [];

    const masterPeg = getMasterPegawai(employeeId);
    const officialId = masterPeg && masterPeg.id ? String(masterPeg.id).trim() : String(employeeId || '').trim();
    const altId = fallbackAltId ? String(fallbackAltId).trim() : '';

    const histories = window.cachedFinalHistories || [];
    // Kelompokkan per bulan agar deduping versi final
    const bulanMap = {};

    histories.forEach(h => {
        let yr = h.activeYear !== undefined ? Number(h.activeYear) : null;
        let mo = h.activeMonth !== undefined ? Number(h.activeMonth) : null;
        if (yr === targetYear && mo !== null) {
            let key = `${yr}_${mo}`;
            let tVal = Number(h.id) || (h.timestamp ? Number(h.timestamp) : 0);
            if (!bulanMap[key] || tVal > bulanMap[key].tVal) {
                bulanMap[key] = { hist: h, tVal: tVal, mo: mo };
            }
        }
    });

    Object.keys(bulanMap).sort((a, b) => bulanMap[a].mo - bulanMap[b].mo).forEach(k => {
        const item = bulanMap[k];
        const h = item.hist;
        const mo = item.mo;
        const bulanName = NAMA_BULAN_ID[mo] || `Bulan ${mo + 1}`;

        let ctBulan = 0;
        // Cek overrides
        let ovKey = 'history_' + h.id;
        let ov = null;
        try {
            let saved = sessionStorage.getItem('rekap_override_' + ovKey);
            if (saved) ov = JSON.parse(saved);
        } catch (e) {}

        let matchedOv = null;
        if (ov) {
            matchedOv = ov[officialId] || ov[employeeId] || (altId ? ov[altId] : null);
        }

        if (matchedOv && matchedOv.ct !== undefined) {
            ctBulan = Number(matchedOv.ct) || 0;
        } else if (h.globalRekap) {
            const daysInMonth = new Date(targetYear, mo + 1, 0).getDate();
            for (let d = 1; d <= daysInMonth; d++) {
                let dStr = String(d).padStart(2, '0');
                let mStr = String(mo + 1).padStart(2, '0');
                let isoDate = `${targetYear}-${mStr}-${dStr}`;
                let rec = h.globalRekap[officialId + "_" + isoDate] || 
                          h.globalRekap[employeeId + "_" + isoDate] || 
                          (altId ? h.globalRekap[altId + "_" + isoDate] : null);
                if (rec) {
                    let st = (typeof getStatusKehadiran === "function") ? getStatusKehadiran(rec) : (rec.status || "");
                    if (st === "CT" || st === "Cuti") {
                        ctBulan++;
                    }
                }
            }
        }

        if (ctBulan > 0) {
            totalCT += ctBulan;
            rincian.push({ bulan: bulanName, hari: ctBulan });
        }
    });

    return { totalCT, rincian };
}

function updateRekapStats(total, hadir, tk, cs, ct, dl) {
    if (document.getElementById('statRekapTotalPegawai')) document.getElementById('statRekapTotalPegawai').innerText = total;
    if (document.getElementById('statRekapTotalHadir')) document.getElementById('statRekapTotalHadir').innerText = hadir;
    if (document.getElementById('statRekapTotalTK')) document.getElementById('statRekapTotalTK').innerText = tk;
    if (document.getElementById('statRekapTotalCS')) document.getElementById('statRekapTotalCS').innerText = cs;
    if (document.getElementById('statRekapTotalCT')) document.getElementById('statRekapTotalCT').innerText = ct;
    if (document.getElementById('statRekapTotalDL')) document.getElementById('statRekapTotalDL').innerText = dl;
}

function editRekapPegawai(id) {
    const item = (window.rekapRowsMaster || []).find(r => r.id === id || r.rawId === id);
    if (!item) return;

    document.getElementById('editRekapPegawaiId').value = item.id;
    document.getElementById('modalRekapNamaTitle').innerText = item.nama;
    document.getElementById('modalRekapSubTitle').innerText = `ID PPNPN: ${item.id} | Jabatan: ${item.jabatan || item.role} | Hari Kerja: ${item.hariKerja}`;

    document.getElementById('editRekapHN').value = item.hn;
    document.getElementById('editRekapTM').value = item.tm;
    document.getElementById('editRekapPC').value = item.pc;
    document.getElementById('editRekapTK').value = item.tk;
    document.getElementById('editRekapCS').value = item.cs;
    document.getElementById('editRekapCT').value = item.ct;
    document.getElementById('editRekapDL').value = item.dl;
    document.getElementById('editRekapLJ').value = item.lj;
    document.getElementById('editRekapKet').value = item.catatan || '';

    const modal = document.getElementById('modalEditRekapPegawai');
    if (modal) modal.style.display = 'flex';
}

function tutupModalEditRekap() {
    const modal = document.getElementById('modalEditRekapPegawai');
    if (modal) modal.style.display = 'none';
}

function simpanEditRekapPegawai() {
    const id = document.getElementById('editRekapPegawaiId').value;
    if (!id) return;

    const rowItem = (window.rekapRowsMaster || []).find(r => r.id === id || r.rawId === id);
    const rawId = rowItem ? rowItem.rawId : null;

    const periodeKey = window.activeRekapPeriodeKey || 'sesi_aktif';
    let overrides = {};
    try {
        let saved = sessionStorage.getItem('rekap_override_' + periodeKey);
        if (saved) overrides = JSON.parse(saved);
    } catch (e) {}

    const ovData = {
        hn: parseInt(document.getElementById('editRekapHN').value) || 0,
        tm: parseInt(document.getElementById('editRekapTM').value) || 0,
        pc: parseInt(document.getElementById('editRekapPC').value) || 0,
        tk: parseInt(document.getElementById('editRekapTK').value) || 0,
        cs: parseInt(document.getElementById('editRekapCS').value) || 0,
        ct: parseInt(document.getElementById('editRekapCT').value) || 0,
        dl: parseInt(document.getElementById('editRekapDL').value) || 0,
        lj: parseInt(document.getElementById('editRekapLJ').value) || 0,
        ket: document.getElementById('editRekapKet').value.trim()
    };

    overrides[id] = ovData;
    if (rawId && rawId !== id) {
        overrides[rawId] = ovData;
    }

    try {
        sessionStorage.setItem('rekap_override_' + periodeKey, JSON.stringify(overrides));
    } catch (e) {
        console.warn("Storage warning:", e);
    }

    // Sinkronkan ke Firebase jika database aktif
    const database = (typeof db !== "undefined" && db) ? db : (typeof firebase !== "undefined" && firebase.database ? firebase.database() : null);
    if (database) {
        database.ref(`rekapOverrides/${periodeKey}/${id}`).set(ovData).catch(err => {
            console.warn("Firebase rekap override sync warning:", err);
        });
        if (rawId && rawId !== id) {
            database.ref(`rekapOverrides/${periodeKey}/${rawId}`).set(ovData).catch(() => {});
        }
    }

    tutupModalEditRekap();
    muatRekapKehadiranDariPilihan();
    alert("Data rekap presensi pegawai berhasil diperbarui.");
}

// ==========================================================================
// HELPER PERHITUNGAN REKAP PER BULAN DARI RIWAYAT FINAL CLOUD
// ==========================================================================
function kalkulasiRekapDariHistoryItem(histItem) {
    if (!histItem) return [];
    let pegawaiMap = histItem.dataPegawai || {};
    let rekapMap = histItem.globalRekap || {};
    let yr = histItem.activeYear !== undefined ? Number(histItem.activeYear) : new Date().getFullYear();
    let mo = histItem.activeMonth !== undefined ? Number(histItem.activeMonth) : new Date().getMonth();
    let periodeKey = 'history_' + histItem.id;

    let overrides = {};
    try {
        let saved = sessionStorage.getItem('rekap_override_' + periodeKey);
        if (saved) overrides = JSON.parse(saved);
    } catch (e) {}

    const employeeIds = Object.keys(pegawaiMap || {}).sort((a, b) => 
        comparePegawaiByJabatanThenNama(a, b, pegawaiMap[a], pegawaiMap[b])
    );
    const daysInMonth = (yr !== null && mo !== null) ? new Date(yr, mo + 1, 0).getDate() : 31;

    let rows = [];

    employeeIds.forEach((rawId, index) => {
        const rawNama = pegawaiMap[rawId] || '';
        // Sandingkan ID PPNPN dan Nama Lengkap dari master pegawai (aktif maupun tidak aktif)
        const masterPeg = getMasterPegawai(rawId, rawNama);
        const officialId = masterPeg && masterPeg.id ? String(masterPeg.id).trim() : String(rawId).trim();
        const officialNama = masterPeg && masterPeg.nama ? String(masterPeg.nama).trim() : (rawNama || rawId);

        let role = "STAFF";
        let cs = 0, ct = 0, dl = 0, tk = 0, hn = 0, lj = 0;
        let tm = 0, pc = 0;
        let hariKerja = 0;

        for (let d = 1; d <= daysInMonth; d++) {
            let dStr = String(d).padStart(2, '0');
            let mStr = String(mo + 1).padStart(2, '0');
            let isoDate = `${yr}-${mStr}-${dStr}`;

            let rec = rekapMap[rawId + "_" + isoDate] || 
                      rekapMap[officialId + "_" + isoDate] ||
                      (rawNama ? rekapMap[rawNama + "_" + isoDate] : null) ||
                      (officialNama ? rekapMap[officialNama + "_" + isoDate] : null);

            if (!rec) {
                let dateObj = new Date(yr, mo, d);
                let dayOfWeek = dateObj.getDay();
                if (dayOfWeek === 0 || dayOfWeek === 6) {
                    lj++;
                } else {
                    tk++;
                    hariKerja++;
                }
                continue;
            }

            if (rec.role) role = rec.role;
            let shift = rec.shiftTipe || "P";
            if (shift !== "OFF") hariKerja++;

            let st = "TK";
            if (typeof getStatusKehadiran === "function") {
                st = getStatusKehadiran(rec);
            } else {
                st = (rec.waktuMasuk || rec.waktuPulang) ? "HN" : "TK";
            }

            if (st === "HN") hn++;
            else if (st === "CS" || st === "Sakit") cs++;
            else if (st === "CT" || st === "Cuti") ct++;
            else if (st === "DL" || st === "Dinas Luar") dl++;
            else if (st === "LJ" || shift === "OFF") lj++;
            else if (st.includes("TK")) tk++;

            if (st.includes("TM")) tm++;
            if (st.includes("PC")) pc++;
        }

        const officialJabatan = masterPeg && masterPeg.jabatanPosisi 
            ? masterPeg.jabatanPosisi.trim() 
            : getJabatanPegawaiMaster(officialId, role, officialNama);

        let totalHadir = hn + tm + pc;
        let isOverridden = false;
        let catatan = "";

        const ov = overrides[officialId] || overrides[rawId];
        if (ov) {
            isOverridden = true;
            if (ov.hn !== undefined) hn = Number(ov.hn);
            if (ov.tm !== undefined) tm = Number(ov.tm);
            if (ov.pc !== undefined) pc = Number(ov.pc);
            if (ov.cs !== undefined) cs = Number(ov.cs);
            if (ov.ct !== undefined) ct = Number(ov.ct);
            if (ov.dl !== undefined) dl = Number(ov.dl);
            if (ov.tk !== undefined) tk = Number(ov.tk);
            if (ov.lj !== undefined) lj = Number(ov.lj);
            if (ov.ket !== undefined) catatan = ov.ket;
            totalHadir = hn + tm + pc;
        }

        let riwayat = (typeof hitungAkumulasiCutiTahunan === 'function') ? hitungAkumulasiCutiTahunan(officialId, yr, rawId) : { totalCT: ct };
        let totalCT = riwayat.totalCT || ct || 0;
        let sisaCuti = 12 - totalCT;

        rows.push({
            no: index + 1,
            id: officialId,
            rawId: rawId,
            nama: officialNama,
            jabatan: officialJabatan,
            role: officialJabatan,
            hariKerja: hariKerja,
            hn: hn,
            tm: tm,
            pc: pc,
            totalHadir: totalHadir,
            cs: cs,
            ct: ct,
            dl: dl,
            tk: tk,
            lj: lj,
            sisaCuti: sisaCuti <= 0 ? "HABIS" : `${sisaCuti} Hari`,
            catatan: catatan
        });
    });

    return rows;
}

// Helper untuk mengambil daftar final unik terurut kronologis
function dapatkanDaftarFinalUnik() {
    let list = (window.cachedFinalHistories || []).slice();
    list.sort((a, b) => {
        let tA = Number(a.id) || (a.timestamp ? Number(a.timestamp) : 0);
        let tB = Number(b.id) || (b.timestamp ? Number(b.timestamp) : 0);
        return tB - tA;
    });

    let map = {};
    let unique = [];
    list.forEach(item => {
        let pKey = (item.namaBulanTahun || item.reportTitle || "").replace("Rekap Final Presensi ", "").trim();
        if (!pKey && item.activeYear !== undefined && item.activeMonth !== undefined) {
            pKey = `${item.activeYear}_${item.activeMonth}`;
        }
        if (pKey && !map[pKey]) {
            map[pKey] = true;
            unique.push(item);
        }
    });

    // Urutkan kronologis bulan
    unique.sort((a, b) => {
        let yA = a.activeYear !== undefined ? Number(a.activeYear) : 2026;
        let mA = a.activeMonth !== undefined ? Number(a.activeMonth) : 0;
        let yB = b.activeYear !== undefined ? Number(b.activeYear) : 2026;
        let mB = b.activeMonth !== undefined ? Number(b.activeMonth) : 0;
        return (yA * 12 + mA) - (yB * 12 + mB);
    });

    return unique;
}

// ==========================================================================
// EKSPOR REKAP FINAL KE EXCEL (MULTI-SHEET SEMUA BULAN FINAL)
// ==========================================================================
async function exportRekapExcel() {
    if (typeof XLSX === 'undefined') {
        alert("Pustaka pembuat Excel (SheetJS) belum siap. Silakan muat ulang halaman.");
        return;
    }

    let finalItems = dapatkanDaftarFinalUnik();
    if (finalItems.length === 0) {
        const database = (typeof db !== "undefined" && db) ? db : (typeof firebase !== "undefined" && firebase.database ? firebase.database() : null);
        if (database) {
            try {
                const snap = await database.ref('history').once('value');
                if (snap.exists()) {
                    window.cachedFinalHistories = [];
                    snap.forEach(c => {
                        let it = c.val();
                        if (it && (it.isFinalReport === true || it.isFinalReport === "true" || (it.reportTitle && it.reportTitle.indexOf("Rekap Final") !== -1))) {
                            if (!it.id) it.id = c.key;
                            window.cachedFinalHistories.push(it);
                        }
                    });
                    finalItems = dapatkanDaftarFinalUnik();
                }
            } catch (e) {
                console.warn("Gagal membaca history untuk export excel:", e);
            }
        }
    }

    const wb = XLSX.utils.book_new();

    if (finalItems.length === 0) {
        if (window.rekapRowsMaster && window.rekapRowsMaster.length > 0) {
            let targetYear = (typeof activeYear !== 'undefined' && activeYear) ? Number(activeYear) : new Date().getFullYear();
            let rowsExcel = window.rekapRowsMaster.map(item => {
                let riwayat = (typeof hitungAkumulasiCutiTahunan === 'function') ? hitungAkumulasiCutiTahunan(item.id, targetYear) : { totalCT: item.ct };
                let totalCT = riwayat.totalCT || item.ct || 0;
                let sisa = 12 - totalCT;
                return {
                    "No": item.no,
                    "ID Pegawai": item.id,
                    "Nama Pegawai & PPNPN": item.nama,
                    "Jabatan / Posisi": item.role,
                    "Hari Kerja": item.hariKerja,
                    "Hadir Normal (HN)": item.hn,
                    "Terlambat (TM)": item.tm,
                    "Pulang Cepat (PC)": item.pc,
                    "Cuti Sakit (CS)": item.cs,
                    "Cuti Tahunan (CT)": item.ct,
                    "Dinas Luar (DL)": item.dl,
                    "Tanpa Keterangan (TK)": item.tk,
                    "Libur (LJ)": item.lj,
                    "Sisa Cuti Tahunan": sisa <= 0 ? "HABIS" : `${sisa} Hari`
                };
            });
            let ws = XLSX.utils.json_to_sheet(rowsExcel);
            let namaPeriode = (typeof namaBulanTahun !== 'undefined' && namaBulanTahun) ? namaBulanTahun.replace(/Rekap Final Presensi /g, "").replace(/[:\\/?*\[\]]/g, "").trim() : "Rekap_Kehadiran";
            XLSX.utils.book_append_sheet(wb, ws, namaPeriode.substring(0, 31));
            XLSX.writeFile(wb, `Rekap_Kehadiran_${namaPeriode.replace(/\s+/g, '_')}.xlsx`);
            return;
        } else {
            alert("Belum ada data Rekap Final yang tersimpan di cloud untuk diekspor ke Excel.");
            return;
        }
    }

    let sheetNamesUsed = new Set();
    finalItems.forEach(item => {
        let rowsData = kalkulasiRekapDariHistoryItem(item);
        if (!rowsData || rowsData.length === 0) return;

        let rowsExcel = rowsData.map(r => ({
            "No": r.no,
            "ID Pegawai": r.id,
            "Nama Pegawai & PPNPN": r.nama,
            "Jabatan / Posisi": r.role,
            "Hari Kerja": r.hariKerja,
            "Hadir Normal (HN)": r.hn,
            "Terlambat (TM)": r.tm,
            "Pulang Cepat (PC)": r.pc,
            "Cuti Sakit (CS)": r.cs,
            "Cuti Tahunan (CT)": r.ct,
            "Dinas Luar (DL)": r.dl,
            "Tanpa Keterangan (TK)": r.tk,
            "Libur (LJ)": r.lj,
            "Sisa Cuti Tahunan": r.sisaCuti
        }));

        let ws = XLSX.utils.json_to_sheet(rowsExcel);
        let sheetName = (item.namaBulanTahun || item.reportTitle || "Rekap").replace(/Rekap Final Presensi /g, "").replace(/[:\\/?*\[\]]/g, "").trim();
        if (!sheetName) sheetName = "Sheet";
        sheetName = sheetName.substring(0, 31);

        let baseName = sheetName;
        let count = 2;
        while (sheetNamesUsed.has(sheetName)) {
            sheetName = baseName.substring(0, 28) + `_${count}`;
            count++;
        }
        sheetNamesUsed.add(sheetName);

        XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    let currentYear = new Date().getFullYear();
    XLSX.writeFile(wb, `Rekap_Kehadiran_Final_Seluruh_Bulan_${currentYear}.xlsx`);
}

// ==========================================================================
// EKSPOR REKAP FINAL KE PDF (MULTI-HALAMAN SEMUA BULAN FINAL)
// ==========================================================================
async function exportRekapPDF() {
    const jspdfModule = window.jspdf;
    if (!jspdfModule || !jspdfModule.jsPDF) {
        alert("Pustaka jsPDF belum siap. Silakan muat ulang halaman.");
        return;
    }

    let finalItems = dapatkanDaftarFinalUnik();
    if (finalItems.length === 0) {
        const database = (typeof db !== "undefined" && db) ? db : (typeof firebase !== "undefined" && firebase.database ? firebase.database() : null);
        if (database) {
            try {
                const snap = await database.ref('history').once('value');
                if (snap.exists()) {
                    window.cachedFinalHistories = [];
                    snap.forEach(c => {
                        let it = c.val();
                        if (it && (it.isFinalReport === true || it.isFinalReport === "true" || (it.reportTitle && it.reportTitle.indexOf("Rekap Final") !== -1))) {
                            if (!it.id) it.id = c.key;
                            window.cachedFinalHistories.push(it);
                        }
                    });
                    finalItems = dapatkanDaftarFinalUnik();
                }
            } catch (e) {
                console.warn("Gagal membaca history untuk export PDF:", e);
            }
        }
    }

    if (finalItems.length === 0) {
        if (window.rekapRowsMaster && window.rekapRowsMaster.length > 0) {
            let dummyMo = (typeof activeMonth !== 'undefined' && activeMonth !== null) ? activeMonth : new Date().getMonth();
            let dummyYr = (typeof activeYear !== 'undefined' && activeYear !== null) ? activeYear : new Date().getFullYear();
            let dummyNama = (typeof namaBulanTahun !== 'undefined' && namaBulanTahun) ? namaBulanTahun : `Periode ${dummyMo + 1} ${dummyYr}`;
            finalItems = [{
                id: 'active_session',
                namaBulanTahun: dummyNama,
                activeYear: dummyYr,
                activeMonth: dummyMo,
                _precomputedRows: window.rekapRowsMaster
            }];
        } else {
            alert("Belum ada data Rekap Final yang tersimpan di cloud untuk diekspor ke PDF.");
            return;
        }
    }

    const { jsPDF } = jspdfModule;
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    const runAutoTable = (options) => {
        if (typeof doc.autoTable === 'function') {
            doc.autoTable(options);
        } else if (typeof window.jspdfAutoTable === 'function') {
            window.jspdfAutoTable(doc, options);
        } else if (typeof autoTable === 'function') {
            autoTable(doc, options);
        } else {
            throw new Error("Pustaka AutoTable belum tersedia.");
        }
    };

    finalItems.forEach((item, pageIdx) => {
        if (pageIdx > 0) {
            doc.addPage('a4', 'landscape');
        }

        let rowsData = item._precomputedRows || kalkulasiRekapDariHistoryItem(item);
        let periodeStr = item.namaBulanTahun ? item.namaBulanTahun.trim() : (item.reportTitle ? item.reportTitle.replace("Rekap Final Presensi ", "").trim() : "Periode");
        let rawUnit = item.unitKerja || item.savedByUnitKerja || "Kanreg XIV BKN";
        let unitStr = (rawUnit === "UPT Sorong" || rawUnit === "UPT BKN Sorong") ? "UPT BKN Sorong" : "Kanreg XIV BKN";

        // Kop Laporan Per Bulan
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        let kopInstansi = unitStr === "UPT BKN Sorong" ? "UPT BKN SORONG" : "KANTOR REGIONAL XIV BADAN KEPEGAWAIAN NEGARA";
        doc.text(kopInstansi, 148.5, 13, { align: "center" });

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(16, 185, 129);
        doc.text(`LAPORAN REKAPITULASI KEHADIRAN PEGAWAI & PPNPN - ${periodeStr.toUpperCase()}`, 148.5, 19, { align: "center" });

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        let infoStr = `Unit Kerja: ${unitStr}  |  Sumber: Cloud Database Final  |  Dicetak: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}`;
        
        doc.text(infoStr, 148.5, 24, { align: "center" });

        // Garis Pembatas
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.4);
        doc.line(14, 27, 283, 27);

        // Header Tabel Per Bulan (Tanpa Baris Total Sesuai Permintaan)
        const tableHeaders = [
            ["No", "ID PPNPN", "Nama Pegawai & PPNPN", "Jabatan / Posisi", "Hari Kerja", "HN", "TM", "PC", "CS", "CT", "DL", "TK", "LJ", "Sisa Cuti"]
        ];

        // Body Tabel Per Bulan
        const tableBody = rowsData.map(r => [
            r.no,
            r.id,
            r.nama,
            r.role,
            r.hariKerja,
            r.hn,
            r.tm,
            r.pc,
            r.cs,
            r.ct,
            r.dl,
            r.tk,
            r.lj,
            r.sisaCuti
        ]);

        runAutoTable({
            startY: 30,
            head: tableHeaders,
            body: tableBody,
            theme: 'grid',
            styles: {
                font: 'helvetica',
                fontSize: 7.5,
                cellPadding: 1.8,
                lineColor: [226, 232, 240],
                lineWidth: 0.15
            },
            headStyles: {
                fillColor: [30, 41, 59],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center',
                valign: 'middle'
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                1: { halign: 'center', cellWidth: 18, font: 'courier' },
                2: { halign: 'left', cellWidth: 54, fontStyle: 'bold' },
                3: { halign: 'center', cellWidth: 30 },
                4: { halign: 'center', cellWidth: 15 },
                5: { halign: 'center', cellWidth: 12 },
                6: { halign: 'center', cellWidth: 12 },
                7: { halign: 'center', cellWidth: 12 },
                8: { halign: 'center', cellWidth: 12 },
                9: { halign: 'center', cellWidth: 12 },
                10: { halign: 'center', cellWidth: 12 },
                11: { halign: 'center', cellWidth: 12 },
                12: { halign: 'center', cellWidth: 12 },
                13: { halign: 'center', cellWidth: 22 }
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            },
            margin: { left: 14, right: 14, bottom: 18 }
        });
    });

    // ==========================================================================
    // HALAMAN TERAKHIR: TABEL REKAPITULASI TOTAL / AKUMULASI SELURUH BULAN
    // ==========================================================================
    doc.addPage('a4', 'landscape');

    // Kumpulkan dan akumulasi data seluruh pegawai dari setiap bulan final
    const totalPegawaiMap = {};
    let targetYr = (finalItems[0] && finalItems[0].activeYear !== undefined) ? Number(finalItems[0].activeYear) : new Date().getFullYear();

    finalItems.forEach(item => {
        let rowsData = item._precomputedRows || kalkulasiRekapDariHistoryItem(item);
        rowsData.forEach(r => {
            let key = r.id || r.rawId || r.nama;
            if (!totalPegawaiMap[key]) {
                totalPegawaiMap[key] = {
                    id: r.id,
                    rawId: r.rawId,
                    nama: r.nama,
                    role: r.role || r.jabatan,
                    hariKerja: 0,
                    hn: 0,
                    tm: 0,
                    pc: 0,
                    cs: 0,
                    ct: 0,
                    dl: 0,
                    tk: 0,
                    lj: 0,
                    totalCT: 0
                };
            }
            totalPegawaiMap[key].hariKerja += (Number(r.hariKerja) || 0);
            totalPegawaiMap[key].hn += (Number(r.hn) || 0);
            totalPegawaiMap[key].tm += (Number(r.tm) || 0);
            totalPegawaiMap[key].pc += (Number(r.pc) || 0);
            totalPegawaiMap[key].cs += (Number(r.cs) || 0);
            totalPegawaiMap[key].ct += (Number(r.ct) || 0);
            totalPegawaiMap[key].dl += (Number(r.dl) || 0);
            totalPegawaiMap[key].tk += (Number(r.tk) || 0);
            totalPegawaiMap[key].lj += (Number(r.lj) || 0);
            totalPegawaiMap[key].totalCT += (Number(r.ct) || 0);
            if (r.nama) totalPegawaiMap[key].nama = r.nama;
            if (r.role) totalPegawaiMap[key].role = r.role;
        });
    });

    // Urutkan pegawai tabel total berdasarkan hierarki jabatan standar
    const sortedTotalEmployees = Object.values(totalPegawaiMap).sort((a, b) => 
        comparePegawaiByJabatanThenNama(a.id, b.id, a.nama, b.nama, a.role, b.role)
    );

    // Hitung grand total agregat
    let grandHariKerja = 0, grandHN = 0, grandTM = 0, grandPC = 0;
    let grandCS = 0, grandCT = 0, grandDL = 0, grandTK = 0, grandLJ = 0;

    const tableTotalBody = sortedTotalEmployees.map((emp, idx) => {
        grandHariKerja += emp.hariKerja;
        grandHN += emp.hn;
        grandTM += emp.tm;
        grandPC += emp.pc;
        grandCS += emp.cs;
        grandCT += emp.ct;
        grandDL += emp.dl;
        grandTK += emp.tk;
        grandLJ += emp.lj;

        let sisa = 12 - emp.totalCT;
        if (typeof hitungAkumulasiCutiTahunan === 'function') {
            let riw = hitungAkumulasiCutiTahunan(emp.id, targetYr, emp.rawId);
            if (riw && riw.totalCT !== undefined) {
                sisa = 12 - riw.totalCT;
            }
        }
        let sisaCutiStr = sisa <= 0 ? "HABIS" : `${sisa} Hari`;

        return [
            idx + 1,
            emp.id,
            emp.nama,
            emp.role,
            emp.hariKerja,
            emp.hn,
            emp.tm,
            emp.pc,
            emp.cs,
            emp.ct,
            emp.dl,
            emp.tk,
            emp.lj,
            sisaCutiStr
        ];
    });

    // Baris Total Keseluruhan di akhir tabel total
    tableTotalBody.push([
        { content: "TOTAL KESELURUHAN", colSpan: 4, styles: { halign: 'center', fontStyle: 'bold', fillColor: [224, 231, 255], textColor: [30, 58, 138] } },
        { content: String(grandHariKerja), styles: { halign: 'center', fontStyle: 'bold', fillColor: [224, 231, 255] } },
        { content: String(grandHN), styles: { halign: 'center', fontStyle: 'bold', fillColor: [224, 231, 255] } },
        { content: String(grandTM), styles: { halign: 'center', fontStyle: 'bold', fillColor: [224, 231, 255] } },
        { content: String(grandPC), styles: { halign: 'center', fontStyle: 'bold', fillColor: [224, 231, 255] } },
        { content: String(grandCS), styles: { halign: 'center', fontStyle: 'bold', fillColor: [224, 231, 255] } },
        { content: String(grandCT), styles: { halign: 'center', fontStyle: 'bold', fillColor: [224, 231, 255] } },
        { content: String(grandDL), styles: { halign: 'center', fontStyle: 'bold', fillColor: [224, 231, 255] } },
        { content: String(grandTK), styles: { halign: 'center', fontStyle: 'bold', textColor: [220, 38, 38], fillColor: [224, 231, 255] } },
        { content: String(grandLJ), styles: { halign: 'center', fontStyle: 'bold', fillColor: [224, 231, 255] } },
        { content: "-", styles: { halign: 'center', fontStyle: 'bold', fillColor: [224, 231, 255] } }
    ]);

    // Dapatkan unit kerja untuk halaman tabel total
    let firstUnitRaw = (finalItems[0] && (finalItems[0].unitKerja || finalItems[0].savedByUnitKerja)) || "Kanreg XIV BKN";
    let firstUnit = (firstUnitRaw === "UPT Sorong" || firstUnitRaw === "UPT BKN Sorong") ? "UPT BKN Sorong" : "Kanreg XIV BKN";
    let kopInstansiTotal = firstUnit === "UPT BKN Sorong" ? "UPT BKN SORONG" : "KANTOR REGIONAL XIV BADAN KEPEGAWAIAN NEGARA";

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(kopInstansiTotal, 148.5, 13, { align: "center" });

    // Judul Khusus Tabel Total dengan Warna Indigo / Deep Navy Pembeda
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 138);
    doc.text("LAPORAN REKAPITULASI TOTAL KEHADIRAN PEGAWAI & PPNPN (AKUMULASI KESELURUHAN)", 148.5, 19, { align: "center" });

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    let infoStrTotal = `Unit Kerja: ${firstUnit}  |  Periode: Akumulasi Seluruh Laporan Final (${finalItems.length} Bulan)  |  Dicetak: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    doc.text(infoStrTotal, 148.5, 24, { align: "center" });

    // Garis Pembatas Warna Indigo
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(0.6);
    doc.line(14, 27, 283, 27);

    // Header Tabel Total dengan Label 'Total ...'
    const tableTotalHeaders = [
        ["No", "ID PPNPN", "Nama Pegawai & PPNPN", "Jabatan / Posisi", "Total Hari", "Total HN", "Total TM", "Total PC", "Total CS", "Total CT", "Total DL", "Total TK", "Total Libur", "Sisa Cuti"]
    ];

    runAutoTable({
        startY: 30,
        head: tableTotalHeaders,
        body: tableTotalBody,
        theme: 'grid',
        styles: {
            font: 'helvetica',
            fontSize: 7.5,
            cellPadding: 1.8,
            lineColor: [199, 210, 254],
            lineWidth: 0.15
        },
        headStyles: {
            fillColor: [30, 58, 138], // Warna pembeda tegas: Deep Royal Blue / Indigo
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle'
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { halign: 'center', cellWidth: 18, font: 'courier' },
            2: { halign: 'left', cellWidth: 54, fontStyle: 'bold' },
            3: { halign: 'center', cellWidth: 30 },
            4: { halign: 'center', cellWidth: 15 },
            5: { halign: 'center', cellWidth: 12 },
            6: { halign: 'center', cellWidth: 12 },
            7: { halign: 'center', cellWidth: 12 },
            8: { halign: 'center', cellWidth: 12 },
            9: { halign: 'center', cellWidth: 12 },
            10: { halign: 'center', cellWidth: 12 },
            11: { halign: 'center', cellWidth: 12 },
            12: { halign: 'center', cellWidth: 12 },
            13: { halign: 'center', cellWidth: 22 }
        },
        alternateRowStyles: {
            fillColor: [248, 250, 255] // Nuansa lembut indigo
        },
        margin: { left: 14, right: 14, bottom: 18 }
    });

    // Tambahkan nomor halaman di footer seluruh halaman
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Halaman ${p} dari ${totalPages}`, 283, 202, { align: 'right' });
        doc.text("Laporan Kehadiran Pegawai dan PPNPN - Kanreg XIV BKN", 14, 202);
    }

    // Tampilkan PDF Preview di tab baru (tidak otomatis unduh)
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const newTab = window.open(pdfUrl, '_blank');
    if (!newTab) {
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

window.exportRekapExcel = exportRekapExcel;
window.exportRekapPDF = exportRekapPDF;

// ==========================================================================
// PENGELOLAAN DATABASE MASTER PEGAWAI & PPNPN (TAB REKAP KEHADIRAN)
// ==========================================================================

window.activeSubtabPegawai = 'aktif';
window.cachedListPegawai = [];

// HELPER PARSING & FORMAT TANGGAL FLEKSIBEL (PILIH & KETIK)
const NAMA_BULAN_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function parseStringToYMD(str) {
    if (!str || str === 'Tidak Aktif' || str === 'Tidak aktif' || str === '--' || str === '-') return '';
    str = String(str).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    
    // Format DD/MM/YYYY
    const dmyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmyMatch) {
        return `${dmyMatch[3]}-${String(dmyMatch[2]).padStart(2, '0')}-${String(dmyMatch[1]).padStart(2, '0')}`;
    }
    
    // Format "01 Januari 2026"
    const textMatch = str.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/);
    if (textMatch) {
        const d = String(textMatch[1]).padStart(2, '0');
        const monthName = textMatch[2].toLowerCase();
        const y = textMatch[3];
        const monthIndex = NAMA_BULAN_ID.findIndex(b => b.toLowerCase() === monthName);
        if (monthIndex !== -1) {
            return `${y}-${String(monthIndex + 1).padStart(2, '0')}-${d}`;
        }
    }
    return '';
}

function formatYMDToIndo(ymdStr) {
    if (!ymdStr) return '-';
    if (/^\d{4}-\d{2}-\d{2}$/.test(ymdStr)) {
        const parts = ymdStr.split('-');
        const y = parts[0];
        const mIdx = parseInt(parts[1], 10) - 1;
        const d = String(parseInt(parts[2], 10)).padStart(2, '0');
        if (mIdx >= 0 && mIdx < 12) {
            return `${d} ${NAMA_BULAN_ID[mIdx]} ${y}`;
        }
    }
    return ymdStr;
}

function formatYMDToDMY(ymdStr) {
    if (!ymdStr) return '--';
    if (/^\d{4}-\d{2}-\d{2}$/.test(ymdStr)) {
        const parts = ymdStr.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return ymdStr;
}

const NAMA_BULAN_SINGKAT_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function formatTanggalSingkat3Huruf(str) {
    if (!str || str === '-' || str === '--') return '-';
    if (typeof str !== 'string') str = String(str);
    const trimmed = str.trim();
    if (trimmed.toLowerCase().includes('tidak')) return 'Tidak Aktif';

    // Cek format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const parts = trimmed.split('-');
        const y = parts[0];
        const mIdx = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (mIdx >= 0 && mIdx < 12) {
            return `${d} ${NAMA_BULAN_SINGKAT_ID[mIdx]} ${y}`;
        }
    }

    // Cek format DD/MM/YYYY atau DD-MM-YYYY
    const slashMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (slashMatch) {
        const d = parseInt(slashMatch[1], 10);
        const mIdx = parseInt(slashMatch[2], 10) - 1;
        const y = slashMatch[3];
        if (mIdx >= 0 && mIdx < 12) {
            return `${d} ${NAMA_BULAN_SINGKAT_ID[mIdx]} ${y}`;
        }
    }

    // Cek format teks "01 Januari 2026" atau "1 Jan 2026"
    const textMatch = trimmed.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/);
    if (textMatch) {
        const d = parseInt(textMatch[1], 10);
        const mStr = textMatch[2].toLowerCase();
        const y = textMatch[3];
        const mIdx = NAMA_BULAN_ID.findIndex(b => b.toLowerCase().startsWith(mStr.slice(0, 3)) || mStr.startsWith(b.toLowerCase().slice(0, 3)));
        if (mIdx !== -1) {
            return `${d} ${NAMA_BULAN_SINGKAT_ID[mIdx]} ${y}`;
        }
    }

    return trimmed;
}

// KONTROL POPUP MODAL MASTER PEGAWAI
function bukaModalMasterPegawai() {
    const modal = document.getElementById("modalMasterPegawai");
    if (!modal) return;
    resetFormMasterPegawai();
    modal.style.display = "flex";
}

function tutupModalMasterPegawai() {
    const modal = document.getElementById("modalMasterPegawai");
    if (modal) modal.style.display = "none";
}

function toggleFormMasterPegawai(forceState = null) {
    if (forceState === true) {
        bukaModalMasterPegawai();
    } else if (forceState === false) {
        tutupModalMasterPegawai();
    } else {
        const modal = document.getElementById("modalMasterPegawai");
        if (modal && modal.style.display === "flex") {
            tutupModalMasterPegawai();
        } else {
            bukaModalMasterPegawai();
        }
    }
}

// EVENT CHANGE: JABATAN POSISI & JOB SET (ATURAN GAJI & JAM SHIFT)
function onJabatanPosisiChange() {
    const jabatan = document.getElementById("masterJabatanPosisi")?.value;
    const jobSetEl = document.getElementById("masterJobSet");
    if (!jobSetEl) return;

    if (jabatan === "Tenaga Keamanan" || jabatan === "Tenaga Keamanan - PPPK") {
        jobSetEl.value = "Satpam";
    } else if (jabatan === "Tenaga Kebersihan" || jabatan === "Tenaga Kebersihan - PPPK") {
        jobSetEl.value = "Staff - 2";
    } else if (jabatan === "Tenaga Pengemudi" || jabatan === "Tenaga Pengemudi - PPPK" || jabatan === "Tenaga Pramubakti" || jabatan === "Tenaga Pramubakti - PPPK" || jabatan === "ASN PPPK") {
        jobSetEl.value = "Staff - 1";
    }
    onJobSetChange();
}

function onJobSetChange() {
    const jobSet = document.getElementById("masterJobSet")?.value;
    const nominalEl = document.getElementById("masterNominal");
    const infoJudul = document.getElementById("infoJobSetJudul");
    const infoDesc = document.getElementById("infoJobSetDesc");

    // Aturan Penentuan Default Gaji & Jam Kerja Shift:
    // Satpam = Rp. 3.600.000
    // Staff - 1 = Rp. 3.600.000
    // Staff - 2 = Rp. 3.400.000
    if (jobSet === "Satpam") {
        if (nominalEl) nominalEl.value = "Rp. 3.600.000";
        if (infoJudul) infoJudul.innerText = "Shift Satpam (24 Jam Rotasi Berputar)";
        if (infoDesc) infoDesc.innerText = "Aturan jam kerja rotasi shift (Pagi/Siang/Malam/Libur). Standar honor: Rp. 3.600.000";
    } else if (jobSet === "Staff - 1") {
        if (nominalEl) nominalEl.value = "Rp. 3.600.000";
        if (infoJudul) infoJudul.innerText = "Jam Kerja Kantor Standar (Staff - 1 / Pramubakti / Pengemudi)";
        if (infoDesc) infoDesc.innerText = "Senin s/d Jumat (07:30 - 16:00 WIT). Standar honor: Rp. 3.600.000";
    } else if (jobSet === "Staff - 2") {
        if (nominalEl) nominalEl.value = "Rp. 3.400.000";
        if (infoJudul) infoJudul.innerText = "Jam Kerja Operasional & Kebersihan (Staff - 2)";
        if (infoDesc) infoDesc.innerText = "Jadwal kerja operasional kantor & kebersihan. Standar honor: Rp. 3.400.000";
    }
}

function switchSubtabPegawai(statusTab) {
    window.activeSubtabPegawai = statusTab;
    const btnAktif = document.getElementById("tabBtnPegawaiAktif");
    const btnTidakAktif = document.getElementById("tabBtnPegawaiTidakAktif");

    if (statusTab === 'aktif') {
        if (btnAktif) { btnAktif.classList.add("active", "tab-aktif"); }
        if (btnTidakAktif) { btnTidakAktif.classList.remove("active", "tab-tidak-aktif"); }
    } else {
        if (btnTidakAktif) { btnTidakAktif.classList.add("active", "tab-tidak-aktif"); }
        if (btnAktif) { btnAktif.classList.remove("active", "tab-aktif"); }
    }

    renderTabelDatabasePegawai();
}

function resetFormMasterPegawai() {
    const titleEl = document.getElementById("formMasterTitle");
    if (titleEl) {
        titleEl.innerHTML = `
            <span class="badge-mode-master badge-mode-tambah">Tambah Baru</span>
            <span>Tambah Pegawai ke Database Master</span>
        `;
    }
    const saveBtn = document.querySelector("#modalMasterPegawai .btn-modal-save");
    if (saveBtn) {
        saveBtn.innerHTML = `
            <svg class="icon-svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Simpan Pegawai Baru
        `;
    }
    const idEl = document.getElementById("masterId");
    if (idEl) { idEl.value = ""; idEl.readOnly = false; }
    if (document.getElementById("masterStatus")) document.getElementById("masterStatus").value = "Aktif";
    if (document.getElementById("masterNama")) document.getElementById("masterNama").value = "";
    if (document.getElementById("masterTglLahir")) document.getElementById("masterTglLahir").value = "";
    if (document.getElementById("masterAlamat")) document.getElementById("masterAlamat").value = "";
    if (document.getElementById("masterJabatanPosisi")) document.getElementById("masterJabatanPosisi").value = "Tenaga Keamanan - PPPK";
    if (document.getElementById("masterJobSet")) document.getElementById("masterJobSet").value = "Satpam";
    if (document.getElementById("masterKontrakMulai")) document.getElementById("masterKontrakMulai").value = "2026-01-01";
    if (document.getElementById("masterKontrakBerakhir")) document.getElementById("masterKontrakBerakhir").value = "2026-12-31";
    if (document.getElementById("masterKontrak")) document.getElementById("masterKontrak").value = "";
    if (document.getElementById("masterNominal")) document.getElementById("masterNominal").value = "Rp. 3.600.000";
    if (document.getElementById("masterUnitKerja")) document.getElementById("masterUnitKerja").value = "Kanreg XIV BKN";
    onJobSetChange();
}

function simpanMasterPegawai() {
    const user = window.currentUser || (typeof activeUser !== "undefined" ? activeUser : null);
    const database = (typeof db !== "undefined" && db) ? db : (typeof firebase !== "undefined" && firebase.database ? firebase.database() : null);
    
    if (!database) {
        alert("Koneksi database belum siap. Silakan muat ulang halaman!");
        return;
    }

    const id = document.getElementById("masterId")?.value.trim();
    const status = document.getElementById("masterStatus")?.value || "Aktif";
    const nama = document.getElementById("masterNama")?.value.trim();
    const tglLahirRaw = document.getElementById("masterTglLahir")?.value;
    const alamat = document.getElementById("masterAlamat")?.value.trim() || "--";
    const jabatanPosisi = document.getElementById("masterJabatanPosisi")?.value || "--";
    const jobSet = document.getElementById("masterJobSet")?.value || "Staff - 1";
    const kontrakMulaiRaw = document.getElementById("masterKontrakMulai")?.value;
    const kontrakBerakhirRaw = document.getElementById("masterKontrakBerakhir")?.value;
    const nomorKontrak = document.getElementById("masterKontrak")?.value.trim() || "-";
    const nominal = document.getElementById("masterNominal")?.value.trim() || "Rp. 3.600.000";
    let unitKerja = document.getElementById("masterUnitKerja")?.value || "Kanreg XIV BKN";
    if (unitKerja === "Kanreg XIV") unitKerja = "Kanreg XIV BKN";
    if (unitKerja === "UPT Sorong") unitKerja = "UPT BKN Sorong";

    if (!id || !nama) {
        alert("Harap lengkapi ID Pegawai dan Nama Lengkap PPNPN!");
        return;
    }

    // Format Tanggal untuk Tampilan & Kompatibilitas
    const tglLahir = tglLahirRaw ? formatYMDToDMY(tglLahirRaw) : "--";
    const kontrakMulai = (status === 'Tidak Aktif' && !kontrakMulaiRaw) ? "Tidak Aktif" : (kontrakMulaiRaw ? formatYMDToIndo(kontrakMulaiRaw) : "-");
    const kontrakBerakhir = (status === 'Tidak Aktif' && !kontrakBerakhirRaw) ? "Tidak Aktif" : (kontrakBerakhirRaw ? formatYMDToIndo(kontrakBerakhirRaw) : "-");

    let role = "STAFF";
    if (jobSet.toLowerCase().includes("satpam")) {
        role = "SATPAM";
    } else if (jobSet.toLowerCase().includes("magang")) {
        role = "MAGANG";
    }

    const payload = {
        id: id,
        status: status,
        nama: nama,
        tglLahir: tglLahir,
        alamat: alamat,
        jabatanPosisi: jabatanPosisi,
        jobSet: jobSet,
        role: role,
        kontrakMulai: kontrakMulai,
        kontrakBerakhir: kontrakBerakhir,
        nomorKontrak: nomorKontrak,
        nominal: nominal,
        unitKerja: unitKerja,
        hadir: 0,
        tk: 0,
        cs: 0,
        ct: 0,
        dl: 0,
        updatedAt: new Date().toISOString(),
        updatedBy: user ? (user.nama || user.username || "Operator") : "User"
    };

    database.ref('databasePegawai/' + id).set(payload, (err) => {
        if (err) {
            alert("Gagal menyimpan pegawai: " + err.message);
        } else {
            alert(`✅ Data Pegawai [${id} - ${nama}] berhasil disimpan ke Database Master!`);
            tutupModalMasterPegawai();
            muatDatabasePegawai();
        }
    });
}

function muatDatabasePegawai() {
    const database = (typeof db !== "undefined" && db) ? db : (typeof firebase !== "undefined" && firebase.database ? firebase.database() : null);
    const tbody = document.getElementById("tbodyDatabasePegawai");
    if (!tbody) return;

    if (!database) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding: 20px; color: var(--text-muted);"><span class="spinner-login"></span> Menghubungkan ke Database Master...</td></tr>`;
        setTimeout(muatDatabasePegawai, 600);
        return;
    }

    database.ref('databasePegawai').on('value', (snapshot) => {
        window.cachedListPegawai = [];

        if (!snapshot.exists()) {
            renderTabelDatabasePegawai();
            return;
        }

        snapshot.forEach((child) => {
            const val = child.val();
            if (val) {
                if (!val.id) val.id = child.key;
                window.cachedListPegawai.push(val);
            }
        });

        // Urutkan berdasarkan ID
        window.cachedListPegawai.sort((a, b) => (a.id || '').localeCompare(b.id || '', undefined, { numeric: true }));

        try {
            localStorage.setItem('cached_database_pegawai', JSON.stringify(window.cachedListPegawai));
        } catch (e) {}

        renderTabelDatabasePegawai();

        // Sinkronkan tabel rekapitulasi kehadiran jika laporan final sedang aktif
        if (typeof muatRekapKehadiranDariPilihan === 'function' && window.activeRekapPeriodeKey) {
            muatRekapKehadiranDariPilihan();
        }

        // Sinkronkan tabel presensi harian jika sedang ditampilkan
        if (typeof renderTabel === 'function' && window.tableDataMaster && window.tableDataMaster.length > 0) {
            filterData();
        }
    }, (error) => {
        console.error("Error Firebase Database Pegawai:", error);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding: 20px; color: #b91c1c;">Gagal memuat database pegawai: ${error.message}</td></tr>`;
        }
    });
}

function renderTabelDatabasePegawai() {
    const tbody = document.getElementById("tbodyDatabasePegawai");
    if (!tbody) return;

    const listSemua = window.cachedListPegawai || [];
    const listAktif = listSemua.filter(p => (p.status || 'Aktif').toLowerCase() === 'aktif');
    const listTidakAktif = listSemua.filter(p => (p.status || '').toLowerCase().includes('tidak'));

    // Update Counter di Tombol Tab
    if (document.getElementById("countPegawaiAktif")) document.getElementById("countPegawaiAktif").innerText = listAktif.length;
    if (document.getElementById("countPegawaiTidakAktif")) document.getElementById("countPegawaiTidakAktif").innerText = listTidakAktif.length;

    // Filter daftar sesuai tab aktif saat ini
    const isAktifTab = (window.activeSubtabPegawai === 'aktif');
    const listTampil = isAktifTab ? listAktif : listTidakAktif;

    tbody.innerHTML = "";

    if (listTampil.length === 0) {
        let pesanKosong = isAktifTab 
            ? "Belum ada data pegawai dengan status Aktif.<br><small style='font-size:11px; color:var(--text-secondary);'>Gunakan tombol <b>Tambah Pegawai</b> di atas untuk menambahkan data baru.</small>"
            : "Tidak ada data pegawai dengan status Tidak Aktif.";

        tbody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align:center; padding: 24px 14px; color: var(--text-muted); font-style: italic; font-size: 11px;">
                    ${pesanKosong}
                </td>
            </tr>
        `;
        return;
    }

    listTampil.forEach((pegawai, idx) => {
        const tr = document.createElement("tr");
        const isAktif = (pegawai.status || 'Aktif').toLowerCase() === 'aktif';
        
        // Tandai baris data pegawai tidak aktif dengan warna abu-abu
        if (!isAktif) {
            tr.classList.add("row-pegawai-tidak-aktif");
        }

        const badgeStatus = isAktif 
            ? `<span class="badge-status-aktif">● Aktif</span>`
            : `<span class="badge-status-tidak-aktif">● Tidak Aktif</span>`;

        // Format Masa Kontrak: 2 Baris Badge Mulai & Akhir dengan Bulan 3 Huruf
        let htmlMasaKontrak = '';
        const kmRaw = (pegawai.kontrakMulai || '').trim();
        const kbRaw = (pegawai.kontrakBerakhir || '').trim();
        const isNonAktifKontrak = kmRaw.toLowerCase().includes('tidak') || kbRaw.toLowerCase().includes('tidak');

        if (isNonAktifKontrak && !kmRaw.includes('20') && !kbRaw.includes('20')) {
            htmlMasaKontrak = `<span class="badge-kontrak-nonaktif">Tidak Aktif</span>`;
        } else if (kmRaw || kbRaw) {
            const tglMulai = formatTanggalSingkat3Huruf(kmRaw);
            const tglAkhir = formatTanggalSingkat3Huruf(kbRaw);
            htmlMasaKontrak = `
                <div class="kontrak-cell-box">
                    <div class="kontrak-row">
                        <span class="badge-kontrak-tag badge-kontrak-mulai">Mulai</span>
                        <span class="kontrak-tgl">${tglMulai}</span>
                    </div>
                    <div class="kontrak-row">
                        <span class="badge-kontrak-tag badge-kontrak-akhir">Akhir</span>
                        <span class="kontrak-tgl">${tglAkhir}</span>
                    </div>
                </div>
            `;
        } else {
            htmlMasaKontrak = `<span style="color: #94a3b8; font-size: 10.5px;">-</span>`;
        }

        const badgeJob = pegawai.jobSet ? `<span style="font-size: 10.5px; padding: 2px 6px; border-radius: 4px; background: #f1f5f9; color: #475569; font-weight: 600;">${pegawai.jobSet}</span>` : '-';
        const badgeKontrak = (pegawai.nomorKontrak && pegawai.nomorKontrak !== 'Tidak Aktif' && pegawai.nomorKontrak !== 'Tidak aktif')
            ? `<span class="badge-kontrak">${pegawai.nomorKontrak}</span>`
            : `<span style="color: #94a3b8; font-style: italic; font-size: 10.5px;">${pegawai.nomorKontrak || 'Tidak Aktif'}</span>`;

        // Kolom Alamat tidak ditampilkan di tabel, tetap tersimpan di database dan bisa diubah lewat modal edit
        tr.innerHTML = `
            <td style="text-align: center; font-size: 11px;">${idx + 1}</td>
            <td style="text-align: center; font-family: ui-monospace, monospace; font-weight: 700; font-size: 11px;">${pegawai.id}</td>
            <td style="text-align: center;">${badgeStatus}</td>
            <td style="padding-left: 8px; font-weight: 600; font-size: 11px;">${pegawai.nama}</td>
            <td style="text-align: center; font-size: 11px; color: #475569;">${pegawai.tglLahir || '--'}</td>
            <td style="font-size: 11px;">${pegawai.jabatanPosisi || '--'}</td>
            <td style="text-align: center;">${badgeJob}</td>
            <td style="padding: 3px 6px;">${htmlMasaKontrak}</td>
            <td style="font-size: 10.5px;">${badgeKontrak}</td>
            <td style="text-align: right; padding-right: 8px; font-size: 11px; font-weight: 600;">${pegawai.nominal || '-'}</td>
            <td style="text-align: center;">
                <div style="display: inline-flex; gap: 4px; align-items: center; justify-content: center;">
                    <button type="button" class="btn btn-ghost" style="height: 24px; padding: 0 6px; font-size: 10.5px; border: 1px solid var(--border-subtle);" onclick="editMasterPegawai('${pegawai.id}')" title="Ubah Data Pegawai Ini (Termasuk Alamat)">
                        <svg class="icon-svg" viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Edit
                    </button>
                    <button type="button" class="btn btn-hapus-pegawai" style="height: 24px; padding: 0 6px; font-size: 10.5px;" onclick="hapusMasterPegawai('${pegawai.id}', '${pegawai.nama}')" title="Hapus Pegawai">
                        <svg class="icon-svg" viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        Hapus
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function editMasterPegawai(id) {
    const database = (typeof db !== "undefined" && db) ? db : (typeof firebase !== "undefined" && firebase.database ? firebase.database() : null);
    if (!database) return;

    database.ref('databasePegawai/' + id).once('value', (snapshot) => {
        const p = snapshot.val();
        if (!p) return;

        bukaModalMasterPegawai();
        const titleEl = document.getElementById("formMasterTitle");
        if (titleEl) {
            titleEl.innerHTML = `
                <span class="badge-mode-master badge-mode-edit">Mode Edit</span>
                <span>Edit Pegawai: [${p.id}] ${p.nama}</span>
            `;
        }
        const saveBtn = document.querySelector("#modalMasterPegawai .btn-modal-save");
        if (saveBtn) {
            saveBtn.innerHTML = `
                <svg class="icon-svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Simpan Perubahan Master
            `;
        }

        const idEl = document.getElementById("masterId");
        if (idEl) { idEl.value = p.id; idEl.readOnly = true; }
        if (document.getElementById("masterStatus")) document.getElementById("masterStatus").value = p.status || "Aktif";
        if (document.getElementById("masterNama")) document.getElementById("masterNama").value = p.nama || "";
        if (document.getElementById("masterTglLahir")) document.getElementById("masterTglLahir").value = parseStringToYMD(p.tglLahir) || "";
        if (document.getElementById("masterAlamat")) document.getElementById("masterAlamat").value = p.alamat || "";

        // Jabatan Posisi Dropdown
        const jabEl = document.getElementById("masterJabatanPosisi");
        if (jabEl) {
            jabEl.value = p.jabatanPosisi || "Tenaga Keamanan";
            if (p.jabatanPosisi && jabEl.value !== p.jabatanPosisi) {
                const opt = new Option(p.jabatanPosisi, p.jabatanPosisi, true, true);
                jabEl.add(opt);
            }
        }

        // Job Set Dropdown
        const jobEl = document.getElementById("masterJobSet");
        if (jobEl) {
            jobEl.value = p.jobSet || "Satpam";
            if (p.jobSet && jobEl.value !== p.jobSet) {
                const opt = new Option(p.jobSet, p.jobSet, true, true);
                jobEl.add(opt);
            }
        }

        if (document.getElementById("masterKontrakMulai")) document.getElementById("masterKontrakMulai").value = parseStringToYMD(p.kontrakMulai) || "";
        if (document.getElementById("masterKontrakBerakhir")) document.getElementById("masterKontrakBerakhir").value = parseStringToYMD(p.kontrakBerakhir) || "";
        if (document.getElementById("masterKontrak")) document.getElementById("masterKontrak").value = p.nomorKontrak || "";
        if (document.getElementById("masterNominal")) document.getElementById("masterNominal").value = p.nominal || "Rp. 3.600.000";
        let uFix = p.unitKerja || "Kanreg XIV BKN";
        if (uFix === "Kanreg XIV") uFix = "Kanreg XIV BKN";
        if (uFix === "UPT Sorong") uFix = "UPT BKN Sorong";
        if (document.getElementById("masterUnitKerja")) document.getElementById("masterUnitKerja").value = uFix;

        onJobSetChange();
    });
}

function hapusMasterPegawai(id, nama) {
    const user = window.currentUser || (typeof activeUser !== "undefined" ? activeUser : null);
    if (user && user.role !== 'administrator') {
        alert("Hanya Administrator yang memiliki wewenang untuk menghapus pegawai dari Database Master.");
        return;
    }

    const database = (typeof db !== "undefined" && db) ? db : (typeof firebase !== "undefined" && firebase.database ? firebase.database() : null);
    if (!database) return;

    if (confirm(`Apakah Anda yakin ingin menghapus pegawai [${id} - ${nama}] dari Database Master?`)) {
        database.ref('databasePegawai/' + id).remove((err) => {
            if (err) {
                alert("Gagal menghapus: " + err.message);
            } else {
                alert(`✅ Pegawai [${nama}] berhasil dihapus dari Database Master.`);
            }
        });
    }
}

// ==========================================================================
// FITUR AUTO-HIDE / COLLAPSIBLE TABEL MASTER PEGAWAI & PPNPN
// ==========================================================================
function toggleTabelMasterPegawai(forceOpen) {
    const body = document.getElementById('collapsibleMasterPegawaiBody');
    const label = document.getElementById('labelToggleMaster');
    const chevron = document.getElementById('iconChevronMaster');
    const badge = document.getElementById('badgeCollapseMaster');
    if (!body) return;

    const isCurrentlyHidden = (body.style.display === 'none' || !body.style.display);
    const shouldOpen = (forceOpen !== undefined) ? forceOpen : isCurrentlyHidden;

    if (shouldOpen) {
        body.style.display = 'block';
        if (label) label.innerText = 'Tutup Tabel Pegawai';
        if (chevron) chevron.style.transform = 'rotate(180deg)';
        if (badge) {
            badge.innerText = 'Terbuka';
            badge.classList.add('badge-open');
        }
        // Render data pegawai jika ada data di cache atau panggil muatDatabasePegawai
        if (typeof renderTabelDatabasePegawai === 'function') {
            renderTabelDatabasePegawai();
        }
        if (!window.cachedListPegawai || window.cachedListPegawai.length === 0) {
            if (typeof muatDatabasePegawai === 'function') muatDatabasePegawai();
        }
    } else {
        body.style.display = 'none';
        if (label) label.innerText = 'Buka Tabel Pegawai';
        if (chevron) chevron.style.transform = 'rotate(0deg)';
        if (badge) {
            badge.innerText = 'Tersembunyi';
            badge.classList.remove('badge-open');
        }
    }
}