function bukaModalPegawaiManual() {
    let selectBulan = document.getElementById('modalPilihBulan');
    let selectTahun = document.getElementById('modalPilihTahun');
    
    let d = new Date();
    let currentYr = d.getFullYear();
    let currentMth = d.getMonth();
    
    let defaultMth = currentMth === 0 ? 11 : currentMth - 1;
    let defaultYr = currentMth === 0 ? currentYr - 1 : currentYr;
    
    selectTahun.innerHTML = '';
    for (let y = currentYr - 2; y <= currentYr + 3; y++) {
        let opt = document.createElement('option');
        opt.value = y;
        opt.text = y;
        if (y === defaultYr) opt.selected = true;
        selectTahun.appendChild(opt);
    }

    selectBulan.value = defaultMth;
    document.getElementById('modalPegawaiManual').style.display = 'flex';
}

function tutupModalPegawaiManual() {
    document.getElementById('modalPegawaiManual').style.display = 'none';
}

function resetFormModalPegawai() {
    let container = document.getElementById('pegawaiInputContainer');
    container.innerHTML = `
        <div class="pegawai-row-input">
            <input type="text" placeholder="ID Pegawai" class="input-modal-id">
            <input type="text" placeholder="Nama Lengkap" class="input-modal-nama">
            <select class="input-modal-role" style="max-width: 130px;">
                <option value="">-- Kategori --</option>
                <option value="STAFF">STAFF</option>
                <option value="SATPAM">SATPAM</option>
                <option value="MAGANG">MAGANG</option>
            </select>
            <button type="button" class="btn-hapus" onclick="hapusBarisInputModal(this)">✕</button>
        </div>
    `;
}

function bukaModalBulkText() {
    document.getElementById('bulkTextarea').value = '';
    document.getElementById('modalBulkText').style.display = 'flex';
}

function tutupModalBulkText() {
    document.getElementById('modalBulkText').style.display = 'none';
}

function tambahBarisInputModal(id = '', nama = '', role = '') {
    let container = document.getElementById('pegawaiInputContainer');
    let div = document.createElement('div');
    div.className = 'pegawai-row-input';
    div.innerHTML = `
        <input type="text" placeholder="ID Pegawai" class="input-modal-id" value="${id}">
        <input type="text" placeholder="Nama Lengkap" class="input-modal-nama" value="${nama}">
        <select class="input-modal-role" style="max-width: 130px;">
            <option value="" ${role === '' ? 'selected' : ''}>-- Kategori --</option>
            <option value="STAFF" ${role === 'STAFF' ? 'selected' : ''}>STAFF</option>
            <option value="SATPAM" ${role === 'SATPAM' ? 'selected' : ''}>SATPAM</option>
            <option value="MAGANG" ${role === 'MAGANG' ? 'selected' : ''}>MAGANG</option>
        </select>
        <button type="button" class="btn-hapus" onclick="hapusBarisInputModal(this)">✕</button>
    `;
    container.appendChild(div);
}

function hapusBarisInputModal(btn) {
    let container = document.getElementById('pegawaiInputContainer');
    if (container.children.length > 1) {
        btn.closest('.pegawai-row-input').remove();
    } else {
        let row = container.children[0];
        row.querySelector('.input-modal-id').value = '';
        row.querySelector('.input-modal-nama').value = '';
        row.querySelector('.input-modal-role').value = '';
    }
}

function prosesBulkTextToRows() {
    let rawText = document.getElementById('bulkTextarea').value.trim();
    if (!rawText) {
        alert("Harap masukkan/tempelkan teks daftar pegawai terlebih dahulu!");
        return;
    }

    let lines = rawText.split('\n');
    let parsedData = [];
    let invalidLines = [];

    lines.forEach((line, index) => {
        let cleanLine = line.trim();
        if (!cleanLine) return; 

        let parts = [];
        if (cleanLine.includes(',')) {
            parts = cleanLine.split(',').map(s => s.trim());
        } else if (cleanLine.includes('-')) {
            parts = cleanLine.split('-').map(s => s.trim());
        } else {
            let match = cleanLine.match(/^(\S+)\s+(.+)$/);
            if (match) {
                parts = [match[1], match[2]];
            }
        }

        if (parts.length >= 2 && parts[0] && parts[1]) {
            let id = parts[0];
            let nama = parts.slice(1).join(' ').trim(); 
            if (id.length >= 1 && nama.length >= 1) {
                parsedData.push({ id: id, nama: nama });
            } else {
                invalidLines.push(`Baris ${index + 1}: "${cleanLine}"`);
            }
        } else {
            invalidLines.push(`Baris ${index + 1}: "${cleanLine}"`);
        }
    });

    if (invalidLines.length > 0) {
        alert(`❌ FORMAT PENULISAN SALAH!\n\nTerdeteksi ${invalidLines.length} baris tidak sesuai format [ID] [NAMA]:\n\n` + invalidLines.slice(0, 5).join('\n') + (invalidLines.length > 5 ? '\n...' : '') + `\n\nSilakan perbaiki format penulisan dan coba lagi.`);
        return;
    }

    if (parsedData.length === 0) {
        alert("Tidak ada data pegawai valid yang berhasil diproses.");
        return;
    }

    let container = document.getElementById('pegawaiInputContainer');
    let firstRowId = container.querySelector('.input-modal-id').value.trim();
    let firstRowNama = container.querySelector('.input-modal-nama').value.trim();
    
    if (!firstRowId && !firstRowNama) {
        container.innerHTML = '';
    }

    parsedData.forEach(item => {
        tambahBarisInputModal(item.id, item.nama, '');
    });

    tutupModalBulkText();
    alert(`✅ Berhasil memasukkan ${parsedData.length} pegawai ke form! Silakan pilih Kategori (Staff/Satpam/Magang) untuk masing-masing pegawai, lalu klik Simpan Pegawai.`);
}

function simpanPegawaiManualPopUp() {
    let selectedBulan = parseInt(document.getElementById('modalPilihBulan').value);
    let selectedTahun = parseInt(document.getElementById('modalPilihTahun').value);

    let rows = document.querySelectorAll('.pegawai-row-input');
    let hasErrorRole = false;
    let validRowsCount = 0;

    rows.forEach(r => {
        let id = r.querySelector('.input-modal-id').value.trim();
        let nama = r.querySelector('.input-modal-nama').value.trim();
        let role = r.querySelector('.input-modal-role').value;

        if (id !== "" || nama !== "") {
            validRowsCount++;
            if (!role || role === "") {
                hasErrorRole = true;
            }
        }
    });

    if (validRowsCount === 0) {
        alert("Harap isi minimal 1 ID dan Nama Pegawai!");
        return;
    }

    if (hasErrorRole) {
        alert("❌ EROR: Kategori pegawai belum dipilih!\n\nHarap pilih Kategori (STAFF / SATPAM / MAGANG) untuk semua pegawai sebelum menyimpan.");
        return;
    }

    setBulanAktif(new Date(selectedTahun, selectedBulan, 1));
    let daysInMonth = new Date(selectedTahun, selectedBulan + 1, 0).getDate();
    let addedCount = 0;

    rows.forEach(r => {
        let id = r.querySelector('.input-modal-id').value.trim();
        let nama = r.querySelector('.input-modal-nama').value.trim();
        let role = r.querySelector('.input-modal-role').value;

        if (id !== "" && nama !== "" && role !== "") {
            dataPegawai[id] = nama;
            addedCount++;

            for (let d = 1; d <= daysInMonth; d++) {
                let isoDate = `${selectedTahun}-${String(selectedBulan+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                let key = id + "_" + isoDate;
                let dateObj = new Date(isoDate);
                let dayOfWeek = dateObj.getDay();

                let defaultShift = (dayOfWeek === 0 || dayOfWeek === 6) ? "OFF" : "P";

                if (!globalRekap[key]) {
                    globalRekap[key] = {
                        id: id,
                        nama: nama,
                        tanggal: isoDate,
                        shiftTipe: defaultShift,
                        waktuMasuk: null,
                        waktuPulang: null,
                        manualStatus: null,
                        role: role
                    };
                } else {
                    globalRekap[key].role = role;
                    globalRekap[key].nama = nama;
                }
            }
        }
    });

    if (addedCount > 0) {
        updateCheckboxPegawaiManual();
        updateFilterNamaDropdown();
        renderTabel();
        document.getElementById('sectionPresensi').style.display = 'block';
        document.getElementById('sectionManualWrapper').style.display = 'block';
        tutupModalPegawaiManual();
        alert(`✅ Berhasil menambahkan ${addedCount} pegawai untuk periode ${BULAN_INDO[selectedBulan]} ${selectedTahun}!`);
    }
}