import { NextResponse } from 'next/server';

// Schema changes must be reviewed and run through a versioned migration process.
// Keeping a database-altering endpoint in the web application is unsafe.
export async function GET() {
  return NextResponse.json(
    { message: 'Database migrations must be run outside the web application' },
    { status: 410 }
  );
}
