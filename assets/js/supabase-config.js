// ============================================================================
// FM (FAJRI MUHAMMAD) — KONFIGURASI SUPABASE & KATALOG AUDIO REFERENSI
// ============================================================================

const SUPABASE_URL = 'https://twwzzqkaychniqbzwxvi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Aw7tHZquWOOQcBEs84U4nA_tQ1dsl0w';

// Inisialisasi Supabase Client
window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Daftar file .jpg resmi yang tersedia di assets/images/ (Tanpa .svg)
window.AVAILABLE_PRODUCT_IMAGES = [
  { label: 'Fender Brownface Twin Combo (fender-brown-combo.jpg)', path: 'assets/images/fender-brown-combo.jpg' },
  { label: 'Fender Deluxe Reverb Blackface (fender-deluxe-reverb.jpg)', path: 'assets/images/fender-deluxe-reverb.jpg' },
  { label: 'Fender PX-2216D Mixing Console (fender-px2216d-mixer.jpg)', path: 'assets/images/fender-px2216d-mixer.jpg' },
  { label: 'Behringer Europower PMH2000 (behringer-pmh2000-mixer.jpg)', path: 'assets/images/behringer-pmh2000-mixer.jpg' },
  { label: 'Marshall JCM800 Lead Head (marshall-jcm800-head.jpg)', path: 'assets/images/marshall-jcm800-head.jpg' },
  { label: 'Marshall DSL40C Tube Combo (marshall-dsl40c-combo.jpg)', path: 'assets/images/marshall-dsl40c-combo.jpg' },
  { label: 'Marshall Class5 Vintage Combo (marshall-vintage-combo.jpg)', path: 'assets/images/marshall-vintage-combo.jpg' },
  { label: 'Marshall 8-Channel Mixer (marshall-8ch-mixer.jpg)', path: 'assets/images/marshall-8ch-mixer.jpg' },
  { label: 'Marshall Portable PA Console (marshall-pa-console.jpg)', path: 'assets/images/marshall-pa-console.jpg' }
];

// 9 Unit Sound System Awal (Digunakan otomatis jika tabel products belum di-seed)
window.INITIAL_PRODUCTS = [
  {
    sku: 'FM-FND-001',
    name: 'Fender 65 Twin Custom Brownface 85W Combo',
    brand: 'Fender',
    category: 'Amplifier',
    price: 24500000,
    stock: 6,
    status: 'Tersedia',
    image_url: 'assets/images/fender-brown-combo.jpg',
    specs: '85W All-Tube • 2x12" Jensen Speakers • Dual Channel Normal & Vibrato • Brown Tolex Grille'
  },
  {
    sku: 'FM-FND-002',
    name: 'Fender 65 Deluxe Reverb Blackface 22W',
    brand: 'Fender',
    category: 'Amplifier',
    price: 19800000,
    stock: 5,
    status: 'Tersedia',
    image_url: 'assets/images/fender-deluxe-reverb.jpg',
    specs: '22W Tube Combo • 1x12" Jensen C-12K • Spring Reverb & Tube Vibrato • Classic Silver Grille'
  },
  {
    sku: 'FM-FND-003',
    name: 'Fender PX-2216D 16-Channel Powered Mixer',
    brand: 'Fender',
    category: 'Mixing Console',
    price: 16250000,
    stock: 3,
    status: 'Stok Terbatas',
    image_url: 'assets/images/fender-px2216d-mixer.jpg',
    specs: '16-Channel XLR/Line • Dual Graphic EQ • Built-in Digital Delay & Reverb • Rack-Mountable'
  },
  {
    sku: 'FM-BHR-004',
    name: 'Behringer Europower PMH2000 10-Ch Powered Mixer',
    brand: 'Behringer',
    category: 'Mixing Console',
    price: 8900000,
    stock: 8,
    status: 'Tersedia',
    image_url: 'assets/images/behringer-pmh2000-mixer.jpg',
    specs: '2x250W Stereo • 10 Channels (6 Mono + 3 Stereo) • 24-Bit Multi-FX Processor • 9-Band EQ'
  },
  {
    sku: 'FM-MSH-005',
    name: 'Marshall JCM800 2203 Vintage Series 100W Head',
    brand: 'Marshall',
    category: 'Amplifier',
    price: 31500000,
    stock: 4,
    status: 'Tersedia',
    image_url: 'assets/images/marshall-jcm800-head.jpg',
    specs: '100W All-Valve Head • EL34 Power Tubes • High/Low Sensitivity Inputs • Brushed Gold Panel'
  },
  {
    sku: 'FM-MSH-006',
    name: 'Marshall DSL40C 40W Dual Super Lead Combo',
    brand: 'Marshall',
    category: 'Amplifier',
    price: 13750000,
    stock: 7,
    status: 'Tersedia',
    image_url: 'assets/images/marshall-dsl40c-combo.jpg',
    specs: '40W / 20W Triode Mode • 1x12" Celestion Seventy 80 • Classic & Ultra Gain Channels'
  },
  {
    sku: 'FM-MSH-007',
    name: 'Marshall Class5 Heritage Gold-Panel Boutique Combo',
    brand: 'Marshall',
    category: 'Amplifier',
    price: 11400000,
    stock: 2,
    status: 'Stok Terbatas',
    image_url: 'assets/images/marshall-vintage-combo.jpg',
    specs: 'Pure Class-A All-Tube • Gold Brass Control Plate • Basketweave Fret Cloth • Collector Edition'
  },
  {
    sku: 'FM-MSH-008',
    name: 'Marshall 5004 Eight-Channel Vintage Studio Console',
    brand: 'Marshall',
    category: 'Mixing Console',
    price: 21900000,
    stock: 2,
    status: 'Stok Terbatas',
    image_url: 'assets/images/marshall-8ch-mixer.jpg',
    specs: '8-Channel Discrete Analog Console • Mahogany Side Cheeks • Rotary Gain & EQ Matrix'
  },
  {
    sku: 'FM-MSH-009',
    name: 'Marshall Portable PA Touring Console + Gooseneck Mic',
    brand: 'Marshall',
    category: 'PA System',
    price: 27400000,
    stock: 3,
    status: 'Stok Terbatas',
    image_url: 'assets/images/marshall-pa-console.jpg',
    specs: '10-Channel Flight-Case PA Mixer • Integrated VU Meter & Gooseneck Talkback Mic • Master Reverb'
  }
];

// Format Rupiah Presisi
window.formatRupiah = function(num) {
  const n = Number(num) || 0;
  return 'Rp ' + n.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

// Notifikasi Toast Elegan
window.showToast = function(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const iconMap = {
    success: 'ri-checkbox-circle-fill',
    error: 'ri-error-warning-fill',
    info: 'ri-information-fill'
  };
  const colorMap = {
    success: '#10b981',
    error: '#ef4444',
    info: '#d4af37'
  };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="${iconMap[type] || iconMap.info}" style="font-size:1.25rem; color:${colorMap[type] || colorMap.info}; flex-shrink:0;"></i>
    <div style="flex:1; line-height:1.4;">${message}</div>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 260);
  }, 4200);
};

// Toggle Show / Hide Password Universal
window.togglePasswordVisibility = function(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const icon = btnEl.querySelector('i');
  if (input.type === 'password') {
    input.type = 'text';
    if (icon) icon.className = 'ri-eye-off-line';
  } else {
    input.type = 'password';
    if (icon) icon.className = 'ri-eye-line';
  }
};
