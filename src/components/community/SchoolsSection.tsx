import { GraduationCap, Star, Users, MapPin } from 'lucide-react'
import type { CommunitySchoolsInfo, CommunitySchoolInfo } from '@/lib/supabase/types'

interface SchoolsSectionProps {
  schoolsInfo: CommunitySchoolsInfo
}

function SchoolCard({ school }: { school: CommunitySchoolInfo }) {
  const typeColors: Record<string, string> = {
    elementary: 'bg-green-500/20 text-green-400 border-green-500/30',
    middle: 'bg-[#0077ff]/20 text-[#3395ff] border-[#0077ff]/30',
    high: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    private: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    charter: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4 transition-all duration-200 hover:border-white/[0.16]">
      <div className="flex items-start justify-between">
        <div>
          <span
            className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${
              typeColors[school.type] || 'bg-white/5 text-[#a1a1a6] border-white/[0.08]'
            }`}
          >
            {school.type}
          </span>
          <h4 className="mt-2 font-semibold text-white">{school.name}</h4>
        </div>
        {school.rating && (
          <div className="flex items-center gap-1 rounded-full bg-yellow-500/20 border border-yellow-500/30 px-2 py-1">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            <span className="text-[13px] font-medium text-yellow-400">
              {school.rating}/10
            </span>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[13px] text-[#636366]">
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
        <GraduationCap className="h-6 w-6 text-[#0077ff]" />
        <h2 className="text-[22px] font-semibold text-white">Schools</h2>
      </div>
      <p className="mt-2 text-[#a1a1a6]">
        Quality education options in the area
      </p>

      <div className="mt-6 space-y-6">
        {/* Elementary Schools */}
        {schoolsInfo.elementary && schoolsInfo.elementary.length > 0 && (
          <div>
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#636366]">
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
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#636366]">
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
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#636366]">
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
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#636366]">
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
