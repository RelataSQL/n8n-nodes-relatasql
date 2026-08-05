# Changelog

All notable changes to `n8n-nodes-relatasql`.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Dates are npm publish dates.

## [Unreleased]

### Changed
- Wording and formatting of the node description in the package metadata.

## [0.1.7] — 2026-07-07

### Fixed
- **Create Dump**: backend errors now reach the node with their real reason (the underlying
  `pg_dump` error) and a support reference. The node requested the response as binary and
  discarded the JSON error body, so every failure surfaced as the same generic message.

## [0.1.6] — 2026-07-07

### Changed
- **Create Dump**: 2-hour HTTP timeout for large databases, and an explicit message when a
  dump exceeds the limit instead of a silent cut-off.

## [0.1.5] — 2026-07-03

### Changed
- The credential now defaults to the official cloud API (`https://api.relatasql.com`).
  Self-hosting became the case you override explicitly instead of the default.

## [0.1.4] — 2026-06-18

### Changed
- **Create Dump**: failure messages rewritten for the person reading them in n8n, rather than
  passing through internal wording.

## [0.1.3] — 2026-06-18

### Changed
- **Create Dump**: clearer error messages when a dump cannot be produced.

## [0.1.2] — 2026-06-15

### Added
- **Database → Create Dump** operation: produces a gzip-compressed `.sql.gz` as binary data,
  ready to hand to Google Drive, Dropbox, S3 or any other node in the workflow.

## [0.1.1] — 2026-06-15

### Changed
- RelataSQL brand icons for the node and its credential.

## [0.1.0] — 2026-06-15

### Added
- First public release of the community node: run SQL and inspect schemas across the database
  connections of your RelataSQL workspace, authenticated with your API key.
- This is a database-infrastructure integration only: it deliberately ships **no AI/LLM
  features**.

[Unreleased]: https://github.com/RelataSQL/n8n-nodes-relatasql/compare/v0.1.7...HEAD
[0.1.7]: https://www.npmjs.com/package/n8n-nodes-relatasql/v/0.1.7
[0.1.6]: https://www.npmjs.com/package/n8n-nodes-relatasql/v/0.1.6
[0.1.5]: https://www.npmjs.com/package/n8n-nodes-relatasql/v/0.1.5
[0.1.4]: https://www.npmjs.com/package/n8n-nodes-relatasql/v/0.1.4
[0.1.3]: https://www.npmjs.com/package/n8n-nodes-relatasql/v/0.1.3
[0.1.2]: https://www.npmjs.com/package/n8n-nodes-relatasql/v/0.1.2
[0.1.1]: https://www.npmjs.com/package/n8n-nodes-relatasql/v/0.1.1
[0.1.0]: https://www.npmjs.com/package/n8n-nodes-relatasql/v/0.1.0
