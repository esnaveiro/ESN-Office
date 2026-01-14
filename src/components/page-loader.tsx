import { Loader2 } from 'lucide-react'
import { EsnRectangles } from '@/components/esn-rectangles'

interface PageLoaderProps {
  withBackground?: boolean
  message?: string
}

export function PageLoader({ withBackground = true, message }: PageLoaderProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {withBackground && <EsnRectangles />}
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        {message && (
          <p className="text-sm text-muted-foreground">{message}</p>
        )}
      </div>
    </div>
  )
}
