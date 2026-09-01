# SVG Editor (i4Twins Task)

Industrial drawing (HMI) viewer and editor built with Angular. Loads SVG drawings, supports element inspection/editing, and searches devices through a local HTTP API.

## Run

Start the devices API and Angular dev server together:

```bash
npm start
```

Open `http://localhost:4200/`.

To run only the Angular app (requires the API already running on port 3001):

```bash
npm run start:app
```

To run only the API:

```bash
npm run start:api
```

## Devices API

Data is served from [`public/data/devices.json`](public/data/devices.json) via a small Express server — the Angular app does not import the JSON directly.

| Endpoint | Description |
| --- | --- |
| `GET /api/devices?q={term}` | Case-insensitive search by `id`, `name`, or `code`. Returns up to 20 full `Device` records. |
| `POST /api/devices/status` | Body `{ ids: string[] }`. Returns `{ [deviceId]: status \| null }` with random `running`, `stopped`, `fault`, or `null` per id (fake polling backend). |

Shared types live in [`shared/api-types.ts`](shared/api-types.ts) and are used by both the server and the Angular client.

### Data normalization policies

- **Duplicate IDs** (`DVC-1576`, `DVC-1584`): last record wins when building the in-memory catalog.
- **Case mismatch** (`dvc-1101` vs `DVC-1101`): indexed by uppercase ID; canonical ID from the winning record is returned.
- **Unknown status** (`null`, `degraded`, `FAULT`): normalized to `running`, `stopped`, `fault`, or `unknown`.
- **Missing name**: kept as `null`; search still matches on `code` and `id`.

## Key decisions

- **Express mock API** satisfies the spec requirement to expose `devices.json` over HTTP without bundling it into the Angular app.
- **Two endpoints only**: search returns full device records (no separate detail route); status map is minimal for polling.
- **`DeviceApiService`** is the sole HTTP client for device endpoints; **`DeviceSearch`** handles autocomplete with 300ms debounce and `switchMap` request cancellation.
- **`shared/api-types.ts`** is the single contract shared between server and client.

## Build

```bash
npm run build
```

Output is written to `dist/`.
