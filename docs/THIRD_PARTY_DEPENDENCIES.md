# Third-Party Dependencies

## Next.js app (`package.json`)

| Package | Purpose | License |
|---|---|---|
| next | Application framework | MIT |
| react / react-dom | UI library | MIT |
| typescript | Type checking | Apache-2.0 |
| tailwindcss / @tailwindcss/postcss / @tailwindcss/turbopack | Styling | MIT |
| @supabase/supabase-js | Production auth + database client | MIT |
| better-sqlite3 | Local/demo-mode embedded database | MIT |
| bcryptjs | Password hashing (local adapter) | MIT |
| jose | Session JWT signing/verification | MIT |
| zod | Request validation schemas | MIT |
| lucide-react | Icon set | ISC |
| clsx | Conditional class name helper | MIT |
| recharts | Admin dashboard charts | MIT |
| eslint / eslint-config-next | Linting (dev only) | MIT |

All of the above are free, open-source, and widely maintained. None require a
paid license to use commercially.

## PDF processing service (`pdf-service/requirements.txt`)

| Package | Purpose | License |
|---|---|---|
| fastapi | Web framework for the processing service | MIT |
| uvicorn | ASGI server | BSD-3-Clause |
| pymupdf (fitz) | Core PDF parsing, rendering, and metadata extraction | AGPL-3.0 / commercial |
| pypdf | Secondary strict structural validation | BSD-3-Clause |
| pillow | Image handling for resolution checks and perceptual hashing | HPND |
| reportlab | Generates the downloadable PDF report | BSD-3-Clause |
| python-multipart | Multipart form parsing (file uploads) | Apache-2.0 |

**Licensing note on PyMuPDF:** PyMuPDF is dual-licensed under AGPL-3.0 and a
commercial license from Artifex. Using it in an AGPL-compliant way (e.g. open
-sourcing this service, or treating the PDF-processing microservice as a
network-accessible AGPL component) is free. If the new owner intends to run
PrintReady as a closed-source commercial SaaS and is not comfortable with the
AGPL's network-use provisions, budget for an Artifex commercial PyMuPDF
license, or evaluate swapping to `pypdfium2` (Apache-2.0/BSD) for rendering
and keep `pypdf` for structural checks — this would require moderate changes
to `pdf-service/analysis/engine.py` (image extraction and page rendering
calls specifically). This is flagged here deliberately so it's an informed
decision for the next owner, not a hidden liability.

## Infrastructure / third-party services

| Service | Purpose | Pricing model |
|---|---|---|
| Supabase | Postgres database, authentication, file storage | Free tier, then usage-based |
| Vercel (or any Node host) | Next.js app hosting | Free tier, then usage-based |
| Render / Railway / Fly.io (or any container host) | PDF service hosting | Usage-based, ~$7+/mo |

No other third-party SaaS, API key, or paid service is required to run
PrintReady at launch.
