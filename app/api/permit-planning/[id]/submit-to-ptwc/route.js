import { prisma } from '@/lib/prisma';

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
