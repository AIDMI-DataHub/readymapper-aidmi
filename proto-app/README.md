# proto-app

The frontend for ReadyMapper.

## Quickstart

 1. Install dependencies:
    
    ```
    npm install
    ```
 2. Set up `public/config.json`:
    
    ```bash
    cp public/config.json.example public/config.json
    # edit config.json with your own values (see Configuration below)
    ```
 3. Start the app:
    
    ```
    npm run dev
    ```

## Configuration

`public/config.json` is required for the app to start. It is not committed to the repo (it contains credentials). Structure:

```json
{
  "s3": {
    "cloudfrontBaseUrl": "https://xxxx.cloudfront.net",
    "outputFolder": "output"
  },
  "mapbox": {
    "accessToken": "pk.eyJ...",
    "styleUrl": "mapbox://styles/your-account/your-style-id"
  }
}
```

| Field | Description |
|---|---|
| `s3.cloudfrontBaseUrl` | Base URL of the CloudFront distribution. Used to fetch `disasters.json`, `about.md`, and all data files. |
| `s3.outputFolder` | Subfolder within CloudFront where processed data lives — appended to `cloudfrontBaseUrl` to form the data URL. Typically `output`. |
| `mapbox.accessToken` | Mapbox GL JS public access token. |
| `mapbox.styleUrl` | Mapbox style URL in the form `mapbox://styles/{username}/{style-id}`. |

## Using local data (optional)

By default, disaster data is fetched from the Cloudfront AWS S3 bucket defined in `public/config.json`. For development, it is often useful to work with disaster data on your local machine. In `proto-app/.env`, set `VITE_USE_LOCAL_BACKEND=true` to use the local disaster data in `data_backend/output`.

Similarly, by default, the disaster configs and about page content are fetched from S3. To use local copies instead, set `VITE_USE_LOCAL_CONTENT=true`. Then the disaster configs are fetched from the `constants/disasters.json` file.

When building for production, the app always uses the Cloudfront data. See the `useLocalBackend` variable in [constants/settings.js](constants/settings.js) for more details.

Before running locally for the first time, you'll need to download data from S3. See `../data_backend/README.md` for details.

## Deploy

Currently the site is deployed to the Stamen Studio server:

```
npm run build && ./deploy.sh
```

## Data

For more information on how the data is downloaded and processed, see [the data backend README](../data_backend/README.md).

## Static map generation

We generate the static map images for the report [here](src/components/utils/generateReportMaps.js). It does the following:

1. Saves the current map bounds (visible in the viewport)
2. Sets the map container dimensions to what we want the image to be
3. Resizes the map
4. Fits the map to the bounds saved in step 1
5. Grabs a screenshot of the map canvas by using `map.getCanvas().toDataURL()`
6. Resets map's size and bounds

Two important things to keep in mind:

- When initializing the mapboxgl map, you need to set `preserveDrawingBuffer: true` for this to work
- To make sure that the map has finished rendering, we listen to the `idle` map event, like this `await new Promise(resolve => map.once('idle', () => resolve()))`
