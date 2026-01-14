"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { MapPin, CheckCircle, AlertCircle, Info, X } from "lucide-react"
import { detectPlatform } from "@/lib/platform-detection"

interface LocationPermissionCardProps {
  onPermissionGranted?: () => void
  onDismiss?: () => void
}

export function LocationPermissionCard({
  onPermissionGranted,
  onDismiss
}: LocationPermissionCardProps) {
  const [permissionState, setPermissionState] = useState<PermissionState | null>(null)
  const [showInstructions, setShowInstructions] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [platform, setPlatform] = useState(detectPlatform())

  useEffect(() => {
    setPlatform(detectPlatform())
    checkPermission()
  }, [])

  const checkPermission = async () => {
    if (!("permissions" in navigator)) {
      setPermissionState("prompt")
      return
    }

    try {
      const result = await navigator.permissions.query({ name: "geolocation" as PermissionName })
      setPermissionState(result.state)

      // Listen for changes
      result.addEventListener("change", () => {
        setPermissionState(result.state)
        if (result.state === "granted" && onPermissionGranted) {
          onPermissionGranted()
        }
      })
    } catch {
      // Fallback for browsers that don't support permissions API
      setPermissionState("prompt")
    }
  }

  const requestPermission = async () => {
    setRequesting(true)
    try {
      await navigator.geolocation.getCurrentPosition(
        () => {
          setPermissionState("granted")
          if (onPermissionGranted) {
            onPermissionGranted()
          }
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            setPermissionState("denied")
            if (platform.isIOS) {
              setShowInstructions(true)
            }
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      )
    } catch (error) {
      console.error("Error requesting location permission:", error)
    } finally {
      setRequesting(false)
    }
  }

  // Don't show if already granted
  if (permissionState === "granted") {
    return null
  }

  return (
    <>
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Enable Location Access</CardTitle>
                <CardDescription className="text-sm mt-1">
                  Required for automatic check-in and location verification. You can still check in manually without location access.
                </CardDescription>
              </div>
            </div>
            {onDismiss && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -mr-2 -mt-2"
                onClick={onDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {permissionState === "denied" && (
            <Alert>
              <AlertCircle className="h-4 w-4 text-destructive"/>
              <AlertDescription className="text-sm">
                Location access was blocked. {platform.isIOS ? "You'll need to enable it in Settings." : "Please allow location access in your browser."}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {platform.isIOS ? (
                <>
                  <strong>For iPhone/iPad:</strong> You&apos;ll need to allow location access in two steps:
                  first in your browser, then in iOS Settings if needed.
                </>
              ) : (
                <>
                  Click the button below and select &quot;Allow&quot; when your browser asks for location access.
                </>
              )}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={requestPermission}
              disabled={requesting || permissionState === "denied"}
              className="flex-1"
            >
              {requesting ? (
                <>Requesting Access...</>
              ) : permissionState === "denied" ? (
                <>Permission Blocked</>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Enable Location
                </>
              )}
            </Button>
            {(platform.isIOS || permissionState === "denied") && (
              <Button
                variant="outline"
                onClick={() => setShowInstructions(true)}
              >
                <Info className="h-4 w-4 mr-2" />
                Help
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions Dialog */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {platform.isIOS ? "Enable Location on iOS" : "Enable Location Access"}
            </DialogTitle>
            <DialogDescription>
              Follow these steps to enable location access
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {platform.isIOS ? (
              <>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    iOS requires location to be enabled in Settings
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        1
                      </div>
                      <p className="text-sm font-medium">Open iOS Settings</p>
                    </div>
                    <p className="text-xs text-muted-foreground ml-8">
                      Go to your iPhone/iPad Settings app
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        2
                      </div>
                      <p className="text-sm font-medium">Find {platform.isSafari ? "Safari" : "your browser"}</p>
                    </div>
                    <p className="text-xs text-muted-foreground ml-8">
                      Scroll down and tap on {platform.isSafari ? "Safari" : "your browser app"}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        3
                      </div>
                      <p className="text-sm font-medium">Tap &quot;Location&quot;</p>
                    </div>
                    <p className="text-xs text-muted-foreground ml-8">
                      Find the Location option in the settings
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        4
                      </div>
                      <p className="text-sm font-medium">Select &quot;While Using the App&quot;</p>
                    </div>
                    <p className="text-xs text-muted-foreground ml-8">
                      Choose either &quot;While Using the App&quot; or &quot;Always&quot;
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        5
                      </div>
                      <p className="text-sm font-medium">Return to ESN Office</p>
                    </div>
                    <p className="text-xs text-muted-foreground ml-8">
                      Come back to this app and try enabling location again
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Your browser will ask for permission to access your location
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        1
                      </div>
                      <p className="text-sm font-medium">Click &quot;Enable Location&quot;</p>
                    </div>
                    <p className="text-xs text-muted-foreground ml-8">
                      A popup will appear at the top of your browser
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        2
                      </div>
                      <p className="text-sm font-medium">Select &quot;Allow&quot;</p>
                    </div>
                    <p className="text-xs text-muted-foreground ml-8">
                      Click &quot;Allow&quot; or &quot;Allow while using&quot; in the popup
                    </p>
                  </div>

                  {permissionState === "denied" && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                          3
                        </div>
                        <p className="text-sm font-medium">Check browser settings</p>
                      </div>
                      <p className="text-xs text-muted-foreground ml-8">
                        If blocked, click the lock icon in the address bar and enable location access
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setShowInstructions(false)}>
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
