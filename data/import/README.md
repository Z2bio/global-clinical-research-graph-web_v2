# Authorized / exported source imports

The scheduled sync accepts either repository-local files here or secret URLs configured in GitHub Actions.

Supported normalized inputs:

- `who.json`, `who.csv`, `who.tsv`
- `nmrr.json`, `nmrr.csv`, `nmrr.tsv`

Recommended columns: `id`, `title`, `official_title`, `condition`, `sponsor`, `status`, `study_type`, `phase`, `facility`, `city`, `province`, `country`, `registered_at`, `updated_at`, `url`.

For WHO ICTRP, use an access/download method permitted by WHO ICTRP terms. Do not add credentials to this repository.
For NMRR, use an official/authorized public export or stable feed. The synchronizer does not bypass login or CAPTCHA.
