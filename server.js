const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');

const app = express();
const port = 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use('/pencatatan', express.static(path.join(__dirname, 'public/pencatatan')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'rahasia123',
    resave: false,
    saveUninitialized: true
}));

// Koneksi database
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'punk1966',
    database: 'db_hak_akses',
    timezone: '+07:00'
});

// Tambahkan fungsi ini setelah koneksi database
async function setupLikeFollowTable() {
    try {
        // Cek apakah tabel sudah ada
        const [tables] = await connection.promise().query(
            `SELECT TABLE_NAME 
             FROM information_schema.TABLES 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
            [connection.config.database, 'like_follow']
        );

        // Jika tabel belum ada, buat tabel baru
        if (tables.length === 0) {
            await connection.promise().query(`
                CREATE TABLE like_follow (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    tanggal DATETIME DEFAULT CURRENT_TIMESTAMP,
                    nama_customer VARCHAR(100),
                    akun_ig VARCHAR(100),
                    akun_tt VARCHAR(100),
                    akun_sv VARCHAR(100),
                    like_ig TINYINT(1) DEFAULT 0,
                    like_tt TINYINT(1) DEFAULT 0,
                    like_sv TINYINT(1) DEFAULT 0,
                    follow_ig TINYINT(1) DEFAULT 0,
                    follow_tt TINYINT(1) DEFAULT 0,
                    follow_sv TINYINT(1) DEFAULT 0,
                    created_by INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (created_by) REFERENCES users(id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);
            console.log('Table like_follow created successfully');
        } else {
            console.log('Table like_follow already exists');
        }
    } catch (error) {
        console.error('Error setting up like_follow table:', error);
        process.exit(1);
    }
}

// Update fungsi setupHakAksesTable
async function setupHakAksesTable() {
    try {
        // Cek apakah kolom CRUD sudah ada
        const [columns] = await connection.promise().query(`
            SHOW COLUMNS FROM hak_akses 
            WHERE Field IN (
                'crud_lf', 'crud_lf_edit', 'crud_lf_simpan', 'crud_lf_hapus',
                'crud_penjualan', 'crud_penjualan_edit', 'crud_penjualan_simpan', 'crud_penjualan_hapus'
            )
        `);

        // Hapus kolom lama jika ada
        try {
            await connection.promise().query(`
                ALTER TABLE hak_akses 
                DROP COLUMN IF EXISTS crud_lf_edit,
                DROP COLUMN IF EXISTS crud_lf_simpan,
                DROP COLUMN IF EXISTS crud_lf_hapus,
                DROP COLUMN IF EXISTS crud_penjualan_edit,
                DROP COLUMN IF EXISTS crud_penjualan_simpan,
                DROP COLUMN IF EXISTS crud_penjualan_hapus
            `);
        } catch (error) {
            console.log('Kolom lama tidak ditemukan, lanjut membuat kolom baru');
        }

        // Tambahkan kolom baru
        await connection.promise().query(`
            ALTER TABLE hak_akses 
            ADD COLUMN IF NOT EXISTS crud_lf TINYINT(1) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS crud_lf_edit TINYINT(1) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS crud_lf_simpan TINYINT(1) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS crud_lf_hapus TINYINT(1) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS crud_penjualan TINYINT(1) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS crud_penjualan_edit TINYINT(1) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS crud_penjualan_simpan TINYINT(1) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS crud_penjualan_hapus TINYINT(1) DEFAULT 0
        `);
        console.log('CRUD columns setup completed');

    } catch (error) {
        console.error('Error setting up hak_akses table:', error);
        process.exit(1);
    }
}

// Panggil fungsi setup saat server start
connection.connect(async (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        process.exit(1);
    }
    console.log('Connected to database');
    
    // Jalankan setup untuk semua tabel
    await setupLikeFollowTable();
    await setupHakAksesTable();
});

// Tambahkan handler untuk error koneksi
connection.on('error', function(err) {
    console.error('Database error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('Reconnecting to database...');
        connection.connect();
    } else {
        throw err;
    }
});

// Routes
// Tambahkan route register
app.post('/register', async (req, res) => {
    try {
        const { nama, username, password, email, no_wa } = req.body;
        
        // Debug log
        console.log('Register attempt:', { nama, username, email, no_wa });

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert user baru
        const [result] = await connection.promise().query(
            'INSERT INTO users (nama, username, password, email, no_wa, role) VALUES (?, ?, ?, ?, ?, ?)',
            [nama, username, hashedPassword, email, no_wa, 'User']
        );
        
        // Buat hak akses default (hanya hak_akses = true)
        await connection.promise().query(`
            INSERT INTO hak_akses (
                user_id, 
                tambah, edit, simpan, hapus,
                like_follow, penjualan,
                crud_lf_edit, crud_lf_simpan, crud_lf_hapus,
                crud_penjualan_edit, crud_penjualan_simpan, crud_penjualan_hapus,
                laporan, hak_akses
            ) VALUES (
                ?, 
                0, 0, 0, 0,
                0, 0,
                0, 0, 0,
                0, 0, 0,
                0, 1
            )`,
            [result.insertId]
        );
        
        console.log('User registered successfully:', username);
        res.json({ success: true });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ 
            error: 'Terjadi kesalahan saat mendaftar',
            details: error.message 
        });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Debug log
        console.log('Login attempt for username:', username);
        
        const [users] = await connection.promise().query(`
            SELECT 
                u.id, u.username, u.password, u.role,
                h.tambah, h.edit, h.simpan, h.hapus,
                h.like_follow, h.penjualan, h.laporan, h.hak_akses
            FROM users u
            LEFT JOIN hak_akses h ON u.id = h.user_id
            WHERE u.username = ?
        `, [username]);

        if (users.length === 0) {
            console.log('User not found:', username);
            return res.status(401).json({ error: 'Username tidak ditemukan' });
        }

        const user = users[0];
        const passwordValid = await bcrypt.compare(password, user.password);

        if (!passwordValid) {
            console.log('Invalid password for user:', username);
            return res.status(401).json({ error: 'Password salah' });
        }

        const hakAkses = {
            tambah: user.tambah === 1,
            edit: user.edit === 1,
            simpan: user.simpan === 1,
            hapus: user.hapus === 1,
            like_follow: user.like_follow === 1,
            penjualan: user.penjualan === 1,
            laporan: user.laporan === 1,
            hak_akses: user.hak_akses === 1
        };

        // Cek apakah ada hak akses yang aktif
        const hasAnyAccess = Object.values(hakAkses).some(access => access === true);

        req.session.user = {
            id: user.id,
            username: user.username,
            role: user.role,
            hakAkses: hakAkses
        };

        console.log('Login successful for user:', username);
        res.json({ 
            success: true, 
            user: req.session.user,
            redirect: hasAnyAccess ? '/dashboard.html' : '/beranda.html'
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat login' });
    }
});

// Route untuk cek session
app.get('/check-session', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.json({ logged_in: false });
        }

        // Ambil data hak akses user
        const [rows] = await connection.promise().query(`
            SELECT * FROM hak_akses WHERE user_id = ?
        `, [req.session.user.id]);

        const hakAkses = rows[0] || {};

        res.json({
            logged_in: true,
            user: {
                id: req.session.user.id,
                username: req.session.user.username,
                role: req.session.user.role,
                hakAkses: {
                    // Beranda - Foto
                    tambah: hakAkses.tambah === 1,
                    edit: hakAkses.edit === 1,
                    simpan: hakAkses.simpan === 1,
                    hapus: hakAkses.hapus === 1,
                    
                    // Pencatatan
                    like_follow: hakAkses.like_follow === 1,
                    penjualan: hakAkses.penjualan === 1,
                    
                    // CRUD Like & Follower
                    crud_lf: hakAkses.crud_lf === 1,
                    crud_lf_edit: hakAkses.crud_lf_edit === 1,
                    crud_lf_simpan: hakAkses.crud_lf_simpan === 1,
                    crud_lf_hapus: hakAkses.crud_lf_hapus === 1,
                    
                    // CRUD Penjualan
                    crud_penjualan: hakAkses.crud_penjualan === 1,
                    crud_penjualan_edit: hakAkses.crud_penjualan_edit === 1,
                    crud_penjualan_simpan: hakAkses.crud_penjualan_simpan === 1,
                    crud_penjualan_hapus: hakAkses.crud_penjualan_hapus === 1,
                    
                    // Pengaturan
                    hak_akses: hakAkses.hak_akses === 1,
                    laporan: hakAkses.laporan === 1
                }
            }
        });
    } catch (error) {
        console.error('Session check error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route untuk logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Route untuk mendapatkan daftar users
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await connection.promise().query(`
            SELECT u.id, u.username, u.nama, u.role, h.*
            FROM users u
            LEFT JOIN hak_akses h ON u.id = h.user_id
        `);

        const users = rows.map(row => ({
            id: row.id,
            username: row.username,
            nama: row.nama,
            role: row.role,
            hakAkses: {
                // Beranda - Foto
                tambah: row.tambah === 1,
                edit: row.edit === 1,
                simpan: row.simpan === 1,
                hapus: row.hapus === 1,
                
                // Pencatatan
                like_follow: row.like_follow === 1,
                penjualan: row.penjualan === 1,
                
                // CRUD Like & Follower
                crud_lf: row.crud_lf === 1,
                crud_lf_edit: row.crud_lf_edit === 1,
                crud_lf_simpan: row.crud_lf_simpan === 1,
                crud_lf_hapus: row.crud_lf_hapus === 1,
                
                // CRUD Penjualan
                crud_penjualan: row.crud_penjualan === 1,
                crud_penjualan_edit: row.crud_penjualan_edit === 1,
                crud_penjualan_simpan: row.crud_penjualan_simpan === 1,
                crud_penjualan_hapus: row.crud_penjualan_hapus === 1,
                
                // Pengaturan
                hak_akses: row.hak_akses === 1,
                laporan: row.laporan === 1
            }
        }));

        res.json(users);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update route untuk update hak akses
app.post('/api/hak-akses/update', async (req, res) => {
    try {
        const { userId, field, value } = req.body;

        // Validasi field yang diperbolehkan
        const allowedFields = [
            'tambah', 'edit', 'simpan', 'hapus',
            'like_follow', 'penjualan',
            // Tambahkan field baru
            'crud_lf', 'crud_lf_edit', 'crud_lf_simpan', 'crud_lf_hapus',
            'crud_penjualan', 'crud_penjualan_edit', 'crud_penjualan_simpan', 'crud_penjualan_hapus',
            'hak_akses', 'laporan'
        ];

        if (!allowedFields.includes(field)) {
            return res.status(400).json({ error: 'Invalid field' });
        }

        await connection.promise().query(
            'UPDATE hak_akses SET ?? = ? WHERE user_id = ?',
            [field, value ? 1 : 0, userId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating hak akses:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Route untuk cek duplikasi akun
app.post('/api/like-follow/check-duplicate', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { akun_ig, akun_tt, akun_sv } = req.body;
        let duplicates = [];

        // Cek Instagram
        if (akun_ig) {
            const [igRows] = await connection.promise().query(
                'SELECT akun_ig FROM like_follow WHERE akun_ig = ?',
                [akun_ig]
            );
            if (igRows.length > 0) duplicates.push('Instagram');
        }

        // Cek TikTok
        if (akun_tt) {
            const [ttRows] = await connection.promise().query(
                'SELECT akun_tt FROM like_follow WHERE akun_tt = ?',
                [akun_tt]
            );
            if (ttRows.length > 0) duplicates.push('TikTok');
        }

        // Cek SnackVideo
        if (akun_sv) {
            const [svRows] = await connection.promise().query(
                'SELECT akun_sv FROM like_follow WHERE akun_sv = ?',
                [akun_sv]
            );
            if (svRows.length > 0) duplicates.push('SnackVideo');
        }

        res.json({ 
            hasDuplicates: duplicates.length > 0,
            duplicates: duplicates
        });
    } catch (error) {
        console.error('Error checking duplicates:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat memeriksa data' });
    }
});

// Update route save untuk menambahkan validasi
app.post('/api/like-follow/save', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const {
            nama_customer, akun_ig, akun_tt, akun_sv,
            like_ig, like_tt, like_sv, follow_ig, follow_tt, follow_sv
        } = req.body;

        // Cek duplikasi sebelum menyimpan
        let duplicates = [];

        if (akun_ig) {
            const [igRows] = await connection.promise().query(
                'SELECT akun_ig FROM like_follow WHERE akun_ig = ?',
                [akun_ig]
            );
            if (igRows.length > 0) duplicates.push('Instagram');
        }

        if (akun_tt) {
            const [ttRows] = await connection.promise().query(
                'SELECT akun_tt FROM like_follow WHERE akun_tt = ?',
                [akun_tt]
            );
            if (ttRows.length > 0) duplicates.push('TikTok');
        }

        if (akun_sv) {
            const [svRows] = await connection.promise().query(
                'SELECT akun_sv FROM like_follow WHERE akun_sv = ?',
                [akun_sv]
            );
            if (svRows.length > 0) duplicates.push('SnackVideo');
        }

        if (duplicates.length > 0) {
            return res.status(400).json({
                error: 'Akun sudah pernah disimpan',
                duplicates: duplicates
            });
        }

        // Jika tidak ada duplikasi, lanjut simpan data
        const [result] = await connection.promise().query(
            `INSERT INTO like_follow SET ?`,
            {
                nama_customer: nama_customer || null,
                akun_ig: akun_ig || null,
                akun_tt: akun_tt || null,
                akun_sv: akun_sv || null,
                like_ig: like_ig ? 1 : 0,
                like_tt: like_tt ? 1 : 0,
                like_sv: like_sv ? 1 : 0,
                follow_ig: follow_ig ? 1 : 0,
                follow_tt: follow_tt ? 1 : 0,
                follow_sv: follow_sv ? 1 : 0,
                created_by: req.session.user.id
            }
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ 
            error: 'Terjadi kesalahan saat menyimpan data',
            details: error.message
        });
    }
});

// Route untuk laporan like & follow
app.post('/api/laporan/like-follow', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { medsos, likeFollow, startDate, endDate } = req.body;

        // Log parameter yang diterima
        console.log('Laporan parameters:', { medsos, likeFollow, startDate, endDate });

        // Buat query sesuai filter
        let query = `
            SELECT 
                DATE_FORMAT(tanggal, '%Y-%m-%d %H:%i:%s') as tanggal,
                nama_customer,
                akun_ig, akun_tt, akun_sv,
                like_ig, like_tt, like_sv,
                follow_ig, follow_tt, follow_sv
            FROM like_follow 
            WHERE DATE(tanggal) BETWEEN DATE(?) AND DATE(?)
        `;

        const values = [startDate, endDate];

        // Filter berdasarkan media sosial
        if (medsos !== 'all') {
            if (medsos === 'ig') {
                query += ` AND (akun_ig IS NOT NULL AND akun_ig != '')`;
            } else if (medsos === 'tt') {
                query += ` AND (akun_tt IS NOT NULL AND akun_tt != '')`;
            } else if (medsos === 'sv') {
                query += ` AND (akun_sv IS NOT NULL AND akun_sv != '')`;
            }
        }

        // Filter berdasarkan like/follow
        if (likeFollow === 'like') {
            query += ` AND (like_ig = 1 OR like_tt = 1 OR like_sv = 1)`;
        } else if (likeFollow === 'follow') {
            query += ` AND (follow_ig = 1 OR follow_tt = 1 OR follow_sv = 1)`;
        }

        // Tambahkan ordering
        query += ` ORDER BY tanggal DESC`;

        // Log query final
        console.log('Final query:', query);
        console.log('Query values:', values);

        const [rows] = await connection.promise().query(query, values);
        
        // Log hasil query
        console.log('Found', rows.length, 'records');
        console.log('Sample data:', rows[0]);

        res.json(rows);
    } catch (error) {
        console.error('Error fetching report data:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat memuat data' });
    }
});

// Route untuk mendapatkan daftar like & follow
app.get('/api/like-follow/list', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Tambahkan console.log untuk debugging
        console.log('Fetching like & follow data...');

        const [rows] = await connection.promise().query(`
            SELECT 
                id,
                DATE_FORMAT(tanggal, '%Y-%m-%d %H:%i:%s') as tanggal,
                nama_customer,
                akun_ig, akun_tt, akun_sv,
                like_ig, like_tt, like_sv,
                follow_ig, follow_tt, follow_sv
            FROM like_follow 
            ORDER BY tanggal DESC
        `);

        // Log jumlah data yang ditemukan
        console.log('Found', rows.length, 'records');
        console.log('Sample data:', rows[0]);

        res.json(rows);
    } catch (error) {
        console.error('Error fetching like & follow data:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat memuat data' });
    }
});

// Route untuk update data
app.post('/api/like-follow/update', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const updatedData = req.body;
        
        for (const data of updatedData) {
            const medsosArray = data.medsos.split('<br>');
            const usernameArray = data.username.split('<br>');
            const likeArray = data.like;  // Sudah dalam bentuk array
            const followArray = data.follow;  // Sudah dalam bentuk array

            await connection.promise().query(`
                UPDATE like_follow 
                SET 
                    nama_customer = ?,
                    akun_ig = ?,
                    akun_tt = ?,
                    akun_sv = ?,
                    like_ig = ?,
                    like_tt = ?,
                    like_sv = ?,
                    follow_ig = ?,
                    follow_tt = ?,
                    follow_sv = ?
                WHERE id = ?
            `, [
                data.nama_customer,
                medsosArray.includes('Instagram') ? usernameArray[medsosArray.indexOf('Instagram')] : null,
                medsosArray.includes('TikTok') ? usernameArray[medsosArray.indexOf('TikTok')] : null,
                medsosArray.includes('SnackVideo') ? usernameArray[medsosArray.indexOf('SnackVideo')] : null,
                medsosArray.includes('Instagram') ? likeArray[medsosArray.indexOf('Instagram')] === '✓' : 0,
                medsosArray.includes('TikTok') ? likeArray[medsosArray.indexOf('TikTok')] === '✓' : 0,
                medsosArray.includes('SnackVideo') ? likeArray[medsosArray.indexOf('SnackVideo')] === '✓' : 0,
                medsosArray.includes('Instagram') ? followArray[medsosArray.indexOf('Instagram')] === '✓' : 0,
                medsosArray.includes('TikTok') ? followArray[medsosArray.indexOf('TikTok')] === '✓' : 0,
                medsosArray.includes('SnackVideo') ? followArray[medsosArray.indexOf('SnackVideo')] === '✓' : 0,
                data.id
            ]);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat update data' });
    }
});

// Route untuk hapus data
app.delete('/api/like-follow/delete/:id', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        await connection.promise().query(
            'DELETE FROM like_follow WHERE id = ?',
            [req.params.id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat hapus data' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
}); 