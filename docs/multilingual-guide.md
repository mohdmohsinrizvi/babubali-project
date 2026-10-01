# SmartBuild India — Multilingual Architecture & Team Guide

> **For Member 3 (Estimation, Materials, Labour) & Member 4 (3D Visualization, Reports)**  
> This guide details how SmartBuild India's multilingual (i18n) system is structured, how English, Hindi, Urdu (RTL), Tamil, and Telugu are managed, and how you can add and expand translations side-by-side as you build your modules.

---

## 1. Supported Languages

SmartBuild India comes pre-configured with 5 official Indian languages:

| Code | Language | Native Script | Direction | Primary Script Fallback |
| :--- | :--- | :--- | :--- | :--- |
| `en` | **English** | English | LTR | System Sans-Serif |
| `hi` | **Hindi** | हिन्दी | LTR | `Noto Sans Devanagari`, `Nirmala UI` |
| `ur` | **Urdu** | اردو | **RTL** (Right-to-Left) | `Noto Nastaliq Urdu`, `Urdu Typesetting`, `Jameel Noori Nastaleeq` |
| `ta` | **Tamil** | தமிழ் | LTR | `Noto Sans Tamil`, `Latha`, `Nirmala UI` |
| `te` | **Telugu** | తెలుగు | LTR | `Noto Sans Telugu`, `Gautami`, `Nirmala UI` |

---

## 2. Directory Structure

All multilingual assets and logic live inside `frontend/src/i18n/`:

```
frontend/src/
├── components/
│   ├── LanguageSelector.tsx      # Language dropdown component with globe icon
│   └── LanguageSelector.css      # Styling for language picker
├── i18n/
│   ├── LanguageContext.tsx       # React Context provider, hook, and persistence
│   ├── types.ts                  # TypeScript interface (TranslationSchema) & language meta
│   └── translations/
│       ├── index.ts              # Master translations registry export
│       ├── en.ts                 # English dictionary (Base & Member 2 + Placeholders)
│       ├── hi.ts                 # Hindi dictionary (हिन्दी)
│       ├── ur.ts                 # Urdu dictionary (اردو, RTL-ready)
│       ├── ta.ts                 # Tamil dictionary (தமிழ்)
│       └── te.ts                 # Telugu dictionary (తెలుగు)
```

---

## 3. How the Translation System Works

1. **Zero-Dependency Native Architecture:**  
   Built using React 19 Context and TypeScript. No heavy external libraries (`i18next` or `react-intl`) are needed, ensuring ultra-fast load times and zero dependency conflicts.
2. **Type Safety:**  
   Every key is typed against `TranslationSchema` in `frontend/src/i18n/types.ts`. If you add a key in English, TypeScript helps ensure you provide definitions across all languages.
3. **Automatic Fallback:**  
   If a translated key is missing in Hindi, Urdu, Tamil, or Telugu, `t()` automatically falls back to the English string.
4. **Persistent Preference:**  
   The user's language selection is saved in browser `localStorage` under `smartbuild_language`. On refresh, their language preference is immediately restored.
5. **Urdu RTL (Right-to-Left) Synchronization:**  
   When the user selects Urdu (`ur`):
   - `document.documentElement.dir = 'rtl'` is set dynamically.
   - `document.body.classList.add('rtl-layout')` is applied.
   - CSS rules in `frontend/src/styles/global.css` automatically adjust tables, headers, and flex containers.

---

## 4. How to Use Translations in Your Components

Import the `useTranslation` hook:

```tsx
import { useTranslation } from '../../i18n/LanguageContext';

export default function EstimationPage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('estimation.title', 'Quantity & Cost Estimation')}</h1>
      <p>{t('estimation.subtitle')}</p>
      <button className="btn btn--primary">
        {t('estimation.calculateEstimate', 'Calculate Estimate')}
      </button>
    </div>
  );
}
```

### Dynamic String Interpolation
If your string has variables like `{count}` or `{n}`:
```tsx
// In translation dictionary:
// floorN: 'Floor {n}'
// hi: 'मंज़िल {n}'

// In your component:
t('plans.floorN', { n: 2 }, 'Floor 2'); 
// Outputs: "Floor 2" in English, "मंज़िल 2" in Hindi
```

---

## 5. Guide for Member 3 (Estimation, Materials, Labour)

As you build the **Cost Estimation**, **Materials Breakdown (BOQ)**, and **Labour & Timeline** modules, your translations are already pre-structured in `types.ts`!

### Pre-configured Namespaces for Member 3:

#### A. Estimation (`estimation.*`)
- `t('estimation.title')` — Quantity & Cost Estimation / मात्रा एवं लागत अनुमान / مقدار اور لاگت کا تخمینہ / அளவு மற்றும் செலவு மதிப்பீடு / పరిమాణం మరియు వ్యయ అంచనా
- `t('estimation.costSummary')` — Cost Summary
- `t('estimation.materialCost')` — Material Cost
- `t('estimation.labourCost')` — Labour Cost
- `t('estimation.equipmentCost')` — Equipment & Machinery
- `t('estimation.overheads')` — Overheads & Contractor Margin
- `t('estimation.totalCost')` — Total Estimated Cost
- `t('estimation.perSqFtCost')` — Estimated Cost per Sq Ft
- `t('estimation.calculateEstimate')` — Calculate Estimate
- `t('estimation.downloadEstimate')` — Download Estimate (PDF / Excel)

#### B. Materials (`materials.*`)
- `t('materials.title')` — Materials Breakdown
- `t('materials.cement')` — Cement (OPC/PPC Bags)
- `t('materials.steel')` — Reinforcement Steel (TMT Fe500)
- `t('materials.bricks')` — Red Clay Bricks / AAC Blocks
- `t('materials.sand')` — River Sand / M-Sand
- `t('materials.aggregate')` — Coarse Aggregate (10mm / 20mm)
- `t('materials.paint')` — Wall Paint & Primer
- `t('materials.tiles')` — Vitrified / Ceramic Flooring
- `t('materials.quantity')` — Quantity
- `t('materials.unitRate')` — Unit Rate (₹)
- `t('materials.totalAmount')` — Total Amount (₹)

#### C. Labour & Timeline (`labour.*`)
- `t('labour.title')` — Labour & Project Timeline
- `t('labour.masons')` — Masons (Raj Mistry)
- `t('labour.carpenters')` — Carpenters / Shuttering
- `t('labour.plumbers')` — Plumbers
- `t('labour.electricians')` — Electricians
- `t('labour.painters')` — Painters
- `t('labour.helpers')` — General Labour / Helpers
- `t('labour.totalDays')` — Total Estimated Days
- `t('labour.crewSize')` — Recommended Daily Crew Size

### How Member 3 Adds New Keys:
1. Open `frontend/src/i18n/types.ts` and add your new property under `estimation`, `materials`, or `labour`:
   ```ts
   estimation: {
     // existing keys...
     contingencyFund: string; // <-- your new key
   }
   ```
2. Add the translated values in all 5 files in `frontend/src/i18n/translations/`:
   - `en.ts`: `contingencyFund: 'Contingency Fund (3%)'`
   - `hi.ts`: `contingencyFund: 'आकस्मिक निधि (3%)'`
   - `ur.ts`: `contingencyFund: 'ہنگامی فنڈ (3%)'`
   - `ta.ts`: `contingencyFund: 'எதிர்பாராத செலவு நிதி (3%)'`
   - `te.ts`: `contingencyFund: 'అత్యవసర నిధి (3%)'`
3. Call `t('estimation.contingencyFund')` in your component.

---

## 6. Guide for Member 4 (Interactive 3D & Reports)

As you build the **Interactive 3D Model (Three.js / WebGL)** and **Project Reports (DPR / PDF)** modules:

### Pre-configured Namespaces for Member 4:

#### A. Visualization (`visualization.*`)
- `t('visualization.title')` — Interactive 3D Architectural Model
- `t('visualization.model3d')` — 3D Building Model
- `t('visualization.rotateView')` — Rotate & Inspect 360°
- `t('visualization.wireframe')` — Wireframe View
- `t('visualization.walls')` — Toggle Structural Walls
- `t('visualization.slab')` — Toggle Roof Slab
- `t('visualization.exportGltf')` — Export 3D Asset (glTF / OBJ)

#### B. Reports (`reports.*`)
- `t('reports.title')` — Project Reports & Documentation
- `t('reports.generateReport')` — Generate Full DPR (Detailed Project Report)
- `t('reports.downloadPdf')` — Download Executive Summary (PDF)
- `t('reports.costSummaryReport')` — Cost Breakdown Report
- `t('reports.structuralSummaryReport')` — Structural & Area Statement
- `t('reports.clientPresentation')` — Client Pitch Deck

---

## 7. Formatting Numbers, Dates, and Currencies Across Languages

When rendering currencies and numbers in Indian localized formats, use `Intl` with the current language code:

```tsx
import { useTranslation } from '../i18n/LanguageContext';

export default function CostCard({ amount }: { amount: number }) {
  const { language } = useTranslation();

  // Pick locale based on selected language
  const locale =
    language === 'ur' ? 'ur-PK' :
    language === 'hi' ? 'hi-IN' :
    language === 'ta' ? 'ta-IN' :
    language === 'te' ? 'te-IN' : 'en-IN';

  const formattedMoney = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

  return <div>{formattedMoney}</div>;
}
```

---

## 8. Verifying & Testing Your Changes

Before submitting your code changes:
1. **Type Check & Build:**
   ```bash
   cd frontend
   npm run build
   ```
   If any key is missing or misspelled, TypeScript will immediately highlight it.
2. **Visual Inspection:**
   - Open `http://localhost:5173` in your browser.
   - Use the language selector in the top-right header (🌐).
   - Switch between **English**, **हिन्दी**, **اردو**, **தமிழ்**, and **తెలుగు**.
   - Ensure text flows properly and Urdu mirrors the layout from right to left (`dir="rtl"`).
