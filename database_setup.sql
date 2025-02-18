CREATE DATABASE IF NOT EXISTS db_hak_akses;
USE db_hak_akses;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    no_wa VARCHAR(20),
    role VARCHAR(20) DEFAULT 'User',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
);

CREATE TABLE like_follow (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tanggal DATETIME NOT NULL,
    nama_customer VARCHAR(100),
    akun_ig VARCHAR(100),
    akun_tt VARCHAR(100),
    akun_sv VARCHAR(100),
    like_ig BOOLEAN DEFAULT FALSE,
    like_tt BOOLEAN DEFAULT FALSE,
    like_sv BOOLEAN DEFAULT FALSE,
    follow_ig BOOLEAN DEFAULT FALSE,
    follow_tt BOOLEAN DEFAULT FALSE,
    follow_sv BOOLEAN DEFAULT FALSE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Hapus INSERT manual untuk users dan hak_akses
-- Biarkan createAdminUser() di server.js yang menangani pembuatan user admin 