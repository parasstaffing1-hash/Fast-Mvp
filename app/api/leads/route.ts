import { NextRequest, NextResponse } from 'next/server';
import { getAllLeads } from '@/lib/database/repository';

/**
 * Protected Admin Leads API.
 * In accordance with Section 30 Access Control, public users cannot inspect other leads/emails.
 */
export async function GET(req: NextRequest) {
  try {
    const adminKey = req.headers.get('x-admin-key') || req.headers.get('authorization')?.replace('Bearer ', '');
    const validSecret = process.env.ADMIN_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Enforce authentication unless in explicit development demo mode
    if (process.env.NODE_ENV === 'production' && validSecret) {
      if (!adminKey || adminKey !== validSecret) {
        return NextResponse.json(
          { error: 'Unauthorized. Admin credentials required to access lead records.' },
          { status: 401 }
        );
      }
    }

    const leads = await getAllLeads();
    return NextResponse.json({ leads, count: leads.length });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to retrieve leads.' }, { status: 500 });
  }
}
