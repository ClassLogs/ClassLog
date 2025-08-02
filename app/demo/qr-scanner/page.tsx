"use client"

import { MobileQRScanner } from "@/components/mobile-qr-scanner"
import { ThemeToggle } from "@/components/theme-toggle"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Smartphone, Wifi, Shield } from "lucide-react"

export default function QRScannerDemo() {
  const handleScanSuccess = (result: string) => {
    console.log("Scan successful:", result)
  }

  const handleScanError = (error: string) => {
    console.error("Scan error:", error)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">QR Scanner Demo</h1>
          <p className="text-gray-600 dark:text-gray-400">Mobile-optimized QR code scanner</p>
        </div>
        <ThemeToggle />
      </div>

      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8">
        {/* Scanner Component */}
        <div className="flex flex-col items-center">
          <MobileQRScanner
            onScanSuccess={handleScanSuccess}
            onScanError={handleScanError}
            apiEndpoint="/api/mock-attendance"
            className="mb-6"
          />

          {/* Mobile Features */}
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Smartphone className="w-5 h-5" />
                Mobile Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge className="bg-green-500">✓</Badge>
                <span className="text-sm">Auto camera permissions</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-green-500">✓</Badge>
                <span className="text-sm">Front/back camera flip</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-green-500">✓</Badge>
                <span className="text-sm">Responsive design</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-green-500">✓</Badge>
                <span className="text-sm">Real-time scanning</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Documentation */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="w-5 h-5" />
                API Integration
              </CardTitle>
              <CardDescription>How the scanner integrates with your backend</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="font-medium mb-2">POST Request Format:</h4>
                <pre className="text-xs overflow-x-auto">
                  {`{
  "qrCode": "scanned-qr-content",
  "timestamp": "2025-01-02T10:30:00Z",
  "studentId": "STU001"
}`}
                </pre>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="font-medium mb-2 text-blue-800 dark:text-blue-200">Success Response:</h4>
                <pre className="text-xs text-blue-600 dark:text-blue-300">
                  {`{
  "success": true,
  "message": "Attendance marked",
  "attendanceId": "att_123"
}`}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Features
              </CardTitle>
              <CardDescription>Built-in security and error handling</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-sm">Permission Handling</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Automatic camera permission requests with fallback UI
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-sm">Error Recovery</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Graceful handling of camera failures and API errors
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-sm">Auto Cleanup</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Proper camera resource management and cleanup
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Usage Example</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                <pre className="text-xs overflow-x-auto">
                  {`import { MobileQRScanner } from "@/components/mobile-qr-scanner"

<MobileQRScanner
  onScanSuccess={(result) => {
    console.log("Scanned:", result)
  }}
  onScanError={(error) => {
    console.error("Error:", error)
  }}
  apiEndpoint="/api/attendance/mark"
  className="custom-styles"
/>`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
