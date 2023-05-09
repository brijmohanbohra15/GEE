var imports = require('users/b2bohra1995/A_Project:/cropMap_sent1_2');
// Merge gcps

var gcps = imports.built_up.merge(imports.tree).merge(imports.water).merge(maize).merge(mustard).merge(potato).merge(vegetable).merge(bare)
// print(gcps, 'gcps')

var startDate = '2022-11-15'
var endDate = '2022-12-31'

var geometry = ee.FeatureCollection('projects/ee-b2bohra1995/assets/dibrugarh_district')
Map.addLayer(geometry,{},'geometry')

Map.centerObject(geometry,12)


// Load Sentinel-1 C-band SAR GRD data (log scal, VV, descneding)
var collectionVV = ee.ImageCollection('COPERNICUS/S1_GRD')
        .filter(ee.Filter.eq('instrumentMode', 'IW'))
        .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
        .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))
        .filterMetadata('resolution_meters','equals',10)
        .filterBounds(geometry)
        .select('VV')
        .filterDate(startDate, endDate)
       
// print(collectionVV,'collectionVV')
// Mosaic imagecollection by date
var withDates = collectionVV.map(function(img) {
  return img.set('date', img.date().format('YYYY-MM-dd'))
})

var mosaicListVV = withDates.aggregate_array('date')
  .distinct()
  .map(function(date) {
    var d = ee.Date(date)
    return collectionVV.filterDate(d, d.advance(1, 'day')).mosaic().set('system:index', date)
  })
 
var mosaicsVV = ee.ImageCollection.fromImages(mosaicListVV)
// print(mosaicsVV, 'mosaicsVV')

// Load Sentinel-1 C-band SAR GRD data (log scal, VH, descneding)
var collectionVH = ee.ImageCollection('COPERNICUS/S1_GRD')
        .filter(ee.Filter.eq('instrumentMode', 'IW'))
        .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
        .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))
        .filterMetadata('resolution_meters','equals',10)
        .filterBounds(geometry)
        .select('VH')
        .filterDate(startDate, endDate)
// print(collectionVH,'collectionVH')
// Mosaic imagecollection by date
var withDates = collectionVH.map(function(img) {
  return img.set('date', img.date().format('YYYY-MM-dd'))
})

var mosaicListVH = withDates.aggregate_array('date')
  .distinct()
  .map(function(date) {
    var d = ee.Date(date)
    return collectionVH.filterDate(d, d.advance(1, 'day')).mosaic().set('system:index', date)
  })
 
var mosaicsVH = ee.ImageCollection.fromImages(mosaicListVH)
// print(mosaicsVH, 'mosaicsVV')

// Filter by Date
var SARVV = mosaicsVV.toBands()//.mosaic();
var SARVH = mosaicsVH.toBands()//.mosaic();
print(SARVV,'SARVV')
print(SARVH,'SARVH')


//  Apply the filter to reduce the speckle
var SMOOTHING_RADIUS = 15
var SARVV_filtered = SARVV.focal_mean(SMOOTHING_RADIUS,'circle','meters');
var SARVH_filtered = SARVH.focal_mean(SMOOTHING_RADIUS,'circle','meters');

// Display the SAR filtered images
Map.addLayer(SARVV_filtered,{min:-15,max:0},'SAR VV filtered',0);
Map.addLayer(SARVH_filtered,{min: -25, max:0},'SAR VH filtered',0);

// Add the SAR images to 'Layers' in order to display them
Map.addLayer(SARVV,{min:-15,max:0},'SAR VV',0);
Map.addLayer(SARVH,{min: -25, max:0},'SAR VH',0);

// // Function to remove cloud and snow pixels from Sentinel-2 SR image

function maskCloudAndShadowsSR(image) {
  var cloudProb = image.select('MSK_CLDPRB');
  var snowProb = image.select('MSK_SNWPRB');
  var cloud = cloudProb.lt(10);
  var scl = image.select('SCL'); 
  var shadow = scl.eq(3); // 3 = cloud shadow
  var cirrus = scl.eq(10); // 10 = cirrus
  // Cloud probability less than 10% or cloud shadow classification
  var mask = cloud.and(cirrus.neq(1)).and(shadow.neq(1));
  return image.updateMask(mask).divide(10000).copyProperties(image,["system:time_start"]);
}

// Extract the image from sentinel 2 collection
var s2 = ee.ImageCollection("COPERNICUS/S2_SR")
.filterBounds(geometry)
print(s2,'s2')
var projection = s2.first().select('B2').projection().getInfo();
var filtered = s2.filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
  // .filter(ee.Filter.date('2019-01-01', '2020-01-01'))
  .filterDate(startDate, endDate)
  .filter(ee.Filter.bounds(geometry))
  .map(maskCloudAndShadowsSR)
  .select('B.*')
// print(filtered,'filtered')

var func_ndvi = function(image){
  var ndvi = image.normalizedDifference(['B8','B4']).rename('NDVI');
  return image.addBands(ndvi)
}

var composite = filtered.map(func_ndvi)
// print(composite,'ndvi compostie')

// Mosaic imagecollection by date
var withDates = composite.map(function(img) {
  return img.set('date', img.date().format('YYYY-MM-dd'))
})

var mosaicList = withDates.aggregate_array('date')
  .distinct()
  .map(function(date) {
    var d = ee.Date(date)
    return composite.filterDate(d, d.advance(1, 'day')).mosaic().set('system:index', date)
  })
 
var composite = ee.ImageCollection.fromImages(mosaicList).toBands()
print(composite, 'mosaics optical')
Map.addLayer(composite,{},'composite')
var bands = ["2022-11-16_VV"
 ,"2022-11-28_VV"
, "2022-12-10_VV"
,  "2022-12-22_VV"
,"2022-11-16_VH"
, "2022-11-28_VH"
, "2022-12-10_VH"
,  "2022-12-22_VH"
//, "2022-11-16_B2","2022-11-16_B3", "2022-11-16_B4", "2022-11-16_B8", "2022-11-16_B11","2022-11-16_B12","2022-11-16_NDVI" ,
// "2022-11-19_B2",  "2022-11-19_B3" ,"2022-11-19_B4","2022-11-19_B8", "2022-11-19_B11","2022-11-19_B12","2022-11-19_NDVI",
// "2022-11-21_B2", "2022-11-21_B3",  "2022-11-21_B4", "2022-11-21_B8", "2022-11-21_B11","2022-11-21_B12","2022-11-21_NDVI"
, "2022-11-24_B2","2022-11-24_B3",  "2022-11-24_B4","2022-11-24_B8", "2022-11-24_B11","2022-11-24_B12","2022-11-24_NDVI"
//,"2022-11-26_B2", "2022-11-26_B3",  "2022-11-26_B4","2022-11-26_B8", "2022-11-26_B11", "2022-11-26_B12", "2022-11-26_NDVI",
,"2022-11-29_B2", "2022-11-29_B3", "2022-11-29_B4","2022-11-29_B8", "2022-11-29_B11", "2022-11-29_B12",  "2022-11-29_NDVI"
//,"2022-12-01_B2", "2022-12-01_B3", "2022-12-01_B4","2022-12-01_B8", "2022-12-01_B11", "2022-12-01_B12",  "2022-12-01_NDVI"
,"2022-12-04_B2", "2022-12-04_B3", "2022-12-04_B4","2022-12-04_B8", "2022-12-04_B11", "2022-12-04_B12",  "2022-12-04_NDVI"
//,"2022-12-06_B2", "2022-12-06_B3", "2022-12-06_B4","2022-12-06_B8", "2022-12-06_B11", "2022-12-06_B12",  "2022-12-06_NDVI"
,"2022-12-09_B2", "2022-12-09_B3", "2022-12-09_B4","2022-12-09_B8", "2022-12-09_B11", "2022-12-09_B12",  "2022-12-09_NDVI"
//,"2022-12-11_B2", "2022-12-11_B3", "2022-12-11_B4","2022-12-11_B8", "2022-12-11_B11", "2022-12-11_B12",  "2022-12-11_NDVI"
////,"2022-12-14_B2", "2022-12-14_B3", "2022-12-14_B4","2022-12-14_B8", "2022-12-14_B11", "2022-12-14_B12",  "2022-12-14_NDVI"
//,"2022-12-16_B2", "2022-12-16_B3", "2022-12-16_B4","2022-12-16_B8", "2022-12-16_B11", "2022-12-16_B12",  "2022-12-16_NDVI"
//,"2022-12-19_B2", "2022-12-19_B3", "2022-12-19_B4","2022-12-19_B8", "2022-12-19_B11", "2022-12-19_B12",  "2022-12-19_NDVI"
////,"2022-12-21_B2", "2022-12-21_B3", "2022-12-21_B4","2022-12-21_B8", "2022-12-21_B11", "2022-12-21_B12",  "2022-12-21_NDVI"
,"2022-12-24_B2", "2022-12-24_B3", "2022-12-24_B4","2022-12-24_B8", "2022-12-24_B11", "2022-12-24_B12",  "2022-12-24_NDVI"
//,"2022-12-29_B2", "2022-12-29_B3", "2022-12-29_B4","2022-12-29_B8", "2022-12-29_B11", "2022-12-29_B12",  "2022-12-29_NDVI"
]
// Define both optical and SAR to train your data
var opt_sar = ee.Image.cat(composite, SARVV_filtered, SARVH_filtered).clip(geometry)//.mask(crop_location);
var bands_opt_sar = bands;//['VH','VV','B2','B3','B4','B8','B11','B12','NDVI'];
var training_opt_sar = opt_sar.select(bands_opt_sar).sampleRegions({
  collection : gcps,
  properties : ['Landcover'],
  scale :30,
})


// Train the classifier
var classifier_opt_sar = ee.Classifier.smileRandomForest(50).train({
  features : training_opt_sar,
  classProperty :'Landcover',
  inputProperties :bands_opt_sar
})

// Run the classification
var classifiedboth = opt_sar.select(bands_opt_sar).classify(classifier_opt_sar)//.clip(geometry)
// Display the classification
Map.addLayer(classifiedboth, {min: 0, max: 7, palette: ['gray', 'brown', 'blue', 'green','red','yellow','black','pink']}, '2019'); 
// Create a confusion matrix representing resubstitution accuracy
print('RF-Opt/SAR error matrix:', classifier_opt_sar.confusionMatrix());
print('RF-Opt/SAR accuracy:',classifier_opt_sar.confusionMatrix().accuracy());


// //************************************************************************** 
// // Post process by clustering
// //************************************************************************** 

// Cluster using Unsupervised Clustering methods
var seeds = ee.Algorithms.Image.Segmentation.seedGrid(5);

var snic = ee.Algorithms.Image.Segmentation.SNIC({
  image: opt_sar.select(bands_opt_sar), 
  compactness: 0,
  connectivity: 4,
  neighborhoodSize: 10,
  size: 2,
  seeds: seeds
})
var clusters = snic.select('clusters')

// Assign class to each cluster based on 'majority' voting (using ee.Reducer.mode()
var smoothed = classifiedboth.addBands(clusters);

var clusterMajority = smoothed.reduceConnectedComponents({
  reducer: ee.Reducer.mode(),
  labelBand: 'clusters'
});
Map.addLayer(clusterMajority, {min: 0, max: 7, palette: ['gray', 'brown', 'blue', 'green','red','yellow','black','pink']},
  'Processed using Clusters');
//var projection = collectionVV.select('B2').projection().getInfo();
Export.image.toDrive({
  image : clusterMajority,
  scale : 10,
  region : geometry,
  crs: projection.crs,
  crsTransform: projection.transform,
  description : 'cropMap',
  maxPixels: 1e13});
