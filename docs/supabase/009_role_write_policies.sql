-- Allows admins (accounts whose role has the manageRoles permission) to
-- write to public.roles / public.role_permissions from the app itself.
-- Until now these tables only had SELECT policies (001_security_core.sql),
-- so role edits made in the admin panel had nowhere to persist to.
-- Run after 001_security_core.sql.

drop policy if exists roles_insert_admin on public.roles;
create policy roles_insert_admin
on public.roles
for insert
with check (public.has_permission('manageRoles'));

drop policy if exists roles_update_admin on public.roles;
create policy roles_update_admin
on public.roles
for update
using (public.has_permission('manageRoles'))
with check (public.has_permission('manageRoles'));

drop policy if exists roles_delete_admin on public.roles;
create policy roles_delete_admin
on public.roles
for delete
using (public.has_permission('manageRoles'));

drop policy if exists role_permissions_insert_admin on public.role_permissions;
create policy role_permissions_insert_admin
on public.role_permissions
for insert
with check (public.has_permission('manageRoles'));

drop policy if exists role_permissions_update_admin on public.role_permissions;
create policy role_permissions_update_admin
on public.role_permissions
for update
using (public.has_permission('manageRoles'))
with check (public.has_permission('manageRoles'));

drop policy if exists role_permissions_delete_admin on public.role_permissions;
create policy role_permissions_delete_admin
on public.role_permissions
for delete
using (public.has_permission('manageRoles'));
