import { prisma } from '@/lib/prisma';
import { normalizeOtherDocumentEntries } from '@/lib/ptwForm';

// POST - Submit permit untuk approval (hanya PTWC)
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId } = body;

    // Validasi input
    if (!userId) {
      return Response.json({
        success: false,
        message: 'User ID is required'
      }, { status: 400 });
    }

    // Validasi user exists dan role PTWC
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      return Response.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    if (user.role !== 'PTWC' && user.role !== 'ADMIN') {
      return Response.json({
        success: false,
        message: 'Only PTWC can submit permits for approval'
      }, { status: 403 });
    }

    // Dapatkan permit
    const permit = await prisma.permitPlanning.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: { select: { id: true, role: true } }
      }
    });

    if (!permit) {
      return Response.json({
        success: false,
        message: 'Permit not found'
      }, { status: 404 });
    }

    const isPTWCReview = user.role === 'PTWC'
      && permit.status === 'PENDING_PTWC'
      && permit.user?.role === 'PA';

    // PTWC may submit PA-owned requests after assigning the required numbers.
    if (permit.userId !== parseInt(userId) && user.role !== 'ADMIN' && !isPTWCReview) {
      return Response.json({
        success: false,
        message: 'You are not allowed to submit this permit'
      }, { status: 403 });
    }

    if (!isPTWCReview && permit.status !== 'DRAFT') {
      return Response.json({
        success: false,
        message: 'Only draft permits can be submitted'
      }, { status: 400 });
    }

    const requiredFields = [
      'workType',
      'workDescription',
      'startDate',
      'endDate',
      'performingAuthority',
      'company',
      'areaAuthority',
      'siteControllerName'
    ];
    const missingFields = requiredFields.filter((field) => {
      const value = permit[field];
      return value == null || (typeof value === 'string' && !value.trim());
    });
    if (missingFields.length) {
      return Response.json({
        success: false,
        message: `Complete the permit fields before submitting: ${missingFields.join(', ')}`
      }, { status: 400 });
    }

    if (!permit.permitNumber?.trim()) {
      return Response.json({
        success: false,
        message: isPTWCReview
          ? 'PTWC must assign a permit number first'
          : 'A permit number is required before submitting to AA'
      }, { status: 400 });
    }

    let documents = {};
    try {
      documents = typeof permit.relatedDocuments === 'string'
        ? JSON.parse(permit.relatedDocuments || '{}')
        : (permit.relatedDocuments || {});
    } catch {
      return Response.json({ success: false, message: 'Invalid permit document data' }, { status: 400 });
    }

    let gasMeasurement = {};
    try {
      gasMeasurement = typeof permit.gasMeasurement === 'string'
        ? JSON.parse(permit.gasMeasurement || '{}')
        : (permit.gasMeasurement || {});
    } catch {
      return Response.json({ success: false, message: 'Invalid permit safety data' }, { status: 400 });
    }

    const requiredDocumentKeys = new Set(['ra', 'jsa']);
    if (permit.workType === 'COLD_WORK') {
      requiredDocumentKeys.add('workProcedure');
    } else if (permit.workType === 'COLD_WORK_BREAKING' || permit.workType === 'HOT_WORK_FLAME') {
      ['icc', 'workProcedure', 'swc'].forEach((key) => requiredDocumentKeys.add(key));
    } else if (permit.workType === 'HOT_WORK_SPARK') {
      requiredDocumentKeys.add('workProcedure');
      const activities = Array.isArray(gasMeasurement.criticalActivities)
        ? gasMeasurement.criticalActivities
        : [];
      if (!activities.length) {
        return Response.json({ success: false, message: 'Select at least one critical work activity' }, { status: 400 });
      }
      if (activities.includes('live_electrical')) requiredDocumentKeys.add('icc');
      if (activities.some((key) => ['working_at_height', 'critical_lift', 'ground_disturbance'].includes(key))) {
        requiredDocumentKeys.add('swc');
      }
    }

    for (const key of requiredDocumentKeys) {
      if (!documents[key]?.checked) {
        return Response.json({
          success: false,
          message: `The ${key} document is required for this permit type`
        }, { status: 400 });
      }
    }

    for (const [key, document] of Object.entries(documents)) {
      if (key === 'other' && document?.checked) {
        const entries = normalizeOtherDocumentEntries(document);
        if (entries.some((entry) => !entry.description.trim())) {
          return Response.json({
            success: false,
            message: 'PA must specify the name of every other document'
          }, { status: 400 });
        }
        if (entries.some((entry) => !entry.number.trim())) {
          return Response.json({
            success: false,
            message: 'PTWC must assign a number for every other document'
          }, { status: 400 });
        }
        continue;
      }
      if (document?.checked && !String(document?.number || '').trim()) {
        return Response.json({
          success: false,
          message: `PTWC must assign the number for ${key} when that document is selected`
        }, { status: 400 });
      }
    }

    const updatedPermit = await prisma.permitPlanning.update({
      where: { id: parseInt(id) },
      data: {
        status: 'PENDING_AA_APPROVAL',
        ...(isPTWCReview ? {
          ptwcAssignedBy: user.id,
          ptwcAssignedAt: new Date()
        } : {})
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    return Response.json({
      success: true,
      message: 'Permit submitted for AA approval',
      data: updatedPermit
    });

  } catch (error) {
    console.error('Error submitting permit:', error);
    
    return Response.json({
      success: false,
      message: 'Failed to submit permit',
      error: error.message
    }, { status: 500 });
  }
}
