import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Plus, Trash2, Edit, MapPin, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getCuratedCategoryInfo } from '@/lib/utils/category-info'
import { revalidatePath } from 'next/cache'

async function deleteItem(formData: FormData) {
  'use server'

  const id = formData.get('id') as string
  const supabase = await createClient()

  await supabase.from('curated_items').delete().eq('id', id)

  revalidatePath('/admin/curation')
}

export default async function CurationPage() {
  const supabase = await createClient()

  const { data: items } = await supabase
    .from('curated_items')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Content Curation</h1>
          <p className="mt-1 text-neutral-600">
            Manage neighborhood developments and curated content.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/curation/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {['development', 'infrastructure', 'business', 'event'].map((category) => {
          const count = items?.filter((i) => i.category === category).length ?? 0
          const info = getCuratedCategoryInfo(category)

          return (
            <div
              key={category}
              className="rounded-lg border border-neutral-200 bg-white p-4"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{info.icon}</span>
                <span className="text-sm text-neutral-600">{info.title}</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-neutral-900">{count}</p>
            </div>
          )
        })}
      </div>

      {/* Items List */}
      {items && items.length > 0 ? (
        <div className="space-y-4">
          {items.map((item) => {
            const categoryInfo = getCuratedCategoryInfo(item.category)

            return (
              <div
                key={item.id}
                className="rounded-lg border border-neutral-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
                      style={{ backgroundColor: categoryInfo.color + '20' }}
                    >
                      {categoryInfo.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-neutral-900">
                          {item.title}
                        </h3>
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                          style={{ backgroundColor: categoryInfo.color }}
                        >
                          {categoryInfo.title}
                        </span>
                      </div>
                      {item.description && (
                        <p className="mt-1 text-sm text-neutral-600">
                          {item.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-4 text-sm text-neutral-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                        </span>
                        <span>Radius: {item.radius_miles} mi</span>
                        {item.expires_at && (
                          <span>
                            Expires: {new Date(item.expires_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {item.source_url && (
                        <a
                          href={item.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-sm text-[#ff4533] hover:underline"
                        >
                          View Source
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/curation/${item.id}/edit`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <form action={deleteItem}>
                      <input type="hidden" name="id" value={item.id} />
                      <Button
                        variant="outline"
                        size="sm"
                        type="submit"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center">
          <MapPin className="mx-auto h-12 w-12 text-neutral-300" />
          <h3 className="mt-4 font-semibold text-neutral-900">No curated items</h3>
          <p className="mt-2 text-neutral-600">
            Add neighborhood developments, infrastructure updates, and local news.
          </p>
          <Button className="mt-4" asChild>
            <Link href="/admin/curation/new">
              <Plus className="mr-2 h-4 w-4" />
              Add First Item
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
