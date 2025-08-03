const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');

router.post('/login', (req, res) => {
  const { userType, email, password } = req.body;

  const cpp = spawn('./Backend/cpp/verify_login');

  cpp.stdin.write(`${userType}\n${email}\n${password}\n`);
  cpp.stdin.end();

  let result = '';
  cpp.stdout.on('data', (data) => {
    result += data.toString();
  });

  cpp.on('close', () => {
    if (result.trim() === 'teacher_success') {
      res.json({
        success: true,
        role: 'teacher',
        name: 'Dr. Sarah Johnson',
        token: 'mock-jwt-token',
      });
    } else if (result.trim() === 'student_success') {
      res.json({
        success: true,
        role: 'student',
        id: 'STU001',
        name: 'John Doe',
        className: 'Computer Science - Year 3',
        token: 'mock-student-jwt-token',
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  });
});

module.exports = router;
