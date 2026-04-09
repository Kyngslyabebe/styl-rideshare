'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import s from '../driverDetail.module.css';

const DOC_ORDER = ['profile_photo', 'license_front', 'license_back', 'vehicle_registration', 'insurance'];
const DOC_LABELS: Record<string, string> = {
  profile_photo: 'Profile Photo',
  license_front: "Driver's License (Front)",
  license_back: "Driver's License (Back)",
  vehicle_registration: 'Vehicle Registration',
  insurance: 'Insurance Proof',
};

interface Props {
  driver: any;
  driverId: string;
  onRefresh: () => Promise<void>;
  showToast: (msg: string) => void;
}

export default function DocumentsTab({ driver, driverId, onRefresh, showToast }: Props) {
  const supabase = createClient();
  const [viewDoc, setViewDoc] = useState<{ key: string; url: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const documents: Record<string, string> = driver.documents || {};
  const docStatus = driver.document_status;

  const handleApproveAll = async () => {
    setSaving(true);
    await supabase.from('drivers').update({
      is_approved: true,
      document_status: 'approved',
      approved_at: new Date().toISOString(),
    }).eq('id', driverId);
    await supabase.functions.invoke('send-driver-email', {
      body: { driver_id: driverId, type: 'approved' },
    });
    await onRefresh();
    setSaving(false);
    showToast('All documents approved — driver notified');
  };

  const handleRejectAll = async () => {
    if (!confirm('Reject all documents? Driver will be notified.')) return;
    setSaving(true);
    await supabase.from('drivers').update({
      is_approved: false,
      document_status: 'rejected',
    }).eq('id', driverId);
    await supabase.functions.invoke('send-driver-email', {
      body: { driver_id: driverId, type: 'rejected' },
    });
    await onRefresh();
    setSaving(false);
    showToast('Documents rejected — driver notified');
  };

  return (
    <div>
      {/* Status banner */}
      {docStatus && (
        <div className={s.card} style={{
          borderColor: docStatus === 'approved' ? 'var(--success)' : docStatus === 'rejected' ? 'var(--error)' : 'var(--orange)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <span className={`${s.badge} ${
              docStatus === 'approved' ? s.badgeApproved
                : docStatus === 'rejected' ? s.badgeRejected
                : s.badgePending
            }`} style={{ fontSize: 11 }}>
              {docStatus === 'pending_review' ? 'Pending Review'
                : docStatus === 'approved' ? 'Approved'
                : docStatus === 'rejected' ? 'Rejected'
                : docStatus}
            </span>
            {driver.documents_submitted_at && (
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 12 }}>
                Submitted {new Date(driver.documents_submitted_at).toLocaleDateString()}
              </span>
            )}
          </div>
          {docStatus === 'pending_review' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className={`${s.btn} ${s.btnSuccess}`} onClick={handleApproveAll} disabled={saving}>
                Approve All
              </button>
              <button type="button" className={`${s.btn} ${s.btnDanger}`} onClick={handleRejectAll} disabled={saving}>
                Reject All
              </button>
            </div>
          )}
        </div>
      )}

      {/* Documents grid */}
      <div className={s.docsGrid}>
        {DOC_ORDER.map((key) => {
          const url = documents[key];
          return (
            <div
              key={key}
              className={s.docCard}
              onClick={() => url && setViewDoc({ key, url })}
            >
              {url ? (
                <img src={url} alt={DOC_LABELS[key]} className={s.docThumb} />
              ) : (
                <div className={s.docMissingThumb}>Not uploaded</div>
              )}
              <div className={s.docCardBody}>
                <span className={s.docCardLabel}>{DOC_LABELS[key]}</span>
                {url ? (
                  <span className={s.docStatusUploaded}>Uploaded</span>
                ) : (
                  <span className={s.docStatusMissing}>Missing</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Full-size modal */}
      {viewDoc && (
        <div className={s.docModal} onClick={() => setViewDoc(null)}>
          <div className={s.docModalContent} onClick={(e) => e.stopPropagation()}>
            <img src={viewDoc.url} alt={DOC_LABELS[viewDoc.key]} className={s.docModalImage} />
            <div className={s.docModalFooter}>
              <span className={s.docModalTitle}>{DOC_LABELS[viewDoc.key]}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={viewDoc.url} target="_blank" rel="noopener noreferrer" className={`${s.btn} ${s.btnGhost}`}>
                  Open full size ↗
                </a>
                <button type="button" className={s.docModalClose} onClick={() => setViewDoc(null)}>✕ Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
