import { GraduationCap, Star, Users, MapPin } from 'lucide-react'
import type { CommunitySchoolsInfo, CommunitySchoolInfo } from '@/lib/supabase/types'

interface SchoolsSectionProps {
  schoolsInfo: CommunitySchoolsInfo
}

function SchoolCard({ school }: { school: CommunitySchoolInfo }) {
  const typeColors: Record<string, string> = {
    elementary: 'bg-green-100 text-green-700',
    middle: 'bg-blue-100 text-blue-700',
    high: 'bg-purple-100 text-purple-700',
    private: 'bg-amber-100 text-amber-700',
    charter: 'bg-teal-100 text-teal-700',
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
              typeColors[school.type] || 'bg-neutral-100 text-neutral-700'
            }`}
          >
            {school.type}
          </span>
          <h4 className="mt-2 font-semibold text-neutral-900">{school.name}</h4>
        </div>
        {school.rating && (
          <div className="flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-1">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium text-yellow-700">
              {school.rating}/10
            </span>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-sm text-neutral-500">
        {school.grades && (
          <div className="flex items-center gap-1">
            <GraduationCap className="h-3.5 w-3.5" />
            {school.grades}
          </div>
        )}
        {school.enrollment && (
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {school.enrollment.toLocaleString()} students
          </div>
        )}
        {school.distance && (
          <div className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {school.distance}
          </div>
        )}
      </div>
    </div>
  )
}

export function SchoolsSection({ schoolsInfo }: SchoolsSectionProps) {
  const hasSchools =
    (schoolsInfo.elementary && schoolsInfo.elementary.length > 0) ||
    (schoolsInfo.middle && schoolsInfo.middle.length > 0) ||
    (schoolsInfo.high && schoolsInfo.high.length > 0) ||
    (schoolsInfo.private && schoolsInfo.private.length > 0)

  if (!hasSchools) return null

  return (
    <section>
      <div className="flex items-center gap-2">
        <GraduationCap className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-neutral-900">Schools</h2>
      </div>
      <p className="mt-2 text-neutral-600">
        Quality education options in the area
      </p>

      <div className="mt-6 space-y-6">
        {/* Elementary Schools */}
        {schoolsInfo.elementary && schoolsInfo.elementary.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Elementary Schools
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {schoolsInfo.elementary.map((school, index) => (
                <SchoolCard key={index} school={school} />
              ))}
            </div>
          </div>
        )}

        {/* Middle Schools */}
        {schoolsInfo.middle && schoolsInfo.middle.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Middle Schools
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {schoolsInfo.middle.map((school, index) => (
                <SchoolCard key={index} school={school} />
              ))}
            </div>
          </div>
        )}

        {/* High Schools */}
        {schoolsInfo.high && schoolsInfo.high.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              High Schools
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {schoolsInfo.high.map((school, index) => (
                <SchoolCard key={index} school={school} />
              ))}
            </div>
          </div>
        )}

        {/* Private Schools */}
        {schoolsInfo.private && schoolsInfo.private.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Private Schools
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {schoolsInfo.private.map((school, index) => (
                <SchoolCard key={index} school={school} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
