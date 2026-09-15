 let dashData = null; 
        let myChartInstance = null; 
        let allTransactions = []; 
        let allUsers = []; 
        let currentActiveTrx = null; 
        let currentUserViewMode = 'grid'; 

        // State Chart Filter Global
        let currentChartFilter = 'count'; 

        // State Variabel Anti-Flicker
        let lastRenderedUsersStr = null;
        let lastRenderedRecentTrxStr = null;
        let lastRenderedAllTrxStr = null;

        // Temporary Payload Registrasi
        let tempRegPayload = null;

        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('current-date').innerText = new Date().toLocaleDateString('id-ID', dateOptions);

        // --- URL DEPLOY GOOGLE APPS SCRIPT ---
        const GAS_URL = 'https://script.google.com/macros/s/AKfycbyNnLofyb4NVWXdnnMDxQEUDv6Ui2h4qOPJScc3SFQuRBDST3I63iFakJ7ds8PnKzKLEA/exec';

        // --- FUNGSI TOGGLE SEARCH MODE MOBILE/HP ---
        window.toggleMobileSearch = function() {
            const form = document.getElementById('mh-search-form');
            form.classList.toggle('active');
            if (form.classList.contains('active')) {
                document.getElementById('mh-search-input').focus();
            }
        };

        // --- UPDATE WAKTU REALTIME UNTUK DASHBOARD, NAVBAR, & MOBILE HEADER ---
        window.updateRealtimeClock = function() {
            const now = new Date();
            const h = String(now.getHours()).padStart(2, '0');
            const m = String(now.getMinutes()).padStart(2, '0');
            const s = String(now.getSeconds()).padStart(2, '0');
            
            // Clock Dashboard
            const elH = document.getElementById('rt-hours');
            const elM = document.getElementById('rt-minutes');
            const elS = document.getElementById('rt-seconds');
            
            if (elH) elH.innerText = h;
            if (elM) elM.innerText = m;
            if (elS) elS.innerText = s;

            // Clock Animasi di Navbar Web
            const nH = document.getElementById('mnc-hours');
            const nM = document.getElementById('mnc-minutes');
            const nS = document.getElementById('mnc-seconds');
            
            if (nH) nH.innerText = h;
            if (nM) nM.innerText = m;
            if (nS) nS.innerText = s;

            // Clock Animasi di Mobile Header
            const mhH = document.getElementById('mh-hours');
            const mhM = document.getElementById('mh-minutes');
            const mhDate = document.getElementById('mh-date');
            
            if (mhH) mhH.innerText = h;
            if (mhM) mhM.innerText = m;
            if (mhDate) {
                // Menampilkan Tanggal Singkat "Senin, 15 Sep" 
                const shortDateOptions = { weekday: 'long', day: 'numeric', month: 'short' };
                mhDate.innerText = now.toLocaleDateString('id-ID', shortDateOptions);
            }
        }

        // --- FUNGSI TOGGLE COLLAPSIBLE SIDEBAR ---
        window.toggleSidebar = function() {
            document.getElementById('desktop-sidebar').classList.toggle('collapsed');
        };

        // --- GLOBAL SEARCH LOGIC ---
        window.executeGlobalSearch = function(queryVal) {
            const query = (queryVal !== undefined ? queryVal : document.getElementById('global-search-input').value).trim().toLowerCase();
            if(!query) return;

            const isTransactionId = allTransactions.some(t => t.id.toLowerCase().includes(query) || t.id.toLowerCase() === query);
            const looksLikeTrx = query.startsWith('trx') || isTransactionId;

            if (looksLikeTrx) {
                switchTab('transactions');
                const searchInput = document.getElementById('tx-search-input');
                searchInput.value = query;
                searchInput.dispatchEvent(new Event('input'));
            } else {
                switchTab('users');
                const searchInput = document.getElementById('usr-search-input');
                searchInput.value = query;
                searchInput.dispatchEvent(new Event('input'));
            }
        };

        // --- LOGIKA AUTHENTICATION UI ---
        window.togglePasswordVisibility = function(inputId, iconEl) {
            const input = document.getElementById(inputId);
            if (input.type === 'password') {
                input.type = 'text';
                iconEl.classList.remove('fa-eye');
                iconEl.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                iconEl.classList.remove('fa-eye-slash');
                iconEl.classList.add('fa-eye');
            }
        };

        window.switchAuthForm = function(type) {
            const boxLogin = document.getElementById('box-login');
            const boxRegister = document.getElementById('box-register');
            if (type === 'register') {
                boxLogin.style.display = 'none';
                boxRegister.style.display = 'block';
            } else {
                boxRegister.style.display = 'none';
                boxLogin.style.display = 'block';
            }
        };

        window.checkSession = function() {
            const userSession = localStorage.getItem('mm_user_session');
            const pageContainer = document.getElementById('auth-page-container');
            if (userSession) {
                try {
                    const userData = JSON.parse(userSession);
                    pageContainer.classList.add('hidden');
                    document.getElementById('session-display-nama').innerText = userData.nama || userData.username;
                    document.getElementById('session-display-user').innerText = '@' + userData.username;
                    document.getElementById('ws-user-name').innerText = userData.nama || userData.username;
                } catch(e) {
                    pageContainer.classList.remove('hidden');
                }
            } else {
                pageContainer.classList.remove('hidden');
            }
        };

        window.confirmLogout = function() {
            document.getElementById('modal-logout').classList.add('show');
        };

        window.closeLogoutModal = function() {
            document.getElementById('modal-logout').classList.remove('show');
        };

        window.executeLogout = function() {
            closeLogoutModal();
            localStorage.removeItem('mm_user_session');
            showToast('Anda telah keluar dari akun.', 'info');
            document.getElementById('auth-page-container').classList.remove('hidden');
        };

        window.submitLogin = async function() {
            const btn = document.getElementById('btn-login-submit');
            const origText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<i class="fas fa-circle-notch animate-spin"></i> Memverifikasi...`;

            const payload = {
                action: 'login',
                username_or_email: document.getElementById('login-input-user').value,
                password: document.getElementById('login-input-pass').value
            };

            try {
                const res = await fetch(GAS_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();

                if (data.success) {
                    showToast('Login berhasil! Selamat datang kembali.', 'success');
                    localStorage.setItem('mm_user_session', JSON.stringify(data.user));
                    checkSession();
                } else {
                    showToast(data.message || 'Login gagal.', 'info');
                }
            } catch(e) {
                showToast('Terjadi kesalahan jaringan.', 'info');
            } finally {
                btn.disabled = false;
                btn.innerHTML = origText;
            }
        };

        window.submitRegisterRequest = async function() {
            const username = document.getElementById('reg-input-username').value.trim().toLowerCase();
            const email = document.getElementById('reg-input-email').value.trim().toLowerCase();
            const nama = document.getElementById('reg-input-nama').value.trim();
            const no_hp = document.getElementById('reg-input-nohp').value.trim();
            const password = document.getElementById('reg-input-pass').value;

            const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
            if (!passRegex.test(password)) {
                showToast('Password minimal 8 karakter, kombinasi huruf & angka, dan wajib ada 1 huruf besar!', 'info');
                return;
            }

            const btn = document.getElementById('btn-reg-submit');
            const origText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<i class="fas fa-circle-notch animate-spin"></i> Mengirim OTP Email...`;

            tempRegPayload = { action: 'register_request_otp', username, email, nama, no_hp, password };

            try {
                const res = await fetch(GAS_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(tempRegPayload)
                });
                const data = await res.json();

                if (data.success) {
                    showToast('Kode OTP verifikasi telah dikirim ke email Anda!', 'success');
                    document.getElementById('otp-target-email').innerText = email;
                    document.getElementById('modal-otp-verify').classList.add('show');
                } else {
                    showToast(data.message || 'Gagal registrasi.', 'info');
                }
            } catch(e) {
                showToast('Gagal terhubung ke server.', 'info');
            } finally {
                btn.disabled = false;
                btn.innerHTML = origText;
            }
        };

        window.moveOtpFocus = function(elem, index) {
            if (elem.value.length === 1 && index < 6) {
                const nextInput = document.querySelectorAll('.otp-digit')[index];
                if (nextInput) nextInput.focus();
            }
        };

        window.submitRegisterVerify = async function() {
            if (!tempRegPayload) return;

            const digits = document.querySelectorAll('.otp-digit');
            let otp = '';
            digits.forEach(d => otp += d.value.trim());

            if (otp.length < 6) {
                showToast('Masukkan 6 digit kode OTP!', 'info');
                return;
            }

            const btn = document.getElementById('btn-verify-otp-submit');
            const origText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<i class="fas fa-circle-notch animate-spin"></i> Memverifikasi OTP...`;

            const payload = {
                action: 'register_verify_otp',
                username: tempRegPayload.username,
                email: tempRegPayload.email,
                nama: tempRegPayload.nama,
                no_hp: tempRegPayload.no_hp,
                password: tempRegPayload.password,
                otp: otp
            };

            try {
                const res = await fetch(GAS_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();

                if (data.success) {
                    showToast('Registrasi & Verifikasi Berhasil! Silakan login.', 'success');
                    closeOtpModal();
                    switchAuthForm('login');
                    document.getElementById('login-input-user').value = payload.username;
                    fetchDashboardData(true);
                } else {
                    showToast(data.message || 'OTP Salah atau Kadaluwarsa.', 'info');
                }
            } catch(e) {
                showToast('Terjadi kesalahan jaringan.', 'info');
            } finally {
                btn.disabled = false;
                btn.innerHTML = origText;
            }
        };

        window.closeOtpModal = function() {
            document.getElementById('modal-otp-verify').classList.remove('show');
        };

        window.openForgotPassModal = function() {
            document.getElementById('forgot-step-1').style.display = 'block';
            document.getElementById('forgot-step-2').style.display = 'none';
            document.getElementById('modal-forgot-pass').classList.add('show');
        };

        window.closeForgotModal = function() {
            document.getElementById('modal-forgot-pass').classList.remove('show');
        };

        window.submitForgotRequestOtp = async function() {
            const email = document.getElementById('forgot-input-email').value.trim();
            if (!email) { showToast('Masukkan alamat email!', 'info'); return; }

            const btn = document.getElementById('btn-forgot-send-otp');
            const origText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<i class="fas fa-circle-notch animate-spin"></i> Mengirim OTP...`;

            try {
                const res = await fetch(GAS_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: 'forgot_pass_request_otp', email: email })
                });
                const data = await res.json();

                if (data.success) {
                    showToast('Kode OTP telah dikirim ke email!', 'success');
                    document.getElementById('forgot-step-1').style.display = 'none';
                    document.getElementById('forgot-step-2').style.display = 'block';
                } else {
                    showToast(data.message || 'Gagal meminta OTP.', 'info');
                }
            } catch(e) {
                showToast('Kesalahan koneksi jaringan.', 'info');
            } finally {
                btn.disabled = false;
                btn.innerHTML = origText;
            }
        };

        window.submitForgotVerify = async function() {
            const email = document.getElementById('forgot-input-email').value.trim();
            const otp = document.getElementById('forgot-input-otp').value.trim();
            const new_password = document.getElementById('forgot-input-newpass').value;

            if (!otp || !new_password) {
                showToast('OTP dan Password baru wajib diisi!', 'info');
                return;
            }

            const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
            if (!passRegex.test(new_password)) {
                showToast('Password baru minimal 8 karakter, ada angka, huruf kecil & besar!', 'info');
                return;
            }

            const btn = document.getElementById('btn-forgot-save-pass');
            const origText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<i class="fas fa-circle-notch animate-spin"></i> Menyimpan...`;

            try {
                const res = await fetch(GAS_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: 'forgot_pass_verify', email, otp, new_password })
                });
                const data = await res.json();

                if (data.success) {
                    showToast('Password berhasil diperbarui! Silakan login.', 'success');
                    closeForgotModal();
                    document.getElementById('login-input-user').value = email;
                    document.getElementById('login-input-pass').value = new_password;
                } else {
                    showToast(data.message || 'Gagal memperbarui password.', 'info');
                }
            } catch(e) {
                showToast('Terjadi kesalahan sistem.', 'info');
            } finally {
                btn.disabled = false;
                btn.innerHTML = origText;
            }
        };

        window.toggleFilterDropdown = function() {
            document.getElementById('chartFilterDropdown').classList.toggle('open');
        };

        window.selectFilter = function(filterVal, event) {
            currentChartFilter = filterVal;
            
            let textHtml = '';
            if (filterVal === 'count') textHtml = '<i class="fas fa-list-ol"></i> Jumlah Transaksi';
            if (filterVal === 'vol_idr') textHtml = '<i class="fas fa-rupiah-sign"></i> Volume Transaksi (IDR)';
            if (filterVal === 'vol_usd') textHtml = '<i class="fas fa-dollar-sign"></i> Volume Transaksi (USD)';
            
            document.getElementById('cd-selected').innerHTML = textHtml;
            
            const items = document.querySelectorAll('#cd-list li');
            items.forEach(item => item.classList.remove('active'));
            event.currentTarget.classList.add('active');
            
            toggleFilterDropdown();
            
            if (dashData && dashData.chart) {
                updateChartData(dashData.chart);
            }
        };

        document.addEventListener('click', function(e) {
            const dropdown = document.getElementById('chartFilterDropdown');
            if (dropdown && !dropdown.contains(e.target)) {
                dropdown.classList.remove('open');
            }
        });

        // --- CUSTOM FORMATTERS ---
        const formatShortCurrency = (val) => {
            if (val === 0) return 'Rp 0';
            if (val >= 1000000000) return 'Rp ' + (val / 1000000000).toFixed(1) + 'M';
            if (val >= 1000000) return 'Rp ' + (val / 1000000).toFixed(1) + 'Jt';
            if (val >= 1000) return 'Rp ' + (val / 1000).toFixed(1) + 'K';
            return 'Rp ' + new Intl.NumberFormat('id-ID').format(val);
        };

        const formatShortCurrencyUSD = (val) => {
            if (val === 0) return '$ 0';
            if (val >= 1000000000) return '$' + (val / 1000000000).toFixed(1) + 'B';
            if (val >= 1000000) return '$' + (val / 1000000).toFixed(1) + 'M';
            if (val >= 1000) return '$' + (val / 1000).toFixed(1) + 'K';
            return '$' + new Intl.NumberFormat('en-US').format(val);
        };

        const formatFullCurrency = (val) => {
            return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
        };

        function formatFormattedValue(val, currencyCode = '') {
            if (val === undefined || val === null || val === '') return '-';
            let strVal = String(val).trim();
            if (!strVal) return '-';

            let isUSD = (currencyCode && currencyCode.toUpperCase().includes('USD')) || strVal.toUpperCase().includes('USD') || strVal.includes('$');

            let cleanNumStr = strVal.replace(/[^\d,\.-]/g, '');
            if (!cleanNumStr) return strVal; 

            let num = 0;
            if (cleanNumStr.includes(',')) {
                if (cleanNumStr.includes('.')) {
                    cleanNumStr = cleanNumStr.replace(/\./g, '').replace(',', '.');
                } else {
                    if (isUSD) cleanNumStr = cleanNumStr.replace(/,/g, '');
                    else cleanNumStr = cleanNumStr.replace(',', '.');
                }
            } else if (cleanNumStr.includes('.')) {
                if (!isUSD && (cleanNumStr.match(/\./g) || []).length >= 1) {
                    cleanNumStr = cleanNumStr.replace(/\./g, '');
                }
            }

            num = parseFloat(cleanNumStr);
            if (isNaN(num)) return strVal;

            if (isUSD) {
                return '$ ' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num);
            } else {
                return 'Rp ' + new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
            }
        }

        function getDirectImageUrl(url) {
            if (!url || typeof url !== 'string') return '';
            url = url.trim();
            if (!url) return '';
            
            if (url.includes('drive.google.com')) {
                let fileId = '';
                let match1 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
                if (match1 && match1[1]) {
                    fileId = match1[1];
                } else {
                    let match2 = url.match(/id=([a-zA-Z0-9_-]+)/);
                    if (match2 && match2[1]) {
                        fileId = match2[1];
                    }
                }
                if (fileId) {
                    return `https://lh3.googleusercontent.com/d/${fileId}`;
                }
            }
            return url;
        }

        function showToast(message, type = 'success') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = `toast-item ${type}`;
            toast.innerHTML = `<i class="${type === 'success' ? 'fas fa-check-circle' : 'fas fa-info-circle'}"></i> <span>${message}</span>`;
            container.appendChild(toast);

            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(-10px)';
                toast.style.transition = 'all 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, 3500);
        }

        // --- LOGIKA PERGANTIAN TAB UTAMA (TERMASUK ANIMASI JAM/SEARCH) ---
        window.switchTab = function(tabName) {
            document.querySelectorAll('.ds-nav-item').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.mn-item').forEach(el => el.classList.remove('active'));
            
            document.getElementById('dashboard-view').classList.remove('active');
            document.getElementById('transactions-view').classList.remove('active');
            document.getElementById('users-view').classList.remove('active');
            
            const navSearchArea = document.getElementById('nav-search-area');
            const navClockArea = document.getElementById('nav-clock-area');

            // Elemen Mobile Header
            const mhSearch = document.getElementById('mh-search-area');
            const mhClock = document.getElementById('mh-clock-area');

            if (tabName === 'dashboard') {
                navSearchArea.classList.remove('tb-hidden-element');
                navSearchArea.classList.add('tb-visible-element');
                
                navClockArea.classList.remove('tb-visible-element');
                navClockArea.classList.add('tb-hidden-element');

                // Kontrol Mobile Header Layout
                if(mhSearch) mhSearch.style.display = 'flex';
                if(mhClock) mhClock.style.display = 'none';

                document.getElementById('dashboard-view').classList.add('active');
                document.querySelectorAll('.ds-nav-item')[0].classList.add('active');
                document.querySelectorAll('.mn-item')[0].classList.add('active');
            } else if (tabName === 'transactions') {
                navSearchArea.classList.remove('tb-visible-element');
                navSearchArea.classList.add('tb-hidden-element');
                
                navClockArea.classList.remove('tb-hidden-element');
                navClockArea.classList.add('tb-visible-element');

                // Kontrol Mobile Header Layout (Ganti Search dengan Jam)
                if(mhSearch) mhSearch.style.display = 'none';
                if(mhClock) mhClock.style.display = 'flex';

                document.getElementById('transactions-view').classList.add('active');
                document.querySelectorAll('.ds-nav-item')[1].classList.add('active');
                document.querySelectorAll('.mn-item')[1].classList.add('active');
                
                const searchVal = document.getElementById('tx-search-input').value.toLowerCase();
                if (searchVal) {
                    const filtered = allTransactions.filter(t => t.id.toLowerCase().includes(searchVal) || t.user.toLowerCase().includes(searchVal) || t.status.toLowerCase().includes(searchVal));
                    renderAllTransactionsTable(filtered);
                } else {
                    renderAllTransactionsTable(allTransactions);
                }
            } else if (tabName === 'users') {
                navSearchArea.classList.remove('tb-visible-element');
                navSearchArea.classList.add('tb-hidden-element');
                
                navClockArea.classList.remove('tb-hidden-element');
                navClockArea.classList.add('tb-visible-element');

                // Kontrol Mobile Header Layout (Ganti Search dengan Jam)
                if(mhSearch) mhSearch.style.display = 'none';
                if(mhClock) mhClock.style.display = 'flex';

                document.getElementById('users-view').classList.add('active');
                document.querySelectorAll('.ds-nav-item')[2].classList.add('active');
                document.querySelectorAll('.mn-item')[2].classList.add('active');
                
                const searchVal = document.getElementById('usr-search-input').value.toLowerCase();
                if (searchVal) {
                    filterAndRenderUsers(searchVal);
                } else {
                    renderUsers(allUsers);
                }
            }
        };

        window.openDetailModal = function(id) {
            const trx = allTransactions.find(t => t.id === id);
            if (!trx) return;
            
            currentActiveTrx = trx;

            document.getElementById('md-id').innerText = trx.id || "-";
            document.getElementById('md-currency').innerText = trx.currency || "-";
            document.getElementById('md-rate').innerText = trx.kurs_rate ?
                (trx.kurs_rate.startsWith('Rp') || trx.kurs_rate.startsWith('$') || /[a-zA-Z=]/.test(trx.kurs_rate)) ?
                trx.kurs_rate :
                formatFormattedValue(trx.kurs_rate, trx.currency) :
                "-";
            
            document.getElementById('md-nominal').innerText = formatFormattedValue(trx.nominal_input, trx.currency);
            document.getElementById('md-layanan').innerText = formatFormattedValue(trx.biaya_layanan, trx.currency);
            document.getElementById('md-total').innerText = formatFormattedValue(trx.total_tagihan, trx.currency);
            document.getElementById('md-estimasi').innerText = formatFormattedValue(trx.estimasi_diterima, trx.currency);
            
            const footerKonfirmasi = document.getElementById('md-footer-konfirmasi');
            if (trx.status && trx.status.toLowerCase() === 'selesai') {
                footerKonfirmasi.style.display = 'none';
            } else {
                footerKonfirmasi.style.display = 'flex';
            }

            const buktiContainer = document.getElementById('md-bukti-container');
            const directImgUrl = getDirectImageUrl(trx.bukti_pembayaran);

            if (directImgUrl) {
                buktiContainer.innerHTML = `
                    <img src="${directImgUrl}" class="md-bukti-img" alt="Bukti Pembayaran ${trx.id}" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'md-bukti-empty\\'><i class=\\'fas fa-exclamation-triangle\\'></i><span>Gagal memuat gambar. Klik untuk buka link asal.</span></div>';">
                    <div class="md-bukti-overlay" onclick="openLightbox('${directImgUrl}', 'Bukti Pembayaran ${trx.id}')">
                        <i class="fas fa-search-plus"></i>
                        <span>Lihat Ukuran Penuh</span>
                    </div>
                `;
            } else {
                buktiContainer.innerHTML = `
                    <div class="md-bukti-empty">
                        <i class="fas fa-image"></i>
                        <span>Tidak ada bukti pembayaran diunggah</span>
                    </div>
                `;
            }

            document.getElementById('modal-detail').classList.add('show');
        };

        window.closeModal = function() {
            document.getElementById('modal-detail').classList.remove('show');
        };

        document.getElementById('modal-detail').addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });

        window.openLightbox = function(imgSrc, captionStr = '') {
            const modal = document.getElementById('lightbox-modal');
            const img = document.getElementById('lightbox-img');
            const caption = document.getElementById('lightbox-caption');
            
            img.src = imgSrc;
            caption.innerText = captionStr || 'Bukti Pembayaran Transaksi';
            modal.classList.add('show');
        };

        window.closeLightbox = function() {
            document.getElementById('lightbox-modal').classList.remove('show');
        };

        window.openSidebarRekening = function() {
            if (!currentActiveTrx) return;
            
            const usernameAsli = currentActiveTrx.username_asli || "";
            document.getElementById('sd-user-subtitle').innerText = `Filter Username: @${usernameAsli}`;

            const container = document.getElementById('sd-rekening-list');
            container.innerHTML = '';

            const allRek = (dashData && dashData.rekening_list) ? dashData.rekening_list : [];
            const userRekening = allRek.filter(r => r.username.toLowerCase() === usernameAsli.toLowerCase());

            if (userRekening.length === 0) {
                container.innerHTML = `
                    <div class="sd-empty">
                        <i class="fas fa-credit-card"></i>
                        <p style="font-size: 0.9375rem; font-weight: 700; color: #475569; margin-bottom: 0.25rem;">Tidak Ada Rekening Terdaftar</p>
                        <p style="font-size: 0.8125rem;">Tidak ditemukan data rekening khusus untuk username <strong>"@${usernameAsli}"</strong>.</p>
                    </div>
                `;
            } else {
                userRekening.forEach((rek) => {
                    const cardHtml = `
                        <div class="sd-rek-card">
                            <div class="sd-rek-head">
                                <span class="sd-bank-badge">${rek.bank || 'BANK'}</span>
                                <button class="sd-copy-btn" onclick="copyToClipboard('${rek.no_rek}')">
                                    <i class="far fa-copy"></i> Salin
                                </button>
                            </div>
                            <div class="sd-rek-num">${rek.no_rek || '-'}</div>
                            <div class="sd-rek-holder"><i class="fas fa-user-circle"></i> A/N: <span>${rek.atas_nama || '-'}</span></div>
                        </div>
                    `;
                    container.insertAdjacentHTML('beforeend', cardHtml);
                });
            }

            const btnProses = document.getElementById('btn-telah-diproses');
            if (btnProses) btnProses.style.display = 'flex';

            document.getElementById('sidebar-rekening').classList.add('show');
        };

        window.closeSidebarRekening = function(e) {
            if (e && e.target !== document.getElementById('sidebar-rekening') && e.type === 'click') return;
            document.getElementById('sidebar-rekening').classList.remove('show');
        };

        window.copyToClipboard = function(text) {
            if (!text || text === '-') return;
            navigator.clipboard.writeText(text).then(() => {
                showToast(`Data '${text}' berhasil disalin!`, 'info');
            }).catch(() => {
                showToast(`Salin manual: ${text}`, 'info');
            });
        };

        window.prosesKonfirmasiPembayaran = async function() {
            if (!currentActiveTrx) return;

            const btn = document.getElementById('btn-telah-diproses');
            const originalText = btn.innerHTML;
            
            btn.disabled = true;
            btn.innerHTML = `<i class="fas fa-circle-notch animate-spin"></i> <span>Menyimpan ke Sheet...</span>`;

            try {
                const targetUrl = `${GAS_URL}?action=updateStatus&id=${encodeURIComponent(currentActiveTrx.id)}&status=Selesai`;
                
                const response = await fetch(targetUrl, { method: 'GET', mode: 'cors' });
                const resData = await response.json();

                if (resData.success) {
                    currentActiveTrx.status = 'Selesai';
                    const matchedInAll = allTransactions.find(t => t.id === currentActiveTrx.id);
                    if (matchedInAll) matchedInAll.status = 'Selesai';

                    showToast(`Transaksi ${currentActiveTrx.id} Berhasil Diselesaikan!`, 'success');

                    lastRenderedRecentTrxStr = null; 
                    lastRenderedAllTrxStr = null;
                    
                    renderTable(dashData.recent_transactions);
                    renderAllTransactionsTable(allTransactions);

                    closeSidebarRekening();
                    closeModal();

                    fetchDashboardData(true);
                } else {
                    showToast(resData.message || 'Gagal memperbarui status.', 'info');
                }
            } catch (err) {
                console.error("Gagal mengupdate status:", err);
                showToast('Terjadi kesalahan jaringan saat update status.', 'info');
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        };

        window.switchCurrency = function(type, curr) {
            const toggle = document.getElementById(`toggle-${type}`);
            toggle.setAttribute('data-active', curr);
            
            const btns = toggle.querySelectorAll('.ct-btn');
            btns[0].classList.toggle('active', curr === 'idr');
            btns[1].classList.toggle('active', curr === 'usd');

            const slider = toggle.querySelector('.ct-slider');
            slider.style.transform = curr === 'usd' ? 'translateX(100%)' : 'translateX(0)';
            
            updateCardValue(type, curr);
        };

        window.updateCardValue = function(type, curr) {
            if (!dashData) return;
            const el = document.getElementById(`val-total-${type}`);
            
            let val = 0;
            if (type === 'penjualan') {
                val = curr === 'idr' ? dashData.summary.total_penjualan_idr : dashData.summary.total_penjualan_usd;
            } else {
                val = curr === 'idr' ? dashData.summary.total_pembelian_idr : dashData.summary.total_pembelian_usd;
            }
            
            const newText = curr === 'idr' ? formatShortCurrency(val) : formatShortCurrencyUSD(val);
            
            if (el.innerText !== newText) {
                el.classList.add('val-hidden');
                setTimeout(() => {
                    el.innerText = newText;
                    el.classList.remove('val-hidden');
                }, 300);
            }
        };

        function generateTrxRowHtml(trx) {
            const isBeli = trx.type.toLowerCase() === 'beli';
            const statusVal = trx.status.toLowerCase();
            
            const iconHtml = isBeli ? `<div class="td-icon ti-blue"><i class="fa-solid fa-money-bills"></i></div>` : `<div class="td-icon ti-amber"><i class="fa-solid fa-money-bill-transfer"></i></div>`;
            const trClassHover = isBeli ? 'ti-hover-blue' : 'ti-hover-amber';
            const badgeType = isBeli ? 'badge-blue' : 'badge-emerald';

            let statusBadge = 'badge-amber';
            let statusIconHtml = '';
            
            if (statusVal === 'selesai' || statusVal === 'sukses' || statusVal === 'verified' || statusVal === 'aktif') {
                statusBadge = 'badge-selesai';
                statusIconHtml = `<i class="fas fa-check-circle status-icon animate-bounce"></i>`;
            } else if (statusVal === 'pending') {
                statusBadge = 'badge-pending';
                statusIconHtml = `<i class="fas fa-clock status-icon animate-pulse"></i>`;
            } else if (statusVal === 'proses') {
                statusBadge = 'badge-proses';
                statusIconHtml = `<i class="fas fa-clock status-icon animate-pulse"></i>`;
            } else {
                statusBadge = 'badge-amber';
                statusIconHtml = `<i class="fas fa-circle status-icon" style="font-size:8px;"></i>`;
            }

            const amountFormatted = trx.is_usd 
                ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(trx.amount)
                : formatFullCurrency(trx.amount);

            const photoUrl = trx.user_photo ? trx.user_photo : `https://ui-avatars.com/api/?name=${encodeURIComponent(trx.user)}&background=f1f5f9&color=64748b`;

            return `
            <tr class="tc-tr" onclick="openDetailModal('${trx.id}')">
                <td class="tc-td">
                    <div class="td-id-group">
                        ${iconHtml}
                        <span class="td-id-text ${trClassHover}">${trx.id}</span>
                    </div>
                </td>
                <td class="tc-td">
                    <p class="td-date">${trx.date}</p>
                    <p class="td-time">${trx.time}</p>
                </td>
                <td class="tc-td">
                    <div class="td-user">
                        <img src="${photoUrl}" alt="${trx.user}">
                        ${trx.user}
                    </div>
                </td>
                <td class="tc-td">
                    <div class="td-conv" style="font-weight: 800; color: var(--brand-900);">
                        ${trx.currency}
                    </div>
                </td>
                <td class="tc-td">
                    <span class="badge ${badgeType}">${trx.type}</span>
                </td>
                <td class="tc-td td-amount">${amountFormatted}</td>
                <td class="tc-td">
                    <span class="badge ${statusBadge}">
                        ${statusIconHtml} ${trx.status}
                    </span>
                </td>
                <td class="tc-td">
                    <button class="usr-btn usr-btn-sec" style="color: #ef4444; border-color: #fecaca; background: #fef2f2; padding: 0.4rem 0.6rem; font-size: 0.75rem;" onclick="confirmDeleteTrx('${trx.id}', event)" title="Hapus Transaksi">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`;
        }

        function renderTable(transactions) {
            const stateStr = JSON.stringify(transactions);
            if (lastRenderedRecentTrxStr === stateStr) return; 
            lastRenderedRecentTrxStr = stateStr;

            const tbody = document.getElementById('val-tabel-transaksi');
            let newHtml = '';
            if (!transactions || transactions.length === 0) {
                newHtml = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">Belum ada transaksi.</td></tr>';
            } else {
                transactions.forEach(trx => { newHtml += generateTrxRowHtml(trx); });
            }
            tbody.innerHTML = newHtml;
        }

        function renderAllTransactionsTable(transactions) {
            const stateStr = JSON.stringify(transactions);
            if (lastRenderedAllTrxStr === stateStr) return;
            lastRenderedAllTrxStr = stateStr;

            const tbody = document.getElementById('val-all-transaksi');
            let newHtml = '';
            if (!transactions || transactions.length === 0) {
                newHtml = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">Tidak ada transaksi ditemukan.</td></tr>';
            } else {
                transactions.forEach(trx => { newHtml += generateTrxRowHtml(trx); });
            }
            tbody.innerHTML = newHtml;
        }

        document.getElementById('tx-search-input').addEventListener('input', function(e) {
            const query = e.target.value.toLowerCase();
            const filtered = allTransactions.filter(t => 
                t.id.toLowerCase().includes(query) ||
                t.user.toLowerCase().includes(query) ||
                t.username_asli.toLowerCase().includes(query) ||
                t.status.toLowerCase().includes(query) ||
                t.type.toLowerCase().includes(query)
            );
            lastRenderedAllTrxStr = null;
            renderAllTransactionsTable(filtered);
        });

        window.switchUserView = function(mode) {
            currentUserViewMode = mode;
            const btnGrid = document.getElementById('btn-view-grid');
            const btnTable = document.getElementById('btn-view-table');
            const gridContainer = document.getElementById('usr-grid-container');
            const tableContainer = document.getElementById('usr-table-container');
            const toggleWrapper = document.querySelector('.modern-toggle-wrapper');

            if (mode === 'grid') {
                btnGrid.classList.add('active');
                btnTable.classList.remove('active');
                if (toggleWrapper) toggleWrapper.setAttribute('data-active', 'grid');
                gridContainer.style.display = 'grid';
                tableContainer.style.display = 'none';
            } else {
                btnGrid.classList.remove('active');
                btnTable.classList.add('active');
                if (toggleWrapper) toggleWrapper.setAttribute('data-active', 'table');
                gridContainer.style.display = 'none';
                tableContainer.style.display = 'block';
            }
        };

        function filterAndRenderUsers(query) {
            const filtered = allUsers.filter(u => 
                (u.nama && u.nama.toLowerCase().includes(query)) ||
                (u.username && u.username.toLowerCase().includes(query)) ||
                (u.email && u.email.toLowerCase().includes(query)) ||
                (u.no_hp && u.no_hp.toLowerCase().includes(query))
            );
            lastRenderedUsersStr = null; 
            renderUsers(filtered);
        }

        document.getElementById('usr-search-input').addEventListener('input', function(e) {
            filterAndRenderUsers(e.target.value.toLowerCase());
        });

        function renderUsers(users) {
            const stateStr = JSON.stringify(users);
            if (lastRenderedUsersStr === stateStr) return; 
            lastRenderedUsersStr = stateStr; 

            const gridEl = document.getElementById('usr-grid-container');
            const tableEl = document.getElementById('val-tabel-pengguna');

            if (!users || users.length === 0) {
                gridEl.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1.5rem; color: #94a3b8;">
                        <i class="fas fa-user-slash" style="font-size: 3rem; margin-bottom: 1rem; color: #cbd5e1;"></i>
                        <p style="font-size: 1.125rem; font-weight: 700; color: #475569;">Tidak ada pengguna ditemukan</p>
                        <p style="font-size: 0.875rem;">Coba sesuaikan kata kunci pencarian Anda.</p>
                    </div>
                `;
                tableEl.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #94a3b8;">Tidak ada data pengguna.</td></tr>';
                return;
            }

            let gridHtml = '';
            let tableHtml = '';

            users.forEach((usr, idx) => {
                const directPhoto = getDirectImageUrl(usr.foto);
                const avatarUrl = directPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(usr.nama)}&background=3b82f6&color=ffffff&bold=true`;
                
                const isAktif = (usr.status.toLowerCase() === 'aktif' || usr.status.toLowerCase() === 'active' || usr.status.toLowerCase() === 'verified');
                const statusBadge = isAktif ? '<span class="badge badge-selesai"><i class="fas fa-check-circle"></i> ' + usr.status + '</span>' : '<span class="badge badge-pending"><i class="fas fa-minus-circle"></i> ' + usr.status + '</span>';

                let cleanPhone = usr.no_hp.replace(/[^\d]/g, '');
                if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
                const waLink = cleanPhone ? `https://wa.me/${cleanPhone}` : '#';

                gridHtml += `
                    <div class="usr-card" style="animation: fadeInUp 0.4s ease forwards ${idx * 60}ms;">
                        <div>
                            <div class="usr-header">
                                <div class="usr-avatar-wrap">
                                    <div class="usr-avatar-ring"></div>
                                    <img src="${avatarUrl}" class="usr-avatar" alt="${usr.nama}" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(usr.nama)}&background=3b82f6&color=ffffff&bold=true';">
                                </div>
                                <div class="usr-info">
                                    <h4 class="usr-name">${usr.nama}</h4>
                                    <div class="usr-username" onclick="copyToClipboard('${usr.username}')" style="cursor: pointer;" title="Klik untuk salin username">
                                        <i class="far fa-copy"></i> @${usr.username}
                                    </div>
                                </div>
                            </div>

                            <div class="usr-details">
                                <div class="usr-item">
                                    <span class="usr-label"><i class="far fa-envelope"></i> Email</span>
                                    <span class="usr-val">${usr.email}</span>
                                </div>
                                <div class="usr-item">
                                    <span class="usr-label"><i class="fab fa-whatsapp"></i> No. HP</span>
                                    <span class="usr-val">
                                        ${cleanPhone ? `<a href="${waLink}" target="_blank" style="color: #10b981; text-decoration: none; font-weight: 700;"><i class="fas fa-external-link-alt" style="font-size: 0.75rem;"></i> ${usr.no_hp}</a>` : usr.no_hp}
                                    </span>
                                </div>
                                <div class="usr-item">
                                    <span class="usr-label"><i class="far fa-calendar-alt"></i> Terdaftar</span>
                                    <span class="usr-val">${usr.tanggal}</span>
                                </div>
                                <div class="usr-item">
                                    <span class="usr-label"><i class="fas fa-shield-alt"></i> Status Email</span>
                                    ${statusBadge}
                                </div>
                            </div>
                        </div>

                        <div class="usr-actions">
                            <button class="usr-btn usr-btn-sec" onclick="openUserTransactions('${usr.username}')" title="Mutasi Transaksi">
                                <i class="fas fa-receipt"></i>
                            </button>
                            <button class="usr-btn usr-btn-pri" onclick="openUserRekeningDirect('${usr.username}')" title="Info Rekening">
                                <i class="fas fa-university"></i>
                            </button>
                            <button class="usr-btn usr-btn-sec" onclick="openEditUserModal('${usr.username}')" title="Edit Pengguna">
                                <i class="fas fa-edit"></i>
                            </button>
                            <!-- TOMBOL HAPUS -->
                            <button class="usr-btn usr-btn-sec" style="color: #ef4444; border-color: #fecaca; background: #fef2f2;" onclick="confirmDeleteUser('${usr.username}')" title="Hapus Pengguna">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;

                tableHtml += `
                    <tr class="tc-tr">
                        <td class="tc-td">
                            <div class="td-user">
                                <img src="${avatarUrl}" alt="${usr.nama}">
                                <div>
                                    <p style="font-weight: 800; color: #0f172a; margin: 0;">${usr.nama}</p>
                                    <p style="font-size: 0.75rem; color: #64748b; margin: 0;">@${usr.username}</p>
                                </div>
                            </div>
                        </td>
                        <td class="tc-td">${usr.email}</td>
                        <td class="tc-td">
                            ${cleanPhone ? `<a href="${waLink}" target="_blank" style="color: #10b981; text-decoration: none; font-weight: 700;">${usr.no_hp}</a>` : usr.no_hp}
                        </td>
                        <td class="tc-td">${usr.tanggal}</td>
                        <td class="tc-td">${statusBadge}</td>
                        <td class="tc-td">
                            <div style="display: flex; gap: 0.35rem;">
                                <button class="usr-btn usr-btn-sec" style="padding: 0.4rem 0.6rem; font-size: 0.75rem;" onclick="openUserTransactions('${usr.username}')" title="Mutasi Transaksi">
                                    <i class="fas fa-receipt"></i>
                                </button>
                                <button class="usr-btn usr-btn-pri" style="padding: 0.4rem 0.6rem; font-size: 0.75rem;" onclick="openUserRekeningDirect('${usr.username}')" title="Info Rekening">
                                    <i class="fas fa-university"></i>
                                </button>
                                <button class="usr-btn usr-btn-sec" style="padding: 0.4rem 0.6rem; font-size: 0.75rem;" onclick="openEditUserModal('${usr.username}')" title="Edit Pengguna">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <!-- TOMBOL HAPUS -->
                                <button class="usr-btn usr-btn-sec" style="padding: 0.4rem 0.6rem; font-size: 0.75rem; color: #ef4444; border-color: #fecaca; background: #fef2f2;" onclick="confirmDeleteUser('${usr.username}')" title="Hapus Pengguna">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });

            gridEl.innerHTML = gridHtml;
            tableEl.innerHTML = tableHtml;
        }

        window.currentEditOldUsername = "";

        window.openEditUserModal = function(username) {
            const user = allUsers.find(u => u.username === username);
            if(!user) return;
            
            window.currentEditOldUsername = user.username;
            
            document.getElementById('edit-usr-username').value = user.username;
            document.getElementById('edit-usr-email').value = user.email;
            document.getElementById('edit-usr-nama').value = user.nama;
            document.getElementById('edit-usr-nohp').value = user.no_hp;
            
            const preview = document.getElementById('edit-usr-foto-preview');
            document.getElementById('edit-usr-foto-base64').value = user.foto || "";
            document.getElementById('edit-usr-foto-upload').value = ""; 
            
            if(user.foto) {
                preview.src = getDirectImageUrl(user.foto);
                preview.style.display = 'block';
            } else {
                preview.style.display = 'none';
                preview.src = '';
            }
            
            document.getElementById('modal-edit-user').classList.add('show');
        };

        window.closeEditUserModal = function() {
            document.getElementById('modal-edit-user').classList.remove('show');
        };

        document.getElementById('modal-edit-user').addEventListener('click', function(e) {
            if (e.target === this) closeEditUserModal();
        });

        document.getElementById('edit-usr-foto-upload').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const result = event.target.result;
                    const preview = document.getElementById('edit-usr-foto-preview');
                    preview.src = result;
                    preview.style.display = 'block';
                    document.getElementById('edit-usr-foto-base64').value = result;
                }
                reader.readAsDataURL(file); 
            }
        });

        window.submitEditUser = async function() {
            const btn = document.getElementById('btn-submit-edit-user');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<i class="fas fa-spinner animate-spin"></i> Menyimpan...`;
            
            const payload = {
                action: 'editUser',
                old_username: window.currentEditOldUsername,
                new_username: document.getElementById('edit-usr-username').value,
                email: document.getElementById('edit-usr-email').value,
                nama: document.getElementById('edit-usr-nama').value,
                no_hp: document.getElementById('edit-usr-nohp').value,
                foto: document.getElementById('edit-usr-foto-base64').value 
            };
            
            try {
                const response = await fetch(GAS_URL, { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(payload)
                });
                const resData = await response.json();
                
                if(resData.success) {
                    showToast('Data pengguna berhasil diperbarui!', 'success');
                    closeEditUserModal();
                    
                    lastRenderedUsersStr = null; 
                    lastRenderedAllTrxStr = null;
                    lastRenderedRecentTrxStr = null;
                    fetchDashboardData(true);
                } else {
                    showToast(resData.message || 'Gagal menyimpan data.', 'info');
                }
            } catch(e) {
                showToast('Terjadi kesalahan jaringan.', 'info');
                console.error(e);
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        };

        // --- FUNGSI HAPUS PENGGUNA ---
        window.targetDeleteUsername = "";

        window.confirmDeleteUser = function(username) {
            window.targetDeleteUsername = username;
            document.getElementById('modal-delete-user').classList.add('show');
        };

        window.closeDeleteModal = function() {
            document.getElementById('modal-delete-user').classList.remove('show');
            window.targetDeleteUsername = "";
        };

        window.executeDeleteUser = async function() {
            if (!window.targetDeleteUsername) return;
            const btn = document.querySelector('#modal-delete-user .btn-confirm-logout');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<i class="fas fa-circle-notch animate-spin"></i> Menghapus...`;

            try {
                const payload = {
                    action: 'deleteUser',
                    username: window.targetDeleteUsername
                };

                const response = await fetch(GAS_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(payload)
                });
                const resData = await response.json();

                if (resData.success) {
                    showToast('Data Pengguna dan riwayat terkait berhasil dihapus permanen!', 'success');
                    closeDeleteModal();
                    
                    lastRenderedUsersStr = null;
                    lastRenderedAllTrxStr = null;
                    lastRenderedRecentTrxStr = null;
                    fetchDashboardData(true); 
                } else {
                    showToast(resData.message || 'Gagal menghapus pengguna.', 'info');
                }
            } catch (err) {
                console.error("Gagal menghapus pengguna:", err);
                showToast('Terjadi kesalahan jaringan saat proses hapus.', 'info');
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        };

       // --- FUNGSI HAPUS TRANSAKSI (INDIVIDU) ---
window.targetDeleteTrxId = "";

window.confirmDeleteTrx = function(id, event) {
    if (event) event.stopPropagation(); // Mencegah pop-up detail pesanan ikut terbuka
    window.targetDeleteTrxId = id;
    document.getElementById('modal-delete-trx').classList.add('show');
};

window.closeDeleteTrxModal = function() {
    document.getElementById('modal-delete-trx').classList.remove('show');
    window.targetDeleteTrxId = "";
};

window.executeDeleteTrx = async function() {
    if (!window.targetDeleteTrxId) return;
    const btn = document.querySelector('#modal-delete-trx .btn-confirm-logout');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-circle-notch animate-spin"></i> Menghapus...`;
    
    try {
        const payload = { action: 'deleteTrx', id: window.targetDeleteTrxId };
        const response = await fetch(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        const resData = await response.json();
        
        if (resData.success) {
            showToast('Transaksi berhasil dihapus secara permanen!', 'success');
            closeDeleteTrxModal();
            lastRenderedRecentTrxStr = null;
            lastRenderedAllTrxStr = null;
            fetchDashboardData(true);
        } else {
            showToast(resData.message || 'Gagal menghapus transaksi.', 'info');
        }
    } catch (err) {
        showToast('Terjadi kesalahan jaringan saat proses hapus.', 'info');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};

// --- FUNGSI HAPUS SEMUA TRANSAKSI ---
window.confirmDeleteAllTrx = function() {
    document.getElementById('modal-delete-all-trx').classList.add('show');
};

window.closeDeleteAllTrxModal = function() {
    document.getElementById('modal-delete-all-trx').classList.remove('show');
};

window.executeDeleteAllTrx = async function() {
    const btn = document.querySelector('#modal-delete-all-trx .btn-confirm-logout');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-circle-notch animate-spin"></i> Menghapus...`;
    
    try {
        const payload = { action: 'deleteAllTrx' };
        const response = await fetch(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        const resData = await response.json();
        
        if (resData.success) {
            showToast('Semua transaksi berhasil dikosongkan!', 'success');
            closeDeleteAllTrxModal();
            lastRenderedRecentTrxStr = null;
            lastRenderedAllTrxStr = null;
            fetchDashboardData(true);
        } else {
            showToast(resData.message || 'Gagal menghapus semua transaksi.', 'info');
        }
    } catch (err) {
        showToast('Terjadi kesalahan jaringan.', 'info');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};
        window.openUserTransactions = function(username) {
            switchTab('transactions');
            const searchInput = document.getElementById('tx-search-input');
            searchInput.value = username;
            const filtered = allTransactions.filter(t => 
                t.id.toLowerCase().includes(username.toLowerCase()) || 
                t.user.toLowerCase().includes(username.toLowerCase()) || 
                t.username_asli.toLowerCase().includes(username.toLowerCase())
            );
            
            lastRenderedAllTrxStr = null;
            renderAllTransactionsTable(filtered);
        };

        window.openUserRekeningDirect = function(username) {
            currentActiveTrx = null;
            document.getElementById('sd-user-subtitle').innerText = `Filter Username: @${username}`;
            const container = document.getElementById('sd-rekening-list');
            container.innerHTML = '';

            const allRek = (dashData && dashData.rekening_list) ? dashData.rekening_list : [];
            const userRekening = allRek.filter(r => r.username.toLowerCase() === username.toLowerCase());

            if (userRekening.length === 0) {
                container.innerHTML = `
                    <div class="sd-empty">
                        <i class="fas fa-credit-card"></i>
                        <p style="font-size: 0.9375rem; font-weight: 700; color: #475569; margin-bottom: 0.25rem;">Tidak Ada Rekening Terdaftar</p>
                        <p style="font-size: 0.8125rem;">Tidak ditemukan data rekening khusus untuk username <strong>"@${username}"</strong>.</p>
                    </div>
                `;
            } else {
                userRekening.forEach((rek) => {
                    const cardHtml = `
                        <div class="sd-rek-card">
                            <div class="sd-rek-head">
                                <span class="sd-bank-badge">${rek.bank || 'BANK'}</span>
                                <button class="sd-copy-btn" onclick="copyToClipboard('${rek.no_rek}')">
                                    <i class="far fa-copy"></i> Salin
                                </button>
                            </div>
                            <div class="sd-rek-num">${rek.no_rek || '-'}</div>
                            <div class="sd-rek-holder"><i class="fas fa-user-circle"></i> A/N: <span>${rek.atas_nama || '-'}</span></div>
                        </div>
                    `;
                    container.insertAdjacentHTML('beforeend', cardHtml);
                });
            }

            const btnProses = document.getElementById('btn-telah-diproses');
            if (btnProses) btnProses.style.display = 'none';

            document.getElementById('sidebar-rekening').classList.add('show');
        };

        function updateChartData(chartData) {
            if (myChartInstance && chartData) {
                myChartInstance.data.labels = chartData.labels;
                
                if (currentChartFilter === 'count') {
                    myChartInstance.data.datasets[0].data = chartData.beli_count;
                    myChartInstance.data.datasets[1].data = chartData.jual_count;
                } else if (currentChartFilter === 'vol_idr') {
                    myChartInstance.data.datasets[0].data = chartData.beli_vol_idr;
                    myChartInstance.data.datasets[1].data = chartData.jual_vol_idr;
                } else if (currentChartFilter === 'vol_usd') {
                    myChartInstance.data.datasets[0].data = chartData.beli_vol_usd;
                    myChartInstance.data.datasets[1].data = chartData.jual_vol_usd;
                }
                
                myChartInstance.update(); 
            }
        }

        async function fetchDashboardData(isPolling = false) {
            try {
                const response = await fetch(GAS_URL);
                const data = await response.json();
                dashData = data; 
                allTransactions = data.all_transactions || [];
                allUsers = data.pengguna_list || [];
                
                const ttEl = document.getElementById('val-total-transaksi');
                if (ttEl.innerText != data.summary.total_transaksi) ttEl.innerText = data.summary.total_transaksi;
                
                const tpEl = document.getElementById('val-total-pengguna');
                if (tpEl.innerText != data.summary.total_pengguna) tpEl.innerText = data.summary.total_pengguna;
                
                const penActive = document.getElementById('toggle-penjualan').getAttribute('data-active') || 'idr';
                const pemActive = document.getElementById('toggle-pembelian').getAttribute('data-active') || 'idr';
                updateCardValue('penjualan', penActive);
                updateCardValue('pembelian', pemActive);

                renderTable(data.recent_transactions);

                if (document.getElementById('transactions-view').classList.contains('active')) {
                    const searchVal = document.getElementById('tx-search-input').value.toLowerCase();
                    if (searchVal) {
                        const filtered = allTransactions.filter(t => 
                            t.id.toLowerCase().includes(searchVal) || 
                            t.user.toLowerCase().includes(searchVal) || 
                            t.username_asli.toLowerCase().includes(searchVal) || 
                            t.status.toLowerCase().includes(searchVal)
                        );
                        renderAllTransactionsTable(filtered);
                    } else {
                        renderAllTransactionsTable(allTransactions);
                    }
                }

                if (document.getElementById('users-view').classList.contains('active')) {
                    const searchVal = document.getElementById('usr-search-input').value.toLowerCase();
                    if (searchVal) {
                        filterAndRenderUsers(searchVal);
                    } else {
                        renderUsers(allUsers);
                    }
                }

                if (isPolling) {
                    updateChartData(data.chart);
                }
                return data.chart;
            } catch (error) {
                console.error("Gagal memuat data dari Spreadsheet:", error);
                if (!isPolling) {
                    document.getElementById('val-tabel-transaksi').innerHTML = '<tr><td colspan="8" style="text-align: center; color:red; padding: 2rem;">Gagal memuat data. Periksa koneksi atau URL script.</td></tr>';
                }
                return null;
            }
        }

        window.fetchExchangeRates = async function() {
            const container = document.getElementById('currencyContainer');
            const syncIcon = document.getElementById('syncIcon');
            syncIcon.classList.add('animate-spin');
            
            try {
                const response = await fetch('https://open.er-api.com/v6/latest/USD');
                const data = await response.json();
                
                if (data.result === 'success') {
                    const rates = data.rates;
                    const idrRate = rates.IDR;
                    const currencies = [
                        { code: 'USD', name: 'US Dollar', flag: 'us', rate: idrRate },
                        { code: 'SGD', name: 'Singapore Dollar', flag: 'sg', rate: idrRate / rates.SGD },
                        { code: 'EUR', name: 'Euro', flag: 'eu', rate: idrRate / rates.EUR },
                        { code: 'JPY', name: 'Japanese Yen', flag: 'jp', rate: idrRate / rates.JPY }
                    ];
                    
                    const formatCurrency = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);

                    container.innerHTML = '';
                    currencies.forEach((currency, index) => {
                        const delay = index * 100;
                        const html = `
                            <div class="ci-item" style="animation: fadeInUp 0.5s ease forwards ${delay}ms; opacity: 0;">
                                <div class="ci-left">
                                    <div class="ci-img-wrap">
                                        <div class="ci-img-blur"></div>
                                        <img src="https://flagcdn.com/w40/${currency.flag}.png" class="ci-img" alt="${currency.name}">
                                    </div>
                                    <div>
                                        <p class="ci-code">${currency.code}</p>
                                        <p class="ci-name">${currency.name}</p>
                                    </div>
                                </div>
                                <div class="ci-right">
                                    <span class="ci-rate">${formatCurrency(currency.rate)}</span>
                                    <span class="ci-trend"><i class="fas fa-chart-line"></i> Hari ini</span>
                                </div>
                            </div>
                        `;
                        container.insertAdjacentHTML('beforeend', html);
                    });
                }
            } catch (error) {
                container.innerHTML = '<div style="text-align: center; font-size: 0.875rem; color: #ef4444; padding: 1rem;"><i class="fas fa-exclamation-triangle"></i> Gagal memuat kurs.</div>';
            } finally {
                setTimeout(() => syncIcon.classList.remove('animate-spin'), 500);
            }
        };

        // --- INISIALISASI PEMUATAN HALAMAN ---
        document.addEventListener('DOMContentLoaded', function() {
            checkSession();
            window.fetchExchangeRates();

            // Mulai jam realtime untuk Navigasi Atas & Dashboard & Mobile Header
            setInterval(updateRealtimeClock, 1000);
            updateRealtimeClock();

            // Setup input listener untuk global search Desktop
            const globalInput = document.getElementById('global-search-input');
            if (globalInput) {
                globalInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        executeGlobalSearch();
                    }
                });
            }

            // Setup input listener untuk search khusus form HP/Mobile Header
            const mhInput = document.getElementById('mh-search-input');
            if (mhInput) {
                mhInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        const query = e.target.value;
                        document.getElementById('global-search-input').value = query; // sinkronkan dengan value global
                        executeGlobalSearch(query);
                    }
                });
            }

            fetchDashboardData().then((chartData) => {
                setTimeout(() => {
                    const ctx = document.getElementById('transactionChart').getContext('2d');
                    
                    const labels = chartData ? chartData.labels : ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                    const dataBeli = chartData ? chartData.beli_count : [0,0,0,0,0,0,0];
                    const dataJual = chartData ? chartData.jual_count : [0,0,0,0,0,0,0];

                    const gradientBeli = ctx.createLinearGradient(0, 0, 0, 300);
                    gradientBeli.addColorStop(0, 'rgba(59, 130, 246, 0.35)');
                    gradientBeli.addColorStop(0.8, 'rgba(59, 130, 246, 0.01)');

                    const gradientJual = ctx.createLinearGradient(0, 0, 0, 300);
                    gradientJual.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
                    gradientJual.addColorStop(0.8, 'rgba(16, 185, 129, 0.01)');

                    myChartInstance = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: labels,
                            datasets: [
                                {
                                    label: 'Pembelian',
                                    data: dataBeli,
                                    borderColor: '#3b82f6',
                                    backgroundColor: gradientBeli,
                                    borderWidth: 3,
                                    pointBackgroundColor: '#ffffff',
                                    pointBorderColor: '#3b82f6',
                                    pointBorderWidth: 2,
                                    pointRadius: 4,
                                    pointHoverRadius: 6,
                                    fill: true,
                                    tension: 0.4
                                },
                                {
                                    label: 'Penjualan',
                                    data: dataJual,
                                    borderColor: '#10b981',
                                    backgroundColor: gradientJual,
                                    borderWidth: 3,
                                    pointBackgroundColor: '#ffffff',
                                    pointBorderColor: '#10b981',
                                    pointBorderWidth: 2,
                                    pointRadius: 4,
                                    pointHoverRadius: 6,
                                    fill: true,
                                    tension: 0.4
                                }
                            ]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            interaction: {
                                mode: 'index',
                                intersect: false,
                            },
                            plugins: {
                                legend: {
                                    position: 'top',
                                    align: 'end',
                                    labels: {
                                        usePointStyle: true,
                                        boxWidth: 8,
                                        boxHeight: 8,
                                        font: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: '600' }
                                    }
                                }
                            }
                        }
                    });
                }, 100);
            });
        
         setInterval(() => {
 fetchDashboardData(true);
 }, 5000);
 });
