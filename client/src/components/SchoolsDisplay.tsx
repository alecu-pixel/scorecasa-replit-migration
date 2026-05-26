import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  GraduationCap, 
  Star, 
  MapPin, 
  Users, 
  Award, 
  ChevronDown, 
  ChevronUp,
  DollarSign,
  TrendingUp,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import type { SchoolData } from '@shared/schema';

interface SchoolsDisplayProps {
  data: SchoolData;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" data-testid="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating
              ? 'fill-amber-400 text-amber-400'
              : 'fill-gray-700 text-gray-600'
          }`}
        />
      ))}
    </div>
  );
}

export default function SchoolsDisplay({ data }: SchoolsDisplayProps) {
  const [showAll, setShowAll] = useState(false);
  const isSchoolDigger = data.data_source === 'schooldigger';
  const INITIAL_DISPLAY_COUNT = 10;
  const hasMoreSchools = data.schools.length > INITIAL_DISPLAY_COUNT;
  const displayedSchools = showAll ? data.schools : data.schools.slice(0, INITIAL_DISPLAY_COUNT);
  
  return (
    <Card className="col-span-full glass-card border-gray-700/50" data-testid="schools-display">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-white" data-testid="schools-title">
            <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <GraduationCap className="w-5 h-5 text-purple-400 icon-glow-purple" />
            </div>
            Nearby Schools
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {isSchoolDigger && data.average_star_rating && data.average_star_rating > 0 && (
              <div className="flex items-center gap-1 text-sm" data-testid="average-rating">
                <span className="text-gray-400">Avg:</span>
                <StarRating rating={Math.round(data.average_star_rating)} />
                <span className="font-medium text-white">{data.average_star_rating.toFixed(1)}</span>
              </div>
            )}
            <Badge className="bg-gray-700/50 text-gray-300 border-gray-600" data-testid="schools-count">
              {data.schools_within_5_miles} within 5 mi
            </Badge>
            <Badge className="text-xs bg-cyan-500/10 text-cyan-400 border-cyan-500/30" data-testid="data-source">
              {isSchoolDigger ? 'SchoolDigger Pro' : 'Urban Institute'}
            </Badge>
          </div>
        </div>
        
        {/* Pro tier summary stats */}
        {isSchoolDigger && (
          <div className="flex items-center gap-4 mt-2 text-sm flex-wrap">
            {data.average_state_percentile && data.average_state_percentile > 0 && (
              <div className="flex items-center gap-1" data-testid="percentile-summary">
                <Award className="w-4 h-4 text-cyan-400" />
                <span className="text-gray-400">Top {100 - data.average_state_percentile}% statewide</span>
              </div>
            )}
            {data.average_graduation_rate && data.average_graduation_rate > 0 && (
              <div className="flex items-center gap-1" data-testid="grad-rate-summary">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-gray-400">{data.average_graduation_rate}% avg graduation</span>
              </div>
            )}
            {data.average_spending_per_pupil && data.average_spending_per_pupil > 0 && (
              <div className="flex items-center gap-1" data-testid="spending-summary">
                <DollarSign className="w-4 h-4 text-blue-400" />
                <span className="text-gray-400">${data.average_spending_per_pupil.toLocaleString()}/pupil avg</span>
              </div>
            )}
            {data.average_absenteeism_rate !== undefined && data.average_absenteeism_rate > 0 && (
              <div className="flex items-center gap-1" data-testid="absenteeism-summary">
                <AlertCircle className={`w-4 h-4 ${data.average_absenteeism_rate > 15 ? 'text-amber-400' : 'text-emerald-400'}`} />
                <span className="text-gray-400">{data.average_absenteeism_rate}% absenteeism</span>
              </div>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {data.schools.length === 0 ? (
          <p className="text-gray-400 text-center py-4" data-testid="no-schools">
            No schools found in this area
          </p>
        ) : (
          <div className="space-y-3">
            {displayedSchools.map((school, index) => (
              <div 
                key={school.school_id || index}
                className="flex flex-col gap-2 p-3 rounded-md bg-gray-800/50 border border-gray-700/50"
                data-testid={`school-item-${index}`}
              >
                {/* School header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-white" data-testid={`school-name-${index}`}>
                        {school.name}
                      </h4>
                      {school.star_rating !== undefined && school.star_rating > 0 && (
                        <StarRating rating={school.star_rating} />
                      )}
                      {school.url && (
                        <a 
                          href={school.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300"
                          data-testid={`school-link-${index}`}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {school.charter && (
                        <Badge className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/30">Charter</Badge>
                      )}
                      {school.magnet && (
                        <Badge className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/30">Magnet</Badge>
                      )}
                      {school.is_title_i && (
                        <Badge className="text-xs bg-gray-700/50 text-gray-300 border-gray-600">Title I</Badge>
                      )}
                      {school.is_virtual && (
                        <Badge className="text-xs bg-gray-700/50 text-gray-300 border-gray-600">Virtual</Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Score display */}
                  <div className="text-center flex-shrink-0" data-testid={`school-score-${index}`}>
                    <span className={`text-xl font-bold ${
                      school.overall_score >= 8 ? 'text-emerald-400' :
                      school.overall_score >= 6 ? 'text-amber-400' :
                      'text-red-400'
                    }`}>
                      {school.overall_score.toFixed(1)}
                    </span>
                    <p className="text-xs text-gray-500">/10</p>
                  </div>
                </div>
                
                {/* School details row */}
                <div className="flex items-center gap-3 text-sm text-gray-400 flex-wrap">
                  {school.school_level && (
                    <span data-testid={`school-level-${index}`}>{school.school_level}</span>
                  )}
                  <span data-testid={`school-grades-${index}`}>Grades {school.grades}</span>
                  {school.distance_miles !== undefined && (
                    <span className="flex items-center gap-1" data-testid={`school-distance-${index}`}>
                      <MapPin className="w-3 h-3" />
                      {school.distance_miles.toFixed(1)} mi
                    </span>
                  )}
                  {school.enrollment > 0 && (
                    <span className="flex items-center gap-1" data-testid={`school-enrollment-${index}`}>
                      <Users className="w-3 h-3" />
                      {school.enrollment.toLocaleString()}
                    </span>
                  )}
                  {school.district_name && (
                    <span data-testid={`school-district-${index}`}>
                      {school.district_name}
                    </span>
                  )}
                </div>
                
                {/* Pro tier metrics row */}
                <div className="flex items-center gap-4 text-sm flex-wrap">
                  {school.state_percentile !== undefined && school.state_percentile > 0 && (
                    <div className="flex flex-col gap-0.5" data-testid={`school-percentile-${index}`}>
                      <div className="flex items-center gap-1">
                        <Award className="w-4 h-4 text-cyan-400" />
                        <span className="font-medium text-white">Top {100 - school.state_percentile}%</span>
                        {school.state_rank && school.state_rank_of && (
                          <span className="text-gray-500">
                            (#{school.state_rank.toLocaleString()} of {school.state_rank_of.toLocaleString()})
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 ml-5">
                        {school.state_percentile >= 90 ? 'Exceptional - among the best in state' :
                         school.state_percentile >= 75 ? 'Above average for the state' :
                         school.state_percentile >= 50 ? 'Average for the state' :
                         'Below state average'}
                      </span>
                    </div>
                  )}
                  {school.student_teacher_ratio !== undefined && school.student_teacher_ratio > 0 && (
                    <div className="flex flex-col gap-0.5" data-testid={`school-ratio-${index}`}>
                      <div className="flex items-center gap-1">
                        <Users className={`w-4 h-4 ${
                          school.student_teacher_ratio <= 15 ? 'text-emerald-400' :
                          school.student_teacher_ratio <= 20 ? 'text-amber-400' :
                          'text-amber-500'
                        }`} />
                        <span className="font-medium text-white">{school.student_teacher_ratio}:1</span>
                        <span className="text-gray-400">student-teacher ratio</span>
                      </div>
                      <span className="text-xs text-gray-500 ml-5">
                        {school.student_teacher_ratio <= 15 ? 'Excellent - more individual attention' :
                         school.student_teacher_ratio <= 20 ? 'Good - typical class sizes' :
                         'Higher ratio - larger class sizes'}
                      </span>
                    </div>
                  )}
                  {school.graduation_rate !== undefined && school.graduation_rate > 0 && (
                    <div className="flex items-center gap-1" data-testid={`school-graduation-${index}`}>
                      <TrendingUp className={`w-4 h-4 ${school.graduation_rate >= 90 ? 'text-emerald-400' : school.graduation_rate >= 75 ? 'text-amber-400' : 'text-red-400'}`} />
                      <span className="font-medium text-white">{school.graduation_rate}%</span>
                      <span className="text-gray-400">graduation</span>
                    </div>
                  )}
                  {school.spending_per_pupil !== undefined && school.spending_per_pupil > 0 && (
                    <div className="flex items-center gap-1" data-testid={`school-spending-${index}`}>
                      <DollarSign className="w-4 h-4 text-blue-400" />
                      <span className="font-medium text-white">${school.spending_per_pupil.toLocaleString()}</span>
                      <span className="text-gray-400">per pupil</span>
                    </div>
                  )}
                  {school.chronic_absenteeism_rate !== undefined && school.chronic_absenteeism_rate > 0 && (
                    <div className="flex items-center gap-1" data-testid={`school-absenteeism-${index}`}>
                      <AlertCircle className={`w-4 h-4 ${school.chronic_absenteeism_rate > 15 ? 'text-amber-500' : 'text-emerald-400'}`} />
                      <span className="font-medium text-white">{school.chronic_absenteeism_rate}%</span>
                      <span className="text-gray-400">absent</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {hasMoreSchools && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAll(!showAll)}
                  className="gap-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                  data-testid="button-toggle-schools"
                >
                  {showAll ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Show {data.schools.length - INITIAL_DISPLAY_COUNT} More Schools
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
