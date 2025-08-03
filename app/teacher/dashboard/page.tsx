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

interface ClassData {
  id: string
  name: string
  subject: string
  students: number
  avgAttendance: number
}

interface SessionData {
  id: string
  date: string
  time: string
  attendance: number
  total: number
  percentage: number
}

interface Student {
  id: string
  name: string
  rollNumber: string
  studentId: string
  present: boolean
}

const classes: ClassData[] = [
  { id: "g4", name: "Class G4", subject: "DSOOPS", students: 20, avgAttendance: 85 },
  { id: "g3", name: "Class G3", subject: "DBMS", students: 18, avgAttendance: 92 },
  { id: "g2", name: "Class G2", subject: "OOSE", students: 22, avgAttendance: 78 },
  { id: "g1", name: "Class G1", subject: "FEE", students: 25, avgAttendance: 88 },
]

const recentSessions: SessionData[] = [
  { id: "1", date: "Aug 2, 2025", time: "09:06 AM", attendance: 18, total: 20, percentage: 90 },
  { id: "2", date: "Aug 1, 2025", time: "09:06 AM", attendance: 16, total: 20, percentage: 80 },
  { id: "3", date: "Jul 31, 2025", time: "09:06 AM", attendance: 19, total: 20, percentage: 95 },
  { id: "4", date: "Jul 30, 2025", time: "09:06 AM", attendance: 17, total: 20, percentage: 85 },
]

const students: Student[] = [
  { id: "1", name: "John Doe", rollNumber: "G4-001", studentId: "G4001", present: false },
  { id: "2", name: "Jane Smith", rollNumber: "G4-002", studentId: "G4002", present: false },
  { id: "3", name: "Mike Johnson", rollNumber: "G4-003", studentId: "G4003", present: false },
  { id: "4", name: "Sarah Wilson", rollNumber: "G4-004", studentId: "G4004", present: false },
  { id: "5", name: "David Brown", rollNumber: "G4-005", studentId: "G4005", present: false },
]

export default function TeacherDashboard() {
  const [selectedClass, setSelectedClass] = useState<ClassData>(classes[0])
  const [sessionActive, setSessionActive] = useState(false)
  const [qrCode, setQrCode] = useState("")
  const [timeLeft, setTimeLeft] = useState(10)
  const [studentsPresent, setStudentsPresent] = useState(0)
  const [studentList, setStudentList] = useState<Student[]>(students)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentDateTime, setCurrentDateTime] = useState("")
  const [referenceId, setReferenceId] = useState("")
  const [scannerZoom, setScannerZoom] = useState(false)
  const qrContainerRef = useRef<HTMLDivElement>(null)

  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const token = localStorage.getItem("studentAuthToken")
    if (!token) {
      router.push("/") // redirect to login
    }
  }, [])


  const userName =
    typeof window !== "undefined" ? localStorage.getItem("userName") || "Dr. Sarah Johnson" : "Dr. Sarah Johnson"

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
        })
      )
    }
    updateDateTime()
    const interval = setInterval(updateDateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (sessionActive) {
      const interval = setInterval(() => {
        const sessionId = Math.random().toString(36).substring(7)
        const timestamp = Date.now()
        setQrCode(`${selectedClass.id}-${sessionId}-${timestamp}`)
        setTimeLeft(10)
      }, 10000)
      const sessionId = Math.random().toString(36).substring(7)
      const timestamp = Date.now()
      setQrCode(`${selectedClass.id}-${sessionId}-${timestamp}`)
      return () => clearInterval(interval)
    }
  }, [sessionActive, selectedClass.id])

  useEffect(() => {
    if (sessionActive && qrCode) {
      setReferenceId(`REF-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`)
    } else {
      setReferenceId("")
    }
  }, [qrCode, sessionActive])

  useEffect(() => {
    if (sessionActive && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [sessionActive, timeLeft])

  const handleScannerZoom = () => {
    setScannerZoom((prev) => !prev)
  }

  const handleLogout = () => {
    localStorage.removeItem("userToken")
    localStorage.removeItem("userType")
    localStorage.removeItem("userName")
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    })
    router.push("/")
  }

  const startSession = () => {
    setSessionActive(true)
    setStudentsPresent(0)
    toast({
      title: "Session Started",
      description: `QR session started for ${selectedClass.subject} - ${selectedClass.name}`,
    })
  }

  const stopSession = () => {
    setSessionActive(false)
    setQrCode("")
    setTimeLeft(10)
    toast({
      title: "Session Stopped",
      description: "Attendance session has been ended.",
    })
  }

  const simulateAttendance = () => {
    if (studentsPresent < selectedClass.students) {
      setStudentsPresent((prev) => prev + 1)
      toast({
        title: "Student Scanned",
        description: "A student has marked their attendance.",
      })
    }
  }

  const toggleAttendance = (studentId: string) => {
    setStudentList((prev) =>
      prev.map((student) => (student.id === studentId ? { ...student, present: !student.present } : student))
    )
  }

  const markAllPresent = () => {
    setStudentList((prev) => prev.map((student) => ({ ...student, present: true })))
    toast({
      title: "All Students Marked Present",
      description: "All students have been marked as present.",
    })
  }

  const resetAll = () => {
    setStudentList((prev) => prev.map((student) => ({ ...student, present: false })))
    toast({
      title: "Attendance Reset",
      description: "All attendance records have been reset.",
    })
  }

  const exportToExcel = () => {
    const csvContent = [
      ["Session ID", "Date", "Time", "Attendance", "Total", "Percentage"],
      ...recentSessions.map((session) => [
        session.id,
        session.date,
        session.time,
        session.attendance.toString(),
        session.total.toString(),
        `${session.percentage}%`,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `${selectedClass.subject}_${selectedClass.name}_attendance.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast({
      title: "Export Successful",
      description: "Attendance data has been exported to CSV file.",
    })
  }

  const filteredStudents = studentList.filter(
    (student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentId.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const presentCount = studentList.filter((s) => s.present).length

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
              <div className="hidden md:block text-sm text-gray-600 dark:text-gray-400">
                {currentDateTime}
              </div>
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
                      {selectedClass.subject}
                    </span>
                    <span className="flex items-center gap-2">
                      <UserCheck className="w-5 h-5" />
                      {selectedClass.name}
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
                    <h3 className="font-semibold text-lg">{selectedClass.subject}</h3>
                    <p className="text-gray-600 dark:text-gray-400">Data Structures & Object Oriented Programming</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <label className="text-sm font-medium">Select Class</label>
                    <Select
                      value={selectedClass.id}
                      onValueChange={(value) => {
                        const newClass = classes.find((c) => c.id === value)
                        if (newClass) setSelectedClass(newClass)
                      }}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{selectedClass.subject}</Badge>
                    <Badge variant="secondary">{selectedClass.name}</Badge>
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
                          {selectedClass.subject} - {selectedClass.name}
                        </CardTitle>
                        <CardDescription>
                          Generate QR codes for {selectedClass.subject} attendance in {selectedClass.name}
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
                        key={qrCode}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className="cursor-pointer"
                        onClick={handleScannerZoom}
                      >
                        {sessionActive && qrCode ? (
                          <QRCodeSVG value={qrCode} size={scannerZoom ? 350 : 200} level="M" includeMargin />
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
                            {studentsPresent}/{selectedClass.students}
                          </span>
                        </div>
                        <Progress value={(studentsPresent / selectedClass.students) * 100} className="h-3" />
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                          <h4 className="font-medium mb-2">Session Instructions:</h4>
                          <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                            <li>• Students scan QR code to mark attendance</li>
                            <li>• QR code updates every 10 seconds for security</li>
                            <li>
                              • Attendance recorded for {selectedClass.subject} - {selectedClass.name}
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
                      {selectedClass.subject} - {selectedClass.name}
                    </CardTitle>
                    <CardDescription>
                      Attendance analytics for {selectedClass.subject} in {selectedClass.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{selectedClass.name} Performance</span>
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">85%</div>
                          <div className="text-xs text-gray-500">Average</div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">10</div>
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
                      <Button onClick={exportToExcel} variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Export Excel
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recentSessions.map((session, index) => (
                        <motion.div
                          key={session.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 * index }}
                          className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <div>
                            <div className="font-medium text-sm">{session.date}</div>
                            <div className="text-xs text-gray-500">{session.time}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {session.attendance}/{session.total}
                            </div>
                            <div className="text-xs text-gray-500">{session.percentage}% present</div>
                          </div>
                        </motion.div>
                      ))}
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
                        <CardTitle>Manual Attendance - {selectedClass.name}</CardTitle>
                        <CardDescription>
                          Subject: {selectedClass.subject} • Class: {selectedClass.name}
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
                          placeholder="Search by name, roll number, or student ID..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 h-11"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      {filteredStudents.map((student, index) => (
                        <motion.div
                          key={student.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 * index }}
                          className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <div>
                            <div className="font-medium">{student.name}</div>
                            <div className="text-sm text-gray-500">
                              {student.rollNumber} • {student.studentId}
                            </div>
                          </div>
                          <Button
                            onClick={() => toggleAttendance(student.id)}
                            variant={student.present ? "default" : "outline"}
                            className={student.present ? "bg-green-600 hover:bg-green-700" : ""}
                          >
                            {student.present ? (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Present
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-4 h-4 mr-2" />
                                Mark Present
                              </>
                            )}
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-6">
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      {selectedClass.name} Summary
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
                          <span>{Math.round((presentCount / studentList.length) * 100)}%</span>
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
                        • Records are specific to {selectedClass.subject} - {selectedClass.name}
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
                          <div className="font-bold text-lg">{cls.avgAttendance}%</div>
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
                    onClick={exportToExcel}
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
                        <p className="text-sm text-gray-600 dark:text-gray-400">EMP001</p>
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