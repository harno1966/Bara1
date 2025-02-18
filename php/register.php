<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $nama = $_POST['nama'];
    $username = $_POST['username'];
    $password = password_hash($_POST['password'], PASSWORD_DEFAULT);
    $email = $_POST['email'];
    $no_wa = $_POST['no_wa'];
    $role = 'User';
    
    try {
        $stmt = $pdo->prepare("INSERT INTO users (nama, username, password, email, no_wa, role) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$nama, $username, $password, $email, $no_wa, $role]);
        
        $user_id = $pdo->lastInsertId();
        
        // Buat default hak akses untuk user baru
        $stmt = $pdo->prepare("INSERT INTO hak_akses (user_id) VALUES (?)");
        $stmt->execute([$user_id]);
        
        header("Location: ../login.html?registered=1");
        exit();
    } catch (PDOException $e) {
        header("Location: ../register.html?error=1");
        exit();
    }
}
?> 