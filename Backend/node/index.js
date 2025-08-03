const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const { execFile } = require("child_process");

const app = express();
const adminUploadRoutes = require("../routes/adminUpload")
app.use("/api/admin", adminUploadRoutes)



app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Aditya@0903",
  database: "attendance",
});

db.connect((err) => {
  if (err) {
    console.error("❌ MySQL connection error:", err);
    process.exit(1);
  }
  console.log("✅ MySQL Connected");
});

// 🎯 Login API using C++ validation
app.post("/api/login", (req, res) => {
  const { userType, id, email, password } = req.body;

  if (!userType || !password || (userType === "student" && !id) || (userType === "teacher" && !email)) {
    return res.status(400).json({ success: false, message: "Missing credentials" });
  }

  const table = userType === "student" ? "students" : "teachers";
  const idField = userType === "student" ? "roll_no" : "email";

  const identifier = userType === "student" ? id : email;

  const query = `SELECT * FROM ${table} WHERE ${idField} = ? AND password = ?`;

  db.query(query, [identifier, password], (err, results) => {
    if (err) {
      console.error("❌ DB Error:", err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }

    if (results.length === 1) {
      const user = results[0];

      // 📦 Return custom fields based on user type
      const response = {
        success: true,
        token: "mock-token", // Replace with JWT if needed
        name: user.name,
        email: user.email,
      };

      if (userType === "student") {
        response.id = user.roll_no;
        response.group = user.group_name;
        response.semester = user.semester;
      } else {
        response.id = user.teacher_id;
        response.department = user.department;
      }

      return res.json(response);
    } else {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  });
});



app.post("/api/get-teacher-groups", async (req, res) => {
  const { teacherId } = req.body;

  console.log("📩 teacherId received in API:", teacherId); // ✅ Add this

  if (!teacherId) {
    return res.status(400).json({ success: false, message: "Missing teacherId" });
  }

  try {
    const [rows] = await db.promise().query(
      "SELECT group_name FROM teacher_groups WHERE teacher_id = ?",
      [teacherId]
    );

    console.log("✅ Groups fetched:", rows);  // ✅ Add this too

    res.json({ success: true, groups: rows });
  } catch (err) {
    console.error("Error fetching teacher groups:", err);
    res.status(500).json({ success: false, message: "Failed to fetch groups" });
  }
});




// ✅ Optional: Student Add using another C++ file (validate.exe)
app.get("/api/add-student-from-cpp", (req, res) => {
  execFile("./validate.exe", (error, stdout, stderr) => {
    if (error) {
      console.error("❌ C++ Insert Error:", error.message);
      return res.status(500).json({ error: "C++ execution failed" });
    }

    const data = stdout.trim().split(",");
    if (data.length !== 3) {
      return res.status(400).json({ error: "Invalid data from C++" });
    }

    const [name, roll, dept] = data;
    const defaultPassword = "defaultpass";

    db.query(
      "INSERT INTO students (name, student_id, password, class) VALUES (?, ?, ?, ?)",
      [name, roll, defaultPassword, dept],
      (err, result) => {
        if (err) {
          console.error("❌ DB Insert Error:", err);
          return res.status(500).json({ error: "DB Insert failed" });
        }
        res.json({ message: "✅ Inserted via C++", id: result.insertId });
      }
    );
  });
});

app.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
});
