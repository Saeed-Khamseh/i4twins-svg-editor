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

### Imperfect data policies

The bundled assets (`public/data/devices.json`, `public/samples/plant.svg`) deliberately contain dirty data. The app must tolerate every case below without crashing.

#### Catalog loading (`server/device-catalog.ts`)

| Case | Example in data | Policy |
| --- | --- | --- |
| **Duplicate IDs** | `DVC-1576`, `DVC-1584` each appear twice | Last record wins when building the in-memory `Map`. For `DVC-1576` the surviving row has status `stopped`; for `DVC-1584` the later `lastSeen` wins. |
| **Missing / empty record ID** | _(none in the sample, but handled)_ | Row is skipped silently during catalog build. |
| **Case mismatch in JSON** | `"id": "dvc-1101"` vs `"DVC-1101"` on the drawing | Indexed by `id.trim().toUpperCase()`. Search and status lookup use the uppercase key. The returned `Device.id` keeps the casing from the winning record (`dvc-1101`). |
| **Unknown status** | `"degraded"`, any value outside `running` / `stopped` / `fault` | Normalized to `null`. |
| **Null / empty status** | `"status": null`, `"status": ""` | Normalized to `null`. |
| **Missing / empty name** | `"name": ""` on `DVC-1394` | Normalized to `null`. UI falls back to `id` for display (`DeviceSearch.displayName`). Search still matches on `code` and `id`. |
| **Whitespace in text fields** | `"name": "  Fan F-215  "` | Trimmed; whitespace-only becomes `null`. |
| **Null / placeholder lastSeen** | `"lastSeen": null`, `"lastSeen": "n/a"` | Normalized to `null`. |
| **Missing vendor** | omitted field | Defaults to `"—"`. |

#### Drawing ↔ catalog linking (Angular client)

| Case | Example | Policy |
| --- | --- | --- |
| **Case mismatch (SVG vs catalog)** | SVG `data-device-id="DVC-1101"`, catalog `dvc-1101` | Referenced IDs are scanned as uppercase (`app.state.ts`). CSS class targeting compares attributes case-insensitively (`svg-document.service.ts` `matchesAttrs`), so highlight and preview status styling still apply. |
| **Device on drawing, not in catalog** | `DVC-2087` in `plant.svg` | Included in preview status polling; the mock status API returns a random status anyway. The device cannot be found via search because it is not in the catalog. |
| **Device in catalog, not on drawing** | Most catalog entries | Search and selection work normally. Selecting it shows a snackbar: *"Not on this drawing."* (`app.ts`). |
| **Empty / whitespace `data-device-id`** | attribute missing or blank | Ignored when scanning referenced IDs; element receives no highlight or status class. |
| **Duplicate SVG element `id`** | two elements share `id="pump-2"` | Does not crash the editor. Device linking uses `data-device-id`, not element `id`. |
| **Status poll failure** | API unreachable | `catchError` in `app.state.ts` yields an empty status map for that cycle; polling continues every 5 s. Preview styling is cleared until the next successful response. |
| **Unknown / null live status** | mock API returns `null` | No status CSS class is applied; the element keeps its base drawing appearance. |

#### Status endpoint behaviour

`POST /api/devices/status` accepts any string IDs from the drawing (it does not validate against the catalog). Each id gets an independent random value of `running`, `stopped`, `fault`, or `null`. This is intentional for the fake polling backend; catalog `status` fields are used only in search results, not for live preview colouring.

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
