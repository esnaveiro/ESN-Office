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
import { Download, CheckCircle, Info, X, Share, Plus, AlertCircle } from "lucide-react"
import { usePWA } from "@/lib/pwa"
import { detectPlatform, isStandalone } from "@/lib/platform-detection"

interface PWAInstallCardProps {
  onInstalled?: () => void
  onDismiss?: () => void
}

export function PWAInstallCard({
  onInstalled,
  onDismiss
}: PWAInstallCardProps) {
  const { canInstall, isInstalled, install } = usePWA()
  const [showInstructions, setShowInstructions] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [platform, setPlatform] = useState(detectPlatform())
  const [standalone, setStandalone] = useState(false)

  useEffect(() => {
    setPlatform(detectPlatform())
    setStandalone(isStandalone())
  }, [])

  useEffect(() => {
    if (isInstalled && onInstalled) {
      onInstalled()
    }
  }, [isInstalled, onInstalled])

  const handleInstall = async () => {
    if (platform.isIOS) {
      // iOS requires manual installation
      setShowInstructions(true)
      return
    }

    setInstalling(true)
    try {
      const installed = await install()
      if (installed && onInstalled) {
        onInstalled()
      }
    } catch (error) {
      console.error("Installation error:", error)
    } finally {
      setInstalling(false)
    }
  }

  // Don't show if already installed or running as PWA
  if (isInstalled || standalone) {
    return null
  }

  // Don't show if can't install and not iOS
  if (!canInstall && !platform.isIOS) {
    return null
  }

  return (
    <>
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Install ESN Office App</CardTitle>
                <CardDescription className="text-sm mt-1">
                  Add to your home screen for quick access
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
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {platform.isIOS ? (
                <>
                  Install this app on your iPhone/iPad for a better experience and faster access.
                </>
              ) : (
                <>
                  Install this app for offline access, faster performance, and home screen convenience.
                </>
              )}
            </p>

            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-primary" />
                <span>Works offline</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-primary" />
                <span>Faster loading</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-primary" />
                <span>Push notifications</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleInstall}
              disabled={installing}
              className="flex-1"
            >
              {installing ? (
                <>Installing...</>
              ) : platform.isIOS ? (
                <>
                  <Info className="h-4 w-4 mr-2" />
                  Show Instructions
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Install App
                </>
              )}
            </Button>
            {!platform.isIOS && (
              <Button
                variant="outline"
                onClick={() => setShowInstructions(true)}
              >
                <Info className="h-4 w-4" />
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
              {platform.isIOS ? "Add to Home Screen (iOS)" : "Install ESN Office App"}
            </DialogTitle>
            <DialogDescription>
              Follow these steps to install the app
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {platform.isIOS ? (
              <>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Use Safari browser for installation on iOS
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        1
                      </div>
                      <p className="text-sm font-medium">Tap the Share button</p>
                    </div>
                    <p className="text-xs text-muted-foreground ml-8 flex items-center gap-1">
                      Look for <Share className="h-3 w-3 inline" /> at the bottom (iPhone) or top (iPad) of Safari
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        2
                      </div>
                      <p className="text-sm font-medium">Scroll and find &quot;Add to Home Screen&quot;</p>
                    </div>
                    <p className="text-xs text-muted-foreground ml-8 flex items-center gap-1">
                      Look for the <Plus className="h-3 w-3 inline" /> icon with &quot;Add to Home Screen&quot; text
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        3
                      </div>
                      <p className="text-sm font-medium">Tap &quot;Add&quot;</p>
                    </div>
                    <p className="text-xs text-muted-foreground ml-8">
                      Confirm by tapping &quot;Add&quot; in the top right
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        4
                      </div>
                      <p className="text-sm font-medium">Open from Home Screen</p>
                    </div>
                    <p className="text-xs text-muted-foreground ml-8">
                      The ESN Office icon will appear on your home screen
                    </p>
                  </div>
                </div>

                <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-xs text-yellow-800 dark:text-yellow-200">
                    Note: You must use Safari browser on iOS. Other browsers don&apos;t support this feature.
                  </AlertDescription>
                </Alert>
              </>
            ) : platform.isAndroid ? (
              <>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Install the app for a native experience
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        1
                      </div>
                      <p className="text-sm font-medium">Tap &quot;Install App&quot; button</p>
                    </div>
                    <p className="text-xs text-muted-foreground ml-8">
                      A popup will appear at the bottom of your screen
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        2
                      </div>
                      <p className="text-sm font-medium">Tap &quot;Install&quot;</p>
                    </div>
                    <p className="text-xs text-muted-foreground ml-8">
                      Confirm the installation in the browser popup
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        3
                      </div>
                      <p className="text-sm font-medium">Open from Home Screen</p>
                    </div>
                    <p className="text-xs text-muted-foreground ml-8">
                      The app will be added to your home screen automatically
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Install the app on your desktop for quick access
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        1
                      </div>
                      <p className="text-sm font-medium">Click &quot;Install App&quot; button</p>
                    </div>
                    <p className="text-xs text-muted-foreground ml-8">
                      Or look for the install icon in your browser&apos;s address bar
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        2
                      </div>
                      <p className="text-sm font-medium">Click &quot;Install&quot;</p>
                    </div>
                    <p className="text-xs text-muted-foreground ml-8">
                      Confirm the installation in the browser popup
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        3
                      </div>
                      <p className="text-sm font-medium">Launch from Desktop</p>
                    </div>
                    <p className="text-xs text-muted-foreground ml-8">
                      The app will open in its own window
                    </p>
                  </div>
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