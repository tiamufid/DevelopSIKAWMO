import { useState } from 'react';
import Button from './Button';
import NotificationToast from './NotificationToast';

export default function PermitSubmitButton({ permit, user, onSubmit, hideNotification = false }) {
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });

  const canSubmit = () => {
    if (!user || !permit) return false;
    
    // PTWC, ADMIN, atau PA bisa submit permit dengan status DRAFT miliknya
    return (user.role === 'PTWC' || user.role === 'ADMIN' || user.role === 'PA') && 
           permit.status === 'DRAFT' && 
           permit.userId === user.id;
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;

    const isPA = user.role === 'PA';
    const message = isPA
      ? 'Are you sure you want to submit this permit to PTWC for review?'
      : 'Are you sure you want to submit this permit for approval? Once submitted, you cannot edit the permit until it is approved or rejected.';

    const confirmed = confirm(message);

    if (!confirmed) return;

    setLoading(true);
    try {
      const endpoint = isPA
        ? `/api/permit-planning/${permit.id}/submit-to-ptwc`
        : `/api/permit-planning/${permit.id}/submit`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id
        }),
      });

      const result = await response.json();

      if (result.success) {
        if (!hideNotification) {
          setNotification({
            show: true,
            message: isPA ? 'Permit submitted to PTWC successfully!' : 'Permit submitted for AA approval successfully!',
            type: 'success'
          });
        }
        if (onSubmit) onSubmit(result.data);
      } else {
        if (!hideNotification) {
          setNotification({
            show: true,
            message: `Failed to submit permit: ${result.message}`,
            type: 'error'
          });
        }
      }
    } catch (error) {
      console.error('Error submitting permit:', error);
      if (!hideNotification) {
        setNotification({
          show: true,
          message: 'Failed to submit permit',
          type: 'error'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!canSubmit()) {
    return null;
  }

  return (
    <>
      <Button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700"
      >
        {loading ? 'Submitting...' : (user.role === 'PA' ? 'Submit to PTWC' : 'Submit for Approval')}
      </Button>

      {/* Notification Toast - Only show if not hidden by parent */}
      {!hideNotification && (
        <NotificationToast
          notification={notification.show ? notification : null}
          onClose={() => setNotification({ show: false, message: "", type: "" })}
        />
      )}
    </>
  );
}
