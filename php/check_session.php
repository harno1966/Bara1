<?php
session_start();
header('Content-Type: application/json');

$response = [
    'logged_in' => isset($_SESSION['user_id']),
    'username' => $_SESSION['username'] ?? null,
    'role' => $_SESSION['role'] ?? null
];

echo json_encode($response); 