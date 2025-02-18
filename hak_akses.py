import tkinter as tk
from tkinter import ttk
import sqlite3
from tkinter import messagebox

class HakAksesApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Hak Akses User")
        self.root.geometry("600x400")
        
        # Koneksi ke database
        self.conn = sqlite3.connect('users.db')
        self.cursor = self.conn.cursor()
        
        self.create_main_window()

    def create_main_window(self):
        self.main_frame = ttk.Frame(self.root, padding=10)
        self.main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))

        # Tabel users
        columns = ("Username", "Nama", "Email", "Role")
        self.user_table = ttk.Treeview(self.main_frame, columns=columns, show='headings', height=10)
        
        # Set lebar kolom
        self.user_table.column("Username", width=100)
        self.user_table.column("Nama", width=150)
        self.user_table.column("Email", width=200)
        self.user_table.column("Role", width=100)
        
        # Set heading
        self.user_table.heading("Username", text="Username")
        self.user_table.heading("Nama", text="Nama")
        self.user_table.heading("Email", text="Email")
        self.user_table.heading("Role", text="Role")
        
        self.user_table.grid(row=0, column=0, columnspan=4, pady=5)
        
        # Scrollbar untuk tabel
        scrollbar = ttk.Scrollbar(self.main_frame, orient=tk.VERTICAL, command=self.user_table.yview)
        scrollbar.grid(row=0, column=4, sticky='ns')
        self.user_table.configure(yscrollcommand=scrollbar.set)
        
        # Tombol
        self.btn_edit = ttk.Button(self.main_frame, text="Edit", command=self.open_edit_permissions)
        self.btn_edit.grid(row=1, column=0, padx=5, pady=5)
        
        self.btn_tutup = ttk.Button(self.main_frame, text="Tutup", command=self.root.quit)
        self.btn_tutup.grid(row=1, column=1, padx=5, pady=5)
        
        # Load data users
        self.load_users()
    
    def load_users(self):
        # Hapus data lama
        for item in self.user_table.get_children():
            self.user_table.delete(item)
        
        # Ambil data dari database
        self.cursor.execute("SELECT username, nama, email, role FROM users")
        users = self.cursor.fetchall()
        
        # Tampilkan di tabel
        for user in users:
            self.user_table.insert("", "end", values=user)
    
    def open_edit_permissions(self):
        selected_items = self.user_table.selection()
        if not selected_items:
            messagebox.showwarning("Peringatan", "Pilih user terlebih dahulu!")
            return
        
        selected_item = selected_items[0]
        username = self.user_table.item(selected_item)['values'][0]
        
        # Buat window baru
        self.edit_window = tk.Toplevel(self.root)
        self.edit_window.title(f"Edit Hak Akses - {username}")
        self.edit_window.geometry("400x300")
        
        # Frame untuk checkbox
        frame = ttk.LabelFrame(self.edit_window, text="Hak Akses:", padding=10)
        frame.pack(fill="x", padx=10, pady=5)
        
        # Dictionary untuk menyimpan variable checkbox
        self.check_vars = {}
        
        # Daftar hak akses
        permissions_list = [
            "Beranda",
            "Foto & Video",
            "Layanan",
            "Artikel",
            "Hak Akses",
            "Warna, Gambar & Foto"
        ]
        
        # Buat checkbox untuk setiap hak akses (default unchecked)
        for i, perm_name in enumerate(permissions_list):
            var = tk.BooleanVar(value=False)
            self.check_vars[perm_name] = var
            chk = ttk.Checkbutton(frame, text=perm_name, variable=var)
            chk.grid(row=i // 2, column=i % 2, sticky=tk.W, padx=5, pady=2)
        
        # Ambil data hak akses dari database
        self.cursor.execute("""
            SELECT beranda, foto_video, layanan, artikel, hak_akses, warna_gambar_foto 
            FROM hak_akses 
            WHERE username = ?
        """, (username,))
        permissions = self.cursor.fetchone()
        
        # Jika ada data di database, set nilai checkbox
        if permissions:
            self.check_vars["Beranda"].set(bool(permissions[0]))
            self.check_vars["Foto & Video"].set(bool(permissions[1]))
            self.check_vars["Layanan"].set(bool(permissions[2]))
            self.check_vars["Artikel"].set(bool(permissions[3]))
            self.check_vars["Hak Akses"].set(bool(permissions[4]))
            self.check_vars["Warna, Gambar & Foto"].set(bool(permissions[5]))
        
        # Frame untuk tombol
        btn_frame = ttk.Frame(self.edit_window)
        btn_frame.pack(fill="x", padx=10, pady=5)
        
        # Tombol Simpan dan Batal
        ttk.Button(btn_frame, text="Simpan", 
                  command=lambda: self.save_permissions(username)).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="Batal", 
                  command=self.edit_window.destroy).pack(side=tk.LEFT, padx=5)
    
    def save_permissions(self, username):
        # Konversi nilai checkbox ke integer
        values = [
            int(self.check_vars["Beranda"].get()),
            int(self.check_vars["Foto & Video"].get()),
            int(self.check_vars["Layanan"].get()),
            int(self.check_vars["Artikel"].get()),
            int(self.check_vars["Hak Akses"].get()),
            int(self.check_vars["Warna, Gambar & Foto"].get())
        ]
        
        try:
            # Cek apakah user sudah punya hak akses
            self.cursor.execute("SELECT 1 FROM hak_akses WHERE username = ?", (username,))
            exists = self.cursor.fetchone()
            
            if exists:
                # Update jika sudah ada
                self.cursor.execute("""
                    UPDATE hak_akses 
                    SET beranda=?, foto_video=?, layanan=?, artikel=?, hak_akses=?, warna_gambar_foto=?
                    WHERE username=?
                """, (*values, username))
            else:
                # Insert jika belum ada
                self.cursor.execute("""
                    INSERT INTO hak_akses (username, beranda, foto_video, layanan, artikel, hak_akses, warna_gambar_foto)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (username, *values))
            
            self.conn.commit()
            messagebox.showinfo("Sukses", "Hak akses berhasil disimpan!")
            self.edit_window.destroy()
            
        except sqlite3.Error as e:
            messagebox.showerror("Error", f"Gagal menyimpan hak akses: {str(e)}")
    
    def __del__(self):
        # Tutup koneksi database
        if hasattr(self, 'conn'):
            self.conn.close()

if __name__ == "__main__":
    root = tk.Tk()
    app = HakAksesApp(root)
    root.mainloop()
