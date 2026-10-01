import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import LoadingState from '../../components/LoadingState';
import PageHeader from '../../components/PageHeader';
import { getFloorPlanFileUrl, listFloorPlans } from '../../api/floorPlans';
import {
  analyzePlan,
  confirmPlanAnalysis,
  getPlanAnalysis,
  getProjectConfirmedPlans,
  updatePlanAnalysis,
} from '../../api/planAnalysis';
import { useTranslation } from '../../i18n/LanguageContext';
import type { FloorPlan, PlanAnalysis, ProjectConfirmedPlans, Room } from '../../types/floorPlan';
import './AiAnalysisPage.css';

export default function AiAnalysisPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const id = Number(projectId);

  const [plans, setPlans] = useState<FloorPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<PlanAnalysis | null>(null);
  const [confirmedProjectData, setConfirmedProjectData] = useState<ProjectConfirmedPlans | null>(null);

  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI API Key configuration
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [showApiKeySettings, setShowApiKeySettings] = useState(false);
  const [apiKeySavedNotice, setApiKeySavedNotice] = useState(false);

  // View state
  const [showDrawingPreview, setShowDrawingPreview] = useState(true);
  const [showMember3Data, setShowMember3Data] = useState(false);

  // New room modal state
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomType, setNewRoomType] = useState('BEDROOM');
  const [newRoomLength, setNewRoomLength] = useState(12);
  const [newRoomWidth, setNewRoomWidth] = useState(10);

  // Inline editing state
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editRoomName, setEditRoomName] = useState('');
  const [editRoomLength, setEditRoomLength] = useState(10);
  const [editRoomWidth, setEditRoomWidth] = useState(10);

  // Parse query params for floor plan selection
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const floorParam = params.get('floor');
    if (floorParam) {
      setSelectedPlanId(Number(floorParam));
    }
  }, [location.search]);

  // Load project plans
  useEffect(() => {
    async function init() {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const planList = await listFloorPlans(id);
        setPlans(planList);

        if (planList.length > 0) {
          const current = selectedPlanId ?? planList[0].id;
          setSelectedPlanId(current);
          await loadAnalysisForPlan(current);
        }
        await loadConfirmedMaster();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analysis page');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [id]);

  const loadAnalysisForPlan = async (planId: number) => {
    try {
      const data = await getPlanAnalysis(planId);
      setAnalysis(data);
    } catch {
      setAnalysis(null);
    }
  };

  const loadConfirmedMaster = async () => {
    try {
      const data = await getProjectConfirmedPlans(id);
      setConfirmedProjectData(data);
    } catch {
      setConfirmedProjectData(null);
    }
  };

  const handleSelectFloor = async (planId: number) => {
    setSelectedPlanId(planId);
    setLoading(true);
    await loadAnalysisForPlan(planId);
    setLoading(false);
  };

  const handleSaveApiKey = () => {
    localStorage.setItem('gemini_api_key', apiKey.trim());
    setApiKeySavedNotice(true);
    setTimeout(() => setApiKeySavedNotice(false), 3000);
  };

  const handleRunAnalysis = async () => {
    if (!selectedPlanId) return;
    try {
      setAnalyzing(true);
      setError(null);
      const result = await analyzePlan(selectedPlanId, apiKey);
      setAnalysis(result);
      const updatedPlans = await listFloorPlans(id);
      setPlans(updatedPlans);
      await loadConfirmedMaster();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirmAnalysis = async () => {
    if (!selectedPlanId || !analysis) return;
    try {
      setConfirming(true);
      const result = await confirmPlanAnalysis(selectedPlanId);
      setAnalysis(result);
      const updatedPlans = await listFloorPlans(id);
      setPlans(updatedPlans);
      await loadConfirmedMaster();
      alert('Floor plan analysis confirmed! Data is now locked and published for Member 3 (Estimation).');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Confirmation failed');
    } finally {
      setConfirming(false);
    }
  };

  const startEditRoom = (room: Room) => {
    setEditingRoomId(room.id);
    setEditRoomName(room.name);
    setEditRoomLength(room.lengthFt);
    setEditRoomWidth(room.widthFt);
  };

  const handleSaveRoomEdit = async () => {
    if (!analysis || !selectedPlanId || !editingRoomId) return;
    setSavingEdit(true);
    const updatedRooms = analysis.rooms.map((r) => {
      if (r.id === editingRoomId) {
        const area = Number((editRoomLength * editRoomWidth).toFixed(2));
        return {
          ...r,
          name: editRoomName,
          lengthFt: editRoomLength,
          widthFt: editRoomWidth,
          areaSqFt: area,
        };
      }
      return r;
    });

    try {
      const result = await updatePlanAnalysis(selectedPlanId, {
        rooms: updatedRooms,
        openings: analysis.openings,
        stairs: analysis.stairs,
      });
      setAnalysis(result);
      setEditingRoomId(null);
      await loadConfirmedMaster();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save room update');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!analysis || !selectedPlanId) return;
    const updatedRooms = analysis.rooms.filter((r) => r.id !== roomId);
    try {
      const result = await updatePlanAnalysis(selectedPlanId, {
        rooms: updatedRooms,
        openings: analysis.openings,
        stairs: analysis.stairs,
      });
      setAnalysis(result);
      await loadConfirmedMaster();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete room');
    }
  };

  const handleAddRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!analysis || !selectedPlanId) return;

    const area = Number((newRoomLength * newRoomWidth).toFixed(2));
    const newRoom: Room = {
      id: `rm-custom-${Date.now()}`,
      name: newRoomName || 'Custom Room',
      roomType: newRoomType,
      lengthFt: newRoomLength,
      widthFt: newRoomWidth,
      heightFt: 10.0,
      areaSqFt: area,
    };

    const updatedRooms = [...analysis.rooms, newRoom];
    try {
      const result = await updatePlanAnalysis(selectedPlanId, {
        rooms: updatedRooms,
        openings: analysis.openings,
        stairs: analysis.stairs,
      });
      setAnalysis(result);
      setShowAddRoom(false);
      setNewRoomName('');
      await loadConfirmedMaster();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add room');
    }
  };

  if (loading) {
    return <LoadingState message={t('common.loading', 'Loading plan analysis...')} />;
  }

  if (plans.length === 0) {
    return (
      <div className="analysis-page">
        <PageHeader
          title={t('analysis.pageTitle', 'AI Plan Analysis')}
          subtitle={t('analysis.pageSubtitle', 'Extract room dimensions, doors, windows, and structural areas from your uploaded floor plans.')}
        />
        <EmptyState
          title={t('analysis.emptyTitle', 'No Floor Plans Uploaded Yet')}
          message={t('analysis.emptyDesc', 'Please upload at least one floor plan drawing in the Plans tab before running AI analysis.')}
          action={
            <Button variant="primary" onClick={() => navigate(`/projects/${id}/plans`)}>
              {t('analysis.goToPlansBtn', 'Go to Floor Plan Upload')}
            </Button>
          }
        />
      </div>
    );
  }

  const currentPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];
  const fileUrl = getFloorPlanFileUrl(currentPlan.id);

  return (
    <div className="analysis-page">
      <PageHeader
        title={t('analysis.pageTitle', 'AI Plan Analysis & Review')}
        subtitle={t('analysis.pageSubtitle', "Verify and correct AI-extracted rooms, dimensions, and openings from your uploaded drawing. Once confirmed, this data feeds Member 3's estimation engine.")}
        actions={
          analysis && analysis.status !== 'CONFIRMED' ? (
            <Button variant="primary" onClick={handleConfirmAnalysis} disabled={confirming}>
              {confirming ? t('analysis.confirmingBtn', 'Confirming...') : t('analysis.confirmAnalysisBtn', '✓ Confirm Plan Analysis')}
            </Button>
          ) : analysis?.status === 'CONFIRMED' ? (
            <span className="badge-tag confirmed" style={{ fontSize: '0.9rem', padding: '6px 12px' }}>
              {t('analysis.analysisConfirmedBadge', '✓ Analysis Confirmed')}
            </span>
          ) : null
        }
      />

      {error && <ErrorState message={error} />}

      {/* AI Vision Engine Configuration Drawer */}
      <div className="ai-settings-banner">
        <div className="ai-settings-top">
          <div>
            <strong style={{ color: '#1e3a8a' }}>🤖 {t('analysis.aiSettingsTitle', 'Vision AI Engine Configuration')}</strong>
            <p className="plan-meta" style={{ marginTop: '2px' }}>
              {apiKey
                ? t('analysis.geminiConfiguredMsg', 'Gemini Multimodal Vision API is configured. AI scans image pixels directly.')
                : t('analysis.deterministicMsg', 'Using Free-First Deterministic Engine. For automated multimodal image recognition, enter a free Gemini Vision API key.')}
            </p>
          </div>
          <Button
            variant="secondary"
            size="small"
            onClick={() => setShowApiKeySettings(!showApiKeySettings)}
          >
            {showApiKeySettings
              ? t('analysis.closeSettings', 'Close AI Settings')
              : apiKey
              ? t('analysis.changeKey', 'Change API Key')
              : t('analysis.configureKey', 'Configure Gemini API Key')}
          </Button>
        </div>

        {showApiKeySettings && (
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="ai-key-input-row">
              <input
                type="password"
                placeholder={t('analysis.keyPlaceholder', 'Paste Google AI Studio Gemini API Key (e.g. AIzaSy...)')}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="ai-key-input"
              />
              <Button variant="primary" size="small" onClick={handleSaveApiKey}>
                {t('analysis.saveKey', 'Save Key')}
              </Button>
            </div>
            {apiKeySavedNotice && (
              <span style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 600 }}>
                {t('analysis.keySaved', '✓ API key saved locally!')}
              </span>
            )}
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Get a free API key with 15 RPM free quota in 10 seconds from{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--color-primary)', fontWeight: 600 }}
              >
                {t('analysis.freeKeyLink', 'Google AI Studio ↗')}
              </a>
              . No credit card required.
            </span>
          </div>
        )}
      </div>

      {/* Floor Plan Selector Tabs */}
      <div className="analysis-header-row">
        <div>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>
            {t('analysis.activeDrawing', 'ACTIVE FLOOR DRAWING:')}
          </span>
          <div className="floor-tabs">
            {plans.map((p) => (
              <button
                key={p.id}
                className={`floor-tab-btn ${p.id === currentPlan.id ? 'active' : ''}`}
                onClick={() => handleSelectFloor(p.id)}
              >
                {p.floorName} ({p.status})
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button
            variant="secondary"
            size="small"
            onClick={() => setShowDrawingPreview(!showDrawingPreview)}
          >
            {showDrawingPreview ? t('analysis.hideDrawing', 'Hide Drawing') : t('analysis.showDrawing', 'Show Drawing Side-by-Side')}
          </Button>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--secondary btn--small"
            style={{ textDecoration: 'none' }}
          >
            {t('common.openFile', 'Open File ↗')}
          </a>
          <Button
            variant="secondary"
            size="small"
            onClick={() => setShowMember3Data(!showMember3Data)}
          >
            {showMember3Data ? t('analysis.hideContract', 'Hide Member 3 JSON') : t('analysis.member3Contract', 'Member 3 Contract')}
          </Button>
        </div>
      </div>

      {/* Member 3 Data Contract Preview */}
      {showMember3Data && (
        <div className="analysis-card" style={{ borderColor: 'var(--color-primary)' }}>
          <div className="card-title-row">
            <div>
              <h3>{t('analysis.contractTitle', 'Member 3 (Estimation) Integration Contract')}</h3>
              <p className="plan-meta" style={{ marginTop: '4px' }}>
                {t('analysis.contractDesc', 'Master endpoint: GET /api/projects/{id}/confirmed-plans. Member 3 consumes this verified JSON to compute materials and costs.')}
              </p>
            </div>
            <Button
              variant="secondary"
              size="small"
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(confirmedProjectData, null, 2));
                alert(t('analysis.copyContractSuccess', 'Copied Member 3 JSON contract to clipboard!'));
              }}
            >
              {t('common.copyJson', 'Copy JSON')}
            </Button>
          </div>
          <pre className="handoff-box">{JSON.stringify(confirmedProjectData, null, 2)}</pre>
        </div>
      )}

      {/* Analysis Workspace */}
      {!analysis ? (
        <div className="analysis-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <h3 style={{ marginBottom: '8px' }}>{t('analysis.readyTitle', 'Ready to Extract Plan Dimensions')}</h3>
          <p style={{ color: 'var(--color-text-muted)', maxWidth: '540px', margin: '0 auto 24px auto' }}>
            {t('analysis.readyDesc', 'Extract room labels, dimensions, doors, windows, and stairs from')}{' '}
            <strong>{currentPlan.fileName}</strong>.
          </p>
          <div>
            <Button variant="primary" onClick={handleRunAnalysis} disabled={analyzing}>
              {analyzing ? t('analysis.scanningExtractingBtn', 'Scanning & Extracting Plan Information...') : t('analysis.runAiExtractionBtn', '⚡ Run AI Plan Extraction')}
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Key Metrics Strip */}
          <div className="analysis-status-strip">
            <div className="stat-box">
              <span className="stat-box-label">{t('analysis.metricStatus', 'Extraction Status')}</span>
              <span className="stat-box-value" style={{ color: analysis.status === 'CONFIRMED' ? 'var(--color-success)' : 'var(--color-primary)' }}>
                {analysis.status}
              </span>
            </div>
            <div className="stat-box">
              <span className="stat-box-label">{t('analysis.metricArea', 'Calculated Floor Area')}</span>
              <span className="stat-box-value">{analysis.totalCalculatedAreaSqFt?.toFixed(1)} {t('common.sqFt', 'sq ft')}</span>
            </div>
            <div className="stat-box">
              <span className="stat-box-label">{t('analysis.metricConfidence', 'AI Extraction Confidence')}</span>
              <span className="stat-box-value">{((analysis.confidenceScore ?? 0.9) * 100).toFixed(0)}%</span>
            </div>
            <div className="stat-box">
              <span className="stat-box-label">{t('analysis.metricRooms', 'Identified Spaces')}</span>
              <span className="stat-box-value">{analysis.rooms.length} {t('analysis.metricRooms', 'Rooms')}</span>
            </div>
          </div>

          {/* Split Workspace View */}
          <div className={showDrawingPreview ? 'split-workspace' : ''}>
            {/* Left: Drawing Preview */}
            {showDrawingPreview && (
              <div className="drawing-preview-panel">
                <div className="card-title-row">
                  <div>
                    <h3 style={{ fontSize: '1rem', margin: 0 }}>{t('analysis.drawingReference', 'Drawing Reference')}</h3>
                    <span className="plan-meta">{currentPlan.fileName}</span>
                  </div>
                  <Button variant="secondary" size="small" onClick={handleRunAnalysis} disabled={analyzing}>
                    {analyzing ? t('analysis.reAnalyzing', 'Re-analyzing...') : t('analysis.reRunAiExtraction', '↻ Re-run AI Extraction')}
                  </Button>
                </div>
                <div className="drawing-img-box">
                  <img
                    src={fileUrl}
                    alt={`Floor drawing ${currentPlan.floorName}`}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}

            {/* Right: Extracted Data */}
            <div className="analysis-content-grid">
              {/* Rooms Section */}
              <div className="analysis-card">
                <div className="card-title-row">
                  <div>
                    <h3>{t('analysis.roomsTitle', 'Extracted Rooms & Dimensions')}</h3>
                    <span className="plan-meta">{t('analysis.roomsSubtitle', 'Compare with the drawing on the left and edit any value')}</span>
                  </div>
                  {analysis.status !== 'CONFIRMED' && (
                    <Button variant="secondary" size="small" onClick={() => setShowAddRoom(true)}>
                      {t('analysis.addMissingRoomBtn', '+ Add Missing Room')}
                    </Button>
                  )}
                </div>

                <div className="table-wrapper">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>{t('analysis.colRoomName', 'Room Name')}</th>
                        <th>{t('analysis.colType', 'Type')}</th>
                        <th>{t('analysis.colLength', 'Length (ft)')}</th>
                        <th>{t('analysis.colWidth', 'Width (ft)')}</th>
                        <th>{t('analysis.colArea', 'Area (sq ft)')}</th>
                        {analysis.status !== 'CONFIRMED' && <th>{t('analysis.colAction', 'Action')}</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.rooms.map((room) => {
                        const isEditing = editingRoomId === room.id;
                        return (
                          <tr key={room.id}>
                            <td style={{ fontWeight: 600 }}>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editRoomName}
                                  onChange={(e) => setEditRoomName(e.target.value)}
                                  className="form-input"
                                  style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                                />
                              ) : (
                                room.name
                              )}
                            </td>
                            <td>
                              <span className="badge-tag" style={{ background: '#f1f5f9', color: '#475569' }}>
                                {room.roomType}
                              </span>
                            </td>
                            <td>
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editRoomLength}
                                  onChange={(e) => setEditRoomLength(Number(e.target.value))}
                                  className="inline-edit-input"
                                />
                              ) : (
                                `${room.lengthFt} ${t('common.ft', 'ft')}`
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editRoomWidth}
                                  onChange={(e) => setEditRoomWidth(Number(e.target.value))}
                                  className="inline-edit-input"
                                />
                              ) : (
                                `${room.widthFt} ${t('common.ft', 'ft')}`
                              )}
                            </td>
                            <td style={{ fontWeight: 600 }}>
                              {isEditing
                                ? `${(editRoomLength * editRoomWidth).toFixed(1)} ${t('common.sqFt', 'sq ft')}`
                                : `${room.areaSqFt} ${t('common.sqFt', 'sq ft')}`}
                            </td>
                            {analysis.status !== 'CONFIRMED' && (
                              <td>
                                {isEditing ? (
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    <Button
                                      variant="primary"
                                      size="small"
                                      onClick={handleSaveRoomEdit}
                                      disabled={savingEdit}
                                    >
                                      {t('common.save', 'Save')}
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      size="small"
                                      onClick={() => setEditingRoomId(null)}
                                    >
                                      {t('common.cancel', 'Cancel')}
                                    </Button>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    <Button
                                      variant="secondary"
                                      size="small"
                                      onClick={() => startEditRoom(room)}
                                    >
                                      {t('common.edit', 'Edit')}
                                    </Button>
                                    <Button
                                      variant="danger"
                                      size="small"
                                      onClick={() => handleDeleteRoom(room.id)}
                                    >
                                      {t('common.delete', 'Delete')}
                                    </Button>
                                  </div>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Openings & Stairs Section */}
              <div className="analysis-card">
                <div className="card-title-row">
                  <h3>{t('analysis.openingsTitle', 'Extracted Openings & Stairs')}</h3>
                  <span className="plan-meta">{t('analysis.openingsSubtitle', 'Doors, windows and vertical circulation identified from drawing')}</span>
                </div>

                <div className="openings-grid">
                  {analysis.openings.map((op) => (
                    <div key={op.id} className="opening-item-card">
                      <div>
                        <strong style={{ display: 'block' }}>{op.openingType.replace('_', ' ')}</strong>
                        <span className="plan-meta">
                          {op.widthFt} {t('common.ft', 'ft')} × {op.heightFt} {t('common.ft', 'ft')}
                        </span>
                      </div>
                      <span className="badge-tag" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
                        {t('analysis.count', 'Count')}: {op.count}
                      </span>
                    </div>
                  ))}

                  {analysis.stairs.map((st) => (
                    <div key={st.id} className="opening-item-card">
                      <div>
                        <strong style={{ display: 'block' }}>{t('analysis.staircase', 'STAIRCASE')}</strong>
                        <span className="plan-meta">
                          {st.widthFt} {t('common.ft', 'ft')} • {st.flights} {t('analysis.flights', 'flights')}
                        </span>
                      </div>
                      <span className="badge-tag" style={{ background: '#fef3c7', color: '#92400e' }}>
                        {st.count} {t('analysis.flights', 'Flight(s)')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Room Modal */}
      {showAddRoom && (
        <div className="upload-modal-overlay">
          <div className="upload-modal">
            <div className="upload-modal-header">
              <h3>{t('analysis.addRoomModalTitle', 'Add Room / Space')}</h3>
              <button
                type="button"
                className="btn btn--secondary btn--small"
                onClick={() => setShowAddRoom(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddRoomSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  {t('analysis.fieldRoomName', 'Room Name')}
                </label>
                <input
                  type="text"
                  placeholder={t('analysis.placeholderRoomName', 'e.g. Guest Bedroom, Dining Hall')}
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  {t('analysis.fieldRoomType', 'Room Type')}
                </label>
                <select
                  value={newRoomType}
                  onChange={(e) => setNewRoomType(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                >
                  <option value="BEDROOM">{t('analysis.roomTypes.bedroom', 'Bedroom')}</option>
                  <option value="LIVING">{t('analysis.roomTypes.living', 'Living / Hall')}</option>
                  <option value="KITCHEN">{t('analysis.roomTypes.kitchen', 'Kitchen')}</option>
                  <option value="BATHROOM">{t('analysis.roomTypes.bathroom', 'Bathroom / Toilet')}</option>
                  <option value="BALCONY">{t('analysis.roomTypes.balcony', 'Balcony / Verandah')}</option>
                  <option value="STUDY">{t('analysis.roomTypes.study', 'Study / Office')}</option>
                  <option value="UTILITY">{t('analysis.roomTypes.utility', 'Utility / Wash')}</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                    {t('analysis.fieldLength', 'Length (ft)')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newRoomLength}
                    onChange={(e) => setNewRoomLength(Number(e.target.value))}
                    className="form-input"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                    {t('analysis.fieldWidth', 'Width (ft)')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newRoomWidth}
                    onChange={(e) => setNewRoomWidth(Number(e.target.value))}
                    className="form-input"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <Button variant="secondary" onClick={() => setShowAddRoom(false)}>
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button variant="primary" type="submit">
                  {t('analysis.saveRoomBtn', 'Save Room')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
