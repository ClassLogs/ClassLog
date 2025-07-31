"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { QRCodeSection } from "@/components/qr-code-section"
import { TeacherAttendanceHistory } from "@/components/teacher-attendance-history"
import { ManualAttendance } from "@/components/manual-attendance"
import { LogOut, Clock, Calendar, BookOpen, Users } from "lucide-react"

// Teacher data with subjects and classes
const TEACHER_DATA = {
  teacher123: {
    name: "Dr. Sarah Johnson",
    subject: "DSOOPS", // Each teacher has one subject
    classes: ["G4", "G5", "G8"], // But teaches multiple classes
  },
  teacher456: {
    name: "Prof. Mike Chen",
    subject: "DBMS",
    classes: ["G4", "G5", "G8"],
  },
  teacher789: {
    name: "Dr. Emily Davis",
    subject: "OOSE",
    classes: ["G4", "G5", "G8"],
  },
  teacher101: {
    name: "Mr. John Smith",
    subject: "FEE",
    classes: ["G4", "G5", "G8"],
  },
}

const SUBJECT_NAMES = {
  DSOOPS: "Data Structures & Object Oriented Programming",
  DBMS: "Database Management Systems",
  OOSE: "Object Oriented Software Engineering",
  FEE: "Fundamentals of Electrical Engineering",
}

export default function DashboardPage() {
  const [teacherName, setTeacherName] = useState("")
  const [teacherId, setTeacherId] = useState("teacher123")
  const [teacherSubject, setTeacherSubject] = useState("")
  const [teacherClasses, setTeacherClasses] = useState<string[]>([])
  const [selectedClass, setSelectedClass] = useState("")
  const [currentTime, setCurrentTime] = useState(new Date())
  const router = useRouter()

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("authToken")
    const name = localStorage.getItem("teacherName")

    if (!token) {
      router.push("/")
      return
    }

    setTeacherName(name || "Teacher")

    // Get teacher data based on login (in real app, this would come from backend)
    const teacherData = TEACHER_DATA[teacherId as keyof typeof TEACHER_DATA]
    if (teacherData) {
      setTeacherSubject(teacherData.subject)
      setTeacherClasses(teacherData.classes)

      // Set default class
      if (teacherData.classes.length > 0 && !selectedClass) {
        setSelectedClass(teacherData.classes[0])
      }
    }

    // Update clock every second
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [router, teacherId, selectedClass])

  const handleLogout = () => {
    localStorage.removeItem("authToken")
    localStorage.removeItem("teacherName")
    router.push("/")
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Hybrid Attendance System</h1>
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
          <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Welcome back, {teacherName}!</h2>
                  <div className="flex items-center space-x-4 text-blue-100">
                    <div className="flex items-center space-x-1">
                      <BookOpen className="h-4 w-4" />
                      <span>{teacherSubject}</span>
                    </div>
                    {selectedClass && (
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>Class {selectedClass}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="hidden sm:block">
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    Online
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subject & Class Info */}
        <div className="mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-medium text-slate-800">{teacherSubject}</div>
                      <div className="text-sm text-slate-600">
                        {SUBJECT_NAMES[teacherSubject as keyof typeof SUBJECT_NAMES]}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-green-600" />
                    <div>
                      <label className="text-sm font-medium text-slate-700 block">Select Class</label>
                      <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Class" />
                        </SelectTrigger>
                        <SelectContent>
                          {teacherClasses.map((classCode) => (
                            <SelectItem key={classCode} value={classCode}>
                              <div className="font-medium">{classCode}</div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {selectedClass && (
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">{teacherSubject}</Badge>
                    <Badge className="bg-green-100 text-green-800 border-green-200">Class {selectedClass}</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {teacherSubject && selectedClass ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* QR Code Section */}
            <div className="space-y-6">
              <QRCodeSection selectedSubject={teacherSubject} selectedClass={selectedClass} />
              <ManualAttendance selectedSubject={teacherSubject} selectedClass={selectedClass} />
            </div>

            {/* Attendance History */}
            <div className="space-y-6">
              <TeacherAttendanceHistory selectedSubject={teacherSubject} selectedClass={selectedClass} />
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-16 w-16 mx-auto mb-4 text-slate-400" />
              <h3 className="text-lg font-medium text-slate-800 mb-2">Select Class</h3>
              <p className="text-slate-600">
                Please select a class from the dropdown above to start managing attendance.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
