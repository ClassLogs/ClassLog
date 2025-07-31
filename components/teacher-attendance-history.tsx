"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Download, History, ChevronLeft, ChevronRight, FileText, BarChart3, TrendingUp } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AttendanceRecord {
  sessionId: string
  subject: string
  class: string
  date: string
  time: string
  studentsPresent: number
  totalStudents: number
  status: "completed" | "active"
}

interface TeacherAttendanceHistoryProps {
  selectedSubject: string
  selectedClass: string
}

export function TeacherAttendanceHistory({ selectedSubject, selectedClass }: TeacherAttendanceHistoryProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [exportingId, setExportingId] = useState<string | null>(null)
  const { toast } = useToast()

  const recordsPerPage = 8

  // Generate mock data filtered by selected subject and class
  useEffect(() => {
    const generateMockData = () => {
      // Get existing sessions from localStorage
      const existingSessions = JSON.parse(localStorage.getItem("teacherSessions") || "[]")

      // Filter by selected subject and class
      const filteredRecords = existingSessions.filter(
        (record: AttendanceRecord) => record.subject === selectedSubject && record.class === selectedClass,
      )

      // Generate additional mock data if needed
      if (filteredRecords.length < 10) {
        for (let i = filteredRecords.length; i < 10; i++) {
          const date = new Date()
          date.setDate(date.getDate() - i)

          filteredRecords.push({
            sessionId: `ATT-${selectedSubject}-${selectedClass}-${Date.now() - i * 86400000}`,
            subject: selectedSubject,
            class: selectedClass,
            date: date.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            }),
            time: date.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            studentsPresent: Math.floor(Math.random() * 8) + 12, // 12-20 students for smaller classes
            totalStudents: 20,
            status: i === 0 ? "active" : "completed",
          })
        }
      }

      setRecords(filteredRecords)
      setIsLoading(false)
    }

    setIsLoading(true)
    setTimeout(generateMockData, 500)
  }, [selectedSubject, selectedClass])

  const totalPages = Math.ceil(records.length / recordsPerPage)
  const startIndex = (currentPage - 1) * recordsPerPage
  const endIndex = startIndex + recordsPerPage
  const currentRecords = records.slice(startIndex, endIndex)

  // Calculate analytics for this specific subject-class combination
  const completedRecords = records.filter((r) => r.status === "completed")
  const averageAttendance =
    completedRecords.length > 0
      ? Math.round(
          completedRecords.reduce((sum, r) => sum + (r.studentsPresent / r.totalStudents) * 100, 0) /
            completedRecords.length,
        )
      : 0

  const highestAttendance =
    completedRecords.length > 0
      ? Math.round(Math.max(...completedRecords.map((r) => (r.studentsPresent / r.totalStudents) * 100)))
      : 0

  const lowestAttendance =
    completedRecords.length > 0
      ? Math.round(Math.min(...completedRecords.map((r) => (r.studentsPresent / r.totalStudents) * 100)))
      : 0

  const handleExport = async (sessionId: string) => {
    setExportingId(sessionId)

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const record = records.find((r) => r.sessionId === sessionId)
      const csvContent = `Subject,Class,Session ID,Date,Time,Students Present,Total Students,Attendance Rate
${selectedSubject},${selectedClass},${sessionId},${record?.date},${record?.time},${record?.studentsPresent},${record?.totalStudents},${Math.round(((record?.studentsPresent || 0) / (record?.totalStudents || 1)) * 100)}%

Student Details (Mock Data):
Student Name,Student ID,Check-in Time,Status
John Doe,${selectedClass}001,${record?.time},Present
Jane Smith,${selectedClass}002,${record?.time},Present
Mike Johnson,${selectedClass}003,${record?.time},Present`

      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${selectedSubject}-${selectedClass}-attendance-${sessionId.slice(-8)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast({
        title: "Export Successful",
        description: `${selectedSubject} - Class ${selectedClass} attendance report downloaded.`,
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
            <span>
              {selectedSubject} - Class {selectedClass}
            </span>
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
          <span>
            {selectedSubject} - Class {selectedClass}
          </span>
        </CardTitle>
        <CardDescription>
          Attendance analytics for {selectedSubject} in Class {selectedClass}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Class Analytics */}
        <div className="bg-slate-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className="font-medium">Class {selectedClass} Performance</span>
            </div>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Average Attendance</span>
              <span className="font-medium">{averageAttendance}%</span>
            </div>
            <Progress value={averageAttendance} className="h-2" />

            <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 mt-3">
              <div className="text-center">
                <div className="font-medium text-green-600">{highestAttendance}%</div>
                <div>Highest</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-blue-600">{completedRecords.length}</div>
                <div>Sessions</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-red-600">{lowestAttendance}%</div>
                <div>Lowest</div>
              </div>
            </div>
          </div>
        </div>

        {/* Session History Table */}
        <div className="space-y-4">
          <h4 className="font-medium text-slate-800">Recent Sessions</h4>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold">Session</TableHead>
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
                        <code className="text-xs bg-slate-100 px-2 py-1 rounded">{record.sessionId.slice(-8)}</code>
                        {record.status === "active" && (
                          <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Active</Badge>
                        )}
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
                        onClick={() => handleExport(record.sessionId)}
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
                Showing {startIndex + 1}-{Math.min(endIndex, records.length)} of {records.length} sessions
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
        </div>
      </CardContent>
    </Card>
  )
}
