

var img = {
  location: new Image(),
  party: new Image(),
  creature: new Image(),
  transport: new Image(),
  other: new Image(),
};
img.location.src = 'img/location.png';
img.party.src = 'img/party.png';
img.creature.src = 'img/creature.png';
img.transport.src = 'img/transport.png';
img.other.src = 'img/other.png';

var mapper = {
  //nodes
  gameNameInput : document.getElementById("game-name"),
  canvas : document.getElementById("canvas"),
  componentForm : document.getElementById("component-form"),
  componentDeleteButton : document.getElementById('component-delete'),
  componentNameInput : document.getElementById('component-name'),
  componentCategorySelect : document.getElementById('component-category'),
  detailsDiv : document.getElementById("detail-display"),
  detailNewButton : document.getElementById('detail-new'),
  namesToggle : document.getElementById('mapper-names-toggle'),
  recenterButton : document.getElementById('mapper-recenter'),
  fileLoadNode : document.getElementById('file-load'),
  fileSaveNode : document.getElementById('file-save'),

  //settings
  backgroundColor : '#FFFBD1',
  gridColor: '#B3CAF5',
  highlightColor : "rgba(224, 255, 71, 0.55)",
  font : "5px Courier",
  fontColor : "black",
  updateTimeout : null,
  componentWidth : 14,
  componentHeight : 14,
  gridLineSpacing : 5,
  gridLineWidth : 0.25,
  defaultTransforms : {
    scaleFactor : 3.50,
    panX : 0,
    panY : 0,
    prevPanX : 0,
    prevPanY : 0
  },
  categories : [
    {
      value : "L",
      display : "Location",
      img : img.location,
    },
    {
      value : "P",
      display : "Party",
      img : img.party,
    },
    {
      value : "C",
      display : "Creature",
      img : img.creature,
    },
    {
      value : "T",
      display : "Transport",
      img : img.transport,
    },
    {
      value : "O",
      display : "Other",
      img : img.other,
    }
  ],

  //data
  data : {
    name: "",
    components : [],
    showNames : true,
    nextId : 0,
    transforms : {
      scaleFactor : 3.50,
      panX : 0,
      panY : 0,
      prevPanX : 0,
      prevPanY : 0
    }
  },

  init: function () {

    this.context = this.canvas.getContext("2d");

    //canvas
    this.canvas.addEventListener('click', this.handleClick.bind(this), false);
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this), false);
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this), false);
    this.canvas.addEventListener('mouseout', this.handleMouseOut.bind(this), false);
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this), false);
    //this.canvas.addEventListener('DOMMouseScroll', this.handleScroll.bind(this), false); //deprecated
    //this.canvas.addEventListener('mousewheel', this.handleScroll.bind(this), false); //deprecated
    this.canvas.addEventListener('wheel', this.handleScroll.bind(this), false);
    this.canvas.addEventListener('contextmenu', this.handleRightClick.bind(this), false);
    this.canvas.addEventListener('drop', this.handleDetailDrop.bind(this), false);
    this.canvas.addEventListener('dragover', function(e) {
      e.preventDefault(); //manually handle dropping
      var mousePos = this.getMousePos(e, this.canvas);
      this.handleHover(mousePos);
    }.bind(this));

    //component sidebar
    this.componentForm.addEventListener('submit', function(e) {
      e.preventDefault();
    });
    this.componentDeleteButton.addEventListener("click", this.handleComponentDeleteButton.bind(this), false);
    this.componentNameInput.addEventListener('input', this.handleComponentNameInput.bind(this), false);
    this.componentCategorySelect.addEventListener('change', this.handleComponentCategorySelect.bind(this), false);
    for (var i = 0; i < this.categories.length; i++) {
      var optionNode = document.createElement("option");
      optionNode.value = this.categories[i].value;
      optionNode.innerText = this.categories[i].display;
      this.componentCategorySelect.appendChild(optionNode);
    }
    this.detailNewButton.addEventListener("click", this.handleDetailNewButton.bind(this), false);

    //header menu
    this.gameNameInput.addEventListener('input', this.handleGameNameInput.bind(this), false);
    this.fileLoadNode.addEventListener('change', this.loadFile.bind(this), false);
    this.fileSaveNode.addEventListener('click', this.saveFile.bind(this), false);
    this.namesToggle.addEventListener("change", this.handleNamesToggle.bind(this), false);
    this.namesToggle.checked = this.data.showNames;
    this.recenterButton.addEventListener("click", this.handleRecenterButton.bind(this), false);

    this.gameNameInput.value = this.data.name;
    this.displayComponent(null);
  },


  loadData: function (data) {
    this.data = data;
    this.namesToggle.checked = data.showNames;
    this.gameNameInput.value = data.name;
    var activeComponent = this.getActiveComponent();
    this.displayComponent(activeComponent);
  },

  loadFile : function(e) {
    var file = e.target.files[0];
    if (!file) {
      return;
    }
    var reader = new FileReader();
    var self = this;
    reader.onload = function(e) {
      var data = JSON.parse(e.target.result);
      self.loadData(data);
    };
    reader.readAsText(file);
    //this.fileName = file.name;
  },

  saveFile : function(e) {
    var blob = new Blob([JSON.stringify(this.data)], {type: "application/json;charset=utf-8"});
    saveAs(blob, this.getFileName());
    this.fileSaveNode.setAttribute('class', 'button');
  },

  getFileName : function() {
    //credit: https://medium.com/@mhagemann/the-ultimate-way-to-slugify-a-url-string-in-javascript-b8e4a0d849e1
    var a = 'àáäâãåăæçèéëêǵḧìíïîḿńǹñòóöôœøṕŕßśșțùúüûǘẃẍÿź·/_,:;';
    var b = 'aaaaaaaaceeeeghiiiimnnnooooooprssstuuuuuwxyz------';
    var p = new RegExp(a.split('').join('|'), 'g');
    return this.data.name.slice(0).toLowerCase()
      .replace(/\s+/g, '-') // Replace spaces with -
      .replace(p, c => b.charAt(a.indexOf(c))) // Replace special characters
      .replace(/&/g, '-and-') // Replace & with ‘and’
      .replace(/[^\w\-]+/g, '') // Remove all non-word characters
      .replace(/\-\-+/g, '-') // Replace multiple - with single -
      .replace(/^-+/, '') // Trim - from start of text
      .replace(/-+$/, '') // Trim - from end of text
      + '.json';
  },

  getMousePos: function (e, canvas) {
    var rect = canvas.getBoundingClientRect();
    var rawX = e.clientX - rect.left;
    var rawY = e.clientY - rect.top
    var transformedX = rawX/this.data.transforms.scaleFactor-this.data.transforms.prevPanX;
    var transformedY = rawY/this.data.transforms.scaleFactor-this.data.transforms.prevPanY;
    return {
      x: transformedX,
      y: transformedY
    };
  },

  doesOverlapComponent : function(component, x, y) {
    return component.pos.x <= x && x <= component.pos.x + this.componentWidth &&
           component.pos.y <= y && y <= component.pos.y + this.componentHeight;
  },

  checkCollisions: function (mousePos, callback) {
    //TODO: it is currently possible to hover/click on two neighboring components at once if they overlap
    var components = this.data.components;
    for (var i=0; i<components.length; i++){
      var isColliding = this.doesOverlapComponent(components[i], mousePos.x, mousePos.y) ? true : false;
      callback(components[i], isColliding);
    }
  },

  handleClick: function (e) {
    //TODO: should dragging a component to move it cause it to be the active component?
    e.preventDefault();
    var mousePos = this.getMousePos(e, this.canvas);
    var self = this;
    this.checkCollisions(mousePos, function(component, isColliding) {
      if (isColliding){
        self.setActiveComponent(component);
      }
    });
  },

  handleRightClick: function (e) {
    //TODO: click an existing component to delete it (with confirmation popup)?
    e.preventDefault();
    var mousePos = this.getMousePos(e, this.canvas);
    this.addNewComponent(mousePos);
  },

  handleMouseDown: function (e) {
    e.preventDefault();
    this.mouseIsDown = true;
    var mousePos = this.getMousePos(e, this.canvas);
    this.prevMouseDownPos = mousePos;
    var self = this;
    this.checkCollisions(mousePos, function(component, isColliding) {
      if (isColliding){
        self.draggingComponent = component;
        component.prevPos = {
          x : component.pos.x,
          y : component.pos.y
        };
      }
    });
  },

  handleMouseUp: function (e) {
    e.preventDefault();
    if (this.mouseIsDown) {
      this.mouseIsDown = false;

      if (this.draggingComponent) {
        this.draggingComponent = null;
      } else {
        var mousePos = this.getMousePos(e, this.canvas);
        this.data.transforms.prevPanX += mousePos.x - this.prevMouseDownPos.x;
        this.data.transforms.prevPanY += mousePos.y - this.prevMouseDownPos.y;
      }

      this.dataUpdated();
    }
  },

  handleMouseOut: function (e) {
    this.handleMouseUp(e);
  },

  handleMouseMove: function (e) {
    e.preventDefault();
    var mousePos = this.getMousePos(e, this.canvas);
    if (this.mouseIsDown) {
      this.handleDrag(mousePos);
    } else {
      this.handleHover(mousePos);
    }
  },

  handleDrag: function (mousePos) {
    var delta = {
      x : mousePos.x - this.prevMouseDownPos.x,
      y : mousePos.y - this.prevMouseDownPos.y
    };
    if (this.draggingComponent) {
      this.draggingComponent.pos.x = this.draggingComponent.prevPos.x + delta.x;
      this.draggingComponent.pos.y = this.draggingComponent.prevPos.y + delta.y;
    } else {
      this.panView(delta);
    }
  },

  handleHover: function (mousePos) {
    var self = this;
    this.checkCollisions(mousePos, function(component, isColliding){
      if (isColliding) {
        component.isHovered = true;
      } else {
        component.isHovered = false;
      }
    });
  },

  handleScroll: function(e){
    //TODO: translate during zoom based on mouse position, instead of zooming relative to upper left corner
    e.preventDefault();
    var delta = e.deltaY ? -e.deltaY/120 : 0;
    if (delta) {
      //var factor = 1+delta/10;
      var factor = 1+delta;
      this.data.transforms.scaleFactor *= factor;
      this.dataUpdated();
    }
  },

  dataUpdated: function () {
    clearTimeout(this.updateTimeout);
    //display message: ...
    this.updateTimeout = setTimeout(function () {
      this.fileSaveNode.setAttribute('class', 'button-warn');
      //console.log('Map state has changed - consider saving');
    }.bind(this), 1000);
  },

  handleGameNameInput: function (e) {
    e.preventDefault();
    this.data.name = e.target.value;
    this.dataUpdated();
  },

  createDefaultComponent: function(x, y) {
    return {
      id: this.data.nextId++,
      name : "",
      pos : {
        x:x - this.componentWidth / 2, 
        y:y - this.componentHeight / 2
      },
      prevPos : {
        x:null, 
        y:null
      },
      details : [],
      category : "O",
      isActive : false,
      isHovered : false
    };
  },

  addNewComponent: function (mousePos) {
    var component = this.createDefaultComponent(mousePos.x, mousePos.y);
    this.data.components.push(component);
    this.setActiveComponent(component);
  },

  deleteComponent: function (componentData) {
    var components = this.data.components;
    for (var i=0; i<components.length; i++) {
      if (components[i].id == componentData.id) {
        components.splice(i, 1);
        this.dataUpdated();
        this.displayComponent(null);
      }
    }
  },

  setActiveComponent: function (component) {
    var c = this.data.components;
    for (var i=0; i<c.length; i++) c[i].isActive = false;
    component.isActive = true;
    this.dataUpdated();
    this.displayComponent(component);
  },

  getActiveComponent: function () {
    var c = this.data.components;
    for (var i=0; i<c.length; i++) if (c[i].isActive) return c[i];
  },

  handleComponentDeleteButton: function (e) {
    // TODO: add "are you sure?" dialogue(?)
    e.preventDefault();
    this.deleteComponent(this.getActiveComponent());
  },

  handleComponentNameInput: function (e) {
    e.preventDefault();
    var component = this.getActiveComponent()
    component.name = e.target.value;
    this.dataUpdated();
  },

  handleComponentCategorySelect: function (e) {
    e.preventDefault();
    var component = this.getActiveComponent()
    component.category = e.target.value;
    this.dataUpdated();
  },

  displayComponent: function (component) {
    if (component) {
      document.getElementsByClassName("component-none")[0].style.display = 'none';
      
      this.componentNameInput.value = component.name;
      this.componentCategorySelect.value = component.category;
      this.displayDetails(component.details);

      document.getElementsByClassName("component-header")[0].style.display = 'block';
      this.detailsDiv.style.display = 'block';
      document.getElementsByClassName("component-footer")[0].style.display = 'block';

      this.componentNameInput.focus();
    } else {
      this.detailsDiv.style.display = 'none';
      document.getElementsByClassName("component-header")[0].style.display = 'none';
      document.getElementsByClassName("component-footer")[0].style.display = 'none';
      document.getElementsByClassName("component-none")[0].style.display = 'block';
    }
  },

  addNewDetail: function () {
    var activeComponent = this.getActiveComponent();
    var detail = {
      id: this.data.nextId++,
      //  componentId: componentId,
      text: ""
    };
    activeComponent.details.unshift(detail);
    this.dataUpdated();
    this.displayDetails(activeComponent.details);
    document.getElementsByClassName("detail")[0].getElementsByTagName("textarea")[0].focus();
  },

  deleteDetail: function (detailData) {
    var activeComponent = this.getActiveComponent();
    this.popDetailFromComponent(detailData, activeComponent);
    this.dataUpdated();
    this.displayDetails(activeComponent.details);
  },

  moveDetailToComponent: function (detailData, targetComponent) {
    var activeComponent = this.getActiveComponent();
    var detail = this.popDetailFromComponent(detailData, activeComponent);
    targetComponent.details.push(detail);
    this.dataUpdated();
    this.displayDetails(activeComponent.details);
  },

  popDetailFromComponent: function (detailData, component) {
    for (var i=0; i<component.details.length; i++) {
      if (component.details[i].id == detailData.id) {
        var detail = component.details[i];
        component.details.splice(i, 1);
        return detail;
      }
    }
  },

  handleDetailDeleteButton: function (e) {
    e.preventDefault();
    var id = Number(e.target.parentElement.getAttribute('data-id'));
    var detailData = {
      id: id,
    };
    this.deleteDetail(detailData);
  },

  handleDetailNewButton: function (e) {
    e.preventDefault();
    this.addNewDetail();
  },

  handleDetailInput: function (e) {
    var divs = this.detailsDiv.children;
    for (var i=0; i<divs.length; i++) {
      var textarea = divs[i].getElementsByTagName('textarea')[0];
      if (textarea == e.target) {
        var detail = this.getActiveComponent().details[i];
        detail.text = e.target.value;
        this.dataUpdated();
      }
    }
  },

  handleDetailDragStart: function (e) {
    //TODO: allow dragging to rearrange details order in the component display
    //dragging the textarea's parent frame, rather than text inside the input
    console.log("drag start");
    if (e.target === e.currentTarget) {
      var id = Number(e.target.getAttribute('data-id'));
      //var componentId = Number(e.target.getAttribute('data-component-id'));
      var text = e.target.getElementsByTagName('textarea')[0].value
      var data = {
        id: id,
        //componentId: componentId,
        text: text
      };
      e.dataTransfer.setData('application/json', JSON.stringify(data));
      e.dataTransfer.setData('text/plain', text);
    }
  },

  handleDetailDrop: function (e) {
    e.preventDefault();
    var detailData = JSON.parse(e.dataTransfer.getData('application/json'));
    var mousePos = this.getMousePos(e, this.canvas);
    var self = this;
    this.checkCollisions(mousePos, function(component, isColliding){
      if (isColliding) {
        self.moveDetailToComponent(detailData, component);
      }
    });
  },

  displayDetails: function (details) {
    this.detailsDiv.innerHTML = "";
    for (var i=0; i<details.length; i++) {
      
      var detail = details[i];

      var deleteButton = document.createElement('button');
      deleteButton.innerHTML = '&#10006;';
      deleteButton.addEventListener('click', this.handleDetailDeleteButton.bind(this));

      var textarea = document.createElement('textarea');
      textarea.setAttribute('rows', 3);
      textarea.value = detail.text;
      textarea.addEventListener('input', this.handleDetailInput.bind(this), false);
      textarea.addEventListener('mousedown', function(e) {
        //disable dragging of parent to preserve textarea behaviors
        e.target.parentElement.setAttribute('draggable', false);
        e.stopPropagation();
      }, false);

      var frame = document.createElement('div');
      frame.setAttribute('class', 'detail');
      frame.setAttribute('data-id', detail.id);
      //frame.setAttribute('data-component-id', detail.component_id);
      frame.addEventListener('dragstart', this.handleDetailDragStart.bind(this), false);
      frame.addEventListener('mousedown', function(e) {
        //enable dragging when clicked
        this.setAttribute('draggable', true);
      }, false);

      frame.append(deleteButton);
      frame.append(textarea);
      this.detailsDiv.append(frame);
    }
  },

  handleNamesToggle: function (e) {
    if (this.namesToggle.checked == true){
      this.data.showNames = true;
    } else {
      this.data.showNames = false;
    }
    this.dataUpdated();
  },

  handleRecenterButton: function (e) {
    e.preventDefault();
    Object.assign(this.data.transforms, this.defaultTransforms);
    this.dataUpdated();
  },

  panView: function (delta) {
    this.data.transforms.panX = this.data.transforms.prevPanX + delta.x;
    this.data.transforms.panY = this.data.transforms.prevPanY + delta.y;
    this.dataUpdated();
  },

  drawGrid: function (ctx) {
    for (var i = (this.data.transforms.panX % this.gridLineSpacing) * this.data.transforms.scaleFactor; i < this.canvas.width; i+=this.data.transforms.scaleFactor*this.gridLineSpacing) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, this.canvas.height);
      ctx.lineWidth = this.gridLineWidth * this.data.transforms.scaleFactor;
      ctx.strokeStyle = this.gridColor;
      ctx.stroke();
    }
    for (var i = (this.data.transforms.panY % this.gridLineSpacing) * this.data.transforms.scaleFactor; i < this.canvas.height; i+=this.data.transforms.scaleFactor*this.gridLineSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(this.canvas.width, i);
      ctx.lineWidth = this.gridLineWidth * this.data.transforms.scaleFactor;
      ctx.strokeStyle = this.gridColor;
      ctx.stroke();
    }
  },

  drawComponent: function (component, ctx, drawName = false) {
    //highlight
    if (component.isActive) {
      ctx.beginPath();
      ctx.arc(component.pos.x + this.componentWidth/2, component.pos.y + this.componentHeight/2, this.componentWidth*.65, 0, 2*Math.PI, false);
      ctx.fillStyle=this.highlightColor;
      ctx.fill();
    } else if (component.isHovered) {
      ctx.beginPath();
      ctx.arc(component.pos.x + this.componentWidth/2, component.pos.y + this.componentHeight/2, this.componentWidth*.5, 0, 2*Math.PI, false);
      ctx.strokeStyle=this.highlightColor;
      ctx.lineWidth=this.componentWidth * .25;
      ctx.stroke();
    } 

    //image
    for (var i = 0; i < this.categories.length; i++) {
      if (component.category == this.categories[i].value) {
        ctx.drawImage(this.categories[i].img, component.pos.x, component.pos.y, this.componentWidth, this.componentHeight);
      }
    }

    //name
    if (drawName) {
      ctx.font = this.font;
      ctx.fillStyle = this.fontColor;
      ctx.textAlign = "center";
      ctx.fillText(component.name, component.pos.x + this.componentWidth * .5, component.pos.y + this.componentHeight * 1.5);
    }
  },

  draw: function () {
    var ctx = this.context;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawGrid(ctx);
    ctx.save();

    ctx.scale(this.data.transforms.scaleFactor, this.data.transforms.scaleFactor);
    ctx.translate(this.data.transforms.panX, this.data.transforms.panY);
    for (var i = 0; i < this.data.components.length; i++) {
      this.drawComponent(this.data.components[i], ctx, this.data.showNames);
    }
    ctx.restore();

    window.requestAnimationFrame(this.draw.bind(this));
  }
};

mapper.init();
window.requestAnimationFrame(mapper.draw.bind(mapper));
//mapper.load(data);