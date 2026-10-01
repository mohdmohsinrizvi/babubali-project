# Member 2 Handoff Documentation: Floor Plans & AI Plan Analysis

> **Module:** Member 2 — Floor Plan Upload & AI Plan Extraction  
> **Status:** Complete & Verified  
> **Downstream Consumers:** Member 3 (Estimation, Materials, Cost, Labour) & Member 4 (3D Visualization & Reports)  
> **Base Version:** SmartBuild India Base-v1

---

## 1. Executive Summary

Member 2 has implemented the complete **Floor Plan Upload** and **AI Plan Analysis & Confirmation** subsystem:
1. **Multi-floor Drawing Management:** Allows uploading, replacing, previewing, and deleting floor drawings (PDF, PNG, JPG, WEBP) per building level (Ground, 1st, 2nd, etc.).
2. **Safe Local File Storage:** Implemented `FileStorageService` saving drawings under `uploads/projects/{projectId}/` with path-traversal protection and MIME verification (never stored in git or as raw DB blobs).
3. **Pluggable Dual-Mode Extraction Engine:**
   - **Google Gemini Multimodal Vision AI (`VisionAiPlanAnalysisAdapter`):** Sends drawing image/PDF bytes directly to Gemini Multimodal Vision API (`gemini-2.5-flash`), inspecting the visual pixels and extracting the exact room names, written dimension annotations (e.g. `11'-07" X 12'-07"`, `12'-00" X 12'-00"`, `7'-07" X 6'-00"`), doors, windows, ventilators, and stairs.
   - **Deterministic Fallback Engine (`MockPlanAnalysisEngine`):** Active when no API key is supplied, allowing 100% free offline development.
4. **Engineer Review, Edit & Confirmation UI (Side-by-Side Drawing):**
   - Renders the uploaded drawing image right beside the extracted data table.
   - Users can edit room names, lengths, widths, and areas inline or add missing spaces.
   - A single-click **"Confirm Plan Analysis"** button locks the data.
5. **Master Contract for Member 3 (Estimation):**
   - Published `GET /api/projects/{projectId}/confirmed-plans`. Member 3 does not need to parse PDF or image drawings; they can consume this single JSON endpoint to compute quantities, materials, and costs.

---

## 2. Master Integration Contract for Member 3 (Estimation)

### Endpoint: `GET /api/projects/{projectId}/confirmed-plans`

Member 3's estimation engine should call this endpoint to retrieve all verified architectural dimensions:

```json
{
  "projectId": 1,
  "totalFloors": 1,
  "totalBuiltUpAreaSqFt": 715.5,
  "floors": [
    {
      "planId": 2,
      "floorNumber": 1,
      "floorName": "1st Floor",
      "planType": "ARCHITECTURAL",
      "status": "CONFIRMED",
      "confirmedAt": "2026-10-01T11:42:38.368Z",
      "rooms": [
        {
          "id": "rm-1",
          "name": "Bed Room",
          "roomType": "BEDROOM",
          "lengthFt": 12.0,
          "widthFt": 12.0,
          "heightFt": 10.0,
          "areaSqFt": 144.0
        },
        {
          "id": "rm-2",
          "name": "Toilet",
          "roomType": "BATHROOM",
          "lengthFt": 6.0,
          "widthFt": 4.0,
          "heightFt": 10.0,
          "areaSqFt": 24.0
        },
        {
          "id": "rm-3",
          "name": "Common Toilet",
          "roomType": "BATHROOM",
          "lengthFt": 7.58,
          "widthFt": 6.0,
          "heightFt": 10.0,
          "areaSqFt": 45.48
        },
        {
          "id": "rm-4",
          "name": "Open Kitchen Cum Dinning",
          "roomType": "KITCHEN_DINING",
          "lengthFt": 15.5,
          "widthFt": 20.0,
          "heightFt": 10.0,
          "areaSqFt": 310.0
        },
        {
          "id": "rm-5",
          "name": "Bed Room",
          "roomType": "BEDROOM",
          "lengthFt": 12.58,
          "widthFt": 11.58,
          "heightFt": 10.0,
          "areaSqFt": 145.7
        },
        {
          "id": "rm-6",
          "name": "Verandah / Corridor",
          "roomType": "VERANDAH_CORRIDOR",
          "lengthFt": 4.0,
          "widthFt": 11.58,
          "heightFt": 10.0,
          "areaSqFt": 46.32
        }
      ],
      "openings": [
        {
          "id": "op-1",
          "openingType": "DOOR",
          "count": 4,
          "widthFt": 3.0,
          "heightFt": 7.0
        },
        {
          "id": "op-2",
          "openingType": "WINDOW",
          "count": 2,
          "widthFt": 4.0,
          "heightFt": 4.0
        },
        {
          "id": "op-3",
          "openingType": "VENTILATOR",
          "count": 2,
          "widthFt": 2.0,
          "heightFt": 1.5
        }
      ],
      "stairs": [
        {
          "id": "st-1",
          "count": 1,
          "widthFt": 3.5,
          "flights": 2
        }
      ]
    }
}
```

---

## 3. Complete List of APIs Added by Member 2

### Floor Plan Management
- `POST /api/projects/{projectId}/plans` (Multipart: `file`, `floorNumber`, `floorName`, `planType`)
- `GET /api/projects/{projectId}/plans` (List plans for a project)
- `GET /api/plans/{planId}` (Get single plan metadata)
- `GET /api/plans/{planId}/file` (Download/stream plan file for preview)
- `DELETE /api/plans/{planId}` (Delete plan record and file from disk)

### Plan Analysis & Confirmation
- `POST /api/plans/{planId}/analyze` (Trigger AI/mock extraction)
- `GET /api/plans/{planId}/analysis` (Retrieve extracted room/opening data)
- `PUT /api/plans/{planId}/analysis` (Update/edit rooms, openings, stairs)
- `POST /api/plans/{planId}/confirm` (Officially lock and confirm plan analysis)
- `GET /api/plans/{planId}/confirmed-analysis` (Get single confirmed plan analysis)
- `GET /api/projects/{projectId}/confirmed-plans` (**Member 3 Master Aggregation**)

---

## 4. Files Added and Modified

### Backend Files Added
- `com.smartbuild.model.FloorPlan` & `FloorPlanStatus`
- `com.smartbuild.model.PlanAnalysis` & `PlanAnalysisStatus`
- `com.smartbuild.repository.FloorPlanRepository`
- `com.smartbuild.repository.PlanAnalysisRepository`
- `com.smartbuild.service.FileStorageService`
- `com.smartbuild.service.FloorPlanService`
- `com.smartbuild.service.PlanAnalysisService`
- `com.smartbuild.service.analysis.PlanAnalysisEngine`
- `com.smartbuild.service.analysis.MockPlanAnalysisEngine`
- `com.smartbuild.service.analysis.VisionAiPlanAnalysisAdapter`
- `com.smartbuild.controller.FloorPlanController`
- `com.smartbuild.controller.PlanAnalysisController`
- `com.smartbuild.dto.FloorPlanResponse`
- `com.smartbuild.dto.RoomDto`, `OpeningDto`, `StairDto`, `AnalysisUpdateRequest`, `PlanAnalysisResponse`, `ConfirmedFloorDto`, `ProjectConfirmedPlansResponse`
- `com.smartbuild.service.FloorPlanServiceTest`
- `com.smartbuild.service.PlanAnalysisServiceTest`

### Frontend Files Added
- `frontend/src/types/floorPlan.ts`
- `frontend/src/api/floorPlans.ts`
- `frontend/src/api/planAnalysis.ts`
- `frontend/src/pages/workspace/PlansPage.tsx` & `PlansPage.css`
- `frontend/src/pages/workspace/AiAnalysisPage.tsx` & `AiAnalysisPage.css`

### Frontend Files Modified
- `frontend/src/types/workspace.ts` (flipped `plans` and `analysis` from `placeholder: true` to `false`)
- `frontend/src/App.tsx` (routed `/plans` to `<PlansPage />` and `/analysis` to `<AiAnalysisPage />`)

---

## 5. How to Test Member 2 Work

### 1. Automated Backend Tests
```powershell
cd E:\Project\babubali\backend
mvn test
```
All **46 tests pass** with 0 errors.

### 2. Manual Browser Walkthrough
1. Open [http://localhost:5173/projects](http://localhost:5173/projects).
2. Click **Open** on an existing project (or create a new one).
3. Click the **Plans** tab on the left sidebar:
   - Notice the multi-floor slots (Ground Floor, 1st Floor, etc.).
   - Click **Upload Drawing** and select any PDF or PNG/JPG floor plan.
   - Click **Run AI Analysis →**.
4. You are taken to the **AI Analysis** tab:
   - Click **Run AI Plan Extraction**.
   - Review extracted rooms (Living, Bedrooms, Kitchen, Bathrooms, Utility), dimensions, and openings.
   - Optionally click **+ Add Missing Room** or **Remove** to test interactive corrections.
   - Click **✓ Confirm Plan Analysis** to lock the specifications.
   - Click **Inspect Member 3 Data Contract** to see the live JSON that Member 3's estimation engine will receive!

---

## 6. Multilingual Architecture (English, Hindi, Urdu RTL, Tamil, Telugu)

The entire application includes real-time multilingual capabilities with an instant language switcher in the header (🌐) supporting:
- **English** (`en`)
- **हिन्दी** (`hi`)
- **اردو** (`ur` — full Right-to-Left bidirectional layout support)
- **தமிழ்** (`ta`)
- **తెలుగు** (`te`)

For instructions on adding localized strings side-by-side as you build the Estimation and Visualization modules, refer to:
👉 `docs/multilingual-guide.md`
