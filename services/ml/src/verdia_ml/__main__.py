"""Run the Inference API: `uv run verdia-ml` or `python -m verdia_ml`."""

import uvicorn

from verdia_ml.app import app


def main() -> None:
    uvicorn.run(app, host="0.0.0.0", port=8000)


if __name__ == "__main__":
    main()
