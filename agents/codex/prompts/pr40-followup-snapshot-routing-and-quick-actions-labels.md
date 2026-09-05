# PR #40 follow-up — tighten snapshot routing and Quick Actions labels

Work from the current PR #40 branch / head. Do not redo the existing implementation.

This follow-up is intentionally small. Fix only the two issues below, add focused tests, and update the existing PR rather than opening a separate unrelated PR if possible.

## 1. `.fcx` routing must be exactly-once and mutually exclusive

The current general Open File path supports multiple selection and `routeFiles()` dispatches every `.fcx` file while also ingesting ordinary files from the same selection. That can create competing workspace restores or restore-and-ingest races.

Required behavior:

- a snapshot open is a workspace-level replacement action, not an ordinary multi-file ingestion action
- do not begin more than one `.fcx` restore from one Open File selection
- do not simultaneously restore a snapshot and ingest ordinary files from the same picker selection
- do not dispatch multiple `framechute:open-snapshot-file` events for multiple selected `.fcx` files
- keep the ordinary Open File picker capable of multi-file ingestion for non-snapshot files

Use the simplest clear behavior:

- if the selected files contain exactly one `.fcx` and no ordinary files: route that one file into the existing snapshot importer exactly once
- if the selection mixes `.fcx` with ordinary files: do not partially process it; show a concise message asking the user to open the snapshot separately
- if the selection contains multiple `.fcx` files: do not start multiple restores; show a concise message asking the user to choose one snapshot
- ordinary selections with no `.fcx` continue through normal multi-file ingestion unchanged

Do not create a second snapshot importer. Keep using the existing `framechute:open-snapshot-file` / `importFcx()` path.

Also check drag/drop and any other new routing touched by PR #40 to ensure one snapshot gesture maps to one restore path and never duplicates ordinary ingestion.

Acceptance:

1. Select one `.fcx` in Open File → one restore starts.
2. Select two `.fcx` files → no restore starts; user gets a concise choose-one message.
3. Select `project.fcx + photo.png` → no restore and no image ingestion; user is told to open the snapshot separately.
4. Select several ordinary files → existing multi-file ingestion still works.

## 2. Make global vs per-object Quick Actions wording unmistakable

PR #40 adds the persistent global item near the top:

`Quick Actions [ ON / OFF ]`

Keep that.

The existing object-specific item must explicitly say that it affects only the current object. Prefer labels such as:

- `Hide Quick Actions for This Object`
- `Show Quick Actions for This Object`

Do not leave the shorter ambiguous `Hide Quick Actions` / `Show Quick Actions` wording beside the global toggle.

Preserve the precedence already intended:

- global OFF wins everywhere
- global ON allows the per-object state to apply

Update focused tests for the exact object-menu labels and snapshot routing behavior.

Run the normal relevant tests plus the repository's standard validation / Chrome Web Store checks if they are practical for this small follow-up.

When done, leave a concise PR handoff stating:

- what changed
- tests run and results
- whether PR #40 is now ready to merge
