// Importing necessary libraries
import '@kitware/vtk.js/favicon';
import '@kitware/vtk.js/Rendering/Profiles/Volume';
import '@kitware/vtk.js/Rendering/Profiles/Geometry';
import macro from '@kitware/vtk.js/macros';
import HttpDataAccessHelper from '@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper';
import vtkBoundingBox from '@kitware/vtk.js/Common/DataModel/BoundingBox';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';
import vtkVolumeController from '@kitware/vtk.js/Interaction/UI/VolumeController';
import vtkURLExtract from '@kitware/vtk.js/Common/Core/URLExtract';
import vtkVolume from '@kitware/vtk.js/Rendering/Core/Volume';
import vtkVolumeMapper from '@kitware/vtk.js/Rendering/Core/VolumeMapper';
import vtkXMLImageDataReader from '@kitware/vtk.js/IO/XML/XMLImageDataReader';
import vtkFPSMonitor from '@kitware/vtk.js/Interaction/UI/FPSMonitor';
import vtkImageCropFilter from '@kitware/vtk.js/Filters/General/ImageCropFilter';
// Force DataAccessHelper to have access to various data source
import '@kitware/vtk.js/IO/Core/DataAccessHelper/HtmlDataAccessHelper';
import '@kitware/vtk.js/IO/Core/DataAccessHelper/JSZipDataAccessHelper';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';
import vtkHttpDataSetReader from '@kitware/vtk.js/IO/Core/HttpDataSetReader';
import vtkImageMarchingCubes from '@kitware/vtk.js/Filters/General/ImageMarchingCubes';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import  controlPanel from "./controlPanel.html";
import style from 'style-loader!css-loader?modules!./VolumeViewer.css';


let autoInit = true;
//extracting URL paramters
const userParams = vtkURLExtract.extractURLParameters();
//initializing FPS monitor   
const fpsMonitor = vtkFPSMonitor.newInstance(); 
// ----------------------------------------------------------------------------

//This function is for removing front page after uploading the vti file
function emptyContainer(container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}
// ----------------------------------------------------------------------------
//This preventDefault() method of the Event interface tells the user agent that 
//if the event does not get explicitly handled, 
//its default action should not be taken as it normally would be.
function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}
// ----------------------------------------------------------------------------

//Slicer functiom

function setupMultiSlice({ renderer2, renderWindow2, source: data }) {
  //initializing slices 
  const imageActorI = vtkImageSlice.newInstance();
  const imageActorJ = vtkImageSlice.newInstance();
  const imageActorK = vtkImageSlice.newInstance();

  //adding actors to the slices
  renderer2.addActor(imageActorK);
  renderer2.addActor(imageActorJ);
  renderer2.addActor(imageActorI);

  //function to update color level
  function updateColorLevel(e) {
    const colorLevel = Number(
      (e ? e.target : document.querySelector(".colorLevel")).value
    );
    //setting color level property
    imageActorI.getProperty().setColorLevel(colorLevel);
    imageActorJ.getProperty().setColorLevel(colorLevel);
    imageActorK.getProperty().setColorLevel(colorLevel);
    renderWindow2.render();
  }
   //function to update color window
  function updateColorWindow(e) {
    const colorLevel = Number(
      (e ? e.target : document.querySelector(".colorWindow")).value
    );
    //setting color window property
    imageActorI.getProperty().setColorWindow(colorLevel);
    imageActorJ.getProperty().setColorWindow(colorLevel);
    imageActorK.getProperty().setColorWindow(colorLevel);
    renderWindow2.render();
  }

  //-------------------------------
  //initializing mapper and setting input data, slice values and mappers
  const imageMapperK = vtkImageMapper.newInstance();
  imageMapperK.setInputData(data);
  imageMapperK.setKSlice(30);
  imageActorK.setMapper(imageMapperK);

  const imageMapperJ = vtkImageMapper.newInstance();
  imageMapperJ.setInputData(data);
  imageMapperJ.setJSlice(30);
  imageActorJ.setMapper(imageMapperJ);

  const imageMapperI = vtkImageMapper.newInstance();
  imageMapperI.setInputData(data);
  imageMapperI.setISlice(30);
  imageActorI.setMapper(imageMapperI); 

  //if the range of slicees are changed in the control panel input 
  //then the value of slices will be updated in the window also
  document.querySelector(".sliceI").addEventListener("input", (e) => {
    imageActorI.getMapper().setISlice(Number(e.target.value));
    renderWindow2.render();
  });

  document.querySelector(".sliceJ").addEventListener("input", (e) => {
    imageActorJ.getMapper().setJSlice(Number(e.target.value));
    renderWindow2.render();
  });

  document.querySelector(".sliceK").addEventListener("input", (e) => {
    imageActorK.getMapper().setKSlice(Number(e.target.value));
    renderWindow2.render();
  });

  //get the data range
  const dataRange = data.getPointData().getScalars().getRange();
  const extent = data.getExtent();

  //setting attribute for values from control panel input 
  [".sliceI", ".sliceJ", ".sliceK"].forEach((selector, idx) => {
    const el = document.querySelector(selector);
    el.setAttribute("min", extent[idx * 2 + 0]);
    el.setAttribute("max", extent[idx * 2 + 1]);
    el.setAttribute("value", 30);
  });
   //setting attribute for values from control panel input
  [".colorLevel", ".colorWindow"].forEach((selector) => {
    document.querySelector(selector).setAttribute("max", dataRange[1]);
    document.querySelector(selector).setAttribute("value", dataRange[1]);
  });
  document
    .querySelector(".colorLevel")
    .setAttribute("value", (dataRange[0] + dataRange[1]) / 2);
  updateColorLevel();
  updateColorWindow();
  //if color level is changed then call updateColorLevel function
  document
    .querySelector(".colorLevel")
    .addEventListener("input", updateColorLevel);
  document
    .querySelector(".colorWindow")
    .addEventListener("input", updateColorWindow);

  //making the slices global
  global.imageActorI = imageActorI;
  global.imageActorJ = imageActorJ;
  global.imageActorK = imageActorK; 

 
  renderer2.resetCamera();
  renderWindow2.render();
}

//end of setupmultislice


// cropper function
function setupCropper({renderer3,renderWindow3}){
  //setting up control panel
  function setupControlPanel(data, cropFilter) {
    const axes = ['I', 'J', 'K'];
    const minmax = ['min', 'max'];
  
    const extent = data.getExtent();
    //setting the attributes with the change of inputs from the control panel
    axes.forEach((ax, axi) => {
      minmax.forEach((m, mi) => {
        const el = document.querySelector(`.${ax}${m}`);
        el.setAttribute('min', extent[axi * 2]);
        el.setAttribute('max', extent[axi * 2 + 1]);
        el.setAttribute('value', extent[axi * 2 + mi]);
  
        el.addEventListener('input', () => {
          const planes = cropFilter.getCroppingPlanes().slice();
          planes[axi * 2 + mi] = Number(el.value);
          cropFilter.setCroppingPlanes(...planes);          
          renderWindow3.render();
        });
      });
    });
  }
  
  // creating filter
  const cropFilter = vtkImageCropFilter.newInstance();  
  const reader = vtkHttpDataSetReader.newInstance({ fetchGzip: true }); 
  //creating pipeline 
  const actor = vtkVolume.newInstance();
  const mapper = vtkVolumeMapper.newInstance();
  mapper.setSampleDistance(1.1);
  actor.setMapper(mapper);
  
  // create color and opacity transfer functions
  const ctfun = vtkColorTransferFunction.newInstance();
  ctfun.addRGBPoint(0, 85 / 255.0, 0, 0);
  ctfun.addRGBPoint(95, 1.0, 1.0, 1.0);
  ctfun.addRGBPoint(225, 0.66, 0.66, 0.5);
  ctfun.addRGBPoint(255, 0.3, 1.0, 0.5);
  const ofun = vtkPiecewiseFunction.newInstance();
  ofun.addPoint(0.0, 0.0);
  ofun.addPoint(255.0, 1.0);
  actor.getProperty().setRGBTransferFunction(0, ctfun);
  actor.getProperty().setScalarOpacity(0, ofun);
  actor.getProperty().setScalarOpacityUnitDistance(0, 3.0);
  actor.getProperty().setInterpolationTypeToLinear();
  actor.getProperty().setUseGradientOpacity(0, true);
  actor.getProperty().setGradientOpacityMinimumValue(0, 2);
  actor.getProperty().setGradientOpacityMinimumOpacity(0, 0.0);
  actor.getProperty().setGradientOpacityMaximumValue(0, 20);
  actor.getProperty().setGradientOpacityMaximumOpacity(0, 1.0);
  actor.getProperty().setShade(true);
  actor.getProperty().setAmbient(0.2);
  actor.getProperty().setDiffuse(0.7);
  actor.getProperty().setSpecular(0.3);
  actor.getProperty().setSpecularPower(8.0);
  
  //reading the data
  reader.setUrl(`https://kitware.github.io/vtk-js/data/volume/headsq.vti`).then(() => {
    reader.loadData().then(() => {
      renderer3.addVolume(actor);
  
      const data = reader.getOutputData();

      //set up crop planes
      cropFilter.setCroppingPlanes(...data.getExtent());

      //calling setupControlPanel function
      setupControlPanel(data, cropFilter);
      
      //set up interactor, camera and renderwindow
      const interactor = renderWindow3.getInteractor();
      interactor.setDesiredUpdateRate(15.0);
      renderer3.resetCamera();
      renderWindow3.render();
      
    });
  });

  //set up input connection
  cropFilter.setInputConnection(reader.getOutputPort());
  mapper.setInputConnection(cropFilter.getOutputPort());  

  //making the variables global
  global.source = reader;
  global.mapper = mapper;
  global.actor = actor;
  global.ctfun = ctfun;
  global.ofun = ofun;
  global.renderer = renderer3;
  global.renderWindow = renderWindow3;
  global.cropFilter = cropFilter;
}

//Volume Contour function

function setupIso({renderer4,renderWindow4}){

  //creating pipeline
  const actor2 = vtkActor.newInstance();
  const mapper2 = vtkMapper.newInstance();
  //initializing marchingcube 
  const marchingCube = vtkImageMarchingCubes.newInstance({
    contourValue: 0.0,
    computeNormals: true,
    mergePoints: true,
  });

actor2.setMapper(mapper2);
mapper2.setInputConnection(marchingCube.getOutputPort());
 //function to update isoValue
function updateIsoValue(e) {
  const isoValue = Number(e.target.value);
  marchingCube.setContourValue(isoValue);
  renderWindow4.render();
}
  //reading the data 
  const reader = vtkHttpDataSetReader.newInstance({ fetchGzip: true });
  marchingCube.setInputConnection(reader.getOutputPort());
  const __BASE_PATH__ = 'https://kitware.github.io/vtk-js';
  reader
    .setUrl(`${__BASE_PATH__}/data/volume/headsq.vti`, { loadData: true })
    .then(() => {
      const data = reader.getOutputData();
      //setting the datarange and and isoValue
      const dataRange = data.getPointData().getScalars().getRange();
      const firstIsoValue = (dataRange[0] + dataRange[1]) / 3;
      
      //setting attributes for the input change in the control panel
      const el = document.querySelector('.isoValue');
      el.setAttribute('min', dataRange[0]);
      el.setAttribute('max', dataRange[1]);
      el.setAttribute('value', firstIsoValue);
      el.addEventListener('input', updateIsoValue);      
      marchingCube.setContourValue(firstIsoValue);
     //setting the camera and renderwindow
      renderer4.addActor(actor2);
      renderer4.getActiveCamera().set({ position: [1, 1, 0], viewUp: [0, 0, -1] });
      renderer4.resetCamera();
      renderWindow4.render();
    });
  //making some variables global
  global.actor = actor2;
  global.mapper = mapper2;
  global.marchingCube = marchingCube;
}

//end of cropper
//-----------------------------------------------------------------------------

//creating screen for the application
function createViewer(rootContainer, fileContents, options) {
  //creating 4 divs' for four different windows
  const div1 = document.createElement("div");
  document.body.appendChild(div1);
  const div2 = document.createElement("div");
  document.body.appendChild(div2);
  const div3 = document.createElement("div");
  document.body.appendChild(div3);
  const div4 = document.createElement("div");
  document.body.appendChild(div4);

  //setting background color
  const background = options.background
    ? options.background.split(",").map((s) => Number(s))
    : [0, 0, 0];
  const containerStyle = options.containerStyle;

  //initializing screen renderer for 4 windows
  const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
    background,
    rootContainer:div1,
    containerStyle
  });
  const fullScreenRenderWindow = vtkFullScreenRenderWindow.newInstance({
    background: [0, 0, 0], 
  },
  { rootContainer: div2    }
  );
  //slicer
  const fullScreenRender1 = vtkFullScreenRenderWindow.newInstance({
    background: [0, 0, 0],  
  },
  { rootContainer: div3}
  );
  const fullScreenRender2 = vtkFullScreenRenderWindow.newInstance({
    background: [0, 0, 0],  
  },
  { rootContainer: div4}
  );
  const renderer = fullScreenRenderer.getRenderer();
  const renderWindow = fullScreenRenderer.getRenderWindow();
  renderWindow.getInteractor().setDesiredUpdateRate(15);

 //setting position and sizes of the windows
  //piecewise function window
  fullScreenRenderer.getContainer().style.height = "50%"
  fullScreenRenderer.getContainer().style.width = "50%"
  fullScreenRenderer.getContainer().style.right = "50%"
  fullScreenRenderer.getContainer().style.bottom= "50%"
  fullScreenRenderer.resize()
  //cropper window
  fullScreenRenderWindow.getContainer().style.height = "50%"
  fullScreenRenderWindow.getContainer().style.width = "50%"
  fullScreenRenderWindow.getContainer().style.left= "50%"
  fullScreenRenderWindow.getContainer().style.bottom= "50%"
  fullScreenRenderWindow.resize()  
  const renderer3 = fullScreenRenderWindow.getRenderer();
  const renderWindow3 = fullScreenRenderWindow.getRenderWindow();

  //slicer
  fullScreenRender1.getContainer().style.height = "50%"
  fullScreenRender1.getContainer().style.width = "50%"
  fullScreenRender1.getContainer().style.right = "50%"
  fullScreenRender1.getContainer().style.top ="50%"
  fullScreenRender1.resize()
  const renderer2 = fullScreenRender1.getRenderer();
  const renderWindow2 = fullScreenRender1.getRenderWindow();

 //volume contour
  fullScreenRender2.getContainer().style.height = "50%"
  fullScreenRender2.getContainer().style.width = "50%"
  fullScreenRender2.getContainer().style.left = "50%"
  fullScreenRender2.getContainer().style.top ="50%"
  fullScreenRender2.resize()
  const renderer4 = fullScreenRender2.getRenderer();
  const renderWindow4 = fullScreenRender2.getRenderWindow();

  //reading the image from local machine
  const vtiReader =vtkXMLImageDataReader.newInstance({ fetchGzip: true });
  vtiReader.parseAsArrayBuffer(fileContents);

   //creating the pipeline
  const source = vtiReader.getOutputData();
  const mapper = vtkVolumeMapper.newInstance();
  const actor = vtkVolume.newInstance();

  const dataArray =
    source.getPointData().getScalars() || source.getPointData().getArrays()[0];
  const dataRange = dataArray.getRange();
  
  //initializing the color transfer and opacity transfer function 
  //and adding the control panel
  const lookupTable = vtkColorTransferFunction.newInstance();
  const piecewiseFunction = vtkPiecewiseFunction.newInstance();
  fullScreenRenderer.addController(controlPanel);

  // Pipeline handling
  actor.setMapper(mapper);
  mapper.setInputData(source);
  renderer.addActor(actor);
 
  //calling the other functions: slicer, cropper and volume contour
  setupMultiSlice({ source, renderer2, renderWindow2 });
  setupCropper({renderer3,renderWindow3});
  setupIso({renderer4,renderWindow4});

  // Configuration
  const sampleDistance =
    0.7 *
    Math.sqrt(
      source
        .getSpacing()
        .map((v) => v * v)
        .reduce((a, b) => a + b, 0)
    );
  mapper.setSampleDistance(sampleDistance);  
  actor.getProperty().setRGBTransferFunction(0, lookupTable);
  actor.getProperty().setScalarOpacity(0, piecewiseFunction);
  actor.getProperty().setInterpolationTypeToFastLinear();
  actor.getProperty().setInterpolationTypeToLinear();

  // For better looking volume rendering
  // - distance in world coordinates a scalar opacity of 1.0
  actor
    .getProperty()
    .setScalarOpacityUnitDistance(
      0,
      vtkBoundingBox.getDiagonalLength(source.getBounds()) /
        Math.max(...source.getDimensions())
    );


  actor.getProperty().setGradientOpacityMinimumValue(0, 0);
  actor
    .getProperty()
    .setGradientOpacityMaximumValue(0, (dataRange[1] - dataRange[0]) * 0.05);

  //setting shading based on gradient
  actor.getProperty().setShade(true);
  actor.getProperty().setUseGradientOpacity(0, true);

  //setting the deafault values
  actor.getProperty().setGradientOpacityMinimumOpacity(0, 0.0);
  actor.getProperty().setGradientOpacityMaximumOpacity(0, 1.0);
  actor.getProperty().setAmbient(0.2);
  actor.getProperty().setDiffuse(0.7);
  actor.getProperty().setSpecular(0.3);
  actor.getProperty().setSpecularPower(8.0);

  //initializing control widget and UI
  const controllerWidget = vtkVolumeController.newInstance({
    size: [280, 150],    
    rescaleColorMap: true
  });
  const isBackgroundDark = background[0] + background[1] + background[2] < 1.5;
  controllerWidget.setContainer(rootContainer);
   // setUpContent sets the size to the container.
  controllerWidget.setupContent(renderWindow, actor, isBackgroundDark);

  fullScreenRenderer.setResizeCallback(({ width, height }) => {   
    controllerWidget.render();
    fpsMonitor.update();
  });

  // First render
  renderer.resetCamera();
  renderWindow.render();

  global.pipeline = {
    actor,
    renderer,
    renderWindow,
    lookupTable,
    mapper,
    source,
    piecewiseFunction,
    fullScreenRenderer
  };

  if (userParams.fps) {
    const fpsElm = fpsMonitor.getFpsMonitorContainer();
    fpsElm.classList.add(style.fpsMonitor);
    fpsMonitor.setRenderWindow(renderWindow);
    fpsMonitor.setContainer(rootContainer);
    fpsMonitor.update();
  }
}

// ----------------------------------------------------------------------------
// loading data function and checking whether the file is vti or not
export function load(container, options) {
  autoInit = false;
  emptyContainer(container);

  if (options.file) {
    if (options.ext === "vti") {
      const reader = new FileReader();
      reader.onload = function onLoad(e) {
        createViewer(container, reader.result, options);
      };
      reader.readAsArrayBuffer(options.file);
    } else {
      console.error("Unkown file...");
    }
  } 

}

//this function is controlling the front page function.
//It is adding the vti file after clicking the upload button
//after uploading transfering the data to the second page that is the main application page
export function initLocalFileLoader(container) {
  const exampleContainer = document.querySelector(".content");
  const rootBody = document.querySelector("body");
  const myContainer = container || exampleContainer || rootBody;

  const fileContainer = document.createElement("div");
  fileContainer.innerHTML = `<button class = "${style.dropButton}">Upload or Drag File Here</button><div class="${style.bigFileDrop}"/><input type="file" accept=".vti" style="display: none;"/>`;
  myContainer.appendChild(fileContainer);

  const fileInput = fileContainer.querySelector("input");
  function handleFile(e) {
    preventDefaults(e);
    const dataTransfer = e.dataTransfer;
    const files = e.target.files || dataTransfer.files;
    if (files.length === 1) {
      myContainer.removeChild(fileContainer);
      const ext = files[0].name.split(".").slice(-1)[0];
      const options = { file: files[0], ext, ...userParams };
      load(myContainer, options);
    }
  }
  //these are codes for how the data file can be added
  fileInput.addEventListener("change", handleFile);
  fileContainer.addEventListener("drop", handleFile);
  fileContainer.addEventListener("click", (e) => fileInput.click());
  fileContainer.addEventListener("dragover", preventDefaults);
}


//it is loading the container with the parameters from the loaded data file
if (userParams.fileURL) {
  const exampleContainer = document.querySelector(".content");
  const rootBody = document.querySelector("body");
  const myContainer = exampleContainer || rootBody;
  load(myContainer, userParams);
}

//loading the data file
const viewerContainers = document.querySelectorAll(".vtkjs-volume-viewer");
let nbViewers = viewerContainers.length;
while (nbViewers--) {
  const viewerContainer = viewerContainers[nbViewers];
  const fileURL = viewerContainer.dataset.url;
  const options = {
    containerStyle: { height: "100%" },
    ...userParams,
    fileURL
  };
  load(viewerContainer, options);
}

// Auto setup if no method get called within 100ms
setTimeout(() => {
  if (autoInit) {
    initLocalFileLoader();
  }
}, 100);
