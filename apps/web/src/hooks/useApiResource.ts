import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../lib/apiClient';

/** Only expose data for the current URL; cancel closed/replaced requests. */
export function useApiResource<T>(
  url: string | null,
  validate?: (value: unknown) => boolean,
) {
  const validator = useRef(validate);
  validator.current = validate;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{
    key: string | null;
    data: T | null;
    error: string | null;
    loading: boolean;
  }>({ key: null, data: null, error: null, loading: false });
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    setState({ key: url, data: null, error: null, loading: true });
    apiClient
      .get(url, { signal: controller.signal })
      .then((response) => {
        if (controller.signal.aborted) return;
        if (
          response.data?.data === undefined ||
          response.data?.success === false ||
          (validator.current && !validator.current(response.data.data))
        )
          throw new Error(
            'The server returned an unexpected response. Please retry.',
          );
        setState({
          key: url,
          data: response.data.data as T,
          error: null,
          loading: false,
        });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState({
          key: url,
          data: null,
          error:
            error.response?.data?.message ||
            error.message ||
            'Could not load these records.',
          loading: false,
        });
      });
    return () => controller.abort();
  }, [url, revision]);
  // Effects run after render: don't display the preceding selection even for one frame.
  if (!url || state.key !== url)
    return { data: null, error: null, loading: Boolean(url), refresh };
  return {
    data: state.data,
    error: state.error,
    loading: state.loading,
    refresh,
  };
}
