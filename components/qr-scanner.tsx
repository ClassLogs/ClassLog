"use client"
import { useState, useRef, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera, CameraOff, CheckCircle, XCircle, Scan, AlertTriangle, RotateCcw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import jsQR from "jsqr" // Import jsQR

interface ScanResult {
  success: boolean
  message: string
  sessionId?: string
  subject?: string
  timestamp?: string
}

export function QRScanner() {
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string>("")
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment")
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  // Get available video devices
  const getVideoDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = allDevices.filter((device) => device.kind === "videoinput")
      setDevices(videoDevices)
      console.log("Available video devices:", videoDevices)
      return videoDevices
    } catch (err) {
      console.error("Error enumerating devices:", err)
      return []
    }
  }, [])

  // Stop camera stream (utility function)
  const stopCameraStream = useCallback(() => {
    console.log("Stopping camera stream...")
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop()
        console.log("Stopped track:", track.kind)
      })
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
  }, [])

  // Start QR code scanning
  const startScanningLoop = useCallback(() => {
    console.log("Starting QR scanning interval...")
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
    }
    scanIntervalRef.current = setInterval(() => {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          captureAndAnalyze()
        }
      }
    }, 100) // Scan more frequently for better responsiveness
  }, [])

  // Capture frame and analyze
  const captureAndAnalyze = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context || video.videoWidth === 0 || video.videoHeight === 0) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    })

    if (code) {
      console.log("QR Code detected:", code.data)
      // Stop scanning immediately after detection to avoid multiple scans
      setIsScanning(false)
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
        scanIntervalRef.current = null
      }
      processQRCode(code.data)
    }
  }, [])

  // Process QR code
  const processQRCode = useCallback(
    async (qrData: string) => {
      try {
        const data = JSON.parse(qrData)

        // Validate QR code data structure
        if (!data || !data.sessionId || !data.subject || !data.timestamp) {
          setScanResult({
            success: false,
            message: "Inappropriate QR code format. Please scan a valid attendance QR.",
          })
          toast({
            title: "Invalid QR",
            description: "The scanned QR code is not for attendance.",
            variant: "destructive",
          })
          return // Stop processing if invalid
        }

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1500)) // Shorter delay for better UX

        const success = Math.random() > 0.05 // 95% success rate

        if (success) {
          const attendanceRecord = {
            sessionId: data.sessionId,
            subject: data.subject,
            date: new Date().toISOString().split("T")[0],
            time: new Date().toLocaleTimeString(),
            status: "present",
            markedAt: new Date().toLocaleTimeString(),
          }

          const existingRecords = JSON.parse(localStorage.getItem("studentAttendanceRecords") || "[]")
          existingRecords.unshift(attendanceRecord)
          localStorage.setItem("studentAttendanceRecords", JSON.stringify(existingRecords))

          setScanResult({
            success: true,
            message: `Attendance marked successfully for ${data.subject}!`,
            sessionId: data.sessionId,
            subject: data.subject,
            timestamp: new Date().toLocaleTimeString(),
          })

          toast({
            title: "Attendance Marked",
            description: `Successfully marked present for ${data.subject}`,
          })
        } else {
          setScanResult({
            success: false,
            message: "Failed to mark attendance. Please try again.",
          })
          toast({
            title: "Attendance Failed",
            description: "There was an issue marking your attendance.",
            variant: "destructive",
          })
        }
      } catch (error) {
        setScanResult({
          success: false,
          message: "Invalid QR code format. Please scan a valid attendance QR.",
        })
        toast({
          title: "Invalid QR",
          description: "The scanned QR code is corrupted or unreadable.",
          variant: "destructive",
        })
      }
    },
    [toast],
  )

  // Effect to manage camera stream based on isScanning and facingMode
  useEffect(() => {
    const setupCamera = async () => {
      if (!isScanning) {
        stopCameraStream()
        return
      }

      console.log("Setting up camera stream...")
      setError("")
      setScanResult(null)

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera not supported in this browser")
        }

        if (!videoRef.current) {
          setError("Camera interface not ready. Please try again.")
          setIsScanning(false)
          return
        }

        stopCameraStream() // Stop any existing stream before starting a new one

        await getVideoDevices() // Re-enumerate devices for flip

        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: facingMode,
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        }

        console.log("Requesting camera with constraints:", constraints)
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        console.log("Got camera stream:", stream)

        const video = videoRef.current
        streamRef.current = stream
        video.srcObject = stream

        const playVideo = () => {
          return new Promise<void>((resolve, reject) => {
            const handleLoadedMetadata = () => {
              console.log("Video metadata loaded")
              video.removeEventListener("loadedmetadata", handleLoadedMetadata)
              video.removeEventListener("error", handleError)

              video
                .play()
                .then(() => {
                  console.log("Video playing successfully")
                  startScanningLoop() // Start scanning only after video plays
                  resolve()
                })
                .catch(reject)
            }

            const handleError = (e: Event) => {
              console.error("Video error:", e)
              video.removeEventListener("loadedmetadata", handleLoadedMetadata)
              video.removeEventListener("error", handleError)
              reject(new Error("Video playback failed"))
            }

            video.addEventListener("loadedmetadata", handleLoadedMetadata)
            video.addEventListener("error", handleError)

            // Trigger load
            video.load()
          })
        }
        await playVideo()
      } catch (err: any) {
        console.error("Camera setup error:", err)
        let errorMessage = "Failed to access camera"
        if (err.name === "NotAllowedError") {
          errorMessage = "Camera permission denied. Please allow camera access and try again."
        } else if (err.name === "NotFoundError") {
          errorMessage = "No camera found on this device."
        } else if (err.name === "NotReadableError") {
          errorMessage = "Camera is being used by another application."
        } else if (err.name === "OverconstrainedError") {
          errorMessage = "Camera doesn't support the requested settings. Trying basic constraints..."
          try {
            const basicStream = await navigator.mediaDevices.getUserMedia({ video: true })
            if (videoRef.current) {
              streamRef.current = basicStream
              videoRef.current.srcObject = basicStream
              await videoRef.current.play()
              startScanningLoop()
              return
            }
          } catch (basicErr) {
            console.error("Basic constraints also failed:", basicErr)
            errorMessage = "Camera doesn't support any available settings."
          }
        } else if (err.message === "Video element not available") {
          errorMessage = "Camera interface not ready. Please try again."
        }
        setError(errorMessage)
        toast({
          title: "Camera Error",
          description: errorMessage,
          variant: "destructive",
        })
        setIsScanning(false) // Ensure scanning state is false on error
      }
    }

    setupCamera()

    // Cleanup function for the effect
    return () => {
      stopCameraStream()
    }
  }, [isScanning, facingMode, getVideoDevices, stopCameraStream, startScanningLoop, toast])

  // Handlers for UI buttons
  const handleStartCamera = () => {
    setScanResult(null) // Clear previous scan results
    setError("") // Clear previous errors
    setIsScanning(true) // This will trigger the useEffect to start the camera
  }

  const handleStopCamera = () => {
    setIsScanning(false) // This will trigger the useEffect to stop the camera
  }

  const handleFlipCamera = useCallback(async () => {
    console.log("Flipping camera from", facingMode, "to", facingMode === "user" ? "environment" : "user")
    const newFacingMode = facingMode === "user" ? "environment" : "user"
    setFacingMode(newFacingMode)
    // The useEffect will react to facingMode change and restart the camera if isScanning is true
  }, [facingMode])

  // Initialize devices on mount
  useEffect(() => {
    getVideoDevices()
  }, [getVideoDevices])

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Scan className="h-5 w-5 text-green-600" />
          <span>QR Code Scanner</span>
        </CardTitle>
        <CardDescription>Scan QR codes to mark your attendance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Camera View */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div
              className={`w-80 h-80 bg-slate-100 rounded-xl border-2 overflow-hidden transition-all duration-300 ${
                isScanning ? "border-green-500 shadow-lg animate-pulse-border" : "border-slate-200"
              }`}
            >
              {isScanning ? (
                <>
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                    autoPlay
                    style={{
                      transform: facingMode === "user" ? "scaleX(-1)" : "none",
                    }}
                  />
                  {/* Scanning overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-4 border-2 border-green-500 rounded-lg">
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-500 rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-500 rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-500 rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-500 rounded-br-lg" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-1 h-32 bg-green-500 opacity-50 animate-scan-line" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-slate-500">
                    <Camera className="h-16 w-16 mx-auto mb-4" />
                    <p className="text-sm">Camera not active</p>
                    {error && <p className="text-xs text-red-500 mt-2 px-4">{error}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Camera flip button */}
            {isScanning && devices.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleFlipCamera}
                className="absolute -top-2 -left-2 h-8 w-8 p-0 bg-white shadow-md"
                title="Flip Camera"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}

            {/* Hidden canvas for processing */}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Status */}
          {scanResult && (
            <Alert className={scanResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <div className="flex items-center space-x-2">
                {scanResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <div className="flex-1">
                  <AlertDescription className={scanResult.success ? "text-green-800" : "text-red-800"}>
                    {scanResult.message}
                    {scanResult.sessionId && scanResult.subject && (
                      <div className="mt-1 text-xs">
                        Subject: {scanResult.subject} • Session: {scanResult.sessionId.slice(-8)} •{" "}
                        {scanResult.timestamp}
                      </div>
                    )}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col space-y-3">
          {!isScanning ? (
            <Button onClick={handleStartCamera} className="w-full bg-green-600 hover:bg-green-700">
              <Camera className="h-4 w-4 mr-2" />
              Start Camera
            </Button>
          ) : (
            <div className="space-y-3">
              <Button
                onClick={handleStopCamera}
                variant="outline"
                className="w-full border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
              >
                <CameraOff className="h-4 w-4 mr-2" />
                Stop Camera
              </Button>

              {devices.length > 1 && (
                <Button onClick={handleFlipCamera} variant="outline" className="w-full bg-transparent">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Flip Camera ({facingMode === "user" ? "Front" : "Back"})
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Error display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Instructions */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-medium text-green-900 mb-2">How to scan:</h4>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• Allow camera permission when prompted</li>
            <li>• Point your camera at the teacher's QR code</li>
            <li>• Keep the QR code within the scanning area</li>
            <li>• Use flip camera button to switch between cameras</li>
            <li>• Wait for automatic detection and processing</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
