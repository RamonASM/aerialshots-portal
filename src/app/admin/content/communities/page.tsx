'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search,
  Plus,
  Filter,
  MapPin,
  Eye,
  EyeOff,
  MoreHorizontal,
  Edit,
  Trash2,
  ExternalLink,
  Globe,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SkeletonGrid } from '@/components/ui/skeleton'
import { EmptyCommunitiesState } from '@/components/ui/empty-state'

interface Community {
  id: string
  name: string
  slug: string
  city: string | null
  state: string | null
  description: string | null
  hero_image_url: string | null
  is_published: boolean
  created_at: string
  listingCount: number
}

export default function CommunitiesListPage() {
  const router = useRouter()
  const [communities, setCommunities] = useState<Community[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [publishedFilter, setPublishedFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const limit = 12

  useEffect(() => {
    async function fetchCommunities() {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        })
        if (search) params.set('search', search)
        if (publishedFilter !== 'all') {
          params.set('published', publishedFilter === 'published' ? 'true' : 'false')
        }

        const res = await fetch(`/api/admin/communities?${params}`)
        const data = await res.json()

        if (data.communities) {
          setCommunities(data.communities)
          setTotal(data.total)
        }
      } catch (error) {
        console.error('Error fetching communities:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCommunities()
  }, [search, publishedFilter, page])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this community?')) return

    try {
      const res = await fetch(`/api/admin/communities/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setCommunities((prev) => prev.filter((c) => c.id !== id))
      }
    } catch (error) {
      console.error('Error deleting community:', error)
    }
  }

  const handleTogglePublish = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/communities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !currentStatus }),
      })
      if (res.ok) {
        setCommunities((prev) =>
          prev.map((c) => (c.id === id ? { ...c, is_published: !currentStatus } : c))
        )
      }
    } catch (error) {
      console.error('Error toggling publish status:', error)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Communities</h1>
          <p className="mt-1 text-neutral-600 dark:text-neutral-400">
            Manage neighborhood guides and community pages
          </p>
        </div>
        <Link href="/admin/content/communities/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Community
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 md:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            placeholder="Search communities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-neutral-400" />
          <select
            value={publishedFilter}
            onChange={(e) => setPublishedFilter(e.target.value as typeof publishedFilter)}
            className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        <div className="text-sm text-neutral-500">
          {total} {total === 1 ? 'community' : 'communities'}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonGrid items={6} />
      ) : communities.length === 0 ? (
        <EmptyCommunitiesState
          onAdd={() => router.push('/admin/content/communities/new')}
        />
      ) : (
        <>
          {/* Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {communities.map((community) => (
              <Card
                key={community.id}
                className="group overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                {/* Hero Image */}
                <div className="relative aspect-video bg-neutral-100 dark:bg-neutral-800">
                  {community.hero_image_url ? (
                    <img
                      src={community.hero_image_url}
                      alt={community.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <MapPin className="h-12 w-12 text-neutral-300 dark:text-neutral-600" />
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute right-2 top-2">
                    {community.is_published ? (
                      <span className="flex items-center gap-1 rounded-full bg-green-500 px-2 py-1 text-xs font-medium text-white">
                        <Globe className="h-3 w-3" />
                        Published
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-amber-500 px-2 py-1 text-xs font-medium text-white">
                        <EyeOff className="h-3 w-3" />
                        Draft
                      </span>
                    )}
                  </div>

                  {/* Overlay Actions */}
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <Link href={`/admin/content/communities/${community.slug}`}>
                      <Button size="sm" variant="secondary">
                        <Edit className="mr-1 h-4 w-4" />
                        Edit
                      </Button>
                    </Link>
                    {community.is_published && (
                      <Link href={`/community/${community.slug}`} target="_blank">
                        <Button size="sm" variant="secondary">
                          <ExternalLink className="mr-1 h-4 w-4" />
                          View
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>

                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-neutral-900 dark:text-white">
                        {community.name}
                      </h3>
                      {(community.city || community.state) && (
                        <p className="mt-1 flex items-center gap-1 text-sm text-neutral-500">
                          <MapPin className="h-3 w-3" />
                          {[community.city, community.state].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => router.push(`/admin/content/communities/${community.slug}`)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleTogglePublish(community.id, community.is_published)}
                        >
                          {community.is_published ? (
                            <>
                              <EyeOff className="mr-2 h-4 w-4" />
                              Unpublish
                            </>
                          ) : (
                            <>
                              <Eye className="mr-2 h-4 w-4" />
                              Publish
                            </>
                          )}
                        </DropdownMenuItem>
                        {community.is_published && (
                          <DropdownMenuItem asChild>
                            <Link href={`/community/${community.slug}`} target="_blank">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              View Live
                            </Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDelete(community.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {community.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
                      {community.description}
                    </p>
                  )}

                  <div className="mt-3 flex items-center gap-4 text-xs text-neutral-500">
                    <span>{community.listingCount} properties</span>
                    <span>
                      Created {new Date(community.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-neutral-600">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
