import { prisma } from '@/lib/prisma';

// GET - Mendapatkan permit planning berdasarkan ID
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    
    const permit = await prisma.permitPlanning.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        aaApprover: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        scApprover: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!permit) {
      return Response.json({
        success: false,
        message: 'Permit not found'
      }, { status: 404 });
    }
    
    return Response.json({
      success: true,
      data: permit
    });
  } catch (error) {
    console.error('Error fetching permit:', error);
    
    return Response.json({
      success: false,
      message: 'Failed to fetch permit',
      error: error.message
    }, { status: 500 });
  }
}

// PUT - Update permit planning
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const userId = Number.parseInt(body.userId, 10);
    
    // Check if permit exists
    const existingPermit = await prisma.permitPlanning.findUnique({
      where: { id: parseInt(id) },
      include: { user: { select: { role: true } } }
    });
    
    if (!existingPermit) {
      return Response.json({
        success: false,
        message: 'Permit not found'
      }, { status: 404 });
    }

    const user = Number.isInteger(userId)
      ? await prisma.user.findUnique({ where: { id: userId } })
      : null;
    if (!user) {
      return Response.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const ownsPermit = existingPermit.userId === userId;
    const canEditOwnDraft = ownsPermit && existingPermit.status === 'DRAFT'
      && ['PA', 'PTWC'].includes(user.role);
    const canReviewPARequest = user.role === 'PTWC'
      && existingPermit.status === 'PENDING_PTWC'
      && existingPermit.user?.role === 'PA';
    if (user.role !== 'ADMIN' && !canEditOwnDraft && !canReviewPARequest) {
      return Response.json({
        success: false,
        message: 'You are not allowed to edit this permit'
      }, { status: 403 });
    }

    let documentsForStorage = body.relatedDocuments
      ? (typeof body.relatedDocuments === 'string'
        ? JSON.parse(body.relatedDocuments)
        : { ...body.relatedDocuments })
      : null;
    if (user.role === 'PA' && documentsForStorage) {
      let existingDocuments = {};
      try {
        existingDocuments = typeof existingPermit.relatedDocuments === 'string'
          ? JSON.parse(existingPermit.relatedDocuments || '{}')
          : (existingPermit.relatedDocuments || {});
      } catch {}
      for (const [key, document] of Object.entries(documentsForStorage)) {
        if (document && typeof document === 'object') {
          documentsForStorage[key] = {
            ...document,
            number: existingDocuments[key]?.number || ''
          };
        }
      }
    } else if (canReviewPARequest && documentsForStorage) {
      let existingDocuments = {};
      try {
        existingDocuments = typeof existingPermit.relatedDocuments === 'string'
          ? JSON.parse(existingPermit.relatedDocuments || '{}')
          : (existingPermit.relatedDocuments || {});
      } catch {}

      const documentKeys = new Set([
        ...Object.keys(existingDocuments),
        ...Object.keys(documentsForStorage)
      ]);
      for (const key of documentKeys) {
        const existingDocument = existingDocuments[key] || {};
        const submittedDocument = documentsForStorage[key] || {};
        documentsForStorage[key] = {
          ...submittedDocument,
          checked: Boolean(existingDocument.checked),
          description: existingDocument.description || '',
          number: existingDocument.checked
            ? (submittedDocument.number || '')
            : (existingDocument.number || '')
        };
      }
    }

    const permitNumber = user.role === 'PA'
      ? existingPermit.permitNumber
      : (body.permitNumber || existingPermit.permitNumber);

    // Check if permit number is being changed and if the new permit number already exists
    if (permitNumber && permitNumber !== existingPermit.permitNumber) {
      const permitWithSameNumber = await prisma.permitPlanning.findFirst({
        where: { 
          permitNumber,
          id: { not: parseInt(id) } // Exclude current permit from check
        }
      });
      
      if (permitWithSameNumber) {
        return Response.json({
          success: false,
          message: 'Permit number already exists. Please use a different permit number.'
        }, { status: 400 });
      }
    }
    
    // Update permit
    const updatedPermit = await prisma.permitPlanning.update({
      where: { id: parseInt(id) },
      data: {
        permitNumber,
        workDescription: body.workDescription,
        workLocation: body.workLocation || body.zone, // fallback to zone if workLocation not provided
        areaName: body.areaName || existingPermit.areaName || 'ORF',
        workType: body.workType,
        zone: body.zone || existingPermit.zone || null,
        riskLevel: body.riskLevel,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        performingAuthority: body.performingAuthority,
        company: body.company,
        areaAuthority: body.areaAuthority,
        siteControllerName: body.siteControllerName,
        safetyMeasures: body.safetyMeasures,
        ppeRequired: body.equipmentNeeded || body.ppeRequired,
        emergencyContact: body.emergencyProcedure || body.emergencyContact,
        relatedDocuments: documentsForStorage
          ? JSON.stringify(documentsForStorage)
          : existingPermit.relatedDocuments,
        equipmentIdentity: body.equipmentIdentity,
        simpleIsolation: body.simpleIsolation ?? existingPermit.simpleIsolation,
        sanctionToTest: body.sanctionToTest ?? existingPermit.sanctionToTest,
        gasMeasurement: body.gasMeasurement ? JSON.stringify(body.gasMeasurement) : existingPermit.gasMeasurement,
        coordinates: body.coordinates ? (typeof body.coordinates === 'string' ? body.coordinates : JSON.stringify(body.coordinates)) : null,
        status: existingPermit.status,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    return Response.json({
      success: true,
      message: 'Permit updated successfully',
      data: updatedPermit
    });
  } catch (error) {
    console.error('Error updating permit:', error);
    
    return Response.json({
      success: false,
      message: 'Failed to update permit',
      error: error.message
    }, { status: 500 });
  }
}

// DELETE - Hapus permit planning
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    
    // Check if permit exists
    const existingPermit = await prisma.permitPlanning.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!existingPermit) {
      return Response.json({
        success: false,
        message: 'Permit not found'
      }, { status: 404 });
    }
    
    
    // Delete permit
    await prisma.permitPlanning.delete({
      where: { id: parseInt(id) }
    });
    
    return Response.json({
      success: true,
      message: 'Permit deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting permit:', error);
    
    return Response.json({
      success: false,
      message: 'Failed to delete permit',
      error: error.message
    }, { status: 500 });
  }
}
