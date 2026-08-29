import { settings } from '../../../constants/settings'

export const generateReportMaps = async (disasterConfig, map, setTab, setReportMapViews) => {

  const generateSVGImage = async (svgId) => {
    return new Promise((resolve, reject) => {
      // Create a data URL for the SVG
      let svg = document.querySelector(`#${svgId}`)
      let data = (new XMLSerializer()).serializeToString(svg)
      let svgBlob = new Blob([data], { type: "image/svg+xml;charset=utf-8" })

      let svgDataUrl = window.URL.createObjectURL(svgBlob)
      // Weirdly, we can't use just this svg data url on its own
      // because it doesn't scale when you scale the image.

      // Create a canvas
      let canvas = document.createElement("canvas")
      canvas.width = svg.getBoundingClientRect().width
      canvas.height = svg.getBoundingClientRect().height
      let ctx = canvas.getContext("2d")

      // Load svg into image and draw to canvas
      var img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0)
        window.URL.revokeObjectURL(svgDataUrl)
        resolve(canvas)
      }
      img.src = svgDataUrl
    })
  }

  let svgImage

  const generateMapImage = async (tabName, reportSectionName) => {
    setTab(tabName)
    // idle event signifies map is finished rendering the map layers for the desired tab.
    // Guard with a timeout: if the tab set is a no-op and the map is already idle,
    // 'idle' may never fire and would hang report generation forever.
    await new Promise(resolve => {
      let done = false
      const finish = () => { if (!done) { done = true; resolve() } }
      map.once('idle', finish)
      setTimeout(finish, 5000)
    })

    let mapImageCanvas = document.createElement('canvas')
    mapImageCanvas.width = map.getCanvas().width
    mapImageCanvas.height = map.getCanvas().height
    let mapImageCtx = mapImageCanvas.getContext('2d')

    // First draw the mapbox map
    mapImageCtx.drawImage(map.getCanvas(), 0, 0)

    // If it's a hurricane, add the hurricane layer on top
    if (disasterConfig.type === 'hurricane') {
      svgImage = svgImage || (await generateSVGImage('hurricane-forecast-canvas'))
      mapImageCtx.drawImage(svgImage, 0, 0, mapImageCanvas.width, mapImageCanvas.height)
    }

    setReportMapViews({ id: reportSectionName, image: mapImageCanvas.toDataURL() })
  }

  // Generating full-size maps for now
  // to prevent changes in zoom from messing
  // with map styling.

  // const previousBounds = map.getBounds()
  // const mapContainer = document.getElementById('map')
  // mapContainer.style.width = settings.reportMapImages.width
  // mapContainer.style.height = settings.reportMapImages.height
  // map.resize()
  // map.fitBounds(previousBounds)

  // generate images
  await generateMapImage('disasterReport', 'disaster')
  await generateMapImage('vulnerabilityReport', 'vulnerability')
  await generateMapImage('movementReport', 'movement')
  await generateMapImage('infrastructureReport', 'infrastructure')
  // Custom view LAST: it's show-all, so capturing it last means no leaked
  // visibility can bleed into the fixed-tab captures above.
  await generateMapImage('custom', 'custom')

  // restore map dimensions
  // mapContainer.style.width = ''
  // mapContainer.style.height = ''
  // map.resize()
  // map.fitBounds(previousBounds)


}
