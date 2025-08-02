"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Camera,
  RotateCcw,
  RefreshCw,
  CheckCircle,
  XCircle,
  Smartphone,
  Square,
  Loader2,
  Info,
  Mic,
} from "lucide-react"
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
type MediaStreamStatus =
  | "idle"
  | "requesting_permissions"
  | "permission_granted"
  | "permission_denied"
  | "stream_active"
  | "stream_error"
  | "no_devices"
  | "initializing_devices"

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
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState<boolean | null>(null)
  const [microphonePermissionGranted, setMicrophonePermissionGranted] = useState<boolean | null>(null)
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])
  const [currentCameraId, setCurrentCameraId] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [cameraInitializing, setCameraInitializing] = useState(false)
  const [cameraStartupError, setCameraStartupError] = useState<string | null>(null)
  const [mediaStreamStatus, setMediaStreamStatus] = useState<MediaStreamStatus>("idle")

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  // Function to handle initial media device setup and permissions
  const initializeMediaDevices = useCallback(async () => {
    console.log("initializeMediaDevices: Starting device enumeration and permission check.")
    setCameraInitializing(true)
    setCameraStartupError(null)
    setMediaStreamStatus("initializing_devices")
    try {
      // Request permission by trying to access both camera and microphone
      console.log("initializeMediaDevices: Requesting temporary user media for permission check (video and audio)...")
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      tempStream.getTracks().forEach((track) => track.stop()) // Stop the temporary stream immediately
      console.log(
        "initializeMediaDevices: Temporary user media access successful. Permissions granted for video and audio.",
      )

      setCameraPermissionGranted(true)
      setMicrophonePermissionGranted(true)
      setError(null)

      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter((device) => device.kind === "videoinput")
      setAvailableCameras(videoDevices)
      console.log("initializeMediaDevices: Available video devices:", videoDevices)

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
        console.log(
          "initializeMediaDevices: Initial camera selected:",
          initialCamera.label,
          "ID:",
          initialCamera.deviceId,
        )
        setMediaStreamStatus("permission_granted")
      } else {
        setError("No camera devices found.")
        setMediaStreamStatus("no_devices")
        console.warn("initializeMediaDevices: No camera devices found.")
      }
    } catch (err: any) {
      console.error("initializeMediaDevices: Error initializing media devices:", err)
      setCameraPermissionGranted(false)
      setMicrophonePermissionGranted(false)
      const errorMessage =
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Camera and/or microphone permission denied. Please allow access in your browser settings."
          : err.name === "NotFoundError" || err.name === "DevicesNotFoundError"
            ? "No camera or microphone found on this device."
            : `Failed to access media devices: ${err.message || err.name}`
      setError(errorMessage)
      setCameraStartupError(errorMessage)
      setMediaStreamStatus("permission_denied")
      toast({
        title: "Media Access Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setCameraInitializing(false)
      console.log("initializeMediaDevices: Finished device enumeration and permission check.")
    }
  }, [toast])

  // Call initializeMediaDevices on component mount
  useEffect(() => {
    initializeMediaDevices()
  }, [initializeMediaDevices])

  const startCamera = async () => {
    console.log("startCamera: Attempting to start camera.")
    if (cameraPermissionGranted === false) {
      setError("Camera permission denied. Please allow camera access in your browser settings.")
      toast({
        title: "Camera Access Denied",
        description: "Please allow camera access to use the QR scanner.",
        variant: "destructive",
      })
      setMediaStreamStatus("permission_denied")
      return
    }

    if (!currentCameraId && availableCameras.length === 0) {
      console.log("startCamera: No current camera ID or available cameras. Re-initializing devices.")
      await initializeMediaDevices()
      if (!currentCameraId && availableCameras.length === 0) {
        setError("No camera devices found or selected.")
        setCameraStartupError("No camera devices found or selected.")
        setMediaStreamStatus("no_devices")
        return
      }
    }

    setCameraInitializing(true)
    setCameraStartupError(null)
    setError(null)
    setMediaStreamStatus("requesting_permissions")
    try {
      if (stream) {
        console.log("startCamera: Stopping existing stream before starting new one.")
        stream.getTracks().forEach((track) => track.stop())
        setStream(null)
      }

      const constraints: MediaStreamConstraints = {
        video: currentCameraId ? { deviceId: { exact: currentCameraId } } : { facingMode: cameraFacing },
        audio: true,
      }

      console.log("startCamera: Attempting to get user media with constraints:", constraints)
      const newStream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log("startCamera: Successfully got user media stream.")

      setMicrophonePermissionGranted(newStream.getAudioTracks().length > 0)

      if (videoRef.current) {
        videoRef.current.srcObject = newStream
        setStream(newStream)

        const videoElement = videoRef.current!

        const playVideo = async () => {
          try {
            console.log("startCamera: Attempting to play video element.")
            await videoElement.play()
            console.log("startCamera: Video started playing successfully.")
            setIsScanning(true)
            setMediaStreamStatus("stream_active")
            toast({
              title: "Camera Started",
              description: `Using ${cameraFacing === "environment" ? "back" : "front"} camera`,
            })
          } catch (playErr: any) {
            console.error("startCamera: Error playing video:", playErr)
            const errorMessage = `Failed to play video stream: ${playErr.message || playErr.name}. This might be due to browser autoplay policies or camera being in use.`
            setError(errorMessage)
            setCameraStartupError(errorMessage)
            setIsScanning(false)
            setMediaStreamStatus("stream_error")
            toast({
              title: "Camera Playback Error",
              description: errorMessage,
              variant: "destructive",
            })
          } finally {
            setCameraInitializing(false)
          }
        }

        if (videoElement.readyState >= 2) {
          console.log("startCamera: Video already loaded (readyState >= 2), attempting to play.")
          playVideo()
        } else {
          console.log("startCamera: Video not yet loaded, waiting for onloadedmetadata.")
          videoElement.onloadedmetadata = () => {
            console.log("startCamera: Video metadata loaded, attempting to play.")
            playVideo()
          }
          videoElement.onerror = (event) => {
            console.error("startCamera: Video element error during metadata load:", event, videoElement.error)
            const errorMessage = `Video element encountered an error: ${videoElement.error?.message || "Unknown error"}`
            setError(errorMessage)
            setCameraStartupError(errorMessage)
            setCameraInitializing(false)
            setIsScanning(false)
            setMediaStreamStatus("stream_error")
            toast({
              title: "Video Error",
              description: errorMessage,
              variant: "destructive",
            })
          }
        }
      }
    } catch (err: any) {
      console.error("startCamera: Error starting camera (getUserMedia failed):", err)
      setIsScanning(false)
      setCameraInitializing(false)
      const errorMessage =
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Camera and/or microphone access denied. Please grant permission in your browser settings."
          : err.name === "NotFoundError" || err.name === "DevicesNotFoundError"
            ? "No suitable camera or microphone found or available."
            : err.name === "NotReadableError"
              ? "Camera or microphone is already in use or not accessible. Please close other apps using them."
              : err.name === "OverconstrainedError"
                ? "Media constraints not supported by device. Try a different camera/microphone or device."
                : `Failed to start media: ${err.message || err.name}`
      setError(errorMessage)
      setCameraStartupError(errorMessage)
      setMediaStreamStatus("permission_denied") // Or stream_error if it's a device issue
      toast({
        title: "Media Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const stopCamera = useCallback(() => {
    console.log("stopCamera: Stopping camera and scanning.")
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
      console.log("stopCamera: QR scanning interval stopped.")
    }

    if (stream) {
      console.log("stopCamera: Stopping media stream tracks.")
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current.onloadedmetadata = null
      videoRef.current.onerror = null
      console.log("stopCamera: Video element srcObject cleared.")
    }

    setIsScanning(false)
    setMediaStreamStatus("idle")
    console.log("stopCamera: Camera stopped.")
  }, [stream])

  useEffect(() => {
    if (isScanning) {
      startQRScanning()
    } else {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
        scanIntervalRef.current = null
        console.log("useEffect[isScanning]: QR scanning interval cleared due to isScanning being false.")
      }
    }
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
        scanIntervalRef.current = null
      }
    }
  }, [isScanning])

  const startQRScanning = () => {
    console.log("startQRScanning: Starting QR scanning interval.")
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
    }

    scanIntervalRef.current = setInterval(() => {
      scanForQR()
    }, 200)
  }

  const scanForQR = () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA || video.paused || video.ended) {
      // console.log("scanForQR: Video not ready for scanning. State:", video.readyState, "Paused:", video.paused, "Ended:", video.ended);
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    })

    if (code) {
      console.log("scanForQR: QR Code found:", code.data)
      handleScanSuccess(code.data)
    } else {
      // console.log("scanForQR: No QR code found.");
    }
  }

  const handleScanSuccess = async (decodedText: string) => {
    console.log("handleScanSuccess: QR Code detected:", decodedText)
    setScanResult(decodedText)
    setIsProcessing(true)

    stopCamera()

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const mockSuccess = Math.random() > 0.2

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
      console.error("handleScanSuccess: API call failed:", error)
      toast({
        title: "Scan Failed",
        description: "Failed to mark attendance. Please try again.",
        variant: "destructive",
      })
      onScanError?.("API call failed")
    } finally {
      setIsProcessing(false)

      setTimeout(() => {
        setScanResult(null)
      }, 3000)
    }
  }

  const flipCamera = async () => {
    console.log("flipCamera: Attempting to flip camera.")
    if (availableCameras.length < 2) {
      toast({
        title: "Camera Flip Unavailable",
        description: "Only one camera detected on this device.",
        variant: "destructive",
      })
      return
    }

    setCameraInitializing(true)
    setCameraStartupError(null)
    setMediaStreamStatus("initializing_devices")
    try {
      const wasScanning = isScanning

      if (wasScanning) {
        stopCamera()
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      const currentIndex = availableCameras.findIndex((cam) => cam.deviceId === currentCameraId)
      const nextIndex = (currentIndex + 1) % availableCameras.length
      const nextCamera = availableCameras[nextIndex]

      console.log("flipCamera: Current:", currentCameraId, "Next:", nextCamera.deviceId)

      setCurrentCameraId(nextCamera.deviceId)

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

      if (wasScanning) {
        setTimeout(() => {
          startCamera()
        }, 500)
      }
    } catch (error: any) {
      console.error("flipCamera: Error flipping camera:", error)
      const errorMessage = `Unable to switch camera: ${error.message || error.name}`
      setError(errorMessage)
      setCameraStartupError(errorMessage)
      setMediaStreamStatus("stream_error")
      toast({
        title: "Camera Flip Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setCameraInitializing(false)
    }
  }

  const resetScanner = () => {
    console.log("resetScanner: Resetting scanner state.")
    setScanResult(null)
    setError(null)
    setCameraStartupError(null)
    setIsProcessing(false)

    if (isScanning) {
      stopCamera()
    }
    setMediaStreamStatus("idle")
  }

  const demoScan = () => {
    console.log("demoScan: Initiating demo scan.")
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
              {microphonePermissionGranted !== null && (
                <Badge variant="outline" className="text-xs">
                  <Mic className="w-3 h-3 mr-1" />
                  {microphonePermissionGranted ? "Mic On" : "Mic Off"}
                </Badge>
              )}
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
                  <p className="text-gray-400 text-xs">Please grant camera and microphone permissions if prompted.</p>
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
              {(cameraPermissionGranted === false || microphonePermissionGranted === false) && (
                <div className="absolute inset-0 bg-red-50 dark:bg-red-900/20 flex flex-col items-center justify-center rounded-lg">
                  <div className="text-center p-4">
                    <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                    <h3 className="text-lg font-bold mb-2 text-red-600 dark:text-red-400">
                      Camera and Microphone Access Required
                    </h3>
                    <p className="text-red-500 text-sm mb-3">Please allow media permissions</p>
                    <Button onClick={initializeMediaDevices} size="sm" className="bg-red-600 hover:bg-red-700">
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
                disabled={cameraPermissionGranted === false || availableCameras.length === 0 || cameraInitializing}
              >
                {cameraInitializing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Starting Camera...
                  </>
                ) : cameraStartupError ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Retry Camera
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
                disabled={!cameraPermissionGranted || availableCameras.length < 2 || cameraInitializing}
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

          {/* Media Stream Status */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Internal Status:</h4>
            <Badge variant="outline" className="text-xs">
              Status: {mediaStreamStatus}
            </Badge>
          </div>

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

          {/* Troubleshooting Tips */}
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <h4 className="font-medium text-sm mb-2 text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
              <Info className="w-4 h-4" /> Troubleshooting Tips:
            </h4>
            <ul className="text-xs space-y-1 text-yellow-600 dark:text-yellow-300">
              <li>
                • **Check Browser Permissions:** Ensure your browser (Chrome, Firefox, Edge) has explicit permission to
                access your camera and microphone. Look for a camera/microphone icon in the address bar.
              </li>
              <li>
                • **Close Other Apps:** Make sure no other applications (e.g., Zoom, Google Meet, Discord, other browser
                tabs) are currently using your camera or microphone.
              </li>
              <li>
                • **Restart Browser/Computer:** Sometimes a simple restart can resolve temporary media access issues.
              </li>
              <li>• **Update Drivers:** Ensure your laptop's camera and microphone drivers are up to date.</li>
              <li>• **Try Another Browser:** Test if the scanner works in a different web browser.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
