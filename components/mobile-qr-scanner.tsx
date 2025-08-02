"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Camera, RotateCcw, RefreshCw, CheckCircle, XCircle, Smartphone, Square, Loader2 } from "lucide-react" // Added Loader2
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import jsQR from "jsqr"

interface QRScannerProps {
  onScanSuccess?: (result: string) => void
  onScanError?: (error: string) => void
  apiEndpoint?: string
  className?: string
}

type CameraFacing = "user" | "environment"

export function MobileQRScanner({
  onScanSuccess,
  onScanError,
  apiEndpoint = "/api/attendance/mark",
  className = "",
}: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>("environment")
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null)
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])
  const [currentCameraId, setCurrentCameraId] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [cameraInitializing, setCameraInitializing] = useState(false) // New state for camera loading

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  // Function to handle initial camera setup and permissions
  const initializeCameraDevices = useCallback(async () => {
    setCameraInitializing(true)
    try {
      // Request permission by trying to access camera
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true })
      tempStream.getTracks().forEach((track) => track.stop()) // Stop the temporary stream immediately

      setPermissionGranted(true)
      setError(null)

      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter((device) => device.kind === "videoinput")
      setAvailableCameras(videoDevices)

      if (videoDevices.length > 0) {
        const backCamera = videoDevices.find(
          (device) =>
            device.label.toLowerCase().includes("back") ||
            device.label.toLowerCase().includes("rear") ||
            device.label.toLowerCase().includes("environment"),
        )
        const frontCamera = videoDevices.find(
          (device) =>
            device.label.toLowerCase().includes("front") ||
            device.label.toLowerCase().includes("user") ||
            device.label.toLowerCase().includes("facing"),
        )

        const initialCamera = backCamera || frontCamera || videoDevices[0]
        setCurrentCameraId(initialCamera.deviceId)
        setCameraFacing(backCamera ? "environment" : "user")
      } else {
        setError("No camera devices found.")
      }
    } catch (err: any) {
      console.error("Error initializing camera devices:", err)
      setPermissionGranted(false)
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("Camera permission denied. Please allow camera access in your browser settings.")
        toast({
          title: "Camera Access Denied",
          description: "Please allow camera access to use the QR scanner.",
          variant: "destructive",
        })
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setError("No camera found on this device.")
        toast({
          title: "No Camera Found",
          description: "It seems your device does not have a camera.",
          variant: "destructive",
        })
      } else {
        setError(`Failed to access camera: ${err.message || err.name}`)
        toast({
          title: "Camera Error",
          description: "An unexpected error occurred while accessing the camera.",
          variant: "destructive",
        })
      }
    } finally {
      setCameraInitializing(false)
    }
  }, [toast])

  // Call initializeCameraDevices on component mount
  useEffect(() => {
    initializeCameraDevices()
  }, [initializeCameraDevices])

  const startCamera = async () => {
    if (permissionGranted === false) {
      setError("Camera permission denied. Please allow camera access in your browser settings.")
      toast({
        title: "Camera Access Denied",
        description: "Please allow camera access to use the QR scanner.",
        variant: "destructive",
      })
      return
    }

    if (!currentCameraId && availableCameras.length === 0) {
      await initializeCameraDevices() // Try to re-initialize if no cameras found
      if (!currentCameraId && availableCameras.length === 0) {
        setError("No camera devices found or selected.")
        return
      }
    }

    setCameraInitializing(true) // Set loading state
    try {
      setError(null)

      // Stop existing stream if any
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
        setStream(null)
      }

      const constraints: MediaStreamConstraints = {
        video: currentCameraId ? { deviceId: { exact: currentCameraId } } : { facingMode: cameraFacing },
        audio: false,
      }

      console.log("Attempting to get user media with constraints:", constraints)
      const newStream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log("Successfully got user media stream.")

      if (videoRef.current) {
        videoRef.current.srcObject = newStream
        setStream(newStream)

        // Wait for video to load metadata and play
        await new Promise<void>((resolve, reject) => {
          videoRef.current!.onloadedmetadata = () => {
            videoRef
              .current!.play()
              .then(() => {
                console.log("Video started playing.")
                resolve()
              })
              .catch((playErr) => {
                console.error("Error playing video:", playErr)
                reject(new Error("Failed to play video stream."))
              })
          }
          videoRef.current!.onerror = (event) => {
            console.error("Video element error:", event)
            reject(new Error("Video element encountered an error."))
          }
        })

        setIsScanning(true)
        startQRScanning()

        toast({
          title: "Camera Started",
          description: `Using ${cameraFacing === "environment" ? "back" : "front"} camera`,
        })
      }
    } catch (err: any) {
      console.error("Error starting camera:", err)
      setIsScanning(false)
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("Camera access denied. Please grant permission.")
        toast({
          title: "Camera Access Denied",
          description: "Please allow camera access to use the QR scanner.",
          variant: "destructive",
        })
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setError("No suitable camera found or available.")
        toast({
          title: "No Camera Found",
          description: "It seems your device does not have a camera or it's in use.",
          variant: "destructive",
        })
      } else if (err.name === "NotReadableError") {
        setError("Camera is already in use or not accessible. Please close other apps using the camera.")
        toast({
          title: "Camera In Use",
          description: "Your camera might be in use by another application. Please close it and try again.",
          variant: "destructive",
        })
      } else if (err.name === "OverconstrainedError") {
        setError("Camera constraints not supported by device. Try a different camera or device.")
        toast({
          title: "Camera Error",
          description: "Your device does not support the requested camera settings.",
          variant: "destructive",
        })
      } else {
        setError(`Failed to start camera: ${err.message || err.name}`)
        toast({
          title: "Camera Error",
          description: "An unexpected error occurred while starting the camera.",
          variant: "destructive",
        })
      }
    } finally {
      setCameraInitializing(false) // End loading state
    }
  }

  const stopCamera = useCallback(() => {
    // Stop scanning interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }

    // Stop video stream
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }

    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsScanning(false)
  }, [stream])

  const startQRScanning = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
    }

    scanIntervalRef.current = setInterval(() => {
      scanForQR()
    }, 200) // Scan every 200ms
  }

  const scanForQR = () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    // Ensure video is ready and playing
    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA || video.paused || video.ended) {
      console.log(
        "Video not ready for scanning. State:",
        video.readyState,
        "Paused:",
        video.paused,
        "Ended:",
        video.ended,
      )
      return
    }

    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Get image data for QR detection
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

    // Use jsQR to detect QR code
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert", // Can be 'original', 'invert', 'both', or 'dontInvert'
    })

    if (code) {
      console.log("QR Code found:", code.data)
      handleScanSuccess(code.data)
    } else {
      // console.log("No QR code found."); // Uncomment for verbose debugging
    }
  }

  const handleScanSuccess = async (decodedText: string) => {
    console.log("QR Code detected:", decodedText)
    setScanResult(decodedText)
    setIsProcessing(true)

    // Stop scanning immediately after a successful scan
    stopCamera()

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const mockSuccess = Math.random() > 0.2 // 80% success rate

      if (mockSuccess) {
        toast({
          title: "Attendance Marked!",
          description: "Your attendance has been successfully recorded.",
        })
        onScanSuccess?.(decodedText)
      } else {
        throw new Error("Mock API failure")
      }
    } catch (error) {
      console.error("API call failed:", error)
      toast({
        title: "Scan Failed",
        description: "Failed to mark attendance. Please try again.",
        variant: "destructive",
      })
      onScanError?.("API call failed")
    } finally {
      setIsProcessing(false)

      // Auto reset after 3 seconds
      setTimeout(() => {
        setScanResult(null)
      }, 3000)
    }
  }

  const flipCamera = async () => {
    if (availableCameras.length < 2) {
      toast({
        title: "Camera Flip Unavailable",
        description: "Only one camera detected on this device.",
        variant: "destructive",
      })
      return
    }

    try {
      const wasScanning = isScanning

      // Stop current camera
      if (wasScanning) {
        stopCamera()
        await new Promise((resolve) => setTimeout(resolve, 500)) // Give time for camera to release
      }

      // Find next camera
      const currentIndex = availableCameras.findIndex((cam) => cam.deviceId === currentCameraId)
      const nextIndex = (currentIndex + 1) % availableCameras.length
      const nextCamera = availableCameras[nextIndex]

      console.log("Flipping camera. Current:", currentCameraId, "Next:", nextCamera.deviceId)

      setCurrentCameraId(nextCamera.deviceId)

      // Update facing mode based on camera label (heuristic for display)
      const isBackCamera =
        nextCamera.label.toLowerCase().includes("back") ||
        nextCamera.label.toLowerCase().includes("rear") ||
        nextCamera.label.toLowerCase().includes("environment")

      const newFacing: CameraFacing = isBackCamera ? "environment" : "user"
      setCameraFacing(newFacing)

      toast({
        title: "Camera Flipped",
        description: `Switched to ${newFacing === "environment" ? "back" : "front"} camera`,
      })

      // Restart camera if it was running
      if (wasScanning) {
        setTimeout(() => {
          startCamera()
        }, 500) // Small delay before restarting
      }
    } catch (error) {
      console.error("Error flipping camera:", error)
      toast({
        title: "Camera Flip Failed",
        description: "Unable to switch camera. Please try again.",
        variant: "destructive",
      })
    }
  }

  const resetScanner = () => {
    setScanResult(null)
    setError(null)
    setIsProcessing(false)

    if (isScanning) {
      stopCamera()
    }
  }

  const demoScan = () => {
    if (!isScanning) {
      toast({
        title: "Start Camera First",
        description: "Please start the camera before demo scanning.",
        variant: "destructive",
      })
      return
    }

    const mockQRData = `DEMO-QR-${Date.now()}-${Math.random().toString(36).substring(7)}`
    handleScanSuccess(mockQRData)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <Card className="shadow-lg border-2 border-gray-200 dark:border-gray-700">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <Camera className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">QR Scanner</h3>
                <p className="text-xs text-gray-500">
                  {availableCameras.length} camera{availableCameras.length !== 1 ? "s" : ""} detected
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">
                <Smartphone className="w-3 h-3 mr-1" />
                {cameraFacing === "environment" ? "Back" : "Front"}
              </Badge>
              {isScanning && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                  className="w-2 h-2 bg-red-500 rounded-full ml-2"
                />
              )}
            </div>
          </div>

          {/* Scanner Container */}
          <div className="relative mb-4">
            <div className="w-full aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden relative border-2 border-dashed border-gray-300 dark:border-gray-600">
              {/* Video Element */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${!isScanning && !cameraInitializing ? "hidden" : ""}`}
              />

              {/* Hidden Canvas for QR Processing */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Placeholder when not scanning */}
              {!isScanning && !scanResult && !cameraInitializing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                  <Camera className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="text-gray-500 text-sm mb-1">Camera not active</p>
                  <p className="text-gray-400 text-xs">Click "Start Camera" to begin scanning</p>
                </div>
              )}

              {/* Camera Initializing Loader */}
              {cameraInitializing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-gray-100 dark:bg-gray-800">
                  <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-3" />
                  <p className="text-blue-600 dark:text-blue-400 text-sm">Starting camera...</p>
                  <p className="text-gray-400 text-xs">Please grant camera permissions if prompted.</p>
                </div>
              )}

              {/* Scanning Frame Overlay */}
              {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-64 h-64 border-2 border-white rounded-lg relative">
                    {/* Corner indicators */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br-lg"></div>

                    {/* Scanning line animation */}
                    <motion.div
                      initial={{ y: -100 }}
                      animate={{ y: 100 }}
                      transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                      className="absolute left-0 right-0 h-0.5 bg-blue-400 shadow-lg shadow-blue-400/50"
                    />
                  </div>
                </div>
              )}

              {/* Scan Result Overlay */}
              <AnimatePresence>
                {scanResult && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-lg"
                  >
                    <div className="text-center text-white p-4">
                      {isProcessing ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                            className="w-12 h-12 mx-auto mb-3"
                          >
                            <RefreshCw className="w-12 h-12 text-blue-400" />
                          </motion.div>
                          <h3 className="text-lg font-bold mb-2">Processing...</h3>
                          <p className="text-blue-400 text-sm">Marking attendance</p>
                        </>
                      ) : (
                        <>
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring" }}
                          >
                            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                          </motion.div>
                          <h3 className="text-lg font-bold mb-2">Scan Successful!</h3>
                          <p className="text-green-400 text-sm">Attendance marked</p>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Permission Error Overlay */}
              {permissionGranted === false && (
                <div className="absolute inset-0 bg-red-50 dark:bg-red-900/20 flex items-center justify-center rounded-lg">
                  <div className="text-center p-4">
                    <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                    <h3 className="text-lg font-bold mb-2 text-red-600 dark:text-red-400">Camera Access Required</h3>
                    <p className="text-red-500 text-sm mb-3">Please allow camera permissions</p>
                    <Button onClick={initializeCameraDevices} size="sm" className="bg-red-600 hover:bg-red-700">
                      Grant Permission
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Control Buttons */}
          <div className="space-y-3">
            {!isScanning ? (
              <Button
                onClick={startCamera}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                disabled={permissionGranted === false || availableCameras.length === 0 || cameraInitializing}
              >
                {cameraInitializing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Starting Camera...
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5 mr-2" />
                    Start Camera
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={stopCamera} variant="destructive" className="w-full h-12">
                <Square className="w-5 h-5 mr-2" />
                Stop Scanner
              </Button>
            )}

            <div className="flex gap-2">
              <Button
                onClick={flipCamera}
                variant="outline"
                className="flex-1 h-10 bg-transparent"
                disabled={!permissionGranted || availableCameras.length < 2 || cameraInitializing}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Flip Camera
              </Button>

              <Button onClick={demoScan} variant="outline" className="flex-1 h-10 bg-transparent">
                <CheckCircle className="w-4 h-4 mr-2" />
                Demo Scan
              </Button>

              <Button onClick={resetScanner} variant="outline" className="flex-1 h-10 bg-transparent">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>

          {/* Camera Info */}
          {availableCameras.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Available Cameras:</h4>
              <div className="space-y-1">
                {availableCameras.map((camera, index) => (
                  <div key={camera.deviceId} className="flex items-center justify-between text-xs">
                    <span
                      className={`${camera.deviceId === currentCameraId ? "font-bold text-blue-600" : "text-gray-600 dark:text-gray-400"}`}
                    >
                      {camera.label || `Camera ${index + 1}`}
                    </span>
                    {camera.deviceId === currentCameraId && (
                      <Badge variant="secondary" className="text-xs">
                        Active
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-medium text-sm mb-2 text-blue-800 dark:text-blue-200">How to use:</h4>
            <ul className="text-xs space-y-1 text-blue-600 dark:text-blue-300">
              <li>• Click "Start Camera" to begin</li>
              <li>• Point camera at QR code</li>
              <li>• Use "Demo Scan" to test functionality</li>
              <li>• Use "Flip Camera" to switch cameras</li>
              {availableCameras.length > 1 && <li>• Multiple cameras detected</li>}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
