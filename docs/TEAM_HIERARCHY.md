# Editing the public team hierarchy

Open **Admin → Members in the Hierarchy Tree → Edit hierarchy**.

The first draft uses the active member roster and team verticals. Preview it before the first save: the previous public tree contains legacy hardcoded entries, so the draft may differ. Publishing the draft replaces that legacy tree with the saved layout.

- Drag a handle onto a member or group to put it beneath that item. Children move with their parent.
- Drop between existing items to reorder them. The arrows and **Place under** selector offer the same controls without dragging.
- Add and rename groups; optionally override a member's title for this display.
- Remove an item from the tree to return the member to Available members. Its children move up one level. This does not delete the member.
- Add people using the existing **Add Member** button, then place them from Available members. Pending members are not public.
- **Preview** shows the public layout; **Save hierarchy** publishes it. **Discard changes** restores the last saved draft. Saving is explicit, and conflicting saves from another administrator are rejected.

Changes affect `/team` only. They do not change account permissions, login roles, team assignments used elsewhere, registrations or payments. Member names, pictures and social links continue to come from the member roster. Deleting or making a roster member pending hides that member while preserving their descendants.

## Deployment and recovery

Apply `supabase/migrations/20261007_team_hierarchy.sql` after taking a database backup. It adds an RLS-protected singleton configuration table; only the service role can access it, through the existing authorized content-management server action. Fresh installs include this migration through `npm run schema:fresh`.

No row is inserted during deployment. Until the first saved layout, `/team` uses its existing renderer. To recover the legacy public layout, back up the layout row and remove that row in an authorized database session. Leave the table in place. The prior code release also works with the unused table present. Restoring the entire database is unnecessary for a layout rollback and could overwrite newer registrations.

The layout supports up to 250 items and eight levels. Server validation rejects cycles, repeated members, invalid parents and members that are no longer active. Version checks prevent silent overwrites between administrators.
