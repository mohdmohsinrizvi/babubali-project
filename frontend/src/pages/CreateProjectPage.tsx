import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createProject } from '../api/projects';
import { toApiError } from '../api/client';
import Button from '../components/Button';
import FormField from '../components/FormField';
import PageHeader from '../components/PageHeader';
import { CONSTRUCTION_TYPES, type ProjectRequest } from '../types/project';
import './CreateProjectPage.css';

interface FormValues {
  name: string;
  state: string;
  district: string;
  city: string;
  constructionType: string;
  landAreaSqFt: string;
  builtUpAreaSqFt: string;
  floorCount: string;
  budget: string;
}

const INITIAL_VALUES: FormValues = {
  name: '',
  state: '',
  district: '',
  city: '',
  constructionType: 'Residential',
  landAreaSqFt: '',
  builtUpAreaSqFt: '',
  floorCount: '1',
  budget: '',
};

// Mirrors the backend's Bean Validation bounds so users get instant feedback.
// The backend stays authoritative and may still return a 400.
const MAX_NAME = 150;
const MAX_PLACE = 100;
const MAX_FLOORS = 200;
const TWO_DECIMALS = /^-?\d+(\.\d{1,2})?$/;

function validate(values: FormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!values.name.trim()) {
    errors.name = 'Project name is required.';
  } else if (values.name.trim().length < 2) {
    errors.name = 'Project name must be at least 2 characters.';
  } else if (values.name.trim().length > MAX_NAME) {
    errors.name = `Project name must be at most ${MAX_NAME} characters.`;
  }
  if (!values.state.trim()) errors.state = 'State is required.';
  else if (values.state.trim().length > MAX_PLACE) errors.state = `Must be at most ${MAX_PLACE} characters.`;
  if (!values.district.trim()) errors.district = 'District is required.';
  else if (values.district.trim().length > MAX_PLACE) errors.district = `Must be at most ${MAX_PLACE} characters.`;
  if (!values.city.trim()) errors.city = 'City is required.';
  else if (values.city.trim().length > MAX_PLACE) errors.city = `Must be at most ${MAX_PLACE} characters.`;
  if (!values.constructionType.trim()) errors.constructionType = 'Construction type is required.';
  else if (values.constructionType.trim().length > MAX_PLACE) {
    errors.constructionType = `Must be at most ${MAX_PLACE} characters.`;
  }

  const landArea = Number(values.landAreaSqFt);
  if (!values.landAreaSqFt.trim()) {
    errors.landAreaSqFt = 'Land area is required.';
  } else if (!Number.isFinite(landArea) || landArea <= 0) {
    errors.landAreaSqFt = 'Land area must be greater than 0.';
  } else if (!TWO_DECIMALS.test(values.landAreaSqFt.trim())) {
    errors.landAreaSqFt = 'Land area allows at most 2 decimal places.';
  }

  const builtUpArea = Number(values.builtUpAreaSqFt);
  if (!values.builtUpAreaSqFt.trim()) {
    errors.builtUpAreaSqFt = 'Built-up area is required.';
  } else if (!Number.isFinite(builtUpArea) || builtUpArea <= 0) {
    errors.builtUpAreaSqFt = 'Built-up area must be greater than 0.';
  } else if (!TWO_DECIMALS.test(values.builtUpAreaSqFt.trim())) {
    errors.builtUpAreaSqFt = 'Built-up area allows at most 2 decimal places.';
  }

  const floors = Number(values.floorCount);
  if (!values.floorCount.trim()) {
    errors.floorCount = 'Expected floors is required.';
  } else if (!Number.isInteger(floors) || floors < 1) {
    errors.floorCount = 'Expected floors must be a whole number of at least 1.';
  } else if (floors > MAX_FLOORS) {
    errors.floorCount = `Expected floors must be ${MAX_FLOORS} or fewer.`;
  }

  if (values.budget.trim()) {
    const budget = Number(values.budget);
    if (!Number.isFinite(budget) || budget < 0) {
      errors.budget = 'Budget must be 0 or more.';
    } else if (!TWO_DECIMALS.test(values.budget.trim())) {
      errors.budget = 'Budget allows at most 2 decimal places.';
    }
  }

  return errors;
}

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function setValue(key: keyof FormValues, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setFormError(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const clientErrors = validate(values);
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setFormError(null);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setSubmitting(true);

    const payload: ProjectRequest = {
      name: values.name.trim(),
      state: values.state.trim(),
      district: values.district.trim(),
      city: values.city.trim(),
      constructionType: values.constructionType,
      landAreaSqFt: Number(values.landAreaSqFt),
      builtUpAreaSqFt: Number(values.builtUpAreaSqFt),
      floorCount: Number(values.floorCount),
      budget: values.budget.trim() ? Number(values.budget) : null,
    };

    try {
      const created = await createProject(payload);
      navigate(`/projects/${created.id}/overview`);
    } catch (err) {
      const apiError = toApiError(err);
      setFormError(apiError.message);
      setFieldErrors(apiError.fieldErrors ?? {});
      setSubmitting(false);
    }
  }

  return (
    <div className="create-page">
      <PageHeader
        title="New Project"
        subtitle="Add a project to start planning. All fields marked with * are required."
        actions={
          <Link className="btn btn--secondary btn--normal" to="/projects">
            Cancel
          </Link>
        }
      />

      <form className="project-form" onSubmit={onSubmit} noValidate>
        {formError && (
          <div className="form-banner" role="alert">
            {formError}
          </div>
        )}

        <div className="project-form__grid">
          <FormField
            label="Project Name"
            htmlFor="project-name"
            required
            error={fieldErrors.name}
            className="project-form__full"
          >
            <input
              id="project-name"
              name="name"
              type="text"
              required
              autoComplete="off"
              maxLength={150}
              placeholder="e.g. Greenfield Villa"
              className="input"
              value={values.name}
              onChange={(event) => setValue('name', event.target.value)}
            />
          </FormField>

          <FormField label="State" htmlFor="project-state" required error={fieldErrors.state}>
            <input
              id="project-state"
              name="state"
              type="text"
              required
              autoComplete="off"
              maxLength={100}
              placeholder="e.g. Karnataka"
              className="input"
              value={values.state}
              onChange={(event) => setValue('state', event.target.value)}
            />
          </FormField>

          <FormField label="District" htmlFor="project-district" required error={fieldErrors.district}>
            <input
              id="project-district"
              name="district"
              type="text"
              required
              autoComplete="off"
              maxLength={100}
              placeholder="e.g. Bengaluru Urban"
              className="input"
              value={values.district}
              onChange={(event) => setValue('district', event.target.value)}
            />
          </FormField>

          <FormField label="City" htmlFor="project-city" required error={fieldErrors.city}>
            <input
              id="project-city"
              name="city"
              type="text"
              required
              autoComplete="off"
              maxLength={100}
              placeholder="e.g. Bengaluru"
              className="input"
              value={values.city}
              onChange={(event) => setValue('city', event.target.value)}
            />
          </FormField>

          <FormField
            label="Construction Type"
            htmlFor="project-construction-type"
            required
            error={fieldErrors.constructionType}
          >
            <select
              id="project-construction-type"
              name="constructionType"
              required
              autoComplete="off"
              className="input"
              value={values.constructionType}
              onChange={(event) => setValue('constructionType', event.target.value)}
            >
              {CONSTRUCTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Land Area (sq ft)"
            htmlFor="project-land-area"
            required
            error={fieldErrors.landAreaSqFt}
          >
            <input
              id="project-land-area"
              name="landAreaSqFt"
              type="number"
              required
              min="0.01"
              step="0.01"
              autoComplete="off"
              placeholder="e.g. 2400"
              className="input"
              value={values.landAreaSqFt}
              onChange={(event) => setValue('landAreaSqFt', event.target.value)}
            />
          </FormField>

          <FormField
            label="Built-up Area (sq ft)"
            htmlFor="project-built-up-area"
            required
            error={fieldErrors.builtUpAreaSqFt}
          >
            <input
              id="project-built-up-area"
              name="builtUpAreaSqFt"
              type="number"
              required
              min="0.01"
              step="0.01"
              autoComplete="off"
              placeholder="e.g. 1800"
              className="input"
              value={values.builtUpAreaSqFt}
              onChange={(event) => setValue('builtUpAreaSqFt', event.target.value)}
            />
          </FormField>

          <FormField
            label="Expected Floors"
            htmlFor="project-floor-count"
            required
            error={fieldErrors.floorCount}
          >
            <input
              id="project-floor-count"
              name="floorCount"
              type="number"
              required
              min="1"
              step="1"
              autoComplete="off"
              className="input"
              value={values.floorCount}
              onChange={(event) => setValue('floorCount', event.target.value)}
            />
          </FormField>

          <FormField
            label="Budget (optional)"
            htmlFor="project-budget"
            error={fieldErrors.budget}
            hint="Leave blank if the budget is not decided yet."
          >
            <input
              id="project-budget"
              name="budget"
              type="number"
              min="0"
              step="0.01"
              autoComplete="off"
              placeholder="e.g. 4500000"
              className="input"
              value={values.budget}
              onChange={(event) => setValue('budget', event.target.value)}
            />
          </FormField>
        </div>

        <div className="project-form__actions">
          <Button type="submit" loading={submitting}>
            {submitting ? 'Saving…' : 'Create Project'}
          </Button>
          <Link className="btn btn--secondary btn--normal" to="/projects">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
