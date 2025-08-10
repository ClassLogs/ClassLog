"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { GraduationCap, Users, UserCheck, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ThemeToggle } from "@/components/theme-toggle"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useEffect } from "react"

export default function LoginPage() {
  

  const [API_BASE_URL, setApiBaseUrl] = useState("")
  

  useEffect(() => {
    const url =
      window.location.hostname === "localhost"
        ? "http://localhost:5000"
        : "https://classlog-e5h3.onrender.com" ; 
    setApiBaseUrl(url)
  }, [])

const [user, setUser] = useState(null); 
  // App.js ya kisi global layout file me
useEffect(() => {
  const token = localStorage.getItem("userToken");
  const userType = localStorage.getItem("userType");

  if (token) {
    fetch(`${API_BASE_URL}/api/user`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        if (window.location.pathname === "/") {
          if (userType === "student") {
            window.location.href = "/student/dashboard";
          } else if (userType === "teacher") {
            window.location.href = "/teacher/dashboard";
          }
        }
      } else {
        localStorage.removeItem("userToken");
        localStorage.removeItem("userType");
      }
    });
  }
}, []);



  const [teacherCredentials, setTeacherCredentials] = useState({
    email: "",
    password: "",
  })
  const [studentCredentials, setStudentCredentials] = useState({
    studentId: "",
    password: "",
  })
  const [showTeacherPassword, setShowTeacherPassword] = useState(false)
  const [showStudentPassword, setShowStudentPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter()
  const { toast } = useToast()

  

  const handleTeacherLogin = async () => {
    if (!teacherCredentials.email || !teacherCredentials.password) {
      toast({
        title: "Missing Fields",
        description: "Please enter both email and password",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userType: "teacher",
          email: teacherCredentials.email,
          password: teacherCredentials.password,
        }),
      })

      const data = await res.json()
      console.log("Login response:", data)

      if (data.success) {
        localStorage.setItem("teacherAuthToken", data.token)
        localStorage.setItem("userToken", data.token)
        localStorage.setItem("userType", "teacher")
        localStorage.setItem("teacherId", data.id)
        localStorage.setItem("teacherName", data.name)
        localStorage.setItem("userName", data.name)
        localStorage.setItem("teacherEmail", data.email)
        localStorage.setItem("teacherDepartment", data.department)

        toast({
          title: "Login Successful",
          description: `Welcome, ${data.name}!`,
        })

        router.push("/teacher/dashboard")
      } else {
        toast({
          title: "Login Failed",
          description: data.message || "Invalid credentials",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Login error:", err)
      toast({
        title: "Network Error",
        description: "Something went wrong.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleStudentLogin = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userType: "student",
          id: studentCredentials.studentId,
          password: studentCredentials.password,
        }),
      })

      const data = await res.json()

      if (data.success) {
        localStorage.setItem("studentAuthToken", data.token)
        localStorage.setItem("userToken", data.token)
        localStorage.setItem("userType", "student")
        localStorage.setItem("userName", data.name)
        localStorage.setItem("studentName", data.name)
        localStorage.setItem("studentId", data.id)
        localStorage.setItem("studentGroup", data.group)
        localStorage.setItem("studentSemester", data.semester)

        toast({
          title: "Login Successful",
          description: `Welcome, ${data.name}!`,
        })

        // Ensure token is set before redirect
        setTimeout(() => {
          router.push("/student/portal")
        }, 50)
      } else {
        toast({
          title: "Login Failed",
          description: data.message || "Invalid credentials",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error(err)
      toast({
        title: "Network Error",
        description: "Unable to login. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // const fillDemoCredentials = (type: "teacher" | "student") => {
  //   if (type === "teacher") {
  //     setTeacherCredentials({
  //       email: "teacher@school.edu",
  //       password: "password123",
  //     })
  //   } else {
  //     setStudentCredentials({
  //       studentId: "STU001",
  //       password: "student123",
  //     })
  //   }
  // }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      {/* Header */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        {/* Logo Section */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mb-6 shadow-lg"
          >
            <GraduationCap className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Hybrid Attendance System</h1>
          <p className="text-gray-600 dark:text-gray-400">Secure QR-based attendance tracking</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-2xl border-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl">Sign In</CardTitle>
            <CardDescription>Choose your portal to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="teacher" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="teacher" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Teacher
                </TabsTrigger>
                <TabsTrigger value="student" className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  Student
                </TabsTrigger>
              </TabsList>

              {/* Teacher Login */}
              <TabsContent value="teacher" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="teacher-email">Email Address</Label>
                  <Input
                    id="teacher-email"
                    type="email"
                    placeholder="teacher@school.edu"
                    value={teacherCredentials.email}
                    onChange={(e) => setTeacherCredentials((prev) => ({ ...prev, email: e.target.value }))}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teacher-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="teacher-password"
                      type={showTeacherPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={teacherCredentials.password}
                      onChange={(e) => setTeacherCredentials((prev) => ({ ...prev, password: e.target.value }))}
                      className="h-11 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowTeacherPassword(!showTeacherPassword)}
                    >
                      {showTeacherPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={handleTeacherLogin}
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing In..." : "Sign In as Teacher"}
                </Button>
                <div className="text-center">

                </div>
              </TabsContent>

              {/* Student Login */}
              <TabsContent value="student" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="student-id">Student ID</Label>
                  <Input
                    id="student-id"
                    placeholder="STU001"
                    value={studentCredentials.studentId}
                    onChange={(e) => setStudentCredentials((prev) => ({ ...prev, studentId: e.target.value }))}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="student-password"
                      type={showStudentPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={studentCredentials.password}
                      onChange={(e) => setStudentCredentials((prev) => ({ ...prev, password: e.target.value }))}
                      className="h-11 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowStudentPassword(!showStudentPassword)}
                    >
                      {showStudentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={handleStudentLogin}
                  className="w-full h-11 bg-green-600 hover:bg-green-700"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing In..." : "Sign In as Student"}
                </Button>
                <div className="text-center">

                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Demo Credentials Info */}
        {/* <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6 p-4 bg-white/80 dark:bg-gray-800/80 rounded-lg backdrop-blur-sm"
        >
          <h3 className="font-semibold text-sm mb-2">Demo Credentials:</h3>
          <div className="text-xs space-y-1 text-gray-600 dark:text-gray-400">
            <p>
              <strong>Teacher:</strong> teacher@school.edu / password123
            </p>
            <p>
              <strong>Student:</strong> STU001 / student123
            </p>
          </div>
        </motion.div> */}
      </motion.div>
    </div>
  )
}
