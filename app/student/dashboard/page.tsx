"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { QRScanner } from "@/components/qr-scanner"
import { StudentAttendanceHistory } from "@/components/student-attendance-history"
import { LogOut, Clock, Calendar, User, BookOpen } from "lucide-react"

export default function StudentDashboardPage() {
  const [studentName, setStudentName] = useState("")
  const [studentId, setStudentId] = useState("")
  const [studentClass, setStudentClass] = useState("")
  const [currentTime, setCurrentTime] = useState(new Date())
  const router = useRouter()

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("studentAuthToken")
    const name = localStorage.getItem("studentName")
    const id = localStorage.getItem("studentId")
    const studentClass = localStorage.getItem("studentClass")

    if (!token) {
      router.push("/student")
      return
    }

    setStudentName(name || "Student")
    setStudentId(id || "")
    setStudentClass(studentClass || "")

    // Update clock every second
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("studentAuthToken")
    localStorage.removeItem("studentName")
    localStorage.removeItem("studentId")
    localStorage.removeItem("studentClass")
    router.push("/student")
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Student Portal</h1>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-4 text-sm text-slate-600">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(currentTime)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span className="font-mono">{formatTime(currentTime)}</span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-transparent"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <Card className="bg-gradient-to-r from-green-600 to-green-700 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Welcome, {studentName}!</h2>
                  <div className="flex items-center space-x-4 text-green-100">
                    <div className="flex items-center space-x-1">
                      <User className="h-4 w-4" />
                      <span>{studentId}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <BookOpen className="h-4 w-4" />
                      <span>{studentClass}</span>
                    </div>
                  </div>
                </div>
                <div className="hidden sm:block">
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    Active
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* QR Scanner Section */}
          <div className="space-y-6">
            <QRScanner />
          </div>

          {/* Attendance History */}
          <div className="space-y-6">
            <StudentAttendanceHistory />
          </div>
        </div>
      </main>
    </div>
  )
}
