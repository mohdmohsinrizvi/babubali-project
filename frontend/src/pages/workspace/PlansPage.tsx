import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/Button';
import ErrorState from '../../components/ErrorState';
import LoadingState from '../../components/LoadingState';
import PageHeader from '../../components/PageHeader';
import { deleteFloorPlan, getFloorPlanFileUrl, listFloorPlans, uploadFloorPlan } from '../../api/floorPlans';
import { getProject } from '../../api/projects';
import { useTranslation } from '../../i18n/LanguageContext';
import type { FloorPlan } from '../../types/floorPlan';
import type { ProjectResponse } from '../../types/project';
import './PlansPage.css';

export default function PlansPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const id = Number(projectId);

  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [plans, setPlans] = useState<FloorPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState<number>(0);
  const [floorNameInput, setFloorNameInput] = useState<string>('Ground Floor');
  const [planTypeInput, setPlanTypeInput] = useState<string>('ARCHITECTURAL');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [projData, plansData] = await Promise.all([
        getProject(id),
        listFloorPlans(id),
      ]);
      setProject(projData);
      setPlans(plansData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load floor plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleOpenUpload = (floorNum: number, defaultName: string) => {
    setSelectedFloor(floorNum);
    setFloorNameInput(defaultName);
    setSelectedFile(null);
    setUploadError(null);
    setIsModalOpen(true);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError(t('plans.validationSelectFile', 'Please select a file to upload.'));
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);
      await uploadFloorPlan(
        id,
        selectedFile,
        selectedFloor,
        floorNameInput,
        planTypeInput
      );
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : t('plans.validationError', 'Upload failed. Only PDF, PNG, JPG under 25MB are supported.'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (planId: number) => {
    if (!window.confirm(t('plans.confirmDeletePlan', 'Are you sure you want to delete this floor plan? This will also remove any analysis.'))) {
      return;
    }
    try {
      await deleteFloorPlan(planId);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete plan');
    }
  };

  if (loading) {
    return <LoadingState message={t('workspace.loadingProject', 'Loading project floor plans...')} />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  // Pre-calculate floor slots based on project.floorCount or existing plans
  const totalFloorSlots = Math.max(project?.floorCount ?? 1, plans.length, 1);
  const slots = [];
  for (let i = 0; i < totalFloorSlots; i++) {
    const defaultTitle =
      i === 0
        ? t('plans.groundFloor', 'Ground Floor')
        : i === 1
        ? t('plans.firstFloor', '1st Floor')
        : i === 2
        ? t('plans.secondFloor', '2nd Floor')
        : t('plans.floorN', { n: i }, `Floor ${i}`);
    const plan = plans.find((p) => p.floorNumber === i);
    slots.push({ floorNumber: i, defaultTitle, plan });
  }

  return (
    <div className="plans-page">
      <PageHeader
        title={t('plans.pageTitle', 'Floor Plan Upload')}
        subtitle={t('plans.pageSubtitle', 'Upload multi-floor architectural drawings (PDF, PNG, JPG). Once uploaded, send them to the AI Analysis module.')}
        actions={
          <Button variant="primary" onClick={() => handleOpenUpload(plans.length, `Floor ${plans.length}`)}>
            {t('plans.uploadNewPlan', '+ Upload New Plan')}
          </Button>
        }
      />

      <div className="plans-grid">
        {slots.map(({ floorNumber, defaultTitle, plan }) => {
          if (!plan) {
            return (
              <div key={floorNumber} className="plan-card empty">
                <div className="plan-card-header">
                  <div>
                    <h3 className="plan-card-title">{defaultTitle}</h3>
                    <span className="plan-card-type">{t('plans.noDrawingUploaded', 'No Drawing Uploaded')}</span>
                  </div>
                  <span className="badge-tag" style={{ background: '#f1f5f9', color: '#64748b' }}>
                    {t('common.empty', 'EMPTY')}
                  </span>
                </div>
                <p className="plan-meta">{t('plans.emptyCardDesc', 'Upload the architectural floor plan for this level.')}</p>
                <div className="plan-card-actions">
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => handleOpenUpload(floorNumber, defaultTitle)}
                  >
                    {t('plans.uploadDrawing', 'Upload Drawing')}
                  </Button>
                </div>
              </div>
            );
          }

          const fileUrl = getFloorPlanFileUrl(plan.id);
          const sizeKb = (plan.fileSize / 1024).toFixed(1);

          return (
            <div key={plan.id} className="plan-card">
              <div className="plan-card-header">
                <div>
                  <h3 className="plan-card-title">{plan.floorName}</h3>
                  <span className="plan-card-type">{plan.planType}</span>
                </div>
                <span className={`badge-tag ${plan.status.toLowerCase()}`}>
                  {plan.status}
                </span>
              </div>

              <div className="plan-file-info">
                <span className="plan-filename">📄 {plan.fileName}</span>
                <span className="plan-meta">
                  {t('common.size', 'Size')}: {sizeKb} {t('common.kb', 'KB')} • {new Date(plan.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="plan-card-actions">
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--secondary btn--small"
                  style={{ textDecoration: 'none' }}
                >
                  {t('common.viewFile', 'View File')}
                </a>
                <Button
                  variant="primary"
                  size="small"
                  onClick={() => navigate(`/projects/${id}/analysis?floor=${plan.id}`)}
                >
                  {plan.status === 'CONFIRMED' ? t('plans.viewAnalysis', 'View Analysis') : t('plans.runAiAnalysis', 'Run AI Analysis →')}
                </Button>
                <Button
                  variant="danger"
                  size="small"
                  onClick={() => handleDelete(plan.id)}
                >
                  {t('plans.deletePlan', 'Delete')}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="upload-modal-overlay">
          <div className="upload-modal">
            <div className="upload-modal-header">
              <h3>{t('plans.modalTitle', 'Upload Floor Plan')}</h3>
              <button
                type="button"
                className="btn btn--secondary btn--small"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {uploadError && <div className="form-error">{uploadError}</div>}

            <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  {t('plans.floorLevel', 'Floor Level')}
                </label>
                <select
                  value={selectedFloor}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSelectedFloor(val);
                    setFloorNameInput(val === 0 ? 'Ground Floor' : `Floor ${val}`);
                  }}
                  className="form-input"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                >
                  <option value={0}>{t('plans.level0', 'Ground Floor (Level 0)')}</option>
                  <option value={1}>{t('plans.level1', '1st Floor (Level 1)')}</option>
                  <option value={2}>{t('plans.level2', '2nd Floor (Level 2)')}</option>
                  <option value={3}>{t('plans.level3', '3rd Floor (Level 3)')}</option>
                  <option value={4}>{t('plans.level4', '4th Floor (Level 4)')}</option>
                  <option value={99}>{t('plans.structuralFoundation', 'Structural / Foundation Drawing')}</option>
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  {t('workspace.details.name', 'Floor / Drawing Name')}
                </label>
                <input
                  type="text"
                  value={floorNameInput}
                  onChange={(e) => setFloorNameInput(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  {t('plans.planType', 'Drawing Type')}
                </label>
                <select
                  value={planTypeInput}
                  onChange={(e) => setPlanTypeInput(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                >
                  <option value="ARCHITECTURAL">{t('plans.architectural', 'Architectural Floor Plan')}</option>
                  <option value="STRUCTURAL">{t('plans.structural', 'Structural Column/Beam Plan')}</option>
                  <option value="ELECTRICAL">{t('plans.electrical', 'Electrical & Plumbing Drawing')}</option>
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  {t('plans.drawingFile', 'Select File (PDF, PNG, JPG, WEBP)')}
                </label>
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={uploading}>
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button variant="primary" type="submit" disabled={uploading}>
                  {uploading ? t('plans.uploadingButton', 'Uploading...') : t('plans.uploadButton', 'Upload Plan')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
