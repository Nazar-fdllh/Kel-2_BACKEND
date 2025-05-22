const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// JWT Secret Key
const JWT_SECRET = 'simpeg_secret_key';

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5000000 }, // 5MB file size limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
  }
});

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

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token.' });
  }
};

// 1. Login route
app.post('/login', async (req, res) => {
  try {
    const { USERNAME, PASSWORD } = req.body;
    
    // Validate input
    if (!USERNAME || !PASSWORD) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Check if user exists
    const [users] = await pool.query(
      'SELECT * FROM USERS WHERE USERNAME = ? AND PASSWORD = ?',
      [USERNAME, PASSWORD]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = users[0];

    // Generate JWT token
    const token = jwt.sign(
      { 
        ID_LEVEL: user.ID_LEVEL, 
        ID_USER: user.ID_USER 
      }, 
      JWT_SECRET, 
      { expiresIn: '1h' }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Protected API data route
app.get('/api/data', verifyToken, async (req, res) => {
  try {
    // Get user information from token
    const { ID_LEVEL, ID_USER } = req.user;

    // Get employee data
    const [pegawai] = await pool.query(
      'SELECT * FROM PEGAWAI WHERE ID_LEVEL = ? AND ID_USER = ?',
      [ID_LEVEL, ID_USER]
    );

    if (pegawai.length === 0) {
      return res.status(404).json({ error: 'Employee data not found' });
    }

    const employeeData = pegawai[0];

    // Check if user is a lecturer (assume ID_LEVEL for lecturer is 2, adjust as needed)
    if (ID_LEVEL === 2) {
      // Get courses taught by the lecturer
      const [matakuliah] = await pool.query(
        'SELECT * FROM MATAKULIAH WHERE ID_LEVEL = ? AND ID_USER = ? AND ID_PEGAWAI = ?',
        [ID_LEVEL, ID_USER, employeeData.ID_PEGAWAI]
      );

      // Return employee data with courses
      return res.json({
        pegawai: employeeData,
        matakuliah: matakuliah
      });
    }

    // Return only employee data for non-lecturers
    res.json({ pegawai: employeeData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. API profiling data route
app.get('/api/data/profiling', verifyToken, async (req, res) => {
  try {
    // Get user information from token
    const { ID_LEVEL, ID_USER } = req.user;

    // Get employee data
    const [pegawai] = await pool.query(
      'SELECT * FROM PEGAWAI WHERE ID_LEVEL = ? AND ID_USER = ?',
      [ID_LEVEL, ID_USER]
    );

    if (pegawai.length === 0) {
      return res.status(404).json({ error: 'Employee data not found' });
    }

    // Return employee data
    res.json({ pegawai: pegawai[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Update profiling route with file upload
app.put('/api/update-profiling', verifyToken, upload.single('profile_picture'), async (req, res) => {
  try {
    // Get user information from token
    const { ID_LEVEL, ID_USER } = req.user;
    
    // Check if employee exists
    const [existingPegawai] = await pool.query(
      'SELECT * FROM PEGAWAI WHERE ID_LEVEL = ? AND ID_USER = ?',
      [ID_LEVEL, ID_USER]
    );

    if (existingPegawai.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const pegawai = existingPegawai[0];
    
    // Prepare update data
    const {
      NAMA_PEGAWAI, 
      DATE_PEG, 
      ALAMAT_PEG, 
      DOMISILI_PEG, 
      TELP_PEG,
      ID_PERKULIAHAN
    } = req.body;
    
    // Check if file was uploaded
    let PP_PEG = pegawai.PP_PEG;
    if (req.file) {
      // If there was an old profile picture, delete it
      if (pegawai.PP_PEG && fs.existsSync(pegawai.PP_PEG)) {
        fs.unlinkSync(pegawai.PP_PEG);
      }
      PP_PEG = req.file.path;
    }

    // Update employee data
    await pool.query(
      'UPDATE PEGAWAI SET NAMA_PEGAWAI = ?, DATE_PEG = ?, ALAMAT_PEG = ?, DOMISILI_PEG = ?, TELP_PEG = ?, PP_PEG = ?, ID_PERKULIAHAN = ? WHERE ID_LEVEL = ? AND ID_USER = ? AND ID_PEGAWAI = ?',
      [
        NAMA_PEGAWAI, 
        DATE_PEG, 
        ALAMAT_PEG, 
        DOMISILI_PEG, 
        TELP_PEG, 
        PP_PEG,
        ID_PERKULIAHAN,
        ID_LEVEL, 
        ID_USER, 
        pegawai.ID_PEGAWAI
      ]
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Get attendance data
app.get('/api/data/presensi', verifyToken, async (req, res) => {
  try {
    // Get user information from token
    const { ID_LEVEL, ID_USER } = req.user;

    // Get employee data
    const [pegawai] = await pool.query(
      'SELECT * FROM PEGAWAI WHERE ID_LEVEL = ? AND ID_USER = ?',
      [ID_LEVEL, ID_USER]
    );

    if (pegawai.length === 0) {
      return res.status(404).json({ error: 'Employee data not found' });
    }

    const employeeData = pegawai[0];
    
    // Get current date in YYYY-MM-DD format
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    
    // Check if there's already an attendance record for today
    const [existingAttendance] = await pool.query(
      'SELECT * FROM PRESENSI WHERE ID_JK = ? AND ID_KOTA = ? AND ID_LEVEL = ? AND ID_USER = ? AND ID_PEGAWAI = ? AND DATE(WAKTU_MASUK) = ?',
      [
        employeeData.ID_JK,
        employeeData.ID_KOTA,
        ID_LEVEL,
        ID_USER,
        employeeData.ID_PEGAWAI,
        formattedDate
      ]
    );

    // Get all attendance records for the employee
    const [allAttendance] = await pool.query(
      'SELECT * FROM PRESENSI WHERE ID_JK = ? AND ID_KOTA = ? AND ID_LEVEL = ? AND ID_USER = ? AND ID_PEGAWAI = ?',
      [
        employeeData.ID_JK,
        employeeData.ID_KOTA,
        ID_LEVEL,
        ID_USER,
        employeeData.ID_PEGAWAI
      ]
    );

    // Check if it's after 9 AM and no attendance record for today
    const currentHour = today.getHours();
    
    if (existingAttendance.length === 0 && currentHour >= 9) {
      // Add an "absent" record since it's after 9 AM and no check-in
      const newPresensiId = Date.now().toString(); // Generate a unique ID
      await pool.query(
        'INSERT INTO PRESENSI (ID_JK, ID_KOTA, ID_LEVEL, ID_USER, ID_PEGAWAI, ID_PRESENSI, STATUS_PRESENSI, WAKTU_MASUK, WAKTU_KELUAR) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          employeeData.ID_JK,
          employeeData.ID_KOTA,
          ID_LEVEL,
          ID_USER,
          employeeData.ID_PEGAWAI,
          newPresensiId,
          'alfa',
          `${formattedDate} 09:00:00`,
          `${formattedDate} 17:00:00`
        ]
      );
      
      // Get updated attendance records
      const [updatedAttendance] = await pool.query(
        'SELECT * FROM PRESENSI WHERE ID_JK = ? AND ID_KOTA = ? AND ID_LEVEL = ? AND ID_USER = ? AND ID_PEGAWAI = ?',
        [
          employeeData.ID_JK,
          employeeData.ID_KOTA,
          ID_LEVEL,
          ID_USER,
          employeeData.ID_PEGAWAI
        ]
      );
      
      return res.json({
        presensi: updatedAttendance,
        hasTodayAttendance: true
      });
    }
    
    // If no attendance record for today
    if (existingAttendance.length === 0) {
      return res.json({
        presensi: allAttendance,
        hasTodayAttendance: false
      });
    }
    
    // If there's already an attendance record for today
    res.json({
      presensi: allAttendance,
      hasTodayAttendance: true
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Update attendance record
app.post('/api/update-presensi', verifyToken, async (req, res) => {
  try {
    // Get user information from token
    const { ID_LEVEL, ID_USER } = req.user;

    // Get employee data
    const [pegawai] = await pool.query(
      'SELECT * FROM PEGAWAI WHERE ID_LEVEL = ? AND ID_USER = ?',
      [ID_LEVEL, ID_USER]
    );

    if (pegawai.length === 0) {
      return res.status(404).json({ error: 'Employee data not found' });
    }

    const employeeData = pegawai[0];
    
    // Get attendance data from request body
    const { WAKTU_MASUK, WAKTU_KELUAR } = req.body;
    
    // Generate unique ID for the attendance record
    const newPresensiId = Date.now().toString();
    
    // Insert attendance record
    await pool.query(
      'INSERT INTO PRESENSI (ID_JK, ID_KOTA, ID_LEVEL, ID_USER, ID_PEGAWAI, ID_PRESENSI, STATUS_PRESENSI, WAKTU_MASUK, WAKTU_KELUAR) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        employeeData.ID_JK,
        employeeData.ID_KOTA,
        ID_LEVEL,
        ID_USER,
        employeeData.ID_PEGAWAI,
        newPresensiId,
        'hadir',
        WAKTU_MASUK,
        WAKTU_KELUAR || null
      ]
    );
    
    res.json({ message: 'Attendance record added successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

app.delete('/user-levels/:id', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM USER_LEVEL WHERE ID_LEVEL = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User level not found' });
    res.json({ message: 'User level deleted' });
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

app.delete('/users/:level/:id', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM USERS WHERE ID_LEVEL = ? AND ID_USER = ?',
      [req.params.level, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
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

app.delete('/jenis-kelamin/:id', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM KOL_JK WHERE ID_JK = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Jenis kelamin not found' });
    res.json({ message: 'Jenis kelamin deleted' });
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

app.delete('/kota/:id', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM KOL_KOTA WHERE ID_KOTA = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Kota not found' });
    res.json({ message: 'Kota deleted' });
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

app.delete('/perkuliahan/:id', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM PERKULIAHAN WHERE ID_PERKULIAHAN = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Perkuliahan not found' });
    res.json({ message: 'Perkuliahan deleted' });
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

app.delete('/kelas/:perkuliahan/:id', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM KELAS WHERE ID_PERKULIAHAN = ? AND ID_KELAS = ?',
      [req.params.perkuliahan, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Kehadiran not found' });
    res.json({ message: 'Kehadiran updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/kehadiran/:perkuliahan/:id', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM KOL_KEHADIRAN WHERE ID_PERKULIAHAN = ? AND ID_KEHADIRAN = ?',
      [req.params.perkuliahan, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Kehadiran not found' });
    res.json({ message: 'Kehadiran deleted' });
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

app.delete('/mahasiswa/:nim', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM MAHASISWA WHERE NIM = ?',
      [req.params.nim]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Mahasiswa not found' });
    res.json({ message: 'Mahasiswa deleted' });
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

app.delete('/pegawai/:jk/:kota/:level/:user/:id', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM PEGAWAI WHERE ID_JK = ? AND ID_KOTA = ? AND ID_LEVEL = ? AND ID_USER = ? AND ID_PEGAWAI = ?',
      [req.params.jk, req.params.kota, req.params.level, req.params.user, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Pegawai not found' });
    res.json({ message: 'Pegawai deleted' });
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

app.delete('/matakuliah/:jk/:kota/:level/:user/:pegawai/:id', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM MATAKULIAH WHERE ID_JK = ? AND ID_KOTA = ? AND ID_LEVEL = ? AND ID_USER = ? AND ID_PEGAWAI = ? AND ID_MK = ?',
      [req.params.jk, req.params.kota, req.params.level, req.params.user, req.params.pegawai, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Mata kuliah not found' });
    res.json({ message: 'Mata kuliah deleted' });
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

app.delete('/presensi/:jk/:kota/:level/:user/:pegawai/:id', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM PRESENSI WHERE ID_JK = ? AND ID_KOTA = ? AND ID_LEVEL = ? AND ID_USER = ? AND ID_PEGAWAI = ? AND ID_PRESENSI = ?',
      [req.params.jk, req.params.kota, req.params.level, req.params.user, req.params.pegawai, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Presensi not found' });
    res.json({ message: 'Presensi deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});