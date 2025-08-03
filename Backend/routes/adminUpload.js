const express = require("express");
const multer = require("multer");
const fs = require("fs");
const csv = require("csv-parser");
const db = require("../node/db");
const generatePassword = require("generate-password");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/upload-csv", upload.single("csv"), async (req, res) => {
  const type = req.body.type; // "student" or "teacher"
  const results = [];

  if (!type || !["student", "teacher"].includes(type)) {
    return res.status(400).json({ success: false, message: "Invalid user type" });
  }

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", async () => {
      try {
        if (type === "student") {
          for (const row of results) {
            const { name, email, roll_no, group_name, semester } = row;
            const password = generatePassword.generate({ length: 10, numbers: true });

            const [subjectResult] = await db.query(
              "SELECT subjects FROM subjects WHERE group_name = ? AND semester = ?",
              [group_name, semester]
            );

            if (subjectResult.length === 0) {
              console.warn(`No subjects found for group ${group_name} and semester ${semester}`);
              continue;
            }

            const subjects = subjectResult[0].subjects;

            await db.query(
              `INSERT INTO students (name, email, roll_no, group_name, semester, subjects, password)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [name, email, roll_no, group_name, semester, subjects, password]
            );
          }

          res.json({ success: true, message: "Students uploaded successfully." });

        } else if (type === "teacher") {
          for (const row of results) {
            const { name, email, teacher_id, department, groups, subjects } = row;
            const password = generatePassword.generate({ length: 10, numbers: true });

            // Check if teacher exists
            const [existing] = await db.query(
              `SELECT id FROM teachers WHERE teacher_id = ?`,
              [teacher_id]
            );

            if (existing.length === 0) {
              // Insert new teacher
              await db.query(
                `INSERT INTO teachers (name, email, teacher_id, department, password)
                 VALUES (?, ?, ?, ?, ?)`,
                [name, email, teacher_id, department, password]
              );
            } else {
              // Existing teacher: clear previous mappings
              await db.query(`DELETE FROM teacher_groups WHERE teacher_id = ?`, [teacher_id]);
              await db.query(`DELETE FROM teacher_subjects WHERE teacher_id = ?`, [teacher_id]);
              console.log(`Updated existing teacher: ${teacher_id}`);
            }

            // Insert multiple groups (comma-separated)
            const groupList = groups ? groups.split(",").map(g => g.trim()) : [];
            for (const group_name of groupList) {
              if (group_name)
                await db.query(
                  `INSERT INTO teacher_groups (teacher_id, group_name) VALUES (?, ?)`,
                  [teacher_id, group_name]
                );
            }

            // Insert multiple subjects (comma-separated)
            const subjectList = subjects ? subjects.split(",").map(s => s.trim()) : [];
            for (const subject_name of subjectList) {
              if (subject_name)
                await db.query(
                  `INSERT INTO teacher_subjects (teacher_id, subject_name) VALUES (?, ?)`,
                  [teacher_id, subject_name]
                );
            }
          }

          res.json({
            success: true,
            message: "Teachers uploaded successfully with groups and subjects."
          });
        }

      } catch (err) {
        console.error("Upload Error:", err);
        res.status(500).json({ success: false, message: "Server error during upload" });
      } finally {
        fs.unlinkSync(req.file.path);
      }
    });
});

module.exports = router;
