"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { UserPlus, Search, CheckCircle, XCircle, Users } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ManualAttendanceProps {
  selectedSubject: string
  selectedClass: string
}

interface Student {
  id: string
  name: string
  rollNumber: string
  isPresent: boolean
}

// Mock student data for different classes
const MOCK_STUDENTS: Record<string, Student[]> = {
  G4: [
    { id: "G4001", name: "John Doe", rollNumber: "G4-001", isPresent: false },
    { id: "G4002", name: "Jane Smith", rollNumber: "G4-002", isPresent: false },
    { id: "G4003", name: "Mike Johnson", rollNumber: "G4-003", isPresent: false },
    { id: "G4004", name: "Sarah Wilson", rollNumber: "G4-004", isPresent: false },
    { id: "G4005", name: "David Brown", rollNumber: "G4-005", isPresent: false },
  ],
  G5: [
    { id: "G5001", name: "Emily Davis", rollNumber: "G5-001", isPresent: false },
    { id: "G5002", name: "Alex Chen", rollNumber: "G5-002", isPresent: false },
    { id: "G5003", name: "Lisa Wang", rollNumber: "G5-003", isPresent: false },
    { id: "G5004", name: "Tom Anderson", rollNumber: "G5-004", isPresent: false },
    { id: "G5005", name: "Amy Taylor", rollNumber: "G5-005", isPresent: false },
  ],
  G8: [
    { id: "G8001", name: "Chris Martin", rollNumber: "G8-001", isPresent: false },
    { id: "G8002", name: "Sophie Turner", rollNumber: "G8-002", isPresent: false },
    { id: "G8003", name: "Ryan Garcia", rollNumber: "G8-003", isPresent: false },
    { id: "G8004", name: "Maya Patel", rollNumber: "G8-004", isPresent: false },
    { id: "G8005", name: "Jake Williams", rollNumber: "G8-005", isPresent: false },
  ],
}

export function ManualAttendance({ selectedSubject, selectedClass }: ManualAttendanceProps) {
  const [students, setStudents] = useState<Student[]>(MOCK_STUDENTS[selectedClass] || [])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Update students when class changes
  useState(() => {
    setStudents(MOCK_STUDENTS[selectedClass] || [])
  })

  // Filter students based on search term
  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.id.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Toggle student attendance
  const toggleAttendance = async (studentId: string) => {
    setIsLoading(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500))

      setStudents((prev) =>
        prev.map((student) => (student.id === studentId ? { ...student, isPresent: !student.isPresent } : student)),
      )

      const student = students.find((s) => s.id === studentId)
      const newStatus = !student?.isPresent

      // Store manual attendance record
      if (newStatus && student) {
        const attendanceRecord = {
          sessionId: `MANUAL-${selectedSubject}-${selectedClass}-${Date.now()}`,
          subject: selectedSubject,
          class: selectedClass,
          date: new Date().toISOString().split("T")[0],
          time: new Date().toLocaleTimeString(),
          status: "present",
          markedAt: new Date().toLocaleTimeString(),
          markedBy: "teacher",
          studentId: student.id,
          studentName: student.name,
        }

        const existingRecords = JSON.parse(localStorage.getItem("manualAttendanceRecords") || "[]")
        existingRecords.unshift(attendanceRecord)
        localStorage.setItem("manualAttendanceRecords", JSON.stringify(existingRecords))
      }

      toast({
        title: newStatus ? "Marked Present" : "Marked Absent",
        description: `${student?.name} marked ${newStatus ? "present" : "absent"} for ${selectedSubject} - Class ${selectedClass}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update attendance. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Mark all present
  const markAllPresent = async () => {
    setIsLoading(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setStudents((prev) => prev.map((student) => ({ ...student, isPresent: true })))

      toast({
        title: "Bulk Attendance Marked",
        description: `All students marked present for ${selectedSubject} - Class ${selectedClass}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark bulk attendance. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Reset all attendance
  const resetAttendance = () => {
    setStudents((prev) => prev.map((student) => ({ ...student, isPresent: false })))
    toast({
      title: "Attendance Reset",
      description: "All attendance records have been reset",
    })
  }

  const presentCount = students.filter((s) => s.isPresent).length
  const totalCount = students.length

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <UserPlus className="h-5 w-5 text-green-600" />
          <span>Manual Attendance</span>
        </CardTitle>
        <CardDescription>Mark attendance manually for Class {selectedClass} students</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistics */}
        <div className="bg-slate-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="font-medium">Class {selectedClass} Summary</span>
            </div>
            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
              {presentCount}/{totalCount} Present
            </Badge>
          </div>
          <div className="mt-2 text-sm text-slate-600">
            Subject: <span className="font-medium">{selectedSubject}</span> • Class:{" "}
            <span className="font-medium">{selectedClass}</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name, roll number, or student ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Bulk Actions */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={markAllPresent} disabled={isLoading} size="sm" className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark All Present
          </Button>
          <Button onClick={resetAttendance} disabled={isLoading} size="sm" variant="outline">
            <XCircle className="h-4 w-4 mr-2" />
            Reset All
          </Button>
        </div>

        {/* Student List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredStudents.length > 0 ? (
            filteredStudents.map((student) => (
              <div
                key={student.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                  student.isPresent ? "bg-green-50 border-green-200" : "bg-white border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex-1">
                  <div className="font-medium text-slate-800">{student.name}</div>
                  <div className="text-sm text-slate-500">
                    {student.rollNumber} • {student.id}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {student.isPresent && <CheckCircle className="h-4 w-4 text-green-600" />}
                  <Button
                    onClick={() => toggleAttendance(student.id)}
                    disabled={isLoading}
                    size="sm"
                    variant={student.isPresent ? "outline" : "default"}
                    className={
                      student.isPresent
                        ? "border-red-200 text-red-600 hover:bg-red-50"
                        : "bg-green-600 hover:bg-green-700"
                    }
                  >
                    {student.isPresent ? "Mark Absent" : "Mark Present"}
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No students found in Class {selectedClass}</p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <Alert>
          <AlertDescription>
            <div className="font-medium mb-1">Manual Attendance Guidelines:</div>
            <ul className="text-sm space-y-1">
              <li>• Use this for students who cannot scan QR codes</li>
              <li>• Verify student identity before marking present</li>
              <li>
                • Records are specific to {selectedSubject} - Class {selectedClass}
              </li>
              <li>• Changes are saved automatically</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
