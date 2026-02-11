import { useState, useEffect } from 'react';
import { GitBranch, Github, Loader2, ExternalLink } from 'lucide-react';
import { callMCPTool } from '@/lib/mcp-client';

interface GitHubStatusProps {
  className?: string;
}

interface RepoInfo {
  name: string;
  full_name: string;
  default_branch: string;
  html_url: string;
  private: boolean;
}

export function GitHubStatus({ className }: GitHubStatusProps) {
  const [repo, setRepo] = useState<RepoInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('github_pat');
    if (!token) {
      setConnected(false);
      setRepo(null);
      return;
    }
    setConnected(true);
    fetchCurrentRepo(token);
  }, []);

  // Listen for storage changes (token set/removed)
  useEffect(() => {
    const handler = () => {
      const token = localStorage.getItem('github_pat');
      if (token) {
        setConnected(true);
        fetchCurrentRepo(token);
      } else {
        setConnected(false);
        setRepo(null);
      }
    };
    window.addEventListener('storage', handler);
    window.addEventListener('github-token-changed', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('github-token-changed', handler);
    };
  }, []);

  const fetchCurrentRepo = async (token: string) => {
    setLoading(true);
    try {
      const result = await callMCPTool({
        tool: 'github_list_repos',
        input: { per_page: 1 },
        serverId: 'mcp-github',
        githubToken: token,
      });
      if (result.ok && Array.isArray(result.result) && result.result.length > 0) {
        const r = result.result[0];
        setRepo({
          name: r.name,
          full_name: r.full_name,
          default_branch: r.default_branch,
          html_url: r.html_url,
          private: r.private,
        });
      }
    } catch {
      // ignore
    }
    setLoading(false);
  };

  if (!connected) return null;

  return (
    <div className={`flex items-center gap-2 text-xs ${className || ''}`}>
      <Github className="h-3.5 w-3.5 text-muted-foreground" />
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      ) : repo ? (
        <>
          <a
            href={repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-primary transition-colors truncate max-w-[140px] font-medium flex items-center gap-1"
            title={repo.full_name}
          >
            {repo.full_name}
            <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-50" />
          </a>
          <div className="flex items-center gap-1 text-muted-foreground">
            <GitBranch className="h-3 w-3" />
            <span className="font-mono text-[10px]">{repo.default_branch}</span>
          </div>
          {repo.private && (
            <span className="text-[9px] px-1 py-0.5 bg-muted text-muted-foreground rounded-sm">private</span>
          )}
        </>
      ) : (
        <span className="text-muted-foreground">Connected</span>
      )}
    </div>
  );
}
