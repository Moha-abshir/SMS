import type { AxiosResponse } from 'axios';
import { apiClient } from './apiClient';

// Share simultaneous branding reads without retaining stale settings after edits.
let pending: Promise<AxiosResponse> | undefined;
export function getPublicSettings() {
  if (!pending) {
    pending = apiClient.get('/api/settings/public').finally(() => { pending = undefined; });
  }
  return pending;
}
