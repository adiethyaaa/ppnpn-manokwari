presensi-app/
├── index.html            (Halaman Login Utama)
├── dashboard.html        (Halaman Utama Aplikasi Presensi)
├── admin.html            (Halaman Khusus Administrator / Manajemen User)
├── css/
│   └── style.css
└── js/
    ├── firebase-config.js
    ├── auth.js           (Proses Login, Session Check, Logout)
    ├── admin.js          (Fungsi CRUD User & Toggle Akses ON/OFF)
    ├── app.js            (Aplikasi Utama Presensi + Filter Fitur Berdasarkan Hak Akses)
    ├── manual.js
    └── history.js