import { NextResponse } from 'next/server';
import { getLicenseInfo } from '@/lib/license';

export async function GET() {
  try {
    const license = await getLicenseInfo();

    return NextResponse.json({
      isPro: license.isPro,
      tier: license.tier,
      maxUsers: license.maxUsers,
      features: license.features,
      defaultPaperSize: license.defaultPaperSize,
      defaultOrientation: license.defaultOrientation,
      allowedPaperSizes: license.allowedPaperSizes,
      allowedOrientations: license.allowedOrientations,
    });
  } catch (error) {
    console.error('License status check error:', error);
    return NextResponse.json({
      isPro: false,
      tier: 'STANDARD',
      maxUsers: 50,
      features: {
        biometrics: false,
        unlimitedUsers: false,
        holidayCalendar: false,
        customKop: false,
        backupRestore: false,
        suket: false,
        agenda: false,
      },
      defaultPaperSize: 'F4',
      defaultOrientation: 'landscape',
      allowedPaperSizes: ['F4'],
      allowedOrientations: ['landscape'],
    });
  }
}
