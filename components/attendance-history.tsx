"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Download, History, ChevronLeft, ChevronRight, FileText, BarChart3, TrendingUp, BookOpen } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AttendanceRecord {
  sessionId: string
  subject: string
  date: string
  time: string
  studentsPresent: number
  totalStudents: number
  status: "completed" | "active"
}

interface SubjectAnalytics {
  subject: string
  totalSessions: number
  averageAttendance: number
  highestAttendance: number
  lowestAttendance: number
  trend: "up" | "down" | "stable"
}

const SUBJECTS = ["DSOOPS", "DBMS", "OOSE", "FEE"]
const SUBJECT_NAMES = {
  DSOOPS: "Data Structures & OOP",
  DBMS: "Database Management Systems",
  OOSE: "Object Oriented Software Engineering",
  FEE: "Fundamentals of Electrical Engineering",
}

export function AttendanceHistory() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [analytics, setAnalytics] = useState<SubjectAnalytics[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [exportingId, setExportingId] = useState<string | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<string>("all")
  const { toast } = useToast()

  const recordsPerPage = 6

  // Mock data generation with subject-wise records
  useEffect(() => {
    const generateMockData = () => {
      // Get existing sessions from localStorage
      const existingSessions = JSON.parse(localStorage.getItem("teacherSessions") || "[]")

      const mockRecords: AttendanceRecord[] = [...existingSessions]

      // Generate additional mock data if needed
      if (mockRecords.length < 30) {
        for (let i = mockRecords.length; i < 30; i++) {
          const date = new Date()
          date.setDate(date.getDate() - Math.floor(i / 4))

          const subject = SUBJECTS[i % SUBJECTS.length]

          mockRecords.push({
            sessionId: `ATT-${subject}-${Date.now() - i * 86400000}`,
            subject,
            date: date.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            }),
            time: date.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            studentsPresent: Math.floor(Math.random() * 15) + 25, // 25-40 students
            totalStudents: 45,
            status: i === 0 ? "active" : "completed",
          })
        }
      }

      // Calculate subject-wise analytics
      const subjectAnalytics: SubjectAnalytics[] = SUBJECTS.map((subject) => {
        const subjectRecords = mockRecords.filter((r) => r.subject === subject && r.status === "completed")
        const attendanceRates = subjectRecords.map((r) => (r.studentsPresent / r.totalStudents) * 100)

        const averageAttendance =
          attendanceRates.length > 0
            ? Math.round(attendanceRates.reduce((a, b) => a + b, 0) / attendanceRates.length)
            : 0

        const highestAttendance = attendanceRates.length > 0 ? Math.round(Math.max(...attendanceRates)) : 0
        const lowestAttendance = attendanceRates.length > 0 ? Math.round(Math.min(...attendanceRates)) : 0

        // Simple trend calculation (comparing first half vs second half)
        const midPoint = Math.floor(attendanceRates.length / 2)
        const firstHalf = attendanceRates.slice(0, midPoint)
        const secondHalf = attendanceRates.slice(midPoint)

        const firstHalfAvg = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0
        const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 0

        let trend: "up" | "down" | "stable" = "stable"
        if (secondHalfAvg > firstHalfAvg + 2) trend = "up"
        else if (secondHalfAvg < firstHalfAvg - 2) trend = "down"

        return {
          subject,
          totalSessions: subjectRecords.length,
          averageAttendance,
          highestAttendance,
          lowestAttendance,
          trend,
        }
      })

      setRecords(mockRecords)
      setAnalytics(subjectAnalytics)
      setIsLoading(false)
    }

    setTimeout(generateMockData, 1000)
  }, [])

  // Filter records by subject
  const filteredRecords = selectedSubject === "all" ? records : records.filter((r) => r.subject === selectedSubject)

  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage)
  const startIndex = (currentPage - 1) * recordsPerPage
  const endIndex = startIndex + recordsPerPage
  const currentRecords = filteredRecords.slice(startIndex, endIndex)

  const handleExport = async (sessionId: string, subject: string) => {
    setExportingId(sessionId)

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const record = records.find((r) => r.sessionId === sessionId)
      const csvContent = `Subject,Session ID,Date,Time,Students Present,Total Students,Attendance Rate
${subject},${sessionId},${record?.date},${record?.time},${record?.studentsPresent},${record?.totalStudents},${Math.round(((record?.studentsPresent || 0) / (record?.totalStudents || 1)) * 100)}%

Student Details (Mock Data):
Student Name,Student ID,Check-in Time,Status
John Doe,STU001,${record?.time},Present
Jane Smith,STU002,${record?.time},Present
Mike Johnson,STU003,${record?.time},Present
Sarah Wilson,STU004,${record?.time},Late
David Brown,STU005,${record?.time},Present`

      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${subject}-attendance-${sessionId.slice(-8)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast({
        title: "Export Successful",
        description: `${subject} attendance report has been downloaded.`,
      })
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export attendance report. Please try again.",
        variant: "destructive",
      })
    } finally {
      setExportingId(null)
    }
  }

  if (isLoading) {
    return (
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="h-5 w-5 text-slate-600" />
            <span>Subject Analytics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5 text-slate-600" />
          <span>Subject Analytics</span>
        </CardTitle>
        <CardDescription>Subject-wise attendance tracking and insights</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6">
            {/* Subject Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analytics.map((analytic) => (
                <div key={analytic.subject} className="bg-slate-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <BookOpen className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">{analytic.subject}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <TrendingUp
                        className={`h-4 w-4 ${
                          analytic.trend === "up"
                            ? "text-green-600"
                            : analytic.trend === "down"
                              ? "text-red-600"
                              : "text-slate-400"
                        }`}
                      />
                      <span className="text-xs text-slate-500">{analytic.trend}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Average Attendance</span>
                      <span className="font-medium">{analytic.averageAttendance}%</span>
                    </div>
                    <Progress value={analytic.averageAttendance} className="h-2" />

                    <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 mt-3">
                      <div className="text-center">
                        <div className="font-medium text-green-600">{analytic.highestAttendance}%</div>
                        <div>Highest</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-blue-600">{analytic.totalSessions}</div>
                        <div>Sessions</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-red-600">{analytic.lowestAttendance}%</div>
                        <div>Lowest</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Overall Statistics */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-3">Overall Performance</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round(analytics.reduce((sum, a) => sum + a.averageAttendance, 0) / analytics.length) || 0}%
                  </div>
                  <div className="text-xs text-blue-700">Overall Average</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {analytics.reduce((sum, a) => sum + a.totalSessions, 0)}
                  </div>
                  <div className="text-xs text-green-700">Total Sessions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {analytics.filter((a) => a.trend === "up").length}
                  </div>
                  <div className="text-xs text-purple-700">Improving</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {analytics.filter((a) => a.averageAttendance < 75).length}
                  </div>
                  <div className="text-xs text-orange-700">Below 75%</div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {/* Subject Filter */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedSubject === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSelectedSubject("all")
                  setCurrentPage(1)
                }}
              >
                All Subjects
              </Button>
              {SUBJECTS.map((subject) => (
                <Button
                  key={subject}
                  variant={selectedSubject === subject ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectedSubject(subject)
                    setCurrentPage(1)
                  }}
                >
                  {subject}
                </Button>
              ))}
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold">Subject & Session</TableHead>
                    <TableHead className="font-semibold">Date & Time</TableHead>
                    <TableHead className="font-semibold">Attendance</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentRecords.map((record, index) => (
                    <TableRow
                      key={record.sessionId}
                      className={`hover:bg-slate-50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-slate-25"}`}
                    >
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">{record.subject}</Badge>
                          <code className="text-xs bg-slate-100 px-2 py-1 rounded">{record.sessionId.slice(-8)}</code>
                          {record.status === "active" && (
                            <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Active</Badge>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {SUBJECT_NAMES[record.subject as keyof typeof SUBJECT_NAMES]}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{record.date}</div>
                          <div className="text-slate-500">{record.time}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">
                            {record.studentsPresent}/{record.totalStudents}
                          </div>
                          <div className="text-slate-500">
                            {Math.round((record.studentsPresent / record.totalStudents) * 100)}% present
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExport(record.sessionId, record.subject)}
                          disabled={exportingId === record.sessionId}
                          className="flex items-center space-x-1"
                        >
                          {exportingId === record.sessionId ? (
                            <>
                              <Download className="h-3 w-3 animate-pulse" />
                              <span className="text-xs">Exporting...</span>
                            </>
                          ) : (
                            <>
                              <FileText className="h-3 w-3" />
                              <span className="text-xs">Export</span>
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredRecords.length)} of {filteredRecords.length}{" "}
                  sessions
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <div className="flex items-center space-x-1">
                    {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                      const pageNum = i + 1
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
