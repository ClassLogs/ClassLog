"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Camera, Loader2, XCircle, Info, Mic, RefreshCw, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

type MediaStreamStatus =
  | "idle"
  | "requesting_permissions"
  | "permission_granted"
  | "permission_denied"
  | "stream_active"
  | "stream_error"
  | "no_devices"
  | "initializing_devices"

export function QRCamera() {
  const [error, setError] = useState<string | null>(null)
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState<boolean | null>(null)
  const [microphonePermissionGranted, setMicrophonePermissionGranted] = useState<boolean | null>(null)
  const [cameraInitializing, setCameraInitializing] = useState(false)
  const [cameraStartupError, setCameraStartupError] = useState<string | null>(null)
  const [mediaStreamStatus, setMediaStreamStatus] = useState<MediaStreamStatus>("idle")
  const [stream, setStream] = useState<MediaStream | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const { toast } = useToast()

  // Function to handle initial media device setup and permissions
  const initializeMediaDevices = useCallback(async () => {
    console.log("initializeMediaDevices: Starting device enumeration and permission check.")
    setCameraInitializing(true)
    setCameraStartupError(null)
    setError(null)
    setMediaStreamStatus("initializing_devices")
    try {
      console.log("initializeMediaDevices: Requesting temporary user media for permission check (video and audio)...")
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      tempStream.getTracks().forEach((track) => track.stop())
      console.log(
        "initializeMediaDevices: Temporary user media access successful. Permissions granted for video and audio.",
      )

      setCameraPermissionGranted(true)
      setMicrophonePermissionGranted(true)
      setError(null)
      setMediaStreamStatus("permission_granted")
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

  useEffect(() => {
    initializeMediaDevices()
  }, [initializeMediaDevices])

  const startCamera = async () => {
    console.log("startCamera: Attempting to start camera.")
    if (cameraPermissionGranted === false) {
      setError("Camera permission denied. Please allow camera access in your browser settings.")
      toast({
        title: "Camera Access Denied",
        description: "Please allow camera access to use the camera.",
        variant: "destructive",
      })
      setMediaStreamStatus("permission_denied")
      return
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
        video: true, // Request any available video device
        audio: true, // Request audio as well for comprehensive permission check
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
            setMediaStreamStatus("stream_active")
            toast({
              title: "Camera Started",
              description: "Video stream is active.",
            })
          } catch (playErr: any) {
            console.error("startCamera: Error playing video:", playErr)
            const errorMessage = `Failed to play video stream: ${playErr.message || playErr.name}. This might be due to browser autoplay policies or camera being in use.`
            setError(errorMessage)
            setCameraStartupError(errorMessage)
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
      setMediaStreamStatus("permission_denied")
      toast({
        title: "Media Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const stopCamera = useCallback(() => {
    console.log("stopCamera: Stopping camera.")
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

    setMediaStreamStatus("idle")
    console.log("stopCamera: Camera stopped.")
  }, [stream])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="shadow-lg border-2 border-gray-200 dark:border-gray-700">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <Camera className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Camera Test</h3>
                <p className="text-xs text-gray-500">Basic camera functionality</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {microphonePermissionGranted !== null && (
                <Badge variant="outline" className="text-xs">
                  <Mic className="w-3 h-3 mr-1" />
                  {microphonePermissionGranted ? "Mic On" : "Mic Off"}
                </Badge>
              )}
              {mediaStreamStatus === "stream_active" && <div className="w-2 h-2 bg-green-500 rounded-full ml-2" />}
            </div>
          </div>

          {/* Camera Container */}
          <div className="relative mb-4">
            <div className="w-full aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden relative border-2 border-dashed border-gray-300 dark:border-gray-600">
              {/* Video Element */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${mediaStreamStatus !== "stream_active" && !cameraInitializing ? "hidden" : ""}`}
              />

              {/* Placeholder when not active */}
              {mediaStreamStatus !== "stream_active" && !cameraInitializing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                  <Camera className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="text-gray-500 text-sm mb-1">Camera not active</p>
                  <p className="text-400 text-xs">Click "Start Camera" to view feed</p>
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
            {mediaStreamStatus !== "stream_active" ? (
              <Button
                onClick={startCamera}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                disabled={cameraPermissionGranted === false || cameraInitializing}
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
                Stop Camera
              </Button>
            )}
          </div>

          {/* Media Stream Status */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Internal Status:</h4>
            <Badge variant="outline" className="text-xs">
              Status: {mediaStreamStatus}
            </Badge>
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
              <li>• **Try Another Browser:** Test if the camera works in a different web browser.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
