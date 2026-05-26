/**
 * Opportunity Zone Lookup Service
 *
 * Checks whether a census tract is a designated Qualified Opportunity Zone (QOZ).
 * Uses the locally cached IRS/Treasury OZ list in the opportunity_zones table.
 *
 * OZ 1.0: ~8,764 designated tracts, benefits expire 2028
 * OZ 2.0: New designations expected late 2026
 */

import { db } from '../db';
import { opportunityZones } from '@shared/schema';
import { eq } from 'drizzle-orm';
import type { OpportunityZoneData } from '@shared/schema';

export async function lookupOpportunityZone(censusTract: string): Promise<OpportunityZoneData> {
  const NOT_OZ: OpportunityZoneData = {
    isOpportunityZone: false,
    censusTract,
    designation: null,
    benefitsExpireYear: null,
    insight: 'This property is not located in a designated Opportunity Zone.',
  };

  if (!censusTract || censusTract.length !== 11) {
    return NOT_OZ;
  }

  try {
    const rows = await db
      .select()
      .from(opportunityZones)
      .where(eq(opportunityZones.censusTract, censusTract))
      .limit(1);

    if (rows.length === 0) {
      return NOT_OZ;
    }

    return {
      isOpportunityZone: true,
      censusTract,
      designation: 'OZ 1.0',
      benefitsExpireYear: 2028,
      insight:
        'This property is in a federally designated Opportunity Zone (OZ 1.0). ' +
        'Investors may defer and potentially reduce capital gains taxes by investing through a Qualified Opportunity Fund. ' +
        'Current designations run through 2028. OZ 2.0 redesignations are expected in late 2026.',
    };
  } catch (error: any) {
    console.error('[OZ Lookup] Error:', error.message);
    return NOT_OZ;
  }
}
