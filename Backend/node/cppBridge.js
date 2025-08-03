const { spawn } = require("child_process");

function runCppProgram() {
  return new Promise((resolve, reject) => {
    const cpp = spawn("g++", ["../cpp/main.cpp", "-o", "../cpp/main.exe"]);

    cpp.on("close", (code) => {
      if (code === 0) {
        const exe = spawn("../cpp/main.exe");
        exe.stdout.on("data", (data) => process.stdout.write(data));
        exe.stderr.on("data", (data) => process.stderr.write(data));
        exe.on("close", resolve);
      } else {
        reject("C++ Compilation Error");
      }
    });
  });
}

module.exports = runCppProgram;
