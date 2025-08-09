"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import {
  QrCode,
  Users,
  BarChart3,
  LogOut,
  Play,
  Square,
  Download,
  UserCheck,
  TrendingUp,
  Search,
  CheckCircle,
  RotateCcw,
  Settings,
  Calendar,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ThemeToggle } from "@/components/theme-toggle"
import { QRCodeSVG } from "qrcode.react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { exportToExcel } from "@/utils/exportToExcel" // Import the exportToExcel function

export interface ClassData {
  id: string // This will be the group_name
  name: string // Display name for the class/group
  subject: string // Subject associated with this group for the teacher
  students: number // Total students in this group
  avgAttendance: number // Average attendance for this group/subject
}
export interface SessionData {
  id: string
  date: string
  time: string
  attendance: number
  total: number
  percentage: number
  name: string
  subject: string
}
export interface Student {
  id: string // Database ID of the student
  name: string
  rollNumber: string // Student's roll_no, used as studentId
  email: string
  status: "present" | "absent" | "late" | null // null means not marked for current session
}

const API_BASE_URL =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://your-render-backend.onrender.com"; // <-- Apna backend URL daalo

export default function TeacherDashboard() {
  const [classes, setClasses] = useState<ClassData[]>([])
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null)
  const [studentList, setStudentList] = useState<Student[]>([])
  const [recentSessions, setRecentSessions] = useState<SessionData[]>([])

  const [sessionActive, setSessionActive] = useState(false)
  const [qrCodeValue, setQrCodeValue] = useState("") // Renamed to avoid conflict with component
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null) // Store the actual session ID from DB
  const [timeLeft, setTimeLeft] = useState(10)
  const [studentsPresent, setStudentsPresent] = useState(0) // This is for the QR session live count

  const [searchTerm, setSearchTerm] = useState("")
  const [currentDateTime, setCurrentDateTime] = useState("")
  const [referenceId, setReferenceId] = useState("") // This is a local ref ID, not from DB
  const [scannerZoom, setScannerZoom] = useState(false)
  const qrContainerRef = useRef<HTMLDivElement>(null)
  const [students, setStudents] = useState([])
  

  const router = useRouter()
  const { toast } = useToast()

  const userName = typeof window !== "undefined" ? localStorage.getItem("userName") || "Teacher" : "Teacher"
  const teacherId = typeof window !== "undefined" ? localStorage.getItem("teacherId") : null

  useEffect(() => {
    const token = localStorage.getItem("userToken")
    const userType = localStorage.getItem("userType")
    if (!token || userType !== "teacher") {
      router.push("/")
    }
  }, [router])

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date()
      setCurrentDateTime(
        now.toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }),
      )
    }
    updateDateTime()
    const interval = setInterval(updateDateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  // QR code generation logic and renewal API call
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined
    if (sessionActive && currentSessionId) {
      const generateNewQrValue = () => {
        const newQrValue = `${currentSessionId}_${Date.now()}` // New dynamic QR value
        setQrCodeValue(newQrValue)
        // Call backend to update last_renewed_at
        fetch(`${API_BASE_URL}/api/renew-qr-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: currentSessionId }),
        }).catch((error) => console.error("Failed to renew QR timestamp:", error))
      }

      // Generate initial QR value
      generateNewQrValue()
      setTimeLeft(10)

      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev === 1) {
            generateNewQrValue() // Generate new QR value and renew timestamp when timer resets
            return 10
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [sessionActive, currentSessionId])

  useEffect(() => {
    if (sessionActive && currentSessionId) {
      setReferenceId(`REF-${currentSessionId}-${Math.random().toString(36).substring(2, 8)}`)
    } else {
      setReferenceId("")
    }
  }, [currentSessionId, sessionActive])

  // Fetch teacher's groups from backend
  useEffect(() => {
    if (!teacherId) return

    fetch(`${API_BASE_URL}/api/get-teacher-groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.groups.length > 0) {
          const fetchedClasses = data.groups.map((grp: any) => ({
            id: grp.group_name,
            name: `Group ${grp.group_name}`,
            subject: grp.subject_name || "General",
            students: 0, // Will be updated by get-group-students
            avgAttendance: 0, // Will be updated by analytics
          }))
          setClasses(fetchedClasses)
          setSelectedClass(fetchedClasses[0]) // Select the first class by default
        }
      })
      .catch((err) => console.error("Error fetching groups:", err))
  }, [teacherId])

  // Fetch students for the selected group and their attendance status for the current session
const fetchStudentsAndAttendanceStatus = async () => {
  if (!selectedClass) return;

  try {
    // 1. Fetch all students in the group
    const studentsRes = await fetch(`${API_BASE_URL}/api/get-group-students`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupName: selectedClass.id }),
    });

    const studentsData = await studentsRes.json();

    if (studentsData.success) {
      // Convert DB keys to consistent camelCase
      let studentsFetched: Student[] = studentsData.students.map((stu: any) => ({
        id: String(stu.id),
        name: stu.name,
        rollNumber: String(stu.roll_no), // ensure string type
        email: stu.email,
        status: null, // default before fetching attendance
      }));

      // 2. If a session is active, fetch attendance status
      if (currentSessionId) {
        const statusRes = await fetch(`${API_BASE_URL}/api/get-session-student-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupName: selectedClass.id, sessionId: currentSessionId }),
        });

        const statusData = await statusRes.json();

        if (statusData.success) {
  const statusMap = new Map<string, "present" | "absent" | "late">(
    statusData.students.map((s: any) => [String(s.roll_no), s.status])
  );

  studentsFetched = studentsFetched.map((student) => ({
    ...student,
    status: (statusMap.get(student.rollNumber) as "present" | "absent" | "late" | null) ?? null,
  }));
}

      }

      // 3. Update state
      setStudentList(studentsFetched);
      setSelectedClass((prev) =>
        prev ? { ...prev, students: studentsFetched.length } : null
      );
    }
  } catch (err) {
    console.error("Error fetching students or attendance status:", err);
  }
};


  useEffect(() => {
    fetchStudentsAndAttendanceStatus()
  }, [selectedClass, currentSessionId]) // Re-fetch when class or active session changes

  // Fetch recent sessions for the selected group
  const fetchRecentSessions = async () => {
    if (!selectedClass || !teacherId) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/get-group-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId, groupName: selectedClass.id }),
      })
      const data = await res.json()
      if (data.success) {
        const sessionsFetched = data.sessions.map((session: any) => ({
          id: session.id.toString(),
          date: new Date(session.date).toLocaleDateString("en-IN"),
          time: "", // Backend doesn't provide time for session creation, only date
          attendance: session.avg_attendance ?? 0,
          total: 0, // You can add total students if you store that
          percentage: session.avg_attendance ?? 0,
          name: session.name,
          subject: session.subject,
        }))
        setRecentSessions(sessionsFetched)
      }
    } catch (err) {
      console.error("Error fetching recent sessions:", err)
    }
  }

  useEffect(() => {
    fetchRecentSessions()
  }, [selectedClass, teacherId])

  const handleScannerZoom = () => {
    setScannerZoom((prev) => !prev)
  }

  const handleLogout = () => {
    localStorage.removeItem("userToken")
    localStorage.removeItem("userType")
    localStorage.removeItem("userName")
    localStorage.removeItem("teacherId")
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    })
    router.push("/")
  }

  const startSession = async () => {
    if (!selectedClass || !teacherId) {
      toast({
        title: "Error",
        description: "Please select a class and ensure teacher ID is available.",
        variant: "destructive",
      })
      return
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/create-qr-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId,
          classId: selectedClass.id,
          subject: selectedClass.subject,
          name: `QR Session - ${selectedClass.name}`, // Cleaned session name
          date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
        }),
      })
      const data = await res.json()

      if (data.success) {
        setCurrentSessionId(data.sessionId) // Store the actual session ID
        setSessionActive(true)
        setStudentsPresent(0) // Reset student present count for new session
        toast({
          title: "Session Started",
          description: `QR session started for ${selectedClass.subject} - ${selectedClass.name}`,
        })
        fetchRecentSessions() // Refresh recent sessions list
        fetchStudentsAndAttendanceStatus() // Refresh manual attendance list with initial statuses
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to start QR session.",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Error starting session:", err)
      toast({
        title: "Error",
        description: "Failed to connect to server to start session.",
        variant: "destructive",
      })
    }
  }

  const stopSession = () => {
    setSessionActive(false)
    setQrCodeValue("")
    setCurrentSessionId(null)
    setTimeLeft(10)
    toast({
      title: "Session Stopped",
      description: "Attendance session has been ended.",
    })
    fetchRecentSessions() // Refresh recent sessions list
    fetchStudentsAndAttendanceStatus() // Clear manual attendance statuses
  }

  // Simulate attendance (for demo purposes, doesn't hit backend)
  const simulateAttendance = () => {
    if (selectedClass && studentsPresent < selectedClass.students) {
      setStudentsPresent((prev) => prev + 1)
      toast({
        title: "Student Scanned (Demo)",
        description: "A student has marked their attendance (simulated).",
      })
    }
  }

  // Manual attendance toggle and backend update
  const toggleAttendance = async (studentRollNo: string, currentStatus: Student["status"]) => {
    if (!currentSessionId) {
      toast({
        title: "Error",
        description: "Please start a QR session to mark manual attendance.",
        variant: "destructive",
      })
      return
    }

    let newStatus: "present" | "absent" = "present"
    if (currentStatus === "present") {
      newStatus = "absent"
    } else if (currentStatus === "absent") {
      newStatus = "present" // Toggle back to present if currently absent
    } else {
      newStatus = "present" // Default to present if null
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/mark-attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentRollNo,
          sessionId: currentSessionId,
          status: newStatus,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setStudentList((prev) =>
          prev.map((student) => (student.rollNumber === studentRollNo ? { ...student, status: newStatus } : student)),
        )
        toast({
          title: "Attendance Updated",
          description: `Student ${studentRollNo} marked as ${newStatus}.`,
        })
        fetchRecentSessions() // Update analytics after manual change
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to update attendance.",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Error updating manual attendance:", err)
      toast({
        title: "Error",
        description: "Failed to connect to server for manual attendance update.",
        variant: "destructive",
      })
    }
  }

  const markAllPresent = async () => {
    if (!currentSessionId) {
      toast({
        title: "Error",
        description: "Please start a QR session to mark all students present.",
        variant: "destructive",
      })
      return
    }

    const updates = studentList.map((student) => ({
      studentRollNo: student.rollNumber,
      sessionId: currentSessionId,
      status: "present",
    }))

    try {
      // Send all updates in parallel
      await Promise.all(
        updates.map((update) =>
          fetch(`${API_BASE_URL}/api/mark-attendance`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(update),
          }),
        ),
      )
      setStudentList((prev) => prev.map((student) => ({ ...student, status: "present" })))
      toast({
        title: "All Students Marked Present",
        description: "All students have been marked as present.",
      })
      fetchRecentSessions() // Update analytics after manual change
    } catch (err) {
      console.error("Error marking all present:", err)
      toast({
        title: "Error",
        description: "Failed to mark all students present.",
        variant: "destructive",
      })
    }
  }

  const resetAll = async () => {
    if (!currentSessionId) {
      toast({
        title: "Error",
        description: "Please start a QR session to reset attendance.",
        variant: "destructive",
      })
      return
    }

    const updates = studentList.map((student) => ({
      studentRollNo: student.rollNumber,
      sessionId: currentSessionId,
      status: "absent", // Resetting means marking them absent
    }))

    try {
      await Promise.all(
        updates.map((update) =>
          fetch(`${API_BASE_URL}/api/mark-attendance`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(update),
          }),
        ),
      )
      setStudentList((prev) => prev.map((student) => ({ ...student, status: "absent" })))
      toast({
        title: "Attendance Reset",
        description: "All attendance records have been reset to absent.",
      })
      fetchRecentSessions() // Update analytics after manual change
    } catch (err) {
      console.error("Error resetting all:", err)
      toast({
        title: "Error",
        description: "Failed to reset all attendance.",
        variant: "destructive",
      })
    }
  }

  const filteredStudents = studentList.filter(
    (student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const presentCount = studentList.filter((s) => s.status === "present").length

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/95 dark:bg-gray-800/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <QrCode className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-xl">Teacher Dashboard</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Attendance Management</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:block text-sm text-gray-600 dark:text-gray-400">{currentDateTime}</div>
              <ThemeToggle />
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Panel */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 shadow-lg">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Welcome back, {userName}!</h1>
                  <div className="flex items-center gap-6 text-blue-100">
                    <span className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      {selectedClass?.subject}
                    </span>
                    <span className="flex items-center gap-2">
                      <UserCheck className="w-5 h-5" />
                      {selectedClass?.name}
                    </span>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/20">
                  Online
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        {/* Class Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{selectedClass?.subject}</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {selectedClass?.name ? `Group: ${selectedClass.name}` : "Select a class"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <label className="text-sm font-medium">Select Class</label>
                    <Select
                      value={selectedClass?.id || ""}
                      onValueChange={(value) => {
                        const newClass = classes.find((c) => c.id === value)
                        if (newClass) setSelectedClass(newClass)
                      }}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Select Class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name} ({cls.subject})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{selectedClass?.subject}</Badge>
                    <Badge variant="secondary">{selectedClass?.name}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="qr-session" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="qr-session" className="flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              QR Session
            </TabsTrigger>
            <TabsTrigger value="manual-attendance" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Manual Attendance
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>
          {/* QR Session Tab */}
          <TabsContent value="qr-session" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* QR Code Generation */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                <Card className="shadow-lg">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Play className="w-5 h-5" />
                          {selectedClass?.subject} - {selectedClass?.name}
                        </CardTitle>
                        <CardDescription>
                          Generate QR codes for {selectedClass?.subject} attendance in {selectedClass?.name}
                        </CardDescription>
                      </div>
                      {sessionActive && (
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                          Active
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div
                      ref={qrContainerRef}
                      className={`relative flex flex-col items-center transition-all duration-300 ${
                        scannerZoom ? "z-50 bg-white dark:bg-gray-900 p-8 rounded-xl shadow-2xl scale-125" : ""
                      }`}
                      style={scannerZoom ? { position: "relative" } : {}}
                    >
                      <motion.div
                        key={qrCodeValue} // Key on qrCodeValue to re-animate on change
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className="cursor-pointer"
                        onClick={handleScannerZoom}
                      >
                        {sessionActive && qrCodeValue ? (
                          <QRCodeSVG value={qrCodeValue} size={scannerZoom ? 350 : 200} level="M" includeMargin />
                        ) : (
                          <div
                            className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded ${
                              scannerZoom ? "w-[350px] h-[350px]" : "w-[200px] h-[200px]"
                            }`}
                          >
                            <QrCode className={scannerZoom ? "w-32 h-32 text-gray-400" : "w-16 h-16 text-gray-400"} />
                          </div>
                        )}
                      </motion.div>
                      {/* Ref ID below scanner */}
                      {sessionActive && referenceId && (
                        <div className="mt-4 mb-2 flex items-center justify-center w-full">
                          <Badge variant="secondary" className="text-xs">
                            Ref ID: {referenceId}
                          </Badge>
                        </div>
                      )}
                      {sessionActive && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute -bottom-2 -right-2 bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center text-sm font-bold shadow-lg"
                        >
                          {timeLeft}
                        </motion.div>
                      )}
                    </div>
                    <div className="flex gap-3">
                      {!sessionActive ? (
                        <Button onClick={startSession} className="flex-1 bg-green-600 hover:bg-green-700 h-12">
                          <Play className="w-5 h-5 mr-2" />
                          Start Session
                        </Button>
                      ) : (
                        <Button onClick={stopSession} variant="destructive" className="flex-1 h-12">
                          <Square className="w-5 h-5 mr-2" />
                          Stop Session
                        </Button>
                      )}
                      <Button variant="outline" onClick={simulateAttendance} className="h-12 bg-transparent">
                        <UserCheck className="w-5 h-5 mr-2" />
                        Demo Scan
                      </Button>
                    </div>
                    {sessionActive && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <div className="flex justify-between text-sm">
                          <span>Students Present</span>
                          <span className="font-semibold">
                            {studentsPresent}/{selectedClass?.students || 0}
                          </span>
                        </div>
                        <Progress
                          value={selectedClass ? (studentsPresent / selectedClass.students) * 100 : 0}
                          className="h-3"
                        />
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                          <h4 className="font-medium mb-2">Session Instructions:</h4>
                          <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                            <li>• Students scan QR code to mark attendance</li>
                            <li>• QR code updates every 10 seconds for security</li>
                            <li>
                              • Attendance recorded for {selectedClass?.subject} - {selectedClass?.name}
                            </li>
                            <li>• Monitor real-time student count</li>
                            <li>• Use manual attendance for scanning issues</li>
                          </ul>
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
              {/* Session Analytics */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-6"
              >
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      {selectedClass?.subject} - {selectedClass?.name}
                    </CardTitle>
                    <CardDescription>
                      Attendance analytics for {selectedClass?.subject} in {selectedClass?.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{selectedClass?.name} Performance</span>
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">85%</div>
                          <div className="text-xs text-gray-500">Average</div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{recentSessions.length}</div>
                          <div className="text-xs text-gray-500">Sessions</div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">95%</div>
                          <div className="text-xs text-gray-500">Highest</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-lg">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Recent Sessions</CardTitle>
                      <Button onClick={() => exportToExcel(recentSessions, selectedClass)} variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Export Excel
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recentSessions.length > 0 ? (
                        recentSessions.map((session, index) => (
                          <motion.div
                            key={session.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * index }}
                            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                          >
                            <div>
                              <div className="font-medium text-sm">{session.date}</div>
                              <div className="text-xs text-gray-500">{session.name}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">{session.percentage.toFixed(1)}%</div>
                              <div className="text-xs text-gray-500">{session.subject}</div>
                            </div>
                          </motion.div>
                        ))
                      ) : (
                        <p className="text-center text-gray-500">No recent sessions available.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>
          {/* Manual Attendance Tab */}
          <TabsContent value="manual-attendance" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <Card className="shadow-lg">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Manual Attendance - {selectedClass?.name}</CardTitle>
                        <CardDescription>
                          Subject: {selectedClass?.subject} • Class: {selectedClass?.name}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={markAllPresent} size="sm" className="bg-green-600 hover:bg-green-700">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark All Present
                        </Button>
                        <Button onClick={resetAll} variant="outline" size="sm">
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Reset All
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-6">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="Search by name, roll number..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 h-11"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map((student, index) => (
                          <motion.div
                            key={student.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * index }}
                            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                          >
                            <div>
                              <div className="font-medium">{student.name}</div>
                              <div className="text-sm text-gray-500">Roll No: {student.rollNumber}</div>
                            </div>
                            <Button
                              onClick={() => toggleAttendance(student.rollNumber, student.status)}
                              variant={
                                student.status === "present"
                                  ? "default"
                                  : student.status === "absent"
                                    ? "destructive"
                                    : "outline"
                              }
                              className={
                                student.status === "present"
                                  ? "bg-green-600 hover:bg-green-700"
                                  : student.status === "absent"
                                    ? "bg-red-600 hover:bg-red-700"
                                    : ""
                              }
                            >
                              {student.status === "present" ? (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Present
                                </>
                              ) : student.status === "absent" ? (
                                <>
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Absent
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-4 h-4 mr-2" />
                                  Mark Present
                                </>
                              )}
                            </Button>
                          </motion.div>
                        ))
                      ) : (
                        <p className="text-center text-gray-500">
                          No students found or selected class has no students.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-6">
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      {selectedClass?.name} Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span>Present</span>
                        <Badge className="bg-green-500 hover:bg-green-600">{presentCount}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Absent</span>
                        <Badge variant="destructive">{studentList.length - presentCount}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Total</span>
                        <Badge variant="outline">{studentList.length}</Badge>
                      </div>
                      <div className="pt-2 border-t">
                        <div className="flex justify-between font-medium">
                          <span>Attendance Rate</span>
                          <span>
                            {studentList.length > 0 ? Math.round((presentCount / studentList.length) * 100) : 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle>Manual Attendance Guidelines</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-2 text-gray-600 dark:text-gray-400">
                      <li>• Use this for students who cannot scan QR codes</li>
                      <li>• Verify student identity before marking present</li>
                      <li>
                        • Records are specific to {selectedClass?.subject} - {selectedClass?.name}
                      </li>
                      <li>• Changes are saved automatically</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-8">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Class Performance Overview</CardTitle>
                  <CardDescription>Attendance statistics for all your classes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {classes.map((cls) => (
                      <div
                        key={cls.id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div>
                          <div className="font-medium">
                            {cls.subject} - {cls.name}
                          </div>
                          <div className="text-sm text-gray-500">{cls.students} students</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">{cls.avgAttendance.toFixed(1)}%</div>
                          <div className="text-xs text-gray-500">Average</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Export Options</CardTitle>
                  <CardDescription>Download attendance reports and data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={() => exportToExcel(recentSessions, selectedClass)}
                    className="w-full justify-start h-12 bg-transparent"
                    variant="outline"
                  >
                    <Download className="w-5 h-5 mr-3" />
                    Export All Sessions to Excel
                  </Button>
                  <Button className="w-full justify-start h-12 bg-transparent" variant="outline">
                    <Download className="w-5 h-5 mr-3" />
                    Export Student List
                  </Button>
                  <Button className="w-full justify-start h-12 bg-transparent" variant="outline">
                    <Download className="w-5 h-5 mr-3" />
                    Export Attendance Report
                  </Button>
                  <Button className="w-full justify-start h-12 bg-transparent" variant="outline">
                    <Calendar className="w-5 h-5 mr-3" />
                    Generate Monthly Report
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Account Settings
                  </CardTitle>
                  <CardDescription>Manage your account preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <p className="font-medium">Teacher Name</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{userName}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <p className="font-medium">Department</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Computer Science</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <p className="font-medium">Employee ID</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{teacherId}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common tasks and utilities</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" className="w-full justify-start h-12 bg-transparent">
                    <BarChart3 className="w-5 h-5 mr-3" />
                    View All Reports
                  </Button>
                  <Button variant="outline" className="w-full justify-start h-12 bg-transparent">
                    <Calendar className="w-5 h-5 mr-3" />
                    Academic Calendar
                  </Button>
                  <Button variant="outline" className="w-full justify-start h-12 bg-transparent">
                    <Users className="w-5 h-5 mr-3" />
                    Manage Classes
                  </Button>
                  <Button variant="destructive" className="w-full justify-start h-12" onClick={handleLogout}>
                    <LogOut className="w-5 h-5 mr-3" />
                    Logout
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
