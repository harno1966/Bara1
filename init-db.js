const mysql = require('mysql2');
const bcrypt = require('bcrypt');

async function initDatabase() {
    try {
        // Buat koneksi tanpa database
        const connection = mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'punk1966'
        });

        // Hapus database jika ada
        await connection.promise().query('DROP DATABASE IF EXISTS db_hak_akses');
        console.log('Database lama dihapus');

        // Buat database baru
        await connection.promise().query('CREATE DATABASE db_hak_akses');
        await connection.promise().query('USE db_hak_akses');
        console.log('Database baru dibuat');

        // Buat tabel users
        await connection.promise().query(`
            CREATE TABLE users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nama VARCHAR(100) NOT NULL,
                username VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                no_wa VARCHAR(20),
                role VARCHAR(20) DEFAULT 'User',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Tabel users dibuat');

        // Buat tabel hak_akses
        await connection.promise().query(`
            CREATE TABLE hak_akses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                tambah BOOLEAN DEFAULT FALSE,
                edit BOOLEAN DEFAULT FALSE,
                simpan BOOLEAN DEFAULT FALSE,
                hapus BOOLEAN DEFAULT FALSE,
                like_follow BOOLEAN DEFAULT FALSE,
                penjualan BOOLEAN DEFAULT FALSE,
                laporan BOOLEAN DEFAULT FALSE,
                hak_akses BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);
        console.log('Tabel hak_akses dibuat');

        // Buat user admin
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const [result] = await connection.promise().query(
            'INSERT INTO users (nama, username, password, email, no_wa, role) VALUES (?, ?, ?, ?, ?, ?)',
            ['Administrator', 'admin', hashedPassword, 'admin@example.com', '08123456789', 'Admin']
        );

        // Berikan semua hak akses ke admin
        await connection.promise().query(`
            INSERT INTO hak_akses (
                user_id, tambah, edit, simpan, hapus,
                like_follow, penjualan, laporan, hak_akses
            ) VALUES (?, 1, 1, 1, 1, 1, 1, 1, 1)
        `, [result.insertId]);
        console.log('User admin dibuat dengan semua hak akses');

        // Tutup koneksi
        await connection.end();
        console.log('Setup database selesai');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

initDatabase(); 