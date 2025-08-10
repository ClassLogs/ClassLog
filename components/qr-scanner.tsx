"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Camera,
  RotateCcw,
  RefreshCw,
  CheckCircle,
  XCircle,
  Monitor,
  Square,
  Loader2,
  Mic,
  PlayCircle,
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
  | "retrying_stream" // New status for retries

const MAX_RETRIES = 3 // Max attempts to start camera

export function QRScanner({
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
  const [retryCount, setRetryCount] = useState(0) // New state for retry count
  const [videoReadyState, setVideoReadyState] = useState(0) // New state for video readyState
  const [isPlaying, setIsPlaying] = useState(false) // New state to track if video is actually playing
  const [videoElementError, setVideoElementError] = useState<MediaError | null>(null) // New state for video element errors

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  // Function to handle initial media device setup and permissions
  const initializeMediaDevices = useCallback(async () => {
    console.log("initializeMediaDevices: Starting device enumeration and permission check.")
    setCameraInitializing(true)
    setCameraStartupError(null)
    setError(null) // Clear general error on re-initialization
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
      setMicrophonePermissionGranted(false) // Assume both denied if general permission error
      const errorMessage =
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Camera and/or microphone permission denied. Please allow access in your browser settings."
          : err.name === "NotFoundError" || err.name === "DevicesNotFoundError"
            ? "No camera or microphone found on this device."
            : `Failed to access media devices: ${err.message || err.name}`
      setError(errorMessage)
      setCameraStartupError(errorMessage) // Set specific startup error
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

  const startCamera = async (attempt = 1) => {
    console.log(`startCamera: Attempting to start camera (Attempt ${attempt}/${MAX_RETRIES}).`)
    setRetryCount(attempt - 1) // Update retry count for UI

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
    setMediaStreamStatus(attempt > 1 ? "retrying_stream" : "requesting_permissions")
    setVideoElementError(null) // Clear previous video element errors
    setIsPlaying(false) // Reset playing state
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

      setStream(newStream) // Set stream immediately
      // setIsScanning(true) // Removed: isScanning will be set in handleVideoCanPlay
      setMediaStreamStatus("stream_active") // Set status to active immediately
      setRetryCount(0) // Reset retry count on success
      setCameraInitializing(false) // Explicitly set to false on success

      toast({
        title: "Camera Started",
        description: `Using ${cameraFacing === "environment" ? "back" : "front"} camera`,
      })
    } catch (err: any) {
      console.error("startCamera: Error starting camera (getUserMedia failed):", err)
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
      setCameraInitializing(false) // Explicitly set to false on error

      if (attempt < MAX_RETRIES && (err.name === "NotReadableError" || err.name === "OverconstrainedError")) {
        console.log(`startCamera: Retrying getUserMedia in 1 second... (Attempt ${attempt + 1})`)
        setTimeout(() => startCamera(attempt + 1), 1000)
      } else {
        console.error("startCamera: Max retries reached for getUserMedia or unrecoverable error.")
      }
    }
  }

  // Effect to handle video playback when stream is available and its cleanup
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream
      console.log("useEffect[stream]: Video srcObject set.")

      return () => {
        console.log("useEffect[stream] cleanup: Stopping stream tracks and clearing srcObject.")
        if (stream) {
          stream.getTracks().forEach((track) => track.stop())
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null
          videoRef.current.oncanplay = null // Clear listeners
          videoRef.current.onerror = null
        }
      }
    } else if (!stream && videoRef.current) {
      // If stream becomes null (e.g., by stopCamera), ensure video element is cleared
      videoRef.current.srcObject = null
      videoRef.current.oncanplay = null
      videoRef.current.onerror = null
      console.log("useEffect[stream]: Stream became null, cleared video srcObject.")
    }
  }, [stream])

  const handleVideoCanPlay = useCallback(() => {
    if (videoRef.current && stream) {
      console.log("Video onCanPlay event fired. ReadyState:", videoRef.current.readyState)
      setVideoReadyState(videoRef.current.readyState)
      videoRef.current
        .play()
        .then(() => {
          console.log("onCanPlay: Video play() initiated successfully.")
          setIsPlaying(true)
          setIsScanning(true) // Set isScanning to true when video is actually playing
        })
        .catch((err) => {
          console.error("onCanPlay: Error attempting to play video:", err)
          setIsPlaying(false)
          // This error might occur if autoplay is blocked. The "Click to Play" overlay will handle this.
        })
    }
  }, [stream])

  const handleVideoError = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
      const videoElement = e.currentTarget
      console.error("Video onError event fired:", videoElement.error)
      setVideoReadyState(-1) // Indicate error state
      setVideoElementError(videoElement.error)
      setIsPlaying(false)
      setError(`Video playback error: ${videoElement.error?.message || videoElement.error?.code}`)
      toast({
        title: "Video Playback Error",
        description: `Code: ${videoElement.error?.code}, Message: ${videoElement.error?.message}`,
        variant: "destructive",
      })
    },
    [toast],
  )

  const stopCamera = useCallback(() => {
    console.log("stopCamera: Stopping camera and scanning.")
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
      console.log("stopCamera: QR scanning interval stopped.")
    }

    // Set stream to null to trigger the useEffect[stream] cleanup
    setStream(null)

    setIsScanning(false)
    setMediaStreamStatus("idle")
    setRetryCount(0) // Reset retry count
    setVideoReadyState(0) // Reset video ready state
    setIsPlaying(false) // Reset playing state
    setVideoElementError(null) // Clear video element errors
    console.log("stopCamera: Camera stopped.")
  }, []) // Removed stream from dependencies, as setStream(null) handles it.

  const handleScanSuccess = useCallback(
    async (decodedText: string) => {
      console.log("handleScanSuccess: QR Code detected:", decodedText)
      setScanResult(decodedText)
      setIsProcessing(true)

      stopCamera() // Stop camera after successful scan

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
    },
    [toast, onScanSuccess, onScanError, stopCamera], // Added stopCamera to dependencies
  )

  const scanForQR = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isScanning || !isPlaying) return // Only scan if video is playing

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA || video.paused || video.ended) {
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
  }, [isScanning, isPlaying, handleScanSuccess])

  const startQRScanning = useCallback(() => {
    console.log("startQRScanning: Starting QR scanning interval.")
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
    }

    scanIntervalRef.current = setInterval(() => {
      scanForQR()
    }, 200)
  }, [scanForQR])

  // Effect to manage QR scanning interval based on isScanning
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isScanning) {
      interval = setInterval(() => {
        scanForQR()
      }, 200)
    } else {
      if (interval) {
        clearInterval(interval)
        interval = null
        console.log("useEffect[isScanning]: QR scanning interval cleared due to isScanning being false.")
      }
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [isScanning, scanForQR])

  const flipCamera = useCallback(async () => {
    console.log("flipCamera: Attempting to flip camera. Current isScanning:", isScanning, "isPlaying:", isPlaying)
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
    setIsPlaying(false) // Reset playing state during flip
    try {
      const wasScanning = isScanning
      console.log("flipCamera: wasScanning before stopCamera:", wasScanning)

      if (wasScanning) {
        stopCamera()
        console.log("flipCamera: Camera stopped for flip. isScanning after stopCamera:", isScanning)
        await new Promise((resolve) => setTimeout(resolve, 500))
        console.log("flipCamera: Delay finished.")
      }

      const currentIndex = availableCameras.findIndex((cam) => cam.deviceId === currentCameraId)
      const nextIndex = (currentIndex + 1) % availableCameras.length
      const nextCamera = availableCameras[nextIndex]

      console.log("flipCamera: Current camera ID:", currentCameraId, "Next camera ID:", nextCamera.deviceId)

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
        console.log("flipCamera: Attempting to restart camera after flip.")
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
      console.log("flipCamera: Finished flipCamera process.")
    }
  }, [availableCameras, currentCameraId, isScanning, stopCamera, setCurrentCameraId, setCameraFacing, toast]) // Removed startCamera from dependencies

  const resetScanner = useCallback(() => {
    console.log("resetScanner: Resetting scanner state.")
    setScanResult(null)
    setError(null)
    setCameraStartupError(null)
    setIsProcessing(false)
    setRetryCount(0) // Reset retry count
    setVideoReadyState(0) // Reset video ready state
    setIsPlaying(false) // Reset playing state
    setVideoElementError(null) // Clear video element errors

    if (isScanning) {
      stopCamera()
    }
    setMediaStreamStatus("idle")
  }, [isScanning, stopCamera])

  const demoScan = useCallback(() => {
    console.log("demoScan: Initiating demo scan. Current isScanning:", isScanning, "isPlaying:", isPlaying)
    if (!isScanning || !isPlaying) {
      // Added !isPlaying check
      toast({
        title: "Start Camera First",
        description: "Please start the camera and ensure it's playing before demo scanning.",
        variant: "destructive",
      })
      return
    }

    const mockQRData = `DEMO-QR-${Date.now()}-${Math.random().toString(36).substring(7)}`
    handleScanSuccess(mockQRData)
  }, [isScanning, isPlaying, handleScanSuccess, toast])

  const handlePlayButtonClick = useCallback(() => {
    if (videoRef.current) {
      videoRef.current
        .play()
        .then(() => {
          console.log("User initiated play() successful.")
          setIsPlaying(true)
        })
        .catch((err) => {
          console.error("User initiated play() failed:", err)
          setError(`Failed to play video: ${err.message || err.name}. Please check browser settings.`)
          toast({
            title: "Video Playback Failed",
            description: "Browser blocked autoplay. Please check console for details.",
            variant: "destructive",
          })
        })
    }
  }, [toast])

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
                <Monitor className="w-3 h-3 mr-1" />
                {cameraFacing === "environment" ? "Back" : "Front"}
              </Badge>
              {microphonePermissionGranted !== null && (
                <Badge variant="outline" className="text-xs">
                  <Mic className="w-3 h-3 mr-1" />
                  {microphonePermissionGranted ? "Mic On" : "Mic Off"}
                </Badge>
              )}
              {isScanning &&
                isPlaying && ( // Only show scanning indicator if video is playing
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
                className="w-full h-full object-cover" // Removed conditional hidden class
                onCanPlay={handleVideoCanPlay}
                onError={handleVideoError}
              />

              {/* Hidden Canvas for QR Processing */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Placeholder when not scanning and not initializing */}
              {!stream && !cameraInitializing && (
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
                  <p className="text-blue-600 dark:text-blue-400 text-sm">
                    Starting camera... {retryCount > 0 && `(Retry ${retryCount}/${MAX_RETRIES})`}
                  </p>
                  <p className="text-gray-400 text-xs">Please grant camera and microphone permissions if prompted.</p>
                </div>
              )}

              {/* "Click to Play" Overlay */}
              {stream && !isPlaying && !cameraInitializing && videoReadyState >= 3 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-black/60 text-white rounded-lg">
                  <PlayCircle className="w-12 h-12 text-white mb-3" />
                  <p className="text-lg font-bold mb-2">Video Blocked</p>
                  <p className="text-sm mb-4">Click to play camera feed</p>
                  <Button onClick={handlePlayButtonClick} size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <PlayCircle className="w-4 h-4 mr-2" /> Play Video
                  </Button>
                </div>
              )}

              {/* Scanning Frame Overlay */}
              {isScanning &&
                isPlaying && ( // Only show scanning frame if video is playing
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
                onClick={() => startCamera(1)} // Start with first attempt
                className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                disabled={cameraPermissionGranted === false || availableCameras.length === 0 || cameraInitializing}
              >
                {cameraInitializing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Starting Camera... {retryCount > 0 && `(Retry ${retryCount}/${MAX_RETRIES})`}
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
                disabled={!isScanning || !isPlaying || availableCameras.length < 2 || cameraInitializing}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Flip Camera
              </Button>

              <Button
                onClick={demoScan}
                variant="outline"
                className="flex-1 h-10 bg-transparent"
                disabled={!isScanning || !isPlaying}
              >
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
        </CardContent>
      </Card>
    </div>
  )
}
