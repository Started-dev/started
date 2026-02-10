
-- Add ON DELETE CASCADE to all project-related foreign keys

-- project_files
ALTER TABLE public.project_files DROP CONSTRAINT IF EXISTS project_files_project_id_fkey;
ALTER TABLE public.project_files ADD CONSTRAINT project_files_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- file_snapshots
ALTER TABLE public.file_snapshots DROP CONSTRAINT IF EXISTS file_snapshots_project_id_fkey;
ALTER TABLE public.file_snapshots ADD CONSTRAINT file_snapshots_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- runs
ALTER TABLE public.runs DROP CONSTRAINT IF EXISTS runs_project_id_fkey;
ALTER TABLE public.runs ADD CONSTRAINT runs_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- collab_messages
ALTER TABLE public.collab_messages DROP CONSTRAINT IF EXISTS collab_messages_project_id_fkey;
ALTER TABLE public.collab_messages ADD CONSTRAINT collab_messages_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- file_locks
ALTER TABLE public.file_locks DROP CONSTRAINT IF EXISTS file_locks_project_id_fkey;
ALTER TABLE public.file_locks ADD CONSTRAINT file_locks_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- project_collaborators
ALTER TABLE public.project_collaborators DROP CONSTRAINT IF EXISTS project_collaborators_project_id_fkey;
ALTER TABLE public.project_collaborators ADD CONSTRAINT project_collaborators_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
