const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Database connection
const pool = mysql.createPool({
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'simpeg',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ==============================================
// USER LEVEL CRUD
// ==============================================
app.get('/user-levels', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM USER_LEVEL');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/user-levels/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM USER_LEVEL WHERE ID_LEVEL = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User level not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/user-levels', async (req, res) => {
  try {
    const { ID_LEVEL, NAMA_LEVEL } = req.body;
    const [result] = await pool.query(
      'INSERT INTO USER_LEVEL (ID_LEVEL, NAMA_LEVEL) VALUES (?, ?)',
      [ID_LEVEL, NAMA_LEVEL]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/user-levels/:id', async (req, res) => {
  try {
    const { NAMA_LEVEL } = req.body;
    const [result] = await pool.query(
      'UPDATE USER_LEVEL SET NAMA_LEVEL = ? WHERE ID_LEVEL = ?',
      [NAMA_LEVEL, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User level not found' });
    res.json({ message: 'User level updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================================
// USERS CRUD
// ==============================================
app.get('/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM USERS');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/users/:level/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM USERS WHERE ID_LEVEL = ? AND ID_USER = ?',
      [req.params.level, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/users', async (req, res) => {
  try {
    const { ID_LEVEL, ID_USER, USERNAME, PASSWORD } = req.body;
    const [result] = await pool.query(
      'INSERT INTO USERS (ID_LEVEL, ID_USER, USERNAME, PASSWORD) VALUES (?, ?, ?, ?)',
      [ID_LEVEL, ID_USER, USERNAME, PASSWORD]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/users/:level/:id', async (req, res) => {
  try {
    const { USERNAME, PASSWORD } = req.body;
    const [result] = await pool.query(
      'UPDATE USERS SET USERNAME = ?, PASSWORD = ? WHERE ID_LEVEL = ? AND ID_USER = ?',
      [USERNAME, PASSWORD, req.params.level, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================================
// KOL_JK CRUD (Jenis Kelamin)
// ==============================================
app.get('/jenis-kelamin', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM KOL_JK');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/jenis-kelamin/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM KOL_JK WHERE ID_JK = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Jenis kelamin not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/jenis-kelamin', async (req, res) => {
  try {
    const { ID_JK, NAMA_JK, KET_JK } = req.body;
    const [result] = await pool.query(
      'INSERT INTO KOL_JK (ID_JK, NAMA_JK, KET_JK) VALUES (?, ?, ?)',
      [ID_JK, NAMA_JK, KET_JK]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/jenis-kelamin/:id', async (req, res) => {
  try {
    const { NAMA_JK, KET_JK } = req.body;
    const [result] = await pool.query(
      'UPDATE KOL_JK SET NAMA_JK = ?, KET_JK = ? WHERE ID_JK = ?',
      [NAMA_JK, KET_JK, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Jenis kelamin not found' });
    res.json({ message: 'Jenis kelamin updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================================
// KOL_KOTA CRUD
// ==============================================
app.get('/kota', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM KOL_KOTA');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/kota/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM KOL_KOTA WHERE ID_KOTA = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Kota not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/kota', async (req, res) => {
  try {
    const { ID_KOTA, NAMA_KOTA } = req.body;
    const [result] = await pool.query(
      'INSERT INTO KOL_KOTA (ID_KOTA, NAMA_KOTA) VALUES (?, ?)',
      [ID_KOTA, NAMA_KOTA]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/kota/:id', async (req, res) => {
  try {
    const { NAMA_KOTA } = req.body;
    const [result] = await pool.query(
      'UPDATE KOL_KOTA SET NAMA_KOTA = ? WHERE ID_KOTA = ?',
      [NAMA_KOTA, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Kota not found' });
    res.json({ message: 'Kota updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================================
// PERKULIAHAN CRUD
// ==============================================
app.get('/perkuliahan', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM PERKULIAHAN');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/perkuliahan/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM PERKULIAHAN WHERE ID_PERKULIAHAN = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Perkuliahan not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/perkuliahan', async (req, res) => {
  try {
    const { ID_PERKULIAHAN, PERTEMUAN } = req.body;
    const [result] = await pool.query(
      'INSERT INTO PERKULIAHAN (ID_PERKULIAHAN, PERTEMUAN) VALUES (?, ?)',
      [ID_PERKULIAHAN, PERTEMUAN]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/perkuliahan/:id', async (req, res) => {
  try {
    const { PERTEMUAN } = req.body;
    const [result] = await pool.query(
      'UPDATE PERKULIAHAN SET PERTEMUAN = ? WHERE ID_PERKULIAHAN = ?',
      [PERTEMUAN, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Perkuliahan not found' });
    res.json({ message: 'Perkuliahan updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================================
// KELAS CRUD
// ==============================================
app.get('/kelas', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM KELAS');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/kelas/:perkuliahan/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM KELAS WHERE ID_PERKULIAHAN = ? AND ID_KELAS = ?',
      [req.params.perkuliahan, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Kelas not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/kelas', async (req, res) => {
  try {
    const { ID_PERKULIAHAN, ID_KELAS, NAMA_KELAS } = req.body;
    const [result] = await pool.query(
      'INSERT INTO KELAS (ID_PERKULIAHAN, ID_KELAS, NAMA_KELAS) VALUES (?, ?, ?)',
      [ID_PERKULIAHAN, ID_KELAS, NAMA_KELAS]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/kelas/:perkuliahan/:id', async (req, res) => {
  try {
    const { NAMA_KELAS } = req.body;
    const [result] = await pool.query(
      'UPDATE KELAS SET NAMA_KELAS = ? WHERE ID_PERKULIAHAN = ? AND ID_KELAS = ?',
      [NAMA_KELAS, req.params.perkuliahan, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Kelas not found' });
    res.json({ message: 'Kelas updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================================
// KOL_KEHADIRAN CRUD
// ==============================================
app.get('/kehadiran', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM KOL_KEHADIRAN');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/kehadiran/:perkuliahan/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM KOL_KEHADIRAN WHERE ID_PERKULIAHAN = ? AND ID_KEHADIRAN = ?',
      [req.params.perkuliahan, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Kehadiran not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/kehadiran', async (req, res) => {
  try {
    const { ID_PERKULIAHAN, ID_KEHADIRAN, STATUS_KEHADIRAN, KET_KEHADIRAN } = req.body;
    const [result] = await pool.query(
      'INSERT INTO KOL_KEHADIRAN (ID_PERKULIAHAN, ID_KEHADIRAN, STATUS_KEHADIRAN, KET_KEHADIRAN) VALUES (?, ?, ?, ?)',
      [ID_PERKULIAHAN, ID_KEHADIRAN, STATUS_KEHADIRAN, KET_KEHADIRAN]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/kehadiran/:perkuliahan/:id', async (req, res) => {
  try {
    const { STATUS_KEHADIRAN, KET_KEHADIRAN } = req.body;
    const [result] = await pool.query(
      'UPDATE KOL_KEHADIRAN SET STATUS_KEHADIRAN = ?, KET_KEHADIRAN = ? WHERE ID_PERKULIAHAN = ? AND ID_KEHADIRAN = ?',
      [STATUS_KEHADIRAN, KET_KEHADIRAN, req.params.perkuliahan, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Kehadiran not found' });
    res.json({ message: 'Kehadiran updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================================
// MAHASISWA CRUD
// ==============================================
app.get('/mahasiswa', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM MAHASISWA');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/mahasiswa/:nim', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM MAHASISWA WHERE NIM = ?', [req.params.nim]);
    if (rows.length === 0) return res.status(404).json({ error: 'Mahasiswa not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/mahasiswa', async (req, res) => {
  try {
    const { NIM, ID_PERKULIAHAN, NM_MHS } = req.body;
    const [result] = await pool.query(
      'INSERT INTO MAHASISWA (NIM, ID_PERKULIAHAN, NM_MHS) VALUES (?, ?, ?)',
      [NIM, ID_PERKULIAHAN, NM_MHS]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/mahasiswa/:nim', async (req, res) => {
  try {
    const { ID_PERKULIAHAN, NM_MHS } = req.body;
    const [result] = await pool.query(
      'UPDATE MAHASISWA SET ID_PERKULIAHAN = ?, NM_MHS = ? WHERE NIM = ?',
      [ID_PERKULIAHAN, NM_MHS, req.params.nim]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Mahasiswa not found' });
    res.json({ message: 'Mahasiswa updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================================
// PEGAWAI CRUD
// ==============================================
app.get('/pegawai', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM PEGAWAI');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/pegawai/:jk/:kota/:level/:user/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM PEGAWAI WHERE ID_JK = ? AND ID_KOTA = ? AND ID_LEVEL = ? AND ID_USER = ? AND ID_PEGAWAI = ?',
      [req.params.jk, req.params.kota, req.params.level, req.params.user, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Pegawai not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/pegawai', async (req, res) => {
  try {
    const {
      ID_JK, ID_KOTA, ID_LEVEL, ID_USER, ID_PEGAWAI, ID_PERKULIAHAN,
      NAMA_PEGAWAI, DATE_PEG, ALAMAT_PEG, DOMISILI_PEG, TELP_PEG, PP_PEG
    } = req.body;
    
    const [result] = await pool.query(
      'INSERT INTO PEGAWAI (ID_JK, ID_KOTA, ID_LEVEL, ID_USER, ID_PEGAWAI, ID_PERKULIAHAN, NAMA_PEGAWAI, DATE_PEG, ALAMAT_PEG, DOMISILI_PEG, TELP_PEG, PP_PEG) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [ID_JK, ID_KOTA, ID_LEVEL, ID_USER, ID_PEGAWAI, ID_PERKULIAHAN, NAMA_PEGAWAI, DATE_PEG, ALAMAT_PEG, DOMISILI_PEG, TELP_PEG, PP_PEG]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/pegawai/:jk/:kota/:level/:user/:id', async (req, res) => {
  try {
    const {
      ID_PERKULIAHAN, NAMA_PEGAWAI, DATE_PEG, ALAMAT_PEG, DOMISILI_PEG, TELP_PEG, PP_PEG
    } = req.body;
    
    const [result] = await pool.query(
      'UPDATE PEGAWAI SET ID_PERKULIAHAN = ?, NAMA_PEGAWAI = ?, DATE_PEG = ?, ALAMAT_PEG = ?, DOMISILI_PEG = ?, TELP_PEG = ?, PP_PEG = ? WHERE ID_JK = ? AND ID_KOTA = ? AND ID_LEVEL = ? AND ID_USER = ? AND ID_PEGAWAI = ?',
      [ID_PERKULIAHAN, NAMA_PEGAWAI, DATE_PEG, ALAMAT_PEG, DOMISILI_PEG, TELP_PEG, PP_PEG, 
       req.params.jk, req.params.kota, req.params.level, req.params.user, req.params.id]
    );
    
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Pegawai not found' });
    res.json({ message: 'Pegawai updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================================
// MATAKULIAH CRUD
// ==============================================
app.get('/matakuliah', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM MATAKULIAH');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/matakuliah/:jk/:kota/:level/:user/:pegawai/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM MATAKULIAH WHERE ID_JK = ? AND ID_KOTA = ? AND ID_LEVEL = ? AND ID_USER = ? AND ID_PEGAWAI = ? AND ID_MK = ?',
      [req.params.jk, req.params.kota, req.params.level, req.params.user, req.params.pegawai, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Mata kuliah not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/matakuliah', async (req, res) => {
  try {
    const {
      ID_JK, ID_KOTA, ID_LEVEL, ID_USER, ID_PEGAWAI, ID_MK, ID_PERKULIAHAN, NAMA_MK
    } = req.body;
    
    const [result] = await pool.query(
      'INSERT INTO MATAKULIAH (ID_JK, ID_KOTA, ID_LEVEL, ID_USER, ID_PEGAWAI, ID_MK, ID_PERKULIAHAN, NAMA_MK) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [ID_JK, ID_KOTA, ID_LEVEL, ID_USER, ID_PEGAWAI, ID_MK, ID_PERKULIAHAN, NAMA_MK]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/matakuliah/:jk/:kota/:level/:user/:pegawai/:id', async (req, res) => {
  try {
    const { ID_PERKULIAHAN, NAMA_MK } = req.body;
    
    const [result] = await pool.query(
      'UPDATE MATAKULIAH SET ID_PERKULIAHAN = ?, NAMA_MK = ? WHERE ID_JK = ? AND ID_KOTA = ? AND ID_LEVEL = ? AND ID_USER = ? AND ID_PEGAWAI = ? AND ID_MK = ?',
      [ID_PERKULIAHAN, NAMA_MK, req.params.jk, req.params.kota, req.params.level, req.params.user, req.params.pegawai, req.params.id]
    );
    
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Mata kuliah not found' });
    res.json({ message: 'Mata kuliah updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================================
// PRESENSI CRUD
// ==============================================
app.get('/presensi', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM PRESENSI');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/presensi/:jk/:kota/:level/:user/:pegawai/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM PRESENSI WHERE ID_JK = ? AND ID_KOTA = ? AND ID_LEVEL = ? AND ID_USER = ? AND ID_PEGAWAI = ? AND ID_PRESENSI = ?',
      [req.params.jk, req.params.kota, req.params.level, req.params.user, req.params.pegawai, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Presensi not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/presensi', async (req, res) => {
  try {
    const {
      ID_JK, ID_KOTA, ID_LEVEL, ID_USER, ID_PEGAWAI, ID_PRESENSI,
      STATUS_PRESENSI, WAKTU_MASUK, WAKTU_KELUAR
    } = req.body;
    
    const [result] = await pool.query(
      'INSERT INTO PRESENSI (ID_JK, ID_KOTA, ID_LEVEL, ID_USER, ID_PEGAWAI, ID_PRESENSI, STATUS_PRESENSI, WAKTU_MASUK, WAKTU_KELUAR) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [ID_JK, ID_KOTA, ID_LEVEL, ID_USER, ID_PEGAWAI, ID_PRESENSI, STATUS_PRESENSI, WAKTU_MASUK, WAKTU_KELUAR]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/presensi/:jk/:kota/:level/:user/:pegawai/:id', async (req, res) => {
  try {
    const { STATUS_PRESENSI, WAKTU_MASUK, WAKTU_KELUAR } = req.body;
    
    const [result] = await pool.query(
      'UPDATE PRESENSI SET STATUS_PRESENSI = ?, WAKTU_MASUK = ?, WAKTU_KELUAR = ? WHERE ID_JK = ? AND ID_KOTA = ? AND ID_LEVEL = ? AND ID_USER = ? AND ID_PEGAWAI = ? AND ID_PRESENSI = ?',
      [STATUS_PRESENSI, WAKTU_MASUK, WAKTU_KELUAR, req.params.jk, req.params.kota, req.params.level, req.params.user, req.params.pegawai, req.params.id]
    );
    
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Presensi not found' });
    res.json({ message: 'Presensi updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});