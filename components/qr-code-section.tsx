"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { QRCodeSVG } from "qrcode.react"
import { RefreshCw, Play, Maximize2, Users } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface QRCodeSectionProps {
  selectedSubject: string
  selectedClass: string
}

const SUBJECT_NAMES = {
  DSOOPS: "Data Structures & Object Oriented Programming",
  DBMS: "Database Management Systems",
  OOSE: "Object Oriented Software Engineering",
  FEE: "Fundamentals of Electrical Engineering",
}

export function QRCodeSection({ selectedSubject, selectedClass }: QRCodeSectionProps) {
  const [sessionId, setSessionId] = useState("")
  const [qrData, setQrData] = useState("")
  const [countdown, setCountdown] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [studentsPresent, setStudentsPresent] = useState(0)

  // Generate new session
  const startNewSession = async () => {
    setIsLoading(true)

    try {
      // Simulate API call to backend
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const newSessionId = `ATT-${selectedSubject}-${selectedClass}-${Date.now()}`
      const newQrData = JSON.stringify({
        sessionId: newSessionId,
        subject: selectedSubject,
        class: selectedClass,
        timestamp: Date.now(),
        teacherId: "teacher123",
        validUntil: Date.now() + 600000, // Valid for 10 minutes
      })

      setSessionId(newSessionId)
      setQrData(newQrData)
      setIsActive(true)
      setCountdown(10)
      setStudentsPresent(0)

      // Store session in localStorage
      const existingSessions = JSON.parse(localStorage.getItem("teacherSessions") || "[]")
      existingSessions.unshift({
        sessionId: newSessionId,
        subject: selectedSubject,
        class: selectedClass,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        studentsPresent: 0,
        status: "active",
      })
      localStorage.setItem("teacherSessions", JSON.stringify(existingSessions))
    } catch (error) {
      console.error("Failed to start session:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Update QR code every 10 seconds
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isActive && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            // Generate new QR data with updated timestamp
            const newQrData = JSON.stringify({
              sessionId,
              subject: selectedSubject,
              class: selectedClass,
              timestamp: Date.now(),
              teacherId: "teacher123",
              validUntil: Date.now() + 600000,
            })
            setQrData(newQrData)

            // Simulate students joining (random increment)
            if (Math.random() > 0.7) {
              setStudentsPresent((prev) => prev + Math.floor(Math.random() * 3) + 1)
            }

            return 10
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isActive, countdown, sessionId, selectedSubject, selectedClass])

  const stopSession = () => {
    setIsActive(false)
    setCountdown(0)

    // Update session status in localStorage
    const existingSessions = JSON.parse(localStorage.getItem("teacherSessions") || "[]")
    const updatedSessions = existingSessions.map((session: any) =>
      session.sessionId === sessionId ? { ...session, status: "completed", studentsPresent } : session,
    )
    localStorage.setItem("teacherSessions", JSON.stringify(updatedSessions))
  }

  // Reset session when subject or class changes
  useEffect(() => {
    if (isActive) {
      stopSession()
    }
  }, [selectedSubject, selectedClass])

  const getSubjectName = (code: string) => {
    return SUBJECT_NAMES[code as keyof typeof SUBJECT_NAMES] || code
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Play className="h-5 w-5 text-blue-600" />
          <span>
            {selectedSubject} - Class {selectedClass}
          </span>
        </CardTitle>
        <CardDescription>
          Generate QR codes for {selectedSubject} attendance in class {selectedClass}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* QR Code Display */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div
              className={`p-6 bg-white rounded-xl border-2 transition-all duration-300 ${
                isActive ? "border-blue-500 shadow-lg" : "border-slate-200"
              }`}
            >
              {qrData ? (
                <QRCodeSVG
                  value={qrData}
                  size={200}
                  level="M"
                  includeMargin={true}
                  className={`transition-opacity duration-300 ${countdown <= 2 ? "opacity-50" : "opacity-100"}`}
                />
              ) : (
                <div className="w-[200px] h-[200px] bg-slate-100 rounded-lg flex items-center justify-center">
                  <div className="text-center text-slate-500">
                    <RefreshCw className="h-12 w-12 mx-auto mb-2" />
                    <p className="text-sm">No active session</p>
                    <p className="text-xs">Click start to begin</p>
                  </div>
                </div>
              )}
            </div>

            {/* Fullscreen QR Modal */}
            {qrData && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute -top-2 -right-2 h-8 w-8 p-0 bg-white shadow-md"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {selectedSubject} - Class {selectedClass}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="flex justify-center p-4">
                    <QRCodeSVG value={qrData} size={300} level="M" includeMargin={true} />
                  </div>
                  <div className="text-center text-sm text-slate-600">
                    <p>{getSubjectName(selectedSubject)}</p>
                    <p className="text-xs mt-1">Session: {sessionId.slice(-8)}</p>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Session Info */}
          {sessionId && (
            <div className="text-center space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-center space-x-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {sessionId.slice(-12)}
                  </Badge>
                  {isActive && <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>}
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="font-medium text-blue-900">
                    {selectedSubject} - Class {selectedClass}
                  </div>
                  <div className="text-sm text-blue-700">{getSubjectName(selectedSubject)}</div>
                </div>
              </div>

              {isActive && (
                <div className="space-y-2">
                  <div className="flex items-center justify-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-slate-600">Refreshes in:</span>
                      <div
                        className={`font-mono text-lg font-bold transition-all duration-300 ${
                          countdown <= 3 ? "text-red-500 scale-110" : "text-blue-600"
                        }`}
                      >
                        {countdown}s
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-600">{studentsPresent} present</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col space-y-3">
          {!isActive ? (
            <Button onClick={startNewSession} disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700">
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Starting Session...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start {selectedSubject} Session
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={stopSession}
              variant="outline"
              className="w-full border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
            >
              Stop Session
            </Button>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Session Instructions:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Students scan QR code to mark attendance</li>
            <li>• QR code updates every 10 seconds for security</li>
            <li>
              • Attendance recorded for {selectedSubject} - Class {selectedClass}
            </li>
            <li>• Monitor real-time student count</li>
            <li>• Use manual attendance for scanning issues</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
