import { cloneElement, isValidElement, type ReactNode } from 'react';
import './components.css';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}

export default function FormField({
  label,
  htmlFor,
  required = false,
  error,
  hint,
  className = '',
  children,
}: FormFieldProps) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  let control: ReactNode = children;
  if (isValidElement(children)) {
    const childProps: {
      'aria-invalid'?: boolean;
      'aria-required'?: boolean;
      'aria-describedby'?: string;
    } = {};
    if (error) childProps['aria-invalid'] = true;
    if (required) childProps['aria-required'] = true;
    if (describedBy) childProps['aria-describedby'] = describedBy;
    control = cloneElement(children, childProps);
  }

  return (
    <div className={['form-field', error ? 'form-field--invalid' : '', className].filter(Boolean).join(' ')}>
      <label className="form-field__label" htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="form-field__required" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {hint && (
        <p className="form-field__hint" id={hintId}>
          {hint}
        </p>
      )}
      <div className="form-field__control">{control}</div>
      {error && (
        <p className="form-field__error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
