import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Plus, BookOpen, Clock, CheckCircle, Image } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function StoryworkPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: agent } = await supabase
    .from('agents')
    .select('id, credit_balance')
    .eq('email', user.email!)
    .single()

  if (!agent) {
    redirect('/login')
  }

  // Get stories for this agent
  const { data: stories } = await supabase
    .from('stories')
    .select('*')
    .eq('agent_id', agent.id)
    .order('created_at', { ascending: false })

  const draftStories = stories?.filter((s) => s.status === 'draft') || []
  const completedStories = stories?.filter((s) => s.status === 'completed') || []

  const storyTypeLabels: Record<string, string> = {
    against_the_odds: 'Against the Odds',
    fresh_drop: 'Fresh Drop',
    behind_the_deal: 'Behind the Deal',
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Storywork</h1>
          <p className="mt-1 text-neutral-600">
            Create engaging social media carousels with AI.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-neutral-100 px-4 py-2">
            <span className="text-sm text-neutral-500">Credits:</span>
            <span className="ml-2 font-semibold text-neutral-900">
              {agent.credit_balance || 0}
            </span>
          </div>
          <Button asChild>
            <Link href="/dashboard/storywork/new">
              <Plus className="mr-2 h-4 w-4" />
              New Story
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            <span className="text-sm text-neutral-600">In Progress</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900">
            {draftStories.length}
          </p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-sm text-neutral-600">Completed</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900">
            {completedStories.length}
          </p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Image className="h-5 w-5 text-purple-500" />
            <span className="text-sm text-neutral-600">Carousels Created</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900">
            {completedStories.length}
          </p>
        </div>
      </div>

      {/* Story Types */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-neutral-900">Story Types</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-neutral-200 p-4">
            <h3 className="font-medium text-neutral-900">Against the Odds</h3>
            <p className="mt-1 text-sm text-neutral-500">
              Difficult transactions, bidding wars, challenges overcome.
            </p>
            <p className="mt-2 text-xs text-[#ff4533]">
              Challenge → Obstacles → Strategy → Victory
            </p>
          </div>
          <div className="rounded-lg border border-neutral-200 p-4">
            <h3 className="font-medium text-neutral-900">Fresh Drop</h3>
            <p className="mt-1 text-sm text-neutral-500">
              New listings, coming soon properties, market reveals.
            </p>
            <p className="mt-2 text-xs text-[#ff4533]">
              Reveal → Features → Neighborhood → CTA
            </p>
          </div>
          <div className="rounded-lg border border-neutral-200 p-4">
            <h3 className="font-medium text-neutral-900">Behind the Deal</h3>
            <p className="mt-1 text-sm text-neutral-500">
              Just closed, testimonials, success stories.
            </p>
            <p className="mt-2 text-xs text-[#ff4533]">
              Surface → Hidden Challenge → Resolution → Lesson
            </p>
          </div>
        </div>
      </div>

      {/* Stories List */}
      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-6 py-4">
          <h2 className="font-semibold text-neutral-900">Your Stories</h2>
        </div>

        {stories && stories.length > 0 ? (
          <div className="divide-y divide-neutral-100">
            {stories.map((story) => (
              <Link
                key={story.id}
                href={`/dashboard/storywork/${story.id}`}
                className="flex items-center justify-between p-4 transition-colors hover:bg-neutral-50"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      story.status === 'completed'
                        ? 'bg-green-100 text-green-600'
                        : story.status === 'generating'
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-neutral-900">{story.title}</h3>
                    <p className="text-sm text-neutral-500">
                      {story.story_type ? (storyTypeLabels[story.story_type] || story.story_type) : 'Story'}
                      {' • '}
                      {story.created_at ? new Date(story.created_at).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    story.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : story.status === 'generating'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-neutral-100 text-neutral-700'
                  }`}
                >
                  {story.status}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-neutral-300" />
            <h3 className="mt-4 font-semibold text-neutral-900">No stories yet</h3>
            <p className="mt-2 text-neutral-600">
              Create your first story to generate a social media carousel.
            </p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/storywork/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Story
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Brand Kit Link */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-neutral-900">Brand Kit</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Set up your brand colors, logo, and fonts for carousels.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard/storywork/brand-kit">Manage Brand Kit</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
