"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  QrCode,
  User,
  Calendar,
  CheckCircle,
  XCircle,
  BarChart3,
  LogOut,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Database,
  Wifi,
  Settings,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { ThemeToggle } from "@/components/theme-toggle"
import { MobileQRScanner } from "@/components/mobile-qr-scanner"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface AttendanceRecord {
  id: string
  date: string
  time: string
  subject: string
  teacher: string
  status: "present" | "absent" | "late"
  markedAt?: string
  session_name?: string
}

interface SubjectStats {
  subject: string
  totalClasses: number
  attendedClasses: number
  percentage: number
  requiredFor75: number
  canMiss: number
}




export default function StudentPortal() {
  const [currentStep, setCurrentStep] = useState(0)
  const [currentDateTime, setCurrentDateTime] = useState("")
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([])
  const [subjectStats, setSubjectStats] = useState<SubjectStats[]>([])

  const router = useRouter()
  const { toast } = useToast()

  const [userName, setUserName] = useState("")
  const [studentId, setStudentId] = useState("")
  const [studentGroup, setStudentGroup] = useState("")
  const [studentSemester, setStudentSemester] = useState("")
const [students, setStudents] = useState([])
const [API_BASE_URL, setApiBaseUrl] = useState("")

  useEffect(() => {
    const baseUrl =
      window.location.hostname === "localhost"
        ? "http://localhost:5000"
        : "https://classlog-e5h3.onrender.com"

    setApiBaseUrl(baseUrl)
  }, [])

  // Check authentication and load user data
  useEffect(() => {
    const token = localStorage.getItem("userToken")
    const userType = localStorage.getItem("userType")
    if (!token || userType !== "student") {
      router.push("/")
    } else {
      setUserName(localStorage.getItem("userName") || "Student")
      setStudentId(localStorage.getItem("studentId") || "N/A")
      setStudentGroup(localStorage.getItem("studentGroup") || "N/A")
      setStudentSemester(localStorage.getItem("studentSemester") || "N/A")
    }
  }, [router])

  // Dynamic Indian Date & Time
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

  const handleLogout = () => {
    localStorage.removeItem("userToken")
    localStorage.removeItem("userType")
    localStorage.removeItem("userName")
    localStorage.removeItem("studentId")
    localStorage.removeItem("studentGroup")
    localStorage.removeItem("studentSemester")

    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    })

    router.push("/")
  }

  // Fetch student attendance history with total sessions
  const fetchAttendanceHistory = async () => {
    if (!studentId || studentId === "N/A") return

    try {
      const res = await fetch(`${API_BASE_URL}/api/get-student-attendance-with-totals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      })
      const data = await res.json()
      if (data.success) {
        // Set attendance history
        setAttendanceHistory(
          data.attendance.map((rec: any) => ({
            id: rec.id?.toString(),
            date: new Date(rec.date).toLocaleDateString("en-IN"),
            time: rec.time || "",
            subject: rec.subject || "N/A",
            teacher: rec.teacher || "N/A",
            status: rec.status,
            markedAt: rec.marked_at ? new Date(rec.marked_at).toLocaleTimeString("en-IN") : "",
            session_name: rec.session_name || "N/A",
          })),
        )

        // Set subject statistics with total sessions
        setSubjectStats(data.subjectStats || [])
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to fetch attendance history.",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Error fetching student attendance:", err)
      toast({
        title: "Error",
        description: "Failed to connect to server to fetch attendance history.",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    fetchAttendanceHistory()
  }, [studentId])

  const handleScanSuccess = async (scannedQrCode: string) => {
    if (!studentId || studentId === "N/A") {
      toast({
        title: "Error",
        description: "Student ID not found. Please log in again.",
        variant: "destructive",
      })
      return
    }

    const parts = scannedQrCode.split("_")
    if (parts.length !== 2) {
      toast({
        title: "Invalid QR Code",
        description: "The scanned QR code format is incorrect.",
        variant: "destructive",
      })
      return
    }

    const sessionId = parts[0]
    const scannedTimestamp = Number.parseInt(parts[1], 10)

    if (isNaN(scannedTimestamp)) {
      toast({
        title: "Invalid QR Code",
        description: "The scanned QR code contains an invalid timestamp.",
        variant: "destructive",
      })
      return
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/student-qr-attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, studentId, scannedTimestamp }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Attendance Marked", description: "Your attendance has been recorded!" })
        fetchAttendanceHistory() // Refresh attendance history after successful scan
      } else {
        if (data.message === "QR_EXPIRED") {
          toast({
            title: "QR Expired",
            description: "The QR code has expired. Please ask your teacher for a new QR code.",
            variant: "destructive",
          })
        } else {
          toast({ title: "Error", description: data.message, variant: "destructive" })
        }
      }
    } catch (err) {
      console.error("QR Scan API error:", err)
      toast({
        title: "Scan Error",
        description: "Failed to connect to server or process scan.",
        variant: "destructive",
      })
    }
  }

  const handleScanError = (error: string) => {
    console.error("QR Scan error:", error)
    toast({
      title: "Scan Error",
      description: error,
      variant: "destructive",
    })
  }

  const flowSteps = [
    { icon: QrCode, title: "Scan QR", description: "Point camera at QR code" },
    { icon: Wifi, title: "Send Data", description: "Transmit to server" },
    { icon: Database, title: "Validate", description: "Check authenticity" },
    { icon: CheckCircle, title: "Success", description: "Attendance marked" },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/95 dark:bg-gray-800/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-xl">Student Portal</h1>
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
                      <User className="w-5 h-5" />
                      {studentId}
                    </span>
                    <span className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Semester {studentSemester} - Group {studentGroup}
                    </span>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/20">
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Dashboard */}
        <Tabs defaultValue="scanner" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="scanner" className="flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              QR Scanner
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="flowchart" className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4" />
              Flow Process
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Panel 1: QR Scanner */}
          <TabsContent value="scanner" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Mobile QR Scanner */}
              <div className="flex justify-center">
                <MobileQRScanner
                  onScanSuccess={handleScanSuccess}
                  onScanError={handleScanError}
                  apiEndpoint="/api/student-qr-attendance"
                  className="w-full max-w-md"
                />
              </div>

              {/* Scanner Info */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Scanner Information</CardTitle>
                  <CardDescription>Real-time QR code scanning with camera flip</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                      <div className="2xl font-bold text-blue-600">READY</div>
                      <div className="text-sm text-gray-500">Scanner Status</div>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                      <div className="2xl font-bold text-green-600">ACTIVE</div>
                      <div className="text-sm text-gray-500">Camera Status</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Features:</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-green-500">✓</Badge>
                        <span className="text-sm">Real camera access</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className="bg-green-500">✓</Badge>
                        <span className="text-sm">Front/back camera flip</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className="bg-green-500">✓</Badge>
                        <span className="text-sm">Auto permission handling</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className="bg-green-500">✓</Badge>
                        <span className="text-sm">Mobile optimized</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <h4 className="font-medium mb-2 text-blue-800 dark:text-blue-200">Instructions:</h4>
                    <ul className="text-sm space-y-1 text-blue-600 dark:text-blue-300">
                      <li>• Click "Start Camera" to begin</li>
                      <li>• Use "Flip Camera" to switch cameras</li>
                      <li>• Point at QR code to scan</li>
                      <li>• Wait for automatic detection</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Panel 2: Attendance Summary */}
          <TabsContent value="summary" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Subject-wise Attendance */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Subject-wise Attendance
                  </CardTitle>
                  <CardDescription>Your attendance percentage for each subject</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {subjectStats.length > 0 ? (
                    subjectStats.map((stat) => (
                      <div key={stat.subject} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{stat.subject}</div>
                          <Badge
                            variant={stat.percentage >= 75 ? "default" : "destructive"}
                            className={
                              stat.percentage >= 75 ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
                            }
                          >
                            {stat.percentage}%
                          </Badge>
                        </div>

                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {stat.attendedClasses}/{stat.totalClasses} classes attended
                        </div>

                        <Progress value={stat.percentage} className="h-3" />

                        {stat.percentage < 75 ? (
                          <div className="flex items-center gap-2 text-sm p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            <span className="text-red-600 dark:text-red-400">
                              Need {stat.requiredFor75} more classes to reach 75%
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <TrendingUp className="w-4 h-4 text-green-500" />
                            <span className="text-green-600 dark:text-green-400">
                              Can miss {stat.canMiss} more classes and stay above 75%
                            </span>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500">No attendance data available yet.</p>
                  )}
                </CardContent>
              </Card>

              {/* Recent Attendance */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Recent Attendance</CardTitle>
                  <CardDescription>Your latest attendance records</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {attendanceHistory.length > 0 ? (
                      attendanceHistory.slice(0, 6).map((record, index) => (
                        <motion.div
                          key={record.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 * index }}
                          className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-sm">
                              <div className="font-medium">{record.date}</div>
                              <div className="text-gray-500">{record.time}</div>
                            </div>
                            <div>
                              <div className="font-medium text-sm">{record.subject}</div>
                              <div className="text-xs text-gray-500">{record.teacher}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                record.status === "present"
                                  ? "default"
                                  : record.status === "late"
                                    ? "secondary"
                                    : "destructive"
                              }
                              className={
                                record.status === "present"
                                  ? "bg-green-500 hover:bg-green-600"
                                  : record.status === "late"
                                    ? "bg-yellow-500 hover:bg-yellow-600"
                                    : "bg-red-500 hover:bg-red-600"
                              }
                            >
                              {record.status === "present" ? (
                                <CheckCircle className="w-3 h-3 mr-1" />
                              ) : (
                                <XCircle className="w-3 h-3 mr-1" />
                              )}
                              {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                            </Badge>
                            {record.markedAt && <span className="text-xs text-gray-500">{record.markedAt}</span>}
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <p className="text-center text-gray-500">No recent attendance records.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Panel 3: Flow Process */}
          <TabsContent value="flowchart" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRight className="w-5 h-5" />
                  Attendance Flow Process
                </CardTitle>
                <CardDescription>Visual timeline showing how attendance marking works</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="relative">
                  {/* Flow Steps */}
                  <div className="flex items-center justify-between mb-8">
                    {flowSteps.map((step, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.2 }}
                        className={`flex flex-col items-center text-center ${
                          currentStep >= index + 1 ? "text-blue-600" : "text-gray-400"
                        }`}
                      >
                        <div
                          className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-all duration-300 ${
                            currentStep >= index + 1
                              ? "bg-blue-600 text-white shadow-lg"
                              : "bg-gray-200 dark:bg-gray-700 text-gray-400"
                          }`}
                        >
                          <step.icon className="w-8 h-8" />
                        </div>
                        <h3 className="font-semibold mb-1">{step.title}</h3>
                        <p className="text-sm">{step.description}</p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Progress Line */}
                  <div className="absolute top-8 left-8 right-8 h-0.5 bg-gray-200 dark:bg-gray-700">
                    <motion.div
                      className="h-full bg-blue-600"
                      initial={{ width: "0%" }}
                      animate={{ width: `${(currentStep / (flowSteps.length - 1)) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Panel 4: Settings */}
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
                        <p className="font-medium">Student ID</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{studentId}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <p className="font-medium">Full Name</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{userName}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <p className="font-medium">Course</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          semester {studentSemester} - Group {studentGroup}
                        </p>
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
                    Download Attendance Report
                  </Button>
                  <Button variant="outline" className="w-full justify-start h-12 bg-transparent">
                    <Calendar className="w-5 h-5 mr-3" />
                    View Academic Calendar
                  </Button>
                  <Button variant="outline" className="w-full justify-start h-12 bg-transparent">
                    <User className="w-5 h-5 mr-3" />
                    Update Profile
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
