
//TODO: zoom relative to cursor, not upper left corner of map

var img = {
  location: new Image(),
  party: new Image(),
  creature: new Image(),
  transport: new Image(),
  other: new Image()
};
img.location.src = 'img/location.png';
img.party.src = 'img/party.png';
img.creature.src = 'img/creature.png';
img.transport.src = 'img/transport.png';
img.other.src = 'img/other.png';


function Component (obj) {

  this.id = obj.id || null;
  this.name = obj.name || '';
  this.x = obj.x * 1; //for some reason this breaks if '* 1' is removed...
  this.y = obj.y * 1;
  this.isActive = obj.isActive || false;
  this.category = obj.category || '';
  this.details = obj.details || [];
  this.hover = false;
  this.width = 2;
  this.height = 2;

  this.contains = function (x, y) {
    return this.x <= x && x <= this.x + this.width &&
           this.y <= y && y <= this.y + this.height;
  };

  this.draw = function (ctx, drawName = false) {
    if (this.isActive) {
      ctx.beginPath();
      ctx.arc(this.x + 1, this.y + 1, 1.5, 0, 2*Math.PI, false);
      ctx.fillStyle="rgba(224, 255, 71, 0.55)";
      ctx.fill();
    } else if (this.hover) {
      ctx.beginPath();
      ctx.arc(this.x + 1, this.y + 1, 1.25, 0, 2*Math.PI, false);
      ctx.strokeStyle="rgba(224, 255, 71, 0.55)";
      ctx.lineWidth=0.5;
      ctx.stroke();
    } 
    if (this.category == 'L') {
      ctx.drawImage(img.location, this.x, this.y, this.width, this.height);
    } else if (this.category == 'P') {
      ctx.drawImage(img.party, this.x, this.y, this.width, this.height);
    } else if (this.category == 'C') {
      ctx.drawImage(img.creature, this.x, this.y, this.width, this.height);
    } else if (this.category == 'T') {
      ctx.drawImage(img.transport, this.x, this.y, this.width, this.height);
    } else if (this.category == 'O') {
      ctx.drawImage(img.other, this.x, this.y, this.width, this.height);
    }
    if (drawName) {
      ctx.font = ".75px Courier";
      ctx.fillStyle = "black";
      ctx.textAlign = "center";
      ctx.fillText(this.name, this.x + 1.1, this.y + 3);
    }
  };

};

var mapper = {

  updateTimeout : null,
  componentWidth : 2,
  componentHeight : 2,

  //nodes
  canvas : document.getElementById("canvas"),
  componentForm : document.getElementById("component-form"),
  componentDeleteButton : document.getElementById('component-delete'),
  componentNameInput : document.getElementById('component-name'),
  componentCategorySelect : document.getElementById('component-category'),
  detailsDiv : document.getElementById("detail-display"),
  detailNewButton : document.getElementById('detail-new'),
  namesToggle : document.getElementById('mapper-names-toggle'),
  recenterButton : document.getElementById('mapper-recenter'),

  //data
  defaultTransforms : {
    scaleFactor : 20.00,
    panX : 0,
    panY : 0,
    prevPanX : 0,
    prevPanY : 0
  },

  data : {
    components : [],
    showNames : true,
    transforms : {
      scaleFactor : 20.00,
      panX : 0,
      panY : 0,
      prevPanX : 0,
      prevPanY : 0
    }
  },

  load: function (data) {
    this.data = data;
    this.namesToggle.checked = data.showNames;
  },

  init: function () {
    //this.load(data);
    this.context = this.canvas.getContext("2d");
    this.canvas.addEventListener('click', this.handleClick.bind(this), false);
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this), false);
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this), false);
    this.canvas.addEventListener('mouseout', this.handleMouseOut.bind(this), false);
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this), false);
    this.canvas.addEventListener('DOMMouseScroll', this.handleScroll.bind(this), false);
    this.canvas.addEventListener('mousewheel', this.handleScroll.bind(this), false);
    this.canvas.addEventListener('contextmenu', this.handleRightClick.bind(this), false);
    this.canvas.addEventListener('drop', this.handleDetailDrop.bind(this), false);
    this.canvas.addEventListener('dragover', function(e) {
      e.preventDefault();
    });

    this.componentForm.addEventListener('submit', function(e) {
      e.preventDefault();
    });
    this.componentDeleteButton.addEventListener("click", this.handleComponentDeleteButton.bind(this), false);
    this.componentNameInput.addEventListener('input', this.handleComponentNameInput.bind(this), false);
    this.componentCategorySelect.addEventListener('change', this.handleComponentCategorySelect.bind(this), false);
    this.detailNewButton.addEventListener("click", this.handleDetailNewButton.bind(this), false);

    this.namesToggle.addEventListener("change", this.handleNamesToggle.bind(this), false);
    this.recenterButton.addEventListener("click", this.handleRecenterButton.bind(this), false);

    this.displayComponent(this.getActiveComponent());
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
    //TODO: it is currently possible to hover/click on two neighboring components at once if they overlap - just return after 1st collision?
    var components = this.data.components;
    for (var i=0; i<components.length; i++){
      //var isColliding = components[i].contains(mousePos.x, mousePos.y) ? true : false;
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
        self.displayComponent(component);
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
        this.mapUpdated();
        this.draggingComponent = null;
      } else {
        var mousePos = this.getMousePos(e, this.canvas);
        this.data.transforms.prevPanX += mousePos.x - this.prevMouseDownPos.x;
        this.data.transforms.prevPanY += mousePos.y - this.prevMouseDownPos.y;
      }
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
    this.draw(); //TODO: use animationFrame instead of manually calling draw()?
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
    this.draw();
  },

  handleScroll: function(e){
    //TODO: translate during zoom based on mouse position, instead of zooming relative to upper left corner
    e.preventDefault();
    var delta = e.wheelDelta ? e.wheelDelta/120 : 0;
    if (delta) {
      var factor = 1+delta/10;
      this.data.transforms.scaleFactor *= factor;
      this.mapUpdated();
      this.draw();
    }
  },

  mapUpdated: function () {
    clearTimeout(this.updateTimeout);
    this.updateTimeout = setTimeout(function () {
      console.log('Map state has changed - consider saving');
    }, 1000);
  },

  addNewComponent: function (mousePos) {
    //TODO: autofocus on name input field
    //TODO: create prototype function
    /*
    var component = new Component({
      x : mousePos.x,
      y : mousePos.y,
    });
    component.x -= component.width/2;
    component.y -= component.height/2;
    component.game = this.gameID;
    this.components.push(component);
    this.setActiveComponent(component);
    this.displayComponent(component);
    */
    var component = {
      id: this.data.nextId++,
      name : "",
      pos : {
        x:mousePos.x - this.componentWidth / 2, 
        y:mousePos.y - this.componentHeight / 2
      },
      prevPos : {
        x:0, 
        y:0
      },
      details : [],
      category : "O",
      isActive : false,
      isHovered : false
    };
    this.data.components.push(component);
    this.setActiveComponent(component);
    this.displayComponent(component);
  },

  deleteComponent: function (componentData) {
    var components = this.data.components;
    for (var i=0; i<components.length; i++) {
      if (components[i].id == componentData.id) {
        components.splice(i, 1);
        this.draw();
        this.displayComponent(null);
      }
    }
  },

  setActiveComponent: function (component) {
    var c = this.data.components;
    for (var i=0; i<c.length; i++) c[i].isActive = false;
    component.isActive = true;
    this.mapUpdated();
  },

  getActiveComponent: function () {
    var c = this.data.components;
    for (var i=0; i<c.length; i++) if (c[i].isActive) return c[i];
  },

  handleComponentDeleteButton: function (e) {
    // TODO: add "are you sure?" dialogue(?)
    e.preventDefault();
    this.deleteComponent(this.getActiveComponent());
    //TODO: display something other than the now-deleted component
  },

  handleComponentNameInput: function (e) {
    e.preventDefault();
    var component = this.getActiveComponent()
    component.name = e.target.value;
    this.mapUpdated();
  },

  handleComponentCategorySelect: function (e) {
    e.preventDefault();
    var component = this.getActiveComponent()
    component.category = e.target.value;
    this.mapUpdated();
    this.draw();
  },

  displayComponent: function (component) {
    //TODO: display something when no component is active
    this.draw();
    if (component) {
      document.getElementsByClassName("component-none")[0].style.display = 'none';
      
      this.componentNameInput.value = component.name;
      this.componentCategorySelect.value = component.category;
      this.displayDetails(component.details);

      document.getElementsByClassName("component-header")[0].style.display = 'block';
      this.detailsDiv.style.display = 'block';
      document.getElementsByClassName("component-footer")[0].style.display = 'block';
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
      name: "default name",
      text: "default text"
    };
    activeComponent.details.push(detail);
    this.displayDetails(activeComponent.details);
  },

  deleteDetail: function (detailData) {
    var activeComponent = this.getActiveComponent();
    this.popDetailFromComponent(detailData, activeComponent);
    this.displayDetails(activeComponent.details);
  },

  moveDetailToComponent: function (detailData, targetComponent) {
    var activeComponent = this.getActiveComponent();
    var detail = this.popDetailFromComponent(detailData, activeComponent);
    //detail.component_id = component.id;
    this.mapUpdated();
    targetComponent.details.push(detail);
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
    var parent = e.target.parentElement;
    var id = Number(parent.getAttribute('data-id'));
    //var componentID = Number(parent.getAttribute('data-component-id'));
    //var content = parent.children[1].value;
    var detailData = {
      id: id,
    //  component_id: componentID,
    //  content: content
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
      var textarea = divs[i].children[1];
      if (textarea == e.target) {
        var detail = this.getActiveComponent().details[i];
        detail.text = e.target.value;
        this.mapUpdated();
      }
    }
  },

  handleDetailDragStart: function (e) {
    //TODO: allow dragging to rearrange details order in the component display
    console.log("drag start");
    //dragging the textarea's parent frame, rather than text inside the input
    if (e.target === e.currentTarget) {
      var id = Number(e.target.getAttribute('data-id'));
      //var componentID = Number(e.target.getAttribute('data-component-id'));
      //var content = e.target.children[1].value;
      var data = {
        id: id,
        //component_id: componentID,
        //content: content
      };
      e.dataTransfer.setData('text/plain', JSON.stringify(data));
    }
  },

  handleDetailDrop: function (e) {
    console.log("dropped");
    e.preventDefault();
    var detailData = JSON.parse(e.dataTransfer.getData('text/plain'));
    e.dataTransfer.clearData();
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

      var textarea = document.createElement('textarea');
      textarea.setAttribute('rows', 3);
      textarea.value = detail.text;
      textarea.addEventListener('input', this.handleDetailInput.bind(this), false);

      var deleteButton = document.createElement('button');
      deleteButton.innerHTML = '&#10006;';
      deleteButton.addEventListener('click', this.handleDetailDeleteButton.bind(this));

      var frame = document.createElement('div');
      frame.setAttribute('class', 'detail');
      frame.setAttribute('draggable', true);
      frame.setAttribute('data-id', detail.id);
      //frame.setAttribute('data-component-id', detail.component_id);
      frame.addEventListener('dragstart', this.handleDetailDragStart.bind(this), false);
      frame.addEventListener('mousedown', function (e) {
        if (e.target !== this) {
          //clicked child element - select and drag text from the textarea instead
          e.stopPropagation();
        }
      });

      frame.addEventListener('drop', function (e) {
        //TODO: should be able to drop text into the textarea, but not the drop data
        console.log('dropped');
        var data = e.dataTransfer.getData('text/plain');//TODO: update to application/json?
        var isJSON = true;
        try {
          JSON.parse(data);
        } catch (e) {
          isJSON  = false;
        }
        if (isJSON) {
          e.preventDefault();
          e.dataTransfer.clearData();
        }
      });

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
    this.mapUpdated();
    this.draw();
  },

  handleRecenterButton: function (e) {
    e.preventDefault();
    this.data.transforms = this.defaultTransforms;
    this.mapUpdated();
    this.draw();
  },

  panView: function (delta) {
    this.data.transforms.panX = this.data.transforms.prevPanX + delta.x;
    this.data.transforms.panY = this.data.transforms.prevPanY + delta.y;
    this.mapUpdated();
  },

  drawGrid: function (ctx) {
    for (var i = (this.data.transforms.panX % 1) * this.data.transforms.scaleFactor; i < this.canvas.width; i+=this.data.transforms.scaleFactor) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, this.canvas.height);
      ctx.lineWidth = 0.05 * this.data.transforms.scaleFactor;
      ctx.strokeStyle = '#B3CAF5';
      ctx.stroke();
    }
    for (var i = (this.data.transforms.panY % 1) * this.data.transforms.scaleFactor; i < this.canvas.height; i+=this.data.transforms.scaleFactor) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(this.canvas.width, i);
      ctx.lineWidth = 0.05 * this.data.transforms.scaleFactor;
      ctx.strokeStyle = '#B3CAF5';
      ctx.stroke();
    }
  },

  drawComponent: function (component, ctx, drawName = false) {
    if (component.isActive) {
      ctx.beginPath();
      ctx.arc(component.pos.x + 1, component.pos.y + 1, 1.5, 0, 2*Math.PI, false);
      ctx.fillStyle="rgba(224, 255, 71, 0.55)";
      ctx.fill();
    } else if (component.isHovered) {
      ctx.beginPath();
      ctx.arc(component.pos.x + 1, component.pos.y + 1, 1.25, 0, 2*Math.PI, false);
      ctx.strokeStyle="rgba(224, 255, 71, 0.55)";
      ctx.lineWidth=0.5;
      ctx.stroke();
    } 
    if (component.category == 'L') {
      ctx.drawImage(img.location, component.pos.x, component.pos.y, this.componentWidth, this.componentHeight);
    } else if (component.category == 'P') {
      ctx.drawImage(img.party, component.pos.x, component.pos.y, this.componentWidth, this.componentHeight);
    } else if (component.category == 'C') {
      ctx.drawImage(img.creature, component.pos.x, component.pos.y, this.componentWidth, this.componentHeight);
    } else if (component.category == 'T') {
      ctx.drawImage(img.transport, component.pos.x, component.pos.y, this.componentWidth, this.componentHeight);
    } else if (component.category == 'O') {
      ctx.drawImage(img.other, component.pos.x, component.pos.y, this.componentWidth, this.componentHeight);
    }
    if (drawName) {
      ctx.font = ".75px Courier";
      ctx.fillStyle = "black";
      ctx.textAlign = "center";
      ctx.fillText(component.name, component.pos.x + 1.1, component.pos.y + 3);
    }
  },

  draw: function () {
    var ctx = this.context;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = '#FFFBD1';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawGrid(ctx);
    ctx.save();

    ctx.scale(this.data.transforms.scaleFactor, this.data.transforms.scaleFactor);
    ctx.translate(this.data.transforms.panX, this.data.transforms.panY);
    for (var i = 0; i < this.data.components.length; i++) {
      this.drawComponent(this.data.components[i], ctx, this.showNames);
      //this.data.components[i].draw(ctx, this.showNames);
    }
    ctx.restore();

  }
};

mapper.init();
//mapper.load(data);