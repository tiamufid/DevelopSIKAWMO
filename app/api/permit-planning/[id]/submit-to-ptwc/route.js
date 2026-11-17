import { prisma } from '@/lib/prisma';
import { normalizeOtherDocumentEntries } from '@/lib/ptwForm';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return Response.json({ success: false, message: 'User ID is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
    if (!user) {
      return Response.json({ success: false, message: 'User not found' }, { status: 404 });
    }
    if (user.role !== 'PA' && user.role !== 'ADMIN') {
      return Response.json({ success: false, message: 'Only PA can submit to PTWC' }, { status: 403 });
    }

    const permit = await prisma.permitPlanning.findUnique({ where: { id: parseInt(id) } });
    if (!permit) {
      return Response.json({ success: false, message: 'Permit not found' }, { status: 404 });
    }
    if (permit.userId !== parseInt(userId) && user.role !== 'ADMIN') {
      return Response.json({ success: false, message: 'You can only submit your own permits' }, { status: 403 });
    }
    if (permit.status !== 'DRAFT') {
      return Response.json({ success: false, message: 'Only draft permits can be submitted' }, { status: 400 });
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

    let documents = {};
    let gasMeasurement = {};
    try {
      documents = typeof permit.relatedDocuments === 'string'
        ? JSON.parse(permit.relatedDocuments || '{}')
        : (permit.relatedDocuments || {});
      gasMeasurement = typeof permit.gasMeasurement === 'string'
        ? JSON.parse(permit.gasMeasurement || '{}')
        : (permit.gasMeasurement || {});
    } catch {
      return Response.json({ success: false, message: 'Invalid permit pack data' }, { status: 400 });
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

    if (
      documents.other?.checked &&
      normalizeOtherDocumentEntries(documents.other).some((entry) => !entry.description.trim())
    ) {
      return Response.json({
        success: false,
        message: 'PA must specify the name of every other document'
      }, { status: 400 });
    }

    const updatedPermit = await prisma.permitPlanning.update({
      where: { id: parseInt(id) },
      data: { status: 'PENDING_PTWC' },
      include: { user: { select: { id: true, name: true, email: true, role: true } } }
    });

    return Response.json({ success: true, message: 'Permit submitted to PTWC for review', data: updatedPermit });
  } catch (error) {
    console.error('Error submitting permit to PTWC:', error);
    return Response.json({ success: false, message: 'Failed to submit permit', error: error.message }, { status: 500 });
  }
}
