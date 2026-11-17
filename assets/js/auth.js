// ============================================================================
// FM (FAJRI MUHAMMAD) — SISTEM AUTENTIKASI MULTI-ROLE & PROFIL PENGGUNA
// Mendukung: Login (Email / Username + Password), Show/Hide Password,
// Daftar Akun Baru (Pembeli), Lupa Password via Kode OTP Email, & Update Profil
// ============================================================================

window.FMAuth = {
  // Resolve email dari input (bisa berupa email langsung atau username)
  async resolveEmailFromIdentifier(identifier) {
    const clean = identifier.trim().toLowerCase();
    if (!clean) throw new Error('Masukkan email atau username Anda.');

    if (clean.includes('@')) {
      return clean;
    }

    // Shortcut khusus username admin utama
    if (clean === 'admintoko') {
      return 'admintoko@gmail.com';
    }

    // Cari email berdasarkan username di tabel profiles Supabase
    const { data, error } = await window.sb
      .from('profiles')
      .select('email')
      .eq('username', clean)
      .maybeSingle();

    if (error) {
      console.warn('Lookup username warning:', error.message);
      throw new Error('Gagal mencari username. Pastikan tabel profiles sudah dijalankan di SQL Editor atau gunakan alamat Email.');
    }

    if (!data || !data.email) {
      throw new Error(`Username "${identifier}" tidak ditemukan. Silakan periksa kembali atau daftar akun baru.`);
    }

    return data.email;
  },

  // Login Utama (Email / Username + Password)
  async login(identifier, password) {
    if (!identifier || !password) {
      throw new Error('Email/Username dan Password wajib diisi.');
    }

    const email = await this.resolveEmailFromIdentifier(identifier);

    let { data, error } = await window.sb.auth.signInWithPassword({
      email,
      password
    });

    // Auto-bootstrap akun admintoko@gmail.com jika belum terdaftar di Supabase Auth
    if (error && email === 'admintoko@gmail.com' && password === 'admintoko123') {
      const signUpRes = await window.sb.auth.signUp({
        email: 'admintoko@gmail.com',
        password: 'admintoko123',
        options: {
          data: {
            username: 'admintoko',
            full_name: 'Admin Toko FM',
            role: 'admin'
          }
        }
      });

      if (!signUpRes.error && signUpRes.data?.user) {
        data = signUpRes.data;
        error = null;
      }
    }

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Email/Username atau Password salah. Silakan coba lagi.');
      }
      if (error.message.includes('Email not confirmed')) {
        throw new Error('Email belum dikonfirmasi. Silakan cek kotak masuk email Anda atau matikan "Confirm email" di Supabase Auth Settings.');
      }
      throw new Error(error.message);
    }

    // Pastikan profil tersedia & role sinkron
    const profile = await this.ensureUserProfile(data.user);
    return { user: data.user, profile };
  },

  // Daftar Akun Baru (Otomatis ditetapkan sebagai role 'pembeli')
  async register({ fullName, username, email, password }) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const cleanFullName = fullName.trim();

    if (!cleanFullName || !cleanUsername || !cleanEmail || !password) {
      throw new Error('Semua kolom pendaftaran wajib diisi.');
    }
    if (cleanUsername.length < 3) {
      throw new Error('Username minimal 3 karakter (huruf, angka, atau garis bawah).');
    }
    if (password.length < 6) {
      throw new Error('Password minimal 6 karakter.');
    }
    if (cleanEmail === 'admintoko@gmail.com' || cleanUsername === 'admintoko') {
      throw new Error('Akun tersebut dicadangkan khusus untuk Administrator Toko.');
    }

    // Cek apakah username sudah dipakai
    const { data: existingUser } = await window.sb
      .from('profiles')
      .select('id')
      .eq('username', cleanUsername)
      .maybeSingle();

    if (existingUser) {
      throw new Error(`Username "@${cleanUsername}" sudah digunakan. Pilih username lain.`);
    }

    const { data, error } = await window.sb.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanFullName,
          username: cleanUsername,
          role: 'pembeli',
          avatar_url: 'assets/images/avatar-default.jpg'
        }
      }
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.session && data.user) {
      await this.ensureUserProfile(data.user, {
        full_name: cleanFullName,
        username: cleanUsername,
        role: 'pembeli'
      });
    }

    return data;
  },

  // Kirim Kode OTP ke Email untuk Lupa Password
  async sendPasswordResetOtp(email) {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Masukkan alamat email terdaftar yang valid.');
    }

    const { error } = await window.sb.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        shouldCreateUser: false
      }
    });

    if (error) {
      throw new Error('Gagal mengirim OTP: ' + error.message);
    }

    return true;
  },

  // Verifikasi 6-Digit Kode OTP & Simpan Password Baru
  async verifyOtpAndResetPassword(email, otpCode, newPassword) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = otpCode.trim();

    if (cleanToken.length !== 6) {
      throw new Error('Masukkan 6 digit kode OTP yang dikirim ke email Anda.');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password baru minimal 6 karakter.');
    }

    // Verifikasi OTP (type: 'email' dari signInWithOtp, dengan fallback 'recovery')
    let verifyRes = await window.sb.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: 'email'
    });

    if (verifyRes.error) {
      verifyRes = await window.sb.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'recovery'
      });
    }

    if (verifyRes.error) {
      throw new Error('Kode OTP tidak valid atau sudah kedaluwarsa. Silakan kirim ulang kode OTP.');
    }

    // Perbarui password setelah OTP terverifikasi
    const { error: updateErr } = await window.sb.auth.updateUser({
      password: newPassword
    });

    if (updateErr) {
      throw new Error('OTP terverifikasi, namun gagal mengubah password: ' + updateErr.message);
    }

    return true;
  },

  // Pastikan record di tabel profiles selalu ada dan akurat
  async ensureUserProfile(user, fallbackMeta = {}) {
    if (!user) return null;

    const isAdminEmail = (user.email || '').toLowerCase() === 'admintoko@gmail.com';
    const expectedRole = isAdminEmail ? 'admin' : 'pembeli';

    const { data: existing, error } = await window.sb
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!error && existing) {
      // Pastikan role admintoko@gmail.com selalu 'admin'
      if (isAdminEmail && existing.role !== 'admin') {
        await window.sb.from('profiles').update({ role: 'admin' }).eq('id', user.id);
        existing.role = 'admin';
      }
      return existing;
    }

    // Jika trigger SQL belum dijalankan, kembalikan objek profil dari metadata auth
    const meta = user.user_metadata || {};
    const constructed = {
      id: user.id,
      email: (user.email || '').toLowerCase(),
      username: (fallbackMeta.username || meta.username || (user.email || 'user').split('@')[0]).toLowerCase(),
      full_name: fallbackMeta.full_name || meta.full_name || (isAdminEmail ? 'Admin Toko FM' : 'Pelanggan FM Audio'),
      role: expectedRole,
      avatar_url: meta.avatar_url || 'assets/images/avatar-default.jpg'
    };

    // Coba sisipkan ke tabel profiles jika tabel sudah ada
    await window.sb.from('profiles').upsert(constructed, { onConflict: 'id' });
    return constructed;
  },

  // Cek sesi aktif saat membuka dashboard.html
  async requireAuth() {
    const { data: { session } } = await window.sb.auth.getSession();
    if (!session || !session.user) {
      window.location.href = 'index.html';
      return null;
    }
    const profile = await this.ensureUserProfile(session.user);
    return { session, user: session.user, profile };
  },

  // Update Data Profil & Foto Avatar (Semua Role)
  async updateProfile(userId, { fullName, username, avatarDataUrl }) {
    const cleanFullName = fullName.trim();
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

    if (!cleanFullName || cleanUsername.length < 3) {
      throw new Error('Nama lengkap dan username (minimal 3 karakter) wajib diisi.');
    }

    const updates = {
      full_name: cleanFullName,
      username: cleanUsername,
      updated_at: new Date().toISOString()
    };

    if (avatarDataUrl) {
      updates.avatar_url = avatarDataUrl;
    }

    const { data, error } = await window.sb
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      if (error.message.includes('duplicate key')) {
        throw new Error(`Username "@${cleanUsername}" sudah digunakan pengguna lain.`);
      }
      throw new Error(error.message);
    }

    // Sinkronkan juga ke metadata Supabase Auth
    await window.sb.auth.updateUser({
      data: {
        full_name: cleanFullName,
        username: cleanUsername,
        ...(avatarDataUrl ? { avatar_url: avatarDataUrl } : {})
      }
    });

    return data;
  },

  // Update Password Akun (Semua Role)
  async updatePassword(newPassword) {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password baru minimal 6 karakter.');
    }
    const { error } = await window.sb.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
    return true;
  },

  // Logout
  async logout() {
    await window.sb.auth.signOut();
    window.location.href = 'index.html';
  }
};
