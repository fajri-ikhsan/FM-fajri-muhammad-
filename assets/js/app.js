// ============================================================================
// FM (FAJRI MUHAMMAD) — ENGINE APLIKASI DASHBOARD SOUND SYSTEM MULTI-ROLE
// Pembatas Role Ketat:
// - admin   : Akses penuh ke semua fitur KECUALI pembelian produk
// - pembeli : Akses katalog (produk, status, harga, jumlah stok), keranjang,
//             dan laman pembayaran pribadi
// ============================================================================

const AppState = {
  user: null,
  profile: null,
  role: 'pembeli',
  products: [],
  orders: [],
  users: [],
  cart: [],
  activeView: '',
  filterBrand: 'ALL',
  filterCategory: 'ALL',
  searchQuery: '',
  pendingAvatarDataUrl: null,
  usingFallbackCatalog: false
};

document.addEventListener('DOMContentLoaded', async () => {
  const authData = await window.FMAuth.requireAuth();
  if (!authData) return;

  AppState.user = authData.user;
  AppState.profile = authData.profile;
  AppState.role = authData.profile.role === 'admin' ? 'admin' : 'pembeli';

  // Muat keranjang lokal khusus pembeli
  if (AppState.role === 'pembeli') {
    try {
      const savedCart = localStorage.getItem(`fm_cart_${AppState.user.id}`);
      AppState.cart = savedCart ? JSON.parse(savedCart) : [];
    } catch (_) {
      AppState.cart = [];
    }
  } else {
    AppState.cart = [];
  }

  renderUserIdentity();
  buildRoleBasedNavigation();
  populateProductImageSelect();

  await Promise.all([
    loadProducts(),
    loadOrders(),
    AppState.role === 'admin' ? loadAllUsers() : Promise.resolve()
  ]);

  // Set default landing page sesuai role
  const defaultView = AppState.role === 'admin' ? 'overview' : 'catalog';
  navigateTo(defaultView);
});

// ============================================================================
// 1. IDENTITAS PENGGUNA & LINGKARAN PROFILE
// ============================================================================
function renderUserIdentity() {
  const p = AppState.profile;
  const avatarSrc = p.avatar_url || 'assets/images/avatar-default.jpg';

  const topAvatar = document.getElementById('topbarAvatarImg');
  const topName = document.getElementById('topbarUserName');
  const topRole = document.getElementById('topbarUserRole');
  const sidebarRoleText = document.getElementById('sidebarRoleLabel');

  if (topAvatar) topAvatar.src = avatarSrc;
  if (topName) topName.textContent = p.full_name || p.username;
  if (topRole) topRole.textContent = AppState.role === 'admin' ? 'ADMINISTRATOR' : 'PEMBELI';
  if (sidebarRoleText) {
    sidebarRoleText.textContent = AppState.role === 'admin' ? 'ADMIN TOKO' : 'AKUN PEMBELI';
  }
}

window.openProfileModal = function() {
  const p = AppState.profile;
  AppState.pendingAvatarDataUrl = null;

  document.getElementById('modalAvatarPreview').src = p.avatar_url || 'assets/images/avatar-default.jpg';
  document.getElementById('profFullName').value = p.full_name || '';
  document.getElementById('profUsername').value = p.username || '';
  document.getElementById('profEmail').value = p.email || '';
  document.getElementById('profRoleBadge').textContent = AppState.role === 'admin' ? 'ADMINISTRATOR TOKO' : 'PEMBELI TERVERIFIKASI';
  document.getElementById('profNewPassword').value = '';
  document.getElementById('profConfirmPassword').value = '';

  document.getElementById('profileModal').classList.add('open');
};

window.closeModal = function(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.remove('open');
};

// Resize & Preview Foto Profil yang diunggah user (Output JPEG bersih)
window.handleAvatarFileChange = function(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    window.showToast('Pilih file gambar yang valid (.jpg atau .png).', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const size = 240;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      // Center-crop square
      const minSide = Math.min(img.width, img.height);
      const sx = (img.width - minSide) / 2;
      const sy = (img.height - minSide) / 2;
      ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

      const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.86);
      AppState.pendingAvatarDataUrl = jpegDataUrl;
      document.getElementById('modalAvatarPreview').src = jpegDataUrl;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

window.saveProfileChanges = async function(e) {
  e.preventDefault();
  const btn = document.getElementById('btnSaveProfile');
  btn.disabled = true;
  btn.innerHTML = '<i class="ri-loader-4-line"></i> Menyimpan...';

  try {
    const fullName = document.getElementById('profFullName').value;
    const username = document.getElementById('profUsername').value;

    const updated = await window.FMAuth.updateProfile(AppState.user.id, {
      fullName,
      username,
      avatarDataUrl: AppState.pendingAvatarDataUrl
    });

    AppState.profile = { ...AppState.profile, ...updated };
    renderUserIdentity();
    window.showToast('Profil & foto akun berhasil diperbarui!', 'success');
    window.closeModal('profileModal');
  } catch (err) {
    window.showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="ri-save-3-line"></i> Simpan Perubahan Profil';
  }
};

window.saveNewAccountPassword = async function(e) {
  e.preventDefault();
  const newPass = document.getElementById('profNewPassword').value;
  const confirmPass = document.getElementById('profConfirmPassword').value;

  if (newPass !== confirmPass) {
    window.showToast('Konfirmasi password baru tidak cocok.', 'error');
    return;
  }

  const btn = document.getElementById('btnSavePassword');
  btn.disabled = true;
  btn.innerHTML = '<i class="ri-loader-4-line"></i> Memperbarui...';

  try {
    await window.FMAuth.updatePassword(newPass);
    document.getElementById('profNewPassword').value = '';
    document.getElementById('profConfirmPassword').value = '';
    window.showToast('Password akun berhasil diperbarui!', 'success');
  } catch (err) {
    window.showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="ri-lock-password-line"></i> Perbarui Password';
  }
};

// ============================================================================
// 2. NAVIGASI SIDEBAR KIRI BERBASIS ROLE
// ============================================================================
function buildRoleBasedNavigation() {
  const navContainer = document.getElementById('sidebarNavMenu');
  if (!navContainer) return;

  if (AppState.role === 'admin') {
    navContainer.innerHTML = `
      <div class="nav-section-label">Ringkasan Toko</div>
      <button class="nav-item" data-view="overview" onclick="navigateTo('overview')">
        <span class="nav-item-left"><i class="ri-dashboard-3-line"></i> Dashboard Eksekutif</span>
      </button>

      <div class="nav-section-label">Inventaris & Katalog</div>
      <button class="nav-item" data-view="manage-products" onclick="navigateTo('manage-products')">
        <span class="nav-item-left"><i class="ri-equalizer-line"></i> Kelola Produk & Stok</span>
        <span class="nav-badge" id="navProductCount">0</span>
      </button>
      <button class="nav-item" data-view="catalog" onclick="navigateTo('catalog')">
        <span class="nav-item-left"><i class="ri-speaker-3-line"></i> Pratinjau Katalog</span>
      </button>

      <div class="nav-section-label">Keuangan & Akun</div>
      <button class="nav-item" data-view="payments" onclick="navigateTo('payments')">
        <span class="nav-item-left"><i class="ri-secure-payment-line"></i> Laman Pembayaran</span>
        <span class="nav-badge" id="navOrderCount">0</span>
      </button>
      <button class="nav-item" data-view="users" onclick="navigateTo('users')">
        <span class="nav-item-left"><i class="ri-group-line"></i> Data Pengguna</span>
      </button>
    `;
  } else {
    // ROLE PEMBELI: Katalog (Produk, Status, Harga, Jumlah Barang), Keranjang, & Laman Pembayaran
    navContainer.innerHTML = `
      <div class="nav-section-label">Etalase Sound System</div>
      <button class="nav-item" data-view="catalog" onclick="navigateTo('catalog')">
        <span class="nav-item-left"><i class="ri-speaker-3-line"></i> Katalog Produk</span>
        <span class="nav-badge" id="navProductCount">0</span>
      </button>
      <button class="nav-item" data-view="cart" onclick="navigateTo('cart')">
        <span class="nav-item-left"><i class="ri-shopping-bag-3-line"></i> Keranjang Pembelian</span>
        <span class="nav-badge" id="navCartCount">0</span>
      </button>

      <div class="nav-section-label">Transaksi & Tagihan</div>
      <button class="nav-item" data-view="payments" onclick="navigateTo('payments')">
        <span class="nav-item-left"><i class="ri-bill-line"></i> Laman Pembayaran</span>
        <span class="nav-badge" id="navOrderCount">0</span>
      </button>
    `;
  }
}

window.navigateTo = function(viewName) {
  // Pembatas akses ketat tingkat navigasi UI
  if (AppState.role === 'admin' && viewName === 'cart') {
    window.showToast('Akses Ditolak: Role Admin tidak memiliki akses pembelian produk.', 'error');
    return;
  }
  if (AppState.role === 'pembeli' && ['overview', 'manage-products', 'users'].includes(viewName)) {
    window.showToast('Akses Ditolak: Halaman ini khusus Administrator Toko.', 'error');
    return;
  }

  AppState.activeView = viewName;

  // Update active state tombol sidebar
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
  });

  // Tampilkan section yang sesuai
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.toggle('active', sec.id === `view-${viewName}`);
  });

  // Update judul header atas
  const titles = {
    overview: ['Dashboard Eksekutif', 'Pusat kendali penjualan, inventaris sound system & verifikasi transaksi'],
    catalog: [
      AppState.role === 'admin' ? 'Pratinjau Katalog Sound System' : 'Katalog Sound System FM Audio',
      AppState.role === 'admin'
        ? 'Tampilan etalase publik (Fitur pembelian dikunci otomatis untuk role Admin)'
        : 'Cek ketersediaan unit, status produk, harga resmi, dan jumlah stok tersedia'
    ],
    cart: ['Keranjang & Checkout Pembelian', 'Atur jumlah unit sound system dan pilih metode pembayaran Anda'],
    payments: [
      AppState.role === 'admin' ? 'Manajemen Laman Pembayaran & Pesanan' : 'Laman Pembayaran & Riwayat Tagihan',
      AppState.role === 'admin'
        ? 'Verifikasi bukti pembayaran pembeli dan kelola status pengiriman unit'
        : 'Pantau status pembayaran, rincian invoice, dan konfirmasi transfer Anda'
    ],
    'manage-products': ['Manajemen Produk & Stok', 'Tambah unit sound system baru, perbarui harga, jumlah stok, dan status ketersediaan'],
    users: ['Manajemen Akun Pengguna', 'Daftar akun Administrator dan Pembeli yang terdaftar di sistem']
  };

  const [title, subtitle] = titles[viewName] || ['FM Sound System', 'Sistem Informasi Penjualan'];
  document.getElementById('headerPageTitle').textContent = title;
  document.getElementById('headerPageSubtitle').textContent = subtitle;

  // Tutup sidebar mobile jika terbuka
  document.getElementById('sidebar').classList.remove('open');

  // Render ulang konten view aktif
  if (viewName === 'overview') renderAdminOverview();
  if (viewName === 'catalog') renderCatalogGrid();
  if (viewName === 'cart') renderCartView();
  if (viewName === 'payments') renderPaymentsView();
  if (viewName === 'manage-products') renderAdminProductsTable();
  if (viewName === 'users') renderAdminUsersTable();
};

window.toggleMobileSidebar = function() {
  document.getElementById('sidebar').classList.toggle('open');
};

// ============================================================================
// 3. DATA PRODUK SOUND SYSTEM (SUPABASE + AUTO-SEED)
// ============================================================================
async function loadProducts() {
  const { data, error } = await window.sb
    .from('products')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('Products fetch fallback:', error.message);
    AppState.products = window.INITIAL_PRODUCTS.map((p, i) => ({ ...p, id: `local-${i + 1}` }));
    AppState.usingFallbackCatalog = true;
  } else if (!data || data.length === 0) {
    // Jika tabel products masih kosong di Supabase, tampilkan katalog awal
    AppState.products = window.INITIAL_PRODUCTS.map((p, i) => ({ ...p, id: `seed-${i + 1}` }));
    AppState.usingFallbackCatalog = true;

    // Jika Admin login dan tabel masih kosong, otomatis seed ke Supabase
    if (AppState.role === 'admin') {
      await seedInitialProductsToSupabase(true);
    }
  } else {
    AppState.products = data;
    AppState.usingFallbackCatalog = false;
  }

  updateNavBadges();
}

window.seedInitialProductsToSupabase = async function(silent = false) {
  if (AppState.role !== 'admin') return;

  const { error } = await window.sb
    .from('products')
    .upsert(window.INITIAL_PRODUCTS, { onConflict: 'sku' });

  if (error) {
    if (!silent) window.showToast('Gagal sinkronisasi katalog ke Supabase: ' + error.message, 'error');
    return;
  }

  if (!silent) window.showToast('9 produk sound system awal berhasil disimpan ke database Supabase!', 'success');
  await loadProducts();
  if (AppState.activeView === 'manage-products') renderAdminProductsTable();
  if (AppState.activeView === 'catalog') renderCatalogGrid();
  if (AppState.activeView === 'overview') renderAdminOverview();
};

function updateNavBadges() {
  const prodBadge = document.getElementById('navProductCount');
  const orderBadge = document.getElementById('navOrderCount');
  const cartBadge = document.getElementById('navCartCount');

  if (prodBadge) prodBadge.textContent = AppState.products.length;
  if (orderBadge) orderBadge.textContent = AppState.orders.length;
  if (cartBadge) {
    const totalQty = AppState.cart.reduce((acc, item) => acc + item.qty, 0);
    cartBadge.textContent = totalQty;
  }
}

// ============================================================================
// 4. KATALOG PRODUK (DILIHAT PEMBELI & PRATINJAU ADMIN)
// ============================================================================
window.setBrandFilter = function(brand, btnEl) {
  AppState.filterBrand = brand;
  document.querySelectorAll('.brand-pill-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  renderCatalogGrid();
};

window.setCategoryFilter = function(val) {
  AppState.filterCategory = val;
  renderCatalogGrid();
};

window.setSearchQuery = function(val) {
  AppState.searchQuery = val.trim().toLowerCase();
  renderCatalogGrid();
};

function getFilteredProducts() {
  return AppState.products.filter(p => {
    const matchBrand = AppState.filterBrand === 'ALL' || p.brand.toLowerCase() === AppState.filterBrand.toLowerCase();
    const matchCat = AppState.filterCategory === 'ALL' || p.category.toLowerCase() === AppState.filterCategory.toLowerCase();
    const matchSearch = !AppState.searchQuery ||
      p.name.toLowerCase().includes(AppState.searchQuery) ||
      p.brand.toLowerCase().includes(AppState.searchQuery) ||
      (p.specs && p.specs.toLowerCase().includes(AppState.searchQuery)) ||
      (p.sku && p.sku.toLowerCase().includes(AppState.searchQuery));
    return matchBrand && matchCat && matchSearch;
  });
}

function getStatusBadgeClass(status) {
  const s = (status || '').toLowerCase();
  if (s === 'tersedia' || s === 'lunas' || s === 'selesai') return 'status-tersedia';
  if (s === 'stok terbatas' || s === 'menunggu verifikasi' || s === 'menunggu pembayaran' || s === 'diproses') return 'status-terbatas';
  if (s === 'dikirim') return 'status-dikirim';
  return 'status-habis';
}

function renderCatalogGrid() {
  const grid = document.getElementById('catalogProductGrid');
  if (!grid) return;

  const items = getFilteredProducts();
  if (items.length === 0) {
    grid.innerHTML = `
      <div class="panel-card" style="grid-column: 1 / -1; text-align:center; padding:48px 20px;">
        <i class="ri-search-eye-line" style="font-size:2.4rem; color:var(--gold-light);"></i>
        <h3 style="margin-top:12px;">Unit Sound System Tidak Ditemukan</h3>
        <p style="color:var(--text-secondary); font-size:0.86rem; margin-top:4px;">Ubah kata kunci pencarian atau filter merek Fender / Marshall / Behringer.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = items.map(prod => {
    const isOutOfStock = Number(prod.stock) <= 0 || prod.status === 'Habis';
    const badgeClass = getStatusBadgeClass(prod.status);
    const displayStatus = isOutOfStock ? 'Habis' : prod.status;

    let actionArea = '';
    if (AppState.role === 'admin') {
      actionArea = `
        <div class="admin-lock-notice">
          <i class="ri-shield-keyhole-line" style="color:var(--gold-light);"></i>
          <span>Mode Admin — Pembelian Dinonaktifkan</span>
        </div>
      `;
    } else {
      actionArea = `
        <button class="btn btn-gold" style="flex:1;" ${isOutOfStock ? 'disabled' : ''} onclick="addToCart('${prod.id}')">
          <i class="ri-shopping-cart-2-line"></i> ${isOutOfStock ? 'Stok Habis' : 'Tambah ke Keranjang'}
        </button>
        <button class="btn btn-navy" title="Beli Sekarang" ${isOutOfStock ? 'disabled' : ''} onclick="buyNow('${prod.id}')">
          <i class="ri-flashlight-line"></i> Beli
        </button>
      `;
    }

    return `
      <article class="product-card">
        <div class="product-stage">
          <span class="product-brand-tag">${prod.brand}</span>
          <span class="status-badge floating ${badgeClass}">● ${displayStatus}</span>
          <img src="${prod.image_url}" alt="${prod.name}" loading="lazy" onerror="this.src='assets/images/fender-brown-combo.jpg'">
        </div>
        <div class="product-body">
          <div class="product-meta-row">
            <span>${prod.category}</span>
            <span class="font-mono">${prod.sku}</span>
          </div>
          <h3 class="product-title">${prod.name}</h3>
          <p class="product-specs">${prod.specs || 'Audio grade profesional dengan kejernihan karakter analog & dinamika panggung tinggi.'}</p>
          <div class="product-telemetry">
            <div class="price-block">
              <span>Harga Resmi</span>
              <strong>${window.formatRupiah(prod.price)}</strong>
            </div>
            <div class="stock-block">
              <span>Jumlah Barang</span>
              <strong>${prod.stock} Unit</strong>
            </div>
          </div>
          <div class="product-actions">
            ${actionArea}
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// ============================================================================
// 5. KERANJANG & CHECKOUT (KHUSUS ROLE PEMBELI)
// ============================================================================
function persistCart() {
  if (AppState.role === 'pembeli' && AppState.user) {
    localStorage.setItem(`fm_cart_${AppState.user.id}`, JSON.stringify(AppState.cart));
  }
  updateNavBadges();
}

window.addToCart = function(productId) {
  if (AppState.role !== 'pembeli') {
    window.showToast('Akses Ditolak: Role Admin tidak diperbolehkan membeli produk.', 'error');
    return;
  }

  const prod = AppState.products.find(p => String(p.id) === String(productId));
  if (!prod) return;

  if (Number(prod.stock) <= 0 || prod.status === 'Habis') {
    window.showToast('Maaf, stok unit ini sedang habis.', 'error');
    return;
  }

  const existing = AppState.cart.find(c => String(c.product_id) === String(prod.id));
  if (existing) {
    if (existing.qty >= Number(prod.stock)) {
      window.showToast(`Jumlah maksimal sesuai stok tersedia (${prod.stock} unit).`, 'info');
      return;
    }
    existing.qty += 1;
  } else {
    AppState.cart.push({
      product_id: prod.id,
      sku: prod.sku,
      name: prod.name,
      brand: prod.brand,
      price: Number(prod.price),
      image_url: prod.image_url,
      max_stock: Number(prod.stock),
      qty: 1
    });
  }

  persistCart();
  window.showToast(`"${prod.name}" ditambahkan ke keranjang.`, 'success');
};

window.buyNow = function(productId) {
  if (AppState.role !== 'pembeli') return;
  window.addToCart(productId);
  navigateTo('cart');
};

window.updateCartQty = function(productId, delta) {
  const idx = AppState.cart.findIndex(c => String(c.product_id) === String(productId));
  if (idx === -1) return;

  const prod = AppState.products.find(p => String(p.id) === String(productId));
  const maxStock = prod ? Number(prod.stock) : AppState.cart[idx].max_stock;
  const nextQty = AppState.cart[idx].qty + delta;

  if (nextQty <= 0) {
    AppState.cart.splice(idx, 1);
  } else if (nextQty > maxStock) {
    window.showToast(`Stok tersedia hanya ${maxStock} unit.`, 'info');
    return;
  } else {
    AppState.cart[idx].qty = nextQty;
  }

  persistCart();
  renderCartView();
};

window.removeCartItem = function(productId) {
  AppState.cart = AppState.cart.filter(c => String(c.product_id) !== String(productId));
  persistCart();
  renderCartView();
};

function renderCartView() {
  const listEl = document.getElementById('cartItemsContainer');
  const totalEl = document.getElementById('cartGrandTotal');
  const countEl = document.getElementById('cartTotalUnits');
  if (!listEl) return;

  if (AppState.cart.length === 0) {
    listEl.innerHTML = `
      <div style="text-align:center; padding:42px 16px;">
        <i class="ri-shopping-bag-3-line" style="font-size:2.5rem; color:var(--gold-light);"></i>
        <h4 style="margin-top:10px;">Keranjang Pembelian Masih Kosong</h4>
        <p style="color:var(--text-secondary); font-size:0.84rem; margin:6px 0 18px;">Pilih unit amplifier atau mixing console dari katalog untuk memulai transaksi.</p>
        <button class="btn btn-gold" onclick="navigateTo('catalog')">
          <i class="ri-speaker-3-line"></i> Jelajahi Katalog Sound System
        </button>
      </div>
    `;
    if (totalEl) totalEl.textContent = 'Rp 0';
    if (countEl) countEl.textContent = '0 Unit';
    return;
  }

  let grandTotal = 0;
  let totalUnits = 0;

  listEl.innerHTML = AppState.cart.map(item => {
    const subtotal = item.price * item.qty;
    grandTotal += subtotal;
    totalUnits += item.qty;
    return `
      <div class="cart-item-row">
        <div class="cart-item-info">
          <img src="${item.image_url}" alt="${item.name}" class="table-thumb" style="width:62px; height:62px;">
          <div>
            <span style="font-size:0.7rem; color:var(--gold-light); font-weight:700; text-transform:uppercase;">${item.brand} • ${item.sku}</span>
            <h4 style="font-size:0.94rem; color:#fff; margin:2px 0;">${item.name}</h4>
            <span class="font-mono" style="font-size:0.82rem; color:var(--text-secondary);">${window.formatRupiah(item.price)} / unit</span>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:14px;">
          <div class="qty-stepper">
            <button type="button" onclick="updateCartQty('${item.product_id}', -1)">−</button>
            <span>${item.qty}</span>
            <button type="button" onclick="updateCartQty('${item.product_id}', 1)">+</button>
          </div>
          <div class="font-mono" style="min-width:125px; text-align:right; font-weight:700; color:var(--gold-light);">
            ${window.formatRupiah(subtotal)}
          </div>
          <button type="button" class="btn btn-danger btn-sm" onclick="removeCartItem('${item.product_id}')" title="Hapus">
            <i class="ri-delete-bin-6-line"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  if (totalEl) totalEl.textContent = window.formatRupiah(grandTotal);
  if (countEl) countEl.textContent = `${totalUnits} Unit`;
}

window.submitCheckoutOrder = async function(e) {
  e.preventDefault();
  if (AppState.role !== 'pembeli') {
    window.showToast('Akses Ditolak: Role Admin tidak dapat membuat pesanan.', 'error');
    return;
  }
  if (AppState.cart.length === 0) {
    window.showToast('Keranjang belanja Anda masih kosong.', 'error');
    return;
  }

  const paymentMethod = document.getElementById('checkoutPaymentMethod').value;
  const paymentRef = document.getElementById('checkoutPaymentRef').value.trim();
  const notes = document.getElementById('checkoutNotes').value.trim();

  const btn = document.getElementById('btnSubmitOrder');
  btn.disabled = true;
  btn.innerHTML = '<i class="ri-loader-4-line"></i> Memproses Tagihan...';

  try {
    const totalAmount = AppState.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const invoiceNum = 'INV-FM-' + Date.now().toString().slice(-7);
    const hasRef = paymentRef.length > 0;

    const orderPayload = {
      invoice_number: invoiceNum,
      buyer_id: AppState.user.id,
      buyer_name: AppState.profile.full_name || AppState.profile.username,
      buyer_email: AppState.profile.email,
      items: AppState.cart,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      payment_reference: paymentRef,
      payment_status: hasRef ? 'Menunggu Verifikasi' : 'Menunggu Pembayaran',
      order_status: hasRef ? 'Diproses' : 'Menunggu Pembayaran',
      notes
    };

    const { error } = await window.sb.from('orders').insert(orderPayload);
    if (error) {
      throw new Error('Gagal menyimpan pesanan ke Supabase: ' + error.message);
    }

    AppState.cart = [];
    persistCart();
    document.getElementById('checkoutPaymentRef').value = '';
    document.getElementById('checkoutNotes').value = '';

    await loadOrders();
    window.showToast(`Pesanan ${invoiceNum} berhasil dibuat! Silakan cek status di Laman Pembayaran.`, 'success');
    navigateTo('payments');
  } catch (err) {
    window.showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="ri-secure-payment-line"></i> Buat Pesanan & Lanjut ke Pembayaran';
  }
};

// ============================================================================
// 6. LAMAN PEMBAYARAN (PEMBELI CEK TAGIHAN & ADMIN VERIFIKASI PEMBAYARAN)
// ============================================================================
async function loadOrders() {
  let query = window.sb
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (AppState.role === 'pembeli') {
    query = query.eq('buyer_id', AppState.user.id);
  }

  const { data, error } = await query;
  if (error) {
    console.warn('Orders fetch warning:', error.message);
    AppState.orders = [];
  } else {
    AppState.orders = data || [];
  }
  updateNavBadges();
}

function renderPaymentsView() {
  const tbody = document.getElementById('paymentsTableBody');
  const titleEl = document.getElementById('paymentsPanelTitle');
  if (!tbody) return;

  if (titleEl) {
    titleEl.innerHTML = AppState.role === 'admin'
      ? '<i class="ri-shield-check-line"></i> Daftar Transaksi & Verifikasi Pembayaran Pelanggan'
      : '<i class="ri-bill-line"></i> Tagihan & Status Pembayaran Anda';
  }

  if (AppState.orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:36px; color:var(--text-secondary);">
          Belum ada catatan transaksi pembayaran.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = AppState.orders.map(ord => {
    const itemsList = Array.isArray(ord.items) ? ord.items : [];
    const itemsSummary = itemsList.map(i => `${i.name} (${i.qty}x)`).join(', ');
    const payClass = getStatusBadgeClass(ord.payment_status);
    const ordClass = getStatusBadgeClass(ord.order_status);
    const dateStr = new Date(ord.created_at).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric'
    });

    let actionBtns = '';
    if (AppState.role === 'admin') {
      actionBtns = `
        <div style="display:flex; flex-wrap:wrap; gap:6px;">
          ${ord.payment_status !== 'Lunas' ? `
            <button class="btn btn-gold btn-sm" onclick="adminVerifyOrder('${ord.id}', 'Lunas', 'Diproses')">
              <i class="ri-check-double-line"></i> Konfirmasi Lunas
            </button>
          ` : `
            <button class="btn btn-navy btn-sm" onclick="adminVerifyOrder('${ord.id}', 'Lunas', 'Dikirim')">
              <i class="ri-truck-line"></i> Kirim Unit
            </button>
          `}
          <button class="btn btn-outline-gold btn-sm" onclick="openInvoiceModal('${ord.id}')">
            <i class="ri-eye-line"></i> Detail
          </button>
        </div>
      `;
    } else {
      actionBtns = `
        <div style="display:flex; flex-wrap:wrap; gap:6px;">
          ${ord.payment_status === 'Menunggu Pembayaran' ? `
            <button class="btn btn-gold btn-sm" onclick="openBuyerConfirmPayment('${ord.id}')">
              <i class="ri-upload-2-line"></i> Konfirmasi Bayar
            </button>
          ` : ''}
          <button class="btn btn-outline-gold btn-sm" onclick="openInvoiceModal('${ord.id}')">
            <i class="ri-file-list-3-line"></i> Rincian
          </button>
        </div>
      `;
    }

    return `
      <tr>
        <td>
          <strong class="font-mono" style="color:var(--gold-light);">${ord.invoice_number}</strong>
          <div style="font-size:0.74rem; color:var(--text-muted);">${dateStr}</div>
        </td>
        <td>
          <div style="font-weight:600;">${ord.buyer_name}</div>
          <div style="font-size:0.74rem; color:var(--text-secondary);">${ord.buyer_email}</div>
        </td>
        <td style="max-width:250px;">
          <div style="font-size:0.82rem; color:var(--text-primary);">${itemsSummary || '-'}</div>
          <div style="font-size:0.73rem; color:var(--gold-primary); margin-top:2px;">${ord.payment_method} ${ord.payment_reference ? '• Ref: ' + ord.payment_reference : ''}</div>
        </td>
        <td class="font-mono" style="font-weight:700; color:var(--gold-light);">
          ${window.formatRupiah(ord.total_amount)}
        </td>
        <td><span class="status-badge ${payClass}">● ${ord.payment_status}</span></td>
        <td><span class="status-badge ${ordClass}">● ${ord.order_status}</span></td>
        <td>${actionBtns}</td>
      </tr>
    `;
  }).join('');
}

window.openBuyerConfirmPayment = function(orderId) {
  const ord = AppState.orders.find(o => String(o.id) === String(orderId));
  if (!ord) return;

  document.getElementById('confirmOrderId').value = ord.id;
  document.getElementById('confirmInvoiceLabel').textContent = `${ord.invoice_number} — ${window.formatRupiah(ord.total_amount)}`;
  document.getElementById('confirmRefInput').value = ord.payment_reference || '';
  document.getElementById('buyerPayModal').classList.add('open');
};

window.submitBuyerPaymentProof = async function(e) {
  e.preventDefault();
  const orderId = document.getElementById('confirmOrderId').value;
  const ref = document.getElementById('confirmRefInput').value.trim();
  if (!ref) {
    window.showToast('Masukkan nomor referensi / bukti transfer pembayaran.', 'error');
    return;
  }

  const { error } = await window.sb
    .from('orders')
    .update({
      payment_reference: ref,
      payment_status: 'Menunggu Verifikasi',
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId);

  if (error) {
    window.showToast('Gagal mengirim konfirmasi: ' + error.message, 'error');
    return;
  }

  window.closeModal('buyerPayModal');
  window.showToast('Konfirmasi pembayaran terkirim! Menunggu verifikasi Admin.', 'success');
  await loadOrders();
  renderPaymentsView();
};

window.adminVerifyOrder = async function(orderId, paymentStatus, orderStatus) {
  if (AppState.role !== 'admin') return;

  const ord = AppState.orders.find(o => String(o.id) === String(orderId));
  const wasUnpaid = ord && ord.payment_status !== 'Lunas';

  const { error } = await window.sb
    .from('orders')
    .update({
      payment_status: paymentStatus,
      order_status: orderStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId);

  if (error) {
    window.showToast('Gagal memperbarui status pesanan: ' + error.message, 'error');
    return;
  }

  // Kurangi stok produk saat pembayaran pertama kali dikonfirmasi Lunas
  if (wasUnpaid && paymentStatus === 'Lunas' && ord && Array.isArray(ord.items)) {
    for (const item of ord.items) {
      const prod = AppState.products.find(p => String(p.id) === String(item.product_id) || p.sku === item.sku);
      if (prod && !String(prod.id).startsWith('local-') && !String(prod.id).startsWith('seed-')) {
        const newStock = Math.max(0, Number(prod.stock) - Number(item.qty));
        await window.sb.from('products').update({ stock: newStock }).eq('id', prod.id);
      }
    }
    await loadProducts();
  }

  window.showToast(`Status invoice diperbarui menjadi "${paymentStatus}" (${orderStatus}).`, 'success');
  await loadOrders();
  renderPaymentsView();
  if (AppState.activeView === 'overview') renderAdminOverview();
};

window.openInvoiceModal = function(orderId) {
  const ord = AppState.orders.find(o => String(o.id) === String(orderId));
  if (!ord) return;

  const items = Array.isArray(ord.items) ? ord.items : [];
  const body = document.getElementById('invoiceModalBody');
  body.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; padding:12px 14px; background:rgba(4,8,19,0.75); border-radius:10px; border:1px solid var(--brass-border);">
      <div>
        <span style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Nomor Invoice</span>
        <div class="font-mono" style="font-size:1.05rem; font-weight:700; color:var(--gold-light);">${ord.invoice_number}</div>
      </div>
      <span class="status-badge ${getStatusBadgeClass(ord.payment_status)}">● ${ord.payment_status}</span>
    </div>
    <div style="font-size:0.84rem; margin-bottom:14px; color:var(--text-secondary);">
      <div><strong style="color:#fff;">Pembeli:</strong> ${ord.buyer_name} (${ord.buyer_email})</div>
      <div><strong style="color:#fff;">Metode Bayar:</strong> ${ord.payment_method}</div>
      <div><strong style="color:#fff;">Referensi Transfer:</strong> ${ord.payment_reference || 'Belum dilampirkan'}</div>
      ${ord.notes ? `<div><strong style="color:#fff;">Catatan:</strong> ${ord.notes}</div>` : ''}
    </div>
    <div style="border-top:1px solid rgba(148,163,184,0.14); padding-top:12px;">
      ${items.map(i => `
        <div style="display:flex; justify-content:space-between; padding:7px 0; font-size:0.84rem;">
          <span>${i.name} <strong style="color:var(--gold-light);">×${i.qty}</strong></span>
          <span class="font-mono">${window.formatRupiah(i.price * i.qty)}</span>
        </div>
      `).join('')}
    </div>
    <div style="border-top:1px solid var(--brass-border); margin-top:12px; padding-top:12px; display:flex; justify-content:space-between; align-items:center;">
      <span style="font-weight:700;">TOTAL PEMBAYARAN</span>
      <span class="font-mono" style="font-size:1.2rem; font-weight:700; color:var(--gold-light);">${window.formatRupiah(ord.total_amount)}</span>
    </div>
  `;
  document.getElementById('invoiceModal').classList.add('open');
};

// ============================================================================
// 7. ADMIN ONLY: DASHBOARD EKSEKUTIF, CRUD PRODUK, & MANAJEMEN PENGGUNA
// ============================================================================
function renderAdminOverview() {
  if (AppState.role !== 'admin') return;

  const totalRevenue = AppState.orders
    .filter(o => o.payment_status === 'Lunas')
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  const pendingOrders = AppState.orders.filter(o => o.payment_status !== 'Lunas' && o.payment_status !== 'Dibatalkan').length;
  const totalStockUnits = AppState.products.reduce((sum, p) => sum + Number(p.stock || 0), 0);
  const lowStockCount = AppState.products.filter(p => Number(p.stock) <= 3).length;

  document.getElementById('kpiTotalRevenue').textContent = window.formatRupiah(totalRevenue);
  document.getElementById('kpiTotalOrders').textContent = `${AppState.orders.length} Transaksi`;
  document.getElementById('kpiPendingOrders').textContent = `${pendingOrders} menunggu verifikasi`;
  document.getElementById('kpiTotalStock').textContent = `${totalStockUnits} Unit`;
  document.getElementById('kpiLowStockSub').textContent = `${lowStockCount} model stok terbatas / habis`;
  document.getElementById('kpiTotalUsers').textContent = `${AppState.users.length || 1} Akun`;

  // Render tabel ringkasan inventaris terbaru di overview
  const recentBody = document.getElementById('overviewInventoryBody');
  if (recentBody) {
    recentBody.innerHTML = AppState.products.slice(0, 6).map(p => `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="${p.image_url}" alt="${p.name}" class="table-thumb">
            <div>
              <div style="font-weight:600; color:#fff;">${p.name}</div>
              <div style="font-size:0.72rem; color:var(--text-muted);">${p.sku} • ${p.category}</div>
            </div>
          </div>
        </td>
        <td><strong style="color:var(--gold-light);">${p.brand}</strong></td>
        <td class="font-mono">${window.formatRupiah(p.price)}</td>
        <td class="font-mono">${p.stock} Unit</td>
        <td><span class="status-badge ${getStatusBadgeClass(p.status)}">● ${p.status}</span></td>
      </tr>
    `).join('');
  }
}

function populateProductImageSelect() {
  const select = document.getElementById('prodImageSelect');
  if (!select) return;
  select.innerHTML = window.AVAILABLE_PRODUCT_IMAGES.map(img =>
    `<option value="${img.path}">${img.label}</option>`
  ).join('');
}

function renderAdminProductsTable() {
  if (AppState.role !== 'admin') return;
  const tbody = document.getElementById('adminProductsTableBody');
  if (!tbody) return;

  tbody.innerHTML = AppState.products.map(p => `
    <tr>
      <td>
        <div style="display:flex; align-items:center; gap:12px;">
          <img src="${p.image_url}" alt="${p.name}" class="table-thumb">
          <div>
            <div style="font-weight:700; color:#fff;">${p.name}</div>
            <div class="font-mono" style="font-size:0.72rem; color:var(--text-muted);">${p.sku}</div>
          </div>
        </div>
      </td>
      <td><span style="color:var(--gold-light); font-weight:700;">${p.brand}</span></td>
      <td>${p.category}</td>
      <td class="font-mono" style="font-weight:700;">${window.formatRupiah(p.price)}</td>
      <td class="font-mono">${p.stock} Unit</td>
      <td><span class="status-badge ${getStatusBadgeClass(p.status)}">● ${p.status}</span></td>
      <td>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-outline-gold btn-sm" onclick="openProductModal('${p.id}')">
            <i class="ri-edit-box-line"></i> Edit
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">
            <i class="ri-delete-bin-6-line"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.openProductModal = function(productId = null) {
  if (AppState.role !== 'admin') return;
  const form = document.getElementById('productForm');
  form.reset();

  if (productId) {
    const prod = AppState.products.find(p => String(p.id) === String(productId));
    if (!prod) return;
    document.getElementById('productModalTitle').textContent = 'Edit Unit Sound System';
    document.getElementById('prodEditId').value = prod.id;
    document.getElementById('prodSku').value = prod.sku;
    document.getElementById('prodName').value = prod.name;
    document.getElementById('prodBrand').value = prod.brand;
    document.getElementById('prodCategory').value = prod.category;
    document.getElementById('prodPrice').value = prod.price;
    document.getElementById('prodStock').value = prod.stock;
    document.getElementById('prodStatus').value = prod.status;
    document.getElementById('prodImageSelect').value = prod.image_url;
    document.getElementById('prodSpecs').value = prod.specs || '';
  } else {
    document.getElementById('productModalTitle').textContent = 'Tambah Produk Sound System Baru';
    document.getElementById('prodEditId').value = '';
    document.getElementById('prodSku').value = 'FM-SND-' + Math.floor(100 + Math.random() * 900);
    document.getElementById('prodStatus').value = 'Tersedia';
  }

  document.getElementById('productModal').classList.add('open');
};

window.saveProductForm = async function(e) {
  e.preventDefault();
  if (AppState.role !== 'admin') return;

  const editId = document.getElementById('prodEditId').value;
  const stockNum = parseInt(document.getElementById('prodStock').value, 10) || 0;
  let statusVal = document.getElementById('prodStatus').value;
  if (stockNum <= 0) statusVal = 'Habis';

  const payload = {
    sku: document.getElementById('prodSku').value.trim().toUpperCase(),
    name: document.getElementById('prodName').value.trim(),
    brand: document.getElementById('prodBrand').value,
    category: document.getElementById('prodCategory').value,
    price: Number(document.getElementById('prodPrice').value) || 0,
    stock: stockNum,
    status: statusVal,
    image_url: document.getElementById('prodImageSelect').value,
    specs: document.getElementById('prodSpecs').value.trim()
  };

  let res;
  if (editId && !editId.startsWith('local-') && !editId.startsWith('seed-')) {
    res = await window.sb.from('products').update(payload).eq('id', editId);
  } else {
    res = await window.sb.from('products').upsert(payload, { onConflict: 'sku' });
  }

  if (res.error) {
    window.showToast('Gagal menyimpan produk: ' + res.error.message, 'error');
    return;
  }

  window.closeModal('productModal');
  window.showToast(`Unit "${payload.name}" berhasil disimpan!`, 'success');
  await loadProducts();
  renderAdminProductsTable();
  if (AppState.activeView === 'overview') renderAdminOverview();
};

window.deleteProduct = async function(productId) {
  if (AppState.role !== 'admin') return;
  if (!confirm('Hapus unit sound system ini dari katalog?')) return;

  if (String(productId).startsWith('local-') || String(productId).startsWith('seed-')) {
    AppState.products = AppState.products.filter(p => String(p.id) !== String(productId));
    renderAdminProductsTable();
    return;
  }

  const { error } = await window.sb.from('products').delete().eq('id', productId);
  if (error) {
    window.showToast('Gagal menghapus produk: ' + error.message, 'error');
    return;
  }

  window.showToast('Produk berhasil dihapus dari katalog.', 'success');
  await loadProducts();
  renderAdminProductsTable();
};

async function loadAllUsers() {
  const { data, error } = await window.sb
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (!error && data) {
    AppState.users = data;
  }
}

function renderAdminUsersTable() {
  if (AppState.role !== 'admin') return;
  const tbody = document.getElementById('adminUsersTableBody');
  if (!tbody) return;

  const list = AppState.users.length > 0 ? AppState.users : [AppState.profile];
  tbody.innerHTML = list.map(u => `
    <tr>
      <td>
        <div style="display:flex; align-items:center; gap:10px;">
          <img src="${u.avatar_url || 'assets/images/avatar-default.jpg'}" alt="${u.full_name}" style="width:38px; height:38px; border-radius:50%; object-fit:cover; border:1px solid var(--gold-primary);">
          <div>
            <div style="font-weight:700; color:#fff;">${u.full_name}</div>
            <div class="font-mono" style="font-size:0.74rem; color:var(--text-muted);">@${u.username}</div>
          </div>
        </div>
      </td>
      <td>${u.email}</td>
      <td>
        <span class="status-badge ${u.role === 'admin' ? 'status-terbatas' : 'status-tersedia'}">
          ● ${u.role.toUpperCase()}
        </span>
      </td>
      <td style="font-size:0.78rem; color:var(--text-secondary);">
        ${u.role === 'admin' ? 'Akses Penuh (Tanpa Pembelian)' : 'Katalog, Cek Harga/Stok & Pembayaran'}
      </td>
    </tr>
  `).join('');
}
