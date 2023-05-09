// // // Input Variable // // //

//Dataset Availability :  2015-04-02   –  2022-08-02
var month = 1 ;
var currentYear = 2022;
var ROI = 'Karnataka';


///// Dataset Imports & Preprocessing /////

// ROI 
// Study Area - Region of Interest 
var roi = ee.FeatureCollection("FAO/GAUL/2015/level1")
            .filter(ee.Filter.eq('ADM1_NAME', ROI)); //administrative Level 1 units Boundary Polygonsvar 

print(roi)



// SMAP dataset import with Filtering
var dataset = ee.ImageCollection('NASA_USDA/HSL/SMAP10KM_soil_moisture').select('ssm')
print(dataset,'dataset')
var soilMoisture = dataset.filter(ee.Filter.calendarRange(currentYear, currentYear, 'year'))
.filter(ee.Filter.calendarRange(month, month, 'month'));
                 
var theta = dataset
.filter(ee.Filter.calendarRange(2015, 2022, 'year'))
.filter(ee.Filter.calendarRange(month, month, 'month'));

// print(soilMoisture)

///// Function /////

// theta parameter
var theta_min = theta.min();
print(theta_min);
var theta_max = theta.max();
print(theta_max);
// smci function
var index = function(image){
  var smci = (image.subtract(theta_min)).divide(theta_max.subtract(theta_min)).multiply(100).rename('SMCI')
  return image.addBands(smci)
}

//// Implement function /////
var SMCI = soilMoisture.map(index).select('SMCI')
print(SMCI, 'SMCI')

var SMCI_min = SMCI.min().rename('SMCI_min');
print(SMCI_min,'SMCI minimum')

var SMCI_max = SMCI.max().rename('SMCI_max');
print(SMCI_max, 'SMCI_max')

var stack = SMCI_min.addBands(SMCI_max).clip(roi)
print(stack,'stack')

///// Dataset visualization ////////

// Index visualization
var indexVis = {
  min : 0.0,
  max : 100,
  palette :[]
}

// SMAP data visusalization
var soilMoistureVis = {
  min: 0.0,
  max: 28.0,
  palette: ['0300ff', '418504', 'efff07', 'efff07', 'ff0303'],
};

// Map.addLayer(soilMoisture, soilMoistureVis, 'Soil Moisture');
Map.addLayer(stack, indexVis, 'Stack')
// ROI visualization
Map.addLayer(roi, 'ROI')
Map.centerObject(roi, 8);

// // // Export data // // //
var projection = dataset.projection().getInfo();
Export.image.toDrive({
  image : stack,
  scale : 10000,
  region : roi,
  crs: projection.crs,
  crsTransform: projection.transform,
  description : 'stack',
  maxPixels: 1e13});
