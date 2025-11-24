// --- Variabel Global & Elemen DOM ---
const welcomeScreen = document.getElementById('welcome-screen');
const kkhApp = document.getElementById('kkh-app');
const startAppButton = document.getElementById('startAppButton');
const backToWelcomeButton = document.getElementById('backToWelcome');

const kinerjaTableBody = document.querySelector('#kinerja-table tbody');
const pdfTableBody = document.getElementById('pdf-table-body');
const addRowButton = document.getElementById('addRow');
const downloadPdfButton = document.getElementById('downloadPdf');
const saveFormButton = document.getElementById('saveForm');
const downloadAllButton = document.getElementById('downloadAll');
const historyList = document.getElementById('history-list');
const inputDate = document.getElementById('hari_tgl');
const pageIdEl = document.getElementById('page-id');
const PAGE_ID = pageIdEl ? pageIdEl.value : (window.location.pathname || '').split('/').pop() || 'unknown';
let rowCount = 0;
// Auto-save disabled: saving will occur only when user clicks the Save button

// --- Inisialisasi dan Navigasi ---
function initializeApp() {
    // If a welcome screen exists, show it; otherwise open the app directly
    if (welcomeScreen) {
        welcomeScreen.style.display = 'flex';
        kkhApp.style.display = 'none';

        if (startAppButton) {
            startAppButton.addEventListener('click', (e) => {
                if (e && e.preventDefault) e.preventDefault();
                showFancyAlert('Silahkan pilih Bidang Tugas anda dan lanjutkan', showWelcomeScreen);
            });
        }

        if (backToWelcomeButton) {
            backToWelcomeButton.addEventListener('click', () => {
                showWelcomeScreen();
            });
        }
    } else {
        // No welcome screen on this page: show app immediately
        kkhApp.style.display = 'block';
        if (startAppButton) {
            startAppButton.addEventListener('click', (e) => {
                if (e && e.preventDefault) e.preventDefault();
                // no welcome screen; show an instruction modal only
                showFancyAlert('Silahkan pilih Bidang Tugas anda dan lanjutkan', function() {});
            });
        }
    }

    loadInitialData();
    renderHistory(); // Muat riwayat lokal (jika ada)
    setupKkhEventListeners();
}

function showWelcomeScreen() {
    if (!welcomeScreen) return;
    welcomeScreen.style.display = 'flex';
    kkhApp.style.display = 'none';
}

function showKkhForm() {
    if (welcomeScreen) welcomeScreen.style.display = 'none';
    kkhApp.style.display = 'block';
    // add reveal animation class to app container
    const appContainer = kkhApp.querySelector('.app-container');
    if (appContainer) {
        appContainer.classList.remove('kkh-fade-in');
        // trigger reflow to restart animation
        void appContainer.offsetWidth;
        appContainer.classList.add('kkh-fade-in');
        // remove class after animation so it can be reused
        setTimeout(() => appContainer.classList.remove('kkh-fade-in'), 600);
    }
}

function setupKkhEventListeners() {
    addRowButton.addEventListener('click', () => {
        addKinerjaRow();
        showToast('Baris kinerja ditambahkan', 'success');
    });
    saveFormButton.addEventListener('click', () => {
        const data = getFormData();
        if (!data.tanggal || data.kinerja.length === 0) {
            showToast('Harap isi Tanggal dan setidaknya satu Uraian Pekerjaan', 'error');
            return;
        }
        // attach page id so history is scoped to this page
        data.page = PAGE_ID;
        saveDataLocally(data);
        showToast(`✅ Data kinerja ${formatDateID(data.tanggal)} berhasil disimpan`, 'success');
    });
    downloadPdfButton.addEventListener('click', generatePdf);
    downloadAllButton.addEventListener('click', downloadAllPdf);
    // Mobile FABs removed — handlers no longer required
    
    // NOTE: auto-save listeners removed — data will only be saved when
    // the user explicitly clicks the Save button (`#saveForm`).

    // Initialize header scroll behavior for mobile/Android: change header style on scroll
    initHeaderScrollBehavior();
}

function setupAutoSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        const data = getFormData();
        if (data.tanggal && data.kinerja.length > 0) {
            saveDataLocally(data);
            console.log('📝 Auto-save: Data tersimpan di riwayat');
        }
    }, 2000); // Simpan 2 detik setelah user selesai mengedit
}

// Auto-save function removed — saving is manual via #saveForm button.

// --- Utilities ---
function formatDateID(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    if (isNaN(date.getTime())) return dateString;
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('id-ID', options);
}

// Read a File as Data URL (base64)
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Resize/compress a dataURL image using canvas; returns a new dataURL
function resizeImageDataUrl(dataUrl, maxWidth = 800, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            let { width, height } = img;
            if (width > maxWidth) {
                const ratio = maxWidth / width;
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            try {
                const out = canvas.toDataURL('image/jpeg', quality);
                resolve(out);
            } catch (e) {
                reject(e);
            }
        };
        img.onerror = (e) => reject(e);
        img.crossOrigin = 'anonymous';
        img.src = dataUrl;
    });
}

function getFormData() {
    const kinerjaData = [];
    const rows = kinerjaTableBody.querySelectorAll('tr');
    
    rows.forEach((row) => {
        const waktuEl = row.querySelector('.waktu-input');
        const uraianEl = row.querySelector('.uraian-input');
        const statusEl = row.querySelector('.status-input');
        const cekEl = row.querySelector('.cek-input');
        const photoData = row.dataset.photo || null;

        if (waktuEl && uraianEl) {
            const waktu = waktuEl.value.trim();
            const uraian = uraianEl.value.trim();
            const status = statusEl ? statusEl.value : 'N/A';
            const cek = cekEl ? cekEl.checked : false;

            if (uraian) { 
                kinerjaData.push({ waktu, uraian, status, cek, photo: photoData });
            }
        }
    });
    
    return {
        nama: document.getElementById('nama').value.toUpperCase(),
        nip: document.getElementById('nip').value,
        bidang: document.getElementById('bidang').value,
        tanggal: document.getElementById('hari_tgl').value,
        kinerja: kinerjaData // Data Kinerja dalam Array
    };
}

// --- Kinerja Row Management (Tidak Berubah) ---
function clearKinerjaRows() { kinerjaTableBody.innerHTML = ''; rowCount = 0; }
function addKinerjaRow(waktu = '', uraian = '', status = 'Selesai', cek = false) {
    rowCount++;
    const newRow = kinerjaTableBody.insertRow();
    newRow.innerHTML = `
        <td class="no-cell" style="width: 5%; text-align: center;">${rowCount}</td>
        <td style="width: 15%;"><input type="text" class="waktu-input" value="${waktu}" placeholder="08:00 - 09:00"></td>
        <td style="width: 45%;"><textarea class="uraian-input" rows="3" placeholder="Tuliskan pekerjaan..." oninput="this.style.height='auto'; this.style.height=(this.scrollHeight)+'px';">${uraian}</textarea></td>
        <td style="width: 12%;">
            <select class="status-input">
                <option value="Selesai" ${status === 'Selesai' ? 'selected' : ''}>Selesai</option>
                <option value="Proses" ${status === 'Proses' ? 'selected' : ''}>Proses</option>
                <option value="Pending" ${status === 'Pending' ? 'selected' : ''}>Pending</option>
            </select>
        </td>
        <td class="check-cell" style="width: 8%; text-align: center;"><input type="checkbox" class="cek-input" ${cek ? 'checked' : ''}></td>
        <td class="photo-cell" style="width: 15%; text-align: center;">
            <input type="file" accept="image/*" class="photo-input" />
            <div class="photo-thumb" style="margin-top:6px;"></div>
        </td>
    `;
    const textarea = newRow.querySelector('.uraian-input');
    if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = (textarea.scrollHeight) + 'px';

    }

    // initialize photo input handler
    const photoInput = newRow.querySelector('.photo-input');
    const thumb = newRow.querySelector('.photo-thumb');
    if (photoInput) {
        photoInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (file) {
                readFileAsDataURL(file).then(dataUrl => {
                    // resize/compress image to reduce storage usage (Android localStorage is limited)
                    resizeImageDataUrl(dataUrl, 800, 0.7).then(resized => {
                        newRow.dataset.photo = resized;
                        if (thumb) thumb.innerHTML = `<img src="${resized}" style="width:80px; height:auto; object-fit:cover; border:1px solid #ccc;" crossorigin="anonymous" />`;
                    }).catch(err => {
                        console.warn('Resize gagal, menggunakan original', err);
                        newRow.dataset.photo = dataUrl;
                        if (thumb) thumb.innerHTML = `<img src="${dataUrl}" style="width:80px; height:auto; object-fit:cover; border:1px solid #ccc;" crossorigin="anonymous" />`;
                    });
                }).catch(err => console.error('Gagal membaca foto per baris:', err));
            } else {
                delete newRow.dataset.photo;
                if (thumb) thumb.innerHTML = '';
            }
        });
    }

    // if initial photo was provided via dataset before insertion, show it
    if (newRow.dataset.photo && newRow.dataset.photo !== 'undefined') {
        if (thumb) thumb.innerHTML = `<img src="${newRow.dataset.photo}" style="width:80px; height:auto; object-fit:cover; border:1px solid #ccc;" crossorigin="anonymous" />`;
    }

    newRow.classList.add('row-enter');
    setTimeout(() => newRow.classList.remove('row-enter'), 700);
}



function loadInitialData() {
    if (!inputDate.value) { inputDate.value = new Date().toISOString().split('T')[0]; }
    if (kinerjaTableBody.children.length === 0) {
        clearKinerjaRows();
        addKinerjaRow();
        addKinerjaRow();
        addKinerjaRow();
        addKinerjaRow();
    }
}

// --- 3. PENYIMPANAN LOKAL ---
function saveDataLocally(data) {
    // include page id in key so entries are unique per page
    const page = data.page || PAGE_ID || 'unknown';
    const key = `${page}_${data.nip}_${data.tanggal}`;
    let history = JSON.parse(localStorage.getItem('kkh_history')) || [];

    const index = history.findIndex(item => item.key === key);
    if (index > -1) {
        history[index] = { key, page, ...data };
    } else {
        history.push({ key, page, ...data });
    }
    try {
        localStorage.setItem('kkh_history', JSON.stringify(history));
    } catch (e) {
        console.error('Gagal menyimpan ke localStorage:', e);
        showToast('Gagal menyimpan data: penyimpanan lokal penuh atau tidak tersedia pada perangkat ini. Coba kurangi ukuran foto atau gunakan perangkat lain.', 'error', 8000);
        return;
    }
    renderHistory();
}

// --- 4. Riwayat Data Lokal ---
function renderHistory() {
    const rawHistory = JSON.parse(localStorage.getItem('kkh_history')) || [];
    // Filter history to only show entries for this page
    const history = rawHistory.filter(h => h.page === PAGE_ID);
    historyList.innerHTML = '';

    if (history.length === 0) {
        historyList.innerHTML = '<li>Tidak ada data kinerja yang tersimpan untuk halaman ini.</li>';
        return;
    }

    history.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    history.forEach((item) => {
        const li = document.createElement('li');
        li.className = 'history-item';
        
        li.innerHTML = `
            <div class="history-item-info">
                <strong>${formatDateID(item.tanggal)}</strong>
                <span>${item.nama} | ${item.kinerja.length} Pekerjaan</span>
            </div>
            <div class="history-actions">
                <button class="load-button" data-key="${item.key}">📂 Muat Ulang</button>
                <button class="download-button" data-key="${item.key}">⬇ PDF</button>
                <button class="delete-button" data-key="${item.key}">🗑 Hapus</button>
            </div>
        `;
        historyList.appendChild(li);
    });

    historyList.querySelectorAll('.load-button').forEach(button => { button.addEventListener('click', (e) => { loadDataFromHistory(e); showToast('Riwayat dimuat', 'success'); }); });
    historyList.querySelectorAll('.download-button').forEach(button => { button.addEventListener('click', (e) => { downloadPdfFromHistory(e); showToast('Mempersiapkan PDF dari riwayat...', 'info'); }); });
    historyList.querySelectorAll('.delete-button').forEach(button => { button.addEventListener('click', (e) => { if (confirm('Hapus data ini?')) { deleteDataFromHistory(e); showToast('Data dihapus', 'success'); } else { showToast('Hapus dibatalkan', 'info'); } }); });
}

function loadDataFromHistory(event) {
    const key = event.target.dataset.key;
    const history = JSON.parse(localStorage.getItem('kkh_history')) || [];
    const dataToLoad = history.find(item => item.key === key);
    if (!dataToLoad) { showToast('Data riwayat tidak ditemukan.', 'error'); return; }
    
    document.getElementById('nama').value = dataToLoad.nama;
    document.getElementById('nip').value = dataToLoad.nip;
    document.getElementById('bidang').value = dataToLoad.bidang;
    document.getElementById('hari_tgl').value = dataToLoad.tanggal;

    clearKinerjaRows();
    dataToLoad.kinerja.forEach(kinerja => {
        addKinerjaRow(kinerja.waktu, kinerja.uraian, kinerja.status, kinerja.cek);
        // after adding row, if photo exists, set it on the last row
        if (kinerja.photo) {
            const lastRow = kinerjaTableBody.querySelector('tr:last-child');
            if (lastRow) {
                lastRow.dataset.photo = kinerja.photo;
                const thumb = lastRow.querySelector('.photo-thumb');
                if (thumb) thumb.innerHTML = `<img src="${kinerja.photo}" style="width:80px; height:auto; object-fit:cover; border:1px solid #ccc;" crossorigin="anonymous" />`;
            }
        }
    });

    showToast(`Data kinerja untuk tanggal ${formatDateID(dataToLoad.tanggal)} berhasil dimuat.`, 'success');
}

function deleteDataFromHistory(event) {
    if (!confirm("Apakah Anda yakin ingin menghapus data ini secara permanen dari penyimpanan lokal?")) { return; }
    const key = event.target.dataset.key;
    let history = JSON.parse(localStorage.getItem('kkh_history')) || [];
    
    history = history.filter(item => item.key !== key);
    localStorage.setItem('kkh_history', JSON.stringify(history));
    renderHistory();
    showToast('Data berhasil dihapus.', 'success');
}

function downloadPdfFromHistory(event) {
    const key = event.target.dataset.key;
    const history = JSON.parse(localStorage.getItem('kkh_history')) || [];
    const dataToDownload = history.find(item => item.key === key);
    if (!dataToDownload) { showToast('Data riwayat tidak ditemukan.', 'error'); return; }
    
    generatePdfFromData(dataToDownload);
}

// --- 5. FUNGSI GENERATE PDF ---
// PDF photo sizing (fixed size used when rendering PDF)
const PDF_PHOTO_WIDTH = 100; // px - adjust this to change photo width in PDF
const PDF_PHOTO_HEIGHT = 100; // px - adjust this to change photo height in PDF
const PDF_PHOTO_STYLE = `width:${PDF_PHOTO_WIDTH}px; height:${PDF_PHOTO_HEIGHT}px; object-fit:cover; border:1px solid #ccc;`;

async function generatePdfFromData(data) {
    const hari_tgl_formatted = formatDateID(data.tanggal);
    document.getElementById('out-nama').textContent = data.nama;
    document.getElementById('out-nip').textContent = data.nip;
    document.getElementById('out-bidang').textContent = data.bidang;
    document.getElementById('out-hari_tgl').textContent = hari_tgl_formatted;
    
    pdfTableBody.innerHTML = '';
    data.kinerja.forEach((item, index) => {
        const row = pdfTableBody.insertRow();
        const imgHtml = item.photo ? `<img src="${item.photo}" style="${PDF_PHOTO_STYLE}" crossorigin="anonymous" />` : '';
        row.innerHTML = `<td style="width: 5%; text-align: center;">${index + 1}</td><td style="width: 15%;">${item.waktu}</td><td style="width: 45%;">${item.uraian}</td><td style="width: 12%; text-align: center;">${item.status}</td><td style="width: 8%; text-align: center;">${item.cek ? '✓' : ''}</td><td style="width: 20%; text-align:center;">${imgHtml}</td>`;
    });
    
    const minRows = 10;
    const emptyRowsNeeded = minRows - data.kinerja.length;
        for (let i = 0; i < emptyRowsNeeded; i++) {
            const row = pdfTableBody.insertRow();
            row.innerHTML = `<td style="width: 5%; text-align: center;">${data.kinerja.length + i + 1}</td> <td style="width: 15%;">&nbsp;</td><td style="width: 45%;">&nbsp;</td><td style="width: 12%;">&nbsp;</td><td style="width: 8%;">&nbsp;</td><td style="width: 20%;">&nbsp;</td>`;
        }

    const kkhOutput = document.getElementById('kkh-output');

    // Preserve original inline styles to restore after rendering
    const originalInlineStyles = {
        display: kkhOutput.style.display || '',
        position: kkhOutput.style.position || '',
        left: kkhOutput.style.left || '',
        top: kkhOutput.style.top || '',
        width: kkhOutput.style.width || '',
        visibility: kkhOutput.style.visibility || '',
        backgroundColor: kkhOutput.style.backgroundColor || '',
        border: kkhOutput.style.border || ''
    };

    // Make the output visible but keep it off-screen so layout/fonts/images compute
    kkhOutput.style.display = 'block';
    kkhOutput.style.position = 'absolute';
    kkhOutput.style.left = '-9999px';
    kkhOutput.style.top = '0px';
    // Force A4 width in CSS so html2canvas lays out content to A4 dimensions
    kkhOutput.style.width = '210mm';
    kkhOutput.style.visibility = 'visible';
    kkhOutput.style.backgroundColor = '#ffffff';
    kkhOutput.style.border = 'none';

    // Wait for images inside the output to load to avoid missing logo on capture
    await waitForImagesToLoad(kkhOutput);

    // Use devicePixelRatio to choose a good scale for html2canvas (cap to 3)
    const dpr = window.devicePixelRatio || 1;
    const scaleForCanvas = Math.min(3, Math.max(1, Math.round(dpr * 1.5)));

    const canvas = await html2canvas(kkhOutput, {
        scale: scaleForCanvas,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
    });

    // Restore original inline styles
    kkhOutput.style.display = originalInlineStyles.display;
    kkhOutput.style.position = originalInlineStyles.position;
    kkhOutput.style.left = originalInlineStyles.left;
    kkhOutput.style.top = originalInlineStyles.top;
    kkhOutput.style.width = originalInlineStyles.width;
    kkhOutput.style.visibility = originalInlineStyles.visibility;
    kkhOutput.style.backgroundColor = originalInlineStyles.backgroundColor;
    kkhOutput.style.border = originalInlineStyles.border;

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');

    const pdfWidth = pdf.internal.pageSize.getWidth(); // mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // mm

    // Convert canvas to images per page to avoid scaling / cut issues on Android
    // Calculate pixels per mm based on canvas width
    const pxPerMm = canvas.width / pdfWidth;
    const pageHeightPx = Math.floor(pdfHeight * pxPerMm);

    let renderedHeight = 0;
    while (renderedHeight < canvas.height) {
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        const remaining = canvas.height - renderedHeight;
        pageCanvas.height = remaining > pageHeightPx ? pageHeightPx : remaining;

        const ctx = pageCanvas.getContext('2d');
        // fill white background for each page slice
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(canvas, 0, renderedHeight, pageCanvas.width, pageCanvas.height, 0, 0, pageCanvas.width, pageCanvas.height);

        const pageImgData = pageCanvas.toDataURL('image/png');

        if (renderedHeight > 0) pdf.addPage();
        // page height in mm for this slice
        const pageSliceHeightMm = pageCanvas.height / pxPerMm;
        pdf.addImage(pageImgData, 'PNG', 0, 0, pdfWidth, pageSliceHeightMm);

        renderedHeight += pageCanvas.height;
    }

    const filename = `KKH_${data.nip.replace(/\s/g, '')}_${data.tanggal.replace(/-/g, '')}.pdf`;
    pdf.save(filename);
}

async function generatePdf() {
    const data = getFormData();
    
    if (!data.tanggal || data.kinerja.length === 0) {
        showToast('Harap isi Tanggal dan setidaknya satu Uraian Pekerjaan sebelum mengunduh.', 'error');
        return;
    }

    const loader = showToast('Mempersiapkan PDF...', 'info', 60000);
    await generatePdfFromData(data);
    loader.hide();
    showToast('✅ PDF berhasil diunduh', 'success');
}

async function downloadAllPdf() {
    const rawHistory = JSON.parse(localStorage.getItem('kkh_history')) || [];
    // Only download entries for this page
    const history = rawHistory.filter(h => h.page === PAGE_ID);

    if (history.length === 0) {
        alert("Tidak ada data kinerja yang tersimpan untuk halaman ini.");
        return;
    }

    if (!confirm(`Anda akan mendownload ${history.length} file dari halaman ini sebagai satu file ZIP. Lanjutkan?`)) {
        showToast('Download dibatalkan.', 'info');
        return;
    }

    if (typeof JSZip === 'undefined' || typeof saveAs === 'undefined') {
        alert('Library JSZip/FileSaver tidak ditemukan. Pastikan index.html memuatnya.');
        return;
    }

    downloadAllButton.disabled = true;
    downloadAllButton.textContent = '⏳ Memproses...';
    showToast('Memproses semua PDF. Mohon tunggu...', 'info', 5000);

    const zip = new JSZip();

    for (let i = 0; i < history.length; i++) {
        const item = history[i];
        try {
            const blob = await generatePdfBlobFromData(item);
            const filename = `KKH_${item.nip.replace(/\s/g, '')}_${item.tanggal.replace(/-/g, '')}.pdf`;
            zip.file(filename, blob);
        } catch (err) {
            console.error('Gagal membuat PDF untuk', item, err);
        }
        // small delay to avoid heavy blocking UI
        await new Promise(resolve => setTimeout(resolve, 150));
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const outName = `KKH_all_${new Date().toISOString().slice(0,10)}.zip`;
    saveAs(zipBlob, outName);

    downloadAllButton.disabled = false;
    downloadAllButton.textContent = '📦 Download Semua';
    showToast(`✅ ${history.length} file dimasukkan ke ${outName} dan diunduh.`, 'success');
}

// Generate a PDF Blob from data (same layout as generatePdfFromData but returns a Blob instead of auto-saving)
async function generatePdfBlobFromData(data) {
    const hari_tgl_formatted = formatDateID(data.tanggal);
    document.getElementById('out-nama').textContent = data.nama;
    document.getElementById('out-nip').textContent = data.nip;
    document.getElementById('out-bidang').textContent = data.bidang;
    document.getElementById('out-hari_tgl').textContent = hari_tgl_formatted;
    
    pdfTableBody.innerHTML = '';
    data.kinerja.forEach((item, index) => {
        const row = pdfTableBody.insertRow();
        const imgHtml = item.photo ? `<img src="${item.photo}" style="${PDF_PHOTO_STYLE}" crossorigin="anonymous" />` : '';
        row.innerHTML = `<td style="width: 5%; text-align: center;">${index + 1}</td><td style="width: 15%;">${item.waktu}</td><td style="width: 45%;">${item.uraian}</td><td style="width: 12%; text-align: center;">${item.status}</td><td style="width: 8%; text-align: center;">${item.cek ? '✓' : ''}</td><td style="width: 20%; text-align:center;">${imgHtml}</td>`;
    });
    
    const minRows = 10;
    const emptyRowsNeeded = minRows - data.kinerja.length;
        for (let i = 0; i < emptyRowsNeeded; i++) {
            const row = pdfTableBody.insertRow();
            row.innerHTML = `<td style="width: 5%; text-align: center;">${data.kinerja.length + i + 1}</td> <td style="width: 15%;">&nbsp;</td><td style="width: 45%;">&nbsp;</td><td style="width: 12%;">&nbsp;</td><td style="width: 8%;">&nbsp;</td><td style="width: 20%;">&nbsp;</td>`;
        }

    const kkhOutput = document.getElementById('kkh-output');

    // Preserve original inline styles to restore after rendering
    const originalInlineStyles = {
        display: kkhOutput.style.display || '',
        position: kkhOutput.style.position || '',
        left: kkhOutput.style.left || '',
        top: kkhOutput.style.top || '',
        width: kkhOutput.style.width || '',
        visibility: kkhOutput.style.visibility || '',
        backgroundColor: kkhOutput.style.backgroundColor || '',
        border: kkhOutput.style.border || ''
    };

    // Make the output visible but keep it off-screen so layout/fonts/images compute
    kkhOutput.style.display = 'block';
    kkhOutput.style.position = 'absolute';
    kkhOutput.style.left = '-9999px';
    kkhOutput.style.top = '0px';
    // Force A4 width in CSS so html2canvas lays out content to A4 dimensions
    kkhOutput.style.width = '210mm';
    kkhOutput.style.visibility = 'visible';
    kkhOutput.style.backgroundColor = '#ffffff';
    kkhOutput.style.border = 'none';

    await waitForImagesToLoad(kkhOutput);

    const dpr = window.devicePixelRatio || 1;
    const scaleForCanvas = Math.min(3, Math.max(1, Math.round(dpr * 1.5)));

    const canvas = await html2canvas(kkhOutput, {
        scale: scaleForCanvas,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
    });

    // Restore original inline styles
    kkhOutput.style.display = originalInlineStyles.display;
    kkhOutput.style.position = originalInlineStyles.position;
    kkhOutput.style.left = originalInlineStyles.left;
    kkhOutput.style.top = originalInlineStyles.top;
    kkhOutput.style.width = originalInlineStyles.width;
    kkhOutput.style.visibility = originalInlineStyles.visibility;
    kkhOutput.style.backgroundColor = originalInlineStyles.backgroundColor;
    kkhOutput.style.border = originalInlineStyles.border;

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');

    const pdfWidth = pdf.internal.pageSize.getWidth(); // mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // mm

    const pxPerMm = canvas.width / pdfWidth;
    const pageHeightPx = Math.floor(pdfHeight * pxPerMm);

    let renderedHeight = 0;
    while (renderedHeight < canvas.height) {
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        const remaining = canvas.height - renderedHeight;
        pageCanvas.height = remaining > pageHeightPx ? pageHeightPx : remaining;

        const ctx = pageCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(canvas, 0, renderedHeight, pageCanvas.width, pageCanvas.height, 0, 0, pageCanvas.width, pageCanvas.height);

        const pageImgData = pageCanvas.toDataURL('image/png');

        if (renderedHeight > 0) pdf.addPage();
        const pageSliceHeightMm = pageCanvas.height / pxPerMm;
        pdf.addImage(pageImgData, 'PNG', 0, 0, pdfWidth, pageSliceHeightMm);

        renderedHeight += pageCanvas.height;
    }

    return pdf.output('blob');
}

// Helper: wait for all images in an element to be loaded (or error) before rendering
function waitForImagesToLoad(rootEl) {
    const imgs = Array.from(rootEl.querySelectorAll('img'));
    if (imgs.length === 0) return Promise.resolve();

    return new Promise((resolve) => {
        let remaining = imgs.length;
        imgs.forEach(img => {
            // If already complete (cached) treat as loaded
            if (img.complete && img.naturalWidth !== 0) {
                remaining -= 1;
                if (remaining === 0) resolve();
                return;
            }

            // Set crossOrigin if not set so html2canvas can use useCORS
            try { if (!img.getAttribute('crossorigin')) img.setAttribute('crossorigin', 'anonymous'); } catch (e) {}

            img.addEventListener('load', () => {
                remaining -= 1;
                if (remaining === 0) resolve();
            }, { once: true });
            img.addEventListener('error', () => {
                // still count errored images as "done" so rendering continues
                remaining -= 1;
                if (remaining === 0) resolve();
            }, { once: true });
        });
        // safety timeout: resolve after 3s even if some images stuck
        setTimeout(() => resolve(), 3000);
    });
}

// Header scroll behavior: toggle .scrolled on .header-title when page scroll passes threshold
function initHeaderScrollBehavior() {
    const header = document.querySelector('.header-title');
    if (!header) return;

    let ticking = false;
    const threshold = 12; // px to trigger change

    function onScroll() {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const scrolled = window.scrollY || document.documentElement.scrollTop;
                if (scrolled > threshold) {
                    header.classList.add('scrolled');
                } else {
                    header.classList.remove('scrolled');
                }
                ticking = false;
            });
            ticking = true;
        }
    }

    // Attach listener to window scroll and to touchmove for some Android browsers
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('touchmove', onScroll, { passive: true });

    // Run once to set initial state
    onScroll();
}

// Fancy alert modal used on welcome screen
function showFancyAlert(message, onOk) {
    // avoid duplicate overlays
    if (document.getElementById('fancy-alert-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'fancy-alert-overlay';
    overlay.className = 'fancy-alert-overlay';

    const box = document.createElement('div');
    box.className = 'fancy-alert-box';

    const title = document.createElement('h3');
    title.textContent = 'Silahkan Lanjutkan';

    const msg = document.createElement('p');
    msg.textContent = message;

    const btn = document.createElement('button');
    btn.className = 'fancy-alert-ok';
    btn.textContent = 'Lanjutkan';

    box.appendChild(title);
    box.appendChild(msg);
    box.appendChild(btn);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // focus
    btn.focus();

    function cleanup() {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        document.removeEventListener('keydown', onKey);
    }

    function onKey(e) {
        if (e.key === 'Escape') {
            cleanup();
        }
        if (e.key === 'Enter') {
            btn.click();
        }
    }

    overlay.addEventListener('click', (ev) => {
        if (ev.target === overlay) cleanup();
    });

    btn.addEventListener('click', () => {
        cleanup();
        if (typeof onOk === 'function') onOk();
    });

    document.addEventListener('keydown', onKey);
}

// Toast helper
function ensureToastContainer() {
    let c = document.querySelector('.toast-container');
    if (!c) {
        c = document.createElement('div');
        c.className = 'toast-container';
        document.body.appendChild(c);
    }
    return c;
}

function showToast(message, type = 'info', timeout = 2600, sub = '') {
    const container = ensureToastContainer();
    const t = document.createElement('div');
    t.className = 'toast ' + (type || 'info');

    const icon = document.createElement('div');
    icon.className = 'toast-icon';
    icon.textContent = type === 'success' ? '✓' : (type === 'error' ? '!' : 'i');

    const msg = document.createElement('div');
    msg.className = 'toast-message';
    msg.textContent = message;
    if (sub) {
        const subEl = document.createElement('div');
        subEl.className = 'toast-sub';
        subEl.textContent = sub;
        msg.appendChild(subEl);
    }

    t.appendChild(icon);
    t.appendChild(msg);
    container.appendChild(t);

    // Auto hide
    const hide = () => {
        t.classList.add('hide');
        setTimeout(() => { try { container.removeChild(t); } catch (e) {} }, 300);
    };
    setTimeout(hide, timeout);
    return {
        hide
    };
}