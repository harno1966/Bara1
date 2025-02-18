class HakAksesApp {
    constructor() {
        this.users = [
            { username: 'user1', nama: 'User Satu', email: 'user1@example.com', role: 'Admin' },
            { username: 'user2', nama: 'User Dua', email: 'user2@example.com', role: 'User' }
        ];
        
        this.permissions = new Map();
        this.initializeApp();
    }

    initializeApp() {
        this.loadUsers();
        this.setupEventListeners();
    }

    loadUsers() {
        const tableBody = document.getElementById('userTableBody');
        tableBody.innerHTML = '';
        
        this.users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.username}</td>
                <td>${user.nama}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td><button onclick="app.editPermissions('${user.username}')">Edit</button></td>
            `;
            tableBody.appendChild(row);
        });
    }

    setupEventListeners() {
        document.getElementById('btnTutup').addEventListener('click', () => window.close());
        document.getElementById('btnBatal').addEventListener('click', () => this.closeModal());
        document.getElementById('btnSimpan').addEventListener('click', () => this.savePermissions());
    }

    editPermissions(username) {
        this.currentUsername = username;
        const modal = document.getElementById('editModal');
        modal.style.display = 'block';

        // Reset checkboxes
        const checkboxes = document.querySelectorAll('.permission-item input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = this.permissions.get(username)?.[checkbox.id] || false;
        });
    }

    closeModal() {
        const modal = document.getElementById('editModal');
        modal.style.display = 'none';
    }

    savePermissions() {
        const permissions = {
            beranda: document.getElementById('beranda').checked,
            fotoVideo: document.getElementById('fotoVideo').checked,
            layanan: document.getElementById('layanan').checked,
            artikel: document.getElementById('artikel').checked,
            hakAkses: document.getElementById('hakAkses').checked,
            warnaGambar: document.getElementById('warnaGambar').checked
        };

        this.permissions.set(this.currentUsername, permissions);
        alert('Hak akses berhasil disimpan!');
        this.closeModal();
    }
}

// Inisialisasi aplikasi
const app = new HakAksesApp(); 