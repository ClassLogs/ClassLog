"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, GraduationCap, Users } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [userType, setUserType] = useState<"teacher" | "student">("teacher")
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      if (userType === "teacher") {
        if (email === "teacher@school.edu" && password === "password123") {
          localStorage.setItem("authToken", "mock-jwt-token")
          localStorage.setItem("teacherName", "Dr. Sarah Johnson")
          router.push("/dashboard")
        } else {
          setError("Invalid email or password")
        }
      } else {
        if (email === "STU001" && password === "student123") {
          localStorage.setItem("studentAuthToken", "mock-student-jwt-token")
          localStorage.setItem("studentName", "John Doe")
          localStorage.setItem("studentId", "STU001")
          localStorage.setItem("studentClass", "Computer Science - Year 3")
          router.push("/student/dashboard")
        } else {
          setError("Invalid student ID or password")
        }
      }
    } catch (err) {
      setError("Login failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className={`p-3 rounded-full ${userType === "teacher" ? "bg-blue-600" : "bg-green-600"}`}>
              {userType === "teacher" ? (
                <GraduationCap className="h-8 w-8 text-white" />
              ) : (
                <Users className="h-8 w-8 text-white" />
              )}
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Hybrid Attendance System</h1>
          <p className="text-slate-600">{userType === "teacher" ? "Teacher Portal" : "Student Portal"}</p>
        </div>

        {/* User Type Toggle */}
        <div className="flex mb-6 bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setUserType("teacher")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              userType === "teacher" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-800"
            }`}
          >
            <GraduationCap className="h-4 w-4 inline mr-2" />
            Teacher
          </button>
          <button
            type="button"
            onClick={() => setUserType("student")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              userType === "student" ? "bg-white text-green-600 shadow-sm" : "text-slate-600 hover:text-slate-800"
            }`}
          >
            <Users className="h-4 w-4 inline mr-2" />
            Student
          </button>
        </div>

        {/* Login Form */}
        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access the {userType} dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{userType === "teacher" ? "Email Address" : "Student ID"}</Label>
                <Input
                  id="email"
                  type={userType === "teacher" ? "email" : "text"}
                  placeholder={userType === "teacher" ? "teacher@school.edu" : "STU001"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-slate-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-slate-400" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className={`w-full h-11 ${
                  userType === "teacher" ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"
                }`}
                disabled={isLoading}
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-600">
              <p>Demo Credentials:</p>
              {userType === "teacher" ? (
                <p className="font-mono text-xs mt-1">
                  Email: teacher@school.edu
                  <br />
                  Password: password123
                </p>
              ) : (
                <p className="font-mono text-xs mt-1">
                  Student ID: STU001
                  <br />
                  Password: student123
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
