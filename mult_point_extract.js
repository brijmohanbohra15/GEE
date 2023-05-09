var pts = ee.FeatureCollection('projects/ee-b2bohra1995/assets/crop_dibrugarh_original')
print(pts)
print('pts',pts)
Map.centerObject(pts)
Map.addLayer(pts)
var sownMonth = 6
var harvetMonth = 10
///  date range input
var startDate = ee.Date('2021-11-01')
var endDate = ee.Date('2022-12-31')




// Import sentinel 2 image

//  cloud masking 
function maskCloudAndshadowSR(image){
  var cloudProb = image.select('MSK_CLDPRB');
  var snowProb = image.select('MSK_SNWPRB');
  var cloud = cloudProb.lt(5);
  var snow = snowProb.lt(5);
  var scl = image.select('SCL');
  var shadow = scl.eq(3); //3 = clouds shadow
  var cirrus = scl.eq(10); // 10 = cirrus
  // Cloud prbability less than 5 % or cloud shadow classfication
  var mask = (cloud.and(snow)).and(cirrus.neq(1)).and(shadow.neq(1));
  return image.updateMask(mask).copyProperties(image,["system:time_start"]);
}

// variable for sentinel 2
var s2 = ee.ImageCollection('COPERNICUS/S2_SR')
                  // .filter(ee.Filter.calendarRange(sownMonth, harvetMonth, 'month'))
                  .filterDate(startDate, endDate)
                  .filterBounds(pts)
                  .map(maskCloudAndshadowSR)
print('sentinel2',s2)

//  Function for adding ndvi band to imageCollection
function addIndices(image){
  var ndvi = image.normalizedDifference(['B8','B4']).rename('ndvi')
  var ndwi = image.normalizedDifference(['B8','B12']).rename('ndwi')
  var ndwi2 = image.normalizedDifference(['B3','B8']).rename('ndwi2')
  return image.addBands(ndvi).addBands(ndwi).addBands(ndwi2)
}

// apply function to sentinel 2 image
var s2_ndvi = s2.map(addIndices)
print('s2ndvi',s2_ndvi)
var bands = s2_ndvi.select('ndvi').toBands()
print(bands)
Map.addLayer(bands, {},'ndvi')
//  Two function is required for zonal statistics : buffer and zonal stats
// bufferPoints(radius, bounds) ⇒ Function
function bufferPoints(radius, bounds){
  return function(pt){
    pt = ee.Feature(pt);
    return bounds ? pt.buffer(radius).bounds() : pt.buffer(radius);
  }
}

// zonalStats(fc, params) ⇒ ee.FeatureCollection 
function zonalStats(ic, fc, params) {
  // Initialize internal params dictionary.
  var _params = {
    reducer: ee.Reducer.median(),
    scale: null,
    crs: null,
    bands: null,
    bandsRename: null,
    imgProps: null,
    imgPropsRename: null,
    datetimeName: 'datetime',
    datetimeFormat: 'YYYY-MM-dd HH:mm:ss'
  };

  // Replace initialized params with provided params.
  if (params) {
    for (var param in params) {
      _params[param] = params[param] || _params[param];
    }
  }

  // Set default parameters based on an image representative.
  var imgRep = ic.first();
  var nonSystemImgProps = ee.Feature(null)
    .copyProperties(imgRep).propertyNames();
  if (!_params.bands) _params.bands = imgRep.bandNames();
  if (!_params.bandsRename) _params.bandsRename = _params.bands;
  if (!_params.imgProps) _params.imgProps = nonSystemImgProps;
  if (!_params.imgPropsRename) _params.imgPropsRename = _params.imgProps;

  // Map the reduceRegions function over the image collection.
  var results = ic.map(function(img) {
    // Select bands (optionally rename), set a datetime & timestamp property.
    img = ee.Image(img.select(_params.bands, _params.bandsRename))
      .set(_params.datetimeName, img.date().format(_params.datetimeFormat))
      .set('timestamp', img.get('system:time_start'));

    // Define final image property dictionary to set in output features.
    var propsFrom = ee.List(_params.imgProps)
      .cat(ee.List([_params.datetimeName, 'timestamp']));
    var propsTo = ee.List(_params.imgPropsRename)
      .cat(ee.List([_params.datetimeName, 'timestamp']));
    var imgProps = img.toDictionary(propsFrom).rename(propsFrom, propsTo);

    // Subset points that intersect the given image.
    var fcSub = fc.filterBounds(img.geometry());

    // Reduce the image by regions.
    return img.reduceRegions({
      collection: fcSub,
      reducer: _params.reducer,
      scale: _params.scale,
      crs: _params.crs
    })
    // Add metadata to each feature.
    .map(function(f) {
      return f.set(imgProps);
    });
  }).flatten().filter(ee.Filter.notNull(_params.bandsRename));

  return results;
}

// Applying function to sentinel 2 or  Export values for sentinel 2

// Buffer the points for sentinel 1
var ptsS2 = pts.map(bufferPoints(1,true));
Map.addLayer(ptsS2)
print('ptsS2',ptsS2)


// Define parameters for the zonalStats function to sentinel 2
var paramsS2 = {
  reducer: ee.Reducer.median(),
  scale: 30,
  crs: 'EPSG:32643',
  bands: ['B1','B2','B3','B4','B5','B6','B7','B8','B8A','B11','B12','ndvi','ndwi'],
  bandsRename: ['B1','B2','B3','B4','B5','B6','B7','B8','B8A','B11','B12','ndvi','ndwi'],
  imgProps : [],
  datetimeName: 'date',
  datetimeFormat: 'YYYY-MM-dd'
};


// Extract zonal statistics per point per image for sentinel 2
var ptsS2Stats = zonalStats(s2_ndvi,ptsS2, paramsS2)
print('ptsS2stats',ptsS2Stats.limit(50))

// Export table to drive
Export.table.toDrive({
  collection: ptsS2Stats,
  // folder: 'your_gdrive_folder_name_here',
  description: 'NDVI',
  fileFormat: 'CSV'
});

