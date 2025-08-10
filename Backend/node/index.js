const express = require("express")
const mysql = require("mysql2/promise") // Use promise-based API for async/await
const cors = require("cors")
const { execFile } = require("child_process")

const app = express()
const adminUploadRoutes = require("../routes/adminUpload") // Assuming this path is correct



const allowedOrigins = [
  "http://localhost:3000", // Local development
  "https://classlog-virid.vercel.app", // Added this line (without trailing slash)
  "https://classlog-virid.vercel.app/", // Keep this line (with trailing slash)
  "https://classlog-e5h3.onrender.com",
];


app.use(express.json())
app.use(
  cors({
    origin: function (origin, callback) {
      console.log("Incoming Origin:", origin);
      // allow requests with no origin (like mobile apps, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // if you are using cookies or authentication headers
  })
);
app.use("/api/admin", adminUploadRoutes)
// Example route
app.get("/", (req, res) => {
  res.send("CORS setup working");
});

const db = mysql.createPool({
  // Use createPool for better connection management
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

db.getConnection()
  .then((connection) => {
    console.log("✅ MySQL Connected")
    connection.release() // Release the connection after successful test
  })
  .catch((err) => {
    console.error("❌ MySQL connection error:", err)
    process.exit(1)
  })

// Helper function to update session attendance percentage
async function updateSessionAttendance(sessionId) {
  try {
    // 1. Get class_id (group_name) for the session
    const [sessionInfo] = await db.query("SELECT class_id FROM qr_sessions WHERE id = ?", [sessionId])
    if (sessionInfo.length === 0) {
      console.warn(`Session ID ${sessionId} not found for attendance update.`)
      return
    }
    const groupName = sessionInfo[0].class_id

    // 2. Count present students for this session
    const [presentCountResult] = await db.query(
      "SELECT COUNT(*) AS present_count FROM attendance_logs WHERE session_id = ? AND status = 'present'",
      [sessionId],
    )
    const presentCount = presentCountResult[0].present_count

    // 3. Count total students in this group
    const [totalStudentsResult] = await db.query(
      "SELECT COUNT(*) AS total_students FROM students WHERE group_name = ?",
      [groupName],
    )
    const totalStudents = totalStudentsResult[0].total_students

    // 4. Calculate percentage
    const avgAttendance = totalStudents > 0 ? (presentCount / totalStudents) * 100 : 0

    // 5. Update qr_sessions table
    await db.query("UPDATE qr_sessions SET avg_attendance = ? WHERE id = ?", [avgAttendance, sessionId])
    console.log(`✅ Session ${sessionId} attendance updated to ${avgAttendance.toFixed(2)}%`)
  } catch (error) {
    console.error(`❌ Error updating session attendance for session ${sessionId}:`, error)
  }
}

// 🎯 Login API
app.post("/api/login", async (req, res) => {
  const { userType, id, email, password } = req.body

  if (!userType || !password || (userType === "student" && !id) || (userType === "teacher" && !email)) {
    return res.status(400).json({ success: false, message: "Missing credentials" })
  }

  const table = userType === "student" ? "students" : "teachers"
  const idField = userType === "student" ? "roll_no" : "email" // Use roll_no for students

  const identifier = userType === "student" ? id : email

  const query = `SELECT * FROM ${table} WHERE ${idField} = ? AND password = ?`

  try {
    const [results] = await db.query(query, [identifier, password])

    if (results.length === 1) {
      const user = results[0]

      const response = {
        success: true,
        token: "mock-token", // Replace with JWT if needed
        name: user.name,
        email: user.email,
      }

      if (userType === "student") {
        response.id = user.roll_no // Use roll_no as the student ID
        response.group = user.group_name
        response.semester = user.semester
      } else {
        response.id = user.teacher_id
        response.department = user.department
      }

      return res.json(response)
    } else {
      return res.status(401).json({ success: false, message: "Invalid credentials" })
    }
  } catch (err) {
    console.error("❌ DB Error during login:", err)
    return res.status(500).json({ success: false, message: "Internal server error" })
  }
})

// Get teacher's groups and subjects
app.post("/api/get-teacher-groups", async (req, res) => {
  const { teacherId } = req.body
  if (!teacherId) {
    return res.status(400).json({ success: false, message: "Missing teacherId" })
  }
  try {
    const [rows] = await db.query(
      `SELECT tg.group_name, tgs.subject_name
   FROM teacher_groups tg
   LEFT JOIN teacher_group_subjects tgs
     ON tg.teacher_id = tgs.teacher_id AND tg.group_name = tgs.group_name
   WHERE tg.teacher_id = ?`,
      [teacherId],
    )
    console.log("Teacher Groups API Response:", rows)
    res.json({ success: true, groups: rows })
  } catch (err) {
    console.error("Error fetching teacher groups:", err)
    res.status(500).json({ success: false, message: "Failed to fetch groups" })
  }
})

// Manual attendance marking/updating by teacher
app.post("/api/mark-attendance", async (req, res) => {
  const { studentRollNo, sessionId, status } = req.body // studentRollNo, sessionId, status
  const currentDate = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const currentTime = new Date().toTimeString().slice(0, 8) // HH:MM:SS

  if (!studentRollNo || !sessionId || !status) {
    return res.status(400).json({ success: false, message: "Missing parameters for attendance" })
  }

  try {
    // Check if attendance already exists for this student/session
    const [existing] = await db.query("SELECT * FROM attendance_logs WHERE student_roll_no = ? AND session_id = ?", [
      studentRollNo,
      sessionId,
    ])

    if (existing.length > 0) {
      // Update status if already marked
      await db.query(
        "UPDATE attendance_logs SET status = ?, date = ?, time = ?, marked_at = CURRENT_TIMESTAMP WHERE student_roll_no = ? AND session_id = ?",
        [status, currentDate, currentTime, studentRollNo, sessionId],
      )
      await updateSessionAttendance(sessionId) // Update session average
      return res.json({ success: true, message: "Attendance updated successfully." })
    } else {
      // Else insert new entry
      await db.query(
        "INSERT INTO attendance_logs (student_roll_no, session_id, date, time, status, marked_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
        [studentRollNo, sessionId, currentDate, currentTime, status],
      )
      await updateSessionAttendance(sessionId) // Update session average
      return res.json({ success: true, message: "Attendance marked successfully." })
    }
  } catch (err) {
    console.error("❌ DB Error marking attendance:", err)
    return res.status(500).json({ success: false, message: "Internal server error" })
  }
})

// Get students for a specific group
app.post("/api/get-group-students", async (req, res) => {
  const { groupName } = req.body
  if (!groupName) {
    return res.status(400).json({ success: false, message: "Missing groupName" })
  }
  try {
    const [rows] = await db.query("SELECT id, name, roll_no, email FROM students WHERE group_name = ?", [groupName])
    res.json({ success: true, students: rows })
  } catch (err) {
    console.error("Error fetching group students:", err)
    res.status(500).json({ success: false, message: "Failed to fetch students" })
  }
})

// Get attendance status for students in a specific session (for manual attendance tab)
app.post("/api/get-session-student-status", async (req, res) => {
  const { groupName, sessionId } = req.body
  if (!groupName || !sessionId) {
    return res.status(400).json({ success: false, message: "Missing groupName or sessionId" })
  }
  try {
    const [students] = await db.query(
      `SELECT s.id, s.name, s.roll_no, s.email, al.status
     FROM students s
     LEFT JOIN attendance_logs al ON s.roll_no = al.student_roll_no AND al.session_id = ?
     WHERE s.group_name = ?`,
      [sessionId, groupName],
    )
    res.json({ success: true, students })
  } catch (err) {
    console.error("Error fetching session student status:", err)
    res.status(500).json({ success: false, message: "Failed to fetch student statuses" })
  }
})

// Get QR sessions for a teacher and group
app.post("/api/get-group-sessions", async (req, res) => {
  const { teacherId, groupName } = req.body
  if (!teacherId || !groupName) {
    return res.status(400).json({ success: false, message: "Missing parameters" })
  }
  try {
    const [rows] = await db.query(
      "SELECT id, date, name, subject, avg_attendance FROM qr_sessions WHERE teacher_id = ? AND class_id = ? ORDER BY date DESC",
      [teacherId, groupName],
    )
    res.json({ success: true, sessions: rows })
  } catch (err) {
    console.error("Error fetching group sessions:", err)
    res.status(500).json({ success: false, message: "Failed to fetch sessions" })
  }
})

// Create a new QR session
app.post("/api/create-qr-session", async (req, res) => {
  const { teacherId, classId, subject, name, date } = req.body // avg_attendance is default 0
  try {
    const [result] = await db.query(
      "INSERT INTO qr_sessions (teacher_id, class_id, subject, name, date, last_renewed_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
      [teacherId, classId, subject, name, date],
    )
    res.json({ success: true, sessionId: result.insertId }) // Return the new session ID
  } catch (err) {
    console.error("Error creating QR session:", err)
    res.status(500).json({ success: false, message: "Failed to create session" })
  }
})

// New API to renew QR session timestamp
app.post("/api/renew-qr-session", async (req, res) => {
  const { sessionId } = req.body
  if (!sessionId) {
    return res.status(400).json({ success: false, message: "Missing sessionId" })
  }
  try {
    await db.query("UPDATE qr_sessions SET last_renewed_at = CURRENT_TIMESTAMP WHERE id = ?", [sessionId])
    res.json({ success: true, message: "QR session timestamp renewed." })
  } catch (err) {
    console.error("Error renewing QR session timestamp:", err)
    res.status(500).json({ success: false, message: "Failed to renew QR session timestamp." })
  }
})

// Get student profile details
app.post("/api/get-student-profile", async (req, res) => {
  const { studentId } = req.body // studentId here is roll_no
  if (!studentId) return res.status(400).json({ success: false, message: "Missing studentId" })

  try {
    const [rows] = await db.query(
      "SELECT id, name, email, roll_no, group_name, semester, subjects FROM students WHERE roll_no = ?",
      [studentId],
    )
    if (rows.length === 0) {
      return res.json({ success: false, message: "Student not found" })
    }
    res.json({ success: true, profile: rows[0] })
  } catch (err) {
    console.error("Error fetching student profile:", err)
    res.status(500).json({ success: false, message: "Failed to fetch profile" })
  }
})

// Get student attendance history (ORIGINAL - keep for backward compatibility)
app.post("/api/get-student-attendance", async (req, res) => {
  const { studentId } = req.body // studentId here is roll_no
  if (!studentId) return res.status(400).json({ success: false, message: "Missing studentId" })

  try {
    const [rows] = await db.query(
      `SELECT al.id, al.date, al.time, al.status, al.marked_at,
          qs.subject, qs.name AS session_name, t.name AS teacher
   FROM attendance_logs al
   LEFT JOIN qr_sessions qs ON al.session_id = qs.id
   LEFT JOIN teachers t ON qs.teacher_id = t.teacher_id
   WHERE al.student_roll_no = ?
   ORDER BY al.marked_at DESC`,
      [studentId],
    )
    res.json({ success: true, attendance: rows })
  } catch (err) {
    console.error("Error fetching student attendance:", err)
    res.status(500).json({ success: false, message: "Failed to fetch attendance" })
  }
})

// 🆕 UPDATED API: Get student attendance with total sessions count (Fixed for multiple subjects)
// 🆕 UPDATED API: Get student attendance with total sessions count (ALL SUBJECTS shown)
app.post("/api/get-student-attendance-with-totals", async (req, res) => {
  const { studentId } = req.body // studentId here is roll_no
  if (!studentId) return res.status(400).json({ success: false, message: "Missing studentId" })

  try {
    // First, get student's group information and subjects
    const [studentInfo] = await db.query("SELECT group_name, semester, subjects FROM students WHERE roll_no = ?", [
      studentId,
    ])

    if (studentInfo.length === 0) {
      return res.json({ success: false, message: "Student not found" })
    }

    const { group_name, semester, subjects } = studentInfo[0]

    // Parse subjects from comma-separated string
    let studentSubjects = []
    if (subjects && subjects.trim()) {
      studentSubjects = subjects
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    }

    // Get student's attendance records with session details
    const [attendanceRows] = await db.query(
      `SELECT al.id, al.date, al.time, al.status, al.marked_at,
          qs.subject, qs.name AS session_name, t.name AS teacher
       FROM attendance_logs al
       LEFT JOIN qr_sessions qs ON al.session_id = qs.id
       LEFT JOIN teachers t ON qs.teacher_id = t.teacher_id
       WHERE al.student_roll_no = ?
       ORDER BY al.marked_at DESC`,
      [studentId],
    )

    // Get total sessions created for this student's group by subject
    const [totalSessionsRows] = await db.query(
      `SELECT qs.subject, COUNT(*) as total_sessions
       FROM qr_sessions qs
       WHERE qs.class_id = ? AND qs.subject IS NOT NULL AND qs.subject != ''
       GROUP BY qs.subject`,
      [group_name],
    )

    // Create a map of subject to total sessions
    const totalSessionsMap = new Map()
    totalSessionsRows.forEach((row) => {
      if (row.subject && row.subject.trim()) {
        totalSessionsMap.set(row.subject.trim(), row.total_sessions)
      }
    })

    // Get attended sessions by subject
    const [attendedSessionsRows] = await db.query(
      `SELECT qs.subject, COUNT(*) as attended_sessions
       FROM attendance_logs al
       JOIN qr_sessions qs ON al.session_id = qs.id
       WHERE al.student_roll_no = ? AND al.status IN ('present', 'late') 
       AND qs.subject IS NOT NULL AND qs.subject != ''
       GROUP BY qs.subject`,
      [studentId],
    )

    // Create a map of subject to attended sessions
    const attendedSessionsMap = new Map()
    attendedSessionsRows.forEach((row) => {
      if (row.subject && row.subject.trim()) {
        attendedSessionsMap.set(row.subject.trim(), row.attended_sessions)
      }
    })

    // Build subject statistics
    const subjectStats = []
    const allSubjects = new Set()

    // Add subjects from student profile
    studentSubjects.forEach((subject) => allSubjects.add(subject))

    // Add subjects that have sessions (यह DBMS को include करेगा)
    totalSessionsMap.forEach((_, subject) => allSubjects.add(subject))

    // Create stats for all subjects
    allSubjects.forEach((subject) => {
      const totalSessions = totalSessionsMap.get(subject) || 0
      const attendedSessions = attendedSessionsMap.get(subject) || 0
      const percentage = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0

      subjectStats.push({
        subject,
        totalClasses: totalSessions,
        attendedClasses: attendedSessions,
        percentage: Math.round(percentage),
        requiredFor75: Math.max(0, Math.ceil(0.75 * totalSessions - attendedSessions)),
        canMiss: percentage >= 75 ? Math.floor((attendedSessions - 0.75 * totalSessions) / 0.75) : 0,
      })
    })

    // Sort subjects alphabetically
    subjectStats.sort((a, b) => a.subject.localeCompare(b.subject))

    // If no subjects found anywhere, show a message
    if (subjectStats.length === 0) {
      subjectStats.push({
        subject: "No subjects assigned",
        totalClasses: 0,
        attendedClasses: 0,
        percentage: 0,
        requiredFor75: 0,
        canMiss: 0,
      })
    }

    console.log("📊 Subject Stats for student:", studentId)
    console.log("👤 Student subjects:", studentSubjects)
    console.log("📚 Sessions found for subjects:", Array.from(totalSessionsMap.keys()))
    console.log("📈 Final subject stats:", subjectStats)

    res.json({
      success: true,
      attendance: attendanceRows,
      subjectStats: subjectStats,
      studentInfo: {
        group_name,
        semester,
        subjects: Array.from(allSubjects),
      },
    })
  } catch (err) {
    console.error("Error fetching student attendance with totals:", err)
    res.status(500).json({ success: false, message: "Failed to fetch attendance" })
  }
})


// Student marks attendance via QR scan
app.post("/api/student-qr-attendance", async (req, res) => {
  const { sessionId, studentId, scannedTimestamp } = req.body // Now receiving sessionId and scannedTimestamp separately
  const currentDate = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const currentTime = new Date().toTimeString().slice(0, 8) // HH:MM:SS

  if (!sessionId || !studentId || !scannedTimestamp) {
    return res.status(400).json({ success: false, message: "Missing session ID, student ID, or QR timestamp." })
  }

  try {
    // Validate the session ID and get its last_renewed_at
    const [sessionRows] = await db.query(
      "SELECT id, teacher_id, subject, name, date, last_renewed_at FROM qr_sessions WHERE id = ?",
      [sessionId],
    )

    if (sessionRows.length === 0) {
      return res.json({ success: false, message: "Invalid or expired QR code session." })
    }

    const session = sessionRows[0]

    // Check QR expiration: If the scanned timestamp is older than the current last_renewed_at in DB, it's expired.
    // This ensures that as soon as a new QR is generated (and last_renewed_at is updated),
    // any QR code generated *before* that update is considered old.
    const dbLastRenewedAt = new Date(session.last_renewed_at).getTime() // Convert to milliseconds

    // A small grace period (e.g., 1 second) to account for minor network latency or clock skew
    const GRACE_PERIOD_MS = 1000

    if (scannedTimestamp < dbLastRenewedAt - GRACE_PERIOD_MS) {
      return res.json({ success: false, message: "QR_EXPIRED" })
    }

    // Check if attendance already marked for this student in this session
    const [existingAttendance] = await db.query(
      "SELECT * FROM attendance_logs WHERE student_roll_no = ? AND session_id = ?",
      [studentId, session.id],
    )

    if (existingAttendance.length > 0) {
      return res.json({ success: false, message: "Attendance already marked for this session." })
    }

    // Insert new attendance record
    await db.query(
      "INSERT INTO attendance_logs (student_roll_no, session_id, date, time, status, marked_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
      [studentId, session.id, currentDate, currentTime, "present"],
    )

    await updateSessionAttendance(session.id) // Update session average

    res.json({ success: true, message: "Attendance marked successfully!" })
  } catch (err) {
    console.error("❌ DB Error marking student QR attendance:", err)
    // Check for duplicate entry error (ER_DUP_ENTRY)
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "Attendance already marked for this session." })
    }
    return res.status(500).json({ success: false, message: "Internal server error." })
  }
})

// ✅ Optional: Student Add using another C++ file (validate.exe)
// app.get("/api/add-student-from-cpp", (req, res) => {
//   execFile("./validate.exe", (error, stdout, stderr) => {
//     if (error) {
//       console.error("❌ C++ Insert Error:", error.message)
//       return res.status(500).json({ error: "C++ execution failed" })
//     }

//     const data = stdout.trim().split(",")
//     if (data.length !== 3) {
//       return res.status(400).json({ error: "Invalid data from C++" })
//     }

//     const [name, roll, dept] = data
//     const defaultPassword = "defaultpass"

//     // This part needs to be updated to match the new 'students' table schema
//     // For example, if 'class' maps to 'group_name' and 'dept' is not directly used here
//     db.query(
//       "INSERT INTO students (name, roll_no, password, group_name) VALUES (?, ?, ?, ?)",
//       [name, roll, defaultPassword, dept], // Assuming dept maps to group_name for this example
//       (err, result) => {
//         if (err) {
//           console.error("❌ DB Insert Error:", err)
//           return res.status(500).json({ error: "DB Insert failed" })
//         }
//         res.json({ message: "✅ Inserted via C++", id: result.insertId })
//       },
//     )
//   })
// })

app.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000")
})
