import type { WslGlobalConfig } from "../api/queries";

export interface ValidationErrors {
  memory?: string;
  swap?: string;
  processors?: string;
  vm_idle_timeout?: string;
  default_vhd_size?: string;
}

const MEMORY_REGEX = /^\d+(KB|MB|GB)$/i;

export function validateWslConfig(form: WslGlobalConfig): ValidationErrors {
  const errors: ValidationErrors = {};

  if (form.memory && !MEMORY_REGEX.test(form.memory)) {
    errors.memory = "Must be a number followed by KB, MB, or GB (e.g. 4GB)";
  }

  if (form.swap && !MEMORY_REGEX.test(form.swap)) {
    errors.swap = "Must be a number followed by KB, MB, or GB (e.g. 2GB)";
  }

  if (form.processors !== null && form.processors !== undefined) {
    if (!Number.isInteger(form.processors) || form.processors < 1 || form.processors > 128) {
      errors.processors = "Must be an integer between 1 and 128";
    }
  }

  if (form.vm_idle_timeout !== null && form.vm_idle_timeout !== undefined) {
    if (!Number.isInteger(form.vm_idle_timeout) || form.vm_idle_timeout < 0) {
      errors.vm_idle_timeout = "Must be a non-negative integer";
    }
  }

  if (form.default_vhd_size && !MEMORY_REGEX.test(form.default_vhd_size)) {
    errors.default_vhd_size = "Must be a number followed by KB, MB, or GB (e.g. 1024GB)";
  }

  return errors;
}

export function hasErrors(errors: ValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}
