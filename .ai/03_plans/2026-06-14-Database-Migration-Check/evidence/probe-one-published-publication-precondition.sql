select project_id, count(*) as published_count
from public.project_publications
where status = 'published'
group by project_id
having count(*) > 1;
