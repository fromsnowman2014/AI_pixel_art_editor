'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Video, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseAI } from '@/lib/services/supabase-ai'
import { useProjectStore } from '@/lib/stores/project-store'

interface VideoGenerationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VideoGenerationModal({ open, onOpenChange }: VideoGenerationModalProps) {
  const [prompt, setPrompt] = useState('')
  const [fps, setFps] = useState<12 | 24 | 30>(24)
  const [isGenerating, setIsGenerating] = useState(false)

  const { currentProject, addFrames } = useProjectStore()

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    if (!currentProject) {
      toast.error('No active project')
      return
    }

    setIsGenerating(true)

    try {
      console.log('🎬 Starting video generation...')

      const response = await supabaseAI.generateVideo({
        prompt: prompt.trim(),
        width: currentProject.width,
        height: currentProject.height,
        colorCount: 16, // Default color count
        fps: fps
      })

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Video generation failed')
      }

      console.log(`✅ Generated ${response.data.totalFrames} frames`)

      // Load frames into the current project
      const frames = response.data.frames.map(({ frame, imageData }) => ({
        ...frame,
        delayMs: Math.round(1000 / fps), // Calculate delay based on FPS
        imageData: new Uint8ClampedArray(imageData)
      }))

      // Add all frames to the project
      addFrames(frames)

      toast.success(`${response.data.totalFrames} frames loaded! Ready to edit.`, {
        description: `Animation created at ${fps} FPS`
      })

      // Close modal
      onOpenChange(false)

      // Reset form
      setPrompt('')

    } catch (error) {
      console.error('❌ Video generation error:', error)
      toast.error('Video generation failed', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Generate Animation from AI Video
          </DialogTitle>
          <DialogDescription>
            Create smooth animated pixel art from a text prompt. We'll generate a high-quality 1-second video and convert it to pixel art frames.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Prompt Input */}
          <div className="space-y-2">
            <Label htmlFor="prompt">Animation Prompt</Label>
            <Input
              id="prompt"
              placeholder="a cute cat running, a knight swinging sword, etc."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Describe the movement or action you want to see
            </p>
          </div>

          {/* FPS Selection */}
          <div className="space-y-2">
            <Label htmlFor="fps">Frame Rate (FPS)</Label>
            <Select
              value={fps.toString()}
              onValueChange={(value) => setFps(parseInt(value) as 12 | 24 | 30)}
              disabled={isGenerating}
            >
              <SelectTrigger id="fps">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12 FPS - Choppy (retro)</SelectItem>
                <SelectItem value="24">24 FPS - Smooth (recommended)</SelectItem>
                <SelectItem value="30">30 FPS - Very smooth</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Higher FPS = more frames = smoother animation
            </p>
          </div>

          {/* Info Box */}
          <div className="rounded-lg bg-muted p-3 space-y-2">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 mt-0.5 text-primary" />
              <div className="space-y-1 text-xs">
                <p className="font-medium">How it works:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>AI generates a 1-second high-quality video</li>
                  <li>We extract {fps} frames from the video</li>
                  <li>Each frame is automatically converted to pixel art</li>
                  <li>Frames load into your project for editing</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Warning */}
          {currentProject && currentProject.frames.length > 0 && (
            <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                ⚠️ New frames will be added to your current project. Existing frames will be kept.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Video className="mr-2 h-4 w-4" />
                Generate {fps} Frames
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
