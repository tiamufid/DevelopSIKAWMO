import { prisma } from '@/lib/prisma';
import { normalizeOtherDocumentEntries } from '@/lib/ptwForm';

// GET - Mendapatkan semua permit planning
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const zone = searchParams.get('zone');
    const area = searchParams.get('area') || searchParams.get('areaName');
    
    const where = {};
    if (userId && userId !== 'undefined') {
      const viewer = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
      if (role === 'PTWC' && viewer?.role === 'PTWC') {
        where.OR = [
          { userId: parseInt(userId) },
          { status: 'PENDING_PTWC', user: { role: 'PA' } }
        ];
      } else {
        where.userId = parseInt(userId);
      }
    }
    if (status) where.status = status;
    if (zone) where.zone = zone;
    if (area && area !== 'all') where.areaName = area;
    
    const permits = await prisma.permitPlanning.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
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
        },
        rejector: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return Response.json({
      success: true,
      data: permits
    });
  } catch (error) {
    console.error('Error fetching permit planning:', error);
    
    return Response.json({
      success: false,
      message: 'Failed to fetch permit planning',
      error: error.message
    }, { status: 500 });
  }
}

// POST - Membuat permit planning baru
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      permitNumber,
      workDescription,
      zone,
      workLocation,
      areaName,
      workType,
      riskLevel,
      startDate,
      endDate,
      performingAuthority,
      company,
      areaAuthority,
      siteControllerName,
      safetyMeasures,
      relatedDocuments,
      coordinates,
      equipmentIdentity,
      simpleIsolation,
      sanctionToTest,
      gasMeasurement,
      userId
    } = body;

    // Zone is optional; workLocation may be supplied by the selected site layout.
    if (!workDescription || (!workLocation && !zone) || !startDate || !endDate || !userId) {
      return Response.json({
        success: false,
        message: 'Work description, work location, start date, end date, and userId are required'
      }, { status: 400 });
    }

    // Validasi user exists dan role
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      return Response.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    // Hanya PTWC, PA, atau ADMIN yang bisa membuat permit
    if (user.role !== 'PTWC' && user.role !== 'ADMIN' && user.role !== 'PA') {
      return Response.json({
        success: false,
        message: 'Only PTWC or PA can create permits'
      }, { status: 403 });
    }

    let documentsForStorage = relatedDocuments || null;
    if (user.role === 'PA' && documentsForStorage) {
      try {
        documentsForStorage = typeof documentsForStorage === 'string'
          ? JSON.parse(documentsForStorage)
          : { ...documentsForStorage };
        for (const [key, document] of Object.entries(documentsForStorage)) {
          if (document && typeof document === 'object') {
            if (key === 'other') {
              const entries = normalizeOtherDocumentEntries(document).map((entry) => ({
                ...entry,
                number: ''
              }));
              documentsForStorage[key] = {
                ...document,
                entries,
                description: entries.map((entry) => entry.description).filter(Boolean).join(', '),
                number: ''
              };
            } else {
              documentsForStorage[key] = { ...document, number: '' };
            }
          }
        }
      } catch {
        return Response.json({
          success: false,
          message: 'Invalid related document data'
        }, { status: 400 });
      }
    }

    // PA doesn't need permit number upfront (assigned by PTWC later)
    if (user.role === 'PTWC' || user.role === 'ADMIN') {
      if (!permitNumber || permitNumber.trim() === '') {
        return Response.json({
          success: false,
          message: 'Permit number is required for PTWC'
        }, { status: 400 });
      }
      // Check if permit number already exists
      const existingPermit = await prisma.permitPlanning.findFirst({
        where: { permitNumber: permitNumber.trim() }
      });
      if (existingPermit) {
        return Response.json({
          success: false,
          message: 'Permit number already exists. Please use a different permit number.'
        }, { status: 400 });
      }
    } else if (user.role === 'PA' && permitNumber && permitNumber.trim() !== '') {
      const existingPermit = await prisma.permitPlanning.findFirst({
        where: { permitNumber: permitNumber.trim() }
      });
      if (existingPermit) {
        return Response.json({
          success: false,
          message: 'Permit number already exists. Please use a different permit number.'
        }, { status: 400 });
      }
    }

    // Parse coordinates if provided
    let coordinatesData = null;
    if (coordinates) {
      try {
        if (typeof coordinates === 'string') {
          // Handle different coordinate formats
          if (coordinates.includes(';')) {
            const [x, y] = coordinates.split(';');
            coordinatesData = JSON.stringify({ x: parseFloat(x), y: parseFloat(y) });
          } else if (coordinates.includes(',')) {
            const [x, y] = coordinates.split(',');
            coordinatesData = JSON.stringify({ x: parseFloat(x), y: parseFloat(y) });
          } else {
            coordinatesData = coordinates;
          }
        } else {
          coordinatesData = JSON.stringify(coordinates);
        }
      } catch (error) {
        coordinatesData = String(coordinates);
      }
    }

    // Buat permit planning baru
    const permit = await prisma.permitPlanning.create({
      data: {
        permitNumber: user.role === 'PA' ? null : permitNumber.trim(),
        workDescription: workDescription.trim(),
        workLocation: (workLocation && String(workLocation).trim()) || zone,
        areaName: areaName || 'ORF',
        coordinates: coordinatesData,
        zone: zone || null,
        workType: workType || null,
        riskLevel: riskLevel || 'LOW',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        performingAuthority: performingAuthority || null,
        company: company || null,
        areaAuthority: areaAuthority || null,
        siteControllerName: siteControllerName || null,
        safetyMeasures: safetyMeasures || null,
        relatedDocuments: documentsForStorage ? JSON.stringify(documentsForStorage) : null,
        equipmentIdentity: equipmentIdentity || null,
        simpleIsolation: simpleIsolation || false,
        sanctionToTest: sanctionToTest || false,
        gasMeasurement: gasMeasurement ? JSON.stringify(gasMeasurement) : null,
        status: 'DRAFT',
        userId: parseInt(userId)
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
      message: 'Permit planning created successfully',
      data: permit
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating permit planning:', error);
    
    return Response.json({
      success: false,
      message: 'Failed to create permit planning',
      error: error.message
    }, { status: 500 });
  }
}
