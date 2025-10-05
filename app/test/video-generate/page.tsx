'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function VideoGenerateTestPage() {
  const [prompt, setPrompt] = useState('a cute cat walking in a garden with flowers');
  const [width, setWidth] = useState(64);
  const [height, setHeight] = useState(64);
  const [colorCount, setColorCount] = useState(16);
  const [fps, setFps] = useState<12 | 24 | 30>(24);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Get Supabase client from localStorage
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      // Get JWT token from localStorage
      const authKey = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`;
      const authData = localStorage.getItem(authKey);

      if (!authData) {
        setError('Not authenticated. Please sign in first.');
        setLoading(false);
        return;
      }

      const { access_token } = JSON.parse(authData);

      // Call video-generate API
      const response = await fetch(`${supabaseUrl}/functions/v1/video-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`,
          'apikey': supabaseAnonKey
        },
        body: JSON.stringify({
          prompt,
          width,
          height,
          colorCount,
          fps
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(`API error (${response.status}): ${data.error?.message || 'Unknown error'}`);
        setResult(data);
        setLoading(false);
        return;
      }

      if (!data.success) {
        setError(`Request failed: ${data.error?.message || 'Unknown error'}`);
        setResult(data);
        setLoading(false);
        return;
      }

      setResult(data);
      setLoading(false);

      console.log('✅ Video generation job created:', data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-2">Phase 2 Test: video-generate</h1>
          <p className="text-gray-600 mb-8">
            Test the video-generate Edge Function deployment
          </p>

          <div className="space-y-6">
            {/* Prompt */}
            <div>
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter video generation prompt..."
                rows={3}
                className="mt-1"
              />
            </div>

            {/* Dimensions */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="width">Width</Label>
                <Input
                  id="width"
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  min={8}
                  max={128}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="height">Height</Label>
                <Input
                  id="height"
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  min={8}
                  max={128}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Color Count & FPS */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="colorCount">Color Count</Label>
                <Input
                  id="colorCount"
                  type="number"
                  value={colorCount}
                  onChange={(e) => setColorCount(Number(e.target.value))}
                  min={2}
                  max={64}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="fps">FPS</Label>
                <select
                  id="fps"
                  value={fps}
                  onChange={(e) => setFps(Number(e.target.value) as 12 | 24 | 30)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                  <option value={30}>30</option>
                </select>
              </div>
            </div>

            {/* Test Button */}
            <Button
              onClick={handleTest}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? 'Testing...' : 'Test video-generate API'}
            </Button>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-red-800 font-semibold mb-2">❌ Error</h3>
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {/* Result Display */}
            {result && !error && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-green-800 font-semibold mb-4">✅ Success!</h3>

                {result.success && result.data && (
                  <div className="space-y-3">
                    <div>
                      <span className="font-semibold">Job ID:</span>
                      <code className="ml-2 bg-gray-100 px-2 py-1 rounded text-sm">
                        {result.data.jobId}
                      </code>
                    </div>
                    <div>
                      <span className="font-semibold">Status:</span>
                      <span className="ml-2">{result.data.status}</span>
                    </div>
                    <div>
                      <span className="font-semibold">Estimated time:</span>
                      <span className="ml-2">{result.data.estimatedTimeSeconds}s</span>
                    </div>
                    <div>
                      <span className="font-semibold">Message:</span>
                      <p className="ml-2 text-gray-700">{result.data.message}</p>
                    </div>

                    <div className="pt-4 border-t border-green-200">
                      <p className="text-green-700 font-semibold mb-2">
                        🎉 Phase 2 Test PASSED!
                      </p>
                      <p className="text-sm text-green-600">
                        Check the job in Supabase Dashboard:
                      </p>
                      <a
                        href={`https://supabase.com/dashboard/project/fdiwnymnikylraofwhdu/editor`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Open video_generation_jobs table →
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Raw Response */}
            {result && (
              <details className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <summary className="cursor-pointer font-semibold text-gray-700">
                  Raw API Response
                </summary>
                <pre className="mt-3 text-xs overflow-auto bg-gray-900 text-green-400 p-4 rounded">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-blue-900 font-semibold mb-3">📋 Test Instructions</h2>
          <ol className="space-y-2 text-blue-800">
            <li>1. Make sure you're signed in (check top-right corner)</li>
            <li>2. Click "Test video-generate API" button</li>
            <li>3. Wait for the response (should be instant)</li>
            <li>4. Check that you get a jobId and status "queued"</li>
            <li>5. Open the Supabase Dashboard link to verify database record</li>
          </ol>

          <div className="mt-4 pt-4 border-t border-blue-200">
            <h3 className="text-blue-900 font-semibold mb-2">Expected Result:</h3>
            <ul className="space-y-1 text-blue-700 text-sm">
              <li>• Job created with UUID</li>
              <li>• Status: "queued"</li>
              <li>• Progress: 10%</li>
              <li>• Luma generation ID present</li>
              <li>• Database record created</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
