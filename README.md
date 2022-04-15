# Web-Based-Visualization-of-3D-Medical-Data-using-vtk.js

#### Tools
The tools we have used for our project are given below:
* VisualStudioCode
* @kitware/vtk.js
* node.js
* npm (innode.jsinstall)or yarn

#### Compilation Instruction
* Install Visual Studio Code and Node.js
* Open terminal and write the followings:
```
– mkdir my-vtkjs-app
– cd my-vtkjs-app
– npm init
– npm install@kitware/vtk.js
– npm install-D webpack-cli webpack webpack-dev-server
– npm install–save-devkw-web-suite
– mkdir dist/
– mkdir src/
```
* In directory dist/,create a index.html file
* In directory src/, create a index.js file
* In package.json file change the following lines in ”scripts”:
```
– "scripts": {
"build":"webpack --progress--mode=development",
"start": "webpackserve --progress--mode=development --static=dist"
}
```
* To run the app write ``` "npm run start" ``` in terminal and navigate to http://localhost:8080.
