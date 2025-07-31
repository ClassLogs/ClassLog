"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  History,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  BarChart3,
  BookOpen,
} from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface StudentAttendanceRecord {
  sessionId: string
  date: string
  time: string
  subject: string
  teacher: string
  status: "present" | "absent" | "late"
  markedAt?: string
}

interface SubjectStats {
  subject: string
  totalClasses: number
  presentClasses: number
  absentClasses: number
  lateClasses: number
  attendancePercentage: number
  isBelow75: boolean
  classesToAttendMore?: number // New field for projection
  classesCanBunk?: number // New field for projection
}

const SUBJECTS = ["DSOOPS", "DBMS", "OOSE", "FEE"]
const TEACHERS = {
  DSOOPS: "Dr. Sarah Johnson",
  DBMS: "Prof. Mike Chen",
  OOSE: "Dr. Emily Davis",
  FEE: "Mr. John Smith",
}

// Define chart colors using HSL values from tailwind.config.ts
const COLORS = {
  present: "hsl(var(--chart-1))", // Greenish
  late: "hsl(var(--chart-2))", // Yellowish
  absent: "hsl(var(--chart-3))", // Reddish
}

export function StudentAttendanceHistory() {
  const [records, setRecords] = useState<StudentAttendanceRecord[]>([])
  const [subjectStats, setSubjectStats] = useState<SubjectStats[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSubject, setSelectedSubject] = useState<string>("all")

  const recordsPerPage = 8

  // Generate mock data and calculate statistics
  useEffect(() => {
    const generateMockData = () => {
      // Check for existing records first
      const existingRecords = JSON.parse(localStorage.getItem("studentAttendanceRecords") || "[]")

      const mockRecords: StudentAttendanceRecord[] = [...existingRecords]

      // Generate additional mock data if needed
      if (mockRecords.length < 50) {
        for (let i = mockRecords.length; i < 50; i++) {
          const date = new Date()
          date.setDate(date.getDate() - Math.floor(i / 4)) // 4 subjects per day

          const subject = SUBJECTS[i % SUBJECTS.length]
          const status = Math.random() > 0.25 ? "present" : Math.random() > 0.7 ? "late" : "absent"

          mockRecords.push({
            sessionId: `ATT-${Date.now() - i * 3600000}`,
            date: date.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            }),
            time: `${Math.floor(Math.random() * 4) + 9}:${Math.random() > 0.5 ? "00" : "30"}`,
            subject,
            teacher: TEACHERS[subject as keyof typeof TEACHERS],
            status,
            markedAt:
              status !== "absent"
                ? `${Math.floor(Math.random() * 4) + 9}:${Math.floor(Math.random() * 60)
                    .toString()
                    .padStart(2, "0")}`
                : undefined,
          })
        }
      }

      // Calculate subject-wise statistics and projections
      const stats: SubjectStats[] = SUBJECTS.map((subject) => {
        const subjectRecords = mockRecords.filter((r) => r.subject === subject)
        const totalClasses = subjectRecords.length
        const presentClasses = subjectRecords.filter((r) => r.status === "present").length
        const lateClasses = subjectRecords.filter((r) => r.status === "late").length
        const absentClasses = subjectRecords.filter((r) => r.status === "absent").length
        const attendedClasses = presentClasses + lateClasses
        const attendancePercentage = totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 0

        let classesToAttendMore: number | undefined
        let classesCanBunk: number | undefined

        if (attendancePercentage < 75) {
          // Calculate classes to attend more to reach 75%
          // (attended + X) / (total + X) >= 0.75
          // attended + X >= 0.75 * total + 0.75 * X
          // 0.25 * X >= 0.75 * total - attended
          // X >= (0.75 * total - attended) / 0.25
          const needed = Math.ceil((0.75 * totalClasses - attendedClasses) / 0.25)
          classesToAttendMore = Math.max(0, needed) // Ensure it's not negative
        } else {
          // Calculate classes that can be bunked while maintaining 75%
          // (attended - X) / total >= 0.75
          // attended - X >= 0.75 * total
          // X <= attended - 0.75 * total
          const canBunk = Math.floor(attendedClasses - 0.75 * totalClasses)
          classesCanBunk = Math.max(0, canBunk) // Ensure it's not negative
        }

        return {
          subject,
          totalClasses,
          presentClasses,
          absentClasses,
          lateClasses,
          attendancePercentage,
          isBelow75: attendancePercentage < 75,
          classesToAttendMore,
          classesCanBunk,
        }
      })

      setRecords(mockRecords)
      setSubjectStats(stats)
      setIsLoading(false)
    }

    setTimeout(generateMockData, 1000)
  }, [])

  // Filter records based on selected subject
  const filteredRecords = selectedSubject === "all" ? records : records.filter((r) => r.subject === selectedSubject)

  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage)
  const startIndex = (currentPage - 1) * recordsPerPage
  const endIndex = startIndex + recordsPerPage
  const currentRecords = filteredRecords.slice(startIndex, endIndex)

  // Overall statistics for charts
  const overallStats = {
    totalClasses: records.length,
    presentClasses: records.filter((r) => r.status === "present").length,
    lateClasses: records.filter((r) => r.status === "late").length,
    absentClasses: records.filter((r) => r.status === "absent").length,
  }
  const overallAttendance =
    overallStats.totalClasses > 0
      ? Math.round(((overallStats.presentClasses + overallStats.lateClasses) / overallStats.totalClasses) * 100)
      : 0

  const pieChartData = [
    { name: "Present", value: overallStats.presentClasses, color: COLORS.present },
    { name: "Late", value: overallStats.lateClasses, color: COLORS.late },
    { name: "Absent", value: overallStats.absentClasses, color: COLORS.absent },
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "late":
        return <Clock className="h-4 w-4 text-yellow-600" />
      case "absent":
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Present</Badge>
      case "late":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Late</Badge>
      case "absent":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Absent</Badge>
      default:
        return null
    }
  }

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 85) return "text-green-600"
    if (percentage >= 75) return "text-yellow-600"
    return "text-red-600"
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 85) return "bg-green-500"
    if (percentage >= 75) return "bg-yellow-500"
    return "bg-red-500"
  }

  if (isLoading) {
    return (
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="h-5 w-5 text-slate-600" />
            <span>Attendance Analytics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Check for low attendance alerts
  const lowAttendanceSubjects = subjectStats.filter((s) => s.isBelow75)

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5 text-slate-600" />
          <span>Attendance Analytics</span>
        </CardTitle>
        <CardDescription>Subject-wise attendance tracking and insights</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Low Attendance Alerts */}
            {lowAttendanceSubjects.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">⚠️ Low Attendance Alert!</div>
                  <div className="text-sm">
                    Your attendance is below 75% in: {lowAttendanceSubjects.map((s) => s.subject).join(", ")}
                    <br />
                    <span className="font-medium">Action required to maintain minimum attendance.</span>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Overall Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`p-4 rounded-lg text-center ${overallAttendance >= 75 ? "bg-green-50" : "bg-red-50"}`}>
                <div className={`text-2xl font-bold ${getAttendanceColor(overallAttendance)}`}>
                  {overallAttendance}%
                </div>
                <div className="text-xs text-slate-600">Overall Attendance</div>
                {overallAttendance >= 75 ? (
                  <TrendingUp className="h-4 w-4 mx-auto mt-1 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 mx-auto mt-1 text-red-600" />
                )}
              </div>
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{overallStats.presentClasses}</div>
                <div className="text-xs text-blue-700">Present</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-yellow-600">{overallStats.lateClasses}</div>
                <div className="text-xs text-yellow-700">Late</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">{overallStats.absentClasses}</div>
                <div className="text-xs text-red-700">Absent</div>
              </div>
            </div>

            {/* Overall Attendance Pie Chart */}
            <div className="space-y-4">
              <h4 className="font-medium text-slate-800">Overall Attendance Distribution</h4>
              <ChartContainer
                config={{
                  present: { label: "Present", color: COLORS.present },
                  late: { label: "Late", color: COLORS.late },
                  absent: { label: "Absent", color: COLORS.absent },
                }}
                className="h-[250px] w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            {/* Subject-wise Statistics */}
            <div className="space-y-4">
              <h4 className="font-medium text-slate-800">Subject-wise Attendance</h4>
              {subjectStats.map((stat) => (
                <div key={stat.subject} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{stat.subject}</span>
                      {stat.isBelow75 && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Below 75%
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${getAttendanceColor(stat.attendancePercentage)}`}>
                        {stat.attendancePercentage}%
                      </span>
                      <span className="text-xs text-slate-500">
                        ({stat.presentClasses + stat.lateClasses}/{stat.totalClasses})
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(stat.attendancePercentage)}`}
                      style={{ width: `${stat.attendancePercentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Present: {stat.presentClasses}</span>
                    <span>Late: {stat.lateClasses}</span>
                    <span>Absent: {stat.absentClasses}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Attendance Projection */}
            <div className="space-y-4">
              <h4 className="font-medium text-slate-800">Attendance Projection (75% Target)</h4>
              {subjectStats.map((stat) => (
                <Card key={`projection-${stat.subject}`} className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <BookOpen className="h-4 w-4 text-slate-600" />
                    <span className="font-semibold">{stat.subject}</span>
                  </div>
                  {stat.attendancePercentage < 75 ? (
                    <Alert className="bg-orange-50 border-orange-200 text-orange-800">
                      <AlertDescription>
                        You need to attend <span className="font-bold">{stat.classesToAttendMore} more classes</span> to
                        reach 75% attendance in {stat.subject}.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="bg-green-50 border-green-200 text-green-800">
                      <AlertDescription>
                        You can bunk up to <span className="font-bold">{stat.classesCanBunk} classes</span> in{" "}
                        {stat.subject} and still maintain 75% attendance.
                      </AlertDescription>
                    </Alert>
                  )}
                </Card>
              ))}
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
                    <TableHead className="font-semibold">Date & Time</TableHead>
                    <TableHead className="font-semibold">Subject</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Marked At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentRecords.map((record, index) => (
                    <TableRow
                      key={record.sessionId}
                      className={`hover:bg-slate-50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-slate-25"}`}
                    >
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium flex items-center space-x-2">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            <span>{record.date}</span>
                          </div>
                          <div className="text-slate-500 flex items-center space-x-2 mt-1">
                            <Clock className="h-3 w-3" />
                            <span>{record.time}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{record.subject}</div>
                          <div className="text-slate-500">{record.teacher}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(record.status)}
                          {getStatusBadge(record.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {record.markedAt ? (
                            <span className="text-slate-600">{record.markedAt}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </div>
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
                  records
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
