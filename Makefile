.PHONY: data test web fixtures

data:
	cd pipeline && uv run monitora run

test:
	cd pipeline && uv run pytest -q
	cd web && pnpm test

fixtures:
	cd web && pnpm fixtures

web:
	cd web && pnpm build
