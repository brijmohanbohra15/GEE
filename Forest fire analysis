// date oldest  27 jan 2021
// date lates 3 may 2021
// analysis of fire season 2021 for bijrani forest range in nainital
// purpose of choosing bijrani range : its unbiased nature on topography which range from plain to hill.
//  , no so far from settlement and dense forest.
 
// date 16-01-2021 and 26-05-2021


// Select region 
var bijrani_range = 
    ee.Geometry.Polygon(
        [[[79.02001904585207, 29.467348303849935],
          [79.02001904585207, 29.42145536324627],
          [79.08834027387941, 29.42145536324627],
          [79.08834027387941, 29.467348303849935]]], null, false);
var ADM2_NAME ='Naini Tal';
var admin2 = ee.FeatureCollection("FAO/GAUL/2015/level2");
var selected = admin2
  .filter(ee.Filter.eq('ADM2_NAME', ADM2_NAME));
var geometry = selected.geometry();
Map.centerObject(bijrani_range,13)


//  Function for Cloud masking
/**
 * Function to mask clouds using the Sentinel-2 QA band
 * @param {ee.Image} image Sentinel-2 image
 * @return {ee.Image} cloud masked Sentinel-2 image
 */
function maskS2clouds(image) {
  var qa = image.select('QA60');

  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

  return image.updateMask(mask).divide(10000).copyProperties(image,["system:time_start"]);
}


// Filter data
var dataset = ee.ImageCollection('COPERNICUS/S2_SR')
                  .filterDate('2021-01-01', '2021-05-30')
                  .map(maskS2clouds)
                  .filterBounds(bijrani_range)
// print(dataset)                 
                  
// Mosaic imagecollection by date
var withDates = dataset.map(function(img) {
  return img.set('date', img.date().format('YYYY-MM-dd'))
})

var mosaicList = withDates.aggregate_array('date')
  .distinct()
  .map(function(date) {
    var d = ee.Date(date)
    return dataset.filterDate(d, d.advance(1, 'day')).mosaic().set('system:index', date)
  })
 
var mosaics = ee.ImageCollection.fromImages(mosaicList)
//.select('B8','B12')


//  Select pre fire and post fire date
var RGB_1601 = mosaics.select(['B2','B3','B4']).filter(ee.Filter.eq('system:index', '2021-01-16')).first().clip(bijrani_range)
// print(RGB_2601)
var RGB_2605 = mosaics.select(['B2','B3','B4']).filter(ee.Filter.eq('system:index', '2021-05-26')).first().clip(bijrani_range)
print(RGB_2605)


// Fuction for Normalize burned index
var burnedIndex = function(image){
  var bi = image.normalizedDifference(['B8','B12']).rename(['BI']);

  return image.addBands(bi).select('BI')
}

// Function for clip images
var clip = function(image){
  return image.clip(bijrani_range)
}

//  Calulate burned index and clip it for the mosaic image collection
var burned_imgColl = mosaics.map(burnedIndex).toBands().clip(bijrani_range);

//  Caluclate differential NBR for pre and post fire data
var burnedArea = burned_imgColl.select('2021-01-16_BI')
  .subtract( burned_imgColl.select('2021-05-26_BI')).rename('dNBR').clip(bijrani_range)
 


// Count the pixel values for given dNBR range
var count = burnedArea.lt(.55).selfMask().reduceRegion({
    reducer: ee.Reducer.count(),
    geometry: bijrani_range,
    crs: 'EPSG:4326',
    //maxPixels:1310361348,
    scale: 10,
  }).values().get(0);
  
print(count);

// Visualization parameters for images
var visualization = {
  min: 0.0,
  max: 0.3,
  bands: ['B4', 'B3', 'B2'],
};
// print(burned_imgColl)
// Define an sld style color ramp to apply to the image.
var sld_ramp =
  '<RasterSymbolizer>' +
    '<ColorMap type="ramp" extended="false" >' +
      '<ColorMapEntry color="#0000ff" quantity="-.5" label="0"/>' +
      '<ColorMapEntry color="#44ce1b" quantity="-.1" label="1" />' +
      '<ColorMapEntry color="#bbdb44" quantity=".1" label="2" />' +
      '<ColorMapEntry color="#f2a134" quantity=".27" label="3" />' +
      '<ColorMapEntry color="#e51f1f" quantity=".55" label="4" />' +
      '<ColorMapEntry color="#000000" quantity="1.3" label="5" />' +
    '</ColorMap>' +
  '</RasterSymbolizer>';
//  Visualize the data
Map.addLayer(RGB_1601,visualization , 'rgb');
Map.addLayer(burned_imgColl,{} , 'burned index');
Map.addLayer(burnedArea.sldStyle(sld_ramp),{},'burned Area');
Map.addLayer(burnedArea,{},'burned Area');



// Export the data
// Export.image.toDrive({
//   image: burnedArea, //burned_imgColl.select('2021-01-16_BI'),//,
//   description: 'imageToDriveExample_transform',
//   fileNamePrefix :'preFire',
//   crs: 'EPSG:32644',
//   scale :10,
//   // crsTransform: projections07.transform,
//   // folder : 'swaroopa',
//   region: bijrani_range
// });
