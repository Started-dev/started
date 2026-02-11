import { useEffect } from 'react';

export default function GitHubCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (window.opener) {
      window.opener.postMessage(
        { type: 'github-oauth-callback', code, state },
        window.location.origin
      );
      window.close();
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
      <div className="text-center space-y-2">
        <div className="text-lg font-semibold">Connecting to GitHub...</div>
        <p className="text-sm text-muted-foreground">This window will close automatically.</p>
      </div>
    </div>
  );
}
